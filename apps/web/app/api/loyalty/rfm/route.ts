import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { performRFMAnalysis, getRFMSegmentInfo, RFMSegment } from "@/lib/loyalty";

// GET - Get RFM analysis for all customers
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only managers and admins can view RFM analysis
    if (!["ADMIN", "MANAGER", "OWNER"].includes(session.role)) {
      return NextResponse.json(
        { error: "You do not have permission to view RFM analysis" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const segment = searchParams.get("segment") as RFMSegment | null;

    const analysis = await performRFMAnalysis(session.restaurantId);

    // Filter by segment if specified
    let customers = analysis.customers;
    if (segment) {
      customers = customers.filter((c) => c.rfm.segment === segment);
    }

    // Add segment info to each customer
    const customersWithInfo = customers.map((c) => ({
      ...c,
      segmentInfo: getRFMSegmentInfo(c.rfm.segment),
    }));

    // Get all segment info for reference
    const allSegments = [
      "CHAMPIONS",
      "LOYAL_CUSTOMERS",
      "POTENTIAL_LOYALISTS",
      "NEW_CUSTOMERS",
      "PROMISING",
      "NEED_ATTENTION",
      "ABOUT_TO_SLEEP",
      "AT_RISK",
      "CANT_LOSE",
      "HIBERNATING",
      "LOST",
    ] as RFMSegment[];

    const segmentDetails = allSegments.map((s) => ({
      segment: s,
      ...getRFMSegmentInfo(s),
      count: analysis.segmentCounts[s] || 0,
    }));

    return NextResponse.json({
      customers: customersWithInfo,
      segmentCounts: analysis.segmentCounts,
      segmentDetails,
      averages: analysis.averages,
      totalCustomers: analysis.customers.length,
    });
  } catch (error) {
    console.error("Error performing RFM analysis:", error);
    return NextResponse.json(
      { error: "Failed to perform RFM analysis" },
      { status: 500 }
    );
  }
}
