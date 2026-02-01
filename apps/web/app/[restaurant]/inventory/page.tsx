"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@qr-dine/ui";
import { Button } from "@qr-dine/ui";
import {
  Package,
  Warehouse,
  AlertTriangle,
  TrendingDown,
  ArrowRight,
  Plus,
  BarChart3,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";

interface DashboardStats {
  totalItems: number;
  totalValue: number;
  lowStockCount: number;
  godownCount: number;
  recentMovements: Array<{
    id: string;
    movementNumber: string;
    movementType: string;
    stockItem: { name: string };
    quantity: number;
    unit: string;
    createdAt: string;
  }>;
  lowStockItems: Array<{
    id: string;
    itemCode: string;
    name: string;
    currentStock: number;
    reorderLevel: number;
    baseUnit: string;
  }>;
}

export default function InventoryDashboard() {
  const params = useParams();
  const restaurant = params.restaurant as string;
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [itemsRes, godownsRes] = await Promise.all([
        fetch("/api/stock/items?limit=1"),
        fetch("/api/stock/godowns"),
      ]);

      const itemsData = await itemsRes.json();
      const godownsData = await godownsRes.json();

      // Fetch low stock items
      const lowStockRes = await fetch("/api/stock/items?lowStock=true&limit=5");
      const lowStockData = await lowStockRes.json();

      setStats({
        totalItems: itemsData.pagination?.total || 0,
        totalValue: godownsData.godowns?.reduce(
          (sum: number, g: { totalStockValue: number }) => sum + (g.totalStockValue || 0),
          0
        ) || 0,
        lowStockCount: itemsData.stats?.lowStockCount || 0,
        godownCount: godownsData.godowns?.length || 0,
        recentMovements: [],
        lowStockItems: lowStockData.stockItems || [],
      });
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Inventory Management</h1>
          <p className="text-gray-500">Manage stock items, godowns, and movements</p>
        </div>
        <div className="flex gap-2">
          <Link href={`/${restaurant}/inventory/items/new`}>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Stock Item
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Total Stock Items
            </CardTitle>
            <Package className="w-4 h-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalItems || 0}</div>
            <Link
              href={`/${restaurant}/inventory/items`}
              className="text-xs text-blue-500 hover:underline flex items-center mt-1"
            >
              View all items <ArrowRight className="w-3 h-3 ml-1" />
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Total Stock Value
            </CardTitle>
            <BarChart3 className="w-4 h-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              Rs. {(stats?.totalValue || 0).toLocaleString()}
            </div>
            <p className="text-xs text-gray-500 mt-1">Based on average cost</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Low Stock Items
            </CardTitle>
            <AlertTriangle className="w-4 h-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {stats?.lowStockCount || 0}
            </div>
            <p className="text-xs text-gray-500 mt-1">Below reorder level</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Godowns
            </CardTitle>
            <Warehouse className="w-4 h-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.godownCount || 0}</div>
            <Link
              href={`/${restaurant}/inventory/godowns`}
              className="text-xs text-blue-500 hover:underline flex items-center mt-1"
            >
              Manage godowns <ArrowRight className="w-3 h-3 ml-1" />
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link href={`/${restaurant}/inventory/items`}>
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Package className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold">Stock Items</h3>
                <p className="text-sm text-gray-500">Manage inventory items</p>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href={`/${restaurant}/inventory/godowns`}>
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="p-3 bg-purple-100 rounded-lg">
                <Warehouse className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <h3 className="font-semibold">Godowns</h3>
                <p className="text-sm text-gray-500">Manage warehouses</p>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href={`/${restaurant}/inventory/movements`}>
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="p-3 bg-green-100 rounded-lg">
                <TrendingDown className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <h3 className="font-semibold">Stock Movements</h3>
                <p className="text-sm text-gray-500">View movement history</p>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Low Stock Alert */}
      {stats?.lowStockItems && stats.lowStockItems.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-600">
              <AlertTriangle className="w-5 h-5" />
              Low Stock Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.lowStockItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-3 bg-orange-50 rounded-lg"
                >
                  <div>
                    <p className="font-medium">{item.name}</p>
                    <p className="text-sm text-gray-500">{item.itemCode}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-orange-600">
                      {Number(item.currentStock).toFixed(2)} {item.baseUnit}
                    </p>
                    <p className="text-xs text-gray-500">
                      Reorder at: {Number(item.reorderLevel).toFixed(2)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
