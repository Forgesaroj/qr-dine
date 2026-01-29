"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
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
  Clock,
  ChevronRight,
  Filter,
  RefreshCw,
  ShoppingCart,
  Bell,
  CheckCircle,
  XCircle,
  Timer,
} from "lucide-react";

interface SessionItem {
  id: string;
  guestCount: number;
  status: string;
  phase: string;
  seatedAt: string;
  vacatedAt: string | null;
  totalDurationMinutes: number | null;
  table: {
    id: string;
    tableNumber: string;
    name: string | null;
  };
  waiter?: {
    id: string;
    name: string;
  };
  customer?: {
    id: string;
    name: string;
    phone: string;
    tier: string;
  };
  _orderCount: number;
  _assistanceCount: number;
}

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: "bg-green-100 text-green-700 border-green-200",
  COMPLETED: "bg-blue-100 text-blue-700 border-blue-200",
  CANCELLED: "bg-red-100 text-red-700 border-red-200",
};

const PHASE_LABELS: Record<string, string> = {
  SEATED: "Seated",
  ORDERING: "Ordering",
  WAITING_FOR_FOOD: "Waiting",
  EATING: "Eating",
  BILL_REQUESTED: "Bill Requested",
  PAYING: "Paying",
  COMPLETED: "Completed",
};

export default function SessionsListPage() {
  const pathname = usePathname();
  const restaurantSlug = pathname.split("/")[1];
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [statusFilter, setStatusFilter] = useState("all");
  const [total, setTotal] = useState(0);

  const fetchSessions = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "all") {
        params.set("status", statusFilter);
      }
      params.set("limit", "100");

      const res = await fetch(`/api/sessions?${params}`);
      if (res.ok) {
        const data = await res.json();
        setSessions(data.sessions || []);
        setTotal(data.total || 0);
      }
    } catch (error) {
      console.error("Error fetching sessions:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, [statusFilter]);

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const formatDuration = (minutes: number | null) => {
    if (!minutes) return "-";
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const getStatusColor = (status: string) => {
    return STATUS_COLORS[status] || "bg-gray-100 text-gray-700 border-gray-200";
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href={`/${restaurantSlug}/reports/activity`}>
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">Table Sessions</h1>
            <p className="text-muted-foreground">
              View detailed timeline for each dining session
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchSessions}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border rounded-lg text-sm"
            >
              <option value="all">All Sessions</option>
              <option value="ACTIVE">Active</option>
              <option value="COMPLETED">Completed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Sessions List */}
      <Card>
        <CardHeader>
          <CardTitle>Sessions</CardTitle>
          <CardDescription>
            {loading ? "Loading..." : `${total} session(s) found`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : sessions.length > 0 ? (
            <div className="space-y-2">
              {sessions.map((session) => (
                <Link
                  key={session.id}
                  href={`/${restaurantSlug}/reports/activity/session/${session.id}`}
                  className="block"
                >
                  <div className="border rounded-lg p-4 hover:bg-gray-50 hover:border-gray-300 transition-colors cursor-pointer">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        {/* Table Info */}
                        <div className="w-20">
                          <p className="font-bold text-lg">
                            Table {session.table.tableNumber}
                          </p>
                          {session.table.name && (
                            <p className="text-xs text-muted-foreground">
                              {session.table.name}
                            </p>
                          )}
                        </div>

                        {/* Status */}
                        <span
                          className={`px-2 py-1 rounded border text-xs font-medium ${getStatusColor(
                            session.status
                          )}`}
                        >
                          {session.status}
                        </span>

                        {/* Phase */}
                        {session.phase && (
                          <span className="text-xs text-muted-foreground px-2 py-1 bg-gray-100 rounded">
                            {PHASE_LABELS[session.phase] || session.phase}
                          </span>
                        )}

                        {/* Guest Count */}
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Users className="h-4 w-4" />
                          {session.guestCount}
                        </div>

                        {/* Orders Count */}
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <ShoppingCart className="h-4 w-4" />
                          {session._orderCount}
                        </div>

                        {/* Assistance Count */}
                        {session._assistanceCount > 0 && (
                          <div className="flex items-center gap-1 text-sm text-orange-600">
                            <Bell className="h-4 w-4" />
                            {session._assistanceCount}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-4">
                        {/* Duration */}
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Timer className="h-4 w-4" />
                          {formatDuration(session.totalDurationMinutes)}
                        </div>

                        {/* Time */}
                        <div className="text-right">
                          <p className="text-sm font-medium">
                            {formatDateTime(session.seatedAt)}
                          </p>
                          {session.vacatedAt && (
                            <p className="text-xs text-muted-foreground">
                              to {formatDateTime(session.vacatedAt)}
                            </p>
                          )}
                        </div>

                        {/* Waiter */}
                        {session.waiter && (
                          <div className="text-right w-24">
                            <p className="text-xs text-muted-foreground">
                              Waiter
                            </p>
                            <p className="text-sm truncate">
                              {session.waiter.name}
                            </p>
                          </div>
                        )}

                        {/* Customer */}
                        {session.customer && (
                          <div className="text-right w-28">
                            <p className="text-xs text-muted-foreground">
                              Customer
                            </p>
                            <p className="text-sm truncate">
                              {session.customer.name || session.customer.phone}
                            </p>
                            {session.customer.tier !== "REGULAR" && (
                              <span className="text-xs px-1 py-0.5 bg-yellow-100 text-yellow-700 rounded">
                                {session.customer.tier}
                              </span>
                            )}
                          </div>
                        )}

                        <ChevronRight className="h-5 w-5 text-muted-foreground" />
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-12">
              No sessions found matching your filters
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
