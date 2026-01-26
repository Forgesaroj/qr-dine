import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { logActivity } from "@/lib/activity-log";

// GET single assistance request
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const assistanceRequest = await prisma.assistanceRequest.findFirst({
      where: {
        id,
        restaurantId: session.restaurantId,
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

    if (!assistanceRequest) {
      return NextResponse.json(
        { error: "Assistance request not found" },
        { status: 404 }
      );
    }

    // Calculate metrics
    const metrics: Record<string, string | null> = {};

    if (assistanceRequest.acknowledgedAt && assistanceRequest.requestedAt) {
      const responseTime =
        (assistanceRequest.acknowledgedAt.getTime() -
          assistanceRequest.requestedAt.getTime()) /
        1000;
      metrics.responseTime = `${Math.floor(responseTime / 60)}m ${Math.floor(responseTime % 60)}s`;
    }

    if (assistanceRequest.notifiedAt && assistanceRequest.acknowledgedAt) {
      const acknowledgmentSpeed =
        (assistanceRequest.acknowledgedAt.getTime() -
          assistanceRequest.notifiedAt.getTime()) /
        1000;
      metrics.acknowledgmentSpeed = `${Math.floor(acknowledgmentSpeed / 60)}m ${Math.floor(acknowledgmentSpeed % 60)}s`;
    }

    if (assistanceRequest.completedAt && assistanceRequest.requestedAt) {
      const resolutionTime =
        (assistanceRequest.completedAt.getTime() -
          assistanceRequest.requestedAt.getTime()) /
        1000;
      metrics.resolutionTime = `${Math.floor(resolutionTime / 60)}m ${Math.floor(resolutionTime % 60)}s`;
    }

    return NextResponse.json({
      request: assistanceRequest,
      timestamps: {
        requestedAt: assistanceRequest.requestedAt,
        notifiedAt: assistanceRequest.notifiedAt,
        acknowledgedAt: assistanceRequest.acknowledgedAt,
        completedAt: assistanceRequest.completedAt,
        cancelledAt: assistanceRequest.cancelledAt,
        escalatedAt: assistanceRequest.escalatedAt,
      },
      metrics,
    });
  } catch (error) {
    console.error("Error fetching assistance request:", error);
    return NextResponse.json(
      { error: "Failed to fetch assistance request" },
      { status: 500 }
    );
  }
}

// PATCH update assistance request (acknowledge, complete, cancel)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { action, resolutionNote, escalationReason } = body;

    // Get current request
    const assistanceRequest = await prisma.assistanceRequest.findFirst({
      where: {
        id,
        restaurantId: session.restaurantId,
      },
      include: {
        session: {
          include: {
            table: true,
          },
        },
      },
    });

    if (!assistanceRequest) {
      return NextResponse.json(
        { error: "Assistance request not found" },
        { status: 404 }
      );
    }

    const now = new Date();
    let updateData: Record<string, Date | string | null> = {};
    let activityType = "";
    let description = "";
    const tableNumber = assistanceRequest.session.table.tableNumber;

    switch (action) {
      case "acknowledge":
        // Waiter acknowledges "On My Way"
        if (
          assistanceRequest.status !== "PENDING" &&
          assistanceRequest.status !== "NOTIFIED"
        ) {
          return NextResponse.json(
            { error: "Request already acknowledged or completed" },
            { status: 400 }
          );
        }
        updateData = {
          status: "ACKNOWLEDGED",
          acknowledgedAt: now,
          acknowledgedById: session.userId,
        };
        activityType = "assistance_acknowledged";
        description = `Waiter acknowledged assistance request at Table ${tableNumber}`;
        break;

      case "in_progress":
        // Waiter is working on it
        updateData = {
          status: "IN_PROGRESS",
        };
        activityType = "assistance_in_progress";
        description = `Waiter handling assistance at Table ${tableNumber}`;
        break;

      case "complete":
        // Waiter completes the request
        if (assistanceRequest.status === "COMPLETED") {
          return NextResponse.json(
            { error: "Request already completed" },
            { status: 400 }
          );
        }
        updateData = {
          status: "COMPLETED",
          completedAt: now,
          completedById: session.userId,
          resolutionNote: resolutionNote || null,
        };
        activityType = "assistance_completed";
        description = `Assistance completed at Table ${tableNumber}`;
        break;

      case "cancel":
        updateData = {
          status: "CANCELLED",
          cancelledAt: now,
        };
        activityType = "assistance_cancelled";
        description = `Assistance request cancelled for Table ${tableNumber}`;
        break;

      case "escalate":
        // Escalate to manager
        updateData = {
          escalatedAt: now,
          escalatedTo: body.managerId || null,
          escalationReason: escalationReason || "No response from waiter",
        };
        activityType = "assistance_escalated";
        description = `Assistance escalated for Table ${tableNumber}: ${escalationReason || "No response"}`;
        break;

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }

    // Update request
    const updatedRequest = await prisma.assistanceRequest.update({
      where: { id },
      data: updateData,
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
      restaurantId: session.restaurantId,
      userId: session.userId,
      activityType,
      entityType: action === "escalate" ? "manager" : "waiter",
      entityId: id,
      priority: action === "escalate" ? "urgent" : "info",
      description,
      sessionId: assistanceRequest.sessionId,
      tableId: assistanceRequest.tableId,
      details: {
        tableNumber,
        type: assistanceRequest.type,
        action,
        resolutionNote,
        timestamp: now.toISOString(),
      },
    });

    // Calculate response metrics
    let responseTime = null;
    if (updatedRequest.acknowledgedAt && updatedRequest.requestedAt) {
      const diff =
        (updatedRequest.acknowledgedAt.getTime() -
          updatedRequest.requestedAt.getTime()) /
        1000;
      responseTime = `${Math.floor(diff / 60)}m ${Math.floor(diff % 60)}s`;
    }

    let resolutionTime = null;
    if (updatedRequest.completedAt && updatedRequest.requestedAt) {
      const diff =
        (updatedRequest.completedAt.getTime() -
          updatedRequest.requestedAt.getTime()) /
        1000;
      resolutionTime = `${Math.floor(diff / 60)}m ${Math.floor(diff % 60)}s`;
    }

    return NextResponse.json({
      success: true,
      action,
      timestamp: now.toISOString(),
      request: updatedRequest,
      metrics: {
        responseTime,
        resolutionTime,
      },
    });
  } catch (error) {
    console.error("Error updating assistance request:", error);
    return NextResponse.json(
      { error: "Failed to update assistance request" },
      { status: 500 }
    );
  }
}
