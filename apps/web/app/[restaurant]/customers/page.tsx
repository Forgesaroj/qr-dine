"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Button,
  Input,
  Badge,
} from "@qr-dine/ui";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@qr-dine/ui";
import {
  Users,
  Heart,
  Gift,
  TrendingUp,
  Search,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  Crown,
  Star,
  Award,
  Medal,
  Loader2,
  Settings,
  RefreshCw,
  UserPlus,
  X,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NewCustomerForm {
  name: string;
  phone: string;
  email: string;
  dateOfBirth: string;
}

interface Customer {
  id: string;
  customerId: string;
  name: string;
  phone: string;
  email: string | null;
  tier: string;
  pointsBalance: number;
  pointsEarnedLifetime: number;
  pointsRedeemedLifetime: number;
  totalSpent: number;
  totalVisits: number;
  createdAt: string;
  _count: {
    orders: number;
  };
}

interface LoyaltySummary {
  totalCustomers: number;
  tierDistribution: Record<string, number>;
  totalPointsIssued: number;
  totalPointsRedeemed: number;
  recentTransactions: Array<{
    id: string;
    type: string;
    points: number;
    createdAt: string;
    customer: {
      name: string;
      customerId: string;
    };
  }>;
}

interface LoyaltySettings {
  enabled: boolean;
  pointsPerCurrency: number;
  currencyPerPoint: number;
  pointValue: number;
  minRedeemPoints: number;
  maxRedeemPercentage: number;
  tierThresholds: Record<string, number>;
  tierMultipliers: Record<string, number>;
}

const DEFAULT_TIER_CONFIG = { icon: Medal, color: "text-amber-700", bgColor: "bg-amber-100" };

const tierConfig = {
  BRONZE: { icon: Medal, color: "text-amber-700", bgColor: "bg-amber-100" },
  SILVER: { icon: Award, color: "text-gray-500", bgColor: "bg-gray-100" },
  GOLD: { icon: Star, color: "text-yellow-500", bgColor: "bg-yellow-100" },
  PLATINUM: { icon: Crown, color: "text-purple-600", bgColor: "bg-purple-100" },
} as const;

type TierConfigKey = keyof typeof tierConfig;

const getTierConfig = (tier: string) => {
  if (tier in tierConfig) {
    return tierConfig[tier as TierConfigKey];
  }
  return DEFAULT_TIER_CONFIG;
};

export default function CustomersPage() {
  const params = useParams();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState("overview");
  const [loading, setLoading] = useState(true);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [summary, setSummary] = useState<LoyaltySummary | null>(null);
  const [settings, setSettings] = useState<LoyaltySettings | null>(null);
  const [search, setSearch] = useState("");
  const [tierFilter, setTierFilter] = useState("");
  const [savingSettings, setSavingSettings] = useState(false);

  // Add Customer Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [newCustomer, setNewCustomer] = useState<NewCustomerForm>({
    name: "",
    phone: "",
    email: "",
    dateOfBirth: "",
  });
  const [addingCustomer, setAddingCustomer] = useState(false);
  const [addError, setAddError] = useState("");

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (activeTab === "customers") {
      fetchCustomers();
    }
  }, [activeTab, search, tierFilter]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [customersRes, settingsRes] = await Promise.all([
        fetch("/api/loyalty/customers?limit=10"),
        fetch("/api/loyalty/settings"),
      ]);

      if (customersRes.ok) {
        const data = await customersRes.json();
        setCustomers(data.customers || []);

        // Calculate summary from customers
        const tierDistribution: Record<string, number> = { BRONZE: 0, SILVER: 0, GOLD: 0, PLATINUM: 0 };
        let totalPointsIssued = 0;
        let totalPointsRedeemed = 0;

        data.customers.forEach((c: Customer) => {
          if (c.tier in tierDistribution) {
            tierDistribution[c.tier] = (tierDistribution[c.tier] || 0) + 1;
          }
          totalPointsIssued += c.pointsEarnedLifetime;
          totalPointsRedeemed += c.pointsRedeemedLifetime;
        });

        setSummary({
          totalCustomers: data.pagination?.total || data.customers.length,
          tierDistribution,
          totalPointsIssued,
          totalPointsRedeemed,
          recentTransactions: [],
        });
      }

      if (settingsRes.ok) {
        const data = await settingsRes.json();
        setSettings(data.settings);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomers = async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (tierFilter) params.set("tier", tierFilter);
      params.set("limit", "50");

      const res = await fetch(`/api/loyalty/customers?${params}`);
      if (res.ok) {
        const data = await res.json();
        setCustomers(data.customers || []);
      }
    } catch (error) {
      console.error("Error fetching customers:", error);
    }
  };

  const handleSettingsSave = async () => {
    if (!settings) return;

    setSavingSettings(true);
    try {
      const res = await fetch("/api/loyalty/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });

      if (!res.ok) {
        throw new Error("Failed to save settings");
      }
    } catch (error) {
      console.error("Error saving settings:", error);
      alert("Failed to save settings");
    } finally {
      setSavingSettings(false);
    }
  };

  const handleAddCustomer = async () => {
    setAddError("");

    if (!newCustomer.name.trim()) {
      setAddError("Name is required");
      return;
    }
    if (!newCustomer.phone.trim()) {
      setAddError("Phone is required");
      return;
    }

    setAddingCustomer(true);
    try {
      const res = await fetch("/api/loyalty/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newCustomer.name.trim(),
          phone: newCustomer.phone.trim(),
          email: newCustomer.email.trim() || undefined,
          dateOfBirth: newCustomer.dateOfBirth || undefined,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setShowAddModal(false);
        setNewCustomer({ name: "", phone: "", email: "", dateOfBirth: "" });
        // Navigate to the new customer's page
        router.push(`/${params.restaurant}/customers/${data.customer.id}`);
      } else {
        const error = await res.json();
        setAddError(error.error || "Failed to add customer");
      }
    } catch (error) {
      console.error("Error adding customer:", error);
      setAddError("Failed to add customer");
    } finally {
      setAddingCustomer(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Heart className="h-8 w-8 text-primary" />
            Customers & Loyalty
          </h1>
          <p className="text-muted-foreground">
            Manage customer relationships and loyalty program
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setShowAddModal(true)}>
            <UserPlus className="h-4 w-4 mr-2" />
            Add Customer
          </Button>
          <Button onClick={fetchData} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Loyalty Program Status */}
      {settings && !settings.enabled && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Gift className="h-5 w-5 text-amber-600" />
                <div>
                  <p className="font-medium text-amber-800">Loyalty Program is Disabled</p>
                  <p className="text-sm text-amber-600">
                    Enable it in settings to start rewarding your customers
                  </p>
                </div>
              </div>
              <Button
                size="sm"
                onClick={() => setActiveTab("settings")}
                className="bg-amber-600 hover:bg-amber-700"
              >
                Enable Now
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full max-w-lg grid-cols-3">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="customers" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Customers
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Settings
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="mt-6 space-y-6">
          {/* Stats Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{summary?.totalCustomers || 0}</div>
                <p className="text-xs text-muted-foreground">
                  Active loyalty members
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Points Issued</CardTitle>
                <ArrowUpRight className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {summary?.totalPointsIssued?.toLocaleString() || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  Total points awarded
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Points Redeemed</CardTitle>
                <ArrowDownRight className="h-4 w-4 text-red-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {summary?.totalPointsRedeemed?.toLocaleString() || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  Total points used
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Outstanding Points</CardTitle>
                <Gift className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {((summary?.totalPointsIssued || 0) - (summary?.totalPointsRedeemed || 0)).toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground">
                  Points liability
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Tier Distribution */}
          <Card>
            <CardHeader>
              <CardTitle>Tier Distribution</CardTitle>
              <CardDescription>Customer breakdown by loyalty tier</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-4">
                {Object.entries(summary?.tierDistribution || {}).map(([tier, count]) => {
                  const configValue = getTierConfig(tier);
                  const Icon = configValue.icon;
                  const percentage = summary?.totalCustomers
                    ? Math.round((count / summary.totalCustomers) * 100)
                    : 0;

                  return (
                    <div
                      key={tier}
                      className={cn("p-4 rounded-lg", configValue.bgColor)}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <Icon className={cn("h-5 w-5", configValue.color)} />
                        <span className={cn("font-semibold", configValue.color)}>{tier}</span>
                      </div>
                      <div className="text-2xl font-bold">{count}</div>
                      <div className="text-sm text-muted-foreground">
                        {percentage}% of customers
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Top Customers */}
          <Card>
            <CardHeader>
              <CardTitle>Top Customers</CardTitle>
              <CardDescription>Highest point holders</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {customers.slice(0, 5).map((customer, index) => {
                  const config = getTierConfig(customer.tier);
                  const Icon = config.icon;

                  return (
                    <div
                      key={customer.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold">
                          {index + 1}
                        </div>
                        <div>
                          <p className="font-medium">{customer.name}</p>
                          <p className="text-sm text-muted-foreground">{customer.phone}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <Badge className={cn(config.bgColor, config.color, "border-0")}>
                          <Icon className="h-3 w-3 mr-1" />
                          {customer.tier}
                        </Badge>
                        <div className="text-right">
                          <p className="font-semibold">{customer.pointsBalance.toLocaleString()} pts</p>
                          <p className="text-xs text-muted-foreground">
                            Rs. {customer.totalSpent.toLocaleString()} spent
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Customers Tab */}
        <TabsContent value="customers" className="mt-6 space-y-4">
          {/* Filters */}
          <div className="flex gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, phone, or email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <select
              value={tierFilter}
              onChange={(e) => setTierFilter(e.target.value)}
              className="px-3 py-2 border rounded-md bg-background"
            >
              <option value="">All Tiers</option>
              <option value="BRONZE">Bronze</option>
              <option value="SILVER">Silver</option>
              <option value="GOLD">Gold</option>
              <option value="PLATINUM">Platinum</option>
            </select>
          </div>

          {/* Customer List */}
          <Card>
            <CardContent className="p-0">
              <div className="divide-y">
                {customers.map((customer) => {
                  const config = getTierConfig(customer.tier);
                  const Icon = config.icon;

                  return (
                    <div
                      key={customer.id}
                      className="flex items-center justify-between p-4 hover:bg-muted/50 cursor-pointer"
                      onClick={() => router.push(`/${params.restaurant}/customers/${customer.id}`)}
                    >
                      <div className="flex items-center gap-4">
                        <div
                          className={cn(
                            "w-10 h-10 rounded-full flex items-center justify-center",
                            config.bgColor
                          )}
                        >
                          <Icon className={cn("h-5 w-5", config.color)} />
                        </div>
                        <div>
                          <p className="font-medium">{customer.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {customer.phone} • {customer.customerId}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="text-right">
                          <p className="font-semibold">{customer.pointsBalance.toLocaleString()}</p>
                          <p className="text-xs text-muted-foreground">Points</p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">Rs. {customer.totalSpent.toLocaleString()}</p>
                          <p className="text-xs text-muted-foreground">Total Spent</p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">{customer.totalVisits}</p>
                          <p className="text-xs text-muted-foreground">Visits</p>
                        </div>
                        <Badge className={cn(config.bgColor, config.color, "border-0")}>
                          {customer.tier}
                        </Badge>
                      </div>
                    </div>
                  );
                })}

                {customers.length === 0 && (
                  <div className="p-8 text-center text-muted-foreground">
                    <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No customers found</p>
                    <p className="text-sm">Customers will appear here when they register</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="mt-6 space-y-6">
          {settings && (
            <>
              {/* Enable/Disable */}
              <Card>
                <CardHeader>
                  <CardTitle>Loyalty Program</CardTitle>
                  <CardDescription>Enable or disable the loyalty program</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Enable Loyalty Program</p>
                      <p className="text-sm text-muted-foreground">
                        Customers will earn points on purchases and can redeem for discounts
                      </p>
                    </div>
                    <button
                      onClick={() => setSettings({ ...settings, enabled: !settings.enabled })}
                      className={cn(
                        "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                        settings.enabled ? "bg-primary" : "bg-muted"
                      )}
                    >
                      <span
                        className={cn(
                          "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                          settings.enabled ? "translate-x-6" : "translate-x-1"
                        )}
                      />
                    </button>
                  </div>
                </CardContent>
              </Card>

              {/* Points Configuration */}
              <Card>
                <CardHeader>
                  <CardTitle>Points Configuration</CardTitle>
                  <CardDescription>Configure how points are earned and redeemed</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Points per Rs. spent</label>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          value={settings.pointsPerCurrency}
                          onChange={(e) =>
                            setSettings({
                              ...settings,
                              pointsPerCurrency: parseInt(e.target.value) || 1,
                            })
                          }
                          className="w-24"
                        />
                        <span className="text-muted-foreground">
                          points per Rs. {settings.currencyPerPoint}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Point Value (Rs.)</label>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">1 point =</span>
                        <Input
                          type="number"
                          value={settings.pointValue}
                          onChange={(e) =>
                            setSettings({
                              ...settings,
                              pointValue: parseFloat(e.target.value) || 1,
                            })
                          }
                          className="w-24"
                        />
                        <span className="text-muted-foreground">Rs.</span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Minimum Redeem Points</label>
                      <Input
                        type="number"
                        value={settings.minRedeemPoints}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            minRedeemPoints: parseInt(e.target.value) || 100,
                          })
                        }
                        className="w-full"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Max Redeem % per Bill</label>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          value={settings.maxRedeemPercentage}
                          onChange={(e) =>
                            setSettings({
                              ...settings,
                              maxRedeemPercentage: parseInt(e.target.value) || 50,
                            })
                          }
                          className="w-24"
                        />
                        <span className="text-muted-foreground">%</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Tier Thresholds */}
              <Card>
                <CardHeader>
                  <CardTitle>Tier Thresholds</CardTitle>
                  <CardDescription>Points required to reach each tier</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-4">
                    {(["BRONZE", "SILVER", "GOLD", "PLATINUM"] as const).map((tier) => {
                      const config = getTierConfig(tier);
                      const Icon = config.icon;

                      return (
                        <div key={tier} className={cn("p-4 rounded-lg", config.bgColor)}>
                          <div className="flex items-center gap-2 mb-3">
                            <Icon className={cn("h-5 w-5", config.color)} />
                            <span className={cn("font-semibold", config.color)}>{tier}</span>
                          </div>
                          <div className="space-y-2">
                            <div>
                              <label className="text-xs text-muted-foreground">Min Points</label>
                              <Input
                                type="number"
                                value={settings.tierThresholds[tier]}
                                onChange={(e) =>
                                  setSettings({
                                    ...settings,
                                    tierThresholds: {
                                      ...settings.tierThresholds,
                                      [tier]: parseInt(e.target.value) || 0,
                                    },
                                  })
                                }
                                className="mt-1"
                              />
                            </div>
                            <div>
                              <label className="text-xs text-muted-foreground">Multiplier</label>
                              <Input
                                type="number"
                                step="0.25"
                                value={settings.tierMultipliers[tier]}
                                onChange={(e) =>
                                  setSettings({
                                    ...settings,
                                    tierMultipliers: {
                                      ...settings.tierMultipliers,
                                      [tier]: parseFloat(e.target.value) || 1,
                                    },
                                  })
                                }
                                className="mt-1"
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Save Button */}
              <div className="flex justify-end">
                <Button onClick={handleSettingsSave} disabled={savingSettings}>
                  {savingSettings ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : null}
                  Save Settings
                </Button>
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>

      {/* Add Customer Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <UserPlus className="h-5 w-5" />
                  Add New Customer
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowAddModal(false);
                    setAddError("");
                    setNewCustomer({ name: "", phone: "", email: "", dateOfBirth: "" });
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <CardDescription>
                Add a new customer to your loyalty program
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {addError && (
                <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm">
                  {addError}
                </div>
              )}

              <div className="space-y-2">
                <label className="text-sm font-medium">Name *</label>
                <Input
                  placeholder="Customer name"
                  value={newCustomer.name}
                  onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Phone *</label>
                <Input
                  placeholder="Phone number"
                  value={newCustomer.phone}
                  onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Email</label>
                <Input
                  type="email"
                  placeholder="Email address (optional)"
                  value={newCustomer.email}
                  onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Date of Birth</label>
                <Input
                  type="date"
                  value={newCustomer.dateOfBirth}
                  onChange={(e) => setNewCustomer({ ...newCustomer, dateOfBirth: e.target.value })}
                />
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowAddModal(false);
                    setAddError("");
                    setNewCustomer({ name: "", phone: "", email: "", dateOfBirth: "" });
                  }}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleAddCustomer}
                  disabled={addingCustomer}
                  className="flex-1"
                >
                  {addingCustomer ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4 mr-2" />
                  )}
                  Add Customer
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
