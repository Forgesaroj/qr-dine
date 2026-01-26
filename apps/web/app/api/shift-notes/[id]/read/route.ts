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

    const noteId = params.id;

    // Get the current note
    const note = await prisma.shiftNote.findUnique({
      where: { id: noteId },
    });

    if (!note) {
      return NextResponse.json({ error: "Note not found" }, { status: 404 });
    }

    // Check if user belongs to same restaurant
    if (note.restaurantId !== session.restaurantId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Parse current readBy array
    const readBy = JSON.parse(note.readBy as string || "[]");

    // Add user if not already in the list
    if (!readBy.includes(session.userId)) {
      readBy.push(session.userId);

      await prisma.shiftNote.update({
        where: { id: noteId },
        data: { readBy: JSON.stringify(readBy) },
      });
    }

    return NextResponse.json({ success: true, readBy });
  } catch (error) {
    console.error("Error marking note as read:", error);
    return NextResponse.json(
      { error: "Failed to mark note as read" },
      { status: 500 }
    );
  }
}
