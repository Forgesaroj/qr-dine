"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Button,
} from "@qr-dine/ui";
import {
  FileText,
  Download,
  Loader2,
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  TrendingUp,
  Receipt,
  Building2,
  Calendar,
  ArrowLeft,
} from "lucide-react";
import Link from "next/link";

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
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
}

interface SalesRegisterData {
  header: {
    restaurantName: string;
    sellerPan: string;
    fiscalYear: string;
    fiscalYearDisplay: string;
    generatedAtBs: string;
  };
  entries: SalesRegisterEntry[];
  summary: SalesRegisterSummary;
}

interface MonthlySummary {
  month: number;
  monthName: string;
  invoiceCount: number;
  totalTaxable: number;
  totalVat: number;
  totalAmount: number;
}

interface VatSummary {
  fiscalYear: string;
  totalTaxableAmount: number;
  totalVatCollected: number;
  totalExemptAmount: number;
  vatRate: number;
  effectiveVatRate: number;
}

interface VatReportData {
  header: {
    restaurantName: string;
    sellerPan: string;
    fiscalYearDisplay: string;
    reportType: string;
  };
  data: MonthlySummary[];
  summary: VatSummary;
}

interface CBMSConfig {
  enabled: boolean;
  syncMode: string;
  lastSyncAt: string | null;
  lastSyncStatus: string | null;
  credentialsValid: boolean;
}

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
}

interface CBMSStatusData {
  config: CBMSConfig;
  summary: SyncStatusSummary;
  failedInvoices: FailedSyncEntry[];
  fiscalYear: string;
}

type TabType = "sales-register" | "vat-report" | "cbms-status";

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export default function IRDReportsPage() {
  const params = useParams();
  const restaurant = params.restaurant as string;

  const [activeTab, setActiveTab] = useState<TabType>("sales-register");
  const [loading, setLoading] = useState(true);
  const [fiscalYear, setFiscalYear] = useState("");

  // Data states
  const [salesRegisterData, setSalesRegisterData] = useState<SalesRegisterData | null>(null);
  const [vatReportData, setVatReportData] = useState<VatReportData | null>(null);
  const [cbmsStatusData, setCbmsStatusData] = useState<CBMSStatusData | null>(null);

  const [retrying, setRetrying] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, [activeTab, fiscalYear]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const yearParam = fiscalYear ? `?fiscalYear=${fiscalYear}` : "";

      if (activeTab === "sales-register") {
        const res = await fetch(`/api/reports/ird/sales-register${yearParam}`);
        if (res.ok) {
          const data = await res.json();
          setSalesRegisterData(data);
          if (!fiscalYear) setFiscalYear(data.header.fiscalYear);
        }
      } else if (activeTab === "vat-report") {
        const res = await fetch(`/api/reports/ird/vat${yearParam}&type=monthly`);
        if (res.ok) {
          const data = await res.json();
          setVatReportData(data);
        }
      } else if (activeTab === "cbms-status") {
        const res = await fetch(`/api/reports/ird/cbms-status${yearParam}`);
        if (res.ok) {
          const data = await res.json();
          setCbmsStatusData(data);
        }
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (format: "csv" | "pdf") => {
    const yearParam = fiscalYear ? `fiscalYear=${fiscalYear}&` : "";
    let url = "";

    if (activeTab === "sales-register") {
      url = `/api/reports/ird/sales-register?${yearParam}format=${format}`;
    } else if (activeTab === "vat-report") {
      url = `/api/reports/ird/vat?${yearParam}type=monthly&format=${format}`;
    }

    if (url) {
      window.open(url, "_blank");
    }
  };

  const handleRetrySync = async (invoiceId: string) => {
    setRetrying(invoiceId);
    try {
      const res = await fetch("/api/reports/ird/cbms-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invoiceIds: [invoiceId] }),
      });
      if (res.ok) {
        fetchData();
      }
    } catch (error) {
      console.error("Retry failed:", error);
    } finally {
      setRetrying(null);
    }
  };

  const handleRetryAllFailed = async () => {
    if (!cbmsStatusData?.failedInvoices.length) return;
    setRetrying("all");
    try {
      const invoiceIds = cbmsStatusData.failedInvoices.map((inv) => inv.invoiceId);
      const res = await fetch("/api/reports/ird/cbms-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invoiceIds }),
      });
      if (res.ok) {
        fetchData();
      }
    } catch (error) {
      console.error("Retry all failed:", error);
    } finally {
      setRetrying(null);
    }
  };

  const formatCurrency = (amount: number) => {
    return `Rs. ${amount.toLocaleString("en-NP", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const tabs = [
    { id: "sales-register" as TabType, label: "Sales Register", icon: Receipt },
    { id: "vat-report" as TabType, label: "VAT Report", icon: TrendingUp },
    { id: "cbms-status" as TabType, label: "CBMS Status", icon: RefreshCw },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href={`/${restaurant}/reports`}>
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Building2 className="h-6 w-6" />
              IRD Reports
            </h1>
            <p className="text-sm text-gray-500">Nepal Inland Revenue Department compliance reports</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={fiscalYear}
            onChange={(e) => setFiscalYear(e.target.value)}
            className="border rounded-md px-3 py-2 text-sm"
          >
            <option value="">Current FY</option>
            <option value="2081.082">2081/082</option>
            <option value="2080.081">2080/081</option>
            <option value="2079.080">2079/080</option>
          </select>
          {activeTab !== "cbms-status" && (
            <Button variant="outline" onClick={() => handleExport("csv")}>
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b">
        <nav className="flex gap-4">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${
                activeTab === tab.id
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      ) : (
        <>
          {activeTab === "sales-register" && salesRegisterData && (
            <SalesRegisterTab data={salesRegisterData} formatCurrency={formatCurrency} />
          )}
          {activeTab === "vat-report" && vatReportData && (
            <VatReportTab data={vatReportData} formatCurrency={formatCurrency} />
          )}
          {activeTab === "cbms-status" && cbmsStatusData && (
            <CBMSStatusTab
              data={cbmsStatusData}
              formatCurrency={formatCurrency}
              onRetry={handleRetrySync}
              onRetryAll={handleRetryAllFailed}
              retrying={retrying}
            />
          )}
        </>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SALES REGISTER TAB
// ═══════════════════════════════════════════════════════════════════════════════

function SalesRegisterTab({
  data,
  formatCurrency,
}: {
  data: SalesRegisterData;
  formatCurrency: (amount: number) => string;
}) {
  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Total Invoices</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.summary.totalInvoices}</div>
            <p className="text-xs text-gray-500">
              {data.summary.totalActive} active, {data.summary.totalCancelled} cancelled
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Taxable Amount</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(data.summary.totalTaxable)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">VAT Collected</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(data.summary.totalVat)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Grand Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(data.summary.grandTotal)}</div>
          </CardContent>
        </Card>
      </div>

      {/* CBMS Sync Status */}
      <div className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
        <span className="text-sm font-medium">CBMS Sync:</span>
        <span className="flex items-center gap-1 text-sm text-green-600">
          <CheckCircle2 className="h-4 w-4" />
          {data.summary.cbmsSyncedCount} synced
        </span>
        {data.summary.cbmsPendingCount > 0 && (
          <span className="flex items-center gap-1 text-sm text-yellow-600">
            <Clock className="h-4 w-4" />
            {data.summary.cbmsPendingCount} pending
          </span>
        )}
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Sales Register (Annex 6)</CardTitle>
          <CardDescription>
            {data.header.restaurantName} | PAN: {data.header.sellerPan} | FY: {data.header.fiscalYearDisplay}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="text-left p-2">S.N.</th>
                  <th className="text-left p-2">Invoice No.</th>
                  <th className="text-left p-2">Date (BS)</th>
                  <th className="text-left p-2">Buyer</th>
                  <th className="text-left p-2">PAN</th>
                  <th className="text-right p-2">Taxable</th>
                  <th className="text-right p-2">VAT 13%</th>
                  <th className="text-right p-2">Total</th>
                  <th className="text-center p-2">Status</th>
                  <th className="text-center p-2">CBMS</th>
                </tr>
              </thead>
              <tbody>
                {data.entries.map((entry) => (
                  <tr key={entry.invoiceNumber} className={`border-b ${entry.status === "CANCELLED" ? "bg-red-50 text-gray-400" : ""}`}>
                    <td className="p-2">{entry.sn}</td>
                    <td className="p-2 font-mono text-xs">{entry.invoiceNumber}</td>
                    <td className="p-2">{entry.invoiceDateBs}</td>
                    <td className="p-2">{entry.buyerName}</td>
                    <td className="p-2">{entry.buyerPan || "-"}</td>
                    <td className="p-2 text-right">{formatCurrency(entry.taxableAmount)}</td>
                    <td className="p-2 text-right">{formatCurrency(entry.vatAmount)}</td>
                    <td className="p-2 text-right font-medium">{formatCurrency(entry.totalAmount)}</td>
                    <td className="p-2 text-center">
                      {entry.status === "CANCELLED" ? (
                        <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded">Cancelled</span>
                      ) : (
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">Active</span>
                      )}
                    </td>
                    <td className="p-2 text-center">
                      {entry.cbmsSynced ? (
                        <CheckCircle2 className="h-4 w-4 text-green-500 mx-auto" />
                      ) : (
                        <Clock className="h-4 w-4 text-yellow-500 mx-auto" />
                      )}
                    </td>
                  </tr>
                ))}
                {data.entries.length === 0 && (
                  <tr>
                    <td colSpan={10} className="p-8 text-center text-gray-500">
                      No invoices found for this fiscal year
                    </td>
                  </tr>
                )}
              </tbody>
              {data.entries.length > 0 && (
                <tfoot className="bg-gray-50 font-medium">
                  <tr>
                    <td colSpan={5} className="p-2 text-right">Totals:</td>
                    <td className="p-2 text-right">{formatCurrency(data.summary.totalTaxable)}</td>
                    <td className="p-2 text-right">{formatCurrency(data.summary.totalVat)}</td>
                    <td className="p-2 text-right">{formatCurrency(data.summary.grandTotal)}</td>
                    <td colSpan={2}></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// VAT REPORT TAB
// ═══════════════════════════════════════════════════════════════════════════════

function VatReportTab({
  data,
  formatCurrency,
}: {
  data: VatReportData;
  formatCurrency: (amount: number) => string;
}) {
  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Total Taxable</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(data.summary.totalTaxableAmount)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">VAT Collected (13%)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(data.summary.totalVatCollected)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Exempt Amount</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(data.summary.totalExemptAmount)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Effective VAT Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.summary.effectiveVatRate.toFixed(2)}%</div>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Breakdown Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Monthly VAT Summary</CardTitle>
          <CardDescription>
            {data.header.restaurantName} | FY: {data.header.fiscalYearDisplay}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="text-left p-2">Month</th>
                  <th className="text-right p-2">Invoices</th>
                  <th className="text-right p-2">Taxable Amount</th>
                  <th className="text-right p-2">VAT (13%)</th>
                  <th className="text-right p-2">Total</th>
                </tr>
              </thead>
              <tbody>
                {data.data.map((month) => (
                  <tr key={month.month} className={`border-b ${month.invoiceCount === 0 ? "text-gray-400" : ""}`}>
                    <td className="p-2 font-medium">{month.monthName}</td>
                    <td className="p-2 text-right">{month.invoiceCount}</td>
                    <td className="p-2 text-right">{formatCurrency(month.totalTaxable)}</td>
                    <td className="p-2 text-right">{formatCurrency(month.totalVat)}</td>
                    <td className="p-2 text-right font-medium">{formatCurrency(month.totalAmount)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-50 font-medium">
                <tr>
                  <td className="p-2">Total</td>
                  <td className="p-2 text-right">{data.data.reduce((sum, m) => sum + m.invoiceCount, 0)}</td>
                  <td className="p-2 text-right">{formatCurrency(data.summary.totalTaxableAmount)}</td>
                  <td className="p-2 text-right">{formatCurrency(data.summary.totalVatCollected)}</td>
                  <td className="p-2 text-right">
                    {formatCurrency(data.summary.totalTaxableAmount + data.summary.totalVatCollected)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// CBMS STATUS TAB
// ═══════════════════════════════════════════════════════════════════════════════

function CBMSStatusTab({
  data,
  formatCurrency,
  onRetry,
  onRetryAll,
  retrying,
}: {
  data: CBMSStatusData;
  formatCurrency: (amount: number) => string;
  onRetry: (invoiceId: string) => void;
  onRetryAll: () => void;
  retrying: string | null;
}) {
  return (
    <div className="space-y-6">
      {/* Config Status */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            CBMS Configuration
            {data.config.enabled ? (
              <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">Enabled</span>
            ) : (
              <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full">Disabled</span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Sync Mode:</span>
              <p className="font-medium">{data.config.syncMode}</p>
            </div>
            <div>
              <span className="text-gray-500">Last Sync:</span>
              <p className="font-medium">
                {data.config.lastSyncAt
                  ? new Date(data.config.lastSyncAt).toLocaleString()
                  : "Never"}
              </p>
            </div>
            <div>
              <span className="text-gray-500">Last Status:</span>
              <p className="font-medium">{data.config.lastSyncStatus || "N/A"}</p>
            </div>
            <div>
              <span className="text-gray-500">Credentials:</span>
              <p className={`font-medium ${data.config.credentialsValid ? "text-green-600" : "text-red-600"}`}>
                {data.config.credentialsValid ? "Valid" : "Invalid"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sync Summary */}
      <div className="grid grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Total Invoices</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.summary.totalInvoices}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Synced</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600 flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5" />
              {data.summary.syncedCount}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600 flex items-center gap-2">
              <Clock className="h-5 w-5" />
              {data.summary.pendingCount}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Failed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600 flex items-center gap-2">
              <XCircle className="h-5 w-5" />
              {data.summary.failedCount}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Sync Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.summary.syncPercentage.toFixed(1)}%</div>
          </CardContent>
        </Card>
      </div>

      {/* Failed/Pending Invoices */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg">Pending/Failed Invoices</CardTitle>
            <CardDescription>Invoices that need to be synced to CBMS</CardDescription>
          </div>
          {data.failedInvoices.length > 0 && (
            <Button
              variant="outline"
              onClick={onRetryAll}
              disabled={retrying === "all"}
            >
              {retrying === "all" ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Retry All ({data.failedInvoices.length})
            </Button>
          )}
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="text-left p-2">Invoice No.</th>
                  <th className="text-left p-2">Date</th>
                  <th className="text-left p-2">Buyer</th>
                  <th className="text-right p-2">Amount</th>
                  <th className="text-left p-2">Error</th>
                  <th className="text-center p-2">Retries</th>
                  <th className="text-center p-2">Action</th>
                </tr>
              </thead>
              <tbody>
                {data.failedInvoices.map((inv) => (
                  <tr key={inv.invoiceId} className="border-b">
                    <td className="p-2 font-mono text-xs">{inv.invoiceNumber}</td>
                    <td className="p-2">{inv.invoiceDate}</td>
                    <td className="p-2">{inv.buyerName}</td>
                    <td className="p-2 text-right">{formatCurrency(inv.totalAmount)}</td>
                    <td className="p-2">
                      {inv.lastError ? (
                        <span className="text-xs text-red-600">{inv.lastError}</span>
                      ) : (
                        <span className="text-xs text-yellow-600">Pending sync</span>
                      )}
                    </td>
                    <td className="p-2 text-center">{inv.retryCount}</td>
                    <td className="p-2 text-center">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onRetry(inv.invoiceId)}
                        disabled={retrying === inv.invoiceId}
                      >
                        {retrying === inv.invoiceId ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <RefreshCw className="h-4 w-4" />
                        )}
                      </Button>
                    </td>
                  </tr>
                ))}
                {data.failedInvoices.length === 0 && (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-gray-500">
                      <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-green-500" />
                      All invoices are synced!
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
