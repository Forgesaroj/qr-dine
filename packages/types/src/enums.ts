// ═══════════════════════════════════════════════════════════════════════════════
// ENUMS - Must match Prisma schema exactly
// ═══════════════════════════════════════════════════════════════════════════════

// License
export enum LicenseTier {
  STARTER = "STARTER",
  PROFESSIONAL = "PROFESSIONAL",
  ENTERPRISE = "ENTERPRISE",
  UNLIMITED = "UNLIMITED",
}

export enum LicenseStatus {
  ACTIVE = "ACTIVE",
  EXPIRED = "EXPIRED",
  SUSPENDED = "SUSPENDED",
  CANCELLED = "CANCELLED",
}

// Restaurant
export enum RestaurantStatus {
  ACTIVE = "ACTIVE",
  INACTIVE = "INACTIVE",
  SUSPENDED = "SUSPENDED",
}

// User
export enum UserRole {
  SUPER_ADMIN = "SUPER_ADMIN",
  OWNER = "OWNER",
  MANAGER = "MANAGER",
  CASHIER = "CASHIER",
  WAITER = "WAITER",
  KITCHEN = "KITCHEN",
  HOST = "HOST",
}

export enum UserStatus {
  ACTIVE = "ACTIVE",
  INACTIVE = "INACTIVE",
  SUSPENDED = "SUSPENDED",
}

// Table
export enum TableStatus {
  AVAILABLE = "AVAILABLE",
  OCCUPIED = "OCCUPIED",
  RESERVED = "RESERVED",
  CLEANING = "CLEANING",
  BLOCKED = "BLOCKED",
}

// Menu
export enum PricingType {
  SINGLE = "SINGLE",
  VARIANTS = "VARIANTS",
}

// Session
export enum SessionStatus {
  ACTIVE = "ACTIVE",
  COMPLETED = "COMPLETED",
  CANCELLED = "CANCELLED",
}

// Order
export enum OrderType {
  DINE_IN = "DINE_IN",
  TAKEAWAY = "TAKEAWAY",
  DELIVERY = "DELIVERY",
  PHONE = "PHONE",
}

export enum OrderSource {
  QR = "QR",
  STAFF = "STAFF",
  PHONE = "PHONE",
  ONLINE = "ONLINE",
}

export enum OrderStatus {
  PENDING = "PENDING",
  PENDING_CONFIRMATION = "PENDING_CONFIRMATION",
  CONFIRMED = "CONFIRMED",
  PREPARING = "PREPARING",
  READY = "READY",
  SERVED = "SERVED",
  COMPLETED = "COMPLETED",
  CANCELLED = "CANCELLED",
}

export enum OrderItemStatus {
  PENDING = "PENDING",
  SENT_TO_KITCHEN = "SENT_TO_KITCHEN",
  PREPARING = "PREPARING",
  READY = "READY",
  SERVED = "SERVED",
  CANCELLED = "CANCELLED",
}

// Billing
export enum BillStatus {
  OPEN = "OPEN",
  PARTIALLY_PAID = "PARTIALLY_PAID",
  PAID = "PAID",
  REFUNDED = "REFUNDED",
  VOIDED = "VOIDED",
  CANCELLED = "CANCELLED",
}

export enum PaymentStatus {
  PENDING = "PENDING",
  COMPLETED = "COMPLETED",
  FAILED = "FAILED",
  REFUNDED = "REFUNDED",
}

export enum PaymentMethod {
  CASH = "CASH",
  CARD = "CARD",
  QR_PAYMENT = "QR_PAYMENT",
  ESEWA = "ESEWA",
  KHALTI = "KHALTI",
  FONEPAY = "FONEPAY",
  POINTS = "POINTS",
  SPLIT = "SPLIT",
}

// Customer
export enum CustomerTier {
  BRONZE = "BRONZE",
  SILVER = "SILVER",
  GOLD = "GOLD",
  PLATINUM = "PLATINUM",
}

export enum CustomerStatus {
  ACTIVE = "ACTIVE",
  INACTIVE = "INACTIVE",
  BLOCKED = "BLOCKED",
}

export enum PointsTransactionType {
  EARN = "EARN",
  REDEEM = "REDEEM",
  BONUS = "BONUS",
  EXPIRE = "EXPIRE",
  ADJUST = "ADJUST",
}

// Promotion
export enum PromotionType {
  HAPPY_HOUR = "HAPPY_HOUR",
  COMBO = "COMBO",
  BOGO = "BOGO",
  FIRST_ORDER = "FIRST_ORDER",
  PROMO_CODE = "PROMO_CODE",
  MIN_ORDER = "MIN_ORDER",
  FESTIVAL = "FESTIVAL",
  ITEM_DISCOUNT = "ITEM_DISCOUNT",
  LOYALTY_BONUS = "LOYALTY_BONUS",
}

export enum DiscountType {
  PERCENTAGE = "PERCENTAGE",
  FIXED = "FIXED",
  FREE_ITEM = "FREE_ITEM",
}

export enum PromotionStatus {
  DRAFT = "DRAFT",
  ACTIVE = "ACTIVE",
  PAUSED = "PAUSED",
  SCHEDULED = "SCHEDULED",
  EXPIRED = "EXPIRED",
}

// Staff
export enum ShiftStatus {
  SCHEDULED = "SCHEDULED",
  IN_PROGRESS = "IN_PROGRESS",
  COMPLETED = "COMPLETED",
  MISSED = "MISSED",
  CANCELLED = "CANCELLED",
}

export enum AttendanceStatus {
  PRESENT = "PRESENT",
  ABSENT = "ABSENT",
  LATE = "LATE",
  HALF_DAY = "HALF_DAY",
  LEAVE = "LEAVE",
}
