import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// GET all customers with loyalty info
// Privacy: WAITER and CASHIER cannot see spending data (totalSpent, averageOrderValue)
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const tier = searchParams.get("tier") || "";
    const sortBy = searchParams.get("sortBy") || "pointsBalance";
    const sortOrder = searchParams.get("sortOrder") || "desc";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");

    // Check if user can see spending data (OWNER, MANAGER, SUPER_ADMIN only)
    const canSeeSpendingData = ["OWNER", "MANAGER", "SUPER_ADMIN"].includes(session.role);

    const where: any = {
      restaurantId: session.restaurantId,
      status: "ACTIVE",
    };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { phone: { contains: search } },
        { email: { contains: search, mode: "insensitive" } },
      ];
    }

    if (tier) {
      where.tier = tier;
    }

    // Build select object based on role permissions
    const selectFields: Record<string, boolean> = {
      id: true,
      customerId: true,
      name: true,
      phone: true,
      email: true,
      tier: true,
      pointsBalance: true,
      pointsEarnedLifetime: true,
      pointsRedeemedLifetime: true,
      totalVisits: true,
      createdAt: true,
    };

    // Only include spending data for authorized roles
    if (canSeeSpendingData) {
      selectFields.totalSpent = true;
      selectFields.averageOrderValue = true;
    }

    const [customers, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        select: {
          ...selectFields,
          _count: {
            select: {
              orders: true,
            },
          },
        },
        orderBy: { [sortBy]: sortOrder as "asc" | "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.customer.count({ where }),
    ]);

    type CustomerType = typeof customers[number];

    // For non-authorized roles, mask the spending data in response
    const sanitizedCustomers = customers.map((customer: CustomerType) => {
      if (!canSeeSpendingData) {
        return {
          ...customer,
          totalSpent: null,
          averageOrderValue: null,
        };
      }
      return customer;
    });

    return NextResponse.json({
      customers: sanitizedCustomers,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      // Include flag so UI knows whether to show spending columns
      canSeeSpendingData,
    });
  } catch (error) {
    console.error("Error fetching customers:", error);
    return NextResponse.json(
      { error: "Failed to fetch customers" },
      { status: 500 }
    );
  }
}

// POST create/register a new customer
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, phone, email, dateOfBirth } = body;

    if (!name || !phone) {
      return NextResponse.json(
        { error: "Name and phone are required" },
        { status: 400 }
      );
    }

    // Check if customer already exists
    const existing = await prisma.customer.findFirst({
      where: {
        restaurantId: session.restaurantId,
        phone,
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Customer with this phone already exists", customer: existing },
        { status: 409 }
      );
    }

    // Get loyalty settings for welcome bonus
    const restaurant = await prisma.restaurant.findUnique({
      where: { id: session.restaurantId },
      select: { settings: true },
    });

    const settings = restaurant?.settings
      ? (typeof restaurant.settings === "string"
          ? JSON.parse(restaurant.settings)
          : restaurant.settings)
      : {};

    const loyaltySettings = settings.loyalty || {};
    const welcomeBonus = loyaltySettings.welcomeBonus || 0;

    // Generate customer ID
    const customerCount = await prisma.customer.count({
      where: { restaurantId: session.restaurantId },
    });
    const customerId = `CUST-${String(customerCount + 1).padStart(5, "0")}`;

    // Create customer
    const customer = await prisma.customer.create({
      data: {
        restaurantId: session.restaurantId,
        customerId,
        name,
        phone,
        email: email || null,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
        tier: "BRONZE",
        pointsBalance: welcomeBonus,
        pointsEarnedLifetime: welcomeBonus,
      },
    });

    // Record welcome bonus transaction if applicable
    if (welcomeBonus > 0) {
      await prisma.pointsTransaction.create({
        data: {
          customerId: customer.id,
          type: "BONUS",
          points: welcomeBonus,
          balanceAfter: welcomeBonus,
          bonusType: "WELCOME",
          reason: "Welcome bonus for joining loyalty program",
        },
      });
    }

    return NextResponse.json({ customer }, { status: 201 });
  } catch (error) {
    console.error("Error creating customer:", error);
    return NextResponse.json(
      { error: "Failed to create customer" },
      { status: 500 }
    );
  }
}
