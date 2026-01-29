import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { updateGuestCount } from "@/lib/services/session.service";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/sessions/:id/guest-count
 * Staff sets or updates guest count for a session
 */
export async function POST(
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
    const body = await request.json();
    const { guestCount, reason } = body;

    if (typeof guestCount !== "number" || guestCount < 1) {
      return NextResponse.json(
        { error: "Guest count must be a positive number" },
        { status: 400 }
      );
    }

    // Verify session exists and user has access
    const tableSession = await prisma.tableSession.findUnique({
      where: { id: sessionId },
      select: {
        id: true,
        restaurantId: true,
        guestCount: true,
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

    // Update guest count
    await updateGuestCount({
      sessionId,
      newCount: guestCount,
      changedById: session.userId,
      reason,
    });

    return NextResponse.json({
      success: true,
      previousCount: tableSession.guestCount,
      newCount: guestCount,
    });
  } catch (error) {
    console.error("Error updating guest count:", error);
    return NextResponse.json(
      { error: "Failed to update guest count" },
      { status: 500 }
    );
  }
}
