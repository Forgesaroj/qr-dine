import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { findRecentScanForTable, markOtpEntered, linkScanToSession } from "@/lib/services/qr-scan.service";

// POST verify OTP and create session
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { restaurant: restaurantSlug, table: tableId, otp, deviceInfo, scanEventId, deviceFingerprint } = body;

    if (!restaurantSlug || !tableId || !otp) {
      return NextResponse.json(
        { error: "Restaurant, table, and OTP are required" },
        { status: 400 }
      );
    }

    // Find restaurant
    const restaurant = await prisma.restaurant.findUnique({
      where: { slug: restaurantSlug },
      select: { id: true, status: true },
    });

    if (!restaurant || restaurant.status !== "ACTIVE") {
      return NextResponse.json(
        { error: "Restaurant not found or not active" },
        { status: 404 }
      );
    }

    // Find table
    const table = await prisma.table.findFirst({
      where: {
        restaurantId: restaurant.id,
        OR: [
          { id: tableId },
          { tableNumber: tableId },
        ],
      },
    });

    if (!table) {
      return NextResponse.json(
        { error: "Table not found" },
        { status: 404 }
      );
    }

    // Find the scan event for tracking attempts
    const ipAddress = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || undefined;
    let scanEvent = scanEventId
      ? await prisma.qrScanEvent.findUnique({ where: { id: scanEventId } })
      : await findRecentScanForTable(table.id, deviceFingerprint, ipAddress);

    // Verify OTP (no time-based expiry - OTP is valid until regenerated)
    if (!table.currentOtp || table.currentOtp !== otp) {
      // Track failed OTP attempt
      if (scanEvent) {
        await markOtpEntered(scanEvent.id, false);
      }
      return NextResponse.json(
        { error: "Invalid OTP. Please check and try again." },
        { status: 400 }
      );
    }

    const now = new Date();

    // Track successful OTP entry
    if (scanEvent) {
      await markOtpEntered(scanEvent.id, true);
    }

    // Check for existing active session (may have been created by qr-scan tracking)
    let session = await prisma.tableSession.findFirst({
      where: {
        tableId: table.id,
        status: "ACTIVE",
      },
    });

    // Create new session if none exists, or update existing one
    if (!session) {
      session = await prisma.tableSession.create({
        data: {
          restaurantId: restaurant.id,
          tableId: table.id,
          otpCode: otp,
          otpVerified: true,
          otpVerifiedAt: now,
          startedByType: "GUEST",
          status: "ACTIVE",
          phase: "SEATED", // Session phase: SEATED after OTP verification
          qrScannedAt: now, // If no pre-session, scan time = now
          qrScanDeviceInfo: deviceInfo || null,
          // Phase 1 Timestamps (Seating)
          seatedAt: now,
          waiterNotifiedAt: now, // Automatic - waiter is notified immediately
        },
      });

      // Update table status to OCCUPIED
      await prisma.table.update({
        where: { id: table.id },
        data: { status: "OCCUPIED" },
      });
    } else {
      // Update existing session (from qr-scan tracking)
      session = await prisma.tableSession.update({
        where: { id: session.id },
        data: {
          otpCode: otp,
          otpVerified: true,
          otpVerifiedAt: now,
          phase: "SEATED", // Transition from CREATED to SEATED
          seatedAt: session.seatedAt || now,
          waiterNotifiedAt: session.waiterNotifiedAt || now,
        },
      });

      // Update table status if not already occupied
      if (table.status !== "OCCUPIED") {
        await prisma.table.update({
          where: { id: table.id },
          data: { status: "OCCUPIED" },
        });
      }
    }

    // Record OTP usage in history
    await prisma.otpHistory.create({
      data: {
        tableId: table.id,
        restaurantId: restaurant.id,
        otpCode: otp,
        usedAt: now,
        sessionId: session.id,
      },
    });

    // Link scan event to session
    if (scanEvent && !scanEvent.sessionId) {
      await linkScanToSession(scanEvent.id, session.id);
    }

    // Resolve any pending OTP help alerts for this session
    await prisma.sessionAlert.updateMany({
      where: {
        sessionId: session.id,
        alertType: "otp_help",
        status: { in: ["ACTIVE", "ACKNOWLEDGED"] },
      },
      data: {
        status: "RESOLVED",
        resolvedAt: now,
        resolutionNote: "OTP verified successfully",
      },
    });

    return NextResponse.json({
      success: true,
      sessionId: session.id,
      tableNumber: table.tableNumber,
      phase: session.phase,
    });
  } catch (error) {
    console.error("Error verifying OTP:", error);
    return NextResponse.json(
      { error: "Failed to verify OTP" },
      { status: 500 }
    );
  }
}
