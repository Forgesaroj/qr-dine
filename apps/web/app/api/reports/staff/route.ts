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

    // Fetch staff members
    const staff = await prisma.user.findMany({
      where: {
        restaurantId: session.restaurantId,
        status: "ACTIVE",
      },
      select: {
        id: true,
        name: true,
        role: true,
      },
    });

    // Get orders served by each staff member
    const staffOrders = await prisma.order.groupBy({
      by: ["servedById"],
      where: {
        restaurantId: session.restaurantId,
        createdAt: { gte: startDate },
        status: { notIn: ["CANCELLED"] },
        servedById: { not: null },
      },
      _sum: {
        totalAmount: true,
      },
      _count: {
        id: true,
      },
    });

    // Get attendance/shifts for hours worked
    const attendance = await prisma.staffAttendance.findMany({
      where: {
        user: {
          restaurantId: session.restaurantId,
        },
        clockIn: { gte: startDate },
        clockOut: { not: null },
      },
      select: {
        userId: true,
        clockIn: true,
        clockOut: true,
      },
    });

    // Calculate hours worked per staff
    const hoursWorked: Record<string, number> = {};
    attendance.forEach((a: typeof attendance[number]) => {
      if (a.clockIn && a.clockOut) {
        const hours = (a.clockOut.getTime() - a.clockIn.getTime()) / (1000 * 60 * 60);
        hoursWorked[a.userId] = (hoursWorked[a.userId] || 0) + hours;
      }
    });

    // Map orders to staff
    const staffOrderMap = new Map<string | null, { sales: number; orders: number }>(
      staffOrders.map((so: typeof staffOrders[number]) => [
        so.servedById,
        { sales: so._sum.totalAmount || 0, orders: so._count.id },
      ])
    );

    // Build staff performance data
    const allStaff = staff.map((s: typeof staff[number]) => {
      const orderData = staffOrderMap.get(s.id) || { sales: 0, orders: 0 };
      const hours = hoursWorked[s.id] || 0;
      return {
        id: s.id,
        name: s.name,
        role: s.role,
        ordersServed: orderData.orders,
        totalSales: orderData.sales,
        averageOrderValue: orderData.orders > 0 ? orderData.sales / orderData.orders : 0,
        hoursWorked: hours,
        salesPerHour: hours > 0 ? orderData.sales / hours : 0,
      };
    });

    // Sort by sales
    const sortedStaff = [...allStaff].sort((a, b) => b.totalSales - a.totalSales);

    // Top performers
    const topPerformers = sortedStaff.slice(0, 5);

    // Role breakdown
    const roleMap: Record<string, { count: number; sales: number; orders: number }> = {};
    allStaff.forEach((s: typeof allStaff[number]) => {
      if (!roleMap[s.role]) {
        roleMap[s.role] = { count: 0, sales: 0, orders: 0 };
      }
      roleMap[s.role]!.count += 1;
      roleMap[s.role]!.sales += s.totalSales;
      roleMap[s.role]!.orders += s.ordersServed;
    });

    const roleBreakdown = Object.entries(roleMap).map(([role, data]) => ({
      role,
      count: data.count,
      sales: data.sales,
      orders: data.orders,
    }));

    // Summary
    const totalStaff = staff.length;
    const activeStaff = allStaff.filter((s: typeof allStaff[number]) => s.totalSales > 0).length;
    const totalSales = allStaff.reduce((sum: number, s: typeof allStaff[number]) => sum + s.totalSales, 0);
    const totalOrders = allStaff.reduce((sum: number, s: typeof allStaff[number]) => sum + s.ordersServed, 0);
    const averageSalesPerStaff = activeStaff > 0 ? totalSales / activeStaff : 0;

    return NextResponse.json({
      summary: {
        totalStaff,
        activeStaff,
        totalSales,
        totalOrders,
        averageSalesPerStaff,
      },
      topPerformers,
      allStaff: sortedStaff,
      roleBreakdown,
    });
  } catch (error) {
    console.error("Error fetching staff report:", error);
    return NextResponse.json({ error: "Failed to fetch staff report" }, { status: 500 });
  }
}
