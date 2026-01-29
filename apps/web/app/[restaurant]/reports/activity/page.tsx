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
  Search,
  Filter,
  Download,
  RefreshCw,
  Users,
  FileText,
  ChefHat,
  UtensilsCrossed,
  Receipt,
  AlertTriangle,
  Check,
  Droplet,
  Percent,
  Bell,
  Clock,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { ExportButton } from "../components/ExportButton";

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
  userId?: string;
  userName?: string;
  userRole?: string;
  performedBy: string;
  priority: string;
  details?: Record<string, unknown>;
  createdAt: string;
}

interface ActivityData {
  logs: ActivityLog[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
  summary: {
    byCategory: Record<string, number>;
    byPriority: Record<string, number>;
  };
}

interface TableOption {
  id: string;
  tableNumber: string;
  name: string | null;
}

interface StaffOption {
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

const CATEGORY_OPTIONS = [
  { value: "all", label: "All Categories" },
  { value: "seating", label: "Seating & Table" },
  { value: "order", label: "Orders" },
  { value: "kitchen", label: "Kitchen" },
  { value: "bar", label: "Bar" },
  { value: "waiter", label: "Waiter Actions" },
  { value: "billing", label: "Billing & Payment" },
  { value: "manager", label: "Manager Actions" },
  { value: "staff", label: "Staff & Shift" },
  { value: "issue", label: "Issues & Escalations" },
];

const PRIORITY_OPTIONS = [
  { value: "all", label: "All Priorities" },
  { value: "critical", label: "Critical" },
  { value: "urgent", label: "Urgent" },
  { value: "warning", label: "Warning" },
  { value: "info", label: "Info" },
  { value: "notice", label: "Notice" },
];

const CATEGORY_COLORS: Record<string, string> = {
  seating: "bg-purple-100 text-purple-700 border-purple-200",
  order: "bg-blue-100 text-blue-700 border-blue-200",
  kitchen: "bg-orange-100 text-orange-700 border-orange-200",
  bar: "bg-pink-100 text-pink-700 border-pink-200",
  waiter: "bg-green-100 text-green-700 border-green-200",
  billing: "bg-yellow-100 text-yellow-700 border-yellow-200",
  manager: "bg-indigo-100 text-indigo-700 border-indigo-200",
  staff: "bg-gray-100 text-gray-700 border-gray-200",
  issue: "bg-red-100 text-red-700 border-red-200",
};

const PRIORITY_COLORS: Record<string, string> = {
  critical: "bg-red-600 text-white",
  urgent: "bg-red-500 text-white",
  warning: "bg-yellow-500 text-black",
  info: "bg-blue-500 text-white",
  notice: "bg-gray-400 text-white",
};

export default function ActivityLogPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<ActivityData | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [priority, setPriority] = useState("all");
  const [tableId, setTableId] = useState("all");
  const [staffId, setStaffId] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [isLive, setIsLive] = useState(false);
  const [tables, setTables] = useState<TableOption[]>([]);
  const [staff, setStaff] = useState<StaffOption[]>([]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "50",
      });

      if (search) params.set("search", search);
      if (category !== "all") params.set("category", category);
      if (priority !== "all") params.set("priority", priority);
      if (tableId !== "all") params.set("tableId", tableId);
      if (staffId !== "all") params.set("staffId", staffId);
      if (dateFrom) params.set("dateFrom", dateFrom);
      if (dateTo) params.set("dateTo", dateTo);

      const res = await fetch(`/api/activity-log?${params}`);
      if (res.ok) {
        const result = await res.json();
        setData(result);
      }
    } catch (error) {
      console.error("Error fetching activity log:", error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch tables and staff for dropdown filters
  useEffect(() => {
    const fetchFilters = async () => {
      try {
        const [tablesRes, staffRes] = await Promise.all([
          fetch("/api/tables"),
          fetch("/api/staff"),
        ]);

        if (tablesRes.ok) {
          const tablesData = await tablesRes.json();
          setTables(tablesData.tables || tablesData || []);
        }

        if (staffRes.ok) {
          const staffData = await staffRes.json();
          setStaff(staffData.staff || staffData || []);
        }
      } catch (error) {
        console.error("Error fetching filter options:", error);
      }
    };

    fetchFilters();
  }, []);

  useEffect(() => {
    fetchData();
  }, [page, category, priority, tableId, staffId, dateFrom, dateTo]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isLive) {
      interval = setInterval(fetchData, 10000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isLive, page, category, priority, tableId, staffId, dateFrom, dateTo]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchData();
  };

  const resetFilters = () => {
    setSearch("");
    setCategory("all");
    setPriority("all");
    setTableId("all");
    setStaffId("all");
    setDateFrom("");
    setDateTo("");
    setPage(1);
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });
  };

  const getIcon = (activityType: string) => {
    return ACTIVITY_ICONS[activityType] || FileText;
  };

  const totalPages = data ? Math.ceil(data.total / 50) : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="../reports">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">Activity Log</h1>
            <p className="text-muted-foreground">
              Complete audit trail of all restaurant activities
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link href="./activity/sessions">
            <Button variant="outline" size="sm">
              <Users className="h-4 w-4 mr-2" />
              Sessions
            </Button>
          </Link>
          <button
            onClick={() => setIsLive(!isLive)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm ${
              isLive
                ? "bg-green-100 text-green-700 border-green-200"
                : "bg-gray-100 text-gray-600 border-gray-200"
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                isLive ? "bg-green-500 animate-pulse" : "bg-gray-400"
              }`}
            />
            {isLive ? "Live" : "Paused"}
          </button>
          <Button variant="outline" size="sm" onClick={fetchData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          {data && (
            <ExportButton
              data={{ activities: data.logs, total: data.total, summary: data.summary }}
              filename="activity_log"
              title="Activity Log Report"
            />
          )}
        </div>
      </div>

      {/* Summary Cards */}
      {data && (
        <div className="grid gap-4 md:grid-cols-4 lg:grid-cols-5">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                Total Activities
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data.total}</div>
              <p className="text-xs text-muted-foreground">In current filter</p>
            </CardContent>
          </Card>

          {Object.entries(data.summary.byCategory || {})
            .slice(0, 4)
            .map(([cat, count]) => (
              <Card key={cat}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium capitalize">
                    {cat}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{count}</div>
                  <p className="text-xs text-muted-foreground">Today</p>
                </CardContent>
              </Card>
            ))}
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <form onSubmit={handleSearch} className="lg:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search activities..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </form>

            <select
              value={category}
              onChange={(e) => {
                setCategory(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 border rounded-lg text-sm"
            >
              {CATEGORY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>

            <select
              value={priority}
              onChange={(e) => {
                setPriority(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 border rounded-lg text-sm"
            >
              {PRIORITY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mt-4">
            <select
              value={tableId}
              onChange={(e) => {
                setTableId(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 border rounded-lg text-sm"
            >
              <option value="all">All Tables</option>
              {tables.map((table) => (
                <option key={table.id} value={table.id}>
                  Table {table.tableNumber}{table.name ? ` - ${table.name}` : ""}
                </option>
              ))}
            </select>

            <select
              value={staffId}
              onChange={(e) => {
                setStaffId(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 border rounded-lg text-sm"
            >
              <option value="all">All Staff</option>
              {staff.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name || member.email} ({member.role})
                </option>
              ))}
            </select>

            <input
              type="date"
              value={dateFrom}
              onChange={(e) => {
                setDateFrom(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 border rounded-lg text-sm"
              placeholder="From date"
            />

            <input
              type="date"
              value={dateTo}
              onChange={(e) => {
                setDateTo(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 border rounded-lg text-sm"
              placeholder="To date"
            />
          </div>

          <div className="flex justify-end mt-4">
            <Button variant="outline" size="sm" onClick={resetFilters}>
              Reset Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Activity List */}
      <Card>
        <CardHeader>
          <CardTitle>Activity Timeline</CardTitle>
          <CardDescription>
            {data
              ? `Showing ${data.logs.length} of ${data.total} activities`
              : "Loading..."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : data && data.logs.length > 0 ? (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-2 font-medium">Time</th>
                      <th className="text-left py-3 px-2 font-medium">
                        Activity
                      </th>
                      <th className="text-left py-3 px-2 font-medium">
                        Details
                      </th>
                      <th className="text-left py-3 px-2 font-medium">
                        Category
                      </th>
                      <th className="text-left py-3 px-2 font-medium">Staff</th>
                      <th className="text-left py-3 px-2 font-medium">
                        Priority
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.logs.map((log) => {
                      const Icon = getIcon(log.activityType);
                      const categoryColor =
                        CATEGORY_COLORS[log.activityCategory] ||
                        CATEGORY_COLORS.order;
                      const priorityColor =
                        PRIORITY_COLORS[log.priority] || PRIORITY_COLORS.info;

                      return (
                        <tr key={log.id} className="border-b hover:bg-gray-50">
                          <td className="py-3 px-2 text-sm text-muted-foreground whitespace-nowrap">
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {formatTime(log.createdAt)}
                            </div>
                            <div className="text-xs">
                              {new Date(log.createdAt).toLocaleDateString()}
                            </div>
                          </td>
                          <td className="py-3 px-2">
                            <div className="flex items-center gap-2">
                              <Icon className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium">
                                {log.description}
                              </span>
                            </div>
                          </td>
                          <td className="py-3 px-2 text-sm">
                            {log.tableId && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 rounded text-xs mr-2">
                                Table{" "}
                                {String((log.details as Record<string, unknown>)?.tableNumber || log.tableId)}
                              </span>
                            )}
                            {log.orderId && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 rounded text-xs">
                                Order #{log.orderId.slice(-6)}
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-2">
                            <span
                              className={`text-xs px-2 py-1 rounded border ${categoryColor}`}
                            >
                              {log.activityCategory}
                            </span>
                          </td>
                          <td className="py-3 px-2 text-sm">
                            {log.userName && log.userId ? (
                              <Link
                                href={`./activity/staff/${log.userId}`}
                                className="hover:underline"
                              >
                                <div className="font-medium text-blue-600 hover:text-blue-800">
                                  {log.userName}
                                </div>
                                {log.userRole && (
                                  <div className="text-xs text-muted-foreground">
                                    {log.userRole}
                                  </div>
                                )}
                              </Link>
                            ) : log.userName ? (
                              <div>
                                <div className="font-medium">{log.userName}</div>
                                {log.userRole && (
                                  <div className="text-xs text-muted-foreground">
                                    {log.userRole}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className="text-muted-foreground">
                                {log.performedBy === "guest"
                                  ? "Guest"
                                  : log.performedBy === "system"
                                  ? "System"
                                  : "-"}
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-2">
                            <span
                              className={`text-xs px-2 py-1 rounded ${priorityColor}`}
                            >
                              {log.priority}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between mt-4 pt-4 border-t">
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
                    disabled={!data.hasMore}
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <p className="text-center text-muted-foreground py-12">
              No activities found matching your filters
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
