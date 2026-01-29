import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { createInvoiceService, CreateInvoiceData } from "@/lib/services/invoice.service";
import { InvoiceStatus } from "@prisma/client";
import { z } from "zod";

// ═══════════════════════════════════════════════════════════════════════════════
// VALIDATION SCHEMAS
// ═══════════════════════════════════════════════════════════════════════════════

const invoiceItemSchema = z.object({
  description: z.string().min(1),
  descriptionLocal: z.string().optional(),
  quantity: z.number().positive(),
  unitPrice: z.number().min(0),
  menuItemId: z.string().optional(),
});

const createInvoiceSchema = z.object({
  billId: z.string().optional(),
  orderId: z.string().optional(),
  sessionId: z.string().optional(),
  buyerName: z.string().min(1, "Buyer name is required"),
  buyerPan: z.string().optional(),
  buyerAddress: z.string().optional(),
  items: z.array(invoiceItemSchema).min(1, "At least one item is required"),
  subtotal: z.number().min(0),
  discountAmount: z.number().min(0).optional(),
  discountReason: z.string().optional(),
  serviceChargeRate: z.number().min(0).optional(),
  serviceCharge: z.number().min(0).optional(),
  paymentMethod: z.string().optional(),
  skipCBMS: z.boolean().optional(),
});

// ═══════════════════════════════════════════════════════════════════════════════
// GET - List invoices
// ═══════════════════════════════════════════════════════════════════════════════

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only OWNER, MANAGER, ADMIN, CASHIER can view invoices
    if (!["OWNER", "MANAGER", "SUPER_ADMIN", "CASHIER"].includes(session.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") as InvoiceStatus | null;
    const cbmsSynced = searchParams.get("cbmsSynced");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const fiscalYear = searchParams.get("fiscalYear");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    const invoiceService = createInvoiceService(session.restaurantId);

    const { invoices, total } = await invoiceService.getInvoices({
      status: status || undefined,
      cbmsSynced: cbmsSynced ? cbmsSynced === "true" : undefined,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      limit,
      offset,
    });

    // If fiscal year filter is specified, filter locally
    const filteredInvoices = fiscalYear
      ? invoices.filter((inv: { fiscalYear: string }) => inv.fiscalYear === fiscalYear)
      : invoices;

    return NextResponse.json({
      invoices: filteredInvoices,
      total: fiscalYear ? filteredInvoices.length : total,
      limit,
      offset,
    });
  } catch (error) {
    console.error("Error fetching invoices:", error);
    return NextResponse.json(
      { error: "Failed to fetch invoices" },
      { status: 500 }
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// POST - Create new invoice
// ═══════════════════════════════════════════════════════════════════════════════

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only OWNER, MANAGER, ADMIN, CASHIER can create invoices
    if (!["OWNER", "MANAGER", "SUPER_ADMIN", "CASHIER"].includes(session.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();

    // Validate input
    const validationResult = createInvoiceSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validationResult.error.errors },
        { status: 400 }
      );
    }

    const data = validationResult.data;

    const invoiceService = createInvoiceService(session.restaurantId);

    const invoiceData: CreateInvoiceData = {
      restaurantId: session.restaurantId,
      billId: data.billId,
      orderId: data.orderId,
      sessionId: data.sessionId,
      buyerName: data.buyerName,
      buyerPan: data.buyerPan,
      buyerAddress: data.buyerAddress,
      items: data.items,
      subtotal: data.subtotal,
      discountAmount: data.discountAmount,
      discountReason: data.discountReason,
      serviceChargeRate: data.serviceChargeRate,
      serviceCharge: data.serviceCharge,
      paymentMethod: data.paymentMethod,
      createdBy: session.userId,
      createdByName: session.email.split('@')[0] || "Staff",
      skipCBMS: data.skipCBMS,
    };

    const invoice = await invoiceService.createInvoice(invoiceData);

    return NextResponse.json({ invoice }, { status: 201 });
  } catch (error) {
    console.error("Error creating invoice:", error);
    const message = error instanceof Error ? error.message : "Failed to create invoice";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
