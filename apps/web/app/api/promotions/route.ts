import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const type = searchParams.get("type");

    const promotions = await prisma.promotion.findMany({
      where: {
        restaurantId: session.restaurantId,
        ...(status && { status }),
        ...(type && { type }),
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ promotions });
  } catch (error) {
    console.error("Error fetching promotions:", error);
    return NextResponse.json(
      { error: "Failed to fetch promotions" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      name,
      description,
      internalNote,
      type,
      discountType,
      discountValue,
      maxDiscount,
      appliesTo,
      categoryIds,
      itemIds,
      promoCode,
      minOrderAmount,
      startDate,
      endDate,
      daysOfWeek,
      startTime,
      endTime,
      totalUsesLimit,
      perCustomerLimit,
      customerEligibility,
      eligibleTiers,
      showOnMenu,
      status,
    } = body;

    // Validate promo code uniqueness if provided
    if (promoCode) {
      const existingPromo = await prisma.promotion.findFirst({
        where: {
          restaurantId: session.restaurantId,
          promoCode: promoCode.toUpperCase(),
        },
      });
      if (existingPromo) {
        return NextResponse.json(
          { error: "Promo code already exists" },
          { status: 400 }
        );
      }
    }

    const promotion = await prisma.promotion.create({
      data: {
        restaurantId: session.restaurantId,
        name,
        description,
        internalNote,
        type,
        discountType,
        discountValue,
        maxDiscount,
        appliesTo: appliesTo || "ALL",
        categoryIds: categoryIds ? JSON.stringify(categoryIds) : undefined,
        itemIds: itemIds ? JSON.stringify(itemIds) : undefined,
        promoCode: promoCode ? promoCode.toUpperCase() : undefined,
        minOrderAmount,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        daysOfWeek: daysOfWeek ? JSON.stringify(daysOfWeek) : undefined,
        startTime,
        endTime,
        totalUsesLimit,
        perCustomerLimit,
        customerEligibility: customerEligibility || "ALL",
        eligibleTiers: eligibleTiers ? JSON.stringify(eligibleTiers) : undefined,
        showOnMenu: showOnMenu ?? true,
        status: status || "DRAFT",
        createdById: session.userId,
      },
    });

    return NextResponse.json({ promotion }, { status: 201 });
  } catch (error) {
    console.error("Error creating promotion:", error);
    return NextResponse.json(
      { error: "Failed to create promotion" },
      { status: 500 }
    );
  }
}
