import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// ═══════════════════════════════════════════════════════════════════════════════
// GET - Get all items that need reordering (low stock alerts)
// ═══════════════════════════════════════════════════════════════════════════════

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const categoryId = searchParams.get("categoryId");
    const godownId = searchParams.get("godownId");
    const severity = searchParams.get("severity"); // critical, warning, all
    const includeOverstock = searchParams.get("includeOverstock") === "true";

    // Get all stock items with their current levels
    const stockItems = await prisma.stockItem.findMany({
      where: {
        restaurantId: session.restaurantId,
        isActive: true,
        ...(categoryId && { categoryId }),
      },
      include: {
        category: {
          select: { code: true, name: true },
        },
        godownStocks: {
          include: {
            godown: {
              select: { id: true, code: true, name: true },
            },
          },
        },
      },
      orderBy: { name: "asc" },
    });

    // Calculate alerts
    const alerts: Array<{
      stockItem: {
        id: string;
        itemCode: string;
        name: string;
        baseUnit: string;
        currentStock: number;
        reorderLevel: number | null;
        maxStockLevel: number | null;
        averageCost: number;
        category: { code: string; name: string } | null;
      };
      severity: "CRITICAL" | "WARNING" | "OVERSTOCK";
      currentStock: number;
      reorderLevel: number;
      shortfall: number;
      estimatedCost: number;
      godownBreakdown: Array<{
        godown: { id: string; code: string; name: string };
        quantity: number;
      }>;
    }> = [];

    for (const item of stockItems) {
      const currentStock = Number(item.currentStock);
      const reorderLevel = Number(item.reorderLevel || 0);
      const maxStockLevel = Number(item.maxStockLevel || 0);
      const averageCost = Number(item.averageCost);

      // Godown breakdown
      const godownBreakdown = item.godownStocks.map((gs) => ({
        godown: gs.godown,
        quantity: Number(gs.quantity),
      }));

      // Check for low stock
      if (reorderLevel > 0 && currentStock <= reorderLevel) {
        const severity = currentStock <= reorderLevel * 0.5 ? "CRITICAL" : "WARNING";
        const shortfall = reorderLevel - currentStock;

        // Filter by severity if specified
        if (
          !searchParams.get("severity") ||
          searchParams.get("severity") === "all" ||
          searchParams.get("severity") === severity.toLowerCase()
        ) {
          alerts.push({
            stockItem: {
              id: item.id,
              itemCode: item.itemCode,
              name: item.name,
              baseUnit: item.baseUnit,
              currentStock,
              reorderLevel,
              maxStockLevel: maxStockLevel || null,
              averageCost,
              category: item.category,
            },
            severity,
            currentStock,
            reorderLevel,
            shortfall,
            estimatedCost: shortfall * averageCost,
            godownBreakdown,
          });
        }
      }

      // Check for overstock
      if (includeOverstock && maxStockLevel > 0 && currentStock > maxStockLevel) {
        alerts.push({
          stockItem: {
            id: item.id,
            itemCode: item.itemCode,
            name: item.name,
            baseUnit: item.baseUnit,
            currentStock,
            reorderLevel: reorderLevel || null,
            maxStockLevel,
            averageCost,
            category: item.category,
          },
          severity: "OVERSTOCK",
          currentStock,
          reorderLevel: maxStockLevel,
          shortfall: currentStock - maxStockLevel, // Excess stock
          estimatedCost: (currentStock - maxStockLevel) * averageCost,
          godownBreakdown,
        });
      }
    }

    // Sort by severity and shortfall
    alerts.sort((a, b) => {
      const severityOrder = { CRITICAL: 0, WARNING: 1, OVERSTOCK: 2 };
      if (severityOrder[a.severity] !== severityOrder[b.severity]) {
        return severityOrder[a.severity] - severityOrder[b.severity];
      }
      return b.shortfall - a.shortfall;
    });

    // Calculate summary
    const summary = {
      totalAlerts: alerts.length,
      criticalCount: alerts.filter((a) => a.severity === "CRITICAL").length,
      warningCount: alerts.filter((a) => a.severity === "WARNING").length,
      overstockCount: alerts.filter((a) => a.severity === "OVERSTOCK").length,
      estimatedReorderCost: alerts
        .filter((a) => a.severity !== "OVERSTOCK")
        .reduce((sum, a) => sum + a.estimatedCost, 0),
    };

    return NextResponse.json({
      alerts,
      summary,
    });
  } catch (error) {
    console.error("Error fetching reorder alerts:", error);
    return NextResponse.json(
      { error: "Failed to fetch reorder alerts" },
      { status: 500 }
    );
  }
}
