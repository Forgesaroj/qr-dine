import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// GET all categories for the restaurant
export async function GET() {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const categories = await prisma.category.findMany({
      where: { restaurantId: session.restaurantId },
      include: {
        menuItems: {
          orderBy: { sortOrder: "asc" },
        },
      },
      orderBy: { sortOrder: "asc" },
    });

    return NextResponse.json({ categories });
  } catch (error) {
    console.error("Error fetching categories:", error);
    return NextResponse.json(
      { error: "Failed to fetch categories" },
      { status: 500 }
    );
  }
}

// POST create a new category
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, nameLocal, description, imageUrl, isActive } = body;

    if (!name) {
      return NextResponse.json(
        { error: "Category name is required" },
        { status: 400 }
      );
    }

    // Get the highest sort order
    const lastCategory = await prisma.category.findFirst({
      where: { restaurantId: session.restaurantId },
      orderBy: { sortOrder: "desc" },
    });

    const sortOrder = lastCategory ? lastCategory.sortOrder + 1 : 0;

    const category = await prisma.category.create({
      data: {
        restaurantId: session.restaurantId,
        name,
        nameLocal: nameLocal || null,
        description: description || null,
        imageUrl: imageUrl || null,
        isActive: isActive ?? true,
        sortOrder,
      },
    });

    return NextResponse.json({ category }, { status: 201 });
  } catch (error) {
    console.error("Error creating category:", error);
    return NextResponse.json(
      { error: "Failed to create category" },
      { status: 500 }
    );
  }
}
