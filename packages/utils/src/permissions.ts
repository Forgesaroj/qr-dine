// ═══════════════════════════════════════════════════════════════════════════════
// PERMISSIONS
// ═══════════════════════════════════════════════════════════════════════════════

import { UserRole } from "@qr-dine/types";

export const PERMISSIONS = {
  // ═══════════════════════════════════════════════════════════════════════════
  // DASHBOARD
  // ═══════════════════════════════════════════════════════════════════════════
  "dashboard:view": ["SUPER_ADMIN", "OWNER", "MANAGER", "CASHIER", "WAITER", "KITCHEN", "HOST"],
  "dashboard:view_revenue": ["SUPER_ADMIN", "OWNER", "MANAGER"],
  "dashboard:view_analytics": ["SUPER_ADMIN", "OWNER", "MANAGER"],

  // ═══════════════════════════════════════════════════════════════════════════
  // TABLES
  // ═══════════════════════════════════════════════════════════════════════════
  "tables:view": ["OWNER", "MANAGER", "WAITER", "HOST"],
  "tables:create": ["OWNER", "MANAGER"],
  "tables:update": ["OWNER", "MANAGER"],
  "tables:delete": ["OWNER", "MANAGER"],
  "tables:change_status": ["OWNER", "MANAGER", "WAITER", "HOST"],
  "tables:seat_guests": ["OWNER", "MANAGER", "WAITER", "HOST"],
  "tables:enter_guest_count": ["OWNER", "MANAGER", "WAITER", "HOST"],
  "tables:update_guest_count": ["OWNER", "MANAGER", "WAITER", "HOST"],
  "tables:generate_qr": ["OWNER", "MANAGER"],

  // ═══════════════════════════════════════════════════════════════════════════
  // MENU
  // ═══════════════════════════════════════════════════════════════════════════
  "menu:view": ["OWNER", "MANAGER", "CASHIER", "WAITER", "KITCHEN"],
  "menu:create": ["OWNER", "MANAGER"],
  "menu:update": ["OWNER", "MANAGER"],
  "menu:delete": ["OWNER", "MANAGER"],
  "menu:toggle_availability": ["OWNER", "MANAGER", "KITCHEN"],

  // ═══════════════════════════════════════════════════════════════════════════
  // ORDERS
  // ═══════════════════════════════════════════════════════════════════════════
  "orders:view": ["OWNER", "MANAGER", "CASHIER", "WAITER", "KITCHEN"],
  "orders:view_all": ["OWNER", "MANAGER"],
  "orders:create": ["OWNER", "MANAGER", "WAITER"],
  "orders:update": ["OWNER", "MANAGER", "WAITER"],
  "orders:cancel": ["OWNER", "MANAGER"],
  "orders:confirm_guest_order": ["OWNER", "MANAGER", "WAITER"],
  "orders:reject_guest_order": ["OWNER", "MANAGER", "WAITER"],
  "orders:quick_order": ["OWNER", "MANAGER", "WAITER"],

  // ═══════════════════════════════════════════════════════════════════════════
  // KITCHEN
  // ═══════════════════════════════════════════════════════════════════════════
  "kitchen:view": ["OWNER", "MANAGER", "KITCHEN"],
  "kitchen:update_status": ["OWNER", "MANAGER", "KITCHEN"],
  "kitchen:mark_ready": ["OWNER", "MANAGER", "KITCHEN"],

  // ═══════════════════════════════════════════════════════════════════════════
  // BILLING
  // ═══════════════════════════════════════════════════════════════════════════
  "billing:view": ["OWNER", "MANAGER", "CASHIER"],
  "billing:create": ["OWNER", "MANAGER", "CASHIER"],
  "billing:apply_discount": ["OWNER", "MANAGER"],
  "billing:apply_promo_code": ["OWNER", "MANAGER", "CASHIER"],
  "billing:process_payment": ["OWNER", "MANAGER", "CASHIER"],
  "billing:refund": ["OWNER", "MANAGER"],
  "billing:void": ["OWNER"],
  "billing:print": ["OWNER", "MANAGER", "CASHIER"],
  "billing:view_amount": ["OWNER", "MANAGER", "CASHIER"], // ⚠️ WAITER CANNOT SEE

  // ═══════════════════════════════════════════════════════════════════════════
  // CUSTOMERS
  // ═══════════════════════════════════════════════════════════════════════════
  "customers:view": ["OWNER", "MANAGER", "CASHIER", "WAITER"],
  "customers:view_basic": ["OWNER", "MANAGER", "CASHIER", "WAITER"], // Name, phone, tier
  "customers:view_spending": ["OWNER", "MANAGER"], // ⚠️ HIDDEN FROM WAITER/CASHIER
  "customers:view_full": ["OWNER", "MANAGER"],
  "customers:create": ["OWNER", "MANAGER", "CASHIER"],
  "customers:update": ["OWNER", "MANAGER"],
  "customers:delete": ["OWNER"],
  "customers:add_points": ["OWNER", "MANAGER"],
  "customers:redeem_points": ["OWNER", "MANAGER", "CASHIER"],
  "customers:add_note": ["OWNER", "MANAGER", "CASHIER", "WAITER"],

  // ═══════════════════════════════════════════════════════════════════════════
  // PROMOTIONS
  // ═══════════════════════════════════════════════════════════════════════════
  "promotions:view": ["OWNER", "MANAGER"],
  "promotions:create": ["OWNER", "MANAGER"],
  "promotions:update": ["OWNER", "MANAGER"],
  "promotions:delete": ["OWNER", "MANAGER"],
  "promotions:toggle_status": ["OWNER", "MANAGER"],

  // ═══════════════════════════════════════════════════════════════════════════
  // REPORTS
  // ═══════════════════════════════════════════════════════════════════════════
  "reports:view": ["OWNER", "MANAGER"],
  "reports:sales": ["OWNER", "MANAGER"],
  "reports:orders": ["OWNER", "MANAGER"],
  "reports:customers": ["OWNER", "MANAGER"],
  "reports:staff": ["OWNER", "MANAGER"],
  "reports:inventory": ["OWNER", "MANAGER"],
  "reports:export": ["OWNER", "MANAGER"],

  // ═══════════════════════════════════════════════════════════════════════════
  // STAFF MANAGEMENT
  // ═══════════════════════════════════════════════════════════════════════════
  "staff:view": ["OWNER", "MANAGER"],
  "staff:create": ["OWNER"],
  "staff:update": ["OWNER"],
  "staff:delete": ["OWNER"],
  "staff:manage_roles": ["OWNER"],
  "staff:view_attendance": ["OWNER", "MANAGER"],
  "staff:manage_shifts": ["OWNER", "MANAGER"],

  // ═══════════════════════════════════════════════════════════════════════════
  // COMMUNICATION
  // ═══════════════════════════════════════════════════════════════════════════
  "communication:chat": ["OWNER", "MANAGER", "CASHIER", "WAITER", "KITCHEN", "HOST"],
  "communication:announcements_view": ["OWNER", "MANAGER", "CASHIER", "WAITER", "KITCHEN", "HOST"],
  "communication:announcements_create": ["OWNER", "MANAGER"],
  "communication:shift_notes": ["OWNER", "MANAGER", "CASHIER", "WAITER", "KITCHEN", "HOST"],
  "communication:daily_briefing_view": ["OWNER", "MANAGER", "CASHIER", "WAITER", "KITCHEN", "HOST"],
  "communication:daily_briefing_create": ["OWNER", "MANAGER"],

  // ═══════════════════════════════════════════════════════════════════════════
  // SETTINGS
  // ═══════════════════════════════════════════════════════════════════════════
  "settings:view": ["OWNER", "MANAGER"],
  "settings:update": ["OWNER"],
  "settings:integrations": ["OWNER"],
  "settings:billing_config": ["OWNER"],

  // ═══════════════════════════════════════════════════════════════════════════
  // SUPER ADMIN (LUMORA)
  // ═══════════════════════════════════════════════════════════════════════════
  "superadmin:restaurants": ["SUPER_ADMIN"],
  "superadmin:licenses": ["SUPER_ADMIN"],
  "superadmin:analytics": ["SUPER_ADMIN"],
  "superadmin:support": ["SUPER_ADMIN"],
} as const;

export type Permission = keyof typeof PERMISSIONS;

/**
 * Check if a role has a specific permission
 */
export function hasPermission(role: UserRole, permission: Permission): boolean {
  const allowedRoles = PERMISSIONS[permission] as readonly string[];
  return allowedRoles?.includes(role) ?? false;
}

/**
 * Check if a role has any of the specified permissions
 */
export function hasAnyPermission(role: UserRole, permissions: Permission[]): boolean {
  return permissions.some((permission) => hasPermission(role, permission));
}

/**
 * Check if a role has all of the specified permissions
 */
export function hasAllPermissions(role: UserRole, permissions: Permission[]): boolean {
  return permissions.every((permission) => hasPermission(role, permission));
}

/**
 * Get all permissions for a role
 */
export function getPermissionsForRole(role: UserRole): Permission[] {
  return Object.entries(PERMISSIONS)
    .filter(([, roles]) => (roles as readonly string[]).includes(role))
    .map(([permission]) => permission as Permission);
}

/**
 * Get role display name
 */
export function getRoleDisplayName(role: UserRole): string {
  const displayNames: Record<UserRole, string> = {
    SUPER_ADMIN: "Super Admin",
    OWNER: "Owner",
    MANAGER: "Manager",
    CASHIER: "Cashier",
    WAITER: "Waiter",
    KITCHEN: "Kitchen Staff",
    HOST: "Host",
  };
  return displayNames[role];
}

/**
 * Get role description
 */
export function getRoleDescription(role: UserRole): string {
  const descriptions: Record<UserRole, string> = {
    SUPER_ADMIN: "LUMORA administrator with access to all restaurants",
    OWNER: "Restaurant owner with full access to all features",
    MANAGER: "Restaurant manager with most permissions",
    CASHIER: "Handles billing and payments",
    WAITER: "Manages tables, orders, and guest service",
    KITCHEN: "Kitchen staff with access to kitchen orders",
    HOST: "Manages seating and reservations",
  };
  return descriptions[role];
}
