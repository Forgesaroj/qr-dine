import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Roles that can view batches
const STOCK_VIEW_ROLES = ["OWNER", "MANAGER", "ACCOUNTANT"];

// ═══════════════════════════════════════════════════════════════════════════════
// GET - List all stock batches with filters
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
    const expiringDays = searchParams.get("expiringDays"); // Batches expiring within N days
    const expired = searchParams.get("expired") === "true";
    const available = searchParams.get("available") === "true";
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    // Build where clause
    const where: Record<string, unknown> = {
      stockItem: {
        restaurantId: session.restaurantId,
      },
    };

    if (stockItemId) {
      where.stockItemId = stockItemId;
    }

    if (godownId) {
      where.godownId = godownId;
    }

    if (available) {
      where.quantity = { gt: 0 };
      where.isConsumed = false;
    }

    if (expired) {
      where.expiryDate = {
        lt: new Date(),
      };
    } else if (expiringDays) {
      const days = parseInt(expiringDays);
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + days);
      where.expiryDate = {
        gte: new Date(),
        lte: futureDate,
      };
    }

    const [batches, total] = await Promise.all([
      prisma.stockBatch.findMany({
        where,
        include: {
          stockItem: {
            select: {
              itemCode: true,
              name: true,
              baseUnit: true,
              trackExpiry: true,
            },
          },
          godown: {
            select: { code: true, name: true },
          },
        },
        orderBy: [{ expiryDate: "asc" }, { createdAt: "asc" }],
        take: limit,
        skip: offset,
      }),
      prisma.stockBatch.count({ where }),
    ]);

    // Calculate stats
    const now = new Date();
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    const stats = {
      totalBatches: total,
      expiredCount: batches.filter(
        (b) => b.expiryDate && new Date(b.expiryDate) < now
      ).length,
      expiringIn7Days: batches.filter(
        (b) =>
          b.expiryDate &&
          new Date(b.expiryDate) >= now &&
          new Date(b.expiryDate) <= sevenDaysFromNow
      ).length,
      expiringIn30Days: batches.filter(
        (b) =>
          b.expiryDate &&
          new Date(b.expiryDate) >= now &&
          new Date(b.expiryDate) <= thirtyDaysFromNow
      ).length,
    };

    // Add expiry status to each batch
    const batchesWithStatus = batches.map((batch) => {
      let expiryStatus = "OK";
      if (batch.expiryDate) {
        const expiryDate = new Date(batch.expiryDate);
        if (expiryDate < now) {
          expiryStatus = "EXPIRED";
        } else if (expiryDate <= sevenDaysFromNow) {
          expiryStatus = "EXPIRING_SOON";
        } else if (expiryDate <= thirtyDaysFromNow) {
          expiryStatus = "EXPIRING";
        }
      }
      return { ...batch, expiryStatus };
    });

    return NextResponse.json({
      batches: batchesWithStatus,
      stats,
      pagination: {
        total,
        limit,
        offset,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching stock batches:", error);
    return NextResponse.json(
      { error: "Failed to fetch stock batches" },
      { status: 500 }
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// POST - Create a new batch (usually done via purchase receipt)
// ═══════════════════════════════════════════════════════════════════════════════

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!STOCK_VIEW_ROLES.includes(session.role)) {
      return NextResponse.json(
        { error: "You do not have permission to create batches" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      stockItemId,
      godownId,
      batchNumber,
      expiryDate,
      quantity,
      costPerUnit,
      purchaseId,
    } = body;

    // Validate required fields
    if (!stockItemId) {
      return NextResponse.json(
        { error: "Stock item is required" },
        { status: 400 }
      );
    }

    if (!batchNumber) {
      return NextResponse.json(
        { error: "Batch number is required" },
        { status: 400 }
      );
    }

    if (!quantity || quantity <= 0) {
      return NextResponse.json(
        { error: "Valid quantity is required" },
        { status: 400 }
      );
    }

    // Verify stock item exists and belongs to restaurant
    const stockItem = await prisma.stockItem.findFirst({
      where: {
        id: stockItemId,
        restaurantId: session.restaurantId,
      },
    });

    if (!stockItem) {
      return NextResponse.json(
        { error: "Stock item not found" },
        { status: 404 }
      );
    }

    // Check if batch number already exists for this item
    const existingBatch = await prisma.stockBatch.findFirst({
      where: {
        stockItemId,
        batchNumber,
      },
    });

    if (existingBatch) {
      return NextResponse.json(
        { error: "Batch number already exists for this item" },
        { status: 400 }
      );
    }

    // Create batch
    const batch = await prisma.stockBatch.create({
      data: {
        stockItemId,
        godownId: godownId || null,
        batchNumber,
        expiryDate: expiryDate ? new Date(expiryDate) : null,
        quantity,
        costPerUnit: costPerUnit || stockItem.averageCost,
        purchaseId: purchaseId || null,
      },
      include: {
        stockItem: {
          select: { itemCode: true, name: true, baseUnit: true },
        },
        godown: {
          select: { code: true, name: true },
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: "Batch created successfully",
      batch,
    });
  } catch (error) {
    console.error("Error creating stock batch:", error);
    return NextResponse.json(
      { error: "Failed to create stock batch" },
      { status: 500 }
    );
  }
}
