"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, Button, Badge } from "@qr-dine/ui";
import {
  Clock,
  CheckCircle,
  XCircle,
  ChefHat,
  Bell,
  RefreshCw,
  Users,
  Receipt,
  HandPlatter,
} from "lucide-react";
import { useRouter } from "next/navigation";

interface OrderItem {
  id: string;
  menuItemName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  status: string;
  specialRequests: string | null;
  // Time tracking
  createdAt: string;
  sentToKitchenAt: string | null;
  preparingAt: string | null;
  readyAt: string | null;
  servedAt: string | null;
  foodPickedAt: string | null;
}

interface Order {
  id: string;
  orderNumber: string;
  status: string;
  orderSource: string;
  subtotal: number;
  totalAmount: number;
  placedAt: string;
  table: {
    tableNumber: string;
    name: string | null;
  } | null;
  items: OrderItem[];
}

const statusColors: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-800",
  PENDING_CONFIRMATION: "bg-purple-100 text-purple-800 animate-pulse",
  CONFIRMED: "bg-blue-100 text-blue-800",
  PREPARING: "bg-orange-100 text-orange-800",
  READY: "bg-green-100 text-green-800",
  SERVED: "bg-gray-100 text-gray-800",
  COMPLETED: "bg-gray-100 text-gray-800",
  CANCELLED: "bg-red-100 text-red-800",
};

const statusLabels: Record<string, string> = {
  PENDING: "Pending",
  PENDING_CONFIRMATION: "Needs Confirmation",
  CONFIRMED: "Confirmed",
  PREPARING: "Preparing",
  READY: "Ready",
  SERVED: "Served",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

export default function OrdersPage() {
  const params = useParams();
  const router = useRouter();
  const restaurant = params.restaurant as string;

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("active");
  const [refreshing, setRefreshing] = useState(false);
  const [generatingBill, setGeneratingBill] = useState<string | null>(null);

  // Confirmation modal state
  const [confirmingOrder, setConfirmingOrder] = useState<Order | null>(null);
  const [guestCount, setGuestCount] = useState<number>(2);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [rejectingOrder, setRejectingOrder] = useState<Order | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [servingItem, setServingItem] = useState<string | null>(null);

  useEffect(() => {
    fetchOrders();
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchOrders, 30000);
    return () => clearInterval(interval);
  }, [filter]);

  const fetchOrders = async () => {
    try {
      const response = await fetch(`/api/orders?status=${filter}`);
      const data = await response.json();
      if (response.ok) {
        setOrders(data.orders);
      }
    } catch (err) {
      console.error("Failed to fetch orders:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchOrders();
  };

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      const response = await fetch(`/api/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        fetchOrders();
      }
    } catch (err) {
      console.error("Failed to update order:", err);
    }
  };

  const getNextStatus = (currentStatus: string): string | null => {
    const flow: Record<string, string> = {
      PENDING: "CONFIRMED",
      PENDING_CONFIRMATION: "CONFIRMED",
      CONFIRMED: "PREPARING",
      PREPARING: "READY",
      READY: "SERVED",
      SERVED: "COMPLETED",
    };
    return flow[currentStatus] || null;
  };

  // Confirm order with guest count (for PENDING_CONFIRMATION orders)
  const confirmOrderWithGuestCount = async () => {
    if (!confirmingOrder) return;

    setConfirmLoading(true);
    try {
      const response = await fetch(`/api/orders/${confirmingOrder.id}/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guestCount }),
      });

      if (response.ok) {
        setConfirmingOrder(null);
        setGuestCount(2);
        fetchOrders();
      } else {
        const data = await response.json();
        alert(data.error || "Failed to confirm order");
      }
    } catch (err) {
      console.error("Failed to confirm order:", err);
      alert("Failed to confirm order");
    } finally {
      setConfirmLoading(false);
    }
  };

  // Reject order with reason
  const rejectOrderWithReason = async () => {
    if (!rejectingOrder || !rejectReason.trim()) {
      alert("Please enter a rejection reason");
      return;
    }

    setConfirmLoading(true);
    try {
      const response = await fetch(`/api/orders/${rejectingOrder.id}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: rejectReason }),
      });

      if (response.ok) {
        setRejectingOrder(null);
        setRejectReason("");
        fetchOrders();
      } else {
        const data = await response.json();
        alert(data.error || "Failed to reject order");
      }
    } catch (err) {
      console.error("Failed to reject order:", err);
      alert("Failed to reject order");
    } finally {
      setConfirmLoading(false);
    }
  };

  const generateBill = async (orderId: string) => {
    setGeneratingBill(orderId);
    try {
      const response = await fetch("/api/bills", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId }),
      });

      const data = await response.json();

      if (response.ok) {
        router.push(`/${restaurant}/billing?billId=${data.bill.id}`);
      } else {
        alert(data.error || "Failed to generate bill");
      }
    } catch (err) {
      console.error("Failed to generate bill:", err);
      alert("Failed to generate bill");
    } finally {
      setGeneratingBill(null);
    }
  };

  const getTimeAgo = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${Math.floor(diffHours / 24)}d ago`;
  };

  const formatTime = (dateString: string | null): string => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const getItemStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      PENDING: "bg-yellow-100 text-yellow-800",
      SENT_TO_KITCHEN: "bg-blue-100 text-blue-800",
      PREPARING: "bg-orange-100 text-orange-800",
      READY: "bg-green-100 text-green-800",
      SERVED: "bg-gray-100 text-gray-800",
      CANCELLED: "bg-red-100 text-red-800",
    };
    const labels: Record<string, string> = {
      PENDING: "Pending",
      SENT_TO_KITCHEN: "Queued",
      PREPARING: "Cooking",
      READY: "Ready",
      SERVED: "Served",
      CANCELLED: "Cancelled",
    };
    return { color: colors[status] || "bg-gray-100", label: labels[status] || status };
  };

  const markItemServed = async (orderId: string, itemId: string) => {
    setServingItem(itemId);
    try {
      const response = await fetch(`/api/orders/${orderId}/items/${itemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "SERVED" }),
      });

      if (response.ok) {
        fetchOrders();
      }
    } catch (err) {
      console.error("Failed to mark item as served:", err);
    } finally {
      setServingItem(null);
    }
  };

  const activeOrders = orders.filter((o) =>
    ["PENDING", "PENDING_CONFIRMATION", "CONFIRMED", "PREPARING", "READY"].includes(o.status)
  );
  const pendingCount = orders.filter((o) => o.status === "PENDING").length;
  const pendingConfirmationCount = orders.filter((o) => o.status === "PENDING_CONFIRMATION").length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p>Loading orders...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Orders</h1>
          <p className="text-muted-foreground">
            {activeOrders.length} active orders
            {pendingConfirmationCount > 0 && (
              <span className="ml-2 text-purple-600 font-medium">
                ({pendingConfirmationCount} need confirmation)
              </span>
            )}
            {pendingCount > 0 && (
              <span className="ml-2 text-yellow-600">
                ({pendingCount} pending)
              </span>
            )}
          </p>
        </div>
        <Button onClick={handleRefresh} variant="outline" disabled={refreshing}>
          <RefreshCw
            className={`mr-2 h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
          />
          Refresh
        </Button>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {["active", "all", "completed", "cancelled"].map((tab) => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              filter === tab
                ? "bg-primary text-primary-foreground"
                : "bg-muted hover:bg-muted/80"
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Orders Grid */}
      {orders.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Bell className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">No orders yet</p>
            <p className="text-muted-foreground">
              Orders will appear here when customers place them
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {orders.map((order) => {
            const nextStatus = getNextStatus(order.status);

            return (
              <Card
                key={order.id}
                className={
                  order.status === "PENDING_CONFIRMATION"
                    ? "border-purple-500 border-2 shadow-lg shadow-purple-100"
                    : order.status === "PENDING"
                    ? "border-yellow-500 border-2"
                    : ""
                }
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">
                      #{order.orderNumber}
                    </CardTitle>
                    <Badge className={statusColors[order.status]}>
                      {statusLabels[order.status]}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    {order.table && (
                      <span className="flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        Table {order.table.tableNumber}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {getTimeAgo(order.placedAt)}
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Order Items with Timeline */}
                  <div className="space-y-3">
                    {order.items.map((item) => {
                      const statusBadge = getItemStatusBadge(item.status);
                      const isReady = item.status === "READY";
                      const isServing = servingItem === item.id;
                      return (
                        <div
                          key={item.id}
                          className={`p-2 border rounded-lg ${isReady ? "bg-green-50 border-green-200" : "bg-muted/30"}`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">
                                  {item.quantity}x {item.menuItemName}
                                </span>
                                <Badge className={`text-xs ${statusBadge.color}`}>
                                  {statusBadge.label}
                                </Badge>
                              </div>
                              {item.specialRequests && (
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  Note: {item.specialRequests}
                                </p>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-muted-foreground">
                                Rs. {item.totalPrice.toFixed(2)}
                              </span>
                              {isReady && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 px-2 text-xs bg-green-600 text-white hover:bg-green-700 border-green-600"
                                  onClick={() => markItemServed(order.id, item.id)}
                                  disabled={isServing}
                                >
                                  <HandPlatter className="h-3 w-3 mr-1" />
                                  {isServing ? "..." : "Serve"}
                                </Button>
                              )}
                            </div>
                          </div>
                          {/* Item Timeline */}
                          <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground overflow-x-auto">
                            <span className="flex items-center gap-1 whitespace-nowrap">
                              <Clock className="h-3 w-3" />
                              Ordered: {formatTime(item.createdAt)}
                            </span>
                            {item.sentToKitchenAt && (
                              <>
                                <span className="text-gray-300">→</span>
                                <span className="whitespace-nowrap text-blue-600">
                                  Kitchen: {formatTime(item.sentToKitchenAt)}
                                </span>
                              </>
                            )}
                            {item.preparingAt && (
                              <>
                                <span className="text-gray-300">→</span>
                                <span className="whitespace-nowrap text-orange-600">
                                  Cooking: {formatTime(item.preparingAt)}
                                </span>
                              </>
                            )}
                            {item.readyAt && (
                              <>
                                <span className="text-gray-300">→</span>
                                <span className="whitespace-nowrap text-green-600">
                                  Ready: {formatTime(item.readyAt)}
                                </span>
                              </>
                            )}
                            {item.servedAt && (
                              <>
                                <span className="text-gray-300">→</span>
                                <span className="whitespace-nowrap text-gray-600">
                                  Served: {formatTime(item.servedAt)}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Total */}
                  <div className="flex items-center justify-between pt-2 border-t font-medium">
                    <span>Total</span>
                    <span>Rs. {order.totalAmount.toFixed(2)}</span>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-2">
                    {/* PENDING_CONFIRMATION: Staff must confirm with guest count */}
                    {order.status === "PENDING_CONFIRMATION" && (
                      <>
                        <Button
                          onClick={() => setConfirmingOrder(order)}
                          className="flex-1 bg-purple-600 hover:bg-purple-700"
                          size="sm"
                        >
                          <CheckCircle className="mr-2 h-4 w-4" />
                          Confirm Order
                        </Button>
                        <Button
                          onClick={() => setRejectingOrder(order)}
                          variant="destructive"
                          size="sm"
                        >
                          <XCircle className="h-4 w-4" />
                        </Button>
                      </>
                    )}

                    {/* PENDING: Accept or Reject */}
                    {order.status === "PENDING" && (
                      <>
                        <Button
                          onClick={() => updateOrderStatus(order.id, "CONFIRMED")}
                          className="flex-1"
                          size="sm"
                        >
                          <CheckCircle className="mr-2 h-4 w-4" />
                          Accept
                        </Button>
                        <Button
                          onClick={() => updateOrderStatus(order.id, "CANCELLED")}
                          variant="destructive"
                          size="sm"
                        >
                          <XCircle className="h-4 w-4" />
                        </Button>
                      </>
                    )}

                    {/* CONFIRMED/PREPARING: Show status only - Kitchen handles these */}
                    {(order.status === "CONFIRMED" || order.status === "PREPARING") && (
                      <div className="flex-1 text-center text-sm text-muted-foreground py-2">
                        <ChefHat className="inline h-4 w-4 mr-1" />
                        {order.status === "CONFIRMED" ? "Waiting for kitchen" : "Being prepared"}
                      </div>
                    )}

                    {/* READY: Waiter marks as served */}
                    {order.status === "READY" && (
                      <Button
                        onClick={() => updateOrderStatus(order.id, "SERVED")}
                        className="flex-1"
                        size="sm"
                      >
                        <CheckCircle className="mr-2 h-4 w-4" />
                        Mark Served
                      </Button>
                    )}

                    {/* SERVED: Generate Bill or Complete */}
                    {order.status === "SERVED" && (
                      <>
                        <Button
                          onClick={() => generateBill(order.id)}
                          className="flex-1"
                          size="sm"
                          disabled={generatingBill === order.id}
                        >
                          <Receipt className="mr-2 h-4 w-4" />
                          {generatingBill === order.id ? "Generating..." : "Generate Bill"}
                        </Button>
                        <Button
                          onClick={() => updateOrderStatus(order.id, "COMPLETED")}
                          variant="outline"
                          size="sm"
                        >
                          <CheckCircle className="h-4 w-4" />
                        </Button>
                      </>
                    )}

                    {/* COMPLETED: View/Generate Bill if needed */}
                    {order.status === "COMPLETED" && (
                      <Button
                        onClick={() => generateBill(order.id)}
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        disabled={generatingBill === order.id}
                      >
                        <Receipt className="mr-2 h-4 w-4" />
                        {generatingBill === order.id ? "Generating..." : "View Bill"}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Confirmation Modal */}
      {confirmingOrder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-purple-600" />
                Confirm Order #{confirmingOrder.orderNumber}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground mb-2">
                  Table: {confirmingOrder.table?.tableNumber || "N/A"}
                </p>
                <p className="text-sm text-muted-foreground mb-4">
                  Items: {confirmingOrder.items.length} | Total: Rs. {confirmingOrder.totalAmount.toFixed(2)}
                </p>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">
                  Number of Guests *
                </label>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setGuestCount(Math.max(1, guestCount - 1))}
                    disabled={guestCount <= 1}
                  >
                    -
                  </Button>
                  <input
                    type="number"
                    min="1"
                    value={guestCount}
                    onChange={(e) => setGuestCount(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-20 text-center border rounded-md py-2"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setGuestCount(guestCount + 1)}
                  >
                    +
                  </Button>
                  <Users className="h-4 w-4 text-muted-foreground ml-2" />
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setConfirmingOrder(null);
                    setGuestCount(2);
                  }}
                  disabled={confirmLoading}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1 bg-purple-600 hover:bg-purple-700"
                  onClick={confirmOrderWithGuestCount}
                  disabled={confirmLoading}
                >
                  {confirmLoading ? "Confirming..." : "Confirm & Send to Kitchen"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Rejection Modal */}
      {rejectingOrder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-600">
                <XCircle className="h-5 w-5" />
                Reject Order #{rejectingOrder.orderNumber}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground mb-4">
                  Table: {rejectingOrder.table?.tableNumber || "N/A"} |
                  Items: {rejectingOrder.items.length} |
                  Total: Rs. {rejectingOrder.totalAmount.toFixed(2)}
                </p>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">
                  Rejection Reason *
                </label>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  className="w-full border rounded-md p-2 min-h-[80px]"
                  placeholder="Enter reason for rejection..."
                />
              </div>

              <div className="flex flex-wrap gap-2">
                {["Table not ready", "Kitchen closed", "Items unavailable", "Customer left"].map((reason) => (
                  <button
                    key={reason}
                    type="button"
                    onClick={() => setRejectReason(reason)}
                    className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded"
                  >
                    {reason}
                  </button>
                ))}
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setRejectingOrder(null);
                    setRejectReason("");
                  }}
                  disabled={confirmLoading}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  className="flex-1"
                  onClick={rejectOrderWithReason}
                  disabled={confirmLoading || !rejectReason.trim()}
                >
                  {confirmLoading ? "Rejecting..." : "Reject Order"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
