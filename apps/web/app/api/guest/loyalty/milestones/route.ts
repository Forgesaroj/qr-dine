import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getLoyaltySettings, getNextMilestone, defaultLoyaltySettings } from "@/lib/loyalty";

// GET - Get milestone progress for customer
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");
    const restaurantSlug = searchParams.get("restaurant");

    if (!token || !restaurantSlug) {
      return NextResponse.json(
        { error: "Token and restaurant are required" },
        { status: 400 }
      );
    }

    // Look up customer from token
    const device = await prisma.customerDevice.findFirst({
      where: { deviceFingerprint: token, isActive: true },
      include: {
        customer: {
          include: {
            restaurant: { select: { id: true, settings: true } },
          },
        },
      },
    });

    if (!device?.customer) {
      return NextResponse.json(
        { error: "Invalid token" },
        { status: 401 }
      );
    }

    const customer = device.customer;
    const settings = await getLoyaltySettings(customer.restaurantId);

    // Get milestone data
    const milestones = settings.visitMilestones || defaultLoyaltySettings.visitMilestones;
    const milestoneNumbers = Object.keys(milestones)
      .map(Number)
      .sort((a, b) => a - b);

    // Get achieved milestones
    const achievedMilestones = milestoneNumbers.filter(m => m <= customer.totalVisits);

    // Get next milestone
    const nextMilestone = getNextMilestone(customer.totalVisits, settings);

    // Get milestone history (bonus transactions)
    const milestoneHistory = await prisma.pointsTransaction.findMany({
      where: {
        customerId: customer.id,
        type: "BONUS",
        bonusType: "MILESTONE",
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    });

    type MilestoneTransaction = typeof milestoneHistory[number];

    return NextResponse.json({
      currentVisits: customer.totalVisits,
      achievedMilestones: achievedMilestones.map((m: number) => ({
        visitNumber: m,
        pointsAwarded: milestones[m],
      })),
      nextMilestone,
      allMilestones: milestoneNumbers.map((m: number) => ({
        visitNumber: m,
        pointsReward: milestones[m],
        achieved: m <= customer.totalVisits,
      })),
      recentMilestoneRewards: milestoneHistory.map((t: MilestoneTransaction) => ({
        points: t.points,
        reason: t.reason,
        date: t.createdAt,
      })),
    });
  } catch (error) {
    console.error("Error fetching milestone progress:", error);
    return NextResponse.json(
      { error: "Failed to fetch milestone progress" },
      { status: 500 }
    );
  }
}
