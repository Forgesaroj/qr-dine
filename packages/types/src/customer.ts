// ═══════════════════════════════════════════════════════════════════════════════
// CUSTOMER TYPES
// ═══════════════════════════════════════════════════════════════════════════════

import {
  CustomerTier,
  CustomerStatus,
  PointsTransactionType,
  PromotionType,
  DiscountType,
  PromotionStatus,
} from "./enums";

export interface Customer {
  id: string;
  restaurantId: string;
  customerId: string; // Display ID (e.g., "CUST-0001")
  name: string;
  phone: string;
  email?: string;
  dateOfBirth?: Date;

  // Verification
  phoneVerified: boolean;
  mpinHash?: string;
  mpinAttempts: number;
  mpinLockedUntil?: Date;
  verificationMethod?: "SMS" | "STAFF";
  verifiedAt?: Date;
  verifiedBy?: string;

  // Loyalty
  tier: CustomerTier;
  pointsBalance: number;
  pointsEarnedLifetime: number;
  pointsRedeemedLifetime: number;

  // Spending (HIDDEN from Waiter/Cashier)
  totalSpent: number;
  totalVisits: number;
  averageOrderValue: number;

  // Preferences
  favoriteItems?: string[];
  dietaryPreferences?: string[];
  allergies?: string[];

  // Marketing
  smsOptIn: boolean;
  emailOptIn: boolean;

  status: CustomerStatus;
  createdAt: Date;
  updatedAt: Date;
}

// Customer data visible to different roles
export interface CustomerBasicInfo {
  id: string;
  customerId: string;
  name: string;
  phone: string;
  tier: CustomerTier;
  pointsBalance: number;
}

export interface CustomerFullInfo extends CustomerBasicInfo {
  email?: string;
  dateOfBirth?: Date;
  phoneVerified: boolean;
  totalSpent: number;
  totalVisits: number;
  averageOrderValue: number;
  pointsEarnedLifetime: number;
  pointsRedeemedLifetime: number;
  favoriteItems?: string[];
  dietaryPreferences?: string[];
  allergies?: string[];
  status: CustomerStatus;
  createdAt: Date;
}

export interface CustomerNote {
  id: string;
  customerId: string;
  note: string;
  addedBy: string;
  addedByName: string;
  createdAt: Date;
}

export interface PointsTransaction {
  id: string;
  customerId: string;
  type: PointsTransactionType;
  points: number;
  balanceAfter: number;

  // For EARN
  orderId?: string;
  orderAmount?: number;
  multiplier?: number;

  // For REDEEM
  billId?: string;
  discountAmount?: number;

  // For BONUS/ADJUST
  bonusType?: string;
  reason?: string;
  adjustedBy?: string;

  // Expiry
  expiresAt?: Date;
  expired: boolean;

  createdAt: Date;
}

export interface Promotion {
  id: string;
  restaurantId: string;
  name: string;
  description?: string;
  internalNote?: string;

  // Type
  type: PromotionType;
  discountType: DiscountType;
  discountValue: number;
  maxDiscount?: number;

  // Applies to
  appliesTo: "ALL" | "CATEGORIES" | "ITEMS";
  categoryIds?: string[];
  itemIds?: string[];

  // Combo specific
  comboItems?: ComboItem[];
  comboPrice?: number;

  // BOGO specific
  bogoBuyQuantity?: number;
  bogoGetQuantity?: number;
  bogoGetDiscount?: number;
  bogoSameItem?: boolean;
  bogoGetItems?: string[];

  // Promo code
  promoCode?: string;

  // Min order
  minOrderTiers?: MinOrderTier[];
  minOrderAmount?: number;

  // Schedule
  startDate?: Date;
  endDate?: Date;
  daysOfWeek?: number[];
  startTime?: string;
  endTime?: string;

  // Limits
  totalUsesLimit?: number;
  totalUsesCount: number;
  perCustomerLimit?: number;

  // Eligibility
  customerEligibility: "ALL" | "NEW" | "RETURNING" | "TIERS";
  eligibleTiers?: CustomerTier[];

  // Display
  showOnMenu: boolean;
  showCountdown: boolean;
  bannerMessage?: string;
  bannerImageUrl?: string;

  // Status
  status: PromotionStatus;
  timesUsed: number;
  totalDiscountGiven: number;

  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ComboItem {
  menuItemId: string;
  quantity: number;
  name?: string;
}

export interface MinOrderTier {
  minAmount: number;
  discountType: DiscountType;
  discountValue: number;
}

// Tier thresholds
export const TIER_THRESHOLDS = {
  BRONZE: 0,
  SILVER: 5000, // Rs. 5,000 total spent
  GOLD: 15000, // Rs. 15,000 total spent
  PLATINUM: 50000, // Rs. 50,000 total spent
} as const;

// Points configuration
export const POINTS_CONFIG = {
  EARN_RATE: 0.1, // 1 point per Rs. 10 spent (10%)
  REDEEM_RATE: 10, // 1 point = Rs. 0.10 (10 points = Rs. 1)
  MIN_REDEEM: 100, // Minimum 100 points to redeem
  EXPIRY_MONTHS: 12, // Points expire after 12 months
} as const;
