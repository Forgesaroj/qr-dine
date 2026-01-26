// ═══════════════════════════════════════════════════════════════════════════════
// ORDER TYPES
// ═══════════════════════════════════════════════════════════════════════════════

import {
  OrderType,
  OrderSource,
  OrderStatus,
  OrderItemStatus,
  BillStatus,
  PaymentStatus,
  PaymentMethod,
} from "./enums";
import { SelectedVariant, SelectedAddon } from "./menu";

export interface Order {
  id: string;
  restaurantId: string;
  orderNumber: string;
  sessionId?: string;
  tableId?: string;
  customerId?: string;

  // Type
  orderType: OrderType;
  orderSource: OrderSource;

  // Status
  status: OrderStatus;
  requiresConfirmation: boolean;

  // Confirmation
  confirmedAt?: Date;
  confirmedBy?: string;
  rejectedAt?: Date;
  rejectedBy?: string;
  rejectionReason?: string;

  // Amounts
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  serviceCharge: number;
  totalAmount: number;

  // Promotion
  promoCode?: string;
  promotionId?: string;
  pointsEarned: number;
  pointsRedeemed: number;

  // Notes
  specialInstructions?: string;

  // Timestamps
  placedAt: Date;
  preparingAt?: Date;
  readyAt?: Date;
  servedAt?: Date;
  completedAt?: Date;
  cancelledAt?: Date;

  // Staff
  placedBy?: string;
  servedBy?: string;

  // Relations
  items: OrderItem[];

  createdAt: Date;
  updatedAt: Date;
}

export interface OrderItem {
  id: string;
  orderId: string;
  menuItemId: string;
  menuItemName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;

  // Customization
  selectedVariants: SelectedVariant[];
  selectedAddons: SelectedAddon[];

  // Status
  status: OrderItemStatus;
  kitchenStation?: string;

  // Timestamps
  sentToKitchenAt?: Date;
  preparingAt?: Date;
  readyAt?: Date;
  servedAt?: Date;

  // Notes
  specialRequests?: string;

  createdAt: Date;
  updatedAt: Date;
}

export interface Bill {
  id: string;
  restaurantId: string;
  billNumber: string;
  orderId: string;
  sessionId?: string;
  customerId?: string;

  // Amounts
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  serviceCharge: number;
  totalAmount: number;

  // Payment
  paymentStatus: PaymentStatus;
  paymentMethod?: PaymentMethod;

  // Loyalty
  pointsEarned: number;
  pointsRedeemed: number;
  pointsDiscount: number;

  // Status
  status: BillStatus;
  generatedBy?: string;
  settledBy?: string;

  // Timestamps
  generatedAt: Date;
  settledAt?: Date;

  // Relations
  payments: Payment[];

  createdAt: Date;
  updatedAt: Date;
}

export interface Payment {
  id: string;
  billId: string;
  amount: number;
  method: PaymentMethod;
  transactionId?: string;
  reference?: string;
  cashReceived?: number;
  changeGiven?: number;
  status: PaymentStatus;
  processedBy?: string;
  processedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Order rejection reasons
export const ORDER_REJECTION_REASONS = [
  "Item unavailable",
  "Kitchen closed",
  "Invalid order",
  "Table not found",
  "Session expired",
  "Other",
] as const;

export type OrderRejectionReason = (typeof ORDER_REJECTION_REASONS)[number];
