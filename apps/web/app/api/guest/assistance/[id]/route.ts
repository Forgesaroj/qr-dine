import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// DELETE - Cancel an assistance request (guest-facing)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get("sessionId");

    if (!sessionId) {
      return NextResponse.json(
        { error: "Session ID is required" },
        { status: 400 }
      );
    }

    // Find the request
    const assistanceRequest = await prisma.assistanceRequest.findUnique({
      where: { id },
    });

    if (!assistanceRequest) {
      return NextResponse.json(
        { error: "Assistance request not found" },
        { status: 404 }
      );
    }

    // Verify the request belongs to this session
    if (assistanceRequest.sessionId !== sessionId) {
      return NextResponse.json(
        { error: "Unauthorized to cancel this request" },
        { status: 403 }
      );
    }

    // Only allow cancellation of pending/notified requests
    if (!["PENDING", "NOTIFIED"].includes(assistanceRequest.status)) {
      return NextResponse.json(
        { error: "Cannot cancel a request that is already being handled" },
        { status: 400 }
      );
    }

    // Update the request to cancelled
    await prisma.assistanceRequest.update({
      where: { id },
      data: {
        status: "CANCELLED",
        cancelledAt: new Date(),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error cancelling assistance request:", error);
    return NextResponse.json(
      { error: "Failed to cancel assistance request" },
      { status: 500 }
    );
  }
}
