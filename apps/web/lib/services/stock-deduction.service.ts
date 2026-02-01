import { prisma } from "@/lib/prisma";
import { Decimal } from "@prisma/client/runtime/library";

interface StockDeductionResult {
  success: boolean;
  deductedItems: {
    stockItemId: string;
    stockItemName: string;
    quantity: number;
    unit: string;
    balanceAfter: number;
  }[];
  errors: string[];
  movementIds: string[];
}

/**
 * Deducts stock based on BOM (Bill of Materials) when an order item is served
 * @param restaurantId - The restaurant ID
 * @param menuItemId - The menu item ID being served
 * @param quantity - Number of servings (default 1)
 * @param referenceId - Order item ID for reference
 * @param userId - User who performed the action
 * @param userName - Name of user for audit trail
 */
export async function deductStockForMenuItem(
  restaurantId: string,
  menuItemId: string,
  quantity: number = 1,
  referenceId: string,
  userId: string,
  userName: string
): Promise<StockDeductionResult> {
  const result: StockDeductionResult = {
    success: true,
    deductedItems: [],
    errors: [],
    movementIds: [],
  };

  try {
    // Get BOM entries for this menu item
    const bomEntries = await prisma.stockMenuItemMapping.findMany({
      where: { menuItemId },
      include: {
        stockItem: {
          select: {
            id: true,
            name: true,
            baseUnit: true,
            currentStock: true,
            averageCost: true,
          },
        },
      },
    });

    // No BOM configured - skip deduction
    if (bomEntries.length === 0) {
      return result;
    }

    // Get default godown
    const defaultGodown = await prisma.godown.findFirst({
      where: {
        restaurantId,
        isDefault: true,
        isActive: true,
      },
    });

    if (!defaultGodown) {
      result.errors.push("No default godown configured");
      result.success = false;
      return result;
    }

    // Process each BOM entry
    for (const entry of bomEntries) {
      const deductQuantity = Number(entry.quantity) * quantity;
      const currentStock = Number(entry.stockItem.currentStock);

      // Check if sufficient stock
      if (currentStock < deductQuantity) {
        result.errors.push(
          `Insufficient stock for ${entry.stockItem.name}: Required ${deductQuantity} ${entry.unit}, Available ${currentStock}`
        );
        // Continue with deduction even if insufficient (log the error but don't block)
      }

      const newBalance = Math.max(0, currentStock - deductQuantity);

      // Generate movement number
      const today = new Date();
      const fiscalYear =
        today.getMonth() >= 6 ? today.getFullYear() : today.getFullYear() - 1;
      const movementNumber = `SM-${fiscalYear}-${Date.now().toString().slice(-8)}`;

      try {
        // Create stock movement
        const movement = await prisma.stockMovement.create({
          data: {
            restaurantId,
            stockItemId: entry.stockItem.id,
            movementNumber,
            movementType: "SALES_OUT",
            movementDate: new Date(),
            fromGodownId: defaultGodown.id,
            quantity: new Decimal(deductQuantity),
            unit: entry.unit,
            rate: entry.stockItem.averageCost,
            totalAmount: new Decimal(deductQuantity).mul(
              entry.stockItem.averageCost
            ),
            balanceAfter: new Decimal(newBalance),
            referenceType: "order_item",
            referenceId,
            notes: `Auto-deducted for order item (Qty: ${quantity})`,
            createdById: userId,
            createdByName: userName,
          },
        });

        result.movementIds.push(movement.id);

        // Update stock item current stock
        await prisma.stockItem.update({
          where: { id: entry.stockItem.id },
          data: {
            currentStock: new Decimal(newBalance),
          },
        });

        // Update godown stock
        await prisma.godownStock.upsert({
          where: {
            godownId_stockItemId: {
              godownId: defaultGodown.id,
              stockItemId: entry.stockItem.id,
            },
          },
          update: {
            quantity: {
              decrement: new Decimal(deductQuantity),
            },
          },
          create: {
            godownId: defaultGodown.id,
            stockItemId: entry.stockItem.id,
            quantity: new Decimal(0),
            averageCost: entry.stockItem.averageCost,
          },
        });

        result.deductedItems.push({
          stockItemId: entry.stockItem.id,
          stockItemName: entry.stockItem.name,
          quantity: deductQuantity,
          unit: entry.unit,
          balanceAfter: newBalance,
        });
      } catch (error) {
        console.error(
          `Error deducting stock for ${entry.stockItem.name}:`,
          error
        );
        result.errors.push(
          `Failed to deduct ${entry.stockItem.name}: ${error instanceof Error ? error.message : "Unknown error"}`
        );
      }
    }

    // If there were any errors, mark as partial success
    if (result.errors.length > 0) {
      result.success = result.deductedItems.length > 0;
    }

    return result;
  } catch (error) {
    console.error("Error in stock deduction:", error);
    result.success = false;
    result.errors.push(
      `Stock deduction failed: ${error instanceof Error ? error.message : "Unknown error"}`
    );
    return result;
  }
}

/**
 * Deducts stock for multiple order items (bulk serve)
 * @param restaurantId - The restaurant ID
 * @param orderItems - Array of order items with menuItemId and quantity
 * @param userId - User who performed the action
 * @param userName - Name of user for audit trail
 */
export async function deductStockForOrderItems(
  restaurantId: string,
  orderItems: Array<{ id: string; menuItemId: string; quantity: number }>,
  userId: string,
  userName: string
): Promise<{
  totalDeducted: number;
  results: Map<string, StockDeductionResult>;
}> {
  const results = new Map<string, StockDeductionResult>();
  let totalDeducted = 0;

  for (const item of orderItems) {
    const result = await deductStockForMenuItem(
      restaurantId,
      item.menuItemId,
      item.quantity,
      item.id,
      userId,
      userName
    );

    results.set(item.id, result);
    totalDeducted += result.deductedItems.length;
  }

  return { totalDeducted, results };
}

/**
 * Reverses stock deduction (e.g., when order is cancelled)
 * @param referenceId - The order item ID that was originally deducted
 * @param userId - User who performed the action
 * @param userName - Name of user for audit trail
 */
export async function reverseStockDeduction(
  referenceId: string,
  userId: string,
  userName: string
): Promise<{ success: boolean; reversedCount: number; errors: string[] }> {
  const result = {
    success: true,
    reversedCount: 0,
    errors: [] as string[],
  };

  try {
    // Find all movements for this order item
    const movements = await prisma.stockMovement.findMany({
      where: {
        referenceId,
        referenceType: "order_item",
        movementType: "SALES_OUT",
      },
      include: {
        stockItem: true,
      },
    });

    if (movements.length === 0) {
      return result;
    }

    for (const movement of movements) {
      try {
        // Generate reversal movement number
        const today = new Date();
        const fiscalYear =
          today.getMonth() >= 6 ? today.getFullYear() : today.getFullYear() - 1;
        const movementNumber = `SM-${fiscalYear}-${Date.now().toString().slice(-8)}`;

        const currentStock = Number(movement.stockItem.currentStock);
        const quantityToRestore = Number(movement.quantity);
        const newBalance = currentStock + quantityToRestore;

        // Create reversal movement
        await prisma.stockMovement.create({
          data: {
            restaurantId: movement.restaurantId,
            stockItemId: movement.stockItemId,
            movementNumber,
            movementType: "ADJUSTMENT_IN",
            movementDate: new Date(),
            toGodownId: movement.fromGodownId,
            quantity: movement.quantity,
            unit: movement.unit,
            rate: movement.rate,
            totalAmount: movement.totalAmount,
            balanceAfter: new Decimal(newBalance),
            referenceType: "order_cancellation",
            referenceId,
            notes: `Reversed stock deduction (Original: ${movement.movementNumber})`,
            createdById: userId,
            createdByName: userName,
          },
        });

        // Update stock item
        await prisma.stockItem.update({
          where: { id: movement.stockItemId },
          data: {
            currentStock: new Decimal(newBalance),
          },
        });

        // Update godown stock
        if (movement.fromGodownId) {
          await prisma.godownStock.update({
            where: {
              godownId_stockItemId: {
                godownId: movement.fromGodownId,
                stockItemId: movement.stockItemId,
              },
            },
            data: {
              quantity: {
                increment: movement.quantity,
              },
            },
          });
        }

        result.reversedCount++;
      } catch (error) {
        console.error(
          `Error reversing stock for movement ${movement.id}:`,
          error
        );
        result.errors.push(
          `Failed to reverse ${movement.stockItem.name}: ${error instanceof Error ? error.message : "Unknown error"}`
        );
      }
    }

    if (result.errors.length > 0) {
      result.success = result.reversedCount > 0;
    }

    return result;
  } catch (error) {
    console.error("Error reversing stock deduction:", error);
    result.success = false;
    result.errors.push(
      `Stock reversal failed: ${error instanceof Error ? error.message : "Unknown error"}`
    );
    return result;
  }
}
