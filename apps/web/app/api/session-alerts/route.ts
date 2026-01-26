import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  needsOtpHelp,
  needsOrderHelp,
  needsLongStayAlert,
  HELP_TIMER_THRESHOLDS,
  DURATION_THRESHOLDS,
} from "@/lib/session-duration";

/**
 * GET /api/session-alerts
 * Get active alerts for the restaurant
 * Optionally trigger alert checks for active sessions
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const checkAndCreate = searchParams.get("checkAndCreate") === "true";
    const includeResolved = searchParams.get("includeResolved") === "true";

    // Get active alerts
    const whereClause: any = {
      restaurantId: session.restaurantId,
    };

    if (!includeResolved) {
      whereClause.status = { in: ["ACTIVE", "ACKNOWLEDGED"] };
    }

    const alerts = await prisma.sessionAlert.findMany({
      where: whereClause,
      orderBy: [
        { priority: "desc" },
        { triggeredAt: "desc" },
      ],
      take: 100,
    });

    // If checkAndCreate is true, check all active sessions for new alerts
    if (checkAndCreate) {
      await checkAndCreateAlerts(session.restaurantId);
    }

    // Get table and session info for each alert
    const alertsWithInfo = await Promise.all(
      alerts.map(async (alert) => {
        const tableSession = await prisma.tableSession.findUnique({
          where: { id: alert.sessionId },
          select: {
            id: true,
            guestCount: true,
            seatedAt: true,
            table: {
              select: {
                tableNumber: true,
                name: true,
              },
            },
          },
        });

        return {
          ...alert,
          table: tableSession?.table,
          session: tableSession,
        };
      })
    );

    return NextResponse.json({
      alerts: alertsWithInfo,
      counts: {
        total: alerts.length,
        active: alerts.filter((a) => a.status === "ACTIVE").length,
        acknowledged: alerts.filter((a) => a.status === "ACKNOWLEDGED").length,
        critical: alerts.filter((a) => a.priority === "critical").length,
      },
    });
  } catch (error) {
    console.error("Error fetching session alerts:", error);
    return NextResponse.json(
      { error: "Failed to fetch alerts" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/session-alerts
 * Create a new alert manually or acknowledge/resolve an alert
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { action, alertId, sessionId, alertType, message, priority } = body;

    // Handle acknowledge/resolve actions
    if (action === "acknowledge" && alertId) {
      const alert = await prisma.sessionAlert.update({
        where: { id: alertId },
        data: {
          status: "ACKNOWLEDGED",
          acknowledgedAt: new Date(),
          acknowledgedById: session.userId,
        },
      });
      return NextResponse.json({ success: true, alert });
    }

    if (action === "resolve" && alertId) {
      const alert = await prisma.sessionAlert.update({
        where: { id: alertId },
        data: {
          status: "RESOLVED",
          resolvedAt: new Date(),
          resolvedById: session.userId,
          resolutionNote: body.resolutionNote,
        },
      });
      return NextResponse.json({ success: true, alert });
    }

    if (action === "dismiss" && alertId) {
      const alert = await prisma.sessionAlert.update({
        where: { id: alertId },
        data: {
          status: "DISMISSED",
          resolvedAt: new Date(),
          resolvedById: session.userId,
        },
      });
      return NextResponse.json({ success: true, alert });
    }

    // Create a new alert manually
    if (sessionId && alertType) {
      const tableSession = await prisma.tableSession.findUnique({
        where: { id: sessionId },
        select: { tableId: true, restaurantId: true },
      });

      if (!tableSession) {
        return NextResponse.json({ error: "Session not found" }, { status: 404 });
      }

      const alert = await prisma.sessionAlert.create({
        data: {
          restaurantId: tableSession.restaurantId,
          sessionId,
          tableId: tableSession.tableId,
          alertType,
          triggerCondition: "manual",
          message: message || `Manual ${alertType} alert`,
          priority: priority || "normal",
          status: "ACTIVE",
        },
      });

      return NextResponse.json({ success: true, alert });
    }

    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  } catch (error) {
    console.error("Error handling session alert:", error);
    return NextResponse.json(
      { error: "Failed to handle alert" },
      { status: 500 }
    );
  }
}

/**
 * Check all active sessions and create alerts as needed
 */
async function checkAndCreateAlerts(restaurantId: string) {
  const now = new Date();

  // Get all active sessions
  const activeSessions = await prisma.tableSession.findMany({
    where: {
      restaurantId,
      status: "ACTIVE",
    },
    select: {
      id: true,
      tableId: true,
      qrScannedAt: true,
      otpVerified: true,
      otpHelpNotifiedAt: true,
      seatedAt: true,
      firstOrderAt: true,
      orderHelpNotifiedAt: true,
      longStayAlertAt: true,
    },
  });

  for (const session of activeSessions) {
    // Check OTP help (2 min without OTP)
    if (needsOtpHelp(session.qrScannedAt, session.otpVerified, session.otpHelpNotifiedAt)) {
      // Check if alert already exists
      const existingAlert = await prisma.sessionAlert.findFirst({
        where: {
          sessionId: session.id,
          alertType: "otp_help",
          status: { in: ["ACTIVE", "ACKNOWLEDGED"] },
        },
      });

      if (!existingAlert) {
        await prisma.$transaction([
          prisma.sessionAlert.create({
            data: {
              restaurantId,
              sessionId: session.id,
              tableId: session.tableId,
              alertType: "otp_help",
              triggerCondition: `${HELP_TIMER_THRESHOLDS.OTP_HELP_MINUTES}_min_no_otp`,
              message: "Guest may need help with OTP entry",
              priority: "high",
              status: "ACTIVE",
              targetRoles: ["WAITER", "HOST", "MANAGER"],
            },
          }),
          prisma.tableSession.update({
            where: { id: session.id },
            data: { otpHelpNotifiedAt: now },
          }),
        ]);
      }
    }

    // Check order help (5 min without order)
    if (needsOrderHelp(session.seatedAt, session.firstOrderAt, session.orderHelpNotifiedAt)) {
      const existingAlert = await prisma.sessionAlert.findFirst({
        where: {
          sessionId: session.id,
          alertType: "order_help",
          status: { in: ["ACTIVE", "ACKNOWLEDGED"] },
        },
      });

      if (!existingAlert) {
        await prisma.$transaction([
          prisma.sessionAlert.create({
            data: {
              restaurantId,
              sessionId: session.id,
              tableId: session.tableId,
              alertType: "order_help",
              triggerCondition: `${HELP_TIMER_THRESHOLDS.ORDER_HELP_MINUTES}_min_no_order`,
              message: "Guest may need help ordering",
              priority: "normal",
              status: "ACTIVE",
              targetRoles: ["WAITER", "MANAGER"],
            },
          }),
          prisma.tableSession.update({
            where: { id: session.id },
            data: { orderHelpNotifiedAt: now },
          }),
        ]);
      }
    }

    // Check long-stay alert (90+ min)
    const longStayCheck = needsLongStayAlert(session.seatedAt, session.longStayAlertAt);
    if (longStayCheck.needsAlert) {
      const alertType = longStayCheck.level === "critical" ? "long_stay_critical" : "long_stay_warning";
      const existingAlert = await prisma.sessionAlert.findFirst({
        where: {
          sessionId: session.id,
          alertType,
          status: { in: ["ACTIVE", "ACKNOWLEDGED"] },
        },
      });

      if (!existingAlert) {
        const threshold =
          longStayCheck.level === "critical"
            ? DURATION_THRESHOLDS.LONG_STAY_CRITICAL
            : DURATION_THRESHOLDS.LONG_STAY_WARNING;

        await prisma.$transaction([
          prisma.sessionAlert.create({
            data: {
              restaurantId,
              sessionId: session.id,
              tableId: session.tableId,
              alertType,
              triggerCondition: `${threshold}_min_stay`,
              message:
                longStayCheck.level === "critical"
                  ? "Guest has been seated for over 2 hours"
                  : "Guest has been seated for over 90 minutes",
              priority: longStayCheck.level,
              status: "ACTIVE",
              targetRoles: ["MANAGER", "WAITER"],
            },
          }),
          prisma.tableSession.update({
            where: { id: session.id },
            data: { longStayAlertAt: now },
          }),
        ]);
      }
    }
  }
}
