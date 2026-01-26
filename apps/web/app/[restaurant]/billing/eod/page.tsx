"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@qr-dine/ui";
import { Button } from "@qr-dine/ui";
import { Input } from "@qr-dine/ui";
import {
  Calendar,
  DollarSign,
  CreditCard,
  Banknote,
  Smartphone,
  Loader2,
  Check,
  X,
  Printer,
  Calculator,
  AlertCircle,
  CheckCircle,
  Clock,
  Receipt,
  TrendingUp,
  TrendingDown,
  ArrowLeft,
  FileText,
} from "lucide-react";

interface PaymentBreakdown {
  method: string;
  count: number;
  amount: number;
}

interface EODSummary {
  date: string;
  totalSales: number;
  totalOrders: number;
  totalBills: number;
  paidBills: number;
  unpaidBills: number;
  averageOrderValue: number;
  paymentBreakdown: PaymentBreakdown[];
  cashExpected: number;
  discountsGiven: number;
  taxCollected: number;
  serviceCharges: number;
  refunds: number;
  voidedOrders: number;
  topSellingItems: Array<{ name: string; quantity: number; revenue: number }>;
  hourlyBreakdown: Array<{ hour: string; orders: number; revenue: number }>;
}

interface CashReconciliation {
  systemCash: number;
  actualCash: number;
  variance: number;
  notes: string;
}

export default function EODSettlementPage() {
  const params = useParams();
  const restaurant = params.restaurant as string;

  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<EODSummary | null>(null);
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [reconciliation, setReconciliation] = useState<CashReconciliation>({
    systemCash: 0,
    actualCash: 0,
    variance: 0,
    notes: "",
  });
  const [closingDay, setClosingDay] = useState(false);
  const [dayClosed, setDayClosed] = useState(false);

  useEffect(() => {
    fetchEODSummary();
  }, [selectedDate]);

  const fetchEODSummary = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/eod?date=${selectedDate}`);
      if (!res.ok) throw new Error("Failed to fetch EOD summary");
      const data = await res.json();
      setSummary(data.summary);
      setReconciliation((prev) => ({
        ...prev,
        systemCash: data.summary.cashExpected,
      }));
      setDayClosed(data.dayClosed || false);
    } catch (error) {
      console.error("Error fetching EOD summary:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleActualCashChange = (value: string) => {
    const actualCash = parseFloat(value) || 0;
    setReconciliation((prev) => ({
      ...prev,
      actualCash,
      variance: actualCash - prev.systemCash,
    }));
  };

  const closeDay = async () => {
    if (!confirm("Are you sure you want to close this day? This action cannot be undone.")) {
      return;
    }

    setClosingDay(true);
    try {
      const res = await fetch("/api/eod/close", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: selectedDate,
          actualCash: reconciliation.actualCash,
          variance: reconciliation.variance,
          notes: reconciliation.notes,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to close day");
      }

      setDayClosed(true);
      alert("Day closed successfully!");
    } catch (error) {
      console.error("Error closing day:", error);
      alert("Failed to close day. Please try again.");
    } finally {
      setClosingDay(false);
    }
  };

  const printReport = () => {
    if (!summary) return;

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>EOD Report - ${selectedDate}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              max-width: 800px;
              margin: 0 auto;
              padding: 20px;
              font-size: 14px;
            }
            .header {
              text-align: center;
              border-bottom: 2px solid #000;
              padding-bottom: 15px;
              margin-bottom: 20px;
            }
            .header h1 {
              margin: 0 0 5px 0;
              font-size: 24px;
            }
            .section {
              margin-bottom: 20px;
            }
            .section-title {
              font-size: 16px;
              font-weight: bold;
              border-bottom: 1px solid #ccc;
              padding-bottom: 5px;
              margin-bottom: 10px;
            }
            .row {
              display: flex;
              justify-content: space-between;
              padding: 5px 0;
            }
            .row.highlight {
              background: #f5f5f5;
              font-weight: bold;
              padding: 10px 5px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 10px;
            }
            th, td {
              padding: 8px;
              text-align: left;
              border-bottom: 1px solid #ddd;
            }
            th {
              background: #f5f5f5;
            }
            .variance-positive { color: green; }
            .variance-negative { color: red; }
            .footer {
              margin-top: 30px;
              border-top: 2px solid #000;
              padding-top: 15px;
            }
            .signature-line {
              margin-top: 40px;
              border-top: 1px solid #000;
              width: 200px;
              text-align: center;
              padding-top: 5px;
            }
            @media print {
              body { margin: 0; padding: 15px; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>${restaurant.replace(/-/g, " ").toUpperCase()}</h1>
            <p>End of Day Settlement Report</p>
            <p><strong>Date:</strong> ${new Date(selectedDate || new Date().toISOString().split("T")[0]!).toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</p>
          </div>

          <div class="section">
            <div class="section-title">Sales Summary</div>
            <div class="row"><span>Total Sales:</span><span>Rs.${summary.totalSales.toFixed(0)}</span></div>
            <div class="row"><span>Total Orders:</span><span>${summary.totalOrders}</span></div>
            <div class="row"><span>Average Order Value:</span><span>Rs.${summary.averageOrderValue.toFixed(0)}</span></div>
            <div class="row"><span>Total Bills:</span><span>${summary.totalBills}</span></div>
            <div class="row"><span>Paid Bills:</span><span>${summary.paidBills}</span></div>
            <div class="row"><span>Unpaid Bills:</span><span>${summary.unpaidBills}</span></div>
          </div>

          <div class="section">
            <div class="section-title">Payment Breakdown</div>
            <table>
              <tr><th>Method</th><th>Transactions</th><th>Amount</th></tr>
              ${summary.paymentBreakdown.map((p) => `<tr><td>${p.method}</td><td>${p.count}</td><td>Rs.${p.amount.toFixed(0)}</td></tr>`).join("")}
            </table>
          </div>

          <div class="section">
            <div class="section-title">Deductions & Adjustments</div>
            <div class="row"><span>Discounts Given:</span><span>Rs.${summary.discountsGiven.toFixed(0)}</span></div>
            <div class="row"><span>Tax Collected:</span><span>Rs.${summary.taxCollected.toFixed(0)}</span></div>
            <div class="row"><span>Service Charges:</span><span>Rs.${summary.serviceCharges.toFixed(0)}</span></div>
            <div class="row"><span>Refunds:</span><span>Rs.${summary.refunds.toFixed(0)}</span></div>
            <div class="row"><span>Voided Orders:</span><span>${summary.voidedOrders}</span></div>
          </div>

          <div class="section">
            <div class="section-title">Cash Reconciliation</div>
            <div class="row"><span>System Cash (Expected):</span><span>Rs.${reconciliation.systemCash.toFixed(0)}</span></div>
            <div class="row"><span>Actual Cash Counted:</span><span>Rs.${reconciliation.actualCash.toFixed(0)}</span></div>
            <div class="row highlight">
              <span>Variance:</span>
              <span class="${reconciliation.variance >= 0 ? "variance-positive" : "variance-negative"}">
                ${reconciliation.variance >= 0 ? "+" : ""}Rs.${reconciliation.variance.toFixed(0)}
              </span>
            </div>
            ${reconciliation.notes ? `<div class="row"><span>Notes:</span><span>${reconciliation.notes}</span></div>` : ""}
          </div>

          <div class="section">
            <div class="section-title">Top Selling Items</div>
            <table>
              <tr><th>Item</th><th>Quantity</th><th>Revenue</th></tr>
              ${summary.topSellingItems.slice(0, 10).map((item) => `<tr><td>${item.name}</td><td>${item.quantity}</td><td>Rs.${item.revenue.toFixed(0)}</td></tr>`).join("")}
            </table>
          </div>

          <div class="footer">
            <div class="row highlight">
              <span>NET SALES:</span>
              <span>Rs.${summary.totalSales.toFixed(0)}</span>
            </div>
            <p>Report Generated: ${new Date().toLocaleString()}</p>
            <div style="display: flex; justify-content: space-between; margin-top: 30px;">
              <div class="signature-line">Cashier Signature</div>
              <div class="signature-line">Manager Signature</div>
            </div>
          </div>

          <script>
            window.onload = function() { window.print(); }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const formatCurrency = (amount: number) => `Rs.${amount.toFixed(0)}`;

  const getPaymentMethodIcon = (method: string) => {
    switch (method) {
      case "CASH":
        return <Banknote className="h-4 w-4" />;
      case "CARD":
        return <CreditCard className="h-4 w-4" />;
      case "ESEWA":
      case "FONEPAY":
        return <Smartphone className="h-4 w-4" />;
      default:
        return <DollarSign className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href={`/${restaurant}/billing`}>
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">End of Day Settlement</h1>
            <p className="text-muted-foreground">
              Daily sales summary and cash reconciliation
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-auto"
          />
          <Button variant="outline" onClick={printReport} disabled={!summary}>
            <Printer className="h-4 w-4 mr-2" />
            Print Report
          </Button>
        </div>
      </div>

      {/* Day Closed Banner */}
      {dayClosed && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
          <CheckCircle className="h-5 w-5 text-green-600" />
          <div>
            <p className="font-medium text-green-900">Day Closed</p>
            <p className="text-sm text-green-700">
              This day has been closed and finalized.
            </p>
          </div>
        </div>
      )}

      {summary && (
        <>
          {/* Summary Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(summary.totalSales)}
                </div>
                <p className="text-xs text-muted-foreground">
                  {summary.totalOrders} orders today
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Average Order</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(summary.averageOrderValue)}
                </div>
                <p className="text-xs text-muted-foreground">Per order average</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Bills Status</CardTitle>
                <Receipt className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {summary.paidBills}/{summary.totalBills}
                </div>
                <p className="text-xs text-muted-foreground">
                  {summary.unpaidBills > 0 && (
                    <span className="text-amber-600">
                      {summary.unpaidBills} unpaid
                    </span>
                  )}
                  {summary.unpaidBills === 0 && (
                    <span className="text-green-600">All bills paid</span>
                  )}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Discounts</CardTitle>
                <TrendingDown className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(summary.discountsGiven)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Total discounts given
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Payment Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Payment Breakdown
                </CardTitle>
                <CardDescription>
                  Sales by payment method
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {summary.paymentBreakdown.map((payment) => (
                    <div
                      key={payment.method}
                      className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        {getPaymentMethodIcon(payment.method)}
                        <div>
                          <p className="font-medium">{payment.method}</p>
                          <p className="text-sm text-muted-foreground">
                            {payment.count} transactions
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">{formatCurrency(payment.amount)}</p>
                        <p className="text-xs text-muted-foreground">
                          {((payment.amount / summary.totalSales) * 100).toFixed(1)}%
                        </p>
                      </div>
                    </div>
                  ))}
                  {summary.paymentBreakdown.length === 0 && (
                    <p className="text-center text-muted-foreground py-4">
                      No payments recorded
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Cash Reconciliation */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calculator className="h-5 w-5" />
                  Cash Reconciliation
                </CardTitle>
                <CardDescription>
                  Count and verify cash drawer
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-muted/50 rounded-lg">
                  <div className="flex justify-between mb-2">
                    <span className="text-muted-foreground">System Cash (Expected)</span>
                    <span className="font-bold">
                      {formatCurrency(reconciliation.systemCash)}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Based on all cash payments today
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Actual Cash Counted</label>
                  <Input
                    type="number"
                    placeholder="Enter actual cash amount"
                    value={reconciliation.actualCash || ""}
                    onChange={(e) => handleActualCashChange(e.target.value)}
                    disabled={dayClosed}
                  />
                </div>

                {reconciliation.actualCash > 0 && (
                  <div
                    className={`p-4 rounded-lg ${
                      reconciliation.variance >= 0
                        ? "bg-green-50 border border-green-200"
                        : "bg-red-50 border border-red-200"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">Variance</span>
                      <span
                        className={`text-xl font-bold ${
                          reconciliation.variance >= 0
                            ? "text-green-600"
                            : "text-red-600"
                        }`}
                      >
                        {reconciliation.variance >= 0 ? "+" : ""}
                        {formatCurrency(reconciliation.variance)}
                      </span>
                    </div>
                    {reconciliation.variance !== 0 && (
                      <p className="text-sm mt-1 text-muted-foreground">
                        {reconciliation.variance > 0
                          ? "Cash over - more than expected"
                          : "Cash short - less than expected"}
                      </p>
                    )}
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-sm font-medium">Notes</label>
                  <textarea
                    className="w-full px-3 py-2 border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                    rows={3}
                    placeholder="Add any notes about variances or issues..."
                    value={reconciliation.notes}
                    onChange={(e) =>
                      setReconciliation((prev) => ({
                        ...prev,
                        notes: e.target.value,
                      }))
                    }
                    disabled={dayClosed}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Top Selling Items */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Top Selling Items
              </CardTitle>
              <CardDescription>Best performers of the day</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4 font-medium">#</th>
                      <th className="text-left py-3 px-4 font-medium">Item</th>
                      <th className="text-right py-3 px-4 font-medium">Qty Sold</th>
                      <th className="text-right py-3 px-4 font-medium">Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.topSellingItems.slice(0, 10).map((item, index) => (
                      <tr key={index} className="border-b last:border-0">
                        <td className="py-3 px-4 text-muted-foreground">
                          {index + 1}
                        </td>
                        <td className="py-3 px-4 font-medium">{item.name}</td>
                        <td className="py-3 px-4 text-right">{item.quantity}</td>
                        <td className="py-3 px-4 text-right font-medium">
                          {formatCurrency(item.revenue)}
                        </td>
                      </tr>
                    ))}
                    {summary.topSellingItems.length === 0 && (
                      <tr>
                        <td
                          colSpan={4}
                          className="py-8 text-center text-muted-foreground"
                        >
                          No items sold today
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Hourly Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Hourly Breakdown
              </CardTitle>
              <CardDescription>Sales performance by hour</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-6 md:grid-cols-12 gap-2">
                {summary.hourlyBreakdown.map((hour) => (
                  <div
                    key={hour.hour}
                    className="text-center p-2 bg-muted/50 rounded-lg"
                  >
                    <p className="text-xs text-muted-foreground">{hour.hour}</p>
                    <p className="font-bold text-sm">{hour.orders}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatCurrency(hour.revenue)}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Close Day Button */}
          {!dayClosed && (
            <Card className="border-amber-200 bg-amber-50">
              <CardContent className="py-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <AlertCircle className="h-6 w-6 text-amber-600" />
                    <div>
                      <p className="font-medium text-amber-900">
                        Ready to close the day?
                      </p>
                      <p className="text-sm text-amber-700">
                        Make sure all cash is counted and reconciliation is complete.
                      </p>
                    </div>
                  </div>
                  <Button
                    onClick={closeDay}
                    disabled={closingDay || reconciliation.actualCash === 0}
                    className="bg-amber-600 hover:bg-amber-700"
                  >
                    {closingDay ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Check className="h-4 w-4 mr-2" />
                    )}
                    Close Day
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {!summary && !loading && (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-lg font-medium">No data available</p>
              <p className="text-muted-foreground">
                No sales data found for the selected date.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
