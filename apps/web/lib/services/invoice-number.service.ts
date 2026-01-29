// ═══════════════════════════════════════════════════════════════════════════════
// INVOICE NUMBER SERVICE
// For IRD E-Billing Compliance - Sequential Invoice Numbering
// Format: {FISCAL_YEAR}-{BRANCH_CODE}-{SEQUENCE}
// Example: "2081.082-001-00001"
// ═══════════════════════════════════════════════════════════════════════════════

import { prisma } from '@/lib/prisma';
import { getCurrentFiscalYear } from '@/lib/utils/nepal-date';
import { Prisma } from '@prisma/client';

type TransactionClient = Prisma.TransactionClient;

export class InvoiceNumberService {
  /**
   * Generate the next sequential invoice number for a restaurant
   *
   * Format: {FISCAL_YEAR}-{BRANCH_CODE}-{SEQUENCE}
   * Example: "2081.082-001-00001"
   *
   * Rules (per IRD):
   * - Sequential numbering within fiscal year
   * - No gaps allowed
   * - Resets at start of new fiscal year
   * - 5-digit sequence with leading zeros
   *
   * @param restaurantId - The restaurant ID
   * @param branchCode - Optional branch code (default: "001")
   * @returns The next invoice number
   */
  async generateNextNumber(
    restaurantId: string,
    branchCode: string = '001'
  ): Promise<string> {
    const fiscalYear = getCurrentFiscalYear();
    const prefix = `${fiscalYear}-${branchCode}-`;

    // Use transaction to ensure atomicity and prevent race conditions
    return await prisma.$transaction(async (tx: TransactionClient) => {
      // Find the last invoice number with this prefix
      const lastInvoice = await tx.invoice.findFirst({
        where: {
          restaurantId: restaurantId,
          invoiceNumber: { startsWith: prefix }
        },
        orderBy: { invoiceNumber: 'desc' },
        select: { invoiceNumber: true }
      });

      let nextSequence = 1;

      if (lastInvoice) {
        // Extract the sequence number from the last invoice
        const parts = lastInvoice.invoiceNumber.split('-');
        const lastSeq = parseInt(parts[parts.length - 1] ?? '0', 10);
        nextSequence = lastSeq + 1;
      }

      // Format with 5-digit padding: "00001", "00002", etc.
      const seqStr = nextSequence.toString().padStart(5, '0');
      return `${prefix}${seqStr}`;
    });
  }

  /**
   * Validate invoice number format
   * Pattern: YYYY.YYY-XXX-NNNNN
   *
   * @param invoiceNumber - The invoice number to validate
   * @returns true if format is valid
   */
  validateFormat(invoiceNumber: string): boolean {
    // Pattern: YYYY.YYY-XXX-NNNNN (e.g., "2081.082-001-00001")
    const pattern = /^\d{4}\.\d{3}-[A-Z0-9]{1,5}-\d{5}$/;
    return pattern.test(invoiceNumber);
  }

  /**
   * Parse invoice number into components
   *
   * @param invoiceNumber - The invoice number to parse
   * @returns Object with fiscalYear, branchCode, and sequence
   */
  parseInvoiceNumber(invoiceNumber: string): {
    fiscalYear: string;
    branchCode: string;
    sequence: number;
  } | null {
    if (!this.validateFormat(invoiceNumber)) {
      return null;
    }

    const parts = invoiceNumber.split('-');
    return {
      fiscalYear: parts[0] ?? '',
      branchCode: parts[1] ?? '',
      sequence: parseInt(parts[2] ?? '0', 10)
    };
  }

  /**
   * Check if an invoice number already exists
   *
   * @param restaurantId - The restaurant ID
   * @param invoiceNumber - The invoice number to check
   * @returns true if exists
   */
  async exists(restaurantId: string, invoiceNumber: string): Promise<boolean> {
    const invoice = await prisma.invoice.findFirst({
      where: {
        restaurantId,
        invoiceNumber
      },
      select: { id: true }
    });
    return !!invoice;
  }

  /**
   * Get the last invoice number for a restaurant and fiscal year
   *
   * @param restaurantId - The restaurant ID
   * @param fiscalYear - Optional fiscal year (defaults to current)
   * @returns The last invoice number or null
   */
  async getLastInvoiceNumber(
    restaurantId: string,
    fiscalYear?: string
  ): Promise<string | null> {
    const fy = fiscalYear || getCurrentFiscalYear();

    const lastInvoice = await prisma.invoice.findFirst({
      where: {
        restaurantId,
        fiscalYear: fy
      },
      orderBy: { invoiceNumber: 'desc' },
      select: { invoiceNumber: true }
    });

    return lastInvoice?.invoiceNumber || null;
  }

  /**
   * Get invoice count for a fiscal year
   *
   * @param restaurantId - The restaurant ID
   * @param fiscalYear - Optional fiscal year (defaults to current)
   * @returns Count of invoices
   */
  async getInvoiceCount(
    restaurantId: string,
    fiscalYear?: string
  ): Promise<number> {
    const fy = fiscalYear || getCurrentFiscalYear();

    return await prisma.invoice.count({
      where: {
        restaurantId,
        fiscalYear: fy
      }
    });
  }

  /**
   * Check for gaps in invoice sequence
   * IRD requires no gaps in invoice numbers
   *
   * @param restaurantId - The restaurant ID
   * @param fiscalYear - Optional fiscal year (defaults to current)
   * @returns Array of missing sequence numbers
   */
  async findSequenceGaps(
    restaurantId: string,
    fiscalYear?: string
  ): Promise<number[]> {
    const fy = fiscalYear || getCurrentFiscalYear();

    const invoices = await prisma.invoice.findMany({
      where: {
        restaurantId,
        fiscalYear: fy
      },
      select: { invoiceNumber: true },
      orderBy: { invoiceNumber: 'asc' }
    });

    if (invoices.length === 0) return [];

    const sequences = invoices.map((inv: { invoiceNumber: string }) => {
      const parts = inv.invoiceNumber.split('-');
      return parseInt(parts[parts.length - 1] ?? '0', 10);
    });

    const gaps: number[] = [];
    let expected = 1;

    for (const seq of sequences) {
      while (expected < seq) {
        gaps.push(expected);
        expected++;
      }
      expected = seq + 1;
    }

    return gaps;
  }
}

// Singleton instance for convenience
export const invoiceNumberService = new InvoiceNumberService();
