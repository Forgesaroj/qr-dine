"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
} from "@qr-dine/ui";
import {
  Bell,
  BellOff,
  Volume2,
  VolumeX,
  X,
  AlertTriangle,
  Clock,
  ShoppingCart,
  Receipt,
  Users,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Settings,
} from "lucide-react";

interface Alert {
  id: string;
  type: string;
  message: string;
  tableNumber?: string;
  timestamp: string;
  priority?: "low" | "normal" | "high" | "critical";
  read: boolean;
}

const ALERT_ICONS: Record<string, typeof Bell> = {
  NEW_ORDER: ShoppingCart,
  ORDER_READY: Sparkles,
  BILL_REQUEST: Receipt,
  TABLE_UPDATE: Users,
  ASSISTANCE_REQUEST: Bell,
  SESSION_ALERT: AlertTriangle,
};

const ALERT_COLORS: Record<string, string> = {
  critical: "bg-red-100 border-red-300 text-red-800",
  high: "bg-orange-100 border-orange-300 text-orange-800",
  normal: "bg-blue-100 border-blue-300 text-blue-800",
  low: "bg-gray-100 border-gray-300 text-gray-800",
};

const PRIORITY_FROM_TYPE: Record<string, "low" | "normal" | "high" | "critical"> = {
  NEW_ORDER: "normal",
  ORDER_READY: "normal",
  BILL_REQUEST: "high",
  TABLE_UPDATE: "low",
  ASSISTANCE_REQUEST: "high",
  SESSION_ALERT: "critical",
  otp_help: "high",
  order_help: "normal",
  long_stay_warning: "high",
  long_stay_critical: "critical",
  cleaning_delay: "normal",
  needs_attention: "critical",
};

export function ManagerAlertsPanel() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [isLive, setIsLive] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isExpanded, setIsExpanded] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const eventSourceRef = useRef<EventSource | null>(null);

  // Sound notification preferences
  const [soundPrefs, setSoundPrefs] = useState({
    NEW_ORDER: false,
    ORDER_READY: false,
    BILL_REQUEST: true,
    ASSISTANCE_REQUEST: true,
    SESSION_ALERT: true,
    long_stay_critical: true,
  });

  // Play notification sound using Web Audio API
  const playSound = useCallback((alertType: string, priority?: string) => {
    if (!soundEnabled) return;

    // Check if sound is enabled for this alert type
    const shouldPlay = soundPrefs[alertType as keyof typeof soundPrefs] ?? false;
    if (!shouldPlay) return;

    try {
      const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      // Different tones for different priorities
      if (priority === "critical") {
        // Urgent beep - higher pitch, double beep
        oscillator.frequency.value = 880;
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.15);

        // Second beep
        setTimeout(() => {
          const osc2 = audioContext.createOscillator();
          const gain2 = audioContext.createGain();
          osc2.connect(gain2);
          gain2.connect(audioContext.destination);
          osc2.frequency.value = 880;
          gain2.gain.setValueAtTime(0.3, audioContext.currentTime);
          gain2.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
          osc2.start(audioContext.currentTime);
          osc2.stop(audioContext.currentTime + 0.15);
        }, 200);
      } else {
        // Normal notification beep
        oscillator.frequency.value = 660;
        gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.15);
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.2);
      }
    } catch (e) {
      console.log("Audio playback failed:", e);
    }
  }, [soundEnabled, soundPrefs]);

  const addAlert = useCallback((event: {
    type: string;
    data: {
      message?: string;
      tableNumber?: string;
      alertType?: string;
      timestamp: string;
      [key: string]: unknown;
    };
  }) => {
    const alertType = event.data.alertType || event.type;
    const priority = PRIORITY_FROM_TYPE[alertType] || "normal";

    const newAlert: Alert = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: alertType,
      message: event.data.message || `${event.type} at Table ${event.data.tableNumber || "?"}`,
      tableNumber: event.data.tableNumber,
      timestamp: event.data.timestamp,
      priority,
      read: false,
    };

    setAlerts((prev) => [newAlert, ...prev].slice(0, 50)); // Keep max 50 alerts
    setUnreadCount((prev) => prev + 1);

    // Play sound for critical/high priority
    if (priority === "critical" || priority === "high") {
      playSound(alertType, priority);
    }
  }, [playSound]);

  // Connect to SSE
  useEffect(() => {
    if (!isLive) {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      return;
    }

    const connectSSE = () => {
      const eventSource = new EventSource("/api/notifications/stream");
      eventSourceRef.current = eventSource;

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          addAlert(data);
        } catch (e) {
          console.error("Error parsing SSE message:", e);
        }
      };

      eventSource.onerror = () => {
        console.log("SSE connection error, reconnecting...");
        eventSource.close();
        setTimeout(connectSSE, 5000);
      };
    };

    connectSSE();

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, [isLive, addAlert]);

  const markAsRead = (alertId: string) => {
    setAlerts((prev) =>
      prev.map((a) => (a.id === alertId ? { ...a, read: true } : a))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
  };

  const markAllAsRead = () => {
    setAlerts((prev) => prev.map((a) => ({ ...a, read: true })));
    setUnreadCount(0);
  };

  const clearAll = () => {
    setAlerts([]);
    setUnreadCount(0);
  };

  const dismissAlert = (alertId: string) => {
    const alert = alerts.find((a) => a.id === alertId);
    if (alert && !alert.read) {
      setUnreadCount((prev) => Math.max(0, prev - 1));
    }
    setAlerts((prev) => prev.filter((a) => a.id !== alertId));
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });
  };

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Real-time Alerts
            {unreadCount > 0 && (
              <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                {unreadCount}
              </span>
            )}
          </CardTitle>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`p-1.5 rounded hover:bg-gray-100 ${
                soundEnabled ? "text-green-600" : "text-gray-400"
              }`}
              title={soundEnabled ? "Sound On" : "Sound Off"}
            >
              {soundEnabled ? (
                <Volume2 className="h-4 w-4" />
              ) : (
                <VolumeX className="h-4 w-4" />
              )}
            </button>
            <button
              onClick={() => setIsLive(!isLive)}
              className={`p-1.5 rounded hover:bg-gray-100 ${
                isLive ? "text-green-600" : "text-gray-400"
              }`}
              title={isLive ? "Live" : "Paused"}
            >
              {isLive ? (
                <Bell className="h-4 w-4" />
              ) : (
                <BellOff className="h-4 w-4" />
              )}
            </button>
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-1.5 rounded hover:bg-gray-100 text-gray-600"
              title="Alert Settings"
            >
              <Settings className="h-4 w-4" />
            </button>
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1.5 rounded hover:bg-gray-100 text-gray-600"
            >
              {isExpanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>

        {/* Live indicator */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span
            className={`w-2 h-2 rounded-full ${
              isLive ? "bg-green-500 animate-pulse" : "bg-gray-400"
            }`}
          />
          {isLive ? "Live" : "Paused"}
          {alerts.length > 0 && (
            <span className="ml-auto">
              <button
                onClick={markAllAsRead}
                className="text-blue-600 hover:underline mr-2"
              >
                Mark all read
              </button>
              <button
                onClick={clearAll}
                className="text-gray-500 hover:underline"
              >
                Clear
              </button>
            </span>
          )}
        </div>
      </CardHeader>

      {/* Sound Settings Panel */}
      {showSettings && (
        <div className="px-4 pb-3 border-b">
          <p className="text-xs font-medium text-muted-foreground mb-2">
            Sound alerts for:
          </p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            {Object.entries(soundPrefs).map(([key, enabled]) => (
              <label key={key} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={enabled}
                  onChange={(e) =>
                    setSoundPrefs((prev) => ({
                      ...prev,
                      [key]: e.target.checked,
                    }))
                  }
                  className="rounded"
                />
                <span className="truncate">
                  {key.replace(/_/g, " ").replace(/([A-Z])/g, " $1").trim()}
                </span>
              </label>
            ))}
          </div>
        </div>
      )}

      {isExpanded && (
        <CardContent className="pt-2">
          {alerts.length === 0 ? (
            <p className="text-center text-muted-foreground py-8 text-sm">
              No alerts yet
            </p>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {alerts.map((alert) => {
                const Icon = ALERT_ICONS[alert.type] || AlertTriangle;
                const colorClass =
                  ALERT_COLORS[alert.priority || "normal"];

                return (
                  <div
                    key={alert.id}
                    className={`relative p-2 rounded border ${colorClass} ${
                      !alert.read ? "border-l-4" : "opacity-70"
                    }`}
                    onClick={() => markAsRead(alert.id)}
                  >
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        dismissAlert(alert.id);
                      }}
                      className="absolute top-1 right-1 p-0.5 rounded hover:bg-black/10"
                    >
                      <X className="h-3 w-3" />
                    </button>

                    <div className="flex items-start gap-2 pr-6">
                      <Icon className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {alert.message}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                          <Clock className="h-3 w-3" />
                          {formatTime(alert.timestamp)}
                          {alert.tableNumber && (
                            <span className="px-1.5 py-0.5 bg-white/50 rounded">
                              Table {alert.tableNumber}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}

export default ManagerAlertsPanel;
