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
    const chatType = searchParams.get("type");
    const chatId = searchParams.get("chatId");

    if (!chatType || !chatId) {
      return NextResponse.json(
        { error: "Chat type and ID are required" },
        { status: 400 }
      );
    }

    // For direct messages, create a consistent chatId
    let resolvedChatId = chatId;
    if (chatType === "direct") {
      const ids = [session.userId, chatId].sort();
      resolvedChatId = `dm_${ids[0]}_${ids[1]}`;
    }

    const messages = await prisma.chatMessage.findMany({
      where: {
        restaurantId: session.restaurantId,
        chatType,
        chatId: resolvedChatId,
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            role: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: { sentAt: "asc" },
      take: 100,
    });

    // Mark messages as read
    await prisma.chatMessage.updateMany({
      where: {
        restaurantId: session.restaurantId,
        chatType,
        chatId: resolvedChatId,
        NOT: {
          readBy: {
            array_contains: [session.userId],
          },
        },
      },
      data: {
        readBy: {
          push: session.userId,
        },
      },
    });

    return NextResponse.json({ messages });
  } catch (error) {
    console.error("Error fetching messages:", error);
    return NextResponse.json(
      { error: "Failed to fetch messages" },
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
    const { chatType, chatId, messageText } = body;

    if (!chatType || !chatId || !messageText) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // For direct messages, create a consistent chatId
    let resolvedChatId = chatId;
    if (chatType === "direct") {
      const ids = [session.userId, chatId].sort();
      resolvedChatId = `dm_${ids[0]}_${ids[1]}`;
    }

    const message = await prisma.chatMessage.create({
      data: {
        restaurantId: session.restaurantId,
        chatType,
        chatId: resolvedChatId,
        senderId: session.userId,
        messageText,
        readBy: [session.userId],
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            role: true,
            avatarUrl: true,
          },
        },
      },
    });

    return NextResponse.json({ message }, { status: 201 });
  } catch (error) {
    console.error("Error sending message:", error);
    return NextResponse.json(
      { error: "Failed to send message" },
      { status: 500 }
    );
  }
}
