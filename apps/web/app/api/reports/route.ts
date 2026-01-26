import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// GET sales reports
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") || "today";

    // Calculate date range based on period
    const now = new Date();
    let startDate: Date;
    let endDate = new Date(now);
    endDate.setHours(23, 59, 59, 999);

    switch (period) {
      case "today":
        startDate = new Date(now);
        startDate.setHours(0, 0, 0, 0);
        break;
      case "yesterday":
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() - 1);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(startDate);
        endDate.setHours(23, 59, 59, 999);
        break;
      case "week":
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() - 7);
        startDate.setHours(0, 0, 0, 0);
        break;
      case "month":
        startDate = new Date(now);
        startDate.setDate(1);
        startDate.setHours(0, 0, 0, 0);
        break;
      case "year":
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      default:
        startDate = new Date(now);
        startDate.setHours(0, 0, 0, 0);
    }

    // Fetch orders in date range
    const orders = await prisma.order.findMany({
      where: {
        restaurantId: session.restaurantId,
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        items: {
          include: {
            menuItem: {
              include: {
                category: true,
              },
            },
          },
        },
      },
    });

    // Calculate summary stats
    const totalOrders = orders.length;
    const completedOrders = orders.filter(
      (o) => o.status === "SERVED" || o.status === "COMPLETED"
    ).length;
    const cancelledOrders = orders.filter(
      (o) => o.status === "CANCELLED"
    ).length;
    const totalRevenue = orders
      .filter((o) => o.status !== "CANCELLED")
      .reduce((sum, o) => sum + (o.totalAmount || 0), 0);
    const averageOrderValue = completedOrders > 0 ? totalRevenue / completedOrders : 0;

    // Top selling items
    const itemSales: Record<
      string,
      { name: string; quantity: number; revenue: number; category: string }
    > = {};

    orders.forEach((order) => {
      if (order.status !== "CANCELLED") {
        order.items.forEach((item) => {
          const key = item.menuItemId;
          if (!itemSales[key]) {
            itemSales[key] = {
              name: item.menuItemName,
              quantity: 0,
              revenue: 0,
              category: item.menuItem?.category?.name || "Uncategorized",
            };
          }
          itemSales[key].quantity += item.quantity;
          itemSales[key].revenue += item.totalPrice;
        });
      }
    });

    const topItems = Object.entries(itemSales)
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 10);

    // Category breakdown
    const categorySales: Record<string, { name: string; revenue: number; orders: number }> = {};

    orders.forEach((order) => {
      if (order.status !== "CANCELLED") {
        order.items.forEach((item) => {
          const categoryName = item.menuItem?.category?.name || "Uncategorized";
          if (!categorySales[categoryName]) {
            categorySales[categoryName] = { name: categoryName, revenue: 0, orders: 0 };
          }
          categorySales[categoryName].revenue += item.totalPrice;
          categorySales[categoryName].orders += 1;
        });
      }
    });

    const categoryBreakdown = Object.values(categorySales).sort(
      (a, b) => b.revenue - a.revenue
    );

    // Hourly breakdown (for today)
    const hourlyData: { hour: number; orders: number; revenue: number }[] = [];
    if (period === "today") {
      for (let hour = 0; hour < 24; hour++) {
        const hourOrders = orders.filter((o: typeof orders[number]) => {
          const orderHour = new Date(o.createdAt).getHours();
          return orderHour === hour && o.status !== "CANCELLED";
        });
        hourlyData.push({
          hour,
          orders: hourOrders.length,
          revenue: hourOrders.reduce((sum: number, o: typeof orders[number]) => sum + (o.totalAmount || 0), 0),
        });
      }
    }

    // Order status breakdown
    const statusBreakdown = {
      pending: orders.filter((o: typeof orders[number]) => o.status === "PENDING").length,
      preparing: orders.filter((o: typeof orders[number]) => o.status === "PREPARING").length,
      ready: orders.filter((o: typeof orders[number]) => o.status === "READY").length,
      served: orders.filter((o: typeof orders[number]) => o.status === "SERVED").length,
      completed: orders.filter((o: typeof orders[number]) => o.status === "COMPLETED").length,
      cancelled: orders.filter((o: typeof orders[number]) => o.status === "CANCELLED").length,
    };

    return NextResponse.json({
      period,
      dateRange: {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
      },
      summary: {
        totalOrders,
        completedOrders,
        cancelledOrders,
        totalRevenue,
        averageOrderValue,
      },
      topItems,
      categoryBreakdown,
      hourlyData,
      statusBreakdown,
    });
  } catch (error) {
    console.error("Error fetching reports:", error);
    return NextResponse.json(
      { error: "Failed to fetch reports" },
      { status: 500 }
    );
  }
}
