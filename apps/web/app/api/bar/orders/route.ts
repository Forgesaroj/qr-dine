import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// GET active orders for bar display (drinks only)
export async function GET() {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get orders that have bar items not yet served
    const orders = await prisma.order.findMany({
      where: {
        restaurantId: session.restaurantId,
        status: {
          in: ["CONFIRMED", "PREPARING", "READY"],
        },
        items: {
          some: {
            status: {
              in: ["PENDING", "SENT_TO_KITCHEN", "PREPARING", "READY"],
            },
            // Filter for bar items (kitchenStation = BAR or category is beverage)
            OR: [
              { kitchenStation: "BAR" },
              {
                menuItem: {
                  category: {
                    name: {
                      in: ["Beverages", "Drinks", "Bar", "Cocktails", "Mocktails", "Wine", "Beer", "Spirits"],
                    },
                  },
                },
              },
            ],
          },
        },
      },
      include: {
        table: {
          select: {
            tableNumber: true,
            name: true,
          },
        },
        items: {
          where: {
            status: {
              not: "SERVED",
            },
            OR: [
              { kitchenStation: "BAR" },
              {
                menuItem: {
                  category: {
                    name: {
                      in: ["Beverages", "Drinks", "Bar", "Cocktails", "Mocktails", "Wine", "Beer", "Spirits"],
                    },
                  },
                },
              },
            ],
          },
          select: {
            id: true,
            menuItemId: true,
            menuItemName: true,
            quantity: true,
            status: true,
            specialRequests: true,
            kitchenStation: true,
            createdAt: true,
            sentToKitchenAt: true,
            preparingAt: true,
            readyAt: true,
          },
          orderBy: {
            createdAt: "asc",
          },
        },
      },
      orderBy: {
        placedAt: "asc", // Oldest first (FIFO)
      },
    });

    type OrderWithItems = typeof orders[number];
    type BarItem = OrderWithItems["items"][number];

    // Filter out orders with no bar items
    const barOrders = orders.filter((order: OrderWithItems) => order.items.length > 0);

    // Calculate waiting time for each order
    const ordersWithMetrics = barOrders.map((order: OrderWithItems) => {
      const oldestItem = order.items.reduce(
        (oldest: BarItem, item: BarItem) =>
          item.createdAt < oldest.createdAt ? item : oldest,
        order.items[0]!
      );

      const waitingTime = oldestItem
        ? Math.floor((Date.now() - new Date(oldestItem.createdAt).getTime()) / 1000 / 60)
        : 0;

      return {
        ...order,
        metrics: {
          waitingTime, // in minutes
          itemCount: order.items.length,
          isUrgent: waitingTime > 10, // Urgent if waiting more than 10 minutes
        },
      };
    });

    type OrderWithMetrics = typeof ordersWithMetrics[number];

    // Summary stats
    const stats = {
      totalOrders: ordersWithMetrics.length,
      totalItems: ordersWithMetrics.reduce((sum: number, o: OrderWithMetrics) => sum + o.items.length, 0),
      pendingItems: ordersWithMetrics.reduce(
        (sum: number, o: OrderWithMetrics) => sum + o.items.filter((i: BarItem) => i.status === "PENDING" || i.status === "SENT_TO_KITCHEN").length,
        0
      ),
      preparingItems: ordersWithMetrics.reduce(
        (sum: number, o: OrderWithMetrics) => sum + o.items.filter((i: BarItem) => i.status === "PREPARING").length,
        0
      ),
      readyItems: ordersWithMetrics.reduce(
        (sum: number, o: OrderWithMetrics) => sum + o.items.filter((i: BarItem) => i.status === "READY").length,
        0
      ),
      urgentOrders: ordersWithMetrics.filter((o: OrderWithMetrics) => o.metrics.isUrgent).length,
    };

    return NextResponse.json({ orders: ordersWithMetrics, stats });
  } catch (error) {
    console.error("Error fetching bar orders:", error);
    return NextResponse.json(
      { error: "Failed to fetch bar orders" },
      { status: 500 }
    );
  }
}
