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
  Users,
  UserPlus,
  Repeat,
  Crown,
  TrendingUp,
} from "lucide-react";
import { ExportButton } from "../components/ExportButton";

interface CustomerData {
  summary: {
    totalCustomers: number;
    newCustomers: number;
    returningCustomers: number;
    averageVisits: number;
    averageSpending: number;
  };
  topSpenders: Array<{
    id: string;
    name: string;
    phone: string;
    visits: number;
    totalSpent: number;
    tier: string;
  }>;
  tierDistribution: Array<{
    tier: string;
    count: number;
    percentage: number;
  }>;
  monthlyGrowth: Array<{
    month: string;
    newCustomers: number;
    totalCustomers: number;
  }>;
}

export default function CustomerAnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<CustomerData | null>(null);
  const [period, setPeriod] = useState("month");

  useEffect(() => {
    fetchData();
  }, [period]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/reports/customers?period=${period}`);
      if (res.ok) {
        const result = await res.json();
        setData(result);
      }
    } catch (error) {
      console.error("Error fetching customer data:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => `Rs. ${amount.toLocaleString()}`;

  const getTierColor = (tier: string) => {
    switch (tier.toUpperCase()) {
      case "PLATINUM":
        return "bg-purple-100 text-purple-700";
      case "GOLD":
        return "bg-yellow-100 text-yellow-700";
      case "SILVER":
        return "bg-gray-200 text-gray-700";
      default:
        return "bg-orange-100 text-orange-700";
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
            <h1 className="text-3xl font-bold">Customer Analytics</h1>
            <p className="text-muted-foreground">Customer insights and behavior</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {data && <ExportButton data={data} filename="customer_analytics" title="Customer Analytics Report" />}
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
                  <Users className="h-4 w-4" />
                  Total Customers
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{data.summary.totalCustomers}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <UserPlus className="h-4 w-4 text-green-600" />
                  New Customers
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {data.summary.newCustomers}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Repeat className="h-4 w-4 text-blue-600" />
                  Returning
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  {data.summary.returningCustomers}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Avg Visits</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{data.summary.averageVisits.toFixed(1)}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Avg Spending</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(data.summary.averageSpending)}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Top Spenders */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Crown className="h-5 w-5 text-yellow-500" />
                  Top Spenders
                </CardTitle>
                <CardDescription>Highest value customers</CardDescription>
              </CardHeader>
              <CardContent>
                {data.topSpenders.length === 0 ? (
                  <p className="text-center text-muted-foreground py-4">
                    No customer data available
                  </p>
                ) : (
                  <div className="space-y-3">
                    {data.topSpenders.map((customer, index) => (
                      <div
                        key={customer.id}
                        className="flex items-center justify-between p-3 border rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <span className="flex items-center justify-center w-8 h-8 rounded-full bg-yellow-500 text-white font-bold text-sm">
                            {index + 1}
                          </span>
                          <div>
                            <p className="font-medium">{customer.name || "Guest"}</p>
                            <p className="text-sm text-muted-foreground">
                              {customer.visits} visits
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold">{formatCurrency(customer.totalSpent)}</p>
                          <span className={`text-xs px-2 py-1 rounded-full ${getTierColor(customer.tier)}`}>
                            {customer.tier}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Tier Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Membership Tiers</CardTitle>
                <CardDescription>Customer distribution by tier</CardDescription>
              </CardHeader>
              <CardContent>
                {data.tierDistribution.length === 0 ? (
                  <p className="text-center text-muted-foreground py-4">
                    No tier data available
                  </p>
                ) : (
                  <div className="space-y-4">
                    {data.tierDistribution.map((tier) => (
                      <div key={tier.tier} className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className={`px-2 py-1 rounded ${getTierColor(tier.tier)}`}>
                            {tier.tier}
                          </span>
                          <span className="font-medium">
                            {tier.count} ({tier.percentage.toFixed(1)}%)
                          </span>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary transition-all"
                            style={{ width: `${tier.percentage}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Customer Growth Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Customer Growth
              </CardTitle>
              <CardDescription>New customer acquisition over time</CardDescription>
            </CardHeader>
            <CardContent>
              {data.monthlyGrowth.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No growth data available
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-2 font-medium">Month</th>
                        <th className="text-right py-3 px-2 font-medium">New</th>
                        <th className="text-right py-3 px-2 font-medium">Total</th>
                        <th className="text-right py-3 px-2 font-medium">Growth</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.monthlyGrowth.map((month, index) => {
                        const prevTotal = index > 0 ? (data.monthlyGrowth[index - 1]?.totalCustomers ?? 0) : month.totalCustomers - month.newCustomers;
                        const growth = prevTotal > 0 ? ((month.totalCustomers - prevTotal) / prevTotal) * 100 : 0;
                        return (
                          <tr key={month.month} className="border-b hover:bg-gray-50">
                            <td className="py-3 px-2">{month.month}</td>
                            <td className="text-right py-3 px-2 text-green-600">
                              +{month.newCustomers}
                            </td>
                            <td className="text-right py-3 px-2 font-medium">
                              {month.totalCustomers}
                            </td>
                            <td className="text-right py-3 px-2">
                              <span className={growth >= 0 ? "text-green-600" : "text-red-600"}>
                                {growth >= 0 ? "+" : ""}{growth.toFixed(1)}%
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      ) : (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Failed to load customer data
          </CardContent>
        </Card>
      )}
    </div>
  );
}
