import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { Prisma, OrderStatus } from "@prisma/client";

// GET all orders for the restaurant
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || "active";

    let statusFilter: Prisma.OrderWhereInput = {};

    if (status === "active") {
      statusFilter = {
        status: {
          in: [
            OrderStatus.PENDING,
            OrderStatus.CONFIRMED,
            OrderStatus.PREPARING,
            OrderStatus.READY,
            OrderStatus.SERVED,
          ],
        },
      };
    } else if (status === "completed") {
      statusFilter = { status: OrderStatus.COMPLETED };
    } else if (status === "cancelled") {
      statusFilter = { status: OrderStatus.CANCELLED };
    }
    // "all" has no status filter

    const orders = await prisma.order.findMany({
      where: {
        restaurantId: session.restaurantId,
        ...statusFilter,
      },
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
