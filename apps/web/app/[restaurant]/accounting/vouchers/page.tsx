"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@qr-dine/ui";
import { Button } from "@qr-dine/ui";
import { Input } from "@qr-dine/ui";
import {
  Receipt,
  Plus,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  Eye,
  CheckCircle,
  Clock,
  XCircle,
  FileEdit,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";

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
  ledgerEntries: Array<{
    id: string;
    account: {
      accountCode: string;
      accountName: string;
    };
    debitAmount: number;
    creditAmount: number;
  }>;
  _count: {
    ledgerEntries: number;
  };
}

const VOUCHER_TYPES = [
  { value: "", label: "All Types" },
  { value: "PAYMENT", label: "Payment" },
  { value: "RECEIPT", label: "Receipt" },
  { value: "CONTRA", label: "Contra" },
  { value: "JOURNAL", label: "Journal" },
  { value: "SALES", label: "Sales" },
  { value: "PURCHASE", label: "Purchase" },
  { value: "CREDIT_NOTE", label: "Credit Note" },
  { value: "DEBIT_NOTE", label: "Debit Note" },
];

const STATUS_OPTIONS = [
  { value: "", label: "All Status" },
  { value: "DRAFT", label: "Draft" },
  { value: "POSTED", label: "Posted" },
  { value: "CANCELLED", label: "Cancelled" },
];

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
      return <FileEdit className="w-3 h-3" />;
    case "POSTED":
      return <CheckCircle className="w-3 h-3" />;
    case "CANCELLED":
      return <XCircle className="w-3 h-3" />;
    default:
      return <Clock className="w-3 h-3" />;
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

export default function VouchersPage() {
  const params = useParams();
  const restaurant = params.restaurant as string;
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [voucherType, setVoucherType] = useState("");
  const [status, setStatus] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const limit = 15;

  useEffect(() => {
    fetchVouchers();
  }, [page, voucherType, status, startDate, endDate]);

  const fetchVouchers = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append("limit", limit.toString());
      params.append("offset", ((page - 1) * limit).toString());

      if (searchTerm) params.append("search", searchTerm);
      if (voucherType) params.append("voucherType", voucherType);
      if (status) params.append("status", status);
      if (startDate) params.append("startDate", startDate);
      if (endDate) params.append("endDate", endDate);

      const response = await fetch(`/api/accounting/vouchers?${params.toString()}`);
      const data = await response.json();

      if (response.ok) {
        setVouchers(data.vouchers || []);
        setTotalCount(data.pagination?.total || 0);
        setTotalPages(Math.ceil((data.pagination?.total || 0) / limit));
      }
    } catch (error) {
      console.error("Error fetching vouchers:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setPage(1);
    fetchVouchers();
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Vouchers</h1>
          <p className="text-gray-500">Manage accounting vouchers</p>
        </div>
        <div className="flex gap-2">
          <Link href={`/${restaurant}/accounting`}>
            <Button variant="outline">Back to Accounting</Button>
          </Link>
          <Link href={`/${restaurant}/accounting/vouchers/new`}>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              New Voucher
            </Button>
          </Link>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search by voucher number or narration..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  className="pl-9"
                />
              </div>
            </div>

            <select
              value={voucherType}
              onChange={(e) => {
                setVoucherType(e.target.value);
                setPage(1);
              }}
              className="h-10 px-3 border rounded-md text-sm"
            >
              {VOUCHER_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>

            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
              className="h-10 px-3 border rounded-md text-sm"
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>

            <div className="flex gap-2 items-center">
              <Input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setPage(1);
                }}
                className="w-40"
              />
              <span className="text-gray-500">to</span>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setPage(1);
                }}
                className="w-40"
              />
            </div>

            <Button variant="outline" onClick={handleSearch}>
              <Filter className="w-4 h-4 mr-2" />
              Apply
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Vouchers List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Voucher Records</span>
            <span className="text-sm font-normal text-gray-500">
              {totalCount} vouchers
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="animate-pulse space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-16 bg-gray-100 rounded"></div>
              ))}
            </div>
          ) : vouchers.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Receipt className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No vouchers found</p>
              <Link href={`/${restaurant}/accounting/vouchers/new`}>
                <Button variant="outline" className="mt-4">
                  <Plus className="w-4 h-4 mr-2" />
                  Create First Voucher
                </Button>
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-3 font-medium text-gray-500">Voucher #</th>
                    <th className="pb-3 font-medium text-gray-500">Date</th>
                    <th className="pb-3 font-medium text-gray-500">Type</th>
                    <th className="pb-3 font-medium text-gray-500">Party</th>
                    <th className="pb-3 font-medium text-gray-500">Status</th>
                    <th className="pb-3 font-medium text-gray-500 text-right">
                      Amount
                    </th>
                    <th className="pb-3 font-medium text-gray-500">By</th>
                    <th className="pb-3 font-medium text-gray-500"></th>
                  </tr>
                </thead>
                <tbody>
                  {vouchers.map((voucher) => (
                    <tr key={voucher.id} className="border-b hover:bg-gray-50">
                      <td className="py-3">
                        <span className="font-mono text-sm font-medium">
                          {voucher.voucherNumber}
                        </span>
                      </td>
                      <td className="py-3 text-sm">
                        {formatDate(voucher.voucherDate)}
                      </td>
                      <td className="py-3">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${getVoucherTypeColor(
                            voucher.voucherType
                          )}`}
                        >
                          {voucher.voucherType}
                        </span>
                      </td>
                      <td className="py-3 text-sm">
                        {voucher.partyName || (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="py-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(
                            voucher.status
                          )}`}
                        >
                          {getStatusIcon(voucher.status)}
                          {voucher.status}
                        </span>
                      </td>
                      <td className="py-3 text-right font-mono">
                        Rs. {Number(voucher.totalAmount).toLocaleString()}
                      </td>
                      <td className="py-3 text-sm text-gray-600">
                        {voucher.createdByName}
                      </td>
                      <td className="py-3">
                        <Link
                          href={`/${restaurant}/accounting/vouchers/${voucher.id}`}
                        >
                          <Button variant="ghost" size="sm">
                            <Eye className="w-4 h-4" />
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-6 pt-4 border-t">
              <p className="text-sm text-gray-500">
                Showing {(page - 1) * limit + 1} to{" "}
                {Math.min(page * limit, totalCount)} of {totalCount} vouchers
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(page - 1)}
                  disabled={page === 1}
                >
                  <ChevronLeft className="w-4 h-4" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(page + 1)}
                  disabled={page === totalPages}
                >
                  Next
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
