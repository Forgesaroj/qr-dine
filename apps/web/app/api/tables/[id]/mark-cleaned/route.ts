import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { markTableCleaned } from "@/lib/services/cleaning.service";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/tables/:id/mark-cleaned
 * Mark a table as cleaned and ready for next guests
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id: tableId } = await params;

    // Verify table exists and user has access
    const table = await prisma.table.findUnique({
      where: { id: tableId },
      select: {
        id: true,
        restaurantId: true,
        status: true,
        tableNumber: true,
      },
    });

    if (!table) {
      return NextResponse.json(
        { error: "Table not found" },
        { status: 404 }
      );
    }

    // Verify user belongs to the restaurant
    if (table.restaurantId !== session.restaurantId) {
      return NextResponse.json(
        { error: "Unauthorized for this restaurant" },
        { status: 403 }
      );
    }

    // Check if table is in cleaning status
    if (table.status !== "CLEANING") {
      return NextResponse.json(
        { error: "Table is not in cleaning status" },
        { status: 400 }
      );
    }

    // Mark table as cleaned
    await markTableCleaned(tableId, session.userId);

    return NextResponse.json({
      success: true,
      tableId,
      tableNumber: table.tableNumber,
      newStatus: "AVAILABLE",
      message: `Table ${table.tableNumber} is now available for new guests`,
    });
  } catch (error) {
    console.error("Error marking table as cleaned:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to mark table as cleaned" },
      { status: 500 }
    );
  }
}
