import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createStockMovementService } from "@/lib/services/stock/stock-movement.service";

// Roles that can manage stock adjustments
const STOCK_MANAGEMENT_ROLES = ["OWNER", "MANAGER", "ACCOUNTANT"];
const APPROVAL_ROLES = ["OWNER", "MANAGER"];

// ═══════════════════════════════════════════════════════════════════════════════
// GET - Get a single stock adjustment with details
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

    const adjustment = await prisma.stockAdjustment.findFirst({
      where: {
        id,
        restaurantId: session.restaurantId,
      },
      include: {
        items: {
          include: {
            stockItem: {
              select: {
                itemCode: true,
                name: true,
                baseUnit: true,
                currentStock: true,
              },
            },
            godown: {
              select: { code: true, name: true },
            },
          },
        },
      },
    });

    if (!adjustment) {
      return NextResponse.json(
        { error: "Adjustment not found" },
        { status: 404 }
      );
    }

    // Calculate summary
    const summary = {
      totalItems: adjustment.items.length,
      totalIncrease: adjustment.items
        .filter((i) => Number(i.difference) > 0)
        .reduce((sum, i) => sum + Number(i.difference), 0),
      totalDecrease: adjustment.items
        .filter((i) => Number(i.difference) < 0)
        .reduce((sum, i) => sum + Math.abs(Number(i.difference)), 0),
      totalValue: adjustment.items.reduce(
        (sum, i) => sum + Number(i.amount),
        0
      ),
    };

    return NextResponse.json({
      adjustment,
      summary,
    });
  } catch (error) {
    console.error("Error fetching stock adjustment:", error);
    return NextResponse.json(
      { error: "Failed to fetch stock adjustment" },
      { status: 500 }
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// PATCH - Update/Approve/Reject stock adjustment
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

    const { id } = await params;
    const body = await request.json();
    const { action, notes } = body;

    // Check if adjustment exists
    const adjustment = await prisma.stockAdjustment.findFirst({
      where: {
        id,
        restaurantId: session.restaurantId,
      },
      include: {
        items: {
          include: {
            stockItem: {
              select: { id: true, name: true, baseUnit: true, averageCost: true },
            },
          },
        },
      },
    });

    if (!adjustment) {
      return NextResponse.json(
        { error: "Adjustment not found" },
        { status: 404 }
      );
    }

    // Handle different actions
    if (action === "approve") {
      if (!APPROVAL_ROLES.includes(session.role)) {
        return NextResponse.json(
          { error: "You do not have permission to approve adjustments" },
          { status: 403 }
        );
      }

      if (adjustment.status !== "DRAFT" && adjustment.status !== "PENDING") {
        return NextResponse.json(
          { error: "Only draft or pending adjustments can be approved" },
          { status: 400 }
        );
      }

      // Apply the adjustment in a transaction
      await prisma.$transaction(async (tx) => {
        const movementService = createStockMovementService(session.restaurantId);

        // Process each adjustment item
        for (const item of adjustment.items) {
          const difference = Number(item.difference);

          if (difference !== 0) {
            // Create stock movement for the adjustment
            const movementType =
              difference > 0 ? "ADJUSTMENT_IN" : "ADJUSTMENT_OUT";

            await movementService.createMovement({
              stockItemId: item.stockItemId,
              movementType,
              quantity: Math.abs(difference),
              rate: Number(item.rate),
              fromGodownId:
                difference < 0 ? item.godownId || undefined : undefined,
              toGodownId:
                difference > 0 ? item.godownId || undefined : undefined,
              referenceType: "adjustment",
              referenceId: adjustment.id,
              notes: `${adjustment.adjustmentType}: ${item.reason || adjustment.reason || "Stock adjustment"}`,
              createdById: session.id,
              createdByName: session.name || session.email,
            });
          }
        }

        // Update adjustment status
        await tx.stockAdjustment.update({
          where: { id },
          data: {
            status: "APPROVED",
            approvedById: session.id,
            approvedByName: session.name || session.email,
            approvedAt: new Date(),
            notes: notes || adjustment.notes,
          },
        });
      });

      return NextResponse.json({
        success: true,
        message: "Adjustment approved and stock updated",
      });
    }

    if (action === "reject") {
      if (!APPROVAL_ROLES.includes(session.role)) {
        return NextResponse.json(
          { error: "You do not have permission to reject adjustments" },
          { status: 403 }
        );
      }

      if (adjustment.status !== "DRAFT" && adjustment.status !== "PENDING") {
        return NextResponse.json(
          { error: "Only draft or pending adjustments can be rejected" },
          { status: 400 }
        );
      }

      await prisma.stockAdjustment.update({
        where: { id },
        data: {
          status: "REJECTED",
          approvedById: session.id,
          approvedByName: session.name || session.email,
          approvedAt: new Date(),
          notes: notes || adjustment.notes,
        },
      });

      return NextResponse.json({
        success: true,
        message: "Adjustment rejected",
      });
    }

    if (action === "submit") {
      if (!STOCK_MANAGEMENT_ROLES.includes(session.role)) {
        return NextResponse.json(
          { error: "You do not have permission to submit adjustments" },
          { status: 403 }
        );
      }

      if (adjustment.status !== "DRAFT") {
        return NextResponse.json(
          { error: "Only draft adjustments can be submitted" },
          { status: 400 }
        );
      }

      await prisma.stockAdjustment.update({
        where: { id },
        data: {
          status: "PENDING",
          notes: notes || adjustment.notes,
        },
      });

      return NextResponse.json({
        success: true,
        message: "Adjustment submitted for approval",
      });
    }

    // Regular update (only for draft)
    if (!STOCK_MANAGEMENT_ROLES.includes(session.role)) {
      return NextResponse.json(
        { error: "You do not have permission to update adjustments" },
        { status: 403 }
      );
    }

    if (adjustment.status !== "DRAFT") {
      return NextResponse.json(
        { error: "Only draft adjustments can be updated" },
        { status: 400 }
      );
    }

    const { reason, adjustmentType } = body;

    const updatedAdjustment = await prisma.stockAdjustment.update({
      where: { id },
      data: {
        ...(reason !== undefined && { reason }),
        ...(notes !== undefined && { notes }),
        ...(adjustmentType !== undefined && { adjustmentType }),
      },
    });

    return NextResponse.json({
      success: true,
      message: "Adjustment updated",
      adjustment: updatedAdjustment,
    });
  } catch (error) {
    console.error("Error updating stock adjustment:", error);
    const message =
      error instanceof Error
        ? error.message
        : "Failed to update stock adjustment";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// DELETE - Delete a stock adjustment (only drafts)
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
        { error: "You do not have permission to delete adjustments" },
        { status: 403 }
      );
    }

    const { id } = await params;

    const adjustment = await prisma.stockAdjustment.findFirst({
      where: {
        id,
        restaurantId: session.restaurantId,
      },
    });

    if (!adjustment) {
      return NextResponse.json(
        { error: "Adjustment not found" },
        { status: 404 }
      );
    }

    if (adjustment.status !== "DRAFT") {
      return NextResponse.json(
        { error: "Only draft adjustments can be deleted" },
        { status: 400 }
      );
    }

    // Delete items first, then adjustment
    await prisma.$transaction([
      prisma.stockAdjustmentItem.deleteMany({
        where: { adjustmentId: id },
      }),
      prisma.stockAdjustment.delete({
        where: { id },
      }),
    ]);

    return NextResponse.json({
      success: true,
      message: "Adjustment deleted",
    });
  } catch (error) {
    console.error("Error deleting stock adjustment:", error);
    return NextResponse.json(
      { error: "Failed to delete stock adjustment" },
      { status: 500 }
    );
  }
}
