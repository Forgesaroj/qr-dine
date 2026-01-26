"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
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
  Plus,
  Search,
  Percent,
  Clock,
  Tag,
  Gift,
  Calendar,
  Loader2,
  MoreHorizontal,
  Edit,
  Trash2,
  Pause,
  Play,
  Users,
  TrendingUp,
  Zap,
} from "lucide-react";

interface Promotion {
  id: string;
  name: string;
  description: string | null;
  type: string;
  discountType: string;
  discountValue: number;
  maxDiscount: number | null;
  status: string;
  startDate: string | null;
  endDate: string | null;
  startTime: string | null;
  endTime: string | null;
  daysOfWeek: number[] | string | null;
  promoCode: string | null;
  timesUsed: number;
  totalDiscountGiven: number;
  totalUsesLimit: number | null;
  createdAt: string;
}

const promotionTypes = [
  { value: "all", label: "All Types" },
  { value: "HAPPY_HOUR", label: "Happy Hour", icon: Clock },
  { value: "ITEM_DISCOUNT", label: "Item Discount", icon: Percent },
  { value: "PROMO_CODE", label: "Promo Code", icon: Tag },
  { value: "COMBO", label: "Combo Deal", icon: Gift },
  { value: "BOGO", label: "Buy One Get One", icon: Gift },
  { value: "MIN_ORDER", label: "Min Order", icon: TrendingUp },
  { value: "FIRST_ORDER", label: "First Order", icon: Users },
  { value: "FESTIVAL", label: "Festival", icon: Calendar },
];

const statusColors: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-800",
  ACTIVE: "bg-green-100 text-green-800",
  PAUSED: "bg-yellow-100 text-yellow-800",
  SCHEDULED: "bg-blue-100 text-blue-800",
  EXPIRED: "bg-red-100 text-red-800",
};

export default function PromotionsPage() {
  const params = useParams();
  const restaurant = params.restaurant as string;

  const [loading, setLoading] = useState(true);
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [activeMenu, setActiveMenu] = useState<string | null>(null);

  useEffect(() => {
    fetchPromotions();
  }, []);

  const fetchPromotions = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/promotions");
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setPromotions(data.promotions);
    } catch (error) {
      console.error("Error fetching promotions:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === "ACTIVE" ? "PAUSED" : "ACTIVE";
    try {
      const res = await fetch(`/api/promotions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error("Failed to update");
      fetchPromotions();
    } catch (error) {
      console.error("Error updating promotion:", error);
    }
    setActiveMenu(null);
  };

  const deletePromotion = async (id: string) => {
    if (!confirm("Are you sure you want to delete this promotion?")) return;
    try {
      const res = await fetch(`/api/promotions/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      fetchPromotions();
    } catch (error) {
      console.error("Error deleting promotion:", error);
    }
    setActiveMenu(null);
  };

  const filteredPromotions = promotions.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.promoCode && p.promoCode.toLowerCase().includes(search.toLowerCase()));
    const matchesType = typeFilter === "all" || p.type === typeFilter;
    const matchesStatus = statusFilter === "all" || p.status === statusFilter;
    return matchesSearch && matchesType && matchesStatus;
  });

  const getTypeIcon = (type: string) => {
    const typeInfo = promotionTypes.find((t) => t.value === type);
    if (!typeInfo?.icon) return <Percent className="h-4 w-4" />;
    const Icon = typeInfo.icon;
    return <Icon className="h-4 w-4" />;
  };

  const getTypeLabel = (type: string) => {
    const typeInfo = promotionTypes.find((t) => t.value === type);
    return typeInfo?.label || type;
  };

  const formatDiscount = (p: Promotion) => {
    if (p.discountType === "PERCENTAGE") {
      return `${p.discountValue}% off`;
    } else if (p.discountType === "FIXED") {
      return `Rs.${p.discountValue} off`;
    } else if (p.discountType === "FREE_ITEM") {
      return "Free item";
    }
    return "";
  };

  const formatSchedule = (p: Promotion) => {
    const parts: string[] = [];
    if (p.startTime && p.endTime) {
      parts.push(`${p.startTime} - ${p.endTime}`);
    }
    // Handle daysOfWeek - might be JSON string or array
    let daysArray: number[] | null = null;
    if (p.daysOfWeek) {
      if (typeof p.daysOfWeek === "string") {
        try {
          daysArray = JSON.parse(p.daysOfWeek);
        } catch {
          daysArray = null;
        }
      } else if (Array.isArray(p.daysOfWeek)) {
        daysArray = p.daysOfWeek;
      }
    }
    if (daysArray && daysArray.length > 0 && daysArray.length < 7) {
      const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      parts.push(daysArray.map((d) => days[d]).join(", "));
    }
    return parts.join(" · ");
  };

  const stats = {
    total: promotions.length,
    active: promotions.filter((p) => p.status === "ACTIVE").length,
    totalUsage: promotions.reduce((sum, p) => sum + p.timesUsed, 0),
    totalDiscounts: promotions.reduce((sum, p) => sum + p.totalDiscountGiven, 0),
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Promotions</h1>
          <p className="text-muted-foreground">
            Manage discounts, happy hours, and promotional campaigns
          </p>
        </div>
        <div className="flex gap-2">
          <Link href={`/${restaurant}/promotions/codes`}>
            <Button variant="outline" size="sm">
              <Tag className="h-4 w-4 mr-1" />
              Codes
            </Button>
          </Link>
          <Link href={`/${restaurant}/promotions/combos`}>
            <Button variant="outline" size="sm">
              <Gift className="h-4 w-4 mr-1" />
              Combo
            </Button>
          </Link>
          <Link href={`/${restaurant}/promotions/bogo`}>
            <Button variant="outline" size="sm">
              <Gift className="h-4 w-4 mr-1" />
              BOGO
            </Button>
          </Link>
          <Link href={`/${restaurant}/promotions/new`}>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Promotions</CardTitle>
            <Tag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.active}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Usage</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalUsage}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Discounts Given</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Rs.{stats.totalDiscounts.toFixed(0)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search promotions..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="px-3 py-2 border rounded-lg bg-background"
        >
          {promotionTypes.map((type) => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 border rounded-lg bg-background"
        >
          <option value="all">All Status</option>
          <option value="ACTIVE">Active</option>
          <option value="PAUSED">Paused</option>
          <option value="DRAFT">Draft</option>
          <option value="SCHEDULED">Scheduled</option>
          <option value="EXPIRED">Expired</option>
        </select>
      </div>

      {/* Promotions List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : filteredPromotions.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Tag className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">No promotions found</h3>
            <p className="text-muted-foreground text-center mt-1">
              {promotions.length === 0
                ? "Create your first promotion to attract more customers"
                : "Try adjusting your search or filters"}
            </p>
            {promotions.length === 0 && (
              <Link href={`/${restaurant}/promotions/new`}>
                <Button className="mt-4">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Promotion
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredPromotions.map((promotion) => (
            <Card key={promotion.id} className="relative">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      {getTypeIcon(promotion.type)}
                    </div>
                    <div>
                      <CardTitle className="text-base">{promotion.name}</CardTitle>
                      <CardDescription className="text-xs">
                        {getTypeLabel(promotion.type)}
                      </CardDescription>
                    </div>
                  </div>
                  <div className="relative">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() =>
                        setActiveMenu(activeMenu === promotion.id ? null : promotion.id)
                      }
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                    {activeMenu === promotion.id && (
                      <div className="absolute right-0 top-8 z-10 bg-card border rounded-lg shadow-lg py-1 min-w-[140px]">
                        <Link
                          href={`/${restaurant}/promotions/${promotion.id}`}
                          className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted"
                        >
                          <Edit className="h-4 w-4" />
                          Edit
                        </Link>
                        <button
                          className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted w-full text-left"
                          onClick={() => toggleStatus(promotion.id, promotion.status)}
                        >
                          {promotion.status === "ACTIVE" ? (
                            <>
                              <Pause className="h-4 w-4" />
                              Pause
                            </>
                          ) : (
                            <>
                              <Play className="h-4 w-4" />
                              Activate
                            </>
                          )}
                        </button>
                        <button
                          className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted w-full text-left text-red-600"
                          onClick={() => deletePromotion(promotion.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Discount Badge */}
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                    {formatDiscount(promotion)}
                  </span>
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${
                      statusColors[promotion.status] || "bg-gray-100"
                    }`}
                  >
                    {promotion.status}
                  </span>
                </div>

                {/* Promo Code */}
                {promotion.promoCode && (
                  <div className="flex items-center gap-2 text-sm">
                    <Tag className="h-4 w-4 text-muted-foreground" />
                    <code className="px-2 py-0.5 bg-muted rounded font-mono">
                      {promotion.promoCode}
                    </code>
                  </div>
                )}

                {/* Schedule */}
                {formatSchedule(promotion) && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span>{formatSchedule(promotion)}</span>
                  </div>
                )}

                {/* Date Range */}
                {(promotion.startDate || promotion.endDate) && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>
                      {promotion.startDate
                        ? new Date(promotion.startDate).toLocaleDateString()
                        : "Now"}{" "}
                      -{" "}
                      {promotion.endDate
                        ? new Date(promotion.endDate).toLocaleDateString()
                        : "Ongoing"}
                    </span>
                  </div>
                )}

                {/* Usage Stats */}
                <div className="pt-2 border-t flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    Used {promotion.timesUsed} times
                    {promotion.totalUsesLimit && ` / ${promotion.totalUsesLimit}`}
                  </span>
                  <span className="font-medium">
                    Rs.{promotion.totalDiscountGiven.toFixed(0)} saved
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
