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

    const item = await prisma.lostFoundItem.findUnique({
      where: { id: params.id },
    });

    if (!item) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    if (item.restaurantId !== session.restaurantId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (item.status !== "FOUND") {
      return NextResponse.json(
        { error: "Item is not available for claiming" },
        { status: 400 }
      );
    }

    const body = await req.json();
    const { claimedByName, claimedByPhone, verificationNotes } = body;

    if (!claimedByName || !claimedByPhone) {
      return NextResponse.json(
        { error: "Claimant name and phone are required" },
        { status: 400 }
      );
    }

    const updatedItem = await prisma.lostFoundItem.update({
      where: { id: params.id },
      data: {
        status: "CLAIMED",
        claimedByName,
        claimedByPhone,
        claimedAt: new Date(),
        handedOverById: session.userId,
        verificationNotes: verificationNotes || null,
      },
    });

    return NextResponse.json({ item: updatedItem });
  } catch (error) {
    console.error("Error claiming lost & found item:", error);
    return NextResponse.json(
      { error: "Failed to process claim" },
      { status: 500 }
    );
  }
}
