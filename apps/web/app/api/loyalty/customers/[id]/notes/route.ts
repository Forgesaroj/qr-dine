import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// POST add a note to customer
export async function POST(
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
    const { note } = body;

    if (!note || note.trim().length === 0) {
      return NextResponse.json(
        { error: "Note content is required" },
        { status: 400 }
      );
    }

    // Verify customer exists in this restaurant
    const customer = await prisma.customer.findFirst({
      where: {
        id,
        restaurantId: session.restaurantId,
      },
    });

    if (!customer) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    const customerNote = await prisma.customerNote.create({
      data: {
        customerId: id,
        note: note.trim(),
        addedById: session.userId,
      },
      include: {
        addedBy: {
          select: { name: true },
        },
      },
    });

    return NextResponse.json({
      success: true,
      note: customerNote,
    }, { status: 201 });
  } catch (error) {
    console.error("Error adding customer note:", error);
    return NextResponse.json(
      { error: "Failed to add note" },
      { status: 500 }
    );
  }
}

// GET all notes for a customer
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

    // Verify customer exists in this restaurant
    const customer = await prisma.customer.findFirst({
      where: {
        id,
        restaurantId: session.restaurantId,
      },
    });

    if (!customer) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    const notes = await prisma.customerNote.findMany({
      where: { customerId: id },
      orderBy: { createdAt: "desc" },
      include: {
        addedBy: {
          select: { name: true },
        },
      },
    });

    return NextResponse.json({ notes });
  } catch (error) {
    console.error("Error fetching customer notes:", error);
    return NextResponse.json(
      { error: "Failed to fetch notes" },
      { status: 500 }
    );
  }
}

// DELETE a specific note
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const noteId = searchParams.get("noteId");

    if (!noteId) {
      return NextResponse.json(
        { error: "Note ID is required" },
        { status: 400 }
      );
    }

    const { id } = await params;

    // Verify note exists and belongs to customer in this restaurant
    const note = await prisma.customerNote.findFirst({
      where: {
        id: noteId,
        customerId: id,
        customer: {
          restaurantId: session.restaurantId,
        },
      },
    });

    if (!note) {
      return NextResponse.json({ error: "Note not found" }, { status: 404 });
    }

    // Only the person who added the note or managers can delete
    if (note.addedById !== session.userId && !["OWNER", "MANAGER", "SUPER_ADMIN"].includes(session.role)) {
      return NextResponse.json(
        { error: "You can only delete your own notes" },
        { status: 403 }
      );
    }

    await prisma.customerNote.delete({
      where: { id: noteId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting customer note:", error);
    return NextResponse.json(
      { error: "Failed to delete note" },
      { status: 500 }
    );
  }
}
