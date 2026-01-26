"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, Button, Badge } from "@qr-dine/ui";
import {
  Clock,
  CheckCircle,
  RefreshCw,
  AlertCircle,
  Flame,
  Timer,
  Wine,
  GlassWater,
  Coffee,
} from "lucide-react";

interface OrderItem {
  id: string;
  menuItemName: string;
  quantity: number;
  status: string;
  specialRequests: string | null;
  kitchenStation: string | null;
  variantName: string | null;
  createdAt: string;
}

interface Order {
  id: string;
  orderNumber: string;
  status: string;
  placedAt: string;
  table: {
    tableNumber: string;
    name: string | null;
  } | null;
  items: OrderItem[];
  metrics: {
    waitingTime: number;
    itemCount: number;
    isUrgent: boolean;
  };
}

interface Stats {
  totalOrders: number;
  totalItems: number;
  pendingItems: number;
  preparingItems: number;
  readyItems: number;
  urgentOrders: number;
}

const itemStatusColors: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-800 border-yellow-300",
  SENT_TO_KITCHEN: "bg-blue-100 text-blue-800 border-blue-300",
  PREPARING: "bg-orange-100 text-orange-800 border-orange-300",
  READY: "bg-green-100 text-green-800 border-green-300",
  SERVED: "bg-gray-100 text-gray-800 border-gray-300",
};

const itemStatusLabels: Record<string, string> = {
  PENDING: "Pending",
  SENT_TO_KITCHEN: "Queued",
  PREPARING: "Mixing",
  READY: "Ready",
  SERVED: "Served",
};

export default function BarDisplayPage() {
  const params = useParams();
  const restaurant = params.restaurant as string;

  const [orders, setOrders] = useState<Order[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchOrders();
    // Auto-refresh every 10 seconds for bar
    const interval = setInterval(fetchOrders, 10000);
    return () => clearInterval(interval);
  }, []);

  const fetchOrders = async () => {
    try {
      const response = await fetch("/api/bar/orders");
      const data = await response.json();
      if (response.ok) {
        setOrders(data.orders);
        setStats(data.stats);
      }
    } catch (err) {
      console.error("Failed to fetch bar orders:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchOrders();
  };

  const updateItemStatus = async (orderId: string, itemId: string, newStatus: string) => {
    try {
      const response = await fetch(`/api/bar/orders/${orderId}/items/${itemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        fetchOrders();
      }
    } catch (err) {
      console.error("Failed to update item:", err);
    }
  };

  const markAllItemsStatus = async (orderId: string, newStatus: string) => {
    try {
      const response = await fetch(`/api/bar/orders/${orderId}/items`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        fetchOrders();
      }
    } catch (err) {
      console.error("Failed to update items:", err);
    }
  };

  const getTimeAgo = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m`;
    const diffHours = Math.floor(diffMins / 60);
    return `${diffHours}h ${diffMins % 60}m`;
  };

  const getNextItemStatus = (currentStatus: string): string | null => {
    const flow: Record<string, string> = {
      PENDING: "PREPARING",
      SENT_TO_KITCHEN: "PREPARING",
      PREPARING: "READY",
    };
    return flow[currentStatus] || null;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Wine className="h-8 w-8 animate-pulse text-primary" />
        <p className="ml-2">Loading bar orders...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Wine className="h-8 w-8" />
            Bar Display
          </h1>
          {stats && (
            <div className="flex gap-4 mt-2 text-sm">
              <span className="flex items-center gap-1">
                <div className="h-3 w-3 rounded-full bg-yellow-500" />
                {stats.pendingItems} pending
              </span>
              <span className="flex items-center gap-1">
                <div className="h-3 w-3 rounded-full bg-orange-500" />
                {stats.preparingItems} mixing
              </span>
              <span className="flex items-center gap-1">
                <div className="h-3 w-3 rounded-full bg-green-500" />
                {stats.readyItems} ready
              </span>
              {stats.urgentOrders > 0 && (
                <span className="flex items-center gap-1 text-red-600">
                  <Flame className="h-4 w-4" />
                  {stats.urgentOrders} urgent
                </span>
              )}
            </div>
          )}
        </div>
        <Button onClick={handleRefresh} variant="outline" disabled={refreshing}>
          <RefreshCw
            className={`mr-2 h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
          />
          Refresh
        </Button>
      </div>

      {/* Orders Grid */}
      {orders.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <GlassWater className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">No drink orders</p>
            <p className="text-muted-foreground">
              New drink orders will appear here automatically
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {orders.map((order) => {
            const urgent = order.metrics.isUrgent;
            const allPending = order.items.every((i) =>
              ["PENDING", "SENT_TO_KITCHEN"].includes(i.status)
            );
            const allReady = order.items.every((i) => i.status === "READY");

            return (
              <Card
                key={order.id}
                className={`${urgent ? "border-red-500 border-2 animate-pulse" : ""}`}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                      #{order.orderNumber.split("-")[1]}
                      {urgent && <Flame className="h-5 w-5 text-red-500" />}
                    </CardTitle>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Timer className="h-4 w-4" />
                      {order.metrics.waitingTime}m
                    </div>
                  </div>
                  {order.table && (
                    <p className="text-sm font-medium text-primary">
                      Table {order.table.tableNumber}
                      {order.table.name && ` - ${order.table.name}`}
                    </p>
                  )}
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* Order Items */}
                  <div className="space-y-2">
                    {order.items.map((item) => {
                      const nextStatus = getNextItemStatus(item.status);

                      return (
                        <div
                          key={item.id}
                          className={`p-3 rounded-lg border-2 ${itemStatusColors[item.status]}`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-lg">
                                  {item.quantity}x
                                </span>
                                <span className="font-medium">
                                  {item.menuItemName}
                                </span>
                              </div>
                              {item.variantName && (
                                <p className="text-xs text-muted-foreground">
                                  {item.variantName}
                                </p>
                              )}
                              {item.specialRequests && (
                                <p className="text-xs mt-1 flex items-start gap-1">
                                  <AlertCircle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                                  {item.specialRequests}
                                </p>
                              )}
                            </div>
                            <Badge
                              variant="outline"
                              className={`text-xs ${itemStatusColors[item.status]}`}
                            >
                              {itemStatusLabels[item.status]}
                            </Badge>
                          </div>

                          {/* Item Action Button */}
                          {nextStatus && (
                            <Button
                              size="sm"
                              className="w-full mt-2"
                              onClick={() =>
                                updateItemStatus(order.id, item.id, nextStatus)
                              }
                            >
                              {item.status === "PREPARING" ? (
                                <>
                                  <CheckCircle className="mr-1 h-4 w-4" />
                                  Ready
                                </>
                              ) : (
                                <>
                                  <Coffee className="mr-1 h-4 w-4" />
                                  Start
                                </>
                              )}
                            </Button>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Bulk Actions */}
                  <div className="pt-2 border-t space-y-2">
                    {allPending && (
                      <Button
                        size="sm"
                        className="w-full"
                        onClick={() => markAllItemsStatus(order.id, "PREPARING")}
                      >
                        <Coffee className="mr-2 h-4 w-4" />
                        Start All Drinks
                      </Button>
                    )}
                    {!allPending && !allReady && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full"
                        onClick={() => markAllItemsStatus(order.id, "READY")}
                      >
                        <CheckCircle className="mr-2 h-4 w-4" />
                        Mark All Ready
                      </Button>
                    )}
                    {allReady && (
                      <div className="text-center py-2">
                        <Badge className="bg-green-500 text-white">
                          <CheckCircle className="mr-1 h-4 w-4" />
                          Drinks Ready for Service
                        </Badge>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
