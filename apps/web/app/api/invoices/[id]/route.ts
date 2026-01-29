import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { createInvoiceService } from "@/lib/services/invoice.service";
import { z } from "zod";

// ═══════════════════════════════════════════════════════════════════════════════
// VALIDATION SCHEMAS
// ═══════════════════════════════════════════════════════════════════════════════

const cancelInvoiceSchema = z.object({
  reason: z.string().min(1, "Cancellation reason is required"),
});

// ═══════════════════════════════════════════════════════════════════════════════
// GET - Get single invoice by ID
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

    // Only OWNER, MANAGER, ADMIN, CASHIER can view invoices
    if (!["OWNER", "MANAGER", "SUPER_ADMIN", "CASHIER"].includes(session.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const invoiceService = createInvoiceService(session.restaurantId);

    const invoice = await invoiceService.getInvoice(id);

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    // Get audit trail
    const auditTrail = await invoiceService.getAuditTrail(id);

    return NextResponse.json({
      invoice,
      auditTrail,
    });
  } catch (error) {
    console.error("Error fetching invoice:", error);
    return NextResponse.json(
      { error: "Failed to fetch invoice" },
      { status: 500 }
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// PATCH - Cancel invoice
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

    // Only OWNER, MANAGER can cancel invoices
    if (!["OWNER", "MANAGER", "SUPER_ADMIN"].includes(session.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();

    // Validate input
    const validationResult = cancelInvoiceSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validationResult.error.errors },
        { status: 400 }
      );
    }

    const { reason } = validationResult.data;

    const invoiceService = createInvoiceService(session.restaurantId);

    // Get client info for audit
    const ipAddress = request.headers.get("x-forwarded-for") ||
                      request.headers.get("x-real-ip") ||
                      "unknown";
    const userAgent = request.headers.get("user-agent") || undefined;

    const result = await invoiceService.cancelInvoice(
      id,
      reason,
      session.userId,
      session.email.split('@')[0] || "Staff",
      ipAddress,
      userAgent
    );

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    // Get updated invoice
    const invoice = await invoiceService.getInvoice(id);

    return NextResponse.json({
      success: true,
      invoice,
      message: "Invoice cancelled successfully",
    });
  } catch (error) {
    console.error("Error cancelling invoice:", error);
    return NextResponse.json(
      { error: "Failed to cancel invoice" },
      { status: 500 }
    );
  }
}
