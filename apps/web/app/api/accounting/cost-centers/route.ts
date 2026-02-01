import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Roles that can manage cost centers
const ACCOUNTING_ROLES = ["OWNER", "MANAGER", "ACCOUNTANT"];

// ═══════════════════════════════════════════════════════════════════════════════
// GET - List all cost centers
// ═══════════════════════════════════════════════════════════════════════════════

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const includeStats = searchParams.get("includeStats") === "true";
    const isActive = searchParams.get("isActive");

    // Build where clause
    const where: Record<string, unknown> = {
      restaurantId: session.restaurantId,
    };

    if (isActive !== null && isActive !== undefined) {
      where.isActive = isActive === "true";
    }

    const costCenters = await prisma.costCenter.findMany({
      where,
      orderBy: [{ code: "asc" }],
      include: {
        _count: {
          select: { ledgerEntries: true, budgetItems: true },
        },
      },
    });

    // If stats requested, calculate totals for each cost center
    let costCentersWithStats = costCenters;

    if (includeStats) {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

      costCentersWithStats = await Promise.all(
        costCenters.map(async (cc) => {
          // Get this month's expenses
          const monthlyExpenses = await prisma.ledgerEntry.aggregate({
            where: {
              costCenterId: cc.id,
              isPosted: true,
              entryDate: {
                gte: startOfMonth,
                lte: endOfMonth,
              },
            },
            _sum: {
              debitAmount: true,
            },
          });

          // Get this month's budget
          const monthlyBudget = await prisma.budgetItem.findFirst({
            where: {
              costCenterId: cc.id,
              month: now.getMonth() + 1,
              year: now.getFullYear(),
              budget: {
                status: "APPROVED",
              },
            },
            select: { amount: true },
          });

          return {
            ...cc,
            transactionCount: cc._count.ledgerEntries,
            budgetCount: cc._count.budgetItems,
            monthlyExpenses: Number(monthlyExpenses._sum.debitAmount || 0),
            monthlyBudget: Number(monthlyBudget?.amount || 0),
          };
        })
      );
    }

    return NextResponse.json({
      costCenters: costCentersWithStats,
      total: costCenters.length,
    });
  } catch (error) {
    console.error("Error fetching cost centers:", error);
    return NextResponse.json(
      { error: "Failed to fetch cost centers" },
      { status: 500 }
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// POST - Create new cost center
// ═══════════════════════════════════════════════════════════════════════════════

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!ACCOUNTING_ROLES.includes(session.role)) {
      return NextResponse.json(
        { error: "You do not have permission to create cost centers" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { code, name, description, type, managerId, managerName } = body;

    // Validate required fields
    if (!code) {
      return NextResponse.json(
        { error: "Cost center code is required" },
        { status: 400 }
      );
    }

    if (!name) {
      return NextResponse.json(
        { error: "Cost center name is required" },
        { status: 400 }
      );
    }

    // Check if code already exists
    const existingCode = await prisma.costCenter.findFirst({
      where: {
        restaurantId: session.restaurantId,
        code: code.toUpperCase(),
      },
    });

    if (existingCode) {
      return NextResponse.json(
        { error: "A cost center with this code already exists" },
        { status: 400 }
      );
    }

    // Create cost center
    const costCenter = await prisma.costCenter.create({
      data: {
        restaurantId: session.restaurantId,
        code: code.toUpperCase(),
        name,
        description,
        type: type || "DEPARTMENT",
        managerId,
        managerName,
        isActive: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Cost center created successfully",
      costCenter,
    });
  } catch (error) {
    console.error("Error creating cost center:", error);
    return NextResponse.json(
      { error: "Failed to create cost center" },
      { status: 500 }
    );
  }
}
