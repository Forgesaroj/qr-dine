"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@qr-dine/ui";
import { Button } from "@qr-dine/ui";
import { Input } from "@qr-dine/ui";
import {
  FileText,
  Search,
  Filter,
  Download,
  Loader2,
  User,
  Building2,
  Calendar,
  Clock,
  Shield,
  Settings,
  Key,
  LogIn,
  LogOut,
  Edit,
  Trash2,
  Plus,
  RefreshCw,
} from "lucide-react";

interface AuditLog {
  id: string;
  action: string;
  entity: string;
  entityId: string | null;
  userId: string | null;
  userName: string | null;
  userRole: string | null;
  restaurantId: string | null;
  restaurantName: string | null;
  details: Record<string, unknown> | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
}

const actionIcons: Record<string, typeof FileText> = {
  LOGIN: LogIn,
  LOGOUT: LogOut,
  CREATE: Plus,
  UPDATE: Edit,
  DELETE: Trash2,
  LICENSE_ACTIVATE: Key,
  LICENSE_REVOKE: Key,
  SETTINGS_CHANGE: Settings,
  DEFAULT: FileText,
};

const actionColors: Record<string, string> = {
  LOGIN: "text-green-600 bg-green-100",
  LOGOUT: "text-gray-600 bg-gray-100",
  CREATE: "text-blue-600 bg-blue-100",
  UPDATE: "text-yellow-600 bg-yellow-100",
  DELETE: "text-red-600 bg-red-100",
  LICENSE_ACTIVATE: "text-purple-600 bg-purple-100",
  LICENSE_REVOKE: "text-red-600 bg-red-100",
  SETTINGS_CHANGE: "text-orange-600 bg-orange-100",
  DEFAULT: "text-gray-600 bg-gray-100",
};

export default function AuditLogsPage() {
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("all");
  const [entityFilter, setEntityFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  useEffect(() => {
    fetchLogs();
  }, [page, actionFilter, entityFilter, dateFrom, dateTo]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "50",
      });
      if (actionFilter !== "all") params.append("action", actionFilter);
      if (entityFilter !== "all") params.append("entity", entityFilter);
      if (dateFrom) params.append("dateFrom", dateFrom);
      if (dateTo) params.append("dateTo", dateTo);

      const res = await fetch(`/api/superadmin/audit-logs?${params}`);
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
        setHasMore(data.hasMore || false);
      }
    } catch (error) {
      console.error("Error fetching audit logs:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      const params = new URLSearchParams();
      if (actionFilter !== "all") params.append("action", actionFilter);
      if (entityFilter !== "all") params.append("entity", entityFilter);
      if (dateFrom) params.append("dateFrom", dateFrom);
      if (dateTo) params.append("dateTo", dateTo);
      params.append("format", "csv");

      const res = await fetch(`/api/superadmin/audit-logs/export?${params}`);
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `audit-logs-${new Date().toISOString().split("T")[0]}.csv`;
        a.click();
      }
    } catch (error) {
      console.error("Error exporting logs:", error);
    }
  };

  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      (log.userName && log.userName.toLowerCase().includes(search.toLowerCase())) ||
      (log.restaurantName && log.restaurantName.toLowerCase().includes(search.toLowerCase())) ||
      log.action.toLowerCase().includes(search.toLowerCase()) ||
      log.entity.toLowerCase().includes(search.toLowerCase());
    return matchesSearch;
  });

  const getActionIcon = (action: string): typeof FileText => {
    return actionIcons[action] ?? FileText;
  };

  const getActionColor = (action: string) => {
    return actionColors[action] || actionColors.DEFAULT;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Audit Logs</h1>
          <p className="text-muted-foreground">
            Track all system activities and changes
          </p>
        </div>
        <Button variant="outline" onClick={handleExport}>
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>

            <select
              value={actionFilter}
              onChange={(e) => {
                setActionFilter(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 border rounded-lg bg-background"
            >
              <option value="all">All Actions</option>
              <option value="LOGIN">Login</option>
              <option value="LOGOUT">Logout</option>
              <option value="CREATE">Create</option>
              <option value="UPDATE">Update</option>
              <option value="DELETE">Delete</option>
              <option value="LICENSE_ACTIVATE">License Activate</option>
              <option value="LICENSE_REVOKE">License Revoke</option>
              <option value="SETTINGS_CHANGE">Settings Change</option>
            </select>

            <select
              value={entityFilter}
              onChange={(e) => {
                setEntityFilter(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 border rounded-lg bg-background"
            >
              <option value="all">All Entities</option>
              <option value="USER">User</option>
              <option value="RESTAURANT">Restaurant</option>
              <option value="LICENSE">License</option>
              <option value="ORDER">Order</option>
              <option value="MENU">Menu</option>
              <option value="SETTINGS">Settings</option>
            </select>

            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => {
                setDateFrom(e.target.value);
                setPage(1);
              }}
              placeholder="From date"
            />

            <Input
              type="date"
              value={dateTo}
              onChange={(e) => {
                setDateTo(e.target.value);
                setPage(1);
              }}
              placeholder="To date"
            />
          </div>
        </CardContent>
      </Card>

      {/* Logs List */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No audit logs found</p>
            </div>
          ) : (
            <div className="divide-y">
              {filteredLogs.map((log) => {
                const ActionIcon = getActionIcon(log.action);
                const actionColor = getActionColor(log.action);

                return (
                  <div
                    key={log.id}
                    className="p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-start gap-4">
                      {/* Action Icon */}
                      <div className={`p-2 rounded-lg ${actionColor}`}>
                        <ActionIcon className="h-4 w-4" />
                      </div>

                      {/* Log Details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium">{log.action}</span>
                          <span className="text-muted-foreground">on</span>
                          <span className="px-2 py-0.5 bg-gray-100 rounded text-sm">
                            {log.entity}
                          </span>
                          {log.entityId && (
                            <code className="text-xs text-muted-foreground">
                              #{log.entityId.slice(0, 8)}
                            </code>
                          )}
                        </div>

                        <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground flex-wrap">
                          {log.userName && (
                            <div className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              <span>{log.userName}</span>
                              {log.userRole && (
                                <span className="text-xs px-1 py-0.5 bg-gray-100 rounded">
                                  {log.userRole}
                                </span>
                              )}
                            </div>
                          )}

                          {log.restaurantName && (
                            <div className="flex items-center gap-1">
                              <Building2 className="h-3 w-3" />
                              <span>{log.restaurantName}</span>
                            </div>
                          )}

                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            <span>
                              {new Date(log.createdAt).toLocaleDateString()}
                            </span>
                          </div>

                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            <span>
                              {new Date(log.createdAt).toLocaleTimeString()}
                            </span>
                          </div>

                          {log.ipAddress && (
                            <span className="text-xs">{log.ipAddress}</span>
                          )}
                        </div>

                        {log.details && Object.keys(log.details).length > 0 && (
                          <details className="mt-2">
                            <summary className="text-sm text-blue-600 cursor-pointer hover:underline">
                              View details
                            </summary>
                            <pre className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-auto">
                              {JSON.stringify(log.details, null, 2)}
                            </pre>
                          </details>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {(page > 1 || hasMore) && (
        <div className="flex items-center justify-center gap-4">
          <Button
            variant="outline"
            disabled={page === 1}
            onClick={() => setPage(page - 1)}
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">Page {page}</span>
          <Button
            variant="outline"
            disabled={!hasMore}
            onClick={() => setPage(page + 1)}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
