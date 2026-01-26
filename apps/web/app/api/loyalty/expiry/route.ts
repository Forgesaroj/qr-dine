import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { processExpiredPoints, checkInactivityExpiry, getExpiringPoints } from "@/lib/loyalty";
import { prisma } from "@/lib/prisma";

// GET - Get expiry status for restaurant
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only managers and admins can view expiry info
    if (!["ADMIN", "MANAGER", "OWNER"].includes(session.role)) {
      return NextResponse.json(
        { error: "You do not have permission to view expiry information" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get("customerId");

    // If specific customer requested
    if (customerId) {
      const expiryInfo = await getExpiringPoints(customerId);
      return NextResponse.json(expiryInfo);
    }

    // Get overall expiry stats
    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    // Count customers with expiring points
    const customersWithExpiring = await prisma.customer.count({
      where: {
        restaurantId: session.restaurantId,
        status: "ACTIVE",
        pointsBalance: { gt: 0 },
      },
    });

    // Get total expiring points in next 30 days
    const expiringTransactions = await prisma.pointsTransaction.aggregate({
      where: {
        customer: { restaurantId: session.restaurantId },
        type: "EARN",
        points: { gt: 0 },
        expiresAt: {
          gte: now,
          lte: thirtyDaysFromNow,
        },
      },
      _sum: { points: true },
      _count: true,
    });

    // Get customers at risk of inactivity expiry using order history
    const inactivityThreshold = new Date(now.getTime() - 330 * 24 * 60 * 60 * 1000); // 11 months
    const customersWithActivity = await prisma.customer.findMany({
      where: {
        restaurantId: session.restaurantId,
        status: "ACTIVE",
        pointsBalance: { gt: 0 },
      },
      select: {
        id: true,
        orders: {
          orderBy: { placedAt: "desc" },
          take: 1,
          select: { placedAt: true },
        },
      },
    });

    type CustomerWithActivity = typeof customersWithActivity[number];

    // Count customers whose last order was before the threshold
    const customersAtRisk = customersWithActivity.filter((c: CustomerWithActivity) => {
      const lastOrder = c.orders[0]?.placedAt;
      return !lastOrder || lastOrder < inactivityThreshold;
    }).length;

    return NextResponse.json({
      totalCustomersWithPoints: customersWithExpiring,
      expiringInNext30Days: {
        points: expiringTransactions._sum.points || 0,
        transactions: expiringTransactions._count,
      },
      customersAtInactivityRisk: customersAtRisk,
    });
  } catch (error) {
    console.error("Error getting expiry status:", error);
    return NextResponse.json(
      { error: "Failed to get expiry status" },
      { status: 500 }
    );
  }
}

// POST - Process expired points
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only admins can process expiry
    if (!["ADMIN", "OWNER"].includes(session.role)) {
      return NextResponse.json(
        { error: "You do not have permission to process point expiry" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { action } = body;

    if (action === "process_expired") {
      // Process all expired points
      const result = await processExpiredPoints(session.restaurantId);
      return NextResponse.json({
        success: true,
        ...result,
        message: `Processed ${result.processedCustomers} customers, expired ${result.totalPointsExpired} points`,
      });
    }

    if (action === "check_inactivity") {
      // Check and process inactivity-based expiry
      const result = await checkInactivityExpiry(session.restaurantId);
      return NextResponse.json({
        success: true,
        ...result,
        message: `${result.customersExpired} customers had points expired due to inactivity. ${result.customersAtRisk} customers are at risk.`,
      });
    }

    return NextResponse.json(
      { error: "Invalid action. Use 'process_expired' or 'check_inactivity'" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Error processing expiry:", error);
    return NextResponse.json(
      { error: "Failed to process expiry" },
      { status: 500 }
    );
  }
}
