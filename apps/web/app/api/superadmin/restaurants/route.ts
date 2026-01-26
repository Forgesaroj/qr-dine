import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const restaurants = await prisma.restaurant.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: { users: true },
        },
        license: {
          select: {
            tier: true,
            expiresAt: true,
          },
        },
      },
    });

    const formattedRestaurants = restaurants.map((r: typeof restaurants[number]) => ({
      id: r.id,
      name: r.name,
      slug: r.slug,
      address: r.address,
      city: r.city,
      phone: r.phone,
      status: r.status,
      licenseType: r.license?.tier || null,
      licenseExpiry: r.license?.expiresAt?.toISOString() || null,
      userCount: r._count.users,
      createdAt: r.createdAt.toISOString(),
    }));

    return NextResponse.json({ restaurants: formattedRestaurants });
  } catch (error) {
    console.error("Error fetching restaurants:", error);
    return NextResponse.json(
      { error: "Failed to fetch restaurants" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { name, slug, address, city, state, country, phone, email, status } = body;

    if (!name || !slug) {
      return NextResponse.json(
        { error: "Name and slug are required" },
        { status: 400 }
      );
    }

    // Check if slug is unique
    const existing = await prisma.restaurant.findUnique({
      where: { slug },
    });

    if (existing) {
      return NextResponse.json(
        { error: "A restaurant with this slug already exists" },
        { status: 400 }
      );
    }

    const restaurant = await prisma.restaurant.create({
      data: {
        name,
        slug,
        address: address || null,
        city: city || null,
        state: state || null,
        country: country || null,
        phone: phone || null,
        email: email || null,
        status: status || "ACTIVE",
        license: {
          create: {
            licenseKey: `QRDINE-STA-${Date.now()}`,
            tier: "STARTER",
            status: "ACTIVE",
            ownerName: name,
            ownerEmail: email || "admin@restaurant.com",
          },
        },
      },
    });

    // Log the action
    await prisma.activityLog.create({
      data: {
        action: "CREATE",
        activityType: "create_restaurant",
        activityCategory: "manager",
        description: `Created restaurant: ${name}`,
        entityType: "RESTAURANT",
        entityId: restaurant.id,
        userId: session.userId,
        restaurantId: restaurant.id,
        details: { name, slug },
      },
    });

    return NextResponse.json({ restaurant }, { status: 201 });
  } catch (error) {
    console.error("Error creating restaurant:", error);
    return NextResponse.json(
      { error: "Failed to create restaurant" },
      { status: 500 }
    );
  }
}
