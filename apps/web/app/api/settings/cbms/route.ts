import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { z } from "zod";
import { CBMSSyncMode } from "@prisma/client";

// ═══════════════════════════════════════════════════════════════════════════════
// VALIDATION SCHEMAS
// ═══════════════════════════════════════════════════════════════════════════════

const updateCBMSConfigSchema = z.object({
  enabled: z.boolean().optional(),
  apiUrl: z.string().url().optional(),
  username: z.string().min(1).optional(),
  password: z.string().min(1).optional(),
  sellerPan: z.string().min(9).max(9).optional(), // Nepal PAN is 9 digits
  syncMode: z.nativeEnum(CBMSSyncMode).optional(),
  batchInterval: z.number().min(1).max(60).optional(),
  maxRetry: z.number().min(1).max(10).optional(),
  retryDelay: z.number().min(1).max(60).optional(),
});

// ═══════════════════════════════════════════════════════════════════════════════
// GET - Get CBMS configuration
// ═══════════════════════════════════════════════════════════════════════════════

export async function GET() {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only OWNER can view CBMS config
    if (!["OWNER", "SUPER_ADMIN"].includes(session.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const config = await prisma.restaurantCBMSConfig.findUnique({
      where: { restaurantId: session.restaurantId },
    });

    if (!config) {
      return NextResponse.json({
        config: null,
        configured: false,
      });
    }

    // Don't send actual password, just indicate if it's set
    return NextResponse.json({
      config: {
        ...config,
        password: config.password ? "********" : null,
        hasPassword: !!config.password,
      },
      configured: true,
    });
  } catch (error) {
    console.error("Error fetching CBMS config:", error);
    return NextResponse.json(
      { error: "Failed to fetch CBMS configuration" },
      { status: 500 }
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// POST - Create CBMS configuration
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

    const body = await request.json();

    // Required fields for initial setup
    const requiredSchema = z.object({
      username: z.string().min(1, "Username is required"),
      password: z.string().min(1, "Password is required"),
      sellerPan: z.string().length(9, "PAN must be 9 digits"),
      enabled: z.boolean().default(false),
      apiUrl: z.string().url().default("https://cbapi.ird.gov.np"),
      syncMode: z.nativeEnum(CBMSSyncMode).default(CBMSSyncMode.REALTIME),
      batchInterval: z.number().min(1).max(60).default(5),
      maxRetry: z.number().min(1).max(10).default(3),
      retryDelay: z.number().min(1).max(60).default(15),
    });

    const validationResult = requiredSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validationResult.error.errors },
        { status: 400 }
      );
    }

    const data = validationResult.data;

    // Check if config already exists
    const existing = await prisma.restaurantCBMSConfig.findUnique({
      where: { restaurantId: session.restaurantId },
    });

    if (existing) {
      return NextResponse.json(
        { error: "CBMS configuration already exists. Use PATCH to update." },
        { status: 400 }
      );
    }

    // Note: In production, password should be encrypted before storing
    const config = await prisma.restaurantCBMSConfig.create({
      data: {
        restaurantId: session.restaurantId,
        enabled: data.enabled,
        apiUrl: data.apiUrl,
        username: data.username,
        password: data.password, // TODO: Encrypt in production
        sellerPan: data.sellerPan,
        syncMode: data.syncMode,
        batchInterval: data.batchInterval,
        maxRetry: data.maxRetry,
        retryDelay: data.retryDelay,
      },
    });

    return NextResponse.json({
      config: {
        ...config,
        password: "********",
        hasPassword: true,
      },
      message: "CBMS configuration created successfully",
    }, { status: 201 });
  } catch (error) {
    console.error("Error creating CBMS config:", error);
    return NextResponse.json(
      { error: "Failed to create CBMS configuration" },
      { status: 500 }
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// PATCH - Update CBMS configuration
// ═══════════════════════════════════════════════════════════════════════════════

export async function PATCH(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only OWNER can update CBMS config
    if (!["OWNER", "SUPER_ADMIN"].includes(session.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();

    const validationResult = updateCBMSConfigSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validationResult.error.errors },
        { status: 400 }
      );
    }

    const data = validationResult.data;

    // Check if config exists
    const existing = await prisma.restaurantCBMSConfig.findUnique({
      where: { restaurantId: session.restaurantId },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "CBMS configuration not found. Use POST to create." },
        { status: 404 }
      );
    }

    // Build update data, only include provided fields
    const updateData: Record<string, unknown> = {};

    if (data.enabled !== undefined) updateData.enabled = data.enabled;
    if (data.apiUrl) updateData.apiUrl = data.apiUrl;
    if (data.username) updateData.username = data.username;
    if (data.password) updateData.password = data.password; // TODO: Encrypt
    if (data.sellerPan) updateData.sellerPan = data.sellerPan;
    if (data.syncMode) updateData.syncMode = data.syncMode;
    if (data.batchInterval !== undefined) updateData.batchInterval = data.batchInterval;
    if (data.maxRetry !== undefined) updateData.maxRetry = data.maxRetry;
    if (data.retryDelay !== undefined) updateData.retryDelay = data.retryDelay;

    const config = await prisma.restaurantCBMSConfig.update({
      where: { restaurantId: session.restaurantId },
      data: updateData,
    });

    return NextResponse.json({
      config: {
        ...config,
        password: "********",
        hasPassword: true,
      },
      message: "CBMS configuration updated successfully",
    });
  } catch (error) {
    console.error("Error updating CBMS config:", error);
    return NextResponse.json(
      { error: "Failed to update CBMS configuration" },
      { status: 500 }
    );
  }
}
