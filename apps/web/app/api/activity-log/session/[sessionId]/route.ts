import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { sessionId } = await params;

    // Get the table session
    const tableSession = await prisma.tableSession.findFirst({
      where: {
        id: sessionId,
        restaurantId: session.restaurantId,
      },
      include: {
        table: true,
        customer: true,
        startedBy: {
          select: { id: true, name: true, role: true },
        },
        waiter: {
          select: { id: true, name: true, role: true },
        },
        orders: {
          include: {
            items: {
              include: {
                menuItem: true,
              },
            },
          },
          orderBy: { createdAt: "asc" },
        },
        bills: {
          include: {
            payments: true,
          },
        },
      },
    });

    if (!tableSession) {
      return NextResponse.json(
        { error: "Session not found" },
        { status: 404 }
      );
    }

    // Define types for nested data
    type OrderWithItems = typeof tableSession.orders[number];
    type OrderItem = OrderWithItems["items"][number];
    type BillWithPayments = typeof tableSession.bills[number];
    type Payment = BillWithPayments["payments"][number];

    // Get all activity logs for this session
    const activities = await prisma.activityLog.findMany({
      where: {
        restaurantId: session.restaurantId,
        sessionId: sessionId,
      },
      orderBy: { createdAt: "asc" },
      include: {
        user: {
          select: { id: true, name: true, role: true },
        },
      },
    });

    type Activity = typeof activities[number];

    // Calculate session metrics
    const startedAt = tableSession.startedAt;
    const endedAt = tableSession.endedAt || new Date();
    const duration = endedAt.getTime() - startedAt.getTime();

    const totalOrders = tableSession.orders.length;
    const totalItems = tableSession.orders.reduce(
      (sum: number, order: OrderWithItems) => sum + order.items.length,
      0
    );
    const totalQuantity = tableSession.orders.reduce(
      (sum: number, order: OrderWithItems) =>
        sum + order.items.reduce((s: number, item: OrderItem) => s + item.quantity, 0),
      0
    );

    const totalBillAmount = tableSession.bills.reduce(
      (sum: number, bill: BillWithPayments) => sum + bill.totalAmount,
      0
    );
    const totalPayments = tableSession.bills.reduce(
      (sum: number, bill: BillWithPayments) =>
        sum + bill.payments.reduce((s: number, p: Payment) => s + p.amount, 0),
      0
    );
    const totalDiscount = tableSession.bills.reduce(
      (sum: number, bill: BillWithPayments) => sum + bill.discountAmount,
      0
    );

    // Group activities by phase
    const phases = {
      seating: activities.filter((a: Activity) =>
        ["table_seated", "session_started", "guest_count_updated"].includes(
          a.activityType || a.action
        )
      ),
      ordering: activities.filter((a: Activity) =>
        ["order_placed", "items_added", "order_modified"].includes(
          a.activityType || a.action
        )
      ),
      kitchen: activities.filter((a: Activity) =>
        [
          "kitchen_received",
          "prep_started",
          "item_ready",
          "bar_received",
          "drink_started",
          "drink_ready",
        ].includes(a.activityType || a.action)
      ),
      service: activities.filter((a: Activity) =>
        [
          "water_served",
          "food_picked_up",
          "food_served",
          "drink_picked_up",
          "drink_served",
        ].includes(a.activityType || a.action)
      ),
      assistance: activities.filter((a: Activity) =>
        [
          "assistance_requested",
          "assistance_acknowledged",
          "assistance_completed",
        ].includes(a.activityType || a.action)
      ),
      issues: activities.filter((a: Activity) =>
        [
          "food_issue_reported",
          "escalation_triggered",
          "issue_resolved",
          "item_voided",
          "item_replaced",
          "discount_applied",
        ].includes(a.activityType || a.action)
      ),
      billing: activities.filter((a: Activity) =>
        [
          "bill_requested",
          "bill_printed",
          "bill_delivered",
          "payment_collected",
          "partial_payment",
          "payment_completed",
        ].includes(a.activityType || a.action)
      ),
      closing: activities.filter((a: Activity) =>
        [
          "table_vacated",
          "cleaning_started",
          "cleaning_done",
          "session_ended",
        ].includes(a.activityType || a.action)
      ),
    };

    // Format response
    return NextResponse.json({
      session: {
        id: tableSession.id,
        tableId: tableSession.tableId,
        tableNumber: tableSession.table.tableNumber,
        tableName: tableSession.table.name,
        guestCount: tableSession.guestCount,
        status: tableSession.status,
        startedAt: tableSession.startedAt.toISOString(),
        endedAt: tableSession.endedAt?.toISOString() || null,
        startedBy: tableSession.startedBy,
        waiter: tableSession.waiter,
        customer: tableSession.customer,
        notes: tableSession.notes,
      },
      orders: tableSession.orders.map((order: OrderWithItems) => ({
        id: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
        itemCount: order.items.length,
        totalQuantity: order.items.reduce((s: number, i: OrderItem) => s + i.quantity, 0),
        totalAmount: order.totalAmount,
        placedAt: order.placedAt.toISOString(),
        items: order.items.map((item: OrderItem) => ({
          id: item.id,
          name: item.menuItemName,
          quantity: item.quantity,
          status: item.status,
          totalPrice: item.totalPrice,
        })),
      })),
      bills: tableSession.bills.map((bill: BillWithPayments) => ({
        id: bill.id,
        billNumber: bill.billNumber,
        subtotal: bill.subtotal,
        discountAmount: bill.discountAmount,
        taxAmount: bill.taxAmount,
        serviceCharge: bill.serviceCharge,
        totalAmount: bill.totalAmount,
        paymentStatus: bill.paymentStatus,
        status: bill.status,
        payments: bill.payments.map((p: Payment) => ({
          id: p.id,
          amount: p.amount,
          method: p.method,
          status: p.status,
          paidAt: p.paidAt?.toISOString(),
        })),
      })),
      activities: activities.map((a: Activity) => ({
        id: a.id,
        activityType: a.activityType || a.action,
        activityCategory: a.activityCategory || "order",
        description: a.description || a.action,
        priority: a.priority || "info",
        performedBy: a.performedBy || "staff",
        userName: a.userName || a.user?.name,
        userRole: a.userRole || a.user?.role,
        tableId: a.tableId,
        orderId: a.orderId,
        orderItemId: a.orderItemId,
        details: a.details,
        createdAt: a.createdAt.toISOString(),
      })),
      phases,
      metrics: {
        duration: Math.floor(duration / 1000), // seconds
        durationFormatted: formatDuration(duration),
        totalOrders,
        totalItems,
        totalQuantity,
        totalBillAmount,
        totalPayments,
        totalDiscount,
        isPaid: totalPayments >= totalBillAmount,
        activityCount: activities.length,
        issueCount: phases.issues.length,
      },
    });
  } catch (error) {
    console.error("Error fetching session timeline:", error);
    return NextResponse.json(
      { error: "Failed to fetch session timeline" },
      { status: 500 }
    );
  }
}

function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  }
  return `${minutes}m ${seconds % 60}s`;
}
