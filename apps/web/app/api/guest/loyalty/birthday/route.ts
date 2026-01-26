import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { canClaimBirthdayBonus, awardBirthdayBonus } from "@/lib/loyalty";

// GET - Check birthday bonus status
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");
    const customerId = searchParams.get("customerId");

    if (!token && !customerId) {
      return NextResponse.json(
        { error: "Token or customer ID is required" },
        { status: 400 }
      );
    }

    let customerIdToCheck = customerId;

    // If token provided, look up customer
    if (token) {
      const device = await prisma.customerDevice.findFirst({
        where: { deviceFingerprint: token, isActive: true },
        include: { customer: { select: { id: true } } },
      });

      if (!device?.customer) {
        return NextResponse.json(
          { error: "Invalid token" },
          { status: 401 }
        );
      }

      customerIdToCheck = device.customer.id;
    }

    if (!customerIdToCheck) {
      return NextResponse.json(
        { error: "Customer not found" },
        { status: 404 }
      );
    }

    const result = await canClaimBirthdayBonus(customerIdToCheck);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error checking birthday bonus:", error);
    return NextResponse.json(
      { error: "Failed to check birthday bonus" },
      { status: 500 }
    );
  }
}

// POST - Claim birthday bonus
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, customerId } = body;

    if (!token && !customerId) {
      return NextResponse.json(
        { error: "Token or customer ID is required" },
        { status: 400 }
      );
    }

    let customerIdToClaim = customerId;

    // If token provided, look up customer
    if (token) {
      const device = await prisma.customerDevice.findFirst({
        where: { deviceFingerprint: token, isActive: true },
        include: { customer: { select: { id: true } } },
      });

      if (!device?.customer) {
        return NextResponse.json(
          { error: "Invalid token" },
          { status: 401 }
        );
      }

      customerIdToClaim = device.customer.id;
    }

    if (!customerIdToClaim) {
      return NextResponse.json(
        { error: "Customer not found" },
        { status: 404 }
      );
    }

    const result = await awardBirthdayBonus(customerIdToClaim);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      pointsAwarded: result.pointsAwarded,
      newBalance: result.newBalance,
      message: "Happy Birthday! Your bonus points have been added.",
    });
  } catch (error) {
    console.error("Error claiming birthday bonus:", error);
    return NextResponse.json(
      { error: "Failed to claim birthday bonus" },
      { status: 500 }
    );
  }
}
