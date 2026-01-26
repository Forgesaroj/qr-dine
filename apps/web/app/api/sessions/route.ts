import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

/**
 * GET /api/sessions
 * Get sessions for the restaurant with optional filters
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status"); // ACTIVE, COMPLETED, or null for all
    const tableId = searchParams.get("tableId");
    const includeOrders = searchParams.get("include")?.includes("orders");
    const limit = parseInt(searchParams.get("limit") || "50");

    // Build where clause
    const where: any = {
      restaurantId: session.restaurantId,
    };

    if (status) {
      where.status = status;
    }

    if (tableId) {
      where.tableId = tableId;
    }

    // Fetch sessions
    const sessions = await prisma.tableSession.findMany({
      where,
      orderBy: { seatedAt: "desc" },
      take: limit,
      select: {
        id: true,
        guestCount: true,
        status: true,
        phase: true,
        otpVerified: true,
        seatedAt: true,
        firstOrderAt: true,
        lastOrderAt: true,
        firstFoodServedAt: true,
        lastFoodServedAt: true,
        billRequestedAt: true,
        paymentCompletedAt: true,
        vacatedAt: true,
        qrScannedAt: true,
        otpHelpNotifiedAt: true,
        orderHelpNotifiedAt: true,
        longStayAlertAt: true,
        totalDurationMinutes: true,
        table: {
          select: {
            id: true,
            tableNumber: true,
            name: true,
            status: true,
          },
        },
        waiter: {
          select: {
            id: true,
            name: true,
          },
        },
        customer: {
          select: {
            id: true,
            name: true,
            phone: true,
            tier: true,
          },
        },
        ...(includeOrders
          ? {
              orders: {
                select: {
                  id: true,
                  orderNumber: true,
                  status: true,
                  totalAmount: true,
                  placedAt: true,
                },
                orderBy: { placedAt: "desc" },
              },
            }
          : {}),
        _count: {
          select: {
            orders: true,
            assistanceRequests: true,
          },
        },
      },
    });

    // Transform to include order count
    const transformedSessions = sessions.map((s) => ({
      ...s,
      _orderCount: s._count.orders,
      _assistanceCount: s._count.assistanceRequests,
      _count: undefined,
    }));

    return NextResponse.json({
      sessions: transformedSessions,
      total: sessions.length,
    });
  } catch (error) {
    console.error("Error fetching sessions:", error);
    return NextResponse.json(
      { error: "Failed to fetch sessions" },
      { status: 500 }
    );
  }
}
