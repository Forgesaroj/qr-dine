import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createVoucherService } from "@/lib/services/accounting/voucher.service";

// Roles that can manage vouchers
const ACCOUNTING_ROLES = ["OWNER", "MANAGER", "ACCOUNTANT"];
const POSTING_ROLES = ["OWNER", "MANAGER", "ACCOUNTANT"];

// ═══════════════════════════════════════════════════════════════════════════════
// GET - Get voucher details
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

    const voucher = await prisma.voucher.findFirst({
      where: {
        id,
        restaurantId: session.restaurantId,
      },
      include: {
        ledgerEntries: {
          include: {
            account: {
              select: {
                accountCode: true,
                accountName: true,
                accountGroup: true,
                accountType: true,
              },
            },
            costCenter: {
              select: { code: true, name: true },
            },
          },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!voucher) {
      return NextResponse.json(
        { error: "Voucher not found" },
        { status: 404 }
      );
    }

    // Calculate totals
    const totals = {
      debit: voucher.ledgerEntries.reduce(
        (sum, e) => sum + Number(e.debitAmount),
        0
      ),
      credit: voucher.ledgerEntries.reduce(
        (sum, e) => sum + Number(e.creditAmount),
        0
      ),
    };

    return NextResponse.json({
      voucher,
      totals,
    });
  } catch (error) {
    console.error("Error fetching voucher:", error);
    return NextResponse.json(
      { error: "Failed to fetch voucher" },
      { status: 500 }
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// PATCH - Update or perform action on voucher (post, cancel)
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
    const { action, reason } = body;

    const voucherService = createVoucherService(session.restaurantId);

    // Handle actions
    if (action === "post") {
      if (!POSTING_ROLES.includes(session.role)) {
        return NextResponse.json(
          { error: "You do not have permission to post vouchers" },
          { status: 403 }
        );
      }

      const result = await voucherService.postVoucher(
        id,
        session.id,
        session.name || session.email
      );

      return NextResponse.json(result);
    }

    if (action === "cancel") {
      if (!ACCOUNTING_ROLES.includes(session.role)) {
        return NextResponse.json(
          { error: "You do not have permission to cancel vouchers" },
          { status: 403 }
        );
      }

      if (!reason) {
        return NextResponse.json(
          { error: "Reason is required for cancellation" },
          { status: 400 }
        );
      }

      const result = await voucherService.cancelVoucher(
        id,
        reason,
        session.id,
        session.name || session.email
      );

      return NextResponse.json(result);
    }

    // Regular update (only for draft vouchers)
    if (!ACCOUNTING_ROLES.includes(session.role)) {
      return NextResponse.json(
        { error: "You do not have permission to update vouchers" },
        { status: 403 }
      );
    }

    const voucher = await prisma.voucher.findFirst({
      where: {
        id,
        restaurantId: session.restaurantId,
      },
    });

    if (!voucher) {
      return NextResponse.json(
        { error: "Voucher not found" },
        { status: 404 }
      );
    }

    if (voucher.status !== "DRAFT") {
      return NextResponse.json(
        { error: "Only draft vouchers can be updated" },
        { status: 400 }
      );
    }

    const { narration, partyName } = body;

    const updatedVoucher = await prisma.voucher.update({
      where: { id },
      data: {
        ...(narration !== undefined && { narration }),
        ...(partyName !== undefined && { partyName }),
      },
    });

    return NextResponse.json({
      success: true,
      message: "Voucher updated",
      voucher: updatedVoucher,
    });
  } catch (error) {
    console.error("Error updating voucher:", error);
    const message =
      error instanceof Error ? error.message : "Failed to update voucher";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// DELETE - Delete draft voucher
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
        { error: "You do not have permission to delete vouchers" },
        { status: 403 }
      );
    }

    const { id } = await params;

    const voucher = await prisma.voucher.findFirst({
      where: {
        id,
        restaurantId: session.restaurantId,
      },
    });

    if (!voucher) {
      return NextResponse.json(
        { error: "Voucher not found" },
        { status: 404 }
      );
    }

    if (voucher.status !== "DRAFT") {
      return NextResponse.json(
        { error: "Only draft vouchers can be deleted. Use cancel for posted vouchers." },
        { status: 400 }
      );
    }

    // Delete entries first, then voucher
    await prisma.$transaction([
      prisma.ledgerEntry.deleteMany({
        where: { voucherId: id },
      }),
      prisma.voucher.delete({
        where: { id },
      }),
    ]);

    return NextResponse.json({
      success: true,
      message: "Voucher deleted",
    });
  } catch (error) {
    console.error("Error deleting voucher:", error);
    return NextResponse.json(
      { error: "Failed to delete voucher" },
      { status: 500 }
    );
  }
}
