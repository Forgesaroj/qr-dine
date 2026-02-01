"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@qr-dine/ui";
import { Button } from "@qr-dine/ui";
import {
  Calendar,
  AlertTriangle,
  Package,
  Filter,
  RefreshCcw,
  ChevronLeft,
  ChevronRight,
  Clock,
  AlertCircle,
  XCircle,
  CheckCircle,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";

interface StockBatch {
  id: string;
  batchNumber: string;
  quantity: number;
  costPerUnit: number;
  expiryDate: string | null;
  isConsumed: boolean;
  createdAt: string;
  expiryStatus: string;
  stockItem: {
    itemCode: string;
    name: string;
    baseUnit: string;
    trackExpiry: boolean;
  };
  godown: {
    code: string;
    name: string;
  } | null;
}

interface BatchStats {
  totalBatches: number;
  expiredCount: number;
  expiringIn7Days: number;
  expiringIn30Days: number;
}

const getExpiryStatusColor = (status: string) => {
  switch (status) {
    case "EXPIRED":
      return "bg-red-100 text-red-700 border-red-200";
    case "EXPIRING_SOON":
      return "bg-orange-100 text-orange-700 border-orange-200";
    case "EXPIRING":
      return "bg-yellow-100 text-yellow-700 border-yellow-200";
    default:
      return "bg-green-100 text-green-700 border-green-200";
  }
};

const getExpiryStatusIcon = (status: string) => {
  switch (status) {
    case "EXPIRED":
      return <XCircle className="w-4 h-4" />;
    case "EXPIRING_SOON":
      return <AlertCircle className="w-4 h-4" />;
    case "EXPIRING":
      return <Clock className="w-4 h-4" />;
    default:
      return <CheckCircle className="w-4 h-4" />;
  }
};

const formatExpiryStatus = (status: string) => {
  switch (status) {
    case "EXPIRED":
      return "Expired";
    case "EXPIRING_SOON":
      return "Expiring Soon";
    case "EXPIRING":
      return "Expiring in 30 days";
    default:
      return "OK";
  }
};

export default function BatchesPage() {
  const params = useParams();
  const restaurant = params.restaurant as string;
  const [batches, setBatches] = useState<StockBatch[]>([]);
  const [stats, setStats] = useState<BatchStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "expired" | "expiring7" | "expiring30">(
    "all"
  );
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const limit = 20;

  useEffect(() => {
    fetchBatches();
  }, [page, filter]);

  const fetchBatches = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append("limit", limit.toString());
      params.append("offset", ((page - 1) * limit).toString());
      params.append("available", "true");

      if (filter === "expired") {
        params.append("expired", "true");
      } else if (filter === "expiring7") {
        params.append("expiringDays", "7");
      } else if (filter === "expiring30") {
        params.append("expiringDays", "30");
      }

      const response = await fetch(`/api/stock/batches?${params.toString()}`);
      const data = await response.json();

      if (response.ok) {
        setBatches(data.batches || []);
        setStats(data.stats || null);
        setTotalCount(data.pagination?.total || 0);
        setTotalPages(Math.ceil((data.pagination?.total || 0) / limit));
      }
    } catch (error) {
      console.error("Error fetching batches:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "No expiry";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getDaysUntilExpiry = (dateString: string | null) => {
    if (!dateString) return null;
    const today = new Date();
    const expiry = new Date(dateString);
    const diff = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Batch & Expiry Tracking</h1>
          <p className="text-gray-500">Monitor stock batches and expiry dates</p>
        </div>
        <Link href={`/${restaurant}/inventory`}>
          <Button variant="outline">Back to Inventory</Button>
        </Link>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card
            className={`cursor-pointer transition-colors ${
              filter === "all" ? "ring-2 ring-blue-500" : ""
            }`}
            onClick={() => {
              setFilter("all");
              setPage(1);
            }}
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Package className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.totalBatches}</p>
                  <p className="text-sm text-gray-500">Total Batches</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card
            className={`cursor-pointer transition-colors ${
              filter === "expired" ? "ring-2 ring-red-500" : ""
            }`}
            onClick={() => {
              setFilter("expired");
              setPage(1);
            }}
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-100 rounded-lg">
                  <XCircle className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-red-600">
                    {stats.expiredCount}
                  </p>
                  <p className="text-sm text-gray-500">Expired</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card
            className={`cursor-pointer transition-colors ${
              filter === "expiring7" ? "ring-2 ring-orange-500" : ""
            }`}
            onClick={() => {
              setFilter("expiring7");
              setPage(1);
            }}
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <AlertTriangle className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-orange-600">
                    {stats.expiringIn7Days}
                  </p>
                  <p className="text-sm text-gray-500">Expiring in 7 Days</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card
            className={`cursor-pointer transition-colors ${
              filter === "expiring30" ? "ring-2 ring-yellow-500" : ""
            }`}
            onClick={() => {
              setFilter("expiring30");
              setPage(1);
            }}
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <Clock className="w-5 h-5 text-yellow-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-yellow-600">
                    {stats.expiringIn30Days}
                  </p>
                  <p className="text-sm text-gray-500">Expiring in 30 Days</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Batches List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Batch Records
            </div>
            <Button variant="ghost" size="sm" onClick={fetchBatches}>
              <RefreshCcw className="w-4 h-4" />
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="animate-pulse space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-16 bg-gray-100 rounded"></div>
              ))}
            </div>
          ) : batches.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No batches found</p>
              <p className="text-sm">
                {filter !== "all"
                  ? "Try changing your filter"
                  : "Batches are created when receiving stock with batch tracking enabled"}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-3 font-medium text-gray-500">Batch #</th>
                    <th className="pb-3 font-medium text-gray-500">Stock Item</th>
                    <th className="pb-3 font-medium text-gray-500">Godown</th>
                    <th className="pb-3 font-medium text-gray-500 text-right">
                      Quantity
                    </th>
                    <th className="pb-3 font-medium text-gray-500">Expiry Date</th>
                    <th className="pb-3 font-medium text-gray-500">Status</th>
                    <th className="pb-3 font-medium text-gray-500 text-right">
                      Cost/Unit
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {batches.map((batch) => {
                    const daysUntilExpiry = getDaysUntilExpiry(batch.expiryDate);
                    return (
                      <tr key={batch.id} className="border-b hover:bg-gray-50">
                        <td className="py-3">
                          <span className="font-mono text-sm font-medium">
                            {batch.batchNumber}
                          </span>
                        </td>
                        <td className="py-3">
                          <div>
                            <p className="font-medium">{batch.stockItem.name}</p>
                            <p className="text-xs text-gray-500">
                              {batch.stockItem.itemCode}
                            </p>
                          </div>
                        </td>
                        <td className="py-3 text-sm">
                          {batch.godown ? (
                            <span>{batch.godown.code}</span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="py-3 text-right font-mono">
                          {Number(batch.quantity).toFixed(2)}{" "}
                          {batch.stockItem.baseUnit}
                        </td>
                        <td className="py-3">
                          <div>
                            <p className="text-sm">{formatDate(batch.expiryDate)}</p>
                            {daysUntilExpiry !== null && (
                              <p
                                className={`text-xs ${
                                  daysUntilExpiry < 0
                                    ? "text-red-600"
                                    : daysUntilExpiry <= 7
                                    ? "text-orange-600"
                                    : "text-gray-500"
                                }`}
                              >
                                {daysUntilExpiry < 0
                                  ? `${Math.abs(daysUntilExpiry)} days ago`
                                  : daysUntilExpiry === 0
                                  ? "Today"
                                  : `${daysUntilExpiry} days left`}
                              </p>
                            )}
                          </div>
                        </td>
                        <td className="py-3">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium border ${getExpiryStatusColor(
                              batch.expiryStatus
                            )}`}
                          >
                            {getExpiryStatusIcon(batch.expiryStatus)}
                            {formatExpiryStatus(batch.expiryStatus)}
                          </span>
                        </td>
                        <td className="py-3 text-right font-mono">
                          Rs. {Number(batch.costPerUnit).toFixed(2)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-6 pt-4 border-t">
              <p className="text-sm text-gray-500">
                Showing {(page - 1) * limit + 1} to{" "}
                {Math.min(page * limit, totalCount)} of {totalCount} batches
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

      {/* Expiry Alerts Info */}
      {stats && (stats.expiredCount > 0 || stats.expiringIn7Days > 0) && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-orange-600 mt-0.5" />
              <div>
                <p className="font-medium text-orange-800">Attention Required</p>
                <p className="text-sm text-orange-700">
                  {stats.expiredCount > 0 && (
                    <span>
                      {stats.expiredCount} batch(es) have expired and need to be
                      written off.{" "}
                    </span>
                  )}
                  {stats.expiringIn7Days > 0 && (
                    <span>
                      {stats.expiringIn7Days} batch(es) will expire within 7 days.
                    </span>
                  )}
                </p>
                <Link href={`/${restaurant}/inventory/adjustments/new`}>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-2 border-orange-300 text-orange-700 hover:bg-orange-100"
                  >
                    Create Adjustment
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
