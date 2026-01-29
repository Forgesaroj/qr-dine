// Role-Based Access Control Configuration
// Defines which roles can access which pages and perform which actions

export type Role = "OWNER" | "MANAGER" | "WAITER" | "KITCHEN" | "HOST" | "ADMIN";

export type Permission =
  | "dashboard:view"
  | "menu:view"
  | "menu:edit"
  | "orders:view"
  | "orders:update"
  | "kitchen:view"
  | "kitchen:update"
  | "billing:view"
  | "billing:create"
  | "billing:process_payment"
  | "tables:view"
  | "tables:edit"
  | "tables:manage_sessions"
  | "staff:view"
  | "staff:manage"
  | "reports:view"
  | "settings:view"
  | "settings:edit";

export type PageAccess =
  | "dashboard"
  | "menu"
  | "orders"
  | "kitchen"
  | "bar"
  | "billing"
  | "tables"
  | "reservations"
  | "assistance"
  | "quick-order"
  | "staff"
  | "customers"
  | "promotions"
  | "chat"
  | "shift-notes"
  | "briefing"
  | "lost-found"
  | "activity-log"
  | "reports"
  | "settings";

// Define which pages each role can access
export const rolePageAccess: Record<Role, PageAccess[]> = {
  OWNER: [
    "dashboard",
    "menu",
    "orders",
    "kitchen",
    "bar",
    "billing",
    "tables",
    "reservations",
    "assistance",
    "quick-order",
    "staff",
    "customers",
    "promotions",
    "chat",
    "shift-notes",
    "briefing",
    "lost-found",
    "activity-log",
    "reports",
    "settings",
  ],
  ADMIN: [
    "dashboard",
    "menu",
    "orders",
    "kitchen",
    "bar",
    "billing",
    "tables",
    "reservations",
    "assistance",
    "quick-order",
    "staff",
    "customers",
    "promotions",
    "chat",
    "shift-notes",
    "briefing",
    "lost-found",
    "activity-log",
    "reports",
    "settings",
  ],
  MANAGER: [
    "dashboard",
    "menu",
    "orders",
    "kitchen",
    "bar",
    "billing",
    "tables",
    "reservations",
    "assistance",
    "quick-order",
    "staff",
    "customers",
    "promotions",
    "chat",
    "shift-notes",
    "briefing",
    "lost-found",
    "activity-log",
    "reports",
  ],
  WAITER: ["dashboard", "orders", "billing", "tables", "assistance", "quick-order", "chat", "shift-notes", "briefing", "lost-found"],
  KITCHEN: ["kitchen", "bar", "chat", "shift-notes", "briefing"],
  HOST: ["dashboard", "tables", "reservations", "orders", "assistance", "quick-order", "chat", "shift-notes", "briefing", "lost-found"],
};

// Define which permissions each role has
export const rolePermissions: Record<Role, Permission[]> = {
  OWNER: [
    "dashboard:view",
    "menu:view",
    "menu:edit",
    "orders:view",
    "orders:update",
    "kitchen:view",
    "kitchen:update",
    "billing:view",
    "billing:create",
    "billing:process_payment",
    "tables:view",
    "tables:edit",
    "tables:manage_sessions",
    "staff:view",
    "staff:manage",
    "reports:view",
    "settings:view",
    "settings:edit",
  ],
  ADMIN: [
    "dashboard:view",
    "menu:view",
    "menu:edit",
    "orders:view",
    "orders:update",
    "kitchen:view",
    "kitchen:update",
    "billing:view",
    "billing:create",
    "billing:process_payment",
    "tables:view",
    "tables:edit",
    "tables:manage_sessions",
    "staff:view",
    "staff:manage",
    "reports:view",
    "settings:view",
    "settings:edit",
  ],
  MANAGER: [
    "dashboard:view",
    "menu:view",
    "menu:edit",
    "orders:view",
    "orders:update",
    "kitchen:view",
    "kitchen:update",
    "billing:view",
    "billing:create",
    "billing:process_payment",
    "tables:view",
    "tables:edit",
    "tables:manage_sessions",
    "staff:view",
    "reports:view",
  ],
  WAITER: [
    "dashboard:view",
    "orders:view",
    "orders:update",
    "billing:view",
    "billing:create",
    "tables:view",
    "tables:manage_sessions",
  ],
  KITCHEN: ["kitchen:view", "kitchen:update", "orders:view"],
  HOST: [
    "dashboard:view",
    "tables:view",
    "tables:manage_sessions",
    "orders:view",
  ],
};

// Helper functions
export function canAccessPage(role: string, page: PageAccess): boolean {
  const validRole = role as Role;
  if (!rolePageAccess[validRole]) return false;
  return rolePageAccess[validRole].includes(page);
}

export function hasPermission(role: string, permission: Permission): boolean {
  const validRole = role as Role;
  if (!rolePermissions[validRole]) return false;
  return rolePermissions[validRole].includes(permission);
}

export function getAccessiblePages(role: string): PageAccess[] {
  const validRole = role as Role;
  return rolePageAccess[validRole] || [];
}

export function getDefaultPage(role: string): string {
  const validRole = role as Role;
  switch (validRole) {
    case "KITCHEN":
      return "kitchen";
    case "HOST":
      return "tables";
    default:
      return "dashboard";
  }
}

// Page route mapping
export const pageRoutes: Record<PageAccess, string> = {
  dashboard: "/dashboard",
  menu: "/menu",
  orders: "/orders",
  kitchen: "/kitchen",
  bar: "/bar",
  billing: "/billing",
  tables: "/tables",
  reservations: "/reservations",
  assistance: "/assistance",
  "quick-order": "/quick-order",
  staff: "/staff",
  customers: "/customers",
  promotions: "/promotions",
  chat: "/chat",
  "shift-notes": "/shift-notes",
  briefing: "/briefing",
  "lost-found": "/lost-found",
  "activity-log": "/reports/activity",
  reports: "/reports",
  settings: "/settings",
};

// Get the page from a route path
export function getPageFromRoute(route: string): PageAccess | null {
  const path = route.split("/").pop() || "";
  if (path in pageRoutes || Object.values(pageRoutes).some((r) => r.endsWith(`/${path}`))) {
    return path as PageAccess;
  }
  return null;
}
