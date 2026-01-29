"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@qr-dine/ui";
import {
  Printer,
  ArrowLeft,
  Loader2,
  AlertCircle,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Ban,
  X,
} from "lucide-react";

interface InvoiceItem {
  id: string;
  serialNumber: number;
  description: string;
  descriptionLocal?: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

interface Invoice {
  id: string;
  invoiceNumber: string;
  fiscalYear: string;
  invoiceDateBs: string;
  invoiceDateAd: string;
  sellerPan: string;
  sellerName: string;
  sellerAddress: string;
  sellerPhone?: string;
  buyerPan?: string;
  buyerName: string;
  buyerAddress?: string;
  subtotal: number;
  discountAmount: number;
  discountReason?: string;
  taxableAmount: number;
  vatRate: number;
  vatAmount: number;
  serviceChargeRate?: number;
  serviceCharge: number;
  totalAmount: number;
  amountInWords?: string;
  status: string;
  isCancelled: boolean;
  cancelledAt?: string;
  cancellationReason?: string;
  printCount: number;
  paymentMethod?: string;
  cbmsSynced: boolean;
  items: InvoiceItem[];
  createdAt: string;
}

export default function InvoiceViewPage() {
  const params = useParams();
  const router = useRouter();
  const restaurant = params.restaurant as string;
  const invoiceId = params.id as string;
  const printRef = useRef<HTMLDivElement>(null);

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [printing, setPrinting] = useState(false);
  const [copyLabel, setCopyLabel] = useState<string>("ORIGINAL");
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  useEffect(() => {
    fetchInvoice();
  }, [invoiceId]);

  const fetchInvoice = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/invoices/${invoiceId}`);
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to fetch invoice");
      }
      const data = await res.json();
      setInvoice(data.invoice);
      if (data.invoice.printCount > 0) {
        setCopyLabel(`COPY ${data.invoice.printCount}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load invoice");
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = async () => {
    try {
      setPrinting(true);
      // Track print
      const res = await fetch(`/api/invoices/${invoiceId}/print`, {
        method: "POST",
      });
      if (res.ok) {
        const data = await res.json();
        setCopyLabel(data.copyLabel || "COPY");
        setInvoice(data.invoice);
      }
      // Print
      window.print();
    } catch (err) {
      console.error("Print error:", err);
    } finally {
      setPrinting(false);
    }
  };

  const handleCancelInvoice = async () => {
    if (!cancelReason.trim()) {
      setCancelError("Please provide a cancellation reason");
      return;
    }

    try {
      setCancelling(true);
      setCancelError(null);
      const res = await fetch(`/api/invoices/${invoiceId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: cancelReason.trim() }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to cancel invoice");
      }

      const data = await res.json();
      setInvoice(data.invoice);
      setShowCancelDialog(false);
      setCancelReason("");
    } catch (err) {
      setCancelError(err instanceof Error ? err.message : "Failed to cancel invoice");
    } finally {
      setCancelling(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-NP", {
      style: "currency",
      currency: "NPR",
      minimumFractionDigits: 2,
    }).format(amount).replace("NPR", "Rs.");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <AlertCircle className="h-12 w-12 text-red-500" />
        <p className="text-lg text-red-600">{error || "Invoice not found"}</p>
        <Button onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Go Back
        </Button>
      </div>
    );
  }

  return (
    <>
      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #invoice-print-area,
          #invoice-print-area * {
            visibility: visible;
          }
          #invoice-print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      {/* Cancel Dialog */}
      {showCancelDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 no-print">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold text-red-600 flex items-center gap-2">
                <Ban className="h-5 w-5" />
                Cancel Invoice
              </h3>
              <button
                onClick={() => {
                  setShowCancelDialog(false);
                  setCancelReason("");
                  setCancelError(null);
                }}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-lg text-sm">
                <p className="font-medium text-yellow-800">Warning: This action cannot be undone!</p>
                <p className="text-yellow-700 mt-1">
                  Invoice #{invoice.invoiceNumber} will be marked as cancelled. The invoice number cannot be reused.
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Cancellation Reason <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="Enter reason for cancellation..."
                  className="w-full border rounded-md p-2 text-sm min-h-[80px]"
                  autoFocus
                />
              </div>
              {cancelError && (
                <div className="text-sm text-red-600 flex items-center gap-1">
                  <AlertCircle className="h-4 w-4" />
                  {cancelError}
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2 p-4 border-t bg-gray-50">
              <Button
                variant="outline"
                onClick={() => {
                  setShowCancelDialog(false);
                  setCancelReason("");
                  setCancelError(null);
                }}
                disabled={cancelling}
              >
                Keep Invoice
              </Button>
              <Button
                variant="destructive"
                onClick={handleCancelInvoice}
                disabled={cancelling || !cancelReason.trim()}
                className="bg-red-600 hover:bg-red-700"
              >
                {cancelling ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Ban className="h-4 w-4 mr-2" />
                )}
                Cancel Invoice
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Header Actions - Not printed */}
      <div className="no-print bg-white border-b p-4 flex items-center justify-between sticky top-0 z-10">
        <Button variant="ghost" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div className="flex items-center gap-2">
          {invoice.isCancelled ? (
            <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full flex items-center gap-1">
              <XCircle className="h-3 w-3" />
              Cancelled
            </span>
          ) : invoice.cbmsSynced ? (
            <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" />
              CBMS Synced
            </span>
          ) : (
            <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full flex items-center gap-1">
              <RefreshCw className="h-3 w-3" />
              Pending CBMS
            </span>
          )}
          {!invoice.isCancelled && (
            <Button
              variant="outline"
              onClick={() => setShowCancelDialog(true)}
              className="text-red-600 border-red-200 hover:bg-red-50"
            >
              <Ban className="h-4 w-4 mr-2" />
              Cancel Invoice
            </Button>
          )}
          <Button onClick={handlePrint} disabled={printing}>
            {printing ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Printer className="h-4 w-4 mr-2" />
            )}
            Print Invoice
          </Button>
        </div>
      </div>

      {/* Invoice Content - Printable */}
      <div id="invoice-print-area" ref={printRef} className="max-w-3xl mx-auto p-8 bg-white">
        {/* Cancelled Watermark */}
        {invoice.isCancelled && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
            <span className="text-8xl font-bold text-red-200 rotate-[-30deg] opacity-50">
              CANCELLED
            </span>
          </div>
        )}

        {/* Header */}
        <div className="text-center border-b-2 border-black pb-4 mb-4">
          <h1 className="text-2xl font-bold">{invoice.sellerName}</h1>
          <p className="text-sm text-gray-600">{invoice.sellerAddress}</p>
          {invoice.sellerPhone && (
            <p className="text-sm text-gray-600">Tel: {invoice.sellerPhone}</p>
          )}
          <p className="text-sm font-medium mt-1">PAN/VAT No: {invoice.sellerPan}</p>
        </div>

        {/* Title */}
        <div className="text-center mb-4">
          <h2 className="text-xl font-bold">TAX INVOICE / कर बीजक</h2>
          <p className="text-sm text-gray-500">
            {copyLabel !== "ORIGINAL" && (
              <span className="font-bold text-red-600">[{copyLabel}]</span>
            )}
          </p>
        </div>

        {/* Invoice Details */}
        <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
          <div className="space-y-1">
            <p><strong>Invoice No:</strong> {invoice.invoiceNumber}</p>
            <p><strong>Fiscal Year:</strong> {invoice.fiscalYear}</p>
            <p><strong>Date (BS):</strong> {invoice.invoiceDateBs}</p>
            <p><strong>Date (AD):</strong> {formatDate(invoice.invoiceDateAd)}</p>
          </div>
          <div className="space-y-1 text-right">
            <p><strong>Payment:</strong> {invoice.paymentMethod || "CASH"}</p>
            <p><strong>Print Count:</strong> {invoice.printCount}</p>
          </div>
        </div>

        {/* Buyer Details */}
        <div className="border p-3 mb-4 bg-gray-50 text-sm">
          <p><strong>Buyer / खरीददार:</strong> {invoice.buyerName}</p>
          {invoice.buyerPan && <p><strong>PAN:</strong> {invoice.buyerPan}</p>}
          {invoice.buyerAddress && <p><strong>Address:</strong> {invoice.buyerAddress}</p>}
        </div>

        {/* Items Table */}
        <table className="w-full border-collapse mb-4 text-sm">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-gray-300 px-2 py-1 text-left">S.N.</th>
              <th className="border border-gray-300 px-2 py-1 text-left">Description / विवरण</th>
              <th className="border border-gray-300 px-2 py-1 text-right">Qty</th>
              <th className="border border-gray-300 px-2 py-1 text-right">Rate</th>
              <th className="border border-gray-300 px-2 py-1 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {invoice.items.map((item) => (
              <tr key={item.id}>
                <td className="border border-gray-300 px-2 py-1">{item.serialNumber}</td>
                <td className="border border-gray-300 px-2 py-1">
                  {item.description}
                  {item.descriptionLocal && (
                    <span className="text-gray-500 text-xs block">{item.descriptionLocal}</span>
                  )}
                </td>
                <td className="border border-gray-300 px-2 py-1 text-right">{item.quantity}</td>
                <td className="border border-gray-300 px-2 py-1 text-right">
                  {formatCurrency(item.unitPrice)}
                </td>
                <td className="border border-gray-300 px-2 py-1 text-right">
                  {formatCurrency(item.totalPrice)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals */}
        <div className="flex justify-end mb-4">
          <div className="w-64 text-sm">
            <div className="flex justify-between py-1">
              <span>Subtotal:</span>
              <span>{formatCurrency(invoice.subtotal)}</span>
            </div>
            {invoice.discountAmount > 0 && (
              <div className="flex justify-between py-1 text-red-600">
                <span>Discount{invoice.discountReason && ` (${invoice.discountReason})`}:</span>
                <span>-{formatCurrency(invoice.discountAmount)}</span>
              </div>
            )}
            <div className="flex justify-between py-1">
              <span>Taxable Amount:</span>
              <span>{formatCurrency(invoice.taxableAmount)}</span>
            </div>
            {invoice.serviceCharge > 0 && (
              <div className="flex justify-between py-1">
                <span>Service Charge ({invoice.serviceChargeRate}%):</span>
                <span>{formatCurrency(invoice.serviceCharge)}</span>
              </div>
            )}
            <div className="flex justify-between py-1">
              <span>VAT ({invoice.vatRate}%):</span>
              <span>{formatCurrency(invoice.vatAmount)}</span>
            </div>
            <div className="flex justify-between py-1 font-bold border-t border-black">
              <span>Total / कुल:</span>
              <span>{formatCurrency(invoice.totalAmount)}</span>
            </div>
          </div>
        </div>

        {/* Amount in Words */}
        {invoice.amountInWords && (
          <div className="border-t border-dashed pt-2 mb-4 text-sm">
            <p><strong>In Words:</strong> {invoice.amountInWords}</p>
          </div>
        )}

        {/* Cancellation Info */}
        {invoice.isCancelled && (
          <div className="bg-red-50 border border-red-200 p-3 mb-4 text-sm">
            <div className="flex items-center gap-2 text-red-700 font-medium">
              <XCircle className="h-4 w-4" />
              Invoice Cancelled
            </div>
            {invoice.cancelledAt && (
              <p className="text-red-600">Date: {formatDate(invoice.cancelledAt)}</p>
            )}
            {invoice.cancellationReason && (
              <p className="text-red-600">Reason: {invoice.cancellationReason}</p>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="border-t-2 border-black pt-4 mt-8 text-xs text-center text-gray-500">
          <p>This is a computer-generated invoice.</p>
          <p>यो कम्प्युटर जनित बीजक हो।</p>
          <p className="mt-2">Thank you for your business! / धन्यवाद!</p>
        </div>
      </div>
    </>
  );
}
