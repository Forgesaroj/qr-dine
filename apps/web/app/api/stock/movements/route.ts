import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { createStockMovementService } from "@/lib/services/stock/stock-movement.service";

// Roles that can manage stock movements
const STOCK_MANAGEMENT_ROLES = ["OWNER", "MANAGER", "ACCOUNTANT"];

// ═══════════════════════════════════════════════════════════════════════════════
// GET - List stock movements
// ═══════════════════════════════════════════════════════════════════════════════

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const stockItemId = searchParams.get("stockItemId");
    const godownId = searchParams.get("godownId");
    const movementType = searchParams.get("movementType");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const referenceType = searchParams.get("referenceType");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = (page - 1) * limit;

    // Build where clause
    const where: Record<string, unknown> = {
      restaurantId: session.restaurantId,
    };

    if (stockItemId) {
      where.stockItemId = stockItemId;
    }

    if (godownId) {
      where.OR = [{ fromGodownId: godownId }, { toGodownId: godownId }];
    }

    if (movementType) {
      where.movementType = movementType;
    }

    if (referenceType) {
      where.referenceType = referenceType;
    }

    if (startDate || endDate) {
      where.movementDate = {
        ...(startDate && { gte: new Date(startDate) }),
        ...(endDate && { lte: new Date(endDate) }),
      };
    }

    // Fetch movements
    const [movements, total] = await Promise.all([
      prisma.stockMovement.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
        include: {
          stockItem: {
            select: {
              id: true,
              itemCode: true,
              name: true,
              baseUnit: true,
            },
          },
          fromGodown: {
            select: { id: true, code: true, name: true },
          },
          toGodown: {
            select: { id: true, code: true, name: true },
          },
        },
      }),
      prisma.stockMovement.count({ where }),
    ]);

    // Calculate summary
    const summary = await prisma.stockMovement.groupBy({
      by: ["movementType"],
      where: {
        restaurantId: session.restaurantId,
        ...(startDate && { movementDate: { gte: new Date(startDate) } }),
        ...(endDate && { movementDate: { lte: new Date(endDate) } }),
      },
      _sum: {
        quantity: true,
        totalAmount: true,
      },
      _count: true,
    });

    return NextResponse.json({
      movements,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      summary,
    });
  } catch (error) {
    console.error("Error fetching movements:", error);
    return NextResponse.json(
      { error: "Failed to fetch movements" },
      { status: 500 }
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// POST - Create manual stock movement (adjustment)
// ═══════════════════════════════════════════════════════════════════════════════

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!STOCK_MANAGEMENT_ROLES.includes(session.role)) {
      return NextResponse.json(
        { error: "You do not have permission to create stock movements" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      stockItemId,
      movementType,
      quantity,
      rate,
      fromGodownId,
      toGodownId,
      batchNumber,
      referenceType,
      referenceId,
      notes,
    } = body;

    // Validate required fields
    if (!stockItemId) {
      return NextResponse.json(
        { error: "Stock item is required" },
        { status: 400 }
      );
    }

    if (!movementType) {
      return NextResponse.json(
        { error: "Movement type is required" },
        { status: 400 }
      );
    }

    if (!quantity || quantity <= 0) {
      return NextResponse.json(
        { error: "Valid quantity is required" },
        { status: 400 }
      );
    }

    // Validate movement type specific requirements
    const inwardTypes = [
      "PURCHASE_IN",
      "TRANSFER_IN",
      "ADJUSTMENT_IN",
      "PRODUCTION_IN",
      "RETURN_IN",
    ];
    const outwardTypes = [
      "SALES_OUT",
      "TRANSFER_OUT",
      "ADJUSTMENT_OUT",
      "PRODUCTION_OUT",
      "RETURN_OUT",
      "EXPIRED",
    ];

    if (inwardTypes.includes(movementType) && !toGodownId) {
      return NextResponse.json(
        { error: "Destination godown is required for inward movements" },
        { status: 400 }
      );
    }

    if (outwardTypes.includes(movementType) && !fromGodownId) {
      return NextResponse.json(
        { error: "Source godown is required for outward movements" },
        { status: 400 }
      );
    }

    // Create movement using service
    const movementService = createStockMovementService(session.restaurantId);

    const movement = await movementService.createMovement({
      stockItemId,
      movementType,
      quantity,
      rate: rate || 0,
      fromGodownId,
      toGodownId,
      batchNumber,
      referenceType: referenceType || "manual",
      referenceId,
      notes,
      createdById: session.id,
      createdByName: session.name || session.email,
    });

    return NextResponse.json({
      success: true,
      message: "Stock movement created successfully",
      movement,
    });
  } catch (error) {
    console.error("Error creating movement:", error);
    const message =
      error instanceof Error ? error.message : "Failed to create movement";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
