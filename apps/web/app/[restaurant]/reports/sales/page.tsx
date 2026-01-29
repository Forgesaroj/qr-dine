"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Button,
  Input,
} from "@qr-dine/ui";
import {
  ArrowLeft,
  Loader2,
  TrendingUp,
  TrendingDown,
  DollarSign,
  ShoppingCart,
  Calendar,
} from "lucide-react";
import { ExportButton } from "../components/ExportButton";

interface DailySales {
  date: string;
  orders: number;
  revenue: number;
  averageOrderValue: number;
}

interface SalesData {
  summary: {
    totalRevenue: number;
    totalOrders: number;
    averageOrderValue: number;
    revenueGrowth: number;
    orderGrowth: number;
  };
  dailyData: DailySales[];
  comparisonPeriod: {
    revenue: number;
    orders: number;
  };
}

export default function SalesReportPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<SalesData | null>(null);
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split("T")[0];
  });
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().split("T")[0]);

  useEffect(() => {
    fetchData();
  }, [dateFrom, dateTo]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/reports/sales?from=${dateFrom}&to=${dateTo}`);
      if (res.ok) {
        const result = await res.json();
        setData(result);
      }
    } catch (error) {
      console.error("Error fetching sales data:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return `Rs. ${amount.toLocaleString()}`;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="../reports">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">Sales Report</h1>
            <p className="text-muted-foreground">Detailed sales analysis</p>
          </div>
        </div>
        {data && <ExportButton data={data} filename="sales_detailed" title="Detailed Sales Report" />}
      </div>

      {/* Date Range Filter */}
      <Card>
        <CardContent className="py-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Date Range:</span>
            </div>
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-40"
            />
            <span className="text-muted-foreground">to</span>
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-40"
            />
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const d = new Date();
                  d.setDate(d.getDate() - 7);
                  setDateFrom(d.toISOString().split("T")[0] ?? "");
                  setDateTo(new Date().toISOString().split("T")[0] ?? "");
                }}
              >
                Last 7 Days
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const d = new Date();
                  d.setDate(d.getDate() - 30);
                  setDateFrom(d.toISOString().split("T")[0] ?? "");
                  setDateTo(new Date().toISOString().split("T")[0] ?? "");
                }}
              >
                Last 30 Days
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : data ? (
        <>
          {/* Summary Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(data.summary.totalRevenue)}
                </div>
                <div className="flex items-center text-xs mt-1">
                  {data.summary.revenueGrowth >= 0 ? (
                    <TrendingUp className="h-3 w-3 text-green-600 mr-1" />
                  ) : (
                    <TrendingDown className="h-3 w-3 text-red-600 mr-1" />
                  )}
                  <span className={data.summary.revenueGrowth >= 0 ? "text-green-600" : "text-red-600"}>
                    {data.summary.revenueGrowth >= 0 ? "+" : ""}
                    {data.summary.revenueGrowth.toFixed(1)}%
                  </span>
                  <span className="text-muted-foreground ml-1">vs previous period</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
                <ShoppingCart className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{data.summary.totalOrders}</div>
                <div className="flex items-center text-xs mt-1">
                  {data.summary.orderGrowth >= 0 ? (
                    <TrendingUp className="h-3 w-3 text-green-600 mr-1" />
                  ) : (
                    <TrendingDown className="h-3 w-3 text-red-600 mr-1" />
                  )}
                  <span className={data.summary.orderGrowth >= 0 ? "text-green-600" : "text-red-600"}>
                    {data.summary.orderGrowth >= 0 ? "+" : ""}
                    {data.summary.orderGrowth.toFixed(1)}%
                  </span>
                  <span className="text-muted-foreground ml-1">vs previous period</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Avg Order Value</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(data.summary.averageOrderValue)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Per completed order</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Daily Average</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(
                    data.dailyData.length > 0
                      ? data.summary.totalRevenue / data.dailyData.length
                      : 0
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {data.dailyData.length} days in range
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Daily Sales Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Daily Sales Trend</CardTitle>
              <CardDescription>Revenue and orders over time</CardDescription>
            </CardHeader>
            <CardContent>
              {data.dailyData.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No data available for selected period
                </p>
              ) : (
                <div className="space-y-4">
                  {/* Simple bar chart */}
                  <div className="flex items-end gap-1 h-48">
                    {data.dailyData.map((day) => {
                      const maxRevenue = Math.max(...data.dailyData.map((d) => d.revenue), 1);
                      const height = (day.revenue / maxRevenue) * 100;
                      return (
                        <div
                          key={day.date}
                          className="flex-1 flex flex-col items-center"
                          title={`${formatDate(day.date)}: ${formatCurrency(day.revenue)} (${day.orders} orders)`}
                        >
                          <div
                            className="w-full bg-primary rounded-t hover:bg-primary/80 transition-colors cursor-pointer"
                            style={{ height: `${height}%`, minHeight: day.revenue > 0 ? "4px" : "0" }}
                          />
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{formatDate(data.dailyData[0]?.date || "")}</span>
                    <span>{formatDate(data.dailyData[data.dailyData.length - 1]?.date || "")}</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Daily Breakdown Table */}
          <Card>
            <CardHeader>
              <CardTitle>Daily Breakdown</CardTitle>
              <CardDescription>Detailed daily sales data</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-2 font-medium">Date</th>
                      <th className="text-right py-3 px-2 font-medium">Orders</th>
                      <th className="text-right py-3 px-2 font-medium">Revenue</th>
                      <th className="text-right py-3 px-2 font-medium">Avg Order</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.dailyData.slice().reverse().map((day) => (
                      <tr key={day.date} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-2">{formatDate(day.date)}</td>
                        <td className="text-right py-3 px-2">{day.orders}</td>
                        <td className="text-right py-3 px-2 font-medium">
                          {formatCurrency(day.revenue)}
                        </td>
                        <td className="text-right py-3 px-2">
                          {formatCurrency(day.averageOrderValue)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="font-bold bg-gray-50">
                      <td className="py-3 px-2">Total</td>
                      <td className="text-right py-3 px-2">{data.summary.totalOrders}</td>
                      <td className="text-right py-3 px-2">
                        {formatCurrency(data.summary.totalRevenue)}
                      </td>
                      <td className="text-right py-3 px-2">
                        {formatCurrency(data.summary.averageOrderValue)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      ) : (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Failed to load sales data
          </CardContent>
        </Card>
      )}
    </div>
  );
}
