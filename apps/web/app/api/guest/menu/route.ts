import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Tier multipliers for loyalty points
const TIER_MULTIPLIERS: Record<string, number> = {
  BRONZE: 1.0,
  SILVER: 1.1,
  GOLD: 1.25,
  PLATINUM: 1.5,
};

// GET menu for guest
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const restaurantSlug = searchParams.get("restaurant");
    const customerId = searchParams.get("customerId"); // Optional - for logged in customers

    if (!restaurantSlug) {
      return NextResponse.json(
        { error: "Restaurant is required" },
        { status: 400 }
      );
    }

    // Find restaurant with settings
    const restaurant = await prisma.restaurant.findUnique({
      where: { slug: restaurantSlug },
      select: { id: true, name: true, status: true, settings: true },
    });

    if (!restaurant) {
      return NextResponse.json(
        { error: `Restaurant '${restaurantSlug}' not found` },
        { status: 404 }
      );
    }

    if (restaurant.status !== "ACTIVE") {
      return NextResponse.json(
        { error: "Restaurant is not active" },
        { status: 404 }
      );
    }

    // Get all categories with menu items for this restaurant
    const categories = await prisma.category.findMany({
      where: {
        restaurantId: restaurant.id,
      },
      orderBy: { sortOrder: "asc" },
      include: {
        menuItems: {
          orderBy: { sortOrder: "asc" },
        },
      },
    });

    type Category = typeof categories[number];
    type MenuItem = Category["menuItems"][number];

    // Get loyalty settings
    const settings = restaurant.settings
      ? (typeof restaurant.settings === "string"
          ? JSON.parse(restaurant.settings)
          : restaurant.settings) as Record<string, unknown>
      : {};

    const loyaltySettings = (settings.loyalty || {}) as Record<string, unknown>;
    const pointsPerRupee = (loyaltySettings.pointsPerRupee as number) || 0.1; // Default: 10 points per Rs. 100
    const loyaltyEnabled = loyaltySettings.enabled !== false;

    // Get customer tier if customerId provided
    let customerTier = "BRONZE";
    let isLoyaltyMember = false;

    if (customerId) {
      const customer = await prisma.customer.findFirst({
        where: {
          id: customerId,
          restaurantId: restaurant.id,
          status: "ACTIVE",
        },
        select: { tier: true },
      });

      if (customer) {
        customerTier = customer.tier;
        isLoyaltyMember = true;
      }
    }

    const tierMultiplier = TIER_MULTIPLIERS[customerTier] || 1.0;

    // Calculate points for each item
    const calculatePoints = (price: number) => {
      if (!loyaltyEnabled) return null;
      const basePoints = Math.floor(price * pointsPerRupee);
      const actualPoints = Math.floor(basePoints * tierMultiplier);
      return {
        basePoints,
        actualPoints,
        multiplier: tierMultiplier,
      };
    };

    // Transform and filter items (show all items for now - removed strict filter)
    const result = categories
      .map((cat: Category) => ({
        id: cat.id,
        name: cat.name,
        description: cat.description,
        image: cat.imageUrl,
        items: cat.menuItems
          .map((item: MenuItem) => ({
            id: item.id,
            name: item.name,
            description: item.description,
            price: item.basePrice, // basePrice in schema
            image: item.imageUrl,  // imageUrl in schema
            isVegetarian: item.isVegetarian,
            isVegan: item.isVegan,
            spiceLevel: item.spiceLevel,
            preparationTime: item.prepTimeMinutes,
            // Add loyalty points info
            points: calculatePoints(item.basePrice),
          })),
      }))
      .filter((cat: { id: string; name: string; items: unknown[] }) => cat.items.length > 0);

    type ResultCategory = typeof result[number];

    return NextResponse.json({
      restaurant: {
        name: restaurant.name,
      },
      categories: result,
      loyalty: loyaltyEnabled ? {
        enabled: true,
        isLoyaltyMember,
        customerTier,
        tierMultiplier,
        pointsPerRupee,
      } : null,
      debug: {
        totalCategories: categories.length,
        totalItems: categories.reduce((sum: number, c: Category) => sum + c.menuItems.length, 0),
        filteredCategories: result.length,
        filteredItems: result.reduce((sum: number, c: ResultCategory) => sum + c.items.length, 0),
      },
    });
  } catch (error) {
    console.error("Error fetching menu:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch menu",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}
