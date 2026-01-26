import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// Check if user can see bill amounts (waiters cannot)
function canViewAmounts(role: string): boolean {
  return role !== "WAITER";
}

// Strip amounts from bill object for waiters
function stripAmountsFromBill(bill: Record<string, unknown>, canView: boolean) {
  if (canView) return bill;

  return {
    ...bill,
    subtotal: undefined,
    taxAmount: undefined,
    serviceCharge: undefined,
    totalAmount: undefined,
    discountAmount: undefined,
    pointsDiscount: undefined,
    // Keep other properties
    amountsHidden: true,
  };
}

// GET list all bills
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const canView = canViewAmounts(session.role);

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const date = searchParams.get("date");

    // Build filter conditions
    const where: Record<string, unknown> = {
      restaurantId: session.restaurantId,
    };

    if (status) {
      where.status = status;
    }

    if (date) {
      const startDate = new Date(date);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(date);
      endDate.setHours(23, 59, 59, 999);
      where.generatedAt = {
        gte: startDate,
        lte: endDate,
      };
    }

    const bills = await prisma.bill.findMany({
      where,
      orderBy: { generatedAt: "desc" },
      include: {
        order: {
          include: {
            table: { select: { tableNumber: true, name: true } },
            items: { select: { id: true, menuItemName: true, quantity: true } },
          },
        },
        customer: { select: { name: true, phone: true } },
        generatedBy: { select: { name: true } },
        payments: true,
      },
    });

    type BillWithRelations = typeof bills[number];

    // Strip amounts for waiters
    const processedBills = bills.map((bill: BillWithRelations) =>
      stripAmountsFromBill(bill as unknown as Record<string, unknown>, canView)
    );

    return NextResponse.json({ bills: processedBills, amountsHidden: !canView });
  } catch (error) {
    console.error("Error fetching bills:", error);
    return NextResponse.json(
      { error: "Failed to fetch bills" },
      { status: 500 }
    );
  }
}

// POST create a new bill from order(s)
// Combines all unbilled orders from the same table session into one bill
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { orderId, tableId, sessionId: tableSessionId } = body;

    if (!orderId && !tableId && !tableSessionId) {
      return NextResponse.json(
        { error: "Order ID, Table ID, or Session ID is required" },
        { status: 400 }
      );
    }

    // Build query to find all unbilled orders for this table/session
    const orderQuery: Record<string, unknown> = {
      restaurantId: session.restaurantId,
      status: { notIn: ["CANCELLED"] },
    };

    if (orderId) {
      // Get the order first to find its session
      const primaryOrder = await prisma.order.findFirst({
        where: { id: orderId, restaurantId: session.restaurantId },
        select: { sessionId: true, tableId: true },
      });

      if (!primaryOrder) {
        return NextResponse.json({ error: "Order not found" }, { status: 404 });
      }

      // Find all orders for this session/table that don't have bills yet
      if (primaryOrder.sessionId) {
        orderQuery.sessionId = primaryOrder.sessionId;
      } else if (primaryOrder.tableId) {
        orderQuery.tableId = primaryOrder.tableId;
      } else {
        orderQuery.id = orderId;
      }
    } else if (tableSessionId) {
      orderQuery.sessionId = tableSessionId;
    } else if (tableId) {
      orderQuery.tableId = tableId;
    }

    // Find all orders that match and don't have bills
    const allOrders = await prisma.order.findMany({
      where: orderQuery,
      include: {
        items: true,
        table: true,
        bills: { where: { status: { not: "CANCELLED" } } },
      },
      orderBy: { placedAt: "asc" },
    });

    type OrderWithBills = typeof allOrders[number];

    // Filter to only orders without bills
    const unbilledOrders = allOrders.filter((o: OrderWithBills) => o.bills.length === 0);

    if (unbilledOrders.length === 0) {
      return NextResponse.json(
        { error: "No unbilled orders found. Bills may already exist for these orders." },
        { status: 400 }
      );
    }

    // Use the first order as the primary order for the bill
    const primaryOrder = unbilledOrders[0]!;

    // Calculate combined totals from all unbilled orders
    let combinedSubtotal = 0;
    const allItems: Array<{
      id: string;
      menuItemName: string;
      quantity: number;
      unitPrice: number;
      totalPrice: number;
    }> = [];

    for (const order of unbilledOrders) {
      combinedSubtotal += order.subtotal || 0;
      for (const item of order.items) {
        allItems.push({
          id: item.id,
          menuItemName: item.menuItemName,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.totalPrice,
        });
      }
    }

    // Get restaurant settings for tax/service charge
    const restaurant = await prisma.restaurant.findUnique({
      where: { id: session.restaurantId },
      select: { settings: true },
    });

    const settings = (restaurant?.settings as Record<string, unknown>) || {};

    // Calculate amounts
    const taxEnabled = settings.taxEnabled ?? true;
    const taxPercentage = (settings.taxPercentage as number) ?? 13;
    const serviceChargeEnabled = settings.serviceChargeEnabled ?? true;
    const serviceChargePercentage = (settings.serviceChargePercentage as number) ?? 10;

    const taxAmount = taxEnabled ? (combinedSubtotal * taxPercentage) / 100 : 0;
    const serviceCharge = serviceChargeEnabled
      ? (combinedSubtotal * serviceChargePercentage) / 100
      : 0;
    const totalAmount = combinedSubtotal + taxAmount + serviceCharge;

    // Generate bill number
    const billCount = await prisma.bill.count({
      where: { restaurantId: session.restaurantId },
    });
    const billNumber = `BILL-${String(billCount + 1).padStart(6, "0")}`;

    // Create bill (linked to primary order, but covers all orders in session)
    const bill = await prisma.bill.create({
      data: {
        restaurantId: session.restaurantId,
        billNumber,
        orderId: primaryOrder.id,
        sessionId: primaryOrder.sessionId,
        subtotal: combinedSubtotal,
        taxAmount,
        serviceCharge,
        totalAmount,
        status: "OPEN",
        generatedById: session.userId,
      },
      include: {
        order: {
          include: {
            table: true,
            items: true,
          },
        },
        generatedBy: { select: { name: true } },
      },
    });

    // Update all orders status to COMPLETED
    await prisma.order.updateMany({
      where: { id: { in: unbilledOrders.map((o: OrderWithBills) => o.id) } },
      data: { status: "COMPLETED" },
    });

    // Return bill with combined items from all orders
    return NextResponse.json({
      bill: {
        ...bill,
        combinedItems: allItems,
        orderCount: unbilledOrders.length,
        orderNumbers: unbilledOrders.map((o: OrderWithBills) => o.orderNumber),
      },
    }, { status: 201 });
  } catch (error) {
    console.error("Error creating bill:", error);
    return NextResponse.json(
      { error: "Failed to create bill" },
      { status: 500 }
    );
  }
}
