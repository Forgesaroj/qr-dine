/**
 * OTP Service
 *
 * Handles OTP generation, verification, and automatic change on session end.
 * Per SESSION_FLOW_SPEC.md - Section 5.2 (OTP/Session Regeneration)
 */

import { prisma } from "../prisma";

/**
 * Generate a random 3-digit OTP
 */
export function generateOtp(): string {
  return String(Math.floor(100 + Math.random() * 900));
}

/**
 * Generate OTP for a table (initial setup or regeneration)
 */
export async function generateTableOtp(tableId: string): Promise<{
  otp: string;
  previousOtp: string | null;
}> {
  const table = await prisma.table.findUnique({
    where: { id: tableId },
    select: { currentOtp: true, restaurantId: true },
  });

  if (!table) {
    throw new Error("Table not found");
  }

  const previousOtp = table.currentOtp;
  const newOtp = generateOtp();

  await prisma.table.update({
    where: { id: tableId },
    data: {
      currentOtp: newOtp,
      otpGeneratedAt: new Date(),
    },
  });

  // Record OTP generation in history
  await prisma.otpHistory.create({
    data: {
      tableId,
      restaurantId: table.restaurantId,
      otpCode: newOtp,
      generatedAt: new Date(),
      action: "GENERATED",
    },
  });

  return { otp: newOtp, previousOtp };
}

/**
 * Change OTP after payment completion
 * This is the key security feature - prevents next guest from using old OTP
 */
export async function changeOtpAfterPayment(
  tableId: string,
  sessionId: string
): Promise<string> {
  const table = await prisma.table.findUnique({
    where: { id: tableId },
    select: { currentOtp: true, restaurantId: true },
  });

  if (!table) {
    throw new Error("Table not found");
  }

  const previousOtp = table.currentOtp;
  const newOtp = generateOtp();

  // Update table with new OTP
  await prisma.table.update({
    where: { id: tableId },
    data: {
      currentOtp: newOtp,
      otpGeneratedAt: new Date(),
    },
  });

  // Record OTP change in history with reason
  await prisma.otpHistory.create({
    data: {
      tableId,
      restaurantId: table.restaurantId,
      otpCode: newOtp,
      generatedAt: new Date(),
      sessionId,
      action: "CHANGED_AFTER_PAYMENT",
      previousOtp,
    },
  });

  return newOtp;
}

/**
 * Verify OTP for a table
 */
export async function verifyOtp(
  tableId: string,
  otp: string
): Promise<{
  valid: boolean;
  error?: string;
}> {
  const table = await prisma.table.findUnique({
    where: { id: tableId },
    select: { currentOtp: true },
  });

  if (!table) {
    return { valid: false, error: "Table not found" };
  }

  if (!table.currentOtp) {
    return { valid: false, error: "OTP not set for this table" };
  }

  if (table.currentOtp !== otp) {
    return { valid: false, error: "Invalid OTP" };
  }

  return { valid: true };
}

/**
 * Get OTP history for a table
 */
export async function getOtpHistory(
  tableId: string,
  limit: number = 10
): Promise<
  Array<{
    id: string;
    otpCode: string;
    action: string;
    generatedAt: Date | null;
    usedAt: Date | null;
    sessionId: string | null;
    previousOtp: string | null;
  }>
> {
  return prisma.otpHistory.findMany({
    where: { tableId },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      otpCode: true,
      action: true,
      generatedAt: true,
      usedAt: true,
      sessionId: true,
      previousOtp: true,
    },
  });
}

/**
 * Record OTP usage (when guest successfully enters OTP)
 */
export async function recordOtpUsage(
  tableId: string,
  restaurantId: string,
  otpCode: string,
  sessionId: string
): Promise<void> {
  await prisma.otpHistory.create({
    data: {
      tableId,
      restaurantId,
      otpCode,
      usedAt: new Date(),
      sessionId,
      action: "USED",
    },
  });
}

/**
 * Get current OTP for display (manager/staff view only)
 */
export async function getCurrentOtp(tableId: string): Promise<{
  otp: string | null;
  generatedAt: Date | null;
}> {
  const table = await prisma.table.findUnique({
    where: { id: tableId },
    select: { currentOtp: true, otpGeneratedAt: true },
  });

  if (!table) {
    throw new Error("Table not found");
  }

  return {
    otp: table.currentOtp,
    generatedAt: table.otpGeneratedAt,
  };
}

/**
 * Manually regenerate OTP (by staff/manager)
 */
export async function manuallyRegenerateOtp(
  tableId: string,
  regeneratedById?: string
): Promise<string> {
  const table = await prisma.table.findUnique({
    where: { id: tableId },
    select: { currentOtp: true, restaurantId: true },
  });

  if (!table) {
    throw new Error("Table not found");
  }

  const previousOtp = table.currentOtp;
  const newOtp = generateOtp();

  await prisma.table.update({
    where: { id: tableId },
    data: {
      currentOtp: newOtp,
      otpGeneratedAt: new Date(),
    },
  });

  // Record manual OTP regeneration
  await prisma.otpHistory.create({
    data: {
      tableId,
      restaurantId: table.restaurantId,
      otpCode: newOtp,
      generatedAt: new Date(),
      action: "MANUAL_REGENERATION",
      previousOtp,
      regeneratedById,
    },
  });

  return newOtp;
}
