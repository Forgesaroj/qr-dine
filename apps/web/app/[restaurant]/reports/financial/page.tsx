"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@qr-dine/ui";
import { Button } from "@qr-dine/ui";
import {
  Scale,
  TrendingUp,
  BarChart3,
  Banknote,
  ArrowLeft,
  FileText,
  ChevronRight,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";

const REPORTS = [
  {
    id: "trial-balance",
    title: "Trial Balance",
    description: "All account balances at a point in time",
    icon: Scale,
    color: "text-blue-600",
    bgColor: "bg-blue-100",
  },
  {
    id: "profit-loss",
    title: "Profit & Loss Statement",
    description: "Income vs Expenses for a period",
    icon: TrendingUp,
    color: "text-green-600",
    bgColor: "bg-green-100",
  },
  {
    id: "balance-sheet",
    title: "Balance Sheet",
    description: "Assets = Liabilities + Equity",
    icon: BarChart3,
    color: "text-purple-600",
    bgColor: "bg-purple-100",
  },
  {
    id: "cash-flow",
    title: "Cash Flow Statement",
    description: "Cash inflows and outflows",
    icon: Banknote,
    color: "text-orange-600",
    bgColor: "bg-orange-100",
  },
];

export default function FinancialReportsPage() {
  const params = useParams();
  const restaurant = params.restaurant as string;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href={`/${restaurant}/accounting`}>
          <Button variant="ghost" size="sm">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Financial Reports</h1>
          <p className="text-gray-500">
            Generate and analyze financial statements
          </p>
        </div>
      </div>

      {/* Reports Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {REPORTS.map((report) => (
          <Link
            key={report.id}
            href={`/${restaurant}/reports/financial/${report.id}`}
          >
            <Card className="hover:shadow-lg transition-shadow cursor-pointer group">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className={`p-3 rounded-lg ${report.bgColor}`}>
                    <report.icon className={`w-6 h-6 ${report.color}`} />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold group-hover:text-blue-600 transition-colors">
                      {report.title}
                    </h3>
                    <p className="text-gray-500 text-sm mt-1">
                      {report.description}
                    </p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-blue-600 transition-colors" />
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Quick Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-gray-700">
            <FileText className="w-5 h-5" />
            Report Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium mb-2">Trial Balance</h4>
              <p className="text-sm text-gray-600">
                Shows all account balances at a specific date. Used to verify
                that debits equal credits. A balanced trial balance indicates
                accurate bookkeeping.
              </p>
            </div>
            <div>
              <h4 className="font-medium mb-2">Profit & Loss</h4>
              <p className="text-sm text-gray-600">
                Shows revenue and expenses over a period. The difference is
                your net profit or loss. Can be filtered by cost center for
                departmental analysis.
              </p>
            </div>
            <div>
              <h4 className="font-medium mb-2">Balance Sheet</h4>
              <p className="text-sm text-gray-600">
                Shows your financial position at a point in time. Assets should
                equal Liabilities plus Equity. Includes retained earnings from
                cumulative profits.
              </p>
            </div>
            <div>
              <h4 className="font-medium mb-2">Cash Flow</h4>
              <p className="text-sm text-gray-600">
                Tracks actual cash movements. Split into operating, investing,
                and financing activities. Shows how cash position changed over
                a period.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Fiscal Year Info */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Scale className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <h4 className="font-medium text-blue-800">Fiscal Year</h4>
              <p className="text-sm text-blue-700">
                Reports follow the Nepal fiscal year (July - June). The current
                fiscal year is FY{" "}
                {new Date().getMonth() >= 6
                  ? new Date().getFullYear()
                  : new Date().getFullYear() - 1}
                /
                {new Date().getMonth() >= 6
                  ? new Date().getFullYear() + 1
                  : new Date().getFullYear()}
                .
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
