"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@qr-dine/ui";
import { Button } from "@qr-dine/ui";
import {
  Calculator,
  BookOpen,
  Receipt,
  FileText,
  ArrowRight,
  Plus,
  TrendingUp,
  TrendingDown,
  DollarSign,
  BarChart3,
  Building2,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";

interface AccountStats {
  totalAccounts: number;
  groupCounts: {
    ASSETS: number;
    LIABILITIES: number;
    INCOME: number;
    EXPENSES: number;
    EQUITY: number;
  };
}

interface VoucherStats {
  type: string;
  count: number;
  totalAmount: number;
}

export default function AccountingDashboard() {
  const params = useParams();
  const restaurant = params.restaurant as string;
  const [accountStats, setAccountStats] = useState<AccountStats | null>(null);
  const [voucherStats, setVoucherStats] = useState<VoucherStats[]>([]);
  const [recentVouchers, setRecentVouchers] = useState<unknown[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [accountsRes, vouchersRes] = await Promise.all([
        fetch("/api/accounting/accounts?hierarchical=true"),
        fetch("/api/accounting/vouchers?limit=5"),
      ]);

      const accountsData = await accountsRes.json();
      const vouchersData = await vouchersRes.json();

      setAccountStats(accountsData.stats || null);
      setVoucherStats(vouchersData.stats || []);
      setRecentVouchers(vouchersData.vouchers || []);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const getVoucherTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      PAYMENT: "Payments",
      RECEIPT: "Receipts",
      CONTRA: "Contra",
      JOURNAL: "Journal",
      SALES: "Sales",
      PURCHASE: "Purchase",
      CREDIT_NOTE: "Credit Notes",
      DEBIT_NOTE: "Debit Notes",
    };
    return labels[type] || type;
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Accounting</h1>
          <p className="text-gray-500">
            Manage vouchers, ledgers, and financial records
          </p>
        </div>
        <div className="flex gap-2">
          <Link href={`/${restaurant}/accounting/vouchers/new`}>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              New Voucher
            </Button>
          </Link>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Total Accounts
            </CardTitle>
            <BookOpen className="w-4 h-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {accountStats?.totalAccounts || 0}
            </div>
            <Link
              href={`/${restaurant}/accounting/accounts`}
              className="text-xs text-blue-500 hover:underline flex items-center mt-1"
            >
              Chart of Accounts <ArrowRight className="w-3 h-3 ml-1" />
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Assets
            </CardTitle>
            <TrendingUp className="w-4 h-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {accountStats?.groupCounts?.ASSETS || 0}
            </div>
            <p className="text-xs text-gray-500 mt-1">Account groups</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Liabilities
            </CardTitle>
            <TrendingDown className="w-4 h-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {accountStats?.groupCounts?.LIABILITIES || 0}
            </div>
            <p className="text-xs text-gray-500 mt-1">Account groups</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Income & Expenses
            </CardTitle>
            <DollarSign className="w-4 h-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(accountStats?.groupCounts?.INCOME || 0) +
                (accountStats?.groupCounts?.EXPENSES || 0)}
            </div>
            <p className="text-xs text-gray-500 mt-1">Account groups</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Link href={`/${restaurant}/accounting/vouchers`}>
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Receipt className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold">Vouchers</h3>
                <p className="text-sm text-gray-500">Entry & management</p>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href={`/${restaurant}/accounting/accounts`}>
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 bg-green-100 rounded-lg">
                <BookOpen className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <h3 className="font-semibold">Chart of Accounts</h3>
                <p className="text-sm text-gray-500">Manage accounts</p>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href={`/${restaurant}/accounting/cost-centers`}>
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 bg-purple-100 rounded-lg">
                <Building2 className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <h3 className="font-semibold">Cost Centers</h3>
                <p className="text-sm text-gray-500">Track expenses</p>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href={`/${restaurant}/accounting/budgets`}>
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 bg-yellow-100 rounded-lg">
                <Wallet className="w-6 h-6 text-yellow-600" />
              </div>
              <div>
                <h3 className="font-semibold">Budgets</h3>
                <p className="text-sm text-gray-500">Budget planning</p>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href={`/${restaurant}/accounting/day-book`}>
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 bg-orange-100 rounded-lg">
                <FileText className="w-6 h-6 text-orange-600" />
              </div>
              <div>
                <h3 className="font-semibold">Day Book</h3>
                <p className="text-sm text-gray-500">Daily transactions</p>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href={`/${restaurant}/reports/financial`}>
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 bg-indigo-100 rounded-lg">
                <BarChart3 className="w-6 h-6 text-indigo-600" />
              </div>
              <div>
                <h3 className="font-semibold">Reports</h3>
                <p className="text-sm text-gray-500">Financial reports</p>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Voucher Type Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="w-5 h-5" />
              Voucher Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            {voucherStats.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Receipt className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No vouchers created yet</p>
                <Link href={`/${restaurant}/accounting/vouchers/new`}>
                  <Button variant="outline" className="mt-4">
                    <Plus className="w-4 h-4 mr-2" />
                    Create First Voucher
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {voucherStats.map((stat) => (
                  <div
                    key={stat.type}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div>
                      <p className="font-medium">
                        {getVoucherTypeLabel(stat.type)}
                      </p>
                      <p className="text-sm text-gray-500">
                        {stat.count} voucher{stat.count !== 1 ? "s" : ""}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">
                        Rs. {Number(stat.totalAmount || 0).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Vouchers */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Recent Vouchers</span>
              <Link href={`/${restaurant}/accounting/vouchers`}>
                <Button variant="ghost" size="sm">
                  View All
                </Button>
              </Link>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentVouchers.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>No recent vouchers</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentVouchers.map((voucher: any) => (
                  <Link
                    key={voucher.id}
                    href={`/${restaurant}/accounting/vouchers/${voucher.id}`}
                  >
                    <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                      <div>
                        <p className="font-mono text-sm font-medium">
                          {voucher.voucherNumber}
                        </p>
                        <p className="text-xs text-gray-500">
                          {voucher.voucherType} •{" "}
                          {new Date(voucher.voucherDate).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">
                          Rs. {Number(voucher.totalAmount).toLocaleString()}
                        </p>
                        <span
                          className={`text-xs px-2 py-0.5 rounded ${
                            voucher.status === "POSTED"
                              ? "bg-green-100 text-green-700"
                              : voucher.status === "DRAFT"
                              ? "bg-gray-100 text-gray-700"
                              : "bg-red-100 text-red-700"
                          }`}
                        >
                          {voucher.status}
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Voucher Entry Buttons */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Voucher Entry</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Link href={`/${restaurant}/accounting/vouchers/new?type=PAYMENT`}>
              <Button variant="outline" className="w-full h-20 flex-col gap-1">
                <TrendingDown className="w-5 h-5 text-red-500" />
                <span>Payment</span>
              </Button>
            </Link>
            <Link href={`/${restaurant}/accounting/vouchers/new?type=RECEIPT`}>
              <Button variant="outline" className="w-full h-20 flex-col gap-1">
                <TrendingUp className="w-5 h-5 text-green-500" />
                <span>Receipt</span>
              </Button>
            </Link>
            <Link href={`/${restaurant}/accounting/vouchers/new?type=CONTRA`}>
              <Button variant="outline" className="w-full h-20 flex-col gap-1">
                <ArrowRight className="w-5 h-5 text-blue-500" />
                <span>Contra</span>
              </Button>
            </Link>
            <Link href={`/${restaurant}/accounting/vouchers/new?type=JOURNAL`}>
              <Button variant="outline" className="w-full h-20 flex-col gap-1">
                <FileText className="w-5 h-5 text-purple-500" />
                <span>Journal</span>
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
