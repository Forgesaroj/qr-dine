import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const briefing = await prisma.dailyBriefing.findUnique({
      where: { id: params.id },
      include: {
        publishedBy: {
          select: {
            id: true,
            name: true,
            role: true,
          },
        },
      },
    });

    if (!briefing) {
      return NextResponse.json({ error: "Briefing not found" }, { status: 404 });
    }

    if (briefing.restaurantId !== session.restaurantId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json({
      briefing: {
        ...briefing,
        specials: briefing.specials || [],
        eightySixed: briefing.eightySixed || [],
        goals: briefing.goals || "",
        managerMessage: briefing.managerMessage || "",
        staffNotes: briefing.staffNotes || "",
        readBy: briefing.readBy || [],
      },
    });
  } catch (error) {
    console.error("Error fetching briefing:", error);
    return NextResponse.json(
      { error: "Failed to fetch briefing" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only managers and above can update briefings
    const allowedRoles = ["OWNER", "ADMIN", "MANAGER"];
    if (!allowedRoles.includes(session.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const briefing = await prisma.dailyBriefing.findUnique({
      where: { id: params.id },
    });

    if (!briefing) {
      return NextResponse.json({ error: "Briefing not found" }, { status: 404 });
    }

    if (briefing.restaurantId !== session.restaurantId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const {
      specials,
      eightySixed,
      goals,
      managerMessage,
      staffNotes,
      expectedCovers,
      reservationsCount,
      specialEvents,
      publish,
    } = body;

    const updateData: Record<string, unknown> = {};

    if (specials !== undefined) updateData.specials = specials;
    if (eightySixed !== undefined) updateData.eightySixed = eightySixed;
    if (goals !== undefined) updateData.goals = goals;
    if (managerMessage !== undefined) updateData.managerMessage = managerMessage;
    if (staffNotes !== undefined) updateData.staffNotes = staffNotes;
    if (expectedCovers !== undefined) updateData.expectedCovers = expectedCovers;
    if (reservationsCount !== undefined) updateData.reservationsCount = reservationsCount;
    if (specialEvents !== undefined) updateData.specialEvents = specialEvents;

    if (publish && !briefing.publishedAt) {
      updateData.publishedById = session.userId;
      updateData.publishedAt = new Date();
    }

    const updatedBriefing = await prisma.dailyBriefing.update({
      where: { id: params.id },
      data: updateData,
      include: {
        publishedBy: {
          select: {
            id: true,
            name: true,
            role: true,
          },
        },
      },
    });

    return NextResponse.json({
      briefing: {
        ...updatedBriefing,
        specials: updatedBriefing.specials || [],
        eightySixed: updatedBriefing.eightySixed || [],
        goals: updatedBriefing.goals || "",
        managerMessage: updatedBriefing.managerMessage || "",
        staffNotes: updatedBriefing.staffNotes || "",
        readBy: updatedBriefing.readBy || [],
      },
    });
  } catch (error) {
    console.error("Error updating briefing:", error);
    return NextResponse.json(
      { error: "Failed to update briefing" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only managers and above can delete briefings
    const allowedRoles = ["OWNER", "ADMIN", "MANAGER"];
    if (!allowedRoles.includes(session.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const briefing = await prisma.dailyBriefing.findUnique({
      where: { id: params.id },
    });

    if (!briefing) {
      return NextResponse.json({ error: "Briefing not found" }, { status: 404 });
    }

    if (briefing.restaurantId !== session.restaurantId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await prisma.dailyBriefing.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting briefing:", error);
    return NextResponse.json(
      { error: "Failed to delete briefing" },
      { status: 500 }
    );
  }
}
