import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const dateParam = searchParams.get("date");

    const targetDate = dateParam ? new Date(dateParam) : new Date();

    const notes = await prisma.shiftNote.findMany({
      where: {
        restaurantId: session.restaurantId,
        shiftDate: targetDate,
      },
      include: {
        writtenBy: {
          select: {
            id: true,
            name: true,
            role: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Parse JSON fields
    const parsedNotes = notes.map((note: typeof notes[number]) => ({
      ...note,
      tags: JSON.parse(note.tags as string || "[]"),
      readBy: JSON.parse(note.readBy as string || "[]"),
    }));

    return NextResponse.json({ notes: parsedNotes });
  } catch (error) {
    console.error("Error fetching shift notes:", error);
    return NextResponse.json(
      { error: "Failed to fetch shift notes" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { shiftDate, shiftType, notes, tags } = body;

    if (!notes || !shiftType) {
      return NextResponse.json(
        { error: "Notes and shift type are required" },
        { status: 400 }
      );
    }

    const note = await prisma.shiftNote.create({
      data: {
        restaurantId: session.restaurantId,
        shiftDate: new Date(shiftDate),
        shiftType,
        notes,
        tags: JSON.stringify(tags || []),
        writtenById: session.userId,
        readBy: JSON.stringify([session.userId]),
      },
      include: {
        writtenBy: {
          select: {
            id: true,
            name: true,
            role: true,
          },
        },
      },
    });

    return NextResponse.json(
      {
        note: {
          ...note,
          tags: JSON.parse(note.tags as string),
          readBy: JSON.parse(note.readBy as string),
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating shift note:", error);
    return NextResponse.json(
      { error: "Failed to create shift note" },
      { status: 500 }
    );
  }
}
