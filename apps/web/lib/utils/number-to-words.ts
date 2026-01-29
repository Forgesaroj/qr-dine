// ═══════════════════════════════════════════════════════════════════════════════
// NUMBER TO WORDS UTILITY
// For IRD E-Billing Compliance - Converts amounts to words for invoices
// Uses Indian numbering system (Lakh, Crore) as used in Nepal
// ═══════════════════════════════════════════════════════════════════════════════

const ones: string[] = [
  '', 'One', 'Two', 'Three', 'Four', 'Five',
  'Six', 'Seven', 'Eight', 'Nine', 'Ten',
  'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen',
  'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'
];

const tens: string[] = [
  '', '', 'Twenty', 'Thirty', 'Forty',
  'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'
];

/**
 * Convert a number to words (Nepal/Indian numbering system)
 * Supports amounts up to 99,99,99,99,999 (99 Crore 99 Lakh 99 Thousand 999)
 *
 * @param amount - The amount to convert (can include decimal for paisa)
 * @returns String representation like "One Thousand Seven Hundred Sixty Five Rupees and Six Paisa Only"
 *
 * @example
 * numberToWords(1765.06)
 * // => "One Thousand Seven Hundred Sixty Five Rupees and Six Paisa Only"
 *
 * numberToWords(1500000)
 * // => "Fifteen Lakh Rupees Only"
 *
 * numberToWords(0)
 * // => "Zero Rupees Only"
 */
export function numberToWords(amount: number): string {
  if (isNaN(amount)) return '';
  if (amount === 0) return 'Zero Rupees Only';

  const rupees = Math.floor(Math.abs(amount));
  const paisa = Math.round((Math.abs(amount) - rupees) * 100);

  let result = '';

  if (rupees > 0) {
    result = convert(rupees) + ' Rupees';
  }

  if (paisa > 0) {
    result += (result ? ' and ' : '') + convert(paisa) + ' Paisa';
  }

  // Handle negative amounts
  if (amount < 0) {
    result = 'Minus ' + result;
  }

  return result + ' Only';
}

/**
 * Convert a number to words without currency suffix
 * @param num - The number to convert
 * @returns String representation without "Rupees Only"
 */
export function numberToWordsPlain(num: number): string {
  if (isNaN(num)) return '';
  if (num === 0) return 'Zero';

  const absNum = Math.floor(Math.abs(num));
  let result = convert(absNum);

  if (num < 0) {
    result = 'Minus ' + result;
  }

  return result;
}

/**
 * Internal conversion function
 * Uses Indian/Nepal numbering: Thousand, Lakh (100,000), Crore (10,000,000)
 */
function convert(num: number): string {
  if (num === 0) return '';
  if (num < 20) return ones[num] ?? '';

  if (num < 100) {
    return tens[Math.floor(num / 10)] +
           (num % 10 ? ' ' + ones[num % 10] : '');
  }

  if (num < 1000) {
    return ones[Math.floor(num / 100)] + ' Hundred' +
           (num % 100 ? ' ' + convert(num % 100) : '');
  }

  // Thousand: 1,000 to 99,999
  if (num < 100000) {
    return convert(Math.floor(num / 1000)) + ' Thousand' +
           (num % 1000 ? ' ' + convert(num % 1000) : '');
  }

  // Lakh: 1,00,000 to 99,99,999
  if (num < 10000000) {
    return convert(Math.floor(num / 100000)) + ' Lakh' +
           (num % 100000 ? ' ' + convert(num % 100000) : '');
  }

  // Crore: 1,00,00,000 and above
  return convert(Math.floor(num / 10000000)) + ' Crore' +
         (num % 10000000 ? ' ' + convert(num % 10000000) : '');
}

/**
 * Format amount with proper Nepali number formatting (commas)
 * Uses Indian/Nepal system: 1,00,00,000 format
 *
 * @param amount - The amount to format
 * @returns Formatted string like "1,23,45,678.00"
 */
export function formatNepaliNumber(amount: number): string {
  const parts = Math.abs(amount).toFixed(2).split('.');
  const intPart = parts[0] ?? '0';
  const decPart = parts[1] ?? '00';

  // Apply Indian/Nepal comma formatting
  let lastThree = intPart.slice(-3);
  const remaining = intPart.slice(0, -3);

  if (remaining.length > 0) {
    lastThree = ',' + lastThree;
  }

  const formatted = remaining.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + lastThree;

  return (amount < 0 ? '-' : '') + formatted + '.' + decPart;
}

/**
 * Parse Nepali formatted number string to number
 * @param formatted - Formatted string like "1,23,456.78"
 * @returns Number value
 */
export function parseNepaliNumber(formatted: string): number {
  const cleanedValue = formatted.replace(/,/g, '');
  return parseFloat(cleanedValue) || 0;
}
