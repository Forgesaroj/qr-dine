import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const item = await prisma.lostFoundItem.findUnique({
      where: { id: params.id },
    });

    if (!item) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    if (item.restaurantId !== session.restaurantId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json({ item });
  } catch (error) {
    console.error("Error fetching lost & found item:", error);
    return NextResponse.json(
      { error: "Failed to fetch item" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const item = await prisma.lostFoundItem.findUnique({
      where: { id: params.id },
    });

    if (!item) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    if (item.restaurantId !== session.restaurantId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const {
      category,
      description,
      foundAt,
      storageLocation,
      notes,
      photoUrl,
      status,
      disposedReason,
      deliveryNotes,
    } = body;

    const updateData: Record<string, unknown> = {};

    if (category) updateData.category = category;
    if (description) updateData.description = description;
    if (foundAt) updateData.foundAt = foundAt;
    if (storageLocation !== undefined) updateData.storageLocation = storageLocation;
    if (notes !== undefined) updateData.notes = notes;
    if (photoUrl !== undefined) updateData.photoUrl = photoUrl;

    if (status === "DISPOSED") {
      updateData.status = "DISPOSED";
      updateData.disposedAt = new Date();
      updateData.disposedReason = disposedReason || null;
    } else if (status === "DELIVERED") {
      updateData.status = "DELIVERED";
      updateData.deliveredAt = new Date();
      updateData.deliveredById = session.userId;
      updateData.deliveryNotes = deliveryNotes || null;
    } else if (status) {
      updateData.status = status;
    }

    const updatedItem = await prisma.lostFoundItem.update({
      where: { id: params.id },
      data: updateData,
    });

    return NextResponse.json({ item: updatedItem });
  } catch (error) {
    console.error("Error updating lost & found item:", error);
    return NextResponse.json(
      { error: "Failed to update item" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only managers and above can delete
    const allowedRoles = ["OWNER", "ADMIN", "MANAGER"];
    if (!allowedRoles.includes(session.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const item = await prisma.lostFoundItem.findUnique({
      where: { id: params.id },
    });

    if (!item) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    if (item.restaurantId !== session.restaurantId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await prisma.lostFoundItem.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting lost & found item:", error);
    return NextResponse.json(
      { error: "Failed to delete item" },
      { status: 500 }
    );
  }
}
