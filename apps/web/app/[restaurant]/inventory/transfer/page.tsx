"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@qr-dine/ui";
import { Button } from "@qr-dine/ui";
import { Input } from "@qr-dine/ui";
import {
  ArrowLeftRight,
  ArrowRight,
  Search,
  Package,
  Warehouse,
  Loader2,
  CheckCircle,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

interface StockItem {
  id: string;
  itemCode: string;
  name: string;
  baseUnit: string;
  currentStock: number;
}

interface Godown {
  id: string;
  code: string;
  name: string;
  type: string;
  stocks?: Array<{
    stockItemId: string;
    quantity: number;
  }>;
}

export default function StockTransferPage() {
  const params = useParams();
  const router = useRouter();
  const restaurant = params.restaurant as string;

  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [godowns, setGodowns] = useState<Godown[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedItem, setSelectedItem] = useState<StockItem | null>(null);
  const [fromGodownId, setFromGodownId] = useState("");
  const [toGodownId, setToGodownId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [notes, setNotes] = useState("");
  const [availableStock, setAvailableStock] = useState<number | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (selectedItem && fromGodownId) {
      fetchGodownStock();
    } else {
      setAvailableStock(null);
    }
  }, [selectedItem, fromGodownId]);

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

  const fetchGodownStock = async () => {
    if (!selectedItem || !fromGodownId) return;

    try {
      const response = await fetch(`/api/stock/godowns/${fromGodownId}`);
      const data = await response.json();

      if (response.ok) {
        const stock = data.godown.stocks?.find(
          (s: { stockItemId: string; quantity: number }) =>
            s.stockItemId === selectedItem.id
        );
        setAvailableStock(stock ? Number(stock.quantity) : 0);
      }
    } catch (err) {
      console.error("Error fetching godown stock:", err);
      setAvailableStock(0);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!selectedItem) {
      setError("Please select a stock item");
      return;
    }

    if (!fromGodownId) {
      setError("Please select source godown");
      return;
    }

    if (!toGodownId) {
      setError("Please select destination godown");
      return;
    }

    if (fromGodownId === toGodownId) {
      setError("Source and destination godown cannot be the same");
      return;
    }

    const qty = parseFloat(quantity);
    if (!qty || qty <= 0) {
      setError("Please enter a valid quantity");
      return;
    }

    if (availableStock !== null && qty > availableStock) {
      setError(`Insufficient stock. Available: ${availableStock}`);
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch("/api/stock/transfer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stockItemId: selectedItem.id,
          fromGodownId,
          toGodownId,
          quantity: qty,
          notes,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(true);
        setTimeout(() => {
          router.push(`/${restaurant}/inventory/movements`);
        }, 2000);
      } else {
        setError(data.error || "Failed to transfer stock");
      }
    } catch (err) {
      setError("An error occurred while transferring stock");
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const filteredItems = stockItems.filter(
    (item) =>
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.itemCode.toLowerCase().includes(searchTerm.toLowerCase())
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

  if (success) {
    return (
      <div className="p-6">
        <Card className="max-w-md mx-auto mt-20">
          <CardContent className="pt-6 text-center">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Transfer Successful!</h2>
            <p className="text-gray-500 mb-4">
              Stock has been transferred successfully.
            </p>
            <p className="text-sm text-gray-400">Redirecting to movements...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Transfer Stock</h1>
          <p className="text-gray-500">
            Move stock between godowns/warehouses
          </p>
        </div>
        <Link href={`/${restaurant}/inventory/movements`}>
          <Button variant="outline">View Movements</Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Stock Item Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="w-5 h-5" />
              Select Stock Item
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search items..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>

              <div className="max-h-[400px] overflow-y-auto space-y-2">
                {filteredItems.length === 0 ? (
                  <p className="text-center text-gray-500 py-4">No items found</p>
                ) : (
                  filteredItems.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => setSelectedItem(item)}
                      className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                        selectedItem?.id === item.id
                          ? "border-blue-500 bg-blue-50"
                          : "hover:bg-gray-50"
                      }`}
                    >
                      <p className="font-medium">{item.name}</p>
                      <div className="flex justify-between text-sm text-gray-500">
                        <span>{item.itemCode}</span>
                        <span>
                          {Number(item.currentStock).toFixed(2)} {item.baseUnit}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Transfer Form */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ArrowLeftRight className="w-5 h-5" />
              Transfer Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                  {error}
                </div>
              )}

              {/* Selected Item Display */}
              {selectedItem && (
                <div className="p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm text-gray-500">Selected Item</p>
                  <p className="font-semibold text-lg">{selectedItem.name}</p>
                  <p className="text-sm text-gray-600">
                    {selectedItem.itemCode} • Total Stock:{" "}
                    {Number(selectedItem.currentStock).toFixed(2)}{" "}
                    {selectedItem.baseUnit}
                  </p>
                </div>
              )}

              {/* Godown Selection */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    <Warehouse className="w-4 h-4 inline mr-1" />
                    From Godown
                  </label>
                  <select
                    value={fromGodownId}
                    onChange={(e) => setFromGodownId(e.target.value)}
                    className="w-full h-10 px-3 border rounded-md"
                    disabled={!selectedItem}
                  >
                    <option value="">Select source godown</option>
                    {godowns.map((godown) => (
                      <option key={godown.id} value={godown.id}>
                        {godown.code} - {godown.name}
                      </option>
                    ))}
                  </select>
                  {availableStock !== null && (
                    <p className="text-sm text-gray-500 mt-1">
                      Available: {availableStock.toFixed(2)}{" "}
                      {selectedItem?.baseUnit}
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-center">
                  <ArrowRight className="w-8 h-8 text-gray-400" />
                </div>

                <div className="md:-ml-12">
                  <label className="block text-sm font-medium mb-2">
                    <Warehouse className="w-4 h-4 inline mr-1" />
                    To Godown
                  </label>
                  <select
                    value={toGodownId}
                    onChange={(e) => setToGodownId(e.target.value)}
                    className="w-full h-10 px-3 border rounded-md"
                    disabled={!selectedItem}
                  >
                    <option value="">Select destination godown</option>
                    {godowns
                      .filter((g) => g.id !== fromGodownId)
                      .map((godown) => (
                        <option key={godown.id} value={godown.id}>
                          {godown.code} - {godown.name}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              {/* Quantity */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Quantity to Transfer
                </label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    placeholder="Enter quantity"
                    className="flex-1"
                    disabled={!selectedItem}
                  />
                  <span className="flex items-center px-3 bg-gray-100 border rounded-md text-gray-600">
                    {selectedItem?.baseUnit || "units"}
                  </span>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Notes (Optional)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add any notes about this transfer..."
                  className="w-full px-3 py-2 border rounded-md"
                  rows={3}
                />
              </div>

              {/* Submit Button */}
              <div className="flex gap-3 pt-4">
                <Button
                  type="submit"
                  disabled={submitting || !selectedItem}
                  className="flex-1"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Transferring...
                    </>
                  ) : (
                    <>
                      <ArrowLeftRight className="w-4 h-4 mr-2" />
                      Transfer Stock
                    </>
                  )}
                </Button>
                <Link href={`/${restaurant}/inventory`}>
                  <Button type="button" variant="outline">
                    Cancel
                  </Button>
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
