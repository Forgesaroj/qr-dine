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
  Loader2,
  Gift,
  ArrowRight,
  Percent,
} from "lucide-react";

interface MenuItem {
  id: string;
  name: string;
  basePrice: number;
  category?: { name: string };
}

interface Category {
  id: string;
  name: string;
}

export default function BOGOPage() {
  const params = useParams();
  const router = useRouter();
  const restaurant = params.restaurant as string;

  const [loading, setLoading] = useState(false);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  const [form, setForm] = useState({
    name: "",
    description: "",
    buyQuantity: 1,
    getQuantity: 1,
    getDiscount: 100,
    sameItem: true,
    appliesTo: "ALL",
    buyItemIds: [] as string[],
    getItemIds: [] as string[],
    categoryIds: [] as string[],
    startDate: "",
    endDate: "",
    totalUsesLimit: "",
    perCustomerLimit: "",
    status: "DRAFT",
  });

  useEffect(() => {
    fetchMenuItems();
    fetchCategories();
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

  const fetchCategories = async () => {
    try {
      const res = await fetch("/api/menu/categories");
      if (res.ok) {
        const data = await res.json();
        setCategories(data.categories || []);
      }
    } catch (error) {
      console.error("Error fetching categories:", error);
    }
  };

  const toggleBuyItem = (itemId: string) => {
    setForm((prev) => ({
      ...prev,
      buyItemIds: prev.buyItemIds.includes(itemId)
        ? prev.buyItemIds.filter((i) => i !== itemId)
        : [...prev.buyItemIds, itemId],
    }));
  };

  const toggleGetItem = (itemId: string) => {
    setForm((prev) => ({
      ...prev,
      getItemIds: prev.getItemIds.includes(itemId)
        ? prev.getItemIds.filter((i) => i !== itemId)
        : [...prev.getItemIds, itemId],
    }));
  };

  const toggleCategory = (categoryId: string) => {
    setForm((prev) => ({
      ...prev,
      categoryIds: prev.categoryIds.includes(categoryId)
        ? prev.categoryIds.filter((c) => c !== categoryId)
        : [...prev.categoryIds, categoryId],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setLoading(true);
    try {
      const payload = {
        name: form.name,
        description: form.description,
        type: "BOGO",
        discountType: "PERCENTAGE",
        discountValue: form.getDiscount,
        bogoBuyQuantity: form.buyQuantity,
        bogoGetQuantity: form.getQuantity,
        bogoGetDiscount: form.getDiscount,
        bogoSameItem: form.sameItem,
        bogoGetItems: form.sameItem ? null : form.getItemIds,
        appliesTo: form.appliesTo,
        itemIds: form.appliesTo === "ITEMS" ? form.buyItemIds : null,
        categoryIds: form.appliesTo === "CATEGORY" ? form.categoryIds : null,
        startDate: form.startDate || null,
        endDate: form.endDate || null,
        totalUsesLimit: form.totalUsesLimit ? parseInt(form.totalUsesLimit) : null,
        perCustomerLimit: form.perCustomerLimit ? parseInt(form.perCustomerLimit) : null,
        status: form.status,
      };

      const res = await fetch("/api/promotions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create BOGO");
      }

      router.push(`/${restaurant}/promotions`);
    } catch (error: any) {
      console.error("Error creating BOGO:", error);
      alert(error.message || "Failed to create BOGO");
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
          <h1 className="text-3xl font-bold">Create BOGO Deal</h1>
          <p className="text-muted-foreground">
            Buy One Get One Free or discounted
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Promotion Name *</label>
              <Input
                value={form.name}
                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Buy 1 Get 1 Free"
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
                placeholder="Describe the offer..."
                className="w-full px-3 py-2 border rounded-lg resize-none"
                rows={2}
              />
            </div>
          </CardContent>
        </Card>

        {/* BOGO Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gift className="h-5 w-5" />
              BOGO Configuration
            </CardTitle>
            <CardDescription>
              Set up the buy and get quantities
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Visual BOGO Display */}
            <div className="flex items-center justify-center gap-4 p-6 bg-muted/50 rounded-lg">
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-2">Buy</p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setForm((prev) => ({
                        ...prev,
                        buyQuantity: Math.max(1, prev.buyQuantity - 1),
                      }))
                    }
                    className="w-8 h-8 border rounded hover:bg-muted"
                  >
                    -
                  </button>
                  <span className="text-3xl font-bold w-12 text-center">
                    {form.buyQuantity}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setForm((prev) => ({
                        ...prev,
                        buyQuantity: prev.buyQuantity + 1,
                      }))
                    }
                    className="w-8 h-8 border rounded hover:bg-muted"
                  >
                    +
                  </button>
                </div>
              </div>

              <ArrowRight className="h-8 w-8 text-muted-foreground" />

              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-2">Get</p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setForm((prev) => ({
                        ...prev,
                        getQuantity: Math.max(1, prev.getQuantity - 1),
                      }))
                    }
                    className="w-8 h-8 border rounded hover:bg-muted"
                  >
                    -
                  </button>
                  <span className="text-3xl font-bold w-12 text-center">
                    {form.getQuantity}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setForm((prev) => ({
                        ...prev,
                        getQuantity: prev.getQuantity + 1,
                      }))
                    }
                    className="w-8 h-8 border rounded hover:bg-muted"
                  >
                    +
                  </button>
                </div>
              </div>

              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-2">At</p>
                <div className="flex items-center gap-1">
                  <Input
                    type="number"
                    value={form.getDiscount}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        getDiscount: parseInt(e.target.value) || 0,
                      }))
                    }
                    className="w-20 text-center text-xl font-bold"
                    min={0}
                    max={100}
                  />
                  <span className="text-xl font-bold">% OFF</span>
                </div>
              </div>
            </div>

            {/* Quick Presets */}
            <div className="flex flex-wrap gap-2 justify-center">
              <Button
                type="button"
                variant={form.getDiscount === 100 ? "default" : "outline"}
                size="sm"
                onClick={() =>
                  setForm((prev) => ({
                    ...prev,
                    buyQuantity: 1,
                    getQuantity: 1,
                    getDiscount: 100,
                  }))
                }
              >
                Buy 1 Get 1 FREE
              </Button>
              <Button
                type="button"
                variant={
                  form.buyQuantity === 2 && form.getDiscount === 100
                    ? "default"
                    : "outline"
                }
                size="sm"
                onClick={() =>
                  setForm((prev) => ({
                    ...prev,
                    buyQuantity: 2,
                    getQuantity: 1,
                    getDiscount: 100,
                  }))
                }
              >
                Buy 2 Get 1 FREE
              </Button>
              <Button
                type="button"
                variant={
                  form.getDiscount === 50 && form.getQuantity === 1
                    ? "default"
                    : "outline"
                }
                size="sm"
                onClick={() =>
                  setForm((prev) => ({
                    ...prev,
                    buyQuantity: 1,
                    getQuantity: 1,
                    getDiscount: 50,
                  }))
                }
              >
                Buy 1 Get 1 50% Off
              </Button>
            </div>

            {/* Same Item Toggle */}
            <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
              <input
                type="checkbox"
                id="sameItem"
                checked={form.sameItem}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, sameItem: e.target.checked }))
                }
                className="rounded"
              />
              <label htmlFor="sameItem" className="cursor-pointer">
                <p className="font-medium">Same Item Only</p>
                <p className="text-sm text-muted-foreground">
                  Customer must buy and get the same item
                </p>
              </label>
            </div>
          </CardContent>
        </Card>

        {/* Applies To */}
        <Card>
          <CardHeader>
            <CardTitle>Applies To</CardTitle>
            <CardDescription>
              Which items qualify for this BOGO deal?
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-3">
              {[
                { value: "ALL", label: "All Items" },
                { value: "CATEGORY", label: "Specific Categories" },
                { value: "ITEMS", label: "Specific Items" },
              ].map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setForm((prev) => ({ ...prev, appliesTo: option.value }))}
                  className={`px-4 py-2 rounded-lg border-2 text-sm font-medium transition-colors ${
                    form.appliesTo === option.value
                      ? "border-primary bg-primary/5"
                      : "border-muted hover:border-primary/50"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>

            {form.appliesTo === "CATEGORY" && (
              <div className="flex flex-wrap gap-2">
                {categories.map((category) => (
                  <button
                    key={category.id}
                    type="button"
                    onClick={() => toggleCategory(category.id)}
                    className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                      form.categoryIds.includes(category.id)
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted hover:bg-muted/80"
                    }`}
                  >
                    {category.name}
                  </button>
                ))}
              </div>
            )}

            {form.appliesTo === "ITEMS" && (
              <div className="max-h-48 overflow-y-auto border rounded-lg p-2">
                {menuItems.map((item) => (
                  <label
                    key={item.id}
                    className="flex items-center gap-2 p-2 hover:bg-muted rounded cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={form.buyItemIds.includes(item.id)}
                      onChange={() => toggleBuyItem(item.id)}
                      className="rounded"
                    />
                    <span className="flex-1">{item.name}</span>
                    <span className="text-sm text-muted-foreground">
                      Rs.{item.basePrice}
                    </span>
                  </label>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Schedule & Limits */}
        <Card>
          <CardHeader>
            <CardTitle>Schedule & Limits</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
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
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">Total Uses Limit</label>
                <Input
                  type="number"
                  value={form.totalUsesLimit}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, totalUsesLimit: e.target.value }))
                  }
                  placeholder="Unlimited"
                  min={1}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Per Customer Limit</label>
                <Input
                  type="number"
                  value={form.perCustomerLimit}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, perCustomerLimit: e.target.value }))
                  }
                  placeholder="Unlimited"
                  min={1}
                />
              </div>
            </div>
          </CardContent>
        </Card>

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
                <Button type="submit" disabled={loading}>
                  {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Create BOGO Deal
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
