import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const promotion = await prisma.promotion.findFirst({
      where: {
        id,
        restaurantId: session.restaurantId,
      },
      include: {
        usages: {
          include: {
            order: {
              select: {
                orderNumber: true,
                totalAmount: true,
              },
            },
          },
          orderBy: { usedAt: "desc" },
          take: 20,
        },
      },
    });

    if (!promotion) {
      return NextResponse.json(
        { error: "Promotion not found" },
        { status: 404 }
      );
    }

    // Parse JSON fields
    const parsedPromotion = {
      ...promotion,
      categoryIds: promotion.categoryIds
        ? JSON.parse(promotion.categoryIds as string)
        : null,
      itemIds: promotion.itemIds
        ? JSON.parse(promotion.itemIds as string)
        : null,
      daysOfWeek: promotion.daysOfWeek
        ? JSON.parse(promotion.daysOfWeek as string)
        : null,
      eligibleTiers: promotion.eligibleTiers
        ? JSON.parse(promotion.eligibleTiers as string)
        : null,
    };

    return NextResponse.json({ promotion: parsedPromotion });
  } catch (error) {
    console.error("Error fetching promotion:", error);
    return NextResponse.json(
      { error: "Failed to fetch promotion" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();

    // Verify ownership
    const existing = await prisma.promotion.findFirst({
      where: {
        id,
        restaurantId: session.restaurantId,
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Promotion not found" },
        { status: 404 }
      );
    }

    // Handle promo code uniqueness check
    if (body.promoCode && body.promoCode !== existing.promoCode) {
      const duplicate = await prisma.promotion.findFirst({
        where: {
          restaurantId: session.restaurantId,
          promoCode: body.promoCode.toUpperCase(),
          NOT: { id },
        },
      });
      if (duplicate) {
        return NextResponse.json(
          { error: "Promo code already exists" },
          { status: 400 }
        );
      }
    }

    // Build update data
    const updateData: any = {};
    const fields = [
      "name",
      "description",
      "internalNote",
      "type",
      "discountType",
      "discountValue",
      "maxDiscount",
      "appliesTo",
      "minOrderAmount",
      "startTime",
      "endTime",
      "totalUsesLimit",
      "perCustomerLimit",
      "customerEligibility",
      "showOnMenu",
      "status",
    ];

    fields.forEach((field) => {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    });

    // Handle dates
    if (body.startDate !== undefined) {
      updateData.startDate = body.startDate ? new Date(body.startDate) : null;
    }
    if (body.endDate !== undefined) {
      updateData.endDate = body.endDate ? new Date(body.endDate) : null;
    }

    // Handle JSON fields
    if (body.categoryIds !== undefined) {
      updateData.categoryIds = body.categoryIds
        ? JSON.stringify(body.categoryIds)
        : null;
    }
    if (body.itemIds !== undefined) {
      updateData.itemIds = body.itemIds ? JSON.stringify(body.itemIds) : null;
    }
    if (body.daysOfWeek !== undefined) {
      updateData.daysOfWeek = body.daysOfWeek
        ? JSON.stringify(body.daysOfWeek)
        : null;
    }
    if (body.eligibleTiers !== undefined) {
      updateData.eligibleTiers = body.eligibleTiers
        ? JSON.stringify(body.eligibleTiers)
        : null;
    }
    if (body.promoCode !== undefined) {
      updateData.promoCode = body.promoCode
        ? body.promoCode.toUpperCase()
        : null;
    }

    const promotion = await prisma.promotion.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ promotion });
  } catch (error) {
    console.error("Error updating promotion:", error);
    return NextResponse.json(
      { error: "Failed to update promotion" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Verify ownership
    const existing = await prisma.promotion.findFirst({
      where: {
        id,
        restaurantId: session.restaurantId,
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Promotion not found" },
        { status: 404 }
      );
    }

    // Delete promotion (this will cascade delete usages)
    await prisma.promotion.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting promotion:", error);
    return NextResponse.json(
      { error: "Failed to delete promotion" },
      { status: 500 }
    );
  }
}
