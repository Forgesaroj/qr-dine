import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// Roles that can manage purchases
const PURCHASE_MANAGEMENT_ROLES = ["OWNER", "MANAGER", "ACCOUNTANT"];

// ═══════════════════════════════════════════════════════════════════════════════
// GET - Get single purchase with details
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

    const { id } = await params;

    const purchase = await prisma.purchase.findFirst({
      where: {
        id,
        restaurantId: session.restaurantId,
      },
      include: {
        vendor: true,
        items: {
          orderBy: { serialNumber: "asc" },
        },
        payments: {
          orderBy: { paymentDate: "desc" },
        },
      },
    });

    if (!purchase) {
      return NextResponse.json({ error: "Purchase not found" }, { status: 404 });
    }

    return NextResponse.json({
      purchase: {
        ...purchase,
        subtotal: Number(purchase.subtotal),
        vatableAmount: Number(purchase.vatableAmount),
        vatAmount: Number(purchase.vatAmount),
        nonVatableAmount: Number(purchase.nonVatableAmount),
        capitalGoods: Number(purchase.capitalGoods),
        importAmount: Number(purchase.importAmount),
        discountAmount: Number(purchase.discountAmount),
        totalAmount: Number(purchase.totalAmount),
        amountPaid: Number(purchase.amountPaid),
        items: purchase.items.map(item => ({
          ...item,
          quantity: Number(item.quantity),
          unitPrice: Number(item.unitPrice),
          totalPrice: Number(item.totalPrice),
          quantityReceived: Number(item.quantityReceived),
        })),
        payments: purchase.payments.map(p => ({
          ...p,
          amount: Number(p.amount),
        })),
      },
    });
  } catch (error) {
    console.error("Error fetching purchase:", error);
    return NextResponse.json(
      { error: "Failed to fetch purchase" },
      { status: 500 }
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// PATCH - Update purchase status or details
// ═══════════════════════════════════════════════════════════════════════════════

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!PURCHASE_MANAGEMENT_ROLES.includes(session.role)) {
      return NextResponse.json(
        { error: "You do not have permission to update purchases" },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const { action, ...updateFields } = body;

    // Check if purchase exists
    const existingPurchase = await prisma.purchase.findFirst({
      where: {
        id,
        restaurantId: session.restaurantId,
      },
    });

    if (!existingPurchase) {
      return NextResponse.json({ error: "Purchase not found" }, { status: 404 });
    }

    // Handle specific actions
    if (action === "confirm") {
      if (existingPurchase.status !== "DRAFT") {
        return NextResponse.json(
          { error: "Only draft purchases can be confirmed" },
          { status: 400 }
        );
      }

      const purchase = await prisma.purchase.update({
        where: { id },
        data: { status: "CONFIRMED" },
      });

      return NextResponse.json({
        success: true,
        message: "Purchase confirmed",
        purchase,
      });
    }

    if (action === "receive") {
      if (!["CONFIRMED", "RECEIVED", "PARTIALLY_RECEIVED"].includes(existingPurchase.status)) {
        return NextResponse.json(
          { error: "Only confirmed purchases can be received" },
          { status: 400 }
        );
      }

      const purchase = await prisma.purchase.update({
        where: { id },
        data: {
          status: "RECEIVED",
          receivedAt: new Date(),
          receivedById: session.userId,
        },
      });

      // Update vendor stats
      await prisma.vendor.update({
        where: { id: existingPurchase.vendorId },
        data: {
          totalPurchases: { increment: Number(existingPurchase.totalAmount) },
          balance: { increment: Number(existingPurchase.totalAmount) },
        },
      });

      return NextResponse.json({
        success: true,
        message: "Purchase marked as received",
        purchase,
      });
    }

    if (action === "cancel") {
      if (existingPurchase.paymentStatus === "PAID") {
        return NextResponse.json(
          { error: "Cannot cancel paid purchases" },
          { status: 400 }
        );
      }

      const purchase = await prisma.purchase.update({
        where: { id },
        data: { status: "CANCELLED" },
      });

      return NextResponse.json({
        success: true,
        message: "Purchase cancelled",
        purchase,
      });
    }

    // Regular update (only for draft purchases)
    if (existingPurchase.status !== "DRAFT") {
      return NextResponse.json(
        { error: "Only draft purchases can be edited" },
        { status: 400 }
      );
    }

    const allowedFields = [
      "vendorInvoiceNumber",
      "notes",
      "internalNotes",
    ];

    const updateData: Record<string, unknown> = {};
    for (const field of allowedFields) {
      if (updateFields[field] !== undefined) {
        updateData[field] = updateFields[field];
      }
    }

    const purchase = await prisma.purchase.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      message: "Purchase updated",
      purchase,
    });
  } catch (error) {
    console.error("Error updating purchase:", error);
    return NextResponse.json(
      { error: "Failed to update purchase" },
      { status: 500 }
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// DELETE - Delete purchase (only drafts)
// ═══════════════════════════════════════════════════════════════════════════════

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!PURCHASE_MANAGEMENT_ROLES.includes(session.role)) {
      return NextResponse.json(
        { error: "You do not have permission to delete purchases" },
        { status: 403 }
      );
    }

    const { id } = await params;

    // Check if purchase exists and is draft
    const purchase = await prisma.purchase.findFirst({
      where: {
        id,
        restaurantId: session.restaurantId,
      },
    });

    if (!purchase) {
      return NextResponse.json({ error: "Purchase not found" }, { status: 404 });
    }

    if (purchase.status !== "DRAFT") {
      return NextResponse.json(
        { error: "Only draft purchases can be deleted" },
        { status: 400 }
      );
    }

    // Delete purchase (items will be cascade deleted)
    await prisma.purchase.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: "Purchase deleted",
    });
  } catch (error) {
    console.error("Error deleting purchase:", error);
    return NextResponse.json(
      { error: "Failed to delete purchase" },
      { status: 500 }
    );
  }
}
