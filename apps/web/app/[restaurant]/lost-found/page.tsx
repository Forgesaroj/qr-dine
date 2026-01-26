"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@qr-dine/ui";
import { Button } from "@qr-dine/ui";
import { Input } from "@qr-dine/ui";
import { Textarea } from "@qr-dine/ui";
import {
  Search,
  Plus,
  Package,
  Clock,
  CheckCircle,
  XCircle,
  Archive,
  Loader2,
  Camera,
  MapPin,
  User,
  Phone,
  Calendar,
  MoreHorizontal,
  X,
  Truck,
  PhoneCall,
} from "lucide-react";

interface LostFoundItem {
  id: string;
  category: string;
  description: string;
  foundAt: string;
  foundAtTime: string;
  storageLocation: string | null;
  photoUrl: string | null;
  notes: string | null;
  status: string;
  claimedByName: string | null;
  claimedByPhone: string | null;
  claimedAt: string | null;
  deliveredAt: string | null;
  deliveryNotes: string | null;
  disposedAt: string | null;
  disposedReason: string | null;
  createdAt: string;
}

const categories = [
  "Phone/Electronics",
  "Wallet/Purse",
  "Keys",
  "Jewelry",
  "Clothing",
  "Glasses/Sunglasses",
  "Bags/Backpacks",
  "Documents/ID",
  "Children's Items",
  "Other",
];

const statusColors: Record<string, string> = {
  FOUND: "bg-blue-100 text-blue-800",
  CLAIMED: "bg-yellow-100 text-yellow-800",
  DELIVERED: "bg-green-100 text-green-800",
  DISPOSED: "bg-gray-100 text-gray-800",
};

const statusIcons: Record<string, typeof Package> = {
  FOUND: Package,
  CLAIMED: PhoneCall,
  DELIVERED: Truck,
  DISPOSED: Archive,
};

export default function LostFoundPage() {
  const params = useParams();
  const restaurant = params.restaurant as string;

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<LostFoundItem[]>([]);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showAddForm, setShowAddForm] = useState(false);
  const [showClaimForm, setShowClaimForm] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form states
  const [newItem, setNewItem] = useState({
    category: "",
    description: "",
    foundAt: "",
    storageLocation: "",
    notes: "",
  });

  const [claimInfo, setClaimInfo] = useState({
    claimedByName: "",
    claimedByPhone: "",
    verificationNotes: "",
  });

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/lost-found");
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setItems(data.items);
    } catch (error) {
      console.error("Error fetching lost & found items:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddItem = async () => {
    if (!newItem.category || !newItem.description || !newItem.foundAt) {
      alert("Please fill in required fields");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/lost-found", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newItem),
      });
      if (!res.ok) throw new Error("Failed to add item");
      fetchItems();
      setShowAddForm(false);
      setNewItem({
        category: "",
        description: "",
        foundAt: "",
        storageLocation: "",
        notes: "",
      });
    } catch (error) {
      console.error("Error adding item:", error);
      alert("Failed to add item");
    } finally {
      setSubmitting(false);
    }
  };

  const handleClaim = async (itemId: string) => {
    if (!claimInfo.claimedByName || !claimInfo.claimedByPhone) {
      alert("Please fill in claimant information");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/lost-found/${itemId}/claim`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(claimInfo),
      });
      if (!res.ok) throw new Error("Failed to claim item");
      fetchItems();
      setShowClaimForm(null);
      setClaimInfo({
        claimedByName: "",
        claimedByPhone: "",
        verificationNotes: "",
      });
    } catch (error) {
      console.error("Error claiming item:", error);
      alert("Failed to process claim");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDispose = async (itemId: string) => {
    const reason = prompt("Please enter the disposal reason:");
    if (!reason) return;

    try {
      const res = await fetch(`/api/lost-found/${itemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "DISPOSED", disposedReason: reason }),
      });
      if (!res.ok) throw new Error("Failed to dispose item");
      fetchItems();
    } catch (error) {
      console.error("Error disposing item:", error);
      alert("Failed to dispose item");
    }
  };

  const handleDeliver = async (itemId: string) => {
    const notes = prompt("Delivery notes (optional):", "Item handed over to owner");
    if (notes === null) return; // User cancelled

    try {
      const res = await fetch(`/api/lost-found/${itemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "DELIVERED",
          deliveryNotes: notes || "Item delivered to owner"
        }),
      });
      if (!res.ok) throw new Error("Failed to mark as delivered");
      fetchItems();
    } catch (error) {
      console.error("Error marking as delivered:", error);
      alert("Failed to mark as delivered");
    }
  };

  const filteredItems = items.filter((item) => {
    const matchesSearch =
      item.description.toLowerCase().includes(search.toLowerCase()) ||
      item.category.toLowerCase().includes(search.toLowerCase()) ||
      item.foundAt.toLowerCase().includes(search.toLowerCase());
    const matchesCategory =
      categoryFilter === "all" || item.category === categoryFilter;
    const matchesStatus =
      statusFilter === "all" || item.status === statusFilter;
    return matchesSearch && matchesCategory && matchesStatus;
  });

  const stats = {
    total: items.length,
    found: items.filter((i) => i.status === "FOUND").length,
    claimed: items.filter((i) => i.status === "CLAIMED").length,
    delivered: items.filter((i) => i.status === "DELIVERED").length,
    disposed: items.filter((i) => i.status === "DISPOSED").length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Lost & Found</h1>
          <p className="text-muted-foreground">
            Track and manage items found at the restaurant
          </p>
        </div>
        <Button onClick={() => setShowAddForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Report Found Item
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Items</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unclaimed</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.found}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Claimed</CardTitle>
            <PhoneCall className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.claimed}</div>
            <p className="text-xs text-muted-foreground">Awaiting pickup</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Delivered</CardTitle>
            <Truck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.delivered}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Disposed</CardTitle>
            <Archive className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-600">{stats.disposed}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search items..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-3 py-2 border rounded-lg bg-background"
        >
          <option value="all">All Categories</option>
          {categories.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 border rounded-lg bg-background"
        >
          <option value="all">All Status</option>
          <option value="FOUND">Unclaimed</option>
          <option value="CLAIMED">Claimed (Awaiting)</option>
          <option value="DELIVERED">Delivered</option>
          <option value="DISPOSED">Disposed</option>
        </select>
      </div>

      {/* Items List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : filteredItems.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Package className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">No items found</h3>
            <p className="text-muted-foreground text-center mt-1">
              {items.length === 0
                ? "No lost & found items have been reported yet"
                : "Try adjusting your search or filters"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredItems.map((item) => {
            const StatusIcon = statusIcons[item.status] || Package;
            return (
              <Card key={item.id} className="relative">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <Package className="h-4 w-4" />
                      </div>
                      <div>
                        <CardTitle className="text-base">{item.category}</CardTitle>
                        <CardDescription className="text-xs">
                          {new Date(item.foundAtTime).toLocaleDateString()}
                        </CardDescription>
                      </div>
                    </div>
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        statusColors[item.status] || "bg-gray-100"
                      }`}
                    >
                      {item.status}
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm">{item.description}</p>

                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    <span>Found at: {item.foundAt}</span>
                  </div>

                  {item.storageLocation && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Archive className="h-4 w-4" />
                      <span>Stored: {item.storageLocation}</span>
                    </div>
                  )}

                  {(item.status === "CLAIMED" || item.status === "DELIVERED") && (
                    <div className="pt-2 border-t space-y-1">
                      <div className="flex items-center gap-2 text-sm">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span>{item.claimedByName}</span>
                      </div>
                      {item.claimedByPhone && (
                        <div className="flex items-center gap-2 text-sm">
                          <Phone className="h-4 w-4 text-muted-foreground" />
                          <span>{item.claimedByPhone}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <PhoneCall className="h-4 w-4" />
                        <span>
                          Claimed: {new Date(item.claimedAt!).toLocaleDateString()}
                        </span>
                      </div>
                      {item.status === "DELIVERED" && item.deliveredAt && (
                        <div className="flex items-center gap-2 text-sm text-green-600">
                          <Truck className="h-4 w-4" />
                          <span>
                            Delivered: {new Date(item.deliveredAt).toLocaleDateString()}
                          </span>
                        </div>
                      )}
                      {item.deliveryNotes && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {item.deliveryNotes}
                        </p>
                      )}
                    </div>
                  )}

                  {item.status === "DISPOSED" && item.disposedReason && (
                    <div className="pt-2 border-t">
                      <p className="text-sm text-muted-foreground">
                        Disposed: {item.disposedReason}
                      </p>
                    </div>
                  )}

                  {item.status === "FOUND" && (
                    <div className="pt-3 flex gap-2">
                      <Button
                        size="sm"
                        className="flex-1"
                        onClick={() => setShowClaimForm(item.id)}
                      >
                        <PhoneCall className="h-4 w-4 mr-1" />
                        Phone Claim
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDispose(item.id)}
                      >
                        <Archive className="h-4 w-4" />
                      </Button>
                    </div>
                  )}

                  {item.status === "CLAIMED" && (
                    <div className="pt-3 flex gap-2">
                      <Button
                        size="sm"
                        className="flex-1 bg-green-600 hover:bg-green-700"
                        onClick={() => handleDeliver(item.id)}
                      >
                        <Truck className="h-4 w-4 mr-1" />
                        Mark Delivered
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add Item Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Report Found Item</CardTitle>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowAddForm(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1 block">
                  Category *
                </label>
                <select
                  value={newItem.category}
                  onChange={(e) =>
                    setNewItem({ ...newItem, category: e.target.value })
                  }
                  className="w-full px-3 py-2 border rounded-lg bg-background"
                >
                  <option value="">Select category</option>
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">
                  Description *
                </label>
                <Textarea
                  value={newItem.description}
                  onChange={(e) =>
                    setNewItem({ ...newItem, description: e.target.value })
                  }
                  placeholder="Describe the item (color, brand, condition...)"
                  rows={3}
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">
                  Found At (Location) *
                </label>
                <Input
                  value={newItem.foundAt}
                  onChange={(e) =>
                    setNewItem({ ...newItem, foundAt: e.target.value })
                  }
                  placeholder="e.g., Table 5, Restroom, Bar area"
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">
                  Storage Location
                </label>
                <Input
                  value={newItem.storageLocation}
                  onChange={(e) =>
                    setNewItem({ ...newItem, storageLocation: e.target.value })
                  }
                  placeholder="e.g., Host stand drawer, Manager office"
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">Notes</label>
                <Textarea
                  value={newItem.notes}
                  onChange={(e) =>
                    setNewItem({ ...newItem, notes: e.target.value })
                  }
                  placeholder="Additional notes..."
                  rows={2}
                />
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowAddForm(false)}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1"
                  onClick={handleAddItem}
                  disabled={submitting}
                >
                  {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Save Item
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Claim Modal */}
      {showClaimForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Process Claim</CardTitle>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowClaimForm(null)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <CardDescription>
                Record the claimant&apos;s information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1 block">
                  Claimant Name *
                </label>
                <Input
                  value={claimInfo.claimedByName}
                  onChange={(e) =>
                    setClaimInfo({ ...claimInfo, claimedByName: e.target.value })
                  }
                  placeholder="Full name"
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">
                  Phone Number *
                </label>
                <Input
                  value={claimInfo.claimedByPhone}
                  onChange={(e) =>
                    setClaimInfo({ ...claimInfo, claimedByPhone: e.target.value })
                  }
                  placeholder="Contact number"
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">
                  Verification Notes
                </label>
                <Textarea
                  value={claimInfo.verificationNotes}
                  onChange={(e) =>
                    setClaimInfo({
                      ...claimInfo,
                      verificationNotes: e.target.value,
                    })
                  }
                  placeholder="How was ownership verified? (ID shown, described item accurately, etc.)"
                  rows={3}
                />
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowClaimForm(null)}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1"
                  onClick={() => handleClaim(showClaimForm)}
                  disabled={submitting}
                >
                  {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Confirm Claim
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
