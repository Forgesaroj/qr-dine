import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// Roles that can manage vendors
const VENDOR_MANAGEMENT_ROLES = ["OWNER", "MANAGER", "ACCOUNTANT"];

// ═══════════════════════════════════════════════════════════════════════════════
// GET - List all vendors
// ═══════════════════════════════════════════════════════════════════════════════

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const search = searchParams.get("search");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const offset = (page - 1) * limit;

    // Build where clause
    const where: Record<string, unknown> = {
      restaurantId: session.restaurantId,
    };

    if (status) {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { vendorCode: { contains: search, mode: "insensitive" } },
        { panNumber: { contains: search } },
        { phone: { contains: search } },
        { email: { contains: search, mode: "insensitive" } },
      ];
    }

    // Fetch vendors with stats
    const [vendors, total] = await Promise.all([
      prisma.vendor.findMany({
        where,
        orderBy: { name: "asc" },
        take: limit,
        skip: offset,
        include: {
          _count: {
            select: { purchases: true },
          },
        },
      }),
      prisma.vendor.count({ where }),
    ]);

    return NextResponse.json({
      vendors: vendors.map(v => ({
        ...v,
        purchaseCount: v._count.purchases,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching vendors:", error);
    return NextResponse.json(
      { error: "Failed to fetch vendors" },
      { status: 500 }
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// POST - Create new vendor
// ═══════════════════════════════════════════════════════════════════════════════

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!VENDOR_MANAGEMENT_ROLES.includes(session.role)) {
      return NextResponse.json(
        { error: "You do not have permission to create vendors" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      name,
      nameLocal,
      panNumber,
      vatNumber,
      address,
      city,
      phone,
      email,
      contactName,
      bankName,
      bankBranch,
      accountNumber,
      accountName,
      creditDays,
      categories,
      notes,
    } = body;

    // Validate required fields
    if (!name) {
      return NextResponse.json(
        { error: "Vendor name is required" },
        { status: 400 }
      );
    }

    // Validate PAN format (9 digits for Nepal)
    if (panNumber && !/^\d{9}$/.test(panNumber)) {
      return NextResponse.json(
        { error: "PAN number must be 9 digits" },
        { status: 400 }
      );
    }

    // Check if PAN already exists
    if (panNumber) {
      const existingVendor = await prisma.vendor.findFirst({
        where: {
          restaurantId: session.restaurantId,
          panNumber,
        },
      });

      if (existingVendor) {
        return NextResponse.json(
          { error: "A vendor with this PAN number already exists" },
          { status: 400 }
        );
      }
    }

    // Generate vendor code
    const lastVendor = await prisma.vendor.findFirst({
      where: { restaurantId: session.restaurantId },
      orderBy: { vendorCode: "desc" },
      select: { vendorCode: true },
    });

    let vendorNumber = 1;
    if (lastVendor) {
      const match = lastVendor.vendorCode.match(/V(\d+)/);
      if (match && match[1]) {
        vendorNumber = parseInt(match[1]) + 1;
      }
    }
    const vendorCode = `V${vendorNumber.toString().padStart(3, "0")}`;

    // Create vendor
    const vendor = await prisma.vendor.create({
      data: {
        restaurantId: session.restaurantId,
        vendorCode,
        name,
        nameLocal,
        panNumber,
        vatNumber,
        address,
        city,
        phone,
        email,
        contactName,
        bankName,
        bankBranch,
        accountNumber,
        accountName,
        creditDays: creditDays || 0,
        categories: categories || [],
        notes,
        status: "ACTIVE",
      },
    });

    return NextResponse.json({
      success: true,
      message: "Vendor created successfully",
      vendor,
    });
  } catch (error) {
    console.error("Error creating vendor:", error);
    return NextResponse.json(
      { error: "Failed to create vendor" },
      { status: 500 }
    );
  }
}
