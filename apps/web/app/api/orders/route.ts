import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// GET all orders for the restaurant
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || "active";

    // Query with appropriate filter
    const orders = await prisma.order.findMany({
      where: status === "active"
        ? {
            restaurantId: session.restaurantId,
            status: { in: ["PENDING", "CONFIRMED", "PREPARING", "READY", "SERVED"] },
          }
        : status === "completed"
        ? { restaurantId: session.restaurantId, status: "COMPLETED" }
        : status === "cancelled"
        ? { restaurantId: session.restaurantId, status: "CANCELLED" }
        : { restaurantId: session.restaurantId },
      include: {
        table: {
          select: {
            tableNumber: true,
            name: true,
          },
        },
        items: {
          select: {
            id: true,
            menuItemName: true,
            quantity: true,
            unitPrice: true,
            totalPrice: true,
            status: true,
            specialRequests: true,
          },
        },
      },
      orderBy: [
        { status: "asc" }, // Pending first
        { placedAt: "desc" },
      ],
    });

    return NextResponse.json({ orders });
  } catch (error) {
    console.error("Error fetching orders:", error);
    return NextResponse.json(
      { error: "Failed to fetch orders" },
      { status: 500 }
    );
  }
}
