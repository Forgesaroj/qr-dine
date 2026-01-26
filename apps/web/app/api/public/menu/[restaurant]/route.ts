import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET menu for a restaurant (public endpoint)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ restaurant: string }> }
) {
  try {
    const { restaurant: slug } = await params;

    // Find restaurant by slug
    const restaurant = await prisma.restaurant.findUnique({
      where: { slug },
      select: {
        id: true,
        name: true,
        logoUrl: true,
        currency: true,
      },
    });

    if (!restaurant) {
      return NextResponse.json(
        { error: "Restaurant not found" },
        { status: 404 }
      );
    }

    // Get all active categories with available menu items
    const categories = await prisma.category.findMany({
      where: {
        restaurantId: restaurant.id,
        isActive: true,
      },
      include: {
        menuItems: {
          where: {
            isAvailable: true,
          },
          orderBy: {
            sortOrder: "asc",
          },
          select: {
            id: true,
            name: true,
            description: true,
            basePrice: true,
            imageUrl: true,
            isVegetarian: true,
            isVegan: true,
            spiceLevel: true,
            isAvailable: true,
          },
        },
      },
      orderBy: {
        sortOrder: "asc",
      },
    });

    return NextResponse.json({
      restaurant,
      categories,
    });
  } catch (error) {
    console.error("Error fetching public menu:", error);
    return NextResponse.json(
      { error: "Failed to fetch menu" },
      { status: 500 }
    );
  }
}
