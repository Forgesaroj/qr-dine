"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@qr-dine/ui";
import { Button } from "@qr-dine/ui";
import { Input } from "@qr-dine/ui";
import { Label } from "@qr-dine/ui";
import { Switch } from "@qr-dine/ui";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@qr-dine/ui";
import { Badge } from "@qr-dine/ui";
import {
  Building2,
  MapPin,
  Phone,
  Mail,
  Globe,
  DollarSign,
  Clock,
  Bell,
  Loader2,
  Save,
  Shield,
  Users,
  RotateCcw,
  Check,
  X,
  Crown,
  UserCircle,
  ChefHat,
  Headphones,
  CreditCard,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface RestaurantSettings {
  taxEnabled?: boolean;
  taxPercentage?: number;
  taxLabel?: string;
  taxIncludedInPrice?: boolean;
  serviceChargeEnabled?: boolean;
  serviceChargePercentage?: number;
  autoConfirmOrders?: boolean;
  autoConfirmSubsequentOrders?: boolean;
  requireOtpVerification?: boolean;
  notifyOnNewOrder?: boolean;
  notifyOnOrderReady?: boolean;
  notifyOnPayment?: boolean;
  showEstimatedTime?: boolean;
  allowSpecialInstructions?: boolean;
}

interface Restaurant {
  id: string;
  name: string;
  slug: string;
  description: string;
  address: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
  phone: string;
  email: string;
  currency: string;
  timezone: string;
  settings: RestaurantSettings;
}

interface RolePermission {
  pages: string[];
  features: Record<string, boolean>;
}

interface PageOption {
  id: string;
  label: string;
  description: string;
}

interface FeatureOption {
  id: string;
  label: string;
  description: string;
}

interface RoleOption {
  id: string;
  label: string;
  description: string;
}

const roleIcons: Record<string, React.ElementType> = {
  MANAGER: Crown,
  CASHIER: CreditCard,
  WAITER: UserCircle,
  KITCHEN: ChefHat,
  HOST: Headphones,
};

const roleColors: Record<string, string> = {
  MANAGER: "bg-blue-100 text-blue-700 border-blue-200",
  CASHIER: "bg-emerald-100 text-emerald-700 border-emerald-200",
  WAITER: "bg-green-100 text-green-700 border-green-200",
  KITCHEN: "bg-orange-100 text-orange-700 border-orange-200",
  HOST: "bg-pink-100 text-pink-700 border-pink-200",
};

export default function SettingsPage() {
  const params = useParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [activeTab, setActiveTab] = useState("general");
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    address: "",
    city: "",
    state: "",
    country: "",
    postalCode: "",
    phone: "",
    email: "",
    currency: "NPR",
    timezone: "Asia/Kathmandu",
  });
  const [settings, setSettings] = useState<RestaurantSettings>({
    taxEnabled: true,
    taxPercentage: 13,
    taxLabel: "VAT",
    taxIncludedInPrice: false,
    serviceChargeEnabled: true,
    serviceChargePercentage: 10,
    autoConfirmOrders: false,
    autoConfirmSubsequentOrders: true,
    requireOtpVerification: true,
    notifyOnNewOrder: true,
    notifyOnOrderReady: true,
    notifyOnPayment: true,
    showEstimatedTime: true,
    allowSpecialInstructions: true,
  });

  // Role permissions state
  const [permissionsLoading, setPermissionsLoading] = useState(false);
  const [permissionsSaving, setPermissionsSaving] = useState<string | null>(null);
  const [rolePermissions, setRolePermissions] = useState<Record<string, RolePermission>>({});
  const [availablePages, setAvailablePages] = useState<PageOption[]>([]);
  const [availableFeatures, setAvailableFeatures] = useState<FeatureOption[]>([]);
  const [availableRoles, setAvailableRoles] = useState<RoleOption[]>([]);
  const [selectedRole, setSelectedRole] = useState<string | null>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  useEffect(() => {
    if (activeTab === "permissions") {
      fetchPermissions();
    }
  }, [activeTab]);

  const fetchSettings = async () => {
    try {
      const res = await fetch("/api/settings");
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setRestaurant(data.restaurant);
      setFormData({
        name: data.restaurant.name || "",
        description: data.restaurant.description || "",
        address: data.restaurant.address || "",
        city: data.restaurant.city || "",
        state: data.restaurant.state || "",
        country: data.restaurant.country || "",
        postalCode: data.restaurant.postalCode || "",
        phone: data.restaurant.phone || "",
        email: data.restaurant.email || "",
        currency: data.restaurant.currency || "NPR",
        timezone: data.restaurant.timezone || "Asia/Kathmandu",
      });
      if (data.restaurant.settings) {
        setSettings({ ...settings, ...data.restaurant.settings });
      }
    } catch (error) {
      console.error("Error fetching settings:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPermissions = async () => {
    setPermissionsLoading(true);
    try {
      const res = await fetch("/api/settings/permissions");
      if (!res.ok) throw new Error("Failed to fetch permissions");
      const data = await res.json();
      setRolePermissions(data.permissions || {});
      setAvailablePages(data.availablePages || []);
      setAvailableFeatures(data.availableFeatures || []);
      setAvailableRoles(data.roles || []);
      if (data.roles?.length > 0 && !selectedRole) {
        setSelectedRole(data.roles[0].id);
      }
    } catch (error) {
      console.error("Error fetching permissions:", error);
    } finally {
      setPermissionsLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          settings,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save");
      }

      router.refresh();
    } catch (error) {
      console.error("Error saving settings:", error);
      alert("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const handlePageToggle = (roleId: string, pageId: string) => {
    setRolePermissions((prev) => {
      const current = prev[roleId] || { pages: [], features: {} };
      const pages = current.pages.includes(pageId)
        ? current.pages.filter((p) => p !== pageId)
        : [...current.pages, pageId];
      return {
        ...prev,
        [roleId]: { ...current, pages },
      };
    });
  };

  const handleFeatureToggle = (roleId: string, featureId: string) => {
    setRolePermissions((prev) => {
      const current = prev[roleId] || { pages: [], features: {} };
      return {
        ...prev,
        [roleId]: {
          ...current,
          features: {
            ...current.features,
            [featureId]: !current.features[featureId],
          },
        },
      };
    });
  };

  const saveRolePermissions = async (roleId: string) => {
    setPermissionsSaving(roleId);
    try {
      const permissions = rolePermissions[roleId];
      const res = await fetch("/api/settings/permissions", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: roleId,
          pages: permissions?.pages || [],
          features: permissions?.features || {},
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save");
      }

      // Show success feedback (could add toast here)
    } catch (error) {
      console.error("Error saving role permissions:", error);
      alert("Failed to save permissions");
    } finally {
      setPermissionsSaving(null);
    }
  };

  const resetRolePermissions = async (roleId: string) => {
    if (!confirm(`Reset ${roleId} permissions to default?`)) return;

    setPermissionsSaving(roleId);
    try {
      const res = await fetch("/api/settings/permissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: roleId }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to reset");
      }

      // Refresh permissions
      await fetchPermissions();
    } catch (error) {
      console.error("Error resetting role permissions:", error);
      alert("Failed to reset permissions");
    } finally {
      setPermissionsSaving(null);
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="text-muted-foreground">
            Manage your restaurant configuration
          </p>
        </div>
        {activeTab === "general" && (
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Save Changes
          </Button>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="general" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            General
          </TabsTrigger>
          <TabsTrigger value="permissions" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Role Permissions
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="mt-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Restaurant Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Restaurant Information
                </CardTitle>
                <CardDescription>Basic details about your restaurant</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Restaurant Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Input
                    id="description"
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) =>
                        setFormData({ ...formData, phone: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) =>
                        setFormData({ ...formData, email: e.target.value })
                      }
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Location */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Location
                </CardTitle>
                <CardDescription>Restaurant address details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="address">Street Address</Label>
                  <Input
                    id="address"
                    value={formData.address}
                    onChange={(e) =>
                      setFormData({ ...formData, address: e.target.value })
                    }
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="city">City</Label>
                    <Input
                      id="city"
                      value={formData.city}
                      onChange={(e) =>
                        setFormData({ ...formData, city: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="state">State/Province</Label>
                    <Input
                      id="state"
                      value={formData.state}
                      onChange={(e) =>
                        setFormData({ ...formData, state: e.target.value })
                      }
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="country">Country</Label>
                    <Input
                      id="country"
                      value={formData.country}
                      onChange={(e) =>
                        setFormData({ ...formData, country: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="postalCode">Postal Code</Label>
                    <Input
                      id="postalCode"
                      value={formData.postalCode}
                      onChange={(e) =>
                        setFormData({ ...formData, postalCode: e.target.value })
                      }
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Tax & Charges */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Tax & Charges
                </CardTitle>
                <CardDescription>Configure taxes and service charges</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Enable Tax</Label>
                    <p className="text-sm text-muted-foreground">
                      Apply tax to orders
                    </p>
                  </div>
                  <Switch
                    checked={settings.taxEnabled}
                    onChange={(checked) =>
                      setSettings({ ...settings, taxEnabled: checked })
                    }
                  />
                </div>
                {settings.taxEnabled && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="taxLabel">Tax Label</Label>
                      <Input
                        id="taxLabel"
                        value={settings.taxLabel}
                        onChange={(e) =>
                          setSettings({ ...settings, taxLabel: e.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="taxPercentage">Tax Percentage (%)</Label>
                      <Input
                        id="taxPercentage"
                        type="number"
                        value={settings.taxPercentage}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            taxPercentage: parseFloat(e.target.value) || 0,
                          })
                        }
                      />
                    </div>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Enable Service Charge</Label>
                    <p className="text-sm text-muted-foreground">
                      Add service charge to orders
                    </p>
                  </div>
                  <Switch
                    checked={settings.serviceChargeEnabled}
                    onChange={(checked) =>
                      setSettings({ ...settings, serviceChargeEnabled: checked })
                    }
                  />
                </div>
                {settings.serviceChargeEnabled && (
                  <div className="space-y-2">
                    <Label htmlFor="serviceChargePercentage">
                      Service Charge (%)
                    </Label>
                    <Input
                      id="serviceChargePercentage"
                      type="number"
                      value={settings.serviceChargePercentage}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          serviceChargePercentage: parseFloat(e.target.value) || 0,
                        })
                      }
                    />
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Order Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Order Settings
                </CardTitle>
                <CardDescription>Configure order behavior</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Auto-confirm Orders</Label>
                    <p className="text-sm text-muted-foreground">
                      Automatically confirm new orders
                    </p>
                  </div>
                  <Switch
                    checked={settings.autoConfirmOrders}
                    onChange={(checked) =>
                      setSettings({ ...settings, autoConfirmOrders: checked })
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Auto-confirm Follow-up Orders</Label>
                    <p className="text-sm text-muted-foreground">
                      Auto-confirm subsequent orders from same table
                    </p>
                  </div>
                  <Switch
                    checked={settings.autoConfirmSubsequentOrders}
                    onChange={(checked) =>
                      setSettings({
                        ...settings,
                        autoConfirmSubsequentOrders: checked,
                      })
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Require OTP Verification</Label>
                    <p className="text-sm text-muted-foreground">
                      Verify customers with table OTP
                    </p>
                  </div>
                  <Switch
                    checked={settings.requireOtpVerification}
                    onChange={(checked) =>
                      setSettings({ ...settings, requireOtpVerification: checked })
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Show Estimated Time</Label>
                    <p className="text-sm text-muted-foreground">
                      Display prep time to customers
                    </p>
                  </div>
                  <Switch
                    checked={settings.showEstimatedTime}
                    onChange={(checked) =>
                      setSettings({ ...settings, showEstimatedTime: checked })
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Allow Special Instructions</Label>
                    <p className="text-sm text-muted-foreground">
                      Let customers add notes to items
                    </p>
                  </div>
                  <Switch
                    checked={settings.allowSpecialInstructions}
                    onChange={(checked) =>
                      setSettings({ ...settings, allowSpecialInstructions: checked })
                    }
                  />
                </div>
              </CardContent>
            </Card>

            {/* Notifications */}
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  Notifications
                </CardTitle>
                <CardDescription>Configure notification preferences</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="space-y-0.5">
                      <Label>New Order Notification</Label>
                      <p className="text-sm text-muted-foreground">
                        Alert when new orders arrive
                      </p>
                    </div>
                    <Switch
                      checked={settings.notifyOnNewOrder}
                      onChange={(checked) =>
                        setSettings({ ...settings, notifyOnNewOrder: checked })
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="space-y-0.5">
                      <Label>Order Ready Notification</Label>
                      <p className="text-sm text-muted-foreground">
                        Alert when orders are ready
                      </p>
                    </div>
                    <Switch
                      checked={settings.notifyOnOrderReady}
                      onChange={(checked) =>
                        setSettings({ ...settings, notifyOnOrderReady: checked })
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="space-y-0.5">
                      <Label>Payment Notification</Label>
                      <p className="text-sm text-muted-foreground">
                        Alert for payment events
                      </p>
                    </div>
                    <Switch
                      checked={settings.notifyOnPayment}
                      onChange={(checked) =>
                        setSettings({ ...settings, notifyOnPayment: checked })
                      }
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="permissions" className="mt-6">
          {permissionsLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : (
            <div className="grid gap-6 lg:grid-cols-4">
              {/* Role Selection Sidebar */}
              <Card className="lg:col-span-1">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Staff Roles
                  </CardTitle>
                  <CardDescription>Select a role to edit permissions</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="space-y-1 p-4">
                    {availableRoles.map((role) => {
                      const Icon = roleIcons[role.id] || UserCircle;
                      const isSelected = selectedRole === role.id;
                      return (
                        <button
                          key={role.id}
                          onClick={() => setSelectedRole(role.id)}
                          className={cn(
                            "w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors",
                            isSelected
                              ? "bg-primary text-primary-foreground"
                              : "hover:bg-muted"
                          )}
                        >
                          <Icon className="h-5 w-5" />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm">{role.label}</p>
                            <p
                              className={cn(
                                "text-xs truncate",
                                isSelected ? "text-primary-foreground/70" : "text-muted-foreground"
                              )}
                            >
                              {role.description}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Permission Editor */}
              {selectedRole && (
                <div className="lg:col-span-3 space-y-6">
                  {/* Role Header */}
                  <Card>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {(() => {
                            const Icon = roleIcons[selectedRole] || UserCircle;
                            return (
                              <div className={cn("p-2 rounded-lg", roleColors[selectedRole])}>
                                <Icon className="h-6 w-6" />
                              </div>
                            );
                          })()}
                          <div>
                            <CardTitle>
                              {availableRoles.find((r) => r.id === selectedRole)?.label} Permissions
                            </CardTitle>
                            <CardDescription>
                              Configure what this role can access and do
                            </CardDescription>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => resetRolePermissions(selectedRole)}
                            disabled={permissionsSaving === selectedRole}
                          >
                            <RotateCcw className="h-4 w-4 mr-1" />
                            Reset
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => saveRolePermissions(selectedRole)}
                            disabled={permissionsSaving === selectedRole}
                          >
                            {permissionsSaving === selectedRole ? (
                              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                            ) : (
                              <Save className="h-4 w-4 mr-1" />
                            )}
                            Save
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                  </Card>

                  {/* Page Access */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Page Access</CardTitle>
                      <CardDescription>
                        Control which pages this role can view
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {availablePages.map((page) => {
                          const hasAccess = rolePermissions[selectedRole]?.pages?.includes(page.id);
                          return (
                            <div
                              key={page.id}
                              onClick={() => handlePageToggle(selectedRole, page.id)}
                              className={cn(
                                "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all",
                                hasAccess
                                  ? "border-primary bg-primary/5"
                                  : "border-border hover:border-muted-foreground/30"
                              )}
                            >
                              <div
                                className={cn(
                                  "h-5 w-5 rounded flex items-center justify-center",
                                  hasAccess
                                    ? "bg-primary text-primary-foreground"
                                    : "bg-muted"
                                )}
                              >
                                {hasAccess ? (
                                  <Check className="h-3 w-3" />
                                ) : (
                                  <X className="h-3 w-3 text-muted-foreground" />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm">{page.label}</p>
                                <p className="text-xs text-muted-foreground truncate">
                                  {page.description}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Feature Permissions */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Feature Permissions</CardTitle>
                      <CardDescription>
                        Control specific actions this role can perform
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid gap-3 sm:grid-cols-2">
                        {availableFeatures.map((feature) => {
                          const hasPermission =
                            rolePermissions[selectedRole]?.features?.[feature.id] || false;
                          return (
                            <div
                              key={feature.id}
                              className="flex items-center justify-between p-3 rounded-lg border"
                            >
                              <div className="flex-1 min-w-0 mr-3">
                                <p className="font-medium text-sm">{feature.label}</p>
                                <p className="text-xs text-muted-foreground">
                                  {feature.description}
                                </p>
                              </div>
                              <Switch
                                checked={hasPermission}
                                onChange={() =>
                                  handleFeatureToggle(selectedRole, feature.id)
                                }
                              />
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Quick Summary */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg">Permission Summary</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2">
                        {rolePermissions[selectedRole]?.pages?.map((page) => (
                          <Badge key={page} variant="secondary">
                            {availablePages.find((p) => p.id === page)?.label || page}
                          </Badge>
                        ))}
                        {Object.entries(rolePermissions[selectedRole]?.features || {})
                          .filter(([, enabled]) => enabled)
                          .map(([feature]) => (
                            <Badge key={feature} variant="outline" className="bg-green-50">
                              {availableFeatures.find((f) => f.id === feature)?.label || feature}
                            </Badge>
                          ))}
                        {(!rolePermissions[selectedRole]?.pages?.length &&
                          !Object.values(rolePermissions[selectedRole]?.features || {}).some(
                            Boolean
                          )) && (
                          <p className="text-sm text-muted-foreground">
                            No permissions assigned
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
