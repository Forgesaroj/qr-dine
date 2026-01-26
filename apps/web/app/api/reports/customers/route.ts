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
    const period = searchParams.get("period") || "month";

    // Calculate date range
    const now = new Date();
    let startDate: Date;

    switch (period) {
      case "week":
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case "quarter":
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case "year":
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      default: // month
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    // Fetch customers
    const customers = await prisma.customer.findMany({
      where: {
        restaurantId: session.restaurantId,
      },
      include: {
        _count: {
          select: { orders: true },
        },
      },
    });

    // Calculate summary
    type CustomerType = typeof customers[number];
    const totalCustomers = customers.length;
    const newCustomers = customers.filter(
      (c: CustomerType) => c.createdAt >= startDate
    ).length;
    const returningCustomers = customers.filter(
      (c: CustomerType) => c._count.orders > 1
    ).length;

    // Get customer spending data from orders
    const customerOrders = await prisma.order.groupBy({
      by: ["customerId"],
      where: {
        restaurantId: session.restaurantId,
        customerId: { not: null },
        status: { notIn: ["CANCELLED"] },
      },
      _sum: {
        totalAmount: true,
      },
      _count: {
        id: true,
      },
    });

    // Map spending to customers
    type CustomerOrderType = typeof customerOrders[number];
    const spendingMap = new Map(
      customerOrders.map((co: CustomerOrderType) => [
        co.customerId,
        { total: co._sum.totalAmount || 0, visits: co._count.id },
      ])
    );

    const totalSpending = customerOrders.reduce(
      (sum: number, co: CustomerOrderType) => sum + (co._sum.totalAmount || 0),
      0
    );
    const totalVisits = customerOrders.reduce(
      (sum: number, co: CustomerOrderType) => sum + co._count.id,
      0
    );

    const averageSpending = totalCustomers > 0 ? totalSpending / totalCustomers : 0;
    const averageVisits = totalCustomers > 0 ? totalVisits / totalCustomers : 0;

    // Top spenders
    const topSpenders = customers
      .map((c: CustomerType) => {
        const spending: { total: number; visits: number } = spendingMap.get(c.id) || { total: 0, visits: 0 };
        return {
          id: c.id,
          name: c.name || "Guest",
          phone: c.phone,
          visits: spending.visits,
          totalSpent: spending.total,
          tier: c.tier,
        };
      })
      .filter((c: { totalSpent: number }) => c.totalSpent > 0)
      .sort((a: { totalSpent: number }, b: { totalSpent: number }) => b.totalSpent - a.totalSpent)
      .slice(0, 10);

    // Tier distribution
    const tierCounts: Record<string, number> = {};
    customers.forEach((c: CustomerType) => {
      tierCounts[c.tier] = (tierCounts[c.tier] || 0) + 1;
    });

    const tierDistribution = Object.entries(tierCounts).map(([tier, count]) => ({
      tier,
      count,
      percentage: totalCustomers > 0 ? (count / totalCustomers) * 100 : 0,
    }));

    // Monthly growth (last 6 months)
    const monthlyGrowth: Array<{
      month: string;
      newCustomers: number;
      totalCustomers: number;
    }> = [];

    for (let i = 5; i >= 0; i--) {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const nextMonth = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);

      const monthLabel = monthDate.toLocaleDateString("en-US", {
        month: "short",
        year: "numeric",
      });

      const newInMonth = customers.filter(
        (c: CustomerType) => c.createdAt >= monthDate && c.createdAt < nextMonth
      ).length;

      const totalByMonth = customers.filter(
        (c: CustomerType) => c.createdAt < nextMonth
      ).length;

      monthlyGrowth.push({
        month: monthLabel,
        newCustomers: newInMonth,
        totalCustomers: totalByMonth,
      });
    }

    return NextResponse.json({
      summary: {
        totalCustomers,
        newCustomers,
        returningCustomers,
        averageVisits,
        averageSpending,
      },
      topSpenders,
      tierDistribution,
      monthlyGrowth,
    });
  } catch (error) {
    console.error("Error fetching customer report:", error);
    return NextResponse.json({ error: "Failed to fetch customer report" }, { status: 500 });
  }
}
