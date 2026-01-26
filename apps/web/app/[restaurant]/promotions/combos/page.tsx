"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@qr-dine/ui";
import { Button } from "@qr-dine/ui";
import { Input } from "@qr-dine/ui";
import {
  ArrowLeft,
  Plus,
  Loader2,
  Package,
  Trash2,
  Gift,
  Info,
} from "lucide-react";

interface MenuItem {
  id: string;
  name: string;
  basePrice: number;
  categoryId: string;
  category?: { name: string };
}

interface ComboItem {
  menuItemId: string;
  menuItemName: string;
  quantity: number;
  originalPrice: number;
}

export default function CombosPage() {
  const params = useParams();
  const router = useRouter();
  const restaurant = params.restaurant as string;

  const [loading, setLoading] = useState(false);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);

  const [form, setForm] = useState({
    name: "",
    description: "",
    comboItems: [] as ComboItem[],
    comboPrice: 0,
    startDate: "",
    endDate: "",
    status: "DRAFT",
  });

  useEffect(() => {
    fetchMenuItems();
  }, []);

  const fetchMenuItems = async () => {
    try {
      const res = await fetch("/api/menu/items");
      if (res.ok) {
        const data = await res.json();
        setMenuItems(data.items || []);
      }
    } catch (error) {
      console.error("Error fetching menu items:", error);
    }
  };

  const addComboItem = (item: MenuItem) => {
    const existing = form.comboItems.find((c) => c.menuItemId === item.id);
    if (existing) {
      setForm((prev) => ({
        ...prev,
        comboItems: prev.comboItems.map((c) =>
          c.menuItemId === item.id ? { ...c, quantity: c.quantity + 1 } : c
        ),
      }));
    } else {
      setForm((prev) => ({
        ...prev,
        comboItems: [
          ...prev.comboItems,
          {
            menuItemId: item.id,
            menuItemName: item.name,
            quantity: 1,
            originalPrice: item.basePrice,
          },
        ],
      }));
    }
  };

  const updateQuantity = (menuItemId: string, quantity: number) => {
    if (quantity < 1) {
      removeComboItem(menuItemId);
      return;
    }
    setForm((prev) => ({
      ...prev,
      comboItems: prev.comboItems.map((c) =>
        c.menuItemId === menuItemId ? { ...c, quantity } : c
      ),
    }));
  };

  const removeComboItem = (menuItemId: string) => {
    setForm((prev) => ({
      ...prev,
      comboItems: prev.comboItems.filter((c) => c.menuItemId !== menuItemId),
    }));
  };

  const calculateOriginalTotal = () => {
    return form.comboItems.reduce(
      (sum, item) => sum + item.originalPrice * item.quantity,
      0
    );
  };

  const calculateSavings = () => {
    const original = calculateOriginalTotal();
    return original - form.comboPrice;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.comboItems.length < 2) {
      alert("A combo must have at least 2 items");
      return;
    }
    if (form.comboPrice <= 0) {
      alert("Please set a combo price");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        name: form.name,
        description: form.description,
        type: "COMBO",
        discountType: "FIXED",
        discountValue: calculateSavings(),
        comboItems: form.comboItems,
        comboPrice: form.comboPrice,
        startDate: form.startDate || null,
        endDate: form.endDate || null,
        status: form.status,
        appliesTo: "ITEMS",
        itemIds: form.comboItems.map((c) => c.menuItemId),
      };

      const res = await fetch("/api/promotions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create combo");
      }

      router.push(`/${restaurant}/promotions`);
    } catch (error: any) {
      console.error("Error creating combo:", error);
      alert(error.message || "Failed to create combo");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href={`/${restaurant}/promotions`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Create Combo Deal</h1>
          <p className="text-muted-foreground">
            Bundle multiple items at a special price
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Menu Items Selection */}
          <Card>
            <CardHeader>
              <CardTitle>Select Items</CardTitle>
              <CardDescription>
                Click items to add them to the combo
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="max-h-[400px] overflow-y-auto space-y-2">
                {menuItems.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => addComboItem(item)}
                    className="w-full flex items-center justify-between p-3 border rounded-lg hover:bg-muted transition-colors text-left"
                  >
                    <div>
                      <p className="font-medium">{item.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {item.category?.name}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">Rs.{item.basePrice}</span>
                      <Plus className="h-4 w-4 text-primary" />
                    </div>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Combo Builder */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Combo Items
                </CardTitle>
              </CardHeader>
              <CardContent>
                {form.comboItems.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    Click items on the left to add them
                  </p>
                ) : (
                  <div className="space-y-3">
                    {form.comboItems.map((item) => (
                      <div
                        key={item.menuItemId}
                        className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                      >
                        <div className="flex-1">
                          <p className="font-medium">{item.menuItemName}</p>
                          <p className="text-sm text-muted-foreground">
                            Rs.{item.originalPrice} each
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex items-center border rounded-lg bg-background">
                            <button
                              type="button"
                              onClick={() =>
                                updateQuantity(item.menuItemId, item.quantity - 1)
                              }
                              className="px-3 py-1 hover:bg-muted"
                            >
                              -
                            </button>
                            <span className="px-3 py-1 border-x">
                              {item.quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                updateQuantity(item.menuItemId, item.quantity + 1)
                              }
                              className="px-3 py-1 hover:bg-muted"
                            >
                              +
                            </button>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeComboItem(item.menuItemId)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}

                    {/* Price Summary */}
                    <div className="pt-4 border-t space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">
                          Original Total:
                        </span>
                        <span className="line-through">
                          Rs.{calculateOriginalTotal()}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="font-medium">Combo Price:</span>
                        <Input
                          type="number"
                          value={form.comboPrice || ""}
                          onChange={(e) =>
                            setForm((prev) => ({
                              ...prev,
                              comboPrice: parseFloat(e.target.value) || 0,
                            }))
                          }
                          className="w-32 text-right"
                          placeholder="Rs."
                          min={0}
                        />
                      </div>
                      {form.comboPrice > 0 && (
                        <div className="flex justify-between text-green-600 font-medium">
                          <span>Customer Saves:</span>
                          <span>Rs.{calculateSavings()}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Combo Details */}
            <Card>
              <CardHeader>
                <CardTitle>Combo Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Combo Name *</label>
                  <Input
                    value={form.name}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, name: e.target.value }))
                    }
                    placeholder="e.g., Family Feast Combo"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Description</label>
                  <textarea
                    value={form.description}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, description: e.target.value }))
                    }
                    placeholder="Describe what's included..."
                    className="w-full px-3 py-2 border rounded-lg resize-none"
                    rows={2}
                  />
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Start Date</label>
                    <Input
                      type="date"
                      value={form.startDate}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, startDate: e.target.value }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">End Date</label>
                    <Input
                      type="date"
                      value={form.endDate}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, endDate: e.target.value }))
                      }
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Submit */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <select
                value={form.status}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, status: e.target.value }))
                }
                className="px-3 py-2 border rounded-lg bg-background"
              >
                <option value="DRAFT">Draft</option>
                <option value="ACTIVE">Active</option>
                <option value="SCHEDULED">Scheduled</option>
              </select>
              <div className="flex gap-3">
                <Link href={`/${restaurant}/promotions`}>
                  <Button type="button" variant="outline">
                    Cancel
                  </Button>
                </Link>
                <Button
                  type="submit"
                  disabled={loading || form.comboItems.length < 2}
                >
                  {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Create Combo
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
