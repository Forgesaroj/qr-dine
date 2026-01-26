import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET all reservations
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const restaurantId = searchParams.get("restaurantId") || session.restaurantId;
    const date = searchParams.get("date"); // YYYY-MM-DD format
    const status = searchParams.get("status");

    if (!restaurantId) {
      return NextResponse.json(
        { error: "Restaurant ID is required" },
        { status: 400 }
      );
    }

    // Build where clause
    const where: Record<string, unknown> = {
      restaurantId,
    };

    if (date) {
      // Filter by specific date
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);
      where.date = {
        gte: startOfDay,
        lte: endOfDay,
      };
    }

    if (status) {
      where.status = status;
    }

    const reservations = await prisma.reservation.findMany({
      where,
      orderBy: [{ date: "asc" }, { time: "asc" }],
      include: {
        table: { select: { id: true, tableNumber: true, name: true, capacity: true } },
        customer: { select: { id: true, name: true, phone: true, tier: true } },
        confirmedBy: { select: { id: true, name: true } },
        seatedBy: { select: { id: true, name: true } },
      },
    });

    // Group by status for easy display
    const grouped = {
      pending: reservations.filter((r) => r.status === "PENDING"),
      confirmed: reservations.filter((r) => r.status === "CONFIRMED"),
      seated: reservations.filter((r) => r.status === "SEATED"),
      completed: reservations.filter((r) => r.status === "COMPLETED"),
      cancelled: reservations.filter((r) => r.status === "CANCELLED"),
      noShow: reservations.filter((r) => r.status === "NO_SHOW"),
    };

    return NextResponse.json({
      reservations,
      grouped,
      summary: {
        total: reservations.length,
        pending: grouped.pending.length,
        confirmed: grouped.confirmed.length,
        seated: grouped.seated.length,
        upcoming: grouped.pending.length + grouped.confirmed.length,
      },
    });
  } catch (error) {
    console.error("Error fetching reservations:", error);
    return NextResponse.json(
      { error: "Failed to fetch reservations" },
      { status: 500 }
    );
  }
}

// POST create new reservation
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      customerName,
      customerPhone,
      customerEmail,
      date,
      time,
      partySize,
      tableId,
      preferredSection,
      notes,
      specialRequests,
      occasion,
    } = body;

    // Validation
    if (!customerName || !customerPhone || !date || !time || !partySize) {
      return NextResponse.json(
        { error: "Name, phone, date, time, and party size are required" },
        { status: 400 }
      );
    }

    const restaurantId = session.restaurantId;

    // Check if the table is available at this time (if tableId provided)
    if (tableId) {
      const existingReservation = await prisma.reservation.findFirst({
        where: {
          tableId,
          date: new Date(date),
          time,
          status: { in: ["PENDING", "CONFIRMED"] },
        },
      });

      if (existingReservation) {
        return NextResponse.json(
          { error: "This table is already reserved at this time" },
          { status: 400 }
        );
      }
    }

    // Check for existing customer
    let customerId: string | null = null;
    const existingCustomer = await prisma.customer.findFirst({
      where: {
        restaurantId,
        phone: customerPhone,
      },
    });

    if (existingCustomer) {
      customerId = existingCustomer.id;
    }

    // Create reservation
    const reservation = await prisma.reservation.create({
      data: {
        restaurantId,
        customerName,
        customerPhone,
        customerEmail: customerEmail || null,
        customerId,
        date: new Date(date),
        time,
        partySize: parseInt(partySize),
        tableId: tableId || null,
        preferredSection: preferredSection || null,
        notes: notes || null,
        specialRequests: specialRequests || null,
        occasion: occasion || null,
        status: "PENDING",
      },
      include: {
        table: { select: { id: true, tableNumber: true, name: true } },
        customer: { select: { id: true, name: true, tier: true } },
      },
    });

    return NextResponse.json({
      success: true,
      reservation,
      message: "Reservation created successfully",
    });
  } catch (error) {
    console.error("Error creating reservation:", error);
    return NextResponse.json(
      { error: "Failed to create reservation" },
      { status: 500 }
    );
  }
}
