import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { logActivity } from "@/lib/activity-log";
import { minutesSince } from "@/lib/session-duration";

// PATCH update session timestamps (Phase 1 & 6)
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
    const { action } = body;

    // Get current session
    const tableSession = await prisma.tableSession.findFirst({
      where: {
        id,
        restaurantId: session.restaurantId,
      },
      include: {
        table: true,
      },
    });

    if (!tableSession) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    const now = new Date();
    let updateData: Record<string, Date | string | number | null> = {};
    let activityType = "";
    let description = "";

    switch (action) {
      // Phase 1: Seating timestamps
      case "waiter_acknowledged":
        updateData = { waiterAcknowledgedAt: now };
        activityType = "waiter_acknowledged";
        description = `Waiter acknowledged Table ${tableSession.table.tableNumber} notification`;
        break;

      case "water_served":
        updateData = { waterServedAt: now };
        activityType = "water_served";
        description = `Water served at Table ${tableSession.table.tableNumber}`;
        break;

      // Phase 3: Serving timestamps
      case "first_food_served":
        updateData = {
          firstFoodServedAt: now,
          lastFoodServedAt: now,
          phase: "DINING",
        };
        activityType = "first_food_served";
        description = `First food served at Table ${tableSession.table.tableNumber}`;
        break;

      case "food_served":
        updateData = { lastFoodServedAt: now };
        // Only update phase if not already DINING or later
        if (
          !tableSession.firstFoodServedAt ||
          tableSession.phase === "ORDERING" ||
          tableSession.phase === "SEATED"
        ) {
          updateData.firstFoodServedAt = tableSession.firstFoodServedAt || now;
          updateData.phase = "DINING";
        }
        activityType = "food_served";
        description = `Food served at Table ${tableSession.table.tableNumber}`;
        break;

      // Phase 5: Billing timestamps
      case "bill_requested":
        updateData = { billRequestedAt: now, phase: "BILL_REQUESTED" };
        activityType = "bill_requested";
        description = `Bill requested for Table ${tableSession.table.tableNumber}`;
        break;

      case "bill_printed":
        updateData = { billPrintedAt: now };
        activityType = "bill_printed";
        description = `Bill printed for Table ${tableSession.table.tableNumber}`;
        break;

      case "bill_delivered":
        updateData = { billDeliveredAt: now };
        activityType = "bill_delivered";
        description = `Bill delivered to Table ${tableSession.table.tableNumber}`;
        break;

      case "payment_completed":
        updateData = {
          paymentCompletedAt: now,
          vacatedAt: now,
          cleaningNotifiedAt: now,
          phase: "COMPLETED",
        };
        activityType = "payment_completed";
        description = `Payment completed for Table ${tableSession.table.tableNumber}`;

        // Also update table status to CLEANING
        await prisma.table.update({
          where: { id: tableSession.tableId },
          data: { status: "CLEANING" },
        });

        // Resolve any active alerts for this session
        await prisma.sessionAlert.updateMany({
          where: {
            sessionId: id,
            status: { in: ["ACTIVE", "ACKNOWLEDGED"] },
          },
          data: {
            status: "RESOLVED",
            resolvedAt: now,
            resolutionNote: "Session completed",
          },
        });
        break;

      // Phase 6: Cleanup timestamps
      case "cleaning_started":
        updateData = { cleaningStartedAt: now };
        activityType = "cleaning_started";
        description = `Cleaning started for Table ${tableSession.table.tableNumber}`;
        break;

      case "cleaning_completed":
        // Calculate total duration
        const totalDuration = tableSession.seatedAt
          ? minutesSince(tableSession.seatedAt)
          : null;

        updateData = {
          cleaningCompletedAt: now,
          tableReadyAt: now,
          endedAt: now,
          status: "COMPLETED",
          totalDurationMinutes: totalDuration,
        };
        activityType = "cleaning_completed";
        description = `Cleaning completed for Table ${tableSession.table.tableNumber}`;

        // Generate new OTP (3-digit: 000-999)
        const newOtp = Math.floor(Math.random() * 1000).toString().padStart(3, "0");

        // Update table status to AVAILABLE
        await prisma.table.update({
          where: { id: tableSession.tableId },
          data: {
            status: "AVAILABLE",
            currentOtp: newOtp,
            otpGeneratedAt: now,
          },
        });

        // Record OTP in history
        await prisma.otpHistory.create({
          data: {
            tableId: tableSession.tableId,
            restaurantId: session.restaurantId,
            otpCode: newOtp,
            generatedAt: now,
            regeneratedReason: "cleaning_complete",
          },
        });
        break;

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }

    // Update session
    const updatedSession = await prisma.tableSession.update({
      where: { id },
      data: updateData,
      include: {
        table: true,
        waiter: {
          select: { id: true, name: true },
        },
      },
    });

    // Log activity
    await logActivity({
      restaurantId: session.restaurantId,
      userId: session.userId,
      activityType,
      entityType: "session",
      entityId: id,
      sessionId: id,
      tableId: tableSession.tableId,
      priority: "info",
      description,
      details: {
        tableNumber: tableSession.table.tableNumber,
        action,
        timestamp: now.toISOString(),
      },
    });

    return NextResponse.json({
      success: true,
      action,
      timestamp: now.toISOString(),
      session: updatedSession,
    });
  } catch (error) {
    console.error("Error updating session timestamp:", error);
    return NextResponse.json(
      { error: "Failed to update session timestamp" },
      { status: 500 }
    );
  }
}

// GET session timestamps
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

    const tableSession = await prisma.tableSession.findFirst({
      where: {
        id,
        restaurantId: session.restaurantId,
      },
      include: {
        table: {
          select: { tableNumber: true, name: true },
        },
        waiter: {
          select: { id: true, name: true },
        },
      },
    });

    if (!tableSession) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    // Calculate metrics
    const metrics: Record<string, string | null> = {};

    if (tableSession.waterServedAt && tableSession.seatedAt) {
      const waterServiceTime =
        (tableSession.waterServedAt.getTime() -
          tableSession.seatedAt.getTime()) /
        1000;
      metrics.waterServiceTime = `${Math.floor(waterServiceTime / 60)}m ${Math.floor(waterServiceTime % 60)}s`;
    }

    if (tableSession.waiterAcknowledgedAt && tableSession.waiterNotifiedAt) {
      const responseTime =
        (tableSession.waiterAcknowledgedAt.getTime() -
          tableSession.waiterNotifiedAt.getTime()) /
        1000;
      metrics.waiterResponseTime = `${Math.floor(responseTime / 60)}m ${Math.floor(responseTime % 60)}s`;
    }

    if (tableSession.cleaningCompletedAt && tableSession.vacatedAt) {
      const cleaningTime =
        (tableSession.cleaningCompletedAt.getTime() -
          tableSession.vacatedAt.getTime()) /
        1000;
      metrics.cleaningTime = `${Math.floor(cleaningTime / 60)}m ${Math.floor(cleaningTime % 60)}s`;
    }

    if (tableSession.paymentCompletedAt && tableSession.seatedAt) {
      const totalDiningTime =
        (tableSession.paymentCompletedAt.getTime() -
          tableSession.seatedAt.getTime()) /
        1000;
      metrics.totalDiningTime = `${Math.floor(totalDiningTime / 3600)}h ${Math.floor((totalDiningTime % 3600) / 60)}m`;
    }

    return NextResponse.json({
      session: {
        id: tableSession.id,
        table: tableSession.table,
        waiter: tableSession.waiter,
        guestCount: tableSession.guestCount,
        status: tableSession.status,
        phase: (tableSession as any).phase || "SEATED",
      },
      timestamps: {
        // Phase 1: Seating
        seatedAt: tableSession.seatedAt,
        waiterNotifiedAt: tableSession.waiterNotifiedAt,
        waiterAcknowledgedAt: tableSession.waiterAcknowledgedAt,
        waterServedAt: tableSession.waterServedAt,

        // Phase 2: Ordering
        firstOrderAt: tableSession.firstOrderAt,
        lastOrderAt: tableSession.lastOrderAt,

        // Phase 3: Serving
        firstFoodServedAt: tableSession.firstFoodServedAt,
        lastFoodServedAt: tableSession.lastFoodServedAt,

        // Phase 5: Billing
        billRequestedAt: tableSession.billRequestedAt,
        billPrintedAt: tableSession.billPrintedAt,
        billDeliveredAt: tableSession.billDeliveredAt,
        paymentCompletedAt: tableSession.paymentCompletedAt,

        // Phase 6: Cleanup
        vacatedAt: tableSession.vacatedAt,
        cleaningNotifiedAt: tableSession.cleaningNotifiedAt,
        cleaningStartedAt: tableSession.cleaningStartedAt,
        cleaningCompletedAt: tableSession.cleaningCompletedAt,
        tableReadyAt: tableSession.tableReadyAt,
      },
      metrics,
    });
  } catch (error) {
    console.error("Error fetching session timestamps:", error);
    return NextResponse.json(
      { error: "Failed to fetch session timestamps" },
      { status: 500 }
    );
  }
}
