import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { createStockMovementService } from "@/lib/services/stock/stock-movement.service";

// Roles that can transfer stock
const STOCK_MANAGEMENT_ROLES = ["OWNER", "MANAGER", "ACCOUNTANT"];

// ═══════════════════════════════════════════════════════════════════════════════
// POST - Transfer stock between godowns
// ═══════════════════════════════════════════════════════════════════════════════

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!STOCK_MANAGEMENT_ROLES.includes(session.role)) {
      return NextResponse.json(
        { error: "You do not have permission to transfer stock" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { stockItemId, fromGodownId, toGodownId, quantity, notes } = body;

    // Validate required fields
    if (!stockItemId) {
      return NextResponse.json(
        { error: "Stock item is required" },
        { status: 400 }
      );
    }

    if (!fromGodownId) {
      return NextResponse.json(
        { error: "Source godown is required" },
        { status: 400 }
      );
    }

    if (!toGodownId) {
      return NextResponse.json(
        { error: "Destination godown is required" },
        { status: 400 }
      );
    }

    if (!quantity || quantity <= 0) {
      return NextResponse.json(
        { error: "Valid quantity is required" },
        { status: 400 }
      );
    }

    if (fromGodownId === toGodownId) {
      return NextResponse.json(
        { error: "Source and destination godown cannot be the same" },
        { status: 400 }
      );
    }

    // Transfer using service
    const movementService = createStockMovementService(session.restaurantId);

    const result = await movementService.transferStock({
      stockItemId,
      fromGodownId,
      toGodownId,
      quantity,
      notes,
      createdById: session.id,
      createdByName: session.name || session.email,
    });

    return NextResponse.json({
      success: true,
      message: "Stock transferred successfully",
      movements: result,
    });
  } catch (error) {
    console.error("Error transferring stock:", error);
    const message =
      error instanceof Error ? error.message : "Failed to transfer stock";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
