import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Roles that can manage budgets
const BUDGET_ROLES = ["OWNER", "MANAGER", "ACCOUNTANT"];
const APPROVAL_ROLES = ["OWNER", "MANAGER"];

// ═══════════════════════════════════════════════════════════════════════════════
// GET - List budgets
// ═══════════════════════════════════════════════════════════════════════════════

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const fiscalYear = searchParams.get("fiscalYear");
    const status = searchParams.get("status");

    // Build where clause
    const where: Record<string, unknown> = {
      restaurantId: session.restaurantId,
    };

    if (fiscalYear) {
      where.fiscalYear = fiscalYear;
    }

    if (status) {
      where.status = status;
    }

    const budgets = await prisma.budget.findMany({
      where,
      include: {
        items: {
          include: {
            costCenter: {
              select: { code: true, name: true },
            },
            account: {
              select: { accountCode: true, accountName: true },
            },
          },
        },
        _count: {
          select: { items: true },
        },
      },
      orderBy: [{ fiscalYear: "desc" }, { createdAt: "desc" }],
    });

    // Calculate totals for each budget
    const budgetsWithTotals = budgets.map((budget) => {
      const totalBudget = budget.items.reduce(
        (sum, item) => sum + Number(item.amount),
        0
      );

      // Group by month
      const monthlyTotals = Array.from({ length: 12 }, (_, i) => {
        const monthItems = budget.items.filter((item) => item.month === i + 1);
        return {
          month: i + 1,
          amount: monthItems.reduce((sum, item) => sum + Number(item.amount), 0),
        };
      });

      return {
        ...budget,
        totalBudget,
        monthlyTotals,
        itemCount: budget._count.items,
      };
    });

    return NextResponse.json({
      budgets: budgetsWithTotals,
      total: budgets.length,
    });
  } catch (error) {
    console.error("Error fetching budgets:", error);
    return NextResponse.json(
      { error: "Failed to fetch budgets" },
      { status: 500 }
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// POST - Create new budget
// ═══════════════════════════════════════════════════════════════════════════════

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!BUDGET_ROLES.includes(session.role)) {
      return NextResponse.json(
        { error: "You do not have permission to create budgets" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name, fiscalYear, description, items } = body;

    // Validate required fields
    if (!name) {
      return NextResponse.json(
        { error: "Budget name is required" },
        { status: 400 }
      );
    }

    if (!fiscalYear) {
      return NextResponse.json(
        { error: "Fiscal year is required" },
        { status: 400 }
      );
    }

    // Generate budget number
    const lastBudget = await prisma.budget.findFirst({
      where: {
        restaurantId: session.restaurantId,
        budgetNumber: { startsWith: `BUD-${fiscalYear}-` },
      },
      orderBy: { budgetNumber: "desc" },
      select: { budgetNumber: true },
    });

    let sequence = 1;
    if (lastBudget) {
      const match = lastBudget.budgetNumber.match(/BUD-\d+-(\d+)/);
      if (match && match[1]) {
        sequence = parseInt(match[1]) + 1;
      }
    }

    const budgetNumber = `BUD-${fiscalYear}-${sequence.toString().padStart(4, "0")}`;

    // Create budget with items in transaction
    const budget = await prisma.$transaction(async (tx) => {
      // Create budget
      const newBudget = await tx.budget.create({
        data: {
          restaurantId: session.restaurantId,
          budgetNumber,
          name,
          fiscalYear,
          description,
          status: "DRAFT",
          createdById: session.id,
          createdByName: session.name || session.email,
        },
      });

      // Create budget items if provided
      if (items && Array.isArray(items) && items.length > 0) {
        for (const item of items) {
          if (!item.costCenterId && !item.accountId) continue;
          if (!item.month || !item.year) continue;

          await tx.budgetItem.create({
            data: {
              budgetId: newBudget.id,
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

      return newBudget;
    });

    // Fetch complete budget with items
    const completeBudget = await prisma.budget.findUnique({
      where: { id: budget.id },
      include: {
        items: {
          include: {
            costCenter: {
              select: { code: true, name: true },
            },
            account: {
              select: { accountCode: true, accountName: true },
            },
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: "Budget created successfully",
      budget: completeBudget,
    });
  } catch (error) {
    console.error("Error creating budget:", error);
    return NextResponse.json(
      { error: "Failed to create budget" },
      { status: 500 }
    );
  }
}
