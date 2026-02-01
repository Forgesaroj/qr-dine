import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// Roles that can manage stock items
const STOCK_MANAGEMENT_ROLES = ["OWNER", "MANAGER", "ACCOUNTANT"];

// ═══════════════════════════════════════════════════════════════════════════════
// GET - List all stock items
// ═══════════════════════════════════════════════════════════════════════════════

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");
    const categoryId = searchParams.get("categoryId");
    const type = searchParams.get("type");
    const lowStock = searchParams.get("lowStock") === "true";
    const isActive = searchParams.get("isActive");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const offset = (page - 1) * limit;

    // Build where clause
    const where: Record<string, unknown> = {
      restaurantId: session.restaurantId,
    };

    if (isActive !== null && isActive !== undefined) {
      where.isActive = isActive === "true";
    }

    if (categoryId) {
      where.categoryId = categoryId;
    }

    if (type) {
      where.type = type;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { itemCode: { contains: search, mode: "insensitive" } },
        { nameLocal: { contains: search, mode: "insensitive" } },
      ];
    }

    // Low stock filter - items below reorder level
    if (lowStock) {
      where.AND = [
        { reorderLevel: { not: null } },
        {
          currentStock: {
            lte: prisma.stockItem.fields.reorderLevel,
          },
        },
      ];
    }

    // Fetch stock items
    const [stockItems, total] = await Promise.all([
      prisma.stockItem.findMany({
        where,
        orderBy: { name: "asc" },
        take: limit,
        skip: offset,
        include: {
          category: {
            select: { id: true, name: true },
          },
          _count: {
            select: { movements: true, menuItemMappings: true },
          },
        },
      }),
      prisma.stockItem.count({ where }),
    ]);

    // Calculate low stock count
    const lowStockCount = await prisma.stockItem.count({
      where: {
        restaurantId: session.restaurantId,
        isActive: true,
        reorderLevel: { not: null },
        currentStock: { lte: prisma.stockItem.fields.reorderLevel },
      },
    });

    return NextResponse.json({
      stockItems: stockItems.map((item) => ({
        ...item,
        movementCount: item._count.movements,
        menuItemCount: item._count.menuItemMappings,
        isLowStock:
          item.reorderLevel !== null &&
          Number(item.currentStock) <= Number(item.reorderLevel),
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      stats: {
        lowStockCount,
      },
    });
  } catch (error) {
    console.error("Error fetching stock items:", error);
    return NextResponse.json(
      { error: "Failed to fetch stock items" },
      { status: 500 }
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// POST - Create new stock item
// ═══════════════════════════════════════════════════════════════════════════════

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!STOCK_MANAGEMENT_ROLES.includes(session.role)) {
      return NextResponse.json(
        { error: "You do not have permission to create stock items" },
        { status: 403 }
      );
    }

    const body = await request.json();
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
      openingStock,
      openingRate,
    } = body;

    // Validate required fields
    if (!name) {
      return NextResponse.json(
        { error: "Stock item name is required" },
        { status: 400 }
      );
    }

    if (!baseUnit) {
      return NextResponse.json(
        { error: "Base unit is required" },
        { status: 400 }
      );
    }

    // Generate item code
    const lastItem = await prisma.stockItem.findFirst({
      where: { restaurantId: session.restaurantId },
      orderBy: { itemCode: "desc" },
      select: { itemCode: true },
    });

    let itemNumber = 1;
    if (lastItem) {
      const match = lastItem.itemCode.match(/SI-(\d+)/);
      if (match && match[1]) {
        itemNumber = parseInt(match[1]) + 1;
      }
    }
    const itemCode = `SI-${itemNumber.toString().padStart(4, "0")}`;

    // Calculate opening values
    const currentStock = openingStock || 0;
    const averageCost = openingRate || 0;

    // Create stock item
    const stockItem = await prisma.stockItem.create({
      data: {
        restaurantId: session.restaurantId,
        itemCode,
        name,
        nameLocal,
        description,
        type: type || "RAW_MATERIAL",
        categoryId,
        baseUnit,
        purchaseUnit,
        conversionFactor: conversionFactor || 1,
        valuationMethod: valuationMethod || "WEIGHTED_AVERAGE",
        standardCost,
        averageCost,
        currentStock,
        reorderLevel,
        minimumStock,
        maximumStock,
        trackBatch: trackBatch || false,
        trackExpiry: trackExpiry || false,
        defaultExpiryDays,
        hsnCode,
        vatRate: vatRate || 13,
        isVatable: isVatable !== false,
        isActive: true,
      },
      include: {
        category: {
          select: { id: true, name: true },
        },
      },
    });

    // If opening stock provided, create an opening stock movement
    if (openingStock && openingStock > 0) {
      // Get or create default godown
      let defaultGodown = await prisma.godown.findFirst({
        where: {
          restaurantId: session.restaurantId,
          isDefault: true,
        },
      });

      if (!defaultGodown) {
        defaultGodown = await prisma.godown.create({
          data: {
            restaurantId: session.restaurantId,
            code: "MAIN",
            name: "Main Store",
            type: "MAIN",
            isDefault: true,
            isActive: true,
          },
        });
      }

      // Generate movement number
      const today = new Date();
      const fiscalYear = today.getMonth() >= 3 ? today.getFullYear() : today.getFullYear() - 1;
      const movementNumber = `SM-${fiscalYear}-${Date.now().toString().slice(-6)}`;

      // Create opening stock movement
      await prisma.stockMovement.create({
        data: {
          restaurantId: session.restaurantId,
          stockItemId: stockItem.id,
          movementNumber,
          movementType: "ADJUSTMENT_IN",
          movementDate: new Date(),
          toGodownId: defaultGodown.id,
          quantity: openingStock,
          unit: baseUnit,
          rate: openingRate || 0,
          totalAmount: openingStock * (openingRate || 0),
          balanceAfter: openingStock,
          referenceType: "opening_balance",
          notes: "Opening stock balance",
          createdById: session.id,
          createdByName: session.name || session.email,
        },
      });

      // Create godown stock entry
      await prisma.godownStock.upsert({
        where: {
          godownId_stockItemId: {
            godownId: defaultGodown.id,
            stockItemId: stockItem.id,
          },
        },
        update: {
          quantity: openingStock,
          averageCost: openingRate || 0,
        },
        create: {
          godownId: defaultGodown.id,
          stockItemId: stockItem.id,
          quantity: openingStock,
          averageCost: openingRate || 0,
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: "Stock item created successfully",
      stockItem,
    });
  } catch (error) {
    console.error("Error creating stock item:", error);
    return NextResponse.json(
      { error: "Failed to create stock item" },
      { status: 500 }
    );
  }
}
