import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Roles that can manage stock categories
const STOCK_MANAGEMENT_ROLES = ["OWNER", "MANAGER", "ACCOUNTANT"];

// ═══════════════════════════════════════════════════════════════════════════════
// GET - Get a single stock category with details
// ═══════════════════════════════════════════════════════════════════════════════

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const category = await prisma.stockCategory.findFirst({
      where: {
        id,
        restaurantId: session.restaurantId,
      },
      include: {
        parent: {
          select: { id: true, name: true, code: true },
        },
        children: {
          select: {
            id: true,
            name: true,
            code: true,
            _count: { select: { stockItems: true } },
          },
        },
        stockItems: {
          select: {
            id: true,
            itemCode: true,
            name: true,
            currentStock: true,
            baseUnit: true,
            reorderLevel: true,
            averageCost: true,
            isActive: true,
          },
          orderBy: { name: "asc" },
        },
        _count: {
          select: { stockItems: true, children: true },
        },
      },
    });

    if (!category) {
      return NextResponse.json(
        { error: "Category not found" },
        { status: 404 }
      );
    }

    // Calculate total stock value in this category
    const stockValue = category.stockItems.reduce((sum, item) => {
      return sum + Number(item.currentStock) * Number(item.averageCost);
    }, 0);

    return NextResponse.json({
      category,
      stats: {
        totalItems: category._count.stockItems,
        totalSubcategories: category._count.children,
        stockValue,
      },
    });
  } catch (error) {
    console.error("Error fetching stock category:", error);
    return NextResponse.json(
      { error: "Failed to fetch stock category" },
      { status: 500 }
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// PATCH - Update a stock category
// ═══════════════════════════════════════════════════════════════════════════════

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!STOCK_MANAGEMENT_ROLES.includes(session.role)) {
      return NextResponse.json(
        { error: "You do not have permission to update stock categories" },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const { code, name, description, parentId } = body;

    // Check if category exists
    const existingCategory = await prisma.stockCategory.findFirst({
      where: {
        id,
        restaurantId: session.restaurantId,
      },
    });

    if (!existingCategory) {
      return NextResponse.json(
        { error: "Category not found" },
        { status: 404 }
      );
    }

    // Build update data
    const updateData: Record<string, unknown> = {};

    if (name !== undefined) {
      updateData.name = name;
    }

    if (description !== undefined) {
      updateData.description = description;
    }

    if (code !== undefined) {
      const newCode = code.toUpperCase().replace(/\s+/g, "_");

      // Check if code already exists for another category
      const codeExists = await prisma.stockCategory.findFirst({
        where: {
          restaurantId: session.restaurantId,
          code: newCode,
          id: { not: id },
        },
      });

      if (codeExists) {
        return NextResponse.json(
          { error: "Category code already exists" },
          { status: 400 }
        );
      }

      updateData.code = newCode;
    }

    if (parentId !== undefined) {
      // Prevent setting self as parent
      if (parentId === id) {
        return NextResponse.json(
          { error: "Category cannot be its own parent" },
          { status: 400 }
        );
      }

      // Prevent circular reference
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

        // Check if the new parent is a descendant of this category
        const checkCircular = async (categoryId: string): Promise<boolean> => {
          const children = await prisma.stockCategory.findMany({
            where: { parentId: categoryId },
            select: { id: true },
          });

          for (const child of children) {
            if (child.id === parentId) return true;
            if (await checkCircular(child.id)) return true;
          }
          return false;
        };

        if (await checkCircular(id)) {
          return NextResponse.json(
            { error: "Cannot set a descendant as parent (circular reference)" },
            { status: 400 }
          );
        }
      }

      updateData.parentId = parentId;
    }

    // Update category
    const category = await prisma.stockCategory.update({
      where: { id },
      data: updateData,
      include: {
        parent: {
          select: { id: true, name: true, code: true },
        },
        _count: {
          select: { stockItems: true, children: true },
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: "Category updated successfully",
      category,
    });
  } catch (error) {
    console.error("Error updating stock category:", error);
    return NextResponse.json(
      { error: "Failed to update stock category" },
      { status: 500 }
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// DELETE - Delete a stock category
// ═══════════════════════════════════════════════════════════════════════════════

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!STOCK_MANAGEMENT_ROLES.includes(session.role)) {
      return NextResponse.json(
        { error: "You do not have permission to delete stock categories" },
        { status: 403 }
      );
    }

    const { id } = await params;

    // Check if category exists
    const category = await prisma.stockCategory.findFirst({
      where: {
        id,
        restaurantId: session.restaurantId,
      },
      include: {
        _count: {
          select: { stockItems: true, children: true },
        },
      },
    });

    if (!category) {
      return NextResponse.json(
        { error: "Category not found" },
        { status: 404 }
      );
    }

    // Check if category has stock items
    if (category._count.stockItems > 0) {
      return NextResponse.json(
        {
          error: `Cannot delete category with ${category._count.stockItems} stock items. Move or delete items first.`,
        },
        { status: 400 }
      );
    }

    // Check if category has children
    if (category._count.children > 0) {
      return NextResponse.json(
        {
          error: `Cannot delete category with ${category._count.children} subcategories. Move or delete subcategories first.`,
        },
        { status: 400 }
      );
    }

    // Delete category
    await prisma.stockCategory.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: "Category deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting stock category:", error);
    return NextResponse.json(
      { error: "Failed to delete stock category" },
      { status: 500 }
    );
  }
}
