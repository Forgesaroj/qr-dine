import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get stats
    const [
      totalRestaurants,
      activeRestaurants,
      totalUsers,
      activeLicenses,
      expiringLicenses,
    ] = await Promise.all([
      prisma.restaurant.count(),
      prisma.restaurant.count({
        where: { status: "ACTIVE" },
      }),
      prisma.user.count(),
      prisma.license.count({
        where: { status: "ACTIVE" },
      }),
      prisma.license.count({
        where: {
          status: "ACTIVE",
          expiresAt: {
            lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
            gte: new Date(),
          },
        },
      }),
    ]);

    // Get new restaurants this month
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const newRestaurantsThisMonth = await prisma.restaurant.count({
      where: {
        createdAt: { gte: startOfMonth },
      },
    });

    // Get recent activities
    const recentActivities = await prisma.activityLog.findMany({
      take: 10,
      orderBy: { createdAt: "desc" },
      include: {
        restaurant: {
          select: { name: true },
        },
      },
    });

    const stats = {
      totalRestaurants,
      activeRestaurants,
      totalUsers,
      activeLicenses,
      expiringLicenses,
      monthlyRevenue: 0, // Placeholder - would come from payment system
      newRestaurantsThisMonth,
      systemHealth: "healthy" as const,
    };

    const activities = recentActivities.map((log: typeof recentActivities[number]) => ({
      id: log.id,
      type: log.action,
      message: `${log.action} on ${log.entityType}`,
      timestamp: log.createdAt.toISOString(),
      restaurantName: log.restaurant?.name || null,
    }));

    return NextResponse.json({ stats, activities });
  } catch (error) {
    console.error("Error fetching super admin dashboard:", error);
    return NextResponse.json(
      { error: "Failed to fetch dashboard data" },
      { status: 500 }
    );
  }
}
