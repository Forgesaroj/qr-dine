"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@qr-dine/ui";
import { Button } from "@qr-dine/ui";
import {
  Receipt,
  ArrowLeft,
  CheckCircle,
  Clock,
  XCircle,
  FileEdit,
  Loader2,
  Building2,
  AlertCircle,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

interface Voucher {
  id: string;
  voucherNumber: string;
  voucherType: string;
  voucherDate: string;
  status: string;
  totalAmount: number;
  narration: string | null;
  partyName: string | null;
  createdByName: string;
  createdAt: string;
  postedByName: string | null;
  postedAt: string | null;
  ledgerEntries: Array<{
    id: string;
    account: {
      accountCode: string;
      accountName: string;
      accountGroup: string;
      accountType: string;
    };
    costCenter?: {
      code: string;
      name: string;
    } | null;
    debitAmount: number;
    creditAmount: number;
    narration: string | null;
  }>;
}

const getStatusColor = (status: string) => {
  switch (status) {
    case "DRAFT":
      return "bg-gray-100 text-gray-700";
    case "POSTED":
      return "bg-green-100 text-green-700";
    case "CANCELLED":
      return "bg-red-100 text-red-700";
    default:
      return "bg-gray-100 text-gray-700";
  }
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case "DRAFT":
      return <FileEdit className="w-4 h-4" />;
    case "POSTED":
      return <CheckCircle className="w-4 h-4" />;
    case "CANCELLED":
      return <XCircle className="w-4 h-4" />;
    default:
      return <Clock className="w-4 h-4" />;
  }
};

const getVoucherTypeColor = (type: string) => {
  const colors: Record<string, string> = {
    PAYMENT: "bg-red-100 text-red-700",
    RECEIPT: "bg-green-100 text-green-700",
    CONTRA: "bg-blue-100 text-blue-700",
    JOURNAL: "bg-purple-100 text-purple-700",
    SALES: "bg-emerald-100 text-emerald-700",
    PURCHASE: "bg-orange-100 text-orange-700",
    CREDIT_NOTE: "bg-pink-100 text-pink-700",
    DEBIT_NOTE: "bg-yellow-100 text-yellow-700",
  };
  return colors[type] || "bg-gray-100 text-gray-700";
};

export default function VoucherDetailPage() {
  const params = useParams();
  const router = useRouter();
  const restaurant = params.restaurant as string;
  const voucherId = params.id as string;

  const [voucher, setVoucher] = useState<Voucher | null>(null);
  const [totals, setTotals] = useState<{ debit: number; credit: number }>({
    debit: 0,
    credit: 0,
  });
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchVoucher();
  }, [voucherId]);

  const fetchVoucher = async () => {
    try {
      const response = await fetch(`/api/accounting/vouchers/${voucherId}`);
      const data = await response.json();

      if (response.ok) {
        setVoucher(data.voucher);
        setTotals(data.totals);
      } else {
        setError(data.error || "Failed to fetch voucher");
      }
    } catch (err) {
      console.error("Error fetching voucher:", err);
      setError("An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handlePost = async () => {
    if (!confirm("Are you sure you want to post this voucher? This action cannot be undone.")) {
      return;
    }

    setActionLoading(true);
    try {
      const response = await fetch(`/api/accounting/vouchers/${voucherId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "post" }),
      });

      const data = await response.json();

      if (response.ok) {
        fetchVoucher();
      } else {
        setError(data.error || "Failed to post voucher");
      }
    } catch (err) {
      console.error("Error posting voucher:", err);
      setError("An error occurred");
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancel = async () => {
    const reason = prompt("Please provide a reason for cancellation:");
    if (!reason) return;

    setActionLoading(true);
    try {
      const response = await fetch(`/api/accounting/vouchers/${voucherId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "cancel", reason }),
      });

      const data = await response.json();

      if (response.ok) {
        fetchVoucher();
      } else {
        setError(data.error || "Failed to cancel voucher");
      }
    } catch (err) {
      console.error("Error cancelling voucher:", err);
      setError("An error occurred");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this draft voucher?")) {
      return;
    }

    setActionLoading(true);
    try {
      const response = await fetch(`/api/accounting/vouchers/${voucherId}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (response.ok) {
        router.push(`/${restaurant}/accounting/vouchers`);
      } else {
        setError(data.error || "Failed to delete voucher");
      }
    } catch (err) {
      console.error("Error deleting voucher:", err);
      setError("An error occurred");
    } finally {
      setActionLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-96 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (error && !voucher) {
    return (
      <div className="p-6">
        <Card className="max-w-md mx-auto mt-20">
          <CardContent className="pt-6 text-center">
            <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Error</h2>
            <p className="text-gray-500 mb-4">{error}</p>
            <Link href={`/${restaurant}/accounting/vouchers`}>
              <Button variant="outline">Back to Vouchers</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!voucher) return null;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href={`/${restaurant}/accounting/vouchers`}>
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">{voucher.voucherNumber}</h1>
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(
                  voucher.status
                )}`}
              >
                {getStatusIcon(voucher.status)}
                {voucher.status}
              </span>
            </div>
            <p className="text-gray-500">
              {formatDate(voucher.voucherDate)}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          {voucher.status === "DRAFT" && (
            <>
              <Button
                variant="outline"
                onClick={handleDelete}
                disabled={actionLoading}
                className="text-red-600 border-red-200 hover:bg-red-50"
              >
                Delete
              </Button>
              <Button onClick={handlePost} disabled={actionLoading}>
                {actionLoading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <CheckCircle className="w-4 h-4 mr-2" />
                )}
                Post Voucher
              </Button>
            </>
          )}
          {voucher.status === "POSTED" && (
            <Button
              variant="outline"
              onClick={handleCancel}
              disabled={actionLoading}
              className="text-red-600 border-red-200 hover:bg-red-50"
            >
              Cancel Voucher
            </Button>
          )}
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Voucher Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Receipt className="w-5 h-5" />
              Voucher Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-gray-500">Voucher Type</p>
              <span
                className={`inline-block px-2 py-1 rounded text-sm font-medium ${getVoucherTypeColor(
                  voucher.voucherType
                )}`}
              >
                {voucher.voucherType.replace("_", " ")}
              </span>
            </div>

            <div>
              <p className="text-sm text-gray-500">Total Amount</p>
              <p className="text-2xl font-bold">
                Rs. {Number(voucher.totalAmount).toLocaleString()}
              </p>
            </div>

            {voucher.partyName && (
              <div>
                <p className="text-sm text-gray-500">Party</p>
                <p className="font-medium">{voucher.partyName}</p>
              </div>
            )}

            {voucher.narration && (
              <div>
                <p className="text-sm text-gray-500">Narration</p>
                <p className="text-sm">{voucher.narration}</p>
              </div>
            )}

            <div className="pt-4 border-t">
              <p className="text-sm text-gray-500">Created By</p>
              <p className="font-medium">{voucher.createdByName}</p>
              <p className="text-xs text-gray-400">
                {formatDateTime(voucher.createdAt)}
              </p>
            </div>

            {voucher.postedByName && (
              <div>
                <p className="text-sm text-gray-500">Posted By</p>
                <p className="font-medium">{voucher.postedByName}</p>
                {voucher.postedAt && (
                  <p className="text-xs text-gray-400">
                    {formatDateTime(voucher.postedAt)}
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Ledger Entries */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Ledger Entries</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-3 font-medium text-gray-500">Account</th>
                    <th className="pb-3 font-medium text-gray-500">Cost Center</th>
                    <th className="pb-3 font-medium text-gray-500 text-right">
                      Debit
                    </th>
                    <th className="pb-3 font-medium text-gray-500 text-right">
                      Credit
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {voucher.ledgerEntries.map((entry) => (
                    <tr key={entry.id} className="border-b">
                      <td className="py-3">
                        <p className="font-medium">
                          {entry.account.accountName}
                        </p>
                        <p className="text-xs text-gray-500">
                          {entry.account.accountCode} - {entry.account.accountGroup}
                        </p>
                        {entry.narration && (
                          <p className="text-xs text-gray-400 mt-1">
                            {entry.narration}
                          </p>
                        )}
                      </td>
                      <td className="py-3">
                        {entry.costCenter ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-50 text-purple-700 rounded text-xs">
                            <Building2 className="w-3 h-3" />
                            {entry.costCenter.code} - {entry.costCenter.name}
                          </span>
                        ) : (
                          <span className="text-gray-400 text-xs">-</span>
                        )}
                      </td>
                      <td className="py-3 text-right font-mono">
                        {Number(entry.debitAmount) > 0
                          ? `Rs. ${Number(entry.debitAmount).toLocaleString()}`
                          : "-"}
                      </td>
                      <td className="py-3 text-right font-mono">
                        {Number(entry.creditAmount) > 0
                          ? `Rs. ${Number(entry.creditAmount).toLocaleString()}`
                          : "-"}
                      </td>
                    </tr>
                  ))}
                  {/* Totals */}
                  <tr className="bg-gray-50 font-medium">
                    <td className="py-3">Total</td>
                    <td></td>
                    <td className="py-3 text-right font-mono">
                      Rs. {totals.debit.toLocaleString()}
                    </td>
                    <td className="py-3 text-right font-mono">
                      Rs. {totals.credit.toLocaleString()}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Balance Check */}
            <div
              className={`mt-4 p-3 rounded-lg flex items-center gap-2 ${
                Math.abs(totals.debit - totals.credit) < 0.01
                  ? "bg-green-50 text-green-700"
                  : "bg-red-50 text-red-700"
              }`}
            >
              {Math.abs(totals.debit - totals.credit) < 0.01 ? (
                <>
                  <CheckCircle className="w-4 h-4" />
                  <span>Voucher is balanced (Debits = Credits)</span>
                </>
              ) : (
                <>
                  <AlertCircle className="w-4 h-4" />
                  <span>
                    Warning: Difference of Rs.{" "}
                    {Math.abs(totals.debit - totals.credit).toLocaleString()}
                  </span>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
