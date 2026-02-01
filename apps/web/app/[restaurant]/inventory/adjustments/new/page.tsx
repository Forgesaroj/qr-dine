"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@qr-dine/ui";
import { Button } from "@qr-dine/ui";
import { Input } from "@qr-dine/ui";
import {
  ClipboardCheck,
  ArrowLeft,
  Plus,
  Trash2,
  Search,
  Loader2,
  CheckCircle,
  Package,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

interface StockItem {
  id: string;
  itemCode: string;
  name: string;
  baseUnit: string;
  currentStock: number;
  averageCost: number;
}

interface Godown {
  id: string;
  code: string;
  name: string;
}

interface AdjustmentItem {
  stockItemId: string;
  stockItem?: StockItem;
  godownId?: string;
  systemQuantity: number;
  physicalQuantity: number;
  reason?: string;
}

const ADJUSTMENT_TYPES = [
  { value: "PHYSICAL_COUNT", label: "Physical Count", description: "Count and reconcile actual stock" },
  { value: "WASTAGE", label: "Wastage", description: "Write off spoiled or unusable items" },
  { value: "DAMAGE", label: "Damage", description: "Write off damaged goods" },
  { value: "THEFT", label: "Theft", description: "Record stolen items" },
  { value: "OTHER", label: "Other", description: "Other adjustments" },
];

export default function NewAdjustmentPage() {
  const params = useParams();
  const router = useRouter();
  const restaurant = params.restaurant as string;

  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [godowns, setGodowns] = useState<Godown[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const [adjustmentType, setAdjustmentType] = useState("PHYSICAL_COUNT");
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [selectedGodown, setSelectedGodown] = useState("");
  const [items, setItems] = useState<AdjustmentItem[]>([]);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [itemsRes, godownsRes] = await Promise.all([
        fetch("/api/stock/items?limit=1000"),
        fetch("/api/stock/godowns"),
      ]);

      const itemsData = await itemsRes.json();
      const godownsData = await godownsRes.json();

      setStockItems(itemsData.stockItems || []);
      setGodowns(godownsData.godowns || []);
    } catch (err) {
      console.error("Error fetching data:", err);
    } finally {
      setLoading(false);
    }
  };

  const addItem = (stockItem: StockItem) => {
    // Check if already added
    if (items.some((i) => i.stockItemId === stockItem.id)) {
      return;
    }

    setItems([
      ...items,
      {
        stockItemId: stockItem.id,
        stockItem,
        godownId: selectedGodown || undefined,
        systemQuantity: Number(stockItem.currentStock),
        physicalQuantity:
          adjustmentType === "PHYSICAL_COUNT" ? 0 : Number(stockItem.currentStock),
        reason: "",
      },
    ]);
    setSearchTerm("");
  };

  const updateItem = (index: number, field: string, value: number | string) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (items.length === 0) {
      setError("Add at least one item to adjust");
      return;
    }

    setSubmitting(true);

    try {
      const payload = {
        adjustmentType,
        reason: reason.trim() || undefined,
        notes: notes.trim() || undefined,
        godownId: selectedGodown || undefined,
        items: items.map((item) => ({
          stockItemId: item.stockItemId,
          godownId: item.godownId,
          physicalQuantity: item.physicalQuantity,
          adjustmentQuantity:
            adjustmentType === "PHYSICAL_COUNT"
              ? 0
              : item.physicalQuantity - item.systemQuantity,
          reason: item.reason,
        })),
      };

      const response = await fetch("/api/stock/adjustments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(true);
        setTimeout(() => {
          router.push(`/${restaurant}/inventory/adjustments`);
        }, 2000);
      } else {
        setError(data.error || "Failed to create adjustment");
      }
    } catch (err) {
      setError("An error occurred");
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const filteredItems = stockItems.filter(
    (item) =>
      !items.some((i) => i.stockItemId === item.id) &&
      (item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.itemCode.toLowerCase().includes(searchTerm.toLowerCase()))
  );

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
            <h2 className="text-xl font-semibold mb-2">Adjustment Created!</h2>
            <p className="text-gray-500 mb-4">
              The adjustment has been saved as draft.
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
        <Link href={`/${restaurant}/inventory/adjustments`}>
          <Button variant="ghost" size="sm">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">New Stock Adjustment</h1>
          <p className="text-gray-500">Create a stock adjustment record</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Adjustment Type & Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ClipboardCheck className="w-5 h-5" />
                Adjustment Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Adjustment Type
                </label>
                <div className="space-y-2">
                  {ADJUSTMENT_TYPES.map((type) => (
                    <label
                      key={type.value}
                      className={`flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                        adjustmentType === type.value
                          ? "border-blue-500 bg-blue-50"
                          : "hover:bg-gray-50"
                      }`}
                    >
                      <input
                        type="radio"
                        name="adjustmentType"
                        value={type.value}
                        checked={adjustmentType === type.value}
                        onChange={(e) => setAdjustmentType(e.target.value)}
                        className="mt-1"
                      />
                      <div>
                        <p className="font-medium">{type.label}</p>
                        <p className="text-xs text-gray-500">{type.description}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Godown (Optional)
                </label>
                <select
                  value={selectedGodown}
                  onChange={(e) => setSelectedGodown(e.target.value)}
                  className="w-full h-10 px-3 border rounded-md"
                >
                  <option value="">All Godowns</option>
                  {godowns.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.code} - {g.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Reason</label>
                <Input
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Brief reason for adjustment"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Notes</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Additional notes..."
                  className="w-full px-3 py-2 border rounded-md"
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Items Selection */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Adjustment Items</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Search & Add */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search items to add..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
                {searchTerm && filteredItems.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-y-auto">
                    {filteredItems.slice(0, 10).map((item) => (
                      <div
                        key={item.id}
                        onClick={() => addItem(item)}
                        className="p-3 hover:bg-gray-50 cursor-pointer border-b last:border-0"
                      >
                        <div className="flex justify-between">
                          <span className="font-medium">{item.name}</span>
                          <span className="text-gray-500">
                            {Number(item.currentStock).toFixed(2)} {item.baseUnit}
                          </span>
                        </div>
                        <span className="text-xs text-gray-500">
                          {item.itemCode}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Items List */}
              {items.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed rounded-lg text-gray-500">
                  <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No items added yet</p>
                  <p className="text-sm">Search and add items above</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {items.map((item, index) => (
                    <div
                      key={item.stockItemId}
                      className="p-4 border rounded-lg"
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <p className="font-medium">{item.stockItem?.name}</p>
                          <p className="text-xs text-gray-500">
                            {item.stockItem?.itemCode} •{" "}
                            {item.stockItem?.baseUnit}
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeItem(index)}
                          className="text-red-500"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>

                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">
                            System Qty
                          </label>
                          <Input
                            type="number"
                            value={item.systemQuantity}
                            disabled
                            className="bg-gray-50"
                          />
                        </div>

                        <div>
                          <label className="block text-xs text-gray-500 mb-1">
                            {adjustmentType === "PHYSICAL_COUNT"
                              ? "Physical Qty"
                              : "Adjusted Qty"}
                          </label>
                          <Input
                            type="number"
                            step="0.01"
                            value={item.physicalQuantity}
                            onChange={(e) =>
                              updateItem(
                                index,
                                "physicalQuantity",
                                parseFloat(e.target.value) || 0
                              )
                            }
                          />
                        </div>

                        <div>
                          <label className="block text-xs text-gray-500 mb-1">
                            Difference
                          </label>
                          <div
                            className={`h-10 flex items-center px-3 border rounded-md font-medium ${
                              item.physicalQuantity - item.systemQuantity >= 0
                                ? "bg-green-50 text-green-600"
                                : "bg-red-50 text-red-600"
                            }`}
                          >
                            {item.physicalQuantity - item.systemQuantity >= 0
                              ? "+"
                              : ""}
                            {(
                              item.physicalQuantity - item.systemQuantity
                            ).toFixed(2)}
                          </div>
                        </div>
                      </div>

                      <div className="mt-3">
                        <Input
                          placeholder="Item-specific reason (optional)"
                          value={item.reason || ""}
                          onChange={(e) =>
                            updateItem(index, "reason", e.target.value)
                          }
                          className="text-sm"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Summary */}
              {items.length > 0 && (
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h3 className="font-medium mb-2">Summary</h3>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Total Items:</span>{" "}
                      <span className="font-medium">{items.length}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Increases:</span>{" "}
                      <span className="font-medium text-green-600">
                        {
                          items.filter(
                            (i) => i.physicalQuantity > i.systemQuantity
                          ).length
                        }
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">Decreases:</span>{" "}
                      <span className="font-medium text-red-600">
                        {
                          items.filter(
                            (i) => i.physicalQuantity < i.systemQuantity
                          ).length
                        }
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Submit */}
              <div className="flex justify-end gap-3 pt-4 border-t">
                <Link href={`/${restaurant}/inventory/adjustments`}>
                  <Button type="button" variant="outline">
                    Cancel
                  </Button>
                </Link>
                <Button type="submit" disabled={submitting || items.length === 0}>
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    "Create Adjustment"
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
