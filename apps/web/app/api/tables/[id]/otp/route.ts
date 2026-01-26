import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// Generate a random 3-digit OTP (000-999)
function generateOTP(): string {
  return Math.floor(Math.random() * 1000).toString().padStart(3, "0");
}

// POST generate new OTP for table
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Verify table belongs to restaurant
    const existingTable = await prisma.table.findFirst({
      where: {
        id,
        restaurantId: session.restaurantId,
      },
    });

    if (!existingTable) {
      return NextResponse.json({ error: "Table not found" }, { status: 404 });
    }

    // Generate new OTP
    const otp = generateOTP();

    const table = await prisma.table.update({
      where: { id },
      data: {
        currentOtp: otp,
        otpGeneratedAt: new Date(),
      },
    });

    return NextResponse.json({
      otp: table.currentOtp,
      generatedAt: table.otpGeneratedAt,
    });
  } catch (error) {
    console.error("Error generating OTP:", error);
    return NextResponse.json(
      { error: "Failed to generate OTP" },
      { status: 500 }
    );
  }
}

// GET current OTP for table
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

    const table = await prisma.table.findFirst({
      where: {
        id,
        restaurantId: session.restaurantId,
      },
      select: {
        currentOtp: true,
        otpGeneratedAt: true,
      },
    });

    if (!table) {
      return NextResponse.json({ error: "Table not found" }, { status: 404 });
    }

    return NextResponse.json({
      otp: table.currentOtp,
      generatedAt: table.otpGeneratedAt,
    });
  } catch (error) {
    console.error("Error fetching OTP:", error);
    return NextResponse.json(
      { error: "Failed to fetch OTP" },
      { status: 500 }
    );
  }
}
