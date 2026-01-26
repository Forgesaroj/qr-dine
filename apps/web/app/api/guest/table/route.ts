import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET table info for guest
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const restaurantSlug = searchParams.get("restaurant");
    const tableId = searchParams.get("table");

    if (!restaurantSlug || !tableId) {
      return NextResponse.json(
        { error: "Restaurant and table are required" },
        { status: 400 }
      );
    }

    // Find restaurant by slug
    const restaurant = await prisma.restaurant.findUnique({
      where: { slug: restaurantSlug },
      select: { id: true, name: true, slug: true, status: true },
    });

    if (!restaurant) {
      return NextResponse.json(
        { error: "Restaurant not found" },
        { status: 404 }
      );
    }

    if (restaurant.status !== "ACTIVE") {
      return NextResponse.json(
        { error: "Restaurant is currently not accepting orders" },
        { status: 400 }
      );
    }

    // Find table - can be by ID or table number
    const table = await prisma.table.findFirst({
      where: {
        restaurantId: restaurant.id,
        OR: [
          { id: tableId },
          { tableNumber: tableId },
        ],
      },
      select: {
        id: true,
        tableNumber: true,
        name: true,
        status: true,
      },
    });

    if (!table) {
      return NextResponse.json(
        { error: "Table not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      table: {
        id: table.id,
        tableNumber: table.tableNumber,
        name: table.name,
        status: table.status,
        restaurant: {
          name: restaurant.name,
          slug: restaurant.slug,
        },
      },
    });
  } catch (error) {
    console.error("Error fetching table info:", error);
    return NextResponse.json(
      { error: "Failed to fetch table info" },
      { status: 500 }
    );
  }
}
