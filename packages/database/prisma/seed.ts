// ═══════════════════════════════════════════════════════════════════════════════
// QR DINE - Database Seed Script
// ═══════════════════════════════════════════════════════════════════════════════

import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// Password hash helper
async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

// PIN hash helper (simple hash for 4-digit PIN)
async function hashPin(pin: string): Promise<string> {
  return bcrypt.hash(pin, 10);
}

async function main() {
  console.log("🌱 Starting database seed...\n");

  // ═══════════════════════════════════════════════════════════════════════════
  // 1. CREATE LICENSE
  // ═══════════════════════════════════════════════════════════════════════════
  console.log("📜 Creating license...");

  const license = await prisma.license.upsert({
    where: { licenseKey: "QRDINE-DEMO-0001-XXXX" },
    update: {},
    create: {
      licenseKey: "QRDINE-DEMO-0001-XXXX",
      tier: "UNLIMITED",
      status: "ACTIVE",
      maxRestaurants: 10,
      maxStaffPerRestaurant: null, // Unlimited
      maxTablesPerRestaurant: null, // Unlimited
      cloudStorageGb: 100,
      features: JSON.stringify([
        "qr_ordering",
        "table_management",
        "menu_management",
        "order_management",
        "basic_billing",
        "basic_reports",
        "local_backup",
        "loyalty_program",
        "promotions",
        "sms_integration",
        "advanced_reports",
        "customer_crm",
        "cloud_backup",
        "multi_location",
        "api_access",
        "custom_branding",
        "white_label",
      ]),
      activatedAt: new Date(),
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
      ownerName: "Demo Owner",
      ownerEmail: "demo@qrdine.com",
      ownerPhone: "9841000000",
    },
  });
  console.log(`   ✓ License created: ${license.licenseKey}\n`);

  // ═══════════════════════════════════════════════════════════════════════════
  // 2. CREATE RESTAURANT
  // ═══════════════════════════════════════════════════════════════════════════
  console.log("🏪 Creating restaurant...");

  const restaurant = await prisma.restaurant.upsert({
    where: { slug: "demo-restaurant" },
    update: {},
    create: {
      licenseId: license.id,
      name: "Demo Restaurant",
      slug: "demo-restaurant",
      description: "A demo restaurant for testing QR DINE",
      address: "123 Main Street, Thamel",
      city: "Kathmandu",
      state: "Bagmati",
      country: "Nepal",
      postalCode: "44600",
      phone: "01-4123456",
      email: "info@demorestaurant.com",
      currency: "NPR",
      timezone: "Asia/Kathmandu",
      status: "ACTIVE",
      settings: JSON.stringify({
        businessHours: [
          { dayOfWeek: 0, isOpen: true, openTime: "10:00", closeTime: "22:00" },
          { dayOfWeek: 1, isOpen: true, openTime: "10:00", closeTime: "22:00" },
          { dayOfWeek: 2, isOpen: true, openTime: "10:00", closeTime: "22:00" },
          { dayOfWeek: 3, isOpen: true, openTime: "10:00", closeTime: "22:00" },
          { dayOfWeek: 4, isOpen: true, openTime: "10:00", closeTime: "22:00" },
          { dayOfWeek: 5, isOpen: true, openTime: "10:00", closeTime: "23:00" },
          { dayOfWeek: 6, isOpen: true, openTime: "10:00", closeTime: "23:00" },
        ],
        taxEnabled: true,
        taxPercentage: 13,
        taxLabel: "VAT",
        taxIncludedInPrice: false,
        serviceChargeEnabled: true,
        serviceChargePercentage: 10,
        autoConfirmOrders: false,
        autoConfirmSubsequentOrders: true,
        requireOtpVerification: true,
        otpLength: 4,
        otpExpiryMinutes: 30,
        loyaltyEnabled: true,
        pointsPerCurrency: 0.1,
        pointsRedemptionRate: 10,
        notifyOnNewOrder: true,
        notifyOnOrderReady: true,
        notifyOnPayment: true,
        showEstimatedTime: true,
        allowSpecialInstructions: true,
      }),
    },
  });
  console.log(`   ✓ Restaurant created: ${restaurant.name}\n`);

  // ═══════════════════════════════════════════════════════════════════════════
  // 3. CREATE USERS (Staff)
  // ═══════════════════════════════════════════════════════════════════════════
  console.log("👥 Creating staff users...");

  const defaultPassword = await hashPassword("password123");

  const users = [
    {
      email: "owner@demo.com",
      name: "John Owner",
      role: "OWNER" as const,
      pin: "1234",
      phone: "9841000001",
    },
    {
      email: "manager@demo.com",
      name: "Jane Manager",
      role: "MANAGER" as const,
      pin: "2345",
      phone: "9841000002",
    },
    {
      email: "cashier@demo.com",
      name: "Bob Cashier",
      role: "CASHIER" as const,
      pin: "3456",
      phone: "9841000003",
    },
    {
      email: "waiter1@demo.com",
      name: "Alice Waiter",
      role: "WAITER" as const,
      pin: "4567",
      phone: "9841000004",
    },
    {
      email: "waiter2@demo.com",
      name: "Charlie Waiter",
      role: "WAITER" as const,
      pin: "5678",
      phone: "9841000005",
    },
    {
      email: "kitchen@demo.com",
      name: "Dave Kitchen",
      role: "KITCHEN" as const,
      pin: "6789",
      phone: "9841000006",
    },
    {
      email: "host@demo.com",
      name: "Eve Host",
      role: "HOST" as const,
      pin: "7890",
      phone: "9841000007",
    },
  ];

  for (const userData of users) {
    const user = await prisma.user.upsert({
      where: {
        restaurantId_email: {
          restaurantId: restaurant.id,
          email: userData.email,
        },
      },
      update: {},
      create: {
        restaurantId: restaurant.id,
        email: userData.email,
        passwordHash: defaultPassword,
        name: userData.name,
        phone: userData.phone,
        role: userData.role,
        pin: userData.pin,
        status: "ACTIVE",
        permissions: JSON.stringify([]),
      },
    });
    console.log(`   ✓ ${userData.role}: ${userData.email} (PIN: ${userData.pin})`);
  }
  console.log("");

  // ═══════════════════════════════════════════════════════════════════════════
  // 4. CREATE TABLES
  // ═══════════════════════════════════════════════════════════════════════════
  console.log("🪑 Creating tables...");

  const tables = [
    { tableNumber: "1", name: "Window Table", capacity: 2, floor: "Ground", section: "Window" },
    { tableNumber: "2", name: "Couple's Corner", capacity: 2, floor: "Ground", section: "Corner" },
    { tableNumber: "3", name: "Family Table", capacity: 4, floor: "Ground", section: "Main" },
    { tableNumber: "4", name: "Business Table", capacity: 4, floor: "Ground", section: "Main" },
    { tableNumber: "5", name: "Group Table", capacity: 6, floor: "Ground", section: "Main" },
    { tableNumber: "6", name: "Party Table", capacity: 8, floor: "Ground", section: "Private" },
    { tableNumber: "7", name: "Terrace 1", capacity: 4, floor: "Terrace", section: "Outdoor" },
    { tableNumber: "8", name: "Terrace 2", capacity: 4, floor: "Terrace", section: "Outdoor" },
    { tableNumber: "9", name: "VIP Room", capacity: 10, floor: "First", section: "VIP" },
    { tableNumber: "10", name: "Bar Counter", capacity: 4, floor: "Ground", section: "Bar" },
  ];

  for (const tableData of tables) {
    const table = await prisma.table.upsert({
      where: {
        restaurantId_tableNumber: {
          restaurantId: restaurant.id,
          tableNumber: tableData.tableNumber,
        },
      },
      update: {},
      create: {
        restaurantId: restaurant.id,
        tableNumber: tableData.tableNumber,
        name: tableData.name,
        capacity: tableData.capacity,
        floor: tableData.floor,
        section: tableData.section,
        status: "AVAILABLE",
        currentOtp: String(1000 + Math.floor(Math.random() * 9000)),
        otpGeneratedAt: new Date(),
      },
    });
    console.log(`   ✓ Table ${tableData.tableNumber}: ${tableData.name} (${tableData.capacity} seats)`);
  }
  console.log("");

  // ═══════════════════════════════════════════════════════════════════════════
  // 5. CREATE MENU CATEGORIES
  // ═══════════════════════════════════════════════════════════════════════════
  console.log("📂 Creating menu categories...");

  const categories = [
    { name: "Appetizers", nameLocal: "स्टार्टर", sortOrder: 1 },
    { name: "Main Course", nameLocal: "मुख्य खाना", sortOrder: 2 },
    { name: "Nepali Thali", nameLocal: "नेपाली थाली", sortOrder: 3 },
    { name: "Burgers & Sandwiches", nameLocal: "बर्गर", sortOrder: 4 },
    { name: "Pizza", nameLocal: "पिज्जा", sortOrder: 5 },
    { name: "Momos", nameLocal: "मःम", sortOrder: 6 },
    { name: "Beverages", nameLocal: "पेय पदार्थ", sortOrder: 7 },
    { name: "Desserts", nameLocal: "मिठाई", sortOrder: 8 },
  ];

  const categoryMap: Record<string, string> = {};

  for (const catData of categories) {
    const category = await prisma.category.upsert({
      where: {
        id: `cat-${catData.name.toLowerCase().replace(/\s+/g, "-")}`,
      },
      update: {},
      create: {
        id: `cat-${catData.name.toLowerCase().replace(/\s+/g, "-")}`,
        restaurantId: restaurant.id,
        name: catData.name,
        nameLocal: catData.nameLocal,
        sortOrder: catData.sortOrder,
        isActive: true,
      },
    });
    categoryMap[catData.name] = category.id;
    console.log(`   ✓ ${catData.name} (${catData.nameLocal})`);
  }
  console.log("");

  // ═══════════════════════════════════════════════════════════════════════════
  // 6. CREATE MENU ITEMS
  // ═══════════════════════════════════════════════════════════════════════════
  console.log("🍽️ Creating menu items...");

  const menuItems = [
    // Appetizers
    {
      category: "Appetizers",
      name: "Spring Rolls",
      nameLocal: "स्प्रिङ रोल",
      description: "Crispy vegetable spring rolls served with sweet chili sauce",
      basePrice: 250,
      isVegetarian: true,
      prepTimeMinutes: 10,
      kitchenStation: "Fry Station",
    },
    {
      category: "Appetizers",
      name: "Chicken Wings",
      nameLocal: "चिकन विङ्स",
      description: "Spicy buffalo wings with blue cheese dip",
      basePrice: 450,
      spiceLevel: 3,
      prepTimeMinutes: 15,
      kitchenStation: "Fry Station",
    },
    {
      category: "Appetizers",
      name: "Garlic Bread",
      nameLocal: "गार्लिक ब्रेड",
      description: "Toasted bread with garlic butter and herbs",
      basePrice: 180,
      isVegetarian: true,
      prepTimeMinutes: 8,
      kitchenStation: "Main Kitchen",
    },

    // Main Course
    {
      category: "Main Course",
      name: "Grilled Chicken",
      nameLocal: "ग्रिल्ड चिकन",
      description: "Herb marinated chicken breast with mashed potatoes and vegetables",
      basePrice: 650,
      prepTimeMinutes: 25,
      kitchenStation: "Grill Station",
    },
    {
      category: "Main Course",
      name: "Fish & Chips",
      nameLocal: "फिश एण्ड चिप्स",
      description: "Beer battered fish with crispy fries and tartar sauce",
      basePrice: 550,
      prepTimeMinutes: 20,
      kitchenStation: "Fry Station",
    },
    {
      category: "Main Course",
      name: "Pasta Alfredo",
      nameLocal: "पास्ता अल्फ्रेडो",
      description: "Creamy fettuccine with parmesan and grilled chicken",
      basePrice: 480,
      prepTimeMinutes: 18,
      kitchenStation: "Main Kitchen",
    },

    // Nepali Thali
    {
      category: "Nepali Thali",
      name: "Veg Thali",
      nameLocal: "भेज थाली",
      description: "Dal, rice, seasonal vegetables, pickle, and papad",
      basePrice: 350,
      isVegetarian: true,
      prepTimeMinutes: 15,
      kitchenStation: "Main Kitchen",
    },
    {
      category: "Nepali Thali",
      name: "Chicken Thali",
      nameLocal: "चिकन थाली",
      description: "Dal, rice, chicken curry, vegetables, pickle, and papad",
      basePrice: 450,
      prepTimeMinutes: 18,
      kitchenStation: "Main Kitchen",
    },
    {
      category: "Nepali Thali",
      name: "Mutton Thali",
      nameLocal: "मटन थाली",
      description: "Dal, rice, mutton curry, vegetables, pickle, and papad",
      basePrice: 550,
      prepTimeMinutes: 20,
      kitchenStation: "Main Kitchen",
    },

    // Burgers
    {
      category: "Burgers & Sandwiches",
      name: "Classic Burger",
      nameLocal: "क्लासिक बर्गर",
      description: "Beef patty with lettuce, tomato, onion, and special sauce",
      basePrice: 380,
      prepTimeMinutes: 15,
      kitchenStation: "Grill Station",
      pricingType: "VARIANTS",
      variantGroups: [
        {
          id: "size",
          name: "Size",
          required: true,
          minSelect: 1,
          maxSelect: 1,
          options: [
            { id: "regular", name: "Regular", priceAdjustment: 0, isDefault: true },
            { id: "large", name: "Large", priceAdjustment: 100, isDefault: false },
          ],
        },
      ],
      addons: [
        { id: "cheese", name: "Extra Cheese", price: 50, isAvailable: true, maxQuantity: 2 },
        { id: "bacon", name: "Bacon", price: 80, isAvailable: true, maxQuantity: 2 },
        { id: "egg", name: "Fried Egg", price: 40, isAvailable: true, maxQuantity: 1 },
      ],
    },
    {
      category: "Burgers & Sandwiches",
      name: "Chicken Burger",
      nameLocal: "चिकन बर्गर",
      description: "Grilled chicken breast with avocado and chipotle mayo",
      basePrice: 420,
      prepTimeMinutes: 15,
      kitchenStation: "Grill Station",
    },

    // Pizza
    {
      category: "Pizza",
      name: "Margherita",
      nameLocal: "मार्गरिटा",
      description: "Classic tomato sauce, mozzarella, and fresh basil",
      basePrice: 450,
      isVegetarian: true,
      prepTimeMinutes: 20,
      kitchenStation: "Main Kitchen",
      pricingType: "VARIANTS",
      variantGroups: [
        {
          id: "size",
          name: "Size",
          required: true,
          minSelect: 1,
          maxSelect: 1,
          options: [
            { id: "small", name: "Small (8\")", priceAdjustment: 0, isDefault: false },
            { id: "medium", name: "Medium (10\")", priceAdjustment: 150, isDefault: true },
            { id: "large", name: "Large (12\")", priceAdjustment: 300, isDefault: false },
          ],
        },
        {
          id: "crust",
          name: "Crust",
          required: true,
          minSelect: 1,
          maxSelect: 1,
          options: [
            { id: "thin", name: "Thin Crust", priceAdjustment: 0, isDefault: true },
            { id: "thick", name: "Thick Crust", priceAdjustment: 0, isDefault: false },
            { id: "stuffed", name: "Cheese Stuffed", priceAdjustment: 100, isDefault: false },
          ],
        },
      ],
    },
    {
      category: "Pizza",
      name: "Pepperoni",
      nameLocal: "पेप्परोनी",
      description: "Loaded with spicy pepperoni and mozzarella",
      basePrice: 550,
      spiceLevel: 2,
      prepTimeMinutes: 20,
      kitchenStation: "Main Kitchen",
    },

    // Momos
    {
      category: "Momos",
      name: "Steamed Veg Momo",
      nameLocal: "भाप भेज मःम",
      description: "Traditional Nepali dumplings with vegetable filling",
      basePrice: 180,
      isVegetarian: true,
      prepTimeMinutes: 15,
      kitchenStation: "Main Kitchen",
    },
    {
      category: "Momos",
      name: "Steamed Chicken Momo",
      nameLocal: "भाप चिकन मःम",
      description: "Traditional dumplings with spiced chicken filling",
      basePrice: 220,
      prepTimeMinutes: 15,
      kitchenStation: "Main Kitchen",
    },
    {
      category: "Momos",
      name: "Fried Chicken Momo",
      nameLocal: "तरेको चिकन मःम",
      description: "Crispy fried dumplings with chicken filling",
      basePrice: 250,
      prepTimeMinutes: 18,
      kitchenStation: "Fry Station",
    },
    {
      category: "Momos",
      name: "Jhol Momo",
      nameLocal: "झोल मःम",
      description: "Steamed momos in spicy sesame-tomato soup",
      basePrice: 280,
      spiceLevel: 3,
      prepTimeMinutes: 18,
      kitchenStation: "Main Kitchen",
      isPopular: true,
    },

    // Beverages
    {
      category: "Beverages",
      name: "Fresh Lime Soda",
      nameLocal: "नीबू सोडा",
      description: "Refreshing lime with soda water",
      basePrice: 80,
      isVegetarian: true,
      isVegan: true,
      prepTimeMinutes: 3,
      kitchenStation: "Bar",
    },
    {
      category: "Beverages",
      name: "Mango Lassi",
      nameLocal: "मैंगो लस्सी",
      description: "Creamy yogurt drink with fresh mango",
      basePrice: 150,
      isVegetarian: true,
      prepTimeMinutes: 5,
      kitchenStation: "Bar",
    },
    {
      category: "Beverages",
      name: "Masala Tea",
      nameLocal: "मसला चिया",
      description: "Traditional spiced milk tea",
      basePrice: 60,
      isVegetarian: true,
      prepTimeMinutes: 5,
      kitchenStation: "Bar",
    },
    {
      category: "Beverages",
      name: "Cold Coffee",
      nameLocal: "कोल्ड कफी",
      description: "Chilled coffee with ice cream",
      basePrice: 180,
      isVegetarian: true,
      prepTimeMinutes: 5,
      kitchenStation: "Bar",
    },

    // Desserts
    {
      category: "Desserts",
      name: "Chocolate Brownie",
      nameLocal: "चकलेट ब्राउनी",
      description: "Warm chocolate brownie with vanilla ice cream",
      basePrice: 280,
      isVegetarian: true,
      prepTimeMinutes: 8,
      kitchenStation: "Dessert Station",
      isPopular: true,
    },
    {
      category: "Desserts",
      name: "Gulab Jamun",
      nameLocal: "गुलाब जामुन",
      description: "Sweet milk dumplings in rose syrup (2 pcs)",
      basePrice: 150,
      isVegetarian: true,
      prepTimeMinutes: 5,
      kitchenStation: "Dessert Station",
    },
    {
      category: "Desserts",
      name: "Ice Cream",
      nameLocal: "आइसक्रीम",
      description: "Choice of vanilla, chocolate, or strawberry",
      basePrice: 120,
      isVegetarian: true,
      prepTimeMinutes: 3,
      kitchenStation: "Dessert Station",
    },
  ];

  for (const item of menuItems) {
    const categoryId = categoryMap[item.category];
    if (!categoryId) continue;

    await prisma.menuItem.create({
      data: {
        restaurantId: restaurant.id,
        categoryId: categoryId,
        name: item.name,
        nameLocal: item.nameLocal,
        description: item.description,
        pricingType: (item.pricingType as "SINGLE" | "VARIANTS") || "SINGLE",
        basePrice: item.basePrice,
        variantGroups: item.variantGroups ? JSON.stringify(item.variantGroups) : null,
        addons: item.addons ? JSON.stringify(item.addons) : null,
        isVegetarian: item.isVegetarian || false,
        isVegan: item.isVegan || false,
        spiceLevel: item.spiceLevel || null,
        isAvailable: true,
        prepTimeMinutes: item.prepTimeMinutes,
        kitchenStation: item.kitchenStation,
        sortOrder: 0,
        isPopular: item.isPopular || false,
        isNew: false,
        timesOrdered: Math.floor(Math.random() * 100),
      },
    });
    console.log(`   ✓ ${item.name} - Rs.${item.basePrice}`);
  }
  console.log("");

  // ═══════════════════════════════════════════════════════════════════════════
  // 7. CREATE SAMPLE CUSTOMERS
  // ═══════════════════════════════════════════════════════════════════════════
  console.log("👤 Creating sample customers...");

  const customers = [
    {
      customerId: "CUST-0001",
      name: "Ram Sharma",
      phone: "9841111111",
      email: "ram@example.com",
      tier: "GOLD" as const,
      pointsBalance: 1500,
      totalSpent: 25000,
      totalVisits: 15,
    },
    {
      customerId: "CUST-0002",
      name: "Sita Thapa",
      phone: "9841222222",
      email: "sita@example.com",
      tier: "SILVER" as const,
      pointsBalance: 800,
      totalSpent: 12000,
      totalVisits: 8,
    },
    {
      customerId: "CUST-0003",
      name: "Hari Prasad",
      phone: "9841333333",
      tier: "BRONZE" as const,
      pointsBalance: 200,
      totalSpent: 3000,
      totalVisits: 3,
    },
  ];

  for (const custData of customers) {
    await prisma.customer.upsert({
      where: {
        restaurantId_customerId: {
          restaurantId: restaurant.id,
          customerId: custData.customerId,
        },
      },
      update: {},
      create: {
        restaurantId: restaurant.id,
        customerId: custData.customerId,
        name: custData.name,
        phone: custData.phone,
        email: custData.email,
        phoneVerified: true,
        tier: custData.tier,
        pointsBalance: custData.pointsBalance,
        pointsEarnedLifetime: custData.pointsBalance + 500,
        pointsRedeemedLifetime: 500,
        totalSpent: custData.totalSpent,
        totalVisits: custData.totalVisits,
        averageOrderValue: custData.totalSpent / custData.totalVisits,
        status: "ACTIVE",
      },
    });
    console.log(`   ✓ ${custData.name} (${custData.tier}) - ${custData.pointsBalance} pts`);
  }
  console.log("");

  // ═══════════════════════════════════════════════════════════════════════════
  // 8. CREATE SAMPLE PROMOTIONS
  // ═══════════════════════════════════════════════════════════════════════════
  console.log("🎉 Creating promotions...");

  const owner = await prisma.user.findFirst({
    where: { restaurantId: restaurant.id, role: "OWNER" },
  });

  if (owner) {
    // Happy Hour
    await prisma.promotion.create({
      data: {
        restaurantId: restaurant.id,
        name: "Happy Hour",
        description: "20% off on all beverages",
        type: "HAPPY_HOUR",
        discountType: "PERCENTAGE",
        discountValue: 20,
        appliesTo: "CATEGORIES",
        categoryIds: JSON.stringify([categoryMap["Beverages"]]),
        startTime: "16:00",
        endTime: "19:00",
        daysOfWeek: JSON.stringify([1, 2, 3, 4, 5]),
        showOnMenu: true,
        showCountdown: true,
        bannerMessage: "Happy Hour: 20% off drinks 4-7 PM!",
        status: "ACTIVE",
        createdById: owner.id,
      },
    });
    console.log("   ✓ Happy Hour (20% off beverages 4-7 PM)");

    // First Order Discount
    await prisma.promotion.create({
      data: {
        restaurantId: restaurant.id,
        name: "Welcome Discount",
        description: "10% off on your first order",
        type: "FIRST_ORDER",
        discountType: "PERCENTAGE",
        discountValue: 10,
        maxDiscount: 200,
        appliesTo: "ALL",
        customerEligibility: "NEW",
        showOnMenu: true,
        status: "ACTIVE",
        createdById: owner.id,
      },
    });
    console.log("   ✓ Welcome Discount (10% off first order)");

    // Momo Monday
    await prisma.promotion.create({
      data: {
        restaurantId: restaurant.id,
        name: "Momo Monday",
        description: "Buy 1 Get 1 Free on all momos",
        type: "BOGO",
        discountType: "PERCENTAGE",
        discountValue: 100,
        appliesTo: "CATEGORIES",
        categoryIds: JSON.stringify([categoryMap["Momos"]]),
        bogoBuyQuantity: 1,
        bogoGetQuantity: 1,
        bogoGetDiscount: 100,
        bogoSameItem: true,
        daysOfWeek: JSON.stringify([1]), // Monday
        showOnMenu: true,
        bannerMessage: "Momo Monday: Buy 1 Get 1 Free!",
        status: "ACTIVE",
        createdById: owner.id,
      },
    });
    console.log("   ✓ Momo Monday (BOGO on momos)");
  }
  console.log("");

  // ═══════════════════════════════════════════════════════════════════════════
  // DONE
  // ═══════════════════════════════════════════════════════════════════════════
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("✅ Database seeded successfully!");
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("");
  console.log("📋 Login Credentials:");
  console.log("   All passwords: password123");
  console.log("");
  console.log("   Email Login:");
  console.log("   • owner@demo.com    (Owner)");
  console.log("   • manager@demo.com  (Manager)");
  console.log("   • cashier@demo.com  (Cashier)");
  console.log("   • waiter1@demo.com  (Waiter)");
  console.log("   • kitchen@demo.com  (Kitchen)");
  console.log("");
  console.log("   PIN Login:");
  console.log("   • 1234 (Owner)");
  console.log("   • 2345 (Manager)");
  console.log("   • 3456 (Cashier)");
  console.log("   • 4567 (Waiter 1)");
  console.log("   • 6789 (Kitchen)");
  console.log("");
  console.log("🏪 Restaurant: Demo Restaurant (slug: demo-restaurant)");
  console.log("🪑 Tables: 10 tables created");
  console.log("🍽️ Menu: " + menuItems.length + " items across 8 categories");
  console.log("👤 Customers: 3 sample customers");
  console.log("🎉 Promotions: 3 active promotions");
  console.log("");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
