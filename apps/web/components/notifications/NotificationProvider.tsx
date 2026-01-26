"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";

interface Notification {
  id: string;
  type: "NEW_ORDER" | "ORDER_READY" | "ORDER_UPDATE" | "BILL_REQUEST" | "TABLE_UPDATE";
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  data?: Record<string, unknown>;
}

type ConnectionStatus = "connected" | "connecting" | "disconnected";
type PushPermission = "granted" | "denied" | "default" | "unsupported";

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  addNotification: (notification: Omit<Notification, "id" | "timestamp" | "read">) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearNotifications: () => void;
  soundEnabled: boolean;
  toggleSound: () => void;
  connectionStatus: ConnectionStatus;
  pushPermission: PushPermission;
  requestPushPermission: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | null>(null);

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error("useNotifications must be used within NotificationProvider");
  }
  return context;
}

// Sound notification using Web Audio API
function playNotificationSound() {
  try {
    const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    // Pleasant notification tone
    oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
    oscillator.frequency.setValueAtTime(1000, audioContext.currentTime + 0.1);
    oscillator.frequency.setValueAtTime(800, audioContext.currentTime + 0.2);

    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.3);
  } catch (error) {
    console.warn("Could not play notification sound:", error);
  }
}

// Register service worker
async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if ("serviceWorker" in navigator) {
    try {
      const registration = await navigator.serviceWorker.register("/sw.js");
      console.log("[SW] Service worker registered:", registration.scope);
      return registration;
    } catch (error) {
      console.error("[SW] Service worker registration failed:", error);
      return null;
    }
  }
  return null;
}

// Get current notification permission
function getNotificationPermission(): PushPermission {
  if (!("Notification" in window)) {
    return "unsupported";
  }
  return Notification.permission as PushPermission;
}

// Request browser notification permission
async function requestNotificationPermission(): Promise<PushPermission> {
  if (!("Notification" in window)) {
    return "unsupported";
  }

  if (Notification.permission === "default") {
    const result = await Notification.requestPermission();
    return result as PushPermission;
  }

  return Notification.permission as PushPermission;
}

// Show browser/push notification via service worker
async function showPushNotification(
  title: string,
  body: string,
  type: string,
  data?: Record<string, unknown>
) {
  // Try to show via service worker first (works even when tab is in background)
  if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
    try {
      const registration = await navigator.serviceWorker.ready;
      await registration.showNotification(title, {
        body,
        icon: "/icons/icon-192x192.png",
        badge: "/icons/icon-72x72.png",
        tag: `qrdine-${type}-${Date.now()}`,
        requireInteraction: true,
        data: {
          type,
          ...data,
          restaurantSlug: window.location.pathname.split("/")[1] || "",
        },
      } as NotificationOptions);
      return;
    } catch (error) {
      console.warn("[SW] Could not show notification via SW:", error);
    }
  }

  // Fallback to regular Notification API
  if ("Notification" in window && Notification.permission === "granted") {
    new Notification(title, {
      body,
      icon: "/icons/icon-192x192.png",
      badge: "/icons/icon-72x72.png",
      tag: `qrdine-${type}`,
    });
  }
}

interface NotificationProviderProps {
  children: React.ReactNode;
  userRole?: string;
}

export function NotificationProvider({ children, userRole }: NotificationProviderProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>("disconnected");
  const [pushPermission, setPushPermission] = useState<PushPermission>("default");
  const lastOrderCountRef = useRef<number>(0);
  const lastReadyCountRef = useRef<number>(0);
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Register service worker and load preferences
  useEffect(() => {
    const saved = localStorage.getItem("qrdine-notification-sound");
    if (saved !== null) {
      setSoundEnabled(saved === "true");
    }

    // Register service worker
    registerServiceWorker();

    // Check current notification permission
    setPushPermission(getNotificationPermission());
  }, []);

  // Request push notification permission
  const requestPushPermission = useCallback(async () => {
    const permission = await requestNotificationPermission();
    setPushPermission(permission);
  }, []);

  // Save sound preference
  const toggleSound = useCallback(() => {
    setSoundEnabled((prev) => {
      const newValue = !prev;
      localStorage.setItem("qrdine-notification-sound", String(newValue));
      return newValue;
    });
  }, []);

  const addNotification = useCallback(
    (notification: Omit<Notification, "id" | "timestamp" | "read">) => {
      const newNotification: Notification = {
        ...notification,
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date(),
        read: false,
      };

      setNotifications((prev) => [newNotification, ...prev].slice(0, 50)); // Keep last 50

      // Play sound if enabled
      if (soundEnabled) {
        playNotificationSound();
      }

      // Show push/browser notification (works on mobile and desktop)
      showPushNotification(
        notification.title,
        notification.message,
        notification.type,
        notification.data
      );
    },
    [soundEnabled]
  );

  const markAsRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  // Handle SSE events from server
  const handleSSEEvent = useCallback(
    (eventData: {
      type: string;
      data?: {
        orderId?: string;
        tableNumber?: string;
        tableName?: string;
        status?: string;
        message?: string;
      };
    }) => {
      switch (eventData.type) {
        case "NEW_ORDER":
          addNotification({
            type: "NEW_ORDER",
            title: "New Order!",
            message: eventData.data?.tableName
              ? `New order from ${eventData.data.tableName}`
              : "New order received",
            data: eventData.data,
          });
          break;
        case "ORDER_READY":
          addNotification({
            type: "ORDER_READY",
            title: "Order Ready!",
            message: eventData.data?.tableName
              ? `Order for ${eventData.data.tableName} is ready`
              : "Order is ready to serve",
            data: eventData.data,
          });
          break;
        case "ORDER_UPDATE":
          addNotification({
            type: "ORDER_UPDATE",
            title: "Order Updated",
            message: eventData.data?.message || "Order status changed",
            data: eventData.data,
          });
          break;
        case "BILL_REQUEST":
          addNotification({
            type: "BILL_REQUEST",
            title: "Bill Requested",
            message: eventData.data?.message || "A table requested the bill",
            data: eventData.data,
          });
          break;
        case "TABLE_UPDATE":
          addNotification({
            type: "TABLE_UPDATE",
            title: "Table Update",
            message: eventData.data?.message || "Table status changed",
            data: eventData.data,
          });
          break;
      }
    },
    [addNotification]
  );

  // Connect to SSE for real-time notifications
  useEffect(() => {
    if (!userRole || !["KITCHEN", "WAITER", "MANAGER", "ADMIN", "OWNER", "HOST"].includes(userRole)) {
      return;
    }

    const connectSSE = () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }

      setConnectionStatus("connecting");

      const eventSource = new EventSource("/api/notifications/stream");
      eventSourceRef.current = eventSource;

      eventSource.onopen = () => {
        setConnectionStatus("connected");
        console.log("[SSE] Connected to notification stream");
      };

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === "CONNECTED" || data.type === "HEARTBEAT") {
            // Connection/heartbeat messages, ignore
            return;
          }
          handleSSEEvent(data);
        } catch (error) {
          console.error("[SSE] Error parsing event:", error);
        }
      };

      eventSource.onerror = () => {
        setConnectionStatus("disconnected");
        eventSource.close();
        eventSourceRef.current = null;

        // Attempt to reconnect after 5 seconds
        reconnectTimeoutRef.current = setTimeout(() => {
          console.log("[SSE] Attempting to reconnect...");
          connectSSE();
        }, 5000);
      };
    };

    connectSSE();

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [userRole, handleSSEEvent]);

  // Fallback polling when SSE is disconnected
  useEffect(() => {
    if (!userRole || !["KITCHEN", "WAITER", "MANAGER", "ADMIN", "OWNER"].includes(userRole)) {
      return;
    }

    // Only poll when SSE is disconnected
    if (connectionStatus === "connected") {
      return;
    }

    const pollOrders = async () => {
      try {
        // Poll for pending orders (for Kitchen/Waiter)
        if (["KITCHEN", "WAITER", "MANAGER", "ADMIN", "OWNER"].includes(userRole)) {
          const res = await fetch("/api/orders?status=PENDING&limit=100");
          if (res.ok) {
            const data = await res.json();
            const pendingCount = data.orders?.length || 0;

            if (pendingCount > lastOrderCountRef.current && lastOrderCountRef.current > 0) {
              const newOrders = pendingCount - lastOrderCountRef.current;
              addNotification({
                type: "NEW_ORDER",
                title: "New Order!",
                message: `${newOrders} new order${newOrders > 1 ? "s" : ""} received`,
              });
            }
            lastOrderCountRef.current = pendingCount;
          }
        }

        // Poll for ready orders (for Waiter)
        if (["WAITER", "MANAGER", "ADMIN", "OWNER"].includes(userRole)) {
          const res = await fetch("/api/orders?status=READY&limit=100");
          if (res.ok) {
            const data = await res.json();
            const readyCount = data.orders?.length || 0;

            if (readyCount > lastReadyCountRef.current && lastReadyCountRef.current > 0) {
              const newReady = readyCount - lastReadyCountRef.current;
              addNotification({
                type: "ORDER_READY",
                title: "Order Ready!",
                message: `${newReady} order${newReady > 1 ? "s are" : " is"} ready to serve`,
              });
            }
            lastReadyCountRef.current = readyCount;
          }
        }
      } catch (error) {
        console.error("Error polling orders:", error);
      }
    };

    // Initial poll
    pollOrders();

    // Poll every 10 seconds as fallback
    const interval = setInterval(pollOrders, 10000);

    return () => clearInterval(interval);
  }, [userRole, addNotification, connectionStatus]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        addNotification,
        markAsRead,
        markAllAsRead,
        clearNotifications,
        soundEnabled,
        toggleSound,
        connectionStatus,
        pushPermission,
        requestPushPermission,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}
