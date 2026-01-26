import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/guest/qr-scan
 * Track when a guest scans the QR code (before OTP entry)
 * This enables the 2-minute OTP help timer per spec
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tableId, restaurantId, deviceInfo } = body;

    if (!tableId || !restaurantId) {
      return NextResponse.json(
        { error: "Missing tableId or restaurantId" },
        { status: 400 }
      );
    }

    // Check if table exists and is valid
    const table = await prisma.table.findUnique({
      where: { id: tableId },
      select: {
        id: true,
        tableNumber: true,
        name: true,
        status: true,
        currentOtp: true,
        restaurantId: true,
        restaurant: {
          select: { name: true, slug: true },
        },
      },
    });

    if (!table || table.restaurantId !== restaurantId) {
      return NextResponse.json(
        { error: "Invalid table" },
        { status: 404 }
      );
    }

    // Create a preliminary session record to track QR scan
    // This will be converted to a full session when OTP is verified
    // Or check if there's already an active session
    const existingSession = await prisma.tableSession.findFirst({
      where: {
        tableId,
        status: "ACTIVE",
      },
    });

    const now = new Date();

    if (existingSession) {
      // Update existing session with scan info if not already scanned
      if (!existingSession.qrScannedAt) {
        await prisma.tableSession.update({
          where: { id: existingSession.id },
          data: {
            qrScannedAt: now,
            qrScanDeviceInfo: deviceInfo || null,
          },
        });
      }

      return NextResponse.json({
        success: true,
        sessionId: existingSession.id,
        scannedAt: existingSession.qrScannedAt || now,
        table: {
          id: table.id,
          tableNumber: table.tableNumber,
          name: table.name,
          status: table.status,
        },
        restaurant: table.restaurant,
        hasActiveSession: true,
        requiresOtp: !existingSession.otpVerified,
      });
    }

    // Create a new pre-session record to track QR scan timing
    // This session is in CREATED phase until OTP is verified
    const newSession = await prisma.tableSession.create({
      data: {
        restaurantId,
        tableId,
        status: "ACTIVE",
        phase: "CREATED",
        qrScannedAt: now,
        qrScanDeviceInfo: deviceInfo || null,
        startedByType: "GUEST",
        otpVerified: false,
        guestCount: 0, // Will be set after OTP verification
      },
    });

    // Schedule OTP help alert (will be processed by background job)
    // For now, we just track the scan time and let the polling check for help needs

    return NextResponse.json({
      success: true,
      sessionId: newSession.id,
      scannedAt: now,
      table: {
        id: table.id,
        tableNumber: table.tableNumber,
        name: table.name,
        status: table.status,
      },
      restaurant: table.restaurant,
      hasActiveSession: false,
      requiresOtp: true,
    });
  } catch (error) {
    console.error("Error tracking QR scan:", error);
    return NextResponse.json(
      { error: "Failed to track QR scan" },
      { status: 500 }
    );
  }
}
