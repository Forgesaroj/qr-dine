// QR Dine Service Worker for Push Notifications

const CACHE_NAME = "qrdine-v1";

// Install event
self.addEventListener("install", (event) => {
  console.log("[SW] Service Worker installed");
  self.skipWaiting();
});

// Activate event
self.addEventListener("activate", (event) => {
  console.log("[SW] Service Worker activated");
  event.waitUntil(clients.claim());
});

// Push notification event
self.addEventListener("push", (event) => {
  console.log("[SW] Push received:", event);

  let data = {
    title: "QR Dine",
    body: "You have a new notification",
    icon: "/icons/icon-192x192.png",
    badge: "/icons/icon-72x72.png",
    tag: "qrdine-notification",
    data: {},
  };

  if (event.data) {
    try {
      const payload = event.data.json();
      data = {
        ...data,
        ...payload,
      };
    } catch (e) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: data.icon || "/icons/icon-192x192.png",
    badge: data.badge || "/icons/icon-72x72.png",
    tag: data.tag || "qrdine-notification",
    vibrate: [200, 100, 200],
    data: data.data || {},
    actions: getActionsForType(data.type),
    requireInteraction: true,
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});

// Get notification actions based on type
function getActionsForType(type) {
  switch (type) {
    case "NEW_ORDER":
      return [
        { action: "view", title: "View Order" },
        { action: "dismiss", title: "Dismiss" },
      ];
    case "ORDER_READY":
      return [
        { action: "view", title: "View" },
        { action: "dismiss", title: "Dismiss" },
      ];
    case "BILL_REQUEST":
      return [
        { action: "view", title: "View Bill" },
        { action: "dismiss", title: "Dismiss" },
      ];
    default:
      return [{ action: "view", title: "View" }];
  }
}

// Notification click event
self.addEventListener("notificationclick", (event) => {
  console.log("[SW] Notification clicked:", event.action);
  event.notification.close();

  if (event.action === "dismiss") {
    return;
  }

  // Get the notification data
  const data = event.notification.data || {};
  let url = "/";

  // Determine URL based on notification type
  switch (data.type) {
    case "NEW_ORDER":
    case "ORDER_UPDATE":
    case "ORDER_READY":
      url = data.restaurantSlug ? `/${data.restaurantSlug}/orders` : "/";
      break;
    case "BILL_REQUEST":
      url = data.restaurantSlug ? `/${data.restaurantSlug}/billing` : "/";
      break;
    case "TABLE_UPDATE":
      url = data.restaurantSlug ? `/${data.restaurantSlug}/tables` : "/";
      break;
    default:
      url = data.restaurantSlug ? `/${data.restaurantSlug}/dashboard` : "/";
  }

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      // If a window is already open, focus it
      for (const client of clientList) {
        if (client.url.includes(url) && "focus" in client) {
          return client.focus();
        }
      }
      // Otherwise open a new window
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});

// Notification close event
self.addEventListener("notificationclose", (event) => {
  console.log("[SW] Notification closed");
});

// Message from main thread
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
