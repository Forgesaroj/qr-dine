// ═══════════════════════════════════════════════════════════════════════════════
// RESTAURANT TYPES
// ═══════════════════════════════════════════════════════════════════════════════

import { LicenseTier, RestaurantStatus, TableStatus } from "./enums";

export interface Restaurant {
  id: string;
  licenseId: string;
  name: string;
  slug: string;
  description?: string;
  logoUrl?: string;
  coverImageUrl?: string;
  address?: string;
  city?: string;
  state?: string;
  country: string;
  postalCode?: string;
  phone?: string;
  email?: string;
  website?: string;
  currency: string;
  timezone: string;
  settings: RestaurantSettings;
  status: RestaurantStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface RestaurantSettings {
  // Business hours
  businessHours: BusinessHours[];

  // Tax configuration
  taxEnabled: boolean;
  taxPercentage: number;
  taxLabel: string;
  taxIncludedInPrice: boolean;

  // Service charge
  serviceChargeEnabled: boolean;
  serviceChargePercentage: number;

  // Order settings
  autoConfirmOrders: boolean;
  autoConfirmSubsequentOrders: boolean;
  requireOtpVerification: boolean;
  otpLength: 3 | 4;
  otpExpiryMinutes: number;

  // Loyalty settings
  loyaltyEnabled: boolean;
  pointsPerCurrency: number;
  pointsRedemptionRate: number;

  // Notification settings
  notifyOnNewOrder: boolean;
  notifyOnOrderReady: boolean;
  notifyOnPayment: boolean;

  // Other
  showEstimatedTime: boolean;
  allowSpecialInstructions: boolean;
}

export interface BusinessHours {
  dayOfWeek: number; // 0 = Sunday, 6 = Saturday
  isOpen: boolean;
  openTime?: string; // "09:00"
  closeTime?: string; // "22:00"
  breakStart?: string;
  breakEnd?: string;
}

export interface Table {
  id: string;
  restaurantId: string;
  tableNumber: string;
  name?: string;
  capacity: number;
  floor?: string;
  section?: string;
  qrCode?: string;
  currentOtp?: string;
  otpGeneratedAt?: Date;
  status: TableStatus;
  positionX?: number;
  positionY?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface TableSession {
  id: string;
  restaurantId: string;
  tableId: string;
  guestCount: number;
  customerId?: string;
  otpCode?: string;
  otpVerified: boolean;
  otpVerifiedAt?: Date;
  status: string;
  startedBy?: string;
  startedByType: "STAFF" | "QR";
  waiterId?: string;
  startedAt: Date;
  endedAt?: Date;
  notes?: string;
}

export interface License {
  id: string;
  licenseKey: string;
  tier: LicenseTier;
  status: string;
  maxRestaurants: number;
  maxStaffPerRestaurant?: number;
  maxTablesPerRestaurant?: number;
  cloudStorageGb: number;
  features: string[];
  activatedAt?: Date;
  expiresAt?: Date;
  ownerName: string;
  ownerEmail: string;
  ownerPhone?: string;
}
