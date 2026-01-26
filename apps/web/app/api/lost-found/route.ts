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
    const status = searchParams.get("status");
    const category = searchParams.get("category");

    const whereClause: Record<string, unknown> = {
      restaurantId: session.restaurantId,
    };

    if (status) {
      whereClause.status = status;
    }

    if (category) {
      whereClause.category = category;
    }

    const items = await prisma.lostFoundItem.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ items });
  } catch (error) {
    console.error("Error fetching lost & found items:", error);
    return NextResponse.json(
      { error: "Failed to fetch items" },
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
    const { category, description, foundAt, storageLocation, notes, photoUrl } = body;

    if (!category || !description || !foundAt) {
      return NextResponse.json(
        { error: "Category, description, and location are required" },
        { status: 400 }
      );
    }

    const item = await prisma.lostFoundItem.create({
      data: {
        restaurantId: session.restaurantId,
        category,
        description,
        foundAt,
        foundById: session.userId,
        foundAtTime: new Date(),
        storageLocation: storageLocation || null,
        notes: notes || null,
        photoUrl: photoUrl || null,
        status: "FOUND",
      },
    });

    return NextResponse.json({ item }, { status: 201 });
  } catch (error) {
    console.error("Error creating lost & found item:", error);
    return NextResponse.json(
      { error: "Failed to create item" },
      { status: 500 }
    );
  }
}
