import { prisma } from "@/lib/prisma";
import {
  rolePageAccess,
  rolePermissions,
  type PageAccess,
  type Permission,
  type Role,
} from "@/lib/permissions";

interface RolePermissionData {
  pages: PageAccess[];
  features: Record<string, boolean>;
}

// Default permissions for each role
const defaultRoleSettings: Record<string, RolePermissionData> = {
  OWNER: {
    pages: ["dashboard", "menu", "orders", "quick-order", "kitchen", "bar", "billing", "tables", "reservations", "assistance", "staff", "customers", "promotions", "chat", "shift-notes", "briefing", "lost-found", "reports", "settings"] as PageAccess[],
    features: {
      canEditMenu: true,
      canVoidOrders: true,
      canViewReports: true,
      canManageStaff: true,
      canEditSettings: true,
      canProcessPayments: true,
      canManageTables: true,
      canManageCustomers: true,
      canManageReservations: true,
    },
  },
  ADMIN: {
    pages: ["dashboard", "menu", "orders", "quick-order", "kitchen", "bar", "billing", "tables", "reservations", "assistance", "staff", "customers", "promotions", "chat", "shift-notes", "briefing", "lost-found", "reports", "settings"] as PageAccess[],
    features: {
      canEditMenu: true,
      canVoidOrders: true,
      canViewReports: true,
      canManageStaff: true,
      canEditSettings: true,
      canProcessPayments: true,
      canManageTables: true,
      canManageCustomers: true,
      canManageReservations: true,
    },
  },
  MANAGER: {
    pages: ["dashboard", "menu", "orders", "quick-order", "kitchen", "bar", "billing", "tables", "reservations", "assistance", "staff", "customers", "promotions", "chat", "shift-notes", "briefing", "lost-found", "reports"] as PageAccess[],
    features: {
      canEditMenu: true,
      canVoidOrders: true,
      canViewReports: true,
      canManageStaff: false,
      canEditSettings: false,
      canProcessPayments: true,
      canManageTables: true,
      canManageCustomers: true,
      canManageReservations: true,
    },
  },
  CASHIER: {
    pages: ["dashboard", "orders", "billing", "chat", "shift-notes", "briefing"] as PageAccess[],
    features: {
      canEditMenu: false,
      canVoidOrders: false,
      canViewReports: false,
      canManageStaff: false,
      canEditSettings: false,
      canProcessPayments: true,
      canManageTables: false,
    },
  },
  WAITER: {
    pages: ["dashboard", "orders", "quick-order", "billing", "tables", "assistance", "chat", "shift-notes", "briefing", "lost-found"] as PageAccess[],
    features: {
      canEditMenu: false,
      canVoidOrders: false,
      canViewReports: false,
      canManageStaff: false,
      canEditSettings: false,
      canProcessPayments: false,
      canManageTables: false,
    },
  },
  KITCHEN: {
    pages: ["kitchen", "bar", "chat", "shift-notes", "briefing"] as PageAccess[],
    features: {
      canEditMenu: false,
      canVoidOrders: false,
      canViewReports: false,
      canManageStaff: false,
      canEditSettings: false,
      canProcessPayments: false,
      canManageTables: false,
    },
  },
  HOST: {
    pages: ["dashboard", "tables", "reservations", "orders", "quick-order", "assistance", "chat", "shift-notes", "briefing", "lost-found"] as PageAccess[],
    features: {
      canEditMenu: false,
      canVoidOrders: false,
      canViewReports: false,
      canManageStaff: false,
      canEditSettings: false,
      canProcessPayments: false,
      canManageTables: true,
      canManageReservations: true,
    },
  },
};

/**
 * Get role permissions from database with fallback to defaults
 */
export async function getRolePermissions(
  restaurantId: string,
  role: string
): Promise<RolePermissionData> {
  // OWNER and SUPER_ADMIN always get full permissions
  if (role === "OWNER" || role === "SUPER_ADMIN") {
    return defaultRoleSettings["OWNER"]!;
  }

  try {
    // Try to get custom permissions from database
    const customPermission = await prisma.rolePermission.findUnique({
      where: {
        restaurantId_role: {
          restaurantId,
          role: role as any,
        },
      },
    });

    if (customPermission) {
      return {
        pages: (customPermission.allowedPages as string[]) as PageAccess[],
        features: customPermission.featurePermissions as Record<string, boolean>,
      };
    }
  } catch (error) {
    console.error("Error fetching role permissions:", error);
  }

  // Fallback to defaults
  const normalizedRole = role.toUpperCase();
  return defaultRoleSettings[normalizedRole] ?? defaultRoleSettings["WAITER"]!;
}

/**
 * Check if a role can access a specific page (with database override)
 */
export async function canAccessPageAsync(
  restaurantId: string,
  role: string,
  page: PageAccess
): Promise<boolean> {
  const permissions = await getRolePermissions(restaurantId, role);
  return permissions.pages.includes(page);
}

/**
 * Check if a role has a specific feature permission (with database override)
 */
export async function hasFeaturePermission(
  restaurantId: string,
  role: string,
  feature: string
): Promise<boolean> {
  const permissions = await getRolePermissions(restaurantId, role);
  return permissions.features[feature] || false;
}

/**
 * Get all accessible pages for a role (with database override)
 */
export async function getAccessiblePagesAsync(
  restaurantId: string,
  role: string
): Promise<PageAccess[]> {
  const permissions = await getRolePermissions(restaurantId, role);
  return permissions.pages;
}
