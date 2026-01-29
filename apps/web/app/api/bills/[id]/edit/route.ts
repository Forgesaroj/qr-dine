import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { BillEditAction, Prisma } from "@prisma/client";

// Roles that can edit bills
const EDIT_ALLOWED_ROLES = ["OWNER", "MANAGER", "CASHIER"];

interface EditItemRequest {
  action: "MAKE_COMPLIMENTARY" | "ADD_DISCOUNT" | "CHANGE_QUANTITY" | "REMOVE_ITEM";
  billItemId?: string;
  reason?: string;
  discountAmount?: number;
  newQuantity?: number;
}

interface BillDiscountRequest {
  action: "BILL_DISCOUNT";
  discountAmount: number;
  reason: string;
}

type EditRequest = EditItemRequest | BillDiscountRequest;

// POST - Edit bill (various actions)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user has permission to edit bills
    if (!EDIT_ALLOWED_ROLES.includes(session.role)) {
      return NextResponse.json(
        { error: "You do not have permission to edit bills" },
        { status: 403 }
      );
    }

    const { id: billId } = await params;
    const body: EditRequest = await request.json();

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

    // Check if bill is finalized
    if (bill.status !== "DRAFT") {
      return NextResponse.json(
        { error: "Cannot edit finalized bill. Only DRAFT bills can be edited." },
        { status: 400 }
      );
    }

    // Store original amounts for first edit
    const isFirstEdit = !bill.isEdited;
    const originalSubtotal = isFirstEdit ? bill.subtotal : bill.originalSubtotal;
    const originalTotalAmount = isFirstEdit ? bill.totalAmount : bill.originalTotalAmount;

    let editAction: BillEditAction;
    let editDescription: string;
    let itemName: string | null = null;
    let billItemId: string | null = null;
    let oldValue: Prisma.JsonObject = {};
    let newValue: Prisma.JsonObject = {};
    let amountBefore = bill.totalAmount;
    let amountAfter = bill.totalAmount;

    // Handle different edit actions
    if (body.action === "MAKE_COMPLIMENTARY") {
      const itemReq = body as EditItemRequest;
      if (!itemReq.billItemId) {
        return NextResponse.json({ error: "billItemId is required" }, { status: 400 });
      }

      const billItem = bill.billItems.find(i => i.id === itemReq.billItemId);
      if (!billItem) {
        return NextResponse.json({ error: "Bill item not found" }, { status: 404 });
      }

      // Update the bill item to complimentary
      await prisma.billItem.update({
        where: { id: itemReq.billItemId },
        data: {
          isComplimentary: true,
          complimentaryReason: itemReq.reason || "Guest compliment",
          complimentaryById: session.userId,
          complimentaryAt: new Date(),
          totalPrice: 0, // Rs.0 for complimentary
          isModified: true,
        },
      });

      editAction = "ITEM_MADE_COMPLIMENTARY";
      editDescription = `Made "${billItem.menuItemName}" complimentary (Rs.0)`;
      itemName = billItem.menuItemName;
      billItemId = itemReq.billItemId;
      oldValue = { price: billItem.totalPrice, isComplimentary: false };
      newValue = { price: 0, isComplimentary: true, reason: itemReq.reason };
      amountAfter = amountBefore - billItem.totalPrice;

    } else if (body.action === "ADD_DISCOUNT") {
      const itemReq = body as EditItemRequest;
      if (!itemReq.billItemId || itemReq.discountAmount === undefined) {
        return NextResponse.json(
          { error: "billItemId and discountAmount are required" },
          { status: 400 }
        );
      }

      const billItem = bill.billItems.find(i => i.id === itemReq.billItemId);
      if (!billItem) {
        return NextResponse.json({ error: "Bill item not found" }, { status: 404 });
      }

      // Update the bill item with discount
      const newTotalPrice = Math.max(0, billItem.totalPrice - itemReq.discountAmount);
      await prisma.billItem.update({
        where: { id: itemReq.billItemId },
        data: {
          discountAmount: itemReq.discountAmount,
          discountReason: itemReq.reason || "Discount applied",
          discountById: session.userId,
          discountAt: new Date(),
          totalPrice: newTotalPrice,
          isModified: true,
        },
      });

      editAction = "ITEM_DISCOUNT_APPLIED";
      editDescription = `Applied Rs.${itemReq.discountAmount} discount to "${billItem.menuItemName}"`;
      itemName = billItem.menuItemName;
      billItemId = itemReq.billItemId;
      oldValue = { price: billItem.totalPrice, discount: billItem.discountAmount || 0 };
      newValue = { price: newTotalPrice, discount: itemReq.discountAmount };
      amountAfter = amountBefore - itemReq.discountAmount;

    } else if (body.action === "CHANGE_QUANTITY") {
      const itemReq = body as EditItemRequest;
      if (!itemReq.billItemId || itemReq.newQuantity === undefined) {
        return NextResponse.json(
          { error: "billItemId and newQuantity are required" },
          { status: 400 }
        );
      }

      const billItem = bill.billItems.find(i => i.id === itemReq.billItemId);
      if (!billItem) {
        return NextResponse.json({ error: "Bill item not found" }, { status: 404 });
      }

      const oldTotalPrice = billItem.totalPrice;
      const newTotalPrice = billItem.unitPrice * itemReq.newQuantity;

      await prisma.billItem.update({
        where: { id: itemReq.billItemId },
        data: {
          quantity: itemReq.newQuantity,
          totalPrice: newTotalPrice,
          isModified: true,
        },
      });

      editAction = "ITEM_QUANTITY_CHANGED";
      editDescription = `Changed quantity of "${billItem.menuItemName}" from ${billItem.quantity} to ${itemReq.newQuantity}`;
      itemName = billItem.menuItemName;
      billItemId = itemReq.billItemId;
      oldValue = { quantity: billItem.quantity, totalPrice: oldTotalPrice };
      newValue = { quantity: itemReq.newQuantity, totalPrice: newTotalPrice };
      amountAfter = amountBefore - oldTotalPrice + newTotalPrice;

    } else if (body.action === "REMOVE_ITEM") {
      const itemReq = body as EditItemRequest;
      if (!itemReq.billItemId) {
        return NextResponse.json({ error: "billItemId is required" }, { status: 400 });
      }

      const billItem = bill.billItems.find(i => i.id === itemReq.billItemId);
      if (!billItem) {
        return NextResponse.json({ error: "Bill item not found" }, { status: 404 });
      }

      await prisma.billItem.delete({
        where: { id: itemReq.billItemId },
      });

      editAction = "ITEM_REMOVED";
      editDescription = `Removed "${billItem.menuItemName}" from bill`;
      itemName = billItem.menuItemName;
      billItemId = itemReq.billItemId;
      oldValue = { quantity: billItem.quantity, totalPrice: billItem.totalPrice };
      newValue = { removed: true };
      amountAfter = amountBefore - billItem.totalPrice;

    } else if (body.action === "BILL_DISCOUNT") {
      const discReq = body as BillDiscountRequest;
      if (discReq.discountAmount === undefined || !discReq.reason) {
        return NextResponse.json(
          { error: "discountAmount and reason are required for bill discount" },
          { status: 400 }
        );
      }

      editAction = "BILL_DISCOUNT_APPLIED";
      editDescription = `Applied Rs.${discReq.discountAmount} bill discount: ${discReq.reason}`;
      oldValue = { billDiscount: bill.billDiscountAmount || 0 };
      newValue = { billDiscount: discReq.discountAmount, reason: discReq.reason };
      amountAfter = amountBefore - (discReq.discountAmount - (bill.billDiscountAmount || 0));

      // Update bill discount
      await prisma.bill.update({
        where: { id: billId },
        data: {
          billDiscountAmount: discReq.discountAmount,
          billDiscountReason: discReq.reason,
        },
      });
    } else {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    // Recalculate bill totals
    const updatedItems = await prisma.billItem.findMany({
      where: { billId },
    });

    const subtotal = updatedItems.reduce((sum, item) => sum + item.totalPrice, 0);
    const complimentaryTotal = updatedItems
      .filter(item => item.isComplimentary)
      .reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);
    const hasComplimentaryItems = updatedItems.some(item => item.isComplimentary);

    // Calculate tax (13% VAT for Nepal)
    const taxAmount = subtotal * 0.13;
    const serviceCharge = subtotal * 0.1; // 10% service charge
    const billDiscount = body.action === "BILL_DISCOUNT"
      ? (body as BillDiscountRequest).discountAmount
      : (bill.billDiscountAmount || 0);
    const totalAmount = subtotal + taxAmount + serviceCharge - billDiscount - bill.pointsDiscount;

    // Update bill
    await prisma.bill.update({
      where: { id: billId },
      data: {
        subtotal,
        taxAmount,
        serviceCharge,
        totalAmount,
        isEdited: true,
        editCount: bill.editCount + 1,
        originalSubtotal: originalSubtotal,
        originalTotalAmount: originalTotalAmount,
        hasComplimentaryItems,
        complimentaryTotal,
      },
    });

    // Create edit log
    await prisma.billEditLog.create({
      data: {
        billId,
        restaurantId: session.restaurantId,
        action: editAction,
        editedById: session.userId,
        editedByName: session.email, // Will need to fetch actual name
        editedByRole: session.role,
        billItemId,
        itemName,
        description: editDescription,
        oldValue,
        newValue,
        reason: (body as EditItemRequest).reason || (body as BillDiscountRequest).reason,
        amountBefore,
        amountAfter,
        amountChange: amountAfter - amountBefore,
      },
    });

    // Fetch updated bill
    const updatedBill = await prisma.bill.findUnique({
      where: { id: billId },
      include: {
        billItems: true,
        editLogs: {
          orderBy: { createdAt: "desc" },
          take: 5,
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: editDescription,
      bill: updatedBill,
    });
  } catch (error) {
    console.error("Error editing bill:", error);
    return NextResponse.json(
      { error: "Failed to edit bill" },
      { status: 500 }
    );
  }
}
