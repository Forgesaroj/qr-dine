import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { getSession } from "@/lib/auth";
import { emitOrderEvent } from "@/lib/notification-events";
import { logActivity } from "@/lib/activity-log";

// POST confirm an order (staff confirms guest order)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only WAITER, HOST, MANAGER, OWNER can confirm orders
    const allowedRoles = ["WAITER", "HOST", "MANAGER", "OWNER"];
    if (!allowedRoles.includes(session.role)) {
      return NextResponse.json(
        { error: "You don't have permission to confirm orders" },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const { guestCount } = body;

    // Validate guest count
    if (!guestCount || guestCount < 1) {
      return NextResponse.json(
        { error: "Guest count is required and must be at least 1" },
        { status: 400 }
      );
    }

    // Get the order
    const order = await prisma.order.findFirst({
      where: {
        id,
        restaurantId: session.restaurantId,
      },
      include: {
        table: true,
        session: true,
        items: true,
      },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Check if order needs confirmation
    if (order.status !== "PENDING_CONFIRMATION") {
      return NextResponse.json(
        { error: "This order does not require confirmation" },
        { status: 400 }
      );
    }

    // Update order, session, and items in a transaction
    const updatedOrder = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // Update the session with guest count
      if (order.sessionId) {
        await tx.tableSession.update({
          where: { id: order.sessionId },
          data: {
            guestCount,
            waiterId: session.userId, // Assign this staff as waiter
          },
        });
      }

      // Update order status to CONFIRMED
      const confirmed = await tx.order.update({
        where: { id },
        data: {
          status: "CONFIRMED",
          confirmedAt: new Date(),
          confirmedById: session.userId,
        },
        include: {
          table: true,
          items: true,
        },
      });

      // Update all order items to SENT_TO_KITCHEN
      await tx.orderItem.updateMany({
        where: { orderId: id },
        data: {
          status: "SENT_TO_KITCHEN",
          sentToKitchenAt: new Date(),
        },
      });

      // Log activity
      await logActivity({
        restaurantId: session.restaurantId,
        userId: session.userId,
        userName: session.email,
        userRole: session.role,
        activityType: "order.confirmed",
        entityType: "order",
        entityId: order.id,
        priority: "info",
        description: `Confirmed order #${order.orderNumber} with ${guestCount} guests`,
        tableId: order.tableId || undefined,
        sessionId: order.sessionId || undefined,
        orderId: order.id,
        details: {
          orderNumber: order.orderNumber,
          guestCount,
          tableNumber: order.table?.tableNumber,
        },
      });

      return confirmed;
    });

    // Emit real-time notification
    emitOrderEvent("ORDER_UPDATE", session.restaurantId, {
      orderId: updatedOrder.id,
      tableNumber: updatedOrder.table?.tableNumber,
      tableName: updatedOrder.table?.name || `Table ${updatedOrder.table?.tableNumber}`,
      status: "CONFIRMED",
    });

    return NextResponse.json({
      success: true,
      order: updatedOrder,
      message: "Order confirmed and sent to kitchen",
    });
  } catch (error) {
    console.error("Error confirming order:", error);
    return NextResponse.json(
      { error: "Failed to confirm order" },
      { status: 500 }
    );
  }
}
