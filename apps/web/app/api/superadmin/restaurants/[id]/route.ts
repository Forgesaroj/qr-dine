import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();
    if (!session || session.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const restaurant = await prisma.restaurant.findUnique({
      where: { id: params.id },
      include: {
        _count: {
          select: { users: true, orders: true, tables: true },
        },
        license: true,
        users: {
          take: 10,
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            status: true,
            createdAt: true,
          },
        },
      },
    });

    if (!restaurant) {
      return NextResponse.json({ error: "Restaurant not found" }, { status: 404 });
    }

    return NextResponse.json({ restaurant });
  } catch (error) {
    console.error("Error fetching restaurant:", error);
    return NextResponse.json(
      { error: "Failed to fetch restaurant" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();
    if (!session || session.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { name, address, city, state, country, phone, email, status } = body;

    const restaurant = await prisma.restaurant.findUnique({
      where: { id: params.id },
    });

    if (!restaurant) {
      return NextResponse.json({ error: "Restaurant not found" }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name;
    if (address !== undefined) updateData.address = address;
    if (city !== undefined) updateData.city = city;
    if (state !== undefined) updateData.state = state;
    if (country !== undefined) updateData.country = country;
    if (phone !== undefined) updateData.phone = phone;
    if (email !== undefined) updateData.email = email;
    if (status !== undefined) updateData.status = status;

    const updated = await prisma.restaurant.update({
      where: { id: params.id },
      data: updateData,
    });

    // Log the action
    await prisma.activityLog.create({
      data: {
        action: "UPDATE",
        activityType: "update_restaurant",
        activityCategory: "manager",
        description: `Updated restaurant: ${updated.name}`,
        entityType: "RESTAURANT",
        entityId: params.id,
        userId: session.userId,
        restaurantId: params.id,
        details: updateData as object,
      },
    });

    return NextResponse.json({ restaurant: updated });
  } catch (error) {
    console.error("Error updating restaurant:", error);
    return NextResponse.json(
      { error: "Failed to update restaurant" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();
    if (!session || session.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const restaurant = await prisma.restaurant.findUnique({
      where: { id: params.id },
      include: {
        _count: {
          select: { orders: true },
        },
      },
    });

    if (!restaurant) {
      return NextResponse.json({ error: "Restaurant not found" }, { status: 404 });
    }

    // Check if restaurant has orders - don't delete if it does
    if (restaurant._count.orders > 0) {
      return NextResponse.json(
        { error: "Cannot delete restaurant with existing orders. Please suspend instead." },
        { status: 400 }
      );
    }

    // Log before deletion
    await prisma.activityLog.create({
      data: {
        action: "DELETE",
        activityType: "delete_restaurant",
        activityCategory: "manager",
        description: `Deleted restaurant: ${restaurant.name}`,
        entityType: "RESTAURANT",
        entityId: params.id,
        userId: session.userId,
        restaurantId: params.id,
        details: { name: restaurant.name, slug: restaurant.slug },
      },
    });

    // Delete related data first
    await prisma.$transaction([
      prisma.user.deleteMany({ where: { restaurantId: params.id } }),
      prisma.table.deleteMany({ where: { restaurantId: params.id } }),
      prisma.menuItem.deleteMany({ where: { restaurantId: params.id } }),
      prisma.category.deleteMany({ where: { restaurantId: params.id } }),
      prisma.restaurant.delete({ where: { id: params.id } }),
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting restaurant:", error);
    return NextResponse.json(
      { error: "Failed to delete restaurant" },
      { status: 500 }
    );
  }
}
