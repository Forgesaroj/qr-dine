import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// GET all menu items for the restaurant
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const categoryId = searchParams.get("categoryId");

    const where: any = { restaurantId: session.restaurantId };
    if (categoryId) {
      where.categoryId = categoryId;
    }

    const items = await prisma.menuItem.findMany({
      where,
      include: {
        category: true,
      },
      orderBy: [{ category: { sortOrder: "asc" } }, { sortOrder: "asc" }],
    });

    return NextResponse.json({ items });
  } catch (error) {
    console.error("Error fetching menu items:", error);
    return NextResponse.json(
      { error: "Failed to fetch menu items" },
      { status: 500 }
    );
  }
}

// POST create a new menu item
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      categoryId,
      name,
      nameLocal,
      description,
      imageUrl,
      basePrice,
      pricingType,
      isVegetarian,
      isVegan,
      spiceLevel,
      isAvailable,
    } = body;

    if (!categoryId || !name || basePrice === undefined) {
      return NextResponse.json(
        { error: "Category, name, and price are required" },
        { status: 400 }
      );
    }

    // Verify category belongs to the restaurant
    const category = await prisma.category.findFirst({
      where: {
        id: categoryId,
        restaurantId: session.restaurantId,
      },
    });

    if (!category) {
      return NextResponse.json(
        { error: "Category not found" },
        { status: 404 }
      );
    }

    // Get the highest sort order in this category
    const lastItem = await prisma.menuItem.findFirst({
      where: { categoryId },
      orderBy: { sortOrder: "desc" },
    });

    const sortOrder = lastItem ? lastItem.sortOrder + 1 : 0;

    const item = await prisma.menuItem.create({
      data: {
        restaurantId: session.restaurantId,
        categoryId,
        name,
        nameLocal: nameLocal || null,
        description: description || null,
        imageUrl: imageUrl || null,
        basePrice: parseFloat(basePrice),
        pricingType: pricingType || "SINGLE",
        isVegetarian: isVegetarian ?? false,
        isVegan: isVegan ?? false,
        spiceLevel: spiceLevel ? parseInt(spiceLevel) : null,
        isAvailable: isAvailable ?? true,
        sortOrder,
      },
      include: {
        category: true,
      },
    });

    return NextResponse.json({ item }, { status: 201 });
  } catch (error) {
    console.error("Error creating menu item:", error);
    return NextResponse.json(
      { error: "Failed to create menu item" },
      { status: 500 }
    );
  }
}
