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
    type OrderType = OrderType;
    const totalOrders = orders.length;
    const completedOrders = orders.filter(
      (o: OrderType) => o.status === "SERVED" || o.status === "COMPLETED"
    ).length;
    const cancelledOrders = orders.filter(
      (o: OrderType) => o.status === "CANCELLED"
    ).length;
    const totalRevenue = orders
      .filter((o: OrderType) => o.status !== "CANCELLED")
      .reduce((sum: number, o: OrderType) => sum + (o.totalAmount || 0), 0);
    const averageOrderValue = completedOrders > 0 ? totalRevenue / completedOrders : 0;

    // Top selling items
    const itemSales: Record<
      string,
      { name: string; quantity: number; revenue: number; category: string }
    > = {};

    type OrderItemType = OrderType["items"][number];
    orders.forEach((order: OrderType) => {
      if (order.status !== "CANCELLED") {
        order.items.forEach((item: OrderItemType) => {
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

    type ItemSalesData = { name: string; quantity: number; revenue: number; category: string };
    const topItems = Object.entries(itemSales)
      .map(([id, data]: [string, ItemSalesData]) => ({ id, ...data }))
      .sort((a: { quantity: number }, b: { quantity: number }) => b.quantity - a.quantity)
      .slice(0, 10);

    // Category breakdown
    const categorySales: Record<string, { name: string; revenue: number; orders: number }> = {};

    orders.forEach((order: OrderType) => {
      if (order.status !== "CANCELLED") {
        order.items.forEach((item: OrderItemType) => {
          const categoryName = item.menuItem?.category?.name || "Uncategorized";
          if (!categorySales[categoryName]) {
            categorySales[categoryName] = { name: categoryName, revenue: 0, orders: 0 };
          }
          categorySales[categoryName].revenue += item.totalPrice;
          categorySales[categoryName].orders += 1;
        });
      }
    });

    type CategorySalesData = { name: string; revenue: number; orders: number };
    const categoryBreakdown = Object.values(categorySales).sort(
      (a: CategorySalesData, b: CategorySalesData) => b.revenue - a.revenue
    );

    // Hourly breakdown (for today)
    const hourlyData: { hour: number; orders: number; revenue: number }[] = [];
    if (period === "today") {
      for (let hour = 0; hour < 24; hour++) {
        const hourOrders = orders.filter((o: OrderType) => {
          const orderHour = new Date(o.createdAt).getHours();
          return orderHour === hour && o.status !== "CANCELLED";
        });
        hourlyData.push({
          hour,
          orders: hourOrders.length,
          revenue: hourOrders.reduce((sum: number, o: OrderType) => sum + (o.totalAmount || 0), 0),
        });
      }
    }

    // Order status breakdown
    const statusBreakdown = {
      pending: orders.filter((o: OrderType) => o.status === "PENDING").length,
      preparing: orders.filter((o: OrderType) => o.status === "PREPARING").length,
      ready: orders.filter((o: OrderType) => o.status === "READY").length,
      served: orders.filter((o: OrderType) => o.status === "SERVED").length,
      completed: orders.filter((o: OrderType) => o.status === "COMPLETED").length,
      cancelled: orders.filter((o: OrderType) => o.status === "CANCELLED").length,
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
