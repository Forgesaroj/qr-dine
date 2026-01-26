import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { logActivity } from "@/lib/activity-log";

// POST merge tables - combine orders from source tables into target table
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: targetTableId } = await params;
    const body = await request.json();
    const { sourceTableIds, keepSourceSessions = false } = body;

    if (!sourceTableIds || !Array.isArray(sourceTableIds) || sourceTableIds.length === 0) {
      return NextResponse.json(
        { error: "Source table IDs are required" },
        { status: 400 }
      );
    }

    // Verify target table exists and belongs to restaurant
    const targetTable = await prisma.table.findFirst({
      where: {
        id: targetTableId,
        restaurantId: session.restaurantId,
      },
      include: {
        sessions: {
          where: { status: "ACTIVE" },
          orderBy: { seatedAt: "desc" },
          take: 1,
        },
      },
    });

    if (!targetTable) {
      return NextResponse.json({ error: "Target table not found" }, { status: 404 });
    }

    // Verify all source tables exist and belong to restaurant
    const sourceTables = await prisma.table.findMany({
      where: {
        id: { in: sourceTableIds },
        restaurantId: session.restaurantId,
      },
      include: {
        sessions: {
          where: { status: "ACTIVE" },
          orderBy: { seatedAt: "desc" },
          take: 1,
          include: {
            orders: {
              where: { status: { notIn: ["CANCELLED"] } },
            },
          },
        },
      },
    });

    if (sourceTables.length !== sourceTableIds.length) {
      return NextResponse.json(
        { error: "One or more source tables not found" },
        { status: 404 }
      );
    }

    // Get or create target session
    let targetSession = targetTable.sessions[0];
    let totalGuestCount = targetSession?.guestCount || 0;

    if (!targetSession) {
      // Create new session for target table
      targetSession = await prisma.tableSession.create({
        data: {
          restaurantId: session.restaurantId,
          tableId: targetTableId,
          guestCount: 0,
          startedById: session.userId,
          startedByType: "STAFF",
          waiterNotifiedAt: new Date(),
        },
      });

      // Update table status to occupied
      await prisma.table.update({
        where: { id: targetTableId },
        data: { status: "OCCUPIED" },
      });
    }

    // Collect all orders to transfer and count guests
    const orderIdsToTransfer: string[] = [];
    const sourceSessionsToClose: string[] = [];
    const mergedTableNumbers: string[] = [];

    for (const sourceTable of sourceTables) {
      const sourceSession = sourceTable.sessions[0];
      if (sourceSession) {
        totalGuestCount += sourceSession.guestCount;

        // Collect orders
        for (const order of sourceSession.orders) {
          orderIdsToTransfer.push(order.id);
        }

        if (!keepSourceSessions) {
          sourceSessionsToClose.push(sourceSession.id);
        }
      }
      mergedTableNumbers.push(sourceTable.tableNumber);
    }

    // Transfer orders to target session
    if (orderIdsToTransfer.length > 0) {
      await prisma.order.updateMany({
        where: { id: { in: orderIdsToTransfer } },
        data: {
          tableId: targetTableId,
          sessionId: targetSession.id,
        },
      });
    }

    // Update target session guest count
    await prisma.tableSession.update({
      where: { id: targetSession.id },
      data: { guestCount: totalGuestCount },
    });

    // Close source sessions and mark tables as available
    if (!keepSourceSessions && sourceSessionsToClose.length > 0) {
      await prisma.tableSession.updateMany({
        where: { id: { in: sourceSessionsToClose } },
        data: {
          status: "COMPLETED",
          endedAt: new Date(),
          notes: `Merged into Table ${targetTable.tableNumber}`,
        },
      });

      await prisma.table.updateMany({
        where: { id: { in: sourceTableIds } },
        data: { status: "AVAILABLE" },
      });
    }

    // Log activity
    await logActivity({
      restaurantId: session.restaurantId,
      userId: session.userId,
      activityType: "tables_merged",
      entityType: "table",
      entityId: targetTableId,
      tableId: targetTableId,
      sessionId: targetSession.id,
      description: `Tables ${mergedTableNumbers.join(", ")} merged into Table ${targetTable.tableNumber}`,
      priority: "notice",
      details: {
        targetTableNumber: targetTable.tableNumber,
        sourceTables: mergedTableNumbers,
        ordersTransferred: orderIdsToTransfer.length,
        totalGuestCount,
      },
    });

    // Get updated target table with all data
    const updatedTable = await prisma.table.findUnique({
      where: { id: targetTableId },
      include: {
        sessions: {
          where: { status: "ACTIVE" },
          include: {
            orders: {
              where: { status: { notIn: ["CANCELLED"] } },
              include: {
                items: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: `Successfully merged ${sourceTables.length} table(s) into Table ${targetTable.tableNumber}`,
      targetTable: updatedTable,
      ordersTransferred: orderIdsToTransfer.length,
      totalGuestCount,
      mergedTables: mergedTableNumbers,
    });
  } catch (error) {
    console.error("Error merging tables:", error);
    return NextResponse.json(
      { error: "Failed to merge tables" },
      { status: 500 }
    );
  }
}
