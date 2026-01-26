"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, Button, Badge } from "@qr-dine/ui";
import {
  Loader2,
  ShoppingCart,
  Plus,
  Minus,
  Leaf,
  Flame,
  Clock,
  Search,
  X,
  AlertCircle,
  UtensilsCrossed,
  Coins,
  Star,
  HelpCircle,
  Gift,
  Cake,
  PartyPopper,
} from "lucide-react";
import { useGuest } from "../GuestContext";

interface PointsInfo {
  basePoints: number;
  actualPoints: number;
  multiplier: number;
}

interface MenuItem {
  id: string;
  name: string;
  description: string | null;
  price: number;
  image: string | null;
  isVegetarian: boolean;
  isVegan: boolean;
  isGlutenFree: boolean;
  isSpicy: boolean;
  spicyLevel: number | null;
  preparationTime: number | null;
  calories: number | null;
  points: PointsInfo | null;
}

interface LoyaltyInfo {
  enabled: boolean;
  isLoyaltyMember: boolean;
  customerTier: string;
  tierMultiplier: number;
  pointsPerRupee: number;
}

interface Category {
  id: string;
  name: string;
  description: string | null;
  image: string | null;
  items: MenuItem[];
}

export default function GuestMenuPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { session, cart, addToCart, cartCount, cartTotal, loyalty, claimBirthdayBonus, refreshLoyalty } = useGuest();

  const [claimingBirthday, setClaimingBirthday] = useState(false);
  const [birthdayMessage, setBirthdayMessage] = useState<string | null>(null);

  const restaurantSlug = params.restaurant as string;
  const tableId = params.table as string;
  const isPreviewMode = searchParams.get("preview") === "staff";

  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [restaurantName, setRestaurantName] = useState("");
  const [debugInfo, setDebugInfo] = useState<{ totalCategories: number; totalItems: number } | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [itemQuantity, setItemQuantity] = useState(1);
  const [loyaltyInfo, setLoyaltyInfo] = useState<LoyaltyInfo | null>(null);

  // Fetch menu when session is verified
  useEffect(() => {
    const fetchMenu = async () => {
      try {
        setError(null);
        const res = await fetch(`/api/guest/menu?restaurant=${restaurantSlug}`);
        const data = await res.json();

        console.log("Menu API response:", data); // Debug log

        if (res.ok) {
          setCategories(data.categories || []);
          setRestaurantName(data.restaurant?.name || "Restaurant");
          setDebugInfo(data.debug || null);
          setLoyaltyInfo(data.loyalty || null);
          if (data.categories && data.categories.length > 0) {
            setSelectedCategory(data.categories[0].id);
          }
        } else {
          const errorMsg = data.details
            ? `${data.error}: ${data.details}`
            : data.error || "Failed to load menu";
          setError(errorMsg);
        }
      } catch (err) {
        console.error("Failed to fetch menu:", err);
        setError(`Network error: ${err instanceof Error ? err.message : "Please try again."}`);
      } finally {
        setLoading(false);
      }
    };

    // Fetch menu regardless of session verification
    // This helps debug if the issue is with session or menu data
    fetchMenu();
  }, [restaurantSlug]);

  const handleAddToCart = (item: MenuItem) => {
    addToCart({
      menuItemId: item.id,
      name: item.name,
      price: item.price,
      quantity: itemQuantity,
      image: item.image || undefined,
    });
    setSelectedItem(null);
    setItemQuantity(1);
  };

  // Handle birthday bonus claim
  const handleClaimBirthday = async () => {
    setClaimingBirthday(true);
    const result = await claimBirthdayBonus();
    setClaimingBirthday(false);

    if (result.success) {
      setBirthdayMessage(`🎂 Happy Birthday! ${result.pointsAwarded} points added!`);
      setTimeout(() => setBirthdayMessage(null), 5000);
      refreshLoyalty();
    } else {
      setBirthdayMessage(result.error || "Failed to claim birthday bonus");
      setTimeout(() => setBirthdayMessage(null), 3000);
    }
  };

  const getCartItemQuantity = (itemId: string) => {
    const cartItem = cart.find((i) => i.menuItemId === itemId);
    return cartItem?.quantity || 0;
  };

  // Filter items based on search
  const filteredCategories = categories
    .map((cat) => ({
      ...cat,
      items: cat.items.filter(
        (item) =>
          item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.description?.toLowerCase().includes(searchQuery.toLowerCase())
      ),
    }))
    .filter((cat) => cat.items.length > 0);

  const displayCategories = searchQuery ? filteredCategories : categories;
  const currentCategory = selectedCategory
    ? displayCategories.find((c) => c.id === selectedCategory)
    : displayCategories[0];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <AlertCircle className="h-12 w-12 text-destructive mb-4" />
        <h2 className="text-xl font-semibold mb-2">Error</h2>
        <p className="text-muted-foreground text-center mb-4">{error}</p>
        <Button onClick={() => window.location.reload()}>Try Again</Button>
      </div>
    );
  }

  if (categories.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <UtensilsCrossed className="h-12 w-12 text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold mb-2">No Menu Available</h2>
        <p className="text-muted-foreground text-center mb-4">
          {debugInfo && debugInfo.totalItems > 0
            ? `${debugInfo.totalItems} items found but none are available. Staff needs to mark items as available.`
            : debugInfo && debugInfo.totalCategories > 0
            ? "Categories exist but no menu items have been added yet."
            : "No menu has been set up for this restaurant yet."}
        </p>
        {debugInfo && (
          <p className="text-xs text-muted-foreground">
            Debug: {debugInfo.totalCategories} categories, {debugInfo.totalItems} items
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24">
      {/* Preview Banner */}
      {isPreviewMode && (
        <div className="bg-amber-500 text-amber-950 text-center py-2 px-4 text-sm font-medium">
          Staff Preview Mode - This is how guests see your menu
        </div>
      )}

      {/* Birthday Banner */}
      {!isPreviewMode && loyalty.birthdayBonus?.isBirthday && (
        <div className="bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 text-white">
          <div className="px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                <Cake className="h-6 w-6" />
              </div>
              <div className="flex-1">
                <p className="font-bold flex items-center gap-2">
                  <PartyPopper className="h-4 w-4" />
                  Happy Birthday, {loyalty.customer?.name}!
                </p>
                {loyalty.birthdayBonus.canClaim ? (
                  <p className="text-sm text-white/90">
                    Claim your {loyalty.birthdayBonus.bonusAmount} bonus points!
                  </p>
                ) : (
                  <p className="text-sm text-white/90">
                    Enjoy your special day with us!
                  </p>
                )}
              </div>
              {loyalty.birthdayBonus.canClaim && (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={handleClaimBirthday}
                  disabled={claimingBirthday}
                  className="flex-shrink-0"
                >
                  {claimingBirthday ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Gift className="h-4 w-4 mr-1" />
                      Claim
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Birthday Message Toast */}
      {birthdayMessage && (
        <div className="fixed top-4 left-4 right-4 z-50 animate-in fade-in slide-in-from-top-2">
          <div className="bg-green-500 text-white rounded-lg px-4 py-3 shadow-lg text-center font-medium">
            {birthdayMessage}
          </div>
        </div>
      )}

      {/* Header */}
      <div className="sticky top-0 bg-background border-b z-10">
        <div className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h1 className="text-xl font-bold">{restaurantName}</h1>
              <p className="text-sm text-muted-foreground">
                {isPreviewMode ? "Preview Mode" : `Table ${session?.tableNumber}`}
              </p>
            </div>
            {!isPreviewMode && (
              <div className="flex items-center gap-2">
                <Link href={`/m/${restaurantSlug}/${tableId}/assistance`}>
                  <Button variant="outline" size="sm" className="text-amber-600 border-amber-300 hover:bg-amber-50">
                    <HelpCircle className="h-4 w-4" />
                  </Button>
                </Link>
                <Link href={`/m/${restaurantSlug}/${tableId}/cart`}>
                  <Button variant="outline" size="sm" className="relative">
                    <ShoppingCart className="h-4 w-4" />
                    {cartCount > 0 && (
                      <span className="absolute -top-2 -right-2 bg-primary text-primary-foreground text-xs w-5 h-5 rounded-full flex items-center justify-center">
                        {cartCount}
                      </span>
                    )}
                  </Button>
                </Link>
              </div>
            )}
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search menu..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-10 py-2 border rounded-lg text-sm bg-muted/50"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2"
              >
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            )}
          </div>

          {/* Loyalty Status Bar */}
          {!isPreviewMode && loyalty.enabled && loyalty.customer && (
            <div className="mt-3 space-y-2">
              <div className="flex items-center justify-between bg-gradient-to-r from-amber-50 to-yellow-50 rounded-lg px-3 py-2 border border-amber-200">
                <div className="flex items-center gap-2">
                  <Star className="h-4 w-4 text-amber-500" />
                  <span className="text-sm font-medium text-amber-800">
                    {loyalty.customer.name}
                  </span>
                  <Badge
                    variant="outline"
                    className={`text-xs ${
                      loyalty.customer.tier === "PLATINUM"
                        ? "bg-purple-100 text-purple-700 border-purple-300"
                        : loyalty.customer.tier === "GOLD"
                        ? "bg-yellow-100 text-yellow-700 border-yellow-300"
                        : loyalty.customer.tier === "SILVER"
                        ? "bg-gray-100 text-gray-700 border-gray-300"
                        : "bg-amber-100 text-amber-700 border-amber-300"
                    }`}
                  >
                    {loyalty.customer.tier}
                  </Badge>
                </div>
                <div className="flex items-center gap-1 text-amber-700">
                  <Coins className="h-4 w-4" />
                  <span className="font-semibold">{loyalty.customer.pointsBalance}</span>
                  <span className="text-xs">pts</span>
                </div>
              </div>

              {/* Expiring Points Warning */}
              {loyalty.expiringPoints?.hasExpiringPoints && (
                <div className="flex items-center gap-2 bg-orange-50 border border-orange-200 rounded-lg px-3 py-2 text-orange-700 text-sm">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  <span>
                    <strong>{loyalty.expiringPoints.expiringPoints} points</strong> expiring soon! Use them today.
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Category Tabs */}
        {!searchQuery && (
          <div className="flex overflow-x-auto gap-2 px-4 pb-3 scrollbar-hide">
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                  selectedCategory === category.id
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted hover:bg-muted/80"
                }`}
              >
                {category.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Menu Items */}
      <div className="p-4 space-y-3">
        {searchQuery && (
          <p className="text-sm text-muted-foreground mb-4">
            {filteredCategories.reduce((sum, c) => sum + c.items.length, 0)} results for &quot;{searchQuery}&quot;
          </p>
        )}

        {(searchQuery ? filteredCategories.flatMap((c) => c.items) : currentCategory?.items || []).map(
          (item) => {
            const inCartQty = getCartItemQuantity(item.id);

            return (
              <Card
                key={item.id}
                className="overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => setSelectedItem(item)}
              >
                <div className="flex">
                  {/* Image */}
                  {item.image && (
                    <div className="w-24 h-24 flex-shrink-0">
                      <img
                        src={item.image}
                        alt={item.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}

                  {/* Content */}
                  <CardContent className="flex-1 p-3">
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium truncate">{item.name}</h3>
                          {item.isVegetarian && (
                            <Leaf className="h-4 w-4 text-green-600 flex-shrink-0" />
                          )}
                          {item.isSpicy && (
                            <Flame className="h-4 w-4 text-red-500 flex-shrink-0" />
                          )}
                        </div>
                        {item.description && (
                          <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                            {item.description}
                          </p>
                        )}
                        <div className="flex items-center gap-3 mt-2">
                          <span className="font-semibold">Rs. {item.price}</span>
                          {item.preparationTime && (
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {item.preparationTime} min
                            </span>
                          )}
                          {/* Points Display */}
                          {item.points && loyaltyInfo?.enabled && (
                            <span className="text-xs text-amber-600 flex items-center gap-1">
                              <Coins className="h-3 w-3" />
                              +{item.points.actualPoints} pts
                              {item.points.multiplier > 1 && (
                                <span className="text-amber-500">({item.points.multiplier}x)</span>
                              )}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Quick Add */}
                      {!isPreviewMode && (
                        <div className="flex-shrink-0">
                          {inCartQty > 0 ? (
                            <Badge className="bg-primary text-primary-foreground">
                              {inCartQty} in cart
                            </Badge>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation();
                                addToCart({
                                  menuItemId: item.id,
                                  name: item.name,
                                  price: item.price,
                                  quantity: 1,
                                  image: item.image || undefined,
                                });
                              }}
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </div>
              </Card>
            );
          }
        )}
      </div>

      {/* Item Detail Modal */}
      {selectedItem && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-end"
          onClick={() => {
            setSelectedItem(null);
            setItemQuantity(1);
          }}
        >
          <div
            className="bg-background w-full rounded-t-2xl p-4 max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {selectedItem.image && (
              <img
                src={selectedItem.image}
                alt={selectedItem.name}
                className="w-full h-48 object-cover rounded-lg mb-4"
              />
            )}

            <h2 className="text-xl font-bold">{selectedItem.name}</h2>

            <div className="flex items-center gap-2 mt-2">
              {selectedItem.isVegetarian && (
                <Badge variant="outline" className="text-green-600 border-green-600">
                  <Leaf className="h-3 w-3 mr-1" />
                  Veg
                </Badge>
              )}
              {selectedItem.isSpicy && (
                <Badge variant="outline" className="text-red-500 border-red-500">
                  <Flame className="h-3 w-3 mr-1" />
                  Spicy
                </Badge>
              )}
              {selectedItem.isGlutenFree && (
                <Badge variant="outline">GF</Badge>
              )}
            </div>

            {selectedItem.description && (
              <p className="text-muted-foreground mt-3">
                {selectedItem.description}
              </p>
            )}

            <div className="flex items-center gap-4 mt-4 text-sm text-muted-foreground">
              {selectedItem.preparationTime && (
                <span className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  {selectedItem.preparationTime} min
                </span>
              )}
              {selectedItem.calories && (
                <span>{selectedItem.calories} cal</span>
              )}
            </div>

            {/* Points Earned Display */}
            {selectedItem.points && loyaltyInfo?.enabled && (
              <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <div className="flex items-center gap-2 text-amber-700">
                  <Coins className="h-5 w-5" />
                  <span className="font-medium">
                    Earn +{selectedItem.points.actualPoints * itemQuantity} points
                  </span>
                  {selectedItem.points.multiplier > 1 && (
                    <Badge className="bg-amber-100 text-amber-700 border-amber-300">
                      <Star className="h-3 w-3 mr-1" />
                      {loyaltyInfo.customerTier} {selectedItem.points.multiplier}x
                    </Badge>
                  )}
                </div>
                {!loyaltyInfo.isLoyaltyMember && (
                  <p className="text-xs text-amber-600 mt-1">
                    Join our loyalty program to earn points!
                  </p>
                )}
              </div>
            )}

            <div className="flex items-center justify-between mt-6">
              <span className="text-2xl font-bold">Rs. {selectedItem.price}</span>

              {!isPreviewMode && (
                <div className="flex items-center gap-3">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setItemQuantity(Math.max(1, itemQuantity - 1))}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <span className="text-xl font-semibold w-8 text-center">
                    {itemQuantity}
                  </span>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setItemQuantity(itemQuantity + 1)}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>

            {isPreviewMode ? (
              <Button
                className="w-full mt-4"
                size="lg"
                variant="secondary"
                onClick={() => {
                  setSelectedItem(null);
                  setItemQuantity(1);
                }}
              >
                Close Preview
              </Button>
            ) : (
              <Button
                className="w-full mt-4"
                size="lg"
                onClick={() => handleAddToCart(selectedItem)}
              >
                Add to Cart - Rs. {selectedItem.price * itemQuantity}
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Bottom Cart Bar */}
      {!isPreviewMode && cartCount > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-background border-t p-4 z-40">
          <Link href={`/m/${restaurantSlug}/${tableId}/cart`}>
            <Button className="w-full" size="lg">
              <ShoppingCart className="mr-2 h-5 w-5" />
              View Cart ({cartCount} items) - Rs. {cartTotal}
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}
