import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// Roles that can close EOD (financial operation)
const ALLOWED_EOD_ROLES = ["SUPER_ADMIN", "OWNER", "MANAGER"];

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only managers and above can close EOD
    if (!ALLOWED_EOD_ROLES.includes(session.role)) {
      return NextResponse.json(
        { error: "You do not have permission to close EOD" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { date, actualCash, variance, notes } = body;

    const restaurantId = session.restaurantId;

    const targetDate = new Date(date);
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    // Check if day is already closed
    const existingEOD = await prisma.eODSettlement.findFirst({
      where: {
        restaurantId,
        date: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
    });

    if (existingEOD) {
      return NextResponse.json(
        { error: "Day is already closed" },
        { status: 400 }
      );
    }

    // Calculate summary data
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

    const bills = await prisma.bill.findMany({
      where: {
        restaurantId,
        generatedAt: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
    });

    type BillType = typeof bills[number];

    const totalSales = bills
      .filter((b: BillType) => b.status === "PAID")
      .reduce((sum: number, b: BillType) => sum + b.totalAmount, 0);

    const totalOrders = await prisma.order.count({
      where: {
        restaurantId,
        createdAt: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
    });

    const cashExpected = payments
      .filter((p: PaymentType) => p.method === "CASH")
      .reduce((sum: number, p: PaymentType) => sum + p.amount, 0);

    // Create EOD settlement record
    const eodSettlement = await prisma.eODSettlement.create({
      data: {
        restaurantId,
        date: targetDate,
        totalSales,
        totalOrders,
        totalBills: bills.length,
        cashExpected,
        actualCash,
        variance,
        notes: notes || null,
        closedById: session.userId,
        closedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      eodSettlement,
    });
  } catch (error) {
    console.error("Error closing day:", error);
    return NextResponse.json(
      { error: "Failed to close day" },
      { status: 500 }
    );
  }
}
