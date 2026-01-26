import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// Default loyalty settings
const defaultLoyaltySettings = {
  enabled: false,
  pointsPerCurrency: 1, // 1 point per Rs. 100 spent
  currencyPerPoint: 100, // Rs. 100 = 1 point
  pointValue: 1, // 1 point = Rs. 1 discount
  minRedeemPoints: 100, // Minimum points to redeem
  maxRedeemPercentage: 50, // Max 50% of bill can be paid with points
  welcomeBonus: 0, // Bonus points on registration
  birthdayBonus: 100, // Birthday bonus points
  referralBonus: 50, // Referral bonus points
  tierThresholds: {
    BRONZE: 0,
    SILVER: 500,
    GOLD: 2000,
    PLATINUM: 5000,
  },
  tierMultipliers: {
    BRONZE: 1,
    SILVER: 1.25,
    GOLD: 1.5,
    PLATINUM: 2,
  },
  pointsExpiry: 365, // Points expire after 365 days (0 = never)
};

// GET loyalty settings
export async function GET() {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const restaurant = await prisma.restaurant.findUnique({
      where: { id: session.restaurantId },
      select: { settings: true },
    });

    if (!restaurant) {
      return NextResponse.json({ error: "Restaurant not found" }, { status: 404 });
    }

    const settings = restaurant.settings
      ? (typeof restaurant.settings === "string"
          ? JSON.parse(restaurant.settings)
          : restaurant.settings)
      : {};

    const loyaltySettings = {
      ...defaultLoyaltySettings,
      ...(settings.loyalty || {}),
    };

    return NextResponse.json({ settings: loyaltySettings });
  } catch (error) {
    console.error("Error fetching loyalty settings:", error);
    return NextResponse.json(
      { error: "Failed to fetch loyalty settings" },
      { status: 500 }
    );
  }
}

// PUT update loyalty settings
export async function PUT(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only OWNER can update loyalty settings
    if (!["OWNER", "SUPER_ADMIN"].includes(session.role)) {
      return NextResponse.json(
        { error: "Only owners can update loyalty settings" },
        { status: 403 }
      );
    }

    const body = await request.json();

    // Get current settings
    const restaurant = await prisma.restaurant.findUnique({
      where: { id: session.restaurantId },
      select: { settings: true },
    });

    const currentSettings = restaurant?.settings
      ? (typeof restaurant.settings === "string"
          ? JSON.parse(restaurant.settings)
          : restaurant.settings)
      : {};

    // Merge loyalty settings
    const updatedSettings = {
      ...currentSettings,
      loyalty: {
        ...defaultLoyaltySettings,
        ...(currentSettings.loyalty || {}),
        ...body,
      },
    };

    // Update restaurant settings
    await prisma.restaurant.update({
      where: { id: session.restaurantId },
      data: { settings: JSON.stringify(updatedSettings) },
    });

    return NextResponse.json({
      success: true,
      settings: updatedSettings.loyalty,
    });
  } catch (error) {
    console.error("Error updating loyalty settings:", error);
    return NextResponse.json(
      { error: "Failed to update loyalty settings" },
      { status: 500 }
    );
  }
}
