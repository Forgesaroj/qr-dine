import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Roles that can manage budgets
const BUDGET_ROLES = ["OWNER", "MANAGER", "ACCOUNTANT"];
const APPROVAL_ROLES = ["OWNER", "MANAGER"];

// ═══════════════════════════════════════════════════════════════════════════════
// GET - Get budget details with variance analysis
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

    const budget = await prisma.budget.findFirst({
      where: {
        id,
        restaurantId: session.restaurantId,
      },
      include: {
        items: {
          include: {
            costCenter: {
              select: { id: true, code: true, name: true },
            },
            account: {
              select: { id: true, accountCode: true, accountName: true },
            },
          },
          orderBy: [{ month: "asc" }, { costCenter: { code: "asc" } }],
        },
      },
    });

    if (!budget) {
      return NextResponse.json(
        { error: "Budget not found" },
        { status: 404 }
      );
    }

    // Calculate actual expenses for variance analysis
    const itemsWithActuals = await Promise.all(
      budget.items.map(async (item) => {
        const startDate = new Date(item.year, item.month - 1, 1);
        const endDate = new Date(item.year, item.month, 0);

        const where: Record<string, unknown> = {
          isPosted: true,
          entryDate: {
            gte: startDate,
            lte: endDate,
          },
        };

        if (item.costCenterId) {
          where.costCenterId = item.costCenterId;
        }

        if (item.accountId) {
          where.accountId = item.accountId;
        }

        const actuals = await prisma.ledgerEntry.aggregate({
          where,
          _sum: {
            debitAmount: true,
          },
        });

        const actualAmount = Number(actuals._sum.debitAmount || 0);
        const budgetAmount = Number(item.amount);
        const variance = budgetAmount - actualAmount;
        const variancePercent =
          budgetAmount > 0 ? (variance / budgetAmount) * 100 : 0;

        return {
          ...item,
          actualAmount,
          variance,
          variancePercent,
          status:
            variance >= 0
              ? "UNDER_BUDGET"
              : variance > -budgetAmount * 0.1
              ? "SLIGHT_OVER"
              : "OVER_BUDGET",
        };
      })
    );

    // Calculate summary by cost center
    const costCenterSummary = itemsWithActuals.reduce((acc, item) => {
      const key = item.costCenterId || "uncategorized";
      if (!acc[key]) {
        acc[key] = {
          costCenter: item.costCenter,
          totalBudget: 0,
          totalActual: 0,
          variance: 0,
        };
      }
      acc[key].totalBudget += Number(item.amount);
      acc[key].totalActual += item.actualAmount;
      acc[key].variance += item.variance;
      return acc;
    }, {} as Record<string, { costCenter: unknown; totalBudget: number; totalActual: number; variance: number }>);

    // Calculate monthly summary
    const monthlySummary = Array.from({ length: 12 }, (_, i) => {
      const monthItems = itemsWithActuals.filter((item) => item.month === i + 1);
      return {
        month: i + 1,
        monthName: new Date(2000, i, 1).toLocaleString("en-US", { month: "short" }),
        budget: monthItems.reduce((sum, item) => sum + Number(item.amount), 0),
        actual: monthItems.reduce((sum, item) => sum + item.actualAmount, 0),
        variance: monthItems.reduce((sum, item) => sum + item.variance, 0),
      };
    });

    // Overall summary
    const totalBudget = itemsWithActuals.reduce(
      (sum, item) => sum + Number(item.amount),
      0
    );
    const totalActual = itemsWithActuals.reduce(
      (sum, item) => sum + item.actualAmount,
      0
    );

    return NextResponse.json({
      budget: {
        ...budget,
        items: itemsWithActuals,
      },
      summary: {
        totalBudget,
        totalActual,
        totalVariance: totalBudget - totalActual,
        variancePercent:
          totalBudget > 0 ? ((totalBudget - totalActual) / totalBudget) * 100 : 0,
      },
      costCenterSummary: Object.values(costCenterSummary),
      monthlySummary,
    });
  } catch (error) {
    console.error("Error fetching budget:", error);
    return NextResponse.json(
      { error: "Failed to fetch budget" },
      { status: 500 }
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// PATCH - Update budget or perform action (approve/reject)
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

    const { id } = await params;
    const body = await request.json();
    const { action, name, description, items } = body;

    // Check if budget exists
    const budget = await prisma.budget.findFirst({
      where: {
        id,
        restaurantId: session.restaurantId,
      },
    });

    if (!budget) {
      return NextResponse.json(
        { error: "Budget not found" },
        { status: 404 }
      );
    }

    // Handle actions
    if (action === "approve") {
      if (!APPROVAL_ROLES.includes(session.role)) {
        return NextResponse.json(
          { error: "You do not have permission to approve budgets" },
          { status: 403 }
        );
      }

      if (budget.status !== "DRAFT" && budget.status !== "PENDING") {
        return NextResponse.json(
          { error: "Only draft or pending budgets can be approved" },
          { status: 400 }
        );
      }

      await prisma.budget.update({
        where: { id },
        data: {
          status: "APPROVED",
          approvedById: session.id,
          approvedByName: session.name || session.email,
          approvedAt: new Date(),
        },
      });

      return NextResponse.json({
        success: true,
        message: "Budget approved successfully",
      });
    }

    if (action === "reject") {
      if (!APPROVAL_ROLES.includes(session.role)) {
        return NextResponse.json(
          { error: "You do not have permission to reject budgets" },
          { status: 403 }
        );
      }

      if (budget.status !== "DRAFT" && budget.status !== "PENDING") {
        return NextResponse.json(
          { error: "Only draft or pending budgets can be rejected" },
          { status: 400 }
        );
      }

      await prisma.budget.update({
        where: { id },
        data: {
          status: "REJECTED",
          approvedById: session.id,
          approvedByName: session.name || session.email,
          approvedAt: new Date(),
        },
      });

      return NextResponse.json({
        success: true,
        message: "Budget rejected",
      });
    }

    if (action === "submit") {
      if (!BUDGET_ROLES.includes(session.role)) {
        return NextResponse.json(
          { error: "You do not have permission to submit budgets" },
          { status: 403 }
        );
      }

      if (budget.status !== "DRAFT") {
        return NextResponse.json(
          { error: "Only draft budgets can be submitted" },
          { status: 400 }
        );
      }

      await prisma.budget.update({
        where: { id },
        data: { status: "PENDING" },
      });

      return NextResponse.json({
        success: true,
        message: "Budget submitted for approval",
      });
    }

    // Regular update (only for draft)
    if (!BUDGET_ROLES.includes(session.role)) {
      return NextResponse.json(
        { error: "You do not have permission to update budgets" },
        { status: 403 }
      );
    }

    if (budget.status !== "DRAFT") {
      return NextResponse.json(
        { error: "Only draft budgets can be updated" },
        { status: 400 }
      );
    }

    // Update budget and items in transaction
    await prisma.$transaction(async (tx) => {
      // Update budget info
      if (name !== undefined || description !== undefined) {
        await tx.budget.update({
          where: { id },
          data: {
            ...(name !== undefined && { name }),
            ...(description !== undefined && { description }),
          },
        });
      }

      // Update items if provided
      if (items && Array.isArray(items)) {
        // Delete existing items and recreate
        await tx.budgetItem.deleteMany({
          where: { budgetId: id },
        });

        for (const item of items) {
          if (!item.costCenterId && !item.accountId) continue;
          if (!item.month || !item.year) continue;

          await tx.budgetItem.create({
            data: {
              budgetId: id,
              costCenterId: item.costCenterId || null,
              accountId: item.accountId || null,
              month: item.month,
              year: item.year,
              amount: item.amount || 0,
              notes: item.notes,
            },
          });
        }
      }
    });

    return NextResponse.json({
      success: true,
      message: "Budget updated successfully",
    });
  } catch (error) {
    console.error("Error updating budget:", error);
    return NextResponse.json(
      { error: "Failed to update budget" },
      { status: 500 }
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// DELETE - Delete draft budget
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

    if (!BUDGET_ROLES.includes(session.role)) {
      return NextResponse.json(
        { error: "You do not have permission to delete budgets" },
        { status: 403 }
      );
    }

    const { id } = await params;

    const budget = await prisma.budget.findFirst({
      where: {
        id,
        restaurantId: session.restaurantId,
      },
    });

    if (!budget) {
      return NextResponse.json(
        { error: "Budget not found" },
        { status: 404 }
      );
    }

    if (budget.status !== "DRAFT") {
      return NextResponse.json(
        { error: "Only draft budgets can be deleted" },
        { status: 400 }
      );
    }

    // Delete items first, then budget
    await prisma.$transaction([
      prisma.budgetItem.deleteMany({
        where: { budgetId: id },
      }),
      prisma.budget.delete({
        where: { id },
      }),
    ]);

    return NextResponse.json({
      success: true,
      message: "Budget deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting budget:", error);
    return NextResponse.json(
      { error: "Failed to delete budget" },
      { status: 500 }
    );
  }
}
