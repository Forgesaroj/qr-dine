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
    timestamp: string;
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
