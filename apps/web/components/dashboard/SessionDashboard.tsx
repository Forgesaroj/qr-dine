"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, Badge, Button } from "@qr-dine/ui";
import {
  Users,
  Clock,
  Bell,
  AlertTriangle,
  Coffee,
  UtensilsCrossed,
  Receipt,
  CheckCircle,
  RefreshCw,
  ChevronRight,
  Loader2,
} from "lucide-react";
import {
  getDurationInfo,
  formatDuration,
  minutesSince,
  type DurationInfo,
} from "@/lib/session-duration";
import { cn } from "@/lib/utils";

interface SessionData {
  id: string;
  guestCount: number;
  phase: string;
  status: string;
  seatedAt: string;
  firstOrderAt: string | null;
  firstFoodServedAt: string | null;
  billRequestedAt: string | null;
  table: {
    tableNumber: string;
    name: string | null;
  };
  waiter?: {
    id: string;
    name: string;
  } | null;
  _orderCount?: number;
}

interface AlertData {
  id: string;
  alertType: string;
  message: string;
  priority: string;
  status: string;
  triggeredAt: string;
  table?: {
    tableNumber: string;
    name: string | null;
  };
  session?: {
    guestCount: number;
  };
}

interface SessionDashboardProps {
  userRole: string;
  restaurantSlug: string;
}

const PHASE_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  CREATED: { label: "Scanning", icon: Clock, color: "bg-gray-100 text-gray-700" },
  SEATED: { label: "Seated", icon: Coffee, color: "bg-blue-100 text-blue-700" },
  ORDERING: { label: "Ordering", icon: UtensilsCrossed, color: "bg-amber-100 text-amber-700" },
  DINING: { label: "Dining", icon: UtensilsCrossed, color: "bg-green-100 text-green-700" },
  BILL_REQUESTED: { label: "Bill Requested", icon: Receipt, color: "bg-purple-100 text-purple-700" },
  PAYING: { label: "Paying", icon: Receipt, color: "bg-indigo-100 text-indigo-700" },
  COMPLETED: { label: "Completed", icon: CheckCircle, color: "bg-gray-100 text-gray-500" },
};

export function SessionDashboard({ userRole, restaurantSlug }: SessionDashboardProps) {
  const [sessions, setSessions] = useState<SessionData[]>([]);
  const [alerts, setAlerts] = useState<AlertData[]>([]);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const isManager = userRole === "OWNER" || userRole === "ADMIN" || userRole === "MANAGER";

  const fetchData = useCallback(async () => {
    try {
      // Fetch active sessions
      const sessionsRes = await fetch("/api/sessions?status=ACTIVE&include=orders");
      const sessionsData = await sessionsRes.json();

      // Fetch active alerts (and trigger check)
      const alertsRes = await fetch("/api/session-alerts?checkAndCreate=true");
      const alertsData = await alertsRes.json();

      if (sessionsRes.ok) {
        setSessions(sessionsData.sessions || []);
      }
      if (alertsRes.ok) {
        setAlerts(alertsData.alerts || []);
      }
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();

    if (autoRefresh) {
      const interval = setInterval(fetchData, 15000); // Refresh every 15 seconds
      return () => clearInterval(interval);
    }
    return undefined;
  }, [fetchData, autoRefresh]);

  const handleAcknowledgeAlert = async (alertId: string) => {
    try {
      await fetch("/api/session-alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "acknowledge", alertId }),
      });
      fetchData();
    } catch (error) {
      console.error("Error acknowledging alert:", error);
    }
  };

  const handleDismissAlert = async (alertId: string) => {
    try {
      await fetch("/api/session-alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "dismiss", alertId }),
      });
      fetchData();
    } catch (error) {
      console.error("Error dismissing alert:", error);
    }
  };

  // Get duration info for each session
  const sessionsWithDuration = sessions.map((session) => {
    const minutes = minutesSince(session.seatedAt);
    const durationInfo = getDurationInfo(minutes);
    return { ...session, durationMinutes: minutes, durationInfo };
  });

  // Sort by duration (longest first) for manager view, or by alerts for waiter
  const sortedSessions = [...sessionsWithDuration].sort((a, b) => {
    if (isManager) {
      return b.durationMinutes - a.durationMinutes;
    }
    // For waiters, sort by those needing attention first
    const aNeeds = a.durationInfo.isAlert ? 1 : 0;
    const bNeeds = b.durationInfo.isAlert ? 1 : 0;
    if (aNeeds !== bNeeds) return bNeeds - aNeeds;
    return b.durationMinutes - a.durationMinutes;
  });

  // Stats
  const stats = {
    total: sessions.length,
    byPhase: {
      seated: sessions.filter((s) => s.phase === "SEATED").length,
      ordering: sessions.filter((s) => s.phase === "ORDERING").length,
      dining: sessions.filter((s) => s.phase === "DINING").length,
      billRequested: sessions.filter((s) => s.phase === "BILL_REQUESTED").length,
    },
    byDuration: {
      green: sessionsWithDuration.filter((s) => s.durationInfo.color === "green").length,
      yellow: sessionsWithDuration.filter((s) => s.durationInfo.color === "yellow").length,
      orange: sessionsWithDuration.filter((s) => s.durationInfo.color === "orange").length,
      red: sessionsWithDuration.filter((s) => s.durationInfo.color === "red").length,
    },
    alerts: {
      total: alerts.filter((a) => a.status === "ACTIVE").length,
      critical: alerts.filter((a) => a.status === "ACTIVE" && a.priority === "critical").length,
    },
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Active Sessions</h2>
          <p className="text-sm text-muted-foreground">
            {stats.total} table{stats.total !== 1 ? "s" : ""} occupied
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={autoRefresh ? "text-green-600" : ""}
          >
            <RefreshCw className={cn("h-4 w-4 mr-1", autoRefresh && "animate-spin")} />
            {autoRefresh ? "Auto" : "Manual"}
          </Button>
          <Button variant="outline" size="sm" onClick={fetchData}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Alerts Section */}
      {alerts.filter((a) => a.status === "ACTIVE").length > 0 && (
        <Card className="border-amber-300 bg-amber-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2 text-amber-800">
              <Bell className="h-5 w-5" />
              Active Alerts ({alerts.filter((a) => a.status === "ACTIVE").length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {alerts
              .filter((a) => a.status === "ACTIVE")
              .map((alert) => (
                <div
                  key={alert.id}
                  className={cn(
                    "flex items-center justify-between p-3 rounded-lg",
                    alert.priority === "critical"
                      ? "bg-red-100 border border-red-300"
                      : alert.priority === "high"
                        ? "bg-amber-100 border border-amber-300"
                        : "bg-white border"
                  )}
                >
                  <div className="flex items-center gap-3">
                    {alert.priority === "critical" && (
                      <AlertTriangle className="h-5 w-5 text-red-600" />
                    )}
                    <div>
                      <p className="font-medium text-sm">
                        Table {alert.table?.tableNumber}: {alert.message}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDuration(minutesSince(alert.triggeredAt))} ago
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => handleAcknowledgeAlert(alert.id)}>
                      On My Way
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDismissAlert(alert.id)}
                    >
                      Dismiss
                    </Button>
                  </div>
                </div>
              ))}
          </CardContent>
        </Card>
      )}

      {/* Stats Cards - Manager View */}
      {isManager && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold">{stats.total}</p>
                  <p className="text-sm text-muted-foreground">Active Tables</p>
                </div>
                <Users className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>

          {/* Duration Distribution */}
          <Card>
            <CardContent className="pt-4">
              <p className="text-sm text-muted-foreground mb-2">Duration</p>
              <div className="flex gap-2">
                <Badge className="bg-green-100 text-green-700">{stats.byDuration.green}</Badge>
                <Badge className="bg-yellow-100 text-yellow-700">{stats.byDuration.yellow}</Badge>
                <Badge className="bg-orange-100 text-orange-700">{stats.byDuration.orange}</Badge>
                <Badge className="bg-red-100 text-red-700">{stats.byDuration.red}</Badge>
              </div>
            </CardContent>
          </Card>

          {/* Phase Distribution */}
          <Card>
            <CardContent className="pt-4">
              <p className="text-sm text-muted-foreground mb-2">Status</p>
              <div className="flex flex-wrap gap-1">
                <Badge className="bg-blue-100 text-blue-700">
                  {stats.byPhase.seated} Seated
                </Badge>
                <Badge className="bg-amber-100 text-amber-700">
                  {stats.byPhase.ordering} Ordering
                </Badge>
                <Badge className="bg-green-100 text-green-700">
                  {stats.byPhase.dining} Dining
                </Badge>
                <Badge className="bg-purple-100 text-purple-700">
                  {stats.byPhase.billRequested} Bill
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Alerts */}
          <Card className={stats.alerts.critical > 0 ? "border-red-300 bg-red-50" : ""}>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className={cn("text-2xl font-bold", stats.alerts.critical > 0 && "text-red-600")}>
                    {stats.alerts.total}
                  </p>
                  <p className="text-sm text-muted-foreground">Active Alerts</p>
                </div>
                <Bell className={cn("h-8 w-8", stats.alerts.critical > 0 ? "text-red-600" : "text-muted-foreground")} />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Sessions List */}
      <div className="space-y-3">
        {sortedSessions.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-semibold mb-2">No Active Sessions</h3>
              <p className="text-muted-foreground">Tables are available for guests</p>
            </CardContent>
          </Card>
        ) : (
          sortedSessions.map((session) => {
            const phaseConfig = (PHASE_CONFIG[session.phase] || PHASE_CONFIG.SEATED)!;
            const PhaseIcon = phaseConfig.icon;

            return (
              <Card
                key={session.id}
                className={cn(
                  "transition-colors",
                  session.durationInfo.isAlert && "border-red-300"
                )}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      {/* Duration Indicator */}
                      <div
                        className={cn(
                          "w-12 h-12 rounded-lg flex items-center justify-center",
                          session.durationInfo.colorBg
                        )}
                      >
                        <span className={cn("text-lg font-bold", session.durationInfo.colorText)}>
                          {session.durationMinutes}
                        </span>
                      </div>

                      {/* Session Info */}
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">
                            Table {session.table.tableNumber}
                          </span>
                          <Badge className={phaseConfig.color}>
                            <PhaseIcon className="h-3 w-3 mr-1" />
                            {phaseConfig.label}
                          </Badge>
                          {session.durationInfo.isAlert && (
                            <Badge className="bg-red-100 text-red-700 animate-pulse">
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              {session.durationInfo.label}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                          <span className="flex items-center gap-1">
                            <Users className="h-4 w-4" />
                            {session.guestCount} guest{session.guestCount !== 1 ? "s" : ""}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            {formatDuration(session.durationMinutes)}
                          </span>
                          {session.waiter && (
                            <span>Waiter: {session.waiter.name}</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Action */}
                    <a href={`/${restaurantSlug}/tables?session=${session.id}`}>
                      <Button variant="ghost" size="sm">
                        <ChevronRight className="h-5 w-5" />
                      </Button>
                    </a>
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
