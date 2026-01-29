import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { awardPoints, redeemPoints, awardVisitMilestone } from "@/lib/loyalty";
import { createInvoiceService, CreateInvoiceData } from "@/lib/services/invoice.service";

// Check if user can process payments (waiters cannot)
function canProcessPayments(role: string): boolean {
  return role !== "WAITER";
}

// POST add payment to bill
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Waiters cannot process payments
    if (!canProcessPayments(session.role)) {
      return NextResponse.json(
        { error: "You do not have permission to process payments" },
        { status: 403 }
      );
    }

    const { id: billId } = await params;
    const body = await request.json();
    const { amount, method, transactionId, reference, cashReceived, pointsToRedeem } = body;

    if (!amount || !method) {
      return NextResponse.json(
        { error: "Amount and payment method are required" },
        { status: 400 }
      );
    }

    // Verify bill exists and belongs to restaurant
    const bill = await prisma.bill.findFirst({
      where: {
        id: billId,
        restaurantId: session.restaurantId,
      },
      include: {
        payments: true,
        order: {
          include: {
            table: true,
            customer: true,
          },
        },
        customer: true,
      },
    });

    if (!bill) {
      return NextResponse.json({ error: "Bill not found" }, { status: 404 });
    }

    type PaymentType = typeof bill.payments[number];

    if (bill.status === "PAID" || bill.status === "CANCELLED") {
      return NextResponse.json(
        { error: "Bill is already paid or cancelled" },
        { status: 400 }
      );
    }

    // Handle points redemption if requested
    let pointsDiscount = 0;
    const customerId = bill.customerId || bill.order?.customerId;

    if (pointsToRedeem && pointsToRedeem > 0 && customerId) {
      const redeemResult = await redeemPoints(
        customerId,
        billId,
        pointsToRedeem,
        session.restaurantId
      );

      if (!redeemResult.success) {
        return NextResponse.json(
          { error: redeemResult.error || "Failed to redeem points" },
          { status: 400 }
        );
      }

      pointsDiscount = redeemResult.discountAmount;
    }

    // Calculate change for cash payments
    let changeGiven = null;
    if (method === "CASH" && cashReceived) {
      changeGiven = cashReceived - amount;
    }

    // Create payment
    const payment = await prisma.payment.create({
      data: {
        billId,
        amount,
        method,
        transactionId,
        reference,
        cashReceived,
        changeGiven,
        status: "COMPLETED",
        processedById: session.userId,
        processedAt: new Date(),
      },
    });

    // Calculate total paid
    const totalPaid =
      bill.payments.reduce((sum: number, p: PaymentType) => sum + p.amount, 0) + amount;

    // Check if bill is fully paid
    let loyaltyResult = null;
    let invoiceCreated = null;

    if (totalPaid >= bill.totalAmount) {
      // Mark bill as paid
      await prisma.bill.update({
        where: { id: billId },
        data: {
          status: "PAID",
          paymentStatus: "COMPLETED",
          paymentMethod: method,
          settledById: session.userId,
          settledAt: new Date(),
        },
      });

      // Mark table as CLEANING and generate new OTP (per SESSION_FLOW_SPEC.md)
      if (bill.order?.table) {
        const newOtp = String(Math.floor(100 + Math.random() * 900)); // 3-digit OTP
        await prisma.table.update({
          where: { id: bill.order.table.id },
          data: {
            status: "CLEANING",
            currentOtp: newOtp,
            otpGeneratedAt: new Date(),
          },
        });

        // End any active session for this table
        await prisma.tableSession.updateMany({
          where: {
            tableId: bill.order.table.id,
            status: "ACTIVE",
          },
          data: {
            status: "COMPLETED",
            endedAt: new Date(),
            paymentCompletedAt: new Date(),
          },
        });
      }

      // Award loyalty points if customer exists
      if (customerId && bill.orderId) {
        loyaltyResult = await awardPoints(
          customerId,
          bill.orderId,
          bill.totalAmount - pointsDiscount,
          session.restaurantId
        );

        // Check and award visit milestone
        const customer = await prisma.customer.findUnique({
          where: { id: customerId },
          select: { totalVisits: true },
        });

        if (customer) {
          const milestoneResult = await awardVisitMilestone(
            customerId,
            customer.totalVisits,
            session.restaurantId
          );

          if (milestoneResult.isMilestone && milestoneResult.pointsAwarded > 0) {
            loyaltyResult = {
              ...loyaltyResult,
              milestoneBonus: {
                isMilestone: true,
                pointsAwarded: milestoneResult.pointsAwarded,
                message: milestoneResult.milestoneMessage,
              },
              newBalance: milestoneResult.newBalance,
            };
          }
        }
      }

      // ═══════════════════════════════════════════════════════════════════════════════
      // CREATE IRD INVOICE IF ENABLED
      // ═══════════════════════════════════════════════════════════════════════════════
      try {
        // Check if IRD is enabled for this restaurant
        const restaurantSettings = await prisma.restaurantSettings.findUnique({
          where: { restaurantId: session.restaurantId },
        });

        if (restaurantSettings?.irdEnabled) {
          // Get all items from the bill's session orders or primary order
          let invoiceItems: { description: string; descriptionLocal?: string; quantity: number; unitPrice: number; menuItemId?: string }[] = [];

          if (bill.sessionId) {
            // Get all items from session orders
            const sessionOrders = await prisma.order.findMany({
              where: {
                sessionId: bill.sessionId,
                restaurantId: session.restaurantId,
                status: "COMPLETED",
              },
              include: {
                items: {
                  include: {
                    menuItem: { select: { name: true, nameLocal: true, id: true } },
                  },
                },
              },
            });

            for (const order of sessionOrders) {
              for (const item of order.items) {
                invoiceItems.push({
                  description: item.menuItemName || item.menuItem?.name || "Item",
                  descriptionLocal: item.menuItem?.nameLocal || undefined,
                  quantity: item.quantity,
                  unitPrice: item.unitPrice,
                  menuItemId: item.menuItemId,
                });
              }
            }
          } else {
            // Use primary order items
            const orderWithItems = await prisma.order.findUnique({
              where: { id: bill.orderId },
              include: {
                items: {
                  include: {
                    menuItem: { select: { name: true, nameLocal: true, id: true } },
                  },
                },
              },
            });

            if (orderWithItems) {
              for (const item of orderWithItems.items) {
                invoiceItems.push({
                  description: item.menuItemName || item.menuItem?.name || "Item",
                  descriptionLocal: item.menuItem?.nameLocal || undefined,
                  quantity: item.quantity,
                  unitPrice: item.unitPrice,
                  menuItemId: item.menuItemId,
                });
              }
            }
          }

          // Create invoice data
          const invoiceData: CreateInvoiceData = {
            restaurantId: session.restaurantId,
            billId: billId,
            orderId: bill.orderId,
            sessionId: bill.sessionId || undefined,
            buyerName: bill.customer?.name || bill.order?.customer?.name || "Walk-in Customer",
            buyerPan: undefined, // Can be added via separate flow
            buyerAddress: undefined,
            items: invoiceItems,
            subtotal: bill.subtotal,
            discountAmount: bill.discountAmount + pointsDiscount,
            discountReason: pointsDiscount > 0 ? `Loyalty points redeemed (${pointsDiscount} NPR)` : undefined,
            serviceChargeRate: restaurantSettings.irdIncludeServiceCharge
              ? Number(restaurantSettings.irdServiceChargeRate || 10)
              : 0,
            serviceCharge: restaurantSettings.irdIncludeServiceCharge
              ? bill.serviceCharge
              : 0,
            paymentMethod: method,
            createdBy: session.userId,
            createdByName: session.email?.split('@')[0] || "Staff",
            skipCBMS: true, // Manual sync can be done later
          };

          const invoiceService = createInvoiceService(session.restaurantId);
          const invoice = await invoiceService.createInvoice(invoiceData);

          invoiceCreated = {
            id: invoice.id,
            invoiceNumber: invoice.invoiceNumber,
            fiscalYear: invoice.fiscalYear,
            invoiceDateBs: invoice.invoiceDateBs,
            totalAmount: Number(invoice.totalAmount),
          };
        }
      } catch (invoiceError) {
        // Log error but don't fail the payment
        console.error("Error creating IRD invoice:", invoiceError);
        // Invoice creation failed but payment still succeeded
      }
    } else {
      // Update to partially paid
      await prisma.bill.update({
        where: { id: billId },
        data: {
          status: "PARTIALLY_PAID",
          paymentStatus: "PENDING",
        },
      });
    }

    // Get updated bill
    const updatedBill = await prisma.bill.findUnique({
      where: { id: billId },
      include: {
        order: {
          include: {
            table: { select: { tableNumber: true, name: true } },
            items: true,
          },
        },
        payments: {
          include: {
            processedBy: { select: { name: true } },
          },
        },
      },
    });

    return NextResponse.json({
      payment,
      bill: updatedBill,
      loyalty: loyaltyResult,
      pointsDiscount,
      invoice: invoiceCreated,
    }, { status: 201 });
  } catch (error) {
    console.error("Error processing payment:", error);
    return NextResponse.json(
      { error: "Failed to process payment" },
      { status: 500 }
    );
  }
}
