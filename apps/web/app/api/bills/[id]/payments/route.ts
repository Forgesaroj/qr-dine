import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { awardPoints, redeemPoints, awardVisitMilestone } from "@/lib/loyalty";

// Check if user can process payments (waiters cannot)
function canProcessPayments(role: string): boolean {
  return role !== "WAITER";
}

// POST add payment to bill
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Waiters cannot process payments
    if (!canProcessPayments(session.role)) {
      return NextResponse.json(
        { error: "You do not have permission to process payments" },
        { status: 403 }
      );
    }

    const { id: billId } = await params;
    const body = await request.json();
    const { amount, method, transactionId, reference, cashReceived, pointsToRedeem } = body;

    if (!amount || !method) {
      return NextResponse.json(
        { error: "Amount and payment method are required" },
        { status: 400 }
      );
    }

    // Verify bill exists and belongs to restaurant
    const bill = await prisma.bill.findFirst({
      where: {
        id: billId,
        restaurantId: session.restaurantId,
      },
      include: {
        payments: true,
        order: {
          include: {
            table: true,
            customer: true,
          },
        },
        customer: true,
      },
    });

    if (!bill) {
      return NextResponse.json({ error: "Bill not found" }, { status: 404 });
    }

    type PaymentType = typeof bill.payments[number];

    if (bill.status === "PAID" || bill.status === "CANCELLED") {
      return NextResponse.json(
        { error: "Bill is already paid or cancelled" },
        { status: 400 }
      );
    }

    // Handle points redemption if requested
    let pointsDiscount = 0;
    const customerId = bill.customerId || bill.order?.customerId;

    if (pointsToRedeem && pointsToRedeem > 0 && customerId) {
      const redeemResult = await redeemPoints(
        customerId,
        billId,
        pointsToRedeem,
        session.restaurantId
      );

      if (!redeemResult.success) {
        return NextResponse.json(
          { error: redeemResult.error || "Failed to redeem points" },
          { status: 400 }
        );
      }

      pointsDiscount = redeemResult.discountAmount;
    }

    // Calculate change for cash payments
    let changeGiven = null;
    if (method === "CASH" && cashReceived) {
      changeGiven = cashReceived - amount;
    }

    // Create payment
    const payment = await prisma.payment.create({
      data: {
        billId,
        amount,
        method,
        transactionId,
        reference,
        cashReceived,
        changeGiven,
        status: "COMPLETED",
        processedById: session.userId,
        processedAt: new Date(),
      },
    });

    // Calculate total paid
    const totalPaid =
      bill.payments.reduce((sum: number, p: PaymentType) => sum + p.amount, 0) + amount;

    // Check if bill is fully paid
    let loyaltyResult = null;

    if (totalPaid >= bill.totalAmount) {
      // Mark bill as paid
      await prisma.bill.update({
        where: { id: billId },
        data: {
          status: "PAID",
          paymentStatus: "COMPLETED",
          paymentMethod: method,
          settledById: session.userId,
          settledAt: new Date(),
        },
      });

      // Mark table as CLEANING and generate new OTP (per SESSION_FLOW_SPEC.md)
      if (bill.order?.table) {
        const newOtp = String(Math.floor(100 + Math.random() * 900)); // 3-digit OTP
        await prisma.table.update({
          where: { id: bill.order.table.id },
          data: {
            status: "CLEANING",
            currentOtp: newOtp,
            otpGeneratedAt: new Date(),
          },
        });

        // End any active session for this table
        await prisma.tableSession.updateMany({
          where: {
            tableId: bill.order.table.id,
            status: "ACTIVE",
          },
          data: {
            status: "COMPLETED",
            endedAt: new Date(),
            paymentCompletedAt: new Date(),
          },
        });
      }

      // Award loyalty points if customer exists
      if (customerId && bill.orderId) {
        loyaltyResult = await awardPoints(
          customerId,
          bill.orderId,
          bill.totalAmount - pointsDiscount,
          session.restaurantId
        );

        // Check and award visit milestone
        const customer = await prisma.customer.findUnique({
          where: { id: customerId },
          select: { totalVisits: true },
        });

        if (customer) {
          const milestoneResult = await awardVisitMilestone(
            customerId,
            customer.totalVisits,
            session.restaurantId
          );

          if (milestoneResult.isMilestone && milestoneResult.pointsAwarded > 0) {
            loyaltyResult = {
              ...loyaltyResult,
              milestoneBonus: {
                isMilestone: true,
                pointsAwarded: milestoneResult.pointsAwarded,
                message: milestoneResult.milestoneMessage,
              },
              newBalance: milestoneResult.newBalance,
            };
          }
        }
      }
    } else {
      // Update to partially paid
      await prisma.bill.update({
        where: { id: billId },
        data: {
          status: "PARTIALLY_PAID",
          paymentStatus: "PENDING",
        },
      });
    }

    // Get updated bill
    const updatedBill = await prisma.bill.findUnique({
      where: { id: billId },
      include: {
        order: {
          include: {
            table: { select: { tableNumber: true, name: true } },
            items: true,
          },
        },
        payments: {
          include: {
            processedBy: { select: { name: true } },
          },
        },
      },
    });

    return NextResponse.json({
      payment,
      bill: updatedBill,
      loyalty: loyaltyResult,
      pointsDiscount,
    }, { status: 201 });
  } catch (error) {
    console.error("Error processing payment:", error);
    return NextResponse.json(
      { error: "Failed to process payment" },
      { status: 500 }
    );
  }
}
