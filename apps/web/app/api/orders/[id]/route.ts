import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { emitOrderEvent } from "@/lib/notification-events";

// GET single order
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

    const order = await prisma.order.findFirst({
      where: {
        id,
        restaurantId: session.restaurantId,
      },
      include: {
        table: true,
        items: {
          include: {
            menuItem: true,
          },
        },
      },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    return NextResponse.json({ order });
  } catch (error) {
    console.error("Error fetching order:", error);
    return NextResponse.json(
      { error: "Failed to fetch order" },
      { status: 500 }
    );
  }
}

// PATCH update order status
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { status } = body;

    // Validate status transition
    const validStatuses = [
      "PENDING",
      "PENDING_CONFIRMATION",
      "CONFIRMED",
      "PREPARING",
      "READY",
      "SERVED",
      "COMPLETED",
      "CANCELLED",
    ];

    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: "Invalid status" },
        { status: 400 }
      );
    }

    const existingOrder = await prisma.order.findFirst({
      where: {
        id,
        restaurantId: session.restaurantId,
      },
      include: {
        table: true,
      },
    });

    if (!existingOrder) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Build update data based on status
    const updateData: Record<string, unknown> = { status };

    if (status === "CONFIRMED") {
      updateData.confirmedAt = new Date();
      updateData.confirmedById = session.id;
    } else if (status === "PREPARING") {
      updateData.preparingAt = new Date();
    } else if (status === "READY") {
      updateData.readyAt = new Date();
    } else if (status === "SERVED") {
      updateData.servedAt = new Date();
      updateData.servedById = session.id;
    } else if (status === "COMPLETED") {
      updateData.completedAt = new Date();

      // Check if bill already exists for this order
      const existingBill = await prisma.bill.findFirst({
        where: { orderId: id },
      });

      // Auto-create bill if it doesn't exist
      if (!existingBill) {
        // Get restaurant settings for tax/service charge
        const restaurant = await prisma.restaurant.findUnique({
          where: { id: session.restaurantId },
          select: { settings: true },
        });

        const settings = (restaurant?.settings as Record<string, unknown>) || {};
        const taxEnabled = settings.taxEnabled ?? true;
        const taxPercentage = Number(settings.taxPercentage) || 13;
        const serviceChargeEnabled = settings.serviceChargeEnabled ?? true;
        const serviceChargePercentage = Number(settings.serviceChargePercentage) || 10;

        // Calculate amounts
        const subtotal = existingOrder.subtotal;
        const taxAmount = taxEnabled ? (subtotal * taxPercentage) / 100 : 0;
        const serviceCharge = serviceChargeEnabled ? (subtotal * serviceChargePercentage) / 100 : 0;
        const totalAmount = subtotal + taxAmount + serviceCharge;

        // Generate bill number
        const billCount = await prisma.bill.count({
          where: { restaurantId: session.restaurantId },
        });
        const billNumber = `BILL-${String(billCount + 1).padStart(6, "0")}`;

        // Create bill
        await prisma.bill.create({
          data: {
            billNumber,
            orderId: id,
            restaurantId: session.restaurantId,
            subtotal,
            taxAmount,
            serviceCharge,
            discountAmount: 0,
            totalAmount,
            status: "OPEN",
            paymentStatus: "PENDING",
            generatedById: session.userId,
          },
        });
      }

      // Update table status back to available if this was a dine-in order
      if (existingOrder.tableId) {
        await prisma.table.update({
          where: { id: existingOrder.tableId },
          data: { status: "AVAILABLE" },
        });
      }
    } else if (status === "CANCELLED") {
      updateData.cancelledAt = new Date();
      // Update table status back to available
      if (existingOrder.tableId) {
        await prisma.table.update({
          where: { id: existingOrder.tableId },
          data: { status: "AVAILABLE" },
        });
      }
    }

    const order = await prisma.order.update({
      where: { id },
      data: updateData,
      include: {
        table: true,
        items: {
          include: {
            menuItem: true,
          },
        },
      },
    });

    // Emit real-time notification based on status change
    if (status === "READY") {
      emitOrderEvent("ORDER_READY", session.restaurantId, {
        orderId: order.id,
        tableNumber: order.table?.tableNumber,
        tableName: order.table?.name || `Table ${order.table?.tableNumber}`,
        status: order.status,
      });
    } else if (status !== existingOrder.status) {
      emitOrderEvent("ORDER_UPDATE", session.restaurantId, {
        orderId: order.id,
        tableNumber: order.table?.tableNumber,
        tableName: order.table?.name || `Table ${order.table?.tableNumber}`,
        status: order.status,
      });
    }

    return NextResponse.json({ order });
  } catch (error) {
    console.error("Error updating order:", error);
    return NextResponse.json(
      { error: "Failed to update order" },
      { status: 500 }
    );
  }
}
