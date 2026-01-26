import { prisma } from "@/lib/prisma";

// Default loyalty settings
export const defaultLoyaltySettings = {
  enabled: false,
  pointsPerCurrency: 1, // 1 point per Rs. 100 spent
  currencyPerPoint: 100, // Rs. 100 = 1 point
  pointValue: 1, // 1 point = Rs. 1 discount
  minRedeemPoints: 100, // Minimum points to redeem
  maxRedeemPercentage: 50, // Max 50% of bill can be paid with points
  welcomeBonus: 0,
  birthdayBonus: 100,
  referralBonus: 50,
  tierThresholds: {
    BRONZE: 0,
    SILVER: 500,
    GOLD: 2000,
    PLATINUM: 5000,
  },
  tierMultipliers: {
    BRONZE: 1,
    SILVER: 1.25,
    GOLD: 1.5,
    PLATINUM: 2,
  },
  pointsExpiry: 365,
  // Visit milestones: { visitNumber: bonusPoints }
  visitMilestones: {
    5: 50,    // 5th visit: 50 bonus points
    10: 100,  // 10th visit: 100 bonus points
    25: 250,  // 25th visit: 250 bonus points
    50: 500,  // 50th visit: 500 bonus points
    100: 1000, // 100th visit: 1000 bonus points
  },
};

export type CustomerTier = "BRONZE" | "SILVER" | "GOLD" | "PLATINUM";

export interface LoyaltySettings {
  enabled: boolean;
  pointsPerCurrency: number;
  currencyPerPoint: number;
  pointValue: number;
  minRedeemPoints: number;
  maxRedeemPercentage: number;
  welcomeBonus: number;
  birthdayBonus: number;
  referralBonus: number;
  tierThresholds: Record<CustomerTier, number>;
  tierMultipliers: Record<CustomerTier, number>;
  pointsExpiry: number;
  visitMilestones: Record<number, number>;
}

/**
 * Get loyalty settings for a restaurant
 */
export async function getLoyaltySettings(restaurantId: string): Promise<LoyaltySettings> {
  const restaurant = await prisma.restaurant.findUnique({
    where: { id: restaurantId },
    select: { settings: true },
  });

  const settings = restaurant?.settings
    ? (typeof restaurant.settings === "string"
        ? JSON.parse(restaurant.settings)
        : restaurant.settings)
    : {};

  return {
    ...defaultLoyaltySettings,
    ...(settings.loyalty || {}),
  };
}

/**
 * Calculate points to earn based on amount spent
 */
export function calculatePointsEarned(
  amount: number,
  tier: CustomerTier,
  settings: LoyaltySettings
): number {
  if (!settings.enabled) return 0;

  const basePoints = Math.floor(amount / settings.currencyPerPoint) * settings.pointsPerCurrency;
  const multiplier = settings.tierMultipliers[tier] || 1;

  return Math.floor(basePoints * multiplier);
}

/**
 * Calculate discount value from points
 */
export function calculatePointsValue(
  points: number,
  settings: LoyaltySettings
): number {
  return points * settings.pointValue;
}

/**
 * Calculate maximum points that can be redeemed for a bill
 */
export function calculateMaxRedeemablePoints(
  billAmount: number,
  availablePoints: number,
  settings: LoyaltySettings
): number {
  if (!settings.enabled) return 0;
  if (availablePoints < settings.minRedeemPoints) return 0;

  // Max discount based on percentage
  const maxDiscountAmount = (billAmount * settings.maxRedeemPercentage) / 100;
  const maxPointsForDiscount = Math.floor(maxDiscountAmount / settings.pointValue);

  return Math.min(availablePoints, maxPointsForDiscount);
}

/**
 * Determine customer tier based on lifetime points
 */
export function determineTier(
  pointsEarnedLifetime: number,
  settings: LoyaltySettings
): CustomerTier {
  const thresholds = settings.tierThresholds;

  if (pointsEarnedLifetime >= thresholds.PLATINUM) return "PLATINUM";
  if (pointsEarnedLifetime >= thresholds.GOLD) return "GOLD";
  if (pointsEarnedLifetime >= thresholds.SILVER) return "SILVER";
  return "BRONZE";
}

/**
 * Award points to a customer for a purchase
 */
export async function awardPoints(
  customerId: string,
  orderId: string,
  orderAmount: number,
  restaurantId: string
): Promise<{
  pointsEarned: number;
  newBalance: number;
  tierUpgrade: boolean;
  newTier: CustomerTier | null;
}> {
  const settings = await getLoyaltySettings(restaurantId);

  if (!settings.enabled) {
    return { pointsEarned: 0, newBalance: 0, tierUpgrade: false, newTier: null };
  }

  // Get customer
  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
  });

  if (!customer) {
    return { pointsEarned: 0, newBalance: 0, tierUpgrade: false, newTier: null };
  }

  // Calculate points
  const pointsEarned = calculatePointsEarned(
    orderAmount,
    customer.tier as CustomerTier,
    settings
  );

  if (pointsEarned === 0) {
    return {
      pointsEarned: 0,
      newBalance: customer.pointsBalance,
      tierUpgrade: false,
      newTier: null,
    };
  }

  const newBalance = customer.pointsBalance + pointsEarned;
  const newLifetimePoints = customer.pointsEarnedLifetime + pointsEarned;

  // Check for tier upgrade
  const currentTier = customer.tier as CustomerTier;
  const newTier = determineTier(newLifetimePoints, settings);
  const tierUpgrade = newTier !== currentTier;

  // Update customer and create transaction
  await prisma.$transaction([
    prisma.customer.update({
      where: { id: customerId },
      data: {
        pointsBalance: newBalance,
        pointsEarnedLifetime: newLifetimePoints,
        totalSpent: { increment: orderAmount },
        totalVisits: { increment: 1 },
        averageOrderValue: (customer.totalSpent + orderAmount) / (customer.totalVisits + 1),
        ...(tierUpgrade && { tier: newTier }),
      },
    }),
    prisma.pointsTransaction.create({
      data: {
        customerId,
        type: "EARN",
        points: pointsEarned,
        balanceAfter: newBalance,
        orderId,
        orderAmount,
        multiplier: settings.tierMultipliers[currentTier],
        expiresAt: settings.pointsExpiry > 0
          ? new Date(Date.now() + settings.pointsExpiry * 24 * 60 * 60 * 1000)
          : null,
      },
    }),
    // Update order with points earned
    prisma.order.update({
      where: { id: orderId },
      data: { pointsEarned },
    }),
  ]);

  return {
    pointsEarned,
    newBalance,
    tierUpgrade,
    newTier: tierUpgrade ? newTier : null,
  };
}

/**
 * Redeem points for a bill
 */
export async function redeemPoints(
  customerId: string,
  billId: string,
  pointsToRedeem: number,
  restaurantId: string
): Promise<{
  success: boolean;
  discountAmount: number;
  newBalance: number;
  error?: string;
}> {
  const settings = await getLoyaltySettings(restaurantId);

  if (!settings.enabled) {
    return { success: false, discountAmount: 0, newBalance: 0, error: "Loyalty program not enabled" };
  }

  // Get customer
  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
  });

  if (!customer) {
    return { success: false, discountAmount: 0, newBalance: 0, error: "Customer not found" };
  }

  // Validate points
  if (pointsToRedeem < settings.minRedeemPoints) {
    return {
      success: false,
      discountAmount: 0,
      newBalance: customer.pointsBalance,
      error: `Minimum ${settings.minRedeemPoints} points required to redeem`,
    };
  }

  if (customer.pointsBalance < pointsToRedeem) {
    return {
      success: false,
      discountAmount: 0,
      newBalance: customer.pointsBalance,
      error: "Insufficient points balance",
    };
  }

  // Get bill
  const bill = await prisma.bill.findUnique({
    where: { id: billId },
  });

  if (!bill) {
    return { success: false, discountAmount: 0, newBalance: customer.pointsBalance, error: "Bill not found" };
  }

  // Calculate max redeemable
  const maxRedeemable = calculateMaxRedeemablePoints(
    bill.totalAmount,
    customer.pointsBalance,
    settings
  );

  if (pointsToRedeem > maxRedeemable) {
    return {
      success: false,
      discountAmount: 0,
      newBalance: customer.pointsBalance,
      error: `Maximum ${maxRedeemable} points can be redeemed for this bill`,
    };
  }

  const discountAmount = calculatePointsValue(pointsToRedeem, settings);
  const newBalance = customer.pointsBalance - pointsToRedeem;

  // Update customer and bill
  await prisma.$transaction([
    prisma.customer.update({
      where: { id: customerId },
      data: {
        pointsBalance: newBalance,
        pointsRedeemedLifetime: { increment: pointsToRedeem },
      },
    }),
    prisma.pointsTransaction.create({
      data: {
        customerId,
        type: "REDEEM",
        points: -pointsToRedeem,
        balanceAfter: newBalance,
        billId,
        discountAmount,
      },
    }),
    prisma.bill.update({
      where: { id: billId },
      data: {
        pointsRedeemed: pointsToRedeem,
        pointsDiscount: discountAmount,
      },
    }),
  ]);

  return {
    success: true,
    discountAmount,
    newBalance,
  };
}

/**
 * Check if today is customer's birthday
 */
export function isBirthday(dateOfBirth: Date): boolean {
  const today = new Date();
  const dob = new Date(dateOfBirth);
  return today.getMonth() === dob.getMonth() && today.getDate() === dob.getDate();
}

/**
 * Check if customer can claim birthday bonus
 */
export async function canClaimBirthdayBonus(customerId: string): Promise<{
  canClaim: boolean;
  isBirthday: boolean;
  alreadyClaimed: boolean;
  bonusAmount: number;
}> {
  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
    include: {
      restaurant: { select: { id: true, settings: true } },
    },
  });

  if (!customer || !customer.dateOfBirth) {
    return { canClaim: false, isBirthday: false, alreadyClaimed: false, bonusAmount: 0 };
  }

  const settings = await getLoyaltySettings(customer.restaurantId);
  const birthdayToday = isBirthday(customer.dateOfBirth);

  if (!birthdayToday) {
    return { canClaim: false, isBirthday: false, alreadyClaimed: false, bonusAmount: settings.birthdayBonus };
  }

  // Check if already claimed this year
  const currentYear = new Date().getFullYear();
  const startOfYear = new Date(currentYear, 0, 1);
  const endOfYear = new Date(currentYear, 11, 31, 23, 59, 59);

  const existingClaim = await prisma.pointsTransaction.findFirst({
    where: {
      customerId,
      type: "BONUS",
      bonusType: "BIRTHDAY",
      createdAt: {
        gte: startOfYear,
        lte: endOfYear,
      },
    },
  });

  return {
    canClaim: !existingClaim,
    isBirthday: true,
    alreadyClaimed: !!existingClaim,
    bonusAmount: settings.birthdayBonus,
  };
}

/**
 * Award birthday bonus to customer
 */
export async function awardBirthdayBonus(customerId: string): Promise<{
  success: boolean;
  pointsAwarded: number;
  newBalance: number;
  error?: string;
}> {
  const checkResult = await canClaimBirthdayBonus(customerId);

  if (!checkResult.isBirthday) {
    return { success: false, pointsAwarded: 0, newBalance: 0, error: "Today is not your birthday" };
  }

  if (checkResult.alreadyClaimed) {
    return { success: false, pointsAwarded: 0, newBalance: 0, error: "Birthday bonus already claimed this year" };
  }

  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
  });

  if (!customer) {
    return { success: false, pointsAwarded: 0, newBalance: 0, error: "Customer not found" };
  }

  const newBalance = customer.pointsBalance + checkResult.bonusAmount;

  await prisma.$transaction([
    prisma.customer.update({
      where: { id: customerId },
      data: {
        pointsBalance: newBalance,
        pointsEarnedLifetime: { increment: checkResult.bonusAmount },
      },
    }),
    prisma.pointsTransaction.create({
      data: {
        customerId,
        type: "BONUS",
        points: checkResult.bonusAmount,
        balanceAfter: newBalance,
        bonusType: "BIRTHDAY",
        reason: "Happy Birthday! Enjoy your birthday bonus points.",
      },
    }),
  ]);

  return {
    success: true,
    pointsAwarded: checkResult.bonusAmount,
    newBalance,
  };
}

/**
 * Check if customer hit a visit milestone
 */
export function checkVisitMilestone(
  visitNumber: number,
  settings: LoyaltySettings
): { isMilestone: boolean; bonusPoints: number } {
  const milestones = settings.visitMilestones || defaultLoyaltySettings.visitMilestones;
  const bonusPoints = milestones[visitNumber];

  return {
    isMilestone: !!bonusPoints,
    bonusPoints: bonusPoints || 0,
  };
}

/**
 * Award visit milestone bonus to customer
 */
export async function awardVisitMilestone(
  customerId: string,
  visitNumber: number,
  restaurantId: string
): Promise<{
  success: boolean;
  isMilestone: boolean;
  pointsAwarded: number;
  newBalance: number;
  milestoneMessage?: string;
}> {
  const settings = await getLoyaltySettings(restaurantId);

  if (!settings.enabled) {
    return { success: false, isMilestone: false, pointsAwarded: 0, newBalance: 0 };
  }

  const milestoneCheck = checkVisitMilestone(visitNumber, settings);

  if (!milestoneCheck.isMilestone) {
    return { success: true, isMilestone: false, pointsAwarded: 0, newBalance: 0 };
  }

  // Check if milestone bonus already awarded for this visit number
  const existingBonus = await prisma.pointsTransaction.findFirst({
    where: {
      customerId,
      type: "BONUS",
      bonusType: "MILESTONE",
      reason: { contains: `visit #${visitNumber}` },
    },
  });

  if (existingBonus) {
    return { success: true, isMilestone: true, pointsAwarded: 0, newBalance: 0 };
  }

  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
  });

  if (!customer) {
    return { success: false, isMilestone: true, pointsAwarded: 0, newBalance: 0 };
  }

  const newBalance = customer.pointsBalance + milestoneCheck.bonusPoints;

  await prisma.$transaction([
    prisma.customer.update({
      where: { id: customerId },
      data: {
        pointsBalance: newBalance,
        pointsEarnedLifetime: { increment: milestoneCheck.bonusPoints },
      },
    }),
    prisma.pointsTransaction.create({
      data: {
        customerId,
        type: "BONUS",
        points: milestoneCheck.bonusPoints,
        balanceAfter: newBalance,
        bonusType: "MILESTONE",
        reason: `Congratulations on your visit #${visitNumber}! Milestone bonus awarded.`,
      },
    }),
  ]);

  return {
    success: true,
    isMilestone: true,
    pointsAwarded: milestoneCheck.bonusPoints,
    newBalance,
    milestoneMessage: `🎉 Milestone reached! Visit #${visitNumber} - ${milestoneCheck.bonusPoints} bonus points!`,
  };
}

/**
 * Get next milestone for a customer
 */
export function getNextMilestone(
  currentVisits: number,
  settings: LoyaltySettings
): { nextMilestone: number; pointsReward: number; visitsRemaining: number } | null {
  const milestones = settings.visitMilestones || defaultLoyaltySettings.visitMilestones;
  const milestoneNumbers = Object.keys(milestones)
    .map(Number)
    .sort((a, b) => a - b);

  for (const milestone of milestoneNumbers) {
    if (milestone > currentVisits) {
      return {
        nextMilestone: milestone,
        pointsReward: milestones[milestone] || 0,
        visitsRemaining: milestone - currentVisits,
      };
    }
  }

  return null;
}

// RFM Segment Types
export type RFMSegment =
  | "CHAMPIONS"
  | "LOYAL_CUSTOMERS"
  | "POTENTIAL_LOYALISTS"
  | "NEW_CUSTOMERS"
  | "PROMISING"
  | "NEED_ATTENTION"
  | "ABOUT_TO_SLEEP"
  | "AT_RISK"
  | "CANT_LOSE"
  | "HIBERNATING"
  | "LOST";

export interface RFMScore {
  recency: number; // 1-5
  frequency: number; // 1-5
  monetary: number; // 1-5
  segment: RFMSegment;
  score: number; // Combined score
}

export interface RFMCustomer {
  id: string;
  customerId: string;
  name: string;
  phone: string;
  tier: string;
  pointsBalance: number;
  totalVisits: number;
  totalSpent: number;
  lastVisit: Date | null;
  daysSinceLastVisit: number;
  rfm: RFMScore;
}

/**
 * Calculate RFM score for a customer
 */
export function calculateRFMScore(
  daysSinceLastVisit: number,
  totalVisits: number,
  totalSpent: number,
  avgDaysSinceVisit: number,
  avgVisits: number,
  avgSpend: number
): RFMScore {
  // Calculate R score (1-5, higher is better/more recent)
  let recency = 1;
  if (daysSinceLastVisit <= 7) recency = 5;
  else if (daysSinceLastVisit <= 14) recency = 4;
  else if (daysSinceLastVisit <= 30) recency = 3;
  else if (daysSinceLastVisit <= 60) recency = 2;
  else recency = 1;

  // Calculate F score (1-5, higher is more frequent)
  let frequency = 1;
  if (totalVisits >= avgVisits * 2) frequency = 5;
  else if (totalVisits >= avgVisits * 1.5) frequency = 4;
  else if (totalVisits >= avgVisits) frequency = 3;
  else if (totalVisits >= avgVisits * 0.5) frequency = 2;
  else frequency = 1;

  // Calculate M score (1-5, higher is more monetary value)
  let monetary = 1;
  if (totalSpent >= avgSpend * 2) monetary = 5;
  else if (totalSpent >= avgSpend * 1.5) monetary = 4;
  else if (totalSpent >= avgSpend) monetary = 3;
  else if (totalSpent >= avgSpend * 0.5) monetary = 2;
  else monetary = 1;

  // Determine segment based on RFM scores
  const segment = determineRFMSegment(recency, frequency, monetary);
  const score = recency * 100 + frequency * 10 + monetary;

  return { recency, frequency, monetary, segment, score };
}

/**
 * Determine customer segment based on RFM scores
 */
function determineRFMSegment(r: number, f: number, m: number): RFMSegment {
  // Champions: Best customers
  if (r >= 4 && f >= 4 && m >= 4) return "CHAMPIONS";

  // Loyal Customers: High frequency and monetary
  if (f >= 4 && m >= 4) return "LOYAL_CUSTOMERS";

  // Can't Lose Them: Were great but haven't visited recently
  if (r <= 2 && f >= 4 && m >= 4) return "CANT_LOSE";

  // At Risk: Haven't visited in a while
  if (r <= 2 && f >= 3 && m >= 3) return "AT_RISK";

  // Potential Loyalists: Recent with good frequency
  if (r >= 4 && f >= 3) return "POTENTIAL_LOYALISTS";

  // New Customers: Very recent but low frequency
  if (r >= 4 && f <= 2) return "NEW_CUSTOMERS";

  // Promising: Recent but low spend
  if (r >= 4 && m <= 2) return "PROMISING";

  // Need Attention: Average across all
  if (r === 3 && f === 3 && m === 3) return "NEED_ATTENTION";

  // About to Sleep: Below average, declining
  if (r === 2 && f <= 3) return "ABOUT_TO_SLEEP";

  // Hibernating: Long time no visit, low everything
  if (r === 1 && f <= 2) return "HIBERNATING";

  // Lost: Haven't visited in very long time
  if (r === 1) return "LOST";

  return "NEED_ATTENTION";
}

/**
 * Get RFM segment display info
 */
export function getRFMSegmentInfo(segment: RFMSegment): {
  label: string;
  description: string;
  color: string;
  action: string;
} {
  const segmentInfo: Record<RFMSegment, { label: string; description: string; color: string; action: string }> = {
    CHAMPIONS: {
      label: "Champions",
      description: "Best customers who buy often and spend the most",
      color: "bg-green-500",
      action: "Reward them! Offer exclusive perks and early access",
    },
    LOYAL_CUSTOMERS: {
      label: "Loyal Customers",
      description: "Regular customers with high spend",
      color: "bg-emerald-500",
      action: "Upsell higher-value items, ask for reviews",
    },
    POTENTIAL_LOYALISTS: {
      label: "Potential Loyalists",
      description: "Recent customers with good frequency",
      color: "bg-blue-500",
      action: "Offer loyalty program benefits, personalized recommendations",
    },
    NEW_CUSTOMERS: {
      label: "New Customers",
      description: "Recently acquired customers",
      color: "bg-cyan-500",
      action: "Welcome them, provide onboarding offers",
    },
    PROMISING: {
      label: "Promising",
      description: "Recent shoppers but haven't spent much",
      color: "bg-indigo-500",
      action: "Create brand awareness, offer free trials",
    },
    NEED_ATTENTION: {
      label: "Need Attention",
      description: "Average customers who may be slipping away",
      color: "bg-yellow-500",
      action: "Reactivate with limited-time offers",
    },
    ABOUT_TO_SLEEP: {
      label: "About to Sleep",
      description: "Below average engagement, declining",
      color: "bg-orange-500",
      action: "Win them back with personalized reactivation",
    },
    AT_RISK: {
      label: "At Risk",
      description: "Used to be valuable but haven't visited recently",
      color: "bg-red-400",
      action: "Send personalized emails, special offers",
    },
    CANT_LOSE: {
      label: "Can't Lose",
      description: "High-value customers who haven't visited recently",
      color: "bg-red-500",
      action: "Win them back urgently, call them personally",
    },
    HIBERNATING: {
      label: "Hibernating",
      description: "Very inactive, low engagement",
      color: "bg-gray-400",
      action: "Offer special come-back deals",
    },
    LOST: {
      label: "Lost",
      description: "Haven't engaged in a very long time",
      color: "bg-gray-500",
      action: "Try to re-engage with strong offers, otherwise focus elsewhere",
    },
  };

  return segmentInfo[segment];
}

/**
 * Perform RFM analysis on all customers
 */
export async function performRFMAnalysis(restaurantId: string): Promise<{
  customers: RFMCustomer[];
  segmentCounts: Record<RFMSegment, number>;
  averages: { avgDays: number; avgVisits: number; avgSpend: number };
}> {
  // Get all active customers with their most recent order date
  const customers = await prisma.customer.findMany({
    where: {
      restaurantId,
      status: "ACTIVE",
    },
    include: {
      orders: {
        orderBy: { placedAt: "desc" },
        take: 1,
        select: { placedAt: true },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  if (customers.length === 0) {
    return {
      customers: [],
      segmentCounts: {} as Record<RFMSegment, number>,
      averages: { avgDays: 0, avgVisits: 0, avgSpend: 0 },
    };
  }

  const now = new Date();

  // Calculate last visit from most recent order
  const customersWithLastVisit = customers.map((c) => ({
    ...c,
    lastVisit: c.orders[0]?.placedAt || null,
  }));

  // Calculate averages
  const totalDays = customersWithLastVisit.reduce((sum, c) => {
    if (!c.lastVisit) return sum + 365; // Assume very old if never visited
    return sum + Math.floor((now.getTime() - new Date(c.lastVisit).getTime()) / (1000 * 60 * 60 * 24));
  }, 0);
  const avgDays = totalDays / customers.length;

  const avgVisits = customers.reduce((sum, c) => sum + c.totalVisits, 0) / customers.length;
  const avgSpend = customers.reduce((sum, c) => sum + c.totalSpent, 0) / customers.length;

  // Calculate RFM for each customer
  const rfmCustomers: RFMCustomer[] = customersWithLastVisit.map((c) => {
    const daysSince = c.lastVisit
      ? Math.floor((now.getTime() - new Date(c.lastVisit).getTime()) / (1000 * 60 * 60 * 24))
      : 365;

    const rfm = calculateRFMScore(
      daysSince,
      c.totalVisits,
      c.totalSpent,
      avgDays,
      avgVisits,
      avgSpend
    );

    return {
      id: c.id,
      customerId: c.customerId,
      name: c.name,
      phone: c.phone,
      tier: c.tier,
      pointsBalance: c.pointsBalance,
      totalVisits: c.totalVisits,
      totalSpent: c.totalSpent,
      lastVisit: c.lastVisit,
      daysSinceLastVisit: daysSince,
      rfm,
    };
  });

  // Count segments
  const segmentCounts = rfmCustomers.reduce((counts, c) => {
    counts[c.rfm.segment] = (counts[c.rfm.segment] || 0) + 1;
    return counts;
  }, {} as Record<RFMSegment, number>);

  return {
    customers: rfmCustomers,
    segmentCounts,
    averages: { avgDays, avgVisits, avgSpend },
  };
}

/**
 * Get points that are about to expire for a customer
 */
export async function getExpiringPoints(
  customerId: string,
  daysThreshold: number = 30
): Promise<{
  expiringPoints: number;
  expiringTransactions: Array<{
    id: string;
    points: number;
    expiresAt: Date;
    daysUntilExpiry: number;
  }>;
  totalPoints: number;
}> {
  const now = new Date();
  const thresholdDate = new Date(now.getTime() + daysThreshold * 24 * 60 * 60 * 1000);

  // Get transactions with expiry dates within threshold
  const expiringTransactions = await prisma.pointsTransaction.findMany({
    where: {
      customerId,
      type: "EARN",
      points: { gt: 0 },
      expiresAt: {
        gte: now,
        lte: thresholdDate,
      },
    },
    orderBy: { expiresAt: "asc" },
  });

  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
    select: { pointsBalance: true },
  });

  const formatted = expiringTransactions.map((t) => ({
    id: t.id,
    points: t.points,
    expiresAt: t.expiresAt!,
    daysUntilExpiry: Math.ceil(
      (new Date(t.expiresAt!).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    ),
  }));

  return {
    expiringPoints: formatted.reduce((sum, t) => sum + t.points, 0),
    expiringTransactions: formatted,
    totalPoints: customer?.pointsBalance || 0,
  };
}

/**
 * Process expired points for all customers in a restaurant
 */
export async function processExpiredPoints(restaurantId: string): Promise<{
  processedCustomers: number;
  totalPointsExpired: number;
  errors: string[];
}> {
  const now = new Date();
  const errors: string[] = [];
  let processedCustomers = 0;
  let totalPointsExpired = 0;

  // Get all expired transactions that haven't been processed
  const expiredTransactions = await prisma.pointsTransaction.findMany({
    where: {
      customer: { restaurantId },
      type: "EARN",
      points: { gt: 0 },
      expiresAt: { lt: now },
    },
    include: {
      customer: { select: { id: true, pointsBalance: true } },
    },
  });

  // Group by customer
  const customerTransactions = new Map<string, typeof expiredTransactions>();
  for (const t of expiredTransactions) {
    const existing = customerTransactions.get(t.customerId) || [];
    existing.push(t);
    customerTransactions.set(t.customerId, existing);
  }

  // Process each customer
  for (const [customerId, transactions] of customerTransactions) {
    try {
      const customer = transactions[0]?.customer;
      if (!customer) continue;

      const expiredPoints = transactions.reduce((sum, t) => sum + t.points, 0);
      const newBalance = Math.max(0, customer.pointsBalance - expiredPoints);

      await prisma.$transaction([
        // Update customer balance
        prisma.customer.update({
          where: { id: customerId },
          data: { pointsBalance: newBalance },
        }),
        // Create expiry transaction
        prisma.pointsTransaction.create({
          data: {
            customerId,
            type: "EXPIRE",
            points: -expiredPoints,
            balanceAfter: newBalance,
            reason: `${transactions.length} point transaction(s) expired`,
          },
        }),
        // Mark original transactions as expired by setting expiresAt to null
        ...transactions.map((t) =>
          prisma.pointsTransaction.update({
            where: { id: t.id },
            data: { expiresAt: null },
          })
        ),
      ]);

      processedCustomers++;
      totalPointsExpired += expiredPoints;
    } catch (err) {
      errors.push(`Failed to process customer ${customerId}: ${err}`);
    }
  }

  return { processedCustomers, totalPointsExpired, errors };
}

/**
 * Check inactivity and potentially mark points for expiry
 * This is based on the 12-month inactivity rule
 */
export async function checkInactivityExpiry(restaurantId: string): Promise<{
  customersAtRisk: number;
  customersExpired: number;
}> {
  const settings = await getLoyaltySettings(restaurantId);
  const inactivityDays = settings.pointsExpiry || 365; // Default 12 months
  const cutoffDate = new Date(Date.now() - inactivityDays * 24 * 60 * 60 * 1000);
  const warningDate = new Date(cutoffDate.getTime() + 30 * 24 * 60 * 60 * 1000);

  // Get customers with their most recent order date
  const customersWithActivity = await prisma.customer.findMany({
    where: {
      restaurantId,
      status: "ACTIVE",
      pointsBalance: { gt: 0 },
    },
    select: {
      id: true,
      pointsBalance: true,
      orders: {
        orderBy: { placedAt: "desc" },
        take: 1,
        select: { placedAt: true },
      },
    },
  });

  let customersExpired = 0;
  let customersAtRisk = 0;

  for (const customer of customersWithActivity) {
    const lastOrderDate = customer.orders[0]?.placedAt;

    // If no orders or last order before cutoff date, expire points
    if (!lastOrderDate || lastOrderDate < cutoffDate) {
      const newBalance = 0;

      await prisma.$transaction([
        prisma.customer.update({
          where: { id: customer.id },
          data: { pointsBalance: newBalance },
        }),
        prisma.pointsTransaction.create({
          data: {
            customerId: customer.id,
            type: "EXPIRE",
            points: -customer.pointsBalance,
            balanceAfter: newBalance,
            reason: `Points expired due to ${inactivityDays} days of inactivity`,
          },
        }),
      ]);

      customersExpired++;
    } else if (lastOrderDate >= cutoffDate && lastOrderDate < warningDate) {
      // Customer is at risk (approaching inactivity threshold)
      customersAtRisk++;
    }
  }

  return { customersAtRisk, customersExpired };
}

/**
 * Get loyalty summary for dashboard
 */
export async function getLoyaltySummary(restaurantId: string) {
  const [
    totalCustomers,
    tierCounts,
    totalPointsIssued,
    totalPointsRedeemed,
    recentTransactions,
  ] = await Promise.all([
    prisma.customer.count({
      where: { restaurantId, status: "ACTIVE" },
    }),
    prisma.customer.groupBy({
      by: ["tier"],
      where: { restaurantId, status: "ACTIVE" },
      _count: true,
    }),
    prisma.customer.aggregate({
      where: { restaurantId },
      _sum: { pointsEarnedLifetime: true },
    }),
    prisma.customer.aggregate({
      where: { restaurantId },
      _sum: { pointsRedeemedLifetime: true },
    }),
    prisma.pointsTransaction.findMany({
      where: {
        customer: { restaurantId },
      },
      orderBy: { createdAt: "desc" },
      take: 10,
      include: {
        customer: {
          select: { name: true, customerId: true },
        },
      },
    }),
  ]);

  const tierDistribution = tierCounts.reduce(
    (acc: Record<string, number>, item: { tier: string; _count: number }) => {
      acc[item.tier] = item._count;
      return acc;
    },
    { BRONZE: 0, SILVER: 0, GOLD: 0, PLATINUM: 0 } as Record<string, number>
  );

  return {
    totalCustomers,
    tierDistribution,
    totalPointsIssued: totalPointsIssued._sum.pointsEarnedLifetime || 0,
    totalPointsRedeemed: totalPointsRedeemed._sum.pointsRedeemedLifetime || 0,
    recentTransactions,
  };
}
