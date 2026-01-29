import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { adToBS, getCurrentFiscalYear } from "@/lib/utils/nepal-date";

// Roles that can manage purchases
const PURCHASE_MANAGEMENT_ROLES = ["OWNER", "MANAGER", "ACCOUNTANT"];

interface PurchaseItemInput {
  description: string;
  quantity: number;
  unit?: string;
  unitPrice: number;
  isVatable?: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════════
// GET - List all purchases
// ═══════════════════════════════════════════════════════════════════════════════

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const paymentStatus = searchParams.get("paymentStatus");
    const vendorId = searchParams.get("vendorId");
    const fiscalYear = searchParams.get("fiscalYear") || getCurrentFiscalYear();
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const search = searchParams.get("search");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const offset = (page - 1) * limit;

    // Build where clause
    const where: Record<string, unknown> = {
      restaurantId: session.restaurantId,
      fiscalYear,
    };

    if (status) {
      where.status = status;
    }

    if (paymentStatus) {
      where.paymentStatus = paymentStatus;
    }

    if (vendorId) {
      where.vendorId = vendorId;
    }

    if (startDate || endDate) {
      where.purchaseDateAd = {};
      if (startDate) {
        (where.purchaseDateAd as Record<string, Date>).gte = new Date(startDate);
      }
      if (endDate) {
        (where.purchaseDateAd as Record<string, Date>).lte = new Date(endDate);
      }
    }

    if (search) {
      where.OR = [
        { purchaseNumber: { contains: search, mode: "insensitive" } },
        { vendorInvoiceNumber: { contains: search, mode: "insensitive" } },
        { vendorName: { contains: search, mode: "insensitive" } },
      ];
    }

    // Fetch purchases
    const [purchases, total] = await Promise.all([
      prisma.purchase.findMany({
        where,
        orderBy: { purchaseDateAd: "desc" },
        take: limit,
        skip: offset,
        include: {
          vendor: {
            select: { name: true, vendorCode: true },
          },
          _count: {
            select: { items: true, payments: true },
          },
        },
      }),
      prisma.purchase.count({ where }),
    ]);

    return NextResponse.json({
      purchases: purchases.map(p => ({
        ...p,
        subtotal: Number(p.subtotal),
        vatableAmount: Number(p.vatableAmount),
        vatAmount: Number(p.vatAmount),
        totalAmount: Number(p.totalAmount),
        amountPaid: Number(p.amountPaid),
        itemCount: p._count.items,
        paymentCount: p._count.payments,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching purchases:", error);
    return NextResponse.json(
      { error: "Failed to fetch purchases" },
      { status: 500 }
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// POST - Create new purchase entry
// ═══════════════════════════════════════════════════════════════════════════════

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!PURCHASE_MANAGEMENT_ROLES.includes(session.role)) {
      return NextResponse.json(
        { error: "You do not have permission to create purchases" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      vendorId,
      vendorInvoiceNumber,
      vendorInvoiceDate,
      purchaseDate,
      items,
      notes,
      internalNotes,
    } = body;

    // Validate required fields
    if (!vendorId) {
      return NextResponse.json(
        { error: "Vendor is required" },
        { status: 400 }
      );
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "At least one item is required" },
        { status: 400 }
      );
    }

    // Fetch vendor
    const vendor = await prisma.vendor.findFirst({
      where: {
        id: vendorId,
        restaurantId: session.restaurantId,
        status: "ACTIVE",
      },
    });

    if (!vendor) {
      return NextResponse.json(
        { error: "Vendor not found or inactive" },
        { status: 404 }
      );
    }

    // Get user name for audit
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { name: true },
    });

    // Parse dates
    const purchaseDateAd = purchaseDate ? new Date(purchaseDate) : new Date();
    const purchaseDateBs = adToBS(purchaseDateAd);
    const fiscalYear = getCurrentFiscalYear();

    // Calculate vendor invoice date BS if provided
    const vendorInvoiceDateAd = vendorInvoiceDate ? new Date(vendorInvoiceDate) : null;
    const vendorInvoiceDateBs = vendorInvoiceDateAd ? adToBS(vendorInvoiceDateAd) : null;

    // Generate purchase number
    const lastPurchase = await prisma.purchase.findFirst({
      where: {
        restaurantId: session.restaurantId,
        fiscalYear,
      },
      orderBy: { purchaseNumber: "desc" },
      select: { purchaseNumber: true },
    });

    let purchaseSequence = 1;
    if (lastPurchase) {
      const match = lastPurchase.purchaseNumber.match(/PO-\d{4}-(\d+)/);
      if (match && match[1]) {
        purchaseSequence = parseInt(match[1]) + 1;
      }
    }
    const purchaseNumber = `PO-${fiscalYear.replace("/", "")}-${purchaseSequence.toString().padStart(5, "0")}`;

    // Calculate amounts
    let subtotal = 0;
    let vatableAmount = 0;
    let nonVatableAmount = 0;

    const purchaseItems: PurchaseItemInput[] = items as PurchaseItemInput[];

    for (const item of purchaseItems) {
      const totalPrice = item.quantity * item.unitPrice;
      subtotal += totalPrice;

      if (item.isVatable !== false) {
        vatableAmount += totalPrice;
      } else {
        nonVatableAmount += totalPrice;
      }
    }

    const vatAmount = vatableAmount * 0.13; // 13% VAT
    const totalAmount = subtotal + vatAmount;

    // Calculate due date based on vendor credit days
    const dueDate = new Date(purchaseDateAd);
    dueDate.setDate(dueDate.getDate() + vendor.creditDays);

    // Create purchase with items in transaction
    const purchase = await prisma.$transaction(async (tx) => {
      const newPurchase = await tx.purchase.create({
        data: {
          restaurantId: session.restaurantId,
          purchaseNumber,
          vendorId,
          vendorName: vendor.name,
          vendorPan: vendor.panNumber,
          vendorInvoiceNumber,
          vendorInvoiceDate: vendorInvoiceDateAd,
          vendorInvoiceDateBs,
          purchaseDateAd,
          purchaseDateBs,
          fiscalYear,
          subtotal,
          vatableAmount,
          vatAmount,
          nonVatableAmount,
          totalAmount,
          status: "DRAFT",
          paymentStatus: "UNPAID",
          dueDate,
          notes,
          internalNotes,
          createdById: session.userId,
          createdByName: user?.name || session.email,
        },
      });

      // Create purchase items
      await tx.purchaseItem.createMany({
        data: purchaseItems.map((item: PurchaseItemInput, index: number) => ({
          purchaseId: newPurchase.id,
          serialNumber: index + 1,
          description: item.description,
          quantity: item.quantity,
          unit: item.unit,
          unitPrice: item.unitPrice,
          totalPrice: item.quantity * item.unitPrice,
          isVatable: item.isVatable !== false,
        })),
      });

      return newPurchase;
    });

    // Fetch complete purchase with items
    const completePurchase = await prisma.purchase.findUnique({
      where: { id: purchase.id },
      include: {
        vendor: {
          select: { name: true, vendorCode: true },
        },
        items: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Purchase created successfully",
      purchase: {
        ...completePurchase,
        subtotal: Number(completePurchase?.subtotal),
        vatableAmount: Number(completePurchase?.vatableAmount),
        vatAmount: Number(completePurchase?.vatAmount),
        totalAmount: Number(completePurchase?.totalAmount),
      },
    });
  } catch (error) {
    console.error("Error creating purchase:", error);
    return NextResponse.json(
      { error: "Failed to create purchase" },
      { status: 500 }
    );
  }
}
