import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createVoucherService } from "@/lib/services/accounting/voucher.service";

// Roles that can manage vouchers
const ACCOUNTING_ROLES = ["OWNER", "MANAGER", "ACCOUNTANT"];

// ═══════════════════════════════════════════════════════════════════════════════
// GET - List vouchers with filters
// ═══════════════════════════════════════════════════════════════════════════════

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const voucherType = searchParams.get("voucherType");
    const status = searchParams.get("status");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const search = searchParams.get("search");
    const limit = parseInt(searchParams.get("limit") || "20");
    const offset = parseInt(searchParams.get("offset") || "0");

    // Build where clause
    const where: Record<string, unknown> = {
      restaurantId: session.restaurantId,
    };

    if (voucherType) {
      where.voucherType = voucherType;
    }

    if (status) {
      where.status = status;
    }

    if (startDate || endDate) {
      where.voucherDate = {
        ...(startDate && { gte: new Date(startDate) }),
        ...(endDate && { lte: new Date(endDate) }),
      };
    }

    if (search) {
      where.OR = [
        { voucherNumber: { contains: search, mode: "insensitive" } },
        { narration: { contains: search, mode: "insensitive" } },
        { partyName: { contains: search, mode: "insensitive" } },
      ];
    }

    const [vouchers, total] = await Promise.all([
      prisma.voucher.findMany({
        where,
        include: {
          ledgerEntries: {
            include: {
              account: {
                select: { accountCode: true, accountName: true },
              },
            },
            take: 5, // Limit entries in list view
          },
          _count: {
            select: { ledgerEntries: true },
          },
        },
        orderBy: [{ voucherDate: "desc" }, { createdAt: "desc" }],
        take: limit,
        skip: offset,
      }),
      prisma.voucher.count({ where }),
    ]);

    // Calculate stats
    const stats = await prisma.voucher.groupBy({
      by: ["voucherType"],
      where: {
        restaurantId: session.restaurantId,
        ...(startDate || endDate
          ? {
              voucherDate: {
                ...(startDate && { gte: new Date(startDate) }),
                ...(endDate && { lte: new Date(endDate) }),
              },
            }
          : {}),
      },
      _count: true,
      _sum: {
        totalAmount: true,
      },
    });

    return NextResponse.json({
      vouchers,
      pagination: {
        total,
        limit,
        offset,
        pages: Math.ceil(total / limit),
      },
      stats: stats.map((s) => ({
        type: s.voucherType,
        count: s._count,
        totalAmount: s._sum.totalAmount,
      })),
    });
  } catch (error) {
    console.error("Error fetching vouchers:", error);
    return NextResponse.json(
      { error: "Failed to fetch vouchers" },
      { status: 500 }
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// POST - Create new voucher
// ═══════════════════════════════════════════════════════════════════════════════

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!ACCOUNTING_ROLES.includes(session.role)) {
      return NextResponse.json(
        { error: "You do not have permission to create vouchers" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      voucherType,
      voucherDate,
      narration,
      entries,
      referenceType,
      referenceId,
      partyId,
      partyName,
      autoPost,
    } = body;

    // Validate required fields
    if (!voucherType) {
      return NextResponse.json(
        { error: "Voucher type is required" },
        { status: 400 }
      );
    }

    if (!voucherDate) {
      return NextResponse.json(
        { error: "Voucher date is required" },
        { status: 400 }
      );
    }

    if (!entries || !Array.isArray(entries) || entries.length < 2) {
      return NextResponse.json(
        { error: "At least 2 ledger entries are required" },
        { status: 400 }
      );
    }

    // Create voucher using service
    const voucherService = createVoucherService(session.restaurantId);

    // Validate entries first
    const validation = voucherService.validateDoubleEntry(entries);
    if (!validation.valid) {
      return NextResponse.json(
        {
          error: validation.error,
          details: {
            totalDebit: validation.totalDebit,
            totalCredit: validation.totalCredit,
            difference: validation.difference,
          },
        },
        { status: 400 }
      );
    }

    const result = await voucherService.createVoucher({
      voucherType,
      voucherDate: new Date(voucherDate),
      narration,
      entries,
      referenceType,
      referenceId,
      partyId,
      partyName,
      createdById: session.id,
      createdByName: session.name || session.email,
      autoPost: autoPost || false,
    });

    return NextResponse.json({
      success: true,
      message: autoPost
        ? "Voucher created and posted successfully"
        : "Voucher created as draft",
      voucher: result.voucher,
      ledgerEntries: result.ledgerEntries,
    });
  } catch (error) {
    console.error("Error creating voucher:", error);
    const message =
      error instanceof Error ? error.message : "Failed to create voucher";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
