import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// ═══════════════════════════════════════════════════════════════════════════════
// GET - Profit & Loss Statement
// Shows Income vs Expenses for a period
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
    const costCenterId = searchParams.get("costCenterId");

    // Default to current fiscal year (July to June)
    const today = new Date();
    const fiscalYearStart = new Date(
      today.getMonth() >= 6 ? today.getFullYear() : today.getFullYear() - 1,
      6, // July
      1
    );

    const periodStart = startDate ? new Date(startDate) : fiscalYearStart;
    periodStart.setHours(0, 0, 0, 0);

    const periodEnd = endDate ? new Date(endDate) : today;
    periodEnd.setHours(23, 59, 59, 999);

    // Get all income accounts
    const incomeAccounts = await prisma.chartOfAccounts.findMany({
      where: {
        restaurantId: session.restaurantId,
        accountGroup: "INCOME",
        isActive: true,
      },
      orderBy: { accountCode: "asc" },
    });

    // Get all expense accounts
    const expenseAccounts = await prisma.chartOfAccounts.findMany({
      where: {
        restaurantId: session.restaurantId,
        accountGroup: "EXPENSES",
        isActive: true,
      },
      orderBy: { accountCode: "asc" },
    });

    // Build where clause for ledger entries
    const buildWhere = (accountId: string) => {
      const where: Record<string, unknown> = {
        accountId,
        isPosted: true,
        entryDate: {
          gte: periodStart,
          lte: periodEnd,
        },
      };

      if (costCenterId) {
        where.costCenterId = costCenterId;
      }

      return where;
    };

    // Calculate income totals
    const incomeItems = await Promise.all(
      incomeAccounts.map(async (account) => {
        const entries = await prisma.ledgerEntry.aggregate({
          where: buildWhere(account.id),
          _sum: {
            debitAmount: true,
            creditAmount: true,
          },
        });

        const debit = Number(entries._sum.debitAmount || 0);
        const credit = Number(entries._sum.creditAmount || 0);
        // Income accounts: Credit increases, Debit decreases
        const amount = credit - debit;

        return {
          id: account.id,
          accountCode: account.accountCode,
          accountName: account.accountName,
          accountType: account.accountType,
          amount,
        };
      })
    );

    // Calculate expense totals
    const expenseItems = await Promise.all(
      expenseAccounts.map(async (account) => {
        const entries = await prisma.ledgerEntry.aggregate({
          where: buildWhere(account.id),
          _sum: {
            debitAmount: true,
            creditAmount: true,
          },
        });

        const debit = Number(entries._sum.debitAmount || 0);
        const credit = Number(entries._sum.creditAmount || 0);
        // Expense accounts: Debit increases, Credit decreases
        const amount = debit - credit;

        return {
          id: account.id,
          accountCode: account.accountCode,
          accountName: account.accountName,
          accountType: account.accountType,
          amount,
        };
      })
    );

    // Filter out zero amounts
    const filteredIncome = incomeItems.filter((item) => item.amount !== 0);
    const filteredExpenses = expenseItems.filter((item) => item.amount !== 0);

    // Group income by type
    const incomeByType = filteredIncome.reduce((acc, item) => {
      if (!acc[item.accountType]) {
        acc[item.accountType] = [];
      }
      acc[item.accountType].push(item);
      return acc;
    }, {} as Record<string, typeof filteredIncome>);

    // Group expenses by type
    const expensesByType = filteredExpenses.reduce((acc, item) => {
      if (!acc[item.accountType]) {
        acc[item.accountType] = [];
      }
      acc[item.accountType].push(item);
      return acc;
    }, {} as Record<string, typeof filteredExpenses>);

    // Calculate totals
    const totalIncome = filteredIncome.reduce((sum, item) => sum + item.amount, 0);
    const totalExpenses = filteredExpenses.reduce((sum, item) => sum + item.amount, 0);
    const netProfit = totalIncome - totalExpenses;

    // Calculate percentage breakdowns
    const incomeBreakdown = Object.entries(incomeByType).map(([type, items]) => ({
      type,
      total: items.reduce((sum, item) => sum + item.amount, 0),
      percentage:
        totalIncome > 0
          ? (items.reduce((sum, item) => sum + item.amount, 0) / totalIncome) * 100
          : 0,
      items,
    }));

    const expenseBreakdown = Object.entries(expensesByType).map(([type, items]) => ({
      type,
      total: items.reduce((sum, item) => sum + item.amount, 0),
      percentage:
        totalExpenses > 0
          ? (items.reduce((sum, item) => sum + item.amount, 0) / totalExpenses) * 100
          : 0,
      items,
    }));

    // Cost center info if filtered
    let costCenter = null;
    if (costCenterId) {
      costCenter = await prisma.costCenter.findUnique({
        where: { id: costCenterId },
        select: { code: true, name: true },
      });
    }

    return NextResponse.json({
      period: {
        startDate: periodStart.toISOString(),
        endDate: periodEnd.toISOString(),
      },
      costCenter,
      income: {
        items: filteredIncome,
        byType: incomeBreakdown,
        total: totalIncome,
      },
      expenses: {
        items: filteredExpenses,
        byType: expenseBreakdown,
        total: totalExpenses,
      },
      summary: {
        totalIncome,
        totalExpenses,
        netProfit,
        profitMargin: totalIncome > 0 ? (netProfit / totalIncome) * 100 : 0,
        isProfitable: netProfit >= 0,
      },
      metadata: {
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Error generating P&L:", error);
    return NextResponse.json(
      { error: "Failed to generate profit & loss statement" },
      { status: 500 }
    );
  }
}
