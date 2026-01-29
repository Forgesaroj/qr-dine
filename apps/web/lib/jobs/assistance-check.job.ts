/**
 * Assistance Check Job
 *
 * Background job that runs periodically to check for:
 * - QR scans without OTP entry (2 min timer)
 * - Sessions without orders (5 min timer)
 *
 * Per SESSION_FLOW_SPEC.md - Section 2.1.1, 2.2.4
 */

import { prisma } from "../prisma";
import {
  checkOtpHelpNeeded,
  checkOrderHelpNeeded,
  markOtpHelpNotified,
  markOrderHelpNotified,
  createAlert,
  getRestaurantTimerSettings,
} from "../services/assistance-timer.service";
import { sendNotification } from "../notification-events";

export interface AssistanceCheckResult {
  otpHelpAlertsSent: number;
  orderHelpAlertsSent: number;
  errors: string[];
}

/**
 * Run the assistance check job for a specific restaurant
 */
export async function runAssistanceCheck(
  restaurantId: string
): Promise<AssistanceCheckResult> {
  const result: AssistanceCheckResult = {
    otpHelpAlertsSent: 0,
    orderHelpAlertsSent: 0,
    errors: [],
  };

  try {
    // Get restaurant settings
    const settings = await getRestaurantTimerSettings(restaurantId);

    // Skip if assistance is disabled
    if (!settings.assistanceEnabled) {
      return result;
    }

    // Check for OTP help needed
    const otpHelpSessions = await checkOtpHelpNeeded(
      restaurantId,
      settings.otpHelpTimerMinutes
    );

    for (const session of otpHelpSessions) {
      try {
        // Create alert
        await createAlert({
          sessionId: session.id,
          tableId: session.tableId,
          restaurantId,
          alertType: "otp_help",
          triggerCondition: `${settings.otpHelpTimerMinutes}_min_no_otp`,
          message: `Table ${session.table.tableNumber}: Guest scanned QR ${settings.otpHelpTimerMinutes}+ minutes ago but hasn't entered OTP`,
          targetRoles: ["WAITER"],
        });

        // Mark as notified
        await markOtpHelpNotified(session.id);

        // Send push notification
        await sendNotification({
          restaurantId,
          type: "otp_help",
          title: "OTP Help Needed",
          message: `Table ${session.table.tableNumber} may need help with OTP`,
          tableId: session.tableId,
          sessionId: session.id,
          targetRoles: ["WAITER"],
        });

        result.otpHelpAlertsSent++;
      } catch (error) {
        result.errors.push(
          `Failed to send OTP help alert for session ${session.id}: ${error}`
        );
      }
    }

    // Check for order help needed
    const orderHelpSessions = await checkOrderHelpNeeded(
      restaurantId,
      settings.orderHelpTimerMinutes
    );

    for (const session of orderHelpSessions) {
      try {
        // Create alert
        await createAlert({
          sessionId: session.id,
          tableId: session.tableId,
          restaurantId,
          alertType: "order_help",
          triggerCondition: `${settings.orderHelpTimerMinutes}_min_no_order`,
          message: `Table ${session.table.tableNumber}: Guest seated ${settings.orderHelpTimerMinutes}+ minutes ago but hasn't ordered`,
          targetRoles: ["WAITER"],
        });

        // Mark as notified
        await markOrderHelpNotified(session.id);

        // Send push notification
        await sendNotification({
          restaurantId,
          type: "order_help",
          title: "Order Help Needed",
          message: `Table ${session.table.tableNumber} may need help ordering`,
          tableId: session.tableId,
          sessionId: session.id,
          targetRoles: ["WAITER"],
        });

        result.orderHelpAlertsSent++;
      } catch (error) {
        result.errors.push(
          `Failed to send order help alert for session ${session.id}: ${error}`
        );
      }
    }
  } catch (error) {
    result.errors.push(`Job failed: ${error}`);
  }

  return result;
}

/**
 * Run the assistance check job for all active restaurants
 */
export async function runAssistanceCheckForAllRestaurants(): Promise<{
  results: Array<{ restaurantId: string; result: AssistanceCheckResult }>;
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
    const result = await runAssistanceCheck(restaurant.id);
    results.push({ restaurantId: restaurant.id, result });
    totalAlerts += result.otpHelpAlertsSent + result.orderHelpAlertsSent;
    totalErrors += result.errors.length;
  }

  return { results, totalAlerts, totalErrors };
}
