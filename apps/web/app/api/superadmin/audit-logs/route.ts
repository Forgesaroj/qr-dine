import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const action = searchParams.get("action");
    const entity = searchParams.get("entity");
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");

    const skip = (page - 1) * limit;

    const whereClause: Record<string, unknown> = {};

    if (action && action !== "all") {
      whereClause.action = action;
    }

    if (entity && entity !== "all") {
      whereClause.entityType = entity;
    }

    if (dateFrom || dateTo) {
      whereClause.createdAt = {};
      if (dateFrom) {
        (whereClause.createdAt as Record<string, Date>).gte = new Date(dateFrom);
      }
      if (dateTo) {
        const endDate = new Date(dateTo);
        endDate.setHours(23, 59, 59, 999);
        (whereClause.createdAt as Record<string, Date>).lte = endDate;
      }
    }

    const [logs, total] = await Promise.all([
      prisma.activityLog.findMany({
        where: whereClause,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              role: true,
            },
          },
          restaurant: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      }),
      prisma.activityLog.count({ where: whereClause }),
    ]);

    const formattedLogs = logs.map((log: typeof logs[number]) => ({
      id: log.id,
      action: log.action,
      entity: log.entityType,
      entityId: log.entityId,
      userId: log.userId,
      userName: log.userName || log.user?.name || null,
      userRole: log.user?.role || null,
      restaurantId: log.restaurantId,
      restaurantName: log.restaurant?.name || null,
      details: log.details,
      ipAddress: log.ipAddress,
      userAgent: log.userAgent,
      createdAt: log.createdAt.toISOString(),
    }));

    return NextResponse.json({
      logs: formattedLogs,
      total,
      page,
      limit,
      hasMore: skip + logs.length < total,
    });
  } catch (error) {
    console.error("Error fetching audit logs:", error);
    return NextResponse.json(
      { error: "Failed to fetch audit logs" },
      { status: 500 }
    );
  }
}
