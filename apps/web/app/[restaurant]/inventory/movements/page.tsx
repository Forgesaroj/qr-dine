"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@qr-dine/ui";
import { Button } from "@qr-dine/ui";
import { Input } from "@qr-dine/ui";
import {
  ArrowDownRight,
  ArrowUpRight,
  ArrowLeftRight,
  Search,
  Filter,
  Download,
  RefreshCcw,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";

interface StockMovement {
  id: string;
  movementNumber: string;
  movementType: string;
  movementDate: string;
  quantity: number;
  unit: string;
  rate: number;
  totalAmount: number;
  balanceAfter: number;
  notes: string | null;
  createdByName: string;
  createdAt: string;
  stockItem: {
    itemCode: string;
    name: string;
  };
  fromGodown: {
    code: string;
    name: string;
  } | null;
  toGodown: {
    code: string;
    name: string;
  } | null;
}

const MOVEMENT_TYPES = [
  { value: "", label: "All Types" },
  { value: "PURCHASE_IN", label: "Purchase In" },
  { value: "SALES_OUT", label: "Sales Out" },
  { value: "TRANSFER_IN", label: "Transfer In" },
  { value: "TRANSFER_OUT", label: "Transfer Out" },
  { value: "ADJUSTMENT_IN", label: "Adjustment In" },
  { value: "ADJUSTMENT_OUT", label: "Adjustment Out" },
  { value: "PRODUCTION_IN", label: "Production In" },
  { value: "PRODUCTION_OUT", label: "Production Out" },
  { value: "RETURN_IN", label: "Return In" },
  { value: "RETURN_OUT", label: "Return Out" },
  { value: "EXPIRED", label: "Expired" },
];

const getMovementColor = (type: string) => {
  if (type.includes("_IN") || type === "PURCHASE_IN") {
    return "text-green-600 bg-green-100";
  } else if (type.includes("_OUT") || type === "SALES_OUT" || type === "EXPIRED") {
    return "text-red-600 bg-red-100";
  } else if (type.includes("TRANSFER")) {
    return "text-blue-600 bg-blue-100";
  }
  return "text-gray-600 bg-gray-100";
};

const getMovementIcon = (type: string) => {
  if (type.includes("_IN") || type === "PURCHASE_IN") {
    return <ArrowDownRight className="w-4 h-4" />;
  } else if (type.includes("_OUT") || type === "SALES_OUT" || type === "EXPIRED") {
    return <ArrowUpRight className="w-4 h-4" />;
  }
  return <ArrowLeftRight className="w-4 h-4" />;
};

const formatMovementType = (type: string) => {
  return type.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
};

export default function StockMovementsPage() {
  const params = useParams();
  const restaurant = params.restaurant as string;
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [movementType, setMovementType] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const limit = 20;

  useEffect(() => {
    fetchMovements();
  }, [page, movementType, startDate, endDate]);

  const fetchMovements = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append("limit", limit.toString());
      params.append("offset", ((page - 1) * limit).toString());

      if (searchTerm) params.append("search", searchTerm);
      if (movementType) params.append("movementType", movementType);
      if (startDate) params.append("startDate", startDate);
      if (endDate) params.append("endDate", endDate);

      const response = await fetch(`/api/stock/movements?${params.toString()}`);
      const data = await response.json();

      if (response.ok) {
        setMovements(data.movements || []);
        setTotalCount(data.pagination?.total || 0);
        setTotalPages(Math.ceil((data.pagination?.total || 0) / limit));
      } else {
        console.error("Error fetching movements:", data.error);
      }
    } catch (error) {
      console.error("Error fetching movements:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setPage(1);
    fetchMovements();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  const clearFilters = () => {
    setSearchTerm("");
    setMovementType("");
    setStartDate("");
    setEndDate("");
    setPage(1);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Stock Movements</h1>
          <p className="text-gray-500">
            Track all stock in/out movements
          </p>
        </div>
        <div className="flex gap-2">
          <Link href={`/${restaurant}/inventory/transfer`}>
            <Button variant="outline">
              <ArrowLeftRight className="w-4 h-4 mr-2" />
              Transfer Stock
            </Button>
          </Link>
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
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
                  placeholder="Search by item name or movement number..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="pl-9"
                />
              </div>
            </div>

            <div className="w-48">
              <select
                value={movementType}
                onChange={(e) => {
                  setMovementType(e.target.value);
                  setPage(1);
                }}
                className="w-full h-10 px-3 border rounded-md text-sm"
              >
                {MOVEMENT_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

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

            <Button variant="ghost" onClick={clearFilters}>
              <RefreshCcw className="w-4 h-4 mr-2" />
              Clear
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Movements Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Movement History</span>
            <span className="text-sm font-normal text-gray-500">
              {totalCount} movements found
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
          ) : movements.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <ArrowLeftRight className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No stock movements found</p>
              <p className="text-sm">Try adjusting your filters</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-3 font-medium text-gray-500">Movement #</th>
                    <th className="pb-3 font-medium text-gray-500">Date</th>
                    <th className="pb-3 font-medium text-gray-500">Type</th>
                    <th className="pb-3 font-medium text-gray-500">Stock Item</th>
                    <th className="pb-3 font-medium text-gray-500">From / To</th>
                    <th className="pb-3 font-medium text-gray-500 text-right">Qty</th>
                    <th className="pb-3 font-medium text-gray-500 text-right">Rate</th>
                    <th className="pb-3 font-medium text-gray-500 text-right">Amount</th>
                    <th className="pb-3 font-medium text-gray-500">By</th>
                  </tr>
                </thead>
                <tbody>
                  {movements.map((movement) => (
                    <tr key={movement.id} className="border-b hover:bg-gray-50">
                      <td className="py-3">
                        <span className="font-mono text-sm">
                          {movement.movementNumber}
                        </span>
                      </td>
                      <td className="py-3 text-sm text-gray-600">
                        {formatDate(movement.movementDate)}
                      </td>
                      <td className="py-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${getMovementColor(
                            movement.movementType
                          )}`}
                        >
                          {getMovementIcon(movement.movementType)}
                          {formatMovementType(movement.movementType)}
                        </span>
                      </td>
                      <td className="py-3">
                        <div>
                          <p className="font-medium">{movement.stockItem.name}</p>
                          <p className="text-xs text-gray-500">
                            {movement.stockItem.itemCode}
                          </p>
                        </div>
                      </td>
                      <td className="py-3 text-sm">
                        {movement.fromGodown && (
                          <span className="text-red-600">
                            {movement.fromGodown.code}
                          </span>
                        )}
                        {movement.fromGodown && movement.toGodown && (
                          <span className="mx-1">→</span>
                        )}
                        {movement.toGodown && (
                          <span className="text-green-600">
                            {movement.toGodown.code}
                          </span>
                        )}
                      </td>
                      <td className="py-3 text-right font-mono">
                        {Number(movement.quantity).toFixed(2)} {movement.unit}
                      </td>
                      <td className="py-3 text-right font-mono">
                        Rs. {Number(movement.rate).toFixed(2)}
                      </td>
                      <td className="py-3 text-right font-mono font-medium">
                        Rs. {Number(movement.totalAmount).toFixed(2)}
                      </td>
                      <td className="py-3 text-sm text-gray-600">
                        {movement.createdByName}
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
                {Math.min(page * limit, totalCount)} of {totalCount} movements
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
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (page <= 3) {
                      pageNum = i + 1;
                    } else if (page >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = page - 2 + i;
                    }
                    return (
                      <Button
                        key={pageNum}
                        variant={page === pageNum ? "default" : "outline"}
                        size="sm"
                        onClick={() => setPage(pageNum)}
                        className="w-8"
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                </div>
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
