import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { logActivity } from "@/lib/activity-log";

// PATCH update order item timestamps (Phase 3: Kitchen/Bar Flow)
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
    const { action } = body;

    // Get current order item with order and session info
    const orderItem = await prisma.orderItem.findFirst({
      where: { id },
      include: {
        order: {
          include: {
            session: {
              include: {
                table: true,
              },
            },
          },
        },
        menuItem: true,
      },
    });

    if (!orderItem) {
      return NextResponse.json(
        { error: "Order item not found" },
        { status: 404 }
      );
    }

    // Verify restaurant access
    if (orderItem.order.restaurantId !== session.restaurantId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const now = new Date();
    let updateData: Record<string, Date | string | null> = {};
    let itemStatus = orderItem.status;
    let activityType = "";
    let description = "";
    const isBarItem = orderItem.isBarItem;
    const tableNumber = orderItem.order.session?.table?.tableNumber || "N/A";

    switch (action) {
      // Kitchen Flow
      case "start_preparing":
        if (isBarItem) {
          updateData = { barStartedAt: now };
        } else {
          updateData = { preparingAt: now };
        }
        itemStatus = "PREPARING";
        activityType = "prep_started";
        description = `Started preparing ${orderItem.menuItemName} for Table ${tableNumber}`;
        break;

      case "ready":
        if (isBarItem) {
          updateData = { barReadyAt: now };
        } else {
          updateData = { readyAt: now, waiterServeNotifiedAt: now };
        }
        itemStatus = "READY";
        activityType = "item_ready";
        description = `${orderItem.menuItemName} ready for Table ${tableNumber}`;
        break;

      case "picked_up":
        if (isBarItem) {
          updateData = { drinkPickedAt: now };
        } else {
          updateData = { foodPickedAt: now };
        }
        activityType = isBarItem ? "drink_picked" : "food_picked";
        description = `${orderItem.menuItemName} picked up for Table ${tableNumber}`;
        break;

      case "served":
        if (isBarItem) {
          updateData = { drinkServedAt: now, servedAt: now };
        } else {
          updateData = { servedAt: now };
        }
        itemStatus = "SERVED";
        activityType = isBarItem ? "drink_served" : "food_served";
        description = `${orderItem.menuItemName} served to Table ${tableNumber}`;

        // Update session's food served timestamps
        if (orderItem.order.sessionId && !isBarItem) {
          const sessionUpdate: Record<string, Date> = {
            lastFoodServedAt: now,
          };

          // Check if this is the first food item served in the session
          const sessionData = await prisma.tableSession.findUnique({
            where: { id: orderItem.order.sessionId },
          });

          if (sessionData && !sessionData.firstFoodServedAt) {
            sessionUpdate.firstFoodServedAt = now;
          }

          await prisma.tableSession.update({
            where: { id: orderItem.order.sessionId },
            data: sessionUpdate,
          });
        }
        break;

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }

    // Update order item
    const updatedItem = await prisma.orderItem.update({
      where: { id },
      data: {
        ...updateData,
        status: itemStatus,
      },
      include: {
        menuItem: {
          select: { name: true, imageUrl: true },
        },
      },
    });

    // Check if all items in order are ready/served and update order status
    const allItems = await prisma.orderItem.findMany({
      where: { orderId: orderItem.orderId },
    });

    const allReady = allItems.every(
      (item: typeof allItems[number]) => item.status === "READY" || item.status === "SERVED"
    );
    const allServed = allItems.every((item: typeof allItems[number]) => item.status === "SERVED");

    if (allServed) {
      await prisma.order.update({
        where: { id: orderItem.orderId },
        data: { status: "SERVED", servedAt: now },
      });
    } else if (allReady) {
      await prisma.order.update({
        where: { id: orderItem.orderId },
        data: { status: "READY", readyAt: now },
      });
    }

    // Log activity
    await logActivity({
      restaurantId: session.restaurantId,
      userId: session.userId,
      activityType,
      entityType: isBarItem ? "bar" : "kitchen",
      priority: action === "ready" ? "notice" : "info",
      description,
      orderId: orderItem.orderId,
      orderItemId: id,
      details: {
        menuItemName: orderItem.menuItemName,
        tableNumber,
        action,
        isBarItem,
        timestamp: now.toISOString(),
      },
    });

    return NextResponse.json({
      success: true,
      action,
      timestamp: now.toISOString(),
      item: updatedItem,
    });
  } catch (error) {
    console.error("Error updating order item timestamp:", error);
    return NextResponse.json(
      { error: "Failed to update order item timestamp" },
      { status: 500 }
    );
  }
}

// GET order item timestamps
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

    const orderItem = await prisma.orderItem.findFirst({
      where: { id },
      include: {
        order: {
          select: {
            orderNumber: true,
            restaurantId: true,
            session: {
              select: {
                table: {
                  select: { tableNumber: true },
                },
              },
            },
          },
        },
        menuItem: {
          select: { name: true, imageUrl: true, kitchenStation: true },
        },
      },
    });

    if (!orderItem) {
      return NextResponse.json(
        { error: "Order item not found" },
        { status: 404 }
      );
    }

    if (orderItem.order.restaurantId !== session.restaurantId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Calculate metrics
    const metrics: Record<string, string | null> = {};

    if (orderItem.isBarItem) {
      // Bar metrics
      if (orderItem.barStartedAt && orderItem.barReceivedAt) {
        const queueTime =
          (orderItem.barStartedAt.getTime() -
            orderItem.barReceivedAt.getTime()) /
          1000;
        metrics.queueTime = `${Math.floor(queueTime / 60)}m ${Math.floor(queueTime % 60)}s`;
      }
      if (orderItem.barReadyAt && orderItem.barStartedAt) {
        const prepTime =
          (orderItem.barReadyAt.getTime() - orderItem.barStartedAt.getTime()) /
          1000;
        metrics.prepTime = `${Math.floor(prepTime / 60)}m ${Math.floor(prepTime % 60)}s`;
      }
      if (orderItem.drinkPickedAt && orderItem.barReadyAt) {
        const waitTime =
          (orderItem.drinkPickedAt.getTime() -
            orderItem.barReadyAt.getTime()) /
          1000;
        metrics.waitAtBarTime = `${Math.floor(waitTime / 60)}m ${Math.floor(waitTime % 60)}s`;
      }
      if (orderItem.drinkServedAt && orderItem.drinkPickedAt) {
        const deliveryTime =
          (orderItem.drinkServedAt.getTime() -
            orderItem.drinkPickedAt.getTime()) /
          1000;
        metrics.deliveryTime = `${Math.floor(deliveryTime / 60)}m ${Math.floor(deliveryTime % 60)}s`;
      }
    } else {
      // Kitchen metrics
      if (orderItem.preparingAt && orderItem.kitchenReceivedAt) {
        const queueTime =
          (orderItem.preparingAt.getTime() -
            orderItem.kitchenReceivedAt.getTime()) /
          1000;
        metrics.queueTime = `${Math.floor(queueTime / 60)}m ${Math.floor(queueTime % 60)}s`;
      }
      if (orderItem.readyAt && orderItem.preparingAt) {
        const prepTime =
          (orderItem.readyAt.getTime() - orderItem.preparingAt.getTime()) /
          1000;
        metrics.prepTime = `${Math.floor(prepTime / 60)}m ${Math.floor(prepTime % 60)}s`;
      }
      if (orderItem.foodPickedAt && orderItem.readyAt) {
        const waitTime =
          (orderItem.foodPickedAt.getTime() - orderItem.readyAt.getTime()) /
          1000;
        metrics.waitAtKitchenTime = `${Math.floor(waitTime / 60)}m ${Math.floor(waitTime % 60)}s`;
      }
      if (orderItem.servedAt && orderItem.foodPickedAt) {
        const deliveryTime =
          (orderItem.servedAt.getTime() - orderItem.foodPickedAt.getTime()) /
          1000;
        metrics.deliveryTime = `${Math.floor(deliveryTime / 60)}m ${Math.floor(deliveryTime % 60)}s`;
      }
    }

    return NextResponse.json({
      item: {
        id: orderItem.id,
        menuItemName: orderItem.menuItemName,
        menuItem: orderItem.menuItem,
        quantity: orderItem.quantity,
        status: orderItem.status,
        isBarItem: orderItem.isBarItem,
        kitchenStation: orderItem.kitchenStation,
        order: {
          orderNumber: orderItem.order.orderNumber,
          tableNumber: orderItem.order.session?.table?.tableNumber,
        },
      },
      timestamps: orderItem.isBarItem
        ? {
            // Bar timestamps
            barReceivedAt: orderItem.barReceivedAt,
            barStartedAt: orderItem.barStartedAt,
            barReadyAt: orderItem.barReadyAt,
            drinkPickedAt: orderItem.drinkPickedAt,
            drinkServedAt: orderItem.drinkServedAt,
          }
        : {
            // Kitchen timestamps
            sentToKitchenAt: orderItem.sentToKitchenAt,
            kitchenReceivedAt: orderItem.kitchenReceivedAt,
            preparingAt: orderItem.preparingAt,
            readyAt: orderItem.readyAt,
            waiterServeNotifiedAt: orderItem.waiterServeNotifiedAt,
            foodPickedAt: orderItem.foodPickedAt,
            servedAt: orderItem.servedAt,
          },
      metrics,
    });
  } catch (error) {
    console.error("Error fetching order item timestamps:", error);
    return NextResponse.json(
      { error: "Failed to fetch order item timestamps" },
      { status: 500 }
    );
  }
}
