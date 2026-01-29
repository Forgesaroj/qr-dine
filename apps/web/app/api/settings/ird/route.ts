import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { z } from "zod";

// ═══════════════════════════════════════════════════════════════════════════════
// VALIDATION SCHEMAS
// ═══════════════════════════════════════════════════════════════════════════════

const updateIRDSettingsSchema = z.object({
  irdEnabled: z.boolean().optional(),
  irdVatNumber: z.string().min(9).max(9).optional().nullable(), // PAN is 9 digits
  irdBusinessName: z.string().min(1).max(200).optional().nullable(),
  irdBusinessNameNp: z.string().max(200).optional().nullable(),
  irdBusinessAddress: z.string().max(500).optional().nullable(),
  irdBusinessAddressNp: z.string().max(500).optional().nullable(),
  irdVatRate: z.number().min(0).max(100).optional(),
  irdServiceChargeRate: z.number().min(0).max(100).optional(),
  irdIncludeServiceCharge: z.boolean().optional(),
  irdInvoicePrefix: z.string().max(10).optional().nullable(),
});

// ═══════════════════════════════════════════════════════════════════════════════
// GET - Get IRD settings
// ═══════════════════════════════════════════════════════════════════════════════

export async function GET() {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only OWNER and MANAGER can view IRD settings
    if (!["OWNER", "MANAGER", "SUPER_ADMIN"].includes(session.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get or create restaurant settings
    let settings = await prisma.restaurantSettings.findUnique({
      where: { restaurantId: session.restaurantId },
    });

    if (!settings) {
      // Create default settings if they don't exist
      settings = await prisma.restaurantSettings.create({
        data: {
          restaurantId: session.restaurantId,
        },
      });
    }

    return NextResponse.json({
      settings: {
        irdEnabled: settings.irdEnabled,
        irdVatNumber: settings.irdVatNumber,
        irdBusinessName: settings.irdBusinessName,
        irdBusinessNameNp: settings.irdBusinessNameNp,
        irdBusinessAddress: settings.irdBusinessAddress,
        irdBusinessAddressNp: settings.irdBusinessAddressNp,
        irdVatRate: settings.irdVatRate ? Number(settings.irdVatRate) : 13,
        irdServiceChargeRate: settings.irdServiceChargeRate ? Number(settings.irdServiceChargeRate) : 10,
        irdIncludeServiceCharge: settings.irdIncludeServiceCharge,
        irdInvoicePrefix: settings.irdInvoicePrefix,
      },
    });
  } catch (error) {
    console.error("Error fetching IRD settings:", error);
    return NextResponse.json(
      { error: "Failed to fetch IRD settings" },
      { status: 500 }
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// PATCH - Update IRD settings
// ═══════════════════════════════════════════════════════════════════════════════

export async function PATCH(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only OWNER can update IRD settings
    if (!["OWNER", "SUPER_ADMIN"].includes(session.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();

    const validationResult = updateIRDSettingsSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validationResult.error.errors },
        { status: 400 }
      );
    }

    const data = validationResult.data;

    // If enabling IRD, validate required fields
    if (data.irdEnabled === true) {
      // Check if we have the required business information
      const existingSettings = await prisma.restaurantSettings.findUnique({
        where: { restaurantId: session.restaurantId },
      });

      const vatNumber = data.irdVatNumber ?? existingSettings?.irdVatNumber;
      const businessName = data.irdBusinessName ?? existingSettings?.irdBusinessName;
      const businessAddress = data.irdBusinessAddress ?? existingSettings?.irdBusinessAddress;

      if (!vatNumber || !businessName || !businessAddress) {
        return NextResponse.json(
          {
            error: "Cannot enable IRD without required business information",
            missingFields: {
              irdVatNumber: !vatNumber,
              irdBusinessName: !businessName,
              irdBusinessAddress: !businessAddress,
            }
          },
          { status: 400 }
        );
      }
    }

    // Build update data
    const updateData: Record<string, unknown> = {};

    if (data.irdEnabled !== undefined) updateData.irdEnabled = data.irdEnabled;
    if (data.irdVatNumber !== undefined) updateData.irdVatNumber = data.irdVatNumber;
    if (data.irdBusinessName !== undefined) updateData.irdBusinessName = data.irdBusinessName;
    if (data.irdBusinessNameNp !== undefined) updateData.irdBusinessNameNp = data.irdBusinessNameNp;
    if (data.irdBusinessAddress !== undefined) updateData.irdBusinessAddress = data.irdBusinessAddress;
    if (data.irdBusinessAddressNp !== undefined) updateData.irdBusinessAddressNp = data.irdBusinessAddressNp;
    if (data.irdVatRate !== undefined) updateData.irdVatRate = data.irdVatRate;
    if (data.irdServiceChargeRate !== undefined) updateData.irdServiceChargeRate = data.irdServiceChargeRate;
    if (data.irdIncludeServiceCharge !== undefined) updateData.irdIncludeServiceCharge = data.irdIncludeServiceCharge;
    if (data.irdInvoicePrefix !== undefined) updateData.irdInvoicePrefix = data.irdInvoicePrefix;

    // Upsert settings
    const settings = await prisma.restaurantSettings.upsert({
      where: { restaurantId: session.restaurantId },
      create: {
        restaurantId: session.restaurantId,
        ...updateData,
      },
      update: updateData,
    });

    return NextResponse.json({
      settings: {
        irdEnabled: settings.irdEnabled,
        irdVatNumber: settings.irdVatNumber,
        irdBusinessName: settings.irdBusinessName,
        irdBusinessNameNp: settings.irdBusinessNameNp,
        irdBusinessAddress: settings.irdBusinessAddress,
        irdBusinessAddressNp: settings.irdBusinessAddressNp,
        irdVatRate: settings.irdVatRate ? Number(settings.irdVatRate) : 13,
        irdServiceChargeRate: settings.irdServiceChargeRate ? Number(settings.irdServiceChargeRate) : 10,
        irdIncludeServiceCharge: settings.irdIncludeServiceCharge,
        irdInvoicePrefix: settings.irdInvoicePrefix,
      },
      message: "IRD settings updated successfully",
    });
  } catch (error) {
    console.error("Error updating IRD settings:", error);
    return NextResponse.json(
      { error: "Failed to update IRD settings" },
      { status: 500 }
    );
  }
}
