"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@qr-dine/ui";
import { Button } from "@qr-dine/ui";
import { Input } from "@qr-dine/ui";
import {
  TrendingUp,
  TrendingDown,
  ArrowLeft,
  Download,
  RefreshCw,
  DollarSign,
  Building2,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";

interface AccountItem {
  id: string;
  accountCode: string;
  accountName: string;
  accountType: string;
  amount: number;
}

interface TypeBreakdown {
  type: string;
  total: number;
  percentage: number;
  items: AccountItem[];
}

interface PLData {
  period: {
    startDate: string;
    endDate: string;
  };
  costCenter: { code: string; name: string } | null;
  income: {
    items: AccountItem[];
    byType: TypeBreakdown[];
    total: number;
  };
  expenses: {
    items: AccountItem[];
    byType: TypeBreakdown[];
    total: number;
  };
  summary: {
    totalIncome: number;
    totalExpenses: number;
    netProfit: number;
    profitMargin: number;
    isProfitable: boolean;
  };
}

interface CostCenter {
  id: string;
  code: string;
  name: string;
}

export default function ProfitLossPage() {
  const params = useParams();
  const restaurant = params.restaurant as string;

  const [data, setData] = useState<PLData | null>(null);
  const [costCenters, setCostCenters] = useState<CostCenter[]>([]);
  const [loading, setLoading] = useState(true);

  // Default to fiscal year start (July 1)
  const today = new Date();
  const fiscalYearStart = new Date(
    today.getMonth() >= 6 ? today.getFullYear() : today.getFullYear() - 1,
    6,
    1
  );

  const [startDate, setStartDate] = useState(
    fiscalYearStart.toISOString().split("T")[0]
  );
  const [endDate, setEndDate] = useState(today.toISOString().split("T")[0]);
  const [selectedCostCenter, setSelectedCostCenter] = useState("");

  useEffect(() => {
    fetchCostCenters();
  }, []);

  useEffect(() => {
    fetchReport();
  }, [startDate, endDate, selectedCostCenter]);

  const fetchCostCenters = async () => {
    try {
      const response = await fetch("/api/accounting/cost-centers?isActive=true");
      const data = await response.json();
      setCostCenters(data.costCenters || []);
    } catch (error) {
      console.error("Error fetching cost centers:", error);
    }
  };

  const fetchReport = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append("startDate", startDate);
      params.append("endDate", endDate);
      if (selectedCostCenter) {
        params.append("costCenterId", selectedCostCenter);
      }

      const response = await fetch(`/api/reports/financial/profit-loss?${params}`);
      const result = await response.json();

      if (response.ok) {
        setData(result);
      }
    } catch (error) {
      console.error("Error fetching P&L:", error);
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    if (!data) return;

    const rows = [
      ["Profit & Loss Statement"],
      [`Period: ${startDate} to ${endDate}`],
      [],
      ["INCOME"],
      ["Account Code", "Account Name", "Type", "Amount"],
      ...data.income.items.map((item) => [
        item.accountCode,
        item.accountName,
        item.accountType,
        item.amount.toString(),
      ]),
      ["", "", "Total Income", data.income.total.toString()],
      [],
      ["EXPENSES"],
      ["Account Code", "Account Name", "Type", "Amount"],
      ...data.expenses.items.map((item) => [
        item.accountCode,
        item.accountName,
        item.accountType,
        item.amount.toString(),
      ]),
      ["", "", "Total Expenses", data.expenses.total.toString()],
      [],
      ["", "", "NET PROFIT", data.summary.netProfit.toString()],
    ];

    const csvContent = rows.map((row) => row.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `profit-loss-${startDate}-to-${endDate}.csv`;
    a.click();
  };

  const formatPeriod = () => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    return `${start.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })} - ${end.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })}`;
  };

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
            <h1 className="text-2xl font-bold">Profit & Loss Statement</h1>
            <p className="text-gray-500">Income vs Expenses for a period</p>
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
            <div>
              <label className="block text-sm font-medium mb-1">
                Cost Center (Optional)
              </label>
              <select
                value={selectedCostCenter}
                onChange={(e) => setSelectedCostCenter(e.target.value)}
                className="h-10 px-3 border rounded-md text-sm"
              >
                <option value="">All Cost Centers</option>
                {costCenters.map((cc) => (
                  <option key={cc.id} value={cc.id}>
                    {cc.code} - {cc.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      {data && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <TrendingUp className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Total Income</p>
                  <p className="text-xl font-bold text-green-600">
                    Rs. {data.summary.totalIncome.toLocaleString()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-100 rounded-lg">
                  <TrendingDown className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Total Expenses</p>
                  <p className="text-xl font-bold text-red-600">
                    Rs. {data.summary.totalExpenses.toLocaleString()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card
            className={`${
              data.summary.isProfitable
                ? "border-green-200 bg-green-50"
                : "border-red-200 bg-red-50"
            }`}
          >
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div
                  className={`p-2 rounded-lg ${
                    data.summary.isProfitable ? "bg-green-200" : "bg-red-200"
                  }`}
                >
                  <DollarSign
                    className={`w-5 h-5 ${
                      data.summary.isProfitable ? "text-green-700" : "text-red-700"
                    }`}
                  />
                </div>
                <div>
                  <p className="text-sm text-gray-500">
                    {data.summary.isProfitable ? "Net Profit" : "Net Loss"}
                  </p>
                  <p
                    className={`text-xl font-bold ${
                      data.summary.isProfitable ? "text-green-700" : "text-red-700"
                    }`}
                  >
                    Rs. {Math.abs(data.summary.netProfit).toLocaleString()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <TrendingUp className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Profit Margin</p>
                  <p className="text-xl font-bold text-blue-600">
                    {data.summary.profitMargin.toFixed(1)}%
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Report Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Income */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-700">
              <TrendingUp className="w-5 h-5" />
              Income
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="animate-pulse space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-10 bg-gray-100 rounded"></div>
                ))}
              </div>
            ) : !data ? (
              <p className="text-gray-500">Failed to load data</p>
            ) : data.income.items.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No income recorded</p>
            ) : (
              <div className="space-y-4">
                {data.income.byType.map((group) => (
                  <div key={group.type}>
                    <div className="flex justify-between items-center py-2 border-b">
                      <span className="font-medium text-gray-700">
                        {group.type}
                      </span>
                      <span className="text-sm text-gray-500">
                        {group.percentage.toFixed(1)}%
                      </span>
                    </div>
                    {group.items.map((item) => (
                      <div
                        key={item.id}
                        className="flex justify-between py-1.5 text-sm pl-4"
                      >
                        <span className="text-gray-600">
                          <span className="font-mono text-xs text-gray-400 mr-2">
                            {item.accountCode}
                          </span>
                          {item.accountName}
                        </span>
                        <span className="font-mono">
                          {item.amount.toLocaleString()}
                        </span>
                      </div>
                    ))}
                    <div className="flex justify-between py-1.5 text-sm pl-4 font-medium">
                      <span>Subtotal</span>
                      <span className="font-mono">
                        {group.total.toLocaleString()}
                      </span>
                    </div>
                  </div>
                ))}
                <div className="flex justify-between py-3 border-t-2 font-bold text-green-700">
                  <span>Total Income</span>
                  <span className="font-mono">
                    Rs. {data.income.total.toLocaleString()}
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Expenses */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-700">
              <TrendingDown className="w-5 h-5" />
              Expenses
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="animate-pulse space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-10 bg-gray-100 rounded"></div>
                ))}
              </div>
            ) : !data ? (
              <p className="text-gray-500">Failed to load data</p>
            ) : data.expenses.items.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No expenses recorded</p>
            ) : (
              <div className="space-y-4">
                {data.expenses.byType.map((group) => (
                  <div key={group.type}>
                    <div className="flex justify-between items-center py-2 border-b">
                      <span className="font-medium text-gray-700">
                        {group.type}
                      </span>
                      <span className="text-sm text-gray-500">
                        {group.percentage.toFixed(1)}%
                      </span>
                    </div>
                    {group.items.map((item) => (
                      <div
                        key={item.id}
                        className="flex justify-between py-1.5 text-sm pl-4"
                      >
                        <span className="text-gray-600">
                          <span className="font-mono text-xs text-gray-400 mr-2">
                            {item.accountCode}
                          </span>
                          {item.accountName}
                        </span>
                        <span className="font-mono">
                          {item.amount.toLocaleString()}
                        </span>
                      </div>
                    ))}
                    <div className="flex justify-between py-1.5 text-sm pl-4 font-medium">
                      <span>Subtotal</span>
                      <span className="font-mono">
                        {group.total.toLocaleString()}
                      </span>
                    </div>
                  </div>
                ))}
                <div className="flex justify-between py-3 border-t-2 font-bold text-red-700">
                  <span>Total Expenses</span>
                  <span className="font-mono">
                    Rs. {data.expenses.total.toLocaleString()}
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Net Profit Summary */}
      {data && (
        <Card
          className={`${
            data.summary.isProfitable
              ? "bg-gradient-to-r from-green-50 to-green-100 border-green-200"
              : "bg-gradient-to-r from-red-50 to-red-100 border-red-200"
          }`}
        >
          <CardContent className="py-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-lg text-gray-600">
                  {data.summary.isProfitable ? "Net Profit" : "Net Loss"}
                </p>
                <p
                  className={`text-4xl font-bold ${
                    data.summary.isProfitable ? "text-green-700" : "text-red-700"
                  }`}
                >
                  Rs. {Math.abs(data.summary.netProfit).toLocaleString()}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-500">Period</p>
                <p className="font-medium">{formatPeriod()}</p>
                {data.costCenter && (
                  <p className="text-sm text-purple-600 flex items-center gap-1 justify-end mt-1">
                    <Building2 className="w-4 h-4" />
                    {data.costCenter.code} - {data.costCenter.name}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
