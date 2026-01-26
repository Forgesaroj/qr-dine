"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useSearchParams } from "next/navigation";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Badge,
  Input,
} from "@qr-dine/ui";
import {
  Search,
  Plus,
  Minus,
  ShoppingCart,
  X,
  Star,
  Clock,
  Repeat,
  Send,
  ChevronRight,
  Check,
  AlertCircle,
  UtensilsCrossed,
  Package,
  Phone,
  User,
} from "lucide-react";

type OrderType = "DINE_IN" | "TAKEAWAY" | "PHONE";

interface MenuItem {
  id: string;
  name: string;
  nameLocal: string | null;
  basePrice: number;
  packagingCharge?: number;
  isAvailableForTakeaway?: boolean;
  category: { id: string; name: string };
  variants: Array<{ id: string; name: string; price: number }>;
  orderCount?: number;
}

interface CartItem {
  menuItemId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  packagingCharge: number;
  variantId?: string;
  variantName?: string;
  specialRequests?: string;
  isTakeaway: boolean;
}

interface Table {
  id: string;
  tableNumber: string;
  name: string | null;
  status: string;
}

interface RecentOrder {
  id: string;
  orderNumber: string;
  table: { tableNumber: string } | null;
  items: Array<{
    menuItemId: string;
    menuItemName: string;
    quantity: number;
    unitPrice: number;
    variantId?: string;
    variantName?: string;
  }>;
}

interface TakeawayCustomer {
  id: string;
  name: string;
  phone: string;
  totalOrders: number;
  lastOrderItems?: Array<{ menuItemId: string; name: string }>;
}

export default function QuickOrderPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const initialTableId = searchParams.get("table");

  // Order type state
  const [orderType, setOrderType] = useState<OrderType>("DINE_IN");

  // Takeaway customer info
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [foundCustomer, setFoundCustomer] = useState<TakeawayCustomer | null>(null);
  const [searchingCustomer, setSearchingCustomer] = useState(false);

  const [favorites, setFavorites] = useState<MenuItem[]>([]);
  const [allItems, setAllItems] = useState<MenuItem[]>([]);
  const [tables, setTables] = useState<Table[]>([]);
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedTableId, setSelectedTableId] = useState<string | null>(initialTableId);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"favorites" | "all" | "recent">("favorites");

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (selectedTableId && orderType === "DINE_IN") {
      fetchRecentOrders(selectedTableId);
    }
  }, [selectedTableId, orderType]);

  // Phone number lookup for returning customers
  useEffect(() => {
    const lookupCustomer = async () => {
      if (customerPhone.length >= 10 && (orderType === "TAKEAWAY" || orderType === "PHONE")) {
        setSearchingCustomer(true);
        try {
          const res = await fetch(`/api/takeaway-customers/lookup?phone=${customerPhone}`);
          const data = await res.json();
          if (res.ok && data.customer) {
            setFoundCustomer(data.customer);
            if (!customerName && data.customer.name) {
              setCustomerName(data.customer.name);
            }
          } else {
            setFoundCustomer(null);
          }
        } catch (err) {
          setFoundCustomer(null);
        } finally {
          setSearchingCustomer(false);
        }
      } else {
        setFoundCustomer(null);
      }
    };

    const debounce = setTimeout(lookupCustomer, 500);
    return () => clearTimeout(debounce);
  }, [customerPhone, orderType]);

  const fetchData = async () => {
    try {
      const [favRes, tablesRes, menuRes] = await Promise.all([
        fetch("/api/quick-order/favorites?limit=20"),
        fetch("/api/tables"),
        fetch("/api/menu?active=true"),
      ]);

      const favData = await favRes.json();
      const tablesData = await tablesRes.json();
      const menuData = await menuRes.json();

      if (favRes.ok) setFavorites(favData.favorites || []);
      if (tablesRes.ok) setTables(tablesData.tables || []);
      if (menuRes.ok) setAllItems(menuData.items || menuData.menuItems || []);
    } catch (err) {
      console.error("Failed to fetch data:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchRecentOrders = async (tableId: string) => {
    try {
      const res = await fetch(`/api/quick-order?tableId=${tableId}&limit=5`);
      const data = await res.json();
      if (res.ok) {
        setRecentOrders(data.recentOrders || []);
      }
    } catch (err) {
      console.error("Failed to fetch recent orders:", err);
    }
  };

  const addToCart = useCallback((item: MenuItem, variantId?: string) => {
    const variant = variantId
      ? item.variants.find((v) => v.id === variantId)
      : null;

    const isTakeaway = orderType === "TAKEAWAY";

    setCart((prev) => {
      const existingIndex = prev.findIndex(
        (c) => c.menuItemId === item.id && c.variantId === variantId && c.isTakeaway === isTakeaway
      );

      if (existingIndex >= 0) {
        const updated = [...prev];
        const existingItem = updated[existingIndex];
        if (existingItem) {
          existingItem.quantity += 1;
        }
        return updated;
      }

      return [
        ...prev,
        {
          menuItemId: item.id,
          name: item.name,
          quantity: 1,
          unitPrice: variant?.price || item.basePrice,
          packagingCharge: isTakeaway ? (item.packagingCharge || 0) : 0,
          variantId,
          variantName: variant?.name,
          isTakeaway,
        },
      ];
    });
  }, [orderType]);

  const updateCartQuantity = (index: number, delta: number) => {
    setCart((prev) => {
      const updated = [...prev];
      const item = updated[index];
      if (!item) return updated;

      item.quantity += delta;

      if (item.quantity <= 0) {
        updated.splice(index, 1);
      }

      return updated;
    });
  };

  const toggleItemTakeaway = (index: number) => {
    setCart((prev) => {
      const updated = [...prev];
      const item = updated[index];
      if (!item) return updated;

      const menuItem = allItems.find((m) => m.id === item.menuItemId);

      item.isTakeaway = !item.isTakeaway;
      item.packagingCharge = item.isTakeaway ? (menuItem?.packagingCharge || 0) : 0;

      return updated;
    });
  };

  const removeFromCart = (index: number) => {
    setCart((prev) => prev.filter((_, i) => i !== index));
  };

  const clearCart = () => {
    setCart([]);
  };

  const repeatOrder = (order: RecentOrder) => {
    const newItems: CartItem[] = order.items.map((item) => ({
      menuItemId: item.menuItemId,
      name: item.menuItemName,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      packagingCharge: 0,
      variantId: item.variantId,
      variantName: item.variantName,
      isTakeaway: false,
    }));

    setCart(newItems);
  };

  const submitOrder = async () => {
    // Validation
    if (orderType === "DINE_IN" && !selectedTableId) {
      setError("Please select a table for dine-in orders");
      return;
    }

    if ((orderType === "TAKEAWAY" || orderType === "PHONE") && !customerPhone) {
      setError("Please enter customer phone number");
      return;
    }

    if (cart.length === 0) {
      setError("Cart is empty");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/quick-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderType,
          tableId: orderType === "DINE_IN" ? selectedTableId : (selectedTableId || null),
          customerName: (orderType === "TAKEAWAY" || orderType === "PHONE") ? customerName : undefined,
          customerPhone: (orderType === "TAKEAWAY" || orderType === "PHONE") ? customerPhone : undefined,
          items: cart.map((item) => ({
            menuItemId: item.menuItemId,
            quantity: item.quantity,
            variantId: item.variantId,
            specialRequests: item.specialRequests,
            isTakeaway: item.isTakeaway,
            packagingCharge: item.packagingCharge,
          })),
        }),
      });

      const data = await response.json();

      if (response.ok) {
        const token = data.order?.pickupToken;
        setSuccessMessage(
          (orderType === "TAKEAWAY" || orderType === "PHONE") && token
            ? `Order ${token} submitted successfully!`
            : "Order submitted successfully!"
        );
        setShowSuccess(true);
        setCart([]);
        if (orderType === "TAKEAWAY" || orderType === "PHONE") {
          setCustomerName("");
          setCustomerPhone("");
          setFoundCustomer(null);
        }
        setTimeout(() => setShowSuccess(false), 3000);
        if (selectedTableId && orderType === "DINE_IN") {
          fetchRecentOrders(selectedTableId);
        }
      } else {
        setError(data.error || "Failed to submit order");
      }
    } catch (err) {
      setError("Failed to submit order");
    } finally {
      setSubmitting(false);
    }
  };

  const cartSubtotal = cart.reduce(
    (sum, item) => sum + item.unitPrice * item.quantity,
    0
  );
  const packagingTotal = cart.reduce(
    (sum, item) => sum + (item.isTakeaway ? item.packagingCharge * item.quantity : 0),
    0
  );
  const cartTotal = cartSubtotal + packagingTotal;
  const cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const takeawayItemCount = cart.filter((item) => item.isTakeaway).length;

  const filteredItems =
    activeTab === "favorites"
      ? favorites.filter(
          (item) =>
            item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.category?.name?.toLowerCase().includes(searchQuery.toLowerCase())
        )
      : allItems.filter(
          (item) =>
            item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.category?.name?.toLowerCase().includes(searchQuery.toLowerCase())
        );

  const formatCurrency = (amount: number) => {
    return `Rs. ${amount.toLocaleString()}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <ShoppingCart className="h-8 w-8 animate-pulse text-primary" />
        <p className="ml-2">Loading quick order...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-8rem)]">
      {/* Left Panel - Menu Items */}
      <div className="flex-1 flex flex-col min-h-0">
        {/* Header */}
        <div className="mb-4">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ShoppingCart className="h-6 w-6" />
            Quick Order
          </h1>
        </div>

        {/* Order Type Toggle */}
        <div className="mb-4">
          <label className="text-sm font-medium mb-2 block">Order Type</label>
          <div className="flex gap-2">
            <Button
              variant={orderType === "DINE_IN" ? "default" : "outline"}
              size="sm"
              onClick={() => setOrderType("DINE_IN")}
              className="flex-1"
            >
              <UtensilsCrossed className="mr-2 h-4 w-4" />
              Dine-In
            </Button>
            <Button
              variant={orderType === "PHONE" ? "default" : "outline"}
              size="sm"
              onClick={() => setOrderType("PHONE")}
              className="flex-1"
            >
              <Phone className="mr-2 h-4 w-4" />
              Phone Order
            </Button>
            <Button
              variant={orderType === "TAKEAWAY" ? "default" : "outline"}
              size="sm"
              onClick={() => setOrderType("TAKEAWAY")}
              className="flex-1"
            >
              <Package className="mr-2 h-4 w-4" />
              Take Away
            </Button>
          </div>
        </div>

        {/* Conditional: Table Selection OR Customer Info */}
        {orderType === "DINE_IN" ? (
          <div className="mb-4">
            <label className="text-sm font-medium mb-2 block">Select Table</label>
            <div className="flex flex-wrap gap-2">
              {tables
                .filter((t) => ["AVAILABLE", "OCCUPIED"].includes(t.status))
                .map((table) => (
                  <Button
                    key={table.id}
                    variant={selectedTableId === table.id ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedTableId(table.id)}
                    className="min-w-[60px]"
                  >
                    {table.tableNumber}
                    {table.status === "OCCUPIED" && (
                      <Badge variant="secondary" className="ml-1 text-xs">
                        Occ
                      </Badge>
                    )}
                  </Button>
                ))}
            </div>
          </div>
        ) : (
          <div className="mb-4 space-y-3">
            <div>
              <label className="text-sm font-medium mb-1 block">
                <Phone className="inline h-4 w-4 mr-1" />
                Customer Phone *
              </label>
              <Input
                placeholder="Enter phone number"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                className="max-w-xs"
              />
              {searchingCustomer && (
                <p className="text-xs text-muted-foreground mt-1">Searching...</p>
              )}
              {foundCustomer && (
                <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-sm text-green-700">
                    Returning customer: <strong>{foundCustomer.name}</strong>
                  </p>
                  <p className="text-xs text-green-600">
                    {foundCustomer.totalOrders} previous orders
                  </p>
                </div>
              )}
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">
                <User className="inline h-4 w-4 mr-1" />
                Customer Name
              </label>
              <Input
                placeholder="Enter customer name"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="max-w-xs"
              />
            </div>
            {/* Optional table assignment for takeaway */}
            <div>
              <label className="text-sm font-medium mb-1 block text-muted-foreground">
                Assign to Table (Optional)
              </label>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={selectedTableId === null ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setSelectedTableId(null)}
                >
                  No Table
                </Button>
                {tables
                  .filter((t) => ["AVAILABLE", "OCCUPIED"].includes(t.status))
                  .slice(0, 6)
                  .map((table) => (
                    <Button
                      key={table.id}
                      variant={selectedTableId === table.id ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectedTableId(table.id)}
                    >
                      {table.tableNumber}
                    </Button>
                  ))}
              </div>
            </div>
          </div>
        )}

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search items..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-4">
          <Button
            variant={activeTab === "favorites" ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveTab("favorites")}
          >
            <Star className="mr-1 h-4 w-4" />
            Popular
          </Button>
          <Button
            variant={activeTab === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveTab("all")}
          >
            All Items
          </Button>
          <Button
            variant={activeTab === "recent" ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveTab("recent")}
            disabled={!selectedTableId || orderType === "TAKEAWAY" || orderType === "PHONE"}
          >
            <Clock className="mr-1 h-4 w-4" />
            Recent
          </Button>
        </div>

        {/* Items Grid / Recent Orders */}
        <div className="flex-1 overflow-y-auto">
          {activeTab === "recent" ? (
            <div className="space-y-3">
              {recentOrders.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center text-muted-foreground">
                    <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No recent orders for this table</p>
                  </CardContent>
                </Card>
              ) : (
                recentOrders.map((order) => (
                  <Card key={order.id} className="cursor-pointer hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">{order.orderNumber}</span>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => repeatOrder(order)}
                        >
                          <Repeat className="mr-1 h-4 w-4" />
                          Repeat
                        </Button>
                      </div>
                      <div className="space-y-1 text-sm text-muted-foreground">
                        {order.items.slice(0, 3).map((item, i) => (
                          <div key={i}>
                            {item.quantity}x {item.menuItemName}
                            {item.variantName && ` (${item.variantName})`}
                          </div>
                        ))}
                        {order.items.length > 3 && (
                          <div className="text-xs">+{order.items.length - 3} more items</div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {filteredItems.map((item) => (
                <Card
                  key={item.id}
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => {
                    if (item.variants && item.variants.length > 0) {
                      addToCart(item, item.variants[0]?.id);
                    } else {
                      addToCart(item);
                    }
                  }}
                >
                  <CardContent className="p-3">
                    <div className="font-medium text-sm truncate">{item.name}</div>
                    {item.nameLocal && (
                      <div className="text-xs text-muted-foreground truncate">
                        {item.nameLocal}
                      </div>
                    )}
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-sm font-semibold text-primary">
                        {formatCurrency(item.basePrice)}
                      </span>
                      {item.orderCount && item.orderCount > 10 && (
                        <Badge variant="secondary" className="text-xs">
                          <Star className="h-3 w-3 mr-1" />
                          Popular
                        </Badge>
                      )}
                    </div>
                    {item.variants && item.variants.length > 0 && (
                      <div className="text-xs text-muted-foreground mt-1">
                        {item.variants.length} variants
                      </div>
                    )}
                    {orderType === "TAKEAWAY" && item.packagingCharge && item.packagingCharge > 0 && (
                      <div className="text-xs text-amber-600 mt-1">
                        +{formatCurrency(item.packagingCharge)} packaging
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right Panel - Cart */}
      <div className="w-full lg:w-96 flex flex-col bg-muted/30 rounded-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Cart ({cartItemCount})
            {takeawayItemCount > 0 && (
              <Badge variant="secondary" className="ml-1">
                <Package className="h-3 w-3 mr-1" />
                {takeawayItemCount} pack
              </Badge>
            )}
          </h2>
          {cart.length > 0 && (
            <Button variant="ghost" size="sm" onClick={clearCart}>
              <X className="h-4 w-4 mr-1" />
              Clear
            </Button>
          )}
        </div>

        {/* Order Type & Table/Customer Info Summary */}
        <div className="mb-4 p-3 bg-primary/10 rounded-lg space-y-1">
          <div className="flex items-center gap-2">
            {orderType === "DINE_IN" ? (
              <UtensilsCrossed className="h-4 w-4" />
            ) : (
              <Package className="h-4 w-4" />
            )}
            <span className="text-sm font-medium">
              {orderType === "DINE_IN" ? "Dine-In" : orderType === "PHONE" ? "Phone Order" : "Take Away"}
            </span>
          </div>
          {orderType === "DINE_IN" && selectedTableId && (
            <p className="text-sm">
              Table: <strong>{tables.find((t) => t.id === selectedTableId)?.tableNumber}</strong>
            </p>
          )}
          {(orderType === "TAKEAWAY" || orderType === "PHONE") && customerPhone && (
            <>
              <p className="text-sm">
                Phone: <strong>{customerPhone}</strong>
              </p>
              {customerName && (
                <p className="text-sm">
                  Name: <strong>{customerName}</strong>
                </p>
              )}
              {selectedTableId && (
                <p className="text-sm text-muted-foreground">
                  Table: {tables.find((t) => t.id === selectedTableId)?.tableNumber}
                </p>
              )}
            </>
          )}
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto space-y-2 mb-4">
          {cart.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              <ShoppingCart className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Cart is empty</p>
              <p className="text-xs">Tap items to add</p>
            </div>
          ) : (
            cart.map((item, index) => (
              <div
                key={`${item.menuItemId}-${item.variantId}-${index}`}
                className={`bg-background rounded-lg p-3 ${item.isTakeaway ? "border-l-4 border-amber-500" : ""}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate flex items-center gap-1">
                      {item.name}
                      {item.isTakeaway && (
                        <Package className="h-3 w-3 text-amber-500" />
                      )}
                    </div>
                    {item.variantName && (
                      <div className="text-xs text-muted-foreground">
                        {item.variantName}
                      </div>
                    )}
                    <div className="text-sm text-primary">
                      {formatCurrency(item.unitPrice)}
                      {item.isTakeaway && item.packagingCharge > 0 && (
                        <span className="text-xs text-amber-600 ml-1">
                          +{formatCurrency(item.packagingCharge)}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => toggleItemTakeaway(index)}
                      title={item.isTakeaway ? "Mark as Dine-In" : "Mark as Takeaway"}
                    >
                      <Package className={`h-4 w-4 ${item.isTakeaway ? "text-amber-500" : "text-muted-foreground"}`} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => removeFromCart(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => updateCartQuantity(index, -1)}
                    >
                      <Minus className="h-3 w-3" />
                    </Button>
                    <span className="w-8 text-center font-medium">
                      {item.quantity}
                    </span>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => updateCartQuantity(index, 1)}
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                  <span className="font-semibold">
                    {formatCurrency((item.unitPrice + (item.isTakeaway ? item.packagingCharge : 0)) * item.quantity)}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 p-2 bg-red-100 text-red-700 rounded-lg flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm">{error}</span>
          </div>
        )}

        {/* Success */}
        {showSuccess && (
          <div className="mb-4 p-2 bg-green-100 text-green-700 rounded-lg flex items-center gap-2">
            <Check className="h-4 w-4" />
            <span className="text-sm">{successMessage}</span>
          </div>
        )}

        {/* Total & Submit */}
        <div className="border-t pt-4">
          {packagingTotal > 0 && (
            <div className="flex items-center justify-between mb-2 text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{formatCurrency(cartSubtotal)}</span>
            </div>
          )}
          {packagingTotal > 0 && (
            <div className="flex items-center justify-between mb-2 text-sm">
              <span className="text-amber-600 flex items-center gap-1">
                <Package className="h-3 w-3" />
                Packaging
              </span>
              <span className="text-amber-600">{formatCurrency(packagingTotal)}</span>
            </div>
          )}
          <div className="flex items-center justify-between mb-4">
            <span className="text-lg font-semibold">Total</span>
            <span className="text-xl font-bold text-primary">
              {formatCurrency(cartTotal)}
            </span>
          </div>
          <Button
            className="w-full"
            size="lg"
            disabled={
              cart.length === 0 ||
              (orderType === "DINE_IN" && !selectedTableId) ||
              ((orderType === "TAKEAWAY" || orderType === "PHONE") && !customerPhone) ||
              submitting
            }
            onClick={submitOrder}
          >
            {submitting ? (
              "Submitting..."
            ) : (
              <>
                <Send className="mr-2 h-5 w-5" />
                {orderType === "TAKEAWAY" ? "Submit Takeaway" : orderType === "PHONE" ? "Submit Phone Order" : "Submit Order"}
                <ChevronRight className="ml-2 h-5 w-5" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
