"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Bell, Volume2, VolumeX, Check, Trash2, Wifi, WifiOff, ExternalLink, BellRing, BellOff } from "lucide-react";
import { useNotifications } from "./NotificationProvider";

interface NotificationData {
  orderId?: string;
  tableId?: string;
  tableNumber?: string;
  tableName?: string;
  status?: string;
  message?: string;
  assistanceId?: string;
  billId?: string;
}

export function NotificationBell() {
  const router = useRouter();
  const pathname = usePathname();
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    clearNotifications,
    soundEnabled,
    toggleSound,
    connectionStatus,
    pushPermission,
    requestPushPermission,
  } = useNotifications();

  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Extract restaurant slug from current path
  const restaurantSlug = pathname.split("/")[1] || "";

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const getTimeAgo = (date: Date): string => {
    const now = new Date();
    const diffMs = now.getTime() - new Date(date).getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${Math.floor(diffHours / 24)}d ago`;
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "NEW_ORDER":
        return "🍽️";
      case "ORDER_READY":
        return "✅";
      case "ORDER_UPDATE":
        return "🔄";
      case "BILL_REQUEST":
        return "💳";
      case "TABLE_UPDATE":
        return "🪑";
      case "ASSISTANCE_REQUEST":
        return "🆘";
      case "SESSION_ALERT":
        return "⏰";
      default:
        return "📢";
    }
  };

  // Get navigation URL based on notification type - with specific IDs for direct navigation
  const getNavigationUrl = (type: string, data?: NotificationData): string => {
    const baseUrl = `/${restaurantSlug}`;

    switch (type) {
      case "NEW_ORDER":
      case "ORDER_UPDATE":
        // Go to orders page with order highlighted
        if (data?.orderId) {
          return `${baseUrl}/orders?highlight=${data.orderId}`;
        }
        return `${baseUrl}/orders`;
      case "ORDER_READY":
        // Go to orders filtered by ready status
        if (data?.orderId) {
          return `${baseUrl}/orders?status=READY&highlight=${data.orderId}`;
        }
        return `${baseUrl}/orders?status=READY`;
      case "BILL_REQUEST":
        // Go to billing page with specific bill
        if (data?.billId) {
          return `${baseUrl}/billing?bill=${data.billId}`;
        }
        return `${baseUrl}/billing`;
      case "TABLE_UPDATE":
        // Go to specific table details
        if (data?.tableId) {
          return `${baseUrl}/tables/${data.tableId}`;
        }
        return `${baseUrl}/tables`;
      case "ASSISTANCE_REQUEST":
        // Go to assistance page
        if (data?.assistanceId) {
          return `${baseUrl}/assistance?highlight=${data.assistanceId}`;
        }
        return `${baseUrl}/assistance`;
      case "SESSION_ALERT":
        // Go to tables page to see the alert
        if (data?.tableId) {
          return `${baseUrl}/tables/${data.tableId}`;
        }
        return `${baseUrl}/tables`;
      default:
        return `${baseUrl}/dashboard`;
    }
  };

  // Handle notification click - navigate to relevant page
  const handleNotificationClick = (
    notificationId: string,
    type: string,
    data?: NotificationData
  ) => {
    markAsRead(notificationId);
    setIsOpen(false);
    const url = getNavigationUrl(type, data);
    router.push(url);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        type="button"
        className="relative -m-2.5 p-2.5 text-muted-foreground hover:text-foreground transition-colors"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="sr-only">View notifications</span>
        <Bell className={`h-5 w-5 ${unreadCount > 0 ? "animate-pulse" : ""}`} />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
        {/* Connection status indicator */}
        <span
          className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-card ${
            connectionStatus === "connected"
              ? "bg-green-500"
              : connectionStatus === "connecting"
              ? "bg-yellow-500 animate-pulse"
              : "bg-gray-400"
          }`}
          title={
            connectionStatus === "connected"
              ? "Real-time connected"
              : connectionStatus === "connecting"
              ? "Connecting..."
              : "Disconnected (polling)"
          }
        />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 rounded-lg border bg-card shadow-lg z-50">
          {/* Header */}
          <div className="flex items-center justify-between border-b px-4 py-3">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold">Notifications</h3>
              {/* Connection status badge */}
              <span
                className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full ${
                  connectionStatus === "connected"
                    ? "bg-green-100 text-green-700"
                    : connectionStatus === "connecting"
                    ? "bg-yellow-100 text-yellow-700"
                    : "bg-gray-100 text-gray-600"
                }`}
              >
                {connectionStatus === "connected" ? (
                  <>
                    <Wifi className="h-2.5 w-2.5" /> Live
                  </>
                ) : connectionStatus === "connecting" ? (
                  <>
                    <Wifi className="h-2.5 w-2.5 animate-pulse" /> ...
                  </>
                ) : (
                  <>
                    <WifiOff className="h-2.5 w-2.5" /> Polling
                  </>
                )}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={toggleSound}
                className="p-1 rounded hover:bg-muted transition-colors"
                title={soundEnabled ? "Mute sounds" : "Enable sounds"}
              >
                {soundEnabled ? (
                  <Volume2 className="h-4 w-4 text-green-600" />
                ) : (
                  <VolumeX className="h-4 w-4 text-muted-foreground" />
                )}
              </button>
              {notifications.length > 0 && (
                <>
                  <button
                    onClick={markAllAsRead}
                    className="p-1 rounded hover:bg-muted transition-colors"
                    title="Mark all as read"
                  >
                    <Check className="h-4 w-4" />
                  </button>
                  <button
                    onClick={clearNotifications}
                    className="p-1 rounded hover:bg-muted transition-colors"
                    title="Clear all"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Push Notification Permission Banner */}
          {pushPermission === "default" && (
            <div className="px-4 py-3 bg-amber-50 border-b border-amber-100">
              <div className="flex items-start gap-3">
                <BellRing className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-amber-800">
                    Enable push notifications
                  </p>
                  <p className="text-xs text-amber-700 mt-0.5">
                    Get notified on your phone when new orders arrive
                  </p>
                  <button
                    onClick={requestPushPermission}
                    className="mt-2 text-xs font-medium text-amber-800 bg-amber-200 hover:bg-amber-300 px-3 py-1 rounded-full transition-colors"
                  >
                    Enable Notifications
                  </button>
                </div>
              </div>
            </div>
          )}

          {pushPermission === "denied" && (
            <div className="px-4 py-2 bg-red-50 border-b border-red-100">
              <div className="flex items-center gap-2">
                <BellOff className="h-4 w-4 text-red-500" />
                <p className="text-xs text-red-700">
                  Push notifications blocked. Enable in browser settings.
                </p>
              </div>
            </div>
          )}

          {/* Notifications List */}
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="px-4 py-8 text-center text-muted-foreground">
                <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No notifications</p>
              </div>
            ) : (
              <div className="divide-y">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`px-4 py-3 hover:bg-muted/50 cursor-pointer transition-colors ${
                      !notification.read ? "bg-primary/5" : ""
                    }`}
                    onClick={() =>
                      handleNotificationClick(
                        notification.id,
                        notification.type,
                        notification.data as NotificationData
                      )
                    }
                  >
                    <div className="flex gap-3">
                      <span className="text-xl">
                        {getNotificationIcon(notification.type)}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-medium text-sm truncate">
                            {notification.title}
                          </p>
                          <div className="flex items-center gap-1">
                            {!notification.read && (
                              <span className="flex-shrink-0 h-2 w-2 rounded-full bg-primary" />
                            )}
                            <ExternalLink className="h-3 w-3 text-muted-foreground" />
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {notification.message}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {getTimeAgo(notification.timestamp)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="border-t px-4 py-2">
              <p className="text-xs text-muted-foreground text-center">
                {unreadCount > 0
                  ? `${unreadCount} unread notification${unreadCount > 1 ? "s" : ""}`
                  : "All caught up!"}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
