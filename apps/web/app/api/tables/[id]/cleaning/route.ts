import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { logActivity } from "@/lib/activity-log";

// POST start or complete cleaning (Phase 6: Cleanup)
export async function POST(
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
    const { action, keepMerged } = body;

    // Get table with latest session
    const table = await prisma.table.findFirst({
      where: {
        id,
        restaurantId: session.restaurantId,
      },
      include: {
        sessions: {
          where: {
            status: { in: ["ACTIVE", "COMPLETED"] },
            vacatedAt: { not: null },
            cleaningCompletedAt: null,
          },
          orderBy: { vacatedAt: "desc" },
          take: 1,
        },
      },
    });

    if (!table) {
      return NextResponse.json({ error: "Table not found" }, { status: 404 });
    }

    const now = new Date();
    let activityType = "";
    let description = "";

    switch (action) {
      case "start":
        // Cleaner starts cleaning
        if (table.status !== "CLEANING") {
          return NextResponse.json(
            { error: "Table is not in cleaning status" },
            { status: 400 }
          );
        }

        // Update session if exists
        if (table.sessions.length > 0 && table.sessions[0]) {
          await prisma.tableSession.update({
            where: { id: table.sessions[0].id },
            data: { cleaningStartedAt: now },
          });
        }

        activityType = "cleaning_started";
        description = `Cleaning started for Table ${table.tableNumber}`;
        break;

      case "complete":
        // Cleaner completes cleaning
        if (table.status !== "CLEANING") {
          return NextResponse.json(
            { error: "Table is not in cleaning status" },
            { status: 400 }
          );
        }

        // Generate new OTP for next guest (3-digit: 000-999)
        const newOtp = Math.floor(Math.random() * 1000).toString().padStart(3, "0");

        // Update table to AVAILABLE
        await prisma.table.update({
          where: { id },
          data: {
            status: "AVAILABLE",
            currentOtp: newOtp,
            otpGeneratedAt: now,
          },
        });

        // Update session if exists
        if (table.sessions.length > 0 && table.sessions[0]) {
          await prisma.tableSession.update({
            where: { id: table.sessions[0].id },
            data: {
              cleaningCompletedAt: now,
              tableReadyAt: now,
              endedAt: now,
              status: "COMPLETED",
            },
          });
        }

        activityType = "cleaning_completed";
        description = `Cleaning completed for Table ${table.tableNumber}. New OTP: ${newOtp}`;
        break;

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }

    // Get updated table
    const updatedTable = await prisma.table.findUnique({
      where: { id },
      include: {
        sessions: {
          where: { status: "COMPLETED" },
          orderBy: { endedAt: "desc" },
          take: 1,
          select: {
            id: true,
            cleaningStartedAt: true,
            cleaningCompletedAt: true,
            tableReadyAt: true,
          },
        },
      },
    });

    // Log activity
    await logActivity({
      restaurantId: session.restaurantId,
      userId: session.userId,
      activityType,
      entityType: "table",
      entityId: id,
      description,
      tableId: id,
      priority: action === "complete" ? "notice" : "info",
      details: {
        tableNumber: table.tableNumber,
        action,
        timestamp: now.toISOString(),
        newOtp: action === "complete" ? updatedTable?.currentOtp : undefined,
      },
    });

    // Calculate cleaning metrics
    let cleaningTime = null;
    if (action === "complete" && table.sessions.length > 0 && table.sessions[0]) {
      const sessionData = table.sessions[0];
      if (sessionData.cleaningStartedAt) {
        const diff =
          (now.getTime() - sessionData.cleaningStartedAt.getTime()) / 1000;
        cleaningTime = `${Math.floor(diff / 60)}m ${Math.floor(diff % 60)}s`;
      }
    }

    return NextResponse.json({
      success: true,
      action,
      timestamp: now.toISOString(),
      table: {
        id: updatedTable?.id,
        tableNumber: updatedTable?.tableNumber,
        status: updatedTable?.status,
        currentOtp: action === "complete" ? updatedTable?.currentOtp : undefined,
      },
      metrics: {
        cleaningTime,
      },
    });
  } catch (error) {
    console.error("Error updating cleaning status:", error);
    return NextResponse.json(
      { error: "Failed to update cleaning status" },
      { status: 500 }
    );
  }
}

// GET tables needing cleaning
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

    // If id is "all", get all tables needing cleaning
    if (id === "all") {
      const tablesNeedingCleaning = await prisma.table.findMany({
        where: {
          restaurantId: session.restaurantId,
          status: "CLEANING",
        },
        include: {
          sessions: {
            where: {
              vacatedAt: { not: null },
              cleaningCompletedAt: null,
            },
            orderBy: { vacatedAt: "desc" },
            take: 1,
            select: {
              id: true,
              guestCount: true,
              vacatedAt: true,
              cleaningNotifiedAt: true,
              cleaningStartedAt: true,
            },
          },
        },
        orderBy: [{ floor: "asc" }, { tableNumber: "asc" }],
      });

      // Calculate wait times
      const now = new Date();
      const tablesWithMetrics = tablesNeedingCleaning.map((table: typeof tablesNeedingCleaning[number]) => {
        const session = table.sessions[0];
        let waitTime = null;
        let cleaningInProgress = false;

        if (session?.vacatedAt) {
          const diff = (now.getTime() - session.vacatedAt.getTime()) / 1000;
          waitTime = `${Math.floor(diff / 60)}m ${Math.floor(diff % 60)}s`;
        }

        if (session?.cleaningStartedAt) {
          cleaningInProgress = true;
        }

        return {
          ...table,
          metrics: {
            waitTime,
            cleaningInProgress,
          },
        };
      });

      return NextResponse.json({
        tables: tablesWithMetrics,
        count: tablesNeedingCleaning.length,
      });
    }

    // Get specific table
    const table = await prisma.table.findFirst({
      where: {
        id,
        restaurantId: session.restaurantId,
      },
      include: {
        sessions: {
          where: {
            vacatedAt: { not: null },
          },
          orderBy: { vacatedAt: "desc" },
          take: 1,
          select: {
            id: true,
            guestCount: true,
            vacatedAt: true,
            cleaningNotifiedAt: true,
            cleaningStartedAt: true,
            cleaningCompletedAt: true,
            tableReadyAt: true,
          },
        },
      },
    });

    if (!table) {
      return NextResponse.json({ error: "Table not found" }, { status: 404 });
    }

    return NextResponse.json({
      table: {
        id: table.id,
        tableNumber: table.tableNumber,
        status: table.status,
        floor: table.floor,
        section: table.section,
      },
      session: table.sessions[0] || null,
      timestamps: table.sessions[0]
        ? {
            vacatedAt: table.sessions[0].vacatedAt,
            cleaningNotifiedAt: table.sessions[0].cleaningNotifiedAt,
            cleaningStartedAt: table.sessions[0].cleaningStartedAt,
            cleaningCompletedAt: table.sessions[0].cleaningCompletedAt,
            tableReadyAt: table.sessions[0].tableReadyAt,
          }
        : null,
    });
  } catch (error) {
    console.error("Error fetching cleaning status:", error);
    return NextResponse.json(
      { error: "Failed to fetch cleaning status" },
      { status: 500 }
    );
  }
}
