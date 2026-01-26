import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { emitOrderEvent } from "@/lib/notification-events";
import { logActivity } from "@/lib/activity-log";

// POST reject an order (staff rejects guest order)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only WAITER, HOST, MANAGER, OWNER can reject orders
    const allowedRoles = ["WAITER", "HOST", "MANAGER", "OWNER"];
    if (!allowedRoles.includes(session.role)) {
      return NextResponse.json(
        { error: "You don't have permission to reject orders" },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const { reason } = body;

    // Validate reason
    if (!reason || reason.trim().length === 0) {
      return NextResponse.json(
        { error: "Rejection reason is required" },
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
      },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Check if order can be rejected
    if (order.status !== "PENDING_CONFIRMATION" && order.status !== "PENDING") {
      return NextResponse.json(
        { error: "This order cannot be rejected" },
        { status: 400 }
      );
    }

    // Update order in a transaction
    const updatedOrder = await prisma.$transaction(async (tx) => {
      // Update order status to CANCELLED with rejection info
      const rejected = await tx.order.update({
        where: { id },
        data: {
          status: "CANCELLED",
          rejectedAt: new Date(),
          rejectedById: session.userId,
          rejectionReason: reason,
          cancelledAt: new Date(),
        },
        include: {
          table: true,
        },
      });

      // Cancel all order items
      await tx.orderItem.updateMany({
        where: { orderId: id },
        data: {
          status: "CANCELLED",
        },
      });

      // Log activity
      await logActivity({
        restaurantId: session.restaurantId,
        userId: session.userId,
        userName: session.email,
        userRole: session.role,
        activityType: "order.rejected",
        entityType: "order",
        entityId: order.id,
        priority: "warning",
        description: `Rejected order #${order.orderNumber}: ${reason}`,
        tableId: order.tableId || undefined,
        sessionId: order.sessionId || undefined,
        orderId: order.id,
        details: {
          orderNumber: order.orderNumber,
          reason,
          tableNumber: order.table?.tableNumber,
        },
      });

      return rejected;
    });

    // Emit real-time notification
    emitOrderEvent("ORDER_UPDATE", session.restaurantId, {
      orderId: updatedOrder.id,
      tableNumber: updatedOrder.table?.tableNumber,
      tableName: updatedOrder.table?.name || `Table ${updatedOrder.table?.tableNumber}`,
      status: "CANCELLED",
    });

    return NextResponse.json({
      success: true,
      order: updatedOrder,
      message: "Order rejected",
    });
  } catch (error) {
    console.error("Error rejecting order:", error);
    return NextResponse.json(
      { error: "Failed to reject order" },
      { status: 500 }
    );
  }
}
