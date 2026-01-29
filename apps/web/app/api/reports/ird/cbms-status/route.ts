import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { adToBS, getCurrentFiscalYear } from "@/lib/utils/nepal-date";

// ═══════════════════════════════════════════════════════════════════════════════
// CBMS SYNC STATUS REPORT
// For monitoring IRD CBMS synchronization status
// ═══════════════════════════════════════════════════════════════════════════════

interface SyncStatusSummary {
  totalInvoices: number;
  syncedCount: number;
  pendingCount: number;
  failedCount: number;
  notRequiredCount: number;
  syncPercentage: number;
}

interface FailedSyncEntry {
  invoiceId: string;
  invoiceNumber: string;
  invoiceDate: string;
  buyerName: string;
  totalAmount: number;
  lastError: string | null;
  retryCount: number;
  lastRetryAt: string | null;
}

interface SyncLogEntry {
  id: string;
  type: string;
  invoiceNumber: string;
  status: string;
  responseCode: number | null;
  responseMessage: string | null;
  attemptNumber: number;
  createdAt: string;
}

interface FailedInvoiceRecord {
  id: string;
  invoiceNumber: string;
  invoiceDateBs: string;
  buyerName: string;
  totalAmount: { toNumber(): number } | number;
  cbmsError: string | null;
  cbmsRetryCount: number;
  cbmsLastRetryAt: Date | null;
}

interface SyncLogRecord {
  id: string;
  type: string;
  invoiceNumber: string;
  status: string;
  responseCode: number | null;
  responseMessage: string | null;
  attemptNumber: number;
  createdAt: Date;
}

// ═══════════════════════════════════════════════════════════════════════════════
// GET - Get CBMS Sync Status Report
// ═══════════════════════════════════════════════════════════════════════════════

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only OWNER, MANAGER can view CBMS status
    if (!["OWNER", "MANAGER", "SUPER_ADMIN"].includes(session.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const fiscalYear = searchParams.get("fiscalYear") || getCurrentFiscalYear();
    const status = searchParams.get("status"); // synced, pending, failed
    const limit = parseInt(searchParams.get("limit") || "100");

    // Get CBMS config status
    const cbmsConfig = await prisma.restaurantCBMSConfig.findUnique({
      where: { restaurantId: session.restaurantId },
    });

    // Get invoice counts
    const invoiceStats = await prisma.invoice.groupBy({
      by: ["cbmsSynced", "cbmsRequired"],
      where: {
        restaurantId: session.restaurantId,
        fiscalYear,
      },
      _count: true,
    });

    // Calculate summary
    let totalInvoices = 0;
    let syncedCount = 0;
    let pendingCount = 0;
    let notRequiredCount = 0;

    for (const stat of invoiceStats) {
      totalInvoices += stat._count;
      if (!stat.cbmsRequired) {
        notRequiredCount += stat._count;
      } else if (stat.cbmsSynced) {
        syncedCount += stat._count;
      } else {
        pendingCount += stat._count;
      }
    }

    const summary: SyncStatusSummary = {
      totalInvoices,
      syncedCount,
      pendingCount,
      failedCount: 0, // Will be calculated from invoices with errors
      notRequiredCount,
      syncPercentage: totalInvoices > 0
        ? ((syncedCount / (totalInvoices - notRequiredCount)) * 100) || 0
        : 0,
    };

    // Get failed/pending invoices
    const failedInvoices = (await prisma.invoice.findMany({
      where: {
        restaurantId: session.restaurantId,
        fiscalYear,
        cbmsRequired: true,
        cbmsSynced: false,
        ...(status === "failed" && { cbmsError: { not: null } }),
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      select: {
        id: true,
        invoiceNumber: true,
        invoiceDateBs: true,
        buyerName: true,
        totalAmount: true,
        cbmsError: true,
        cbmsRetryCount: true,
        cbmsLastRetryAt: true,
      },
    })) as FailedInvoiceRecord[];

    summary.failedCount = failedInvoices.filter((inv: FailedInvoiceRecord) => inv.cbmsError).length;

    const failedEntries: FailedSyncEntry[] = failedInvoices.map((inv: FailedInvoiceRecord) => ({
      invoiceId: inv.id,
      invoiceNumber: inv.invoiceNumber,
      invoiceDate: inv.invoiceDateBs,
      buyerName: inv.buyerName,
      totalAmount: Number(inv.totalAmount),
      lastError: inv.cbmsError,
      retryCount: inv.cbmsRetryCount,
      lastRetryAt: inv.cbmsLastRetryAt?.toISOString() || null,
    }));

    // Get recent sync logs
    const syncLogs = (await prisma.cBMSSyncLog.findMany({
      where: {
        restaurantId: session.restaurantId,
        fiscalYear,
      },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        type: true,
        invoiceNumber: true,
        status: true,
        responseCode: true,
        responseMessage: true,
        attemptNumber: true,
        createdAt: true,
      },
    })) as SyncLogRecord[];

    const logEntries: SyncLogEntry[] = syncLogs.map((log: SyncLogRecord) => ({
      id: log.id,
      type: log.type,
      invoiceNumber: log.invoiceNumber,
      status: log.status,
      responseCode: log.responseCode,
      responseMessage: log.responseMessage,
      attemptNumber: log.attemptNumber,
      createdAt: log.createdAt.toISOString(),
    }));

    return NextResponse.json({
      config: {
        enabled: cbmsConfig?.enabled || false,
        syncMode: cbmsConfig?.syncMode || "REALTIME",
        lastSyncAt: cbmsConfig?.lastSyncAt?.toISOString() || null,
        lastSyncStatus: cbmsConfig?.lastSyncStatus || null,
        credentialsValid: cbmsConfig?.credentialsValid || false,
      },
      summary,
      failedInvoices: failedEntries,
      recentLogs: logEntries,
      fiscalYear,
      generatedAt: new Date().toISOString(),
      generatedAtBs: adToBS(new Date()),
    });
  } catch (error) {
    console.error("Error generating CBMS status report:", error);
    return NextResponse.json(
      { error: "Failed to generate CBMS status report" },
      { status: 500 }
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// POST - Retry failed syncs
// ═══════════════════════════════════════════════════════════════════════════════

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only OWNER, MANAGER can retry syncs
    if (!["OWNER", "MANAGER", "SUPER_ADMIN"].includes(session.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { invoiceIds } = body;

    if (!invoiceIds || !Array.isArray(invoiceIds) || invoiceIds.length === 0) {
      return NextResponse.json(
        { error: "Invoice IDs required" },
        { status: 400 }
      );
    }

    // Import the service dynamically to avoid circular imports
    const { createInvoiceService } = await import("@/lib/services/invoice.service");
    const invoiceService = createInvoiceService(session.restaurantId);

    const results = [];

    for (const invoiceId of invoiceIds) {
      const result = await invoiceService.syncInvoiceToCBMS(invoiceId);
      results.push({
        invoiceId,
        success: result.success,
        code: result.code,
        message: result.message,
      });
    }

    const successCount = results.filter((r) => r.success).length;
    const failedCount = results.filter((r) => !r.success).length;

    return NextResponse.json({
      message: `Sync completed: ${successCount} successful, ${failedCount} failed`,
      results,
    });
  } catch (error) {
    console.error("Error retrying CBMS sync:", error);
    return NextResponse.json(
      { error: "Failed to retry CBMS sync" },
      { status: 500 }
    );
  }
}
