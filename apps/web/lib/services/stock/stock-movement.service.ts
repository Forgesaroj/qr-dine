import { prisma } from "@/lib/prisma";
import { Decimal } from "@prisma/client/runtime/library";

// Types
export type MovementType =
  | "PURCHASE_IN"
  | "SALES_OUT"
  | "TRANSFER_IN"
  | "TRANSFER_OUT"
  | "ADJUSTMENT_IN"
  | "ADJUSTMENT_OUT"
  | "PRODUCTION_IN"
  | "PRODUCTION_OUT"
  | "RETURN_IN"
  | "RETURN_OUT"
  | "EXPIRED";

export interface CreateMovementInput {
  stockItemId: string;
  movementType: MovementType;
  quantity: number;
  rate: number;
  fromGodownId?: string;
  toGodownId?: string;
  batchNumber?: string;
  referenceType?: string;
  referenceId?: string;
  notes?: string;
  createdById: string;
  createdByName: string;
}

export interface TransferStockInput {
  stockItemId: string;
  fromGodownId: string;
  toGodownId: string;
  quantity: number;
  notes?: string;
  createdById: string;
  createdByName: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Stock Movement Service
// ═══════════════════════════════════════════════════════════════════════════════

export class StockMovementService {
  private restaurantId: string;

  constructor(restaurantId: string) {
    this.restaurantId = restaurantId;
  }

  // Generate unique movement number
  private async generateMovementNumber(): Promise<string> {
    const today = new Date();
    const fiscalYear =
      today.getMonth() >= 6 ? today.getFullYear() : today.getFullYear() - 1;

    const lastMovement = await prisma.stockMovement.findFirst({
      where: {
        restaurantId: this.restaurantId,
        movementNumber: { startsWith: `SM-${fiscalYear}-` },
      },
      orderBy: { movementNumber: "desc" },
      select: { movementNumber: true },
    });

    let sequence = 1;
    if (lastMovement) {
      const match = lastMovement.movementNumber.match(/SM-\d+-(\d+)/);
      if (match && match[1]) {
        sequence = parseInt(match[1]) + 1;
      }
    }

    return `SM-${fiscalYear}-${sequence.toString().padStart(6, "0")}`;
  }

  // Get current stock balance for an item
  async getCurrentBalance(stockItemId: string): Promise<number> {
    const item = await prisma.stockItem.findUnique({
      where: { id: stockItemId },
      select: { currentStock: true },
    });
    return item ? Number(item.currentStock) : 0;
  }

  // Calculate Weighted Average Cost
  async calculateWeightedAverageCost(
    stockItemId: string,
    newQuantity: number,
    newRate: number
  ): Promise<number> {
    const item = await prisma.stockItem.findUnique({
      where: { id: stockItemId },
      select: { currentStock: true, averageCost: true },
    });

    if (!item) return newRate;

    const currentStock = Number(item.currentStock);
    const currentCost = Number(item.averageCost);

    if (currentStock <= 0) return newRate;

    const totalValue = currentStock * currentCost + newQuantity * newRate;
    const totalQuantity = currentStock + newQuantity;

    return totalQuantity > 0 ? totalValue / totalQuantity : newRate;
  }

  // Calculate FIFO Cost for consumption
  async calculateFIFOCost(
    stockItemId: string,
    quantity: number
  ): Promise<{ totalCost: number; batchesUsed: { batchId: string; qty: number; rate: number }[] }> {
    // Get available batches ordered by creation date (oldest first)
    const batches = await prisma.stockBatch.findMany({
      where: {
        stockItemId,
        isConsumed: false,
        quantity: { gt: 0 },
      },
      orderBy: { createdAt: "asc" },
    });

    let remainingQty = quantity;
    let totalCost = 0;
    const batchesUsed: { batchId: string; qty: number; rate: number }[] = [];

    for (const batch of batches) {
      if (remainingQty <= 0) break;

      const batchQty = Number(batch.quantity);
      const useQty = Math.min(remainingQty, batchQty);
      const rate = Number(batch.costPerUnit);

      totalCost += useQty * rate;
      batchesUsed.push({ batchId: batch.id, qty: useQty, rate });
      remainingQty -= useQty;
    }

    // If no batches, use average cost
    if (batchesUsed.length === 0) {
      const item = await prisma.stockItem.findUnique({
        where: { id: stockItemId },
        select: { averageCost: true },
      });
      totalCost = quantity * Number(item?.averageCost || 0);
    }

    return { totalCost, batchesUsed };
  }

  // Create stock movement
  async createMovement(input: CreateMovementInput) {
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
      createdById,
      createdByName,
    } = input;

    // Get stock item details
    const stockItem = await prisma.stockItem.findFirst({
      where: { id: stockItemId, restaurantId: this.restaurantId },
    });

    if (!stockItem) {
      throw new Error("Stock item not found");
    }

    // Determine if this is an inward or outward movement
    const isInward = [
      "PURCHASE_IN",
      "TRANSFER_IN",
      "ADJUSTMENT_IN",
      "PRODUCTION_IN",
      "RETURN_IN",
    ].includes(movementType);

    // Calculate new balance
    const currentBalance = Number(stockItem.currentStock);
    const newBalance = isInward
      ? currentBalance + quantity
      : currentBalance - quantity;

    if (newBalance < 0) {
      throw new Error(
        `Insufficient stock. Available: ${currentBalance}, Required: ${quantity}`
      );
    }

    // Calculate rate for outward movements using valuation method
    let effectiveRate = rate;
    if (!isInward && stockItem.valuationMethod === "FIFO") {
      const fifoResult = await this.calculateFIFOCost(stockItemId, quantity);
      effectiveRate = quantity > 0 ? fifoResult.totalCost / quantity : 0;
    } else if (!isInward) {
      effectiveRate = Number(stockItem.averageCost);
    }

    // Generate movement number
    const movementNumber = await this.generateMovementNumber();

    // Create movement in transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create movement record
      const movement = await tx.stockMovement.create({
        data: {
          restaurantId: this.restaurantId,
          stockItemId,
          movementNumber,
          movementType,
          movementDate: new Date(),
          fromGodownId,
          toGodownId,
          quantity,
          unit: stockItem.baseUnit,
          rate: effectiveRate,
          totalAmount: quantity * effectiveRate,
          balanceAfter: newBalance,
          batchNumber,
          referenceType,
          referenceId,
          notes,
          createdById,
          createdByName,
        },
      });

      // Update stock item balance
      const updateData: Record<string, unknown> = {
        currentStock: newBalance,
      };

      // Update average cost for inward movements
      if (isInward && stockItem.valuationMethod === "WEIGHTED_AVERAGE") {
        const newAvgCost = await this.calculateWeightedAverageCost(
          stockItemId,
          quantity,
          rate
        );
        updateData.averageCost = newAvgCost;
      }

      // Update last purchase rate for purchases
      if (movementType === "PURCHASE_IN") {
        updateData.lastPurchaseRate = rate;
      }

      await tx.stockItem.update({
        where: { id: stockItemId },
        data: updateData,
      });

      // Update godown stock if godown specified
      if (toGodownId && isInward) {
        await tx.godownStock.upsert({
          where: {
            godownId_stockItemId: {
              godownId: toGodownId,
              stockItemId,
            },
          },
          update: {
            quantity: { increment: quantity },
          },
          create: {
            godownId: toGodownId,
            stockItemId,
            quantity,
            averageCost: effectiveRate,
          },
        });
      }

      if (fromGodownId && !isInward) {
        await tx.godownStock.update({
          where: {
            godownId_stockItemId: {
              godownId: fromGodownId,
              stockItemId,
            },
          },
          data: {
            quantity: { decrement: quantity },
          },
        });
      }

      return movement;
    });

    return result;
  }

  // Transfer stock between godowns
  async transferStock(input: TransferStockInput) {
    const {
      stockItemId,
      fromGodownId,
      toGodownId,
      quantity,
      notes,
      createdById,
      createdByName,
    } = input;

    if (fromGodownId === toGodownId) {
      throw new Error("Source and destination godown cannot be the same");
    }

    // Check source godown has sufficient stock
    const sourceStock = await prisma.godownStock.findUnique({
      where: {
        godownId_stockItemId: {
          godownId: fromGodownId,
          stockItemId,
        },
      },
    });

    if (!sourceStock || Number(sourceStock.quantity) < quantity) {
      throw new Error(
        `Insufficient stock in source godown. Available: ${sourceStock?.quantity || 0}`
      );
    }

    const stockItem = await prisma.stockItem.findUnique({
      where: { id: stockItemId },
      select: { averageCost: true, baseUnit: true },
    });

    const rate = Number(stockItem?.averageCost || 0);

    // Create transfer movements
    const result = await prisma.$transaction(async (tx) => {
      const movementNumber = await this.generateMovementNumber();

      // Create TRANSFER_OUT movement
      const outMovement = await tx.stockMovement.create({
        data: {
          restaurantId: this.restaurantId,
          stockItemId,
          movementNumber,
          movementType: "TRANSFER_OUT",
          movementDate: new Date(),
          fromGodownId,
          toGodownId,
          quantity,
          unit: stockItem?.baseUnit || "pcs",
          rate,
          totalAmount: quantity * rate,
          balanceAfter: 0, // Will update after
          referenceType: "transfer",
          notes,
          createdById,
          createdByName,
        },
      });

      // Create TRANSFER_IN movement
      const inMovementNumber = await this.generateMovementNumber();
      const inMovement = await tx.stockMovement.create({
        data: {
          restaurantId: this.restaurantId,
          stockItemId,
          movementNumber: inMovementNumber,
          movementType: "TRANSFER_IN",
          movementDate: new Date(),
          fromGodownId,
          toGodownId,
          quantity,
          unit: stockItem?.baseUnit || "pcs",
          rate,
          totalAmount: quantity * rate,
          balanceAfter: 0, // Stock item balance doesn't change for transfers
          referenceType: "transfer",
          referenceId: outMovement.id,
          notes,
          createdById,
          createdByName,
        },
      });

      // Update godown stocks
      await tx.godownStock.update({
        where: {
          godownId_stockItemId: {
            godownId: fromGodownId,
            stockItemId,
          },
        },
        data: {
          quantity: { decrement: quantity },
        },
      });

      await tx.godownStock.upsert({
        where: {
          godownId_stockItemId: {
            godownId: toGodownId,
            stockItemId,
          },
        },
        update: {
          quantity: { increment: quantity },
        },
        create: {
          godownId: toGodownId,
          stockItemId,
          quantity,
          averageCost: rate,
        },
      });

      return { outMovement, inMovement };
    });

    return result;
  }

  // Get movement history for a stock item
  async getMovementHistory(
    stockItemId: string,
    options?: {
      startDate?: Date;
      endDate?: Date;
      movementType?: MovementType;
      limit?: number;
      offset?: number;
    }
  ) {
    const where: Record<string, unknown> = {
      restaurantId: this.restaurantId,
      stockItemId,
    };

    if (options?.startDate || options?.endDate) {
      where.movementDate = {
        ...(options.startDate && { gte: options.startDate }),
        ...(options.endDate && { lte: options.endDate }),
      };
    }

    if (options?.movementType) {
      where.movementType = options.movementType;
    }

    const [movements, total] = await Promise.all([
      prisma.stockMovement.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: options?.limit || 50,
        skip: options?.offset || 0,
        include: {
          stockItem: {
            select: { itemCode: true, name: true },
          },
          fromGodown: {
            select: { code: true, name: true },
          },
          toGodown: {
            select: { code: true, name: true },
          },
        },
      }),
      prisma.stockMovement.count({ where }),
    ]);

    return { movements, total };
  }

  // Record purchase receipt (called from purchase module)
  async recordPurchaseReceipt(
    purchaseId: string,
    items: Array<{
      stockItemId: string;
      quantity: number;
      rate: number;
      godownId: string;
      batchNumber?: string;
      expiryDate?: Date;
    }>,
    userId: string,
    userName: string
  ) {
    const results = [];

    for (const item of items) {
      // Create batch if tracking enabled
      const stockItem = await prisma.stockItem.findUnique({
        where: { id: item.stockItemId },
        select: { trackBatch: true, trackExpiry: true },
      });

      if (stockItem?.trackBatch && item.batchNumber) {
        await prisma.stockBatch.create({
          data: {
            stockItemId: item.stockItemId,
            godownId: item.godownId,
            batchNumber: item.batchNumber,
            expiryDate: item.expiryDate,
            quantity: item.quantity,
            costPerUnit: item.rate,
            purchaseId,
          },
        });
      }

      // Create movement
      const movement = await this.createMovement({
        stockItemId: item.stockItemId,
        movementType: "PURCHASE_IN",
        quantity: item.quantity,
        rate: item.rate,
        toGodownId: item.godownId,
        batchNumber: item.batchNumber,
        referenceType: "purchase",
        referenceId: purchaseId,
        createdById: userId,
        createdByName: userName,
      });

      results.push(movement);
    }

    return results;
  }

  // Deduct stock for sales (called from order service)
  async deductStockForSale(
    orderId: string,
    menuItemId: string,
    quantity: number,
    godownId: string,
    userId: string,
    userName: string
  ) {
    // Get stock mappings for menu item
    const mappings = await prisma.stockMenuItemMapping.findMany({
      where: { menuItemId },
      include: {
        stockItem: {
          select: { id: true, name: true, currentStock: true },
        },
      },
    });

    const results = [];

    for (const mapping of mappings) {
      const deductQty = Number(mapping.quantity) * quantity;

      try {
        const movement = await this.createMovement({
          stockItemId: mapping.stockItemId,
          movementType: "SALES_OUT",
          quantity: deductQty,
          rate: 0, // Will be calculated based on valuation method
          fromGodownId: godownId,
          referenceType: "order",
          referenceId: orderId,
          createdById: userId,
          createdByName: userName,
        });
        results.push(movement);
      } catch (error) {
        console.error(
          `Failed to deduct stock for ${mapping.stockItem.name}:`,
          error
        );
        // Continue with other items, don't fail the whole order
      }
    }

    return results;
  }
}

// Factory function
export function createStockMovementService(
  restaurantId: string
): StockMovementService {
  return new StockMovementService(restaurantId);
}
