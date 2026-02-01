"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@qr-dine/ui";
import { Button } from "@qr-dine/ui";
import {
  Calculator,
  Plus,
  Eye,
  CheckCircle,
  Clock,
  XCircle,
  FileEdit,
  ChevronRight,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";

interface Budget {
  id: string;
  budgetNumber: string;
  name: string;
  fiscalYear: string;
  description: string | null;
  status: string;
  totalBudget: number;
  itemCount: number;
  createdByName: string;
  approvedByName: string | null;
  createdAt: string;
  monthlyTotals: Array<{ month: number; amount: number }>;
}

const getStatusColor = (status: string) => {
  switch (status) {
    case "DRAFT":
      return "bg-gray-100 text-gray-700";
    case "PENDING":
      return "bg-yellow-100 text-yellow-700";
    case "APPROVED":
      return "bg-green-100 text-green-700";
    case "REJECTED":
      return "bg-red-100 text-red-700";
    default:
      return "bg-gray-100 text-gray-700";
  }
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case "DRAFT":
      return <FileEdit className="w-3 h-3" />;
    case "PENDING":
      return <Clock className="w-3 h-3" />;
    case "APPROVED":
      return <CheckCircle className="w-3 h-3" />;
    case "REJECTED":
      return <XCircle className="w-3 h-3" />;
    default:
      return null;
  }
};

export default function BudgetsPage() {
  const params = useParams();
  const restaurant = params.restaurant as string;
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBudgets();
  }, []);

  const fetchBudgets = async () => {
    try {
      const response = await fetch("/api/accounting/budgets");
      const data = await response.json();
      setBudgets(data.budgets || []);
    } catch (error) {
      console.error("Error fetching budgets:", error);
    } finally {
      setLoading(false);
    }
  };

  const currentYear = new Date().getFullYear();
  const fiscalYear =
    new Date().getMonth() >= 6 ? currentYear : currentYear - 1;

  // Group budgets by fiscal year
  const budgetsByYear = budgets.reduce((acc, budget) => {
    if (!acc[budget.fiscalYear]) {
      acc[budget.fiscalYear] = [];
    }
    acc[budget.fiscalYear].push(budget);
    return acc;
  }, {} as Record<string, Budget[]>);

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Budget Planning</h1>
          <p className="text-gray-500">Create and manage annual budgets</p>
        </div>
        <div className="flex gap-2">
          <Link href={`/${restaurant}/accounting`}>
            <Button variant="outline">Back to Accounting</Button>
          </Link>
          <Link href={`/${restaurant}/accounting/budgets/new`}>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Create Budget
            </Button>
          </Link>
        </div>
      </div>

      {/* Current Fiscal Year Info */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-blue-600">Current Fiscal Year</p>
              <p className="text-2xl font-bold text-blue-700">
                {fiscalYear}/{fiscalYear + 1}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-blue-600">
                {budgetsByYear[fiscalYear.toString()]?.length || 0} budget(s)
              </p>
              <p className="text-lg font-semibold text-blue-700">
                Total: Rs.{" "}
                {(
                  budgetsByYear[fiscalYear.toString()]?.reduce(
                    (sum, b) => sum + b.totalBudget,
                    0
                  ) || 0
                ).toLocaleString()}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Budgets List */}
      {budgets.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-gray-500">
            <Calculator className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No budgets created yet</p>
            <p className="text-sm mt-1">
              Create your first budget to start tracking expenses
            </p>
            <Link href={`/${restaurant}/accounting/budgets/new`}>
              <Button className="mt-4">
                <Plus className="w-4 h-4 mr-2" />
                Create First Budget
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        Object.entries(budgetsByYear)
          .sort(([a], [b]) => parseInt(b) - parseInt(a))
          .map(([year, yearBudgets]) => (
            <Card key={year}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>
                    FY {year}/{parseInt(year) + 1}
                  </span>
                  <span className="text-sm font-normal text-gray-500">
                    {yearBudgets.length} budget{yearBudgets.length !== 1 ? "s" : ""} •
                    Total: Rs.{" "}
                    {yearBudgets
                      .reduce((sum, b) => sum + b.totalBudget, 0)
                      .toLocaleString()}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y">
                  {yearBudgets.map((budget) => (
                    <Link
                      key={budget.id}
                      href={`/${restaurant}/accounting/budgets/${budget.id}`}
                    >
                      <div className="p-4 hover:bg-gray-50 cursor-pointer">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-sm text-gray-600">
                                {budget.budgetNumber}
                              </span>
                              <span className="font-semibold">{budget.name}</span>
                              <span
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(
                                  budget.status
                                )}`}
                              >
                                {getStatusIcon(budget.status)}
                                {budget.status}
                              </span>
                            </div>
                            {budget.description && (
                              <p className="text-sm text-gray-500 mt-1">
                                {budget.description}
                              </p>
                            )}
                            <p className="text-xs text-gray-400 mt-1">
                              Created by {budget.createdByName}
                              {budget.approvedByName &&
                                ` • Approved by ${budget.approvedByName}`}
                            </p>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <p className="text-lg font-semibold">
                                Rs. {budget.totalBudget.toLocaleString()}
                              </p>
                              <p className="text-xs text-gray-500">
                                {budget.itemCount} line items
                              </p>
                            </div>
                            <ChevronRight className="w-5 h-5 text-gray-400" />
                          </div>
                        </div>

                        {/* Monthly Mini Bar Chart */}
                        <div className="mt-3 flex items-end gap-1 h-8">
                          {budget.monthlyTotals.map((m) => {
                            const maxAmount = Math.max(
                              ...budget.monthlyTotals.map((mt) => mt.amount)
                            );
                            const height =
                              maxAmount > 0
                                ? (m.amount / maxAmount) * 100
                                : 0;
                            return (
                              <div
                                key={m.month}
                                className="flex-1 bg-blue-200 rounded-t"
                                style={{ height: `${Math.max(height, 4)}%` }}
                                title={`${new Date(2000, m.month - 1).toLocaleString(
                                  "en-US",
                                  { month: "short" }
                                )}: Rs. ${m.amount.toLocaleString()}`}
                              />
                            );
                          })}
                        </div>
                        <div className="flex justify-between text-[10px] text-gray-400 mt-1">
                          <span>Jul</span>
                          <span>Jan</span>
                          <span>Jun</span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))
      )}
    </div>
  );
}
