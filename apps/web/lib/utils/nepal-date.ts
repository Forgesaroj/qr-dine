// ═══════════════════════════════════════════════════════════════════════════════
// NEPAL DATE UTILITIES
// For IRD E-Billing Compliance - AD to BS Conversion & Fiscal Year
// ═══════════════════════════════════════════════════════════════════════════════

import NepaliDate from 'nepali-date-converter';

/**
 * Convert AD (Gregorian) date to BS (Bikram Sambat) string
 * @param adDate - JavaScript Date object in AD
 * @returns BS date string in format "YYYY.MM.DD" (e.g., "2081.10.15")
 */
export function adToBS(adDate: Date): string {
  const nd = new NepaliDate(adDate);
  const y = nd.getYear();
  const m = (nd.getMonth() + 1).toString().padStart(2, '0');
  const d = nd.getDate().toString().padStart(2, '0');
  return `${y}.${m}.${d}`;
}

/**
 * Convert BS (Bikram Sambat) string to AD (Gregorian) Date
 * @param bsDate - BS date string in format "YYYY.MM.DD"
 * @returns JavaScript Date object in AD
 */
export function bsToAD(bsDate: string): Date {
  const parts = bsDate.split('.').map(Number);
  const y = parts[0] ?? 2081;
  const m = parts[1] ?? 1;
  const d = parts[2] ?? 1;
  const nd = new NepaliDate(y, m - 1, d);
  return nd.toJsDate();
}

/**
 * Get current Nepal fiscal year
 * Nepal fiscal year runs from Shrawan 1 to Ashad 31 (approximately mid-July to mid-July)
 * Format: "2081.082" (current year + next year's last 3 digits)
 *
 * @returns Fiscal year string (e.g., "2081.082")
 */
export function getCurrentFiscalYear(): string {
  const today = new NepaliDate();
  const year = today.getYear();
  const month = today.getMonth(); // 0-indexed (Baishakh = 0, Shrawan = 3)

  // Shrawan is month index 3 (4th month, 0-indexed)
  // If we're before Shrawan (months 0-2: Baishakh, Jestha, Ashad), we're in previous fiscal year
  if (month < 3) {
    return `${year - 1}.${year.toString().slice(-3)}`;
  }
  // From Shrawan onwards, we're in current fiscal year
  return `${year}.${(year + 1).toString().slice(-3)}`;
}

/**
 * Get today's date in BS format
 * @returns Today's date in BS format "YYYY.MM.DD"
 */
export function getTodayBS(): string {
  return adToBS(new Date());
}

/**
 * Get today's NepaliDate object
 * @returns NepaliDate instance for today
 */
export function getTodayNepaliDate(): NepaliDate {
  return new NepaliDate();
}

/**
 * Format BS date for display (with month name)
 * @param bsDate - BS date string in format "YYYY.MM.DD"
 * @returns Formatted date string like "15 Magh 2081"
 */
export function formatBSDateForDisplay(bsDate: string): string {
  const nepaliMonths = [
    'Baishakh', 'Jestha', 'Ashad', 'Shrawan', 'Bhadra', 'Ashwin',
    'Kartik', 'Mangsir', 'Poush', 'Magh', 'Falgun', 'Chaitra'
  ];

  const parts = bsDate.split('.').map(Number);
  const y = parts[0] ?? 2081;
  const m = parts[1] ?? 1;
  const d = parts[2] ?? 1;
  return `${d} ${nepaliMonths[m - 1] ?? 'Unknown'} ${y}`;
}

/**
 * Get fiscal year start date in BS
 * @param fiscalYear - Fiscal year string (e.g., "2081.082")
 * @returns BS date string for Shrawan 1 of fiscal year start
 */
export function getFiscalYearStartBS(fiscalYear: string): string {
  const startYear = parseInt(fiscalYear.split('.')[0] ?? '2081');
  return `${startYear}.04.01`; // Shrawan 1 (month 4)
}

/**
 * Get fiscal year end date in BS
 * @param fiscalYear - Fiscal year string (e.g., "2081.082")
 * @returns BS date string for Ashad 32 (last day of Ashad) of fiscal year end
 */
export function getFiscalYearEndBS(fiscalYear: string): string {
  const startYear = parseInt(fiscalYear.split('.')[0] ?? '2081');
  const endYear = startYear + 1;
  // Ashad is month 3, get last day (varies between 31-32)
  // Get days in Ashad for that year
  const daysInAshad = getNepaliMonthDays(endYear, 3);
  return `${endYear}.03.${daysInAshad}`;
}

/**
 * Get number of days in a Nepali month
 * @param year - BS year
 * @param month - BS month (1-12)
 * @returns Number of days in that month
 */
export function getNepaliMonthDays(year: number, month: number): number {
  // NepaliDate library handles this internally
  // Create date for first of next month and subtract 1 day
  try {
    const nextMonth = month === 12 ? 1 : month + 1;
    const nextYear = month === 12 ? year + 1 : year;
    const firstOfNext = new NepaliDate(nextYear, nextMonth - 1, 1);
    const lastOfCurrent = new Date(firstOfNext.toJsDate().getTime() - 86400000);
    const ndLast = new NepaliDate(lastOfCurrent);
    return ndLast.getDate();
  } catch {
    // Default to 30 if calculation fails
    return 30;
  }
}

/**
 * Check if a date falls within a fiscal year
 * @param date - Date to check (AD)
 * @param fiscalYear - Fiscal year string (e.g., "2081.082")
 * @returns true if date is within fiscal year
 */
export function isDateInFiscalYear(date: Date, fiscalYear: string): boolean {
  const dateFY = getFiscalYearForDate(date);
  return dateFY === fiscalYear;
}

/**
 * Get fiscal year for a specific date
 * @param date - Date in AD
 * @returns Fiscal year string for that date
 */
export function getFiscalYearForDate(date: Date): string {
  const nd = new NepaliDate(date);
  const year = nd.getYear();
  const month = nd.getMonth(); // 0-indexed

  if (month < 3) {
    return `${year - 1}.${year.toString().slice(-3)}`;
  }
  return `${year}.${(year + 1).toString().slice(-3)}`;
}

/**
 * Parse fiscal year string to get start and end years
 * @param fiscalYear - Fiscal year string (e.g., "2081.082")
 * @returns Object with startYear and endYear
 */
export function parseFiscalYear(fiscalYear: string): { startYear: number; endYear: number } {
  const parts = fiscalYear.split('.');
  const startYear = parseInt(parts[0] ?? '2081');
  const endYear = startYear + 1;
  return { startYear, endYear };
}

/**
 * Get fiscal year display string
 * @param fiscalYear - Fiscal year string (e.g., "2081.082")
 * @returns Display string like "FY 2081/082"
 */
export function getFiscalYearDisplay(fiscalYear: string): string {
  const parts = fiscalYear.split('.');
  return `FY ${parts[0] ?? '2081'}/${parts[1] ?? '082'}`;
}
