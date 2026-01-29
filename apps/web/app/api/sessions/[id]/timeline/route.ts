import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getSessionTimeline, getSessionSummary } from "@/lib/services/session.service";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/sessions/:id/timeline
 * Get the full timeline of events for a session
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id: sessionId } = await params;
    const { searchParams } = new URL(request.url);
    const includeSummary = searchParams.get("summary") === "true";

    // Verify session exists and user has access
    const tableSession = await prisma.tableSession.findUnique({
      where: { id: sessionId },
      select: {
        id: true,
        restaurantId: true,
      },
    });

    if (!tableSession) {
      return NextResponse.json(
        { error: "Session not found" },
        { status: 404 }
      );
    }

    // Verify user belongs to the restaurant
    if (tableSession.restaurantId !== session.restaurantId) {
      return NextResponse.json(
        { error: "Unauthorized for this restaurant" },
        { status: 403 }
      );
    }

    // Get timeline
    const timeline = await getSessionTimeline(sessionId);

    // Optionally include summary
    let summary = null;
    if (includeSummary) {
      summary = await getSessionSummary(sessionId);
    }

    return NextResponse.json({
      success: true,
      timeline,
      summary,
    });
  } catch (error) {
    console.error("Error fetching session timeline:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch timeline" },
      { status: 500 }
    );
  }
}
