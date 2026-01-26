import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// GET active orders for kitchen display
export async function GET() {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get orders that are confirmed and have items not yet served
    const orders = await prisma.order.findMany({
      where: {
        restaurantId: session.restaurantId,
        status: {
          in: ["CONFIRMED", "PREPARING", "READY"],
        },
        items: {
          some: {
            status: {
              in: ["PENDING", "SENT_TO_KITCHEN", "PREPARING", "READY"],
            },
          },
        },
      },
      select: {
        id: true,
        orderNumber: true,
        orderType: true,
        status: true,
        placedAt: true,
        takeawayCustomerName: true,
        takeawayCustomerPhone: true,
        pickupToken: true,
        table: {
          select: {
            tableNumber: true,
          },
        },
        items: {
          where: {
            status: {
              not: "SERVED",
            },
          },
          select: {
            id: true,
            menuItemName: true,
            quantity: true,
            status: true,
            specialRequests: true,
            kitchenStation: true,
            isTakeaway: true,
          },
          orderBy: {
            createdAt: "asc",
          },
        },
      },
      orderBy: {
        placedAt: "asc", // Oldest first (FIFO)
      },
    });

    return NextResponse.json({ orders });
  } catch (error) {
    console.error("Error fetching kitchen orders:", error);
    return NextResponse.json(
      { error: "Failed to fetch orders" },
      { status: 500 }
    );
  }
}
