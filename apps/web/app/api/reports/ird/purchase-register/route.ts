import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { adToBS, getCurrentFiscalYear, getFiscalYearDisplay } from "@/lib/utils/nepal-date";

// ═══════════════════════════════════════════════════════════════════════════════
// IRD PURCHASE REGISTER REPORT (ANNEX 5 FORMAT)
// As per IRD E-Billing Directive requirements
// ═══════════════════════════════════════════════════════════════════════════════

interface PurchaseRegisterEntry {
  sn: number;
  purchaseNumber: string;
  vendorInvoiceNumber: string | null;
  purchaseDateBs: string;
  purchaseDateAd: string;
  vendorName: string;
  vendorPan: string | null;
  // IRD Columns (as per ANNEX 5)
  totalPurchase: number;       // कुल खरिद (ख+ग+घ)
  nonVatPurchase: number;      // कर छुट खरिद (Non-VAT)
  importPurchase: number;      // आयात खरिद
  capitalGoods: number;        // पूँजीगत सामान
  vatablePurchase: number;     // करयोग्य खरिद
  vatAmount: number;           // मू.अ.कर (13%)
  grandTotal: number;          // जम्मा (करयोग्य + VAT)
  status: string;
  paymentStatus: string;
}

interface PurchaseRegisterSummary {
  totalEntries: number;
  totalPurchaseAmount: number;
  totalNonVatPurchase: number;
  totalImportPurchase: number;
  totalCapitalGoods: number;
  totalVatablePurchase: number;
  totalVatAmount: number;
  grandTotal: number;
  // Payment tracking
  totalPaid: number;
  totalUnpaid: number;
  totalPartiallyPaid: number;
}

interface PurchaseRecord {
  id: string;
  purchaseNumber: string;
  vendorInvoiceNumber: string | null;
  purchaseDateAd: Date;
  purchaseDateBs: string;
  vendorName: string;
  vendorPan: string | null;
  subtotal: { toNumber(): number } | number;
  vatableAmount: { toNumber(): number } | number;
  vatAmount: { toNumber(): number } | number;
  nonVatableAmount: { toNumber(): number } | number;
  capitalGoods: { toNumber(): number } | number;
  importAmount: { toNumber(): number } | number;
  totalAmount: { toNumber(): number } | number;
  status: string;
  paymentStatus: string;
  items?: unknown[];
  vendor?: {
    name: string;
    panNumber: string | null;
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// GET - Generate Purchase Register Report
// ═══════════════════════════════════════════════════════════════════════════════

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only OWNER, MANAGER can view IRD reports
    if (!["OWNER", "MANAGER", "ACCOUNTANT", "SUPER_ADMIN"].includes(session.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const fiscalYear = searchParams.get("fiscalYear") || getCurrentFiscalYear();
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const vendorId = searchParams.get("vendorId");
    const format = searchParams.get("format") || "json"; // json, csv

    // Build query filters
    const where: Record<string, unknown> = {
      restaurantId: session.restaurantId,
      fiscalYear,
      status: { in: ["APPROVED", "RECEIVED", "PAID"] }, // Only approved purchases
    };

    if (startDate || endDate) {
      where.purchaseDateAd = {};
      if (startDate) {
        (where.purchaseDateAd as Record<string, Date>).gte = new Date(startDate);
      }
      if (endDate) {
        (where.purchaseDateAd as Record<string, Date>).lte = new Date(endDate);
      }
    }

    if (vendorId) {
      where.vendorId = vendorId;
    }

    // Fetch purchases
    const purchases = (await prisma.purchase.findMany({
      where,
      orderBy: [
        { purchaseDateAd: "asc" },
        { purchaseNumber: "asc" },
      ],
      include: {
        items: true,
        vendor: {
          select: { name: true, panNumber: true },
        },
      },
    })) as PurchaseRecord[];

    // Transform to Purchase Register format (IRD ANNEX 5)
    const entries: PurchaseRegisterEntry[] = purchases.map((pur: PurchaseRecord, index: number) => {
      const vatableAmount = Number(pur.vatableAmount);
      const vatAmount = Number(pur.vatAmount);
      const nonVatAmount = Number(pur.nonVatableAmount);
      const capitalGoods = Number(pur.capitalGoods);
      const importAmount = Number(pur.importAmount);
      const totalAmount = Number(pur.totalAmount);

      return {
        sn: index + 1,
        purchaseNumber: pur.purchaseNumber,
        vendorInvoiceNumber: pur.vendorInvoiceNumber,
        purchaseDateBs: pur.purchaseDateBs,
        purchaseDateAd: pur.purchaseDateAd.toISOString().split("T")[0] ?? "",
        vendorName: pur.vendorName || pur.vendor?.name || "Unknown Vendor",
        vendorPan: pur.vendorPan || pur.vendor?.panNumber || null,
        // IRD ANNEX 5 Columns
        totalPurchase: totalAmount,
        nonVatPurchase: nonVatAmount,
        importPurchase: importAmount,
        capitalGoods: capitalGoods,
        vatablePurchase: vatableAmount,
        vatAmount: vatAmount,
        grandTotal: vatableAmount + vatAmount,
        status: pur.status,
        paymentStatus: pur.paymentStatus,
      };
    });

    // Calculate summary
    const summary: PurchaseRegisterSummary = {
      totalEntries: entries.length,
      totalPurchaseAmount: entries.reduce((sum, e) => sum + e.totalPurchase, 0),
      totalNonVatPurchase: entries.reduce((sum, e) => sum + e.nonVatPurchase, 0),
      totalImportPurchase: entries.reduce((sum, e) => sum + e.importPurchase, 0),
      totalCapitalGoods: entries.reduce((sum, e) => sum + e.capitalGoods, 0),
      totalVatablePurchase: entries.reduce((sum, e) => sum + e.vatablePurchase, 0),
      totalVatAmount: entries.reduce((sum, e) => sum + e.vatAmount, 0),
      grandTotal: entries.reduce((sum, e) => sum + e.grandTotal, 0),
      // Payment tracking
      totalPaid: entries.filter(e => e.paymentStatus === "PAID").length,
      totalUnpaid: entries.filter(e => e.paymentStatus === "UNPAID").length,
      totalPartiallyPaid: entries.filter(e => e.paymentStatus === "PARTIAL").length,
    };

    // Get restaurant info for report header
    const restaurant = await prisma.restaurant.findUnique({
      where: { id: session.restaurantId },
      include: { cbmsConfig: true },
    });

    const reportHeader = {
      reportTitle: "Purchase Register (खरिद खाता)",
      reportTitleNp: "खरिद खाता (ANNEX 5)",
      restaurantName: restaurant?.name || "Unknown",
      restaurantAddress: restaurant?.address || "",
      restaurantPhone: restaurant?.phone || "",
      buyerPan: restaurant?.cbmsConfig?.sellerPan || "",
      fiscalYear,
      fiscalYearDisplay: getFiscalYearDisplay(fiscalYear),
      generatedAt: new Date().toISOString(),
      generatedAtBs: adToBS(new Date()),
      generatedBy: session.email.split("@")[0] || "Staff",
    };

    // Handle different export formats
    if (format === "csv") {
      const csvContent = generateCSV(entries, summary, reportHeader);
      return new NextResponse(csvContent, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="purchase_register_${fiscalYear}.csv"`,
        },
      });
    }

    return NextResponse.json({
      header: reportHeader,
      columns: [
        { key: "sn", label: "S.N.", labelNp: "क्र.सं." },
        { key: "purchaseDateBs", label: "Date (BS)", labelNp: "मिति" },
        { key: "vendorInvoiceNumber", label: "Invoice No.", labelNp: "बिजक नं." },
        { key: "vendorName", label: "Seller Name", labelNp: "बिक्रेताको नाम" },
        { key: "vendorPan", label: "Seller PAN", labelNp: "बिक्रेताको PAN" },
        { key: "totalPurchase", label: "Total Purchase", labelNp: "कुल खरिद" },
        { key: "nonVatPurchase", label: "Non-VAT", labelNp: "कर छुट" },
        { key: "importPurchase", label: "Import", labelNp: "आयात" },
        { key: "capitalGoods", label: "Capital Goods", labelNp: "पूँजीगत" },
        { key: "vatablePurchase", label: "Taxable", labelNp: "करयोग्य" },
        { key: "vatAmount", label: "VAT (13%)", labelNp: "मू.अ.कर" },
        { key: "grandTotal", label: "Grand Total", labelNp: "जम्मा" },
      ],
      entries,
      summary,
      // IRD specific summary format
      irdSummary: {
        totalPurchase: summary.totalPurchaseAmount,
        nonVatablePurchase: summary.totalNonVatPurchase,
        importPurchase: summary.totalImportPurchase,
        capitalGoods: summary.totalCapitalGoods,
        vatablePurchase: summary.totalVatablePurchase,
        vatDeducted: summary.totalVatAmount,
        vatRate: "13%",
        grandTotal: summary.grandTotal,
      },
      filters: {
        fiscalYear,
        startDate,
        endDate,
        vendorId,
      },
    });
  } catch (error) {
    console.error("Error generating purchase register:", error);
    return NextResponse.json(
      { error: "Failed to generate purchase register report" },
      { status: 500 }
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

function generateCSV(
  entries: PurchaseRegisterEntry[],
  summary: PurchaseRegisterSummary,
  header: Record<string, unknown>
): string {
  const lines: string[] = [];

  // Header section
  lines.push(`"PURCHASE REGISTER (ANNEX 5) - खरिद खाता"`);
  lines.push(`"${header.restaurantName}"`);
  lines.push(`"PAN: ${header.buyerPan}"`);
  lines.push(`"Fiscal Year: ${header.fiscalYearDisplay}"`);
  lines.push(`"Generated: ${header.generatedAtBs}"`);
  lines.push("");

  // Column headers (IRD ANNEX 5 format)
  lines.push(
    "SN,Date (BS),Date (AD),Invoice No.,Seller Name,Seller PAN,Total Purchase,Non-VAT,Import,Capital Goods,Taxable,VAT 13%,Grand Total,Payment Status"
  );

  // Data rows
  for (const entry of entries) {
    lines.push(
      [
        entry.sn,
        `"${entry.purchaseDateBs}"`,
        `"${entry.purchaseDateAd}"`,
        `"${entry.vendorInvoiceNumber || ""}"`,
        `"${entry.vendorName.replace(/"/g, '""')}"`,
        entry.vendorPan || "",
        entry.totalPurchase.toFixed(2),
        entry.nonVatPurchase.toFixed(2),
        entry.importPurchase.toFixed(2),
        entry.capitalGoods.toFixed(2),
        entry.vatablePurchase.toFixed(2),
        entry.vatAmount.toFixed(2),
        entry.grandTotal.toFixed(2),
        entry.paymentStatus,
      ].join(",")
    );
  }

  // Summary section
  lines.push("");
  lines.push(`"SUMMARY - सारांश"`);
  lines.push(`"Total Entries",${summary.totalEntries}`);
  lines.push(`"Total Purchase Amount",${summary.totalPurchaseAmount.toFixed(2)}`);
  lines.push(`"Non-VAT Purchase",${summary.totalNonVatPurchase.toFixed(2)}`);
  lines.push(`"Import Purchase",${summary.totalImportPurchase.toFixed(2)}`);
  lines.push(`"Capital Goods",${summary.totalCapitalGoods.toFixed(2)}`);
  lines.push(`"Taxable Purchase",${summary.totalVatablePurchase.toFixed(2)}`);
  lines.push(`"Total VAT (Input Tax Credit)",${summary.totalVatAmount.toFixed(2)}`);
  lines.push(`"Grand Total",${summary.grandTotal.toFixed(2)}`);
  lines.push("");
  lines.push(`"PAYMENT STATUS"`);
  lines.push(`"Paid Invoices",${summary.totalPaid}`);
  lines.push(`"Unpaid Invoices",${summary.totalUnpaid}`);
  lines.push(`"Partially Paid",${summary.totalPartiallyPaid}`);

  return lines.join("\n");
}
