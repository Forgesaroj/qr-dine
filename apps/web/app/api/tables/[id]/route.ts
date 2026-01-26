import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// GET a single table by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const table = await prisma.table.findFirst({
      where: {
        id,
        restaurantId: session.restaurantId,
      },
    });

    if (!table) {
      return NextResponse.json({ error: "Table not found" }, { status: 404 });
    }

    return NextResponse.json({ table });
  } catch (error) {
    console.error("Error fetching table:", error);
    return NextResponse.json(
      { error: "Failed to fetch table" },
      { status: 500 }
    );
  }
}

// PATCH update a table
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { tableNumber, name, capacity, floor, section, status } = body;

    // Verify table belongs to restaurant
    const existingTable = await prisma.table.findFirst({
      where: {
        id,
        restaurantId: session.restaurantId,
      },
    });

    if (!existingTable) {
      return NextResponse.json({ error: "Table not found" }, { status: 404 });
    }

    // If changing table number, check for duplicates
    if (tableNumber && tableNumber !== existingTable.tableNumber) {
      const duplicate = await prisma.table.findUnique({
        where: {
          restaurantId_tableNumber: {
            restaurantId: session.restaurantId,
            tableNumber: tableNumber.toString(),
          },
        },
      });

      if (duplicate) {
        return NextResponse.json(
          { error: "Table number already exists" },
          { status: 400 }
        );
      }
    }

    const table = await prisma.table.update({
      where: { id },
      data: {
        ...(tableNumber && { tableNumber: tableNumber.toString() }),
        ...(name !== undefined && { name: name || null }),
        ...(capacity && { capacity: parseInt(capacity) }),
        ...(floor !== undefined && { floor: floor || null }),
        ...(section !== undefined && { section: section || null }),
        ...(status && { status }),
      },
    });

    return NextResponse.json({ table });
  } catch (error) {
    console.error("Error updating table:", error);
    return NextResponse.json(
      { error: "Failed to update table" },
      { status: 500 }
    );
  }
}

// DELETE a table
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Verify table belongs to restaurant
    const existingTable = await prisma.table.findFirst({
      where: {
        id,
        restaurantId: session.restaurantId,
      },
    });

    if (!existingTable) {
      return NextResponse.json({ error: "Table not found" }, { status: 404 });
    }

    await prisma.table.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting table:", error);
    return NextResponse.json(
      { error: "Failed to delete table" },
      { status: 500 }
    );
  }
}
