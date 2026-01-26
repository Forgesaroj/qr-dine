"use client";

import { useState, useEffect } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, Button, Badge } from "@qr-dine/ui";
import {
  ArrowLeft,
  Clock,
  CheckCircle,
  ChefHat,
  Bell,
  UtensilsCrossed,
  Loader2,
  RefreshCw,
  Receipt,
  Plus,
} from "lucide-react";
import { useGuest } from "../GuestContext";

interface OrderItem {
  id: string;
  menuItemName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  status: string;
  specialRequests: string | null;
}

interface Order {
  id: string;
  orderNumber: string;
  status: string;
  items: OrderItem[];
  subtotal: number;
  totalAmount: number;
  placedAt: string;
  table: {
    tableNumber: string;
    name: string | null;
  } | null;
  bills: Array<{
    id: string;
    billNumber: string;
    status: string;
    totalAmount: number;
  }>;
}

const statusConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  PENDING: { label: "Waiting for confirmation", color: "bg-yellow-100 text-yellow-800", icon: Clock },
  CONFIRMED: { label: "Order confirmed", color: "bg-blue-100 text-blue-800", icon: CheckCircle },
  PREPARING: { label: "Being prepared", color: "bg-orange-100 text-orange-800", icon: ChefHat },
  READY: { label: "Ready for pickup", color: "bg-green-100 text-green-800", icon: Bell },
  SERVED: { label: "Served", color: "bg-gray-100 text-gray-800", icon: UtensilsCrossed },
  COMPLETED: { label: "Completed", color: "bg-gray-100 text-gray-800", icon: CheckCircle },
  CANCELLED: { label: "Cancelled", color: "bg-red-100 text-red-800", icon: Clock },
};

const itemStatusConfig: Record<string, { label: string; color: string }> = {
  PENDING: { label: "Pending", color: "bg-yellow-100 text-yellow-800" },
  SENT_TO_KITCHEN: { label: "In Queue", color: "bg-blue-100 text-blue-800" },
  PREPARING: { label: "Cooking", color: "bg-orange-100 text-orange-800" },
  READY: { label: "Ready", color: "bg-green-100 text-green-800" },
  SERVED: { label: "Served", color: "bg-gray-100 text-gray-800" },
};

export default function GuestOrderPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const { session } = useGuest();

  const restaurantSlug = params.restaurant as string;
  const tableId = params.table as string;
  const orderId = searchParams.get("id");

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchOrder = async () => {
    if (!orderId) {
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(
        `/api/guest/order?id=${orderId}&session=${session?.sessionId || ""}`
      );

      // Check content type before parsing
      const contentType = res.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        console.error("API returned non-JSON response");
        setLoading(false);
        setRefreshing(false);
        return;
      }

      const data = await res.json();

      if (res.ok) {
        setOrder(data.order);
      }
    } catch (err) {
      console.error("Failed to fetch order:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchOrder();
    // Auto-refresh every 15 seconds
    const interval = setInterval(fetchOrder, 15000);
    return () => clearInterval(interval);
  }, [orderId, session?.sessionId]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchOrder();
  };

  const getTimeAgo = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins} min ago`;
    const diffHours = Math.floor(diffMins / 60);
    return `${diffHours}h ${diffMins % 60}m ago`;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <p className="text-lg mb-4">Order not found</p>
        <Link href={`/m/${restaurantSlug}/${tableId}/menu`}>
          <Button>Back to Menu</Button>
        </Link>
      </div>
    );
  }

  const StatusIcon = statusConfig[order.status]?.icon || Clock;
  const hasBill = order.bills && order.bills.length > 0;

  return (
    <div className="min-h-screen pb-24">
      {/* Header */}
      <div className="sticky top-0 bg-background border-b p-4 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href={`/m/${restaurantSlug}/${tableId}/menu`}>
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-xl font-bold">Order #{order.orderNumber.split("-")[1]}</h1>
              <p className="text-sm text-muted-foreground">
                Table {order.table?.tableNumber} • {getTimeAgo(order.placedAt)}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw className={`h-5 w-5 ${refreshing ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* Order Status */}
      <div className="p-4">
        <Card className="overflow-hidden">
          <div className={`p-4 ${statusConfig[order.status]?.color || "bg-gray-100"}`}>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/50 rounded-full flex items-center justify-center">
                <StatusIcon className="h-6 w-6" />
              </div>
              <div>
                <p className="font-semibold text-lg">
                  {statusConfig[order.status]?.label || order.status}
                </p>
                {order.status === "PENDING" && (
                  <p className="text-sm opacity-80">
                    A waiter will confirm your order shortly
                  </p>
                )}
                {order.status === "PREPARING" && (
                  <p className="text-sm opacity-80">
                    Your food is being prepared
                  </p>
                )}
                {order.status === "READY" && (
                  <p className="text-sm opacity-80">
                    Your order is ready! It will be served soon.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Progress Steps */}
          <CardContent className="p-4">
            <div className="flex justify-between items-center">
              {["CONFIRMED", "PREPARING", "READY", "SERVED"].map((step, index) => {
                const isCompleted =
                  ["CONFIRMED", "PREPARING", "READY", "SERVED", "COMPLETED"].indexOf(order.status) >=
                  ["CONFIRMED", "PREPARING", "READY", "SERVED"].indexOf(step);
                const isCurrent = order.status === step;

                return (
                  <div key={step} className="flex flex-col items-center flex-1">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        isCompleted
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground"
                      } ${isCurrent ? "ring-2 ring-primary ring-offset-2" : ""}`}
                    >
                      {index + 1}
                    </div>
                    <p className="text-xs mt-1 text-center">
                      {step.charAt(0) + step.slice(1).toLowerCase()}
                    </p>
                    {index < 3 && (
                      <div
                        className={`absolute h-0.5 w-full ${
                          isCompleted ? "bg-primary" : "bg-muted"
                        }`}
                        style={{ left: "50%", top: "50%" }}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Order Items */}
      <div className="px-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Order Items</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {order.items.map((item) => (
              <div
                key={item.id}
                className="flex items-start justify-between py-2 border-b last:border-0"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">
                      {item.quantity}x {item.menuItemName}
                    </span>
                    <Badge
                      variant="outline"
                      className={`text-xs ${itemStatusConfig[item.status]?.color || ""}`}
                    >
                      {itemStatusConfig[item.status]?.label || item.status}
                    </Badge>
                  </div>
                  {item.specialRequests && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Note: {item.specialRequests}
                    </p>
                  )}
                </div>
                <span className="text-sm">Rs. {item.totalPrice}</span>
              </div>
            ))}

            {/* Total */}
            <div className="flex justify-between pt-3 font-semibold">
              <span>Subtotal</span>
              <span>Rs. {order.subtotal}</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Tax and service charge will be added to your final bill
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Actions */}
      <div className="fixed bottom-0 left-0 right-0 bg-background border-t p-4 z-40">
        <div className="flex gap-3">
          <Link href={`/m/${restaurantSlug}/${tableId}/menu`} className="flex-1">
            <Button variant="outline" className="w-full">
              <Plus className="mr-2 h-4 w-4" />
              Add More Items
            </Button>
          </Link>
          {hasBill ? (
            <Button className="flex-1" disabled>
              <Receipt className="mr-2 h-4 w-4" />
              Bill Generated
            </Button>
          ) : (
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => {
                // TODO: Implement request bill functionality
                alert("A waiter will bring your bill shortly.");
              }}
            >
              <Receipt className="mr-2 h-4 w-4" />
              Request Bill
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
