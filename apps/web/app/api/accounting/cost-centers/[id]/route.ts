import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Roles that can manage cost centers
const ACCOUNTING_ROLES = ["OWNER", "MANAGER", "ACCOUNTANT"];

// ═══════════════════════════════════════════════════════════════════════════════
// GET - Get cost center details with expenses
// ═══════════════════════════════════════════════════════════════════════════════

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const year = parseInt(searchParams.get("year") || new Date().getFullYear().toString());

    const costCenter = await prisma.costCenter.findFirst({
      where: {
        id,
        restaurantId: session.restaurantId,
      },
    });

    if (!costCenter) {
      return NextResponse.json(
        { error: "Cost center not found" },
        { status: 404 }
      );
    }

    // Get monthly expenses for the year
    const monthlyExpenses = await Promise.all(
      Array.from({ length: 12 }, async (_, i) => {
        const month = i + 1;
        const startDate = new Date(year, i, 1);
        const endDate = new Date(year, i + 1, 0);

        const expenses = await prisma.ledgerEntry.aggregate({
          where: {
            costCenterId: id,
            isPosted: true,
            entryDate: {
              gte: startDate,
              lte: endDate,
            },
          },
          _sum: {
            debitAmount: true,
            creditAmount: true,
          },
        });

        // Get budget for this month
        const budget = await prisma.budgetItem.findFirst({
          where: {
            costCenterId: id,
            month,
            year,
            budget: {
              status: "APPROVED",
            },
          },
          select: { amount: true },
        });

        return {
          month,
          monthName: new Date(year, i, 1).toLocaleString("en-US", { month: "short" }),
          expenses: Number(expenses._sum.debitAmount || 0),
          income: Number(expenses._sum.creditAmount || 0),
          budget: Number(budget?.amount || 0),
          variance: Number(budget?.amount || 0) - Number(expenses._sum.debitAmount || 0),
        };
      })
    );

    // Get recent transactions
    const recentTransactions = await prisma.ledgerEntry.findMany({
      where: {
        costCenterId: id,
        isPosted: true,
      },
      include: {
        account: {
          select: { accountCode: true, accountName: true },
        },
        voucher: {
          select: { voucherNumber: true, voucherType: true, partyName: true },
        },
      },
      orderBy: { entryDate: "desc" },
      take: 20,
    });

    // Calculate totals
    const yearTotal = monthlyExpenses.reduce((sum, m) => sum + m.expenses, 0);
    const yearBudget = monthlyExpenses.reduce((sum, m) => sum + m.budget, 0);

    return NextResponse.json({
      costCenter,
      monthlyExpenses,
      recentTransactions,
      summary: {
        yearTotal,
        yearBudget,
        yearVariance: yearBudget - yearTotal,
        transactionCount: recentTransactions.length,
      },
    });
  } catch (error) {
    console.error("Error fetching cost center:", error);
    return NextResponse.json(
      { error: "Failed to fetch cost center" },
      { status: 500 }
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// PATCH - Update cost center
// ═══════════════════════════════════════════════════════════════════════════════

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!ACCOUNTING_ROLES.includes(session.role)) {
      return NextResponse.json(
        { error: "You do not have permission to update cost centers" },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const { code, name, description, type, managerId, managerName, isActive } = body;

    // Check if cost center exists
    const costCenter = await prisma.costCenter.findFirst({
      where: {
        id,
        restaurantId: session.restaurantId,
      },
    });

    if (!costCenter) {
      return NextResponse.json(
        { error: "Cost center not found" },
        { status: 404 }
      );
    }

    // If code is being changed, check for uniqueness
    if (code && code.toUpperCase() !== costCenter.code) {
      const existingCode = await prisma.costCenter.findFirst({
        where: {
          restaurantId: session.restaurantId,
          code: code.toUpperCase(),
          id: { not: id },
        },
      });

      if (existingCode) {
        return NextResponse.json(
          { error: "A cost center with this code already exists" },
          { status: 400 }
        );
      }
    }

    // Update cost center
    const updatedCostCenter = await prisma.costCenter.update({
      where: { id },
      data: {
        ...(code !== undefined && { code: code.toUpperCase() }),
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(type !== undefined && { type }),
        ...(managerId !== undefined && { managerId }),
        ...(managerName !== undefined && { managerName }),
        ...(isActive !== undefined && { isActive }),
      },
    });

    return NextResponse.json({
      success: true,
      message: "Cost center updated successfully",
      costCenter: updatedCostCenter,
    });
  } catch (error) {
    console.error("Error updating cost center:", error);
    return NextResponse.json(
      { error: "Failed to update cost center" },
      { status: 500 }
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// DELETE - Delete cost center (only if no transactions)
// ═══════════════════════════════════════════════════════════════════════════════

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!ACCOUNTING_ROLES.includes(session.role)) {
      return NextResponse.json(
        { error: "You do not have permission to delete cost centers" },
        { status: 403 }
      );
    }

    const { id } = await params;

    // Check if cost center exists and has transactions
    const costCenter = await prisma.costCenter.findFirst({
      where: {
        id,
        restaurantId: session.restaurantId,
      },
      include: {
        _count: {
          select: { ledgerEntries: true },
        },
      },
    });

    if (!costCenter) {
      return NextResponse.json(
        { error: "Cost center not found" },
        { status: 404 }
      );
    }

    if (costCenter._count.ledgerEntries > 0) {
      return NextResponse.json(
        {
          error: `Cannot delete cost center with ${costCenter._count.ledgerEntries} transactions. Deactivate instead.`,
        },
        { status: 400 }
      );
    }

    // Delete budget items first, then cost center
    await prisma.$transaction([
      prisma.budgetItem.deleteMany({
        where: { costCenterId: id },
      }),
      prisma.costCenter.delete({
        where: { id },
      }),
    ]);

    return NextResponse.json({
      success: true,
      message: "Cost center deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting cost center:", error);
    return NextResponse.json(
      { error: "Failed to delete cost center" },
      { status: 500 }
    );
  }
}
