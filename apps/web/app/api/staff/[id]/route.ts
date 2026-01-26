import { NextRequest, NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// GET single staff member
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const staff = await prisma.user.findFirst({
      where: {
        id,
        restaurantId: session.restaurantId,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        status: true,
        avatarUrl: true,
        pin: true,
        createdAt: true,
      },
    });

    if (!staff) {
      return NextResponse.json({ error: "Staff not found" }, { status: 404 });
    }

    return NextResponse.json({ staff });
  } catch (error) {
    console.error("Error fetching staff:", error);
    return NextResponse.json(
      { error: "Failed to fetch staff" },
      { status: 500 }
    );
  }
}

// PATCH update staff member
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check permission
    if (!["SUPER_ADMIN", "OWNER", "MANAGER"].includes(session.role)) {
      return NextResponse.json(
        { error: "You don't have permission to update staff" },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const { name, email, password, phone, role, status, pin } = body;

    const existingStaff = await prisma.user.findFirst({
      where: {
        id,
        restaurantId: session.restaurantId,
      },
    });

    if (!existingStaff) {
      return NextResponse.json({ error: "Staff not found" }, { status: 404 });
    }

    // If changing email, check for duplicates
    if (email && email.toLowerCase() !== existingStaff.email) {
      const duplicate = await prisma.user.findFirst({
        where: {
          restaurantId: session.restaurantId,
          email: email.toLowerCase(),
          id: { not: id },
        },
      });

      if (duplicate) {
        return NextResponse.json(
          { error: "A staff member with this email already exists" },
          { status: 400 }
        );
      }
    }

    // Build update data
    const updateData: Record<string, unknown> = {};

    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email.toLowerCase();
    if (phone !== undefined) updateData.phone = phone || null;
    if (role !== undefined) updateData.role = role;
    if (status !== undefined) updateData.status = status;

    // Hash password if provided
    if (password) {
      updateData.passwordHash = await hash(password, 12);
    }

    // Hash PIN if provided
    if (pin !== undefined) {
      if (pin) {
        updateData.pin = await hash(pin, 12);
      } else {
        updateData.pin = null;
      }
    }

    const staff = await prisma.user.update({
      where: { id },
      data: updateData,
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

    return NextResponse.json({ staff });
  } catch (error) {
    console.error("Error updating staff:", error);
    return NextResponse.json(
      { error: "Failed to update staff" },
      { status: 500 }
    );
  }
}

// DELETE staff member
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check permission
    if (!["SUPER_ADMIN", "OWNER", "MANAGER"].includes(session.role)) {
      return NextResponse.json(
        { error: "You don't have permission to delete staff" },
        { status: 403 }
      );
    }

    const { id } = await params;

    // Prevent self-deletion
    if (id === session.id) {
      return NextResponse.json(
        { error: "You cannot delete your own account" },
        { status: 400 }
      );
    }

    const existingStaff = await prisma.user.findFirst({
      where: {
        id,
        restaurantId: session.restaurantId,
      },
    });

    if (!existingStaff) {
      return NextResponse.json({ error: "Staff not found" }, { status: 404 });
    }

    // Check if user is an owner - only super admin can delete owners
    if (existingStaff.role === "OWNER" && session.role !== "SUPER_ADMIN") {
      return NextResponse.json(
        { error: "Only Super Admin can delete owners" },
        { status: 403 }
      );
    }

    await prisma.user.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting staff:", error);
    return NextResponse.json(
      { error: "Failed to delete staff" },
      { status: 500 }
    );
  }
}
