import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// Roles that can manage godowns
const GODOWN_MANAGEMENT_ROLES = ["OWNER", "MANAGER", "ACCOUNTANT"];

// ═══════════════════════════════════════════════════════════════════════════════
// GET - Get godown details with stock levels
// ═══════════════════════════════════════════════════════════════════════════════

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

    const godown = await prisma.godown.findFirst({
      where: {
        id,
        restaurantId: session.restaurantId,
      },
      include: {
        godownStocks: {
          include: {
            stockItem: {
              select: {
                id: true,
                itemCode: true,
                name: true,
                nameLocal: true,
                baseUnit: true,
                averageCost: true,
                reorderLevel: true,
                type: true,
                category: {
                  select: { id: true, name: true },
                },
              },
            },
          },
          orderBy: {
            stockItem: { name: "asc" },
          },
        },
      },
    });

    if (!godown) {
      return NextResponse.json(
        { error: "Godown not found" },
        { status: 404 }
      );
    }

    // Calculate totals
    const totalItems = godown.godownStocks.length;
    const totalValue = godown.godownStocks.reduce((sum, stock) => {
      return sum + Number(stock.quantity) * Number(stock.stockItem.averageCost);
    }, 0);

    const lowStockItems = godown.godownStocks.filter((stock) => {
      const reorderLevel = stock.stockItem.reorderLevel;
      return reorderLevel !== null && Number(stock.quantity) <= Number(reorderLevel);
    }).length;

    return NextResponse.json({
      godown: {
        ...godown,
        stocks: godown.godownStocks.map((stock) => ({
          ...stock,
          stockValue: Number(stock.quantity) * Number(stock.stockItem.averageCost),
          isLowStock:
            stock.stockItem.reorderLevel !== null &&
            Number(stock.quantity) <= Number(stock.stockItem.reorderLevel),
        })),
      },
      stats: {
        totalItems,
        totalValue,
        lowStockItems,
      },
    });
  } catch (error) {
    console.error("Error fetching godown:", error);
    return NextResponse.json(
      { error: "Failed to fetch godown" },
      { status: 500 }
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// PATCH - Update godown
// ═══════════════════════════════════════════════════════════════════════════════

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!GODOWN_MANAGEMENT_ROLES.includes(session.role)) {
      return NextResponse.json(
        { error: "You do not have permission to update godowns" },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await request.json();

    // Check if godown exists
    const existingGodown = await prisma.godown.findFirst({
      where: {
        id,
        restaurantId: session.restaurantId,
      },
    });

    if (!existingGodown) {
      return NextResponse.json(
        { error: "Godown not found" },
        { status: 404 }
      );
    }

    const { name, address, type, isDefault, isActive } = body;

    // If setting as default, unset other defaults
    if (isDefault && !existingGodown.isDefault) {
      await prisma.godown.updateMany({
        where: {
          restaurantId: session.restaurantId,
          isDefault: true,
          id: { not: id },
        },
        data: { isDefault: false },
      });
    }

    // Update godown
    const godown = await prisma.godown.update({
      where: { id },
      data: {
        name,
        address,
        type,
        isDefault,
        isActive,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Godown updated successfully",
      godown,
    });
  } catch (error) {
    console.error("Error updating godown:", error);
    return NextResponse.json(
      { error: "Failed to update godown" },
      { status: 500 }
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// DELETE - Deactivate godown (soft delete)
// ═══════════════════════════════════════════════════════════════════════════════

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!GODOWN_MANAGEMENT_ROLES.includes(session.role)) {
      return NextResponse.json(
        { error: "You do not have permission to delete godowns" },
        { status: 403 }
      );
    }

    const { id } = await params;

    // Check if godown exists
    const existingGodown = await prisma.godown.findFirst({
      where: {
        id,
        restaurantId: session.restaurantId,
      },
      include: {
        _count: {
          select: { godownStocks: true },
        },
      },
    });

    if (!existingGodown) {
      return NextResponse.json(
        { error: "Godown not found" },
        { status: 404 }
      );
    }

    // Check if godown has stock
    if (existingGodown._count.godownStocks > 0) {
      // Check if any stock has quantity > 0
      const stockWithQuantity = await prisma.godownStock.findFirst({
        where: {
          godownId: id,
          quantity: { gt: 0 },
        },
      });

      if (stockWithQuantity) {
        return NextResponse.json(
          { error: "Cannot delete godown with existing stock. Transfer or adjust stock first." },
          { status: 400 }
        );
      }
    }

    // Check if it's the default godown
    if (existingGodown.isDefault) {
      return NextResponse.json(
        { error: "Cannot delete the default godown. Set another godown as default first." },
        { status: 400 }
      );
    }

    // Soft delete - mark as inactive
    await prisma.godown.update({
      where: { id },
      data: { isActive: false },
    });

    return NextResponse.json({
      success: true,
      message: "Godown deactivated successfully",
    });
  } catch (error) {
    console.error("Error deleting godown:", error);
    return NextResponse.json(
      { error: "Failed to delete godown" },
      { status: 500 }
    );
  }
}
