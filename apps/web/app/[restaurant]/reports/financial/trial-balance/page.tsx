"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@qr-dine/ui";
import { Button } from "@qr-dine/ui";
import { Input } from "@qr-dine/ui";
import {
  Scale,
  ArrowLeft,
  Download,
  RefreshCw,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";

interface AccountBalance {
  id: string;
  accountCode: string;
  accountName: string;
  accountGroup: string;
  accountType: string;
  debitBalance: number;
  creditBalance: number;
}

interface GroupTotal {
  group: string;
  debitTotal: number;
  creditTotal: number;
  accountCount: number;
}

interface TrialBalanceData {
  reportDate: string;
  accounts: AccountBalance[];
  grouped: Record<string, AccountBalance[]>;
  groupTotals: GroupTotal[];
  totals: {
    totalDebit: number;
    totalCredit: number;
    isBalanced: boolean;
    difference: number;
  };
}

const GROUP_ORDER = ["ASSETS", "LIABILITIES", "EQUITY", "INCOME", "EXPENSES"];

const getGroupColor = (group: string) => {
  const colors: Record<string, string> = {
    ASSETS: "border-l-blue-500",
    LIABILITIES: "border-l-red-500",
    EQUITY: "border-l-purple-500",
    INCOME: "border-l-green-500",
    EXPENSES: "border-l-orange-500",
  };
  return colors[group] || "border-l-gray-500";
};

export default function TrialBalancePage() {
  const params = useParams();
  const restaurant = params.restaurant as string;

  const [data, setData] = useState<TrialBalanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [asOfDate, setAsOfDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [showZeroBalance, setShowZeroBalance] = useState(false);

  useEffect(() => {
    fetchReport();
  }, [asOfDate, showZeroBalance]);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append("asOfDate", asOfDate);
      if (showZeroBalance) params.append("showZeroBalance", "true");

      const response = await fetch(`/api/reports/financial/trial-balance?${params}`);
      const result = await response.json();

      if (response.ok) {
        setData(result);
      }
    } catch (error) {
      console.error("Error fetching trial balance:", error);
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    if (!data) return;

    const rows = [
      ["Account Code", "Account Name", "Group", "Debit", "Credit"],
      ...data.accounts.map((a) => [
        a.accountCode,
        a.accountName,
        a.accountGroup,
        a.debitBalance.toString(),
        a.creditBalance.toString(),
      ]),
      [],
      ["", "TOTAL", "", data.totals.totalDebit.toString(), data.totals.totalCredit.toString()],
    ];

    const csvContent = rows.map((row) => row.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `trial-balance-${asOfDate}.csv`;
    a.click();
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
            <h1 className="text-2xl font-bold">Trial Balance</h1>
            <p className="text-gray-500">All account balances at a point in time</p>
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
              <label className="block text-sm font-medium mb-1">As of Date</label>
              <Input
                type="date"
                value={asOfDate}
                onChange={(e) => setAsOfDate(e.target.value)}
                className="w-40"
              />
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showZeroBalance}
                onChange={(e) => setShowZeroBalance(e.target.checked)}
                className="w-4 h-4 rounded"
              />
              <span className="text-sm">Show zero balances</span>
            </label>
          </div>
        </CardContent>
      </Card>

      {/* Balance Status */}
      {data && (
        <div
          className={`p-4 rounded-lg flex items-center gap-3 ${
            data.totals.isBalanced
              ? "bg-green-50 text-green-700 border border-green-200"
              : "bg-red-50 text-red-700 border border-red-200"
          }`}
        >
          {data.totals.isBalanced ? (
            <>
              <CheckCircle className="w-5 h-5" />
              <span className="font-medium">
                Trial Balance is balanced - Debits equal Credits
              </span>
            </>
          ) : (
            <>
              <AlertCircle className="w-5 h-5" />
              <span className="font-medium">
                Warning: Trial Balance is not balanced! Difference: Rs.{" "}
                {data.totals.difference.toLocaleString()}
              </span>
            </>
          )}
        </div>
      )}

      {/* Report Content */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Scale className="w-5 h-5" />
            Trial Balance as of {new Date(asOfDate).toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="animate-pulse space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-12 bg-gray-100 rounded"></div>
              ))}
            </div>
          ) : !data ? (
            <div className="text-center py-12 text-gray-500">
              Failed to load trial balance
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-3 font-medium text-gray-500">Code</th>
                    <th className="pb-3 font-medium text-gray-500">Account Name</th>
                    <th className="pb-3 font-medium text-gray-500 text-right">
                      Debit (Rs.)
                    </th>
                    <th className="pb-3 font-medium text-gray-500 text-right">
                      Credit (Rs.)
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {GROUP_ORDER.map((group) => {
                    const accounts = data.grouped[group];
                    if (!accounts || accounts.length === 0) return null;

                    const groupTotal = data.groupTotals.find(
                      (g) => g.group === group
                    );

                    return (
                      <React.Fragment key={group}>
                        {/* Group Header */}
                        <tr className={`bg-gray-50 border-l-4 ${getGroupColor(group)}`}>
                          <td
                            colSpan={4}
                            className="py-2 px-3 font-semibold text-gray-700"
                          >
                            {group}
                          </td>
                        </tr>
                        {/* Accounts */}
                        {accounts.map((account) => (
                          <tr key={account.id} className="border-b hover:bg-gray-50">
                            <td className="py-2 font-mono text-sm text-gray-600">
                              {account.accountCode}
                            </td>
                            <td className="py-2">
                              <span className="font-medium">
                                {account.accountName}
                              </span>
                              <span className="text-xs text-gray-400 ml-2">
                                {account.accountType}
                              </span>
                            </td>
                            <td className="py-2 text-right font-mono">
                              {account.debitBalance > 0
                                ? account.debitBalance.toLocaleString()
                                : ""}
                            </td>
                            <td className="py-2 text-right font-mono">
                              {account.creditBalance > 0
                                ? account.creditBalance.toLocaleString()
                                : ""}
                            </td>
                          </tr>
                        ))}
                        {/* Group Total */}
                        <tr className="bg-gray-100">
                          <td></td>
                          <td className="py-2 font-medium text-gray-600">
                            {group} Total
                          </td>
                          <td className="py-2 text-right font-mono font-medium">
                            {groupTotal && groupTotal.debitTotal > 0
                              ? groupTotal.debitTotal.toLocaleString()
                              : ""}
                          </td>
                          <td className="py-2 text-right font-mono font-medium">
                            {groupTotal && groupTotal.creditTotal > 0
                              ? groupTotal.creditTotal.toLocaleString()
                              : ""}
                          </td>
                        </tr>
                      </React.Fragment>
                    );
                  })}
                  {/* Grand Total */}
                  <tr className="bg-gray-900 text-white font-bold">
                    <td></td>
                    <td className="py-3">GRAND TOTAL</td>
                    <td className="py-3 text-right font-mono">
                      Rs. {data.totals.totalDebit.toLocaleString()}
                    </td>
                    <td className="py-3 text-right font-mono">
                      Rs. {data.totals.totalCredit.toLocaleString()}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Import React for Fragment
import React from "react";
