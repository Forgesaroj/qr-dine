"use client";

import { useState, useEffect } from "react";
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
  Key,
  Search,
  Plus,
  Copy,
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
  Building2,
  Calendar,
  AlertTriangle,
  RefreshCw,
  X,
} from "lucide-react";

interface License {
  id: string;
  key: string;
  tier: string;
  status: string;
  restaurantId: string | null;
  restaurantName: string | null;
  activatedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
}

const tiers = [
  { value: "STARTER", label: "Starter", price: 0 },
  { value: "BASIC", label: "Basic", price: 2999 },
  { value: "PRO", label: "Professional", price: 5999 },
  { value: "ENTERPRISE", label: "Enterprise", price: 9999 },
  { value: "UNLIMITED", label: "Unlimited", price: 19999 },
];

export default function LicensesPage() {
  const [loading, setLoading] = useState(true);
  const [licenses, setLicenses] = useState<License[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  const [newLicense, setNewLicense] = useState({
    tier: "BASIC",
    validityMonths: 12,
    quantity: 1,
  });
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  useEffect(() => {
    fetchLicenses();
  }, []);

  const fetchLicenses = async () => {
    try {
      const res = await fetch("/api/superadmin/licenses");
      if (res.ok) {
        const data = await res.json();
        setLicenses(data.licenses || []);
      }
    } catch (error) {
      console.error("Error fetching licenses:", error);
    } finally {
      setLoading(false);
    }
  };

  const generateLicense = async () => {
    setGenerating(true);
    try {
      const res = await fetch("/api/superadmin/licenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newLicense),
      });
      if (res.ok) {
        const data = await res.json();
        setGeneratedKey(data.key);
        fetchLicenses();
      }
    } catch (error) {
      console.error("Error generating license:", error);
    } finally {
      setGenerating(false);
    }
  };

  const revokeLicense = async (id: string) => {
    if (!confirm("Are you sure you want to revoke this license?")) return;
    try {
      const res = await fetch(`/api/superadmin/licenses/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        fetchLicenses();
      }
    } catch (error) {
      console.error("Error revoking license:", error);
    }
  };

  const copyToClipboard = (key: string) => {
    navigator.clipboard.writeText(key);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const filteredLicenses = licenses.filter((l) => {
    const matchesSearch =
      l.key.toLowerCase().includes(search.toLowerCase()) ||
      (l.restaurantName && l.restaurantName.toLowerCase().includes(search.toLowerCase()));
    const matchesStatus = statusFilter === "all" || l.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: licenses.length,
    active: licenses.filter((l) => l.status === "ACTIVE").length,
    available: licenses.filter((l) => l.status === "AVAILABLE").length,
    expired: licenses.filter((l) => l.status === "EXPIRED").length,
    expiringSoon: licenses.filter((l) => {
      if (!l.expiresAt) return false;
      const daysUntilExpiry = (new Date(l.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
      return daysUntilExpiry > 0 && daysUntilExpiry <= 30;
    }).length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">License Management</h1>
          <p className="text-muted-foreground">
            Generate and manage software licenses
          </p>
        </div>
        <Button onClick={() => setShowGenerateModal(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Generate License
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
            <Key className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.active}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Available</CardTitle>
            <Clock className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.available}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Expiring Soon</CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.expiringSoon}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Expired</CardTitle>
            <XCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.expired}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by key or restaurant..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 border rounded-lg bg-background"
        >
          <option value="all">All Status</option>
          <option value="AVAILABLE">Available</option>
          <option value="ACTIVE">Active</option>
          <option value="EXPIRED">Expired</option>
          <option value="REVOKED">Revoked</option>
        </select>
      </div>

      {/* Licenses Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="text-left p-4 font-medium">License Key</th>
                  <th className="text-left p-4 font-medium">Tier</th>
                  <th className="text-left p-4 font-medium">Restaurant</th>
                  <th className="text-left p-4 font-medium">Status</th>
                  <th className="text-left p-4 font-medium">Expires</th>
                  <th className="text-right p-4 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredLicenses.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-muted-foreground">
                      No licenses found
                    </td>
                  </tr>
                ) : (
                  filteredLicenses.map((license) => (
                    <tr key={license.id} className="border-b hover:bg-gray-50">
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <code className="px-2 py-1 bg-gray-100 rounded text-sm font-mono">
                            {license.key}
                          </code>
                          <button
                            onClick={() => copyToClipboard(license.key)}
                            className="p-1 hover:bg-gray-200 rounded"
                            title="Copy to clipboard"
                          >
                            {copiedKey === license.key ? (
                              <CheckCircle className="h-4 w-4 text-green-500" />
                            ) : (
                              <Copy className="h-4 w-4 text-gray-500" />
                            )}
                          </button>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className="inline-flex px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                          {license.tier}
                        </span>
                      </td>
                      <td className="p-4">
                        {license.restaurantName ? (
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-muted-foreground" />
                            <span>{license.restaurantName}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">Not assigned</span>
                        )}
                      </td>
                      <td className="p-4">
                        <span
                          className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                            license.status === "ACTIVE"
                              ? "bg-green-100 text-green-700"
                              : license.status === "AVAILABLE"
                              ? "bg-blue-100 text-blue-700"
                              : license.status === "EXPIRED"
                              ? "bg-red-100 text-red-700"
                              : "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {license.status}
                        </span>
                      </td>
                      <td className="p-4">
                        {license.expiresAt ? (
                          <div className="flex items-center gap-1 text-sm">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            {new Date(license.expiresAt).toLocaleDateString()}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {license.status === "ACTIVE" && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => revokeLicense(license.id)}
                              className="text-red-600 hover:text-red-700"
                            >
                              Revoke
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Generate License Modal */}
      {showGenerateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Generate License Key</CardTitle>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setShowGenerateModal(false);
                    setGeneratedKey(null);
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <CardDescription>
                Create a new license key for activation
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {generatedKey ? (
                <div className="space-y-4">
                  <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                    <p className="text-sm text-green-600 mb-2">
                      License key generated successfully!
                    </p>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 p-2 bg-white rounded border font-mono text-sm">
                        {generatedKey}
                      </code>
                      <button
                        onClick={() => copyToClipboard(generatedKey)}
                        className="p-2 hover:bg-green-100 rounded"
                      >
                        {copiedKey === generatedKey ? (
                          <CheckCircle className="h-5 w-5 text-green-500" />
                        ) : (
                          <Copy className="h-5 w-5 text-gray-500" />
                        )}
                      </button>
                    </div>
                  </div>
                  <Button
                    className="w-full"
                    onClick={() => {
                      setGeneratedKey(null);
                      setNewLicense({
                        tier: "BASIC",
                        validityMonths: 12,
                        quantity: 1,
                      });
                    }}
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Generate Another
                  </Button>
                </div>
              ) : (
                <>
                  <div>
                    <label className="text-sm font-medium mb-1 block">
                      License Tier
                    </label>
                    <select
                      value={newLicense.tier}
                      onChange={(e) =>
                        setNewLicense({ ...newLicense, tier: e.target.value })
                      }
                      className="w-full px-3 py-2 border rounded-lg bg-background"
                    >
                      {tiers.map((tier) => (
                        <option key={tier.value} value={tier.value}>
                          {tier.label} - Rs.{tier.price}/month
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-1 block">
                      Validity (Months)
                    </label>
                    <Input
                      type="number"
                      min={1}
                      max={60}
                      value={newLicense.validityMonths}
                      onChange={(e) =>
                        setNewLicense({
                          ...newLicense,
                          validityMonths: parseInt(e.target.value) || 12,
                        })
                      }
                    />
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => setShowGenerateModal(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      className="flex-1"
                      onClick={generateLicense}
                      disabled={generating}
                    >
                      {generating && (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      )}
                      Generate
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
