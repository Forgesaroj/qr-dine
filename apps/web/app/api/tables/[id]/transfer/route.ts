import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { logActivity } from "@/lib/activity-log";

// POST transfer orders from this table to another table
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: sourceTableId } = await params;
    const body = await request.json();
    const { targetTableId, orderIds, transferAll = false, moveGuests = false } = body;

    if (!targetTableId) {
      return NextResponse.json(
        { error: "Target table ID is required" },
        { status: 400 }
      );
    }

    if (!transferAll && (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0)) {
      return NextResponse.json(
        { error: "Order IDs are required when not transferring all orders" },
        { status: 400 }
      );
    }

    // Verify source table exists and belongs to restaurant
    const sourceTable = await prisma.table.findFirst({
      where: {
        id: sourceTableId,
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

    if (!sourceTable) {
      return NextResponse.json({ error: "Source table not found" }, { status: 404 });
    }

    const sourceSession = sourceTable.sessions[0];
    if (!sourceSession) {
      return NextResponse.json(
        { error: "No active session found on source table" },
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

    // Get or create target session
    let targetSession = targetTable.sessions[0];

    if (!targetSession) {
      // Create new session for target table
      targetSession = await prisma.tableSession.create({
        data: {
          restaurantId: session.restaurantId,
          tableId: targetTableId,
          guestCount: moveGuests ? sourceSession.guestCount : 1,
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
    } else if (moveGuests) {
      // Add guests to existing target session
      await prisma.tableSession.update({
        where: { id: targetSession.id },
        data: {
          guestCount: targetSession.guestCount + sourceSession.guestCount,
        },
      });
    }

    // Determine which orders to transfer
    let ordersToTransfer: string[];

    if (transferAll) {
      ordersToTransfer = sourceSession.orders.map((o) => o.id);
    } else {
      // Verify all order IDs belong to source session
      const validOrderIds = sourceSession.orders.map((o) => o.id);
      const invalidOrders = orderIds.filter((id: string) => !validOrderIds.includes(id));

      if (invalidOrders.length > 0) {
        return NextResponse.json(
          { error: `Some orders do not belong to source table: ${invalidOrders.join(", ")}` },
          { status: 400 }
        );
      }

      ordersToTransfer = orderIds;
    }

    // Transfer orders
    if (ordersToTransfer.length > 0) {
      await prisma.order.updateMany({
        where: { id: { in: ordersToTransfer } },
        data: {
          tableId: targetTableId,
          sessionId: targetSession.id,
        },
      });
    }

    // Check if source session still has orders
    const remainingOrders = await prisma.order.count({
      where: {
        sessionId: sourceSession.id,
        status: { notIn: ["CANCELLED"] },
      },
    });

    // If all orders transferred, close source session and make table available
    if (remainingOrders === 0 && transferAll) {
      await prisma.tableSession.update({
        where: { id: sourceSession.id },
        data: {
          status: "COMPLETED",
          endedAt: new Date(),
          guestCount: moveGuests ? 0 : sourceSession.guestCount,
          notes: `Orders transferred to Table ${targetTable.tableNumber}`,
        },
      });

      await prisma.table.update({
        where: { id: sourceTableId },
        data: { status: "AVAILABLE" },
      });
    } else if (moveGuests) {
      // Update guest count on source if guests moved
      await prisma.tableSession.update({
        where: { id: sourceSession.id },
        data: { guestCount: 0 },
      });
    }

    // Log activity
    await logActivity({
      restaurantId: session.restaurantId,
      userId: session.userId,
      activityType: "orders_transferred",
      entityType: "order",
      entityId: ordersToTransfer[0] || sourceTableId,
      tableId: targetTableId,
      sessionId: targetSession.id,
      description: `${ordersToTransfer.length} order(s) transferred from Table ${sourceTable.tableNumber} to Table ${targetTable.tableNumber}`,
      priority: "notice",
      details: {
        sourceTableNumber: sourceTable.tableNumber,
        targetTableNumber: targetTable.tableNumber,
        ordersTransferred: ordersToTransfer.length,
        transferAll,
        moveGuests,
      },
    });

    // Get updated target table
    const updatedTargetTable = await prisma.table.findUnique({
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
      message: `Successfully transferred ${ordersToTransfer.length} order(s) to Table ${targetTable.tableNumber}`,
      targetTable: updatedTargetTable,
      ordersTransferred: ordersToTransfer.length,
      sourceTableCleared: remainingOrders === 0 && transferAll,
    });
  } catch (error) {
    console.error("Error transferring orders:", error);
    return NextResponse.json(
      { error: "Failed to transfer orders" },
      { status: 500 }
    );
  }
}

// GET available tables for transfer (excludes current table)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: currentTableId } = await params;

    // Get all tables except current one
    const tables = await prisma.table.findMany({
      where: {
        restaurantId: session.restaurantId,
        id: { not: currentTableId },
        status: { in: ["AVAILABLE", "OCCUPIED"] }, // Can transfer to available or occupied tables
      },
      select: {
        id: true,
        tableNumber: true,
        name: true,
        capacity: true,
        floor: true,
        section: true,
        status: true,
        sessions: {
          where: { status: "ACTIVE" },
          select: {
            id: true,
            guestCount: true,
            orders: {
              where: { status: { notIn: ["CANCELLED"] } },
              select: { id: true },
            },
          },
        },
      },
      orderBy: [{ floor: "asc" }, { tableNumber: "asc" }],
    });

    // Format response
    const availableTables = tables.map((table) => ({
      id: table.id,
      tableNumber: table.tableNumber,
      name: table.name,
      capacity: table.capacity,
      floor: table.floor,
      section: table.section,
      status: table.status,
      hasActiveSession: table.sessions.length > 0,
      guestCount: table.sessions[0]?.guestCount || 0,
      orderCount: table.sessions[0]?.orders.length || 0,
    }));

    return NextResponse.json({ tables: availableTables });
  } catch (error) {
    console.error("Error fetching available tables:", error);
    return NextResponse.json(
      { error: "Failed to fetch available tables" },
      { status: 500 }
    );
  }
}
