"use client";

import { useState, useEffect } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import {
  GuestContext,
  GuestSession,
  CartItem,
  LoyaltyCustomer,
  LoyaltyState,
  ExpiringPoints,
} from "./GuestContext";

export default function GuestLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useParams();
  const searchParams = useSearchParams();
  const restaurantSlug = params.restaurant as string;
  const tableId = params.table as string;
  const isPreviewMode = searchParams.get("preview") === "staff";

  const [session, setSession] = useState<GuestSession | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loyalty, setLoyalty] = useState<LoyaltyState>({
    enabled: false,
    customer: null,
    token: null,
    welcomeBonus: 0,
    isChecking: true,
    birthdayBonus: null,
    expiringPoints: null,
  });

  // Load cart and session from localStorage (or set preview session)
  useEffect(() => {
    // If in preview mode, auto-set a preview session and skip localStorage
    if (isPreviewMode) {
      setSession({
        sessionId: "preview-session",
        verified: true,
        tableNumber: "Preview",
        restaurantName: "Staff Preview",
        restaurantSlug,
      });
      setIsLoading(false);
      return;
    }

    const savedCart = localStorage.getItem(`qrdine-cart-${restaurantSlug}-${tableId}`);
    if (savedCart) {
      try {
        setCart(JSON.parse(savedCart));
      } catch {
        // Invalid cart data
      }
    }

    const savedSession = localStorage.getItem(`qrdine-session-${restaurantSlug}-${tableId}`);
    if (savedSession) {
      try {
        setSession(JSON.parse(savedSession));
      } catch {
        // Invalid session data
      }
    }

    // Mark loading as complete after checking localStorage
    setIsLoading(false);
  }, [restaurantSlug, tableId, isPreviewMode]);

  // Save cart to localStorage
  useEffect(() => {
    if (cart.length > 0) {
      localStorage.setItem(`qrdine-cart-${restaurantSlug}-${tableId}`, JSON.stringify(cart));
    }
  }, [cart, restaurantSlug, tableId]);

  // Save session to localStorage
  useEffect(() => {
    if (session) {
      localStorage.setItem(`qrdine-session-${restaurantSlug}-${tableId}`, JSON.stringify(session));
    }
  }, [session, restaurantSlug, tableId]);

  // Check loyalty status on load
  const checkLoyalty = async () => {
    try {
      const savedToken = localStorage.getItem(`qrdine-loyalty-token-${restaurantSlug}`);
      const params = new URLSearchParams({ restaurant: restaurantSlug });
      if (savedToken) {
        params.append("token", savedToken);
      }

      const res = await fetch(`/api/guest/loyalty?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();

        // Check for expiring points if customer is logged in
        let expiringPointsData: ExpiringPoints | null = null;
        if (data.customer && savedToken) {
          try {
            const expiryRes = await fetch(`/api/guest/loyalty/expiring?token=${savedToken}`);
            if (expiryRes.ok) {
              const expiryData = await expiryRes.json();
              expiringPointsData = {
                hasExpiringPoints: expiryData.hasExpiringPoints,
                expiringPoints: expiryData.expiringPoints,
                message: expiryData.message,
              };
            }
          } catch {
            // Ignore expiry check errors
          }
        }

        setLoyalty({
          enabled: data.loyaltyEnabled,
          customer: data.customer,
          token: savedToken,
          welcomeBonus: data.welcomeBonus || 0,
          isChecking: false,
          birthdayBonus: data.birthdayBonus || null,
          expiringPoints: expiringPointsData,
        });
      } else {
        setLoyalty((prev) => ({ ...prev, isChecking: false }));
      }
    } catch {
      setLoyalty((prev) => ({ ...prev, isChecking: false }));
    }
  };

  useEffect(() => {
    if (!isPreviewMode) {
      checkLoyalty();
    } else {
      setLoyalty((prev) => ({ ...prev, isChecking: false }));
    }
  }, [restaurantSlug, isPreviewMode]);

  // Set loyalty customer after registration/login
  const setLoyaltyCustomer = (customer: LoyaltyCustomer, token: string) => {
    localStorage.setItem(`qrdine-loyalty-token-${restaurantSlug}`, token);
    setLoyalty((prev) => ({
      ...prev,
      customer,
      token,
    }));
  };

  // Clear loyalty customer (logout)
  const clearLoyaltyCustomer = () => {
    localStorage.removeItem(`qrdine-loyalty-token-${restaurantSlug}`);
    setLoyalty((prev) => ({
      ...prev,
      customer: null,
      token: null,
    }));
  };

  // Refresh loyalty status
  const refreshLoyalty = async () => {
    await checkLoyalty();
  };

  // Claim birthday bonus
  const claimBirthdayBonus = async (): Promise<{ success: boolean; pointsAwarded?: number; error?: string }> => {
    if (!loyalty.token || !loyalty.birthdayBonus?.canClaim) {
      return { success: false, error: "Cannot claim birthday bonus" };
    }

    try {
      const res = await fetch("/api/guest/loyalty/birthday", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: loyalty.token }),
      });

      const data = await res.json();

      if (!res.ok) {
        return { success: false, error: data.error };
      }

      // Update loyalty state with new balance and mark bonus as claimed
      setLoyalty((prev) => ({
        ...prev,
        customer: prev.customer
          ? { ...prev.customer, pointsBalance: data.newBalance }
          : null,
        birthdayBonus: prev.birthdayBonus
          ? { ...prev.birthdayBonus, canClaim: false, alreadyClaimed: true }
          : null,
      }));

      return { success: true, pointsAwarded: data.pointsAwarded };
    } catch {
      return { success: false, error: "Failed to claim birthday bonus" };
    }
  };

  const addToCart = (item: CartItem) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.menuItemId === item.menuItemId);
      if (existing) {
        return prev.map((i) =>
          i.menuItemId === item.menuItemId
            ? { ...i, quantity: i.quantity + item.quantity }
            : i
        );
      }
      return [...prev, item];
    });
  };

  const removeFromCart = (menuItemId: string) => {
    setCart((prev) => prev.filter((i) => i.menuItemId !== menuItemId));
  };

  const updateQuantity = (menuItemId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(menuItemId);
      return;
    }
    setCart((prev) =>
      prev.map((i) => (i.menuItemId === menuItemId ? { ...i, quantity } : i))
    );
  };

  const clearCart = () => {
    setCart([]);
    localStorage.removeItem(`qrdine-cart-${restaurantSlug}-${tableId}`);
  };

  const cartTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  // Show loading while checking localStorage
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <GuestContext.Provider
      value={{
        session,
        cart,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        cartTotal,
        cartCount,
        setSession,
        isLoading,
        loyalty,
        setLoyaltyCustomer,
        clearLoyaltyCustomer,
        refreshLoyalty,
        claimBirthdayBonus,
      }}
    >
      <div className="min-h-screen bg-background">
        {children}
      </div>
    </GuestContext.Provider>
  );
}
