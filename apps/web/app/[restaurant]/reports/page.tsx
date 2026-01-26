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
import {
  BarChart3,
  TrendingUp,
  ShoppingCart,
  DollarSign,
  Loader2,
  Calendar,
  Package,
  PieChart,
  Users,
  CreditCard,
  UserCheck,
  ClipboardList,
} from "lucide-react";
import Link from "next/link";
import { ExportButton } from "./components/ExportButton";

interface ReportData {
  period: string;
  dateRange: {
    start: string;
    end: string;
  };
  summary: {
    totalOrders: number;
    completedOrders: number;
    cancelledOrders: number;
    totalRevenue: number;
    averageOrderValue: number;
  };
  topItems: Array<{
    id: string;
    name: string;
    quantity: number;
    revenue: number;
    category: string;
  }>;
  categoryBreakdown: Array<{
    name: string;
    revenue: number;
    orders: number;
  }>;
  hourlyData: Array<{
    hour: number;
    orders: number;
    revenue: number;
  }>;
  statusBreakdown: {
    pending: number;
    preparing: number;
    ready: number;
    served: number;
    completed: number;
    cancelled: number;
  };
}

const periods = [
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "week", label: "Last 7 Days" },
  { value: "month", label: "This Month" },
  { value: "year", label: "This Year" },
];

export default function ReportsPage() {
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("today");
  const [data, setData] = useState<ReportData | null>(null);

  useEffect(() => {
    fetchReports();
  }, [period]);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/reports?period=${period}`);
      if (!res.ok) throw new Error("Failed to fetch");
      const reportData = await res.json();
      setData(reportData);
    } catch (error) {
      console.error("Error fetching reports:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-NP", {
      style: "currency",
      currency: "NPR",
      minimumFractionDigits: 0,
    })
      .format(amount)
      .replace("NPR", "Rs.");
  };

  const formatHour = (hour: number) => {
    if (hour === 0) return "12 AM";
    if (hour === 12) return "12 PM";
    if (hour < 12) return `${hour} AM`;
    return `${hour - 12} PM`;
  };

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Reports</h1>
          <p className="text-muted-foreground">
            Sales analytics and performance metrics
          </p>
        </div>
        <div className="flex items-center gap-2">
          {data && <ExportButton data={data} filename="sales_report" title="Sales Report" />}
          <div className="flex gap-2">
            {periods.map((p) => (
              <Button
                key={p.value}
                variant={period === p.value ? "default" : "outline"}
                size="sm"
                onClick={() => setPeriod(p.value)}
              >
                {p.label}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Links to Detailed Reports */}
      <div className="grid gap-3 grid-cols-2 md:grid-cols-5">
        <Link href="reports/sales" className="p-4 border rounded-lg hover:bg-gray-50 transition-colors">
          <BarChart3 className="h-6 w-6 text-blue-600 mb-2" />
          <p className="font-medium">Sales Details</p>
          <p className="text-xs text-muted-foreground">Daily, weekly, monthly</p>
        </Link>
        <Link href="reports/items" className="p-4 border rounded-lg hover:bg-gray-50 transition-colors">
          <Package className="h-6 w-6 text-green-600 mb-2" />
          <p className="font-medium">Item Performance</p>
          <p className="text-xs text-muted-foreground">Best & worst sellers</p>
        </Link>
        <Link href="reports/customers" className="p-4 border rounded-lg hover:bg-gray-50 transition-colors">
          <Users className="h-6 w-6 text-purple-600 mb-2" />
          <p className="font-medium">Customer Analytics</p>
          <p className="text-xs text-muted-foreground">Visits & spending</p>
        </Link>
        <Link href="reports/staff" className="p-4 border rounded-lg hover:bg-gray-50 transition-colors">
          <UserCheck className="h-6 w-6 text-orange-600 mb-2" />
          <p className="font-medium">Staff Performance</p>
          <p className="text-xs text-muted-foreground">Sales by server</p>
        </Link>
        <Link href="reports/activity" className="p-4 border rounded-lg hover:bg-gray-50 transition-colors">
          <ClipboardList className="h-6 w-6 text-red-600 mb-2" />
          <p className="font-medium">Activity Log</p>
          <p className="text-xs text-muted-foreground">Full audit trail</p>
        </Link>
      </div>

      {data && (
        <>
          {/* Summary Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
                <ShoppingCart className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{data.summary.totalOrders}</div>
                <p className="text-xs text-muted-foreground">
                  {data.summary.completedOrders} completed ·{" "}
                  {data.summary.cancelledOrders} cancelled
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(data.summary.totalRevenue)}
                </div>
                <p className="text-xs text-muted-foreground">
                  <TrendingUp className="inline h-3 w-3 mr-1" />
                  From {data.summary.completedOrders} orders
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">
                  Average Order Value
                </CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(data.summary.averageOrderValue)}
                </div>
                <p className="text-xs text-muted-foreground">Per completed order</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
                <PieChart className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {data.summary.totalOrders > 0
                    ? Math.round(
                        (data.summary.completedOrders / data.summary.totalOrders) * 100
                      )
                    : 0}
                  %
                </div>
                <p className="text-xs text-muted-foreground">Orders completed</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {/* Top Selling Items */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Top Selling Items
                </CardTitle>
                <CardDescription>Best performers by quantity sold</CardDescription>
              </CardHeader>
              <CardContent>
                {data.topItems.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">
                    No sales data available
                  </p>
                ) : (
                  <div className="space-y-3">
                    {data.topItems.slice(0, 5).map((item, index) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between"
                      >
                        <div className="flex items-center gap-3">
                          <span className="flex items-center justify-center w-6 h-6 rounded-full bg-muted text-sm font-medium">
                            {index + 1}
                          </span>
                          <div>
                            <p className="font-medium">{item.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {item.category}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">{item.quantity} sold</p>
                          <p className="text-sm text-muted-foreground">
                            {formatCurrency(item.revenue)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Category Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="h-5 w-5" />
                  Sales by Category
                </CardTitle>
                <CardDescription>Revenue distribution by category</CardDescription>
              </CardHeader>
              <CardContent>
                {data.categoryBreakdown.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">
                    No sales data available
                  </p>
                ) : (
                  <div className="space-y-3">
                    {data.categoryBreakdown.map((category) => {
                      const percentage =
                        data.summary.totalRevenue > 0
                          ? (category.revenue / data.summary.totalRevenue) * 100
                          : 0;
                      return (
                        <div key={category.name} className="space-y-1">
                          <div className="flex justify-between text-sm">
                            <span>{category.name}</span>
                            <span className="font-medium">
                              {formatCurrency(category.revenue)}
                            </span>
                          </div>
                          <div className="h-2 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary transition-all"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {category.orders} items · {percentage.toFixed(1)}%
                          </p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Hourly Breakdown (Today only) */}
            {period === "today" && data.hourlyData.length > 0 && (
              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Today's Orders by Hour
                  </CardTitle>
                  <CardDescription>Order distribution throughout the day</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-end gap-1 h-40">
                    {data.hourlyData.map((hour) => {
                      const maxOrders = Math.max(
                        ...data.hourlyData.map((h) => h.orders),
                        1
                      );
                      const height = (hour.orders / maxOrders) * 100;
                      return (
                        <div
                          key={hour.hour}
                          className="flex-1 flex flex-col items-center gap-1"
                        >
                          <div
                            className="w-full bg-primary rounded-t transition-all hover:bg-primary/80"
                            style={{ height: `${height}%`, minHeight: hour.orders > 0 ? "4px" : "0" }}
                            title={`${formatHour(hour.hour)}: ${hour.orders} orders - ${formatCurrency(hour.revenue)}`}
                          />
                          {hour.hour % 4 === 0 && (
                            <span className="text-xs text-muted-foreground">
                              {formatHour(hour.hour)}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Order Status Breakdown */}
            <Card className={period === "today" ? "" : "md:col-span-2"}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5" />
                  Order Status
                </CardTitle>
                <CardDescription>Breakdown by order status</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-3 bg-yellow-50 rounded-lg">
                    <p className="text-2xl font-bold text-yellow-600">
                      {data.statusBreakdown.pending}
                    </p>
                    <p className="text-sm text-yellow-600">Pending</p>
                  </div>
                  <div className="text-center p-3 bg-blue-50 rounded-lg">
                    <p className="text-2xl font-bold text-blue-600">
                      {data.statusBreakdown.preparing}
                    </p>
                    <p className="text-sm text-blue-600">Preparing</p>
                  </div>
                  <div className="text-center p-3 bg-green-50 rounded-lg">
                    <p className="text-2xl font-bold text-green-600">
                      {data.statusBreakdown.ready}
                    </p>
                    <p className="text-sm text-green-600">Ready</p>
                  </div>
                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <p className="text-2xl font-bold text-gray-600">
                      {data.statusBreakdown.served}
                    </p>
                    <p className="text-sm text-gray-600">Served</p>
                  </div>
                  <div className="text-center p-3 bg-emerald-50 rounded-lg">
                    <p className="text-2xl font-bold text-emerald-600">
                      {data.statusBreakdown.completed}
                    </p>
                    <p className="text-sm text-emerald-600">Completed</p>
                  </div>
                  <div className="text-center p-3 bg-red-50 rounded-lg">
                    <p className="text-2xl font-bold text-red-600">
                      {data.statusBreakdown.cancelled}
                    </p>
                    <p className="text-sm text-red-600">Cancelled</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
