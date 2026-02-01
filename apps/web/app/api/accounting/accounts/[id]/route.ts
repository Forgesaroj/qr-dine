import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// Roles that can manage accounts
const ACCOUNTS_MANAGEMENT_ROLES = ["OWNER", "MANAGER", "ACCOUNTANT"];

// ═══════════════════════════════════════════════════════════════════════════════
// GET - Get account details with ledger entries
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
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = (page - 1) * limit;

    const account = await prisma.chartOfAccounts.findFirst({
      where: {
        id,
        restaurantId: session.restaurantId,
      },
      include: {
        parent: {
          select: { id: true, accountCode: true, accountName: true },
        },
        children: {
          select: {
            id: true,
            accountCode: true,
            accountName: true,
            currentBalance: true,
            isActive: true,
          },
          orderBy: { accountCode: "asc" },
        },
      },
    });

    if (!account) {
      return NextResponse.json(
        { error: "Account not found" },
        { status: 404 }
      );
    }

    // Build ledger entries query
    const ledgerWhere: Record<string, unknown> = {
      accountId: id,
    };

    if (startDate || endDate) {
      ledgerWhere.voucher = {
        voucherDate: {
          ...(startDate && { gte: new Date(startDate) }),
          ...(endDate && { lte: new Date(endDate) }),
        },
      };
    }

    // Fetch ledger entries
    const [ledgerEntries, totalEntries] = await Promise.all([
      prisma.ledgerEntry.findMany({
        where: ledgerWhere,
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
        include: {
          voucher: {
            select: {
              id: true,
              voucherNumber: true,
              voucherType: true,
              voucherDate: true,
              narration: true,
              status: true,
            },
          },
          costCenter: {
            select: { id: true, code: true, name: true },
          },
        },
      }),
      prisma.ledgerEntry.count({ where: ledgerWhere }),
    ]);

    // Calculate totals
    const totals = await prisma.ledgerEntry.aggregate({
      where: ledgerWhere,
      _sum: {
        debitAmount: true,
        creditAmount: true,
      },
    });

    return NextResponse.json({
      account,
      ledgerEntries,
      pagination: {
        page,
        limit,
        total: totalEntries,
        totalPages: Math.ceil(totalEntries / limit),
      },
      summary: {
        totalDebit: totals._sum.debitAmount || 0,
        totalCredit: totals._sum.creditAmount || 0,
        netBalance: Number(totals._sum.debitAmount || 0) - Number(totals._sum.creditAmount || 0),
      },
    });
  } catch (error) {
    console.error("Error fetching account:", error);
    return NextResponse.json(
      { error: "Failed to fetch account" },
      { status: 500 }
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// PATCH - Update account
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

    if (!ACCOUNTS_MANAGEMENT_ROLES.includes(session.role)) {
      return NextResponse.json(
        { error: "You do not have permission to update accounts" },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await request.json();

    // Check if account exists
    const existingAccount = await prisma.chartOfAccounts.findFirst({
      where: {
        id,
        restaurantId: session.restaurantId,
      },
    });

    if (!existingAccount) {
      return NextResponse.json(
        { error: "Account not found" },
        { status: 404 }
      );
    }

    const {
      accountName,
      accountNameLocal,
      isBankAccount,
      isCashAccount,
      isControlAccount,
      allowPosting,
      bankName,
      bankBranch,
      bankAccountNumber,
      trackCostCenter,
      isActive,
    } = body;

    // Update account
    const account = await prisma.chartOfAccounts.update({
      where: { id },
      data: {
        accountName,
        accountNameLocal,
        isBankAccount,
        isCashAccount,
        isControlAccount,
        allowPosting,
        bankName,
        bankBranch,
        bankAccountNumber,
        trackCostCenter,
        isActive,
      },
      include: {
        parent: {
          select: { id: true, accountCode: true, accountName: true },
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: "Account updated successfully",
      account,
    });
  } catch (error) {
    console.error("Error updating account:", error);
    return NextResponse.json(
      { error: "Failed to update account" },
      { status: 500 }
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// DELETE - Deactivate account (soft delete)
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

    if (!ACCOUNTS_MANAGEMENT_ROLES.includes(session.role)) {
      return NextResponse.json(
        { error: "You do not have permission to delete accounts" },
        { status: 403 }
      );
    }

    const { id } = await params;

    // Check if account exists
    const existingAccount = await prisma.chartOfAccounts.findFirst({
      where: {
        id,
        restaurantId: session.restaurantId,
      },
      include: {
        _count: {
          select: { ledgerEntries: true, children: true },
        },
      },
    });

    if (!existingAccount) {
      return NextResponse.json(
        { error: "Account not found" },
        { status: 404 }
      );
    }

    // Check if account has transactions
    if (existingAccount._count.ledgerEntries > 0) {
      return NextResponse.json(
        { error: "Cannot delete account with existing transactions" },
        { status: 400 }
      );
    }

    // Check if account has children
    if (existingAccount._count.children > 0) {
      return NextResponse.json(
        { error: "Cannot delete account with child accounts" },
        { status: 400 }
      );
    }

    // Soft delete - mark as inactive
    await prisma.chartOfAccounts.update({
      where: { id },
      data: { isActive: false },
    });

    return NextResponse.json({
      success: true,
      message: "Account deactivated successfully",
    });
  } catch (error) {
    console.error("Error deleting account:", error);
    return NextResponse.json(
      { error: "Failed to delete account" },
      { status: 500 }
    );
  }
}
