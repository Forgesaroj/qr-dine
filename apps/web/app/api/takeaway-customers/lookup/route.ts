import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// GET lookup takeaway customer by phone number
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const phone = searchParams.get("phone");

    if (!phone) {
      return NextResponse.json(
        { error: "Phone number is required" },
        { status: 400 }
      );
    }

    // Look up customer by phone
    const customer = await prisma.takeawayCustomer.findUnique({
      where: {
        restaurantId_phone: {
          restaurantId: session.restaurantId,
          phone,
        },
      },
    });

    if (!customer) {
      return NextResponse.json({ customer: null });
    }

    // Get customer's frequently ordered items for suggestions
    let suggestedItems: Array<{
      id: string;
      name: string;
      basePrice: number;
      imageUrl: string | null;
    }> = [];

    if (customer.lastOrderItems) {
      try {
        const lastItems = customer.lastOrderItems as Array<{
          menuItemId: string;
          menuItemName: string;
          quantity: number;
        }>;

        const menuItemIds = lastItems.map((item) => item.menuItemId);

        // Get current menu item details
        const menuItems = await prisma.menuItem.findMany({
          where: {
            id: { in: menuItemIds },
            isAvailable: true,
          },
          select: {
            id: true,
            name: true,
            basePrice: true,
            imageUrl: true,
          },
        });

        suggestedItems = menuItems;
      } catch {
        // If parsing fails, skip suggestions
      }
    }

    return NextResponse.json({
      customer: {
        id: customer.id,
        name: customer.name,
        phone: customer.phone,
        email: customer.email,
        totalOrders: customer.totalOrders,
        totalSpent: customer.totalSpent,
        lastOrderAt: customer.lastOrderAt,
        notes: customer.notes,
      },
      suggestedItems,
    });
  } catch (error) {
    console.error("Error looking up takeaway customer:", error);
    return NextResponse.json(
      { error: "Failed to lookup customer" },
      { status: 500 }
    );
  }
}
