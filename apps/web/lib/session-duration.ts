/**
 * Session Duration Utilities (Per SESSION_FLOW_SPEC.md)
 *
 * Duration Color Coding:
 * - Green: < 30 minutes (normal)
 * - Yellow: 30-60 minutes (moderate)
 * - Orange: 60-90 minutes (long)
 * - Red: > 90 minutes (very long, alert triggered)
 */

export type DurationColor = "green" | "yellow" | "orange" | "red";

export interface DurationInfo {
  minutes: number;
  color: DurationColor;
  colorHex: string;
  colorBg: string;
  colorText: string;
  label: string;
  isAlert: boolean;
  alertLevel: "none" | "warning" | "critical";
}

// Duration thresholds in minutes
export const DURATION_THRESHOLDS = {
  GREEN_MAX: 30,      // < 30 min = green
  YELLOW_MAX: 60,     // 30-60 min = yellow
  ORANGE_MAX: 90,     // 60-90 min = orange
  LONG_STAY_WARNING: 90,  // Warning at 90 min
  LONG_STAY_CRITICAL: 120, // Critical at 120 min
} as const;

// Timer thresholds for auto-help
export const HELP_TIMER_THRESHOLDS = {
  OTP_HELP_MINUTES: 2,      // Send "Need help?" after 2 min without OTP
  ORDER_HELP_MINUTES: 5,    // Send "Need help ordering?" after 5 min without order
} as const;

/**
 * Get duration color and info based on minutes
 */
export function getDurationInfo(minutes: number): DurationInfo {
  if (minutes < DURATION_THRESHOLDS.GREEN_MAX) {
    return {
      minutes,
      color: "green",
      colorHex: "#22c55e",
      colorBg: "bg-green-100",
      colorText: "text-green-700",
      label: "Normal",
      isAlert: false,
      alertLevel: "none",
    };
  }

  if (minutes < DURATION_THRESHOLDS.YELLOW_MAX) {
    return {
      minutes,
      color: "yellow",
      colorHex: "#eab308",
      colorBg: "bg-yellow-100",
      colorText: "text-yellow-700",
      label: "Moderate",
      isAlert: false,
      alertLevel: "none",
    };
  }

  if (minutes < DURATION_THRESHOLDS.ORANGE_MAX) {
    return {
      minutes,
      color: "orange",
      colorHex: "#f97316",
      colorBg: "bg-orange-100",
      colorText: "text-orange-700",
      label: "Long",
      isAlert: false,
      alertLevel: "none",
    };
  }

  // > 90 minutes = red with alert
  return {
    minutes,
    color: "red",
    colorHex: "#ef4444",
    colorBg: "bg-red-100",
    colorText: "text-red-700",
    label: minutes >= DURATION_THRESHOLDS.LONG_STAY_CRITICAL ? "Very Long" : "Long Stay",
    isAlert: true,
    alertLevel: minutes >= DURATION_THRESHOLDS.LONG_STAY_CRITICAL ? "critical" : "warning",
  };
}

/**
 * Calculate minutes since a given timestamp
 */
export function minutesSince(timestamp: Date | string | null | undefined): number {
  if (!timestamp) return 0;
  const start = new Date(timestamp);
  const now = new Date();
  return Math.floor((now.getTime() - start.getTime()) / 60000);
}

/**
 * Format duration for display
 */
export function formatDuration(minutes: number): string {
  if (minutes < 1) return "Just now";
  if (minutes === 1) return "1 min";
  if (minutes < 60) return `${minutes} mins`;

  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}

/**
 * Check if session needs OTP help notification (2 min without OTP)
 */
export function needsOtpHelp(
  qrScannedAt: Date | string | null,
  otpVerified: boolean,
  otpHelpNotifiedAt: Date | string | null
): boolean {
  if (otpVerified || otpHelpNotifiedAt) return false;
  if (!qrScannedAt) return false;

  const minutesSinceScan = minutesSince(qrScannedAt);
  return minutesSinceScan >= HELP_TIMER_THRESHOLDS.OTP_HELP_MINUTES;
}

/**
 * Check if session needs order help notification (5 min without order)
 */
export function needsOrderHelp(
  seatedAt: Date | string | null,
  firstOrderAt: Date | string | null,
  orderHelpNotifiedAt: Date | string | null
): boolean {
  if (firstOrderAt || orderHelpNotifiedAt) return false;
  if (!seatedAt) return false;

  const minutesSinceSeated = minutesSince(seatedAt);
  return minutesSinceSeated >= HELP_TIMER_THRESHOLDS.ORDER_HELP_MINUTES;
}

/**
 * Check if session needs long-stay alert
 */
export function needsLongStayAlert(
  seatedAt: Date | string | null,
  longStayAlertAt: Date | string | null
): { needsAlert: boolean; level: "warning" | "critical" | "none" } {
  if (!seatedAt) return { needsAlert: false, level: "none" };

  const minutes = minutesSince(seatedAt);

  // Already alerted for warning, check for critical
  if (longStayAlertAt) {
    if (minutes >= DURATION_THRESHOLDS.LONG_STAY_CRITICAL) {
      return { needsAlert: true, level: "critical" };
    }
    return { needsAlert: false, level: "none" };
  }

  // First alert at 90 min
  if (minutes >= DURATION_THRESHOLDS.LONG_STAY_WARNING) {
    return { needsAlert: true, level: "warning" };
  }

  return { needsAlert: false, level: "none" };
}

/**
 * Calculate SLA breach info for an order item
 */
export function calculateSlaBreach(
  expectedPrepTimeMinutes: number | null,
  preparingAt: Date | string | null,
  readyAt: Date | string | null
): {
  actualMinutes: number | null;
  isBreached: boolean;
  breachMinutes: number | null;
} {
  if (!preparingAt) {
    return { actualMinutes: null, isBreached: false, breachMinutes: null };
  }

  const endTime = readyAt ? new Date(readyAt) : new Date();
  const startTime = new Date(preparingAt);
  const actualMinutes = Math.floor((endTime.getTime() - startTime.getTime()) / 60000);

  if (!expectedPrepTimeMinutes) {
    return { actualMinutes, isBreached: false, breachMinutes: null };
  }

  const isBreached = actualMinutes > expectedPrepTimeMinutes;
  const breachMinutes = isBreached ? actualMinutes - expectedPrepTimeMinutes : null;

  return { actualMinutes, isBreached, breachMinutes };
}

/**
 * Get session phase based on timestamps
 */
export function determineSessionPhase(session: {
  otpVerified?: boolean;
  firstOrderAt?: Date | string | null;
  firstFoodServedAt?: Date | string | null;
  billRequestedAt?: Date | string | null;
  paymentCompletedAt?: Date | string | null;
}): "CREATED" | "SEATED" | "ORDERING" | "DINING" | "BILL_REQUESTED" | "PAYING" | "COMPLETED" {
  if (session.paymentCompletedAt) return "COMPLETED";
  if (session.billRequestedAt) return "BILL_REQUESTED";
  if (session.firstFoodServedAt) return "DINING";
  if (session.firstOrderAt) return "ORDERING";
  if (session.otpVerified) return "SEATED";
  return "CREATED";
}
