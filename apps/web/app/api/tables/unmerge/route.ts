import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { logActivity } from "@/lib/activity-log";

/**
 * POST /api/tables/unmerge
 * Unmerge tables - separate merged tables back to individual tables
 *
 * Body: { tableId: string }
 * - tableId: Either the primary table ID (unmerges all) or a specific secondary table ID
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only HOST, WAITER, MANAGER, OWNER can unmerge tables
    const allowedRoles = ["HOST", "WAITER", "MANAGER", "OWNER"];
    if (!allowedRoles.includes(session.role)) {
      return NextResponse.json(
        { error: "You don't have permission to unmerge tables" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { tableId, unmergeAll = true } = body;

    if (!tableId) {
      return NextResponse.json(
        { error: "Table ID is required" },
        { status: 400 }
      );
    }

    // Find the table
    const table = await prisma.table.findFirst({
      where: {
        id: tableId,
        restaurantId: session.restaurantId,
      },
      include: {
        mergedTables: {
          select: {
            id: true,
            tableNumber: true,
            name: true,
          },
        },
        mergedWith: {
          select: {
            id: true,
            tableNumber: true,
            name: true,
          },
        },
      },
    });

    if (!table) {
      return NextResponse.json(
        { error: "Table not found" },
        { status: 404 }
      );
    }

    // Determine if this is a primary or secondary table
    const isPrimary = table.mergedTables.length > 0;
    const isSecondary = !!table.mergedWithId;

    if (!isPrimary && !isSecondary) {
      return NextResponse.json(
        { error: "This table is not part of a merge group" },
        { status: 400 }
      );
    }

    let unmergedTables: { id: string; tableNumber: string }[] = [];
    let primaryTableNumber: string;

    if (isPrimary) {
      // This is the primary table - unmerge all secondary tables
      primaryTableNumber = table.tableNumber;
      unmergedTables = table.mergedTables;

      await prisma.table.updateMany({
        where: { mergedWithId: tableId },
        data: { mergedWithId: null },
      });
    } else if (isSecondary && unmergeAll) {
      // This is a secondary table but unmergeAll is true - unmerge all from the primary
      const primaryId = table.mergedWithId!;
      const primaryTable = await prisma.table.findUnique({
        where: { id: primaryId },
        include: {
          mergedTables: {
            select: {
              id: true,
              tableNumber: true,
            },
          },
        },
      });

      if (primaryTable) {
        primaryTableNumber = primaryTable.tableNumber;
        unmergedTables = primaryTable.mergedTables;

        await prisma.table.updateMany({
          where: { mergedWithId: primaryId },
          data: { mergedWithId: null },
        });
      } else {
        primaryTableNumber = "Unknown";
      }
    } else {
      // Just unmerge this specific secondary table
      primaryTableNumber = table.mergedWith?.tableNumber || "Unknown";
      unmergedTables = [{ id: table.id, tableNumber: table.tableNumber }];

      await prisma.table.update({
        where: { id: tableId },
        data: { mergedWithId: null },
      });
    }

    const unmergedTableNumbers = unmergedTables.map(t => t.tableNumber).join(", ");

    // Log activity
    await logActivity({
      restaurantId: session.restaurantId,
      userId: session.userId,
      userName: session.email,
      userRole: session.role,
      activityType: "table.unmerged",
      entityType: "table",
      entityId: tableId,
      priority: "info",
      description: `Unmerged table(s) ${unmergedTableNumbers} from Table ${primaryTableNumber}`,
      tableId: tableId,
      details: {
        primaryTable: primaryTableNumber,
        unmergedTables: unmergedTables.map(t => t.tableNumber),
      },
    });

    return NextResponse.json({
      success: true,
      message: `Successfully unmerged ${unmergedTables.length} table(s) from Table ${primaryTableNumber}`,
      unmergedTables,
    });
  } catch (error) {
    console.error("Error unmerging tables:", error);
    return NextResponse.json(
      { error: "Failed to unmerge tables" },
      { status: 500 }
    );
  }
}
