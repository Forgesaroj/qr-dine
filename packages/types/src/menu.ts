// ═══════════════════════════════════════════════════════════════════════════════
// MENU TYPES
// ═══════════════════════════════════════════════════════════════════════════════

import { PricingType } from "./enums";

export interface Category {
  id: string;
  restaurantId: string;
  name: string;
  nameLocal?: string;
  description?: string;
  imageUrl?: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface MenuItem {
  id: string;
  restaurantId: string;
  categoryId: string;
  name: string;
  nameLocal?: string;
  description?: string;
  imageUrl?: string;
  thumbnailUrl?: string;

  // Pricing
  pricingType: PricingType;
  basePrice: number;
  variantGroups?: VariantGroup[];
  addons?: Addon[];

  // Dietary info
  isVegetarian: boolean;
  isVegan: boolean;
  spiceLevel?: number; // 0-5
  allergens?: string[];

  // Availability
  isAvailable: boolean;
  availableFrom?: string; // "11:00"
  availableUntil?: string; // "22:00"
  availableDays?: number[]; // [0, 1, 2, 3, 4, 5, 6]

  // Kitchen
  prepTimeMinutes?: number;
  kitchenStation?: string;

  // Display
  sortOrder: number;
  isPopular: boolean;
  isNew: boolean;
  timesOrdered: number;

  createdAt: Date;
  updatedAt: Date;
}

export interface VariantGroup {
  id: string;
  name: string; // "Size", "Crust"
  required: boolean;
  minSelect: number;
  maxSelect: number;
  options: VariantOption[];
}

export interface VariantOption {
  id: string;
  name: string; // "Small", "Medium", "Large"
  priceAdjustment: number; // Can be negative, zero, or positive
  isDefault: boolean;
}

export interface Addon {
  id: string;
  name: string; // "Extra Cheese"
  price: number;
  isAvailable: boolean;
  maxQuantity: number;
}

// For cart and order
export interface SelectedVariant {
  groupId: string;
  groupName: string;
  optionId: string;
  optionName: string;
  priceAdjustment: number;
}

export interface SelectedAddon {
  addonId: string;
  addonName: string;
  quantity: number;
  price: number;
}

export interface CartItem {
  id: string; // Unique cart item ID
  menuItemId: string;
  menuItemName: string;
  quantity: number;
  unitPrice: number;
  selectedVariants: SelectedVariant[];
  selectedAddons: SelectedAddon[];
  specialInstructions?: string;
  totalPrice: number;
}

export interface Cart {
  restaurantId: string;
  tableId: string;
  sessionId?: string;
  items: CartItem[];
  subtotal: number;
  promoCode?: string;
  promoDiscount: number;
  notes?: string;
}
