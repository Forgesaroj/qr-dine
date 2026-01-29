/**
 * Assistance Timer Service
 *
 * Manages timers and notifications for:
 * - OTP help (2 minutes without entering OTP)
 * - Order help (5 minutes without placing order)
 * - Long stay alerts (90+ minutes)
 *
 * Per SESSION_FLOW_SPEC.md - Section 2.1.1, 2.2.4, 5.1
 */

import { prisma } from "../prisma";
import { HELP_TIMER_THRESHOLDS, DURATION_THRESHOLDS, minutesSince } from "../session-duration";

export type AlertType =
  | "otp_help"
  | "order_help"
  | "long_stay_warning"
  | "long_stay_critical"
  | "bill_requested"
  | "needs_attention"
  | "cleaning_delay";

export interface AlertInput {
  sessionId: string;
  tableId: string;
  restaurantId: string;
  alertType: AlertType;
  triggerCondition: string;
  message: string;
  priority?: "low" | "normal" | "high" | "critical";
  targetRoles?: string[];
  assignedToId?: string;
}

/**
 * Create a session alert
 */
export async function createAlert(input: AlertInput): Promise<void> {
  await prisma.sessionAlert.create({
    data: {
      sessionId: input.sessionId,
      tableId: input.tableId,
      restaurantId: input.restaurantId,
      alertType: input.alertType,
      triggerCondition: input.triggerCondition,
      message: input.message,
      priority: input.priority || "normal",
      targetRoles: input.targetRoles || ["WAITER", "MANAGER"],
      status: "ACTIVE",
      triggeredAt: new Date(),
      acknowledgedById: input.assignedToId,
    },
  });
}

/**
 * Resolve an alert
 */
export async function resolveAlert(
  alertId: string,
  resolvedById?: string,
  resolutionNote?: string
): Promise<void> {
  await prisma.sessionAlert.update({
    where: { id: alertId },
    data: {
      status: "RESOLVED",
      resolvedAt: new Date(),
      resolvedById,
      resolutionNote,
    },
  });
}

/**
 * Acknowledge an alert (staff has seen it but not resolved yet)
 */
export async function acknowledgeAlert(
  alertId: string,
  acknowledgedById: string
): Promise<void> {
  await prisma.sessionAlert.update({
    where: { id: alertId },
    data: {
      status: "ACKNOWLEDGED",
      acknowledgedAt: new Date(),
      acknowledgedById,
    },
  });
}

/**
 * Get active alerts for a restaurant
 */
export async function getActiveAlerts(
  restaurantId: string,
  targetRole?: "WAITER" | "MANAGER" | "BOTH"
): Promise<
  Array<{
    id: string;
    alertType: AlertType;
    message: string | null;
    status: string;
    triggeredAt: Date;
    tableId: string;
    sessionId: string;
    priority: string;
  }>
> {
  const where: Record<string, unknown> = {
    restaurantId,
    status: { in: ["ACTIVE", "ACKNOWLEDGED"] },
  };

  if (targetRole && targetRole !== "BOTH") {
    where.targetRoles = { has: targetRole };
  }

  const alerts = await prisma.sessionAlert.findMany({
    where,
    orderBy: { triggeredAt: "desc" },
    select: {
      id: true,
      alertType: true,
      message: true,
      status: true,
      triggeredAt: true,
      tableId: true,
      sessionId: true,
      priority: true,
    },
  });

  return alerts.map((alert) => ({
    id: alert.id,
    alertType: alert.alertType as AlertType,
    message: alert.message,
    status: alert.status,
    triggeredAt: alert.triggeredAt,
    tableId: alert.tableId,
    sessionId: alert.sessionId,
    priority: alert.priority,
  }));
}

/**
 * Check sessions needing OTP help notification
 * (QR scanned > 2 minutes ago, OTP not verified)
 */
export async function checkOtpHelpNeeded(
  restaurantId: string,
  otpHelpTimerMinutes: number = HELP_TIMER_THRESHOLDS.OTP_HELP_MINUTES
): Promise<
  Array<{
    id: string;
    tableId: string;
    qrScannedAt: Date | null;
    table: {
      tableNumber: string;
      name: string | null;
    };
  }>
> {
  const cutoffTime = new Date(Date.now() - otpHelpTimerMinutes * 60 * 1000);

  return prisma.tableSession.findMany({
    where: {
      restaurantId,
      status: "ACTIVE",
      phase: "CREATED",
      otpVerified: false,
      qrScannedAt: { lte: cutoffTime },
      otpHelpNotifiedAt: null,
    },
    select: {
      id: true,
      tableId: true,
      qrScannedAt: true,
      table: {
        select: {
          tableNumber: true,
          name: true,
        },
      },
    },
  });
}

/**
 * Mark session as OTP help notified
 */
export async function markOtpHelpNotified(sessionId: string): Promise<void> {
  await prisma.tableSession.update({
    where: { id: sessionId },
    data: { otpHelpNotifiedAt: new Date() },
  });
}

/**
 * Check sessions needing order help notification
 * (Seated > 5 minutes, no order placed)
 */
export async function checkOrderHelpNeeded(
  restaurantId: string,
  orderHelpTimerMinutes: number = HELP_TIMER_THRESHOLDS.ORDER_HELP_MINUTES
): Promise<
  Array<{
    id: string;
    tableId: string;
    seatedAt: Date;
    table: {
      tableNumber: string;
      name: string | null;
    };
  }>
> {
  const cutoffTime = new Date(Date.now() - orderHelpTimerMinutes * 60 * 1000);

  return prisma.tableSession.findMany({
    where: {
      restaurantId,
      status: "ACTIVE",
      phase: "SEATED",
      otpVerified: true,
      firstOrderAt: null,
      seatedAt: { lte: cutoffTime },
      orderHelpNotifiedAt: null,
    },
    select: {
      id: true,
      tableId: true,
      seatedAt: true,
      table: {
        select: {
          tableNumber: true,
          name: true,
        },
      },
    },
  });
}

/**
 * Mark session as order help notified
 */
export async function markOrderHelpNotified(sessionId: string): Promise<void> {
  await prisma.tableSession.update({
    where: { id: sessionId },
    data: { orderHelpNotifiedAt: new Date() },
  });
}

/**
 * Check sessions needing long stay alert
 * (> 90 minutes)
 */
export async function checkLongStayAlertNeeded(
  restaurantId: string,
  longStayAlertMinutes: number = DURATION_THRESHOLDS.LONG_STAY_WARNING
): Promise<
  Array<{
    id: string;
    tableId: string;
    seatedAt: Date;
    guestCount: number | null;
    durationMinutes: number;
    alertLevel: "warning" | "critical";
    table: {
      tableNumber: string;
      name: string | null;
    };
  }>
> {
  const warningCutoff = new Date(Date.now() - longStayAlertMinutes * 60 * 1000);
  const criticalCutoff = new Date(
    Date.now() - DURATION_THRESHOLDS.LONG_STAY_CRITICAL * 60 * 1000
  );

  // Get sessions that need warning (> 90 min, no alert sent)
  // or need critical escalation (> 120 min, only warning sent)
  const sessions = await prisma.tableSession.findMany({
    where: {
      restaurantId,
      status: "ACTIVE",
      seatedAt: { lte: warningCutoff },
    },
    select: {
      id: true,
      tableId: true,
      seatedAt: true,
      guestCount: true,
      longStayAlertAt: true,
      table: {
        select: {
          tableNumber: true,
          name: true,
        },
      },
    },
  });

  return sessions
    .filter((s) => {
      if (!s.seatedAt) return false;
      const seatedDate = new Date(s.seatedAt);
      const durationMinutes = minutesSince(seatedDate);

      // Needs critical alert (> 120 min and either no alert or only warning)
      if (durationMinutes >= DURATION_THRESHOLDS.LONG_STAY_CRITICAL) {
        return true;
      }

      // Needs warning alert (> 90 min and no alert yet)
      if (durationMinutes >= longStayAlertMinutes && !s.longStayAlertAt) {
        return true;
      }

      return false;
    })
    .map((s) => {
      const durationMinutes = minutesSince(s.seatedAt!);
      return {
        id: s.id,
        tableId: s.tableId,
        seatedAt: s.seatedAt!,
        guestCount: s.guestCount,
        durationMinutes,
        alertLevel:
          durationMinutes >= DURATION_THRESHOLDS.LONG_STAY_CRITICAL
            ? "critical"
            : "warning",
        table: s.table,
      } as {
        id: string;
        tableId: string;
        seatedAt: Date;
        guestCount: number | null;
        durationMinutes: number;
        alertLevel: "warning" | "critical";
        table: {
          tableNumber: string;
          name: string | null;
        };
      };
    });
}

/**
 * Mark session as long stay alert sent
 */
export async function markLongStayAlertSent(
  sessionId: string,
  alertLevel: "warning" | "critical"
): Promise<void> {
  await prisma.tableSession.update({
    where: { id: sessionId },
    data: {
      longStayAlertAt: new Date(),
    },
  });
}

/**
 * Get restaurant settings for assistance timers
 */
export async function getRestaurantTimerSettings(restaurantId: string): Promise<{
  assistanceEnabled: boolean;
  otpHelpTimerMinutes: number;
  orderHelpTimerMinutes: number;
  longStayAlertEnabled: boolean;
  longStayAlertMinutes: number;
  longStayRepeatMinutes: number;
  longStayNotifyWaiter: boolean;
  longStayNotifyManager: boolean;
}> {
  const settings = await prisma.restaurantSettings.findUnique({
    where: { restaurantId },
    select: {
      assistanceEnabled: true,
      otpHelpTimerMinutes: true,
      orderHelpTimerMinutes: true,
      longStayAlertEnabled: true,
      longStayAlertMinutes: true,
      longStayRepeatMinutes: true,
      longStayNotifyWaiter: true,
      longStayNotifyManager: true,
    },
  });

  // Return defaults if no settings configured
  if (!settings) {
    return {
      assistanceEnabled: true,
      otpHelpTimerMinutes: HELP_TIMER_THRESHOLDS.OTP_HELP_MINUTES,
      orderHelpTimerMinutes: HELP_TIMER_THRESHOLDS.ORDER_HELP_MINUTES,
      longStayAlertEnabled: true,
      longStayAlertMinutes: DURATION_THRESHOLDS.LONG_STAY_WARNING,
      longStayRepeatMinutes: 30,
      longStayNotifyWaiter: true,
      longStayNotifyManager: true,
    };
  }

  return settings;
}
