import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// Roles that can view EOD reports (financial data)
const ALLOWED_EOD_ROLES = ["SUPER_ADMIN", "OWNER", "MANAGER", "CASHIER"];

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Waiters and other roles cannot view EOD reports
    if (!ALLOWED_EOD_ROLES.includes(session.role)) {
      return NextResponse.json(
        { error: "You do not have permission to view EOD reports" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const dateParam = searchParams.get("date");

    const targetDate = dateParam ? new Date(dateParam) : new Date();
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    const restaurantId = session.restaurantId;

    // Check if day is already closed
    const eodRecord = await prisma.eODSettlement.findFirst({
      where: {
        restaurantId,
        date: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
    });

    // Get all orders for the day
    const orders = await prisma.order.findMany({
      where: {
        restaurantId,
        createdAt: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      include: {
        items: {
          include: {
            menuItem: true,
          },
        },
      },
    });

    // Get all bills for the day
    const bills = await prisma.bill.findMany({
      where: {
        restaurantId,
        generatedAt: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      include: {
        payments: true,
      },
    });

    // Get all payments for the day
    const payments = await prisma.payment.findMany({
      where: {
        bill: {
          restaurantId,
        },
        processedAt: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
    });

    type PaymentType = typeof payments[number];
    type BillWithPayments = typeof bills[number];
    type PaymentBreakdown = { method: string; count: number; amount: number };

    // Calculate totals
    const totalSales = bills
      .filter((b: BillWithPayments) => b.status === "PAID")
      .reduce((sum: number, b: BillWithPayments) => sum + b.totalAmount, 0);

    const totalOrders = orders.length;
    const totalBills = bills.length;
    const paidBills = bills.filter((b: BillWithPayments) => b.status === "PAID").length;
    const unpaidBills = bills.filter((b: BillWithPayments) => b.status !== "PAID" && b.status !== "CANCELLED").length;

    const averageOrderValue = totalOrders > 0 ? totalSales / totalOrders : 0;

    // Payment breakdown
    const paymentBreakdown = payments.reduce((acc: PaymentBreakdown[], payment: PaymentType) => {
      const existing = acc.find((p: PaymentBreakdown) => p.method === payment.method);
      if (existing) {
        existing.count++;
        existing.amount += payment.amount;
      } else {
        acc.push({
          method: payment.method,
          count: 1,
          amount: payment.amount,
        });
      }
      return acc;
    }, [] as PaymentBreakdown[]);

    // Cash expected
    const cashExpected = payments
      .filter((p: PaymentType) => p.method === "CASH")
      .reduce((sum: number, p: PaymentType) => sum + p.amount, 0);

    // Discounts
    const discountsGiven = bills.reduce((sum: number, b: BillWithPayments) => sum + (b.discountAmount || 0), 0);

    // Tax collected
    const taxCollected = bills
      .filter((b: BillWithPayments) => b.status === "PAID")
      .reduce((sum: number, b: BillWithPayments) => sum + (b.taxAmount || 0), 0);

    // Service charges
    const serviceCharges = bills
      .filter((b: BillWithPayments) => b.status === "PAID")
      .reduce((sum: number, b: BillWithPayments) => sum + (b.serviceCharge || 0), 0);

    // Refunds
    const refunds = payments
      .filter((p: PaymentType) => p.status === "REFUNDED")
      .reduce((sum: number, p: PaymentType) => sum + p.amount, 0);

    type OrderWithItems = typeof orders[number];
    type OrderItem = OrderWithItems["items"][number];

    // Voided orders
    const voidedOrders = orders.filter((o: OrderWithItems) => o.status === "CANCELLED").length;

    // Top selling items
    const itemSales = new Map<string, { name: string; quantity: number; revenue: number }>();
    orders.forEach((order: OrderWithItems) => {
      order.items.forEach((item: OrderItem) => {
        const key = item.menuItemId;
        const existing = itemSales.get(key);
        if (existing) {
          existing.quantity += item.quantity;
          existing.revenue += item.totalPrice;
        } else {
          itemSales.set(key, {
            name: item.menuItemName || item.menuItem?.name || "Unknown",
            quantity: item.quantity,
            revenue: item.totalPrice,
          });
        }
      });
    });

    const topSellingItems = Array.from(itemSales.values())
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 10);

    // Hourly breakdown
    type HourlyData = { hour: string; orders: number; revenue: number };
    const hourlyBreakdown = Array.from({ length: 24 }, (_, i) => {
      const hour = i.toString().padStart(2, "0") + ":00";
      const hourOrders = orders.filter((o: OrderWithItems) => {
        const orderHour = new Date(o.createdAt).getHours();
        return orderHour === i;
      });
      const revenue = hourOrders.reduce((sum: number, o: OrderWithItems) => sum + o.totalAmount, 0);
      return {
        hour,
        orders: hourOrders.length,
        revenue,
      };
    }).filter((h: HourlyData) => h.orders > 0 || h.revenue > 0);

    const summary = {
      date: targetDate.toISOString().split("T")[0],
      totalSales,
      totalOrders,
      totalBills,
      paidBills,
      unpaidBills,
      averageOrderValue,
      paymentBreakdown,
      cashExpected,
      discountsGiven,
      taxCollected,
      serviceCharges,
      refunds,
      voidedOrders,
      topSellingItems,
      hourlyBreakdown,
    };

    return NextResponse.json({
      summary,
      dayClosed: !!eodRecord,
      eodRecord,
    });
  } catch (error) {
    console.error("Error fetching EOD summary:", error);
    return NextResponse.json(
      { error: "Failed to fetch EOD summary" },
      { status: 500 }
    );
  }
}
