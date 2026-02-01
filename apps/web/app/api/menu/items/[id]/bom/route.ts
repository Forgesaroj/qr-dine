import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// Roles that can manage BOM
const BOM_MANAGEMENT_ROLES = ["OWNER", "MANAGER", "ACCOUNTANT"];

// ═══════════════════════════════════════════════════════════════════════════════
// GET - Get BOM entries for a menu item
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

    const { id: menuItemId } = await params;

    // Verify menu item belongs to restaurant
    const menuItem = await prisma.menuItem.findFirst({
      where: {
        id: menuItemId,
        restaurantId: session.restaurantId,
      },
      select: {
        id: true,
        name: true,
      },
    });

    if (!menuItem) {
      return NextResponse.json({ error: "Menu item not found" }, { status: 404 });
    }

    // Get all BOM entries for this menu item
    const bomEntries = await prisma.stockMenuItemMapping.findMany({
      where: { menuItemId },
      include: {
        stockItem: {
          select: {
            id: true,
            itemCode: true,
            name: true,
            baseUnit: true,
            currentStock: true,
            averageCost: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    // Calculate total cost per serving
    const totalCost = bomEntries.reduce((sum, entry) => {
      const cost = Number(entry.quantity) * Number(entry.stockItem.averageCost);
      return sum + cost;
    }, 0);

    return NextResponse.json({
      menuItem,
      bomEntries: bomEntries.map((entry) => ({
        id: entry.id,
        stockItemId: entry.stockItemId,
        stockItem: entry.stockItem,
        quantity: Number(entry.quantity),
        unit: entry.unit,
        cost: Number(entry.quantity) * Number(entry.stockItem.averageCost),
      })),
      totalCost,
    });
  } catch (error) {
    console.error("Error fetching BOM entries:", error);
    return NextResponse.json(
      { error: "Failed to fetch BOM entries" },
      { status: 500 }
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// POST - Add a new BOM entry
// ═══════════════════════════════════════════════════════════════════════════════

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!BOM_MANAGEMENT_ROLES.includes(session.role)) {
      return NextResponse.json(
        { error: "You do not have permission to manage BOM" },
        { status: 403 }
      );
    }

    const { id: menuItemId } = await params;
    const body = await request.json();
    const { stockItemId, quantity, unit } = body;

    // Validate required fields
    if (!stockItemId) {
      return NextResponse.json(
        { error: "Stock item is required" },
        { status: 400 }
      );
    }

    if (!quantity || quantity <= 0) {
      return NextResponse.json(
        { error: "Valid quantity is required" },
        { status: 400 }
      );
    }

    // Verify menu item belongs to restaurant
    const menuItem = await prisma.menuItem.findFirst({
      where: {
        id: menuItemId,
        restaurantId: session.restaurantId,
      },
    });

    if (!menuItem) {
      return NextResponse.json({ error: "Menu item not found" }, { status: 404 });
    }

    // Verify stock item belongs to restaurant
    const stockItem = await prisma.stockItem.findFirst({
      where: {
        id: stockItemId,
        restaurantId: session.restaurantId,
      },
    });

    if (!stockItem) {
      return NextResponse.json({ error: "Stock item not found" }, { status: 404 });
    }

    // Check if mapping already exists
    const existingMapping = await prisma.stockMenuItemMapping.findFirst({
      where: {
        menuItemId,
        stockItemId,
      },
    });

    if (existingMapping) {
      return NextResponse.json(
        { error: "This stock item is already in the BOM. Update the existing entry instead." },
        { status: 400 }
      );
    }

    // Create BOM entry
    const bomEntry = await prisma.stockMenuItemMapping.create({
      data: {
        menuItemId,
        stockItemId,
        quantity,
        unit: unit || stockItem.baseUnit,
      },
      include: {
        stockItem: {
          select: {
            id: true,
            itemCode: true,
            name: true,
            baseUnit: true,
            currentStock: true,
            averageCost: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: "BOM entry added successfully",
      bomEntry: {
        id: bomEntry.id,
        stockItemId: bomEntry.stockItemId,
        stockItem: bomEntry.stockItem,
        quantity: Number(bomEntry.quantity),
        unit: bomEntry.unit,
        cost: Number(bomEntry.quantity) * Number(bomEntry.stockItem.averageCost),
      },
    });
  } catch (error) {
    console.error("Error adding BOM entry:", error);
    return NextResponse.json(
      { error: "Failed to add BOM entry" },
      { status: 500 }
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// PUT - Update all BOM entries (replace entire BOM)
// ═══════════════════════════════════════════════════════════════════════════════

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!BOM_MANAGEMENT_ROLES.includes(session.role)) {
      return NextResponse.json(
        { error: "You do not have permission to manage BOM" },
        { status: 403 }
      );
    }

    const { id: menuItemId } = await params;
    const body = await request.json();
    const { entries } = body;

    // Validate entries array
    if (!Array.isArray(entries)) {
      return NextResponse.json(
        { error: "Entries must be an array" },
        { status: 400 }
      );
    }

    // Verify menu item belongs to restaurant
    const menuItem = await prisma.menuItem.findFirst({
      where: {
        id: menuItemId,
        restaurantId: session.restaurantId,
      },
    });

    if (!menuItem) {
      return NextResponse.json({ error: "Menu item not found" }, { status: 404 });
    }

    // Validate all stock items belong to restaurant
    const stockItemIds = entries.map((e: { stockItemId: string }) => e.stockItemId);
    const stockItems = await prisma.stockItem.findMany({
      where: {
        id: { in: stockItemIds },
        restaurantId: session.restaurantId,
      },
    });

    if (stockItems.length !== stockItemIds.length) {
      return NextResponse.json(
        { error: "One or more stock items not found" },
        { status: 404 }
      );
    }

    // Use transaction to replace all entries
    await prisma.$transaction(async (tx) => {
      // Delete existing entries
      await tx.stockMenuItemMapping.deleteMany({
        where: { menuItemId },
      });

      // Create new entries
      if (entries.length > 0) {
        await tx.stockMenuItemMapping.createMany({
          data: entries.map((entry: { stockItemId: string; quantity: number; unit?: string }) => {
            const stockItem = stockItems.find((s) => s.id === entry.stockItemId);
            return {
              menuItemId,
              stockItemId: entry.stockItemId,
              quantity: entry.quantity,
              unit: entry.unit || stockItem?.baseUnit || "pcs",
            };
          }),
        });
      }
    });

    // Fetch updated entries
    const updatedEntries = await prisma.stockMenuItemMapping.findMany({
      where: { menuItemId },
      include: {
        stockItem: {
          select: {
            id: true,
            itemCode: true,
            name: true,
            baseUnit: true,
            currentStock: true,
            averageCost: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    const totalCost = updatedEntries.reduce((sum, entry) => {
      const cost = Number(entry.quantity) * Number(entry.stockItem.averageCost);
      return sum + cost;
    }, 0);

    return NextResponse.json({
      success: true,
      message: "BOM updated successfully",
      bomEntries: updatedEntries.map((entry) => ({
        id: entry.id,
        stockItemId: entry.stockItemId,
        stockItem: entry.stockItem,
        quantity: Number(entry.quantity),
        unit: entry.unit,
        cost: Number(entry.quantity) * Number(entry.stockItem.averageCost),
      })),
      totalCost,
    });
  } catch (error) {
    console.error("Error updating BOM:", error);
    return NextResponse.json(
      { error: "Failed to update BOM" },
      { status: 500 }
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// DELETE - Delete a specific BOM entry
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

    if (!BOM_MANAGEMENT_ROLES.includes(session.role)) {
      return NextResponse.json(
        { error: "You do not have permission to manage BOM" },
        { status: 403 }
      );
    }

    const { id: menuItemId } = await params;
    const { searchParams } = new URL(request.url);
    const entryId = searchParams.get("entryId");
    const stockItemId = searchParams.get("stockItemId");

    // Verify menu item belongs to restaurant
    const menuItem = await prisma.menuItem.findFirst({
      where: {
        id: menuItemId,
        restaurantId: session.restaurantId,
      },
    });

    if (!menuItem) {
      return NextResponse.json({ error: "Menu item not found" }, { status: 404 });
    }

    if (entryId) {
      // Delete by entry ID
      await prisma.stockMenuItemMapping.delete({
        where: { id: entryId },
      });
    } else if (stockItemId) {
      // Delete by stock item ID
      await prisma.stockMenuItemMapping.deleteMany({
        where: {
          menuItemId,
          stockItemId,
        },
      });
    } else {
      return NextResponse.json(
        { error: "Either entryId or stockItemId is required" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "BOM entry deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting BOM entry:", error);
    return NextResponse.json(
      { error: "Failed to delete BOM entry" },
      { status: 500 }
    );
  }
}
