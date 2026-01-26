import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const fromDate = searchParams.get("from");
    const toDate = searchParams.get("to");

    const startDate = fromDate ? new Date(fromDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = toDate ? new Date(toDate) : new Date();
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(23, 59, 59, 999);

    // Calculate previous period for comparison
    const periodLength = endDate.getTime() - startDate.getTime();
    const prevStartDate = new Date(startDate.getTime() - periodLength);
    const prevEndDate = new Date(startDate.getTime() - 1);

    // Fetch current period orders
    const orders = await prisma.order.findMany({
      where: {
        restaurantId: session.restaurantId,
        createdAt: { gte: startDate, lte: endDate },
        status: { notIn: ["CANCELLED"] },
      },
    });

    // Fetch previous period orders for comparison
    const prevOrders = await prisma.order.findMany({
      where: {
        restaurantId: session.restaurantId,
        createdAt: { gte: prevStartDate, lte: prevEndDate },
        status: { notIn: ["CANCELLED"] },
      },
    });

    // Calculate summary
    const totalRevenue = orders.reduce((sum: number, o: typeof orders[number]) => sum + (o.totalAmount || 0), 0);
    const totalOrders = orders.length;
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    const prevRevenue = prevOrders.reduce((sum: number, o: typeof prevOrders[number]) => sum + (o.totalAmount || 0), 0);
    const prevOrderCount = prevOrders.length;

    const revenueGrowth = prevRevenue > 0 ? ((totalRevenue - prevRevenue) / prevRevenue) * 100 : 0;
    const orderGrowth = prevOrderCount > 0 ? ((totalOrders - prevOrderCount) / prevOrderCount) * 100 : 0;

    // Group by day
    const dailyMap: Record<string, { orders: number; revenue: number }> = {};

    // Initialize all days in range
    const currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      const dateKey = currentDate.toISOString().split("T")[0];
      if (dateKey) dailyMap[dateKey] = { orders: 0, revenue: 0 };
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Fill in actual data
    orders.forEach((order: typeof orders[number]) => {
      const dateKey = order.createdAt.toISOString().split("T")[0];
      if (dateKey && dailyMap[dateKey]) {
        dailyMap[dateKey].orders += 1;
        dailyMap[dateKey].revenue += order.totalAmount || 0;
      }
    });

    const dailyData = Object.entries(dailyMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, data]) => ({
        date,
        orders: data.orders,
        revenue: data.revenue,
        averageOrderValue: data.orders > 0 ? data.revenue / data.orders : 0,
      }));

    return NextResponse.json({
      summary: {
        totalRevenue,
        totalOrders,
        averageOrderValue,
        revenueGrowth,
        orderGrowth,
      },
      dailyData,
      comparisonPeriod: {
        revenue: prevRevenue,
        orders: prevOrderCount,
      },
    });
  } catch (error) {
    console.error("Error fetching sales report:", error);
    return NextResponse.json({ error: "Failed to fetch sales report" }, { status: 500 });
  }
}
