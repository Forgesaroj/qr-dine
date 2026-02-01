"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@qr-dine/ui";
import { Button } from "@qr-dine/ui";
import { Input } from "@qr-dine/ui";
import {
  Building2,
  Plus,
  Edit2,
  Trash2,
  X,
  Loader2,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Eye,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";

interface CostCenter {
  id: string;
  code: string;
  name: string;
  description: string | null;
  type: string;
  managerName: string | null;
  isActive: boolean;
  transactionCount?: number;
  monthlyExpenses?: number;
  monthlyBudget?: number;
}

const COST_CENTER_TYPES = [
  { value: "DEPARTMENT", label: "Department" },
  { value: "LOCATION", label: "Location" },
  { value: "PROJECT", label: "Project" },
  { value: "PRODUCT_LINE", label: "Product Line" },
];

export default function CostCentersPage() {
  const params = useParams();
  const restaurant = params.restaurant as string;
  const [costCenters, setCostCenters] = useState<CostCenter[]>([]);
  const [loading, setLoading] = useState(true);

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<CostCenter | null>(null);
  const [formData, setFormData] = useState({
    code: "",
    name: "",
    description: "",
    type: "DEPARTMENT",
    managerName: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchCostCenters();
  }, []);

  const fetchCostCenters = async () => {
    try {
      const response = await fetch("/api/accounting/cost-centers?includeStats=true");
      const data = await response.json();
      setCostCenters(data.costCenters || []);
    } catch (err) {
      console.error("Error fetching cost centers:", err);
    } finally {
      setLoading(false);
    }
  };

  const openCreateForm = () => {
    setEditing(null);
    setFormData({
      code: "",
      name: "",
      description: "",
      type: "DEPARTMENT",
      managerName: "",
    });
    setShowForm(true);
    setError("");
  };

  const openEditForm = (costCenter: CostCenter) => {
    setEditing(costCenter);
    setFormData({
      code: costCenter.code,
      name: costCenter.name,
      description: costCenter.description || "",
      type: costCenter.type,
      managerName: costCenter.managerName || "",
    });
    setShowForm(true);
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!formData.code || !formData.name) {
      setError("Code and name are required");
      return;
    }

    setSubmitting(true);

    try {
      const url = editing
        ? `/api/accounting/cost-centers/${editing.id}`
        : "/api/accounting/cost-centers";
      const method = editing ? "PATCH" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        setShowForm(false);
        fetchCostCenters();
      } else {
        setError(data.error || "Failed to save cost center");
      }
    } catch (err) {
      setError("An error occurred");
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (costCenter: CostCenter) => {
    if (costCenter.transactionCount && costCenter.transactionCount > 0) {
      alert("Cannot delete cost center with transactions. Deactivate instead.");
      return;
    }

    if (!confirm(`Are you sure you want to delete "${costCenter.name}"?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/accounting/cost-centers/${costCenter.id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        fetchCostCenters();
      } else {
        const data = await response.json();
        alert(data.error || "Failed to delete cost center");
      }
    } catch (err) {
      console.error("Error deleting cost center:", err);
    }
  };

  const toggleActive = async (costCenter: CostCenter) => {
    try {
      const response = await fetch(`/api/accounting/cost-centers/${costCenter.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !costCenter.isActive }),
      });

      if (response.ok) {
        fetchCostCenters();
      }
    } catch (err) {
      console.error("Error updating cost center:", err);
    }
  };

  // Calculate totals
  const totalExpenses = costCenters.reduce(
    (sum, cc) => sum + (cc.monthlyExpenses || 0),
    0
  );
  const totalBudget = costCenters.reduce(
    (sum, cc) => sum + (cc.monthlyBudget || 0),
    0
  );

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
          <h1 className="text-2xl font-bold">Cost Centers</h1>
          <p className="text-gray-500">Track expenses by department or project</p>
        </div>
        <div className="flex gap-2">
          <Link href={`/${restaurant}/accounting`}>
            <Button variant="outline">Back to Accounting</Button>
          </Link>
          <Button onClick={openCreateForm}>
            <Plus className="w-4 h-4 mr-2" />
            Add Cost Center
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Building2 className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{costCenters.length}</p>
                <p className="text-sm text-gray-500">Cost Centers</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <TrendingDown className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  Rs. {totalExpenses.toLocaleString()}
                </p>
                <p className="text-sm text-gray-500">This Month Expenses</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <BarChart3 className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  Rs. {totalBudget.toLocaleString()}
                </p>
                <p className="text-sm text-gray-500">This Month Budget</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div
                className={`p-2 rounded-lg ${
                  totalBudget - totalExpenses >= 0
                    ? "bg-green-100"
                    : "bg-red-100"
                }`}
              >
                <TrendingUp
                  className={`w-5 h-5 ${
                    totalBudget - totalExpenses >= 0
                      ? "text-green-600"
                      : "text-red-600"
                  }`}
                />
              </div>
              <div>
                <p
                  className={`text-2xl font-bold ${
                    totalBudget - totalExpenses >= 0
                      ? "text-green-600"
                      : "text-red-600"
                  }`}
                >
                  Rs. {Math.abs(totalBudget - totalExpenses).toLocaleString()}
                </p>
                <p className="text-sm text-gray-500">
                  {totalBudget - totalExpenses >= 0 ? "Under Budget" : "Over Budget"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Cost Centers List */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>All Cost Centers</CardTitle>
          </CardHeader>
          <CardContent>
            {costCenters.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Building2 className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No cost centers created yet</p>
                <Button variant="outline" className="mt-4" onClick={openCreateForm}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create First Cost Center
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {costCenters.map((cc) => {
                  const variance = (cc.monthlyBudget || 0) - (cc.monthlyExpenses || 0);
                  const isOverBudget = variance < 0;

                  return (
                    <div
                      key={cc.id}
                      className={`p-4 border rounded-lg ${
                        !cc.isActive ? "opacity-50 bg-gray-50" : ""
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-sm font-medium text-gray-600">
                              {cc.code}
                            </span>
                            <span className="font-semibold">{cc.name}</span>
                            <span className="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-600">
                              {cc.type}
                            </span>
                            {!cc.isActive && (
                              <span className="text-xs px-2 py-0.5 rounded bg-red-100 text-red-600">
                                Inactive
                              </span>
                            )}
                          </div>
                          {cc.description && (
                            <p className="text-sm text-gray-500 mt-1">
                              {cc.description}
                            </p>
                          )}
                          {cc.managerName && (
                            <p className="text-xs text-gray-400 mt-1">
                              Manager: {cc.managerName}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <Link href={`/${restaurant}/accounting/cost-centers/${cc.id}`}>
                            <Button variant="ghost" size="sm">
                              <Eye className="w-4 h-4" />
                            </Button>
                          </Link>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditForm(cc)}
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(cc)}
                            className="text-red-500"
                            disabled={cc.transactionCount ? cc.transactionCount > 0 : false}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>

                      {/* Budget vs Actual Bar */}
                      {(cc.monthlyBudget || 0) > 0 && (
                        <div className="mt-3">
                          <div className="flex justify-between text-xs text-gray-500 mb-1">
                            <span>
                              Spent: Rs. {(cc.monthlyExpenses || 0).toLocaleString()}
                            </span>
                            <span>
                              Budget: Rs. {(cc.monthlyBudget || 0).toLocaleString()}
                            </span>
                          </div>
                          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full ${
                                isOverBudget ? "bg-red-500" : "bg-green-500"
                              }`}
                              style={{
                                width: `${Math.min(
                                  ((cc.monthlyExpenses || 0) / (cc.monthlyBudget || 1)) *
                                    100,
                                  100
                                )}%`,
                              }}
                            />
                          </div>
                          <p
                            className={`text-xs mt-1 ${
                              isOverBudget ? "text-red-600" : "text-green-600"
                            }`}
                          >
                            {isOverBudget
                              ? `Over budget by Rs. ${Math.abs(variance).toLocaleString()}`
                              : `Under budget by Rs. ${variance.toLocaleString()}`}
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Form Panel */}
        <Card className={showForm ? "" : "opacity-60"}>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>{editing ? "Edit Cost Center" : "New Cost Center"}</span>
              {showForm && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowForm(false)}
                >
                  <X className="w-4 h-4" />
                </Button>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!showForm ? (
              <div className="text-center py-8 text-gray-500">
                <p className="mb-4">Click to create a new cost center</p>
                <Button onClick={openCreateForm}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Cost Center
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded text-red-600 text-sm">
                    {error}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Code <span className="text-red-500">*</span>
                  </label>
                  <Input
                    value={formData.code}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        code: e.target.value.toUpperCase(),
                      }))
                    }
                    placeholder="e.g., KITCHEN, BAR"
                    disabled={!!editing}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Name <span className="text-red-500">*</span>
                  </label>
                  <Input
                    value={formData.name}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, name: e.target.value }))
                    }
                    placeholder="e.g., Kitchen Department"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Type</label>
                  <select
                    value={formData.type}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, type: e.target.value }))
                    }
                    className="w-full h-10 px-3 border rounded-md"
                  >
                    {COST_CENTER_TYPES.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Manager Name
                  </label>
                  <Input
                    value={formData.managerName}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        managerName: e.target.value,
                      }))
                    }
                    placeholder="Responsible person"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        description: e.target.value,
                      }))
                    }
                    placeholder="Optional description"
                    className="w-full px-3 py-2 border rounded-md"
                    rows={3}
                  />
                </div>

                <div className="flex gap-2 pt-4">
                  <Button type="submit" disabled={submitting} className="flex-1">
                    {submitting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : editing ? (
                      "Update"
                    ) : (
                      "Create"
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowForm(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
