import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// ═══════════════════════════════════════════════════════════════════════════════
// GET - Cash Flow Statement
// Shows cash inflows and outflows for a period
// ═══════════════════════════════════════════════════════════════════════════════

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    // Default to current month
    const today = new Date();
    const periodStart = startDate
      ? new Date(startDate)
      : new Date(today.getFullYear(), today.getMonth(), 1);
    periodStart.setHours(0, 0, 0, 0);

    const periodEnd = endDate ? new Date(endDate) : today;
    periodEnd.setHours(23, 59, 59, 999);

    // Get Cash and Bank accounts (typically under "Cash and Bank" type)
    const cashAccounts = await prisma.chartOfAccounts.findMany({
      where: {
        restaurantId: session.restaurantId,
        accountGroup: "ASSETS",
        accountType: { in: ["Cash and Bank", "Cash", "Bank"] },
        isActive: true,
      },
    });

    const cashAccountIds = cashAccounts.map((a) => a.id);

    // Calculate opening cash balance (before period start)
    const openingBalance = await calculateCashBalance(
      cashAccountIds,
      cashAccounts,
      new Date(periodStart.getTime() - 1)
    );

    // Get all cash-related vouchers in the period
    const cashVouchers = await prisma.voucher.findMany({
      where: {
        restaurantId: session.restaurantId,
        status: "POSTED",
        voucherDate: {
          gte: periodStart,
          lte: periodEnd,
        },
        ledgerEntries: {
          some: {
            accountId: { in: cashAccountIds },
          },
        },
      },
      include: {
        ledgerEntries: {
          include: {
            account: {
              select: {
                accountCode: true,
                accountName: true,
                accountGroup: true,
                accountType: true,
              },
            },
          },
        },
      },
      orderBy: { voucherDate: "asc" },
    });

    // Categorize cash flows
    const operatingActivities: Array<{
      date: Date;
      voucherNumber: string;
      voucherType: string;
      description: string;
      inflow: number;
      outflow: number;
    }> = [];

    const investingActivities: Array<{
      date: Date;
      voucherNumber: string;
      voucherType: string;
      description: string;
      inflow: number;
      outflow: number;
    }> = [];

    const financingActivities: Array<{
      date: Date;
      voucherNumber: string;
      voucherType: string;
      description: string;
      inflow: number;
      outflow: number;
    }> = [];

    for (const voucher of cashVouchers) {
      // Find cash entries in this voucher
      const cashEntries = voucher.ledgerEntries.filter((e) =>
        cashAccountIds.includes(e.accountId)
      );

      // Find non-cash entries to determine the nature
      const nonCashEntries = voucher.ledgerEntries.filter(
        (e) => !cashAccountIds.includes(e.accountId)
      );

      for (const cashEntry of cashEntries) {
        const inflow = Number(cashEntry.debitAmount) || 0;
        const outflow = Number(cashEntry.creditAmount) || 0;

        if (inflow === 0 && outflow === 0) continue;

        // Determine the counter account to categorize the flow
        const counterEntry = nonCashEntries[0];
        const counterAccountGroup = counterEntry?.account?.accountGroup;
        const counterAccountType = counterEntry?.account?.accountType;

        const flowItem = {
          date: voucher.voucherDate,
          voucherNumber: voucher.voucherNumber,
          voucherType: voucher.voucherType,
          description:
            voucher.narration ||
            (counterEntry ? counterEntry.account.accountName : "Cash transaction"),
          inflow,
          outflow,
        };

        // Categorize based on counter account
        if (counterAccountGroup === "ASSETS" && counterAccountType?.includes("Fixed")) {
          // Fixed asset transactions are investing activities
          investingActivities.push(flowItem);
        } else if (
          counterAccountGroup === "LIABILITIES" &&
          counterAccountType?.includes("Long-term")
        ) {
          // Long-term liability transactions are financing activities
          financingActivities.push(flowItem);
        } else if (counterAccountGroup === "EQUITY") {
          // Equity transactions are financing activities
          financingActivities.push(flowItem);
        } else {
          // Everything else is operating activities
          operatingActivities.push(flowItem);
        }
      }
    }

    // Calculate totals
    const operatingInflow = operatingActivities.reduce((sum, a) => sum + a.inflow, 0);
    const operatingOutflow = operatingActivities.reduce((sum, a) => sum + a.outflow, 0);
    const netOperating = operatingInflow - operatingOutflow;

    const investingInflow = investingActivities.reduce((sum, a) => sum + a.inflow, 0);
    const investingOutflow = investingActivities.reduce((sum, a) => sum + a.outflow, 0);
    const netInvesting = investingInflow - investingOutflow;

    const financingInflow = financingActivities.reduce((sum, a) => sum + a.inflow, 0);
    const financingOutflow = financingActivities.reduce((sum, a) => sum + a.outflow, 0);
    const netFinancing = financingInflow - financingOutflow;

    const netCashFlow = netOperating + netInvesting + netFinancing;
    const closingBalance = openingBalance + netCashFlow;

    // Daily cash flow for chart
    const dailyCashFlow = cashVouchers.reduce((acc, voucher) => {
      const dateKey = new Date(voucher.voucherDate).toISOString().split("T")[0];
      if (!acc[dateKey]) {
        acc[dateKey] = { inflow: 0, outflow: 0 };
      }

      const cashEntries = voucher.ledgerEntries.filter((e) =>
        cashAccountIds.includes(e.accountId)
      );

      for (const entry of cashEntries) {
        acc[dateKey].inflow += Number(entry.debitAmount) || 0;
        acc[dateKey].outflow += Number(entry.creditAmount) || 0;
      }

      return acc;
    }, {} as Record<string, { inflow: number; outflow: number }>);

    return NextResponse.json({
      period: {
        startDate: periodStart.toISOString(),
        endDate: periodEnd.toISOString(),
      },
      openingBalance,
      operating: {
        activities: operatingActivities,
        totalInflow: operatingInflow,
        totalOutflow: operatingOutflow,
        netCashFlow: netOperating,
      },
      investing: {
        activities: investingActivities,
        totalInflow: investingInflow,
        totalOutflow: investingOutflow,
        netCashFlow: netInvesting,
      },
      financing: {
        activities: financingActivities,
        totalInflow: financingInflow,
        totalOutflow: financingOutflow,
        netCashFlow: netFinancing,
      },
      summary: {
        netOperating,
        netInvesting,
        netFinancing,
        netCashFlow,
        openingBalance,
        closingBalance,
      },
      dailyCashFlow: Object.entries(dailyCashFlow)
        .map(([date, data]) => ({
          date,
          ...data,
          net: data.inflow - data.outflow,
        }))
        .sort((a, b) => a.date.localeCompare(b.date)),
      metadata: {
        cashAccounts: cashAccounts.map((a) => ({
          accountCode: a.accountCode,
          accountName: a.accountName,
        })),
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Error generating cash flow:", error);
    return NextResponse.json(
      { error: "Failed to generate cash flow statement" },
      { status: 500 }
    );
  }
}

// Helper function to calculate cash balance up to a date
async function calculateCashBalance(
  cashAccountIds: string[],
  cashAccounts: Array<{ id: string; openingBalance: unknown }>,
  asOfDate: Date
): Promise<number> {
  if (cashAccountIds.length === 0) return 0;

  const entries = await prisma.ledgerEntry.aggregate({
    where: {
      accountId: { in: cashAccountIds },
      isPosted: true,
      entryDate: { lte: asOfDate },
    },
    _sum: {
      debitAmount: true,
      creditAmount: true,
    },
  });

  const openingBalances = cashAccounts.reduce(
    (sum, a) => sum + Number(a.openingBalance || 0),
    0
  );

  const totalDebit = Number(entries._sum.debitAmount || 0);
  const totalCredit = Number(entries._sum.creditAmount || 0);

  // Cash accounts are debit normal
  return openingBalances + totalDebit - totalCredit;
}
