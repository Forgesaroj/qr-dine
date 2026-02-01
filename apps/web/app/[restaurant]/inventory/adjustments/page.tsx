"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@qr-dine/ui";
import { Button } from "@qr-dine/ui";
import { Input } from "@qr-dine/ui";
import {
  ClipboardCheck,
  Plus,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  XCircle,
  Clock,
  FileEdit,
  Eye,
  AlertTriangle,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";

interface AdjustmentItem {
  id: string;
  stockItem: {
    itemCode: string;
    name: string;
    baseUnit: string;
  };
  godown: {
    code: string;
    name: string;
  } | null;
  systemQuantity: number;
  physicalQuantity: number;
  difference: number;
  unit: string;
  amount: number;
}

interface StockAdjustment {
  id: string;
  adjustmentNumber: string;
  adjustmentType: string;
  adjustmentDate: string;
  reason: string | null;
  notes: string | null;
  status: string;
  createdByName: string;
  approvedByName: string | null;
  approvedAt: string | null;
  createdAt: string;
  items: AdjustmentItem[];
  _count: {
    items: number;
  };
}

const ADJUSTMENT_TYPES = [
  { value: "", label: "All Types" },
  { value: "PHYSICAL_COUNT", label: "Physical Count" },
  { value: "WASTAGE", label: "Wastage" },
  { value: "DAMAGE", label: "Damage" },
  { value: "THEFT", label: "Theft" },
  { value: "OTHER", label: "Other" },
];

const STATUS_OPTIONS = [
  { value: "", label: "All Status" },
  { value: "DRAFT", label: "Draft" },
  { value: "PENDING", label: "Pending" },
  { value: "APPROVED", label: "Approved" },
  { value: "REJECTED", label: "Rejected" },
];

const getStatusColor = (status: string) => {
  switch (status) {
    case "DRAFT":
      return "bg-gray-100 text-gray-700";
    case "PENDING":
      return "bg-yellow-100 text-yellow-700";
    case "APPROVED":
      return "bg-green-100 text-green-700";
    case "REJECTED":
      return "bg-red-100 text-red-700";
    default:
      return "bg-gray-100 text-gray-700";
  }
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case "DRAFT":
      return <FileEdit className="w-3 h-3" />;
    case "PENDING":
      return <Clock className="w-3 h-3" />;
    case "APPROVED":
      return <CheckCircle className="w-3 h-3" />;
    case "REJECTED":
      return <XCircle className="w-3 h-3" />;
    default:
      return null;
  }
};

const formatAdjustmentType = (type: string) => {
  return type.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
};

export default function StockAdjustmentsPage() {
  const params = useParams();
  const restaurant = params.restaurant as string;
  const [adjustments, setAdjustments] = useState<StockAdjustment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [adjustmentType, setAdjustmentType] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const limit = 15;

  // Detail view
  const [selectedAdjustment, setSelectedAdjustment] =
    useState<StockAdjustment | null>(null);

  useEffect(() => {
    fetchAdjustments();
  }, [page, adjustmentType, status]);

  const fetchAdjustments = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append("limit", limit.toString());
      params.append("offset", ((page - 1) * limit).toString());

      if (adjustmentType) params.append("type", adjustmentType);
      if (status) params.append("status", status);

      const response = await fetch(`/api/stock/adjustments?${params.toString()}`);
      const data = await response.json();

      if (response.ok) {
        setAdjustments(data.adjustments || []);
        setTotalCount(data.pagination?.total || 0);
        setTotalPages(Math.ceil((data.pagination?.total || 0) / limit));
      }
    } catch (error) {
      console.error("Error fetching adjustments:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (
    adjustmentId: string,
    action: "approve" | "reject" | "submit"
  ) => {
    const confirmMsg =
      action === "approve"
        ? "Are you sure you want to approve this adjustment? Stock levels will be updated."
        : action === "reject"
        ? "Are you sure you want to reject this adjustment?"
        : "Are you sure you want to submit this adjustment for approval?";

    if (!confirm(confirmMsg)) return;

    try {
      const response = await fetch(`/api/stock/adjustments/${adjustmentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });

      const data = await response.json();

      if (response.ok) {
        fetchAdjustments();
        setSelectedAdjustment(null);
        alert(data.message);
      } else {
        alert(data.error || "Action failed");
      }
    } catch (error) {
      console.error("Error performing action:", error);
      alert("An error occurred");
    }
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
          <h1 className="text-2xl font-bold">Stock Adjustments</h1>
          <p className="text-gray-500">
            Physical count, wastage, and stock reconciliation
          </p>
        </div>
        <div className="flex gap-2">
          <Link href={`/${restaurant}/inventory`}>
            <Button variant="outline">Back to Inventory</Button>
          </Link>
          <Link href={`/${restaurant}/inventory/adjustments/new`}>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              New Adjustment
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
                  placeholder="Search by adjustment number..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            <select
              value={adjustmentType}
              onChange={(e) => {
                setAdjustmentType(e.target.value);
                setPage(1);
              }}
              className="h-10 px-3 border rounded-md text-sm"
            >
              {ADJUSTMENT_TYPES.map((type) => (
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
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Adjustments List */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Adjustment Records</span>
              <span className="text-sm font-normal text-gray-500">
                {totalCount} records
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
            ) : adjustments.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <ClipboardCheck className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No adjustments found</p>
                <Link href={`/${restaurant}/inventory/adjustments/new`}>
                  <Button variant="outline" className="mt-4">
                    <Plus className="w-4 h-4 mr-2" />
                    Create First Adjustment
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {adjustments.map((adjustment) => (
                  <div
                    key={adjustment.id}
                    onClick={() => setSelectedAdjustment(adjustment)}
                    className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                      selectedAdjustment?.id === adjustment.id
                        ? "border-blue-500 bg-blue-50"
                        : "hover:bg-gray-50"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-medium">
                            {adjustment.adjustmentNumber}
                          </span>
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(
                              adjustment.status
                            )}`}
                          >
                            {getStatusIcon(adjustment.status)}
                            {adjustment.status}
                          </span>
                        </div>
                        <p className="text-sm text-gray-500">
                          {formatAdjustmentType(adjustment.adjustmentType)} •{" "}
                          {formatDate(adjustment.adjustmentDate)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">
                          {adjustment._count.items} items
                        </p>
                        <p className="text-xs text-gray-500">
                          By {adjustment.createdByName}
                        </p>
                      </div>
                    </div>
                    {adjustment.reason && (
                      <p className="mt-2 text-sm text-gray-600">
                        {adjustment.reason}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-6 pt-4 border-t">
                <p className="text-sm text-gray-500">
                  Page {page} of {totalPages}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(page - 1)}
                    disabled={page === 1}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(page + 1)}
                    disabled={page === totalPages}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Detail Panel */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5" />
              Adjustment Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!selectedAdjustment ? (
              <div className="text-center py-12 text-gray-500">
                <p>Select an adjustment to view details</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Status Badge */}
                <div className="flex items-center justify-between">
                  <span
                    className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(
                      selectedAdjustment.status
                    )}`}
                  >
                    {getStatusIcon(selectedAdjustment.status)}
                    {selectedAdjustment.status}
                  </span>
                  <span className="text-sm text-gray-500">
                    {formatDate(selectedAdjustment.adjustmentDate)}
                  </span>
                </div>

                {/* Info */}
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Type:</span>
                    <span className="font-medium">
                      {formatAdjustmentType(selectedAdjustment.adjustmentType)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Created By:</span>
                    <span>{selectedAdjustment.createdByName}</span>
                  </div>
                  {selectedAdjustment.approvedByName && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">
                        {selectedAdjustment.status === "APPROVED"
                          ? "Approved By:"
                          : "Rejected By:"}
                      </span>
                      <span>{selectedAdjustment.approvedByName}</span>
                    </div>
                  )}
                </div>

                {selectedAdjustment.reason && (
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-500 mb-1">Reason:</p>
                    <p className="text-sm">{selectedAdjustment.reason}</p>
                  </div>
                )}

                {/* Items */}
                <div>
                  <p className="font-medium mb-2">Adjustment Items</p>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {selectedAdjustment.items.map((item) => (
                      <div
                        key={item.id}
                        className="p-3 bg-gray-50 rounded-lg text-sm"
                      >
                        <p className="font-medium">{item.stockItem.name}</p>
                        <div className="grid grid-cols-3 gap-2 mt-1 text-xs">
                          <div>
                            <span className="text-gray-500">System:</span>{" "}
                            {Number(item.systemQuantity).toFixed(2)}
                          </div>
                          <div>
                            <span className="text-gray-500">Physical:</span>{" "}
                            {Number(item.physicalQuantity).toFixed(2)}
                          </div>
                          <div
                            className={
                              Number(item.difference) >= 0
                                ? "text-green-600"
                                : "text-red-600"
                            }
                          >
                            <span className="text-gray-500">Diff:</span>{" "}
                            {Number(item.difference) >= 0 ? "+" : ""}
                            {Number(item.difference).toFixed(2)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                {(selectedAdjustment.status === "DRAFT" ||
                  selectedAdjustment.status === "PENDING") && (
                  <div className="pt-4 border-t space-y-2">
                    {selectedAdjustment.status === "DRAFT" && (
                      <Button
                        className="w-full"
                        onClick={() =>
                          handleAction(selectedAdjustment.id, "submit")
                        }
                      >
                        Submit for Approval
                      </Button>
                    )}
                    {selectedAdjustment.status === "PENDING" && (
                      <>
                        <Button
                          className="w-full"
                          onClick={() =>
                            handleAction(selectedAdjustment.id, "approve")
                          }
                        >
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Approve & Apply
                        </Button>
                        <Button
                          variant="outline"
                          className="w-full text-red-600"
                          onClick={() =>
                            handleAction(selectedAdjustment.id, "reject")
                          }
                        >
                          <XCircle className="w-4 h-4 mr-2" />
                          Reject
                        </Button>
                      </>
                    )}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
