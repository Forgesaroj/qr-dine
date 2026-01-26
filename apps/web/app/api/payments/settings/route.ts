import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import {
  getPaymentConfig,
  setPaymentConfig,
  getAvailableGateways,
  isSandboxMode,
  setSandboxMode,
} from "@/lib/payment-gateways";

// GET payment gateway settings
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const gateways = getAvailableGateways();
    const config = getPaymentConfig();

    return NextResponse.json({
      sandboxMode: config.sandboxMode,
      gateways: {
        esewa: {
          enabled: gateways.esewa,
          configured: !!config.esewa.merchantId,
        },
        khalti: {
          enabled: gateways.khalti,
          configured: !!config.khalti.secretKey,
        },
        fonepay: {
          enabled: gateways.fonepay,
          configured: !!config.fonepay.merchantCode,
        },
      },
      environment: config.sandboxMode ? "SANDBOX" : "PRODUCTION",
      warning: config.sandboxMode
        ? "Sandbox mode is ON - Payments will use test environments"
        : "Production mode - Real payments will be processed",
    });
  } catch (error) {
    console.error("Error fetching payment settings:", error);
    return NextResponse.json(
      { error: "Failed to fetch payment settings" },
      { status: 500 }
    );
  }
}

// PATCH update payment settings (sandbox toggle)
export async function PATCH(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only OWNER and MANAGER can change payment settings
    if (!["OWNER", "MANAGER", "SUPER_ADMIN"].includes(session.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { sandboxMode } = body;

    if (typeof sandboxMode === "boolean") {
      setSandboxMode(sandboxMode);

      // Log the change
      console.log(
        `[PAYMENT] Sandbox mode ${sandboxMode ? "ENABLED" : "DISABLED"} by ${session.email} (${session.role})`
      );

      return NextResponse.json({
        success: true,
        sandboxMode: isSandboxMode(),
        message: sandboxMode
          ? "Sandbox mode enabled - Using test payment environments"
          : "Production mode enabled - Real payments will be processed",
        warning: sandboxMode
          ? "⚠️ No real money will be charged in sandbox mode"
          : "⚠️ Real payments are now active - customers will be charged",
      });
    }

    return NextResponse.json(
      { error: "Invalid request - sandboxMode must be a boolean" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Error updating payment settings:", error);
    return NextResponse.json(
      { error: "Failed to update payment settings" },
      { status: 500 }
    );
  }
}
