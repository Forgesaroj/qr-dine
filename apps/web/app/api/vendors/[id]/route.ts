import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// Roles that can manage vendors
const VENDOR_MANAGEMENT_ROLES = ["OWNER", "MANAGER", "ACCOUNTANT"];

// ═══════════════════════════════════════════════════════════════════════════════
// GET - Get single vendor details
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

    const vendor = await prisma.vendor.findFirst({
      where: {
        id,
        restaurantId: session.restaurantId,
      },
      include: {
        purchases: {
          orderBy: { purchaseDateAd: "desc" },
          take: 10,
          select: {
            id: true,
            purchaseNumber: true,
            purchaseDateBs: true,
            totalAmount: true,
            paymentStatus: true,
            status: true,
          },
        },
        _count: {
          select: { purchases: true },
        },
      },
    });

    if (!vendor) {
      return NextResponse.json({ error: "Vendor not found" }, { status: 404 });
    }

    return NextResponse.json({
      vendor: {
        ...vendor,
        purchaseCount: vendor._count.purchases,
        recentPurchases: vendor.purchases,
      },
    });
  } catch (error) {
    console.error("Error fetching vendor:", error);
    return NextResponse.json(
      { error: "Failed to fetch vendor" },
      { status: 500 }
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// PATCH - Update vendor
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

    if (!VENDOR_MANAGEMENT_ROLES.includes(session.role)) {
      return NextResponse.json(
        { error: "You do not have permission to update vendors" },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await request.json();

    // Check if vendor exists
    const existingVendor = await prisma.vendor.findFirst({
      where: {
        id,
        restaurantId: session.restaurantId,
      },
    });

    if (!existingVendor) {
      return NextResponse.json({ error: "Vendor not found" }, { status: 404 });
    }

    // Validate PAN format if provided
    if (body.panNumber && !/^\d{9}$/.test(body.panNumber)) {
      return NextResponse.json(
        { error: "PAN number must be 9 digits" },
        { status: 400 }
      );
    }

    // Check if PAN already exists (if changing)
    if (body.panNumber && body.panNumber !== existingVendor.panNumber) {
      const duplicateVendor = await prisma.vendor.findFirst({
        where: {
          restaurantId: session.restaurantId,
          panNumber: body.panNumber,
          id: { not: id },
        },
      });

      if (duplicateVendor) {
        return NextResponse.json(
          { error: "A vendor with this PAN number already exists" },
          { status: 400 }
        );
      }
    }

    // Build update data
    const updateData: Record<string, unknown> = {};
    const allowedFields = [
      "name",
      "nameLocal",
      "panNumber",
      "vatNumber",
      "address",
      "city",
      "phone",
      "email",
      "contactName",
      "bankName",
      "bankBranch",
      "accountNumber",
      "accountName",
      "creditDays",
      "categories",
      "notes",
      "status",
    ];

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    }

    const vendor = await prisma.vendor.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      message: "Vendor updated successfully",
      vendor,
    });
  } catch (error) {
    console.error("Error updating vendor:", error);
    return NextResponse.json(
      { error: "Failed to update vendor" },
      { status: 500 }
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// DELETE - Delete/Deactivate vendor
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

    if (!VENDOR_MANAGEMENT_ROLES.includes(session.role)) {
      return NextResponse.json(
        { error: "You do not have permission to delete vendors" },
        { status: 403 }
      );
    }

    const { id } = await params;

    // Check if vendor exists
    const vendor = await prisma.vendor.findFirst({
      where: {
        id,
        restaurantId: session.restaurantId,
      },
      include: {
        _count: {
          select: { purchases: true },
        },
      },
    });

    if (!vendor) {
      return NextResponse.json({ error: "Vendor not found" }, { status: 404 });
    }

    // If vendor has purchases, soft delete (deactivate)
    if (vendor._count.purchases > 0) {
      await prisma.vendor.update({
        where: { id },
        data: { status: "INACTIVE" },
      });

      return NextResponse.json({
        success: true,
        message: "Vendor deactivated (has purchase history)",
        softDeleted: true,
      });
    }

    // If no purchases, hard delete
    await prisma.vendor.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: "Vendor deleted successfully",
      softDeleted: false,
    });
  } catch (error) {
    console.error("Error deleting vendor:", error);
    return NextResponse.json(
      { error: "Failed to delete vendor" },
      { status: 500 }
    );
  }
}
