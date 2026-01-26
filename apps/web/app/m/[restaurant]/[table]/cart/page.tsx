"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, Button, Input } from "@qr-dine/ui";
import {
  ArrowLeft,
  Trash2,
  Plus,
  Minus,
  ShoppingBag,
  Loader2,
  MessageSquare,
} from "lucide-react";
import { useGuest } from "../GuestContext";

export default function GuestCartPage() {
  const params = useParams();
  const router = useRouter();
  const {
    session,
    cart,
    removeFromCart,
    updateQuantity,
    clearCart,
    cartTotal,
    cartCount,
  } = useGuest();

  const restaurantSlug = params.restaurant as string;
  const tableId = params.table as string;

  const [specialRequests, setSpecialRequests] = useState<Record<string, string>>({});
  const [placingOrder, setPlacingOrder] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSpecialRequest = (itemId: string, request: string) => {
    setSpecialRequests((prev) => ({
      ...prev,
      [itemId]: request,
    }));
  };

  const placeOrder = async () => {
    if (!session?.sessionId) {
      setError("Session expired. Please scan the QR code again.");
      return;
    }

    setPlacingOrder(true);
    setError(null);

    try {
      const orderItems = cart.map((item) => ({
        menuItemId: item.menuItemId,
        quantity: item.quantity,
        specialRequests: specialRequests[item.menuItemId] || null,
      }));

      const res = await fetch("/api/guest/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: session.sessionId,
          restaurant: restaurantSlug,
          table: tableId,
          items: orderItems,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to place order");
        return;
      }

      // Clear cart and redirect to order tracking
      clearCart();
      router.push(`/m/${restaurantSlug}/${tableId}/order?id=${data.order.id}`);
    } catch (err) {
      setError("Failed to place order. Please try again.");
    } finally {
      setPlacingOrder(false);
    }
  };

  if (cart.length === 0) {
    return (
      <div className="min-h-screen flex flex-col">
        {/* Header */}
        <div className="sticky top-0 bg-background border-b p-4">
          <div className="flex items-center gap-3">
            <Link href={`/m/${restaurantSlug}/${tableId}/menu`}>
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <h1 className="text-xl font-bold">Your Cart</h1>
          </div>
        </div>

        {/* Empty State */}
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
          <ShoppingBag className="h-16 w-16 text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2">Your cart is empty</h2>
          <p className="text-muted-foreground mb-6">
            Add some delicious items from the menu
          </p>
          <Link href={`/m/${restaurantSlug}/${tableId}/menu`}>
            <Button>Browse Menu</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-32">
      {/* Header */}
      <div className="sticky top-0 bg-background border-b p-4 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href={`/m/${restaurantSlug}/${tableId}/menu`}>
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-xl font-bold">Your Cart</h1>
              <p className="text-sm text-muted-foreground">
                {cartCount} items - Table {session?.tableNumber}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive"
            onClick={clearCart}
          >
            <Trash2 className="h-4 w-4 mr-1" />
            Clear
          </Button>
        </div>
      </div>

      {/* Cart Items */}
      <div className="p-4 space-y-3">
        {cart.map((item) => (
          <Card key={item.menuItemId}>
            <CardContent className="p-4">
              <div className="flex gap-3">
                {/* Image */}
                {item.image && (
                  <div className="w-16 h-16 flex-shrink-0">
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-full h-full object-cover rounded-lg"
                    />
                  </div>
                )}

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start">
                    <h3 className="font-medium">{item.name}</h3>
                    <button
                      onClick={() => removeFromCart(item.menuItemId)}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  <p className="text-sm text-muted-foreground">
                    Rs. {item.price} each
                  </p>

                  {/* Quantity Controls */}
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() =>
                          updateQuantity(item.menuItemId, item.quantity - 1)
                        }
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="w-8 text-center font-medium">
                        {item.quantity}
                      </span>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() =>
                          updateQuantity(item.menuItemId, item.quantity + 1)
                        }
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                    <span className="font-semibold">
                      Rs. {item.price * item.quantity}
                    </span>
                  </div>
                </div>
              </div>

              {/* Special Requests */}
              <div className="mt-3 pt-3 border-t">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                  <MessageSquare className="h-4 w-4" />
                  <span>Special requests (optional)</span>
                </div>
                <Input
                  placeholder="e.g., Less spicy, no onions..."
                  value={specialRequests[item.menuItemId] || ""}
                  onChange={(e) =>
                    handleSpecialRequest(item.menuItemId, e.target.value)
                  }
                  className="text-sm"
                />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Order Summary & Place Order */}
      <div className="fixed bottom-0 left-0 right-0 bg-background border-t p-4 z-40">
        {error && (
          <p className="text-sm text-destructive text-center mb-3">{error}</p>
        )}

        {/* Summary */}
        <div className="space-y-2 mb-4">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Subtotal</span>
            <span>Rs. {cartTotal}</span>
          </div>
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Tax & Service charges will be added</span>
          </div>
          <div className="flex justify-between font-semibold text-lg pt-2 border-t">
            <span>Total</span>
            <span>Rs. {cartTotal}</span>
          </div>
        </div>

        <Button
          className="w-full"
          size="lg"
          onClick={placeOrder}
          disabled={placingOrder}
        >
          {placingOrder ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Placing Order...
            </>
          ) : (
            `Place Order - Rs. ${cartTotal}`
          )}
        </Button>
      </div>
    </div>
  );
}
