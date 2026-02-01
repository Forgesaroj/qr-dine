import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// ═══════════════════════════════════════════════════════════════════════════════
// GET - Trial Balance Report
// Shows all account balances at a point in time
// ═══════════════════════════════════════════════════════════════════════════════

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const asOfDate = searchParams.get("asOfDate");
    const showZeroBalance = searchParams.get("showZeroBalance") === "true";

    // Default to today if no date specified
    const reportDate = asOfDate ? new Date(asOfDate) : new Date();
    reportDate.setHours(23, 59, 59, 999);

    // Get all active accounts with their groups
    const accounts = await prisma.chartOfAccounts.findMany({
      where: {
        restaurantId: session.restaurantId,
        isActive: true,
      },
      orderBy: [{ accountGroup: "asc" }, { accountCode: "asc" }],
    });

    // Calculate balances for each account up to the report date
    const accountBalances = await Promise.all(
      accounts.map(async (account) => {
        // Get sum of all posted entries up to the report date
        const entries = await prisma.ledgerEntry.aggregate({
          where: {
            accountId: account.id,
            isPosted: true,
            entryDate: { lte: reportDate },
          },
          _sum: {
            debitAmount: true,
            creditAmount: true,
          },
        });

        const totalDebit = Number(entries._sum.debitAmount || 0);
        const totalCredit = Number(entries._sum.creditAmount || 0);
        const openingBalance = Number(account.openingBalance || 0);

        // Calculate net balance based on account type
        // Assets & Expenses: Debit normal (positive debit balance)
        // Liabilities, Income & Equity: Credit normal (positive credit balance)
        const isDebitNormal = ["ASSETS", "EXPENSES"].includes(account.accountGroup);

        let debitBalance = 0;
        let creditBalance = 0;

        if (isDebitNormal) {
          const netBalance = openingBalance + totalDebit - totalCredit;
          if (netBalance >= 0) {
            debitBalance = netBalance;
          } else {
            creditBalance = Math.abs(netBalance);
          }
        } else {
          const netBalance = openingBalance + totalCredit - totalDebit;
          if (netBalance >= 0) {
            creditBalance = netBalance;
          } else {
            debitBalance = Math.abs(netBalance);
          }
        }

        return {
          id: account.id,
          accountCode: account.accountCode,
          accountName: account.accountName,
          accountGroup: account.accountGroup,
          accountType: account.accountType,
          openingBalance,
          totalDebit,
          totalCredit,
          debitBalance,
          creditBalance,
        };
      })
    );

    // Filter out zero balances if requested
    const filteredBalances = showZeroBalance
      ? accountBalances
      : accountBalances.filter(
          (a) => a.debitBalance !== 0 || a.creditBalance !== 0
        );

    // Group by account group
    const groupedBalances = filteredBalances.reduce((acc, account) => {
      if (!acc[account.accountGroup]) {
        acc[account.accountGroup] = [];
      }
      acc[account.accountGroup].push(account);
      return acc;
    }, {} as Record<string, typeof filteredBalances>);

    // Calculate totals
    const totalDebitBalance = filteredBalances.reduce(
      (sum, a) => sum + a.debitBalance,
      0
    );
    const totalCreditBalance = filteredBalances.reduce(
      (sum, a) => sum + a.creditBalance,
      0
    );

    // Group totals
    const groupTotals = Object.entries(groupedBalances).map(([group, accounts]) => ({
      group,
      debitTotal: accounts.reduce((sum, a) => sum + a.debitBalance, 0),
      creditTotal: accounts.reduce((sum, a) => sum + a.creditBalance, 0),
      accountCount: accounts.length,
    }));

    return NextResponse.json({
      reportDate: reportDate.toISOString(),
      accounts: filteredBalances,
      grouped: groupedBalances,
      groupTotals,
      totals: {
        totalDebit: totalDebitBalance,
        totalCredit: totalCreditBalance,
        isBalanced: Math.abs(totalDebitBalance - totalCreditBalance) < 0.01,
        difference: Math.abs(totalDebitBalance - totalCreditBalance),
      },
      metadata: {
        totalAccounts: filteredBalances.length,
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Error generating trial balance:", error);
    return NextResponse.json(
      { error: "Failed to generate trial balance" },
      { status: 500 }
    );
  }
}
