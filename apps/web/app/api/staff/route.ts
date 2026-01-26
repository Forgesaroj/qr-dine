import { NextRequest, NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// GET all staff for the restaurant
export async function GET() {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const staff = await prisma.user.findMany({
      where: { restaurantId: session.restaurantId },
      orderBy: [{ role: "asc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        status: true,
        avatarUrl: true,
        lastLoginAt: true,
        pin: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ staff });
  } catch (error) {
    console.error("Error fetching staff:", error);
    return NextResponse.json(
      { error: "Failed to fetch staff" },
      { status: 500 }
    );
  }
}

// POST create a new staff member
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user has permission to add staff
    if (!["SUPER_ADMIN", "OWNER", "MANAGER"].includes(session.role)) {
      return NextResponse.json(
        { error: "You don't have permission to add staff" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name, email, password, phone, role, pin } = body;

    if (!name || !email || !password || !role) {
      return NextResponse.json(
        { error: "Name, email, password, and role are required" },
        { status: 400 }
      );
    }

    // Check if email already exists in this restaurant
    const existingUser = await prisma.user.findFirst({
      where: {
        restaurantId: session.restaurantId,
        email: email.toLowerCase(),
      },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "A staff member with this email already exists" },
        { status: 400 }
      );
    }

    // Hash password
    const passwordHash = await hash(password, 12);

    // Hash PIN if provided
    let hashedPin = null;
    if (pin) {
      hashedPin = await hash(pin, 12);
    }

    const staff = await prisma.user.create({
      data: {
        restaurantId: session.restaurantId,
        name,
        email: email.toLowerCase(),
        passwordHash,
        phone: phone || null,
        role,
        pin: hashedPin,
        status: "ACTIVE",
        permissions: [],
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        status: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ staff }, { status: 201 });
  } catch (error) {
    console.error("Error creating staff:", error);
    return NextResponse.json(
      { error: "Failed to create staff member" },
      { status: 500 }
    );
  }
}
