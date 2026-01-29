import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { adToBS, getCurrentFiscalYear, getFiscalYearDisplay } from "@/lib/utils/nepal-date";

// ═══════════════════════════════════════════════════════════════════════════════
// IRD SALES REGISTER REPORT (ANNEX 6 FORMAT)
// As per IRD E-Billing Directive requirements
// ═══════════════════════════════════════════════════════════════════════════════

interface SalesRegisterEntry {
  sn: number;
  invoiceNumber: string;
  invoiceDateBs: string;
  invoiceDateAd: string;
  buyerName: string;
  buyerPan: string | null;
  subtotal: number;
  discountAmount: number;
  taxableAmount: number;
  vatAmount: number;
  totalAmount: number;
  status: string;
  cbmsSynced: boolean;
  // Edit tracking (per user request)
  isEdited: boolean;
  editCount: number;
  // Complimentary tracking
  hasComplimentaryItems: boolean;
  complimentaryAmount: number;
  // Additional discount info
  billDiscountAmount: number;
  billDiscountReason: string | null;
  // Remarks for report
  remarks: string;
}

interface SalesRegisterSummary {
  totalInvoices: number;
  totalCancelled: number;
  totalActive: number;
  totalSubtotal: number;
  totalDiscount: number;
  totalTaxable: number;
  totalVat: number;
  grandTotal: number;
  cbmsSyncedCount: number;
  cbmsPendingCount: number;
  // Edit tracking summary
  totalEditedBills: number;
  totalEditCount: number;
  // Complimentary summary
  totalComplimentaryAmount: number;
  billsWithComplimentary: number;
  // Bill-level discount summary
  totalBillDiscount: number;
}

interface InvoiceRecord {
  id: string;
  invoiceNumber: string;
  invoiceDateBs: string;
  invoiceDateAd: Date;
  buyerName: string;
  buyerPan: string | null;
  subtotal: { toNumber(): number } | number;
  discountAmount: { toNumber(): number } | number;
  taxableAmount: { toNumber(): number } | number;
  vatAmount: { toNumber(): number } | number;
  totalAmount: { toNumber(): number } | number;
  status: string;
  cbmsSynced: boolean;
  cbmsRequired: boolean;
  items?: unknown[];
  billId?: string | null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// GET - Generate Sales Register Report
// ═══════════════════════════════════════════════════════════════════════════════

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only OWNER, MANAGER can view IRD reports
    if (!["OWNER", "MANAGER", "SUPER_ADMIN"].includes(session.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const fiscalYear = searchParams.get("fiscalYear") || getCurrentFiscalYear();
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const format = searchParams.get("format") || "json"; // json, csv, excel

    // Build query filters
    const where: Record<string, unknown> = {
      restaurantId: session.restaurantId,
      fiscalYear,
    };

    if (startDate || endDate) {
      where.invoiceDateAd = {};
      if (startDate) {
        (where.invoiceDateAd as Record<string, Date>).gte = new Date(startDate);
      }
      if (endDate) {
        (where.invoiceDateAd as Record<string, Date>).lte = new Date(endDate);
      }
    }

    // Fetch invoices
    const invoices = (await prisma.invoice.findMany({
      where,
      orderBy: { invoiceNumber: "asc" },
      include: { items: true },
    })) as InvoiceRecord[];

    // Fetch bill data for edit tracking (billId is stored in Invoice)
    const billIds = invoices.map(inv => inv.billId).filter(Boolean) as string[];
    const bills = billIds.length > 0
      ? await prisma.bill.findMany({
          where: { id: { in: billIds } },
          select: {
            id: true,
            isEdited: true,
            editCount: true,
            hasComplimentaryItems: true,
            complimentaryTotal: true,
            billDiscountAmount: true,
            billDiscountReason: true,
          },
        })
      : [];
    const billMap = new Map(bills.map(b => [b.id, b]));

    // Transform to Sales Register format with edit tracking
    const entries: SalesRegisterEntry[] = invoices.map((inv: InvoiceRecord, index: number) => {
      const bill = inv.billId ? billMap.get(inv.billId) : undefined;
      const isEdited = bill?.isEdited || false;
      const editCount = bill?.editCount || 0;
      const hasComplimentaryItems = bill?.hasComplimentaryItems || false;
      const complimentaryAmount = bill?.complimentaryTotal || 0;
      const billDiscountAmount = bill?.billDiscountAmount || 0;
      const billDiscountReason = bill?.billDiscountReason || null;

      // Build remarks
      const remarksParts: string[] = [];
      if (isEdited) {
        remarksParts.push(`Edited (${editCount}x)`);
      }
      if (hasComplimentaryItems) {
        remarksParts.push(`Complimentary: Rs.${complimentaryAmount.toFixed(0)}`);
      }
      if (billDiscountAmount > 0) {
        remarksParts.push(`Bill Discount: Rs.${billDiscountAmount}`);
      }
      if (inv.status === "CANCELLED") {
        remarksParts.push("CANCELLED");
      }

      return {
        sn: index + 1,
        invoiceNumber: inv.invoiceNumber,
        invoiceDateBs: inv.invoiceDateBs,
        invoiceDateAd: inv.invoiceDateAd.toISOString().split("T")[0] ?? "",
        buyerName: inv.buyerName,
        buyerPan: inv.buyerPan,
        subtotal: Number(inv.subtotal),
        discountAmount: Number(inv.discountAmount),
        taxableAmount: Number(inv.taxableAmount),
        vatAmount: Number(inv.vatAmount),
        totalAmount: Number(inv.totalAmount),
        status: inv.status,
        cbmsSynced: inv.cbmsSynced,
        // Edit tracking
        isEdited,
        editCount,
        // Complimentary tracking
        hasComplimentaryItems,
        complimentaryAmount,
        // Bill discount
        billDiscountAmount,
        billDiscountReason,
        // Remarks
        remarks: remarksParts.join("; "),
      };
    });

    // Calculate summary
    const activeInvoices = invoices.filter((inv: InvoiceRecord) => inv.status === "ACTIVE");
    const cancelledInvoices = invoices.filter((inv: InvoiceRecord) => inv.status === "CANCELLED");

    // Calculate edit and complimentary totals from entries
    const editedEntries = entries.filter(e => e.isEdited);
    const complimentaryEntries = entries.filter(e => e.hasComplimentaryItems);

    const summary: SalesRegisterSummary = {
      totalInvoices: invoices.length,
      totalCancelled: cancelledInvoices.length,
      totalActive: activeInvoices.length,
      totalSubtotal: activeInvoices.reduce((sum: number, inv: InvoiceRecord) => sum + Number(inv.subtotal), 0),
      totalDiscount: activeInvoices.reduce((sum: number, inv: InvoiceRecord) => sum + Number(inv.discountAmount), 0),
      totalTaxable: activeInvoices.reduce((sum: number, inv: InvoiceRecord) => sum + Number(inv.taxableAmount), 0),
      totalVat: activeInvoices.reduce((sum: number, inv: InvoiceRecord) => sum + Number(inv.vatAmount), 0),
      grandTotal: activeInvoices.reduce((sum: number, inv: InvoiceRecord) => sum + Number(inv.totalAmount), 0),
      cbmsSyncedCount: invoices.filter((inv: InvoiceRecord) => inv.cbmsSynced).length,
      cbmsPendingCount: invoices.filter((inv: InvoiceRecord) => !inv.cbmsSynced && inv.cbmsRequired).length,
      // Edit tracking summary
      totalEditedBills: editedEntries.length,
      totalEditCount: editedEntries.reduce((sum, e) => sum + e.editCount, 0),
      // Complimentary summary
      totalComplimentaryAmount: entries.reduce((sum, e) => sum + e.complimentaryAmount, 0),
      billsWithComplimentary: complimentaryEntries.length,
      // Bill-level discount summary
      totalBillDiscount: entries.reduce((sum, e) => sum + e.billDiscountAmount, 0),
    };

    // Get restaurant info for report header
    const restaurant = await prisma.restaurant.findUnique({
      where: { id: session.restaurantId },
      include: { cbmsConfig: true },
    });

    const reportHeader = {
      restaurantName: restaurant?.name || "Unknown",
      restaurantAddress: restaurant?.address || "",
      restaurantPhone: restaurant?.phone || "",
      sellerPan: restaurant?.cbmsConfig?.sellerPan || "",
      fiscalYear,
      fiscalYearDisplay: getFiscalYearDisplay(fiscalYear),
      generatedAt: new Date().toISOString(),
      generatedAtBs: adToBS(new Date()),
      generatedBy: session.email.split('@')[0] || "Staff",
    };

    // Handle different export formats
    if (format === "csv") {
      const csvContent = generateCSV(entries, summary, reportHeader);
      return new NextResponse(csvContent, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="sales_register_${fiscalYear}.csv"`,
        },
      });
    }

    return NextResponse.json({
      header: reportHeader,
      entries,
      summary,
      filters: {
        fiscalYear,
        startDate,
        endDate,
      },
    });
  } catch (error) {
    console.error("Error generating sales register:", error);
    return NextResponse.json(
      { error: "Failed to generate sales register report" },
      { status: 500 }
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

function generateCSV(
  entries: SalesRegisterEntry[],
  summary: SalesRegisterSummary,
  header: Record<string, unknown>
): string {
  const lines: string[] = [];

  // Header section
  lines.push(`"SALES REGISTER (ANNEX 6)"`);
  lines.push(`"${header.restaurantName}"`);
  lines.push(`"PAN: ${header.sellerPan}"`);
  lines.push(`"Fiscal Year: ${header.fiscalYearDisplay}"`);
  lines.push(`"Generated: ${header.generatedAtBs}"`);
  lines.push("");

  // Column headers (IRD format with edit tracking)
  lines.push(
    "SN,Invoice Number,Date (BS),Date (AD),Buyer Name,Buyer PAN,Subtotal,Discount,Taxable Amount,VAT 13%,Total,Status,CBMS Synced,Edited,Edit Count,Complimentary Amt,Bill Discount,Remarks"
  );

  // Data rows
  for (const entry of entries) {
    lines.push(
      [
        entry.sn,
        `"${entry.invoiceNumber}"`,
        `"${entry.invoiceDateBs}"`,
        `"${entry.invoiceDateAd}"`,
        `"${entry.buyerName.replace(/"/g, '""')}"`,
        entry.buyerPan || "",
        entry.subtotal.toFixed(2),
        entry.discountAmount.toFixed(2),
        entry.taxableAmount.toFixed(2),
        entry.vatAmount.toFixed(2),
        entry.totalAmount.toFixed(2),
        entry.status,
        entry.cbmsSynced ? "Yes" : "No",
        entry.isEdited ? "Yes" : "No",
        entry.editCount,
        entry.complimentaryAmount.toFixed(2),
        entry.billDiscountAmount.toFixed(2),
        `"${entry.remarks.replace(/"/g, '""')}"`,
      ].join(",")
    );
  }

  // Summary section
  lines.push("");
  lines.push(`"SUMMARY"`);
  lines.push(`"Total Invoices",${summary.totalInvoices}`);
  lines.push(`"Active Invoices",${summary.totalActive}`);
  lines.push(`"Cancelled Invoices",${summary.totalCancelled}`);
  lines.push(`"Total Subtotal",${summary.totalSubtotal.toFixed(2)}`);
  lines.push(`"Total Discount",${summary.totalDiscount.toFixed(2)}`);
  lines.push(`"Total Taxable Amount",${summary.totalTaxable.toFixed(2)}`);
  lines.push(`"Total VAT",${summary.totalVat.toFixed(2)}`);
  lines.push(`"Grand Total",${summary.grandTotal.toFixed(2)}`);
  lines.push(`"CBMS Synced",${summary.cbmsSyncedCount}`);
  lines.push(`"CBMS Pending",${summary.cbmsPendingCount}`);
  lines.push("");
  lines.push(`"EDIT & COMPLIMENTARY TRACKING"`);
  lines.push(`"Total Edited Bills",${summary.totalEditedBills}`);
  lines.push(`"Total Edit Count",${summary.totalEditCount}`);
  lines.push(`"Bills with Complimentary",${summary.billsWithComplimentary}`);
  lines.push(`"Total Complimentary Amount",${summary.totalComplimentaryAmount.toFixed(2)}`);
  lines.push(`"Total Bill Discount",${summary.totalBillDiscount.toFixed(2)}`);

  return lines.join("\n");
}
