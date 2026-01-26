import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { logActivity } from "@/lib/activity-log";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session || session.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const license = await prisma.license.findUnique({
      where: { id },
      include: {
        restaurants: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    if (!license) {
      return NextResponse.json({ error: "License not found" }, { status: 404 });
    }

    return NextResponse.json({ license });
  } catch (error) {
    console.error("Error fetching license:", error);
    return NextResponse.json(
      { error: "Failed to fetch license" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session || session.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const license = await prisma.license.findUnique({
      where: { id },
      include: {
        restaurants: {
          select: { id: true, name: true },
        },
      },
    });

    if (!license) {
      return NextResponse.json({ error: "License not found" }, { status: 404 });
    }

    // Update license status to CANCELLED (revoked)
    await prisma.license.update({
      where: { id },
      data: {
        status: "CANCELLED",
      },
    });

    // Log the action if license has restaurants
    if (license.restaurants.length > 0) {
      const restaurant = license.restaurants[0];
      if (restaurant) {
        await logActivity({
          restaurantId: restaurant.id,
          activityType: "license_revoked",
          entityType: "license",
          entityId: id,
          userId: session.userId,
          description: `License ${license.licenseKey} revoked`,
          priority: "warning",
          details: {
            licenseKey: license.licenseKey,
            tier: license.tier,
            restaurantName: restaurant.name,
          },
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error revoking license:", error);
    return NextResponse.json(
      { error: "Failed to revoke license" },
      { status: 500 }
    );
  }
}
