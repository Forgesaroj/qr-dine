"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@qr-dine/ui";
import { Button } from "@qr-dine/ui";
import { Input } from "@qr-dine/ui";
import {
  Calculator,
  ArrowLeft,
  Plus,
  Trash2,
  Loader2,
  CheckCircle,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

interface CostCenter {
  id: string;
  code: string;
  name: string;
}

interface BudgetItem {
  costCenterId: string;
  costCenter?: CostCenter;
  amounts: number[]; // 12 months
}

const MONTHS = [
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  "Jan", "Feb", "Mar", "Apr", "May", "Jun"
];

export default function NewBudgetPage() {
  const params = useParams();
  const router = useRouter();
  const restaurant = params.restaurant as string;

  const [costCenters, setCostCenters] = useState<CostCenter[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  // Form state
  const currentYear = new Date().getFullYear();
  const defaultFiscalYear =
    new Date().getMonth() >= 6 ? currentYear : currentYear - 1;

  const [name, setName] = useState("");
  const [fiscalYear, setFiscalYear] = useState(defaultFiscalYear.toString());
  const [description, setDescription] = useState("");
  const [items, setItems] = useState<BudgetItem[]>([]);

  useEffect(() => {
    fetchCostCenters();
  }, []);

  const fetchCostCenters = async () => {
    try {
      const response = await fetch("/api/accounting/cost-centers?isActive=true");
      const data = await response.json();
      setCostCenters(data.costCenters || []);
    } catch (err) {
      console.error("Error fetching cost centers:", err);
    } finally {
      setLoading(false);
    }
  };

  const addCostCenter = (costCenter: CostCenter) => {
    if (items.some((i) => i.costCenterId === costCenter.id)) return;
    setItems([
      ...items,
      {
        costCenterId: costCenter.id,
        costCenter,
        amounts: Array(12).fill(0),
      },
    ]);
  };

  const removeCostCenter = (costCenterId: string) => {
    setItems(items.filter((i) => i.costCenterId !== costCenterId));
  };

  const updateAmount = (costCenterId: string, monthIndex: number, value: number) => {
    setItems(
      items.map((item) =>
        item.costCenterId === costCenterId
          ? {
              ...item,
              amounts: item.amounts.map((a, i) => (i === monthIndex ? value : a)),
            }
          : item
      )
    );
  };

  const applyToAllMonths = (costCenterId: string, value: number) => {
    setItems(
      items.map((item) =>
        item.costCenterId === costCenterId
          ? { ...item, amounts: Array(12).fill(value) }
          : item
      )
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!name.trim()) {
      setError("Budget name is required");
      return;
    }

    if (items.length === 0) {
      setError("Add at least one cost center");
      return;
    }

    setSubmitting(true);

    try {
      // Convert items to API format
      const budgetItems: Array<{
        costCenterId: string;
        month: number;
        year: number;
        amount: number;
      }> = [];

      const fy = parseInt(fiscalYear);

      items.forEach((item) => {
        item.amounts.forEach((amount, index) => {
          if (amount > 0) {
            // Jul-Dec = fiscal year, Jan-Jun = fiscal year + 1
            const month = index < 6 ? index + 7 : index - 5;
            const year = index < 6 ? fy : fy + 1;

            budgetItems.push({
              costCenterId: item.costCenterId,
              month,
              year,
              amount,
            });
          }
        });
      });

      const response = await fetch("/api/accounting/budgets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          fiscalYear,
          description: description.trim() || undefined,
          items: budgetItems,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(true);
        setTimeout(() => {
          router.push(`/${restaurant}/accounting/budgets`);
        }, 2000);
      } else {
        setError(data.error || "Failed to create budget");
      }
    } catch (err) {
      setError("An error occurred");
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  // Calculate totals
  const monthlyTotals = MONTHS.map((_, index) =>
    items.reduce((sum, item) => sum + (item.amounts[index] || 0), 0)
  );
  const grandTotal = monthlyTotals.reduce((sum, t) => sum + t, 0);

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-96 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="p-6">
        <Card className="max-w-md mx-auto mt-20">
          <CardContent className="pt-6 text-center">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Budget Created!</h2>
            <p className="text-gray-500 mb-4">
              The budget has been saved as draft.
            </p>
            <p className="text-sm text-gray-400">Redirecting...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href={`/${restaurant}/accounting/budgets`}>
          <Button variant="ghost" size="sm">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Create Budget</h1>
          <p className="text-gray-500">Plan your annual budget by cost center</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Budget Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="w-5 h-5" />
                Budget Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Budget Name <span className="text-red-500">*</span>
                </label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Annual Operations Budget"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Fiscal Year
                </label>
                <select
                  value={fiscalYear}
                  onChange={(e) => setFiscalYear(e.target.value)}
                  className="w-full h-10 px-3 border rounded-md"
                >
                  {Array.from({ length: 5 }, (_, i) => {
                    const year = defaultFiscalYear - 2 + i;
                    return (
                      <option key={year} value={year}>
                        FY {year}/{year + 1}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Optional description"
                  className="w-full px-3 py-2 border rounded-md"
                  rows={3}
                />
              </div>

              {/* Cost Center Selection */}
              <div className="pt-4 border-t">
                <label className="block text-sm font-medium mb-2">
                  Add Cost Centers
                </label>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {costCenters.map((cc) => {
                    const isAdded = items.some((i) => i.costCenterId === cc.id);
                    return (
                      <button
                        key={cc.id}
                        type="button"
                        onClick={() => !isAdded && addCostCenter(cc)}
                        disabled={isAdded}
                        className={`w-full text-left p-2 rounded border transition-colors ${
                          isAdded
                            ? "bg-green-50 border-green-200 cursor-default"
                            : "hover:bg-gray-50 cursor-pointer"
                        }`}
                      >
                        <span className="font-mono text-xs text-gray-500">
                          {cc.code}
                        </span>
                        <span className="ml-2">{cc.name}</span>
                        {isAdded && (
                          <CheckCircle className="w-4 h-4 text-green-500 float-right mt-0.5" />
                        )}
                      </button>
                    );
                  })}
                  {costCenters.length === 0 && (
                    <p className="text-sm text-gray-500 text-center py-4">
                      No cost centers available.{" "}
                      <Link
                        href={`/${restaurant}/accounting/cost-centers`}
                        className="text-blue-600 hover:underline"
                      >
                        Create one first
                      </Link>
                    </p>
                  )}
                </div>
              </div>

              {/* Summary */}
              <div className="pt-4 border-t">
                <p className="text-sm font-medium mb-2">Budget Summary</p>
                <div className="text-2xl font-bold text-green-600">
                  Rs. {grandTotal.toLocaleString()}
                </div>
                <p className="text-xs text-gray-500">
                  {items.length} cost center{items.length !== 1 ? "s" : ""}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Monthly Budget Grid */}
          <Card className="lg:col-span-3">
            <CardHeader>
              <CardTitle>Monthly Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              {items.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <Calculator className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Add cost centers from the left panel</p>
                  <p className="text-sm">to start planning your budget</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2 sticky left-0 bg-white">
                          Cost Center
                        </th>
                        {MONTHS.map((month, i) => (
                          <th key={i} className="text-center p-2 min-w-[80px]">
                            {month}
                          </th>
                        ))}
                        <th className="text-right p-2 min-w-[100px]">Total</th>
                        <th className="p-2 w-10"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item) => {
                        const rowTotal = item.amounts.reduce((s, a) => s + a, 0);
                        return (
                          <tr key={item.costCenterId} className="border-b">
                            <td className="p-2 sticky left-0 bg-white">
                              <div className="font-medium">
                                {item.costCenter?.name}
                              </div>
                              <div className="flex items-center gap-2 mt-1">
                                <Input
                                  type="number"
                                  placeholder="Apply to all"
                                  className="h-6 text-xs w-24"
                                  onBlur={(e) => {
                                    const val = parseFloat(e.target.value);
                                    if (val > 0) {
                                      applyToAllMonths(item.costCenterId, val);
                                      e.target.value = "";
                                    }
                                  }}
                                />
                                <span className="text-xs text-gray-400">
                                  Apply to all
                                </span>
                              </div>
                            </td>
                            {item.amounts.map((amount, monthIndex) => (
                              <td key={monthIndex} className="p-1">
                                <Input
                                  type="number"
                                  value={amount || ""}
                                  onChange={(e) =>
                                    updateAmount(
                                      item.costCenterId,
                                      monthIndex,
                                      parseFloat(e.target.value) || 0
                                    )
                                  }
                                  className="h-8 text-xs text-center"
                                  min="0"
                                />
                              </td>
                            ))}
                            <td className="p-2 text-right font-mono font-medium">
                              {rowTotal.toLocaleString()}
                            </td>
                            <td className="p-2">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => removeCostCenter(item.costCenterId)}
                                className="text-red-500"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                      {/* Totals Row */}
                      <tr className="bg-gray-50 font-medium">
                        <td className="p-2 sticky left-0 bg-gray-50">
                          Monthly Total
                        </td>
                        {monthlyTotals.map((total, i) => (
                          <td key={i} className="p-2 text-center font-mono">
                            {total.toLocaleString()}
                          </td>
                        ))}
                        <td className="p-2 text-right font-mono text-green-600">
                          {grandTotal.toLocaleString()}
                        </td>
                        <td></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}

              {/* Submit */}
              <div className="flex justify-end gap-3 pt-6 border-t mt-6">
                <Link href={`/${restaurant}/accounting/budgets`}>
                  <Button type="button" variant="outline">
                    Cancel
                  </Button>
                </Link>
                <Button
                  type="submit"
                  disabled={submitting || items.length === 0}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    "Save as Draft"
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </form>
    </div>
  );
}
