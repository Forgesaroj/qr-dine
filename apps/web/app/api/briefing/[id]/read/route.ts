import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const briefingId = params.id;

    // Get the current briefing
    const briefing = await prisma.dailyBriefing.findUnique({
      where: { id: briefingId },
    });

    if (!briefing) {
      return NextResponse.json({ error: "Briefing not found" }, { status: 404 });
    }

    // Check if user belongs to same restaurant
    if (briefing.restaurantId !== session.restaurantId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get current readBy array
    const readBy = (briefing.readBy as string[]) || [];

    // Add user if not already in the list
    if (!readBy.includes(session.userId)) {
      readBy.push(session.userId);

      await prisma.dailyBriefing.update({
        where: { id: briefingId },
        data: { readBy },
      });
    }

    return NextResponse.json({ success: true, readBy });
  } catch (error) {
    console.error("Error marking briefing as read:", error);
    return NextResponse.json(
      { error: "Failed to mark briefing as read" },
      { status: 500 }
    );
  }
}
