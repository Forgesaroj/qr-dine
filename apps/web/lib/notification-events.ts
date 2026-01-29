// Server-side notification event emitter for real-time updates
// Uses a simple pub/sub pattern with SSE

type NotificationEvent = {
  type: "NEW_ORDER" | "ORDER_UPDATE" | "ORDER_READY" | "BILL_REQUEST" | "TABLE_UPDATE" | "ASSISTANCE_REQUEST" | "SESSION_ALERT";
  data: {
    orderId?: string;
    tableId?: string;
    tableNumber?: string;
    tableName?: string;
    status?: string;
    message?: string;
    assistanceId?: string;
    billId?: string;
    alertType?: string;
    timestamp: string;
    [key: string]: unknown;
  };
  restaurantId: string;
};

type Subscriber = {
  id: string;
  restaurantId: string;
  role: string;
  controller: ReadableStreamDefaultController;
};

class NotificationEventManager {
  private subscribers: Map<string, Subscriber> = new Map();

  subscribe(
    subscriberId: string,
    restaurantId: string,
    role: string,
    controller: ReadableStreamDefaultController
  ): void {
    this.subscribers.set(subscriberId, {
      id: subscriberId,
      restaurantId,
      role,
      controller,
    });
    console.log(`[SSE] Subscriber ${subscriberId} connected (role: ${role})`);
  }

  unsubscribe(subscriberId: string): void {
    this.subscribers.delete(subscriberId);
    console.log(`[SSE] Subscriber ${subscriberId} disconnected`);
  }

  broadcast(event: NotificationEvent): void {
    const eventData = `data: ${JSON.stringify(event)}\n\n`;
    const encoder = new TextEncoder();

    this.subscribers.forEach((subscriber) => {
      // Only send to subscribers of the same restaurant
      if (subscriber.restaurantId !== event.restaurantId) {
        return;
      }

      // Role-based filtering
      const shouldReceive = this.shouldReceiveEvent(subscriber.role, event.type);
      if (!shouldReceive) {
        return;
      }

      try {
        subscriber.controller.enqueue(encoder.encode(eventData));
      } catch (error) {
        console.error(`[SSE] Error sending to ${subscriber.id}:`, error);
        this.unsubscribe(subscriber.id);
      }
    });
  }

  private shouldReceiveEvent(role: string, eventType: NotificationEvent["type"]): boolean {
    const roleEvents: Record<string, NotificationEvent["type"][]> = {
      OWNER: ["NEW_ORDER", "ORDER_UPDATE", "ORDER_READY", "BILL_REQUEST", "TABLE_UPDATE", "ASSISTANCE_REQUEST", "SESSION_ALERT"],
      MANAGER: ["NEW_ORDER", "ORDER_UPDATE", "ORDER_READY", "BILL_REQUEST", "TABLE_UPDATE", "ASSISTANCE_REQUEST", "SESSION_ALERT"],
      ADMIN: ["NEW_ORDER", "ORDER_UPDATE", "ORDER_READY", "BILL_REQUEST", "TABLE_UPDATE", "ASSISTANCE_REQUEST", "SESSION_ALERT"],
      KITCHEN: ["NEW_ORDER", "ORDER_UPDATE"],
      WAITER: ["NEW_ORDER", "ORDER_READY", "BILL_REQUEST", "TABLE_UPDATE", "ASSISTANCE_REQUEST", "SESSION_ALERT"],
      HOST: ["TABLE_UPDATE", "BILL_REQUEST", "ASSISTANCE_REQUEST"],
    };

    return roleEvents[role]?.includes(eventType) ?? false;
  }

  getSubscriberCount(restaurantId: string): number {
    let count = 0;
    this.subscribers.forEach((sub) => {
      if (sub.restaurantId === restaurantId) count++;
    });
    return count;
  }
}

// Global singleton for notification events
export const notificationEvents = new NotificationEventManager();

// Helper function to emit order-related events
export function emitOrderEvent(
  type: "NEW_ORDER" | "ORDER_UPDATE" | "ORDER_READY",
  restaurantId: string,
  data: {
    orderId: string;
    tableNumber?: string;
    tableName?: string;
    status?: string;
  }
): void {
  notificationEvents.broadcast({
    type,
    restaurantId,
    data: {
      ...data,
      timestamp: new Date().toISOString(),
    },
  });
}

// Helper function to emit bill request events
export function emitBillRequest(
  restaurantId: string,
  tableNumber: string,
  tableName?: string
): void {
  notificationEvents.broadcast({
    type: "BILL_REQUEST",
    restaurantId,
    data: {
      tableNumber,
      tableName,
      message: `Table ${tableName || tableNumber} requested the bill`,
      timestamp: new Date().toISOString(),
    },
  });
}

// Helper function to emit table update events
export function emitTableUpdate(
  restaurantId: string,
  tableNumber: string,
  status: string,
  tableId?: string
): void {
  notificationEvents.broadcast({
    type: "TABLE_UPDATE",
    restaurantId,
    data: {
      tableId,
      tableNumber,
      status,
      timestamp: new Date().toISOString(),
    },
  });
}

// Helper function to emit assistance request events
export function emitAssistanceRequest(
  restaurantId: string,
  data: {
    assistanceId: string;
    tableId?: string;
    tableNumber?: string;
    tableName?: string;
    requestType?: string;
    message?: string;
  }
): void {
  notificationEvents.broadcast({
    type: "ASSISTANCE_REQUEST",
    restaurantId,
    data: {
      ...data,
      message: data.message || `${data.tableName || `Table ${data.tableNumber}`} needs ${data.requestType || "assistance"}`,
      timestamp: new Date().toISOString(),
    },
  });
}

// Helper function to emit session alert events
export function emitSessionAlert(
  restaurantId: string,
  data: {
    tableId?: string;
    tableNumber?: string;
    tableName?: string;
    alertType?: string;
    message: string;
  }
): void {
  notificationEvents.broadcast({
    type: "SESSION_ALERT",
    restaurantId,
    data: {
      ...data,
      timestamp: new Date().toISOString(),
    },
  });
}

/**
 * Session Flow Notification Types
 * Per SESSION_FLOW_SPEC.md - Section on Notifications
 */
export type SessionFlowNotificationType =
  | "otp_help"           // Guest hasn't entered OTP for 2+ min
  | "order_help"         // Guest seated 5+ min without order
  | "long_stay_warning"  // Session > 90 min
  | "long_stay_critical" // Session > 120 min
  | "cleaning_delay"     // Table waiting for cleaning > threshold
  | "new_guest_seated"   // Guest verified OTP and seated
  | "order_placed"       // Guest placed an order
  | "bill_requested"     // Guest requested bill
  | "payment_completed"  // Payment completed
  | "table_ready"        // Table cleaned and available
  | "needs_attention";   // Guest requested assistance

export interface SendNotificationParams {
  restaurantId: string;
  type: SessionFlowNotificationType;
  title: string;
  message: string;
  tableId?: string;
  sessionId?: string;
  orderId?: string;
  targetRoles?: ("WAITER" | "MANAGER" | "KITCHEN" | "HOST")[];
  priority?: "low" | "normal" | "high" | "critical";
  data?: Record<string, unknown>;
}

/**
 * Send a notification for session flow events
 * This is a unified function for all session-related notifications
 */
export async function sendNotification(params: SendNotificationParams): Promise<void> {
  const {
    restaurantId,
    type,
    title,
    message,
    tableId,
    sessionId,
    orderId,
    targetRoles = ["WAITER"],
    priority = "normal",
    data,
  } = params;

  // Emit SSE event for real-time updates
  notificationEvents.broadcast({
    type: "SESSION_ALERT",
    restaurantId,
    data: {
      tableId,
      alertType: type,
      message,
      timestamp: new Date().toISOString(),
      ...data,
    },
  });

  // Log for debugging
  console.log(`[Notification] ${type}: ${message}`, {
    restaurantId,
    tableId,
    sessionId,
    orderId,
    targetRoles,
    priority,
  });

  // Future: Could integrate with push notifications, SMS, etc.
  // For now, just broadcast via SSE
}

/**
 * Notification templates for common session flow events
 */
export const notificationTemplates = {
  otp_help: (tableNumber: string, minutes: number) => ({
    title: "OTP Help Needed",
    message: `Table ${tableNumber}: Guest hasn't entered OTP for ${minutes} minutes`,
  }),

  order_help: (tableNumber: string, minutes: number) => ({
    title: "Order Help Needed",
    message: `Table ${tableNumber}: Guest seated ${minutes} minutes without ordering`,
  }),

  long_stay_warning: (tableNumber: string, minutes: number, guestCount?: number) => ({
    title: "Long Stay Alert",
    message: `Table ${tableNumber}: ${guestCount ? `${guestCount} guests` : "Guests"} seated for ${minutes} minutes`,
  }),

  long_stay_critical: (tableNumber: string, minutes: number, guestCount?: number) => ({
    title: "Long Stay Critical",
    message: `Table ${tableNumber}: ${guestCount ? `${guestCount} guests` : "Guests"} seated for ${minutes}+ minutes`,
  }),

  cleaning_delay: (tableNumber: string, minutes: number) => ({
    title: "Cleaning Needed",
    message: `Table ${tableNumber}: Waiting for cleaning for ${minutes} minutes`,
  }),

  new_guest_seated: (tableNumber: string, guestCount?: number) => ({
    title: "New Guest Seated",
    message: `Table ${tableNumber}: ${guestCount ? `${guestCount} guests` : "Guest"} seated`,
  }),

  order_placed: (tableNumber: string, itemCount: number, total: number) => ({
    title: "New Order",
    message: `Table ${tableNumber}: ${itemCount} items, ₹${total}`,
  }),

  bill_requested: (tableNumber: string) => ({
    title: "Bill Requested",
    message: `Table ${tableNumber} requested the bill`,
  }),

  payment_completed: (tableNumber: string, amount: number) => ({
    title: "Payment Completed",
    message: `Table ${tableNumber}: ₹${amount} received`,
  }),

  table_ready: (tableNumber: string) => ({
    title: "Table Ready",
    message: `Table ${tableNumber} is cleaned and ready`,
  }),

  needs_attention: (tableNumber: string, reason?: string) => ({
    title: "Assistance Needed",
    message: `Table ${tableNumber}${reason ? `: ${reason}` : " needs attention"}`,
  }),
};
