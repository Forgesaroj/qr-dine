"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@qr-dine/ui";
import {
  Building2,
  Users,
  Key,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Activity,
  Loader2,
  ArrowUpRight,
  Clock,
} from "lucide-react";

interface DashboardStats {
  totalRestaurants: number;
  activeRestaurants: number;
  totalUsers: number;
  activeLicenses: number;
  expiringLicenses: number;
  monthlyRevenue: number;
  newRestaurantsThisMonth: number;
  systemHealth: "healthy" | "warning" | "critical";
}

interface RecentActivity {
  id: string;
  type: string;
  message: string;
  timestamp: string;
  restaurantName?: string;
}

export default function SuperAdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [activities, setActivities] = useState<RecentActivity[]>([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const res = await fetch("/api/superadmin/dashboard");
      if (res.ok) {
        const data = await res.json();
        setStats(data.stats);
        setActivities(data.activities || []);
      }
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  // Default stats if API fails
  const displayStats = stats || {
    totalRestaurants: 0,
    activeRestaurants: 0,
    totalUsers: 0,
    activeLicenses: 0,
    expiringLicenses: 0,
    monthlyRevenue: 0,
    newRestaurantsThisMonth: 0,
    systemHealth: "healthy" as const,
  };

  const healthColors = {
    healthy: "text-green-600 bg-green-100",
    warning: "text-yellow-600 bg-yellow-100",
    critical: "text-red-600 bg-red-100",
  };

  const healthIcons = {
    healthy: CheckCircle,
    warning: AlertTriangle,
    critical: XCircle,
  };

  const HealthIcon = healthIcons[displayStats.systemHealth];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Super Admin Dashboard</h1>
        <p className="text-muted-foreground">
          Overview of all restaurants and system status
        </p>
      </div>

      {/* System Health Banner */}
      <Card className={healthColors[displayStats.systemHealth]}>
        <CardContent className="py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <HealthIcon className="h-6 w-6" />
            <div>
              <p className="font-medium">
                System Status: {displayStats.systemHealth.charAt(0).toUpperCase() + displayStats.systemHealth.slice(1)}
              </p>
              <p className="text-sm opacity-80">
                All services are operational
              </p>
            </div>
          </div>
          <Link
            href="/superadmin/health"
            className="text-sm underline hover:no-underline"
          >
            View Details
          </Link>
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Restaurants</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{displayStats.totalRestaurants}</div>
            <p className="text-xs text-muted-foreground">
              {displayStats.activeRestaurants} active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{displayStats.totalUsers}</div>
            <p className="text-xs text-muted-foreground">
              Across all restaurants
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Licenses</CardTitle>
            <Key className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{displayStats.activeLicenses}</div>
            <p className="text-xs text-yellow-600">
              {displayStats.expiringLicenses} expiring soon
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              Rs.{displayStats.monthlyRevenue.toLocaleString()}
            </div>
            <p className="text-xs text-green-600 flex items-center gap-1">
              <TrendingUp className="h-3 w-3" />
              +{displayStats.newRestaurantsThisMonth} new this month
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions & Recent Activity */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common administrative tasks</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link
              href="/superadmin/restaurants/new"
              className="flex items-center justify-between p-3 rounded-lg border hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Building2 className="h-5 w-5 text-blue-600" />
                <span className="font-medium">Add New Restaurant</span>
              </div>
              <ArrowUpRight className="h-4 w-4 text-gray-400" />
            </Link>

            <Link
              href="/superadmin/licenses/generate"
              className="flex items-center justify-between p-3 rounded-lg border hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Key className="h-5 w-5 text-green-600" />
                <span className="font-medium">Generate License Key</span>
              </div>
              <ArrowUpRight className="h-4 w-4 text-gray-400" />
            </Link>

            <Link
              href="/superadmin/audit-logs"
              className="flex items-center justify-between p-3 rounded-lg border hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Activity className="h-5 w-5 text-purple-600" />
                <span className="font-medium">View Audit Logs</span>
              </div>
              <ArrowUpRight className="h-4 w-4 text-gray-400" />
            </Link>

            <Link
              href="/superadmin/users"
              className="flex items-center justify-between p-3 rounded-lg border hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Users className="h-5 w-5 text-orange-600" />
                <span className="font-medium">Manage Users</span>
              </div>
              <ArrowUpRight className="h-4 w-4 text-gray-400" />
            </Link>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest system events</CardDescription>
          </CardHeader>
          <CardContent>
            {activities.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No recent activity</p>
              </div>
            ) : (
              <div className="space-y-4">
                {activities.slice(0, 5).map((activity) => (
                  <div
                    key={activity.id}
                    className="flex items-start gap-3 text-sm"
                  >
                    <div className="w-2 h-2 mt-2 rounded-full bg-blue-500" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{activity.message}</p>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        {activity.restaurantName && (
                          <span>{activity.restaurantName}</span>
                        )}
                        <span>
                          {new Date(activity.timestamp).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* License Alerts */}
      {displayStats.expiringLicenses > 0 && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-yellow-800">
              <AlertTriangle className="h-5 w-5" />
              License Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-yellow-700">
              {displayStats.expiringLicenses} license(s) expiring within 30 days.{" "}
              <Link
                href="/superadmin/licenses?filter=expiring"
                className="underline font-medium"
              >
                View details
              </Link>
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
