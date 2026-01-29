import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { endSessionAndChangeOTP } from "@/lib/services/session.service";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/sessions/:id/end
 * End a session, change OTP, and trigger cleaning workflow
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
    const { endReason, notes } = body;

    // Verify session exists and user has access
    const tableSession = await prisma.tableSession.findUnique({
      where: { id: sessionId },
      select: {
        id: true,
        restaurantId: true,
        status: true,
        tableId: true,
        table: {
          select: { tableNumber: true },
        },
      },
    });

    if (!tableSession) {
      return NextResponse.json(
        { error: "Session not found" },
        { status: 404 }
      );
    }

    if (tableSession.status !== "ACTIVE") {
      return NextResponse.json(
        { error: "Session is not active" },
        { status: 400 }
      );
    }

    // Verify user belongs to the restaurant
    if (tableSession.restaurantId !== session.restaurantId) {
      return NextResponse.json(
        { error: "Unauthorized for this restaurant" },
        { status: 403 }
      );
    }

    // End session and trigger workflow
    const result = await endSessionAndChangeOTP({
      sessionId,
      endedById: session.userId,
      endReason: endReason || "MANUAL_END",
      notes,
    });

    return NextResponse.json({
      success: true,
      sessionId,
      tableNumber: tableSession.table.tableNumber,
      newOtp: result.newOtp,
      cleaningRecordId: result.cleaningRecordId,
      message: `Session ended. Table ${tableSession.table.tableNumber} is now in cleaning mode. New OTP: ${result.newOtp}`,
    });
  } catch (error) {
    console.error("Error ending session:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to end session" },
      { status: 500 }
    );
  }
}
