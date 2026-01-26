import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@qr-dine/ui";
import { Button } from "@qr-dine/ui";
import {
  Users,
  UtensilsCrossed,
  ShoppingCart,
  DollarSign,
  Clock,
  TrendingUp,
  ChefHat,
  QrCode,
} from "lucide-react";
import Link from "next/link";

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ restaurant: string }>;
}) {
  const { restaurant } = await params;
  const session = await getSession();

  if (!session) {
    return null;
  }

  // Get today's date range
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // Fetch dashboard data in parallel
  const [
    todayOrders,
    pendingOrders,
    preparingOrders,
    tables,
    recentOrders,
    menuItemCount,
    staffCount,
  ] = await Promise.all([
    // Today's orders with revenue
    prisma.order.findMany({
      where: {
        restaurantId: session.restaurantId,
        createdAt: { gte: today, lt: tomorrow },
      },
      select: {
        id: true,
        totalAmount: true,
        status: true,
      },
    }),
    // Pending orders count
    prisma.order.count({
      where: {
        restaurantId: session.restaurantId,
        status: "PENDING",
      },
    }),
    // Preparing orders count
    prisma.order.count({
      where: {
        restaurantId: session.restaurantId,
        status: "PREPARING",
      },
    }),
    // Tables with status
    prisma.table.findMany({
      where: { restaurantId: session.restaurantId },
      select: { id: true, status: true },
    }),
    // Recent orders
    prisma.order.findMany({
      where: { restaurantId: session.restaurantId },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: {
        table: { select: { tableNumber: true, name: true } },
        items: { select: { id: true } },
      },
    }),
    // Menu items count
    prisma.menuItem.count({
      where: { restaurantId: session.restaurantId },
    }),
    // Staff count
    prisma.user.count({
      where: { restaurantId: session.restaurantId, status: "ACTIVE" },
    }),
  ]);

  // Calculate stats
  const todayRevenue = todayOrders.reduce(
    (sum: number, order: { id: string; totalAmount: number | null; status: string }) => sum + (order.totalAmount || 0),
    0
  );
  const occupiedTables = tables.filter((t: { id: string; status: string }) => t.status === "OCCUPIED").length;
  const totalTables = tables.length;

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-NP", {
      style: "currency",
      currency: "NPR",
      minimumFractionDigits: 0,
    })
      .format(amount)
      .replace("NPR", "Rs.");
  };

  // Format time ago
  const formatTimeAgo = (date: Date) => {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    if (seconds < 60) return "Just now";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case "PENDING":
        return "bg-yellow-100 text-yellow-800";
      case "PREPARING":
        return "bg-blue-100 text-blue-800";
      case "READY":
        return "bg-green-100 text-green-800";
      case "SERVED":
        return "bg-gray-100 text-gray-800";
      case "CANCELLED":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back, {session?.email}
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Today's Orders</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{todayOrders.length}</div>
            <p className="text-xs text-muted-foreground">
              {pendingOrders > 0 && (
                <span className="text-yellow-600">{pendingOrders} pending</span>
              )}
              {pendingOrders > 0 && preparingOrders > 0 && " · "}
              {preparingOrders > 0 && (
                <span className="text-blue-600">{preparingOrders} preparing</span>
              )}
              {pendingOrders === 0 && preparingOrders === 0 && "No active orders"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Today's Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(todayRevenue)}</div>
            <p className="text-xs text-muted-foreground">
              <TrendingUp className="inline h-3 w-3 mr-1" />
              From {todayOrders.length} orders
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active Tables</CardTitle>
            <UtensilsCrossed className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {occupiedTables} / {totalTables}
            </div>
            <p className="text-xs text-muted-foreground">
              {totalTables - occupiedTables} available
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Menu Items</CardTitle>
            <ChefHat className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{menuItemCount}</div>
            <p className="text-xs text-muted-foreground">
              {staffCount} staff members
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3">
            <Link href={`/${restaurant}/orders`} className="inline-flex items-center justify-center h-auto py-4 flex-col gap-2 border rounded-md hover:bg-accent hover:text-accent-foreground">
              <ShoppingCart className="h-5 w-5" />
              <span>View Orders</span>
            </Link>
            <Link href={`/${restaurant}/kitchen`} className="inline-flex items-center justify-center h-auto py-4 flex-col gap-2 border rounded-md hover:bg-accent hover:text-accent-foreground">
              <ChefHat className="h-5 w-5" />
              <span>Kitchen Display</span>
            </Link>
            <Link href={`/${restaurant}/tables`} className="inline-flex items-center justify-center h-auto py-4 flex-col gap-2 border rounded-md hover:bg-accent hover:text-accent-foreground">
              <QrCode className="h-5 w-5" />
              <span>Manage Tables</span>
            </Link>
            <Link href={`/${restaurant}/menu`} className="inline-flex items-center justify-center h-auto py-4 flex-col gap-2 border rounded-md hover:bg-accent hover:text-accent-foreground">
              <UtensilsCrossed className="h-5 w-5" />
              <span>Edit Menu</span>
            </Link>
          </CardContent>
        </Card>

        {/* Recent Orders */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              Recent Orders
            </CardTitle>
            <Link href={`/${restaurant}/orders`} className="inline-flex items-center justify-center text-sm font-medium h-9 px-3 rounded-md hover:bg-accent hover:text-accent-foreground">
              View All
            </Link>
          </CardHeader>
          <CardContent>
            {recentOrders.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">
                No orders yet
              </p>
            ) : (
              <div className="space-y-3">
                {recentOrders.map((order: {
                    id: string;
                    orderNumber: string;
                    status: string;
                    totalAmount: number | null;
                    createdAt: Date;
                    table: { tableNumber: string; name: string | null } | null;
                    items: { id: string }[];
                  }) => (
                  <div
                    key={order.id}
                    className="flex items-center justify-between border-b pb-2 last:border-0"
                  >
                    <div>
                      <p className="font-medium">
                        {order.orderNumber}
                        {order.table && (
                          <span className="text-muted-foreground ml-2">
                            · Table {order.table.tableNumber}
                          </span>
                        )}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {order.items.length} items · {formatCurrency(order.totalAmount || 0)}
                      </p>
                    </div>
                    <div className="text-right">
                      <span
                        className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                          order.status
                        )}`}
                      >
                        {order.status}
                      </span>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatTimeAgo(order.createdAt)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}