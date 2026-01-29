import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/guest/loyalty/history
 * Get points transaction history for a customer
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");
    const restaurantSlug = searchParams.get("restaurant");
    const limit = parseInt(searchParams.get("limit") || "20");
    const offset = parseInt(searchParams.get("offset") || "0");

    if (!token) {
      return NextResponse.json(
        { error: "Token is required" },
        { status: 400 }
      );
    }

    if (!restaurantSlug) {
      return NextResponse.json(
        { error: "Restaurant slug is required" },
        { status: 400 }
      );
    }

    // Find customer by device token
    const device = await prisma.customerDevice.findFirst({
      where: { deviceFingerprint: token, isActive: true },
      include: {
        customer: {
          select: {
            id: true,
            restaurantId: true,
          },
        },
      },
    });

    if (!device?.customer) {
      return NextResponse.json(
        { error: "Customer not found" },
        { status: 404 }
      );
    }

    // Get restaurant to verify
    const restaurant = await prisma.restaurant.findUnique({
      where: { slug: restaurantSlug },
      select: { id: true },
    });

    if (!restaurant || restaurant.id !== device.customer.restaurantId) {
      return NextResponse.json(
        { error: "Restaurant mismatch" },
        { status: 403 }
      );
    }

    // Get transaction history
    const [transactions, total] = await Promise.all([
      prisma.pointsTransaction.findMany({
        where: { customerId: device.customer.id },
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
        select: {
          id: true,
          type: true,
          points: true,
          balanceAfter: true,
          reason: true,
          bonusType: true,
          createdAt: true,
          expiresAt: true,
          orderId: true,
          orderAmount: true,
        },
      }),
      prisma.pointsTransaction.count({
        where: { customerId: device.customer.id },
      }),
    ]);

    // Format transactions for display
    const formattedTransactions = transactions.map((tx) => ({
      id: tx.id,
      type: tx.type,
      points: tx.points,
      balanceAfter: tx.balanceAfter,
      description: tx.reason || getDefaultDescription(tx.type, tx.bonusType, tx.points),
      bonusType: tx.bonusType,
      date: tx.createdAt,
      expiresAt: tx.expiresAt,
      orderId: tx.orderId,
      orderAmount: tx.orderAmount,
    }));

    return NextResponse.json({
      success: true,
      transactions: formattedTransactions,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    });
  } catch (error) {
    console.error("Error fetching loyalty history:", error);
    return NextResponse.json(
      { error: "Failed to fetch loyalty history" },
      { status: 500 }
    );
  }
}

function getDefaultDescription(
  type: string,
  bonusType: string | null,
  points: number
): string {
  switch (type) {
    case "EARN":
      return `Earned ${points} points on order`;
    case "REDEEM":
      return `Redeemed ${Math.abs(points)} points`;
    case "BONUS":
      switch (bonusType) {
        case "WELCOME":
          return "Welcome bonus";
        case "BIRTHDAY":
          return "Birthday bonus";
        case "MILESTONE":
          return "Visit milestone bonus";
        case "REFERRAL":
          return "Referral bonus";
        default:
          return "Bonus points";
      }
    case "EXPIRE":
      return `${Math.abs(points)} points expired`;
    case "ADJUST":
      return points > 0 ? "Points adjustment (credit)" : "Points adjustment (debit)";
    default:
      return "Points transaction";
  }
}
