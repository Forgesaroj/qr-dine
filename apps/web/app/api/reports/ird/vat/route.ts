import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { adToBS, getCurrentFiscalYear, getFiscalYearDisplay } from "@/lib/utils/nepal-date";

// ═══════════════════════════════════════════════════════════════════════════════
// IRD VAT REPORT
// For VAT filing and compliance reporting
// ═══════════════════════════════════════════════════════════════════════════════

interface DailySummary {
  date: string;
  dateBs: string;
  invoiceCount: number;
  cancelledCount: number;
  totalSubtotal: number;
  totalDiscount: number;
  totalTaxable: number;
  totalVat: number;
  totalAmount: number;
}

interface MonthlySummary {
  month: number;
  monthName: string;
  invoiceCount: number;
  cancelledCount: number;
  totalSubtotal: number;
  totalDiscount: number;
  totalTaxable: number;
  totalVat: number;
  totalAmount: number;
}

interface VatSummary {
  fiscalYear: string;
  totalTaxableAmount: number;
  totalVatCollected: number;
  totalExemptAmount: number;
  totalExportAmount: number;
  vatRate: number;
  effectiveVatRate: number;
}

// Nepali month names
const NEPALI_MONTHS = [
  "Baishakh", "Jestha", "Ashad", "Shrawan", "Bhadra", "Ashwin",
  "Kartik", "Mangsir", "Poush", "Magh", "Falgun", "Chaitra"
];

// ═══════════════════════════════════════════════════════════════════════════════
// GET - Generate VAT Report
// ═══════════════════════════════════════════════════════════════════════════════

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only OWNER, MANAGER can view VAT reports
    if (!["OWNER", "MANAGER", "SUPER_ADMIN"].includes(session.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const fiscalYear = searchParams.get("fiscalYear") || getCurrentFiscalYear();
    const month = searchParams.get("month"); // 1-12 for specific month
    const reportType = searchParams.get("type") || "monthly"; // daily, monthly, summary
    const format = searchParams.get("format") || "json";

    // Build query filters
    const where: Record<string, unknown> = {
      restaurantId: session.restaurantId,
      fiscalYear,
      status: "ACTIVE", // Only count active invoices for VAT
    };

    // Fetch invoices
    const invoices = await prisma.invoice.findMany({
      where,
      orderBy: { invoiceDateAd: "asc" },
    });

    // Get restaurant info
    const restaurant = await prisma.restaurant.findUnique({
      where: { id: session.restaurantId },
      include: { cbmsConfig: true },
    });

    const reportHeader = {
      restaurantName: restaurant?.name || "Unknown",
      restaurantAddress: restaurant?.address || "",
      sellerPan: restaurant?.cbmsConfig?.sellerPan || "",
      fiscalYear,
      fiscalYearDisplay: getFiscalYearDisplay(fiscalYear),
      generatedAt: new Date().toISOString(),
      generatedAtBs: adToBS(new Date()),
      generatedBy: session.email.split('@')[0] || "Staff",
      reportType,
    };

    // Generate different reports based on type
    if (reportType === "daily") {
      const dailySummaries = generateDailySummary(invoices);

      if (format === "csv") {
        return generateDailyCSV(dailySummaries, reportHeader);
      }

      return NextResponse.json({
        header: reportHeader,
        data: dailySummaries,
        summary: calculateVatSummary(invoices, fiscalYear),
      });
    }

    if (reportType === "monthly") {
      const monthlySummaries = generateMonthlySummary(invoices, month ? parseInt(month) : undefined);

      if (format === "csv") {
        return generateMonthlyCSV(monthlySummaries, reportHeader);
      }

      return NextResponse.json({
        header: reportHeader,
        data: monthlySummaries,
        summary: calculateVatSummary(invoices, fiscalYear),
      });
    }

    // Summary report
    const summary = calculateVatSummary(invoices, fiscalYear);

    return NextResponse.json({
      header: reportHeader,
      summary,
      breakdown: {
        byMonth: generateMonthlySummary(invoices),
        totalInvoices: invoices.length,
      },
    });
  } catch (error) {
    console.error("Error generating VAT report:", error);
    return NextResponse.json(
      { error: "Failed to generate VAT report" },
      { status: 500 }
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

function generateDailySummary(invoices: Array<{
  invoiceDateAd: Date;
  invoiceDateBs: string;
  subtotal: { toNumber(): number } | number;
  discountAmount: { toNumber(): number } | number;
  taxableAmount: { toNumber(): number } | number;
  vatAmount: { toNumber(): number } | number;
  totalAmount: { toNumber(): number } | number;
  status: string;
}>): DailySummary[] {
  const dailyMap = new Map<string, DailySummary>();

  for (const inv of invoices) {
    const date = inv.invoiceDateAd.toISOString().split("T")[0] ?? "";

    if (!dailyMap.has(date)) {
      dailyMap.set(date, {
        date,
        dateBs: inv.invoiceDateBs,
        invoiceCount: 0,
        cancelledCount: 0,
        totalSubtotal: 0,
        totalDiscount: 0,
        totalTaxable: 0,
        totalVat: 0,
        totalAmount: 0,
      });
    }

    const daily = dailyMap.get(date)!;
    daily.invoiceCount++;

    if (inv.status === "CANCELLED") {
      daily.cancelledCount++;
    } else {
      daily.totalSubtotal += toNumber(inv.subtotal);
      daily.totalDiscount += toNumber(inv.discountAmount);
      daily.totalTaxable += toNumber(inv.taxableAmount);
      daily.totalVat += toNumber(inv.vatAmount);
      daily.totalAmount += toNumber(inv.totalAmount);
    }
  }

  return Array.from(dailyMap.values()).sort((a, b) => a.date.localeCompare(b.date));
}

function generateMonthlySummary(invoices: Array<{
  invoiceDateBs: string;
  subtotal: { toNumber(): number } | number;
  discountAmount: { toNumber(): number } | number;
  taxableAmount: { toNumber(): number } | number;
  vatAmount: { toNumber(): number } | number;
  totalAmount: { toNumber(): number } | number;
  status: string;
}>, filterMonth?: number): MonthlySummary[] {
  const monthlyMap = new Map<number, MonthlySummary>();

  // Initialize all 12 months
  for (let m = 1; m <= 12; m++) {
    monthlyMap.set(m, {
      month: m,
      monthName: NEPALI_MONTHS[m - 1] ?? "Unknown",
      invoiceCount: 0,
      cancelledCount: 0,
      totalSubtotal: 0,
      totalDiscount: 0,
      totalTaxable: 0,
      totalVat: 0,
      totalAmount: 0,
    });
  }

  for (const inv of invoices) {
    // Extract month from BS date (format: "YYYY.MM.DD")
    const parts = inv.invoiceDateBs.split(".");
    const month = parseInt(parts[1] ?? "1", 10);

    if (filterMonth && month !== filterMonth) continue;

    const monthly = monthlyMap.get(month)!;
    monthly.invoiceCount++;

    if (inv.status === "CANCELLED") {
      monthly.cancelledCount++;
    } else {
      monthly.totalSubtotal += toNumber(inv.subtotal);
      monthly.totalDiscount += toNumber(inv.discountAmount);
      monthly.totalTaxable += toNumber(inv.taxableAmount);
      monthly.totalVat += toNumber(inv.vatAmount);
      monthly.totalAmount += toNumber(inv.totalAmount);
    }
  }

  const result = Array.from(monthlyMap.values());

  if (filterMonth) {
    return result.filter((m) => m.month === filterMonth);
  }

  // Sort by fiscal year order: Shrawan(4) to Ashad(3)
  return result.sort((a, b) => {
    const orderA = a.month >= 4 ? a.month - 4 : a.month + 8;
    const orderB = b.month >= 4 ? b.month - 4 : b.month + 8;
    return orderA - orderB;
  });
}

function calculateVatSummary(invoices: Array<{
  taxableAmount: { toNumber(): number } | number;
  vatAmount: { toNumber(): number } | number;
  exemptAmount: { toNumber(): number } | number;
  exportAmount: { toNumber(): number } | number;
  status: string;
}>, fiscalYear: string): VatSummary {
  const activeInvoices = invoices.filter((inv) => inv.status === "ACTIVE");

  const totalTaxable = activeInvoices.reduce((sum, inv) => sum + toNumber(inv.taxableAmount), 0);
  const totalVat = activeInvoices.reduce((sum, inv) => sum + toNumber(inv.vatAmount), 0);
  const totalExempt = activeInvoices.reduce((sum, inv) => sum + toNumber(inv.exemptAmount), 0);
  const totalExport = activeInvoices.reduce((sum, inv) => sum + toNumber(inv.exportAmount), 0);

  return {
    fiscalYear,
    totalTaxableAmount: totalTaxable,
    totalVatCollected: totalVat,
    totalExemptAmount: totalExempt,
    totalExportAmount: totalExport,
    vatRate: 13,
    effectiveVatRate: totalTaxable > 0 ? (totalVat / totalTaxable) * 100 : 0,
  };
}

function toNumber(value: { toNumber(): number } | number): number {
  if (typeof value === "number") return value;
  return value.toNumber();
}

function generateDailyCSV(
  data: DailySummary[],
  header: Record<string, unknown>
): NextResponse {
  const lines: string[] = [];

  lines.push(`"VAT REPORT - DAILY SUMMARY"`);
  lines.push(`"${header.restaurantName}"`);
  lines.push(`"PAN: ${header.sellerPan}"`);
  lines.push(`"Fiscal Year: ${header.fiscalYearDisplay}"`);
  lines.push("");

  lines.push("Date (AD),Date (BS),Invoice Count,Taxable Amount,VAT (13%),Total");

  for (const day of data) {
    lines.push(
      [
        day.date,
        day.dateBs,
        day.invoiceCount,
        day.totalTaxable.toFixed(2),
        day.totalVat.toFixed(2),
        day.totalAmount.toFixed(2),
      ].join(",")
    );
  }

  return new NextResponse(lines.join("\n"), {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="vat_daily_${header.fiscalYear}.csv"`,
    },
  });
}

function generateMonthlyCSV(
  data: MonthlySummary[],
  header: Record<string, unknown>
): NextResponse {
  const lines: string[] = [];

  lines.push(`"VAT REPORT - MONTHLY SUMMARY"`);
  lines.push(`"${header.restaurantName}"`);
  lines.push(`"PAN: ${header.sellerPan}"`);
  lines.push(`"Fiscal Year: ${header.fiscalYearDisplay}"`);
  lines.push("");

  lines.push("Month,Invoice Count,Subtotal,Discount,Taxable Amount,VAT (13%),Total");

  for (const month of data) {
    lines.push(
      [
        month.monthName,
        month.invoiceCount,
        month.totalSubtotal.toFixed(2),
        month.totalDiscount.toFixed(2),
        month.totalTaxable.toFixed(2),
        month.totalVat.toFixed(2),
        month.totalAmount.toFixed(2),
      ].join(",")
    );
  }

  // Totals
  const totals = data.reduce(
    (acc, m) => ({
      invoiceCount: acc.invoiceCount + m.invoiceCount,
      subtotal: acc.subtotal + m.totalSubtotal,
      discount: acc.discount + m.totalDiscount,
      taxable: acc.taxable + m.totalTaxable,
      vat: acc.vat + m.totalVat,
      total: acc.total + m.totalAmount,
    }),
    { invoiceCount: 0, subtotal: 0, discount: 0, taxable: 0, vat: 0, total: 0 }
  );

  lines.push("");
  lines.push(
    [
      "TOTAL",
      totals.invoiceCount,
      totals.subtotal.toFixed(2),
      totals.discount.toFixed(2),
      totals.taxable.toFixed(2),
      totals.vat.toFixed(2),
      totals.total.toFixed(2),
    ].join(",")
  );

  return new NextResponse(lines.join("\n"), {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="vat_monthly_${header.fiscalYear}.csv"`,
    },
  });
}
