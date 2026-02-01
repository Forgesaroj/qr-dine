import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createStockMovementService } from "@/lib/services/stock/stock-movement.service";

// Roles that can manage stock adjustments
const STOCK_MANAGEMENT_ROLES = ["OWNER", "MANAGER", "ACCOUNTANT"];

// ═══════════════════════════════════════════════════════════════════════════════
// GET - List all stock adjustments
// ═══════════════════════════════════════════════════════════════════════════════

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const type = searchParams.get("type");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const limit = parseInt(searchParams.get("limit") || "20");
    const offset = parseInt(searchParams.get("offset") || "0");

    // Build where clause
    const where: Record<string, unknown> = {
      restaurantId: session.restaurantId,
    };

    if (status) {
      where.status = status;
    }

    if (type) {
      where.adjustmentType = type;
    }

    if (startDate || endDate) {
      where.adjustmentDate = {
        ...(startDate && { gte: new Date(startDate) }),
        ...(endDate && { lte: new Date(endDate) }),
      };
    }

    const [adjustments, total] = await Promise.all([
      prisma.stockAdjustment.findMany({
        where,
        include: {
          items: {
            include: {
              stockItem: {
                select: { itemCode: true, name: true, baseUnit: true },
              },
              godown: {
                select: { code: true, name: true },
              },
            },
          },
          _count: {
            select: { items: true },
          },
        },
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
      }),
      prisma.stockAdjustment.count({ where }),
    ]);

    return NextResponse.json({
      adjustments,
      pagination: {
        total,
        limit,
        offset,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching stock adjustments:", error);
    return NextResponse.json(
      { error: "Failed to fetch stock adjustments" },
      { status: 500 }
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// POST - Create a new stock adjustment
// ═══════════════════════════════════════════════════════════════════════════════

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!STOCK_MANAGEMENT_ROLES.includes(session.role)) {
      return NextResponse.json(
        { error: "You do not have permission to create stock adjustments" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { adjustmentType, reason, notes, items, godownId } = body;

    // Validate required fields
    if (!adjustmentType) {
      return NextResponse.json(
        { error: "Adjustment type is required" },
        { status: 400 }
      );
    }

    if (
      !["PHYSICAL_COUNT", "WASTAGE", "DAMAGE", "THEFT", "OTHER"].includes(
        adjustmentType
      )
    ) {
      return NextResponse.json(
        { error: "Invalid adjustment type" },
        { status: 400 }
      );
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "At least one item is required" },
        { status: 400 }
      );
    }

    // Validate items
    for (const item of items) {
      if (!item.stockItemId) {
        return NextResponse.json(
          { error: "Stock item ID is required for all items" },
          { status: 400 }
        );
      }
      if (item.adjustmentQuantity === undefined) {
        return NextResponse.json(
          { error: "Adjustment quantity is required for all items" },
          { status: 400 }
        );
      }
    }

    // Generate adjustment number
    const today = new Date();
    const fiscalYear =
      today.getMonth() >= 6 ? today.getFullYear() : today.getFullYear() - 1;

    const lastAdjustment = await prisma.stockAdjustment.findFirst({
      where: {
        restaurantId: session.restaurantId,
        adjustmentNumber: { startsWith: `ADJ-${fiscalYear}-` },
      },
      orderBy: { adjustmentNumber: "desc" },
      select: { adjustmentNumber: true },
    });

    let sequence = 1;
    if (lastAdjustment) {
      const match = lastAdjustment.adjustmentNumber.match(/ADJ-\d+-(\\d+)/);
      if (match && match[1]) {
        sequence = parseInt(match[1]) + 1;
      }
    }

    const adjustmentNumber = `ADJ-${fiscalYear}-${sequence
      .toString()
      .padStart(6, "0")}`;

    // Create adjustment with items in transaction
    const adjustment = await prisma.$transaction(async (tx) => {
      // Create adjustment record
      const adj = await tx.stockAdjustment.create({
        data: {
          restaurantId: session.restaurantId,
          adjustmentNumber,
          adjustmentType,
          adjustmentDate: new Date(),
          reason: reason || null,
          notes: notes || null,
          status: "DRAFT",
          createdById: session.id,
          createdByName: session.name || session.email,
        },
      });

      // Create adjustment items
      for (const item of items) {
        // Get current stock for the item
        const stockItem = await tx.stockItem.findUnique({
          where: { id: item.stockItemId },
          select: { currentStock: true, averageCost: true, baseUnit: true },
        });

        if (!stockItem) {
          throw new Error(`Stock item ${item.stockItemId} not found`);
        }

        // Get godown stock if godown specified
        let systemQuantity = Number(stockItem.currentStock);
        if (item.godownId || godownId) {
          const gStock = await tx.godownStock.findUnique({
            where: {
              godownId_stockItemId: {
                godownId: item.godownId || godownId,
                stockItemId: item.stockItemId,
              },
            },
          });
          systemQuantity = gStock ? Number(gStock.quantity) : 0;
        }

        // Calculate difference
        const physicalQuantity =
          adjustmentType === "PHYSICAL_COUNT"
            ? item.physicalQuantity || 0
            : systemQuantity + item.adjustmentQuantity;
        const difference = physicalQuantity - systemQuantity;

        await tx.stockAdjustmentItem.create({
          data: {
            adjustmentId: adj.id,
            stockItemId: item.stockItemId,
            godownId: item.godownId || godownId || null,
            systemQuantity,
            physicalQuantity,
            difference,
            reason: item.reason || null,
            unit: stockItem.baseUnit,
            rate: Number(stockItem.averageCost),
            amount: Math.abs(difference) * Number(stockItem.averageCost),
          },
        });
      }

      return adj;
    });

    // Fetch complete adjustment with items
    const completeAdjustment = await prisma.stockAdjustment.findUnique({
      where: { id: adjustment.id },
      include: {
        items: {
          include: {
            stockItem: {
              select: { itemCode: true, name: true, baseUnit: true },
            },
            godown: {
              select: { code: true, name: true },
            },
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: "Stock adjustment created successfully",
      adjustment: completeAdjustment,
    });
  } catch (error) {
    console.error("Error creating stock adjustment:", error);
    const message =
      error instanceof Error
        ? error.message
        : "Failed to create stock adjustment";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
