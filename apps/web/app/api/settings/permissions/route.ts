import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { rolePageAccess, rolePermissions, type PageAccess, type Permission } from "@/lib/permissions";

// Default permissions for each role (fallback when no custom permissions exist)
const defaultRolePermissions = {
  OWNER: {
    pages: ["dashboard", "menu", "orders", "kitchen", "billing", "tables", "staff", "reports", "settings"],
    features: {
      canEditMenu: true,
      canVoidOrders: true,
      canViewReports: true,
      canManageStaff: true,
      canEditSettings: true,
      canProcessPayments: true,
      canManageTables: true,
    },
  },
  MANAGER: {
    pages: ["dashboard", "menu", "orders", "kitchen", "billing", "tables", "staff", "reports"],
    features: {
      canEditMenu: true,
      canVoidOrders: true,
      canViewReports: true,
      canManageStaff: false,
      canEditSettings: false,
      canProcessPayments: true,
      canManageTables: true,
    },
  },
  CASHIER: {
    pages: ["dashboard", "orders", "billing"],
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
    pages: ["dashboard", "orders", "billing", "tables"],
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
    pages: ["kitchen"],
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
    pages: ["dashboard", "tables", "orders"],
    features: {
      canEditMenu: false,
      canVoidOrders: false,
      canViewReports: false,
      canManageStaff: false,
      canEditSettings: false,
      canProcessPayments: false,
      canManageTables: true,
    },
  },
};

// GET all role permissions for the restaurant
export async function GET() {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user has permission to view settings
    if (!["SUPER_ADMIN", "OWNER"].includes(session.role)) {
      return NextResponse.json(
        { error: "You don't have permission to view role settings" },
        { status: 403 }
      );
    }

    // Fetch custom permissions from database
    const customPermissions = await prisma.rolePermission.findMany({
      where: { restaurantId: session.restaurantId },
    });

    // Build permissions map with defaults + overrides
    const permissionsMap: Record<string, { pages: string[]; features: Record<string, boolean> }> = {};

    // Start with defaults
    for (const [role, defaults] of Object.entries(defaultRolePermissions)) {
      permissionsMap[role] = { ...defaults };
    }

    // Apply custom overrides
    for (const custom of customPermissions) {
      permissionsMap[custom.role] = {
        pages: custom.allowedPages as string[],
        features: custom.featurePermissions as Record<string, boolean>,
      };
    }

    return NextResponse.json({
      permissions: permissionsMap,
      availablePages: [
        { id: "dashboard", label: "Dashboard", description: "Overview and statistics" },
        { id: "menu", label: "Menu", description: "View and manage menu items" },
        { id: "orders", label: "Orders", description: "View and manage orders" },
        { id: "kitchen", label: "Kitchen", description: "Kitchen display system" },
        { id: "billing", label: "Billing", description: "Process payments and bills" },
        { id: "tables", label: "Tables", description: "Manage tables and sessions" },
        { id: "staff", label: "Staff", description: "Manage staff members" },
        { id: "reports", label: "Reports", description: "View analytics and reports" },
        { id: "settings", label: "Settings", description: "System configuration" },
      ],
      availableFeatures: [
        { id: "canEditMenu", label: "Edit Menu", description: "Add, edit, delete menu items" },
        { id: "canVoidOrders", label: "Void Orders", description: "Cancel or void orders" },
        { id: "canViewReports", label: "View Reports", description: "Access analytics and reports" },
        { id: "canManageStaff", label: "Manage Staff", description: "Add, edit, remove staff" },
        { id: "canEditSettings", label: "Edit Settings", description: "Modify system settings" },
        { id: "canProcessPayments", label: "Process Payments", description: "Accept and process payments" },
        { id: "canManageTables", label: "Manage Tables", description: "Edit table configurations" },
      ],
      roles: [
        { id: "MANAGER", label: "Manager", description: "Restaurant manager with most permissions" },
        { id: "CASHIER", label: "Cashier", description: "Handles billing and payments" },
        { id: "WAITER", label: "Waiter", description: "Takes orders and serves customers" },
        { id: "KITCHEN", label: "Kitchen", description: "Kitchen staff who prepare orders" },
        { id: "HOST", label: "Host", description: "Manages table seating and reservations" },
      ],
    });
  } catch (error) {
    console.error("Error fetching role permissions:", error);
    return NextResponse.json(
      { error: "Failed to fetch role permissions" },
      { status: 500 }
    );
  }
}

// PUT update role permissions
export async function PUT(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only OWNER can edit permissions
    if (!["SUPER_ADMIN", "OWNER"].includes(session.role)) {
      return NextResponse.json(
        { error: "Only owners can modify role permissions" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { role, pages, features } = body;

    if (!role || !pages || !features) {
      return NextResponse.json(
        { error: "Role, pages, and features are required" },
        { status: 400 }
      );
    }

    // Prevent modifying OWNER permissions
    if (role === "OWNER" || role === "SUPER_ADMIN") {
      return NextResponse.json(
        { error: "Cannot modify owner or admin permissions" },
        { status: 400 }
      );
    }

    // Upsert the permission record
    const permission = await prisma.rolePermission.upsert({
      where: {
        restaurantId_role: {
          restaurantId: session.restaurantId,
          role: role,
        },
      },
      update: {
        allowedPages: pages,
        featurePermissions: features,
      },
      create: {
        restaurantId: session.restaurantId,
        role: role,
        allowedPages: pages,
        featurePermissions: features,
      },
    });

    return NextResponse.json({
      success: true,
      permission: {
        role: permission.role,
        pages: permission.allowedPages,
        features: permission.featurePermissions,
      },
    });
  } catch (error) {
    console.error("Error updating role permissions:", error);
    return NextResponse.json(
      { error: "Failed to update role permissions" },
      { status: 500 }
    );
  }
}

// POST reset role permissions to default
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only OWNER can reset permissions
    if (!["SUPER_ADMIN", "OWNER"].includes(session.role)) {
      return NextResponse.json(
        { error: "Only owners can reset role permissions" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { role } = body;

    if (!role) {
      return NextResponse.json(
        { error: "Role is required" },
        { status: 400 }
      );
    }

    // Delete custom permission to revert to defaults
    await prisma.rolePermission.deleteMany({
      where: {
        restaurantId: session.restaurantId,
        role: role,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Permissions for ${role} reset to defaults`,
    });
  } catch (error) {
    console.error("Error resetting role permissions:", error);
    return NextResponse.json(
      { error: "Failed to reset role permissions" },
      { status: 500 }
    );
  }
}
