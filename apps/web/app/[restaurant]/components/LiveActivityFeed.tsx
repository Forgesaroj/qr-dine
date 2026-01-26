"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
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
  ArrowRight,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, Button } from "@qr-dine/ui";

interface ActivityLog {
  id: string;
  activityType: string;
  activityCategory: string;
  description: string;
  tableId?: string;
  sessionId?: string;
  userName?: string;
  priority: string;
  details?: Record<string, unknown>;
  createdAt: string;
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
  seating: "border-l-purple-500",
  order: "border-l-blue-500",
  kitchen: "border-l-orange-500",
  bar: "border-l-pink-500",
  waiter: "border-l-green-500",
  billing: "border-l-yellow-500",
  manager: "border-l-indigo-500",
  staff: "border-l-gray-500",
  issue: "border-l-red-500",
};

const PRIORITY_DOTS: Record<string, string> = {
  critical: "bg-red-600 animate-pulse",
  urgent: "bg-red-500",
  warning: "bg-yellow-500",
  info: "bg-blue-400",
  notice: "bg-gray-400",
};

export function LiveActivityFeed() {
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [isLive, setIsLive] = useState(true);

  const fetchActivities = async () => {
    try {
      const res = await fetch("/api/activity-log?limit=10");
      if (res.ok) {
        const data = await res.json();
        setActivities(data.logs || []);
      }
    } catch (error) {
      console.error("Error fetching activities:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActivities();

    // Poll for updates every 10 seconds when live
    let interval: NodeJS.Timeout;
    if (isLive) {
      interval = setInterval(fetchActivities, 10000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isLive]);

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });
  };

  const getTableNumber = (activity: ActivityLog): string | undefined => {
    if (activity.details && typeof activity.details === "object") {
      const tableNum = (activity.details as Record<string, unknown>).tableNumber;
      if (typeof tableNum === "string" || typeof tableNum === "number") {
        return String(tableNum);
      }
    }
    return activity.tableId;
  };

  const getIcon = (activityType: string) => {
    const IconComponent = ACTIVITY_ICONS[activityType] || FileText;
    return IconComponent;
  };

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Activity Log
          </CardTitle>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsLive(!isLive)}
              className={`flex items-center gap-1 text-xs px-2 py-1 rounded ${
                isLive
                  ? "bg-green-100 text-green-700"
                  : "bg-gray-100 text-gray-600"
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  isLive ? "bg-green-500 animate-pulse" : "bg-gray-400"
                }`}
              />
              {isLive ? "Live" : "Paused"}
            </button>
            <button
              onClick={fetchActivities}
              className="p-1 hover:bg-gray-100 rounded"
              title="Refresh"
            >
              <RefreshCw className="h-3 w-3" />
            </button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : activities.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-4">
            No recent activity
          </p>
        ) : (
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {activities.map((activity) => {
              const Icon = getIcon(activity.activityType);
              const categoryColor =
                CATEGORY_COLORS[activity.activityCategory] ||
                CATEGORY_COLORS.order;
              const priorityDot =
                PRIORITY_DOTS[activity.priority] || PRIORITY_DOTS.info;

              return (
                <div
                  key={activity.id}
                  className={`border-l-2 ${categoryColor} pl-2 py-1`}
                >
                  <div className="flex items-start gap-2">
                    <div className="flex items-center gap-1 mt-0.5">
                      <span className={`w-1.5 h-1.5 rounded-full ${priorityDot}`} />
                      <Icon className="h-3 w-3 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <span>{formatTime(activity.createdAt)}</span>
                        {getTableNumber(activity) && (
                          <>
                            <span>|</span>
                            <span className="font-medium">
                              Table {getTableNumber(activity)}
                            </span>
                          </>
                        )}
                      </div>
                      <p className="text-sm truncate">{activity.description}</p>
                      {activity.userName && (
                        <p className="text-xs text-muted-foreground">
                          {activity.userName}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <Link href="./reports/activity">
          <Button variant="ghost" className="w-full mt-2 text-sm" size="sm">
            View Full Log
            <ArrowRight className="h-3 w-3 ml-1" />
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}

export default LiveActivityFeed;
