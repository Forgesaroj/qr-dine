import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// GET - Get bill edit statistics for dashboard
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const includeRecent = searchParams.get("includeRecent") === "true";

    // Get today's date boundaries
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Run all queries in parallel
    const [
      totalEditedBills,
      todayEditedBills,
      totalEditLogs,
      todayEditLogs,
      recentEdits,
      editsByAction,
      topEditors,
    ] = await Promise.all([
      // Total edited bills count
      prisma.bill.count({
        where: {
          restaurantId: session.restaurantId,
          isEdited: true,
        },
      }),

      // Today's edited bills count
      prisma.bill.count({
        where: {
          restaurantId: session.restaurantId,
          isEdited: true,
          updatedAt: {
            gte: today,
            lt: tomorrow,
          },
        },
      }),

      // Total edit log entries
      prisma.billEditLog.count({
        where: {
          restaurantId: session.restaurantId,
        },
      }),

      // Today's edit log entries
      prisma.billEditLog.count({
        where: {
          restaurantId: session.restaurantId,
          createdAt: {
            gte: today,
            lt: tomorrow,
          },
        },
      }),

      // Recent edits (last 10)
      includeRecent
        ? prisma.billEditLog.findMany({
            where: {
              restaurantId: session.restaurantId,
            },
            orderBy: { createdAt: "desc" },
            take: 10,
            include: {
              bill: {
                select: {
                  billNumber: true,
                  order: {
                    select: {
                      table: {
                        select: { tableNumber: true },
                      },
                    },
                  },
                },
              },
              editor: {
                select: { name: true },
              },
            },
          })
        : [],

      // Edits grouped by action type (last 30 days)
      prisma.billEditLog.groupBy({
        by: ["action"],
        where: {
          restaurantId: session.restaurantId,
          createdAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          },
        },
        _count: {
          action: true,
        },
      }),

      // Top editors (last 30 days)
      prisma.billEditLog.groupBy({
        by: ["editedById", "editedByName"],
        where: {
          restaurantId: session.restaurantId,
          createdAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          },
        },
        _count: {
          id: true,
        },
        orderBy: {
          _count: {
            id: "desc",
          },
        },
        take: 5,
      }),
    ]);

    // Format recent edits
    const formattedRecentEdits = recentEdits.map(edit => ({
      id: edit.id,
      action: edit.action,
      description: edit.description,
      billNumber: edit.bill.billNumber,
      tableNumber: edit.bill.order?.table?.tableNumber,
      editorName: edit.editor?.name || edit.editedByName,
      createdAt: edit.createdAt,
      amountChange: edit.amountChange,
    }));

    // Format edits by action
    const editsByActionFormatted = editsByAction.reduce((acc, item) => {
      acc[item.action] = item._count.action;
      return acc;
    }, {} as Record<string, number>);

    // Format top editors
    const topEditorsFormatted = topEditors.map(editor => ({
      userId: editor.editedById,
      name: editor.editedByName,
      editCount: editor._count.id,
    }));

    return NextResponse.json({
      stats: {
        totalEditedBills,
        todayEditedBills,
        totalEditLogs,
        todayEditLogs,
      },
      recentEdits: formattedRecentEdits,
      editsByAction: editsByActionFormatted,
      topEditors: topEditorsFormatted,
    });
  } catch (error) {
    console.error("Error fetching edit stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch edit statistics" },
      { status: 500 }
    );
  }
}
