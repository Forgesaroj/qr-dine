import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { calculateSlaBreach } from "@/lib/session-duration";
import { deductStockForMenuItem, reverseStockDeduction } from "@/lib/services/stock-deduction.service";

/**
 * PATCH /api/orders/[id]/items/[itemId]
 * Update order item status with SLA tracking
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: orderId, itemId } = await params;
    const body = await request.json();
    const { status } = body;

    // Get current item
    const item = await prisma.orderItem.findFirst({
      where: {
        id: itemId,
        orderId,
        order: {
          restaurantId: session.restaurantId,
        },
      },
      include: {
        order: {
          select: {
            sessionId: true,
            tableId: true,
          },
        },
      },
    });

    if (!item) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    const now = new Date();
    const updateData: Record<string, any> = { status };

    // Handle status-specific updates with SLA tracking
    switch (status) {
      case "SENT_TO_KITCHEN":
        updateData.sentToKitchenAt = now;
        updateData.kitchenReceivedAt = now;
        if (item.isBarItem) {
          updateData.barReceivedAt = now;
        }
        break;

      case "PREPARING":
        updateData.preparingAt = now;
        if (item.isBarItem) {
          updateData.barStartedAt = now;
        }
        break;

      case "READY":
        updateData.readyAt = now;
        updateData.waiterServeNotifiedAt = now;
        if (item.isBarItem) {
          updateData.barReadyAt = now;
        }

        // Calculate SLA breach
        if (item.preparingAt) {
          const sla = calculateSlaBreach(
            item.expectedPrepTimeMinutes,
            item.preparingAt,
            now
          );

          updateData.actualPrepTimeMinutes = sla.actualMinutes;
          updateData.slaBreached = sla.isBreached;
          if (sla.isBreached) {
            updateData.slaBreachedAt = now;
            updateData.slaBreachMinutes = sla.breachMinutes;

            // Create SLA breach alert
            if (item.order.sessionId) {
              await prisma.sessionAlert.create({
                data: {
                  restaurantId: session.restaurantId,
                  sessionId: item.order.sessionId,
                  tableId: item.order.tableId || "",
                  alertType: "sla_breach",
                  triggerCondition: `item_exceeded_${item.expectedPrepTimeMinutes}_min`,
                  message: `${item.menuItemName} exceeded expected prep time by ${sla.breachMinutes} minutes`,
                  priority: sla.breachMinutes! > 10 ? "high" : "normal",
                  status: "ACTIVE",
                  targetRoles: ["MANAGER", "KITCHEN"],
                },
              });
            }
          }
        }
        break;

      case "SERVED":
        updateData.servedAt = now;
        if (item.isBarItem) {
          updateData.drinkServedAt = now;
        } else {
          updateData.foodPickedAt = updateData.foodPickedAt || now;
        }

        // Auto-deduct stock based on BOM
        try {
          await deductStockForMenuItem(
            session.restaurantId,
            item.menuItemId,
            item.quantity,
            itemId,
            session.id,
            session.name || session.email
          );
        } catch (stockError) {
          console.error("Stock deduction error (non-blocking):", stockError);
        }
        break;

      case "CANCELLED":
        // Reverse stock deduction if item was previously served
        if (item.status === "SERVED") {
          try {
            await reverseStockDeduction(
              itemId,
              session.id,
              session.name || session.email
            );
          } catch (stockError) {
            console.error("Stock reversal error (non-blocking):", stockError);
          }
        }
        break;

      default:
        return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    // Update item
    const updatedItem = await prisma.orderItem.update({
      where: { id: itemId },
      data: updateData,
    });

    // Update order status based on all items
    const allItems = await prisma.orderItem.findMany({
      where: { orderId },
      select: { status: true },
    });

    // Determine order status based on item statuses
    type ItemStatus = typeof allItems[number];
    const itemStatuses = allItems.map((i: ItemStatus) => i.status);
    let newOrderStatus: string | null = null;

    if (itemStatuses.every((s: string) => s === "SERVED" || s === "CANCELLED")) {
      newOrderStatus = "SERVED";
    } else if (itemStatuses.some((s: string) => s === "READY")) {
      newOrderStatus = "READY";
    } else if (itemStatuses.some((s: string) => s === "PREPARING")) {
      newOrderStatus = "PREPARING";
    }

    if (newOrderStatus) {
      await prisma.order.update({
        where: { id: orderId },
        data: {
          status: newOrderStatus as any,
          ...(newOrderStatus === "PREPARING" ? { preparingAt: now } : {}),
          ...(newOrderStatus === "READY" ? { readyAt: now } : {}),
          ...(newOrderStatus === "SERVED" ? { servedAt: now } : {}),
        },
      });

      // If first food served, update session
      if (newOrderStatus === "SERVED" && item.order.sessionId) {
        const tableSession = await prisma.tableSession.findUnique({
          where: { id: item.order.sessionId },
          select: { firstFoodServedAt: true },
        });

        if (tableSession && !tableSession.firstFoodServedAt) {
          await prisma.tableSession.update({
            where: { id: item.order.sessionId },
            data: {
              firstFoodServedAt: now,
              lastFoodServedAt: now,
              phase: "DINING",
            },
          });
        } else if (tableSession) {
          await prisma.tableSession.update({
            where: { id: item.order.sessionId },
            data: { lastFoodServedAt: now },
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      item: updatedItem,
      slaInfo: {
        expectedMinutes: item.expectedPrepTimeMinutes,
        actualMinutes: updateData.actualPrepTimeMinutes,
        breached: updateData.slaBreached,
        breachMinutes: updateData.slaBreachMinutes,
      },
    });
  } catch (error) {
    console.error("Error updating order item:", error);
    return NextResponse.json(
      { error: "Failed to update item" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/orders/[id]/items/[itemId]
 * Get order item details with SLA info
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: orderId, itemId } = await params;

    const item = await prisma.orderItem.findFirst({
      where: {
        id: itemId,
        orderId,
        order: {
          restaurantId: session.restaurantId,
        },
      },
      include: {
        menuItem: {
          select: {
            name: true,
            prepTimeMinutes: true,
          },
        },
      },
    });

    if (!item) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    // Calculate current SLA status if preparing
    let currentSlaInfo = null;
    if (item.preparingAt && !item.readyAt) {
      const sla = calculateSlaBreach(
        item.expectedPrepTimeMinutes,
        item.preparingAt,
        null // Use current time
      );
      currentSlaInfo = {
        expectedMinutes: item.expectedPrepTimeMinutes,
        currentMinutes: sla.actualMinutes,
        isExceeding: sla.isBreached,
        exceedingBy: sla.breachMinutes,
      };
    }

    return NextResponse.json({
      item,
      slaInfo: currentSlaInfo,
      timestamps: {
        sentToKitchen: item.sentToKitchenAt,
        preparing: item.preparingAt,
        ready: item.readyAt,
        served: item.servedAt,
      },
    });
  } catch (error) {
    console.error("Error fetching order item:", error);
    return NextResponse.json(
      { error: "Failed to fetch item" },
      { status: 500 }
    );
  }
}
