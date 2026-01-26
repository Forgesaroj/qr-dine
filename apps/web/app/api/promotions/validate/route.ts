import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { code, orderAmount, customerId, itemIds } = body;

    if (!code) {
      return NextResponse.json({ error: "Promo code is required" }, { status: 400 });
    }

    // Find the promotion by code
    const promotion = await prisma.promotion.findFirst({
      where: {
        restaurantId: session.restaurantId,
        promoCode: code.toUpperCase(),
        status: "ACTIVE",
      },
    });

    if (!promotion) {
      return NextResponse.json(
        { valid: false, error: "Invalid or expired promo code" },
        { status: 200 }
      );
    }

    // Check date validity
    const now = new Date();
    if (promotion.startDate && new Date(promotion.startDate) > now) {
      return NextResponse.json(
        { valid: false, error: "This promo code is not yet active" },
        { status: 200 }
      );
    }
    if (promotion.endDate && new Date(promotion.endDate) < now) {
      return NextResponse.json(
        { valid: false, error: "This promo code has expired" },
        { status: 200 }
      );
    }

    // Check time validity (for happy hour type)
    if (promotion.startTime && promotion.endTime) {
      const currentTime = now.toTimeString().slice(0, 5);
      if (currentTime < promotion.startTime || currentTime > promotion.endTime) {
        return NextResponse.json(
          {
            valid: false,
            error: `This code is only valid between ${promotion.startTime} and ${promotion.endTime}`,
          },
          { status: 200 }
        );
      }
    }

    // Check day validity
    if (promotion.daysOfWeek) {
      const daysOfWeek: number[] = JSON.parse(promotion.daysOfWeek as string);
      const currentDay = now.getDay();
      if (!daysOfWeek.includes(currentDay)) {
        return NextResponse.json(
          { valid: false, error: "This promo code is not valid today" },
          { status: 200 }
        );
      }
    }

    // Check total uses limit
    if (
      promotion.totalUsesLimit &&
      promotion.totalUsesCount >= promotion.totalUsesLimit
    ) {
      return NextResponse.json(
        { valid: false, error: "This promo code has reached its usage limit" },
        { status: 200 }
      );
    }

    // Check per customer limit
    if (promotion.perCustomerLimit && customerId) {
      const customerUsageCount = await prisma.promotionUsage.count({
        where: {
          promotionId: promotion.id,
          customerId,
        },
      });
      if (customerUsageCount >= promotion.perCustomerLimit) {
        return NextResponse.json(
          {
            valid: false,
            error: "You have already used this promo code the maximum number of times",
          },
          { status: 200 }
        );
      }
    }

    // Check minimum order amount
    if (promotion.minOrderAmount && orderAmount < promotion.minOrderAmount) {
      return NextResponse.json(
        {
          valid: false,
          error: `Minimum order amount of Rs.${promotion.minOrderAmount} required`,
        },
        { status: 200 }
      );
    }

    // Check customer eligibility (tier-based)
    if (
      promotion.customerEligibility === "REGISTERED" ||
      promotion.customerEligibility === "TIER"
    ) {
      if (!customerId) {
        return NextResponse.json(
          {
            valid: false,
            error: "Please login to use this promo code",
          },
          { status: 200 }
        );
      }

      if (promotion.customerEligibility === "TIER" && promotion.eligibleTiers) {
        const customer = await prisma.customer.findUnique({
          where: { id: customerId },
        });
        const eligibleTiers = JSON.parse(promotion.eligibleTiers as string);
        if (!customer || !eligibleTiers.includes(customer.tier)) {
          return NextResponse.json(
            {
              valid: false,
              error: "This promo code is not available for your membership tier",
            },
            { status: 200 }
          );
        }
      }
    }

    // Check item eligibility
    if (promotion.appliesTo === "ITEMS" && promotion.itemIds && itemIds) {
      const promoItemIds = JSON.parse(promotion.itemIds as string);
      const hasEligibleItem = itemIds.some((id: string) =>
        promoItemIds.includes(id)
      );
      if (!hasEligibleItem) {
        return NextResponse.json(
          {
            valid: false,
            error: "This promo code does not apply to items in your order",
          },
          { status: 200 }
        );
      }
    }

    // Check category eligibility
    if (promotion.appliesTo === "CATEGORY" && promotion.categoryIds && itemIds) {
      const promoCategoryIds = JSON.parse(promotion.categoryIds as string);
      const orderItems = await prisma.menuItem.findMany({
        where: { id: { in: itemIds } },
        select: { categoryId: true },
      });
      const hasEligibleCategory = orderItems.some((item) =>
        promoCategoryIds.includes(item.categoryId)
      );
      if (!hasEligibleCategory) {
        return NextResponse.json(
          {
            valid: false,
            error: "This promo code does not apply to items in your order",
          },
          { status: 200 }
        );
      }
    }

    // Calculate discount
    let discountAmount = 0;
    if (promotion.discountType === "PERCENTAGE") {
      discountAmount = (orderAmount * promotion.discountValue) / 100;
      if (promotion.maxDiscount && discountAmount > promotion.maxDiscount) {
        discountAmount = promotion.maxDiscount;
      }
    } else if (promotion.discountType === "FIXED") {
      discountAmount = promotion.discountValue;
    }

    // Cap discount at order amount
    if (discountAmount > orderAmount) {
      discountAmount = orderAmount;
    }

    return NextResponse.json({
      valid: true,
      promotion: {
        id: promotion.id,
        name: promotion.name,
        description: promotion.description,
        type: promotion.type,
        discountType: promotion.discountType,
        discountValue: promotion.discountValue,
        maxDiscount: promotion.maxDiscount,
      },
      discountAmount,
      finalAmount: orderAmount - discountAmount,
    });
  } catch (error) {
    console.error("Error validating promo code:", error);
    return NextResponse.json(
      { error: "Failed to validate promo code" },
      { status: 500 }
    );
  }
}
