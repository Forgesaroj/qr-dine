import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { createInvoiceService } from "@/lib/services/invoice.service";

// ═══════════════════════════════════════════════════════════════════════════════
// POST - Print invoice (tracks print count)
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

    // Only OWNER, MANAGER, ADMIN, CASHIER can print invoices
    if (!["OWNER", "MANAGER", "SUPER_ADMIN", "CASHIER"].includes(session.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const invoiceService = createInvoiceService(session.restaurantId);

    // Get client info for audit
    const ipAddress = request.headers.get("x-forwarded-for") ||
                      request.headers.get("x-real-ip") ||
                      "unknown";
    const userAgent = request.headers.get("user-agent") || undefined;

    const result = await invoiceService.printInvoice(
      id,
      session.userId,
      session.email.split('@')[0] || "Staff",
      ipAddress,
      userAgent
    );

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: result.invoice ? 400 : 404 }
      );
    }

    return NextResponse.json({
      success: true,
      invoice: result.invoice,
      printCount: result.printCount,
      isCopy: result.isCopy,
      copyLabel: result.isCopy ? `COPY ${result.printCount}` : "ORIGINAL",
    });
  } catch (error) {
    console.error("Error printing invoice:", error);
    return NextResponse.json(
      { error: "Failed to print invoice" },
      { status: 500 }
    );
  }
}
