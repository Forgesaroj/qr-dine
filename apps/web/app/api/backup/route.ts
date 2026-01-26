import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { getSession } from "@/lib/auth";
import { logActivity } from "@/lib/activity-log";
import { exec } from "child_process";
import { promisify } from "util";
import * as fs from "fs";
import * as path from "path";

const execAsync = promisify(exec);

// Backup directory
const BACKUP_DIR = process.env.BACKUP_DIR || "./backups";

// Ensure backup directory exists
const ensureBackupDir = () => {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }
};

// GET list of backups
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only OWNER and MANAGER can view backups
    if (!["OWNER", "MANAGER", "SUPER_ADMIN"].includes(session.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    ensureBackupDir();

    // List backup files
    const files = fs.readdirSync(BACKUP_DIR);
    const backups = files
      .filter((f) => f.endsWith(".sql") || f.endsWith(".json"))
      .map((f) => {
        const stats = fs.statSync(path.join(BACKUP_DIR, f));
        return {
          filename: f,
          size: stats.size,
          createdAt: stats.birthtime,
          type: f.endsWith(".sql") ? "database" : "json",
        };
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return NextResponse.json({ backups });
  } catch (error) {
    console.error("Error listing backups:", error);
    return NextResponse.json(
      { error: "Failed to list backups" },
      { status: 500 }
    );
  }
}

// POST create a new backup
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only OWNER and MANAGER can create backups
    if (!["OWNER", "MANAGER", "SUPER_ADMIN"].includes(session.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const { type = "json" } = body; // "json" or "sql"

    ensureBackupDir();

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const restaurantSlug = session.restaurantSlug || "all";

    if (type === "sql") {
      // PostgreSQL dump (requires pg_dump)
      const databaseUrl = process.env.DATABASE_URL;
      if (!databaseUrl) {
        return NextResponse.json(
          { error: "Database URL not configured" },
          { status: 500 }
        );
      }

      const filename = `backup_${restaurantSlug}_${timestamp}.sql`;
      const filepath = path.join(BACKUP_DIR, filename);

      try {
        await execAsync(`pg_dump "${databaseUrl}" > "${filepath}"`);
      } catch (execError) {
        console.error("pg_dump error:", execError);
        return NextResponse.json(
          { error: "Failed to create SQL backup. Ensure pg_dump is installed." },
          { status: 500 }
        );
      }

      const stats = fs.statSync(filepath);

      // Log activity
      await logActivity({
        restaurantId: session.restaurantId,
        userId: session.userId,
        userName: session.email,
        userRole: session.role,
        activityType: "backup.created",
        entityType: "manager",
        priority: "info",
        description: `Created database backup: ${filename}`,
        details: {
          filename,
          type: "sql",
          size: stats.size,
        },
      });

      return NextResponse.json({
        success: true,
        backup: {
          filename,
          size: stats.size,
          type: "sql",
          createdAt: new Date(),
        },
      });
    } else {
      // JSON export of restaurant data
      const filename = `backup_${restaurantSlug}_${timestamp}.json`;
      const filepath = path.join(BACKUP_DIR, filename);

      // Export data for the restaurant
      const exportData = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        const restaurant = await tx.restaurant.findUnique({
          where: { id: session.restaurantId },
          include: {
            tables: true,
            categories: {
              include: {
                menuItems: true,
              },
            },
            users: {
              select: {
                id: true,
                email: true,
                name: true,
                phone: true,
                role: true,
                status: true,
              },
            },
            customers: true,
            promotions: true,
          },
        });

        // Get recent orders (last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const orders = await tx.order.findMany({
          where: {
            restaurantId: session.restaurantId,
            createdAt: { gte: thirtyDaysAgo },
          },
          include: {
            items: true,
          },
        });

        const bills = await tx.bill.findMany({
          where: {
            restaurantId: session.restaurantId,
            createdAt: { gte: thirtyDaysAgo },
          },
          include: {
            payments: true,
          },
        });

        return {
          exportedAt: new Date().toISOString(),
          exportedBy: session.email,
          restaurant,
          recentOrders: orders,
          recentBills: bills,
          dataRange: {
            from: thirtyDaysAgo.toISOString(),
            to: new Date().toISOString(),
          },
        };
      });

      fs.writeFileSync(filepath, JSON.stringify(exportData, null, 2));
      const stats = fs.statSync(filepath);

      // Log activity
      await logActivity({
        restaurantId: session.restaurantId,
        userId: session.userId,
        userName: session.email,
        userRole: session.role,
        activityType: "backup.created",
        entityType: "manager",
        priority: "info",
        description: `Created JSON backup: ${filename}`,
        details: {
          filename,
          type: "json",
          size: stats.size,
        },
      });

      return NextResponse.json({
        success: true,
        backup: {
          filename,
          size: stats.size,
          type: "json",
          createdAt: new Date(),
        },
      });
    }
  } catch (error) {
    console.error("Error creating backup:", error);
    return NextResponse.json(
      { error: "Failed to create backup" },
      { status: 500 }
    );
  }
}
