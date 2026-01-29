import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// Roles that can finalize bills
const FINALIZE_ALLOWED_ROLES = ["OWNER", "MANAGER", "CASHIER"];

// POST - Finalize a bill (lock it for editing)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user has permission to finalize bills
    if (!FINALIZE_ALLOWED_ROLES.includes(session.role)) {
      return NextResponse.json(
        { error: "You do not have permission to finalize bills" },
        { status: 403 }
      );
    }

    const { id: billId } = await params;

    // Get the bill
    const bill = await prisma.bill.findFirst({
      where: {
        id: billId,
        restaurantId: session.restaurantId,
      },
      include: {
        billItems: true,
      },
    });

    if (!bill) {
      return NextResponse.json({ error: "Bill not found" }, { status: 404 });
    }

    // Check if bill is already finalized
    if (bill.status !== "DRAFT") {
      return NextResponse.json(
        { error: "Bill is already finalized" },
        { status: 400 }
      );
    }

    // Verify bill has items
    if (bill.billItems.length === 0) {
      return NextResponse.json(
        { error: "Cannot finalize bill with no items" },
        { status: 400 }
      );
    }

    // Finalize the bill
    const updatedBill = await prisma.bill.update({
      where: { id: billId },
      data: {
        status: "FINALIZED",
        finalizedAt: new Date(),
        finalizedById: session.userId,
      },
      include: {
        billItems: true,
        order: {
          include: {
            table: { select: { tableNumber: true, name: true } },
          },
        },
      },
    });

    // Create edit log for finalization
    await prisma.billEditLog.create({
      data: {
        billId,
        restaurantId: session.restaurantId,
        action: "OTHER",
        editedById: session.userId,
        editedByName: session.email,
        editedByRole: session.role,
        description: "Bill finalized - locked for editing",
        oldValue: { status: "DRAFT" },
        newValue: { status: "FINALIZED" },
      },
    });

    return NextResponse.json({
      success: true,
      message: "Bill finalized successfully. It can no longer be edited.",
      bill: updatedBill,
    });
  } catch (error) {
    console.error("Error finalizing bill:", error);
    return NextResponse.json(
      { error: "Failed to finalize bill" },
      { status: 500 }
    );
  }
}

// DELETE - Revert to draft (only for managers/owners, with reason)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only managers and owners can revert finalized bills
    if (!["OWNER", "MANAGER"].includes(session.role)) {
      return NextResponse.json(
        { error: "Only managers and owners can revert finalized bills" },
        { status: 403 }
      );
    }

    const { id: billId } = await params;
    const body = await request.json();
    const { reason } = body;

    if (!reason) {
      return NextResponse.json(
        { error: "Reason is required to revert finalized bill" },
        { status: 400 }
      );
    }

    // Get the bill
    const bill = await prisma.bill.findFirst({
      where: {
        id: billId,
        restaurantId: session.restaurantId,
      },
    });

    if (!bill) {
      return NextResponse.json({ error: "Bill not found" }, { status: 404 });
    }

    // Check if bill is finalized
    if (bill.status !== "FINALIZED") {
      return NextResponse.json(
        { error: "Bill is not finalized" },
        { status: 400 }
      );
    }

    // Check if bill has any payments
    const payments = await prisma.payment.findFirst({
      where: { billId },
    });

    if (payments) {
      return NextResponse.json(
        { error: "Cannot revert bill with existing payments" },
        { status: 400 }
      );
    }

    // Revert to draft
    const updatedBill = await prisma.bill.update({
      where: { id: billId },
      data: {
        status: "DRAFT",
        finalizedAt: null,
        finalizedById: null,
      },
      include: {
        billItems: true,
      },
    });

    // Create edit log for revert
    await prisma.billEditLog.create({
      data: {
        billId,
        restaurantId: session.restaurantId,
        action: "OTHER",
        editedById: session.userId,
        editedByName: session.email,
        editedByRole: session.role,
        description: `Bill reverted to draft: ${reason}`,
        reason,
        oldValue: { status: "FINALIZED" },
        newValue: { status: "DRAFT" },
      },
    });

    return NextResponse.json({
      success: true,
      message: "Bill reverted to draft. It can now be edited again.",
      bill: updatedBill,
    });
  } catch (error) {
    console.error("Error reverting bill:", error);
    return NextResponse.json(
      { error: "Failed to revert bill" },
      { status: 500 }
    );
  }
}
