import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// Roles that can manage stock items
const STOCK_MANAGEMENT_ROLES = ["OWNER", "MANAGER", "ACCOUNTANT"];

// ═══════════════════════════════════════════════════════════════════════════════
// GET - Get stock item details
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

    const stockItem = await prisma.stockItem.findFirst({
      where: {
        id,
        restaurantId: session.restaurantId,
      },
      include: {
        category: {
          select: { id: true, name: true },
        },
        godownStocks: {
          include: {
            godown: {
              select: { id: true, code: true, name: true },
            },
          },
        },
        menuItemMappings: {
          select: {
            id: true,
            menuItemId: true,
            quantity: true,
            unit: true,
          },
        },
        batches: {
          where: { isConsumed: false },
          orderBy: { expiryDate: "asc" },
          take: 10,
        },
        movements: {
          orderBy: { createdAt: "desc" },
          take: 10,
          select: {
            id: true,
            movementNumber: true,
            movementType: true,
            movementDate: true,
            quantity: true,
            unit: true,
            rate: true,
            totalAmount: true,
            balanceAfter: true,
            referenceType: true,
            createdByName: true,
            createdAt: true,
          },
        },
      },
    });

    if (!stockItem) {
      return NextResponse.json(
        { error: "Stock item not found" },
        { status: 404 }
      );
    }

    // Calculate stock value
    const stockValue = Number(stockItem.currentStock) * Number(stockItem.averageCost);

    // Check if low stock
    const isLowStock =
      stockItem.reorderLevel !== null &&
      Number(stockItem.currentStock) <= Number(stockItem.reorderLevel);

    return NextResponse.json({
      stockItem: {
        ...stockItem,
        stockValue,
        isLowStock,
      },
    });
  } catch (error) {
    console.error("Error fetching stock item:", error);
    return NextResponse.json(
      { error: "Failed to fetch stock item" },
      { status: 500 }
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// PATCH - Update stock item
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

    if (!STOCK_MANAGEMENT_ROLES.includes(session.role)) {
      return NextResponse.json(
        { error: "You do not have permission to update stock items" },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await request.json();

    // Check if stock item exists
    const existingItem = await prisma.stockItem.findFirst({
      where: {
        id,
        restaurantId: session.restaurantId,
      },
    });

    if (!existingItem) {
      return NextResponse.json(
        { error: "Stock item not found" },
        { status: 404 }
      );
    }

    // Fields that can be updated
    const {
      name,
      nameLocal,
      description,
      type,
      categoryId,
      baseUnit,
      purchaseUnit,
      conversionFactor,
      valuationMethod,
      standardCost,
      reorderLevel,
      minimumStock,
      maximumStock,
      trackBatch,
      trackExpiry,
      defaultExpiryDays,
      hsnCode,
      vatRate,
      isVatable,
      isActive,
    } = body;

    // Update stock item
    const stockItem = await prisma.stockItem.update({
      where: { id },
      data: {
        name,
        nameLocal,
        description,
        type,
        categoryId,
        baseUnit,
        purchaseUnit,
        conversionFactor,
        valuationMethod,
        standardCost,
        reorderLevel,
        minimumStock,
        maximumStock,
        trackBatch,
        trackExpiry,
        defaultExpiryDays,
        hsnCode,
        vatRate,
        isVatable,
        isActive,
      },
      include: {
        category: {
          select: { id: true, name: true },
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: "Stock item updated successfully",
      stockItem,
    });
  } catch (error) {
    console.error("Error updating stock item:", error);
    return NextResponse.json(
      { error: "Failed to update stock item" },
      { status: 500 }
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// DELETE - Deactivate stock item (soft delete)
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

    if (!STOCK_MANAGEMENT_ROLES.includes(session.role)) {
      return NextResponse.json(
        { error: "You do not have permission to delete stock items" },
        { status: 403 }
      );
    }

    const { id } = await params;

    // Check if stock item exists
    const existingItem = await prisma.stockItem.findFirst({
      where: {
        id,
        restaurantId: session.restaurantId,
      },
    });

    if (!existingItem) {
      return NextResponse.json(
        { error: "Stock item not found" },
        { status: 404 }
      );
    }

    // Check if item has stock
    if (Number(existingItem.currentStock) > 0) {
      return NextResponse.json(
        { error: "Cannot delete stock item with existing stock. Adjust stock to zero first." },
        { status: 400 }
      );
    }

    // Soft delete - mark as inactive
    await prisma.stockItem.update({
      where: { id },
      data: { isActive: false },
    });

    return NextResponse.json({
      success: true,
      message: "Stock item deactivated successfully",
    });
  } catch (error) {
    console.error("Error deleting stock item:", error);
    return NextResponse.json(
      { error: "Failed to delete stock item" },
      { status: 500 }
    );
  }
}
