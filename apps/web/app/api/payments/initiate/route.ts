import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { esewa, khalti, getAvailableGateways, isSandboxMode } from "@/lib/payment-gateways";

// POST initiate a payment
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { billId, gateway, customerName, customerPhone } = body;

    if (!billId || !gateway) {
      return NextResponse.json(
        { error: "Bill ID and gateway are required" },
        { status: 400 }
      );
    }

    // Get bill details
    const bill = await prisma.bill.findFirst({
      where: {
        id: billId,
        restaurantId: session.restaurantId,
      },
      include: {
        restaurant: {
          select: {
            name: true,
          },
        },
      },
    });

    if (!bill) {
      return NextResponse.json({ error: "Bill not found" }, { status: 404 });
    }

    if (bill.status === "PAID") {
      return NextResponse.json(
        { error: "Bill is already paid" },
        { status: 400 }
      );
    }

    // Calculate remaining amount
    const paidAmount = await prisma.payment.aggregate({
      where: {
        billId: bill.id,
        status: "COMPLETED",
      },
      _sum: {
        amount: true,
      },
    });

    const remainingAmount = bill.totalAmount - (paidAmount._sum.amount || 0);

    if (remainingAmount <= 0) {
      return NextResponse.json(
        { error: "No amount pending for payment" },
        { status: 400 }
      );
    }

    const paymentRequest = {
      amount: remainingAmount,
      billId: bill.id,
      billNumber: bill.billNumber,
      restaurantId: session.restaurantId,
      restaurantName: bill.restaurant.name,
      customerName,
      customerPhone,
    };

    let result;

    const sandboxMode = isSandboxMode();

    switch (gateway.toUpperCase()) {
      case "ESEWA":
        if (!esewa.isEnabled()) {
          return NextResponse.json(
            { error: "eSewa is not configured" },
            { status: 400 }
          );
        }
        // For eSewa, we return form data for client-side submission
        const formData = esewa.initiate(paymentRequest);
        return NextResponse.json({
          success: true,
          gateway: "ESEWA",
          method: "FORM",
          formUrl: esewa.getFormUrl(),
          formData,
          amount: remainingAmount,
          sandboxMode,
          sandboxWarning: sandboxMode ? "⚠️ SANDBOX MODE - No real money will be charged" : undefined,
        });

      case "KHALTI":
        if (!khalti.isEnabled()) {
          return NextResponse.json(
            { error: "Khalti is not configured" },
            { status: 400 }
          );
        }
        result = await khalti.initiate(paymentRequest);
        if (result.success) {
          return NextResponse.json({
            success: true,
            gateway: "KHALTI",
            method: "REDIRECT",
            paymentUrl: result.data?.paymentUrl,
            pidx: result.data?.pidx,
            transactionId: result.transactionId,
            amount: remainingAmount,
            sandboxMode,
            sandboxWarning: sandboxMode ? "⚠️ SANDBOX MODE - No real money will be charged" : undefined,
          });
        }
        return NextResponse.json(
          { error: result.message, sandboxMode },
          { status: 400 }
        );

      case "FONEPAY":
        return NextResponse.json(
          { error: "Fonepay integration coming soon", sandboxMode },
          { status: 501 }
        );

      default:
        return NextResponse.json(
          { error: `Unknown gateway: ${gateway}`, sandboxMode },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("Payment initiation error:", error);
    return NextResponse.json(
      { error: "Failed to initiate payment" },
      { status: 500 }
    );
  }
}
