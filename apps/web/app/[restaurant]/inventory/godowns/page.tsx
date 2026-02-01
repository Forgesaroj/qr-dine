"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@qr-dine/ui";
import { Button } from "@qr-dine/ui";
import { Input } from "@qr-dine/ui";
import {
  Warehouse,
  Plus,
  Edit,
  Eye,
  Star,
  Package,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";

interface Godown {
  id: string;
  code: string;
  name: string;
  address?: string;
  type: string;
  isDefault: boolean;
  isActive: boolean;
  stockItemCount: number;
  totalStockValue: number;
}

export default function GodownsPage() {
  const params = useParams();
  const restaurant = params.restaurant as string;

  const [godowns, setGodowns] = useState<Godown[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    code: "",
    name: "",
    address: "",
    type: "MAIN",
    isDefault: false,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchGodowns();
  }, []);

  const fetchGodowns = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/stock/godowns");
      const data = await res.json();
      setGodowns(data.godowns || []);
    } catch (error) {
      console.error("Error fetching godowns:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const res = await fetch("/api/stock/godowns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (res.ok) {
        setShowAddForm(false);
        setFormData({
          code: "",
          name: "",
          address: "",
          type: "MAIN",
          isDefault: false,
        });
        fetchGodowns();
      } else {
        alert(data.error || "Failed to create godown");
      }
    } catch (error) {
      console.error("Error creating godown:", error);
      alert("Failed to create godown");
    } finally {
      setSaving(false);
    }
  };

  const godownTypes = [
    { value: "MAIN", label: "Main Store" },
    { value: "COLD_STORE", label: "Cold Store" },
    { value: "DRY_STORE", label: "Dry Store" },
    { value: "BAR", label: "Bar" },
    { value: "KITCHEN", label: "Kitchen" },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Godowns / Warehouses</h1>
          <p className="text-gray-500">Manage storage locations</p>
        </div>
        <Button onClick={() => setShowAddForm(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Godown
        </Button>
      </div>

      {/* Add Form Modal */}
      {showAddForm && (
        <Card>
          <CardHeader>
            <CardTitle>Add New Godown</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Code <span className="text-red-500">*</span>
                  </label>
                  <Input
                    value={formData.code}
                    onChange={(e) =>
                      setFormData({ ...formData, code: e.target.value.toUpperCase() })
                    }
                    placeholder="e.g., MAIN, BAR, COLD"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Name <span className="text-red-500">*</span>
                  </label>
                  <Input
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    placeholder="e.g., Main Store, Bar Storage"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Type</label>
                  <select
                    value={formData.type}
                    onChange={(e) =>
                      setFormData({ ...formData, type: e.target.value })
                    }
                    className="w-full px-3 py-2 border rounded-md"
                  >
                    {godownTypes.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Address</label>
                  <Input
                    value={formData.address}
                    onChange={(e) =>
                      setFormData({ ...formData, address: e.target.value })
                    }
                    placeholder="Location description"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isDefault"
                  checked={formData.isDefault}
                  onChange={(e) =>
                    setFormData({ ...formData, isDefault: e.target.checked })
                  }
                  className="w-4 h-4"
                />
                <label htmlFor="isDefault" className="text-sm">
                  Set as default godown
                </label>
              </div>

              <div className="flex gap-2">
                <Button type="submit" disabled={saving}>
                  {saving ? "Creating..." : "Create Godown"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowAddForm(false)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Godowns Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-48 bg-gray-200 animate-pulse rounded-lg"></div>
          ))}
        </div>
      ) : godowns.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Warehouse className="w-12 h-12 text-gray-300 mx-auto" />
            <p className="mt-2 text-gray-500">No godowns found</p>
            <Button className="mt-4" onClick={() => setShowAddForm(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add First Godown
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {godowns.map((godown) => (
            <Card
              key={godown.id}
              className={`hover:shadow-md transition-shadow ${
                !godown.isActive ? "opacity-60" : ""
              }`}
            >
              <CardHeader className="flex flex-row items-start justify-between pb-2">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    {godown.name}
                    {godown.isDefault && (
                      <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                    )}
                  </CardTitle>
                  <p className="text-sm text-gray-500 font-mono">{godown.code}</p>
                </div>
                <span
                  className={`px-2 py-1 text-xs rounded-full ${
                    godown.isActive
                      ? "bg-green-100 text-green-700"
                      : "bg-gray-100 text-gray-600"
                  }`}
                >
                  {godown.isActive ? "Active" : "Inactive"}
                </span>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Type</span>
                    <span>{godown.type.replace("_", " ")}</span>
                  </div>
                  {godown.address && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Location</span>
                      <span>{godown.address}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Stock Items</span>
                    <span className="flex items-center gap-1">
                      <Package className="w-4 h-4" />
                      {godown.stockItemCount}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Total Value</span>
                    <span className="font-medium">
                      Rs. {godown.totalStockValue.toLocaleString()}
                    </span>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Link href={`/${restaurant}/inventory/godowns/${godown.id}`} className="flex-1">
                      <Button variant="outline" className="w-full" size="sm">
                        <Eye className="w-4 h-4 mr-2" />
                        View Stock
                      </Button>
                    </Link>
                    <Button variant="ghost" size="sm">
                      <Edit className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
