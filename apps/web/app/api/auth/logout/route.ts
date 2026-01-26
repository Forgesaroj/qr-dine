import { NextResponse } from "next/server";

export async function POST() {
  try {
    const response = NextResponse.json({ success: true });

    // Clear auth cookies by setting them to expire immediately
    response.headers.append(
      "Set-Cookie",
      `access_token=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax`
    );
    response.headers.append(
      "Set-Cookie",
      `refresh_token=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax`
    );

    return response;
  } catch (error) {
    console.error("Logout error:", error);
    return NextResponse.json(
      { error: "An error occurred during logout" },
      { status: 500 }
    );
  }
}
