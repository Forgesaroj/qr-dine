import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { logActivity } from "@/lib/activity-log";
import { Prisma } from "@prisma/client";

interface VariantGroup {
  name: string;
  options: Array<{
    id?: string;
    name: string;
    price: number;
  }>;
}

interface QuickOrderItem {
  menuItemId: string;
  quantity: number;
  variantId?: string;
  specialRequests?: string;
  isTakeaway?: boolean;
}

// Generate a simple pickup token (e.g., "T-A1B2")
function generatePickupToken(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Excludes confusing chars like 0, O, I, 1
  let token = "T-";
  for (let i = 0; i < 4; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

// POST create a quick order for a table
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      tableId,
      items,
      notes,
      orderType = "DINE_IN",
      customerName,
      customerPhone,
    } = body;

    const isTakeawayOrder = orderType === "TAKEAWAY" || orderType === "PHONE";

    // Table is required for dine-in, optional for takeaway
    if (!isTakeawayOrder && !tableId) {
      return NextResponse.json(
        { error: "Table ID is required for dine-in orders" },
        { status: 400 }
      );
    }

    // Phone is required for takeaway orders
    if (isTakeawayOrder && !customerPhone) {
      return NextResponse.json(
        { error: "Customer phone is required for takeaway orders" },
        { status: 400 }
      );
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "At least one item is required" },
        { status: 400 }
      );
    }

    // Verify table exists and belongs to restaurant (if tableId provided)
    let table = null;
    let tableSession = null;

    if (tableId) {
      table = await prisma.table.findFirst({
        where: {
          id: tableId,
          restaurantId: session.restaurantId,
        },
        include: {
          sessions: {
            where: { status: "ACTIVE" },
            orderBy: { seatedAt: "desc" },
            take: 1,
          },
        },
      });

      if (!table) {
        return NextResponse.json({ error: "Table not found" }, { status: 404 });
      }

      // Get or create table session
      tableSession = table.sessions[0];

      if (!tableSession) {
        // Create new session
        tableSession = await prisma.tableSession.create({
          data: {
            restaurantId: session.restaurantId,
            tableId,
            guestCount: 1,
            startedById: session.userId,
            startedByType: "STAFF",
            waiterNotifiedAt: new Date(),
            waiterId: session.userId,
          },
        });

        // Update table status to occupied
        await prisma.table.update({
          where: { id: tableId },
          data: { status: "OCCUPIED" },
        });
      }
    }

    // Get menu items with pricing (use unique IDs to avoid duplicate comparison issues)
    const menuItemIds = items.map((i: QuickOrderItem) => i.menuItemId);
    const uniqueMenuItemIds = [...new Set(menuItemIds)];
    const menuItems = await prisma.menuItem.findMany({
      where: {
        id: { in: uniqueMenuItemIds },
        restaurantId: session.restaurantId,
        isAvailable: true,
      },
      include: {
        category: { select: { name: true } },
      },
    });

    // Validate all unique items exist
    if (menuItems.length !== uniqueMenuItemIds.length) {
      return NextResponse.json(
        { error: "Some menu items not found or inactive" },
        { status: 400 }
      );
    }

    // Build order items
    const orderItems: Prisma.OrderItemUncheckedCreateWithoutOrderInput[] = [];

    let subtotal = 0;
    let packagingTotal = 0;

    for (const item of items as QuickOrderItem[]) {
      const menuItem = menuItems.find((m) => m.id === item.menuItemId);
      if (!menuItem) continue;

      let unitPrice = menuItem.basePrice;
      let variantName: string | undefined;

      // Check for variant pricing from variantGroups JSON
      if (item.variantId && menuItem.variantGroups) {
        try {
          const groups = menuItem.variantGroups as unknown as VariantGroup[];
          if (Array.isArray(groups)) {
            for (const group of groups) {
              if (group.options && Array.isArray(group.options)) {
                const option = group.options.find(
                  (opt, idx) => opt.id === item.variantId || `${menuItem.id}-${groups.indexOf(group)}-${idx}` === item.variantId
                );
                if (option) {
                  unitPrice = option.price || menuItem.basePrice;
                  variantName = group.name ? `${group.name}: ${option.name}` : option.name;
                  break;
                }
              }
            }
          }
        } catch {
          // If parsing fails, use base price
        }
      }

      const totalPrice = unitPrice * item.quantity;
      subtotal += totalPrice;

      // Determine if this item is takeaway (either order is takeaway or item marked as takeaway)
      const itemIsTakeaway = isTakeawayOrder || item.isTakeaway === true;

      // Calculate packaging charge for takeaway items
      const packagingCharge = itemIsTakeaway ? (menuItem.packagingCharge || 0) * item.quantity : 0;
      packagingTotal += packagingCharge;

      // Determine kitchen station based on category
      let kitchenStation = menuItem.kitchenStation || "KITCHEN";
      const categoryName = menuItem.category?.name?.toLowerCase() || "";
      if (
        categoryName.includes("beverage") ||
        categoryName.includes("drink") ||
        categoryName.includes("bar") ||
        categoryName.includes("cocktail") ||
        categoryName.includes("wine") ||
        categoryName.includes("beer")
      ) {
        kitchenStation = "BAR";
      }

      orderItems.push({
        menuItemId: item.menuItemId,
        menuItemName: variantName ? `${menuItem.name} (${variantName})` : menuItem.name,
        quantity: item.quantity,
        unitPrice,
        totalPrice,
        specialRequests: item.specialRequests,
        kitchenStation,
        status: "PENDING",
        isTakeaway: itemIsTakeaway,
        packagingChargeApplied: packagingCharge,
      });
    }

    // Get restaurant settings for tax/service charge
    const restaurant = await prisma.restaurant.findUnique({
      where: { id: session.restaurantId },
      select: { settings: true },
    });

    const settings = (restaurant?.settings as Record<string, unknown>) || {};
    const taxEnabled = settings.taxEnabled ?? true;
    const taxPercentage = (settings.taxPercentage as number) ?? 13;
    const serviceChargeEnabled = settings.serviceChargeEnabled ?? true;
    const serviceChargePercentage = (settings.serviceChargePercentage as number) ?? 10;

    const taxAmount = taxEnabled ? (subtotal * taxPercentage) / 100 : 0;
    const serviceCharge = serviceChargeEnabled
      ? (subtotal * serviceChargePercentage) / 100
      : 0;
    const totalAmount = subtotal + taxAmount + serviceCharge + packagingTotal;

    // Generate order number
    const orderCount = await prisma.order.count({
      where: { restaurantId: session.restaurantId },
    });
    const orderNumber = `ORD-${String(orderCount + 1).padStart(6, "0")}`;

    // Generate pickup token for takeaway orders
    const pickupToken = isTakeawayOrder ? generatePickupToken() : null;

    // Create order
    const order = await prisma.order.create({
      data: {
        restaurantId: session.restaurantId,
        tableId: tableId || null,
        sessionId: tableSession?.id || null,
        orderNumber,
        orderType,
        orderSource: "STAFF",
        status: "CONFIRMED", // Staff orders go straight to confirmed
        subtotal,
        taxAmount,
        serviceCharge,
        totalAmount,
        packagingTotal,
        placedById: session.userId,
        placedAt: new Date(),
        confirmedAt: new Date(),
        // Takeaway specific fields
        takeawayCustomerName: isTakeawayOrder ? customerName : null,
        takeawayCustomerPhone: isTakeawayOrder ? customerPhone : null,
        pickupToken,
        items: {
          create: orderItems,
        },
      },
      include: {
        table: { select: { tableNumber: true, name: true } },
        items: true,
      },
    });

    // Create or update TakeawayCustomer for repeat customer lookup
    if (isTakeawayOrder && customerPhone) {
      await prisma.takeawayCustomer.upsert({
        where: {
          restaurantId_phone: {
            restaurantId: session.restaurantId,
            phone: customerPhone,
          },
        },
        create: {
          restaurantId: session.restaurantId,
          name: customerName || "Unknown",
          phone: customerPhone,
          totalOrders: 1,
          totalSpent: totalAmount,
          lastOrderAt: new Date(),
          lastOrderItems: orderItems.map((item) => ({
            menuItemId: item.menuItemId,
            menuItemName: item.menuItemName,
            quantity: item.quantity,
          })),
        },
        update: {
          name: customerName || undefined,
          totalOrders: { increment: 1 },
          totalSpent: { increment: totalAmount },
          lastOrderAt: new Date(),
          lastOrderItems: orderItems.map((item) => ({
            menuItemId: item.menuItemId,
            menuItemName: item.menuItemName,
            quantity: item.quantity,
          })),
        },
      });
    }

    // Update session timestamps (only if we have a table session)
    if (tableSession) {
      const sessionUpdate: Record<string, Date> = {
        lastOrderAt: new Date(),
      };
      if (!tableSession.firstOrderAt) {
        sessionUpdate.firstOrderAt = new Date();
      }

      await prisma.tableSession.update({
        where: { id: tableSession.id },
        data: sessionUpdate,
      });
    }

    // Log activity
    const orderDescription = isTakeawayOrder
      ? `Takeaway order #${orderNumber} placed for ${customerName || customerPhone} (${orderItems.length} items) - Token: ${pickupToken}`
      : `Quick order #${orderNumber} placed for Table ${table?.tableNumber} (${orderItems.length} items)`;

    await logActivity({
      restaurantId: session.restaurantId,
      userId: session.userId,
      activityType: "quick_order_placed",
      entityType: "order",
      entityId: order.id,
      tableId: tableId || undefined,
      sessionId: tableSession?.id,
      description: orderDescription,
      priority: "notice",
      details: {
        orderNumber,
        tableNumber: table?.tableNumber,
        itemCount: orderItems.length,
        totalAmount,
        orderType,
        pickupToken,
        customerName: isTakeawayOrder ? customerName : undefined,
        customerPhone: isTakeawayOrder ? customerPhone : undefined,
      },
    });

    const successMessage = isTakeawayOrder
      ? `Takeaway order #${orderNumber} placed successfully. Pickup Token: ${pickupToken}`
      : `Order #${orderNumber} placed successfully`;

    return NextResponse.json({
      success: true,
      order,
      pickupToken,
      message: successMessage,
    }, { status: 201 });
  } catch (error) {
    console.error("Error creating quick order:", error);
    return NextResponse.json(
      { error: "Failed to create order" },
      { status: 500 }
    );
  }
}

// GET recent orders for repeat functionality
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const tableId = searchParams.get("tableId");
    const limit = parseInt(searchParams.get("limit") || "5");

    // Get recent orders (for repeat order functionality)
    const recentOrders = await prisma.order.findMany({
      where: {
        restaurantId: session.restaurantId,
        ...(tableId && { tableId }),
        status: { notIn: ["CANCELLED"] },
      },
      include: {
        table: { select: { tableNumber: true, name: true } },
        items: {
          select: {
            menuItemId: true,
            menuItemName: true,
            quantity: true,
            unitPrice: true,
            specialRequests: true,
            isTakeaway: true,
            packagingChargeApplied: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    return NextResponse.json({ recentOrders });
  } catch (error) {
    console.error("Error fetching recent orders:", error);
    return NextResponse.json(
      { error: "Failed to fetch recent orders" },
      { status: 500 }
    );
  }
}
