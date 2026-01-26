import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";
import { canClaimBirthdayBonus } from "@/lib/loyalty";

// Generate a unique fingerprint for device recognition
function generateFingerprint(): string {
  return `fp_${crypto.randomBytes(16).toString("hex")}`;
}

// GET - Check if customer is recognized (via token or phone)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");
    const phone = searchParams.get("phone");
    const restaurantSlug = searchParams.get("restaurant");

    if (!restaurantSlug) {
      return NextResponse.json(
        { error: "Restaurant slug is required" },
        { status: 400 }
      );
    }

    // Get restaurant
    const restaurant = await prisma.restaurant.findUnique({
      where: { slug: restaurantSlug },
      select: { id: true, settings: true },
    });

    if (!restaurant) {
      return NextResponse.json(
        { error: "Restaurant not found" },
        { status: 404 }
      );
    }

    // Check loyalty settings
    const settings = (restaurant.settings as Record<string, unknown>) || {};
    const loyaltySettings = (settings.loyalty as Record<string, unknown>) || {};
    const loyaltyEnabled = loyaltySettings.enabled ?? false;

    if (!loyaltyEnabled) {
      return NextResponse.json({
        loyaltyEnabled: false,
        customer: null,
      });
    }

    let customer = null;

    // Try to find customer by token (stored as deviceFingerprint)
    if (token) {
      const device = await prisma.customerDevice.findFirst({
        where: { deviceFingerprint: token, isActive: true },
        include: {
          customer: {
            select: {
              id: true,
              name: true,
              phone: true,
              tier: true,
              pointsBalance: true,
              totalVisits: true,
              status: true,
            },
          },
        },
      });

      if (device?.customer && device.customer.status === "ACTIVE") {
        customer = device.customer;

        // Update last seen
        await prisma.customerDevice.update({
          where: { id: device.id },
          data: { lastSeenAt: new Date() },
        });
      }
    }

    // Try phone lookup if no customer found
    if (!customer && phone) {
      const foundCustomer = await prisma.customer.findFirst({
        where: {
          restaurantId: restaurant.id,
          phone,
          status: "ACTIVE",
        },
        select: {
          id: true,
          name: true,
          phone: true,
          tier: true,
          pointsBalance: true,
          totalVisits: true,
          status: true,
        },
      });

      if (foundCustomer) {
        customer = foundCustomer;
      }
    }

    // Get loyalty settings for response
    const welcomeBonus = (loyaltySettings.welcomeBonus as number) ?? 50;

    // Check birthday bonus if customer exists
    let birthdayBonus = null;
    if (customer) {
      const birthdayCheck = await canClaimBirthdayBonus(customer.id);
      if (birthdayCheck.isBirthday) {
        birthdayBonus = {
          isBirthday: true,
          canClaim: birthdayCheck.canClaim,
          alreadyClaimed: birthdayCheck.alreadyClaimed,
          bonusAmount: birthdayCheck.bonusAmount,
        };
      }
    }

    return NextResponse.json({
      loyaltyEnabled: true,
      customer: customer
        ? {
            id: customer.id,
            name: customer.name,
            phoneHint: customer.phone.slice(-4),
            tier: customer.tier,
            pointsBalance: customer.pointsBalance,
          }
        : null,
      welcomeBonus,
      birthdayBonus,
    });
  } catch (error) {
    console.error("Error checking loyalty:", error);
    return NextResponse.json(
      { error: "Failed to check loyalty status" },
      { status: 500 }
    );
  }
}

// POST - Register new customer or login existing
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      action,
      restaurantSlug,
      name,
      phone,
      dateOfBirth,
      email,
      marketingConsent,
      verificationCode,
      sessionId,
    } = body;

    if (!restaurantSlug) {
      return NextResponse.json(
        { error: "Restaurant slug is required" },
        { status: 400 }
      );
    }

    // Get restaurant
    const restaurant = await prisma.restaurant.findUnique({
      where: { slug: restaurantSlug },
      select: { id: true, settings: true },
    });

    if (!restaurant) {
      return NextResponse.json(
        { error: "Restaurant not found" },
        { status: 404 }
      );
    }

    // Get loyalty settings
    const settings = (restaurant.settings as Record<string, unknown>) || {};
    const loyaltySettings = (settings.loyalty as Record<string, unknown>) || {};
    const welcomeBonus = (loyaltySettings.welcomeBonus as number) ?? 50;

    if (action === "register") {
      // Register new customer
      if (!name || !phone || !dateOfBirth) {
        return NextResponse.json(
          { error: "Name, phone, and date of birth are required" },
          { status: 400 }
        );
      }

      // Check if phone already exists
      const existingCustomer = await prisma.customer.findFirst({
        where: {
          restaurantId: restaurant.id,
          phone,
        },
      });

      if (existingCustomer) {
        return NextResponse.json(
          { error: "Phone number already registered. Please login instead." },
          { status: 400 }
        );
      }

      // Generate customer ID
      const customerCount = await prisma.customer.count({
        where: { restaurantId: restaurant.id },
      });
      const customerId = `CUST-${String(customerCount + 1).padStart(5, "0")}`;

      // Create customer
      const customer = await prisma.customer.create({
        data: {
          restaurantId: restaurant.id,
          customerId,
          name,
          phone,
          dateOfBirth: new Date(dateOfBirth),
          email: email || null,
          smsOptIn: marketingConsent ?? true,
          emailOptIn: marketingConsent ?? true,
          tier: "BRONZE",
          pointsBalance: welcomeBonus,
          pointsEarnedLifetime: welcomeBonus,
          totalVisits: 0,
          totalSpent: 0,
          averageOrderValue: 0,
          status: "ACTIVE",
          phoneVerified: false,
        },
      });

      // Create welcome bonus transaction
      if (welcomeBonus > 0) {
        await prisma.pointsTransaction.create({
          data: {
            customerId: customer.id,
            type: "BONUS",
            points: welcomeBonus,
            balanceAfter: welcomeBonus,
            bonusType: "WELCOME",
            reason: "Welcome bonus for joining loyalty program",
          },
        });
      }

      // Generate device fingerprint (used as token for recognition)
      const deviceToken = generateFingerprint();

      // Create device record
      await prisma.customerDevice.create({
        data: {
          customerId: customer.id,
          deviceFingerprint: deviceToken,
          deviceInfo: {},
          isActive: true,
          trustedUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
        },
      });

      // Link to session if provided
      if (sessionId) {
        await prisma.tableSession.update({
          where: { id: sessionId },
          data: { customerId: customer.id },
        });
      }

      return NextResponse.json({
        success: true,
        customer: {
          id: customer.id,
          name: customer.name,
          tier: customer.tier,
          pointsBalance: customer.pointsBalance,
        },
        token: deviceToken,
        welcomeBonus,
      }, { status: 201 });
    }

    if (action === "login") {
      // Login existing customer (verify by last 4 digits)
      if (!phone) {
        return NextResponse.json(
          { error: "Phone number is required" },
          { status: 400 }
        );
      }

      const customer = await prisma.customer.findFirst({
        where: {
          restaurantId: restaurant.id,
          phone,
          status: "ACTIVE",
        },
      });

      if (!customer) {
        return NextResponse.json(
          { error: "Customer not found. Please register first." },
          { status: 404 }
        );
      }

      // If verification code provided, verify it (last 4 digits)
      if (verificationCode) {
        const last4 = customer.phone.slice(-4);
        if (verificationCode !== last4) {
          return NextResponse.json(
            { error: "Invalid verification code" },
            { status: 400 }
          );
        }

        // Generate new fingerprint for this device
        const deviceToken = generateFingerprint();

        await prisma.customerDevice.create({
          data: {
            customerId: customer.id,
            deviceFingerprint: deviceToken,
            deviceInfo: {},
            isActive: true,
            trustedUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
          },
        });

        // Link to session if provided
        if (sessionId) {
          await prisma.tableSession.update({
            where: { id: sessionId },
            data: { customerId: customer.id },
          });
        }

        return NextResponse.json({
          success: true,
          customer: {
            id: customer.id,
            name: customer.name,
            tier: customer.tier,
            pointsBalance: customer.pointsBalance,
          },
          token: deviceToken,
        });
      }

      // Return phone hint for verification
      return NextResponse.json({
        requiresVerification: true,
        phoneHint: `${customer.phone.slice(0, 4)}XXX${customer.phone.slice(-3)}`,
        message: "Please enter the last 4 digits of your phone number to verify",
      });
    }

    if (action === "link_session") {
      // Link customer to session
      if (!sessionId || !phone) {
        return NextResponse.json(
          { error: "Session ID and phone are required" },
          { status: 400 }
        );
      }

      const customer = await prisma.customer.findFirst({
        where: {
          restaurantId: restaurant.id,
          phone,
          status: "ACTIVE",
        },
      });

      if (!customer) {
        return NextResponse.json(
          { error: "Customer not found" },
          { status: 404 }
        );
      }

      await prisma.tableSession.update({
        where: { id: sessionId },
        data: { customerId: customer.id },
      });

      return NextResponse.json({
        success: true,
        customerId: customer.id,
      });
    }

    return NextResponse.json(
      { error: "Invalid action" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Error in loyalty action:", error);
    return NextResponse.json(
      { error: "Failed to process loyalty action" },
      { status: 500 }
    );
  }
}
