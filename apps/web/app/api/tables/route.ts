import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// GET all tables for the restaurant
export async function GET() {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tables = await prisma.table.findMany({
      where: { restaurantId: session.restaurantId },
      orderBy: { tableNumber: "asc" },
    });

    return NextResponse.json({ tables });
  } catch (error) {
    console.error("Error fetching tables:", error);
    return NextResponse.json(
      { error: "Failed to fetch tables" },
      { status: 500 }
    );
  }
}

// POST create a new table
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { tableNumber, name, capacity, floor, section } = body;

    if (!tableNumber) {
      return NextResponse.json(
        { error: "Table number is required" },
        { status: 400 }
      );
    }

    // Check if table number already exists
    const existingTable = await prisma.table.findUnique({
      where: {
        restaurantId_tableNumber: {
          restaurantId: session.restaurantId,
          tableNumber: tableNumber.toString(),
        },
      },
    });

    if (existingTable) {
      return NextResponse.json(
        { error: "Table number already exists" },
        { status: 400 }
      );
    }

    // Generate QR code URL (the actual QR will be generated client-side)
    const qrCodeUrl = `${process.env.NEXT_PUBLIC_APP_URL}/order/${session.restaurantSlug}/${tableNumber}`;

    const table = await prisma.table.create({
      data: {
        restaurantId: session.restaurantId,
        tableNumber: tableNumber.toString(),
        name: name || null,
        capacity: capacity ? parseInt(capacity) : 4,
        floor: floor || null,
        section: section || null,
        qrCode: qrCodeUrl,
        status: "AVAILABLE",
      },
    });

    return NextResponse.json({ table }, { status: 201 });
  } catch (error) {
    console.error("Error creating table:", error);
    return NextResponse.json(
      { error: "Failed to create table" },
      { status: 500 }
    );
  }
}
