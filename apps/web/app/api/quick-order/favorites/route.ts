import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

interface VariantGroup {
  name: string;
  options: Array<{
    id?: string;
    name: string;
    price: number;
  }>;
}

// GET frequently ordered items for quick order
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "20");

    // Get most ordered items in the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Aggregate order items by menu item
    const popularItems = await prisma.orderItem.groupBy({
      by: ["menuItemId"],
      where: {
        order: {
          restaurantId: session.restaurantId,
          createdAt: { gte: thirtyDaysAgo },
          status: { notIn: ["CANCELLED"] },
        },
      },
      _count: {
        menuItemId: true,
      },
      _sum: {
        quantity: true,
      },
      orderBy: {
        _count: {
          menuItemId: "desc",
        },
      },
      take: limit,
    });

    // Get full menu item details
    type PopularItemType = typeof popularItems[number];
    const menuItemIds = popularItems.map((p: PopularItemType) => p.menuItemId);
    const menuItems = await prisma.menuItem.findMany({
      where: {
        id: { in: menuItemIds },
        isAvailable: true,
      },
      include: {
        category: {
          select: { id: true, name: true },
        },
      },
    });

    // Combine with order counts and transform variantGroups to variants
    type MenuItemType = typeof menuItems[number];
    const favorites = menuItems.map((item: MenuItemType) => {
      const stats = popularItems.find((p: PopularItemType) => p.menuItemId === item.id);

      // Transform variantGroups to variants array
      let variants: Array<{ id: string; name: string; price: number }> = [];
      if (item.variantGroups) {
        try {
          const groups = item.variantGroups as unknown as VariantGroup[];
          if (Array.isArray(groups)) {
            groups.forEach((group, groupIndex) => {
              if (group.options && Array.isArray(group.options)) {
                group.options.forEach((option, optionIndex) => {
                  variants.push({
                    id: option.id || `${item.id}-${groupIndex}-${optionIndex}`,
                    name: group.name ? `${group.name}: ${option.name}` : option.name,
                    price: option.price || item.basePrice,
                  });
                });
              }
            });
          }
        } catch (e) {
          // If parsing fails, keep variants empty
        }
      }

      return {
        ...item,
        variants,
        orderCount: stats?._count.menuItemId || 0,
        totalQuantity: stats?._sum.quantity || 0,
      };
    }).sort((a: { orderCount: number }, b: { orderCount: number }) => b.orderCount - a.orderCount);

    return NextResponse.json({ favorites });
  } catch (error) {
    console.error("Error fetching favorites:", error);
    return NextResponse.json(
      { error: "Failed to fetch favorites" },
      { status: 500 }
    );
  }
}
