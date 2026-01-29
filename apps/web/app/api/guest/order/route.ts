import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { emitOrderEvent } from "@/lib/notification-events";

// POST place a new order from guest QR scan
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, restaurant: restaurantSlug, table: tableId, items } = body;

    if (!sessionId || !restaurantSlug || !items || items.length === 0) {
      return NextResponse.json(
        { error: "Session, restaurant, and items are required" },
        { status: 400 }
      );
    }

    // Find restaurant with settings
    const restaurant = await prisma.restaurant.findUnique({
      where: { slug: restaurantSlug },
      select: {
        id: true,
        status: true,
        restaurantSettings: {
          select: {
            qrOrderRequiresConfirmation: true,
          },
        },
      },
    });

    if (!restaurant || restaurant.status !== "ACTIVE") {
      return NextResponse.json(
        { error: "Restaurant not found or not active" },
        { status: 404 }
      );
    }

    // Verify session
    const session = await prisma.tableSession.findFirst({
      where: {
        id: sessionId,
        restaurantId: restaurant.id,
        status: "ACTIVE",
      },
      include: {
        table: true,
      },
    });

    if (!session) {
      return NextResponse.json(
        { error: "Session expired or invalid" },
        { status: 400 }
      );
    }

    // Get menu items and validate
    const menuItemIds = items.map((i: { menuItemId: string }) => i.menuItemId);
    const menuItems = await prisma.menuItem.findMany({
      where: {
        id: { in: menuItemIds },
        restaurantId: restaurant.id,
        isAvailable: true,
      },
    });

    if (menuItems.length !== items.length) {
      return NextResponse.json(
        { error: "Some items are no longer available" },
        { status: 400 }
      );
    }

    type MenuItemType = typeof menuItems[number];

    // Calculate totals and prepare order items with SLA tracking
    const now = new Date();
    let subtotal = 0;
    const orderItems = items.map((item: { menuItemId: string; quantity: number; specialRequests?: string }) => {
      const menuItem = menuItems.find((mi: MenuItemType) => mi.id === item.menuItemId)!;
      const itemTotal = menuItem.basePrice * item.quantity;
      subtotal += itemTotal;

      return {
        menuItemId: item.menuItemId,
        menuItemName: menuItem.name,
        quantity: item.quantity,
        unitPrice: menuItem.basePrice,
        totalPrice: itemTotal,
        specialRequests: item.specialRequests || null,
        status: "PENDING",
        kitchenStation: menuItem.kitchenStation || null,
        isBarItem: menuItem.kitchenStation?.toLowerCase().includes("bar") || false,
        // SLA tracking - store expected prep time from menu item
        expectedPrepTimeMinutes: menuItem.prepTimeMinutes || null,
      };
    });

    // Generate order number
    const orderCount = await prisma.order.count({
      where: { restaurantId: restaurant.id },
    });
    const orderNumber = `ORD-${String(orderCount + 1).padStart(5, "0")}`;

    // Check restaurant setting for QR order confirmation
    // qrOrderRequiresConfirmation: true = Staff confirms before kitchen sees order
    // qrOrderRequiresConfirmation: false = Order goes directly to kitchen
    const qrOrderRequiresConfirmation = restaurant.restaurantSettings?.qrOrderRequiresConfirmation ?? true;

    // Also check if session has guest count set - if no guest count, needs confirmation regardless
    const noGuestCount = !session.guestCount || session.guestCount === 0;
    const needsConfirmation = qrOrderRequiresConfirmation || noGuestCount;
    const orderStatus = needsConfirmation ? "PENDING_CONFIRMATION" : "PENDING";

    // Create order
    const order = await prisma.order.create({
      data: {
        restaurantId: restaurant.id,
        orderNumber,
        tableId: session.tableId,
        sessionId: session.id,
        customerId: session.customerId,
        orderType: "DINE_IN",
        orderSource: "QR",
        status: orderStatus,
        requiresConfirmation: needsConfirmation,
        subtotal,
        taxAmount: 0, // Will be calculated at billing
        serviceCharge: 0,
        discountAmount: 0,
        totalAmount: subtotal,
        placedAt: new Date(),
        items: {
          create: orderItems,
        },
      },
      include: {
        items: true,
        table: {
          select: {
            tableNumber: true,
            name: true,
          },
        },
      },
    });

    // If order doesn't need confirmation (goes directly to kitchen), update item status
    if (!needsConfirmation) {
      await prisma.orderItem.updateMany({
        where: { orderId: order.id },
        data: {
          status: "SENT_TO_KITCHEN",
          sentToKitchenAt: now,
        },
      });
    }

    // Update session phase to ORDERING and set order timestamps
    const isFirstOrder = !session.firstOrderAt;
    await prisma.tableSession.update({
      where: { id: session.id },
      data: {
        phase: "ORDERING",
        firstOrderAt: isFirstOrder ? now : undefined,
        lastOrderAt: now,
      },
    });

    // Resolve any pending order help alerts for this session
    if (isFirstOrder) {
      await prisma.sessionAlert.updateMany({
        where: {
          sessionId: session.id,
          alertType: "order_help",
          status: { in: ["ACTIVE", "ACKNOWLEDGED"] },
        },
        data: {
          status: "RESOLVED",
          resolvedAt: now,
          resolutionNote: "First order placed",
        },
      });
    }

    // Emit real-time notification for new order
    emitOrderEvent("NEW_ORDER", restaurant.id, {
      orderId: order.id,
      tableNumber: order.table?.tableNumber,
      tableName: order.table?.name || `Table ${order.table?.tableNumber}`,
      status: order.status,
    });

    return NextResponse.json({
      order: {
        id: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
        items: order.items,
        subtotal: order.subtotal,
        totalAmount: order.totalAmount,
        placedAt: order.placedAt,
        table: order.table,
        needsConfirmation,
      },
    }, { status: 201 });
  } catch (error) {
    console.error("Error placing order:", error);
    return NextResponse.json(
      { error: "Failed to place order" },
      { status: 500 }
    );
  }
}

// GET order status
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get("id");
    const sessionId = searchParams.get("session");

    if (!orderId) {
      return NextResponse.json(
        { error: "Order ID is required" },
        { status: 400 }
      );
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          select: {
            id: true,
            menuItemName: true,
            quantity: true,
            unitPrice: true,
            totalPrice: true,
            status: true,
            specialRequests: true,
          },
        },
        table: {
          select: {
            tableNumber: true,
            name: true,
          },
        },
        bills: {
          where: { status: { not: "CANCELLED" } },
          select: {
            id: true,
            billNumber: true,
            status: true,
            totalAmount: true,
          },
        },
      },
    });

    if (!order) {
      return NextResponse.json(
        { error: "Order not found" },
        { status: 404 }
      );
    }

    // If session provided, verify it matches
    if (sessionId && order.sessionId !== sessionId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 403 }
      );
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
