import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// GET restaurant settings
export async function GET() {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const restaurant = await prisma.restaurant.findUnique({
      where: { id: session.restaurantId },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        address: true,
        city: true,
        state: true,
        country: true,
        postalCode: true,
        phone: true,
        email: true,
        currency: true,
        timezone: true,
        settings: true,
      },
    });

    if (!restaurant) {
      return NextResponse.json({ error: "Restaurant not found" }, { status: 404 });
    }

    // Parse settings JSON
    const settings = restaurant.settings
      ? JSON.parse(restaurant.settings as string)
      : {};

    return NextResponse.json({
      restaurant: {
        ...restaurant,
        settings,
      },
    });
  } catch (error) {
    console.error("Error fetching settings:", error);
    return NextResponse.json(
      { error: "Failed to fetch settings" },
      { status: 500 }
    );
  }
}

// PATCH update restaurant settings
export async function PATCH(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only OWNER and MANAGER can update settings
    if (!["OWNER", "MANAGER"].includes(session.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const {
      name,
      description,
      address,
      city,
      state,
      country,
      postalCode,
      phone,
      email,
      currency,
      timezone,
      settings,
    } = body;

    const restaurant = await prisma.restaurant.update({
      where: { id: session.restaurantId },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(address !== undefined && { address }),
        ...(city !== undefined && { city }),
        ...(state !== undefined && { state }),
        ...(country !== undefined && { country }),
        ...(postalCode !== undefined && { postalCode }),
        ...(phone !== undefined && { phone }),
        ...(email !== undefined && { email }),
        ...(currency !== undefined && { currency }),
        ...(timezone !== undefined && { timezone }),
        ...(settings !== undefined && { settings: JSON.stringify(settings) }),
      },
    });

    return NextResponse.json({
      success: true,
      restaurant: {
        ...restaurant,
        settings: restaurant.settings
          ? JSON.parse(restaurant.settings as string)
          : {},
      },
    });
  } catch (error) {
    console.error("Error updating settings:", error);
    return NextResponse.json(
      { error: "Failed to update settings" },
      { status: 500 }
    );
  }
}
