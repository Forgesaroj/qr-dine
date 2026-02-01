import { prisma } from "@/lib/prisma";
import { Decimal } from "@prisma/client/runtime/library";

// Types
export type VoucherType =
  | "PAYMENT"
  | "RECEIPT"
  | "CONTRA"
  | "JOURNAL"
  | "SALES"
  | "PURCHASE"
  | "CREDIT_NOTE"
  | "DEBIT_NOTE";

export interface LedgerEntryInput {
  accountId: string;
  debitAmount?: number;
  creditAmount?: number;
  narration?: string;
  costCenterId?: string;
  referenceType?: string;
  referenceId?: string;
}

export interface CreateVoucherInput {
  voucherType: VoucherType;
  voucherDate: Date;
  narration?: string;
  entries: LedgerEntryInput[];
  referenceType?: string;
  referenceId?: string;
  partyId?: string;
  partyName?: string;
  createdById: string;
  createdByName: string;
  autoPost?: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Voucher Service - Double Entry Bookkeeping
// ═══════════════════════════════════════════════════════════════════════════════

export class VoucherService {
  private restaurantId: string;

  constructor(restaurantId: string) {
    this.restaurantId = restaurantId;
  }

  // Generate unique voucher number
  private async generateVoucherNumber(voucherType: VoucherType): Promise<string> {
    const today = new Date();
    const fiscalYear =
      today.getMonth() >= 6 ? today.getFullYear() : today.getFullYear() - 1;

    const prefix = this.getVoucherPrefix(voucherType);

    const lastVoucher = await prisma.voucher.findFirst({
      where: {
        restaurantId: this.restaurantId,
        voucherNumber: { startsWith: `${prefix}-${fiscalYear}-` },
      },
      orderBy: { voucherNumber: "desc" },
      select: { voucherNumber: true },
    });

    let sequence = 1;
    if (lastVoucher) {
      const match = lastVoucher.voucherNumber.match(
        new RegExp(`${prefix}-\\d+-(\\d+)`)
      );
      if (match && match[1]) {
        sequence = parseInt(match[1]) + 1;
      }
    }

    return `${prefix}-${fiscalYear}-${sequence.toString().padStart(6, "0")}`;
  }

  private getVoucherPrefix(voucherType: VoucherType): string {
    const prefixes: Record<VoucherType, string> = {
      PAYMENT: "PMT",
      RECEIPT: "RCT",
      CONTRA: "CTR",
      JOURNAL: "JRN",
      SALES: "SLS",
      PURCHASE: "PUR",
      CREDIT_NOTE: "CN",
      DEBIT_NOTE: "DN",
    };
    return prefixes[voucherType];
  }

  // Validate double-entry: Total Debits = Total Credits
  validateDoubleEntry(entries: LedgerEntryInput[]): {
    valid: boolean;
    totalDebit: number;
    totalCredit: number;
    difference: number;
    error?: string;
  } {
    let totalDebit = 0;
    let totalCredit = 0;

    for (const entry of entries) {
      totalDebit += entry.debitAmount || 0;
      totalCredit += entry.creditAmount || 0;

      // Each entry should have either debit or credit, not both or neither
      if (entry.debitAmount && entry.creditAmount) {
        return {
          valid: false,
          totalDebit,
          totalCredit,
          difference: Math.abs(totalDebit - totalCredit),
          error: "An entry cannot have both debit and credit amounts",
        };
      }

      if (!entry.debitAmount && !entry.creditAmount) {
        return {
          valid: false,
          totalDebit,
          totalCredit,
          difference: Math.abs(totalDebit - totalCredit),
          error: "Each entry must have either a debit or credit amount",
        };
      }
    }

    const difference = Math.abs(totalDebit - totalCredit);
    // Allow for small rounding errors (0.01)
    const valid = difference < 0.01;

    return {
      valid,
      totalDebit,
      totalCredit,
      difference,
      error: valid ? undefined : `Debits (${totalDebit}) must equal Credits (${totalCredit})`,
    };
  }

  // Create voucher with ledger entries
  async createVoucher(input: CreateVoucherInput) {
    const {
      voucherType,
      voucherDate,
      narration,
      entries,
      referenceType,
      referenceId,
      partyId,
      partyName,
      createdById,
      createdByName,
      autoPost = false,
    } = input;

    // Validate double-entry
    const validation = this.validateDoubleEntry(entries);
    if (!validation.valid) {
      throw new Error(validation.error || "Invalid voucher entries");
    }

    // Validate all accounts exist and belong to restaurant
    const accountIds = entries.map((e) => e.accountId);
    const accounts = await prisma.chartOfAccounts.findMany({
      where: {
        id: { in: accountIds },
        restaurantId: this.restaurantId,
      },
    });

    if (accounts.length !== accountIds.length) {
      throw new Error("One or more accounts not found");
    }

    // Check all accounts allow posting
    const nonPostableAccounts = accounts.filter((a) => !a.allowPosting);
    if (nonPostableAccounts.length > 0) {
      throw new Error(
        `Cannot post to accounts: ${nonPostableAccounts
          .map((a) => a.accountName)
          .join(", ")}`
      );
    }

    // Generate voucher number
    const voucherNumber = await this.generateVoucherNumber(voucherType);

    // Create voucher and entries in transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create voucher
      const voucher = await tx.voucher.create({
        data: {
          restaurantId: this.restaurantId,
          voucherNumber,
          voucherType,
          voucherDate,
          status: autoPost ? "POSTED" : "DRAFT",
          totalAmount: validation.totalDebit,
          narration,
          referenceType,
          referenceId,
          partyId,
          partyName,
          createdById,
          createdByName,
          ...(autoPost && {
            postedById: createdById,
            postedByName: createdByName,
            postedAt: new Date(),
          }),
        },
      });

      // Create ledger entries
      const ledgerEntries = [];
      for (const entry of entries) {
        const account = accounts.find((a) => a.id === entry.accountId)!;

        const ledgerEntry = await tx.ledgerEntry.create({
          data: {
            restaurantId: this.restaurantId,
            voucherId: voucher.id,
            accountId: entry.accountId,
            entryDate: voucherDate,
            debitAmount: entry.debitAmount || 0,
            creditAmount: entry.creditAmount || 0,
            narration: entry.narration || narration,
            costCenterId: entry.costCenterId,
            referenceType: entry.referenceType || referenceType,
            referenceId: entry.referenceId || referenceId,
            isPosted: autoPost,
          },
        });

        ledgerEntries.push(ledgerEntry);

        // Update account balance if posted
        if (autoPost) {
          const balanceChange = this.calculateBalanceChange(
            account.accountGroup,
            entry.debitAmount || 0,
            entry.creditAmount || 0
          );

          await tx.chartOfAccounts.update({
            where: { id: entry.accountId },
            data: {
              currentBalance: { increment: balanceChange },
            },
          });
        }
      }

      return { voucher, ledgerEntries };
    });

    return result;
  }

  // Calculate balance change based on account type
  // Assets & Expenses: Debit increases, Credit decreases
  // Liabilities, Income & Equity: Credit increases, Debit decreases
  private calculateBalanceChange(
    accountGroup: string,
    debitAmount: number,
    creditAmount: number
  ): number {
    const isDebitNormal = ["ASSETS", "EXPENSES"].includes(accountGroup);

    if (isDebitNormal) {
      return debitAmount - creditAmount;
    } else {
      return creditAmount - debitAmount;
    }
  }

  // Post a draft voucher
  async postVoucher(voucherId: string, userId: string, userName: string) {
    const voucher = await prisma.voucher.findFirst({
      where: {
        id: voucherId,
        restaurantId: this.restaurantId,
      },
      include: {
        ledgerEntries: {
          include: {
            account: true,
          },
        },
      },
    });

    if (!voucher) {
      throw new Error("Voucher not found");
    }

    if (voucher.status === "POSTED") {
      throw new Error("Voucher is already posted");
    }

    if (voucher.status === "CANCELLED") {
      throw new Error("Cannot post a cancelled voucher");
    }

    // Update voucher and entries in transaction
    await prisma.$transaction(async (tx) => {
      // Update voucher status
      await tx.voucher.update({
        where: { id: voucherId },
        data: {
          status: "POSTED",
          postedById: userId,
          postedByName: userName,
          postedAt: new Date(),
        },
      });

      // Mark all entries as posted and update account balances
      for (const entry of voucher.ledgerEntries) {
        await tx.ledgerEntry.update({
          where: { id: entry.id },
          data: { isPosted: true },
        });

        const balanceChange = this.calculateBalanceChange(
          entry.account.accountGroup,
          Number(entry.debitAmount),
          Number(entry.creditAmount)
        );

        await tx.chartOfAccounts.update({
          where: { id: entry.accountId },
          data: {
            currentBalance: { increment: balanceChange },
          },
        });
      }
    });

    return { success: true, message: "Voucher posted successfully" };
  }

  // Cancel a voucher (reverse if posted)
  async cancelVoucher(voucherId: string, reason: string, userId: string, userName: string) {
    const voucher = await prisma.voucher.findFirst({
      where: {
        id: voucherId,
        restaurantId: this.restaurantId,
      },
      include: {
        ledgerEntries: {
          include: {
            account: true,
          },
        },
      },
    });

    if (!voucher) {
      throw new Error("Voucher not found");
    }

    if (voucher.status === "CANCELLED") {
      throw new Error("Voucher is already cancelled");
    }

    await prisma.$transaction(async (tx) => {
      // If posted, reverse the account balances
      if (voucher.status === "POSTED") {
        for (const entry of voucher.ledgerEntries) {
          // Reverse the balance change
          const balanceChange = this.calculateBalanceChange(
            entry.account.accountGroup,
            Number(entry.debitAmount),
            Number(entry.creditAmount)
          );

          await tx.chartOfAccounts.update({
            where: { id: entry.accountId },
            data: {
              currentBalance: { decrement: balanceChange },
            },
          });
        }
      }

      // Update voucher status
      await tx.voucher.update({
        where: { id: voucherId },
        data: {
          status: "CANCELLED",
          narration: `${voucher.narration || ""}\n[CANCELLED: ${reason}]`,
        },
      });
    });

    return { success: true, message: "Voucher cancelled successfully" };
  }

  // Get ledger entries for an account
  async getAccountLedger(
    accountId: string,
    options?: {
      startDate?: Date;
      endDate?: Date;
      limit?: number;
      offset?: number;
    }
  ) {
    const where: Record<string, unknown> = {
      restaurantId: this.restaurantId,
      accountId,
      isPosted: true,
    };

    if (options?.startDate || options?.endDate) {
      where.entryDate = {
        ...(options.startDate && { gte: options.startDate }),
        ...(options.endDate && { lte: options.endDate }),
      };
    }

    const [entries, total, account] = await Promise.all([
      prisma.ledgerEntry.findMany({
        where,
        include: {
          voucher: {
            select: {
              voucherNumber: true,
              voucherType: true,
              partyName: true,
            },
          },
        },
        orderBy: [{ entryDate: "asc" }, { createdAt: "asc" }],
        take: options?.limit || 100,
        skip: options?.offset || 0,
      }),
      prisma.ledgerEntry.count({ where }),
      prisma.chartOfAccounts.findUnique({
        where: { id: accountId },
        select: {
          accountCode: true,
          accountName: true,
          accountGroup: true,
          openingBalance: true,
          currentBalance: true,
        },
      }),
    ]);

    // Calculate running balance
    let runningBalance = Number(account?.openingBalance || 0);
    const entriesWithBalance = entries.map((entry) => {
      const change = this.calculateBalanceChange(
        account?.accountGroup || "ASSETS",
        Number(entry.debitAmount),
        Number(entry.creditAmount)
      );
      runningBalance += change;
      return {
        ...entry,
        runningBalance,
      };
    });

    return {
      account,
      entries: entriesWithBalance,
      total,
      summary: {
        totalDebit: entries.reduce((sum, e) => sum + Number(e.debitAmount), 0),
        totalCredit: entries.reduce((sum, e) => sum + Number(e.creditAmount), 0),
        closingBalance: runningBalance,
      },
    };
  }

  // Get day book (all vouchers for a date)
  async getDayBook(date: Date) {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const vouchers = await prisma.voucher.findMany({
      where: {
        restaurantId: this.restaurantId,
        voucherDate: {
          gte: startOfDay,
          lte: endOfDay,
        },
        status: { in: ["POSTED", "DRAFT"] },
      },
      include: {
        ledgerEntries: {
          include: {
            account: {
              select: { accountCode: true, accountName: true },
            },
          },
        },
      },
      orderBy: [{ voucherType: "asc" }, { voucherNumber: "asc" }],
    });

    // Group by voucher type
    const grouped = vouchers.reduce((acc, voucher) => {
      if (!acc[voucher.voucherType]) {
        acc[voucher.voucherType] = [];
      }
      acc[voucher.voucherType].push(voucher);
      return acc;
    }, {} as Record<string, typeof vouchers>);

    const totals = {
      totalVouchers: vouchers.length,
      totalAmount: vouchers.reduce((sum, v) => sum + Number(v.totalAmount), 0),
      byType: Object.entries(grouped).map(([type, voucherList]) => ({
        type,
        count: voucherList.length,
        amount: voucherList.reduce((sum, v) => sum + Number(v.totalAmount), 0),
      })),
    };

    return { vouchers, grouped, totals, date };
  }
}

// Factory function
export function createVoucherService(restaurantId: string): VoucherService {
  return new VoucherService(restaurantId);
}
