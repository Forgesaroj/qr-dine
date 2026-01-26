import { NextRequest, NextResponse } from "next/server";
import { compare } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { createAccessToken, createRefreshToken, buildCookieHeader } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    // Find user by email (using findFirst since email alone is not unique)
    const user = await prisma.user.findFirst({
      where: { email: email.toLowerCase() },
      include: {
        restaurant: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    // Check if user is active
    if (user.status !== "ACTIVE") {
      return NextResponse.json(
        { error: "Your account is inactive. Please contact admin." },
        { status: 403 }
      );
    }

    // Verify password
    const isValidPassword = await compare(password, user.passwordHash);

    if (!isValidPassword) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    // Create token payload
    const tokenPayload = {
      id: user.id,
      userId: user.id,
      email: user.email,
      role: user.role,
      restaurantId: user.restaurantId,
      restaurantSlug: user.restaurant.slug,
    };

    // Generate tokens
    const accessToken = await createAccessToken(tokenPayload);
    const refreshToken = await createRefreshToken(tokenPayload);

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // Build response with cookies
    const cookieHeaders = buildCookieHeader(accessToken, refreshToken);

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        restaurantId: user.restaurantId,
        restaurantName: user.restaurant.name,
        restaurantSlug: user.restaurant.slug,
      },
    });

    // Set cookies on response
    cookieHeaders.forEach((cookie) => {
      response.headers.append("Set-Cookie", cookie);
    });

    return response;
  } catch (error) {
    console.error("Login error details:", error);

    // Return more specific error in development
    const errorMessage = process.env.NODE_ENV === "development"
      ? `Login failed: ${error instanceof Error ? error.message : String(error)}`
      : "An error occurred during login";

    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
