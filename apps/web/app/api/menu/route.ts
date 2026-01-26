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

/**
 * GET /api/menu
 * Get menu items with optional filters
 * Query params:
 *   - active: "true" to only return available items
 *   - categoryId: filter by category
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const active = searchParams.get("active");
    const categoryId = searchParams.get("categoryId");

    // Build where clause
    const where: any = { restaurantId: session.restaurantId };

    // If active=true, only return available items
    if (active === "true") {
      where.isAvailable = true;
    }

    // Filter by category if provided
    if (categoryId) {
      where.categoryId = categoryId;
    }

    const items = await prisma.menuItem.findMany({
      where,
      include: {
        category: {
          select: {
            id: true,
            name: true,
            nameLocal: true,
          },
        },
      },
      orderBy: [
        { category: { sortOrder: "asc" } },
        { sortOrder: "asc" },
      ],
    });

    type MenuItemWithCategory = typeof items[number];

    // Transform items to include flattened variants array for quick-order compatibility
    const transformedItems = items.map((item: MenuItemWithCategory) => {
      // Parse variantGroups JSON and flatten to variants array
      let variants: Array<{ id: string; name: string; price: number }> = [];

      if (item.variantGroups) {
        try {
          const groups = item.variantGroups as unknown as VariantGroup[];
          if (Array.isArray(groups)) {
            groups.forEach((group: VariantGroup, groupIndex: number) => {
              if (group.options && Array.isArray(group.options)) {
                group.options.forEach((option: VariantGroup["options"][number], optionIndex: number) => {
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
      };
    });

    return NextResponse.json({ items: transformedItems });
  } catch (error) {
    console.error("Error fetching menu:", error);
    return NextResponse.json(
      { error: "Failed to fetch menu" },
      { status: 500 }
    );
  }
}
