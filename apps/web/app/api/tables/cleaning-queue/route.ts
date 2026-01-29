import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getCleaningQueue } from "@/lib/services/cleaning.service";

/**
 * GET /api/tables/cleaning-queue
 * Get list of tables waiting to be cleaned
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get cleaning queue for user's restaurant
    const queue = await getCleaningQueue(session.restaurantId);

    return NextResponse.json({
      success: true,
      queue,
      count: queue.length,
    });
  } catch (error) {
    console.error("Error fetching cleaning queue:", error);
    return NextResponse.json(
      { error: "Failed to fetch cleaning queue" },
      { status: 500 }
    );
  }
}
