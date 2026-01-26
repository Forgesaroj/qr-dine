"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, Button, Badge } from "@qr-dine/ui";
import {
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  ChefHat,
  Leaf,
  Flame,
  X,
  Send,
  Check,
} from "lucide-react";

interface MenuItem {
  id: string;
  name: string;
  description: string | null;
  basePrice: number;
  imageUrl: string | null;
  isVegetarian: boolean;
  isVegan: boolean;
  spiceLevel: number | null;
  isAvailable: boolean;
}

interface Category {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  menuItems: MenuItem[];
}

interface Restaurant {
  name: string;
  logoUrl: string | null;
  currency: string;
}

interface CartItem {
  menuItem: MenuItem;
  quantity: number;
  notes: string;
}

export default function CustomerOrderPage() {
  const params = useParams();
  const restaurantSlug = params.restaurant as string;
  const tableNumber = params.table as string;

  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showCart, setShowCart] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [placingOrder, setPlacingOrder] = useState(false);

  useEffect(() => {
    fetchMenu();
  }, [restaurantSlug]);

  const fetchMenu = async () => {
    try {
      const response = await fetch(`/api/public/menu/${restaurantSlug}`);
      const data = await response.json();

      if (response.ok) {
        setRestaurant(data.restaurant);
        setCategories(data.categories);
        if (data.categories.length > 0) {
          setSelectedCategory(data.categories[0].id);
        }
      } else {
        setError(data.error || "Failed to load menu");
      }
    } catch (err) {
      setError("Failed to load menu. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const addToCart = (menuItem: MenuItem) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.menuItem.id === menuItem.id);
      if (existing) {
        return prev.map((item) =>
          item.menuItem.id === menuItem.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { menuItem, quantity: 1, notes: "" }];
    });
  };

  const removeFromCart = (menuItemId: string) => {
    setCart((prev) => prev.filter((item) => item.menuItem.id !== menuItemId));
  };

  const updateQuantity = (menuItemId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) =>
          item.menuItem.id === menuItemId
            ? { ...item, quantity: Math.max(0, item.quantity + delta) }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  };

  const getCartItemQuantity = (menuItemId: string) => {
    const item = cart.find((item) => item.menuItem.id === menuItemId);
    return item?.quantity || 0;
  };

  const cartTotal = cart.reduce(
    (sum, item) => sum + item.menuItem.basePrice * item.quantity,
    0
  );

  const cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const handlePlaceOrder = async () => {
    if (cart.length === 0) return;

    setPlacingOrder(true);
    try {
      const response = await fetch("/api/public/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          restaurantSlug,
          tableNumber,
          items: cart.map((item) => ({
            menuItemId: item.menuItem.id,
            quantity: item.quantity,
            notes: item.notes,
          })),
        }),
      });

      if (response.ok) {
        setOrderPlaced(true);
        setCart([]);
        setShowCart(false);
      } else {
        const data = await response.json();
        setError(data.error || "Failed to place order");
      }
    } catch (err) {
      setError("Failed to place order. Please try again.");
    } finally {
      setPlacingOrder(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <ChefHat className="h-12 w-12 mx-auto mb-4 text-primary animate-pulse" />
          <p className="text-muted-foreground">Loading menu...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <p className="text-destructive mb-4">{error}</p>
            <Button onClick={() => window.location.reload()}>Try Again</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (orderPlaced) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center space-y-4">
            <div className="h-16 w-16 mx-auto bg-green-100 rounded-full flex items-center justify-center">
              <Check className="h-8 w-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold">Order Placed!</h2>
            <p className="text-muted-foreground">
              Your order has been sent to the kitchen. It will be ready soon!
            </p>
            <p className="text-sm text-muted-foreground">
              Table {tableNumber}
            </p>
            <Button onClick={() => setOrderPlaced(false)} className="mt-4">
              Order More
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentCategory = categories.find((c) => c.id === selectedCategory);

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-background border-b">
        <div className="max-w-lg mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-bold">{restaurant?.name}</h1>
              <p className="text-sm text-muted-foreground">
                Table {tableNumber}
              </p>
            </div>
            {restaurant?.logoUrl && (
              <img
                src={restaurant.logoUrl}
                alt={restaurant.name}
                className="h-10 w-10 rounded-full object-cover"
              />
            )}
          </div>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="sticky top-[60px] z-30 bg-background border-b">
        <div className="max-w-lg mx-auto">
          <div className="flex overflow-x-auto py-2 px-4 gap-2 no-scrollbar">
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                  selectedCategory === category.id
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted hover:bg-muted/80"
                }`}
              >
                {category.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Menu Items */}
      <div className="max-w-lg mx-auto px-4 py-4 space-y-4">
        {currentCategory?.description && (
          <p className="text-sm text-muted-foreground">
            {currentCategory.description}
          </p>
        )}

        {currentCategory?.menuItems
          .filter((item) => item.isAvailable)
          .map((item) => {
            const quantity = getCartItemQuantity(item.id);

            return (
              <Card key={item.id} className="overflow-hidden">
                <div className="flex">
                  {item.imageUrl && (
                    <div className="w-24 h-24 flex-shrink-0">
                      <img
                        src={item.imageUrl}
                        alt={item.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <CardContent className="flex-1 p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium">{item.name}</h3>
                          <div className="flex gap-1">
                            {item.isVegetarian && (
                              <Leaf className="h-4 w-4 text-green-600" />
                            )}
                            {item.isVegan && (
                              <span className="text-xs bg-green-100 text-green-800 px-1 rounded">
                                V
                              </span>
                            )}
                            {item.spiceLevel && item.spiceLevel > 0 && (
                              <Flame className="h-4 w-4 text-red-500" />
                            )}
                          </div>
                        </div>
                        {item.description && (
                          <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                            {item.description}
                          </p>
                        )}
                        <p className="text-sm font-semibold mt-2">
                          {restaurant?.currency || "Rs."} {item.basePrice.toFixed(2)}
                        </p>
                      </div>

                      {quantity > 0 ? (
                        <div className="flex items-center gap-2 bg-primary rounded-full">
                          <button
                            onClick={() => updateQuantity(item.id, -1)}
                            className="p-2 text-primary-foreground"
                          >
                            <Minus className="h-4 w-4" />
                          </button>
                          <span className="text-sm font-medium text-primary-foreground min-w-[20px] text-center">
                            {quantity}
                          </span>
                          <button
                            onClick={() => updateQuantity(item.id, 1)}
                            className="p-2 text-primary-foreground"
                          >
                            <Plus className="h-4 w-4" />
                          </button>
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => addToCart(item)}
                          className="rounded-full"
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </div>
              </Card>
            );
          })}

        {currentCategory?.menuItems.filter((item) => item.isAvailable)
          .length === 0 && (
          <p className="text-center text-muted-foreground py-8">
            No items available in this category
          </p>
        )}
      </div>

      {/* Cart Button */}
      {cartItemCount > 0 && !showCart && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t">
          <div className="max-w-lg mx-auto">
            <Button
              onClick={() => setShowCart(true)}
              className="w-full justify-between h-14"
            >
              <div className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5" />
                <span>{cartItemCount} items</span>
              </div>
              <span className="font-semibold">
                {restaurant?.currency || "Rs."} {cartTotal.toFixed(2)}
              </span>
            </Button>
          </div>
        </div>
      )}

      {/* Cart Drawer */}
      {showCart && (
        <div className="fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowCart(false)}
          />
          <div className="absolute bottom-0 left-0 right-0 bg-background rounded-t-2xl max-h-[80vh] overflow-hidden">
            <div className="max-w-lg mx-auto">
              {/* Cart Header */}
              <div className="flex items-center justify-between p-4 border-b">
                <h2 className="text-lg font-semibold">Your Order</h2>
                <button onClick={() => setShowCart(false)}>
                  <X className="h-6 w-6" />
                </button>
              </div>

              {/* Cart Items */}
              <div className="p-4 overflow-y-auto max-h-[50vh] space-y-4">
                {cart.map((item) => (
                  <div
                    key={item.menuItem.id}
                    className="flex items-center justify-between"
                  >
                    <div className="flex-1">
                      <h4 className="font-medium">{item.menuItem.name}</h4>
                      <p className="text-sm text-muted-foreground">
                        {restaurant?.currency || "Rs."}{" "}
                        {item.menuItem.basePrice.toFixed(2)} each
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2 bg-muted rounded-full">
                        <button
                          onClick={() => updateQuantity(item.menuItem.id, -1)}
                          className="p-2"
                        >
                          <Minus className="h-4 w-4" />
                        </button>
                        <span className="text-sm font-medium min-w-[20px] text-center">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(item.menuItem.id, 1)}
                          className="p-2"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>
                      <button
                        onClick={() => removeFromCart(item.menuItem.id)}
                        className="p-2 text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Cart Footer */}
              <div className="p-4 border-t space-y-4">
                <div className="flex items-center justify-between text-lg font-semibold">
                  <span>Total</span>
                  <span>
                    {restaurant?.currency || "Rs."} {cartTotal.toFixed(2)}
                  </span>
                </div>
                <Button
                  onClick={handlePlaceOrder}
                  disabled={placingOrder}
                  className="w-full h-14"
                >
                  {placingOrder ? (
                    "Placing Order..."
                  ) : (
                    <>
                      <Send className="mr-2 h-5 w-5" />
                      Place Order
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
}
