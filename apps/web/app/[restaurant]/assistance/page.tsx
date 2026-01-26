"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, Button, Badge } from "@qr-dine/ui";
import {
  Loader2,
  Bell,
  Check,
  Clock,
  Droplets,
  Hand,
  UtensilsCrossed,
  AlertTriangle,
  Receipt,
  HelpCircle,
  RefreshCw,
  User,
  MapPin,
} from "lucide-react";

interface AssistanceRequest {
  id: string;
  type: string;
  status: string;
  note: string | null;
  priority: string;
  requestedAt: string;
  notifiedAt: string | null;
  acknowledgedAt: string | null;
  completedAt: string | null;
  waitTimeMinutes: number;
  isUrgent: boolean;
  session: {
    id: string;
    guestCount: number;
    table: {
      tableNumber: string;
      name: string | null;
    };
    waiter?: {
      id: string;
      name: string;
    };
  };
  assignedWaiter?: {
    id: string;
    name: string;
  };
  acknowledgedBy?: {
    id: string;
    name: string;
  };
}

const ASSISTANCE_TYPES: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  WATER_REFILL: { label: "Water Refill", icon: Droplets, color: "text-blue-500" },
  CALL_WAITER: { label: "Call Waiter", icon: Hand, color: "text-purple-500" },
  CUTLERY_NAPKINS: { label: "Cutlery & Napkins", icon: UtensilsCrossed, color: "text-gray-500" },
  FOOD_ISSUE: { label: "Food Issue", icon: AlertTriangle, color: "text-red-500" },
  BILL_REQUEST: { label: "Request Bill", icon: Receipt, color: "text-green-500" },
  OTHER: { label: "Other", icon: HelpCircle, color: "text-amber-500" },
};

export default function AssistancePage() {
  const [requests, setRequests] = useState<AssistanceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("active"); // active, all, completed
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchRequests = useCallback(async () => {
    try {
      const includeCompleted = filter === "all" || filter === "completed";
      const res = await fetch(`/api/assistance?includeCompleted=${includeCompleted}`);
      const data = await res.json();

      if (res.ok) {
        let filteredRequests = data.requests || [];
        if (filter === "completed") {
          filteredRequests = filteredRequests.filter(
            (r: AssistanceRequest) => r.status === "COMPLETED" || r.status === "CANCELLED"
          );
        }
        setRequests(filteredRequests);
      }
    } catch (error) {
      console.error("Error fetching requests:", error);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchRequests();

    // Auto-refresh every 10 seconds if enabled
    if (autoRefresh) {
      const interval = setInterval(fetchRequests, 10000);
      return () => clearInterval(interval);
    }
    return undefined;
  }, [fetchRequests, autoRefresh]);

  const handleAction = async (id: string, action: string) => {
    setActionLoading(id);

    try {
      const res = await fetch(`/api/assistance/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });

      if (res.ok) {
        fetchRequests();
      }
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusBadge = (status: string, isUrgent: boolean) => {
    if (isUrgent) {
      return (
        <Badge className="bg-red-100 text-red-700 animate-pulse">
          <AlertTriangle className="h-3 w-3 mr-1" />
          Urgent
        </Badge>
      );
    }

    const styles: Record<string, string> = {
      PENDING: "bg-amber-100 text-amber-700",
      NOTIFIED: "bg-blue-100 text-blue-700",
      ACKNOWLEDGED: "bg-purple-100 text-purple-700",
      IN_PROGRESS: "bg-green-100 text-green-700",
      COMPLETED: "bg-gray-100 text-gray-700",
      CANCELLED: "bg-red-100 text-red-700",
    };

    const labels: Record<string, string> = {
      PENDING: "Pending",
      NOTIFIED: "Notified",
      ACKNOWLEDGED: "On the way",
      IN_PROGRESS: "In Progress",
      COMPLETED: "Completed",
      CANCELLED: "Cancelled",
    };

    return <Badge className={styles[status] || "bg-gray-100"}>{labels[status] || status}</Badge>;
  };

  const formatWaitTime = (minutes: number) => {
    if (minutes < 1) return "Just now";
    if (minutes === 1) return "1 min ago";
    return `${minutes} mins ago`;
  };

  const activeRequests = requests.filter(
    (r) => !["COMPLETED", "CANCELLED"].includes(r.status)
  );
  const urgentCount = activeRequests.filter((r) => r.isUrgent).length;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30 p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Bell className="h-6 w-6" />
            Assistance Requests
          </h1>
          <p className="text-muted-foreground">
            {activeRequests.length} active request{activeRequests.length !== 1 ? "s" : ""}
            {urgentCount > 0 && (
              <span className="text-red-500 ml-2">({urgentCount} urgent)</span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={autoRefresh ? "text-green-600" : ""}
          >
            <RefreshCw className={`h-4 w-4 mr-1 ${autoRefresh ? "animate-spin" : ""}`} />
            {autoRefresh ? "Auto" : "Manual"}
          </Button>
          <Button variant="outline" size="sm" onClick={fetchRequests}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-6">
        {[
          { key: "active", label: "Active", count: activeRequests.length },
          { key: "all", label: "All", count: requests.length },
          { key: "completed", label: "Completed", count: requests.filter((r) => r.status === "COMPLETED").length },
        ].map((tab) => (
          <Button
            key={tab.key}
            variant={filter === tab.key ? "default" : "outline"}
            size="sm"
            onClick={() => {
              setFilter(tab.key);
              setLoading(true);
            }}
          >
            {tab.label} ({tab.count})
          </Button>
        ))}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card className={urgentCount > 0 ? "border-red-300 bg-red-50" : ""}>
          <CardContent className="pt-4">
            <div className={`text-2xl font-bold ${urgentCount > 0 ? "text-red-600" : "text-amber-600"}`}>
              {urgentCount > 0 ? urgentCount : activeRequests.filter((r) => r.status === "PENDING").length}
            </div>
            <p className="text-sm text-muted-foreground">
              {urgentCount > 0 ? "Urgent" : "Pending"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-purple-600">
              {activeRequests.filter((r) => r.status === "ACKNOWLEDGED").length}
            </div>
            <p className="text-sm text-muted-foreground">On the Way</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-green-600">
              {activeRequests.filter((r) => r.status === "IN_PROGRESS").length}
            </div>
            <p className="text-sm text-muted-foreground">In Progress</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">
              {requests.filter((r) => r.status === "COMPLETED").length}
            </div>
            <p className="text-sm text-muted-foreground">Completed Today</p>
          </CardContent>
        </Card>
      </div>

      {/* Requests List */}
      <div className="space-y-4">
        {requests.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-semibold mb-2">No Requests</h3>
              <p className="text-muted-foreground">No assistance requests to show</p>
            </CardContent>
          </Card>
        ) : (
          requests.map((request) => {
            const typeInfo = ASSISTANCE_TYPES[request.type] ?? ASSISTANCE_TYPES.OTHER!;
            const IconComponent = typeInfo!.icon;

            return (
              <Card
                key={request.id}
                className={request.isUrgent ? "border-red-300 bg-red-50" : ""}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      {/* Icon */}
                      <div className={`p-3 rounded-lg bg-muted ${typeInfo.color}`}>
                        <IconComponent className="h-6 w-6" />
                      </div>

                      {/* Details */}
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold">{typeInfo.label}</span>
                          {getStatusBadge(request.status, request.isUrgent)}
                        </div>

                        <div className="flex items-center gap-4 text-sm text-muted-foreground mb-2">
                          <span className="flex items-center gap-1">
                            <MapPin className="h-4 w-4" />
                            Table {request.session.table.tableNumber}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            {formatWaitTime(request.waitTimeMinutes)}
                          </span>
                          {request.session.waiter && (
                            <span className="flex items-center gap-1">
                              <User className="h-4 w-4" />
                              {request.session.waiter.name}
                            </span>
                          )}
                        </div>

                        {request.note && (
                          <p className="text-sm bg-muted p-2 rounded">{request.note}</p>
                        )}

                        {request.acknowledgedBy && (
                          <p className="text-xs text-muted-foreground mt-2">
                            Acknowledged by {request.acknowledgedBy.name}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-2">
                      {["PENDING", "NOTIFIED"].includes(request.status) && (
                        <Button
                          size="sm"
                          onClick={() => handleAction(request.id, "acknowledge")}
                          disabled={actionLoading === request.id}
                        >
                          {actionLoading === request.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <Hand className="h-4 w-4 mr-1" />
                              On My Way
                            </>
                          )}
                        </Button>
                      )}

                      {request.status === "ACKNOWLEDGED" && (
                        <Button
                          size="sm"
                          onClick={() => handleAction(request.id, "in_progress")}
                          disabled={actionLoading === request.id}
                        >
                          {actionLoading === request.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            "Start Handling"
                          )}
                        </Button>
                      )}

                      {["ACKNOWLEDGED", "IN_PROGRESS"].includes(request.status) && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleAction(request.id, "complete")}
                          disabled={actionLoading === request.id}
                        >
                          <Check className="h-4 w-4 mr-1" />
                          Complete
                        </Button>
                      )}

                      {!["COMPLETED", "CANCELLED"].includes(request.status) && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-muted-foreground"
                          onClick={() => handleAction(request.id, "cancel")}
                          disabled={actionLoading === request.id}
                        >
                          Cancel
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
