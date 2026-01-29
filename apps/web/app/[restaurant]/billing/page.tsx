"use client";

import { useState, useEffect } from "react";
import { useParams, useSearchParams } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@qr-dine/ui";
import { Button } from "@qr-dine/ui";
import { Input } from "@qr-dine/ui";
import {
  Receipt,
  DollarSign,
  CreditCard,
  Banknote,
  Smartphone,
  Loader2,
  Check,
  X,
  Printer,
  Search,
  Calendar,
  Gift,
  User,
  Crown,
  Star,
  Award,
  Medal,
  Clock,
  UtensilsCrossed,
  Phone,
  MapPin,
  Package,
  FileText,
} from "lucide-react";
import { Select } from "@qr-dine/ui";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface LoyaltyCustomer {
  id: string;
  customerId: string;
  name: string;
  phone: string;
  tier: string;
  pointsBalance: number;
}

interface LoyaltySettings {
  enabled: boolean;
  pointValue: number;
  minRedeemPoints: number;
  maxRedeemPercentage: number;
}

const tierConfig: Record<string, { icon: React.ElementType; color: string; bgColor: string }> = {
  BRONZE: { icon: Medal, color: "text-amber-700", bgColor: "bg-amber-100" },
  SILVER: { icon: Award, color: "text-gray-500", bgColor: "bg-gray-100" },
  GOLD: { icon: Star, color: "text-yellow-500", bgColor: "bg-yellow-100" },
  PLATINUM: { icon: Crown, color: "text-purple-600", bgColor: "bg-purple-100" },
};

interface OrderItem {
  id: string;
  menuItemName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  orderNumber?: string;
  orderSource?: string;
  servedAt?: string | null;
  orderedAt?: string | null;
}

interface Order {
  id: string;
  orderNumber: string;
  orderType?: string;
  orderSource?: string;
  table: { id?: string; tableNumber: string; name: string | null } | null;
  tableId?: string | null;
  items: OrderItem[];
  subtotal: number;
  totalAmount: number;
  status: string;
  // Takeaway/Phone order customer info
  takeawayCustomerName?: string | null;
  takeawayCustomerPhone?: string | null;
  pickupToken?: string | null;
}

interface Payment {
  id: string;
  amount: number;
  method: string;
  processedAt: string;
  processedBy?: { name: string };
}

interface Bill {
  id: string;
  billNumber: string;
  order: Order;
  customer: { name: string; phone: string } | null;
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  serviceCharge: number;
  totalAmount: number;
  status: string;
  paymentStatus: string;
  payments: Payment[];
  generatedAt: string;
  generatedBy?: { name: string };
  // Combined items from all orders in the session
  combinedItems?: OrderItem[];
  orderCount?: number;
  allOrders?: Array<{ id: string; orderNumber: string; orderSource: string; placedAt: string; servedAt?: string | null; items: OrderItem[] }>;
  // Order timing info
  firstOrderedAt?: string;
  lastServedAt?: string;
}

const paymentMethods = [
  { value: "CASH", label: "Cash", icon: Banknote },
  { value: "CARD", label: "Card", icon: CreditCard },
  { value: "ESEWA", label: "eSewa", icon: Smartphone },
  { value: "FONEPAY", label: "FonePay", icon: Smartphone },
];

export default function BillingPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const restaurant = params.restaurant as string;
  const billIdFromUrl = searchParams.get("billId");

  const [loading, setLoading] = useState(true);
  const [bills, setBills] = useState<Bill[]>([]);
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null);
  const [filter, setFilter] = useState<"all" | "open" | "paid">("open");
  const [processing, setProcessing] = useState(false);
  const [initialBillLoaded, setInitialBillLoaded] = useState(false);

  // Payment form state
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [cashReceived, setCashReceived] = useState("");

  // Loyalty state
  const [loyaltySettings, setLoyaltySettings] = useState<LoyaltySettings | null>(null);
  const [customerPhone, setCustomerPhone] = useState("");
  const [searchingCustomer, setSearchingCustomer] = useState(false);
  const [linkedCustomer, setLinkedCustomer] = useState<LoyaltyCustomer | null>(null);
  const [pointsToRedeem, setPointsToRedeem] = useState("");
  const [maxRedeemable, setMaxRedeemable] = useState(0);
  const [loyaltyResult, setLoyaltyResult] = useState<{
    pointsEarned: number;
    newBalance: number;
    tierUpgrade: boolean;
    newTier: string | null;
  } | null>(null);

  // IRD Invoice state
  const [invoiceCreated, setInvoiceCreated] = useState<{
    id: string;
    invoiceNumber: string;
    fiscalYear: string;
    invoiceDateBs: string;
    totalAmount: number;
  } | null>(null);

  // Table assignment state
  const [tables, setTables] = useState<Array<{ id: string; tableNumber: string; name: string | null; status: string }>>([]);
  const [assigningTable, setAssigningTable] = useState(false);

  useEffect(() => {
    fetchBills();
    fetchLoyaltySettings();
    fetchTables();
  }, [filter]);

  const fetchTables = async () => {
    try {
      const res = await fetch("/api/tables");
      if (res.ok) {
        const data = await res.json();
        setTables(data.tables || []);
      }
    } catch (error) {
      console.error("Error fetching tables:", error);
    }
  };

  const assignTableToOrder = async (tableId: string) => {
    if (!selectedBill) return;

    setAssigningTable(true);
    try {
      const res = await fetch(`/api/orders/${selectedBill.order.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tableId }),
      });

      if (res.ok) {
        // Refresh the bill to get updated table info
        selectBill(selectedBill.id);
        fetchBills();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to assign table");
      }
    } catch (error) {
      console.error("Error assigning table:", error);
      alert("Failed to assign table");
    } finally {
      setAssigningTable(false);
    }
  };

  const fetchLoyaltySettings = async () => {
    try {
      const res = await fetch("/api/loyalty/settings");
      if (res.ok) {
        const data = await res.json();
        setLoyaltySettings(data.settings);
      }
    } catch (error) {
      console.error("Error fetching loyalty settings:", error);
    }
  };

  const searchCustomerByPhone = async () => {
    if (!customerPhone || customerPhone.length < 10) return;

    setSearchingCustomer(true);
    try {
      const res = await fetch(`/api/loyalty/customers?search=${customerPhone}&limit=1`);
      if (res.ok) {
        const data = await res.json();
        if (data.customers && data.customers.length > 0) {
          const customer = data.customers[0];
          setLinkedCustomer(customer);
          calculateMaxRedeemable(customer.pointsBalance);
        } else {
          setLinkedCustomer(null);
          alert("Customer not found. They may not be registered in the loyalty program.");
        }
      }
    } catch (error) {
      console.error("Error searching customer:", error);
    } finally {
      setSearchingCustomer(false);
    }
  };

  const calculateMaxRedeemable = (availablePoints: number) => {
    if (!selectedBill || !loyaltySettings?.enabled) {
      setMaxRedeemable(0);
      return;
    }

    if (availablePoints < loyaltySettings.minRedeemPoints) {
      setMaxRedeemable(0);
      return;
    }

    // Max discount based on percentage
    const maxDiscountAmount = (selectedBill.totalAmount * loyaltySettings.maxRedeemPercentage) / 100;
    const maxPointsForDiscount = Math.floor(maxDiscountAmount / loyaltySettings.pointValue);

    setMaxRedeemable(Math.min(availablePoints, maxPointsForDiscount));
  };

  const clearLinkedCustomer = () => {
    setLinkedCustomer(null);
    setCustomerPhone("");
    setPointsToRedeem("");
    setMaxRedeemable(0);
  };

  // Auto-select bill from URL parameter
  useEffect(() => {
    if (billIdFromUrl && !initialBillLoaded) {
      selectBill(billIdFromUrl);
      setInitialBillLoaded(true);
    }
  }, [billIdFromUrl, initialBillLoaded]);

  const fetchBills = async () => {
    setLoading(true);
    try {
      const statusParam = filter === "all" ? "" : `?status=${filter.toUpperCase()}`;
      const res = await fetch(`/api/bills${statusParam}`);
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setBills(data.bills);
    } catch (error) {
      console.error("Error fetching bills:", error);
    } finally {
      setLoading(false);
    }
  };

  const selectBill = async (billId: string) => {
    try {
      const res = await fetch(`/api/bills/${billId}`);
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setSelectedBill(data.bill);
      setPaymentAmount(data.bill.totalAmount.toString());

      // Reset loyalty state for new bill
      clearLinkedCustomer();
      setLoyaltyResult(null);
      setInvoiceCreated(null);

      // If bill already has a customer, load their info
      if (data.bill.customer || data.bill.order?.customer) {
        const customer = data.bill.customer || data.bill.order?.customer;
        if (customer.id) {
          // Fetch full customer details for points
          const custRes = await fetch(`/api/loyalty/customers/${customer.id}`);
          if (custRes.ok) {
            const custData = await custRes.json();
            setLinkedCustomer(custData.customer);
            setCustomerPhone(custData.customer.phone);
            calculateMaxRedeemable(custData.customer.pointsBalance);
          }
        }
      }
    } catch (error) {
      console.error("Error fetching bill:", error);
    }
  };

  const processPayment = async () => {
    if (!selectedBill) return;

    setProcessing(true);
    try {
      // First, link customer to bill if we have one
      if (linkedCustomer && !selectedBill.customer) {
        await fetch(`/api/bills/${selectedBill.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ customerId: linkedCustomer.id }),
        });
      }

      const res = await fetch(`/api/bills/${selectedBill.id}/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: parseFloat(paymentAmount),
          method: paymentMethod,
          cashReceived: paymentMethod === "CASH" ? parseFloat(cashReceived) : null,
          pointsToRedeem: pointsToRedeem ? parseInt(pointsToRedeem) : undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to process payment");
      }

      const data = await res.json();
      setSelectedBill(data.bill);
      fetchBills();

      // Store loyalty result for display
      if (data.loyalty) {
        setLoyaltyResult(data.loyalty);
      }

      // Store invoice info if created
      if (data.invoice) {
        setInvoiceCreated(data.invoice);
      }

      // Reset form
      setCashReceived("");
      setPointsToRedeem("");
    } catch (error) {
      console.error("Error processing payment:", error);
      alert(error instanceof Error ? error.message : "Failed to process payment");
    } finally {
      setProcessing(false);
    }
  };

  const printReceipt = () => {
    if (!selectedBill) return;

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Receipt - ${selectedBill.billNumber}</title>
          <style>
            body {
              font-family: 'Courier New', monospace;
              width: 300px;
              margin: 0 auto;
              padding: 20px;
              font-size: 12px;
            }
            .header {
              text-align: center;
              border-bottom: 1px dashed #000;
              padding-bottom: 10px;
              margin-bottom: 10px;
            }
            .header h1 {
              margin: 0;
              font-size: 18px;
            }
            .info {
              margin-bottom: 10px;
            }
            .items {
              border-top: 1px dashed #000;
              border-bottom: 1px dashed #000;
              padding: 10px 0;
            }
            .item {
              display: flex;
              justify-content: space-between;
              margin: 5px 0;
            }
            .totals {
              padding: 10px 0;
            }
            .total-row {
              display: flex;
              justify-content: space-between;
              margin: 5px 0;
            }
            .grand-total {
              font-size: 16px;
              font-weight: bold;
              border-top: 1px solid #000;
              padding-top: 10px;
              margin-top: 10px;
            }
            .footer {
              text-align: center;
              margin-top: 20px;
              font-size: 10px;
            }
            @media print {
              body { width: 80mm; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>${restaurant.replace(/-/g, " ").toUpperCase()}</h1>
            <p>Receipt</p>
          </div>
          <div class="info">
            <p>Bill #: ${selectedBill.billNumber}</p>
            <p>${selectedBill.orderCount && selectedBill.orderCount > 1 ? `${selectedBill.orderCount} Orders Combined` : `Order #: ${selectedBill.order.orderNumber}`}</p>
            ${selectedBill.order.table ? `<p>Table: ${selectedBill.order.table.tableNumber}</p>` : ""}
            ${(selectedBill.order.orderType === "PHONE" || selectedBill.order.orderType === "TAKEAWAY") ? `
              <p style="font-weight: bold; margin-top: 5px;">${selectedBill.order.orderType === "PHONE" ? "PHONE ORDER" : "TAKEAWAY"}${selectedBill.order.pickupToken ? ` - ${selectedBill.order.pickupToken}` : ""}</p>
              ${selectedBill.order.takeawayCustomerName ? `<p>Customer: ${selectedBill.order.takeawayCustomerName}</p>` : ""}
              ${selectedBill.order.takeawayCustomerPhone ? `<p>Phone: ${selectedBill.order.takeawayCustomerPhone}</p>` : ""}
            ` : ""}
            <p>Date: ${new Date(selectedBill.generatedAt).toLocaleString()}</p>
            ${selectedBill.firstOrderedAt ? `<p>Post Time: ${new Date(selectedBill.firstOrderedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>` : ""}
            ${selectedBill.payments.length > 0 && selectedBill.payments[selectedBill.payments.length - 1] ? `<p>End Time: ${new Date(selectedBill.payments[selectedBill.payments.length - 1]!.processedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>` : ""}
          </div>
          <div class="items">
            ${(selectedBill.combinedItems || selectedBill.order.items)
              .map(
                (item) => {
                  const itemOrder = selectedBill.allOrders?.find(
                    (o) => o.orderNumber === item.orderNumber
                  );
                  const orderedAt = itemOrder?.placedAt;
                  const orderSource = item.orderSource || itemOrder?.orderSource || "STAFF";
                  const isGuestOrder = orderSource === "QR";
                  return `
              <div class="item" style="flex-direction: column; align-items: flex-start; margin-bottom: 8px;">
                <div style="display: flex; justify-content: space-between; width: 100%;">
                  <span>${item.quantity}x ${item.menuItemName}${item.orderNumber ? ` (${item.orderNumber})` : ''} [${isGuestOrder ? 'Guest' : 'Staff'}]</span>
                  <span>Rs.${item.totalPrice.toFixed(0)}</span>
                </div>
                ${orderedAt ? `<div style="font-size: 10px; color: #666; margin-top: 2px;">
                  ${new Date(orderedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}${item.servedAt ? ` - ${Math.round((new Date(item.servedAt).getTime() - new Date(orderedAt).getTime()) / 60000)}min - ${new Date(item.servedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ''}
                </div>` : ''}
              </div>
            `;
                }
              )
              .join("")}
          </div>
          <div class="totals">
            <div class="total-row">
              <span>Subtotal:</span>
              <span>Rs.${selectedBill.subtotal.toFixed(0)}</span>
            </div>
            ${
              selectedBill.discountAmount > 0
                ? `
            <div class="total-row">
              <span>Discount:</span>
              <span>-Rs.${selectedBill.discountAmount.toFixed(0)}</span>
            </div>
            `
                : ""
            }
            <div class="total-row">
              <span>Tax:</span>
              <span>Rs.${selectedBill.taxAmount.toFixed(0)}</span>
            </div>
            <div class="total-row">
              <span>Service Charge:</span>
              <span>Rs.${selectedBill.serviceCharge.toFixed(0)}</span>
            </div>
            <div class="total-row grand-total">
              <span>TOTAL:</span>
              <span>Rs.${selectedBill.totalAmount.toFixed(0)}</span>
            </div>
            ${
              selectedBill.payments.length > 0
                ? `
            <div style="margin-top: 10px; border-top: 1px dashed #000; padding-top: 10px;">
              <p><strong>Payments:</strong></p>
              ${selectedBill.payments
                .map(
                  (p) => `
                <div class="total-row">
                  <span>${p.method}:</span>
                  <span>Rs.${p.amount.toFixed(0)}</span>
                </div>
              `
                )
                .join("")}
            </div>
            `
                : ""
            }
          </div>
          <div class="footer">
            <p>Thank you for dining with us!</p>
            <p>Please visit again</p>
          </div>
          <script>
            window.onload = function() { window.print(); window.close(); }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const formatCurrency = (amount: number) => `Rs.${amount.toFixed(0)}`;

  const getStatusColor = (status: string) => {
    switch (status) {
      case "OPEN":
        return "bg-yellow-100 text-yellow-800";
      case "PARTIALLY_PAID":
        return "bg-blue-100 text-blue-800";
      case "PAID":
        return "bg-green-100 text-green-800";
      case "CANCELLED":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const change =
    paymentMethod === "CASH" && cashReceived
      ? parseFloat(cashReceived) - parseFloat(paymentAmount || "0")
      : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Billing</h1>
          <p className="text-muted-foreground">Manage bills and process payments</p>
        </div>
        <Link href={`/${restaurant}/billing/eod`}>
          <Button variant="outline">
            <Calendar className="h-4 w-4 mr-2" />
            EOD Settlement
          </Button>
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Bills List */}
        <div className="lg:col-span-1 space-y-4">
          {/* Filter */}
          <div className="flex gap-2">
            <Button
              variant={filter === "open" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter("open")}
            >
              Open
            </Button>
            <Button
              variant={filter === "paid" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter("paid")}
            >
              Paid
            </Button>
            <Button
              variant={filter === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter("all")}
            >
              All
            </Button>
          </div>

          {/* Bills */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Receipt className="h-5 w-5" />
                Bills ({bills.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : bills.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No {filter !== "all" ? filter : ""} bills found
                </p>
              ) : (
                <div className="space-y-2 max-h-[500px] overflow-y-auto">
                  {bills.map((bill) => (
                    <div
                      key={bill.id}
                      className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                        selectedBill?.id === bill.id
                          ? "border-primary bg-primary/5"
                          : "hover:bg-muted"
                      }`}
                      onClick={() => selectBill(bill.id)}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium">{bill.billNumber}</p>
                          <p className="text-sm text-muted-foreground">
                            {bill.order.orderNumber}
                            {bill.order.table &&
                              ` · Table ${bill.order.table.tableNumber}`}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">
                            {formatCurrency(bill.totalAmount)}
                          </p>
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full ${getStatusColor(
                              bill.status
                            )}`}
                          >
                            {bill.status}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Bill Details & Payment */}
        <div className="lg:col-span-2">
          {selectedBill ? (
            <div className="space-y-4">
              {/* Bill Details */}
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle>{selectedBill.billNumber}</CardTitle>
                      <CardDescription>
                        {selectedBill.orderCount && selectedBill.orderCount > 1
                          ? `${selectedBill.orderCount} orders combined`
                          : selectedBill.order.orderNumber}
                        {selectedBill.order.table &&
                          ` · Table ${selectedBill.order.table.tableNumber}`}
                      </CardDescription>
                      {/* Session Timing Info */}
                      <div className="flex flex-wrap gap-4 mt-2 text-sm">
                        {selectedBill.firstOrderedAt && (
                          <div className="flex items-center gap-1.5 text-muted-foreground">
                            <Clock className="h-3.5 w-3.5" />
                            <span>Post Time: {new Date(selectedBill.firstOrderedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                        )}
                        {selectedBill.payments.length > 0 && selectedBill.payments[selectedBill.payments.length - 1] && (
                          <div className="flex items-center gap-1.5 text-muted-foreground">
                            <UtensilsCrossed className="h-3.5 w-3.5" />
                            <span>End Time: {new Date(selectedBill.payments[selectedBill.payments.length - 1]!.processedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                        )}
                      </div>

                      {/* Phone/Takeaway Customer Details */}
                      {(selectedBill.order.orderType === "PHONE" || selectedBill.order.orderType === "TAKEAWAY") && (
                        <div className="mt-3 p-3 bg-amber-50 rounded-lg border border-amber-200">
                          <div className="flex items-center gap-2 mb-2">
                            <Package className="h-4 w-4 text-amber-600" />
                            <span className="font-medium text-amber-800">
                              {selectedBill.order.orderType === "PHONE" ? "Phone Order" : "Takeaway Order"}
                              {selectedBill.order.pickupToken && ` · ${selectedBill.order.pickupToken}`}
                            </span>
                          </div>
                          {(selectedBill.order.takeawayCustomerName || selectedBill.order.takeawayCustomerPhone) && (
                            <div className="space-y-1 text-sm">
                              {selectedBill.order.takeawayCustomerName && (
                                <div className="flex items-center gap-2 text-muted-foreground">
                                  <User className="h-3.5 w-3.5" />
                                  <span>{selectedBill.order.takeawayCustomerName}</span>
                                </div>
                              )}
                              {selectedBill.order.takeawayCustomerPhone && (
                                <div className="flex items-center gap-2 text-muted-foreground">
                                  <Phone className="h-3.5 w-3.5" />
                                  <span>{selectedBill.order.takeawayCustomerPhone}</span>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Table Assignment for Phone Orders */}
                          {!selectedBill.order.table && (
                            <div className="mt-3 pt-3 border-t border-amber-200">
                              <div className="flex gap-2 items-end">
                                <div className="flex-1">
                                  <Select
                                    placeholder="Assign to table"
                                    options={tables
                                      .filter((t) => t.status === "AVAILABLE" || t.status === "OCCUPIED")
                                      .map((table) => ({
                                        value: table.id,
                                        label: `Table ${table.tableNumber}${table.name ? ` (${table.name})` : ''}`,
                                      }))}
                                    onChange={assignTableToOrder}
                                    disabled={assigningTable}
                                  />
                                </div>
                                {assigningTable && <Loader2 className="h-5 w-5 animate-spin text-amber-600" />}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={printReceipt}>
                        <Printer className="h-4 w-4 mr-1" />
                        Print
                      </Button>
                      <span
                        className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(
                          selectedBill.status
                        )}`}
                      >
                        {selectedBill.status}
                      </span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {/* Order Items - use combinedItems if available */}
                  <div className="space-y-3 mb-4">
                    {(selectedBill.combinedItems || selectedBill.order.items).map((item) => {
                      // Find the order's placedAt time for this item
                      const itemOrder = selectedBill.allOrders?.find(
                        (o) => o.orderNumber === item.orderNumber
                      );
                      const orderedAt = itemOrder?.placedAt;
                      const orderSource = item.orderSource || itemOrder?.orderSource || "STAFF";
                      const isGuestOrder = orderSource === "QR";

                      return (
                        <div
                          key={item.id}
                          className="flex justify-between text-sm border-b pb-2 last:border-b-0"
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-medium">
                                {item.quantity}x {item.menuItemName}
                              </span>
                              {item.orderNumber && (
                                <span className="text-xs bg-muted px-1.5 py-0.5 rounded">
                                  {item.orderNumber}
                                </span>
                              )}
                              <span className={`text-xs px-1.5 py-0.5 rounded ${isGuestOrder ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}`}>
                                {isGuestOrder ? 'Guest' : 'Staff'}
                              </span>
                            </div>
                            {orderedAt && (
                              <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                                <Clock className="h-3 w-3" />
                                <span>
                                  {new Date(orderedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  {item.servedAt && (() => {
                                    const orderedTime = new Date(orderedAt).getTime();
                                    const servedTime = new Date(item.servedAt).getTime();
                                    const diffMinutes = Math.round((servedTime - orderedTime) / 60000);
                                    return ` - ${diffMinutes}min - ${new Date(item.servedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
                                  })()}
                                </span>
                              </div>
                            )}
                          </div>
                          <span className="font-medium">{formatCurrency(item.totalPrice)}</span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Totals */}
                  <div className="border-t pt-4 space-y-2">
                    <div className="flex justify-between">
                      <span>Subtotal</span>
                      <span>{formatCurrency(selectedBill.subtotal)}</span>
                    </div>
                    {selectedBill.discountAmount > 0 && (
                      <div className="flex justify-between text-green-600">
                        <span>Discount</span>
                        <span>-{formatCurrency(selectedBill.discountAmount)}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span>Tax</span>
                      <span>{formatCurrency(selectedBill.taxAmount)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Service Charge</span>
                      <span>{formatCurrency(selectedBill.serviceCharge)}</span>
                    </div>
                    <div className="flex justify-between text-lg font-bold border-t pt-2">
                      <span>Total</span>
                      <span>{formatCurrency(selectedBill.totalAmount)}</span>
                    </div>
                  </div>

                  {/* Existing Payments */}
                  {selectedBill.payments.length > 0 && (
                    <div className="border-t mt-4 pt-4">
                      <p className="font-medium mb-2">Payments</p>
                      {selectedBill.payments.map((payment) => (
                        <div
                          key={payment.id}
                          className="flex justify-between text-sm"
                        >
                          <span className="flex items-center gap-1">
                            <Check className="h-3 w-3 text-green-500" />
                            {payment.method}
                          </span>
                          <span>{formatCurrency(payment.amount)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Loyalty Customer Section */}
              {loyaltySettings?.enabled && (selectedBill.status === "OPEN" || selectedBill.status === "PARTIALLY_PAID") && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Gift className="h-5 w-5" />
                      Loyalty Points
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {linkedCustomer ? (
                      <>
                        {/* Linked Customer Info */}
                        <div className={cn("p-4 rounded-lg", tierConfig[linkedCustomer.tier]?.bgColor || "bg-gray-100")}>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              {(() => {
                                const TierIcon = tierConfig[linkedCustomer.tier]?.icon || Medal;
                                return <TierIcon className={cn("h-6 w-6", tierConfig[linkedCustomer.tier]?.color || "text-gray-500")} />;
                              })()}
                              <div>
                                <p className="font-medium">{linkedCustomer.name}</p>
                                <p className="text-sm text-muted-foreground">{linkedCustomer.phone}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-2xl font-bold">{linkedCustomer.pointsBalance.toLocaleString()}</p>
                              <p className="text-sm text-muted-foreground">points available</p>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="mt-2"
                            onClick={clearLinkedCustomer}
                          >
                            <X className="h-4 w-4 mr-1" />
                            Unlink Customer
                          </Button>
                        </div>

                        {/* Points Redemption */}
                        {maxRedeemable > 0 && (
                          <div className="space-y-2">
                            <label className="text-sm font-medium">Redeem Points</label>
                            <div className="flex gap-2">
                              <Input
                                type="number"
                                placeholder="Points to redeem"
                                value={pointsToRedeem}
                                onChange={(e) => {
                                  const val = parseInt(e.target.value) || 0;
                                  setPointsToRedeem(Math.min(val, maxRedeemable).toString());
                                }}
                                max={maxRedeemable}
                              />
                              <Button
                                variant="outline"
                                onClick={() => setPointsToRedeem(maxRedeemable.toString())}
                              >
                                Max ({maxRedeemable})
                              </Button>
                            </div>
                            {pointsToRedeem && parseInt(pointsToRedeem) > 0 && (
                              <p className="text-sm text-green-600">
                                Discount: Rs. {(parseInt(pointsToRedeem) * (loyaltySettings?.pointValue || 1)).toLocaleString()}
                              </p>
                            )}
                            <p className="text-xs text-muted-foreground">
                              Min {loyaltySettings.minRedeemPoints} points • Max {loyaltySettings.maxRedeemPercentage}% of bill
                            </p>
                          </div>
                        )}

                        {maxRedeemable === 0 && linkedCustomer.pointsBalance < loyaltySettings.minRedeemPoints && (
                          <p className="text-sm text-muted-foreground">
                            Need at least {loyaltySettings.minRedeemPoints} points to redeem
                          </p>
                        )}
                      </>
                    ) : (
                      <>
                        {/* Customer Search */}
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Link Loyalty Customer</label>
                          <div className="flex gap-2">
                            <Input
                              placeholder="Enter phone number"
                              value={customerPhone}
                              onChange={(e) => setCustomerPhone(e.target.value)}
                              onKeyDown={(e) => e.key === "Enter" && searchCustomerByPhone()}
                            />
                            <Button
                              variant="outline"
                              onClick={searchCustomerByPhone}
                              disabled={searchingCustomer || customerPhone.length < 10}
                            >
                              {searchingCustomer ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Search className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Link a customer to earn points on this purchase
                          </p>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Loyalty Result after Payment */}
              {loyaltyResult && selectedBill.status === "PAID" && (
                <Card className="border-green-200 bg-green-50">
                  <CardContent className="py-4">
                    <div className="flex items-center gap-3">
                      <Gift className="h-6 w-6 text-green-600" />
                      <div>
                        <p className="font-medium text-green-800">
                          {loyaltyResult.pointsEarned} points earned!
                        </p>
                        <p className="text-sm text-green-600">
                          New balance: {loyaltyResult.newBalance.toLocaleString()} points
                        </p>
                        {loyaltyResult.tierUpgrade && (
                          <p className="text-sm font-medium text-purple-600 mt-1">
                            Tier upgraded to {loyaltyResult.newTier}!
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* IRD Invoice Created */}
              {invoiceCreated && selectedBill.status === "PAID" && (
                <Card className="border-blue-200 bg-blue-50">
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <FileText className="h-6 w-6 text-blue-600" />
                        <div>
                          <p className="font-medium text-blue-800">
                            IRD Invoice Generated
                          </p>
                          <p className="text-sm text-blue-600">
                            Invoice #: {invoiceCreated.invoiceNumber}
                          </p>
                          <p className="text-xs text-blue-500">
                            FY {invoiceCreated.fiscalYear} · {invoiceCreated.invoiceDateBs} (BS)
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-blue-300 text-blue-700 hover:bg-blue-100"
                        onClick={() => window.open(`/${restaurant}/invoices/${invoiceCreated.id}`, '_blank')}
                      >
                        <Printer className="h-4 w-4 mr-1" />
                        Print Invoice
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Payment Form */}
              {(selectedBill.status === "OPEN" || selectedBill.status === "PARTIALLY_PAID") && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <DollarSign className="h-5 w-5" />
                      Process Payment
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Payment Method */}
                    <div className="grid grid-cols-4 gap-2">
                      {paymentMethods.map((method) => (
                        <Button
                          key={method.value}
                          variant={
                            paymentMethod === method.value ? "default" : "outline"
                          }
                          className="flex flex-col gap-1 h-auto py-3"
                          onClick={() => setPaymentMethod(method.value)}
                        >
                          <method.icon className="h-5 w-5" />
                          <span className="text-xs">{method.label}</span>
                        </Button>
                      ))}
                    </div>

                    {/* Amount */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Amount</label>
                      <Input
                        type="number"
                        value={paymentAmount}
                        onChange={(e) => setPaymentAmount(e.target.value)}
                        placeholder="Enter amount"
                      />
                    </div>

                    {/* Cash Received */}
                    {paymentMethod === "CASH" && (
                      <>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">
                            Cash Received
                          </label>
                          <Input
                            type="number"
                            value={cashReceived}
                            onChange={(e) => setCashReceived(e.target.value)}
                            placeholder="Enter cash received"
                          />
                        </div>
                        {change > 0 && (
                          <div className="p-3 bg-green-50 rounded-lg">
                            <p className="text-sm text-green-600">Change to give:</p>
                            <p className="text-2xl font-bold text-green-700">
                              {formatCurrency(change)}
                            </p>
                          </div>
                        )}
                      </>
                    )}

                    {/* Quick Cash Buttons */}
                    {paymentMethod === "CASH" && (
                      <div className="grid grid-cols-4 gap-2">
                        {[500, 1000, 2000, 5000].map((amount) => (
                          <Button
                            key={amount}
                            variant="outline"
                            size="sm"
                            onClick={() => setCashReceived(amount.toString())}
                          >
                            Rs.{amount}
                          </Button>
                        ))}
                      </div>
                    )}

                    {/* Submit */}
                    <Button
                      className="w-full"
                      size="lg"
                      onClick={processPayment}
                      disabled={
                        processing ||
                        !paymentAmount ||
                        (paymentMethod === "CASH" && !cashReceived)
                      }
                    >
                      {processing ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Check className="h-4 w-4 mr-2" />
                      )}
                      Complete Payment
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Receipt className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-lg font-medium">Select a bill</p>
                <p className="text-muted-foreground">
                  Choose a bill from the list to view details and process payment
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
