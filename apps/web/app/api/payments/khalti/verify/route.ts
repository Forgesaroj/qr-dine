import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { khalti } from "@/lib/payment-gateways";
import { logActivity } from "@/lib/activity-log";

// GET Khalti payment verification callback
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const billId = searchParams.get("billId");
    const restaurant = searchParams.get("restaurant");
    const pidx = searchParams.get("pidx");
    const transactionId = searchParams.get("transaction_id");
    const amount = searchParams.get("amount");
    const status = searchParams.get("status");

    if (!billId || !pidx) {
      return NextResponse.redirect(
        new URL(`/${restaurant}/billing?error=missing_data`, request.url)
      );
    }

    // Check if payment was cancelled
    if (status === "User canceled") {
      return NextResponse.redirect(
        new URL(`/${restaurant}/billing?billId=${billId}&error=payment_cancelled`, request.url)
      );
    }

    // Check if sandbox mode was used
    const sandbox = searchParams.get("sandbox") === "true";

    // Verify the payment with Khalti
    const result = await khalti.verify(pidx, sandbox);

    if (!result.success) {
      console.error("Khalti verification failed:", result.message);
      return NextResponse.redirect(
        new URL(`/${restaurant}/billing?billId=${billId}&error=verification_failed`, request.url)
      );
    }

    // Get bill
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

    // Check if this transaction already exists
    const existingPayment = await prisma.payment.findFirst({
      where: {
        transactionId: result.transactionId,
        status: "COMPLETED",
      },
    });

    if (existingPayment) {
      // Already processed, redirect to success
      return NextResponse.redirect(
        new URL(
          `/${restaurant}/billing?billId=${billId}&success=already_processed`,
          request.url
        )
      );
    }

    // Record the payment in database
    const payment = await prisma.$transaction(async (tx) => {
      // Create payment record
      const newPayment = await tx.payment.create({
        data: {
          billId: bill.id,
          restaurantId: bill.restaurantId,
          amount: paidAmount,
          method: "KHALTI",
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
        description: `Received Rs. ${paidAmount} via Khalti for Bill #${bill.billNumber}`,
        details: {
          billNumber: bill.billNumber,
          amount: paidAmount,
          gateway: "KHALTI",
          transactionId: result.transactionId,
          pidx,
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
    console.error("Khalti verification callback error:", error);
    const { searchParams } = new URL(request.url);
    const restaurant = searchParams.get("restaurant");
    const billId = searchParams.get("billId");
    return NextResponse.redirect(
      new URL(`/${restaurant}/billing?billId=${billId}&error=processing_failed`, request.url)
    );
  }
}
