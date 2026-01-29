import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// Check if user can see bill amounts (waiters cannot)
function canViewAmounts(role: string): boolean {
  return role !== "WAITER";
}

// Check if user can process payments/discounts (waiters cannot)
function canProcessPayments(role: string): boolean {
  return role !== "WAITER";
}

// Strip amounts from bill object for waiters
function stripAmountsFromBill(bill: Record<string, unknown>, canView: boolean) {
  if (canView) return bill;

  return {
    ...bill,
    subtotal: undefined,
    taxAmount: undefined,
    serviceCharge: undefined,
    totalAmount: undefined,
    discountAmount: undefined,
    pointsDiscount: undefined,
    amountsHidden: true,
  };
}

// Strip amounts from item for waiters
function stripAmountsFromItem(
  item: { id: string; menuItemName: string; quantity: number; unitPrice: number; totalPrice: number; orderNumber?: string; orderSource?: string; servedAt?: Date | null },
  canView: boolean
) {
  if (canView) return item;

  return {
    id: item.id,
    menuItemName: item.menuItemName,
    quantity: item.quantity,
    orderNumber: item.orderNumber,
    orderSource: item.orderSource,
    servedAt: item.servedAt,
    // Hide prices
    unitPrice: undefined,
    totalPrice: undefined,
  };
}

// GET single bill with all session orders
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
    const canView = canViewAmounts(session.role);

    const bill = await prisma.bill.findFirst({
      where: {
        id,
        restaurantId: session.restaurantId,
      },
      include: {
        order: {
          include: {
            table: { select: { id: true, tableNumber: true, name: true } },
            items: {
              include: {
                menuItem: { select: { name: true } },
              },
            },
          },
        },
        customer: { select: { name: true, phone: true, email: true } },
        generatedBy: { select: { name: true } },
        settledBy: { select: { name: true } },
        payments: {
          include: {
            processedBy: { select: { name: true } },
          },
        },
      },
    });

    if (!bill) {
      return NextResponse.json({ error: "Bill not found" }, { status: 404 });
    }

    // If bill has a sessionId, fetch all orders in that session
    let allSessionOrders: Array<{
      id: string;
      orderNumber: string;
      orderSource: string;
      placedAt: Date;
      servedAt: Date | null;
      items: Array<{
        id: string;
        menuItemName: string;
        quantity: number;
        unitPrice: number;
        totalPrice: number;
        servedAt: Date | null;
      }>;
    }> = [];
    let combinedItems: Array<{
      id: string;
      menuItemName: string;
      quantity: number;
      unitPrice: number;
      totalPrice: number;
      orderNumber: string;
      orderSource: string;
      servedAt: Date | null;
    }> = [];
    let firstOrderedAt: Date | null = null;
    let lastServedAt: Date | null = null;

    if (bill.sessionId) {
      const sessionOrders = await prisma.order.findMany({
        where: {
          sessionId: bill.sessionId,
          restaurantId: session.restaurantId,
          status: "COMPLETED",
        },
        include: {
          items: true,
        },
        orderBy: { placedAt: "asc" },
      });

      type SessionOrder = typeof sessionOrders[number];
      type SessionOrderItem = SessionOrder["items"][number];

      allSessionOrders = sessionOrders.map((o: SessionOrder) => ({
        id: o.id,
        orderNumber: o.orderNumber,
        orderSource: o.orderSource,
        placedAt: o.placedAt,
        servedAt: o.servedAt,
        items: o.items.map((i: SessionOrderItem) => ({
          id: i.id,
          menuItemName: i.menuItemName,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          totalPrice: i.totalPrice,
          servedAt: i.servedAt,
        })),
      }));

      // Calculate first ordered and last served times
      if (sessionOrders.length > 0 && sessionOrders[0]) {
        firstOrderedAt = sessionOrders[0].placedAt;

        // Find the last served time across all orders
        for (const order of sessionOrders) {
          if (order.servedAt) {
            if (!lastServedAt || order.servedAt > lastServedAt) {
              lastServedAt = order.servedAt;
            }
          }
          // Also check item-level servedAt
          for (const item of order.items) {
            if (item.servedAt) {
              if (!lastServedAt || item.servedAt > lastServedAt) {
                lastServedAt = item.servedAt;
              }
            }
          }
        }
      }

      // Combine all items from all orders
      for (const order of sessionOrders) {
        for (const item of order.items) {
          combinedItems.push({
            id: item.id,
            menuItemName: item.menuItemName,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: item.totalPrice,
            orderNumber: order.orderNumber,
            orderSource: order.orderSource,
            servedAt: item.servedAt,
          });
        }
      }
    } else {
      // No session, just use the primary order's items
      // Need to fetch the order with timestamps and orderSource
      const primaryOrder = await prisma.order.findUnique({
        where: { id: bill.orderId },
        select: { placedAt: true, servedAt: true, orderSource: true },
      });

      type BillOrderItem = typeof bill.order.items[number];
      combinedItems = bill.order.items.map((i: BillOrderItem) => ({
        id: i.id,
        menuItemName: i.menuItemName,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        totalPrice: i.totalPrice,
        orderNumber: bill.order.orderNumber,
        orderSource: primaryOrder?.orderSource || "STAFF",
        servedAt: null, // Primary order items don't have servedAt in this context
      }));

      if (primaryOrder) {
        firstOrderedAt = primaryOrder.placedAt;
        lastServedAt = primaryOrder.servedAt;
      }
    }

    // Strip amounts for waiters
    const processedItems = combinedItems.map((item) =>
      stripAmountsFromItem(item, canView)
    );

    const processedBill = stripAmountsFromBill(
      bill as unknown as Record<string, unknown>,
      canView
    );

    return NextResponse.json({
      bill: {
        ...processedBill,
        combinedItems: processedItems,
        allOrders: allSessionOrders,
        orderCount: allSessionOrders.length || 1,
        // Order timing info
        firstOrderedAt,
        lastServedAt,
      },
      amountsHidden: !canView,
    });
  } catch (error) {
    console.error("Error fetching bill:", error);
    return NextResponse.json(
      { error: "Failed to fetch bill" },
      { status: 500 }
    );
  }
}

// PATCH update bill (add discount, settle, etc.)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Waiters cannot modify bill amounts or settle
    if (!canProcessPayments(session.role)) {
      return NextResponse.json(
        { error: "You do not have permission to modify bills" },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const { discountAmount, status, pointsRedeemed, customerId } = body;

    // Get existing bill
    const existingBill = await prisma.bill.findFirst({
      where: {
        id,
        restaurantId: session.restaurantId,
      },
    });

    if (!existingBill) {
      return NextResponse.json({ error: "Bill not found" }, { status: 404 });
    }

    // Prepare update data
    const updateData: Record<string, unknown> = {};

    // Link customer for loyalty
    if (customerId !== undefined) {
      updateData.customerId = customerId;
    }

    if (discountAmount !== undefined) {
      updateData.discountAmount = discountAmount;
      // Recalculate total
      updateData.totalAmount =
        existingBill.subtotal +
        existingBill.taxAmount +
        existingBill.serviceCharge -
        discountAmount -
        (pointsRedeemed !== undefined
          ? pointsRedeemed * 10
          : existingBill.pointsDiscount);
    }

    if (pointsRedeemed !== undefined) {
      updateData.pointsRedeemed = pointsRedeemed;
      updateData.pointsDiscount = pointsRedeemed * 10; // 10 NPR per point
      // Recalculate total
      const discount =
        discountAmount !== undefined
          ? discountAmount
          : existingBill.discountAmount;
      updateData.totalAmount =
        existingBill.subtotal +
        existingBill.taxAmount +
        existingBill.serviceCharge -
        discount -
        pointsRedeemed * 10;
    }

    if (status !== undefined) {
      updateData.status = status;
      if (status === "SETTLED") {
        updateData.settledById = session.userId;
        updateData.settledAt = new Date();
        updateData.paymentStatus = "COMPLETED";
      }
    }

    const bill = await prisma.bill.update({
      where: { id },
      data: updateData,
      include: {
        order: {
          include: {
            table: { select: { tableNumber: true, name: true } },
            items: true,
          },
        },
        payments: true,
      },
    });

    return NextResponse.json({ bill });
  } catch (error) {
    console.error("Error updating bill:", error);
    return NextResponse.json(
      { error: "Failed to update bill" },
      { status: 500 }
    );
  }
}
