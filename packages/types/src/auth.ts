// ═══════════════════════════════════════════════════════════════════════════════
// AUTH TYPES
// ═══════════════════════════════════════════════════════════════════════════════

import { UserRole, UserStatus } from "./enums";

export interface JwtPayload {
  userId: string;
  restaurantId: string;
  email: string;
  role: UserRole;
  permissions: string[];
  iat?: number;
  exp?: number;
}

export interface AuthUser {
  id: string;
  restaurantId: string;
  email: string;
  name: string;
  role: UserRole;
  status: UserStatus;
  permissions: string[];
  avatarUrl?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
  restaurantSlug?: string;
}

export interface PinLoginRequest {
  pin: string;
  restaurantId: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

export interface LoginResponse {
  user: AuthUser;
  tokens: AuthTokens;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  password: string;
  confirmPassword: string;
}
