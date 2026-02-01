import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Roles that can manage stock categories
const STOCK_MANAGEMENT_ROLES = ["OWNER", "MANAGER", "ACCOUNTANT"];

// ═══════════════════════════════════════════════════════════════════════════════
// GET - List all stock categories
// ═══════════════════════════════════════════════════════════════════════════════

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const includeItems = searchParams.get("includeItems") === "true";
    const hierarchical = searchParams.get("hierarchical") === "true";

    // Base query
    const categories = await prisma.stockCategory.findMany({
      where: {
        restaurantId: session.restaurantId,
      },
      include: {
        parent: {
          select: { id: true, name: true, code: true },
        },
        children: {
          select: { id: true, name: true, code: true },
        },
        ...(includeItems && {
          stockItems: {
            select: {
              id: true,
              itemCode: true,
              name: true,
              currentStock: true,
              baseUnit: true,
            },
            where: { isActive: true },
          },
        }),
        _count: {
          select: { stockItems: true, children: true },
        },
      },
      orderBy: [{ code: "asc" }, { name: "asc" }],
    });

    // If hierarchical view requested, build tree structure
    if (hierarchical) {
      const rootCategories = categories.filter((c) => !c.parentId);
      const buildTree = (parentId: string | null): typeof categories => {
        return categories
          .filter((c) => c.parentId === parentId)
          .map((category) => ({
            ...category,
            children: buildTree(category.id),
          }));
      };

      return NextResponse.json({
        categories: buildTree(null),
        total: categories.length,
      });
    }

    return NextResponse.json({
      categories,
      total: categories.length,
    });
  } catch (error) {
    console.error("Error fetching stock categories:", error);
    return NextResponse.json(
      { error: "Failed to fetch stock categories" },
      { status: 500 }
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// POST - Create a new stock category
// ═══════════════════════════════════════════════════════════════════════════════

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!STOCK_MANAGEMENT_ROLES.includes(session.role)) {
      return NextResponse.json(
        { error: "You do not have permission to create stock categories" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { code, name, description, parentId } = body;

    // Validate required fields
    if (!name) {
      return NextResponse.json(
        { error: "Category name is required" },
        { status: 400 }
      );
    }

    // Generate code if not provided
    let categoryCode = code?.toUpperCase().replace(/\s+/g, "_");
    if (!categoryCode) {
      // Auto-generate code from name
      categoryCode = name.toUpperCase().replace(/\s+/g, "_").substring(0, 10);

      // Check for uniqueness and add suffix if needed
      const existing = await prisma.stockCategory.findFirst({
        where: {
          restaurantId: session.restaurantId,
          code: { startsWith: categoryCode },
        },
        orderBy: { code: "desc" },
      });

      if (existing) {
        const match = existing.code.match(/_(\d+)$/);
        const suffix = match ? parseInt(match[1]) + 1 : 1;
        categoryCode = `${categoryCode}_${suffix}`;
      }
    }

    // Check if code already exists
    const existingCode = await prisma.stockCategory.findFirst({
      where: {
        restaurantId: session.restaurantId,
        code: categoryCode,
      },
    });

    if (existingCode) {
      return NextResponse.json(
        { error: "Category code already exists" },
        { status: 400 }
      );
    }

    // Validate parent exists if provided
    if (parentId) {
      const parent = await prisma.stockCategory.findFirst({
        where: {
          id: parentId,
          restaurantId: session.restaurantId,
        },
      });

      if (!parent) {
        return NextResponse.json(
          { error: "Parent category not found" },
          { status: 400 }
        );
      }
    }

    // Create category
    const category = await prisma.stockCategory.create({
      data: {
        restaurantId: session.restaurantId,
        code: categoryCode,
        name,
        description,
        parentId,
      },
      include: {
        parent: {
          select: { id: true, name: true, code: true },
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: "Category created successfully",
      category,
    });
  } catch (error) {
    console.error("Error creating stock category:", error);
    return NextResponse.json(
      { error: "Failed to create stock category" },
      { status: 500 }
    );
  }
}
