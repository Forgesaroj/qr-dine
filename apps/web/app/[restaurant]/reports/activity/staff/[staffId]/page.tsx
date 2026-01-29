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
  Percent,
  Bell,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  UserCircle,
} from "lucide-react";

interface ActivityLog {
  id: string;
  activityType: string;
  activityCategory: string;
  description: string;
  entityType: string;
  entityId?: string;
  tableId?: string;
  sessionId?: string;
  orderId?: string;
  userName?: string;
  userRole?: string;
  performedBy: string;
  priority: string;
  details?: Record<string, unknown>;
  createdAt: string;
}

interface StaffMember {
  id: string;
  name: string | null;
  email: string;
  role: string;
}

const ACTIVITY_ICONS: Record<string, typeof Users> = {
  table_seated: Users,
  guest_count_updated: Users,
  table_vacated: Users,
  session_started: Users,
  session_ended: Users,
  order_placed: FileText,
  order_modified: FileText,
  items_added: FileText,
  prep_started: ChefHat,
  item_ready: Check,
  kitchen_received: ChefHat,
  food_served: UtensilsCrossed,
  food_picked_up: UtensilsCrossed,
  drink_served: Droplet,
  water_served: Droplet,
  bill_requested: Receipt,
  bill_printed: Receipt,
  payment_completed: Check,
  discount_applied: Percent,
  food_issue_reported: AlertTriangle,
  assistance_requested: Bell,
  issue_resolved: Check,
};

const CATEGORY_COLORS: Record<string, string> = {
  seating: "border-l-purple-500 bg-purple-50",
  order: "border-l-blue-500 bg-blue-50",
  kitchen: "border-l-orange-500 bg-orange-50",
  bar: "border-l-pink-500 bg-pink-50",
  waiter: "border-l-green-500 bg-green-50",
  billing: "border-l-yellow-500 bg-yellow-50",
  manager: "border-l-indigo-500 bg-indigo-50",
  staff: "border-l-gray-500 bg-gray-50",
  issue: "border-l-red-500 bg-red-50",
};

const PRIORITY_COLORS: Record<string, string> = {
  critical: "bg-red-600",
  urgent: "bg-red-500",
  warning: "bg-yellow-500",
  info: "bg-blue-400",
  notice: "bg-gray-400",
};

export default function StaffTimelinePage({
  params,
}: {
  params: Promise<{ staffId: string; restaurant: string }>;
}) {
  const resolvedParams = use(params);
  const [loading, setLoading] = useState(true);
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [staffMember, setStaffMember] = useState<StaffMember | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // Get today's date as default
  useEffect(() => {
    const today = new Date();
    setDateFrom(today.toISOString().split("T")[0]);
    setDateTo(today.toISOString().split("T")[0]);
  }, []);

  const fetchStaffInfo = async () => {
    try {
      const res = await fetch("/api/staff");
      if (res.ok) {
        const data = await res.json();
        const staff = (data.staff || data || []).find(
          (s: StaffMember) => s.id === resolvedParams.staffId
        );
        if (staff) {
          setStaffMember(staff);
        }
      }
    } catch (error) {
      console.error("Error fetching staff info:", error);
    }
  };

  const fetchActivities = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "50",
        staffId: resolvedParams.staffId,
      });

      if (dateFrom) params.set("dateFrom", dateFrom);
      if (dateTo) params.set("dateTo", dateTo);

      const res = await fetch(`/api/activity-log?${params}`);
      if (res.ok) {
        const data = await res.json();
        setActivities(data.logs || []);
        setTotal(data.total || 0);
        setHasMore(data.hasMore || false);
      }
    } catch (error) {
      console.error("Error fetching activities:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStaffInfo();
  }, [resolvedParams.staffId]);

  useEffect(() => {
    if (dateFrom && dateTo) {
      fetchActivities();
    }
  }, [resolvedParams.staffId, page, dateFrom, dateTo]);

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  const getIcon = (activityType: string) => {
    return ACTIVITY_ICONS[activityType] || FileText;
  };

  const totalPages = Math.ceil(total / 50);

  // Group activities by date
  const groupedActivities = activities.reduce(
    (groups, activity) => {
      const date = new Date(activity.createdAt).toLocaleDateString();
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(activity);
      return groups;
    },
    {} as Record<string, ActivityLog[]>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href={`/${resolvedParams.restaurant}/reports/activity`}>
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <UserCircle className="h-8 w-8" />
              {staffMember?.name || staffMember?.email || "Staff"} Activity
            </h1>
            <p className="text-muted-foreground">
              {staffMember?.role && (
                <span className="px-2 py-0.5 bg-gray-100 rounded text-sm mr-2">
                  {staffMember.role}
                </span>
              )}
              Activity timeline for this staff member
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={fetchActivities}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Date Filters */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Date Range
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 items-center">
            <div>
              <label className="text-sm text-muted-foreground">From</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => {
                  setDateFrom(e.target.value);
                  setPage(1);
                }}
                className="ml-2 px-3 py-2 border rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="text-sm text-muted-foreground">To</label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => {
                  setDateTo(e.target.value);
                  setPage(1);
                }}
                className="ml-2 px-3 py-2 border rounded-lg text-sm"
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const today = new Date().toISOString().split("T")[0];
                setDateFrom(today);
                setDateTo(today);
                setPage(1);
              }}
            >
              Today
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const today = new Date();
                const weekAgo = new Date(today);
                weekAgo.setDate(weekAgo.getDate() - 7);
                setDateFrom(weekAgo.toISOString().split("T")[0]);
                setDateTo(today.toISOString().split("T")[0]);
                setPage(1);
              }}
            >
              Last 7 days
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Activity Summary */}
      {!loading && activities.length > 0 && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                Total Activities
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Orders</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {activities.filter((a) => a.activityCategory === "order").length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Service</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {activities.filter((a) => a.activityCategory === "waiter").length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Billing</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {activities.filter((a) => a.activityCategory === "billing").length}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Activity Timeline */}
      <Card>
        <CardHeader>
          <CardTitle>Activity Timeline</CardTitle>
          <CardDescription>
            {loading
              ? "Loading..."
              : `Showing ${activities.length} of ${total} activities`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : activities.length > 0 ? (
            <>
              <div className="space-y-6">
                {Object.entries(groupedActivities).map(([date, dateActivities]) => (
                  <div key={date}>
                    <h3 className="text-sm font-medium text-muted-foreground mb-3 sticky top-0 bg-white py-1">
                      {date}
                    </h3>
                    <div className="relative">
                      {/* Timeline line */}
                      <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200" />

                      <div className="space-y-3">
                        {dateActivities.map((activity) => {
                          const Icon = getIcon(activity.activityType);
                          const categoryColor =
                            CATEGORY_COLORS[activity.activityCategory] ||
                            CATEGORY_COLORS.order;
                          const priorityDot =
                            PRIORITY_COLORS[activity.priority] ||
                            PRIORITY_COLORS.info;

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
                                    {activity.tableId && (
                                      <p className="text-sm text-muted-foreground">
                                        Table{" "}
                                        {String(
                                          (activity.details as Record<string, unknown>)
                                            ?.tableNumber || activity.tableId
                                        )}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between mt-6 pt-4 border-t">
                <p className="text-sm text-muted-foreground">
                  Page {page} of {totalPages}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => p + 1)}
                    disabled={!hasMore}
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <p className="text-center text-muted-foreground py-12">
              No activities found for this staff member in the selected date range
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
