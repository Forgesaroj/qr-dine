import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

/**
 * POST /api/orders/[id]/items/bulk-serve
 * Mark multiple order items as served in one operation
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: orderId } = await params;
    const body = await request.json();
    const { itemIds, serveAll } = body;

    // Get order with items
    const order = await prisma.order.findFirst({
      where: {
        id: orderId,
        restaurantId: session.restaurantId,
      },
      include: {
        items: {
          select: {
            id: true,
            status: true,
            isBarItem: true,
          },
        },
      },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const now = new Date();
    let itemsToServe: string[];

    if (serveAll) {
      // Serve all items that are READY
      itemsToServe = order.items
        .filter((item) => item.status === "READY")
        .map((item) => item.id);
    } else if (itemIds && Array.isArray(itemIds)) {
      // Serve specified items
      itemsToServe = itemIds;
    } else {
      return NextResponse.json(
        { error: "Either itemIds or serveAll must be provided" },
        { status: 400 }
      );
    }

    if (itemsToServe.length === 0) {
      return NextResponse.json(
        { error: "No items to serve" },
        { status: 400 }
      );
    }

    // Update all specified items to SERVED
    const updateResult = await prisma.orderItem.updateMany({
      where: {
        id: { in: itemsToServe },
        orderId,
      },
      data: {
        status: "SERVED",
        servedAt: now,
      },
    });

    // Also update bar-specific timestamps for bar items
    const barItems = order.items.filter(
      (item) => item.isBarItem && itemsToServe.includes(item.id)
    );
    if (barItems.length > 0) {
      await prisma.orderItem.updateMany({
        where: {
          id: { in: barItems.map((item) => item.id) },
        },
        data: {
          drinkServedAt: now,
        },
      });
    }

    // Non-bar items
    const foodItems = order.items.filter(
      (item) => !item.isBarItem && itemsToServe.includes(item.id)
    );
    if (foodItems.length > 0) {
      await prisma.orderItem.updateMany({
        where: {
          id: { in: foodItems.map((item) => item.id) },
        },
        data: {
          foodPickedAt: now,
        },
      });
    }

    // Check if all items are now served
    const allItems = await prisma.orderItem.findMany({
      where: { orderId },
      select: { status: true },
    });

    const allServed = allItems.every(
      (item) => item.status === "SERVED" || item.status === "CANCELLED"
    );

    if (allServed) {
      await prisma.order.update({
        where: { id: orderId },
        data: {
          status: "SERVED",
          servedAt: now,
        },
      });
    }

    // Update session firstFoodServedAt if not already set
    if (order.sessionId) {
      const tableSession = await prisma.tableSession.findUnique({
        where: { id: order.sessionId },
        select: { firstFoodServedAt: true },
      });

      if (tableSession && !tableSession.firstFoodServedAt) {
        await prisma.tableSession.update({
          where: { id: order.sessionId },
          data: {
            firstFoodServedAt: now,
            lastFoodServedAt: now,
            phase: "DINING",
          },
        });
      } else if (tableSession) {
        await prisma.tableSession.update({
          where: { id: order.sessionId },
          data: { lastFoodServedAt: now },
        });
      }
    }

    return NextResponse.json({
      success: true,
      servedCount: updateResult.count,
      itemIds: itemsToServe,
      orderFullyServed: allServed,
    });
  } catch (error) {
    console.error("Error bulk serving items:", error);
    return NextResponse.json(
      { error: "Failed to bulk serve items" },
      { status: 500 }
    );
  }
}
