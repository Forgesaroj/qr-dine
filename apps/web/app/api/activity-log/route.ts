import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const category = searchParams.get("category");
    const priority = searchParams.get("priority");
    const tableId = searchParams.get("tableId");
    const sessionId = searchParams.get("sessionId");
    const staffId = searchParams.get("staffId");
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");
    const search = searchParams.get("search");

    const skip = (page - 1) * limit;

    // Build where clause
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const whereClause: any = {
      restaurantId: session.restaurantId,
    };

    if (category && category !== "all") {
      whereClause.activityCategory = category;
    }

    if (priority && priority !== "all") {
      whereClause.priority = priority;
    }

    if (tableId) {
      whereClause.tableId = tableId;
    }

    if (sessionId) {
      whereClause.sessionId = sessionId;
    }

    if (staffId) {
      whereClause.userId = staffId;
    }

    if (dateFrom || dateTo) {
      whereClause.createdAt = {};
      if (dateFrom) {
        const startDate = new Date(dateFrom);
        startDate.setHours(0, 0, 0, 0);
        whereClause.createdAt.gte = startDate;
      }
      if (dateTo) {
        const endDate = new Date(dateTo);
        endDate.setHours(23, 59, 59, 999);
        whereClause.createdAt.lte = endDate;
      }
    }

    if (search) {
      whereClause.OR = [
        { description: { contains: search, mode: "insensitive" } },
        { userName: { contains: search, mode: "insensitive" } },
        { activityType: { contains: search, mode: "insensitive" } },
      ];
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
        },
      }),
      prisma.activityLog.count({ where: whereClause }),
    ]);

    // Get summary counts by category for today
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const categoryCounts = await prisma.activityLog.groupBy({
      by: ["activityCategory"],
      where: {
        restaurantId: session.restaurantId,
        createdAt: { gte: today },
      },
      _count: { id: true },
    });

    const priorityCounts = await prisma.activityLog.groupBy({
      by: ["priority"],
      where: {
        restaurantId: session.restaurantId,
        createdAt: { gte: today },
      },
      _count: { id: true },
    });

    type LogWithUser = typeof logs[number];
    type CategoryCount = typeof categoryCounts[number];
    type PriorityCount = typeof priorityCounts[number];

    return NextResponse.json({
      logs: logs.map((log: LogWithUser) => ({
        id: log.id,
        activityType: log.activityType || log.action,
        activityCategory: log.activityCategory || "order",
        description: log.description || log.action,
        entityType: log.entityType,
        entityId: log.entityId,
        tableId: log.tableId,
        sessionId: log.sessionId,
        orderId: log.orderId,
        orderItemId: log.orderItemId,
        userId: log.userId,
        userName: log.userName || log.user?.name,
        userRole: log.userRole || log.user?.role,
        performedBy: log.performedBy || "staff",
        priority: log.priority || "info",
        details: log.details,
        createdAt: log.createdAt.toISOString(),
      })),
      total,
      page,
      limit,
      hasMore: skip + logs.length < total,
      summary: {
        byCategory: Object.fromEntries(
          categoryCounts.map((c: CategoryCount) => [c.activityCategory || "other", c._count.id])
        ),
        byPriority: Object.fromEntries(
          priorityCounts.map((p: PriorityCount) => [p.priority || "info", p._count.id])
        ),
      },
    });
  } catch (error) {
    console.error("Error fetching activity logs:", error);
    return NextResponse.json(
      { error: "Failed to fetch activity logs" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      activityType,
      description,
      entityType,
      entityId,
      tableId,
      sessionId,
      orderId,
      orderItemId,
      priority = "info",
      performedBy = "staff",
      details,
    } = body;

    if (!activityType || !entityType) {
      return NextResponse.json(
        { error: "activityType and entityType are required" },
        { status: 400 }
      );
    }

    // Map activity type to category
    const categoryMap: Record<string, string> = {
      table_seated: "seating",
      guest_count_updated: "seating",
      table_vacated: "seating",
      session_started: "seating",
      session_ended: "seating",
      order_placed: "order",
      order_modified: "order",
      items_added: "order",
      prep_started: "kitchen",
      item_ready: "kitchen",
      kitchen_received: "kitchen",
      drink_started: "bar",
      drink_ready: "bar",
      bar_received: "bar",
      water_served: "waiter",
      food_served: "waiter",
      drink_served: "waiter",
      food_picked_up: "waiter",
      bill_requested: "billing",
      bill_printed: "billing",
      payment_completed: "billing",
      discount_applied: "manager",
      item_voided: "manager",
      waiter_reassigned: "manager",
      shift_started: "staff",
      shift_ended: "staff",
      food_issue_reported: "issue",
      assistance_requested: "issue",
      issue_resolved: "issue",
    };

    const activityCategory = categoryMap[activityType] || "order";

    const log = await prisma.activityLog.create({
      data: {
        restaurantId: session.restaurantId,
        userId: session.userId,
        userName: session.email, // Use email as identifier since name is not in token
        userRole: session.role,
        performedBy,
        action: activityType,
        activityType,
        activityCategory,
        description: description || activityType.replace(/_/g, " "),
        entityType,
        entityId,
        tableId,
        sessionId,
        orderId,
        orderItemId,
        priority,
        details: details || undefined,
      },
    });

    return NextResponse.json({ success: true, log });
  } catch (error) {
    console.error("Error creating activity log:", error);
    return NextResponse.json(
      { error: "Failed to create activity log" },
      { status: 500 }
    );
  }
}
