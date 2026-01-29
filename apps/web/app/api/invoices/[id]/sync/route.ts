import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { createInvoiceService } from "@/lib/services/invoice.service";

// ═══════════════════════════════════════════════════════════════════════════════
// POST - Manually sync invoice to CBMS
// ═══════════════════════════════════════════════════════════════════════════════

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only OWNER, MANAGER can manually sync invoices
    if (!["OWNER", "MANAGER", "SUPER_ADMIN"].includes(session.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const invoiceService = createInvoiceService(session.restaurantId);

    const result = await invoiceService.syncInvoiceToCBMS(id);

    return NextResponse.json({
      success: result.success,
      code: result.code,
      message: result.message,
    });
  } catch (error) {
    console.error("Error syncing invoice to CBMS:", error);
    return NextResponse.json(
      { error: "Failed to sync invoice to CBMS" },
      { status: 500 }
    );
  }
}
