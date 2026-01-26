import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

// POST switch demo role - FOR DEVELOPMENT ONLY
// TODO: Remove this endpoint before production deployment
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { role } = body;

    const validRoles = ["OWNER", "MANAGER", "WAITER", "KITCHEN", "HOST"];
    if (!validRoles.includes(role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }

    const response = NextResponse.json({
      success: true,
      role,
      message: `Switched to ${role} view`,
    });

    // Set demo role override cookie (read by getSession)
    response.cookies.set("demo_role_override", role, {
      httpOnly: false, // Allow JS to read it for UI updates
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24, // 24 hours
    });

    return response;
  } catch (error) {
    console.error("Error switching demo role:", error);
    return NextResponse.json(
      { error: "Failed to switch role" },
      { status: 500 }
    );
  }
}

// DELETE clear demo role override
export async function DELETE() {
  const response = NextResponse.json({ success: true });
  response.cookies.delete("demo_role_override");
  return response;
}

// GET current demo role
export async function GET() {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json({
      currentRole: session.role,
      userId: session.userId,
    });
  } catch (error) {
    console.error("Error getting demo role:", error);
    return NextResponse.json(
      { error: "Failed to get role" },
      { status: 500 }
    );
  }
}
