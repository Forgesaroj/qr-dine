import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// ═══════════════════════════════════════════════════════════════════════════════
// GET - Balance Sheet Report
// Assets = Liabilities + Equity
// ═══════════════════════════════════════════════════════════════════════════════

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const asOfDate = searchParams.get("asOfDate");

    // Default to today
    const reportDate = asOfDate ? new Date(asOfDate) : new Date();
    reportDate.setHours(23, 59, 59, 999);

    // Helper to calculate account balances
    const calculateGroupBalances = async (accountGroup: string) => {
      const accounts = await prisma.chartOfAccounts.findMany({
        where: {
          restaurantId: session.restaurantId,
          accountGroup,
          isActive: true,
        },
        orderBy: { accountCode: "asc" },
      });

      const accountBalances = await Promise.all(
        accounts.map(async (account) => {
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

          // Calculate balance based on account nature
          const isDebitNormal = ["ASSETS", "EXPENSES"].includes(accountGroup);
          let balance: number;

          if (isDebitNormal) {
            balance = openingBalance + totalDebit - totalCredit;
          } else {
            balance = openingBalance + totalCredit - totalDebit;
          }

          return {
            id: account.id,
            accountCode: account.accountCode,
            accountName: account.accountName,
            accountType: account.accountType,
            balance,
          };
        })
      );

      // Filter out zero balances
      const nonZeroBalances = accountBalances.filter((a) => a.balance !== 0);

      // Group by account type
      const byType = nonZeroBalances.reduce((acc, account) => {
        if (!acc[account.accountType]) {
          acc[account.accountType] = [];
        }
        acc[account.accountType].push(account);
        return acc;
      }, {} as Record<string, typeof nonZeroBalances>);

      return {
        accounts: nonZeroBalances,
        byType: Object.entries(byType).map(([type, items]) => ({
          type,
          items,
          total: items.reduce((sum, item) => sum + item.balance, 0),
        })),
        total: nonZeroBalances.reduce((sum, a) => sum + a.balance, 0),
      };
    };

    // Calculate retained earnings (Net Profit from P&L)
    // This is simplified - should be cumulative from start of business
    const calculateRetainedEarnings = async () => {
      // Get total income
      const incomeAccounts = await prisma.chartOfAccounts.findMany({
        where: {
          restaurantId: session.restaurantId,
          accountGroup: "INCOME",
        },
        select: { id: true },
      });

      const totalIncome = await prisma.ledgerEntry.aggregate({
        where: {
          accountId: { in: incomeAccounts.map((a) => a.id) },
          isPosted: true,
          entryDate: { lte: reportDate },
        },
        _sum: {
          debitAmount: true,
          creditAmount: true,
        },
      });

      // Get total expenses
      const expenseAccounts = await prisma.chartOfAccounts.findMany({
        where: {
          restaurantId: session.restaurantId,
          accountGroup: "EXPENSES",
        },
        select: { id: true },
      });

      const totalExpenses = await prisma.ledgerEntry.aggregate({
        where: {
          accountId: { in: expenseAccounts.map((a) => a.id) },
          isPosted: true,
          entryDate: { lte: reportDate },
        },
        _sum: {
          debitAmount: true,
          creditAmount: true,
        },
      });

      const income =
        Number(totalIncome._sum.creditAmount || 0) -
        Number(totalIncome._sum.debitAmount || 0);
      const expenses =
        Number(totalExpenses._sum.debitAmount || 0) -
        Number(totalExpenses._sum.creditAmount || 0);

      return income - expenses;
    };

    // Get balances for each section
    const [assets, liabilities, equity, retainedEarnings] = await Promise.all([
      calculateGroupBalances("ASSETS"),
      calculateGroupBalances("LIABILITIES"),
      calculateGroupBalances("EQUITY"),
      calculateRetainedEarnings(),
    ]);

    // Calculate totals
    const totalAssets = assets.total;
    const totalLiabilities = liabilities.total;
    const totalEquityWithRetained = equity.total + retainedEarnings;

    // The accounting equation: Assets = Liabilities + Equity
    const isBalanced =
      Math.abs(totalAssets - (totalLiabilities + totalEquityWithRetained)) < 0.01;

    return NextResponse.json({
      asOfDate: reportDate.toISOString(),
      assets: {
        ...assets,
        sections: assets.byType,
      },
      liabilities: {
        ...liabilities,
        sections: liabilities.byType,
      },
      equity: {
        accounts: equity.accounts,
        sections: equity.byType,
        retainedEarnings,
        total: totalEquityWithRetained,
      },
      summary: {
        totalAssets,
        totalLiabilities,
        totalEquity: equity.total,
        retainedEarnings,
        totalLiabilitiesAndEquity: totalLiabilities + totalEquityWithRetained,
        isBalanced,
        difference: Math.abs(totalAssets - (totalLiabilities + totalEquityWithRetained)),
      },
      metadata: {
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Error generating balance sheet:", error);
    return NextResponse.json(
      { error: "Failed to generate balance sheet" },
      { status: 500 }
    );
  }
}
