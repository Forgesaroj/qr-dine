import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { esewa } from "@/lib/payment-gateways";
import { logActivity } from "@/lib/activity-log";

// GET eSewa payment success callback
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const billId = searchParams.get("billId");
    const restaurant = searchParams.get("restaurant");
    const data = searchParams.get("data"); // Base64 encoded response from eSewa

    if (!billId || !data) {
      return NextResponse.redirect(
        new URL(`/${restaurant}/billing?error=missing_data`, request.url)
      );
    }

    // Verify the payment with eSewa
    const result = await esewa.verify({ data });

    if (!result.success) {
      console.error("eSewa verification failed:", result.message);
      return NextResponse.redirect(
        new URL(`/${restaurant}/billing?billId=${billId}&error=verification_failed`, request.url)
      );
    }

    // Get bill and verify amount
    const bill = await prisma.bill.findUnique({
      where: { id: billId },
      include: {
        restaurant: true,
      },
    });

    if (!bill) {
      return NextResponse.redirect(
        new URL(`/${restaurant}/billing?error=bill_not_found`, request.url)
      );
    }

    const paidAmount = result.data?.amount as number;

    // Record the payment in database
    const payment = await prisma.$transaction(async (tx) => {
      // Create payment record
      const newPayment = await tx.payment.create({
        data: {
          billId: bill.id,
          restaurantId: bill.restaurantId,
          amount: paidAmount,
          method: "ESEWA",
          status: "COMPLETED",
          transactionId: result.transactionId,
          gatewayResponse: JSON.stringify(result.data),
          paidAt: new Date(),
        },
      });

      // Calculate total paid
      const totalPaid = await tx.payment.aggregate({
        where: {
          billId: bill.id,
          status: "COMPLETED",
        },
        _sum: {
          amount: true,
        },
      });

      const totalPaidAmount = totalPaid._sum.amount || 0;

      // Update bill status
      let newBillStatus = bill.status;
      if (totalPaidAmount >= bill.totalAmount) {
        newBillStatus = "PAID";
      } else if (totalPaidAmount > 0) {
        newBillStatus = "PARTIALLY_PAID";
      }

      if (newBillStatus !== bill.status) {
        await tx.bill.update({
          where: { id: bill.id },
          data: {
            status: newBillStatus,
            paymentStatus: newBillStatus === "PAID" ? "COMPLETED" : "PENDING",
            paidAt: newBillStatus === "PAID" ? new Date() : undefined,
          },
        });
      }

      // Log activity
      await logActivity({
        restaurantId: bill.restaurantId,
        activityType: "payment.received",
        entityType: "billing",
        entityId: bill.id,
        priority: "info",
        description: `Received Rs. ${paidAmount} via eSewa for Bill #${bill.billNumber}`,
        details: {
          billNumber: bill.billNumber,
          amount: paidAmount,
          gateway: "ESEWA",
          transactionId: result.transactionId,
        },
      });

      return newPayment;
    });

    // Redirect to billing page with success message
    return NextResponse.redirect(
      new URL(
        `/${restaurant}/billing?billId=${billId}&success=payment_received&amount=${paidAmount}`,
        request.url
      )
    );
  } catch (error) {
    console.error("eSewa success callback error:", error);
    const { searchParams } = new URL(request.url);
    const restaurant = searchParams.get("restaurant");
    return NextResponse.redirect(
      new URL(`/${restaurant}/billing?error=processing_failed`, request.url)
    );
  }
}
