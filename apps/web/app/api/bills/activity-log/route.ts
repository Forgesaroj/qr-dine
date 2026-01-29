import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { BillEditAction } from "@prisma/client";

// GET - Browse all bill edit activity logs
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);

    // Pagination
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const offset = (page - 1) * limit;

    // Filters
    const action = searchParams.get("action") as BillEditAction | null;
    const editorId = searchParams.get("editorId");
    const billId = searchParams.get("billId");
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");
    const searchTerm = searchParams.get("search");

    // Build where clause
    const where: Record<string, unknown> = {
      restaurantId: session.restaurantId,
    };

    if (action) {
      where.action = action;
    }

    if (editorId) {
      where.editedById = editorId;
    }

    if (billId) {
      where.billId = billId;
    }

    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) {
        (where.createdAt as Record<string, unknown>).gte = new Date(dateFrom);
      }
      if (dateTo) {
        const toDate = new Date(dateTo);
        toDate.setHours(23, 59, 59, 999);
        (where.createdAt as Record<string, unknown>).lte = toDate;
      }
    }

    if (searchTerm) {
      where.OR = [
        { description: { contains: searchTerm, mode: "insensitive" } },
        { itemName: { contains: searchTerm, mode: "insensitive" } },
        { reason: { contains: searchTerm, mode: "insensitive" } },
        { bill: { billNumber: { contains: searchTerm, mode: "insensitive" } } },
      ];
    }

    // Run queries in parallel
    const [activityLogs, totalCount, actionCounts] = await Promise.all([
      prisma.billEditLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
        include: {
          bill: {
            select: {
              id: true,
              billNumber: true,
              status: true,
              totalAmount: true,
              order: {
                select: {
                  table: {
                    select: { id: true, tableNumber: true, name: true },
                  },
                },
              },
            },
          },
          editor: {
            select: { id: true, name: true, role: true },
          },
        },
      }),

      prisma.billEditLog.count({ where }),

      // Get action counts for filter badges
      prisma.billEditLog.groupBy({
        by: ["action"],
        where: { restaurantId: session.restaurantId },
        _count: { action: true },
      }),
    ]);

    // Format response
    const formattedLogs = activityLogs.map(log => ({
      id: log.id,
      action: log.action,
      description: log.description,
      reason: log.reason,
      itemName: log.itemName,
      amountBefore: log.amountBefore,
      amountAfter: log.amountAfter,
      amountChange: log.amountChange,
      oldValue: log.oldValue,
      newValue: log.newValue,
      createdAt: log.createdAt,
      bill: {
        id: log.bill.id,
        billNumber: log.bill.billNumber,
        status: log.bill.status,
        totalAmount: log.bill.totalAmount,
        tableNumber: log.bill.order?.table?.tableNumber,
        tableName: log.bill.order?.table?.name,
      },
      editor: {
        id: log.editor?.id || log.editedById,
        name: log.editor?.name || log.editedByName,
        role: log.editor?.role || log.editedByRole,
      },
    }));

    // Format action counts
    const actionCountsMap = actionCounts.reduce((acc, item) => {
      acc[item.action] = item._count.action;
      return acc;
    }, {} as Record<string, number>);

    return NextResponse.json({
      activityLogs: formattedLogs,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit),
        hasMore: offset + limit < totalCount,
      },
      actionCounts: actionCountsMap,
      availableActions: Object.values(BillEditAction),
    });
  } catch (error) {
    console.error("Error fetching activity logs:", error);
    return NextResponse.json(
      { error: "Failed to fetch activity logs" },
      { status: 500 }
    );
  }
}
