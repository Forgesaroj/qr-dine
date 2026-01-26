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

    // Build status filter
    let statusFilter: { in: string[] } | string | undefined;

    if (status === "active") {
      statusFilter = { in: ["PENDING", "CONFIRMED", "PREPARING", "READY", "SERVED"] };
    } else if (status === "completed") {
      statusFilter = "COMPLETED";
    } else if (status === "cancelled") {
      statusFilter = "CANCELLED";
    }
    // "all" has no status filter (statusFilter remains undefined)

    const orders = await prisma.order.findMany({
      where: {
        restaurantId: session.restaurantId,
        ...(statusFilter && { status: statusFilter }),
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
