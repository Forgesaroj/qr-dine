/**
 * Cleaning Service
 *
 * Manages table cleaning workflow:
 * - Trigger cleaning after session end
 * - Track cleaning duration and history
 * - Handle cleaning checklists
 * - Alert for delayed cleaning
 *
 * Per SESSION_FLOW_SPEC.md - Section 5.3 (Cleaning Integration)
 */

import { prisma } from "../prisma";

export interface CleaningChecklistItem {
  id: string;
  label: string;
  required: boolean;
  completed?: boolean;
  completedAt?: Date;
}

/**
 * Start cleaning for a table (triggered after payment/session end)
 */
export async function startCleaning(
  tableId: string,
  sessionId?: string
): Promise<{ cleaningRecordId: string }> {
  const table = await prisma.table.findUnique({
    where: { id: tableId },
    select: { restaurantId: true },
  });

  if (!table) {
    throw new Error("Table not found");
  }

  // Get restaurant settings for cleaning checklist
  const settings = await prisma.restaurantSettings.findUnique({
    where: { restaurantId: table.restaurantId },
    select: {
      cleaningChecklistEnabled: true,
      cleaningChecklistItems: true,
    },
  });

  // Initialize checklist if enabled
  const checklistData = settings?.cleaningChecklistEnabled && settings.cleaningChecklistItems
    ? settings.cleaningChecklistItems
    : undefined;

  // Create cleaning record
  const cleaningRecord = await prisma.tableCleaningRecord.create({
    data: {
      restaurantId: table.restaurantId,
      tableId,
      sessionId,
      cleaningRequestedAt: new Date(),
      ...(checklistData !== undefined && { checklist: checklistData }),
    },
  });

  // Update table status to CLEANING
  await prisma.table.update({
    where: { id: tableId },
    data: { status: "CLEANING" },
  });

  return { cleaningRecordId: cleaningRecord.id };
}

/**
 * Mark table as cleaned
 */
export async function markCleaned(
  cleaningRecordId: string,
  cleanedById: string,
  checklist?: CleaningChecklistItem[]
): Promise<void> {
  const cleaningRecord = await prisma.tableCleaningRecord.findUnique({
    where: { id: cleaningRecordId },
    select: {
      tableId: true,
      cleaningRequestedAt: true,
    },
  });

  if (!cleaningRecord) {
    throw new Error("Cleaning record not found");
  }

  const now = new Date();
  const durationMinutes = Math.floor(
    (now.getTime() - cleaningRecord.cleaningRequestedAt.getTime()) / 60000
  );

  // Update cleaning record
  await prisma.tableCleaningRecord.update({
    where: { id: cleaningRecordId },
    data: {
      cleanedAt: now,
      cleanedById,
      cleaningDurationMinutes: durationMinutes,
      ...(checklist && { checklist: JSON.parse(JSON.stringify(checklist)) }),
    },
  });

  // Update table status to AVAILABLE
  await prisma.table.update({
    where: { id: cleaningRecord.tableId },
    data: { status: "AVAILABLE" },
  });
}

/**
 * Mark table cleaned directly by table ID (for simpler flows)
 */
export async function markTableCleaned(
  tableId: string,
  cleanedById: string
): Promise<void> {
  // Find the most recent uncompleted cleaning record
  const cleaningRecord = await prisma.tableCleaningRecord.findFirst({
    where: {
      tableId,
      cleanedAt: null,
    },
    orderBy: { cleaningRequestedAt: "desc" },
  });

  if (cleaningRecord) {
    await markCleaned(cleaningRecord.id, cleanedById);
  } else {
    // No cleaning record exists, just update table status
    await prisma.table.update({
      where: { id: tableId },
      data: { status: "AVAILABLE" },
    });
  }
}

/**
 * Get tables in cleaning queue (needing to be cleaned)
 */
export async function getCleaningQueue(restaurantId: string): Promise<
  Array<{
    id: string;
    tableId: string;
    tableNumber: string;
    tableName: string | null;
    cleaningRequestedAt: Date;
    waitingMinutes: number;
    sessionId: string | null;
    alertSent: boolean;
  }>
> {
  const records = await prisma.tableCleaningRecord.findMany({
    where: {
      restaurantId,
      cleanedAt: null,
    },
    orderBy: { cleaningRequestedAt: "asc" },
    select: {
      id: true,
      tableId: true,
      cleaningRequestedAt: true,
      sessionId: true,
      alertSentAt: true,
      table: {
        select: {
          tableNumber: true,
          name: true,
        },
      },
    },
  });

  const now = new Date();
  return records.map((r) => ({
    id: r.id,
    tableId: r.tableId,
    tableNumber: r.table.tableNumber,
    tableName: r.table.name,
    cleaningRequestedAt: r.cleaningRequestedAt,
    waitingMinutes: Math.floor(
      (now.getTime() - r.cleaningRequestedAt.getTime()) / 60000
    ),
    sessionId: r.sessionId,
    alertSent: !!r.alertSentAt,
  }));
}

/**
 * Get cleaning records needing alert (waiting > threshold)
 */
export async function getCleaningRecordsNeedingAlert(
  restaurantId: string,
  alertThresholdMinutes: number = 10
): Promise<
  Array<{
    id: string;
    sessionId: string | null;
    tableId: string;
    tableNumber: string;
    waitingMinutes: number;
  }>
> {
  const cutoffTime = new Date(
    Date.now() - alertThresholdMinutes * 60 * 1000
  );

  const records = await prisma.tableCleaningRecord.findMany({
    where: {
      restaurantId,
      cleanedAt: null,
      alertSentAt: null,
      cleaningRequestedAt: { lte: cutoffTime },
    },
    select: {
      id: true,
      sessionId: true,
      tableId: true,
      cleaningRequestedAt: true,
      table: {
        select: {
          tableNumber: true,
        },
      },
    },
  });

  const now = new Date();
  return records.map((r) => ({
    id: r.id,
    sessionId: r.sessionId,
    tableId: r.tableId,
    tableNumber: r.table.tableNumber,
    waitingMinutes: Math.floor(
      (now.getTime() - r.cleaningRequestedAt.getTime()) / 60000
    ),
  }));
}

/**
 * Mark cleaning alert as sent
 */
export async function markCleaningAlertSent(
  cleaningRecordId: string
): Promise<void> {
  await prisma.tableCleaningRecord.update({
    where: { id: cleaningRecordId },
    data: { alertSentAt: new Date() },
  });
}

/**
 * Escalate cleaning (mark as escalated to manager)
 */
export async function escalateCleaning(
  cleaningRecordId: string
): Promise<void> {
  await prisma.tableCleaningRecord.update({
    where: { id: cleaningRecordId },
    data: { escalatedAt: new Date() },
  });
}

/**
 * Get cleaning history for a table
 */
export async function getCleaningHistory(
  tableId: string,
  limit: number = 20
): Promise<
  Array<{
    id: string;
    cleaningRequestedAt: Date;
    cleanedAt: Date | null;
    cleaningDurationMinutes: number | null;
    cleanedBy: {
      id: string;
      name: string;
    } | null;
    sessionId: string | null;
  }>
> {
  return prisma.tableCleaningRecord.findMany({
    where: { tableId },
    orderBy: { cleaningRequestedAt: "desc" },
    take: limit,
    select: {
      id: true,
      cleaningRequestedAt: true,
      cleanedAt: true,
      cleaningDurationMinutes: true,
      sessionId: true,
      cleanedBy: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });
}

/**
 * Get average cleaning time statistics
 */
export async function getCleaningStats(
  restaurantId: string,
  startDate: Date,
  endDate: Date
): Promise<{
  totalCleanings: number;
  avgDurationMinutes: number | null;
  minDurationMinutes: number | null;
  maxDurationMinutes: number | null;
  cleaningsWithAlert: number;
  cleaningsEscalated: number;
}> {
  const records = await prisma.tableCleaningRecord.findMany({
    where: {
      restaurantId,
      cleaningRequestedAt: { gte: startDate, lte: endDate },
      cleanedAt: { not: null },
    },
    select: {
      cleaningDurationMinutes: true,
      alertSentAt: true,
      escalatedAt: true,
    },
  });

  const durations = records
    .map((r) => r.cleaningDurationMinutes)
    .filter((d): d is number => d !== null);

  return {
    totalCleanings: records.length,
    avgDurationMinutes:
      durations.length > 0
        ? durations.reduce((a, b) => a + b, 0) / durations.length
        : null,
    minDurationMinutes: durations.length > 0 ? Math.min(...durations) : null,
    maxDurationMinutes: durations.length > 0 ? Math.max(...durations) : null,
    cleaningsWithAlert: records.filter((r) => r.alertSentAt).length,
    cleaningsEscalated: records.filter((r) => r.escalatedAt).length,
  };
}

/**
 * Get restaurant cleaning settings
 */
export async function getCleaningSettings(restaurantId: string): Promise<{
  cleaningAlertEnabled: boolean;
  cleaningAlertMinutes: number;
  cleaningChecklistEnabled: boolean;
  cleaningChecklistItems: CleaningChecklistItem[] | null;
}> {
  const settings = await prisma.restaurantSettings.findUnique({
    where: { restaurantId },
    select: {
      cleaningAlertEnabled: true,
      cleaningAlertMinutes: true,
      cleaningChecklistEnabled: true,
      cleaningChecklistItems: true,
    },
  });

  if (!settings) {
    return {
      cleaningAlertEnabled: true,
      cleaningAlertMinutes: 10,
      cleaningChecklistEnabled: false,
      cleaningChecklistItems: null,
    };
  }

  return {
    cleaningAlertEnabled: settings.cleaningAlertEnabled,
    cleaningAlertMinutes: settings.cleaningAlertMinutes,
    cleaningChecklistEnabled: settings.cleaningChecklistEnabled,
    cleaningChecklistItems: settings.cleaningChecklistItems as CleaningChecklistItem[] | null,
  };
}

/**
 * Update cleaning checklist for a cleaning record
 */
export async function updateCleaningChecklist(
  cleaningRecordId: string,
  checklist: CleaningChecklistItem[]
): Promise<void> {
  await prisma.tableCleaningRecord.update({
    where: { id: cleaningRecordId },
    data: { checklist: JSON.parse(JSON.stringify(checklist)) },
  });
}
