import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// GET - Get edit logs for a specific bill
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: billId } = await params;
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    // Verify bill exists and belongs to restaurant
    const bill = await prisma.bill.findFirst({
      where: {
        id: billId,
        restaurantId: session.restaurantId,
      },
      select: {
        id: true,
        billNumber: true,
        isEdited: true,
        editCount: true,
      },
    });

    if (!bill) {
      return NextResponse.json({ error: "Bill not found" }, { status: 404 });
    }

    // Get edit logs
    const [editLogs, totalCount] = await Promise.all([
      prisma.billEditLog.findMany({
        where: { billId },
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
        include: {
          editor: {
            select: { name: true },
          },
        },
      }),
      prisma.billEditLog.count({ where: { billId } }),
    ]);

    return NextResponse.json({
      bill: {
        id: bill.id,
        billNumber: bill.billNumber,
        isEdited: bill.isEdited,
        editCount: bill.editCount,
      },
      editLogs: editLogs.map(log => ({
        ...log,
        editorName: log.editor?.name || log.editedByName,
      })),
      pagination: {
        total: totalCount,
        limit,
        offset,
        hasMore: offset + limit < totalCount,
      },
    });
  } catch (error) {
    console.error("Error fetching edit logs:", error);
    return NextResponse.json(
      { error: "Failed to fetch edit logs" },
      { status: 500 }
    );
  }
}
