import { NextRequest, NextResponse } from "next/server";

// GET eSewa payment failure callback
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const billId = searchParams.get("billId");
  const restaurant = searchParams.get("restaurant");

  console.log("eSewa payment failed for bill:", billId);

  // Redirect to billing page with error
  return NextResponse.redirect(
    new URL(
      `/${restaurant}/billing?billId=${billId}&error=payment_cancelled`,
      request.url
    )
  );
}
