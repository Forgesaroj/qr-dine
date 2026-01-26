// ═══════════════════════════════════════════════════════════════════════════════
// API TYPES
// ═══════════════════════════════════════════════════════════════════════════════

// Standard API Response format
export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  error?: ApiError;
  meta?: ApiMeta;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  stack?: string; // Only in development
}

export interface ApiMeta {
  page?: number;
  limit?: number;
  total?: number;
  totalPages?: number;
  hasMore?: boolean;
}

// Pagination
export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface PaginatedResponse<T> {
  items: T[];
  meta: Required<Pick<ApiMeta, "page" | "limit" | "total" | "totalPages" | "hasMore">>;
}

// Common error codes
export const ERROR_CODES = {
  // Auth (1xxx)
  UNAUTHORIZED: "E1001",
  INVALID_CREDENTIALS: "E1002",
  TOKEN_EXPIRED: "E1003",
  FORBIDDEN: "E1004",
  INVALID_PIN: "E1005",
  ACCOUNT_SUSPENDED: "E1006",
  ACCOUNT_LOCKED: "E1007",

  // Validation (2xxx)
  VALIDATION_ERROR: "E2001",
  INVALID_INPUT: "E2002",
  MISSING_REQUIRED_FIELD: "E2003",

  // Resources (3xxx)
  NOT_FOUND: "E3001",
  ALREADY_EXISTS: "E3002",
  CONFLICT: "E3003",

  // Business Logic (4xxx)
  INVALID_OTP: "E4001",
  OTP_EXPIRED: "E4002",
  SESSION_EXPIRED: "E4003",
  TABLE_NOT_AVAILABLE: "E4004",
  ITEM_NOT_AVAILABLE: "E4005",
  INSUFFICIENT_POINTS: "E4006",
  PROMOTION_NOT_VALID: "E4007",
  ORDER_CANNOT_BE_CANCELLED: "E4008",
  BILL_ALREADY_PAID: "E4009",

  // License (5xxx)
  LICENSE_INVALID: "E5001",
  LICENSE_EXPIRED: "E5002",
  FEATURE_NOT_AVAILABLE: "E5003",
  LIMIT_EXCEEDED: "E5004",

  // Server (9xxx)
  INTERNAL_ERROR: "E9001",
  SERVICE_UNAVAILABLE: "E9002",
  DATABASE_ERROR: "E9003",
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

// HTTP Status codes mapping
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
} as const;

export type HttpStatus = (typeof HTTP_STATUS)[keyof typeof HTTP_STATUS];
