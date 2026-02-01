import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// ═══════════════════════════════════════════════════════════════════════════════
// CBMS TEST ENVIRONMENT SETUP API
// Sets up IRD test credentials for CBMS integration testing
// ═══════════════════════════════════════════════════════════════════════════════

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only OWNER can configure CBMS
    if (!["OWNER", "SUPER_ADMIN"].includes(session.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // IRD Test Credentials (from IRD E-Billing API Documentation)
    const testCredentials = {
      apiUrl: "https://cbapi.ird.gov.np",
      username: "Test_CBMS",
      password: "test@321",
      sellerPan: "999999999",
      enabled: true,
      syncMode: "REALTIME" as const,
      maxRetry: 3,
      retryDelay: 15,
      batchInterval: 5,
      credentialsValid: true,
    };

    // Upsert CBMS config for current restaurant
    const cbmsConfig = await prisma.restaurantCBMSConfig.upsert({
      where: { restaurantId: session.restaurantId },
      update: {
        ...testCredentials,
        lastSyncStatus: "Test environment configured",
        lastSyncAt: new Date(),
      },
      create: {
        restaurantId: session.restaurantId,
        ...testCredentials,
        lastSyncStatus: "Test environment configured",
      },
    });

    return NextResponse.json({
      success: true,
      message: "IRD CBMS Test Environment configured successfully",
      config: {
        apiUrl: cbmsConfig.apiUrl,
        username: cbmsConfig.username,
        sellerPan: cbmsConfig.sellerPan,
        enabled: cbmsConfig.enabled,
        syncMode: cbmsConfig.syncMode,
      },
      note: "These are IRD test credentials. Replace with production credentials before going live.",
    });
  } catch (error) {
    console.error("Error setting up CBMS test environment:", error);
    return NextResponse.json(
      { error: "Failed to configure CBMS test environment" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get current CBMS config
    const cbmsConfig = await prisma.restaurantCBMSConfig.findUnique({
      where: { restaurantId: session.restaurantId },
    });

    if (!cbmsConfig) {
      return NextResponse.json({
        configured: false,
        message: "CBMS not configured. POST to this endpoint to set up test environment.",
      });
    }

    return NextResponse.json({
      configured: true,
      config: {
        apiUrl: cbmsConfig.apiUrl,
        username: cbmsConfig.username,
        sellerPan: cbmsConfig.sellerPan,
        enabled: cbmsConfig.enabled,
        syncMode: cbmsConfig.syncMode,
        lastSyncAt: cbmsConfig.lastSyncAt,
        lastSyncStatus: cbmsConfig.lastSyncStatus,
        credentialsValid: cbmsConfig.credentialsValid,
      },
    });
  } catch (error) {
    console.error("Error fetching CBMS config:", error);
    return NextResponse.json(
      { error: "Failed to fetch CBMS configuration" },
      { status: 500 }
    );
  }
}
