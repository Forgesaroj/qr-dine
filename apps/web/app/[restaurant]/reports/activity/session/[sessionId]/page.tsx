"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Button,
} from "@qr-dine/ui";
import {
  ArrowLeft,
  Loader2,
  Users,
  FileText,
  ChefHat,
  UtensilsCrossed,
  Receipt,
  AlertTriangle,
  Check,
  Droplet,
  Clock,
  DollarSign,
  Percent,
  Bell,
  Sparkles,
  LogIn,
  LogOut,
} from "lucide-react";

interface SessionData {
  session: {
    id: string;
    tableId: string;
    tableNumber: string;
    tableName?: string;
    guestCount: number;
    status: string;
    startedAt: string;
    endedAt: string | null;
    startedBy?: { id: string; name: string; role: string };
    waiter?: { id: string; name: string; role: string };
    notes?: string;
  };
  orders: Array<{
    id: string;
    orderNumber: number;
    status: string;
    itemCount: number;
    totalQuantity: number;
    totalAmount: number;
    placedAt: string;
    items: Array<{
      id: string;
      name: string;
      quantity: number;
      status: string;
      totalPrice: number;
    }>;
  }>;
  bills: Array<{
    id: string;
    billNumber: number;
    subtotal: number;
    discountAmount: number;
    totalAmount: number;
    paymentStatus: string;
    payments: Array<{
      id: string;
      amount: number;
      method: string;
      status: string;
      paidAt?: string;
    }>;
  }>;
  activities: Array<{
    id: string;
    activityType: string;
    activityCategory: string;
    description: string;
    priority: string;
    performedBy: string;
    userName?: string;
    userRole?: string;
    details?: Record<string, unknown>;
    createdAt: string;
  }>;
  metrics: {
    duration: number;
    durationFormatted: string;
    totalOrders: number;
    totalItems: number;
    totalQuantity: number;
    totalBillAmount: number;
    totalPayments: number;
    totalDiscount: number;
    isPaid: boolean;
    activityCount: number;
    issueCount: number;
  };
}

const ACTIVITY_ICONS: Record<string, typeof Users> = {
  table_seated: Users,
  session_started: LogIn,
  guest_count_updated: Users,
  order_placed: FileText,
  items_added: FileText,
  kitchen_received: ChefHat,
  prep_started: ChefHat,
  item_ready: Check,
  bar_received: Droplet,
  drink_started: Droplet,
  drink_ready: Check,
  water_served: Droplet,
  food_picked_up: UtensilsCrossed,
  food_served: UtensilsCrossed,
  drink_served: Droplet,
  assistance_requested: Bell,
  assistance_acknowledged: Bell,
  assistance_completed: Check,
  food_issue_reported: AlertTriangle,
  discount_applied: Percent,
  bill_requested: Receipt,
  bill_printed: Receipt,
  payment_completed: DollarSign,
  table_vacated: LogOut,
  cleaning_started: Sparkles,
  cleaning_done: Check,
  session_ended: LogOut,
};

const PRIORITY_COLORS: Record<string, string> = {
  critical: "bg-red-500",
  urgent: "bg-red-400",
  warning: "bg-yellow-400",
  info: "bg-blue-400",
  notice: "bg-gray-400",
};

const CATEGORY_COLORS: Record<string, string> = {
  seating: "border-purple-500 bg-purple-50",
  order: "border-blue-500 bg-blue-50",
  kitchen: "border-orange-500 bg-orange-50",
  bar: "border-pink-500 bg-pink-50",
  waiter: "border-green-500 bg-green-50",
  billing: "border-yellow-500 bg-yellow-50",
  manager: "border-indigo-500 bg-indigo-50",
  issue: "border-red-500 bg-red-50",
};

export default function SessionTimelinePage({
  params,
}: {
  params: Promise<{ sessionId: string; restaurant: string }>;
}) {
  const resolvedParams = use(params);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<SessionData | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch(
          `/api/activity-log/session/${resolvedParams.sessionId}`
        );
        if (res.ok) {
          const result = await res.json();
          setData(result);
        }
      } catch (error) {
        console.error("Error fetching session timeline:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [resolvedParams.sessionId]);

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });
  };

  const formatCurrency = (amount: number) => `Rs. ${amount.toLocaleString()}`;

  const getIcon = (activityType: string) => {
    return ACTIVITY_ICONS[activityType] || FileText;
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      ACTIVE: "bg-green-100 text-green-700",
      COMPLETED: "bg-blue-100 text-blue-700",
      CANCELLED: "bg-red-100 text-red-700",
    };
    return colors[status] || "bg-gray-100 text-gray-700";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="space-y-6">
        <Link href="../../activity">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Activity Log
          </Button>
        </Link>
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Session not found
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="../../activity">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">
            Session Timeline - Table {data.session.tableNumber}
          </h1>
          <p className="text-muted-foreground">
            Session #{data.session.id.slice(-8)} |{" "}
            {new Date(data.session.startedAt).toLocaleDateString()}
          </p>
        </div>
      </div>

      {/* Summary Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Session Summary</CardTitle>
            <span
              className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(
                data.session.status
              )}`}
            >
              {data.session.status}
            </span>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4 lg:grid-cols-6">
            <div className="p-4 border rounded-lg">
              <p className="text-sm text-muted-foreground">Duration</p>
              <p className="text-2xl font-bold">
                {data.metrics.durationFormatted}
              </p>
            </div>
            <div className="p-4 border rounded-lg">
              <p className="text-sm text-muted-foreground">Guests</p>
              <p className="text-2xl font-bold">{data.session.guestCount}</p>
            </div>
            <div className="p-4 border rounded-lg">
              <p className="text-sm text-muted-foreground">Orders</p>
              <p className="text-2xl font-bold">
                {data.metrics.totalOrders} ({data.metrics.totalQuantity} items)
              </p>
            </div>
            <div className="p-4 border rounded-lg">
              <p className="text-sm text-muted-foreground">Bill Total</p>
              <p className="text-2xl font-bold">
                {formatCurrency(data.metrics.totalBillAmount)}
              </p>
            </div>
            {data.metrics.totalDiscount > 0 && (
              <div className="p-4 border rounded-lg">
                <p className="text-sm text-muted-foreground">Discount</p>
                <p className="text-2xl font-bold text-orange-600">
                  -{formatCurrency(data.metrics.totalDiscount)}
                </p>
              </div>
            )}
            <div className="p-4 border rounded-lg">
              <p className="text-sm text-muted-foreground">Issues</p>
              <p
                className={`text-2xl font-bold ${
                  data.metrics.issueCount > 0 ? "text-red-600" : "text-green-600"
                }`}
              >
                {data.metrics.issueCount > 0 ? data.metrics.issueCount : "None"}
              </p>
            </div>
          </div>

          {/* Staff Info */}
          <div className="mt-4 pt-4 border-t grid gap-4 md:grid-cols-3">
            {data.session.startedBy && (
              <div>
                <p className="text-sm text-muted-foreground">Host</p>
                <p className="font-medium">{data.session.startedBy.name}</p>
              </div>
            )}
            {data.session.waiter && (
              <div>
                <p className="text-sm text-muted-foreground">Waiter</p>
                <p className="font-medium">{data.session.waiter.name}</p>
              </div>
            )}
            <div>
              <p className="text-sm text-muted-foreground">Time</p>
              <p className="font-medium">
                {formatTime(data.session.startedAt)}
                {data.session.endedAt && ` — ${formatTime(data.session.endedAt)}`}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Timeline */}
      <Card>
        <CardHeader>
          <CardTitle>Activity Timeline</CardTitle>
          <CardDescription>
            {data.activities.length} activities recorded
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200" />

            {/* Activities */}
            <div className="space-y-4">
              {data.activities.map((activity, index) => {
                const Icon = getIcon(activity.activityType);
                const categoryColor =
                  CATEGORY_COLORS[activity.activityCategory] ||
                  CATEGORY_COLORS.order;
                const priorityDot =
                  PRIORITY_COLORS[activity.priority] || PRIORITY_COLORS.info;

                return (
                  <div key={activity.id} className="relative pl-10">
                    {/* Timeline dot */}
                    <div
                      className={`absolute left-2.5 w-3 h-3 rounded-full ${priorityDot} border-2 border-white`}
                    />

                    {/* Activity card */}
                    <div
                      className={`border-l-4 rounded-lg p-3 ${categoryColor}`}
                    >
                      <div className="flex items-start gap-3">
                        <Icon className="h-4 w-4 mt-0.5 text-muted-foreground" />
                        <div className="flex-1">
                          <div className="flex items-center gap-2 text-sm">
                            <span className="font-medium text-muted-foreground">
                              {formatTime(activity.createdAt)}
                            </span>
                            <span className="text-xs px-2 py-0.5 bg-white/50 rounded">
                              {activity.activityCategory}
                            </span>
                          </div>
                          <p className="font-medium mt-1">
                            {activity.description}
                          </p>
                          {activity.userName && (
                            <p className="text-sm text-muted-foreground">
                              {activity.performedBy === "guest"
                                ? "Guest"
                                : activity.userName}
                              {activity.userRole && ` (${activity.userRole})`}
                            </p>
                          )}
                          {activity.details &&
                            typeof activity.details === "object" && (
                              <div className="mt-2 text-sm text-muted-foreground">
                                {Boolean((activity.details as Record<string, unknown>)
                                  .itemName) && (
                                  <span className="inline-block px-2 py-0.5 bg-white/50 rounded mr-2">
                                    {String((activity.details as Record<string, unknown>).itemName)}
                                  </span>
                                )}
                                {Boolean((activity.details as Record<string, unknown>)
                                  .progress) && (
                                  <span className="inline-block px-2 py-0.5 bg-white/50 rounded">
                                    {String((activity.details as Record<string, unknown>).progress)}
                                  </span>
                                )}
                              </div>
                            )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {data.activities.length === 0 && (
            <p className="text-center text-muted-foreground py-8">
              No activities recorded for this session
            </p>
          )}
        </CardContent>
      </Card>

      {/* Orders Summary */}
      {data.orders.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Orders</CardTitle>
            <CardDescription>
              {data.orders.length} order(s) placed
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.orders.map((order) => (
                <div key={order.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <span className="font-medium">
                        Order #{order.orderNumber}
                      </span>
                      <span className="text-sm text-muted-foreground ml-2">
                        {formatTime(order.placedAt)}
                      </span>
                    </div>
                    <span
                      className={`px-2 py-1 rounded text-xs ${getStatusColor(
                        order.status
                      )}`}
                    >
                      {order.status}
                    </span>
                  </div>
                  <div className="space-y-1">
                    {order.items.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between text-sm"
                      >
                        <span>
                          {item.quantity}x {item.name}
                        </span>
                        <span className="text-muted-foreground">
                          {formatCurrency(item.totalPrice)}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-2 pt-2 border-t flex justify-between font-medium">
                    <span>Total</span>
                    <span>{formatCurrency(order.totalAmount)}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Bills Summary */}
      {data.bills.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Billing</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.bills.map((bill) => (
                <div key={bill.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">Bill #{bill.billNumber}</span>
                    <span
                      className={`px-2 py-1 rounded text-xs ${
                        bill.paymentStatus === "PAID"
                          ? "bg-green-100 text-green-700"
                          : "bg-yellow-100 text-yellow-700"
                      }`}
                    >
                      {bill.paymentStatus}
                    </span>
                  </div>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span>Subtotal</span>
                      <span>{formatCurrency(bill.subtotal)}</span>
                    </div>
                    {bill.discountAmount > 0 && (
                      <div className="flex justify-between text-orange-600">
                        <span>Discount</span>
                        <span>-{formatCurrency(bill.discountAmount)}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-medium pt-2 border-t">
                      <span>Total</span>
                      <span>{formatCurrency(bill.totalAmount)}</span>
                    </div>
                  </div>
                  {bill.payments.length > 0 && (
                    <div className="mt-2 pt-2 border-t">
                      <p className="text-sm text-muted-foreground mb-1">
                        Payments:
                      </p>
                      {bill.payments.map((payment) => (
                        <div
                          key={payment.id}
                          className="flex justify-between text-sm"
                        >
                          <span>{payment.method}</span>
                          <span>{formatCurrency(payment.amount)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
