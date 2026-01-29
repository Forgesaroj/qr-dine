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
  Timer,
  Sparkles,
  AlertTriangle,
  QrCode,
  Receipt,
  FileText,
  Cloud,
  Key,
  Link2,
  TestTube,
  CheckCircle2,
  XCircle,
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

interface AlertSoundPreferences {
  soundEnabled: boolean;
  NEW_ORDER: boolean;
  ASSISTANCE_REQUEST: boolean;
  BILL_REQUEST: boolean;
  SESSION_ALERT: boolean;
  ORDER_READY: boolean;
}

interface TableManagementSettings {
  // Assistance timers
  assistanceEnabled: boolean;
  otpHelpTimerMinutes: number;
  orderHelpTimerMinutes: number;
  // Duration color thresholds
  durationGreenMax: number;
  durationYellowMax: number;
  durationOrangeMax: number;
  // Long stay alerts
  longStayAlertEnabled: boolean;
  longStayAlertMinutes: number;
  longStayRepeatMinutes: number;
  longStayNotifyWaiter: boolean;
  longStayNotifyManager: boolean;
  // Cleaning alerts
  cleaningAlertEnabled: boolean;
  cleaningAlertMinutes: number;
  cleaningChecklistEnabled: boolean;
  // QR Order flow
  qrOrderRequiresConfirmation: boolean;
}

interface IRDSettings {
  irdEnabled: boolean;
  irdVatNumber: string | null;
  irdBusinessName: string | null;
  irdBusinessNameNp: string | null;
  irdBusinessAddress: string | null;
  irdBusinessAddressNp: string | null;
  irdVatRate: number;
  irdServiceChargeRate: number;
  irdIncludeServiceCharge: boolean;
  irdInvoicePrefix: string | null;
}

interface CBMSSettings {
  enabled: boolean;
  apiUrl: string;
  username: string;
  password: string;
  hasPassword: boolean;
  sellerPan: string;
  syncMode: "REALTIME" | "BATCH" | "MANUAL";
  batchInterval: number;
  maxRetry: number;
  retryDelay: number;
  lastSyncAt: string | null;
  lastSyncStatus: string | null;
  credentialsValid: boolean;
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

  const [tableSettings, setTableSettings] = useState<TableManagementSettings>({
    assistanceEnabled: true,
    otpHelpTimerMinutes: 2,
    orderHelpTimerMinutes: 5,
    durationGreenMax: 30,
    durationYellowMax: 60,
    durationOrangeMax: 90,
    longStayAlertEnabled: true,
    longStayAlertMinutes: 90,
    longStayRepeatMinutes: 30,
    longStayNotifyWaiter: true,
    longStayNotifyManager: true,
    cleaningAlertEnabled: true,
    cleaningAlertMinutes: 10,
    cleaningChecklistEnabled: false,
    qrOrderRequiresConfirmation: true,
  });
  const [tableSettingsSaving, setTableSettingsSaving] = useState(false);

  // IRD E-Billing Settings
  const [irdSettings, setIrdSettings] = useState<IRDSettings>({
    irdEnabled: false,
    irdVatNumber: null,
    irdBusinessName: null,
    irdBusinessNameNp: null,
    irdBusinessAddress: null,
    irdBusinessAddressNp: null,
    irdVatRate: 13,
    irdServiceChargeRate: 10,
    irdIncludeServiceCharge: true,
    irdInvoicePrefix: null,
  });
  const [irdSettingsSaving, setIrdSettingsSaving] = useState(false);
  const [irdSettingsLoading, setIrdSettingsLoading] = useState(false);

  // CBMS Settings
  const [cbmsSettings, setCbmsSettings] = useState<CBMSSettings>({
    enabled: false,
    apiUrl: "https://cbapi.ird.gov.np",
    username: "",
    password: "",
    hasPassword: false,
    sellerPan: "",
    syncMode: "REALTIME",
    batchInterval: 5,
    maxRetry: 3,
    retryDelay: 15,
    lastSyncAt: null,
    lastSyncStatus: null,
    credentialsValid: false,
  });
  const [cbmsSettingsSaving, setCbmsSettingsSaving] = useState(false);
  const [cbmsSettingsLoading, setCbmsSettingsLoading] = useState(false);
  const [cbmsConfigured, setCbmsConfigured] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionTestResult, setConnectionTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // Alert sound preferences (stored in localStorage)
  const [alertSoundPrefs, setAlertSoundPrefs] = useState<AlertSoundPreferences>({
    soundEnabled: true,
    NEW_ORDER: true,
    ASSISTANCE_REQUEST: true,
    BILL_REQUEST: true,
    SESSION_ALERT: true,
    ORDER_READY: false,
  });

  // Load alert sound preferences from localStorage
  useEffect(() => {
    const savedSoundEnabled = localStorage.getItem("managerAlertsSoundEnabled");
    const savedSoundPrefs = localStorage.getItem("managerAlertsSoundPrefs");
    if (savedSoundEnabled !== null) {
      setAlertSoundPrefs(prev => ({ ...prev, soundEnabled: savedSoundEnabled === "true" }));
    }
    if (savedSoundPrefs) {
      try {
        const prefs = JSON.parse(savedSoundPrefs);
        setAlertSoundPrefs(prev => ({ ...prev, ...prefs }));
      } catch {}
    }
  }, []);

  // Save alert sound preferences to localStorage
  const updateAlertSoundPref = (key: keyof AlertSoundPreferences, value: boolean) => {
    setAlertSoundPrefs(prev => {
      const updated = { ...prev, [key]: value };
      if (key === "soundEnabled") {
        localStorage.setItem("managerAlertsSoundEnabled", String(value));
      } else {
        const { soundEnabled, ...prefs } = updated;
        localStorage.setItem("managerAlertsSoundPrefs", JSON.stringify(prefs));
      }
      return updated;
    });
  };

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

  const handleSaveTableSettings = async () => {
    setTableSettingsSaving(true);
    try {
      const res = await fetch("/api/settings/table-management", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(tableSettings),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save");
      }

      router.refresh();
    } catch (error) {
      console.error("Error saving table settings:", error);
      alert("Failed to save table settings");
    } finally {
      setTableSettingsSaving(false);
    }
  };

  // Fetch table management settings
  useEffect(() => {
    if (activeTab === "table-management") {
      fetchTableSettings();
    }
  }, [activeTab]);

  const fetchTableSettings = async () => {
    try {
      const res = await fetch("/api/settings/table-management");
      if (res.ok) {
        const data = await res.json();
        if (data.settings) {
          setTableSettings({ ...tableSettings, ...data.settings });
        }
      }
    } catch (error) {
      console.error("Error fetching table settings:", error);
    }
  };

  // Fetch IRD settings
  useEffect(() => {
    if (activeTab === "ird") {
      fetchIRDSettings();
    }
  }, [activeTab]);

  const fetchIRDSettings = async () => {
    setIrdSettingsLoading(true);
    try {
      const res = await fetch("/api/settings/ird");
      if (res.ok) {
        const data = await res.json();
        if (data.settings) {
          setIrdSettings({ ...irdSettings, ...data.settings });
        }
      }
    } catch (error) {
      console.error("Error fetching IRD settings:", error);
    } finally {
      setIrdSettingsLoading(false);
    }
  };

  const handleSaveIRDSettings = async () => {
    setIrdSettingsSaving(true);
    try {
      const res = await fetch("/api/settings/ird", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(irdSettings),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save");
      }

      const data = await res.json();
      if (data.settings) {
        setIrdSettings({ ...irdSettings, ...data.settings });
      }
      router.refresh();
    } catch (error) {
      console.error("Error saving IRD settings:", error);
      alert(error instanceof Error ? error.message : "Failed to save IRD settings");
    } finally {
      setIrdSettingsSaving(false);
    }
  };

  // Fetch CBMS settings
  useEffect(() => {
    if (activeTab === "cbms") {
      fetchCBMSSettings();
    }
  }, [activeTab]);

  const fetchCBMSSettings = async () => {
    setCbmsSettingsLoading(true);
    try {
      const res = await fetch("/api/settings/cbms");
      if (res.ok) {
        const data = await res.json();
        setCbmsConfigured(data.configured);
        if (data.config) {
          setCbmsSettings({
            enabled: data.config.enabled,
            apiUrl: data.config.apiUrl,
            username: data.config.username,
            password: "",
            hasPassword: data.config.hasPassword,
            sellerPan: data.config.sellerPan,
            syncMode: data.config.syncMode,
            batchInterval: data.config.batchInterval,
            maxRetry: data.config.maxRetry,
            retryDelay: data.config.retryDelay,
            lastSyncAt: data.config.lastSyncAt,
            lastSyncStatus: data.config.lastSyncStatus,
            credentialsValid: data.config.credentialsValid,
          });
        }
      }
    } catch (error) {
      console.error("Error fetching CBMS settings:", error);
    } finally {
      setCbmsSettingsLoading(false);
    }
  };

  const handleSaveCBMSSettings = async () => {
    setCbmsSettingsSaving(true);
    setConnectionTestResult(null);
    try {
      const method = cbmsConfigured ? "PATCH" : "POST";
      const payload: Record<string, unknown> = {
        enabled: cbmsSettings.enabled,
        apiUrl: cbmsSettings.apiUrl,
        username: cbmsSettings.username,
        sellerPan: cbmsSettings.sellerPan,
        syncMode: cbmsSettings.syncMode,
        batchInterval: cbmsSettings.batchInterval,
        maxRetry: cbmsSettings.maxRetry,
        retryDelay: cbmsSettings.retryDelay,
      };

      // Only include password if it was changed
      if (cbmsSettings.password) {
        payload.password = cbmsSettings.password;
      }

      const res = await fetch("/api/settings/cbms", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save");
      }

      setCbmsConfigured(true);
      setCbmsSettings({ ...cbmsSettings, hasPassword: true, password: "" });
      router.refresh();
    } catch (error) {
      console.error("Error saving CBMS settings:", error);
      alert(error instanceof Error ? error.message : "Failed to save CBMS settings");
    } finally {
      setCbmsSettingsSaving(false);
    }
  };

  const handleTestConnection = async () => {
    setTestingConnection(true);
    setConnectionTestResult(null);
    try {
      // For now, just validate the credentials format
      if (!cbmsSettings.username || (!cbmsSettings.password && !cbmsSettings.hasPassword)) {
        setConnectionTestResult({
          success: false,
          message: "Username and password are required",
        });
        return;
      }
      if (!cbmsSettings.sellerPan || cbmsSettings.sellerPan.length !== 9) {
        setConnectionTestResult({
          success: false,
          message: "Valid 9-digit PAN number is required",
        });
        return;
      }
      // Simulate successful validation (actual CBMS test would need server-side implementation)
      setConnectionTestResult({
        success: true,
        message: "Credentials format is valid. Save settings to enable CBMS sync.",
      });
    } catch (error) {
      setConnectionTestResult({
        success: false,
        message: error instanceof Error ? error.message : "Connection test failed",
      });
    } finally {
      setTestingConnection(false);
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
        {activeTab === "table-management" && (
          <Button onClick={handleSaveTableSettings} disabled={tableSettingsSaving}>
            {tableSettingsSaving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Save Changes
          </Button>
        )}
        {activeTab === "ird" && (
          <Button onClick={handleSaveIRDSettings} disabled={irdSettingsSaving}>
            {irdSettingsSaving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Save Changes
          </Button>
        )}
        {activeTab === "cbms" && (
          <Button onClick={handleSaveCBMSSettings} disabled={cbmsSettingsSaving}>
            {cbmsSettingsSaving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            {cbmsConfigured ? "Save Changes" : "Create Configuration"}
          </Button>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full max-w-3xl grid-cols-5">
          <TabsTrigger value="general" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            General
          </TabsTrigger>
          <TabsTrigger value="table-management" className="flex items-center gap-2">
            <Timer className="h-4 w-4" />
            Table Mgmt
          </TabsTrigger>
          <TabsTrigger value="ird" className="flex items-center gap-2">
            <Receipt className="h-4 w-4" />
            IRD E-Billing
          </TabsTrigger>
          <TabsTrigger value="cbms" className="flex items-center gap-2">
            <Cloud className="h-4 w-4" />
            CBMS
          </TabsTrigger>
          <TabsTrigger value="permissions" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Permissions
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

            {/* Manager Alert Sounds */}
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  Manager Alert Sounds
                </CardTitle>
                <CardDescription>
                  Configure sound notifications for the manager alerts panel (saved to this browser)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/50">
                  <div className="space-y-0.5">
                    <Label className="text-base font-medium">Enable Sound Alerts</Label>
                    <p className="text-sm text-muted-foreground">
                      Master toggle for all alert sounds
                    </p>
                  </div>
                  <Switch
                    checked={alertSoundPrefs.soundEnabled}
                    onChange={(checked) => updateAlertSoundPref("soundEnabled", checked)}
                  />
                </div>

                {alertSoundPrefs.soundEnabled && (
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="space-y-0.5">
                        <Label>New Orders</Label>
                        <p className="text-sm text-muted-foreground">
                          Sound when new orders arrive
                        </p>
                      </div>
                      <Switch
                        checked={alertSoundPrefs.NEW_ORDER}
                        onChange={(checked) => updateAlertSoundPref("NEW_ORDER", checked)}
                      />
                    </div>
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="space-y-0.5">
                        <Label>Assistance Requests</Label>
                        <p className="text-sm text-muted-foreground">
                          Sound when guests need help
                        </p>
                      </div>
                      <Switch
                        checked={alertSoundPrefs.ASSISTANCE_REQUEST}
                        onChange={(checked) => updateAlertSoundPref("ASSISTANCE_REQUEST", checked)}
                      />
                    </div>
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="space-y-0.5">
                        <Label>Bill Requests</Label>
                        <p className="text-sm text-muted-foreground">
                          Sound when bill is requested
                        </p>
                      </div>
                      <Switch
                        checked={alertSoundPrefs.BILL_REQUEST}
                        onChange={(checked) => updateAlertSoundPref("BILL_REQUEST", checked)}
                      />
                    </div>
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="space-y-0.5">
                        <Label>Session Alerts</Label>
                        <p className="text-sm text-muted-foreground">
                          Sound for long stay alerts
                        </p>
                      </div>
                      <Switch
                        checked={alertSoundPrefs.SESSION_ALERT}
                        onChange={(checked) => updateAlertSoundPref("SESSION_ALERT", checked)}
                      />
                    </div>
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="space-y-0.5">
                        <Label>Order Ready</Label>
                        <p className="text-sm text-muted-foreground">
                          Sound when orders are ready
                        </p>
                      </div>
                      <Switch
                        checked={alertSoundPrefs.ORDER_READY}
                        onChange={(checked) => updateAlertSoundPref("ORDER_READY", checked)}
                      />
                    </div>
                  </div>
                )}

                <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
                  <p>
                    These settings are saved locally in your browser and apply to the Manager Alerts
                    panel on the dashboard. Critical alerts will play a double-beep sound.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="table-management" className="mt-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Assistance Timers */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Timer className="h-5 w-5" />
                  Assistance Timers
                </CardTitle>
                <CardDescription>
                  Automatic help notifications for guests
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Enable Auto-Assistance</Label>
                    <p className="text-sm text-muted-foreground">
                      Auto-notify staff when guests may need help
                    </p>
                  </div>
                  <Switch
                    checked={tableSettings.assistanceEnabled}
                    onChange={(checked) =>
                      setTableSettings({ ...tableSettings, assistanceEnabled: checked })
                    }
                  />
                </div>
                {tableSettings.assistanceEnabled && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="otpHelpTimer">OTP Help Timer (min)</Label>
                        <Input
                          id="otpHelpTimer"
                          type="number"
                          min={1}
                          max={10}
                          value={tableSettings.otpHelpTimerMinutes}
                          onChange={(e) =>
                            setTableSettings({
                              ...tableSettings,
                              otpHelpTimerMinutes: parseInt(e.target.value) || 2,
                            })
                          }
                        />
                        <p className="text-xs text-muted-foreground">
                          Alert if guest hasn't entered OTP
                        </p>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="orderHelpTimer">Order Help Timer (min)</Label>
                        <Input
                          id="orderHelpTimer"
                          type="number"
                          min={1}
                          max={30}
                          value={tableSettings.orderHelpTimerMinutes}
                          onChange={(e) =>
                            setTableSettings({
                              ...tableSettings,
                              orderHelpTimerMinutes: parseInt(e.target.value) || 5,
                            })
                          }
                        />
                        <p className="text-xs text-muted-foreground">
                          Alert if guest hasn't ordered
                        </p>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Duration Color Thresholds */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5" />
                  Duration Colors
                </CardTitle>
                <CardDescription>
                  Color coding for session duration on tables page
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4 text-sm">
                  <span className="font-medium">Preview:</span>
                  <div className="flex items-center gap-1">
                    <div className="h-3 w-3 rounded-full bg-green-500" />
                    <span>&lt;{tableSettings.durationGreenMax}m</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="h-3 w-3 rounded-full bg-yellow-500" />
                    <span>&lt;{tableSettings.durationYellowMax}m</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="h-3 w-3 rounded-full bg-orange-500" />
                    <span>&lt;{tableSettings.durationOrangeMax}m</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="h-3 w-3 rounded-full bg-red-500" />
                    <span>&gt;{tableSettings.durationOrangeMax}m</span>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="greenMax" className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-green-500" />
                      Green Max
                    </Label>
                    <Input
                      id="greenMax"
                      type="number"
                      min={10}
                      max={60}
                      value={tableSettings.durationGreenMax}
                      onChange={(e) =>
                        setTableSettings({
                          ...tableSettings,
                          durationGreenMax: parseInt(e.target.value) || 30,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="yellowMax" className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-yellow-500" />
                      Yellow Max
                    </Label>
                    <Input
                      id="yellowMax"
                      type="number"
                      min={30}
                      max={120}
                      value={tableSettings.durationYellowMax}
                      onChange={(e) =>
                        setTableSettings({
                          ...tableSettings,
                          durationYellowMax: parseInt(e.target.value) || 60,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="orangeMax" className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-orange-500" />
                      Orange Max
                    </Label>
                    <Input
                      id="orangeMax"
                      type="number"
                      min={60}
                      max={180}
                      value={tableSettings.durationOrangeMax}
                      onChange={(e) =>
                        setTableSettings({
                          ...tableSettings,
                          durationOrangeMax: parseInt(e.target.value) || 90,
                        })
                      }
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Long Stay Alerts */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  Long Stay Alerts
                </CardTitle>
                <CardDescription>
                  Notifications for extended guest sessions
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Enable Long Stay Alerts</Label>
                    <p className="text-sm text-muted-foreground">
                      Alert when guests stay beyond threshold
                    </p>
                  </div>
                  <Switch
                    checked={tableSettings.longStayAlertEnabled}
                    onChange={(checked) =>
                      setTableSettings({ ...tableSettings, longStayAlertEnabled: checked })
                    }
                  />
                </div>
                {tableSettings.longStayAlertEnabled && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="longStayAlert">Alert After (min)</Label>
                        <Input
                          id="longStayAlert"
                          type="number"
                          min={30}
                          max={180}
                          value={tableSettings.longStayAlertMinutes}
                          onChange={(e) =>
                            setTableSettings({
                              ...tableSettings,
                              longStayAlertMinutes: parseInt(e.target.value) || 90,
                            })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="repeatAlert">Repeat Every (min)</Label>
                        <Input
                          id="repeatAlert"
                          type="number"
                          min={10}
                          max={60}
                          value={tableSettings.longStayRepeatMinutes}
                          onChange={(e) =>
                            setTableSettings({
                              ...tableSettings,
                              longStayRepeatMinutes: parseInt(e.target.value) || 30,
                            })
                          }
                        />
                      </div>
                    </div>
                    <div className="space-y-3">
                      <Label>Notify:</Label>
                      <div className="flex gap-4">
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={tableSettings.longStayNotifyWaiter}
                            onChange={(e) =>
                              setTableSettings({
                                ...tableSettings,
                                longStayNotifyWaiter: e.target.checked,
                              })
                            }
                            className="rounded"
                          />
                          <span className="text-sm">Waiter</span>
                        </label>
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={tableSettings.longStayNotifyManager}
                            onChange={(e) =>
                              setTableSettings({
                                ...tableSettings,
                                longStayNotifyManager: e.target.checked,
                              })
                            }
                            className="rounded"
                          />
                          <span className="text-sm">Manager</span>
                        </label>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Cleaning Alerts */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5" />
                  Cleaning Alerts
                </CardTitle>
                <CardDescription>
                  Notifications for table cleaning delays
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Enable Cleaning Alerts</Label>
                    <p className="text-sm text-muted-foreground">
                      Alert if table isn't cleaned quickly
                    </p>
                  </div>
                  <Switch
                    checked={tableSettings.cleaningAlertEnabled}
                    onChange={(checked) =>
                      setTableSettings({ ...tableSettings, cleaningAlertEnabled: checked })
                    }
                  />
                </div>
                {tableSettings.cleaningAlertEnabled && (
                  <div className="space-y-2">
                    <Label htmlFor="cleaningAlert">Alert After (min)</Label>
                    <Input
                      id="cleaningAlert"
                      type="number"
                      min={5}
                      max={30}
                      value={tableSettings.cleaningAlertMinutes}
                      onChange={(e) =>
                        setTableSettings({
                          ...tableSettings,
                          cleaningAlertMinutes: parseInt(e.target.value) || 10,
                        })
                      }
                    />
                    <p className="text-xs text-muted-foreground">
                      Time before alerting about uncleaned tables
                    </p>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Cleaning Checklist</Label>
                    <p className="text-sm text-muted-foreground">
                      Require checklist completion
                    </p>
                  </div>
                  <Switch
                    checked={tableSettings.cleaningChecklistEnabled}
                    onChange={(checked) =>
                      setTableSettings({ ...tableSettings, cleaningChecklistEnabled: checked })
                    }
                  />
                </div>
              </CardContent>
            </Card>

            {/* QR Order Flow */}
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <QrCode className="h-5 w-5" />
                  QR Order Flow
                </CardTitle>
                <CardDescription>
                  Configure how orders from QR menu scans are processed
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-0.5">
                    <Label>Require Staff Confirmation</Label>
                    <p className="text-sm text-muted-foreground">
                      When enabled, QR orders require staff confirmation before going to kitchen.
                      When disabled, orders go directly to kitchen.
                    </p>
                  </div>
                  <Switch
                    checked={tableSettings.qrOrderRequiresConfirmation}
                    onChange={(checked) =>
                      setTableSettings({ ...tableSettings, qrOrderRequiresConfirmation: checked })
                    }
                  />
                </div>
                <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
                  <p className="font-medium mb-1">How it works:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li><strong>ON:</strong> Guest places order → Staff sees "Pending Confirmation" → Staff confirms → Kitchen sees order</li>
                    <li><strong>OFF:</strong> Guest places order → Kitchen sees order immediately</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="ird" className="mt-6">
          {irdSettingsLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2">
              {/* IRD Toggle */}
              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Receipt className="h-5 w-5" />
                    IRD E-Billing System
                  </CardTitle>
                  <CardDescription>
                    Enable IRD-compliant invoicing for Nepal tax compliance
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/50">
                    <div className="space-y-0.5">
                      <Label className="text-base font-medium">Enable IRD E-Billing</Label>
                      <p className="text-sm text-muted-foreground">
                        When enabled, all bill payments will generate IRD-compliant invoices with sequential numbering and VAT calculation
                      </p>
                    </div>
                    <Switch
                      checked={irdSettings.irdEnabled}
                      onChange={(checked) => setIrdSettings({ ...irdSettings, irdEnabled: checked })}
                    />
                  </div>

                  {!irdSettings.irdEnabled && (
                    <div className="text-sm text-muted-foreground bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="font-medium text-yellow-800">IRD E-Billing is Disabled</p>
                          <p className="text-yellow-700">
                            Bills will be printed normally without IRD invoice creation. To comply with Nepal IRD regulations, enable this option and configure your business details below.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {irdSettings.irdEnabled && (
                    <div className="text-sm bg-green-50 border border-green-200 p-4 rounded-lg">
                      <div className="flex items-start gap-2">
                        <Check className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="font-medium text-green-800">IRD E-Billing is Active</p>
                          <p className="text-green-700">
                            All bill payments will automatically generate IRD-compliant VAT invoices with sequential numbering.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Business Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5" />
                    Business Information
                  </CardTitle>
                  <CardDescription>
                    Required for IRD-compliant invoices
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="irdVatNumber">VAT/PAN Number *</Label>
                    <Input
                      id="irdVatNumber"
                      placeholder="9 digit PAN number"
                      maxLength={9}
                      value={irdSettings.irdVatNumber || ""}
                      onChange={(e) =>
                        setIrdSettings({ ...irdSettings, irdVatNumber: e.target.value || null })
                      }
                    />
                    <p className="text-xs text-muted-foreground">
                      Your 9-digit PAN registration number
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="irdBusinessName">Business Name (English) *</Label>
                    <Input
                      id="irdBusinessName"
                      placeholder="Registered business name"
                      value={irdSettings.irdBusinessName || ""}
                      onChange={(e) =>
                        setIrdSettings({ ...irdSettings, irdBusinessName: e.target.value || null })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="irdBusinessNameNp">Business Name (Nepali)</Label>
                    <Input
                      id="irdBusinessNameNp"
                      placeholder="व्यापारको नाम"
                      value={irdSettings.irdBusinessNameNp || ""}
                      onChange={(e) =>
                        setIrdSettings({ ...irdSettings, irdBusinessNameNp: e.target.value || null })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="irdBusinessAddress">Business Address (English) *</Label>
                    <Input
                      id="irdBusinessAddress"
                      placeholder="Full business address"
                      value={irdSettings.irdBusinessAddress || ""}
                      onChange={(e) =>
                        setIrdSettings({ ...irdSettings, irdBusinessAddress: e.target.value || null })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="irdBusinessAddressNp">Business Address (Nepali)</Label>
                    <Input
                      id="irdBusinessAddressNp"
                      placeholder="व्यापारको ठेगाना"
                      value={irdSettings.irdBusinessAddressNp || ""}
                      onChange={(e) =>
                        setIrdSettings({ ...irdSettings, irdBusinessAddressNp: e.target.value || null })
                      }
                    />
                  </div>
                </CardContent>
              </Card>

              {/* VAT Settings */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5" />
                    VAT & Service Charge Settings
                  </CardTitle>
                  <CardDescription>
                    Configure tax rates for IRD invoices
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="irdVatRate">VAT Rate (%)</Label>
                      <Input
                        id="irdVatRate"
                        type="number"
                        min={0}
                        max={100}
                        step={0.01}
                        value={irdSettings.irdVatRate}
                        onChange={(e) =>
                          setIrdSettings({
                            ...irdSettings,
                            irdVatRate: parseFloat(e.target.value) || 13,
                          })
                        }
                      />
                      <p className="text-xs text-muted-foreground">
                        Nepal standard VAT is 13%
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="irdServiceChargeRate">Service Charge (%)</Label>
                      <Input
                        id="irdServiceChargeRate"
                        type="number"
                        min={0}
                        max={100}
                        step={0.01}
                        value={irdSettings.irdServiceChargeRate}
                        onChange={(e) =>
                          setIrdSettings({
                            ...irdSettings,
                            irdServiceChargeRate: parseFloat(e.target.value) || 10,
                          })
                        }
                      />
                      <p className="text-xs text-muted-foreground">
                        Typically 10% for restaurants
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Include Service Charge</Label>
                      <p className="text-sm text-muted-foreground">
                        Add service charge to invoices
                      </p>
                    </div>
                    <Switch
                      checked={irdSettings.irdIncludeServiceCharge}
                      onChange={(checked) =>
                        setIrdSettings({ ...irdSettings, irdIncludeServiceCharge: checked })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="irdInvoicePrefix">Invoice Number Prefix</Label>
                    <Input
                      id="irdInvoicePrefix"
                      placeholder="e.g., KTM for Kathmandu"
                      maxLength={10}
                      value={irdSettings.irdInvoicePrefix || ""}
                      onChange={(e) =>
                        setIrdSettings({ ...irdSettings, irdInvoicePrefix: e.target.value || null })
                      }
                    />
                    <p className="text-xs text-muted-foreground">
                      Optional prefix for invoice numbers (e.g., 2081-KTM-00001)
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Info Card */}
              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    About IRD E-Billing
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-sm text-muted-foreground space-y-3">
                    <p>
                      IRD (Inland Revenue Department) E-Billing is the electronic billing system mandated by
                      the Nepal government for VAT-registered businesses. When enabled:
                    </p>
                    <ul className="list-disc list-inside space-y-1 ml-2">
                      <li>Sequential invoice numbers are generated automatically (e.g., 2081-KTM-00001)</li>
                      <li>Invoices include both Bikram Sambat (BS) and AD dates</li>
                      <li>VAT is calculated at the configured rate (default 13%)</li>
                      <li>Service charge is itemized separately if enabled</li>
                      <li>Total amount is shown in words (in Nepali Rupees)</li>
                      <li>All invoice data is stored for IRD compliance reporting</li>
                    </ul>
                    <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg mt-4">
                      <p className="text-blue-800">
                        <strong>CBMS Integration:</strong> To sync invoices with IRD's Central Billing Monitoring System (CBMS),
                        additional CBMS API credentials must be configured by the system administrator.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="cbms" className="mt-6">
          {cbmsSettingsLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2">
              {/* CBMS Status */}
              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Cloud className="h-5 w-5" />
                    Central Billing Monitoring System (CBMS)
                    {cbmsConfigured ? (
                      cbmsSettings.enabled ? (
                        <Badge className="bg-green-100 text-green-700 ml-2">Enabled</Badge>
                      ) : (
                        <Badge className="bg-yellow-100 text-yellow-700 ml-2">Configured - Disabled</Badge>
                      )
                    ) : (
                      <Badge className="bg-gray-100 text-gray-700 ml-2">Not Configured</Badge>
                    )}
                  </CardTitle>
                  <CardDescription>
                    Configure CBMS integration to sync invoices with IRD's Central Billing Monitoring System
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/50">
                    <div className="space-y-0.5">
                      <Label className="text-base font-medium">Enable CBMS Sync</Label>
                      <p className="text-sm text-muted-foreground">
                        When enabled, invoices will be automatically synced to IRD's CBMS system
                      </p>
                    </div>
                    <Switch
                      checked={cbmsSettings.enabled}
                      onChange={(checked) => setCbmsSettings({ ...cbmsSettings, enabled: checked })}
                      disabled={!cbmsConfigured}
                    />
                  </div>

                  {cbmsConfigured && cbmsSettings.lastSyncAt && (
                    <div className="flex items-center gap-4 text-sm">
                      <span className="text-gray-500">Last Sync:</span>
                      <span>{new Date(cbmsSettings.lastSyncAt).toLocaleString()}</span>
                      {cbmsSettings.lastSyncStatus && (
                        <Badge variant={cbmsSettings.credentialsValid ? "default" : "destructive"}>
                          {cbmsSettings.lastSyncStatus}
                        </Badge>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* API Credentials */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Key className="h-5 w-5" />
                    API Credentials
                  </CardTitle>
                  <CardDescription>
                    Your Taxpayer Portal credentials for CBMS API
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="cbmsUsername">Username (Taxpayer Portal UserID) *</Label>
                    <Input
                      id="cbmsUsername"
                      placeholder="Your Taxpayer Portal username"
                      value={cbmsSettings.username}
                      onChange={(e) =>
                        setCbmsSettings({ ...cbmsSettings, username: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cbmsPassword">
                      Password *
                      {cbmsSettings.hasPassword && (
                        <span className="text-xs text-green-600 ml-2">(saved - enter new to change)</span>
                      )}
                    </Label>
                    <Input
                      id="cbmsPassword"
                      type="password"
                      placeholder={cbmsSettings.hasPassword ? "••••••••" : "Enter password"}
                      value={cbmsSettings.password}
                      onChange={(e) =>
                        setCbmsSettings({ ...cbmsSettings, password: e.target.value })
                      }
                    />
                    <p className="text-xs text-muted-foreground">
                      Your Taxpayer Portal password (same as IRD login)
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cbmsSellerPan">Seller PAN Number *</Label>
                    <Input
                      id="cbmsSellerPan"
                      placeholder="9-digit PAN number"
                      maxLength={9}
                      value={cbmsSettings.sellerPan}
                      onChange={(e) =>
                        setCbmsSettings({ ...cbmsSettings, sellerPan: e.target.value })
                      }
                    />
                    <p className="text-xs text-muted-foreground">
                      Your 9-digit PAN registration number
                    </p>
                  </div>

                  {/* Test Connection Button */}
                  <div className="pt-2">
                    <Button
                      variant="outline"
                      onClick={handleTestConnection}
                      disabled={testingConnection}
                      className="w-full"
                    >
                      {testingConnection ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <TestTube className="h-4 w-4 mr-2" />
                      )}
                      Validate Credentials
                    </Button>
                    {connectionTestResult && (
                      <div
                        className={cn(
                          "mt-2 p-3 rounded-lg text-sm flex items-start gap-2",
                          connectionTestResult.success
                            ? "bg-green-50 text-green-700"
                            : "bg-red-50 text-red-700"
                        )}
                      >
                        {connectionTestResult.success ? (
                          <CheckCircle2 className="h-4 w-4 mt-0.5 flex-shrink-0" />
                        ) : (
                          <XCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                        )}
                        {connectionTestResult.message}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Sync Settings */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Link2 className="h-5 w-5" />
                    Sync Settings
                  </CardTitle>
                  <CardDescription>
                    Configure how invoices are synced to CBMS
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="cbmsApiUrl">API URL</Label>
                    <select
                      id="cbmsApiUrl"
                      className="w-full border rounded-md px-3 py-2"
                      value={cbmsSettings.apiUrl}
                      onChange={(e) =>
                        setCbmsSettings({ ...cbmsSettings, apiUrl: e.target.value })
                      }
                    >
                      <option value="https://cbapi.ird.gov.np">Production (cbapi.ird.gov.np)</option>
                      <option value="http://202.166.207.75:9050">Test Environment</option>
                    </select>
                    <p className="text-xs text-muted-foreground">
                      Use Test Environment for development, Production for live
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cbmsSyncMode">Sync Mode</Label>
                    <select
                      id="cbmsSyncMode"
                      className="w-full border rounded-md px-3 py-2"
                      value={cbmsSettings.syncMode}
                      onChange={(e) =>
                        setCbmsSettings({
                          ...cbmsSettings,
                          syncMode: e.target.value as "REALTIME" | "BATCH" | "MANUAL",
                        })
                      }
                    >
                      <option value="REALTIME">Real-time (sync immediately)</option>
                      <option value="BATCH">Batch (sync periodically)</option>
                      <option value="MANUAL">Manual (sync on demand)</option>
                    </select>
                  </div>
                  {cbmsSettings.syncMode === "BATCH" && (
                    <div className="space-y-2">
                      <Label htmlFor="cbmsBatchInterval">Batch Interval (minutes)</Label>
                      <Input
                        id="cbmsBatchInterval"
                        type="number"
                        min={1}
                        max={60}
                        value={cbmsSettings.batchInterval}
                        onChange={(e) =>
                          setCbmsSettings({
                            ...cbmsSettings,
                            batchInterval: parseInt(e.target.value) || 5,
                          })
                        }
                      />
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="cbmsMaxRetry">Max Retries</Label>
                      <Input
                        id="cbmsMaxRetry"
                        type="number"
                        min={1}
                        max={10}
                        value={cbmsSettings.maxRetry}
                        onChange={(e) =>
                          setCbmsSettings({
                            ...cbmsSettings,
                            maxRetry: parseInt(e.target.value) || 3,
                          })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cbmsRetryDelay">Retry Delay (min)</Label>
                      <Input
                        id="cbmsRetryDelay"
                        type="number"
                        min={1}
                        max={60}
                        value={cbmsSettings.retryDelay}
                        onChange={(e) =>
                          setCbmsSettings({
                            ...cbmsSettings,
                            retryDelay: parseInt(e.target.value) || 15,
                          })
                        }
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Info Card */}
              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    About CBMS Integration
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-sm text-muted-foreground space-y-3">
                    <p>
                      CBMS (Central Billing Monitoring System) is IRD's centralized platform for monitoring
                      business transactions. When configured:
                    </p>
                    <ul className="list-disc list-inside space-y-1 ml-2">
                      <li>Invoices are automatically synced to IRD after creation</li>
                      <li>Failed syncs are retried based on your configuration</li>
                      <li>All sync attempts are logged for audit purposes</li>
                      <li>CBMS status is visible in the IRD Reports section</li>
                    </ul>
                    <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg mt-4">
                      <p className="text-blue-800">
                        <strong>Important:</strong> CBMS credentials are the same as your Taxpayer Portal login.
                        If you change your Taxpayer Portal password, you must update it here as well.
                      </p>
                    </div>
                    <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-lg">
                      <p className="text-yellow-800">
                        <strong>Requirements:</strong> Real-time CBMS sync is mandatory for businesses
                        with annual turnover exceeding NPR 25 Crore. Others can use batch sync.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
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
