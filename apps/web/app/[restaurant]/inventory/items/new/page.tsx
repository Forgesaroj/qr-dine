"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@qr-dine/ui";
import { Button } from "@qr-dine/ui";
import { Input } from "@qr-dine/ui";
import {
  Package,
  Save,
  ArrowLeft,
  Loader2,
  CheckCircle,
  Info,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

interface Category {
  id: string;
  code: string;
  name: string;
}

interface Godown {
  id: string;
  code: string;
  name: string;
  type: string;
}

const STOCK_ITEM_TYPES = [
  { value: "RAW_MATERIAL", label: "Raw Material" },
  { value: "FINISHED_GOODS", label: "Finished Goods" },
  { value: "SEMI_FINISHED", label: "Semi-Finished" },
  { value: "CONSUMABLE", label: "Consumable" },
  { value: "PACKAGING", label: "Packaging" },
];

const VALUATION_METHODS = [
  { value: "WEIGHTED_AVERAGE", label: "Weighted Average" },
  { value: "FIFO", label: "FIFO (First In First Out)" },
  { value: "STANDARD_COST", label: "Standard Cost" },
];

const COMMON_UNITS = [
  "kg",
  "g",
  "mg",
  "l",
  "ml",
  "pcs",
  "box",
  "pack",
  "dozen",
  "bottle",
  "can",
  "bag",
];

export default function NewStockItemPage() {
  const params = useParams();
  const router = useRouter();
  const restaurant = params.restaurant as string;

  const [categories, setCategories] = useState<Category[]>([]);
  const [godowns, setGodowns] = useState<Godown[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  // Form fields
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    itemType: "RAW_MATERIAL",
    categoryId: "",
    baseUnit: "kg",
    customUnit: "",
    valuationMethod: "WEIGHTED_AVERAGE",
    openingStock: "",
    openingRate: "",
    reorderLevel: "",
    maxStockLevel: "",
    standardCost: "",
    sellingPrice: "",
    taxRate: "13",
    defaultGodownId: "",
    trackBatch: false,
    trackExpiry: false,
    hsnCode: "",
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [categoriesRes, godownsRes] = await Promise.all([
        fetch("/api/stock/categories"),
        fetch("/api/stock/godowns"),
      ]);

      const categoriesData = await categoriesRes.json();
      const godownsData = await godownsRes.json();

      setCategories(categoriesData.categories || []);
      setGodowns(godownsData.godowns || []);
    } catch (err) {
      console.error("Error fetching data:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]:
        type === "checkbox" ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!formData.name.trim()) {
      setError("Item name is required");
      return;
    }

    const unit = formData.customUnit || formData.baseUnit;
    if (!unit) {
      setError("Unit is required");
      return;
    }

    setSubmitting(true);

    try {
      const payload = {
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        itemType: formData.itemType,
        categoryId: formData.categoryId || undefined,
        baseUnit: unit,
        valuationMethod: formData.valuationMethod,
        openingStock: formData.openingStock
          ? parseFloat(formData.openingStock)
          : 0,
        openingRate: formData.openingRate
          ? parseFloat(formData.openingRate)
          : 0,
        reorderLevel: formData.reorderLevel
          ? parseFloat(formData.reorderLevel)
          : undefined,
        maxStockLevel: formData.maxStockLevel
          ? parseFloat(formData.maxStockLevel)
          : undefined,
        standardCost: formData.standardCost
          ? parseFloat(formData.standardCost)
          : undefined,
        sellingPrice: formData.sellingPrice
          ? parseFloat(formData.sellingPrice)
          : undefined,
        taxRate: formData.taxRate ? parseFloat(formData.taxRate) : 13,
        defaultGodownId: formData.defaultGodownId || undefined,
        trackBatch: formData.trackBatch,
        trackExpiry: formData.trackExpiry,
        hsnCode: formData.hsnCode.trim() || undefined,
      };

      const response = await fetch("/api/stock/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(true);
        setTimeout(() => {
          router.push(`/${restaurant}/inventory/items`);
        }, 2000);
      } else {
        setError(data.error || "Failed to create stock item");
      }
    } catch (err) {
      setError("An error occurred while creating stock item");
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

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
            <h2 className="text-xl font-semibold mb-2">Stock Item Created!</h2>
            <p className="text-gray-500 mb-4">
              The stock item has been created successfully.
            </p>
            <p className="text-sm text-gray-400">Redirecting to items list...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href={`/${restaurant}/inventory/items`}>
          <Button variant="ghost" size="sm">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Add Stock Item</h1>
          <p className="text-gray-500">Create a new inventory item</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="w-5 h-5" />
                Basic Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Item Name <span className="text-red-500">*</span>
                </label>
                <Input
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="e.g., Basmati Rice, Cooking Oil"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Description
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Item description..."
                  className="w-full px-3 py-2 border rounded-md"
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Item Type
                  </label>
                  <select
                    name="itemType"
                    value={formData.itemType}
                    onChange={handleInputChange}
                    className="w-full h-10 px-3 border rounded-md"
                  >
                    {STOCK_ITEM_TYPES.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Category
                  </label>
                  <select
                    name="categoryId"
                    value={formData.categoryId}
                    onChange={handleInputChange}
                    className="w-full h-10 px-3 border rounded-md"
                  >
                    <option value="">No Category</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Base Unit <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="baseUnit"
                    value={formData.baseUnit}
                    onChange={handleInputChange}
                    className="w-full h-10 px-3 border rounded-md"
                  >
                    {COMMON_UNITS.map((unit) => (
                      <option key={unit} value={unit}>
                        {unit}
                      </option>
                    ))}
                    <option value="custom">Custom...</option>
                  </select>
                </div>

                {formData.baseUnit === "custom" && (
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Custom Unit
                    </label>
                    <Input
                      name="customUnit"
                      value={formData.customUnit}
                      onChange={handleInputChange}
                      placeholder="Enter unit"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Valuation Method
                  </label>
                  <select
                    name="valuationMethod"
                    value={formData.valuationMethod}
                    onChange={handleInputChange}
                    className="w-full h-10 px-3 border rounded-md"
                  >
                    {VALUATION_METHODS.map((method) => (
                      <option key={method.value} value={method.value}>
                        {method.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  HSN/SAC Code
                </label>
                <Input
                  name="hsnCode"
                  value={formData.hsnCode}
                  onChange={handleInputChange}
                  placeholder="e.g., 1006, 1509"
                />
              </div>
            </CardContent>
          </Card>

          {/* Stock & Pricing */}
          <Card>
            <CardHeader>
              <CardTitle>Stock & Pricing</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-3 bg-blue-50 rounded-lg text-sm text-blue-700 flex items-start gap-2">
                <Info className="w-4 h-4 mt-0.5" />
                <span>
                  Opening stock will be added to the default godown selected below.
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Opening Stock
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    name="openingStock"
                    value={formData.openingStock}
                    onChange={handleInputChange}
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Opening Rate (per unit)
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    name="openingRate"
                    value={formData.openingRate}
                    onChange={handleInputChange}
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Reorder Level
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    name="reorderLevel"
                    value={formData.reorderLevel}
                    onChange={handleInputChange}
                    placeholder="Alert when stock falls below"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Maximum Stock Level
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    name="maxStockLevel"
                    value={formData.maxStockLevel}
                    onChange={handleInputChange}
                    placeholder="Optional max limit"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Standard Cost
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    name="standardCost"
                    value={formData.standardCost}
                    onChange={handleInputChange}
                    placeholder="For standard costing"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Selling Price
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    name="sellingPrice"
                    value={formData.sellingPrice}
                    onChange={handleInputChange}
                    placeholder="Default selling price"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Tax Rate (%)
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    name="taxRate"
                    value={formData.taxRate}
                    onChange={handleInputChange}
                    placeholder="13"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Default Godown
                  </label>
                  <select
                    name="defaultGodownId"
                    value={formData.defaultGodownId}
                    onChange={handleInputChange}
                    className="w-full h-10 px-3 border rounded-md"
                  >
                    <option value="">Select godown</option>
                    {godowns.map((godown) => (
                      <option key={godown.id} value={godown.id}>
                        {godown.code} - {godown.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Tracking Options */}
              <div className="pt-4 border-t">
                <p className="font-medium mb-3">Tracking Options</p>
                <div className="space-y-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      name="trackBatch"
                      checked={formData.trackBatch}
                      onChange={handleInputChange}
                      className="w-4 h-4 rounded"
                    />
                    <span className="text-sm">
                      Track Batch Numbers (for batch-wise inventory)
                    </span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      name="trackExpiry"
                      checked={formData.trackExpiry}
                      onChange={handleInputChange}
                      className="w-4 h-4 rounded"
                    />
                    <span className="text-sm">
                      Track Expiry Dates (for perishable items)
                    </span>
                  </label>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Submit Buttons */}
        <div className="flex justify-end gap-3 mt-6">
          <Link href={`/${restaurant}/inventory/items`}>
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </Link>
          <Button type="submit" disabled={submitting}>
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Create Stock Item
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
