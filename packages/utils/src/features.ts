// ═══════════════════════════════════════════════════════════════════════════════
// FEATURE FLAGS
// ═══════════════════════════════════════════════════════════════════════════════

import { LicenseTier } from "@qr-dine/types";

export const FEATURE_FLAGS = {
  // Core (all tiers)
  qr_ordering: ["STARTER", "PROFESSIONAL", "ENTERPRISE", "UNLIMITED"],
  table_management: ["STARTER", "PROFESSIONAL", "ENTERPRISE", "UNLIMITED"],
  menu_management: ["STARTER", "PROFESSIONAL", "ENTERPRISE", "UNLIMITED"],
  order_management: ["STARTER", "PROFESSIONAL", "ENTERPRISE", "UNLIMITED"],
  basic_billing: ["STARTER", "PROFESSIONAL", "ENTERPRISE", "UNLIMITED"],
  basic_reports: ["STARTER", "PROFESSIONAL", "ENTERPRISE", "UNLIMITED"],
  local_backup: ["STARTER", "PROFESSIONAL", "ENTERPRISE", "UNLIMITED"],

  // Professional+
  loyalty_program: ["PROFESSIONAL", "ENTERPRISE", "UNLIMITED"],
  promotions: ["PROFESSIONAL", "ENTERPRISE", "UNLIMITED"],
  sms_integration: ["PROFESSIONAL", "ENTERPRISE", "UNLIMITED"],
  advanced_reports: ["PROFESSIONAL", "ENTERPRISE", "UNLIMITED"],
  customer_crm: ["PROFESSIONAL", "ENTERPRISE", "UNLIMITED"],
  cloud_backup: ["PROFESSIONAL", "ENTERPRISE", "UNLIMITED"],

  // Enterprise+
  multi_location: ["ENTERPRISE", "UNLIMITED"],
  api_access: ["ENTERPRISE", "UNLIMITED"],
  custom_branding: ["ENTERPRISE", "UNLIMITED"],

  // Unlimited only
  white_label: ["UNLIMITED"],
  source_code: ["UNLIMITED"],
} as const;

export type FeatureKey = keyof typeof FEATURE_FLAGS;

/**
 * Check if a feature is enabled for a tier
 */
export function isFeatureEnabled(feature: FeatureKey, tier: LicenseTier): boolean {
  return (FEATURE_FLAGS[feature] as readonly string[])?.includes(tier) ?? false;
}

/**
 * Get all enabled features for a tier
 */
export function getEnabledFeatures(tier: LicenseTier): FeatureKey[] {
  return Object.entries(FEATURE_FLAGS)
    .filter(([, tiers]) => (tiers as readonly string[]).includes(tier))
    .map(([feature]) => feature as FeatureKey);
}

/**
 * Get feature display name
 */
export function getFeatureDisplayName(feature: FeatureKey): string {
  const displayNames: Record<FeatureKey, string> = {
    qr_ordering: "QR Ordering",
    table_management: "Table Management",
    menu_management: "Menu Management",
    order_management: "Order Management",
    basic_billing: "Basic Billing",
    basic_reports: "Basic Reports",
    local_backup: "Local Backup",
    loyalty_program: "Loyalty Program",
    promotions: "Promotions",
    sms_integration: "SMS Integration",
    advanced_reports: "Advanced Reports",
    customer_crm: "Customer CRM",
    cloud_backup: "Cloud Backup",
    multi_location: "Multi-Location",
    api_access: "API Access",
    custom_branding: "Custom Branding",
    white_label: "White Label",
    source_code: "Source Code",
  };
  return displayNames[feature];
}

/**
 * Get feature description
 */
export function getFeatureDescription(feature: FeatureKey): string {
  const descriptions: Record<FeatureKey, string> = {
    qr_ordering: "Allow guests to scan QR codes and place orders from their phones",
    table_management: "Manage restaurant tables with floor plan visualization",
    menu_management: "Create and manage menu categories, items, variants, and add-ons",
    order_management: "Track and manage orders from placement to completion",
    basic_billing: "Generate bills and process payments",
    basic_reports: "View daily sales and order summaries",
    local_backup: "Backup data to local storage",
    loyalty_program: "Customer points and tier-based rewards system",
    promotions: "Create happy hours, combos, BOGO deals, and promo codes",
    sms_integration: "Send OTPs and marketing messages via SMS",
    advanced_reports: "Detailed analytics with custom date ranges and exports",
    customer_crm: "Full customer profiles with spending history and notes",
    cloud_backup: "Automatic backup to LUMORA cloud servers",
    multi_location: "Manage multiple restaurant locations under one account",
    api_access: "REST API access for third-party integrations",
    custom_branding: "Custom logo, colors, and branding on receipts and app",
    white_label: "Remove LUMORA branding completely",
    source_code: "Access to full source code for custom modifications",
  };
  return descriptions[feature];
}

// License tier limits
export const TIER_LIMITS = {
  STARTER: {
    maxRestaurants: 1,
    maxStaff: 3,
    maxTables: 20,
    cloudStorageGb: 0,
  },
  PROFESSIONAL: {
    maxRestaurants: 1,
    maxStaff: 10,
    maxTables: null, // Unlimited
    cloudStorageGb: 5,
  },
  ENTERPRISE: {
    maxRestaurants: 5,
    maxStaff: null, // Unlimited
    maxTables: null,
    cloudStorageGb: 20,
  },
  UNLIMITED: {
    maxRestaurants: null, // Unlimited
    maxStaff: null,
    maxTables: null,
    cloudStorageGb: 100,
  },
} as const;

/**
 * Get tier limits
 */
export function getTierLimits(tier: LicenseTier) {
  return TIER_LIMITS[tier];
}

/**
 * Check if within tier limit
 */
export function isWithinLimit(
  tier: LicenseTier,
  limitType: "maxRestaurants" | "maxStaff" | "maxTables",
  currentCount: number
): boolean {
  const limit = TIER_LIMITS[tier][limitType];
  if (limit === null) return true; // Unlimited
  return currentCount < limit;
}

/**
 * Get tier display name
 */
export function getTierDisplayName(tier: LicenseTier): string {
  const displayNames: Record<LicenseTier, string> = {
    STARTER: "Starter",
    PROFESSIONAL: "Professional",
    ENTERPRISE: "Enterprise",
    UNLIMITED: "Unlimited",
  };
  return displayNames[tier];
}

/**
 * Get tier price (NPR)
 */
export function getTierPrice(tier: LicenseTier): { oneTime: number; monthly: number } {
  const prices: Record<LicenseTier, { oneTime: number; monthly: number }> = {
    STARTER: { oneTime: 15000, monthly: 1500 },
    PROFESSIONAL: { oneTime: 35000, monthly: 3000 },
    ENTERPRISE: { oneTime: 75000, monthly: 6000 },
    UNLIMITED: { oneTime: 150000, monthly: 0 }, // Lifetime
  };
  return prices[tier];
}
