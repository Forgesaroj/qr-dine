"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@qr-dine/ui";
import { Button } from "@qr-dine/ui";
import { Input } from "@qr-dine/ui";
import {
  Package,
  Plus,
  Search,
  Filter,
  AlertTriangle,
  Edit,
  Eye,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

interface StockItem {
  id: string;
  itemCode: string;
  name: string;
  nameLocal?: string;
  type: string;
  category?: { id: string; name: string };
  baseUnit: string;
  currentStock: number;
  averageCost: number;
  reorderLevel?: number;
  isActive: boolean;
  isLowStock: boolean;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export default function StockItemsPage() {
  const params = useParams();
  const router = useRouter();
  const restaurant = params.restaurant as string;

  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [lowStockOnly, setLowStockOnly] = useState(false);

  useEffect(() => {
    fetchStockItems();
  }, [pagination.page, search, typeFilter, lowStockOnly]);

  const fetchStockItems = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
      });

      if (search) params.append("search", search);
      if (typeFilter) params.append("type", typeFilter);
      if (lowStockOnly) params.append("lowStock", "true");

      const res = await fetch(`/api/stock/items?${params}`);
      const data = await res.json();

      setStockItems(data.stockItems || []);
      setPagination(data.pagination || pagination);
    } catch (error) {
      console.error("Error fetching stock items:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPagination({ ...pagination, page: 1 });
  };

  const stockTypes = [
    { value: "", label: "All Types" },
    { value: "RAW_MATERIAL", label: "Raw Material" },
    { value: "FINISHED_GOODS", label: "Finished Goods" },
    { value: "CONSUMABLE", label: "Consumable" },
    { value: "PACKAGING", label: "Packaging" },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Stock Items</h1>
          <p className="text-gray-500">
            {pagination.total} items total
            {lowStockOnly && " (showing low stock only)"}
          </p>
        </div>
        <Link href={`/${restaurant}/inventory/items/new`}>
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Add Stock Item
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <form onSubmit={handleSearch} className="flex gap-4 flex-wrap">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search by name or code..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <select
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value);
                setPagination({ ...pagination, page: 1 });
              }}
              className="px-3 py-2 border rounded-md"
            >
              {stockTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>

            <Button
              type="button"
              variant={lowStockOnly ? "default" : "outline"}
              onClick={() => {
                setLowStockOnly(!lowStockOnly);
                setPagination({ ...pagination, page: 1 });
              }}
            >
              <AlertTriangle className="w-4 h-4 mr-2" />
              Low Stock
            </Button>

            <Button type="submit">
              <Filter className="w-4 h-4 mr-2" />
              Filter
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Stock Items Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto"></div>
              <p className="mt-2 text-gray-500">Loading...</p>
            </div>
          ) : stockItems.length === 0 ? (
            <div className="p-8 text-center">
              <Package className="w-12 h-12 text-gray-300 mx-auto" />
              <p className="mt-2 text-gray-500">No stock items found</p>
              <Link href={`/${restaurant}/inventory/items/new`}>
                <Button className="mt-4">
                  <Plus className="w-4 h-4 mr-2" />
                  Add First Stock Item
                </Button>
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Item Code
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Name
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Type
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Category
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                      Current Stock
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                      Avg Cost
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                      Value
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                      Status
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {stockItems.map((item) => (
                    <tr
                      key={item.id}
                      className={`hover:bg-gray-50 ${
                        item.isLowStock ? "bg-orange-50" : ""
                      }`}
                    >
                      <td className="px-4 py-3 font-mono text-sm">
                        {item.itemCode}
                      </td>
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium">{item.name}</p>
                          {item.nameLocal && (
                            <p className="text-xs text-gray-500">
                              {item.nameLocal}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-1 text-xs rounded-full bg-gray-100">
                          {item.type.replace("_", " ")}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {item.category?.name || "-"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span
                          className={item.isLowStock ? "text-orange-600 font-medium" : ""}
                        >
                          {Number(item.currentStock).toFixed(2)} {item.baseUnit}
                        </span>
                        {item.isLowStock && (
                          <AlertTriangle className="w-4 h-4 text-orange-500 inline ml-1" />
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        Rs. {Number(item.averageCost).toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-right font-medium">
                        Rs.{" "}
                        {(
                          Number(item.currentStock) * Number(item.averageCost)
                        ).toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`px-2 py-1 text-xs rounded-full ${
                            item.isActive
                              ? "bg-green-100 text-green-700"
                              : "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {item.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-center gap-2">
                          <Link href={`/${restaurant}/inventory/items/${item.id}`}>
                            <Button size="sm" variant="ghost">
                              <Eye className="w-4 h-4" />
                            </Button>
                          </Link>
                          <Link href={`/${restaurant}/inventory/items/${item.id}/edit`}>
                            <Button size="sm" variant="ghost">
                              <Edit className="w-4 h-4" />
                            </Button>
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t">
              <div className="text-sm text-gray-500">
                Showing {(pagination.page - 1) * pagination.limit + 1} to{" "}
                {Math.min(pagination.page * pagination.limit, pagination.total)} of{" "}
                {pagination.total} items
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page === 1}
                  onClick={() =>
                    setPagination({ ...pagination, page: pagination.page - 1 })
                  }
                >
                  <ChevronLeft className="w-4 h-4" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page === pagination.totalPages}
                  onClick={() =>
                    setPagination({ ...pagination, page: pagination.page + 1 })
                  }
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
