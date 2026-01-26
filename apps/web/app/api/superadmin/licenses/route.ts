import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import crypto from "crypto";

// Generate a license key in format: QRDINE-TIER-XXXXXXXX-XXXX-XXXX
function generateLicenseKey(tier: string): string {
  const randomPart = crypto.randomBytes(8).toString("hex").toUpperCase();
  const tierShort = tier.substring(0, 3).toUpperCase();
  return `QRDINE-${tierShort}-${randomPart.slice(0, 8)}-${randomPart.slice(8, 12)}-${randomPart.slice(12, 16)}`;
}

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const licenses = await prisma.license.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        restaurants: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    const formattedLicenses = licenses.map((l: typeof licenses[number]) => ({
      id: l.id,
      key: l.licenseKey,
      tier: l.tier,
      status: l.status,
      restaurantId: l.restaurants[0]?.id || null,
      restaurantName: l.restaurants[0]?.name || null,
      activatedAt: l.activatedAt?.toISOString() || null,
      expiresAt: l.expiresAt?.toISOString() || null,
      createdAt: l.createdAt.toISOString(),
    }));

    return NextResponse.json({ licenses: formattedLicenses });
  } catch (error) {
    console.error("Error fetching licenses:", error);
    return NextResponse.json(
      { error: "Failed to fetch licenses" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { tier, validityMonths, quantity = 1, ownerName, ownerEmail } = body;

    if (!tier || !validityMonths) {
      return NextResponse.json(
        { error: "Tier and validity are required" },
        { status: 400 }
      );
    }

    // Generate license keys
    const licenses = [];
    for (let i = 0; i < quantity; i++) {
      let licenseKey = generateLicenseKey(tier);

      // Ensure unique key
      let attempts = 0;
      while (attempts < 10) {
        const existing = await prisma.license.findUnique({ where: { licenseKey } });
        if (!existing) break;
        licenseKey = generateLicenseKey(tier);
        attempts++;
      }

      // Calculate expiry date based on validity months
      const expiresAt = new Date();
      expiresAt.setMonth(expiresAt.getMonth() + validityMonths);

      const license = await prisma.license.create({
        data: {
          licenseKey,
          tier,
          status: "ACTIVE",
          ownerName: ownerName || "Pending Assignment",
          ownerEmail: ownerEmail || "pending@qrdine.com",
          expiresAt,
        },
      });

      licenses.push(license);
    }

    return NextResponse.json({
      key: licenses[0]?.licenseKey,
      licenses: licenses.map((l) => ({
        id: l.id,
        key: l.licenseKey,
        tier: l.tier,
        status: l.status,
      })),
    }, { status: 201 });
  } catch (error) {
    console.error("Error generating license:", error);
    return NextResponse.json(
      { error: "Failed to generate license" },
      { status: 500 }
    );
  }
}
