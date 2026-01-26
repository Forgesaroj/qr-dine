import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { logActivity } from "@/lib/activity-log";

// PATCH update all bar items in an order to a new status
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { orderId } = await params;
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
        items: {
          where: {
            status: { not: "SERVED" },
            OR: [
              { kitchenStation: "BAR" },
              {
                menuItem: {
                  category: {
                    name: {
                      in: ["Beverages", "Drinks", "Bar", "Cocktails", "Mocktails", "Wine", "Beer", "Spirits"],
                    },
                  },
                },
              },
            ],
          },
        },
      },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    type OrderItem = typeof order.items[number];

    if (order.items.length === 0) {
      return NextResponse.json(
        { error: "No bar items to update" },
        { status: 400 }
      );
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

    // Update all bar items
    const itemIds = order.items.map((item: OrderItem) => item.id);
    await prisma.orderItem.updateMany({
      where: { id: { in: itemIds } },
      data: updateData,
    });

    // Check if all items in order are now at this status - update order status accordingly
    await updateOrderStatusBasedOnItems(orderId);

    // Log activity
    await logActivity({
      restaurantId: session.restaurantId,
      userId: session.userId,
      activityType: "bar_items_bulk_updated",
      entityType: "order",
      entityId: orderId,
      tableId: order.tableId || undefined,
      sessionId: order.sessionId || undefined,
      description: `All bar items marked as ${status} for Table ${order.table?.tableNumber || "N/A"}`,
      priority: status === "READY" ? "notice" : "info",
      details: {
        orderNumber: order.orderNumber,
        tableNumber: order.table?.tableNumber,
        itemCount: itemIds.length,
        newStatus: status,
      },
    });

    // Get updated items
    const updatedItems = await prisma.orderItem.findMany({
      where: { id: { in: itemIds } },
    });

    return NextResponse.json({ items: updatedItems });
  } catch (error) {
    console.error("Error updating bar items:", error);
    return NextResponse.json(
      { error: "Failed to update items" },
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

  type HelperOrderItem = typeof order.items[number];
  const itemStatuses = order.items.map((item: HelperOrderItem) => item.status);

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
