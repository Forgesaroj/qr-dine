import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { logActivity } from "@/lib/activity-log";

// PATCH update bill timestamps (Phase 5: Billing Flow)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { action } = body;

    // Get current bill
    const bill = await prisma.bill.findFirst({
      where: {
        id,
        restaurantId: session.restaurantId,
      },
      include: {
        order: {
          include: {
            session: {
              include: {
                table: true,
              },
            },
          },
        },
      },
    });

    if (!bill) {
      return NextResponse.json({ error: "Bill not found" }, { status: 404 });
    }

    const now = new Date();
    let updateData: Record<string, Date | string | null> = {};
    let activityType = "";
    let description = "";
    const tableNumber = bill.order.session?.table?.tableNumber || "N/A";

    switch (action) {
      case "requested":
        // Guest requests bill
        updateData = { requestedAt: now };
        activityType = "bill_requested";
        description = `Bill requested for Table ${tableNumber}`;

        // Also update session
        if (bill.sessionId) {
          await prisma.tableSession.update({
            where: { id: bill.sessionId },
            data: { billRequestedAt: now },
          });
        }
        break;

      case "printed":
        // Staff prints bill
        updateData = { printedAt: now };
        activityType = "bill_printed";
        description = `Bill #${bill.billNumber} printed for Table ${tableNumber}`;

        // Also update session
        if (bill.sessionId) {
          await prisma.tableSession.update({
            where: { id: bill.sessionId },
            data: { billPrintedAt: now },
          });
        }
        break;

      case "delivered":
        // Staff delivers bill to table
        updateData = { deliveredAt: now };
        activityType = "bill_delivered";
        description = `Bill #${bill.billNumber} delivered to Table ${tableNumber}`;

        // Also update session
        if (bill.sessionId) {
          await prisma.tableSession.update({
            where: { id: bill.sessionId },
            data: { billDeliveredAt: now },
          });
        }
        break;

      case "settled":
        // Payment complete
        updateData = {
          settledAt: now,
          paidAt: now,
          status: "PAID",
          paymentStatus: "COMPLETED",
          settledById: session.userId,
        };
        activityType = "payment_completed";
        description = `Payment completed for Bill #${bill.billNumber} at Table ${tableNumber}`;

        // Update session with payment and vacate timestamps
        if (bill.sessionId) {
          await prisma.tableSession.update({
            where: { id: bill.sessionId },
            data: {
              paymentCompletedAt: now,
              vacatedAt: now,
              cleaningNotifiedAt: now,
            },
          });
        }

        // Update table status to CLEANING
        if (bill.order.session?.tableId) {
          await prisma.table.update({
            where: { id: bill.order.session.tableId },
            data: { status: "CLEANING" },
          });
        }
        break;

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }

    // Update bill
    const updatedBill = await prisma.bill.update({
      where: { id },
      data: updateData,
      include: {
        order: {
          select: {
            orderNumber: true,
            session: {
              select: {
                table: {
                  select: { tableNumber: true },
                },
              },
            },
          },
        },
      },
    });

    // Log activity
    await logActivity({
      restaurantId: session.restaurantId,
      userId: session.userId,
      activityType,
      entityType: "billing",
      entityId: id,
      priority: action === "settled" ? "notice" : "info",
      description,
      orderId: bill.orderId,
      details: {
        billNumber: bill.billNumber,
        tableNumber,
        action,
        amount: bill.totalAmount,
        timestamp: now.toISOString(),
      },
    });

    return NextResponse.json({
      success: true,
      action,
      timestamp: now.toISOString(),
      bill: updatedBill,
    });
  } catch (error) {
    console.error("Error updating bill timestamp:", error);
    return NextResponse.json(
      { error: "Failed to update bill timestamp" },
      { status: 500 }
    );
  }
}

// GET bill timestamps
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const bill = await prisma.bill.findFirst({
      where: {
        id,
        restaurantId: session.restaurantId,
      },
      include: {
        order: {
          select: {
            orderNumber: true,
            session: {
              select: {
                table: {
                  select: { tableNumber: true, name: true },
                },
              },
            },
          },
        },
        payments: {
          select: {
            id: true,
            amount: true,
            method: true,
            status: true,
            paidAt: true,
          },
        },
      },
    });

    if (!bill) {
      return NextResponse.json({ error: "Bill not found" }, { status: 404 });
    }

    // Calculate metrics
    const metrics: Record<string, string | null> = {};

    if (bill.deliveredAt && bill.requestedAt) {
      const billWaitTime =
        (bill.deliveredAt.getTime() - bill.requestedAt.getTime()) / 1000;
      metrics.billWaitTime = `${Math.floor(billWaitTime / 60)}m ${Math.floor(billWaitTime % 60)}s`;
    }

    if (bill.paidAt && bill.deliveredAt) {
      const paymentTime =
        (bill.paidAt.getTime() - bill.deliveredAt.getTime()) / 1000;
      metrics.paymentTime = `${Math.floor(paymentTime / 60)}m ${Math.floor(paymentTime % 60)}s`;
    }

    if (bill.paidAt && bill.requestedAt) {
      const totalCheckoutTime =
        (bill.paidAt.getTime() - bill.requestedAt.getTime()) / 1000;
      metrics.totalCheckoutTime = `${Math.floor(totalCheckoutTime / 60)}m ${Math.floor(totalCheckoutTime % 60)}s`;
    }

    return NextResponse.json({
      bill: {
        id: bill.id,
        billNumber: bill.billNumber,
        totalAmount: bill.totalAmount,
        status: bill.status,
        paymentStatus: bill.paymentStatus,
        order: bill.order,
        payments: bill.payments,
      },
      timestamps: {
        requestedAt: bill.requestedAt,
        generatedAt: bill.generatedAt,
        printedAt: bill.printedAt,
        deliveredAt: bill.deliveredAt,
        settledAt: bill.settledAt,
        paidAt: bill.paidAt,
      },
      metrics,
    });
  } catch (error) {
    console.error("Error fetching bill timestamps:", error);
    return NextResponse.json(
      { error: "Failed to fetch bill timestamps" },
      { status: 500 }
    );
  }
}
