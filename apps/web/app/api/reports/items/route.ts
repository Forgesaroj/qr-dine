import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") || "month";

    // Calculate date range
    const now = new Date();
    let startDate: Date;

    switch (period) {
      case "week":
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case "quarter":
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case "year":
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      default: // month
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    // Fetch order items with menu item details
    const orderItems = await prisma.orderItem.findMany({
      where: {
        order: {
          restaurantId: session.restaurantId,
          createdAt: { gte: startDate },
          status: { notIn: ["CANCELLED"] },
        },
      },
      include: {
        menuItem: {
          include: {
            category: true,
          },
        },
      },
    });

    // Aggregate by item
    const itemMap: Record<string, {
      id: string;
      name: string;
      category: string;
      quantity: number;
      revenue: number;
    }> = {};

    type OrderItemType = typeof orderItems[number];
    orderItems.forEach((item: OrderItemType) => {
      const key = item.menuItemId;
      if (!itemMap[key]) {
        itemMap[key] = {
          id: key,
          name: item.menuItemName,
          category: item.menuItem?.category?.name || "Uncategorized",
          quantity: 0,
          revenue: 0,
        };
      }
      itemMap[key].quantity += item.quantity;
      itemMap[key].revenue += item.totalPrice;
    });

    type ItemData = { id: string; name: string; category: string; quantity: number; revenue: number };
    const allItems = Object.values(itemMap);
    const sortedByQuantity = [...allItems].sort((a: ItemData, b: ItemData) => b.quantity - a.quantity);

    // Top sellers (top 10)
    const topSellers = sortedByQuantity.slice(0, 10).map((item: ItemData) => ({
      ...item,
      averagePrice: item.quantity > 0 ? item.revenue / item.quantity : 0,
      trend: 0, // Would need historical data for trend
    }));

    // Worst sellers (bottom 10, with at least 1 sale)
    const worstSellers = sortedByQuantity
      .filter((item: ItemData) => item.quantity > 0)
      .slice(-10)
      .reverse()
      .map((item: ItemData) => ({
        ...item,
        averagePrice: item.quantity > 0 ? item.revenue / item.quantity : 0,
        trend: 0,
      }));

    // Group by category
    const categoryMap: Record<string, {
      category: string;
      items: Set<string>;
      quantity: number;
      revenue: number;
    }> = {};

    allItems.forEach((item: ItemData) => {
      if (!categoryMap[item.category]) {
        categoryMap[item.category] = {
          category: item.category,
          items: new Set(),
          quantity: 0,
          revenue: 0,
        };
      }
      const cat = categoryMap[item.category]!;
      cat.items.add(item.id);
      cat.quantity += item.quantity;
      cat.revenue += item.revenue;
    });

    type CategoryData = { category: string; items: Set<string>; quantity: number; revenue: number };
    const byCategory = Object.values(categoryMap)
      .map((cat: CategoryData) => ({
        category: cat.category,
        items: cat.items.size,
        quantity: cat.quantity,
        revenue: cat.revenue,
      }))
      .sort((a: { revenue: number }, b: { revenue: number }) => b.revenue - a.revenue);

    // Summary
    const totalItems = allItems.length;
    const totalQuantity = allItems.reduce((sum: number, item: ItemData) => sum + item.quantity, 0);
    const totalRevenue = allItems.reduce((sum: number, item: ItemData) => sum + item.revenue, 0);

    return NextResponse.json({
      topSellers,
      worstSellers,
      byCategory,
      summary: {
        totalItems,
        totalQuantity,
        totalRevenue,
      },
    });
  } catch (error) {
    console.error("Error fetching item report:", error);
    return NextResponse.json({ error: "Failed to fetch item report" }, { status: 500 });
  }
}
