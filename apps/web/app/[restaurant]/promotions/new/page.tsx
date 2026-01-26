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
  Percent,
  Clock,
  Tag,
  Gift,
  Calendar,
  Users,
  TrendingUp,
  Zap,
  Info,
} from "lucide-react";

interface Category {
  id: string;
  name: string;
}

interface MenuItem {
  id: string;
  name: string;
  basePrice: number;
  categoryId: string;
}

const promotionTypes = [
  {
    value: "HAPPY_HOUR",
    label: "Happy Hour",
    icon: Clock,
    description: "Time-based discount during specific hours",
  },
  {
    value: "ITEM_DISCOUNT",
    label: "Item Discount",
    icon: Percent,
    description: "Discount on specific items or categories",
  },
  {
    value: "PROMO_CODE",
    label: "Promo Code",
    icon: Tag,
    description: "Customer enters code for discount",
  },
  {
    value: "MIN_ORDER",
    label: "Min Order Discount",
    icon: TrendingUp,
    description: "Discount when order exceeds minimum amount",
  },
  {
    value: "FIRST_ORDER",
    label: "First Order",
    icon: Users,
    description: "Discount for first-time customers",
  },
  {
    value: "FESTIVAL",
    label: "Festival/Occasion",
    icon: Calendar,
    description: "Limited-time promotional event",
  },
];

const discountTypes = [
  { value: "PERCENTAGE", label: "Percentage Off" },
  { value: "FIXED", label: "Fixed Amount Off" },
];

const daysOfWeek = [
  { value: 0, label: "Sun" },
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
];

export default function NewPromotionPage() {
  const params = useParams();
  const router = useRouter();
  const restaurant = params.restaurant as string;

  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);

  const [form, setForm] = useState({
    name: "",
    description: "",
    internalNote: "",
    type: "HAPPY_HOUR",
    discountType: "PERCENTAGE",
    discountValue: 10,
    maxDiscount: "",
    appliesTo: "ALL",
    categoryIds: [] as string[],
    itemIds: [] as string[],
    promoCode: "",
    minOrderAmount: "",
    startDate: "",
    endDate: "",
    daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
    startTime: "",
    endTime: "",
    totalUsesLimit: "",
    perCustomerLimit: "",
    customerEligibility: "ALL",
    eligibleTiers: [] as string[],
    showOnMenu: true,
    status: "DRAFT",
  });

  useEffect(() => {
    fetchCategories();
    fetchMenuItems();
  }, []);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = {
        ...form,
        discountValue: parseFloat(form.discountValue.toString()),
        maxDiscount: form.maxDiscount ? parseFloat(form.maxDiscount) : null,
        minOrderAmount: form.minOrderAmount ? parseFloat(form.minOrderAmount) : null,
        totalUsesLimit: form.totalUsesLimit ? parseInt(form.totalUsesLimit) : null,
        perCustomerLimit: form.perCustomerLimit ? parseInt(form.perCustomerLimit) : null,
        startDate: form.startDate || null,
        endDate: form.endDate || null,
        startTime: form.startTime || null,
        endTime: form.endTime || null,
        categoryIds: form.appliesTo === "CATEGORY" ? form.categoryIds : null,
        itemIds: form.appliesTo === "ITEMS" ? form.itemIds : null,
        eligibleTiers: form.customerEligibility === "TIER" ? form.eligibleTiers : null,
      };

      const res = await fetch("/api/promotions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create promotion");
      }

      router.push(`/${restaurant}/promotions`);
    } catch (error) {
      console.error("Error creating promotion:", error);
      alert("Failed to create promotion");
    } finally {
      setLoading(false);
    }
  };

  const updateForm = (field: string, value: any) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const toggleDay = (day: number) => {
    setForm((prev) => ({
      ...prev,
      daysOfWeek: prev.daysOfWeek.includes(day)
        ? prev.daysOfWeek.filter((d) => d !== day)
        : [...prev.daysOfWeek, day].sort(),
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

  const toggleItem = (itemId: string) => {
    setForm((prev) => ({
      ...prev,
      itemIds: prev.itemIds.includes(itemId)
        ? prev.itemIds.filter((i) => i !== itemId)
        : [...prev.itemIds, itemId],
    }));
  };

  const toggleTier = (tier: string) => {
    setForm((prev) => ({
      ...prev,
      eligibleTiers: prev.eligibleTiers.includes(tier)
        ? prev.eligibleTiers.filter((t) => t !== tier)
        : [...prev.eligibleTiers, tier],
    }));
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
          <h1 className="text-3xl font-bold">Create Promotion</h1>
          <p className="text-muted-foreground">
            Set up a new discount or promotional campaign
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Promotion Type */}
        <Card>
          <CardHeader>
            <CardTitle>Promotion Type</CardTitle>
            <CardDescription>Select the type of promotion</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {promotionTypes.map((type) => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => updateForm("type", type.value)}
                  className={`p-4 rounded-lg border-2 text-left transition-colors ${
                    form.type === type.value
                      ? "border-primary bg-primary/5"
                      : "border-muted hover:border-primary/50"
                  }`}
                >
                  <type.icon className="h-5 w-5 mb-2" />
                  <p className="font-medium">{type.label}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {type.description}
                  </p>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Basic Info */}
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">Promotion Name *</label>
                <Input
                  value={form.name}
                  onChange={(e) => updateForm("name", e.target.value)}
                  placeholder="e.g., Happy Hour 50% Off"
                  required
                />
              </div>
              {(form.type === "PROMO_CODE" || form.type === "FIRST_ORDER") && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Promo Code</label>
                  <Input
                    value={form.promoCode}
                    onChange={(e) =>
                      updateForm("promoCode", e.target.value.toUpperCase())
                    }
                    placeholder="e.g., HAPPYHOUR50"
                    className="uppercase"
                  />
                </div>
              )}
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Description (Customer-facing)</label>
              <textarea
                value={form.description}
                onChange={(e) => updateForm("description", e.target.value)}
                placeholder="Describe the promotion for customers..."
                className="w-full px-3 py-2 border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Internal Note (Staff only)</label>
              <Input
                value={form.internalNote}
                onChange={(e) => updateForm("internalNote", e.target.value)}
                placeholder="Notes for staff..."
              />
            </div>
          </CardContent>
        </Card>

        {/* Discount Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Discount Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">Discount Type *</label>
                <select
                  value={form.discountType}
                  onChange={(e) => updateForm("discountType", e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg bg-background"
                >
                  {discountTypes.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Discount Value *{" "}
                  {form.discountType === "PERCENTAGE" ? "(%)" : "(Rs.)"}
                </label>
                <Input
                  type="number"
                  value={form.discountValue}
                  onChange={(e) => updateForm("discountValue", e.target.value)}
                  min={0}
                  max={form.discountType === "PERCENTAGE" ? 100 : undefined}
                  required
                />
              </div>
            </div>
            {form.discountType === "PERCENTAGE" && (
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Maximum Discount (Rs.) - Optional
                </label>
                <Input
                  type="number"
                  value={form.maxDiscount}
                  onChange={(e) => updateForm("maxDiscount", e.target.value)}
                  placeholder="Leave empty for no limit"
                  min={0}
                />
                <p className="text-xs text-muted-foreground">
                  Cap the maximum discount amount
                </p>
              </div>
            )}
            {form.type === "MIN_ORDER" && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Minimum Order Amount (Rs.) *</label>
                <Input
                  type="number"
                  value={form.minOrderAmount}
                  onChange={(e) => updateForm("minOrderAmount", e.target.value)}
                  placeholder="e.g., 500"
                  required
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Applies To */}
        <Card>
          <CardHeader>
            <CardTitle>Applies To</CardTitle>
            <CardDescription>
              Select which items this promotion applies to
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
                  onClick={() => updateForm("appliesTo", option.value)}
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
              <div className="space-y-2">
                <label className="text-sm font-medium">Select Categories</label>
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
              </div>
            )}

            {form.appliesTo === "ITEMS" && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Select Items</label>
                <div className="max-h-48 overflow-y-auto border rounded-lg p-2">
                  {menuItems.map((item) => (
                    <label
                      key={item.id}
                      className="flex items-center gap-2 p-2 hover:bg-muted rounded cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={form.itemIds.includes(item.id)}
                        onChange={() => toggleItem(item.id)}
                        className="rounded"
                      />
                      <span className="flex-1">{item.name}</span>
                      <span className="text-sm text-muted-foreground">
                        Rs.{item.basePrice}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Schedule */}
        <Card>
          <CardHeader>
            <CardTitle>Schedule</CardTitle>
            <CardDescription>
              When should this promotion be active?
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">Start Date</label>
                <Input
                  type="date"
                  value={form.startDate}
                  onChange={(e) => updateForm("startDate", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">End Date</label>
                <Input
                  type="date"
                  value={form.endDate}
                  onChange={(e) => updateForm("endDate", e.target.value)}
                />
              </div>
            </div>

            {(form.type === "HAPPY_HOUR" || form.type === "ITEM_DISCOUNT") && (
              <>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Start Time</label>
                    <Input
                      type="time"
                      value={form.startTime}
                      onChange={(e) => updateForm("startTime", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">End Time</label>
                    <Input
                      type="time"
                      value={form.endTime}
                      onChange={(e) => updateForm("endTime", e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Active Days</label>
                  <div className="flex gap-2">
                    {daysOfWeek.map((day) => (
                      <button
                        key={day.value}
                        type="button"
                        onClick={() => toggleDay(day.value)}
                        className={`w-10 h-10 rounded-full text-sm font-medium transition-colors ${
                          form.daysOfWeek.includes(day.value)
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted hover:bg-muted/80"
                        }`}
                      >
                        {day.label}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Usage Limits */}
        <Card>
          <CardHeader>
            <CardTitle>Usage Limits</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Total Uses Limit - Optional
                </label>
                <Input
                  type="number"
                  value={form.totalUsesLimit}
                  onChange={(e) => updateForm("totalUsesLimit", e.target.value)}
                  placeholder="Unlimited"
                  min={1}
                />
                <p className="text-xs text-muted-foreground">
                  Maximum times this promotion can be used
                </p>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Per Customer Limit - Optional
                </label>
                <Input
                  type="number"
                  value={form.perCustomerLimit}
                  onChange={(e) => updateForm("perCustomerLimit", e.target.value)}
                  placeholder="Unlimited"
                  min={1}
                />
                <p className="text-xs text-muted-foreground">
                  Maximum uses per customer
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Customer Eligibility */}
        <Card>
          <CardHeader>
            <CardTitle>Customer Eligibility</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-3">
              {[
                { value: "ALL", label: "All Customers" },
                { value: "REGISTERED", label: "Registered Only" },
                { value: "TIER", label: "Specific Tiers" },
              ].map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => updateForm("customerEligibility", option.value)}
                  className={`px-4 py-2 rounded-lg border-2 text-sm font-medium transition-colors ${
                    form.customerEligibility === option.value
                      ? "border-primary bg-primary/5"
                      : "border-muted hover:border-primary/50"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>

            {form.customerEligibility === "TIER" && (
              <div className="flex gap-2">
                {["BRONZE", "SILVER", "GOLD", "PLATINUM"].map((tier) => (
                  <button
                    key={tier}
                    type="button"
                    onClick={() => toggleTier(tier)}
                    className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                      form.eligibleTiers.includes(tier)
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted hover:bg-muted/80"
                    }`}
                  >
                    {tier}
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Display Options */}
        <Card>
          <CardHeader>
            <CardTitle>Display Options</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={form.showOnMenu}
                onChange={(e) => updateForm("showOnMenu", e.target.checked)}
                className="rounded"
              />
              <div>
                <p className="font-medium">Show on Menu</p>
                <p className="text-sm text-muted-foreground">
                  Display promotion badge on applicable menu items
                </p>
              </div>
            </label>
          </CardContent>
        </Card>

        {/* Status & Submit */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <label className="text-sm font-medium">Status</label>
                <select
                  value={form.status}
                  onChange={(e) => updateForm("status", e.target.value)}
                  className="px-3 py-2 border rounded-lg bg-background"
                >
                  <option value="DRAFT">Draft (Save for later)</option>
                  <option value="ACTIVE">Active (Go live now)</option>
                  <option value="SCHEDULED">Scheduled (Based on dates)</option>
                </select>
              </div>
              <div className="flex gap-3">
                <Link href={`/${restaurant}/promotions`}>
                  <Button type="button" variant="outline">
                    Cancel
                  </Button>
                </Link>
                <Button type="submit" disabled={loading}>
                  {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Create Promotion
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
