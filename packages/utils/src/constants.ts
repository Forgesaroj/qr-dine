// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

// App info
export const APP_NAME = "QR DINE";
export const APP_VERSION = "1.0.0";
export const COMPANY_NAME = "LUMORA";

// Default values
export const DEFAULT_CURRENCY = "NPR";
export const DEFAULT_TIMEZONE = "Asia/Kathmandu";
export const DEFAULT_COUNTRY = "Nepal";

// Pagination
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

// OTP/PIN
export const OTP_LENGTH = 4;
export const OTP_EXPIRY_MINUTES = 30;
export const PIN_LENGTH = 4;
export const MAX_PIN_ATTEMPTS = 3;
export const PIN_LOCK_MINUTES = 30;

// Session
export const SESSION_TIMEOUT_MINUTES = 480; // 8 hours
export const AUTO_LOGOUT_MINUTES = 60;

// File upload
export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const ALLOWED_IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp"];

// Tax & Charges (Nepal defaults)
export const DEFAULT_TAX_PERCENTAGE = 13; // VAT
export const DEFAULT_SERVICE_CHARGE_PERCENTAGE = 10;

// Loyalty
export const DEFAULT_POINTS_PER_CURRENCY = 0.1; // 1 point per Rs. 10
export const DEFAULT_POINTS_REDEMPTION_RATE = 10; // 10 points = Rs. 1
export const MIN_POINTS_TO_REDEEM = 100;
export const POINTS_EXPIRY_MONTHS = 12;

// Customer tiers thresholds (in NPR)
export const TIER_THRESHOLDS = {
  BRONZE: 0,
  SILVER: 5000,
  GOLD: 15000,
  PLATINUM: 50000,
} as const;

// Order
export const ORDER_CONFIRMATION_TIMEOUT_SECONDS = 300; // 5 minutes
export const ORDER_PREPARATION_ALERT_MINUTES = 15;

// Kitchen stations
export const KITCHEN_STATIONS = [
  "Main Kitchen",
  "Grill Station",
  "Fry Station",
  "Salad Station",
  "Dessert Station",
  "Bar",
  "Bakery",
] as const;

// Spice levels
export const SPICE_LEVELS = [
  { value: 0, label: "No Spice" },
  { value: 1, label: "Mild" },
  { value: 2, label: "Medium" },
  { value: 3, label: "Hot" },
  { value: 4, label: "Very Hot" },
  { value: 5, label: "Extra Hot" },
] as const;

// Common allergens
export const COMMON_ALLERGENS = [
  "Gluten",
  "Dairy",
  "Eggs",
  "Fish",
  "Shellfish",
  "Tree Nuts",
  "Peanuts",
  "Soy",
  "Sesame",
] as const;

// Days of week
export const DAYS_OF_WEEK = [
  { value: 0, label: "Sunday", short: "Sun" },
  { value: 1, label: "Monday", short: "Mon" },
  { value: 2, label: "Tuesday", short: "Tue" },
  { value: 3, label: "Wednesday", short: "Wed" },
  { value: 4, label: "Thursday", short: "Thu" },
  { value: 5, label: "Friday", short: "Fri" },
  { value: 6, label: "Saturday", short: "Sat" },
] as const;

// Shift types
export const SHIFT_TYPES = [
  { value: "MORNING", label: "Morning", time: "06:00 - 14:00" },
  { value: "AFTERNOON", label: "Afternoon", time: "14:00 - 22:00" },
  { value: "NIGHT", label: "Night", time: "22:00 - 06:00" },
  { value: "FULL_DAY", label: "Full Day", time: "09:00 - 21:00" },
] as const;

// Report periods
export const REPORT_PERIODS = [
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "this_week", label: "This Week" },
  { value: "last_week", label: "Last Week" },
  { value: "this_month", label: "This Month" },
  { value: "last_month", label: "Last Month" },
  { value: "this_year", label: "This Year" },
  { value: "custom", label: "Custom Range" },
] as const;

// Status colors (for UI)
export const STATUS_COLORS = {
  // Order status
  PENDING: "yellow",
  PENDING_CONFIRMATION: "orange",
  CONFIRMED: "blue",
  PREPARING: "purple",
  READY: "green",
  SERVED: "green",
  COMPLETED: "gray",
  CANCELLED: "red",

  // Table status
  AVAILABLE: "green",
  OCCUPIED: "red",
  RESERVED: "blue",
  CLEANING: "yellow",
  BLOCKED: "gray",

  // User status
  ACTIVE: "green",
  INACTIVE: "gray",
  SUSPENDED: "red",

  // Bill status
  OPEN: "blue",
  PARTIALLY_PAID: "orange",
  PAID: "green",
  REFUNDED: "purple",
  VOIDED: "red",
} as const;

// Regex patterns
export const REGEX = {
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  NEPAL_PHONE: /^(98|97)\d{8}$/,
  SLUG: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
  TIME_24H: /^([01]\d|2[0-3]):([0-5]\d)$/,
  CUID: /^c[a-z0-9]{24}$/,
} as const;
