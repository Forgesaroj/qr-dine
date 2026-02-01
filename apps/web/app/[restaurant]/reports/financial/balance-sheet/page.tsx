"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@qr-dine/ui";
import { Button } from "@qr-dine/ui";
import { Input } from "@qr-dine/ui";
import {
  BarChart3,
  ArrowLeft,
  Download,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Building,
  Wallet,
  Landmark,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";

interface AccountItem {
  id: string;
  accountCode: string;
  accountName: string;
  accountType: string;
  balance: number;
}

interface TypeSection {
  type: string;
  items: AccountItem[];
  total: number;
}

interface BalanceSheetData {
  asOfDate: string;
  assets: {
    accounts: AccountItem[];
    sections: TypeSection[];
    total: number;
  };
  liabilities: {
    accounts: AccountItem[];
    sections: TypeSection[];
    total: number;
  };
  equity: {
    accounts: AccountItem[];
    sections: TypeSection[];
    retainedEarnings: number;
    total: number;
  };
  summary: {
    totalAssets: number;
    totalLiabilities: number;
    totalEquity: number;
    retainedEarnings: number;
    totalLiabilitiesAndEquity: number;
    isBalanced: boolean;
    difference: number;
  };
}

export default function BalanceSheetPage() {
  const params = useParams();
  const restaurant = params.restaurant as string;

  const [data, setData] = useState<BalanceSheetData | null>(null);
  const [loading, setLoading] = useState(true);
  const [asOfDate, setAsOfDate] = useState(
    new Date().toISOString().split("T")[0]
  );

  useEffect(() => {
    fetchReport();
  }, [asOfDate]);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append("asOfDate", asOfDate);

      const response = await fetch(`/api/reports/financial/balance-sheet?${params}`);
      const result = await response.json();

      if (response.ok) {
        setData(result);
      }
    } catch (error) {
      console.error("Error fetching balance sheet:", error);
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    if (!data) return;

    const rows = [
      ["Balance Sheet"],
      [`As of: ${asOfDate}`],
      [],
      ["ASSETS"],
      ["Account Code", "Account Name", "Type", "Balance"],
      ...data.assets.accounts.map((a) => [
        a.accountCode,
        a.accountName,
        a.accountType,
        a.balance.toString(),
      ]),
      ["", "", "Total Assets", data.summary.totalAssets.toString()],
      [],
      ["LIABILITIES"],
      ...data.liabilities.accounts.map((a) => [
        a.accountCode,
        a.accountName,
        a.accountType,
        a.balance.toString(),
      ]),
      ["", "", "Total Liabilities", data.summary.totalLiabilities.toString()],
      [],
      ["EQUITY"],
      ...data.equity.accounts.map((a) => [
        a.accountCode,
        a.accountName,
        a.accountType,
        a.balance.toString(),
      ]),
      ["", "", "Retained Earnings", data.summary.retainedEarnings.toString()],
      ["", "", "Total Equity", data.summary.totalEquity.toString()],
      [],
      ["", "", "Total Liabilities & Equity", data.summary.totalLiabilitiesAndEquity.toString()],
    ];

    const csvContent = rows.map((row) => row.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `balance-sheet-${asOfDate}.csv`;
    a.click();
  };

  const renderSection = (
    title: string,
    icon: React.ReactNode,
    sections: TypeSection[],
    total: number,
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
        {loading ? (
          <div className="animate-pulse space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-8 bg-gray-100 rounded"></div>
            ))}
          </div>
        ) : sections.length === 0 ? (
          <p className="text-gray-500 text-center py-4">No entries</p>
        ) : (
          <div className="space-y-4">
            {sections.map((section) => (
              <div key={section.type}>
                <div className="flex justify-between items-center py-2 border-b bg-gray-50 px-2 rounded">
                  <span className="font-medium text-gray-700">
                    {section.type}
                  </span>
                </div>
                {section.items.map((item) => (
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
                      {item.balance.toLocaleString()}
                    </span>
                  </div>
                ))}
                <div className="flex justify-between py-1.5 text-sm pl-4 font-medium border-t">
                  <span>Subtotal</span>
                  <span className="font-mono">
                    {section.total.toLocaleString()}
                  </span>
                </div>
              </div>
            ))}
            <div className={`flex justify-between py-3 border-t-2 font-bold ${color}`}>
              <span>Total {title}</span>
              <span className="font-mono">Rs. {total.toLocaleString()}</span>
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
            <h1 className="text-2xl font-bold">Balance Sheet</h1>
            <p className="text-gray-500">Assets = Liabilities + Equity</p>
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
          <div className="flex items-end gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">As of Date</label>
              <Input
                type="date"
                value={asOfDate}
                onChange={(e) => setAsOfDate(e.target.value)}
                className="w-40"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Balance Check */}
      {data && (
        <div
          className={`p-4 rounded-lg flex items-center gap-3 ${
            data.summary.isBalanced
              ? "bg-green-50 text-green-700 border border-green-200"
              : "bg-red-50 text-red-700 border border-red-200"
          }`}
        >
          {data.summary.isBalanced ? (
            <>
              <CheckCircle className="w-5 h-5" />
              <span className="font-medium">
                Balance Sheet is balanced - Assets = Liabilities + Equity
              </span>
            </>
          ) : (
            <>
              <AlertCircle className="w-5 h-5" />
              <span className="font-medium">
                Warning: Balance Sheet is not balanced! Difference: Rs.{" "}
                {data.summary.difference.toLocaleString()}
              </span>
            </>
          )}
        </div>
      )}

      {/* Summary Cards */}
      {data && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border-l-4 border-l-blue-500">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Building className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Total Assets</p>
                  <p className="text-2xl font-bold text-blue-600">
                    Rs. {data.summary.totalAssets.toLocaleString()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-red-500">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-100 rounded-lg">
                  <Wallet className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Total Liabilities</p>
                  <p className="text-2xl font-bold text-red-600">
                    Rs. {data.summary.totalLiabilities.toLocaleString()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-purple-500">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Landmark className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Total Equity</p>
                  <p className="text-2xl font-bold text-purple-600">
                    Rs. {data.equity.total.toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-400">
                    (Includes Rs. {data.summary.retainedEarnings.toLocaleString()}{" "}
                    retained earnings)
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Balance Sheet Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Assets */}
        {data &&
          renderSection(
            "Assets",
            <Building className="w-5 h-5" />,
            data.assets.sections,
            data.summary.totalAssets,
            "text-blue-700"
          )}

        {/* Liabilities & Equity */}
        <div className="space-y-6">
          {data &&
            renderSection(
              "Liabilities",
              <Wallet className="w-5 h-5" />,
              data.liabilities.sections,
              data.summary.totalLiabilities,
              "text-red-700"
            )}

          {data && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-purple-700">
                  <Landmark className="w-5 h-5" />
                  Equity
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="animate-pulse space-y-3">
                    {[1, 2].map((i) => (
                      <div key={i} className="h-8 bg-gray-100 rounded"></div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {data.equity.sections.map((section) => (
                      <div key={section.type}>
                        <div className="flex justify-between items-center py-2 border-b bg-gray-50 px-2 rounded">
                          <span className="font-medium text-gray-700">
                            {section.type}
                          </span>
                        </div>
                        {section.items.map((item) => (
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
                              {item.balance.toLocaleString()}
                            </span>
                          </div>
                        ))}
                      </div>
                    ))}

                    {/* Retained Earnings */}
                    <div className="flex justify-between py-2 text-sm pl-4 bg-purple-50 rounded">
                      <span className="text-purple-700 font-medium">
                        Retained Earnings (Net Profit)
                      </span>
                      <span className="font-mono font-medium text-purple-700">
                        {data.summary.retainedEarnings.toLocaleString()}
                      </span>
                    </div>

                    <div className="flex justify-between py-3 border-t-2 font-bold text-purple-700">
                      <span>Total Equity</span>
                      <span className="font-mono">
                        Rs. {data.equity.total.toLocaleString()}
                      </span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Combined Total */}
          {data && (
            <Card className="bg-gray-900 text-white">
              <CardContent className="py-6">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-medium">
                    Total Liabilities + Equity
                  </span>
                  <span className="text-2xl font-bold font-mono">
                    Rs. {data.summary.totalLiabilitiesAndEquity.toLocaleString()}
                  </span>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Accounting Equation */}
      {data && (
        <Card className="bg-gradient-to-r from-blue-50 via-gray-50 to-purple-50 border-2">
          <CardContent className="py-6">
            <div className="flex items-center justify-center gap-8 text-lg">
              <div className="text-center">
                <p className="text-sm text-gray-500">Assets</p>
                <p className="text-2xl font-bold text-blue-700">
                  Rs. {data.summary.totalAssets.toLocaleString()}
                </p>
              </div>
              <span className="text-3xl text-gray-400">=</span>
              <div className="text-center">
                <p className="text-sm text-gray-500">Liabilities</p>
                <p className="text-2xl font-bold text-red-700">
                  Rs. {data.summary.totalLiabilities.toLocaleString()}
                </p>
              </div>
              <span className="text-3xl text-gray-400">+</span>
              <div className="text-center">
                <p className="text-sm text-gray-500">Equity</p>
                <p className="text-2xl font-bold text-purple-700">
                  Rs. {data.equity.total.toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
