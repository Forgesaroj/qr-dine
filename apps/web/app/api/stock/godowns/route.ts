import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// Roles that can manage godowns
const GODOWN_MANAGEMENT_ROLES = ["OWNER", "MANAGER", "ACCOUNTANT"];

// ═══════════════════════════════════════════════════════════════════════════════
// GET - List all godowns
// ═══════════════════════════════════════════════════════════════════════════════

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const isActive = searchParams.get("isActive");
    const type = searchParams.get("type");
    const includeStocks = searchParams.get("includeStocks") === "true";

    // Build where clause
    const where: Record<string, unknown> = {
      restaurantId: session.restaurantId,
    };

    if (isActive !== null && isActive !== undefined) {
      where.isActive = isActive === "true";
    }

    if (type) {
      where.type = type;
    }

    // Fetch godowns
    const godowns = await prisma.godown.findMany({
      where,
      orderBy: [{ isDefault: "desc" }, { name: "asc" }],
      include: includeStocks
        ? {
            godownStocks: {
              include: {
                stockItem: {
                  select: {
                    id: true,
                    itemCode: true,
                    name: true,
                    baseUnit: true,
                    averageCost: true,
                  },
                },
              },
            },
            _count: {
              select: { godownStocks: true },
            },
          }
        : {
            _count: {
              select: { godownStocks: true },
            },
          },
    });

    // Calculate total stock value for each godown
    const godownsWithValue = await Promise.all(
      godowns.map(async (godown) => {
        const stockValue = await prisma.godownStock.aggregate({
          where: { godownId: godown.id },
          _sum: {
            quantity: true,
          },
        });

        // Calculate total value
        const stocks = await prisma.godownStock.findMany({
          where: { godownId: godown.id },
          include: {
            stockItem: {
              select: { averageCost: true },
            },
          },
        });

        const totalValue = stocks.reduce((sum, stock) => {
          return sum + Number(stock.quantity) * Number(stock.stockItem.averageCost);
        }, 0);

        return {
          ...godown,
          stockItemCount: godown._count.godownStocks,
          totalStockValue: totalValue,
        };
      })
    );

    return NextResponse.json({
      godowns: godownsWithValue,
    });
  } catch (error) {
    console.error("Error fetching godowns:", error);
    return NextResponse.json(
      { error: "Failed to fetch godowns" },
      { status: 500 }
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// POST - Create new godown
// ═══════════════════════════════════════════════════════════════════════════════

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!GODOWN_MANAGEMENT_ROLES.includes(session.role)) {
      return NextResponse.json(
        { error: "You do not have permission to create godowns" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { code, name, address, type, isDefault } = body;

    // Validate required fields
    if (!code) {
      return NextResponse.json(
        { error: "Godown code is required" },
        { status: 400 }
      );
    }

    if (!name) {
      return NextResponse.json(
        { error: "Godown name is required" },
        { status: 400 }
      );
    }

    // Check if code already exists
    const existingGodown = await prisma.godown.findFirst({
      where: {
        restaurantId: session.restaurantId,
        code: code.toUpperCase(),
      },
    });

    if (existingGodown) {
      return NextResponse.json(
        { error: "A godown with this code already exists" },
        { status: 400 }
      );
    }

    // If this is set as default, unset other defaults
    if (isDefault) {
      await prisma.godown.updateMany({
        where: {
          restaurantId: session.restaurantId,
          isDefault: true,
        },
        data: { isDefault: false },
      });
    }

    // Create godown
    const godown = await prisma.godown.create({
      data: {
        restaurantId: session.restaurantId,
        code: code.toUpperCase(),
        name,
        address,
        type: type || "MAIN",
        isDefault: isDefault || false,
        isActive: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Godown created successfully",
      godown,
    });
  } catch (error) {
    console.error("Error creating godown:", error);
    return NextResponse.json(
      { error: "Failed to create godown" },
      { status: 500 }
    );
  }
}
