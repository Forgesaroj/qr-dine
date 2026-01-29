import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// Roles that can make payments
const PAYMENT_ROLES = ["OWNER", "MANAGER", "ACCOUNTANT"];

// ═══════════════════════════════════════════════════════════════════════════════
// GET - Get payment history for purchase
// ═══════════════════════════════════════════════════════════════════════════════

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: purchaseId } = await params;

    // Verify purchase exists
    const purchase = await prisma.purchase.findFirst({
      where: {
        id: purchaseId,
        restaurantId: session.restaurantId,
      },
      select: {
        id: true,
        purchaseNumber: true,
        totalAmount: true,
        amountPaid: true,
        paymentStatus: true,
        vendorName: true,
      },
    });

    if (!purchase) {
      return NextResponse.json({ error: "Purchase not found" }, { status: 404 });
    }

    const payments = await prisma.purchasePayment.findMany({
      where: { purchaseId },
      orderBy: { paymentDate: "desc" },
    });

    const totalAmount = Number(purchase.totalAmount);
    const amountPaid = Number(purchase.amountPaid);
    const balance = totalAmount - amountPaid;

    return NextResponse.json({
      purchase: {
        id: purchase.id,
        purchaseNumber: purchase.purchaseNumber,
        totalAmount,
        amountPaid,
        balance,
        paymentStatus: purchase.paymentStatus,
        vendorName: purchase.vendorName,
      },
      payments: payments.map(p => ({
        ...p,
        amount: Number(p.amount),
      })),
    });
  } catch (error) {
    console.error("Error fetching payments:", error);
    return NextResponse.json(
      { error: "Failed to fetch payments" },
      { status: 500 }
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// POST - Record payment for purchase
// ═══════════════════════════════════════════════════════════════════════════════

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!PAYMENT_ROLES.includes(session.role)) {
      return NextResponse.json(
        { error: "You do not have permission to record payments" },
        { status: 403 }
      );
    }

    const { id: purchaseId } = await params;
    const body = await request.json();
    const { amount, method, reference, transactionId, paymentDate, notes } = body;

    // Validate
    if (!amount || amount <= 0) {
      return NextResponse.json(
        { error: "Valid payment amount is required" },
        { status: 400 }
      );
    }

    if (!method) {
      return NextResponse.json(
        { error: "Payment method is required" },
        { status: 400 }
      );
    }

    // Get purchase with vendor
    const purchase = await prisma.purchase.findFirst({
      where: {
        id: purchaseId,
        restaurantId: session.restaurantId,
      },
      include: {
        vendor: true,
      },
    });

    if (!purchase) {
      return NextResponse.json({ error: "Purchase not found" }, { status: 404 });
    }

    // Only received purchases can be paid
    if (!["RECEIVED", "APPROVED", "PAID"].includes(purchase.status)) {
      return NextResponse.json(
        { error: "Purchase must be received before payment" },
        { status: 400 }
      );
    }

    // Check if already fully paid
    if (purchase.paymentStatus === "PAID") {
      return NextResponse.json(
        { error: "Purchase is already fully paid" },
        { status: 400 }
      );
    }

    const totalAmount = Number(purchase.totalAmount);
    const currentPaid = Number(purchase.amountPaid);
    const remaining = totalAmount - currentPaid;

    if (amount > remaining + 0.01) { // Small tolerance for rounding
      return NextResponse.json(
        { error: `Payment amount exceeds remaining balance of Rs. ${remaining.toFixed(2)}` },
        { status: 400 }
      );
    }

    // Get user name
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { name: true },
    });

    // Record payment in transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create payment record
      const payment = await tx.purchasePayment.create({
        data: {
          purchaseId,
          amount,
          method,
          reference,
          transactionId,
          paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
          paidById: session.userId,
          paidByName: user?.name || session.email,
          notes,
        },
      });

      // Update purchase amounts
      const newAmountPaid = currentPaid + amount;
      const isFullyPaid = Math.abs(newAmountPaid - totalAmount) < 0.01;

      await tx.purchase.update({
        where: { id: purchaseId },
        data: {
          amountPaid: newAmountPaid,
          paymentStatus: isFullyPaid ? "PAID" : "PARTIALLY_PAID",
        },
      });

      // Update vendor balance
      await tx.vendor.update({
        where: { id: purchase.vendorId },
        data: {
          totalPaid: { increment: amount },
          balance: { decrement: amount },
        },
      });

      return payment;
    });

    // Get updated purchase
    const updatedPurchase = await prisma.purchase.findUnique({
      where: { id: purchaseId },
      select: {
        amountPaid: true,
        paymentStatus: true,
        totalAmount: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Payment recorded successfully",
      payment: {
        ...result,
        amount: Number(result.amount),
      },
      purchase: {
        totalAmount: Number(updatedPurchase?.totalAmount),
        amountPaid: Number(updatedPurchase?.amountPaid),
        balance: Number(updatedPurchase?.totalAmount) - Number(updatedPurchase?.amountPaid),
        paymentStatus: updatedPurchase?.paymentStatus,
      },
    });
  } catch (error) {
    console.error("Error recording payment:", error);
    return NextResponse.json(
      { error: "Failed to record payment" },
      { status: 500 }
    );
  }
}
