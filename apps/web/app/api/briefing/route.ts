import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const dateParam = searchParams.get("date");

    const targetDate = dateParam ? new Date(dateParam) : new Date();

    const briefing = await prisma.dailyBriefing.findFirst({
      where: {
        restaurantId: session.restaurantId,
        date: targetDate,
      },
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
      return NextResponse.json({ briefing: null });
    }

    // Parse JSON fields
    const parsedBriefing = {
      ...briefing,
      specials: briefing.specials || [],
      eightySixed: briefing.eightySixed || [],
      goals: briefing.goals || "",
      managerMessage: briefing.managerMessage || "",
      staffNotes: briefing.staffNotes || "",
      readBy: briefing.readBy || [],
    };

    return NextResponse.json({ briefing: parsedBriefing });
  } catch (error) {
    console.error("Error fetching briefing:", error);
    return NextResponse.json(
      { error: "Failed to fetch briefing" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only managers and above can create briefings
    const allowedRoles = ["OWNER", "ADMIN", "MANAGER"];
    if (!allowedRoles.includes(session.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const {
      date,
      specials,
      eightySixed,
      goals,
      managerMessage,
      staffNotes,
      expectedCovers,
      reservationsCount,
      specialEvents,
    } = body;

    const targetDate = date ? new Date(date) : new Date();

    // Check if briefing already exists for this date
    const existing = await prisma.dailyBriefing.findFirst({
      where: {
        restaurantId: session.restaurantId,
        date: targetDate,
      },
    });

    let briefing;

    if (existing) {
      // Update existing briefing
      briefing = await prisma.dailyBriefing.update({
        where: { id: existing.id },
        data: {
          specials: specials || [],
          eightySixed: eightySixed || [],
          goals: goals || null,
          managerMessage: managerMessage || null,
          staffNotes: staffNotes || null,
          expectedCovers: expectedCovers || null,
          reservationsCount: reservationsCount || null,
          specialEvents: specialEvents || null,
        },
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
    } else {
      // Create new briefing
      briefing = await prisma.dailyBriefing.create({
        data: {
          restaurantId: session.restaurantId,
          date: targetDate,
          specials: specials || [],
          eightySixed: eightySixed || [],
          goals: goals || null,
          managerMessage: managerMessage || null,
          staffNotes: staffNotes || null,
          expectedCovers: expectedCovers || null,
          reservationsCount: reservationsCount || null,
          specialEvents: specialEvents || null,
          publishedById: session.userId,
          publishedAt: new Date(),
          readBy: [session.userId],
        },
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
    }

    return NextResponse.json(
      {
        briefing: {
          ...briefing,
          specials: briefing.specials || [],
          eightySixed: briefing.eightySixed || [],
          goals: briefing.goals || "",
          managerMessage: briefing.managerMessage || "",
          staffNotes: briefing.staffNotes || "",
          readBy: briefing.readBy || [],
        },
      },
      { status: existing ? 200 : 201 }
    );
  } catch (error) {
    console.error("Error creating/updating briefing:", error);
    return NextResponse.json(
      { error: "Failed to save briefing" },
      { status: 500 }
    );
  }
}
