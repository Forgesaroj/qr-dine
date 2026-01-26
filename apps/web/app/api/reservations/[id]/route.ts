import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET single reservation
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

    const reservation = await prisma.reservation.findFirst({
      where: {
        id,
        restaurantId: session.restaurantId,
      },
      include: {
        table: { select: { id: true, tableNumber: true, name: true, capacity: true } },
        customer: {
          select: {
            id: true,
            name: true,
            phone: true,
            email: true,
            tier: true,
            totalVisits: true,
          },
        },
        confirmedBy: { select: { id: true, name: true } },
        seatedBy: { select: { id: true, name: true } },
        cancelledBy: { select: { id: true, name: true } },
        session: { select: { id: true, status: true } },
      },
    });

    if (!reservation) {
      return NextResponse.json(
        { error: "Reservation not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ reservation });
  } catch (error) {
    console.error("Error fetching reservation:", error);
    return NextResponse.json(
      { error: "Failed to fetch reservation" },
      { status: 500 }
    );
  }
}

// PATCH update reservation (confirm, seat, cancel, update details)
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
    const { action, ...updateData } = body;

    // Get current reservation
    const reservation = await prisma.reservation.findFirst({
      where: {
        id,
        restaurantId: session.restaurantId,
      },
      include: { table: true },
    });

    if (!reservation) {
      return NextResponse.json(
        { error: "Reservation not found" },
        { status: 404 }
      );
    }

    const now = new Date();
    let data: Record<string, unknown> = {};
    let message = "";

    switch (action) {
      case "confirm":
        if (reservation.status !== "PENDING") {
          return NextResponse.json(
            { error: "Only pending reservations can be confirmed" },
            { status: 400 }
          );
        }
        data = {
          status: "CONFIRMED",
          confirmedAt: now,
          confirmedById: session.userId,
        };
        message = "Reservation confirmed";
        break;

      case "seat":
        if (!["PENDING", "CONFIRMED"].includes(reservation.status)) {
          return NextResponse.json(
            { error: "Cannot seat - invalid reservation status" },
            { status: 400 }
          );
        }

        // If no table assigned, require one
        const tableId = updateData.tableId || reservation.tableId;
        if (!tableId) {
          return NextResponse.json(
            { error: "Please assign a table before seating" },
            { status: 400 }
          );
        }

        // Create table session
        const tableSession = await prisma.tableSession.create({
          data: {
            restaurantId: session.restaurantId,
            tableId,
            guestCount: reservation.partySize,
            customerId: reservation.customerId,
            status: "ACTIVE",
            startedById: session.userId,
            startedByType: "STAFF",
            seatedAt: now,
            waiterNotifiedAt: now,
          },
        });

        // Update table status
        await prisma.table.update({
          where: { id: tableId },
          data: { status: "OCCUPIED" },
        });

        data = {
          status: "SEATED",
          tableId,
          seatedAt: now,
          seatedById: session.userId,
          sessionId: tableSession.id,
        };
        message = "Guest seated successfully";
        break;

      case "complete":
        if (reservation.status !== "SEATED") {
          return NextResponse.json(
            { error: "Only seated reservations can be completed" },
            { status: 400 }
          );
        }
        data = {
          status: "COMPLETED",
          completedAt: now,
        };
        message = "Reservation completed";
        break;

      case "cancel":
        if (["COMPLETED", "CANCELLED", "NO_SHOW"].includes(reservation.status)) {
          return NextResponse.json(
            { error: "Cannot cancel this reservation" },
            { status: 400 }
          );
        }
        data = {
          status: "CANCELLED",
          cancelledAt: now,
          cancelledById: session.userId,
          cancellationReason: updateData.reason || null,
        };
        message = "Reservation cancelled";
        break;

      case "no_show":
        if (!["PENDING", "CONFIRMED"].includes(reservation.status)) {
          return NextResponse.json(
            { error: "Cannot mark as no-show" },
            { status: 400 }
          );
        }
        data = {
          status: "NO_SHOW",
          cancelledAt: now,
        };
        message = "Reservation marked as no-show";
        break;

      case "update":
        // Update reservation details
        data = {
          customerName: updateData.customerName || reservation.customerName,
          customerPhone: updateData.customerPhone || reservation.customerPhone,
          customerEmail: updateData.customerEmail,
          date: updateData.date ? new Date(updateData.date) : reservation.date,
          time: updateData.time || reservation.time,
          partySize: updateData.partySize ? parseInt(updateData.partySize) : reservation.partySize,
          tableId: updateData.tableId || reservation.tableId,
          preferredSection: updateData.preferredSection,
          notes: updateData.notes,
          specialRequests: updateData.specialRequests,
          occasion: updateData.occasion,
        };
        message = "Reservation updated";
        break;

      case "assign_table":
        if (!updateData.tableId) {
          return NextResponse.json(
            { error: "Table ID is required" },
            { status: 400 }
          );
        }
        data = {
          tableId: updateData.tableId,
        };
        message = "Table assigned";
        break;

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }

    // Update reservation
    const updatedReservation = await prisma.reservation.update({
      where: { id },
      data,
      include: {
        table: { select: { id: true, tableNumber: true, name: true } },
        customer: { select: { id: true, name: true, tier: true } },
      },
    });

    return NextResponse.json({
      success: true,
      reservation: updatedReservation,
      message,
    });
  } catch (error) {
    console.error("Error updating reservation:", error);
    return NextResponse.json(
      { error: "Failed to update reservation" },
      { status: 500 }
    );
  }
}

// DELETE reservation
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const reservation = await prisma.reservation.findFirst({
      where: {
        id,
        restaurantId: session.restaurantId,
      },
    });

    if (!reservation) {
      return NextResponse.json(
        { error: "Reservation not found" },
        { status: 404 }
      );
    }

    // Only allow deletion of pending/cancelled/no-show reservations
    if (!["PENDING", "CANCELLED", "NO_SHOW"].includes(reservation.status)) {
      return NextResponse.json(
        { error: "Cannot delete active reservations" },
        { status: 400 }
      );
    }

    await prisma.reservation.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: "Reservation deleted",
    });
  } catch (error) {
    console.error("Error deleting reservation:", error);
    return NextResponse.json(
      { error: "Failed to delete reservation" },
      { status: 500 }
    );
  }
}
