"use client";

import { createContext, useContext } from "react";

export interface GuestSession {
  sessionId: string | null;
  verified: boolean;
  tableNumber: string;
  restaurantName: string;
  restaurantSlug: string;
}

export interface CartItem {
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
  specialRequests?: string;
  image?: string;
}

export interface LoyaltyCustomer {
  id: string;
  name: string;
  phoneHint?: string;
  tier: string;
  pointsBalance: number;
}

export interface BirthdayBonus {
  isBirthday: boolean;
  canClaim: boolean;
  alreadyClaimed: boolean;
  bonusAmount: number;
}

export interface ExpiringPoints {
  hasExpiringPoints: boolean;
  expiringPoints: number;
  message: string | null;
}

export interface LoyaltyState {
  enabled: boolean;
  customer: LoyaltyCustomer | null;
  token: string | null;
  welcomeBonus: number;
  isChecking: boolean;
  birthdayBonus: BirthdayBonus | null;
  expiringPoints: ExpiringPoints | null;
}

export interface GuestContextType {
  session: GuestSession | null;
  cart: CartItem[];
  addToCart: (item: CartItem) => void;
  removeFromCart: (menuItemId: string) => void;
  updateQuantity: (menuItemId: string, quantity: number) => void;
  clearCart: () => void;
  cartTotal: number;
  cartCount: number;
  setSession: (session: GuestSession) => void;
  isLoading: boolean;
  // Loyalty
  loyalty: LoyaltyState;
  setLoyaltyCustomer: (customer: LoyaltyCustomer, token: string) => void;
  clearLoyaltyCustomer: () => void;
  refreshLoyalty: () => Promise<void>;
  claimBirthdayBonus: () => Promise<{ success: boolean; pointsAwarded?: number; error?: string }>;
}

export const GuestContext = createContext<GuestContextType | null>(null);

export function useGuest() {
  const context = useContext(GuestContext);
  if (!context) {
    throw new Error("useGuest must be used within GuestProvider");
  }
  return context;
}
