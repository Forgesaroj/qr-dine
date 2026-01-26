import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getExpiringPoints } from "@/lib/loyalty";

// GET - Check expiring points for customer
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");
    const days = parseInt(searchParams.get("days") || "30");

    if (!token) {
      return NextResponse.json(
        { error: "Token is required" },
        { status: 400 }
      );
    }

    // Look up customer from token
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

    const expiryInfo = await getExpiringPoints(device.customer.id, days);

    return NextResponse.json({
      ...expiryInfo,
      hasExpiringPoints: expiryInfo.expiringPoints > 0,
      message: expiryInfo.expiringPoints > 0
        ? `You have ${expiryInfo.expiringPoints} points expiring soon! Use them before they expire.`
        : null,
    });
  } catch (error) {
    console.error("Error checking expiring points:", error);
    return NextResponse.json(
      { error: "Failed to check expiring points" },
      { status: 500 }
    );
  }
}
