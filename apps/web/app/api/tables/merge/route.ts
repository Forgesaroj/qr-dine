import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { logActivity } from "@/lib/activity-log";

/**
 * POST /api/tables/merge
 * Merge multiple tables together (for larger parties)
 *
 * Body: { primaryTableId: string, tableIds: string[] }
 * - primaryTableId: The table that will be the primary (main) table
 * - tableIds: Array of table IDs to merge with the primary table
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only HOST, WAITER, MANAGER, OWNER can merge tables
    const allowedRoles = ["HOST", "WAITER", "MANAGER", "OWNER"];
    if (!allowedRoles.includes(session.role)) {
      return NextResponse.json(
        { error: "You don't have permission to merge tables" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { primaryTableId, tableIds } = body;

    if (!primaryTableId || !tableIds || !Array.isArray(tableIds) || tableIds.length === 0) {
      return NextResponse.json(
        { error: "Primary table ID and at least one table to merge are required" },
        { status: 400 }
      );
    }

    // Remove primary table from tableIds if included
    const secondaryTableIds = tableIds.filter((id: string) => id !== primaryTableId);

    if (secondaryTableIds.length === 0) {
      return NextResponse.json(
        { error: "At least one secondary table is required for merging" },
        { status: 400 }
      );
    }

    // Fetch all tables including primary
    const allTableIds = [primaryTableId, ...secondaryTableIds];
    const tables = await prisma.table.findMany({
      where: {
        id: { in: allTableIds },
        restaurantId: session.restaurantId,
      },
      select: {
        id: true,
        tableNumber: true,
        name: true,
        status: true,
        capacity: true,
        mergedWithId: true,
      },
    });

    if (tables.length !== allTableIds.length) {
      return NextResponse.json(
        { error: "One or more tables not found" },
        { status: 404 }
      );
    }

    const primaryTable = tables.find(t => t.id === primaryTableId);
    const secondaryTables = tables.filter(t => t.id !== primaryTableId);

    if (!primaryTable) {
      return NextResponse.json(
        { error: "Primary table not found" },
        { status: 404 }
      );
    }

    // Check if primary table is already merged with another table
    if (primaryTable.mergedWithId) {
      return NextResponse.json(
        { error: `Table ${primaryTable.tableNumber} is already merged with another table. Unmerge it first.` },
        { status: 400 }
      );
    }

    // Check if any secondary tables are already merged
    const alreadyMerged = secondaryTables.filter(t => t.mergedWithId);
    if (alreadyMerged.length > 0) {
      const tableNumbers = alreadyMerged.map(t => t.tableNumber).join(", ");
      return NextResponse.json(
        { error: `Table(s) ${tableNumbers} are already merged. Unmerge them first.` },
        { status: 400 }
      );
    }

    // Check table status - can't merge occupied tables with available tables (or other mismatched states)
    const statusCheck = tables.every(t =>
      t.status === "AVAILABLE" ||
      t.status === "RESERVED" ||
      (t.status === primaryTable.status)
    );

    if (!statusCheck) {
      return NextResponse.json(
        { error: "Cannot merge tables with different active states. All tables must be available, reserved, or have the same status." },
        { status: 400 }
      );
    }

    // Perform the merge
    const result = await prisma.$transaction(async (tx) => {
      // Update secondary tables to point to primary
      await tx.table.updateMany({
        where: { id: { in: secondaryTableIds } },
        data: { mergedWithId: primaryTableId },
      });

      // Return the updated primary table with merged tables
      return tx.table.findUnique({
        where: { id: primaryTableId },
        include: {
          mergedTables: {
            select: {
              id: true,
              tableNumber: true,
              name: true,
              capacity: true,
            },
          },
        },
      });
    });

    // Calculate total capacity
    const totalCapacity = primaryTable.capacity + secondaryTables.reduce((sum, t) => sum + t.capacity, 0);
    const mergedTableNumbers = secondaryTables.map(t => t.tableNumber).join(", ");

    // Log activity
    await logActivity({
      restaurantId: session.restaurantId,
      userId: session.userId,
      userName: session.email,
      userRole: session.role,
      activityType: "table.merged",
      entityType: "table",
      entityId: primaryTableId,
      priority: "info",
      description: `Merged tables ${mergedTableNumbers} with Table ${primaryTable.tableNumber}. Total capacity: ${totalCapacity}`,
      tableId: primaryTableId,
      details: {
        primaryTable: primaryTable.tableNumber,
        mergedTables: secondaryTables.map(t => t.tableNumber),
        totalCapacity,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Successfully merged ${secondaryTables.length} table(s) with Table ${primaryTable.tableNumber}`,
      table: result,
      totalCapacity,
    });
  } catch (error) {
    console.error("Error merging tables:", error);
    return NextResponse.json(
      { error: "Failed to merge tables" },
      { status: 500 }
    );
  }
}
