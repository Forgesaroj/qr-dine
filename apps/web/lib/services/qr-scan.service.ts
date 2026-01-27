/**
 * QR Scan Event Service
 *
 * Tracks QR code scans before OTP verification.
 * Per SESSION_FLOW_SPEC.md - Section 2.1.1
 */

import { prisma } from "../prisma";

export interface QrScanInput {
  restaurantId: string;
  tableId: string;
  deviceFingerprint?: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface QrScanEvent {
  id: string;
  restaurantId: string;
  tableId: string;
  scannedAt: Date;
  deviceFingerprint: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  otpEntered: boolean;
  otpEnteredAt: Date | null;
  otpAttempts: number;
  orderPlaced: boolean;
  orderPlacedAt: Date | null;
  otpHelpNotified: boolean;
  otpHelpNotifiedAt: Date | null;
  browseHelpNotified: boolean;
  browseHelpNotifiedAt: Date | null;
  sessionId: string | null;
}

/**
 * Record a new QR scan event
 */
export async function recordQrScan(input: QrScanInput): Promise<QrScanEvent> {
  return prisma.qrScanEvent.create({
    data: {
      restaurantId: input.restaurantId,
      tableId: input.tableId,
      deviceFingerprint: input.deviceFingerprint,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
    },
  });
}

/**
 * Find recent QR scan event for a table (within last 30 minutes)
 * Used to link OTP verification to the scan event
 */
export async function findRecentScanForTable(
  tableId: string,
  deviceFingerprint?: string,
  ipAddress?: string
): Promise<QrScanEvent | null> {
  const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);

  // Try to find by device fingerprint first, then by IP
  const whereConditions = [];

  if (deviceFingerprint) {
    whereConditions.push({ deviceFingerprint });
  }
  if (ipAddress) {
    whereConditions.push({ ipAddress });
  }

  return prisma.qrScanEvent.findFirst({
    where: {
      tableId,
      scannedAt: { gte: thirtyMinutesAgo },
      otpEntered: false,
      ...(whereConditions.length > 0 ? { OR: whereConditions } : {}),
    },
    orderBy: { scannedAt: "desc" },
  });
}

/**
 * Mark OTP as entered for a scan event and increment attempt counter
 */
export async function markOtpEntered(
  scanEventId: string,
  success: boolean
): Promise<QrScanEvent> {
  if (success) {
    return prisma.qrScanEvent.update({
      where: { id: scanEventId },
      data: {
        otpEntered: true,
        otpEnteredAt: new Date(),
        otpAttempts: { increment: 1 },
      },
    });
  }

  // Failed attempt - just increment counter
  return prisma.qrScanEvent.update({
    where: { id: scanEventId },
    data: {
      otpAttempts: { increment: 1 },
    },
  });
}

/**
 * Link scan event to session after OTP verification
 */
export async function linkScanToSession(
  scanEventId: string,
  sessionId: string
): Promise<QrScanEvent> {
  return prisma.qrScanEvent.update({
    where: { id: scanEventId },
    data: { sessionId },
  });
}

/**
 * Mark order placed for a scan event
 */
export async function markOrderPlaced(scanEventId: string): Promise<QrScanEvent> {
  return prisma.qrScanEvent.update({
    where: { id: scanEventId },
    data: {
      orderPlaced: true,
      orderPlacedAt: new Date(),
    },
  });
}

/**
 * Mark OTP help notification sent
 */
export async function markOtpHelpNotified(scanEventId: string): Promise<QrScanEvent> {
  return prisma.qrScanEvent.update({
    where: { id: scanEventId },
    data: {
      otpHelpNotified: true,
      otpHelpNotifiedAt: new Date(),
    },
  });
}

/**
 * Mark browse help notification sent
 */
export async function markBrowseHelpNotified(scanEventId: string): Promise<QrScanEvent> {
  return prisma.qrScanEvent.update({
    where: { id: scanEventId },
    data: {
      browseHelpNotified: true,
      browseHelpNotifiedAt: new Date(),
    },
  });
}

/**
 * Get scan events pending OTP help notification
 * (Scanned > 2 minutes ago, OTP not entered, notification not sent)
 */
export async function getScansPendingOtpHelp(
  restaurantId: string,
  otpHelpTimerMinutes: number = 2
): Promise<QrScanEvent[]> {
  const cutoffTime = new Date(Date.now() - otpHelpTimerMinutes * 60 * 1000);

  return prisma.qrScanEvent.findMany({
    where: {
      restaurantId,
      scannedAt: { lte: cutoffTime },
      otpEntered: false,
      otpHelpNotified: false,
    },
    orderBy: { scannedAt: "asc" },
  });
}

/**
 * Get scan events pending browse help notification
 * (OTP entered but no order after 5 minutes, notification not sent)
 */
export async function getScansPendingBrowseHelp(
  restaurantId: string,
  browseHelpTimerMinutes: number = 5
): Promise<QrScanEvent[]> {
  const cutoffTime = new Date(Date.now() - browseHelpTimerMinutes * 60 * 1000);

  return prisma.qrScanEvent.findMany({
    where: {
      restaurantId,
      otpEntered: true,
      otpEnteredAt: { lte: cutoffTime },
      orderPlaced: false,
      browseHelpNotified: false,
    },
    orderBy: { otpEnteredAt: "asc" },
  });
}

/**
 * Get scan statistics for analytics
 */
export async function getScanStats(
  restaurantId: string,
  startDate: Date,
  endDate: Date
): Promise<{
  totalScans: number;
  scansWithOtp: number;
  scansWithOrder: number;
  avgOtpTimeMinutes: number | null;
  avgOrderTimeMinutes: number | null;
}> {
  const scans = await prisma.qrScanEvent.findMany({
    where: {
      restaurantId,
      scannedAt: {
        gte: startDate,
        lte: endDate,
      },
    },
  });

  const totalScans = scans.length;
  const scansWithOtp = scans.filter((s) => s.otpEntered).length;
  const scansWithOrder = scans.filter((s) => s.orderPlaced).length;

  // Calculate average OTP time
  const otpTimes = scans
    .filter((s) => s.otpEntered && s.otpEnteredAt)
    .map((s) => (s.otpEnteredAt!.getTime() - s.scannedAt.getTime()) / 60000);

  const avgOtpTimeMinutes = otpTimes.length > 0
    ? otpTimes.reduce((a, b) => a + b, 0) / otpTimes.length
    : null;

  // Calculate average order time
  const orderTimes = scans
    .filter((s) => s.orderPlaced && s.orderPlacedAt && s.otpEnteredAt)
    .map((s) => (s.orderPlacedAt!.getTime() - s.otpEnteredAt!.getTime()) / 60000);

  const avgOrderTimeMinutes = orderTimes.length > 0
    ? orderTimes.reduce((a, b) => a + b, 0) / orderTimes.length
    : null;

  return {
    totalScans,
    scansWithOtp,
    scansWithOrder,
    avgOtpTimeMinutes,
    avgOrderTimeMinutes,
  };
}
