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
  Package,
  Star,
  AlertTriangle,
} from "lucide-react";
import { ExportButton } from "../components/ExportButton";

interface ItemPerformance {
  id: string;
  name: string;
  category: string;
  quantity: number;
  revenue: number;
  averagePrice: number;
  trend: number;
}

interface ItemsData {
  topSellers: ItemPerformance[];
  worstSellers: ItemPerformance[];
  byCategory: Array<{
    category: string;
    items: number;
    quantity: number;
    revenue: number;
  }>;
  summary: {
    totalItems: number;
    totalQuantity: number;
    totalRevenue: number;
  };
}

export default function ItemPerformancePage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<ItemsData | null>(null);
  const [period, setPeriod] = useState("month");

  useEffect(() => {
    fetchData();
  }, [period]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/reports/items?period=${period}`);
      if (res.ok) {
        const result = await res.json();
        setData(result);
      }
    } catch (error) {
      console.error("Error fetching item data:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => `Rs. ${amount.toLocaleString()}`;

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
            <h1 className="text-3xl font-bold">Item Performance</h1>
            <p className="text-muted-foreground">Best and worst selling items</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {data && <ExportButton data={data} filename="item_performance" title="Item Performance Report" />}
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="px-3 py-2 border rounded-lg text-sm"
          >
            <option value="week">Last 7 Days</option>
            <option value="month">This Month</option>
            <option value="quarter">Last 3 Months</option>
            <option value="year">This Year</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : data ? (
        <>
          {/* Summary */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total Items Sold</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{data.summary.totalQuantity}</div>
                <p className="text-xs text-muted-foreground">
                  Across {data.summary.totalItems} menu items
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(data.summary.totalRevenue)}
                </div>
                <p className="text-xs text-muted-foreground">From all item sales</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Average per Item</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(
                    data.summary.totalItems > 0
                      ? data.summary.totalRevenue / data.summary.totalItems
                      : 0
                  )}
                </div>
                <p className="text-xs text-muted-foreground">Revenue per menu item</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Top Sellers */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Star className="h-5 w-5 text-yellow-500" />
                  Top Selling Items
                </CardTitle>
                <CardDescription>Best performers by quantity sold</CardDescription>
              </CardHeader>
              <CardContent>
                {data.topSellers.length === 0 ? (
                  <p className="text-center text-muted-foreground py-4">No data available</p>
                ) : (
                  <div className="space-y-3">
                    {data.topSellers.map((item, index) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between p-3 bg-green-50 rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <span className="flex items-center justify-center w-8 h-8 rounded-full bg-green-500 text-white font-bold text-sm">
                            {index + 1}
                          </span>
                          <div>
                            <p className="font-medium">{item.name}</p>
                            <p className="text-sm text-muted-foreground">{item.category}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold">{item.quantity} sold</p>
                          <p className="text-sm text-green-600">
                            {formatCurrency(item.revenue)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Worst Sellers */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-orange-500" />
                  Low Performing Items
                </CardTitle>
                <CardDescription>Items needing attention</CardDescription>
              </CardHeader>
              <CardContent>
                {data.worstSellers.length === 0 ? (
                  <p className="text-center text-muted-foreground py-4">No data available</p>
                ) : (
                  <div className="space-y-3">
                    {data.worstSellers.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between p-3 bg-orange-50 rounded-lg"
                      >
                        <div>
                          <p className="font-medium">{item.name}</p>
                          <p className="text-sm text-muted-foreground">{item.category}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-orange-600">{item.quantity} sold</p>
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
          </div>

          {/* By Category */}
          <Card>
            <CardHeader>
              <CardTitle>Performance by Category</CardTitle>
              <CardDescription>Sales breakdown by menu category</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-2 font-medium">Category</th>
                      <th className="text-right py-3 px-2 font-medium">Items</th>
                      <th className="text-right py-3 px-2 font-medium">Qty Sold</th>
                      <th className="text-right py-3 px-2 font-medium">Revenue</th>
                      <th className="text-right py-3 px-2 font-medium">% of Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.byCategory.map((cat) => (
                      <tr key={cat.category} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-2 font-medium">{cat.category}</td>
                        <td className="text-right py-3 px-2">{cat.items}</td>
                        <td className="text-right py-3 px-2">{cat.quantity}</td>
                        <td className="text-right py-3 px-2">{formatCurrency(cat.revenue)}</td>
                        <td className="text-right py-3 px-2">
                          {data.summary.totalRevenue > 0
                            ? ((cat.revenue / data.summary.totalRevenue) * 100).toFixed(1)
                            : 0}
                          %
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      ) : (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Failed to load item data
          </CardContent>
        </Card>
      )}
    </div>
  );
}
