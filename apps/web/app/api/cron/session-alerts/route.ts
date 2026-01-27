import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  needsOtpHelp,
  needsOrderHelp,
  needsLongStayAlert,
  HELP_TIMER_THRESHOLDS,
  DURATION_THRESHOLDS,
} from "@/lib/session-duration";

/**
 * Cron job to check and create session alerts
 * Called by Vercel Cron every minute
 *
 * This checks all active sessions across all restaurants for:
 * 1. OTP help (2 min without OTP entry)
 * 2. Order help (5 min without order)
 * 3. Long stay alerts (90+ min)
 */
export async function GET(request: NextRequest) {
  try {
    // Verify this is a cron request (Vercel sends this header)
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    // In production, verify the cron secret
    if (process.env.NODE_ENV === "production" && cronSecret) {
      if (authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    const now = new Date();
    const results = {
      checked: 0,
      alertsCreated: 0,
      details: [] as string[],
    };

    // Get all active sessions across all restaurants
    const activeSessions = await prisma.tableSession.findMany({
      where: {
        status: "ACTIVE",
      },
      select: {
        id: true,
        restaurantId: true,
        tableId: true,
        qrScannedAt: true,
        otpVerified: true,
        otpHelpNotifiedAt: true,
        seatedAt: true,
        firstOrderAt: true,
        orderHelpNotifiedAt: true,
        longStayAlertAt: true,
        table: {
          select: { tableNumber: true },
        },
      },
    });

    results.checked = activeSessions.length;

    for (const session of activeSessions) {
      const restaurantId = session.restaurantId;

      // Check OTP help (2 min without OTP)
      if (needsOtpHelp(session.qrScannedAt, session.otpVerified, session.otpHelpNotifiedAt)) {
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
          results.alertsCreated++;
          results.details.push(`OTP help alert for Table ${session.table.tableNumber}`);
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
          results.alertsCreated++;
          results.details.push(`Order help alert for Table ${session.table.tableNumber}`);
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
          results.alertsCreated++;
          results.details.push(`Long stay ${longStayCheck.level} alert for Table ${session.table.tableNumber}`);
        }
      }
    }

    return NextResponse.json({
      success: true,
      timestamp: now.toISOString(),
      ...results,
    });
  } catch (error) {
    console.error("Cron session-alerts error:", error);
    return NextResponse.json(
      { error: "Failed to check session alerts" },
      { status: 500 }
    );
  }
}
