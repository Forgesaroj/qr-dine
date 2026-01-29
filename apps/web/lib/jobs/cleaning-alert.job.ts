/**
 * Cleaning Alert Job
 *
 * Background job that runs periodically to check for:
 * - Tables waiting for cleaning > threshold (default 10 min)
 *
 * Per SESSION_FLOW_SPEC.md - Section 5.3
 */

import { prisma } from "../prisma";
import {
  getCleaningRecordsNeedingAlert,
  markCleaningAlertSent,
  escalateCleaning,
  getCleaningSettings,
} from "../services/cleaning.service";
import { createAlert } from "../services/assistance-timer.service";
import { sendNotification } from "../notification-events";

export interface CleaningAlertResult {
  alertsSent: number;
  escalations: number;
  errors: string[];
}

/**
 * Run the cleaning alert job for a specific restaurant
 */
export async function runCleaningAlertCheck(
  restaurantId: string
): Promise<CleaningAlertResult> {
  const result: CleaningAlertResult = {
    alertsSent: 0,
    escalations: 0,
    errors: [],
  };

  try {
    // Get restaurant settings
    const settings = await getCleaningSettings(restaurantId);

    // Skip if cleaning alerts are disabled
    if (!settings.cleaningAlertEnabled) {
      return result;
    }

    // Get cleaning records needing alert
    const recordsNeedingAlert = await getCleaningRecordsNeedingAlert(
      restaurantId,
      settings.cleaningAlertMinutes
    );

    for (const record of recordsNeedingAlert) {
      try {
        // Skip if no session ID (data inconsistency)
        if (!record.sessionId) {
          result.errors.push(`Cleaning record ${record.id} has no sessionId`);
          continue;
        }

        // Check if this needs escalation (waiting > 2x threshold)
        const needsEscalation = record.waitingMinutes > settings.cleaningAlertMinutes * 2;

        // Create alert
        await createAlert({
          sessionId: record.sessionId,
          tableId: record.tableId,
          restaurantId,
          alertType: "cleaning_delay",
          triggerCondition: `${record.waitingMinutes}_min_cleaning_wait`,
          message: `Table ${record.tableNumber}: Waiting for cleaning for ${record.waitingMinutes} minutes`,
          targetRoles: needsEscalation ? ["MANAGER"] : ["WAITER"],
          priority: needsEscalation ? "high" : "normal",
        });

        // Mark alert sent
        await markCleaningAlertSent(record.id);

        // Mark escalation if needed
        if (needsEscalation) {
          await escalateCleaning(record.id);
          result.escalations++;
        }

        // Send push notification
        await sendNotification({
          restaurantId,
          type: "cleaning_delay",
          title: needsEscalation ? "Cleaning Delay (Escalated)" : "Cleaning Needed",
          message: `Table ${record.tableNumber} - waiting ${record.waitingMinutes} mins`,
          tableId: record.tableId,
          targetRoles: needsEscalation ? ["MANAGER"] : ["WAITER"],
          priority: needsEscalation ? "high" : "normal",
        });

        result.alertsSent++;
      } catch (error) {
        result.errors.push(
          `Failed to send cleaning alert for record ${record.id}: ${error}`
        );
      }
    }
  } catch (error) {
    result.errors.push(`Job failed: ${error}`);
  }

  return result;
}

/**
 * Run the cleaning alert job for all active restaurants
 */
export async function runCleaningAlertCheckForAllRestaurants(): Promise<{
  results: Array<{ restaurantId: string; result: CleaningAlertResult }>;
  totalAlerts: number;
  totalEscalations: number;
  totalErrors: number;
}> {
  // Get all active restaurants
  const restaurants = await prisma.restaurant.findMany({
    where: { status: "ACTIVE" },
    select: { id: true },
  });

  const results = [];
  let totalAlerts = 0;
  let totalEscalations = 0;
  let totalErrors = 0;

  for (const restaurant of restaurants) {
    const result = await runCleaningAlertCheck(restaurant.id);
    results.push({ restaurantId: restaurant.id, result });
    totalAlerts += result.alertsSent;
    totalEscalations += result.escalations;
    totalErrors += result.errors.length;
  }

  return { results, totalAlerts, totalEscalations, totalErrors };
}
