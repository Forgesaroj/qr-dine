/// <reference types="node" />
// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Generate a random OTP
 */
export function generateOtp(length: 3 | 4 = 4): string {
  const min = length === 3 ? 100 : 1000;
  const max = length === 3 ? 999 : 9999;
  return Math.floor(Math.random() * (max - min + 1) + min).toString();
}

/**
 * Generate a random PIN
 */
export function generatePin(): string {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

/**
 * Generate order number (daily reset)
 */
export function generateOrderNumber(lastOrderNumber: number, date: Date = new Date()): string {
  const datePrefix = date.toISOString().slice(0, 10).replace(/-/g, "");
  const orderNum = (lastOrderNumber + 1).toString().padStart(4, "0");
  return `${datePrefix}-${orderNum}`;
}

/**
 * Generate slug from text
 */
export function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Generate unique ID (simple version)
 */
export function generateId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Deep clone object
 */
export function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * Sleep/delay function
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Debounce function
 */
export function debounce<T extends (...args: Parameters<T>) => void>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;

  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

/**
 * Throttle function
 */
export function throttle<T extends (...args: Parameters<T>) => void>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle = false;

  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

/**
 * Calculate percentage
 */
export function calculatePercentage(value: number, total: number): number {
  if (total === 0) return 0;
  return (value / total) * 100;
}

/**
 * Calculate discount amount
 */
export function calculateDiscount(
  amount: number,
  discountType: "PERCENTAGE" | "FIXED",
  discountValue: number,
  maxDiscount?: number
): number {
  let discount = discountType === "PERCENTAGE" ? (amount * discountValue) / 100 : discountValue;

  if (maxDiscount && discount > maxDiscount) {
    discount = maxDiscount;
  }

  return Math.min(discount, amount);
}

/**
 * Calculate tax
 */
export function calculateTax(amount: number, taxPercentage: number): number {
  return (amount * taxPercentage) / 100;
}

/**
 * Calculate service charge
 */
export function calculateServiceCharge(amount: number, serviceChargePercentage: number): number {
  return (amount * serviceChargePercentage) / 100;
}

/**
 * Calculate loyalty points earned
 */
export function calculatePointsEarned(amount: number, pointsPerCurrency: number): number {
  return Math.floor(amount * pointsPerCurrency);
}

/**
 * Calculate points redemption value
 */
export function calculatePointsValue(points: number, redemptionRate: number): number {
  return points / redemptionRate;
}

/**
 * Check if current time is within business hours
 */
export function isWithinBusinessHours(
  openTime: string,
  closeTime: string,
  currentTime: Date = new Date()
): boolean {
  const [openHour, openMinute] = openTime.split(":").map(Number);
  const [closeHour, closeMinute] = closeTime.split(":").map(Number);

  const currentHour = currentTime.getHours();
  const currentMinute = currentTime.getMinutes();

  const currentMinutes = currentHour * 60 + currentMinute;
  const openMinutes = (openHour ?? 0) * 60 + (openMinute ?? 0);
  const closeMinutes = (closeHour ?? 0) * 60 + (closeMinute ?? 0);

  // Handle overnight hours (e.g., 22:00 - 02:00)
  if (closeMinutes < openMinutes) {
    return currentMinutes >= openMinutes || currentMinutes <= closeMinutes;
  }

  return currentMinutes >= openMinutes && currentMinutes <= closeMinutes;
}

/**
 * Get day of week name
 */
export function getDayOfWeekName(dayIndex: number): string {
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  return days[dayIndex] ?? "";
}

/**
 * Parse JSON safely
 */
export function safeJsonParse<T>(json: string, defaultValue: T): T {
  try {
    return JSON.parse(json) as T;
  } catch {
    return defaultValue;
  }
}

/**
 * Group array by key
 */
export function groupBy<T, K extends keyof T>(array: T[], key: K): Record<string, T[]> {
  return array.reduce(
    (result, item) => {
      const groupKey = String(item[key]);
      if (!result[groupKey]) {
        result[groupKey] = [];
      }
      result[groupKey].push(item);
      return result;
    },
    {} as Record<string, T[]>
  );
}

/**
 * Remove duplicates from array
 */
export function uniqueArray<T>(array: T[]): T[] {
  return [...new Set(array)];
}

/**
 * Sort array by property
 */
export function sortBy<T>(array: T[], key: keyof T, order: "asc" | "desc" = "asc"): T[] {
  return [...array].sort((a, b) => {
    if (a[key] < b[key]) return order === "asc" ? -1 : 1;
    if (a[key] > b[key]) return order === "asc" ? 1 : -1;
    return 0;
  });
}

/**
 * Pick specific properties from object
 */
export function pick<T extends object, K extends keyof T>(obj: T, keys: K[]): Pick<T, K> {
  return keys.reduce(
    (result, key) => {
      if (key in obj) {
        result[key] = obj[key];
      }
      return result;
    },
    {} as Pick<T, K>
  );
}

/**
 * Omit specific properties from object
 */
export function omit<T extends object, K extends keyof T>(obj: T, keys: K[]): Omit<T, K> {
  const result = { ...obj };
  keys.forEach((key) => delete result[key]);
  return result;
}
