"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@qr-dine/ui";
import { Button } from "@qr-dine/ui";
import { Input } from "@qr-dine/ui";
import {
  Banknote,
  ArrowLeft,
  Download,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  Building,
  CreditCard,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";

interface CashActivity {
  date: Date;
  voucherNumber: string;
  voucherType: string;
  description: string;
  inflow: number;
  outflow: number;
}

interface ActivitySection {
  activities: CashActivity[];
  totalInflow: number;
  totalOutflow: number;
  netCashFlow: number;
}

interface CashFlowData {
  period: {
    startDate: string;
    endDate: string;
  };
  openingBalance: number;
  operating: ActivitySection;
  investing: ActivitySection;
  financing: ActivitySection;
  summary: {
    netOperating: number;
    netInvesting: number;
    netFinancing: number;
    netCashFlow: number;
    openingBalance: number;
    closingBalance: number;
  };
  dailyCashFlow: Array<{
    date: string;
    inflow: number;
    outflow: number;
    net: number;
  }>;
  metadata: {
    cashAccounts: Array<{ accountCode: string; accountName: string }>;
  };
}

export default function CashFlowPage() {
  const params = useParams();
  const restaurant = params.restaurant as string;

  const [data, setData] = useState<CashFlowData | null>(null);
  const [loading, setLoading] = useState(true);

  // Default to current month
  const today = new Date();
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

  const [startDate, setStartDate] = useState(
    monthStart.toISOString().split("T")[0]
  );
  const [endDate, setEndDate] = useState(today.toISOString().split("T")[0]);

  useEffect(() => {
    fetchReport();
  }, [startDate, endDate]);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append("startDate", startDate);
      params.append("endDate", endDate);

      const response = await fetch(`/api/reports/financial/cash-flow?${params}`);
      const result = await response.json();

      if (response.ok) {
        setData(result);
      }
    } catch (error) {
      console.error("Error fetching cash flow:", error);
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    if (!data) return;

    const rows = [
      ["Cash Flow Statement"],
      [`Period: ${startDate} to ${endDate}`],
      [],
      ["Opening Cash Balance", data.openingBalance.toString()],
      [],
      ["OPERATING ACTIVITIES"],
      ["Date", "Voucher", "Type", "Description", "Inflow", "Outflow"],
      ...data.operating.activities.map((a) => [
        new Date(a.date).toLocaleDateString(),
        a.voucherNumber,
        a.voucherType,
        a.description,
        a.inflow.toString(),
        a.outflow.toString(),
      ]),
      ["", "", "", "Net Operating", data.summary.netOperating.toString(), ""],
      [],
      ["INVESTING ACTIVITIES"],
      ...data.investing.activities.map((a) => [
        new Date(a.date).toLocaleDateString(),
        a.voucherNumber,
        a.voucherType,
        a.description,
        a.inflow.toString(),
        a.outflow.toString(),
      ]),
      ["", "", "", "Net Investing", data.summary.netInvesting.toString(), ""],
      [],
      ["FINANCING ACTIVITIES"],
      ...data.financing.activities.map((a) => [
        new Date(a.date).toLocaleDateString(),
        a.voucherNumber,
        a.voucherType,
        a.description,
        a.inflow.toString(),
        a.outflow.toString(),
      ]),
      ["", "", "", "Net Financing", data.summary.netFinancing.toString(), ""],
      [],
      ["Net Change in Cash", data.summary.netCashFlow.toString()],
      ["Closing Cash Balance", data.summary.closingBalance.toString()],
    ];

    const csvContent = rows.map((row) => row.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cash-flow-${startDate}-to-${endDate}.csv`;
    a.click();
  };

  const renderActivitySection = (
    title: string,
    icon: React.ReactNode,
    section: ActivitySection,
    color: string
  ) => (
    <Card>
      <CardHeader>
        <CardTitle className={`flex items-center gap-2 ${color}`}>
          {icon}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {section.activities.length === 0 ? (
          <p className="text-gray-500 text-center py-4">No activities</p>
        ) : (
          <div className="space-y-2">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left pb-2 font-medium text-gray-500">Date</th>
                    <th className="text-left pb-2 font-medium text-gray-500">Description</th>
                    <th className="text-right pb-2 font-medium text-gray-500">Inflow</th>
                    <th className="text-right pb-2 font-medium text-gray-500">Outflow</th>
                  </tr>
                </thead>
                <tbody>
                  {section.activities.slice(0, 10).map((activity, idx) => (
                    <tr key={idx} className="border-b">
                      <td className="py-2 text-gray-600">
                        {new Date(activity.date).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })}
                      </td>
                      <td className="py-2">
                        <span className="text-xs text-gray-400 mr-2">
                          {activity.voucherNumber}
                        </span>
                        {activity.description.substring(0, 30)}
                        {activity.description.length > 30 ? "..." : ""}
                      </td>
                      <td className="py-2 text-right font-mono text-green-600">
                        {activity.inflow > 0
                          ? activity.inflow.toLocaleString()
                          : ""}
                      </td>
                      <td className="py-2 text-right font-mono text-red-600">
                        {activity.outflow > 0
                          ? activity.outflow.toLocaleString()
                          : ""}
                      </td>
                    </tr>
                  ))}
                  {section.activities.length > 10 && (
                    <tr>
                      <td colSpan={4} className="py-2 text-center text-gray-500 text-sm">
                        +{section.activities.length - 10} more activities
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Section Summary */}
            <div className="grid grid-cols-3 gap-4 pt-4 border-t mt-4">
              <div className="text-center">
                <p className="text-xs text-gray-500">Inflow</p>
                <p className="font-mono font-medium text-green-600">
                  {section.totalInflow.toLocaleString()}
                </p>
              </div>
              <div className="text-center">
                <p className="text-xs text-gray-500">Outflow</p>
                <p className="font-mono font-medium text-red-600">
                  {section.totalOutflow.toLocaleString()}
                </p>
              </div>
              <div className="text-center">
                <p className="text-xs text-gray-500">Net</p>
                <p
                  className={`font-mono font-bold ${
                    section.netCashFlow >= 0 ? "text-green-700" : "text-red-700"
                  }`}
                >
                  {section.netCashFlow >= 0 ? "+" : ""}
                  {section.netCashFlow.toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href={`/${restaurant}/reports/financial`}>
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Cash Flow Statement</h1>
            <p className="text-gray-500">Track cash inflows and outflows</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchReport}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline" onClick={exportToCSV} disabled={!data}>
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4 items-end">
            <div>
              <label className="block text-sm font-medium mb-1">From</label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-40"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">To</label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-40"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      {data && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="border-l-4 border-l-blue-500">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Banknote className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Opening Balance</p>
                  <p className="text-xl font-bold text-blue-600">
                    Rs. {data.summary.openingBalance.toLocaleString()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card
            className={`border-l-4 ${
              data.summary.netCashFlow >= 0
                ? "border-l-green-500"
                : "border-l-red-500"
            }`}
          >
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div
                  className={`p-2 rounded-lg ${
                    data.summary.netCashFlow >= 0 ? "bg-green-100" : "bg-red-100"
                  }`}
                >
                  {data.summary.netCashFlow >= 0 ? (
                    <ArrowUpRight className="w-5 h-5 text-green-600" />
                  ) : (
                    <ArrowDownRight className="w-5 h-5 text-red-600" />
                  )}
                </div>
                <div>
                  <p className="text-sm text-gray-500">Net Cash Flow</p>
                  <p
                    className={`text-xl font-bold ${
                      data.summary.netCashFlow >= 0
                        ? "text-green-600"
                        : "text-red-600"
                    }`}
                  >
                    {data.summary.netCashFlow >= 0 ? "+" : ""}Rs.{" "}
                    {data.summary.netCashFlow.toLocaleString()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-purple-500">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Banknote className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Closing Balance</p>
                  <p className="text-xl font-bold text-purple-600">
                    Rs. {data.summary.closingBalance.toLocaleString()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-gray-500 mb-2">Cash Accounts</p>
              {data.metadata.cashAccounts.length === 0 ? (
                <p className="text-gray-400 text-sm">No cash accounts found</p>
              ) : (
                <div className="space-y-1">
                  {data.metadata.cashAccounts.slice(0, 3).map((acc, idx) => (
                    <p key={idx} className="text-sm">
                      <span className="font-mono text-gray-400 mr-1">
                        {acc.accountCode}
                      </span>
                      {acc.accountName}
                    </p>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Cash Flow Sections */}
      {loading ? (
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-48 bg-gray-100 rounded"></div>
          ))}
        </div>
      ) : data ? (
        <div className="space-y-6">
          {renderActivitySection(
            "Operating Activities",
            <TrendingUp className="w-5 h-5" />,
            data.operating,
            "text-green-700"
          )}

          {renderActivitySection(
            "Investing Activities",
            <Building className="w-5 h-5" />,
            data.investing,
            "text-blue-700"
          )}

          {renderActivitySection(
            "Financing Activities",
            <CreditCard className="w-5 h-5" />,
            data.financing,
            "text-purple-700"
          )}
        </div>
      ) : (
        <div className="text-center py-12 text-gray-500">
          Failed to load cash flow data
        </div>
      )}

      {/* Cash Flow Summary */}
      {data && (
        <Card className="bg-gradient-to-r from-blue-50 via-green-50 to-purple-50 border-2">
          <CardHeader>
            <CardTitle>Cash Flow Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div className="text-center p-4 bg-white rounded-lg shadow-sm">
                <p className="text-sm text-gray-500">Opening</p>
                <p className="text-xl font-bold text-blue-600">
                  Rs. {data.summary.openingBalance.toLocaleString()}
                </p>
              </div>

              <div className="text-center p-4 bg-white rounded-lg shadow-sm">
                <p className="text-sm text-gray-500">Operating</p>
                <p
                  className={`text-xl font-bold ${
                    data.summary.netOperating >= 0 ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {data.summary.netOperating >= 0 ? "+" : ""}
                  {data.summary.netOperating.toLocaleString()}
                </p>
              </div>

              <div className="text-center p-4 bg-white rounded-lg shadow-sm">
                <p className="text-sm text-gray-500">Investing</p>
                <p
                  className={`text-xl font-bold ${
                    data.summary.netInvesting >= 0 ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {data.summary.netInvesting >= 0 ? "+" : ""}
                  {data.summary.netInvesting.toLocaleString()}
                </p>
              </div>

              <div className="text-center p-4 bg-white rounded-lg shadow-sm">
                <p className="text-sm text-gray-500">Financing</p>
                <p
                  className={`text-xl font-bold ${
                    data.summary.netFinancing >= 0 ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {data.summary.netFinancing >= 0 ? "+" : ""}
                  {data.summary.netFinancing.toLocaleString()}
                </p>
              </div>

              <div className="text-center p-4 bg-purple-100 rounded-lg">
                <p className="text-sm text-purple-700">Closing</p>
                <p className="text-xl font-bold text-purple-700">
                  Rs. {data.summary.closingBalance.toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
