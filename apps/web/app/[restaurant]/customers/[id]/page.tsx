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
  Button,
  Input,
  Badge,
} from "@qr-dine/ui";
import {
  ArrowLeft,
  User,
  Phone,
  Mail,
  Calendar,
  Crown,
  Star,
  Award,
  Medal,
  Gift,
  Plus,
  Minus,
  Edit2,
  Save,
  X,
  Loader2,
  ShoppingBag,
  MessageSquare,
  History,
  TrendingUp,
  AlertCircle,
  Trash2,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface CustomerNote {
  id: string;
  note: string;
  createdAt: string;
  addedBy: {
    name: string;
  };
}

interface PointsTransaction {
  id: string;
  type: string;
  points: number;
  balanceAfter: number;
  reason: string | null;
  bonusType: string | null;
  createdAt: string;
  order: { orderNumber: string; totalAmount: number | null } | null;
  bill: { billNumber: string; totalAmount: number | null } | null;
  adjustedBy: { name: string } | null;
}

interface Order {
  id: string;
  orderNumber: string;
  status: string;
  totalAmount: number | null;
  placedAt: string;
  pointsEarned: number;
  pointsRedeemed: number;
}

interface Customer {
  id: string;
  customerId: string;
  name: string;
  phone: string;
  email: string | null;
  dateOfBirth: string | null;
  tier: string;
  status: string;
  pointsBalance: number;
  pointsEarnedLifetime: number;
  pointsRedeemedLifetime: number;
  totalSpent: number | null;
  totalVisits: number;
  averageOrderValue: number | null;
  createdAt: string;
  pointsTransactions: PointsTransaction[];
  orders: Order[];
  notes: CustomerNote[];
}

const tierConfig: Record<string, { icon: React.ElementType; color: string; bgColor: string }> = {
  BRONZE: { icon: Medal, color: "text-amber-700", bgColor: "bg-amber-100" },
  SILVER: { icon: Award, color: "text-gray-500", bgColor: "bg-gray-100" },
  GOLD: { icon: Star, color: "text-yellow-500", bgColor: "bg-yellow-100" },
  PLATINUM: { icon: Crown, color: "text-purple-600", bgColor: "bg-purple-100" },
};

const transactionTypeColors: Record<string, string> = {
  EARN: "text-green-600 bg-green-50",
  REDEEM: "text-red-600 bg-red-50",
  BONUS: "text-blue-600 bg-blue-50",
  EXPIRE: "text-orange-600 bg-orange-50",
  ADJUST: "text-purple-600 bg-purple-50",
};

const orderStatusColors: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-800",
  CONFIRMED: "bg-blue-100 text-blue-800",
  PREPARING: "bg-orange-100 text-orange-800",
  READY: "bg-green-100 text-green-800",
  SERVED: "bg-gray-100 text-gray-800",
  COMPLETED: "bg-green-100 text-green-800",
  CANCELLED: "bg-red-100 text-red-800",
};

export default function CustomerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const customerId = params.id as string;
  const restaurant = params.restaurant as string;

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [canSeeSpendingData, setCanSeeSpendingData] = useState(false);

  // Edit mode
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    name: "",
    phone: "",
    email: "",
    dateOfBirth: "",
    tier: "",
    status: "",
  });
  const [saving, setSaving] = useState(false);

  // Points adjustment
  const [showPointsModal, setShowPointsModal] = useState(false);
  const [pointsType, setPointsType] = useState<"BONUS" | "ADJUST">("BONUS");
  const [pointsAmount, setPointsAmount] = useState("");
  const [pointsReason, setPointsReason] = useState("");
  const [adjustingPoints, setAdjustingPoints] = useState(false);

  // Notes
  const [newNote, setNewNote] = useState("");
  const [addingNote, setAddingNote] = useState(false);

  useEffect(() => {
    fetchCustomer();
  }, [customerId]);

  const fetchCustomer = async () => {
    try {
      const res = await fetch(`/api/loyalty/customers/${customerId}`);
      if (res.ok) {
        const data = await res.json();
        setCustomer(data.customer);
        setCanSeeSpendingData(data.canSeeSpendingData);
        setEditForm({
          name: data.customer.name || "",
          phone: data.customer.phone || "",
          email: data.customer.email || "",
          dateOfBirth: data.customer.dateOfBirth?.split("T")[0] || "",
          tier: data.customer.tier || "BRONZE",
          status: data.customer.status || "ACTIVE",
        });
      } else {
        router.push(`/${restaurant}/customers`);
      }
    } catch (error) {
      console.error("Error fetching customer:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!customer) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/loyalty/customers/${customerId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });

      if (res.ok) {
        await fetchCustomer();
        setEditing(false);
      } else {
        const error = await res.json();
        alert(error.error || "Failed to update customer");
      }
    } catch (error) {
      console.error("Error updating customer:", error);
      alert("Failed to update customer");
    } finally {
      setSaving(false);
    }
  };

  const handleAdjustPoints = async () => {
    if (!pointsAmount || parseInt(pointsAmount) === 0) return;

    setAdjustingPoints(true);
    try {
      const res = await fetch(`/api/loyalty/customers/${customerId}/points`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: pointsType,
          points: parseInt(pointsAmount),
          reason: pointsReason || undefined,
        }),
      });

      if (res.ok) {
        await fetchCustomer();
        setShowPointsModal(false);
        setPointsAmount("");
        setPointsReason("");
      } else {
        const error = await res.json();
        alert(error.error || "Failed to adjust points");
      }
    } catch (error) {
      console.error("Error adjusting points:", error);
      alert("Failed to adjust points");
    } finally {
      setAdjustingPoints(false);
    }
  };

  const handleAddNote = async () => {
    if (!newNote.trim()) return;

    setAddingNote(true);
    try {
      const res = await fetch(`/api/loyalty/customers/${customerId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note: newNote }),
      });

      if (res.ok) {
        await fetchCustomer();
        setNewNote("");
      } else {
        const error = await res.json();
        alert(error.error || "Failed to add note");
      }
    } catch (error) {
      console.error("Error adding note:", error);
      alert("Failed to add note");
    } finally {
      setAddingNote(false);
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    if (!confirm("Delete this note?")) return;

    try {
      const res = await fetch(`/api/loyalty/customers/${customerId}/notes?noteId=${noteId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        await fetchCustomer();
      }
    } catch (error) {
      console.error("Error deleting note:", error);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
        <p className="text-lg">Customer not found</p>
        <Link href={`/${restaurant}/customers`}>
          <Button className="mt-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Customers
          </Button>
        </Link>
      </div>
    );
  }

  const TierIcon = tierConfig[customer.tier]?.icon || Medal;
  const tierColor = tierConfig[customer.tier]?.color || "text-amber-700";
  const tierBgColor = tierConfig[customer.tier]?.bgColor || "bg-amber-100";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href={`/${restaurant}/customers`}>
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              {customer.name}
              <Badge className={cn(tierBgColor, tierColor, "border-0")}>
                <TierIcon className="h-3 w-3 mr-1" />
                {customer.tier}
              </Badge>
              {customer.status !== "ACTIVE" && (
                <Badge variant="outline" className="text-red-600 border-red-300">
                  {customer.status}
                </Badge>
              )}
            </h1>
            <p className="text-muted-foreground">{customer.customerId}</p>
          </div>
        </div>
        <div className="flex gap-2">
          {!editing ? (
            <Button variant="outline" onClick={() => setEditing(true)}>
              <Edit2 className="h-4 w-4 mr-2" />
              Edit
            </Button>
          ) : (
            <>
              <Button variant="outline" onClick={() => setEditing(false)}>
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                Save
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column - Profile & Points */}
        <div className="space-y-6">
          {/* Profile Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Profile
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {editing ? (
                <>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Name</label>
                    <Input
                      value={editForm.name}
                      onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Phone</label>
                    <Input
                      value={editForm.phone}
                      onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Email</label>
                    <Input
                      type="email"
                      value={editForm.email}
                      onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Date of Birth</label>
                    <Input
                      type="date"
                      value={editForm.dateOfBirth}
                      onChange={(e) => setEditForm({ ...editForm, dateOfBirth: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Tier</label>
                    <select
                      value={editForm.tier}
                      onChange={(e) => setEditForm({ ...editForm, tier: e.target.value })}
                      className="w-full px-3 py-2 border rounded-md bg-background"
                    >
                      <option value="BRONZE">Bronze</option>
                      <option value="SILVER">Silver</option>
                      <option value="GOLD">Gold</option>
                      <option value="PLATINUM">Platinum</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Status</label>
                    <select
                      value={editForm.status}
                      onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                      className="w-full px-3 py-2 border rounded-md bg-background"
                    >
                      <option value="ACTIVE">Active</option>
                      <option value="INACTIVE">Inactive</option>
                      <option value="BLOCKED">Blocked</option>
                    </select>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-3">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{customer.phone}</span>
                  </div>
                  {customer.email && (
                    <div className="flex items-center gap-3">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span>{customer.email}</span>
                    </div>
                  )}
                  {customer.dateOfBirth && (
                    <div className="flex items-center gap-3">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span>{formatDate(customer.dateOfBirth)}</span>
                    </div>
                  )}
                  <div className="pt-2 border-t text-sm text-muted-foreground">
                    Member since {formatDate(customer.createdAt)}
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Points Balance Card */}
          <Card className={tierBgColor}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Gift className={cn("h-5 w-5", tierColor)} />
                  Points Balance
                </span>
                <Button size="sm" variant="outline" onClick={() => setShowPointsModal(true)}>
                  <Plus className="h-4 w-4" />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={cn("text-4xl font-bold", tierColor)}>
                {customer.pointsBalance.toLocaleString()}
              </div>
              <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Lifetime Earned</p>
                  <p className="font-semibold text-green-600">
                    +{customer.pointsEarnedLifetime.toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Lifetime Redeemed</p>
                  <p className="font-semibold text-red-600">
                    -{customer.pointsRedeemedLifetime.toLocaleString()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Stats Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Statistics
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Visits</span>
                <span className="font-semibold">{customer.totalVisits}</span>
              </div>
              {canSeeSpendingData && customer.totalSpent !== null && (
                <>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total Spent</span>
                    <span className="font-semibold">Rs. {customer.totalSpent.toLocaleString()}</span>
                  </div>
                  {customer.averageOrderValue !== null && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Avg Order Value</span>
                      <span className="font-semibold">Rs. {customer.averageOrderValue.toLocaleString()}</span>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Middle Column - Points History */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Points History
            </CardTitle>
            <CardDescription>Recent points transactions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-[600px] overflow-y-auto">
              {customer.pointsTransactions.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No transactions yet</p>
              ) : (
                customer.pointsTransactions.map((tx) => (
                  <div key={tx.id} className="p-3 border rounded-lg">
                    <div className="flex items-center justify-between">
                      <Badge className={cn("border-0", transactionTypeColors[tx.type])}>
                        {tx.type}
                      </Badge>
                      <span className={cn("font-bold", tx.points > 0 ? "text-green-600" : "text-red-600")}>
                        {tx.points > 0 ? "+" : ""}{tx.points}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {tx.reason || (tx.order ? `Order ${tx.order.orderNumber}` : tx.bill ? `Bill ${tx.bill.billNumber}` : "Manual adjustment")}
                    </p>
                    <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
                      <span>{formatDateTime(tx.createdAt)}</span>
                      <span>Balance: {tx.balanceAfter}</span>
                    </div>
                    {tx.adjustedBy && (
                      <p className="text-xs text-muted-foreground mt-1">
                        By: {tx.adjustedBy.name}
                      </p>
                    )}
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Right Column - Orders & Notes */}
        <div className="space-y-6">
          {/* Recent Orders */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingBag className="h-5 w-5" />
                Recent Orders
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-[280px] overflow-y-auto">
                {customer.orders.length === 0 ? (
                  <p className="text-center text-muted-foreground py-4">No orders yet</p>
                ) : (
                  customer.orders.map((order) => (
                    <div key={order.id} className="p-3 border rounded-lg">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{order.orderNumber}</span>
                        <Badge className={cn("border-0", orderStatusColors[order.status])}>
                          {order.status}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between mt-2 text-sm">
                        <span className="text-muted-foreground">
                          {formatDateTime(order.placedAt)}
                        </span>
                        {canSeeSpendingData && order.totalAmount !== null && (
                          <span className="font-semibold">Rs. {order.totalAmount.toLocaleString()}</span>
                        )}
                      </div>
                      {(order.pointsEarned > 0 || order.pointsRedeemed > 0) && (
                        <div className="flex gap-3 mt-2 text-xs">
                          {order.pointsEarned > 0 && (
                            <span className="text-green-600">+{order.pointsEarned} earned</span>
                          )}
                          {order.pointsRedeemed > 0 && (
                            <span className="text-red-600">-{order.pointsRedeemed} redeemed</span>
                          )}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Notes
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Add Note */}
              <div className="flex gap-2">
                <Input
                  placeholder="Add a note..."
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddNote()}
                />
                <Button onClick={handleAddNote} disabled={addingNote || !newNote.trim()}>
                  {addingNote ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                </Button>
              </div>

              {/* Notes List */}
              <div className="space-y-3 max-h-[250px] overflow-y-auto">
                {customer.notes.length === 0 ? (
                  <p className="text-center text-muted-foreground py-4">No notes yet</p>
                ) : (
                  customer.notes.map((note) => (
                    <div key={note.id} className="p-3 bg-muted/50 rounded-lg group relative">
                      <p className="text-sm pr-6">{note.note}</p>
                      <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
                        <span>{note.addedBy.name}</span>
                        <span>{formatDateTime(note.createdAt)}</span>
                      </div>
                      <button
                        onClick={() => handleDeleteNote(note.id)}
                        className="absolute top-2 right-2 p-1 rounded hover:bg-red-100 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 className="h-3 w-3 text-red-500" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Points Adjustment Modal */}
      {showPointsModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Gift className="h-5 w-5" />
                Adjust Points
              </CardTitle>
              <CardDescription>
                Add bonus points or make adjustments to {customer.name}&apos;s balance
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Button
                  variant={pointsType === "BONUS" ? "default" : "outline"}
                  onClick={() => setPointsType("BONUS")}
                  className="flex-1"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Bonus
                </Button>
                <Button
                  variant={pointsType === "ADJUST" ? "default" : "outline"}
                  onClick={() => setPointsType("ADJUST")}
                  className="flex-1"
                >
                  <Minus className="h-4 w-4 mr-2" />
                  Adjust
                </Button>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Points {pointsType === "ADJUST" ? "(use negative for deduction)" : ""}
                </label>
                <Input
                  type="number"
                  placeholder="Enter points"
                  value={pointsAmount}
                  onChange={(e) => setPointsAmount(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Reason (optional)</label>
                <Input
                  placeholder="e.g., Birthday bonus, Compensation"
                  value={pointsReason}
                  onChange={(e) => setPointsReason(e.target.value)}
                />
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setShowPointsModal(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleAdjustPoints}
                  disabled={adjustingPoints || !pointsAmount}
                  className="flex-1"
                >
                  {adjustingPoints ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4 mr-2" />
                  )}
                  Confirm
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
