import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { createVoucherService } from "@/lib/services/accounting/voucher.service";

// ═══════════════════════════════════════════════════════════════════════════════
// GET - Get day book for a specific date
// ═══════════════════════════════════════════════════════════════════════════════

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get("date");

    // Default to today if no date provided
    const date = dateParam ? new Date(dateParam) : new Date();

    const voucherService = createVoucherService(session.restaurantId);
    const dayBook = await voucherService.getDayBook(date);

    return NextResponse.json(dayBook);
  } catch (error) {
    console.error("Error fetching day book:", error);
    return NextResponse.json(
      { error: "Failed to fetch day book" },
      { status: 500 }
    );
  }
}
