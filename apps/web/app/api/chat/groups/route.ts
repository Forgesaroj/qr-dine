import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const groups = await prisma.chatGroup.findMany({
      where: {
        restaurantId: session.restaurantId,
      },
      orderBy: { createdAt: "desc" },
    });

    type ChatGroup = typeof groups[number];

    // Parse members JSON
    const parsedGroups = groups.map((g: ChatGroup) => ({
      ...g,
      members: JSON.parse(g.members as string),
    }));

    return NextResponse.json({ groups: parsedGroups });
  } catch (error) {
    console.error("Error fetching chat groups:", error);
    return NextResponse.json(
      { error: "Failed to fetch chat groups" },
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

    const body = await req.json();
    const { name, type, members } = body;

    if (!name) {
      return NextResponse.json({ error: "Group name is required" }, { status: 400 });
    }

    const group = await prisma.chatGroup.create({
      data: {
        restaurantId: session.restaurantId,
        name,
        type: type || "CUSTOM",
        members: JSON.stringify(members || [session.userId]),
        createdById: session.userId,
      },
    });

    return NextResponse.json(
      {
        group: {
          ...group,
          members: JSON.parse(group.members as string),
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating chat group:", error);
    return NextResponse.json(
      { error: "Failed to create chat group" },
      { status: 500 }
    );
  }
}
