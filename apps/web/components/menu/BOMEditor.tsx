"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Input,
  Alert,
} from "@qr-dine/ui";
import {
  Plus,
  Trash2,
  Loader2,
  AlertCircle,
  Package,
  RefreshCw,
  ExternalLink,
  Save,
} from "lucide-react";

interface StockItem {
  id: string;
  itemCode: string;
  name: string;
  baseUnit: string;
  currentStock: number;
  averageCost: number;
}

interface BOMEntry {
  id: string;
  stockItemId: string;
  stockItem: StockItem;
  quantity: number;
  unit: string;
  cost: number;
}

interface BOMEditorProps {
  menuItemId: string;
  restaurant: string;
}

export default function BOMEditor({ menuItemId, restaurant }: BOMEditorProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [bomEntries, setBomEntries] = useState<BOMEntry[]>([]);
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [totalCost, setTotalCost] = useState(0);

  // New entry form
  const [newEntry, setNewEntry] = useState({
    stockItemId: "",
    quantity: "",
    unit: "",
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    fetchData();
  }, [menuItemId]);

  const fetchData = async () => {
    setIsLoading(true);
    setError("");
    try {
      const [bomRes, stockRes] = await Promise.all([
        fetch(`/api/menu/items/${menuItemId}/bom`),
        fetch("/api/stock/items?isActive=true&limit=1000"),
      ]);

      if (bomRes.ok) {
        const bomData = await bomRes.json();
        setBomEntries(bomData.bomEntries || []);
        setTotalCost(bomData.totalCost || 0);
      }

      if (stockRes.ok) {
        const stockData = await stockRes.json();
        setStockItems(stockData.stockItems || []);
      }
    } catch (err) {
      console.error("Error fetching BOM data:", err);
      setError("Failed to fetch data");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddEntry = async () => {
    if (!newEntry.stockItemId || !newEntry.quantity) {
      setError("Please select a stock item and enter quantity");
      return;
    }

    const quantity = parseFloat(newEntry.quantity);
    if (isNaN(quantity) || quantity <= 0) {
      setError("Please enter a valid quantity");
      return;
    }

    // Check if already exists
    if (bomEntries.some((e) => e.stockItemId === newEntry.stockItemId)) {
      setError("This stock item is already in the BOM");
      return;
    }

    setIsSaving(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch(`/api/menu/items/${menuItemId}/bom`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stockItemId: newEntry.stockItemId,
          quantity,
          unit: newEntry.unit,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to add BOM entry");
        return;
      }

      setBomEntries([...bomEntries, data.bomEntry]);
      setTotalCost((prev) => prev + data.bomEntry.cost);
      setNewEntry({ stockItemId: "", quantity: "", unit: "" });
      setSearchQuery("");
      setSuccess("Ingredient added successfully");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError("Network error. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteEntry = async (entryId: string) => {
    if (!confirm("Remove this ingredient from the recipe?")) {
      return;
    }

    setIsSaving(true);
    setError("");

    try {
      const response = await fetch(
        `/api/menu/items/${menuItemId}/bom?entryId=${entryId}`,
        { method: "DELETE" }
      );

      if (!response.ok) {
        const data = await response.json();
        setError(data.error || "Failed to delete entry");
        return;
      }

      const deletedEntry = bomEntries.find((e) => e.id === entryId);
      setBomEntries(bomEntries.filter((e) => e.id !== entryId));
      if (deletedEntry) {
        setTotalCost((prev) => prev - deletedEntry.cost);
      }
      setSuccess("Ingredient removed");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError("Network error. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateQuantity = async (
    entryId: string,
    newQuantity: number
  ) => {
    if (newQuantity <= 0) return;

    const entry = bomEntries.find((e) => e.id === entryId);
    if (!entry) return;

    // Update locally first
    const updatedEntries = bomEntries.map((e) => {
      if (e.id === entryId) {
        const newCost = newQuantity * e.stockItem.averageCost;
        return { ...e, quantity: newQuantity, cost: newCost };
      }
      return e;
    });
    setBomEntries(updatedEntries);
    setTotalCost(updatedEntries.reduce((sum, e) => sum + e.cost, 0));
  };

  const handleSaveAll = async () => {
    setIsSaving(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch(`/api/menu/items/${menuItemId}/bom`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entries: bomEntries.map((e) => ({
            stockItemId: e.stockItemId,
            quantity: e.quantity,
            unit: e.unit,
          })),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to save BOM");
        return;
      }

      setBomEntries(data.bomEntries);
      setTotalCost(data.totalCost);
      setSuccess("Recipe saved successfully");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError("Network error. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const filteredStockItems = stockItems.filter(
    (item) =>
      !bomEntries.some((e) => e.stockItemId === item.id) &&
      (item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.itemCode.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const selectedStockItem = stockItems.find(
    (s) => s.id === newEntry.stockItemId
  );

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="ml-2">Loading recipe...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Bill of Materials (Recipe)
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Define ingredients to auto-deduct stock when this item is served
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchData}
            title="Refresh"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
          {bomEntries.length > 0 && (
            <Button
              size="sm"
              onClick={handleSaveAll}
              disabled={isSaving}
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Save Changes
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <span className="ml-2">{error}</span>
          </Alert>
        )}

        {success && (
          <Alert className="bg-green-50 border-green-200 text-green-800">
            <span>{success}</span>
          </Alert>
        )}

        {/* Existing BOM Entries */}
        {bomEntries.length > 0 ? (
          <div className="border rounded-lg divide-y">
            <div className="grid grid-cols-12 gap-2 px-4 py-2 bg-gray-50 text-sm font-medium text-gray-600">
              <div className="col-span-4">Ingredient</div>
              <div className="col-span-2 text-center">Stock</div>
              <div className="col-span-2 text-center">Qty / Serving</div>
              <div className="col-span-2 text-center">Unit</div>
              <div className="col-span-1 text-right">Cost</div>
              <div className="col-span-1"></div>
            </div>
            {bomEntries.map((entry) => (
              <div
                key={entry.id}
                className="grid grid-cols-12 gap-2 px-4 py-3 items-center"
              >
                <div className="col-span-4">
                  <p className="font-medium">{entry.stockItem.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {entry.stockItem.itemCode}
                  </p>
                </div>
                <div className="col-span-2 text-center text-sm">
                  <span
                    className={
                      Number(entry.stockItem.currentStock) < entry.quantity
                        ? "text-red-600 font-medium"
                        : "text-green-600"
                    }
                  >
                    {Number(entry.stockItem.currentStock).toFixed(2)}
                  </span>
                </div>
                <div className="col-span-2">
                  <Input
                    type="number"
                    min="0.001"
                    step="0.001"
                    value={entry.quantity}
                    onChange={(e) =>
                      handleUpdateQuantity(
                        entry.id,
                        parseFloat(e.target.value) || 0
                      )
                    }
                    className="text-center h-8"
                  />
                </div>
                <div className="col-span-2 text-center text-sm">
                  {entry.unit}
                </div>
                <div className="col-span-1 text-right text-sm font-medium">
                  Rs. {entry.cost.toFixed(2)}
                </div>
                <div className="col-span-1 text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteEntry(entry.id)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50 h-8 w-8 p-0"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
            <div className="px-4 py-3 bg-gray-50 flex justify-between items-center">
              <span className="font-medium">Total Cost per Serving</span>
              <span className="text-lg font-bold">
                Rs. {totalCost.toFixed(2)}
              </span>
            </div>
          </div>
        ) : (
          <div className="text-center py-8 border-2 border-dashed rounded-lg">
            <Package className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No ingredients added yet</p>
            <p className="text-sm text-gray-400">
              Add stock items to track inventory usage
            </p>
          </div>
        )}

        {/* Add New Entry */}
        <div className="border rounded-lg p-4 bg-gray-50">
          <h4 className="font-medium mb-3 flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Add Ingredient
          </h4>
          <div className="grid grid-cols-12 gap-3 items-end">
            <div className="col-span-5 relative">
              <label className="text-sm font-medium mb-1 block">
                Stock Item
              </label>
              <Input
                placeholder="Search stock items..."
                value={
                  selectedStockItem
                    ? `${selectedStockItem.name} (${selectedStockItem.itemCode})`
                    : searchQuery
                }
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setNewEntry({ ...newEntry, stockItemId: "" });
                  setShowDropdown(true);
                }}
                onFocus={() => setShowDropdown(true)}
              />
              {showDropdown && searchQuery && !newEntry.stockItemId && (
                <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-60 overflow-auto">
                  {filteredStockItems.length > 0 ? (
                    <>
                      {filteredStockItems.slice(0, 10).map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          className="w-full px-4 py-2 text-left hover:bg-gray-100 flex justify-between items-center"
                          onClick={() => {
                            setNewEntry({
                              ...newEntry,
                              stockItemId: item.id,
                              unit: item.baseUnit,
                            });
                            setSearchQuery("");
                            setShowDropdown(false);
                          }}
                        >
                          <div>
                            <p className="font-medium">{item.name}</p>
                            <p className="text-xs text-gray-500">
                              {item.itemCode} | Stock: {Number(item.currentStock).toFixed(2)} {item.baseUnit}
                            </p>
                          </div>
                          <span className="text-sm text-gray-500">
                            Rs. {Number(item.averageCost).toFixed(2)}/{item.baseUnit}
                          </span>
                        </button>
                      ))}
                      <a
                        href={`/${restaurant}/inventory/items`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 px-4 py-2 border-t hover:bg-blue-50 text-blue-600 text-sm"
                      >
                        <Plus className="h-4 w-4" />
                        Add New Stock Item
                        <ExternalLink className="h-3 w-3 ml-auto" />
                      </a>
                    </>
                  ) : (
                    <div className="p-4 text-center text-gray-500">
                      <p>No matching items found</p>
                      <a
                        href={`/${restaurant}/inventory/items`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-2 mt-2 text-blue-600 hover:underline"
                      >
                        <Plus className="h-4 w-4" />
                        Create New Stock Item
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="col-span-3">
              <label className="text-sm font-medium mb-1 block">
                Quantity per Serving
              </label>
              <Input
                type="number"
                min="0.001"
                step="0.001"
                placeholder="0.00"
                value={newEntry.quantity}
                onChange={(e) =>
                  setNewEntry({ ...newEntry, quantity: e.target.value })
                }
              />
            </div>
            <div className="col-span-2">
              <label className="text-sm font-medium mb-1 block">Unit</label>
              <Input
                placeholder={selectedStockItem?.baseUnit || "unit"}
                value={newEntry.unit}
                onChange={(e) =>
                  setNewEntry({ ...newEntry, unit: e.target.value })
                }
              />
            </div>
            <div className="col-span-2">
              <Button
                onClick={handleAddEntry}
                disabled={isSaving || !newEntry.stockItemId || !newEntry.quantity}
                className="w-full"
              >
                {isSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-1" />
                    Add
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Info Box */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-medium text-blue-800 mb-1">
            How Stock Deduction Works
          </h4>
          <p className="text-sm text-blue-700">
            When an order containing this menu item is marked as &quot;Served&quot;, the
            system will automatically deduct the specified quantities from your
            inventory. Stock levels are checked in real-time to prevent overselling.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
