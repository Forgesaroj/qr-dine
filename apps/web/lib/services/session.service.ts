/**
 * Session Service
 *
 * Manages table session lifecycle:
 * - End session after payment
 * - Change OTP for security
 * - Trigger cleaning workflow
 * - Track guest count changes
 * - Generate session timeline
 *
 * Per SESSION_FLOW_SPEC.md - Section 5.2, 5.3
 */

import { prisma } from "../prisma";
import { changeOtpAfterPayment } from "./otp.service";
import { startCleaning } from "./cleaning.service";
import { determineSessionPhase, minutesSince } from "../session-duration";

export interface EndSessionInput {
  sessionId: string;
  endedById: string;
  endReason?: "PAYMENT_COMPLETED" | "MANUAL_END" | "NO_SHOW" | "TIMEOUT";
  notes?: string;
}

export interface GuestCountUpdateInput {
  sessionId: string;
  newCount: number;
  changedById: string;
  reason?: string;
}

export interface TimelineEvent {
  timestamp: Date;
  event: string;
  phase: string;
  details?: string;
  userId?: string;
  userName?: string;
}

/**
 * End a session and trigger post-session workflow
 * This is the main function called after payment completion
 */
export async function endSessionAndChangeOTP(
  input: EndSessionInput
): Promise<{
  newOtp: string;
  cleaningRecordId: string;
}> {
  const session = await prisma.tableSession.findUnique({
    where: { id: input.sessionId },
    select: {
      id: true,
      tableId: true,
      restaurantId: true,
      status: true,
    },
  });

  if (!session) {
    throw new Error("Session not found");
  }

  if (session.status !== "ACTIVE") {
    throw new Error("Session is not active");
  }

  const now = new Date();

  // 1. End the session
  await prisma.tableSession.update({
    where: { id: input.sessionId },
    data: {
      status: "COMPLETED",
      phase: "COMPLETED",
      vacatedAt: now,
      paymentCompletedAt: now,
    },
  });

  // 2. Change OTP for security (prevents next guest from using same OTP)
  const newOtp = await changeOtpAfterPayment(session.tableId, session.id);

  // 3. Trigger cleaning workflow
  const { cleaningRecordId } = await startCleaning(
    session.tableId,
    session.id
  );

  // 4. Resolve any active alerts for this session
  await prisma.sessionAlert.updateMany({
    where: {
      sessionId: session.id,
      status: { in: ["ACTIVE", "ACKNOWLEDGED"] },
    },
    data: {
      status: "RESOLVED",
      resolvedAt: now,
      resolutionNote: "Session ended",
    },
  });

  return { newOtp, cleaningRecordId };
}

/**
 * Update guest count for a session
 */
export async function updateGuestCount(
  input: GuestCountUpdateInput
): Promise<void> {
  const session = await prisma.tableSession.findUnique({
    where: { id: input.sessionId },
    select: { guestCount: true },
  });

  if (!session) {
    throw new Error("Session not found");
  }

  // Update session with new guest count
  await prisma.tableSession.update({
    where: { id: input.sessionId },
    data: { guestCount: input.newCount },
  });

  // Record in guest count history
  await prisma.guestCountHistory.create({
    data: {
      sessionId: input.sessionId,
      previousCount: session.guestCount,
      newCount: input.newCount,
      changedById: input.changedById,
      reason: input.reason,
    },
  });
}

/**
 * Get session timeline (all events in chronological order)
 */
export async function getSessionTimeline(
  sessionId: string
): Promise<TimelineEvent[]> {
  const session = await prisma.tableSession.findUnique({
    where: { id: sessionId },
    include: {
      orders: {
        include: {
          items: {
            include: {
              menuItem: { select: { name: true } },
            },
          },
        },
        orderBy: { createdAt: "asc" },
      },
      table: { select: { tableNumber: true, name: true } },
      qrScanEvents: { orderBy: { scannedAt: "asc" } },
      guestCountHistory: {
        include: {
          changedBy: { select: { name: true } },
        },
        orderBy: { changedAt: "asc" },
      },
      cleaningRecords: {
        include: {
          cleanedBy: { select: { name: true } },
        },
        orderBy: { cleaningRequestedAt: "asc" },
      },
    },
  });

  if (!session) {
    throw new Error("Session not found");
  }

  const timeline: TimelineEvent[] = [];

  // QR scan events
  for (const scan of session.qrScanEvents) {
    timeline.push({
      timestamp: scan.scannedAt,
      event: "QR Code Scanned",
      phase: "CREATED",
      details: scan.deviceFingerprint
        ? `Device: ${scan.deviceFingerprint.slice(0, 8)}...`
        : undefined,
    });

    if (scan.otpEnteredAt) {
      timeline.push({
        timestamp: scan.otpEnteredAt,
        event: "OTP Verified",
        phase: "SEATED",
        details: `Attempts: ${scan.otpAttempts}`,
      });
    }
  }

  // Session creation (if no QR scan events)
  if (session.qrScanEvents.length === 0 && session.createdAt) {
    timeline.push({
      timestamp: session.createdAt,
      event: "Session Created",
      phase: "CREATED",
    });
  }

  // Seated
  if (session.seatedAt) {
    timeline.push({
      timestamp: session.seatedAt,
      event: "Guest Seated",
      phase: "SEATED",
      details: session.guestCount
        ? `${session.guestCount} guests`
        : undefined,
    });
  }

  // Waiter notified
  if (session.waiterNotifiedAt) {
    timeline.push({
      timestamp: session.waiterNotifiedAt,
      event: "Waiter Notified",
      phase: "SEATED",
    });
  }

  // Guest count changes
  for (const change of session.guestCountHistory) {
    timeline.push({
      timestamp: change.changedAt,
      event: "Guest Count Updated",
      phase: "SEATED",
      details: `${change.previousCount || 0} → ${change.newCount}${change.reason ? `: ${change.reason}` : ""}`,
      userName: change.changedBy.name,
    });
  }

  // Orders
  for (const order of session.orders) {
    timeline.push({
      timestamp: order.createdAt,
      event: "Order Placed",
      phase: "ORDERING",
      details: `${order.items.length} items, Total: ₹${order.totalAmount}`,
    });

    // Individual item status changes
    for (const item of order.items) {
      if (item.preparingAt) {
        timeline.push({
          timestamp: item.preparingAt,
          event: `Preparing: ${item.menuItem.name}`,
          phase: "ORDERING",
        });
      }
      if (item.readyAt) {
        timeline.push({
          timestamp: item.readyAt,
          event: `Ready: ${item.menuItem.name}`,
          phase: "ORDERING",
        });
      }
      if (item.servedAt) {
        timeline.push({
          timestamp: item.servedAt,
          event: `Served: ${item.menuItem.name}`,
          phase: "DINING",
        });
      }
    }
  }

  // First food served
  if (session.firstFoodServedAt) {
    timeline.push({
      timestamp: session.firstFoodServedAt,
      event: "First Food Served",
      phase: "DINING",
    });
  }

  // Bill requested
  if (session.billRequestedAt) {
    timeline.push({
      timestamp: session.billRequestedAt,
      event: "Bill Requested",
      phase: "BILL_REQUESTED",
    });
  }

  // Payment completed
  if (session.paymentCompletedAt) {
    timeline.push({
      timestamp: session.paymentCompletedAt,
      event: "Payment Completed",
      phase: "PAYING",
    });
  }

  // Session ended (vacated)
  if (session.vacatedAt) {
    timeline.push({
      timestamp: session.vacatedAt,
      event: "Session Ended",
      phase: "COMPLETED",
    });
  }

  // Cleaning
  for (const cleaning of session.cleaningRecords) {
    timeline.push({
      timestamp: cleaning.cleaningRequestedAt,
      event: "Cleaning Started",
      phase: "COMPLETED",
    });

    if (cleaning.cleanedAt) {
      timeline.push({
        timestamp: cleaning.cleanedAt,
        event: "Cleaning Completed",
        phase: "COMPLETED",
        details: cleaning.cleaningDurationMinutes
          ? `${cleaning.cleaningDurationMinutes} minutes`
          : undefined,
        userName: cleaning.cleanedBy?.name,
      });
    }
  }

  // Sort by timestamp
  timeline.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

  return timeline;
}

/**
 * Get session summary with phase durations
 */
export async function getSessionSummary(sessionId: string): Promise<{
  id: string;
  tableNumber: string;
  tableName: string | null;
  phase: string;
  status: string;
  guestCount: number | null;
  totalOrders: number;
  totalAmount: number;
  timestamps: {
    qrScannedAt: Date | null;
    seatedAt: Date | null;
    firstOrderAt: Date | null;
    firstFoodServedAt: Date | null;
    billRequestedAt: Date | null;
    paymentCompletedAt: Date | null;
    endedAt: Date | null;
  };
  durations: {
    totalMinutes: number;
    seatingToOrderMinutes: number | null;
    orderToFoodMinutes: number | null;
    diningMinutes: number | null;
    billToPaymentMinutes: number | null;
  };
}> {
  const session = await prisma.tableSession.findUnique({
    where: { id: sessionId },
    include: {
      table: { select: { tableNumber: true, name: true } },
      orders: { select: { totalAmount: true } },
    },
  });

  if (!session) {
    throw new Error("Session not found");
  }

  // Calculate durations
  const totalMinutes = session.seatedAt
    ? minutesSince(session.endedAt || new Date()) -
      minutesSince(session.seatedAt)
    : 0;

  const seatingToOrderMinutes =
    session.seatedAt && session.firstOrderAt
      ? Math.floor(
          (new Date(session.firstOrderAt).getTime() -
            new Date(session.seatedAt).getTime()) /
            60000
        )
      : null;

  const orderToFoodMinutes =
    session.firstOrderAt && session.firstFoodServedAt
      ? Math.floor(
          (new Date(session.firstFoodServedAt).getTime() -
            new Date(session.firstOrderAt).getTime()) /
            60000
        )
      : null;

  const diningMinutes =
    session.firstFoodServedAt && session.billRequestedAt
      ? Math.floor(
          (new Date(session.billRequestedAt).getTime() -
            new Date(session.firstFoodServedAt).getTime()) /
            60000
        )
      : null;

  const billToPaymentMinutes =
    session.billRequestedAt && session.paymentCompletedAt
      ? Math.floor(
          (new Date(session.paymentCompletedAt).getTime() -
            new Date(session.billRequestedAt).getTime()) /
            60000
        )
      : null;

  return {
    id: session.id,
    tableNumber: session.table.tableNumber,
    tableName: session.table.name,
    phase: session.phase || determineSessionPhase(session),
    status: session.status,
    guestCount: session.guestCount,
    totalOrders: session.orders.length,
    totalAmount: session.orders.reduce((sum, o) => sum + o.totalAmount, 0),
    timestamps: {
      qrScannedAt: session.qrScannedAt,
      seatedAt: session.seatedAt,
      firstOrderAt: session.firstOrderAt,
      firstFoodServedAt: session.firstFoodServedAt,
      billRequestedAt: session.billRequestedAt,
      paymentCompletedAt: session.paymentCompletedAt,
      endedAt: session.endedAt,
    },
    durations: {
      totalMinutes,
      seatingToOrderMinutes,
      orderToFoodMinutes,
      diningMinutes,
      billToPaymentMinutes,
    },
  };
}

/**
 * Get active session for a table
 */
export async function getActiveSession(tableId: string): Promise<{
  id: string;
  phase: string;
  status: string;
  guestCount: number | null;
  seatedAt: Date | null;
  durationMinutes: number;
} | null> {
  const session = await prisma.tableSession.findFirst({
    where: {
      tableId,
      status: "ACTIVE",
    },
    select: {
      id: true,
      phase: true,
      status: true,
      guestCount: true,
      seatedAt: true,
    },
  });

  if (!session) {
    return null;
  }

  return {
    ...session,
    phase: session.phase || "CREATED",
    durationMinutes: session.seatedAt ? minutesSince(session.seatedAt) : 0,
  };
}

/**
 * Request bill for a session
 */
export async function requestBill(
  sessionId: string
): Promise<void> {
  const session = await prisma.tableSession.findUnique({
    where: { id: sessionId },
    select: { tableId: true },
  });

  if (!session) {
    throw new Error("Session not found");
  }

  await prisma.tableSession.update({
    where: { id: sessionId },
    data: {
      billRequestedAt: new Date(),
      phase: "BILL_REQUESTED",
    },
  });

  // Update table status
  await prisma.table.update({
    where: { id: session.tableId },
    data: { status: "BILL_REQUESTED" },
  });
}

/**
 * Request assistance for a session
 */
export async function requestAssistance(
  sessionId: string,
  reason?: string
): Promise<void> {
  const session = await prisma.tableSession.findUnique({
    where: { id: sessionId },
    select: { tableId: true },
  });

  if (!session) {
    throw new Error("Session not found");
  }

  // Update table status to needs attention
  await prisma.table.update({
    where: { id: session.tableId },
    data: { status: "NEEDS_ATTENTION" },
  });

  // Create assistance alert
  await prisma.sessionAlert.create({
    data: {
      sessionId,
      tableId: session.tableId,
      restaurantId: (
        await prisma.tableSession.findUnique({
          where: { id: sessionId },
          select: { restaurantId: true },
        })
      )!.restaurantId,
      alertType: "needs_attention",
      message: reason || "Guest requested assistance",
      triggerCondition: "guest_request",
      targetRoles: ["WAITER"],
      status: "ACTIVE",
    },
  });
}
