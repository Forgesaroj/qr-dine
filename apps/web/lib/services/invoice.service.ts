// ═══════════════════════════════════════════════════════════════════════════════
// INVOICE SERVICE
// For IRD E-Billing Compliance - Invoice Creation, Printing, and Management
// ═══════════════════════════════════════════════════════════════════════════════

import { prisma } from '@/lib/prisma';
import { InvoiceStatus, InvoiceAuditAction, Prisma } from '@prisma/client';
import { invoiceNumberService } from './invoice-number.service';
import { createCBMSService } from './cbms.service';
import { adToBS, getCurrentFiscalYear } from '@/lib/utils/nepal-date';
import { numberToWords } from '@/lib/utils/number-to-words';

type TransactionClient = Prisma.TransactionClient;

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface CreateInvoiceData {
  restaurantId: string;
  billId?: string;
  orderId?: string;
  sessionId?: string;

  // Buyer info
  buyerName: string;
  buyerPan?: string;
  buyerAddress?: string;

  // Items
  items: InvoiceItemData[];

  // Amounts
  subtotal: number;
  discountAmount?: number;
  discountReason?: string;
  serviceChargeRate?: number;
  serviceCharge?: number;

  // Payment
  paymentMethod?: string;

  // User who created
  createdBy: string;
  createdByName: string;

  // Optional: Override CBMS sync
  skipCBMS?: boolean;
}

export interface InvoiceItemData {
  description: string;
  descriptionLocal?: string;
  quantity: number;
  unitPrice: number;
  menuItemId?: string;
}

export interface PrintInvoiceResult {
  success: boolean;
  invoice: InvoiceWithItems | null;
  printCount: number;
  isCopy: boolean;
  error?: string;
}

type InvoiceWithItems = Prisma.InvoiceGetPayload<{
  include: { items: true };
}>;

// ═══════════════════════════════════════════════════════════════════════════════
// INVOICE SERVICE CLASS
// ═══════════════════════════════════════════════════════════════════════════════

export class InvoiceService {
  private restaurantId: string;

  constructor(restaurantId: string) {
    this.restaurantId = restaurantId;
  }

  /**
   * Create a new invoice
   * This is the main entry point for invoice creation
   */
  async createInvoice(data: CreateInvoiceData): Promise<InvoiceWithItems> {
    // Get restaurant and CBMS config
    const restaurant = await prisma.restaurant.findUnique({
      where: { id: this.restaurantId },
      include: { cbmsConfig: true }
    });

    if (!restaurant) {
      throw new Error('Restaurant not found');
    }

    // Generate invoice number
    const invoiceNumber = await invoiceNumberService.generateNextNumber(
      this.restaurantId
    );

    // Calculate fiscal year and dates
    const now = new Date();
    const fiscalYear = getCurrentFiscalYear();
    const invoiceDateBs = adToBS(now);

    // Get seller info from CBMS config or restaurant
    const cbmsConfig = restaurant.cbmsConfig;
    const sellerPan = cbmsConfig?.sellerPan || '';
    const sellerName = restaurant.name;
    const sellerAddress = restaurant.address || '';
    const sellerPhone = restaurant.phone || '';

    // Calculate tax amounts
    const subtotal = data.subtotal;
    const discountAmount = data.discountAmount || 0;
    const taxableAmount = subtotal - discountAmount;
    const vatRate = 13; // Nepal VAT rate
    const vatAmount = Math.round((taxableAmount * vatRate / 100) * 100) / 100;
    const serviceCharge = data.serviceCharge || 0;
    const totalAmount = taxableAmount + vatAmount + serviceCharge;

    // Generate amount in words
    const amountInWords = numberToWords(totalAmount);

    // Create invoice with items in a transaction
    const invoice = await prisma.$transaction(async (tx: TransactionClient) => {
      // Create the invoice
      const newInvoice = await tx.invoice.create({
        data: {
          restaurantId: this.restaurantId,
          invoiceNumber,
          fiscalYear,
          invoiceDateBs,
          invoiceDateAd: now,

          // Seller info
          sellerPan,
          sellerName,
          sellerAddress,
          sellerPhone,

          // Buyer info
          buyerPan: data.buyerPan,
          buyerName: data.buyerName,
          buyerAddress: data.buyerAddress,

          // Amounts
          subtotal: new Prisma.Decimal(subtotal),
          discountAmount: new Prisma.Decimal(discountAmount),
          discountReason: data.discountReason,
          taxableAmount: new Prisma.Decimal(taxableAmount),
          vatRate: new Prisma.Decimal(vatRate),
          vatAmount: new Prisma.Decimal(vatAmount),
          serviceChargeRate: data.serviceChargeRate
            ? new Prisma.Decimal(data.serviceChargeRate)
            : null,
          serviceCharge: new Prisma.Decimal(serviceCharge),
          totalAmount: new Prisma.Decimal(totalAmount),
          amountInWords,

          // CBMS
          cbmsRequired: cbmsConfig?.enabled || false,
          cbmsSynced: false,

          // References
          billId: data.billId,
          orderId: data.orderId,
          sessionId: data.sessionId,
          paymentMethod: data.paymentMethod,

          // Creator
          createdBy: data.createdBy,
          createdByName: data.createdByName,

          // Create items
          items: {
            create: data.items.map((item, index) => ({
              serialNumber: index + 1,
              description: item.description,
              descriptionLocal: item.descriptionLocal,
              quantity: new Prisma.Decimal(item.quantity),
              unitPrice: new Prisma.Decimal(item.unitPrice),
              totalPrice: new Prisma.Decimal(item.quantity * item.unitPrice),
              menuItemId: item.menuItemId
            }))
          }
        },
        include: { items: true }
      });

      // Create audit log
      await tx.invoiceAuditLog.create({
        data: {
          invoiceId: newInvoice.id,
          restaurantId: this.restaurantId,
          action: InvoiceAuditAction.CREATED,
          userId: data.createdBy,
          userName: data.createdByName,
          userRole: 'STAFF',
          newValue: {
            invoiceNumber,
            totalAmount,
            buyerName: data.buyerName
          }
        }
      });

      return newInvoice;
    });

    // Sync to CBMS if enabled and not skipped
    if (!data.skipCBMS && invoice.cbmsRequired) {
      await this.syncInvoiceToCBMS(invoice.id);
    }

    return invoice;
  }

  /**
   * Get invoice by ID
   */
  async getInvoice(invoiceId: string): Promise<InvoiceWithItems | null> {
    return await prisma.invoice.findFirst({
      where: {
        id: invoiceId,
        restaurantId: this.restaurantId
      },
      include: { items: true }
    });
  }

  /**
   * Get invoice by number
   */
  async getInvoiceByNumber(invoiceNumber: string): Promise<InvoiceWithItems | null> {
    return await prisma.invoice.findFirst({
      where: {
        invoiceNumber,
        restaurantId: this.restaurantId
      },
      include: { items: true }
    });
  }

  /**
   * Print invoice - tracks print count and marks copies
   */
  async printInvoice(
    invoiceId: string,
    printedBy: string,
    printedByName: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<PrintInvoiceResult> {
    const invoice = await this.getInvoice(invoiceId);

    if (!invoice) {
      return {
        success: false,
        invoice: null,
        printCount: 0,
        isCopy: false,
        error: 'Invoice not found'
      };
    }

    if (invoice.status === InvoiceStatus.CANCELLED) {
      return {
        success: false,
        invoice,
        printCount: invoice.printCount,
        isCopy: true,
        error: 'Cannot print cancelled invoice'
      };
    }

    const isCopy = invoice.printCount > 0;
    const newPrintCount = invoice.printCount + 1;

    // Update invoice and create audit log
    await prisma.$transaction(async (tx: TransactionClient) => {
      // Update print tracking
      const updateData: Prisma.InvoiceUpdateInput = {
        printCount: newPrintCount,
        lastPrintedAt: new Date(),
        lastPrintedBy: printedBy
      };

      // Set first print info if this is the first print
      if (!isCopy) {
        updateData.firstPrintedAt = new Date();
        updateData.firstPrintedBy = printedBy;
      }

      await tx.invoice.update({
        where: { id: invoiceId },
        data: updateData
      });

      // Create audit log
      await tx.invoiceAuditLog.create({
        data: {
          invoiceId,
          restaurantId: this.restaurantId,
          action: isCopy ? InvoiceAuditAction.REPRINTED : InvoiceAuditAction.PRINTED,
          userId: printedBy,
          userName: printedByName,
          userRole: 'STAFF',
          ipAddress,
          userAgent,
          metadata: {
            printNumber: newPrintCount,
            isCopy
          }
        }
      });
    });

    // Refresh invoice data
    const updatedInvoice = await this.getInvoice(invoiceId);

    return {
      success: true,
      invoice: updatedInvoice,
      printCount: newPrintCount,
      isCopy
    };
  }

  /**
   * Cancel an invoice
   * Note: IRD requires cancellation reason and proper audit trail
   */
  async cancelInvoice(
    invoiceId: string,
    reason: string,
    cancelledBy: string,
    cancelledByName: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<{ success: boolean; error?: string }> {
    const invoice = await this.getInvoice(invoiceId);

    if (!invoice) {
      return { success: false, error: 'Invoice not found' };
    }

    if (invoice.status === InvoiceStatus.CANCELLED) {
      return { success: false, error: 'Invoice already cancelled' };
    }

    // Store old values for audit
    const oldValue = {
      status: invoice.status,
      cbmsSynced: invoice.cbmsSynced
    };

    await prisma.$transaction(async (tx: TransactionClient) => {
      // Update invoice status
      await tx.invoice.update({
        where: { id: invoiceId },
        data: {
          status: InvoiceStatus.CANCELLED,
          isCancelled: true,
          cancelledAt: new Date(),
          cancelledBy,
          cancellationReason: reason
        }
      });

      // Create audit log
      await tx.invoiceAuditLog.create({
        data: {
          invoiceId,
          restaurantId: this.restaurantId,
          action: InvoiceAuditAction.CANCELLED,
          userId: cancelledBy,
          userName: cancelledByName,
          userRole: 'STAFF',
          ipAddress,
          userAgent,
          oldValue,
          newValue: {
            status: InvoiceStatus.CANCELLED,
            cancellationReason: reason
          }
        }
      });
    });

    // If CBMS synced, we may need to post a credit note
    // This would be handled separately based on IRD requirements

    return { success: true };
  }

  /**
   * Sync invoice to CBMS
   */
  async syncInvoiceToCBMS(invoiceId: string): Promise<{
    success: boolean;
    code: number;
    message: string;
  }> {
    const invoice = await this.getInvoice(invoiceId);

    if (!invoice) {
      return { success: false, code: 0, message: 'Invoice not found' };
    }

    if (invoice.cbmsSynced) {
      return { success: true, code: 101, message: 'Already synced' };
    }

    const cbmsService = await createCBMSService(this.restaurantId);

    if (!cbmsService) {
      return { success: false, code: 0, message: 'CBMS not configured' };
    }

    const result = await cbmsService.postInvoice({
      buyerPan: invoice.buyerPan || undefined,
      buyerName: invoice.buyerName,
      fiscalYear: invoice.fiscalYear,
      invoiceNumber: invoice.invoiceNumber,
      invoiceDate: invoice.invoiceDateBs,
      totalSales: Number(invoice.totalAmount),
      taxableSalesVat: Number(invoice.taxableAmount),
      vat: Number(invoice.vatAmount)
    });

    // Update invoice with sync status
    await prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        cbmsSynced: result.success,
        cbmsSyncedAt: result.success ? new Date() : null,
        cbmsResponseCode: result.code,
        cbmsResponseMessage: result.message,
        cbmsRetryCount: { increment: 1 },
        cbmsLastRetryAt: new Date(),
        cbmsError: result.success ? null : result.message
      }
    });

    // Create audit log
    await prisma.invoiceAuditLog.create({
      data: {
        invoiceId,
        restaurantId: this.restaurantId,
        action: result.success
          ? InvoiceAuditAction.CBMS_SYNC_SUCCESS
          : InvoiceAuditAction.CBMS_SYNC_FAILED,
        userId: 'SYSTEM',
        userName: 'System',
        userRole: 'SYSTEM',
        metadata: {
          code: result.code,
          message: result.message
        }
      }
    });

    return result;
  }

  /**
   * Get invoices for a date range
   */
  async getInvoices(options: {
    startDate?: Date;
    endDate?: Date;
    status?: InvoiceStatus;
    cbmsSynced?: boolean;
    limit?: number;
    offset?: number;
  }) {
    const where: Prisma.InvoiceWhereInput = {
      restaurantId: this.restaurantId
    };

    if (options.startDate || options.endDate) {
      where.invoiceDateAd = {};
      if (options.startDate) {
        where.invoiceDateAd.gte = options.startDate;
      }
      if (options.endDate) {
        where.invoiceDateAd.lte = options.endDate;
      }
    }

    if (options.status) {
      where.status = options.status;
    }

    if (options.cbmsSynced !== undefined) {
      where.cbmsSynced = options.cbmsSynced;
    }

    const [invoices, total] = await Promise.all([
      prisma.invoice.findMany({
        where,
        include: { items: true },
        orderBy: { invoiceDateAd: 'desc' },
        take: options.limit || 50,
        skip: options.offset || 0
      }),
      prisma.invoice.count({ where })
    ]);

    return { invoices, total };
  }

  /**
   * Get audit trail for an invoice
   */
  async getAuditTrail(invoiceId: string) {
    return await prisma.invoiceAuditLog.findMany({
      where: {
        invoiceId,
        restaurantId: this.restaurantId
      },
      orderBy: { createdAt: 'desc' }
    });
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// FACTORY FUNCTION
// ═══════════════════════════════════════════════════════════════════════════════

export function createInvoiceService(restaurantId: string): InvoiceService {
  return new InvoiceService(restaurantId);
}
