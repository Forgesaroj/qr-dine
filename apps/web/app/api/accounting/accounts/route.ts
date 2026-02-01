import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// Roles that can manage accounts
const ACCOUNTS_MANAGEMENT_ROLES = ["OWNER", "MANAGER", "ACCOUNTANT"];

// ═══════════════════════════════════════════════════════════════════════════════
// GET - List chart of accounts
// ═══════════════════════════════════════════════════════════════════════════════

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");
    const accountGroup = searchParams.get("accountGroup");
    const accountType = searchParams.get("accountType");
    const parentId = searchParams.get("parentId");
    const isActive = searchParams.get("isActive");
    const hierarchical = searchParams.get("hierarchical") === "true";

    // Build where clause
    const where: Record<string, unknown> = {
      restaurantId: session.restaurantId,
    };

    if (isActive !== null && isActive !== undefined) {
      where.isActive = isActive === "true";
    }

    if (accountGroup) {
      where.accountGroup = accountGroup;
    }

    if (accountType) {
      where.accountType = accountType;
    }

    if (parentId) {
      where.parentId = parentId;
    }

    if (search) {
      where.OR = [
        { accountCode: { contains: search, mode: "insensitive" } },
        { accountName: { contains: search, mode: "insensitive" } },
        { accountNameLocal: { contains: search, mode: "insensitive" } },
      ];
    }

    // Fetch accounts
    const accounts = await prisma.chartOfAccounts.findMany({
      where,
      orderBy: [{ accountGroup: "asc" }, { accountCode: "asc" }],
      include: {
        parent: {
          select: { id: true, accountCode: true, accountName: true },
        },
        _count: {
          select: { children: true, ledgerEntries: true },
        },
      },
    });

    // If hierarchical view requested, build tree structure
    if (hierarchical) {
      const rootAccounts = accounts.filter((a) => !a.parentId);
      const accountMap = new Map(accounts.map((a) => [a.id, a]));

      const buildTree = (account: typeof accounts[0]): unknown => {
        const children = accounts.filter((a) => a.parentId === account.id);
        return {
          ...account,
          transactionCount: account._count.ledgerEntries,
          children: children.map((child) => buildTree(child)),
        };
      };

      return NextResponse.json({
        accounts: rootAccounts.map((root) => buildTree(root)),
        stats: {
          totalAccounts: accounts.length,
          groupCounts: {
            ASSETS: accounts.filter((a) => a.accountGroup === "ASSETS").length,
            LIABILITIES: accounts.filter((a) => a.accountGroup === "LIABILITIES").length,
            INCOME: accounts.filter((a) => a.accountGroup === "INCOME").length,
            EXPENSES: accounts.filter((a) => a.accountGroup === "EXPENSES").length,
            EQUITY: accounts.filter((a) => a.accountGroup === "EQUITY").length,
          },
        },
      });
    }

    return NextResponse.json({
      accounts: accounts.map((account) => ({
        ...account,
        childrenCount: account._count.children,
        transactionCount: account._count.ledgerEntries,
      })),
      stats: {
        totalAccounts: accounts.length,
      },
    });
  } catch (error) {
    console.error("Error fetching accounts:", error);
    return NextResponse.json(
      { error: "Failed to fetch accounts" },
      { status: 500 }
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// POST - Create new account
// ═══════════════════════════════════════════════════════════════════════════════

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!ACCOUNTS_MANAGEMENT_ROLES.includes(session.role)) {
      return NextResponse.json(
        { error: "You do not have permission to create accounts" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      accountCode,
      accountName,
      accountNameLocal,
      accountGroup,
      accountType,
      parentId,
      isBankAccount,
      isCashAccount,
      isControlAccount,
      allowPosting,
      bankName,
      bankBranch,
      bankAccountNumber,
      openingBalance,
      trackCostCenter,
    } = body;

    // Validate required fields
    if (!accountCode) {
      return NextResponse.json(
        { error: "Account code is required" },
        { status: 400 }
      );
    }

    if (!accountName) {
      return NextResponse.json(
        { error: "Account name is required" },
        { status: 400 }
      );
    }

    if (!accountGroup) {
      return NextResponse.json(
        { error: "Account group is required" },
        { status: 400 }
      );
    }

    if (!accountType) {
      return NextResponse.json(
        { error: "Account type is required" },
        { status: 400 }
      );
    }

    // Check if account code already exists
    const existingAccount = await prisma.chartOfAccounts.findFirst({
      where: {
        restaurantId: session.restaurantId,
        accountCode,
      },
    });

    if (existingAccount) {
      return NextResponse.json(
        { error: "An account with this code already exists" },
        { status: 400 }
      );
    }

    // If parent specified, validate it exists
    let level = 0;
    if (parentId) {
      const parentAccount = await prisma.chartOfAccounts.findFirst({
        where: {
          id: parentId,
          restaurantId: session.restaurantId,
        },
      });

      if (!parentAccount) {
        return NextResponse.json(
          { error: "Parent account not found" },
          { status: 400 }
        );
      }

      level = parentAccount.level + 1;
    }

    // Create account
    const account = await prisma.chartOfAccounts.create({
      data: {
        restaurantId: session.restaurantId,
        accountCode,
        accountName,
        accountNameLocal,
        accountGroup,
        accountType,
        parentId,
        level,
        isBankAccount: isBankAccount || false,
        isCashAccount: isCashAccount || false,
        isControlAccount: isControlAccount || false,
        allowPosting: allowPosting !== false,
        bankName,
        bankBranch,
        bankAccountNumber,
        openingBalance: openingBalance || 0,
        currentBalance: openingBalance || 0,
        trackCostCenter: trackCostCenter || false,
        isActive: true,
      },
      include: {
        parent: {
          select: { id: true, accountCode: true, accountName: true },
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: "Account created successfully",
      account,
    });
  } catch (error) {
    console.error("Error creating account:", error);
    return NextResponse.json(
      { error: "Failed to create account" },
      { status: 500 }
    );
  }
}
