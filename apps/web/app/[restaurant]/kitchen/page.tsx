"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, Button, Badge } from "@qr-dine/ui";
import {
  Clock,
  CheckCircle,
  ChefHat,
  RefreshCw,
  AlertCircle,
  Flame,
  Timer,
  Package,
  Phone,
} from "lucide-react";

interface OrderItem {
  id: string;
  menuItemName: string;
  quantity: number;
  status: string;
  specialRequests: string | null;
  kitchenStation: string | null;
  isTakeaway: boolean;
}

interface Order {
  id: string;
  orderNumber: string;
  orderType: string;
  status: string;
  placedAt: string;
  table: {
    tableNumber: string;
  } | null;
  takeawayCustomerName: string | null;
  takeawayCustomerPhone: string | null;
  pickupToken: string | null;
  items: OrderItem[];
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
  PREPARING: "Cooking",
  READY: "Ready",
  SERVED: "Served",
};

export default function KitchenPage() {
  const params = useParams();
  const restaurant = params.restaurant as string;

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchOrders();
    // Auto-refresh every 10 seconds for kitchen
    const interval = setInterval(fetchOrders, 10000);
    return () => clearInterval(interval);
  }, []);

  const fetchOrders = async () => {
    try {
      const response = await fetch("/api/kitchen/orders");
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

  const updateItemStatus = async (orderId: string, itemId: string, newStatus: string) => {
    try {
      const response = await fetch(`/api/kitchen/orders/${orderId}/items/${itemId}`, {
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
      const response = await fetch(`/api/kitchen/orders/${orderId}/items`, {
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

  const isOrderUrgent = (placedAt: string): boolean => {
    const date = new Date(placedAt);
    const now = new Date();
    const diffMins = Math.floor((now.getTime() - date.getTime()) / 60000);
    return diffMins > 15;
  };

  // Group items by status for summary
  const pendingItems = orders.flatMap((o) =>
    o.items.filter((i) => ["PENDING", "SENT_TO_KITCHEN"].includes(i.status))
  ).length;
  const preparingItems = orders.flatMap((o) =>
    o.items.filter((i) => i.status === "PREPARING")
  ).length;
  const readyItems = orders.flatMap((o) =>
    o.items.filter((i) => i.status === "READY")
  ).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <ChefHat className="h-8 w-8 animate-pulse text-primary" />
        <p className="ml-2">Loading kitchen orders...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <ChefHat className="h-8 w-8" />
            Kitchen Display
          </h1>
          <div className="flex gap-4 mt-2 text-sm">
            <span className="flex items-center gap-1">
              <div className="h-3 w-3 rounded-full bg-yellow-500" />
              {pendingItems} pending
            </span>
            <span className="flex items-center gap-1">
              <div className="h-3 w-3 rounded-full bg-orange-500" />
              {preparingItems} cooking
            </span>
            <span className="flex items-center gap-1">
              <div className="h-3 w-3 rounded-full bg-green-500" />
              {readyItems} ready
            </span>
          </div>
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
            <ChefHat className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">No active orders</p>
            <p className="text-muted-foreground">
              New orders will appear here automatically
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {orders.map((order) => {
            const urgent = isOrderUrgent(order.placedAt);
            const allPending = order.items.every((i) =>
              ["PENDING", "SENT_TO_KITCHEN"].includes(i.status)
            );
            const allReady = order.items.every((i) => i.status === "READY");
            const isPhoneOrder = order.orderType === "PHONE";
            const isTakeawayOrder = order.orderType === "TAKEAWAY";
            const isPreOrder = isPhoneOrder || isTakeawayOrder; // Orders that need customer info
            const hasAnyTakeawayItem = order.items.some((i) => i.isTakeaway);

            return (
              <Card
                key={order.id}
                className={`${urgent ? "border-red-500 border-2 animate-pulse" : ""} ${isTakeawayOrder ? "border-amber-500 border-2" : ""} ${isPhoneOrder ? "border-blue-500 border-2" : ""}`}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                      #{order.orderNumber.split("-")[1]}
                      {urgent && <Flame className="h-5 w-5 text-red-500" />}
                      {isPhoneOrder && (
                        <Badge className="bg-blue-500 text-white text-xs">
                          <Phone className="h-3 w-3 mr-1" />
                          PHONE
                        </Badge>
                      )}
                      {isTakeawayOrder && (
                        <Badge className="bg-amber-500 text-white text-xs">
                          <Package className="h-3 w-3 mr-1" />
                          TAKEAWAY
                        </Badge>
                      )}
                    </CardTitle>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Timer className="h-4 w-4" />
                      {getTimeAgo(order.placedAt)}
                    </div>
                  </div>
                  {isPreOrder ? (
                    <div className="space-y-1">
                      {order.pickupToken && (
                        <p className={`text-lg font-bold ${isPhoneOrder ? "text-blue-600" : "text-amber-600"}`}>
                          Token: {order.pickupToken}
                        </p>
                      )}
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {order.takeawayCustomerName || order.takeawayCustomerPhone}
                      </p>
                    </div>
                  ) : order.table ? (
                    <p className="text-sm font-medium text-primary">
                      Table {order.table.tableNumber}
                      {hasAnyTakeawayItem && (
                        <span className="ml-2 text-xs text-amber-600">
                          (has takeaway items)
                        </span>
                      )}
                    </p>
                  ) : null}
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* Order Items */}
                  <div className="space-y-2">
                    {order.items.map((item) => {
                      const nextStatus = getNextItemStatus(item.status);

                      // Show packing indicator only for actual takeaway (not phone orders eaten at restaurant)
                      const needsPackaging = item.isTakeaway && (isTakeawayOrder || (!isPhoneOrder && !isTakeawayOrder));

                      return (
                        <div
                          key={item.id}
                          className={`p-3 rounded-lg border-2 ${itemStatusColors[item.status]} ${needsPackaging && !isTakeawayOrder ? "ring-2 ring-amber-400 ring-offset-1" : ""}`}
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
                                {needsPackaging && !isTakeawayOrder && (
                                  <Badge className="bg-amber-500 text-white text-xs">
                                    <Package className="h-3 w-3" />
                                  </Badge>
                                )}
                              </div>
                              {item.specialRequests && (
                                <p className="text-xs mt-1 flex items-start gap-1">
                                  <AlertCircle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                                  {item.specialRequests}
                                </p>
                              )}
                              {needsPackaging && (
                                <p className="text-xs mt-1 text-amber-600 font-medium">
                                  Pack for takeaway
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
                                  <ChefHat className="mr-1 h-4 w-4" />
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
                        <ChefHat className="mr-2 h-4 w-4" />
                        Start All Items
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
                          Order Ready for Service
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
