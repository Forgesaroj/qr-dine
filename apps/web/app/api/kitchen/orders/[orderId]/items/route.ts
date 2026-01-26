import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// PATCH update all order items status at once
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
      include: { items: true },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

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
    }

    // Update all items that are not already served
    await prisma.orderItem.updateMany({
      where: {
        orderId,
        status: { not: "SERVED" },
      },
      data: updateData,
    });

    // Update order status based on the new item status
    const orderUpdateData: Record<string, unknown> = {};

    if (status === "PREPARING") {
      orderUpdateData.status = "PREPARING";
      orderUpdateData.preparingAt = new Date();
    } else if (status === "READY") {
      orderUpdateData.status = "READY";
      orderUpdateData.readyAt = new Date();
    } else if (status === "SERVED") {
      orderUpdateData.status = "SERVED";
      orderUpdateData.servedAt = new Date();
    }

    if (Object.keys(orderUpdateData).length > 0) {
      await prisma.order.update({
        where: { id: orderId },
        data: orderUpdateData,
      });
    }

    // Fetch updated order
    const updatedOrder = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: true,
        table: true,
      },
    });

    return NextResponse.json({ order: updatedOrder });
  } catch (error) {
    console.error("Error updating order items:", error);
    return NextResponse.json(
      { error: "Failed to update items" },
      { status: 500 }
    );
  }
}
