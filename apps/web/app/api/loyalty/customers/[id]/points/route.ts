import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// POST adjust customer points (add bonus or deduct)
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only OWNER and MANAGER can adjust points
    if (!["OWNER", "MANAGER", "SUPER_ADMIN"].includes(session.role)) {
      return NextResponse.json(
        { error: "Only owners and managers can adjust points" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { type, points, reason, bonusType } = body;

    if (!type || !points || points === 0) {
      return NextResponse.json(
        { error: "Type and points are required" },
        { status: 400 }
      );
    }

    if (!["BONUS", "ADJUST"].includes(type)) {
      return NextResponse.json(
        { error: "Type must be BONUS or ADJUST" },
        { status: 400 }
      );
    }

    // Verify customer exists in this restaurant
    const customer = await prisma.customer.findFirst({
      where: {
        id: params.id,
        restaurantId: session.restaurantId,
      },
    });

    if (!customer) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    // Calculate new balance
    const newBalance = customer.pointsBalance + points;

    if (newBalance < 0) {
      return NextResponse.json(
        { error: "Insufficient points balance" },
        { status: 400 }
      );
    }

    // Update customer and create transaction in a transaction
    const [updatedCustomer, transaction] = await prisma.$transaction([
      prisma.customer.update({
        where: { id: params.id },
        data: {
          pointsBalance: newBalance,
          ...(points > 0 && {
            pointsEarnedLifetime: { increment: points },
          }),
        },
      }),
      prisma.pointsTransaction.create({
        data: {
          customerId: params.id,
          type,
          points,
          balanceAfter: newBalance,
          bonusType: bonusType || null,
          reason: reason || `Manual ${points > 0 ? "bonus" : "adjustment"} by staff`,
          adjustedById: session.userId,
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      customer: {
        id: updatedCustomer.id,
        pointsBalance: updatedCustomer.pointsBalance,
        pointsEarnedLifetime: updatedCustomer.pointsEarnedLifetime,
      },
      transaction,
    });
  } catch (error) {
    console.error("Error adjusting points:", error);
    return NextResponse.json(
      { error: "Failed to adjust points" },
      { status: 500 }
    );
  }
}
