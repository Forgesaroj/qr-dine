import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { recordQrScan } from "@/lib/services/qr-scan.service";

/**
 * POST /api/guest/qr-scan
 * Track when a guest scans the QR code (before OTP entry)
 * This enables the 2-minute OTP help timer per spec
 *
 * Per SESSION_FLOW_SPEC.md - creates QrScanEvent for tracking
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tableId, restaurantId, deviceInfo, deviceFingerprint, ipAddress, userAgent } = body;

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

    const now = new Date();

    // Create QrScanEvent for analytics and help timer tracking
    const scanEvent = await recordQrScan({
      restaurantId,
      tableId,
      deviceFingerprint: deviceFingerprint || deviceInfo?.fingerprint,
      ipAddress: ipAddress || request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || undefined,
      userAgent: userAgent || request.headers.get("user-agent") || undefined,
    });

    // Check for existing active session
    const existingSession = await prisma.tableSession.findFirst({
      where: {
        tableId,
        status: "ACTIVE",
      },
    });

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

      // Link scan event to existing session
      await prisma.qrScanEvent.update({
        where: { id: scanEvent.id },
        data: { sessionId: existingSession.id },
      });

      return NextResponse.json({
        success: true,
        sessionId: existingSession.id,
        scanEventId: scanEvent.id,
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

    // Link scan event to new session
    await prisma.qrScanEvent.update({
      where: { id: scanEvent.id },
      data: { sessionId: newSession.id },
    });

    return NextResponse.json({
      success: true,
      sessionId: newSession.id,
      scanEventId: scanEvent.id,
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
