import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { deductStockForMenuItem } from "@/lib/services/stock-deduction.service";

// PATCH update individual order item status
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
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Get the order item for stock deduction
    const orderItem = await prisma.orderItem.findUnique({
      where: { id: itemId },
      select: { menuItemId: true, quantity: true },
    });

    // Build update data with timestamps
    const updateData: Record<string, unknown> = { status };

    if (status === "SENT_TO_KITCHEN") {
      updateData.sentToKitchenAt = new Date();
    } else if (status === "PREPARING") {
      updateData.preparingAt = new Date();
    } else if (status === "READY") {
      updateData.readyAt = new Date();
    } else if (status === "SERVED") {
      updateData.servedAt = new Date();

      // Auto-deduct stock based on BOM
      if (orderItem) {
        try {
          await deductStockForMenuItem(
            session.restaurantId,
            orderItem.menuItemId,
            orderItem.quantity,
            itemId,
            session.id,
            session.name || session.email
          );
        } catch (stockError) {
          console.error("Stock deduction error (non-blocking):", stockError);
        }
      }
    }

    // Update the item
    const updatedItem = await prisma.orderItem.update({
      where: { id: itemId },
      data: updateData,
    });

    // Check if all items are ready - update order status accordingly
    await updateOrderStatusBasedOnItems(orderId);

    return NextResponse.json({ item: updatedItem });
  } catch (error) {
    console.error("Error updating order item:", error);
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

  type KitchenOrderItem = typeof order.items[number];
  const itemStatuses = order.items.map((item: KitchenOrderItem) => item.status);

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
