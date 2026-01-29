// ═══════════════════════════════════════════════════════════════════════════════
// UTILS INDEX
// Export all utility functions
// ═══════════════════════════════════════════════════════════════════════════════

// Nepal Date Utilities (IRD E-Billing)
export {
  adToBS,
  bsToAD,
  getCurrentFiscalYear,
  getTodayBS,
  getTodayNepaliDate,
  formatBSDateForDisplay,
  getFiscalYearStartBS,
  getFiscalYearEndBS,
  getNepaliMonthDays,
  isDateInFiscalYear,
  getFiscalYearForDate,
  parseFiscalYear,
  getFiscalYearDisplay,
} from './nepal-date';

// Number to Words Utility (IRD E-Billing)
export {
  numberToWords,
  numberToWordsPlain,
  formatNepaliNumber,
  parseNepaliNumber,
} from './number-to-words';
