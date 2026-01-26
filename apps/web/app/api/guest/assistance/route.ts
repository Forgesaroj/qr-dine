import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// POST - Create new assistance request (guest-facing)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, type, message } = body;

    if (!sessionId) {
      return NextResponse.json(
        { error: "Session ID is required" },
        { status: 400 }
      );
    }

    if (!type) {
      return NextResponse.json(
        { error: "Assistance type is required" },
        { status: 400 }
      );
    }

    // Validate assistance type
    const validTypes = [
      "WATER_REFILL",
      "CALL_WAITER",
      "CUTLERY_NAPKINS",
      "FOOD_ISSUE",
      "BILL_REQUEST",
      "OTHER",
    ];
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: "Invalid assistance type" },
        { status: 400 }
      );
    }

    // Find the session
    const session = await prisma.tableSession.findUnique({
      where: { id: sessionId },
      include: {
        table: true,
        restaurant: { select: { id: true, name: true } },
      },
    });

    if (!session) {
      return NextResponse.json(
        { error: "Session not found" },
        { status: 404 }
      );
    }

    if (session.status !== "ACTIVE") {
      return NextResponse.json(
        { error: "Session is no longer active" },
        { status: 400 }
      );
    }

    // Check for existing pending request of the same type
    const existingRequest = await prisma.assistanceRequest.findFirst({
      where: {
        sessionId,
        type,
        status: { in: ["PENDING", "NOTIFIED", "ACKNOWLEDGED", "IN_PROGRESS"] },
      },
    });

    if (existingRequest) {
      return NextResponse.json(
        { error: "You already have a pending request for this type of assistance" },
        { status: 400 }
      );
    }

    // Create assistance request
    const now = new Date();
    const assistanceRequest = await prisma.assistanceRequest.create({
      data: {
        restaurantId: session.restaurantId,
        sessionId,
        tableId: session.tableId,
        type,
        note: message || null,
        status: "PENDING",
        requestedAt: now,
        notifiedAt: now, // Auto-notify
      },
      include: {
        table: { select: { tableNumber: true, name: true } },
      },
    });

    return NextResponse.json({
      success: true,
      request: {
        id: assistanceRequest.id,
        type: assistanceRequest.type,
        status: assistanceRequest.status,
        message: assistanceRequest.note,
        requestedAt: assistanceRequest.requestedAt,
        table: assistanceRequest.table,
      },
    });
  } catch (error) {
    console.error("Error creating assistance request:", error);
    return NextResponse.json(
      { error: "Failed to create assistance request" },
      { status: 500 }
    );
  }
}

// GET - Get guest's active assistance requests
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get("sessionId");

    if (!sessionId) {
      return NextResponse.json(
        { error: "Session ID is required" },
        { status: 400 }
      );
    }

    const requests = await prisma.assistanceRequest.findMany({
      where: {
        sessionId,
        status: { in: ["PENDING", "NOTIFIED", "ACKNOWLEDGED", "IN_PROGRESS"] },
      },
      orderBy: { requestedAt: "desc" },
      select: {
        id: true,
        type: true,
        status: true,
        note: true,
        requestedAt: true,
        acknowledgedAt: true,
      },
    });

    type Request = typeof requests[number];

    // Transform note to message for frontend consistency
    const transformedRequests = requests.map((r: Request) => ({
      ...r,
      message: r.note,
    }));

    return NextResponse.json({ requests: transformedRequests });
  } catch (error) {
    console.error("Error fetching assistance requests:", error);
    return NextResponse.json(
      { error: "Failed to fetch assistance requests" },
      { status: 500 }
    );
  }
}
