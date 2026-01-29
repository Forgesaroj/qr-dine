/**
 * Long Stay Check Job
 *
 * Background job that runs periodically to check for:
 * - Sessions exceeding 90 minutes (warning)
 * - Sessions exceeding 120 minutes (critical)
 *
 * Per SESSION_FLOW_SPEC.md - Section 5.1
 */

import { prisma } from "../prisma";
import {
  checkLongStayAlertNeeded,
  markLongStayAlertSent,
  createAlert,
  getRestaurantTimerSettings,
} from "../services/assistance-timer.service";
import { sendNotification } from "../notification-events";

export interface LongStayCheckResult {
  warningAlertsSent: number;
  criticalAlertsSent: number;
  errors: string[];
}

/**
 * Run the long stay check job for a specific restaurant
 */
export async function runLongStayCheck(
  restaurantId: string
): Promise<LongStayCheckResult> {
  const result: LongStayCheckResult = {
    warningAlertsSent: 0,
    criticalAlertsSent: 0,
    errors: [],
  };

  try {
    // Get restaurant settings
    const settings = await getRestaurantTimerSettings(restaurantId);

    // Skip if long stay alerts are disabled
    if (!settings.longStayAlertEnabled) {
      return result;
    }

    // Check for long stay alerts needed
    const sessionsNeedingAlert = await checkLongStayAlertNeeded(
      restaurantId,
      settings.longStayAlertMinutes
    );

    for (const session of sessionsNeedingAlert) {
      try {
        const isWarning = session.alertLevel === "warning";
        const isCritical = session.alertLevel === "critical";

        // Determine target roles based on settings
        const targetRoles: ("WAITER" | "MANAGER")[] = [];
        if (settings.longStayNotifyWaiter) targetRoles.push("WAITER");
        if (settings.longStayNotifyManager) targetRoles.push("MANAGER");

        // Create alert
        await createAlert({
          sessionId: session.id,
          tableId: session.tableId,
          restaurantId,
          alertType: isCritical ? "long_stay_critical" : "long_stay_warning",
          triggerCondition: `${session.durationMinutes}_min_stay`,
          message: `Table ${session.table.tableNumber}: Guest seated for ${session.durationMinutes} minutes${session.guestCount ? ` (${session.guestCount} guests)` : ""}`,
          targetRoles: isCritical ? ["MANAGER"] : ["WAITER", "MANAGER"],
          priority: isCritical ? "high" : "normal",
        });

        // Mark as notified
        await markLongStayAlertSent(session.id, session.alertLevel);

        // Send push notification
        await sendNotification({
          restaurantId,
          type: isCritical ? "long_stay_critical" : "long_stay_warning",
          title: isCritical ? "Long Stay Alert (Critical)" : "Long Stay Alert",
          message: `Table ${session.table.tableNumber} - ${session.durationMinutes} mins${session.guestCount ? `, ${session.guestCount} guests` : ""}`,
          tableId: session.tableId,
          sessionId: session.id,
          targetRoles: targetRoles.length > 0 ? targetRoles : ["WAITER", "MANAGER"],
          priority: isCritical ? "high" : "normal",
        });

        if (isWarning) {
          result.warningAlertsSent++;
        } else {
          result.criticalAlertsSent++;
        }
      } catch (error) {
        result.errors.push(
          `Failed to send long stay alert for session ${session.id}: ${error}`
        );
      }
    }
  } catch (error) {
    result.errors.push(`Job failed: ${error}`);
  }

  return result;
}

/**
 * Run the long stay check job for all active restaurants
 */
export async function runLongStayCheckForAllRestaurants(): Promise<{
  results: Array<{ restaurantId: string; result: LongStayCheckResult }>;
  totalAlerts: number;
  totalErrors: number;
}> {
  // Get all active restaurants
  const restaurants = await prisma.restaurant.findMany({
    where: { status: "ACTIVE" },
    select: { id: true },
  });

  const results = [];
  let totalAlerts = 0;
  let totalErrors = 0;

  for (const restaurant of restaurants) {
    const result = await runLongStayCheck(restaurant.id);
    results.push({ restaurantId: restaurant.id, result });
    totalAlerts += result.warningAlertsSent + result.criticalAlertsSent;
    totalErrors += result.errors.length;
  }

  return { results, totalAlerts, totalErrors };
}
