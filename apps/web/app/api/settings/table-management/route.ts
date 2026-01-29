import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/settings/table-management
 * Get table management settings for the current restaurant
 */
export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is manager or owner
    if (!["MANAGER", "OWNER", "ADMIN"].includes(session.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const settings = await prisma.restaurantSettings.findUnique({
      where: { restaurantId: session.restaurantId },
    });

    if (!settings) {
      // Return defaults if no settings exist
      return NextResponse.json({
        settings: {
          assistanceEnabled: true,
          otpHelpTimerMinutes: 2,
          orderHelpTimerMinutes: 5,
          durationGreenMax: 30,
          durationYellowMax: 60,
          durationOrangeMax: 90,
          longStayAlertEnabled: true,
          longStayAlertMinutes: 90,
          longStayRepeatMinutes: 30,
          longStayNotifyWaiter: true,
          longStayNotifyManager: true,
          cleaningAlertEnabled: true,
          cleaningAlertMinutes: 10,
          cleaningChecklistEnabled: false,
          qrOrderRequiresConfirmation: true,
        },
      });
    }

    return NextResponse.json({
      settings: {
        assistanceEnabled: settings.assistanceEnabled,
        otpHelpTimerMinutes: settings.otpHelpTimerMinutes,
        orderHelpTimerMinutes: settings.orderHelpTimerMinutes,
        durationGreenMax: settings.durationGreenMax,
        durationYellowMax: settings.durationYellowMax,
        durationOrangeMax: settings.durationOrangeMax,
        longStayAlertEnabled: settings.longStayAlertEnabled,
        longStayAlertMinutes: settings.longStayAlertMinutes,
        longStayRepeatMinutes: settings.longStayRepeatMinutes,
        longStayNotifyWaiter: settings.longStayNotifyWaiter,
        longStayNotifyManager: settings.longStayNotifyManager,
        cleaningAlertEnabled: settings.cleaningAlertEnabled,
        cleaningAlertMinutes: settings.cleaningAlertMinutes,
        cleaningChecklistEnabled: settings.cleaningChecklistEnabled,
        qrOrderRequiresConfirmation: settings.qrOrderRequiresConfirmation,
      },
    });
  } catch (error) {
    console.error("Error fetching table management settings:", error);
    return NextResponse.json(
      { error: "Failed to fetch settings" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/settings/table-management
 * Update table management settings
 */
export async function PATCH(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is manager or owner
    if (!["MANAGER", "OWNER", "ADMIN"].includes(session.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();

    // Validate and sanitize input
    const updateData = {
      assistanceEnabled: Boolean(body.assistanceEnabled),
      otpHelpTimerMinutes: Math.max(1, Math.min(10, body.otpHelpTimerMinutes || 2)),
      orderHelpTimerMinutes: Math.max(1, Math.min(30, body.orderHelpTimerMinutes || 5)),
      durationGreenMax: Math.max(10, Math.min(60, body.durationGreenMax || 30)),
      durationYellowMax: Math.max(30, Math.min(120, body.durationYellowMax || 60)),
      durationOrangeMax: Math.max(60, Math.min(180, body.durationOrangeMax || 90)),
      longStayAlertEnabled: Boolean(body.longStayAlertEnabled),
      longStayAlertMinutes: Math.max(30, Math.min(180, body.longStayAlertMinutes || 90)),
      longStayRepeatMinutes: Math.max(10, Math.min(60, body.longStayRepeatMinutes || 30)),
      longStayNotifyWaiter: Boolean(body.longStayNotifyWaiter),
      longStayNotifyManager: Boolean(body.longStayNotifyManager),
      cleaningAlertEnabled: Boolean(body.cleaningAlertEnabled),
      cleaningAlertMinutes: Math.max(5, Math.min(30, body.cleaningAlertMinutes || 10)),
      cleaningChecklistEnabled: Boolean(body.cleaningChecklistEnabled),
      qrOrderRequiresConfirmation: body.qrOrderRequiresConfirmation !== undefined
        ? Boolean(body.qrOrderRequiresConfirmation)
        : true,
    };

    // Upsert settings
    const settings = await prisma.restaurantSettings.upsert({
      where: { restaurantId: session.restaurantId },
      update: updateData,
      create: {
        restaurantId: session.restaurantId,
        ...updateData,
      },
    });

    return NextResponse.json({
      success: true,
      settings,
    });
  } catch (error) {
    console.error("Error updating table management settings:", error);
    return NextResponse.json(
      { error: "Failed to update settings" },
      { status: 500 }
    );
  }
}
