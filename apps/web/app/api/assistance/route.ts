import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { logActivity } from "@/lib/activity-log";

// GET all assistance requests
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const tableId = searchParams.get("tableId");
    const sessionId = searchParams.get("sessionId");
    const waiterId = searchParams.get("waiterId");

    const where: Record<string, unknown> = {
      restaurantId: session.restaurantId,
    };

    if (status) {
      where.status = status;
    }
    if (tableId) {
      where.tableId = tableId;
    }
    if (sessionId) {
      where.sessionId = sessionId;
    }
    if (waiterId) {
      where.assignedWaiterId = waiterId;
    }

    const requests = await prisma.assistanceRequest.findMany({
      where,
      orderBy: [{ status: "asc" }, { requestedAt: "desc" }],
      include: {
        session: {
          include: {
            table: {
              select: { tableNumber: true, name: true },
            },
            waiter: {
              select: { id: true, name: true },
            },
          },
        },
      },
    });

    type RequestWithSession = typeof requests[number];

    // Calculate metrics for each request
    const requestsWithMetrics = requests.map((req: RequestWithSession) => {
      const metrics: Record<string, string | null> = {};

      if (req.acknowledgedAt && req.requestedAt) {
        const responseTime =
          (req.acknowledgedAt.getTime() - req.requestedAt.getTime()) / 1000;
        metrics.responseTime = `${Math.floor(responseTime / 60)}m ${Math.floor(responseTime % 60)}s`;
      }

      if (req.completedAt && req.requestedAt) {
        const totalTime =
          (req.completedAt.getTime() - req.requestedAt.getTime()) / 1000;
        metrics.totalTime = `${Math.floor(totalTime / 60)}m ${Math.floor(totalTime % 60)}s`;
      }

      return { ...req, metrics };
    });

    return NextResponse.json({
      requests: requestsWithMetrics,
      counts: {
        pending: requests.filter((r: RequestWithSession) => r.status === "PENDING").length,
        acknowledged: requests.filter((r: RequestWithSession) => r.status === "ACKNOWLEDGED").length,
        inProgress: requests.filter((r: RequestWithSession) => r.status === "IN_PROGRESS").length,
        completed: requests.filter((r: RequestWithSession) => r.status === "COMPLETED").length,
      },
    });
  } catch (error) {
    console.error("Error fetching assistance requests:", error);
    return NextResponse.json(
      { error: "Failed to fetch assistance requests" },
      { status: 500 }
    );
  }
}

// POST create new assistance request
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();

    // Allow both staff and guest to create requests
    const body = await request.json();
    const { sessionId, tableId, type, note, priority } = body;

    if (!sessionId || !tableId) {
      return NextResponse.json(
        { error: "Session ID and Table ID are required" },
        { status: 400 }
      );
    }

    // Get the table session
    const tableSession = await prisma.tableSession.findUnique({
      where: { id: sessionId },
      include: {
        table: true,
        waiter: true,
      },
    });

    if (!tableSession) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    const now = new Date();

    // Create assistance request
    const assistanceRequest = await prisma.assistanceRequest.create({
      data: {
        restaurantId: tableSession.restaurantId,
        sessionId,
        tableId,
        type: type || "CALL_WAITER",
        note,
        priority: priority || "normal",
        status: "NOTIFIED",
        requestedAt: now,
        notifiedAt: now, // Automatic notification
        assignedWaiterId: tableSession.waiterId,
      },
      include: {
        session: {
          include: {
            table: {
              select: { tableNumber: true, name: true },
            },
            waiter: {
              select: { id: true, name: true },
            },
          },
        },
      },
    });

    // Log activity
    await logActivity({
      restaurantId: tableSession.restaurantId,
      userId: session?.userId,
      activityType: "assistance_requested",
      entityType: "waiter",
      entityId: assistanceRequest.id,
      priority: priority === "urgent" ? "urgent" : "notice",
      description: `${type || "Assistance"} requested at Table ${tableSession.table.tableNumber}`,
      sessionId,
      tableId,
      details: {
        tableNumber: tableSession.table.tableNumber,
        type: type || "CALL_WAITER",
        note,
        assignedWaiter: tableSession.waiter?.name,
        timestamp: now.toISOString(),
      },
    });

    return NextResponse.json({
      success: true,
      request: assistanceRequest,
      message: `Assistance request created. Waiter has been notified.`,
    });
  } catch (error) {
    console.error("Error creating assistance request:", error);
    return NextResponse.json(
      { error: "Failed to create assistance request" },
      { status: 500 }
    );
  }
}
