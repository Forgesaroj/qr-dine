import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { logActivity } from "@/lib/activity-log";

// PATCH update individual bar item status
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string; itemId: string }> }
) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { orderId, itemId } = await params;
    const body = await request.json();
    const { status } = body;

    // Validate status
    const validStatuses = [
      "PENDING",
      "SENT_TO_KITCHEN",
      "PREPARING",
      "READY",
      "SERVED",
    ];

    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: "Invalid status" },
        { status: 400 }
      );
    }

    // Verify order belongs to restaurant
    const order = await prisma.order.findFirst({
      where: {
        id: orderId,
        restaurantId: session.restaurantId,
      },
      include: {
        table: { select: { tableNumber: true } },
      },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Get the item to verify it exists
    const existingItem = await prisma.orderItem.findUnique({
      where: { id: itemId },
    });

    if (!existingItem || existingItem.orderId !== orderId) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    // Build update data with timestamps
    const updateData: Record<string, unknown> = { status };
    const now = new Date();

    if (status === "SENT_TO_KITCHEN") {
      updateData.sentToKitchenAt = now;
    } else if (status === "PREPARING") {
      updateData.preparingAt = now;
    } else if (status === "READY") {
      updateData.readyAt = now;
    } else if (status === "SERVED") {
      updateData.servedAt = now;
    }

    // Update the item
    const updatedItem = await prisma.orderItem.update({
      where: { id: itemId },
      data: updateData,
    });

    // Check if all items are ready - update order status accordingly
    await updateOrderStatusBasedOnItems(orderId);

    // Log activity for bar
    await logActivity({
      restaurantId: session.restaurantId,
      userId: session.userId,
      activityType: "bar_item_status_updated",
      entityType: "order_item",
      entityId: itemId,
      tableId: order.tableId || undefined,
      sessionId: order.sessionId || undefined,
      description: `Bar item "${existingItem.menuItemName}" marked as ${status} for Table ${order.table?.tableNumber || "N/A"}`,
      priority: status === "READY" ? "notice" : "info",
      details: {
        itemName: existingItem.menuItemName,
        previousStatus: existingItem.status,
        newStatus: status,
        orderNumber: order.orderNumber,
        tableNumber: order.table?.tableNumber,
      },
    });

    return NextResponse.json({ item: updatedItem });
  } catch (error) {
    console.error("Error updating bar item:", error);
    return NextResponse.json(
      { error: "Failed to update item" },
      { status: 500 }
    );
  }
}

// Helper function to update order status based on item statuses
async function updateOrderStatusBasedOnItems(orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true },
  });

  if (!order) return;

  type OrderItem = typeof order.items[number];
  const itemStatuses = order.items.map((item: OrderItem) => item.status);

  // If all items are READY, mark order as READY
  if (itemStatuses.every((s: string) => s === "READY")) {
    await prisma.order.update({
      where: { id: orderId },
      data: {
        status: "READY",
        readyAt: new Date(),
      },
    });
  }
  // If all items are SERVED, mark order as SERVED
  else if (itemStatuses.every((s: string) => s === "SERVED")) {
    await prisma.order.update({
      where: { id: orderId },
      data: {
        status: "SERVED",
        servedAt: new Date(),
      },
    });
  }
  // If any item is PREPARING, mark order as PREPARING
  else if (itemStatuses.some((s: string) => s === "PREPARING")) {
    if (order.status !== "PREPARING") {
      await prisma.order.update({
        where: { id: orderId },
        data: {
          status: "PREPARING",
          preparingAt: new Date(),
        },
      });
    }
  }
}
