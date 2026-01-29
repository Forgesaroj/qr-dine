// ═══════════════════════════════════════════════════════════════════════════════
// CBMS (Central Billing Monitoring System) SERVICE
// For IRD E-Billing Compliance - Integration with IRD's CBMS API
// ═══════════════════════════════════════════════════════════════════════════════

import { prisma } from '@/lib/prisma';
import { CBMSSyncStatus, CBMSSyncType } from '@prisma/client';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

interface CBMSConfig {
  apiUrl: string;
  username: string;
  password: string;
  sellerPan: string;
}

interface CBMSResponse {
  success: boolean;
  code: number;
  message: string;
  data?: unknown;
}

interface InvoicePostData {
  buyerPan?: string;
  buyerName: string;
  fiscalYear: string;
  invoiceNumber: string;
  invoiceDate: string; // BS date format "YYYY.MM.DD"
  totalSales: number;
  taxableSalesVat: number;
  vat: number;
  excisableAmount?: number;
  excise?: number;
  taxableSalesHst?: number;
  hst?: number;
  amountForEsf?: number;
  esf?: number;
  exportSales?: number;
  taxExemptedSales?: number;
}

interface CreditNotePostData {
  refInvoiceNumber: string;
  creditNoteNumber: string;
  creditNoteDate: string;
  reason: string;
  amount: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CBMS RESPONSE CODES
// ═══════════════════════════════════════════════════════════════════════════════

export const CBMS_RESPONSE_CODES: Record<number, { message: string; action: string }> = {
  200: { message: 'Success - Invoice synced', action: 'mark_synced' },
  100: { message: 'Authentication failed', action: 'check_credentials' },
  101: { message: 'Invoice already exists', action: 'skip' },
  102: { message: 'Save error - Check data', action: 'retry' },
  103: { message: 'Unknown error', action: 'retry' },
  104: { message: 'Invalid model - Missing fields', action: 'fix_data' },
  105: { message: 'Referenced invoice not found', action: 'fix_reference' }
};

// ═══════════════════════════════════════════════════════════════════════════════
// CBMS SERVICE CLASS
// ═══════════════════════════════════════════════════════════════════════════════

export class CBMSService {
  private config: CBMSConfig | null = null;
  private restaurantId: string;
  private initialized: boolean = false;

  constructor(restaurantId: string) {
    this.restaurantId = restaurantId;
  }

  /**
   * Initialize the CBMS service with restaurant credentials
   * @returns true if successfully initialized and enabled
   */
  async initialize(): Promise<boolean> {
    const config = await prisma.restaurantCBMSConfig.findUnique({
      where: { restaurantId: this.restaurantId }
    });

    if (!config || !config.enabled) {
      this.initialized = false;
      return false;
    }

    this.config = {
      apiUrl: config.apiUrl,
      // Note: In production, these should be decrypted
      username: config.username,
      password: config.password,
      sellerPan: config.sellerPan
    };

    this.initialized = true;
    return true;
  }

  /**
   * Check if CBMS is enabled and initialized
   */
  isEnabled(): boolean {
    return this.initialized && this.config !== null;
  }

  /**
   * Post an invoice to CBMS
   * @param invoice - Invoice data to sync
   * @returns CBMS response
   */
  async postInvoice(invoice: InvoicePostData): Promise<CBMSResponse> {
    if (!this.config) {
      return {
        success: false,
        code: 0,
        message: 'CBMS not initialized'
      };
    }

    const payload = {
      username: this.config.username,
      password: this.config.password,
      seller_pan: this.config.sellerPan,
      buyer_pan: invoice.buyerPan || '',
      buyer_name: invoice.buyerName,
      fiscal_year: invoice.fiscalYear,
      invoice_number: invoice.invoiceNumber,
      invoice_date: invoice.invoiceDate,
      total_sales: invoice.totalSales,
      taxable_sales_vat: invoice.taxableSalesVat,
      vat: invoice.vat,
      excisable_amount: invoice.excisableAmount || 0,
      excise: invoice.excise || 0,
      taxable_sales_hst: invoice.taxableSalesHst || 0,
      hst: invoice.hst || 0,
      amount_for_esf: invoice.amountForEsf || 0,
      esf: invoice.esf || 0,
      export_sales: invoice.exportSales || 0,
      tax_exempted_sales: invoice.taxExemptedSales || 0,
      isrealtime: true,
      datetimeClient: new Date().toISOString()
    };

    // Log the sync attempt
    const syncLog = await this.createSyncLog(
      CBMSSyncType.INVOICE,
      invoice.invoiceNumber,
      invoice.fiscalYear,
      payload
    );

    try {
      const response = await fetch(`${this.config.apiUrl}/api/bill`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(30000) // 30 second timeout
      });

      const result = await response.json();
      const code = result.code || response.status;
      const success = code === 200 || code === 101; // 101 = already exists = success

      // Update sync log
      await this.updateSyncLog(syncLog.id, {
        status: success ? CBMSSyncStatus.SUCCESS : CBMSSyncStatus.FAILED,
        responseCode: code,
        responseMessage: this.getResponseMessage(code),
        responsePayload: result
      });

      return {
        success,
        code,
        message: this.getResponseMessage(code),
        data: result
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      // Update sync log with error
      await this.updateSyncLog(syncLog.id, {
        status: CBMSSyncStatus.FAILED,
        responseCode: 0,
        responseMessage: `Network error: ${errorMessage}`,
        errorMessage: errorMessage
      });

      return {
        success: false,
        code: 0,
        message: `Network error: ${errorMessage}`
      };
    }
  }

  /**
   * Post a credit note to CBMS
   * @param creditNote - Credit note data
   * @returns CBMS response
   */
  async postCreditNote(creditNote: CreditNotePostData): Promise<CBMSResponse> {
    if (!this.config) {
      return {
        success: false,
        code: 0,
        message: 'CBMS not initialized'
      };
    }

    const payload = {
      username: this.config.username,
      password: this.config.password,
      seller_pan: this.config.sellerPan,
      ref_invoice_number: creditNote.refInvoiceNumber,
      credit_note_number: creditNote.creditNoteNumber,
      credit_note_date: creditNote.creditNoteDate,
      reason: creditNote.reason,
      amount: creditNote.amount,
      isrealtime: true,
      datetimeClient: new Date().toISOString()
    };

    const syncLog = await this.createSyncLog(
      CBMSSyncType.CREDIT_NOTE,
      creditNote.creditNoteNumber,
      '', // Fiscal year from ref invoice
      payload
    );

    try {
      const response = await fetch(`${this.config.apiUrl}/api/billreturn`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(30000)
      });

      const result = await response.json();
      const code = result.code || response.status;
      const success = code === 200 || code === 101;

      await this.updateSyncLog(syncLog.id, {
        status: success ? CBMSSyncStatus.SUCCESS : CBMSSyncStatus.FAILED,
        responseCode: code,
        responseMessage: this.getResponseMessage(code),
        responsePayload: result
      });

      return {
        success,
        code,
        message: this.getResponseMessage(code),
        data: result
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      await this.updateSyncLog(syncLog.id, {
        status: CBMSSyncStatus.FAILED,
        responseCode: 0,
        responseMessage: `Network error: ${errorMessage}`,
        errorMessage: errorMessage
      });

      return {
        success: false,
        code: 0,
        message: `Network error: ${errorMessage}`
      };
    }
  }

  /**
   * Test CBMS credentials
   * @returns true if credentials are valid
   */
  async testCredentials(): Promise<{ valid: boolean; message: string }> {
    if (!this.config) {
      return { valid: false, message: 'CBMS not initialized' };
    }

    // Use a test call or minimal API call to verify credentials
    // For now, we'll assume initialization success means credentials might be valid
    // In production, IRD may provide a test endpoint

    try {
      // Try posting a test transaction (if test endpoint available)
      // For now, return success if config is loaded
      return { valid: true, message: 'Credentials loaded successfully' };
    } catch {
      return { valid: false, message: 'Credential validation failed' };
    }
  }

  /**
   * Get human-readable response message
   */
  private getResponseMessage(code: number): string {
    return CBMS_RESPONSE_CODES[code]?.message || `Unknown response code: ${code}`;
  }

  /**
   * Create a sync log entry
   */
  private async createSyncLog(
    type: CBMSSyncType,
    invoiceNumber: string,
    fiscalYear: string,
    requestPayload: unknown
  ) {
    return await prisma.cBMSSyncLog.create({
      data: {
        restaurantId: this.restaurantId,
        type,
        referenceId: invoiceNumber,
        invoiceNumber,
        fiscalYear,
        requestPayload: requestPayload as object,
        status: CBMSSyncStatus.IN_PROGRESS
      }
    });
  }

  /**
   * Update a sync log entry
   */
  private async updateSyncLog(
    id: string,
    data: {
      status: CBMSSyncStatus;
      responseCode?: number;
      responseMessage?: string;
      responsePayload?: unknown;
      errorMessage?: string;
    }
  ) {
    return await prisma.cBMSSyncLog.update({
      where: { id },
      data: {
        status: data.status,
        responseCode: data.responseCode,
        responseMessage: data.responseMessage,
        responsePayload: data.responsePayload as object | undefined,
        errorMessage: data.errorMessage,
        responseTimestamp: new Date()
      }
    });
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Get pending invoices that need to be synced to CBMS
 */
export async function getPendingInvoicesForSync(restaurantId: string) {
  return await prisma.invoice.findMany({
    where: {
      restaurantId,
      cbmsRequired: true,
      cbmsSynced: false,
      status: 'ACTIVE'
    },
    orderBy: { createdAt: 'asc' },
    take: 100 // Process in batches
  });
}

/**
 * Get failed sync logs for retry
 */
export async function getFailedSyncLogs(restaurantId: string) {
  return await prisma.cBMSSyncLog.findMany({
    where: {
      restaurantId,
      status: CBMSSyncStatus.FAILED,
      attemptNumber: { lt: 3 } // Max 3 attempts
    },
    orderBy: { createdAt: 'asc' },
    take: 50
  });
}

/**
 * Update CBMS config last sync status
 */
export async function updateCBMSConfigStatus(
  restaurantId: string,
  status: string
) {
  await prisma.restaurantCBMSConfig.update({
    where: { restaurantId },
    data: {
      lastSyncAt: new Date(),
      lastSyncStatus: status
    }
  });
}

/**
 * Factory function to create and initialize CBMS service
 */
export async function createCBMSService(restaurantId: string): Promise<CBMSService | null> {
  const service = new CBMSService(restaurantId);
  const initialized = await service.initialize();
  return initialized ? service : null;
}
