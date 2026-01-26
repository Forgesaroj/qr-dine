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
} from "@qr-dine/ui";
import {
  ArrowLeft,
  Loader2,
  UserCheck,
  DollarSign,
  Clock,
  Star,
  TrendingUp,
} from "lucide-react";
import { ExportButton } from "../components/ExportButton";

interface StaffPerformance {
  id: string;
  name: string;
  role: string;
  ordersServed: number;
  totalSales: number;
  averageOrderValue: number;
  hoursWorked: number;
  salesPerHour: number;
}

interface StaffData {
  summary: {
    totalStaff: number;
    activeStaff: number;
    totalSales: number;
    totalOrders: number;
    averageSalesPerStaff: number;
  };
  topPerformers: StaffPerformance[];
  allStaff: StaffPerformance[];
  roleBreakdown: Array<{
    role: string;
    count: number;
    sales: number;
    orders: number;
  }>;
}

export default function StaffPerformancePage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<StaffData | null>(null);
  const [period, setPeriod] = useState("month");

  useEffect(() => {
    fetchData();
  }, [period]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/reports/staff?period=${period}`);
      if (res.ok) {
        const result = await res.json();
        setData(result);
      }
    } catch (error) {
      console.error("Error fetching staff data:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => `Rs. ${amount.toLocaleString()}`;

  const getRoleColor = (role: string) => {
    switch (role.toUpperCase()) {
      case "OWNER":
        return "bg-purple-100 text-purple-700";
      case "MANAGER":
        return "bg-blue-100 text-blue-700";
      case "WAITER":
        return "bg-green-100 text-green-700";
      case "KITCHEN":
        return "bg-orange-100 text-orange-700";
      case "CASHIER":
        return "bg-pink-100 text-pink-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
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
            <h1 className="text-3xl font-bold">Staff Performance</h1>
            <p className="text-muted-foreground">Sales by server and team metrics</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {data && <ExportButton data={data} filename="staff_performance" title="Staff Performance Report" />}
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
          {/* Summary Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <UserCheck className="h-4 w-4" />
                  Active Staff
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{data.summary.activeStaff}</div>
                <p className="text-xs text-muted-foreground">
                  of {data.summary.totalStaff} total
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Total Sales
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(data.summary.totalSales)}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{data.summary.totalOrders}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Avg per Staff</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(data.summary.averageSalesPerStaff)}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Avg Order</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(
                    data.summary.totalOrders > 0
                      ? data.summary.totalSales / data.summary.totalOrders
                      : 0
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Top Performers */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="h-5 w-5 text-yellow-500" />
                Top Performers
              </CardTitle>
              <CardDescription>Staff with highest sales</CardDescription>
            </CardHeader>
            <CardContent>
              {data.topPerformers.length === 0 ? (
                <p className="text-center text-muted-foreground py-4">
                  No performance data available
                </p>
              ) : (
                <div className="grid gap-4 md:grid-cols-3">
                  {data.topPerformers.slice(0, 3).map((staff, index) => (
                    <div
                      key={staff.id}
                      className={`p-4 rounded-lg border-2 ${
                        index === 0
                          ? "border-yellow-400 bg-yellow-50"
                          : index === 1
                          ? "border-gray-300 bg-gray-50"
                          : "border-orange-300 bg-orange-50"
                      }`}
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <span
                          className={`flex items-center justify-center w-10 h-10 rounded-full font-bold text-white ${
                            index === 0
                              ? "bg-yellow-500"
                              : index === 1
                              ? "bg-gray-400"
                              : "bg-orange-400"
                          }`}
                        >
                          {index + 1}
                        </span>
                        <div>
                          <p className="font-bold">{staff.name}</p>
                          <span className={`text-xs px-2 py-0.5 rounded ${getRoleColor(staff.role)}`}>
                            {staff.role}
                          </span>
                        </div>
                      </div>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Sales:</span>
                          <span className="font-bold">{formatCurrency(staff.totalSales)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Orders:</span>
                          <span>{staff.ordersServed}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Avg Order:</span>
                          <span>{formatCurrency(staff.averageOrderValue)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* All Staff Performance Table */}
          <Card>
            <CardHeader>
              <CardTitle>All Staff Performance</CardTitle>
              <CardDescription>Complete performance breakdown</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-2 font-medium">Staff</th>
                      <th className="text-left py-3 px-2 font-medium">Role</th>
                      <th className="text-right py-3 px-2 font-medium">Orders</th>
                      <th className="text-right py-3 px-2 font-medium">Sales</th>
                      <th className="text-right py-3 px-2 font-medium">Avg Order</th>
                      <th className="text-right py-3 px-2 font-medium">Hours</th>
                      <th className="text-right py-3 px-2 font-medium">Sales/Hr</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.allStaff.map((staff) => (
                      <tr key={staff.id} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-2 font-medium">{staff.name}</td>
                        <td className="py-3 px-2">
                          <span className={`text-xs px-2 py-1 rounded ${getRoleColor(staff.role)}`}>
                            {staff.role}
                          </span>
                        </td>
                        <td className="text-right py-3 px-2">{staff.ordersServed}</td>
                        <td className="text-right py-3 px-2 font-medium">
                          {formatCurrency(staff.totalSales)}
                        </td>
                        <td className="text-right py-3 px-2">
                          {formatCurrency(staff.averageOrderValue)}
                        </td>
                        <td className="text-right py-3 px-2">{staff.hoursWorked.toFixed(1)}</td>
                        <td className="text-right py-3 px-2">
                          {formatCurrency(staff.salesPerHour)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Role Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle>Performance by Role</CardTitle>
              <CardDescription>Aggregated performance by staff role</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {data.roleBreakdown.map((role) => (
                  <div key={role.role} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className={`px-2 py-1 rounded text-sm font-medium ${getRoleColor(role.role)}`}>
                        {role.role}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {role.count} staff
                      </span>
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Sales:</span>
                        <span className="font-bold">{formatCurrency(role.sales)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Orders:</span>
                        <span>{role.orders}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      ) : (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Failed to load staff data
          </CardContent>
        </Card>
      )}
    </div>
  );
}
