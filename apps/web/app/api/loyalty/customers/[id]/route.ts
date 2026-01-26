import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// GET single customer with full loyalty details
// Privacy: WAITER and CASHIER cannot see spending data (totalSpent, averageOrderValue, order amounts)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Check if user can see spending data (OWNER, MANAGER, SUPER_ADMIN only)
    const canSeeSpendingData = ["OWNER", "MANAGER", "SUPER_ADMIN"].includes(session.role);

    const customer = await prisma.customer.findFirst({
      where: {
        id,
        restaurantId: session.restaurantId,
      },
      include: {
        pointsTransactions: {
          orderBy: { createdAt: "desc" },
          take: 50,
          include: {
            order: {
              select: {
                orderNumber: true,
                totalAmount: canSeeSpendingData,
              },
            },
            bill: {
              select: {
                billNumber: true,
                totalAmount: canSeeSpendingData,
              },
            },
            adjustedBy: {
              select: {
                name: true,
              },
            },
          },
        },
        orders: {
          orderBy: { placedAt: "desc" },
          take: 10,
          select: {
            id: true,
            orderNumber: true,
            status: true,
            totalAmount: canSeeSpendingData,
            placedAt: true,
            pointsEarned: true,
            pointsRedeemed: true,
          },
        },
        notes: {
          orderBy: { createdAt: "desc" },
          take: 10,
          include: {
            addedBy: {
              select: { name: true },
            },
          },
        },
      },
    });

    if (!customer) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    type CustomerOrder = typeof customer.orders[number];
    type PointsTransaction = typeof customer.pointsTransactions[number];

    // Sanitize spending data for non-authorized roles
    let sanitizedCustomer = customer;
    if (!canSeeSpendingData) {
      sanitizedCustomer = {
        ...customer,
        totalSpent: null,
        averageOrderValue: null,
        orders: customer.orders.map((order: CustomerOrder) => ({
          ...order,
          totalAmount: null,
        })),
        pointsTransactions: customer.pointsTransactions.map((tx: PointsTransaction) => ({
          ...tx,
          orderAmount: null,
          discountAmount: null,
          order: tx.order ? { ...tx.order, totalAmount: null } : null,
          bill: tx.bill ? { ...tx.bill, totalAmount: null } : null,
        })),
      } as unknown as typeof customer;
    }

    return NextResponse.json({
      customer: sanitizedCustomer,
      canSeeSpendingData,
    });
  } catch (error) {
    console.error("Error fetching customer:", error);
    return NextResponse.json(
      { error: "Failed to fetch customer" },
      { status: 500 }
    );
  }
}

// PATCH update customer info
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { name, phone, email, dateOfBirth, tier, status } = body;

    // Verify customer exists in this restaurant
    const existing = await prisma.customer.findFirst({
      where: {
        id,
        restaurantId: session.restaurantId,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    const customer = await prisma.customer.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(phone !== undefined && { phone }),
        ...(email !== undefined && { email }),
        ...(dateOfBirth !== undefined && {
          dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
        }),
        ...(tier !== undefined && { tier }),
        ...(status !== undefined && { status }),
      },
    });

    return NextResponse.json({ customer });
  } catch (error) {
    console.error("Error updating customer:", error);
    return NextResponse.json(
      { error: "Failed to update customer" },
      { status: 500 }
    );
  }
}
