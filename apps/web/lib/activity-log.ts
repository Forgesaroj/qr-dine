import { prisma } from "@/lib/prisma";

// Activity Categories
export const ACTIVITY_CATEGORIES = {
  SEATING: "seating",
  ORDER: "order",
  KITCHEN: "kitchen",
  BAR: "bar",
  WAITER: "waiter",
  BILLING: "billing",
  MANAGER: "manager",
  STAFF: "staff",
  ISSUE: "issue",
} as const;

// Activity Types by Category
export const ACTIVITY_TYPES = {
  // Seating & Table
  TABLE_SEATED: "table_seated",
  GUEST_COUNT_UPDATED: "guest_count_updated",
  TABLE_CHANGED: "table_changed",
  TABLES_MERGED: "tables_merged",
  TABLES_UNMERGED: "tables_unmerged",
  TABLE_VACATED: "table_vacated",
  CLEANING_STARTED: "cleaning_started",
  CLEANING_DONE: "cleaning_done",

  // Orders
  ORDER_PLACED: "order_placed",
  ORDER_MODIFIED: "order_modified",
  ITEMS_ADDED: "items_added",
  CANCEL_REQUESTED: "cancel_requested",
  CANCEL_APPROVED: "cancel_approved",
  CANCEL_REJECTED: "cancel_rejected",
  ITEM_UNAVAILABLE: "item_unavailable",
  ITEM_AVAILABLE: "item_available",

  // Kitchen
  KITCHEN_RECEIVED: "kitchen_received",
  PREP_STARTED: "prep_started",
  ITEM_READY: "item_ready",

  // Bar
  BAR_RECEIVED: "bar_received",
  DRINK_STARTED: "drink_started",
  DRINK_READY: "drink_ready",

  // Waiter Actions
  WATER_SERVED: "water_served",
  FOOD_PICKED_UP: "food_picked_up",
  FOOD_SERVED: "food_served",
  DRINK_PICKED_UP: "drink_picked_up",
  DRINK_SERVED: "drink_served",
  ASSISTANCE_ACKNOWLEDGED: "assistance_acknowledged",
  ASSISTANCE_COMPLETED: "assistance_completed",

  // Billing & Payment
  BILL_REQUESTED: "bill_requested",
  BILL_PRINTED: "bill_printed",
  BILL_DELIVERED: "bill_delivered",
  PAYMENT_COLLECTED: "payment_collected",
  PAYMENT_COMPLETED: "payment_completed",
  PARTIAL_PAYMENT: "partial_payment",

  // Manager Actions
  DISCOUNT_APPLIED: "discount_applied",
  ITEM_VOIDED: "item_voided",
  ITEM_REPLACED: "item_replaced",
  WAITER_REASSIGNED: "waiter_reassigned",
  NOTE_ADDED: "note_added",

  // Staff & Shift
  SHIFT_STARTED: "shift_started",
  SHIFT_ENDED: "shift_ended",
  BREAK_STARTED: "break_started",
  BREAK_ENDED: "break_ended",
  TABLE_ASSIGNED: "table_assigned",

  // Issues & Escalations
  ASSISTANCE_REQUESTED: "assistance_requested",
  FOOD_ISSUE_REPORTED: "food_issue_reported",
  ESCALATION_TRIGGERED: "escalation_triggered",
  ISSUE_RESOLVED: "issue_resolved",

  // Session
  SESSION_STARTED: "session_started",
  SESSION_ENDED: "session_ended",
} as const;

// Priority Levels
export const PRIORITY_LEVELS = {
  CRITICAL: "critical", // System down, major issue
  URGENT: "urgent",     // Food issue, escalation
  WARNING: "warning",   // Delayed service, complaints
  INFO: "info",         // Normal operations
  NOTICE: "notice",     // Administrative actions
} as const;

// Activity Icons for UI
export const ACTIVITY_ICONS: Record<string, string> = {
  table_seated: "Users",
  guest_count_updated: "Users",
  table_changed: "ArrowRightLeft",
  tables_merged: "Link",
  tables_unmerged: "Unlink",
  table_vacated: "DoorOpen",
  cleaning_started: "Sparkles",
  cleaning_done: "Check",

  order_placed: "FileText",
  order_modified: "Pencil",
  items_added: "Plus",
  cancel_requested: "X",
  cancel_approved: "Check",
  cancel_rejected: "Ban",
  item_unavailable: "Ban",
  item_available: "Check",

  kitchen_received: "ChefHat",
  prep_started: "Flame",
  item_ready: "Check",

  bar_received: "Wine",
  drink_started: "GlassWater",
  drink_ready: "Check",

  water_served: "Droplet",
  food_picked_up: "UtensilsCrossed",
  food_served: "UtensilsCrossed",
  drink_picked_up: "GlassWater",
  drink_served: "GlassWater",
  assistance_acknowledged: "Hand",
  assistance_completed: "Check",

  bill_requested: "Receipt",
  bill_printed: "Printer",
  bill_delivered: "Receipt",
  payment_collected: "Wallet",
  payment_completed: "CheckCircle",
  partial_payment: "CreditCard",

  discount_applied: "Percent",
  item_voided: "Trash",
  item_replaced: "RefreshCw",
  waiter_reassigned: "UserSwitch",
  note_added: "MessageSquare",

  shift_started: "Play",
  shift_ended: "Square",
  break_started: "Pause",
  break_ended: "Play",
  table_assigned: "ClipboardList",

  assistance_requested: "Bell",
  food_issue_reported: "AlertTriangle",
  escalation_triggered: "AlertOctagon",
  issue_resolved: "CheckCircle",

  session_started: "LogIn",
  session_ended: "LogOut",
};

// Get category for activity type
export function getCategoryForActivityType(activityType: string): string {
  const categoryMap: Record<string, string> = {
    // Seating
    table_seated: ACTIVITY_CATEGORIES.SEATING,
    guest_count_updated: ACTIVITY_CATEGORIES.SEATING,
    table_changed: ACTIVITY_CATEGORIES.SEATING,
    tables_merged: ACTIVITY_CATEGORIES.SEATING,
    tables_unmerged: ACTIVITY_CATEGORIES.SEATING,
    table_vacated: ACTIVITY_CATEGORIES.SEATING,
    cleaning_started: ACTIVITY_CATEGORIES.SEATING,
    cleaning_done: ACTIVITY_CATEGORIES.SEATING,

    // Order
    order_placed: ACTIVITY_CATEGORIES.ORDER,
    order_modified: ACTIVITY_CATEGORIES.ORDER,
    items_added: ACTIVITY_CATEGORIES.ORDER,
    cancel_requested: ACTIVITY_CATEGORIES.ORDER,
    cancel_approved: ACTIVITY_CATEGORIES.ORDER,
    cancel_rejected: ACTIVITY_CATEGORIES.ORDER,
    item_unavailable: ACTIVITY_CATEGORIES.ORDER,
    item_available: ACTIVITY_CATEGORIES.ORDER,

    // Kitchen
    kitchen_received: ACTIVITY_CATEGORIES.KITCHEN,
    prep_started: ACTIVITY_CATEGORIES.KITCHEN,
    item_ready: ACTIVITY_CATEGORIES.KITCHEN,

    // Bar
    bar_received: ACTIVITY_CATEGORIES.BAR,
    drink_started: ACTIVITY_CATEGORIES.BAR,
    drink_ready: ACTIVITY_CATEGORIES.BAR,

    // Waiter
    water_served: ACTIVITY_CATEGORIES.WAITER,
    food_picked_up: ACTIVITY_CATEGORIES.WAITER,
    food_served: ACTIVITY_CATEGORIES.WAITER,
    drink_picked_up: ACTIVITY_CATEGORIES.WAITER,
    drink_served: ACTIVITY_CATEGORIES.WAITER,
    assistance_acknowledged: ACTIVITY_CATEGORIES.WAITER,
    assistance_completed: ACTIVITY_CATEGORIES.WAITER,

    // Billing
    bill_requested: ACTIVITY_CATEGORIES.BILLING,
    bill_printed: ACTIVITY_CATEGORIES.BILLING,
    bill_delivered: ACTIVITY_CATEGORIES.BILLING,
    payment_collected: ACTIVITY_CATEGORIES.BILLING,
    payment_completed: ACTIVITY_CATEGORIES.BILLING,
    partial_payment: ACTIVITY_CATEGORIES.BILLING,

    // Manager
    discount_applied: ACTIVITY_CATEGORIES.MANAGER,
    item_voided: ACTIVITY_CATEGORIES.MANAGER,
    item_replaced: ACTIVITY_CATEGORIES.MANAGER,
    waiter_reassigned: ACTIVITY_CATEGORIES.MANAGER,
    note_added: ACTIVITY_CATEGORIES.MANAGER,

    // Staff
    shift_started: ACTIVITY_CATEGORIES.STAFF,
    shift_ended: ACTIVITY_CATEGORIES.STAFF,
    break_started: ACTIVITY_CATEGORIES.STAFF,
    break_ended: ACTIVITY_CATEGORIES.STAFF,
    table_assigned: ACTIVITY_CATEGORIES.STAFF,

    // Issue
    assistance_requested: ACTIVITY_CATEGORIES.ISSUE,
    food_issue_reported: ACTIVITY_CATEGORIES.ISSUE,
    escalation_triggered: ACTIVITY_CATEGORIES.ISSUE,
    issue_resolved: ACTIVITY_CATEGORIES.ISSUE,

    // Session
    session_started: ACTIVITY_CATEGORIES.SEATING,
    session_ended: ACTIVITY_CATEGORIES.SEATING,
  };

  return categoryMap[activityType] || ACTIVITY_CATEGORIES.ORDER;
}

// Interface for creating activity log
export interface CreateActivityLogParams {
  restaurantId: string;
  activityType: string;
  description: string;
  entityType: string;
  entityId?: string;
  userId?: string;
  userName?: string;
  userRole?: string;
  performedBy?: "staff" | "guest" | "system";
  priority?: string;
  tableId?: string;
  sessionId?: string;
  orderId?: string;
  orderItemId?: string;
  relatedActivityId?: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

// Helper function to log activity
export async function logActivity(params: CreateActivityLogParams) {
  const {
    restaurantId,
    activityType,
    description,
    entityType,
    entityId,
    userId,
    userName,
    userRole,
    performedBy = "staff",
    priority = PRIORITY_LEVELS.INFO,
    tableId,
    sessionId,
    orderId,
    orderItemId,
    relatedActivityId,
    details,
    ipAddress,
    userAgent,
  } = params;

  const activityCategory = getCategoryForActivityType(activityType);

  try {
    const log = await prisma.activityLog.create({
      data: {
        restaurantId,
        activityType,
        activityCategory,
        description,
        action: activityType, // Keep backward compatibility
        entityType,
        entityId,
        userId,
        userName,
        userRole,
        performedBy,
        priority,
        tableId,
        sessionId,
        orderId,
        orderItemId,
        relatedActivityId,
        details: details ? (details as object) : undefined,
        ipAddress,
        userAgent,
      },
    });
    return log;
  } catch (error) {
    console.error("Failed to log activity:", error);
    return null;
  }
}

// Format activity for display
export function formatActivityDescription(
  activityType: string,
  details?: Record<string, unknown>
): string {
  const descriptions: Record<string, (d?: Record<string, unknown>) => string> = {
    table_seated: (d) => `Table seated with ${d?.guestCount || "?"} guests`,
    guest_count_updated: (d) => `Guest count updated: ${d?.from} → ${d?.to}`,
    order_placed: (d) => `Order placed: ${d?.itemCount || "?"} items`,
    items_added: (d) => `${d?.itemCount || "?"} items added to order`,
    food_served: (d) => `Food served: ${d?.itemName || "item"}${d?.progress ? ` (${d.progress})` : ""}`,
    drink_served: (d) => `Drink served: ${d?.itemName || "item"}`,
    prep_started: (d) => `Prep started: ${d?.itemName || "item"}${d?.progress ? ` (${d.progress})` : ""}`,
    item_ready: (d) => `Item ready: ${d?.itemName || "item"}${d?.progress ? ` (${d.progress})` : ""}`,
    bill_requested: () => "Bill requested",
    payment_completed: (d) => `Payment completed: Rs. ${d?.amount?.toLocaleString() || "?"}`,
    discount_applied: (d) => `Discount applied: Rs. ${d?.amount?.toLocaleString() || "?"}`,
    food_issue_reported: (d) => `Food issue: ${d?.issue || "reported"}`,
    assistance_requested: (d) => `Assistance requested: ${d?.type || "help needed"}`,
    table_vacated: () => "Table vacated",
    session_ended: (d) => `Session ended (${d?.duration || "?"})`,
  };

  const formatter = descriptions[activityType];
  if (formatter) {
    return formatter(details as Record<string, unknown>);
  }

  // Default: format activity type as readable string
  return activityType
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

// Get priority color class
export function getPriorityColor(priority: string): string {
  const colors: Record<string, string> = {
    critical: "bg-red-600 text-white",
    urgent: "bg-red-500 text-white",
    warning: "bg-yellow-500 text-white",
    info: "bg-blue-500 text-white",
    notice: "bg-gray-400 text-white",
  };
  return colors[priority] ?? "bg-blue-500 text-white";
}

// Get category color class
export function getCategoryColor(category: string): string {
  const colors: Record<string, string> = {
    seating: "bg-purple-100 text-purple-700",
    order: "bg-blue-100 text-blue-700",
    kitchen: "bg-orange-100 text-orange-700",
    bar: "bg-pink-100 text-pink-700",
    waiter: "bg-green-100 text-green-700",
    billing: "bg-yellow-100 text-yellow-700",
    manager: "bg-indigo-100 text-indigo-700",
    staff: "bg-gray-100 text-gray-700",
    issue: "bg-red-100 text-red-700",
  };
  return colors[category] ?? "bg-blue-100 text-blue-700";
}
