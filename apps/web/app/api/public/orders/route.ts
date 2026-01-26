import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// POST create a new order (public endpoint for customers)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { restaurantSlug, tableNumber, items } = body;

    if (!restaurantSlug || !tableNumber || !items || items.length === 0) {
      return NextResponse.json(
        { error: "Restaurant, table number, and items are required" },
        { status: 400 }
      );
    }

    // Find restaurant by slug
    const restaurant = await prisma.restaurant.findUnique({
      where: { slug: restaurantSlug },
    });

    if (!restaurant) {
      return NextResponse.json(
        { error: "Restaurant not found" },
        { status: 404 }
      );
    }

    // Find the table
    const table = await prisma.table.findFirst({
      where: {
        restaurantId: restaurant.id,
        tableNumber: tableNumber,
      },
    });

    if (!table) {
      return NextResponse.json(
        { error: "Table not found" },
        { status: 404 }
      );
    }

    // Validate menu items and calculate total
    const menuItemIds = items.map((item: { menuItemId: string }) => item.menuItemId);
    const menuItems = await prisma.menuItem.findMany({
      where: {
        id: { in: menuItemIds },
        category: {
          restaurantId: restaurant.id,
        },
        isAvailable: true,
      },
    });

    if (menuItems.length !== menuItemIds.length) {
      return NextResponse.json(
        { error: "Some items are not available" },
        { status: 400 }
      );
    }

    // Calculate total
    type MenuItemType = typeof menuItems[number];
    const itemsWithPrices = items.map((item: { menuItemId: string; quantity: number; notes?: string }) => {
      const menuItem = menuItems.find((mi: MenuItemType) => mi.id === item.menuItemId);
      return {
        menuItemId: item.menuItemId,
        menuItemName: menuItem!.name,
        quantity: item.quantity,
        price: menuItem!.basePrice,
        notes: item.notes || null,
      };
    });

    const total = itemsWithPrices.reduce(
      (sum: number, item: { price: number; quantity: number }) => sum + item.price * item.quantity,
      0
    );

    // Generate order number
    const orderCount = await prisma.order.count({
      where: { restaurantId: restaurant.id },
    });
    const orderNumber = `ORD-${String(orderCount + 1).padStart(6, "0")}`;

    // Create the order
    const order = await prisma.order.create({
      data: {
        restaurantId: restaurant.id,
        tableId: table.id,
        orderNumber,
        status: "PENDING",
        orderSource: "QR",
        orderType: "DINE_IN",
        subtotal: total,
        totalAmount: total,
        items: {
          create: itemsWithPrices.map((item: { menuItemId: string; menuItemName: string; quantity: number; price: number; notes: string | null }) => ({
            menuItemId: item.menuItemId,
            menuItemName: item.menuItemName,
            quantity: item.quantity,
            unitPrice: item.price,
            totalPrice: item.price * item.quantity,
            specialRequests: item.notes,
            status: "PENDING",
          })),
        },
      },
      include: {
        items: {
          include: {
            menuItem: true,
          },
        },
        table: true,
      },
    });

    // Update table status to occupied
    await prisma.table.update({
      where: { id: table.id },
      data: { status: "OCCUPIED" },
    });

    return NextResponse.json({ order }, { status: 201 });
  } catch (error) {
    console.error("Error creating order:", error);
    return NextResponse.json(
      { error: "Failed to create order" },
      { status: 500 }
    );
  }
}
