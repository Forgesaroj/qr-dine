
# QR DINE - Complete System Specification
# Version: 1.0.0
# Last Updated: January 2026
# Company: LUMORA
# Developer: Santosh

> ⚠️ **CRITICAL**: This document contains ALL finalized decisions and specifications for QR DINE.
> Any AI assistant or developer working on this project MUST follow this specification EXACTLY.
> DO NOT deviate from these specifications without explicit approval.

---

# TABLE OF CONTENTS

1. [Project Overview](#1-project-overview)
2. [Tech Stack](#2-tech-stack)
3. [Project Structure](#3-project-structure)
4. [Business Model](#4-business-model)
5. [License System](#5-license-system)
6. [User Roles & Permissions](#6-user-roles--permissions)
7. [Database Schema](#7-database-schema)
8. [Feature Specifications](#8-feature-specifications)
9. [API Architecture](#9-api-architecture)
10. [UI/UX Guidelines](#10-uiux-guidelines)
11. [Desktop Application](#11-desktop-application)
12. [Coding Conventions](#12-coding-conventions)
13. [Critical Rules](#13-critical-rules)

---

# 1. PROJECT OVERVIEW

## 1.1 Basic Information

| Field | Value |
|-------|-------|
| Project Name | QR DINE |
| Company | LUMORA |
| Developer | Santosh |
| Type | Restaurant Management & QR Ordering System |
| Target Market | Nepal (Primary), Global (Secondary) |
| Currency | NPR (Rs.) |
| Languages | English (Primary), Nepali (Optional) |

## 1.2 System Description

QR DINE is a comprehensive restaurant management ERP system that covers:
- QR code-based ordering for guests
- Complete staff dashboards (Waiter, Kitchen, Cashier, Manager)
- Customer loyalty and CRM
- Promotions and offers
- Staff management
- Reports and analytics
- Multi-tenant SaaS capability
- Self-hosted installation option

## 1.3 Key Differentiators

1. **Hybrid Order Flow**: Guests browse immediately, staff confirms orders
2. **Privacy-Focused Loyalty**: Customers see points, owners see spending
3. **Staff-Only Guest Count**: Ensures accountability
4. **Multiple Revenue Streams**: SaaS + CodeCanyon + Licensed self-hosted
5. **Professional Installer**: Like ZKTeco BioTime (Windows)

---

# 2. TECH STACK

## 2.1 Core Application

| Component | Technology | Version |
|-----------|------------|---------|
| Framework | Next.js | 14.x (App Router) |
| Language | TypeScript | 5.x (Strict Mode) |
| Styling | Tailwind CSS | 3.x |
| Database | PostgreSQL | 14+ |
| ORM | Prisma | 5.x |
| Validation | Zod | 3.x |
| Real-time | Pusher / WebSocket | Latest |
| Authentication | JWT (Custom) | - |

## 2.2 Desktop Application

| Component | Technology |
|-----------|------------|
| Framework | Electron |
| Builder | electron-builder |
| Platform | Windows (Primary) |
| Installer | NSIS (via electron-builder) |

## 2.3 Package Manager

| Tool | Purpose |
|------|---------|
| pnpm | Package management |
| Turborepo | Monorepo management |

## 2.4 Development Tools

| Tool | Purpose |
|------|---------|
| ESLint | Code linting |
| Prettier | Code formatting |
| Husky | Git hooks |
| TypeScript | Type checking |

## 2.5 External Services

| Service | Purpose | Required |
|---------|---------|----------|
| Sparrow SMS | OTP & Marketing SMS | Optional |
| eSewa | Payment gateway | Optional |
| Khalti | Payment gateway | Optional |
| FonePay | Payment gateway | Optional |
| AWS S3 / Local | File storage | Required |
| Pusher | Real-time notifications | Optional |

---

# 3. PROJECT STRUCTURE

## 3.1 Monorepo Structure
```
qr-dine/
│
├── apps/
│   ├── web/                          # Main Next.js 14 Application
│   │   ├── app/
│   │   │   ├── (auth)/               # Authentication pages
│   │   │   │   ├── login/
│   │   │   │   ├── pin-login/
│   │   │   │   ├── forgot-password/
│   │   │   │   └── reset-password/
│   │   │   │
│   │   │   ├── (dashboard)/          # Staff dashboards (protected)
│   │   │   │   ├── layout.tsx
│   │   │   │   ├── page.tsx          # Dashboard home
│   │   │   │   ├── tables/
│   │   │   │   ├── orders/
│   │   │   │   ├── menu/
│   │   │   │   ├── customers/
│   │   │   │   ├── promotions/
│   │   │   │   ├── reports/
│   │   │   │   ├── staff/
│   │   │   │   ├── communication/
│   │   │   │   └── settings/
│   │   │   │
│   │   │   ├── (guest)/              # Guest ordering (public)
│   │   │   │   ├── [restaurant]/
│   │   │   │   │   └── [table]/
│   │   │   │   │       ├── page.tsx  # OTP verification
│   │   │   │   │       ├── menu/
│   │   │   │   │       ├── cart/
│   │   │   │   │       ├── order/
│   │   │   │   │       └── bill/
│   │   │   │
│   │   │   ├── (super-admin)/        # Super admin (LUMORA)
│   │   │   │   ├── restaurants/
│   │   │   │   ├── licenses/
│   │   │   │   └── analytics/
│   │   │   │
│   │   │   ├── api/                  # API Routes
│   │   │   │   ├── auth/
│   │   │   │   ├── restaurants/
│   │   │   │   ├── tables/
│   │   │   │   ├── menu/
│   │   │   │   ├── orders/
│   │   │   │   ├── customers/
│   │   │   │   ├── promotions/
│   │   │   │   ├── staff/
│   │   │   │   ├── reports/
│   │   │   │   ├── guest/            # Public APIs
│   │   │   │   └── license/          # License validation
│   │   │   │
│   │   │   ├── layout.tsx
│   │   │   └── page.tsx
│   │   │
│   │   ├── components/               # App-specific components
│   │   │   ├── dashboard/
│   │   │   ├── guest/
│   │   │   ├── kitchen/
│   │   │   └── shared/
│   │   │
│   │   ├── lib/                      # Utilities
│   │   │   ├── auth/
│   │   │   ├── api/
│   │   │   ├── validators/
│   │   │   ├── services/
│   │   │   ├── hooks/
│   │   │   └── utils/
│   │   │
│   │   ├── public/
│   │   │   ├── images/
│   │   │   └── fonts/
│   │   │
│   │   ├── styles/
│   │   │   └── globals.css
│   │   │
│   │   ├── middleware.ts
│   │   ├── next.config.js
│   │   ├── tailwind.config.ts
│   │   ├── tsconfig.json
│   │   └── package.json
│   │
│   ├── desktop/                      # Electron Application
│   │   ├── main/
│   │   │   ├── index.ts              # Main process
│   │   │   ├── tray.ts               # System tray
│   │   │   ├── updater.ts            # Auto-updater
│   │   │   ├── backup.ts             # Backup manager
│   │   │   └── service.ts            # Windows service
│   │   │
│   │   ├── renderer/                 # Renderer process
│   │   │   ├── pages/
│   │   │   │   ├── setup-wizard/
│   │   │   │   ├── license-activation/
│   │   │   │   ├── backup-restore/
│   │   │   │   └── settings/
│   │   │   └── components/
│   │   │
│   │   ├── installer/
│   │   │   ├── scripts/
│   │   │   └── assets/
│   │   │
│   │   ├── electron-builder.yml
│   │   └── package.json
│   │
│   └── license-server/               # License Validation API
│       ├── src/
│       │   ├── routes/
│       │   ├── services/
│       │   └── utils/
│       └── package.json
│
├── packages/
│   ├── database/                     # Prisma Schema & Client
│   │   ├── prisma/
│   │   │   ├── schema.prisma
│   │   │   ├── migrations/
│   │   │   └── seed.ts
│   │   ├── index.ts
│   │   ├── client.ts
│   │   └── package.json
│   │
│   ├── ui/                           # Shared UI Components
│   │   ├── components/
│   │   │   ├── Button/
│   │   │   ├── Input/
│   │   │   ├── Select/
│   │   │   ├── Modal/
│   │   │   ├── Card/
│   │   │   ├── Table/
│   │   │   ├── Badge/
│   │   │   ├── Toast/
│   │   │   └── ...
│   │   ├── layouts/
│   │   │   ├── DashboardLayout/
│   │   │   ├── AuthLayout/
│   │   │   └── GuestLayout/
│   │   ├── hooks/
│   │   ├── index.ts
│   │   └── package.json
│   │
│   ├── types/                        # Shared TypeScript Types
│   │   ├── auth.ts
│   │   ├── restaurant.ts
│   │   ├── menu.ts
│   │   ├── order.ts
│   │   ├── customer.ts
│   │   ├── api.ts
│   │   ├── index.ts
│   │   └── package.json
│   │
│   ├── utils/                        # Shared Utilities
│   │   ├── formatters.ts
│   │   ├── validators.ts
│   │   ├── constants.ts
│   │   ├── helpers.ts
│   │   ├── index.ts
│   │   └── package.json
│   │
│   └── config/                       # Shared Configurations
│       ├── eslint/
│       ├── typescript/
│       ├── tailwind/
│       └── package.json
│
├── docker/
│   ├── Dockerfile
│   ├── docker-compose.yml
│   └── docker-compose.prod.yml
│
├── docs/
│   ├── setup.md
│   ├── api.md
│   ├── deployment.md
│   └── codecanyon/
│       ├── documentation.html
│       └── installation.md
│
├── .env.example
├── .eslintrc.js
├── .prettierrc
├── .gitignore
├── package.json
├── pnpm-workspace.yaml
├── turbo.json
├── tsconfig.json
├── PROJECT-SPEC.md                   # This file
├── ROADMAP.md                        # Development roadmap
├── AI-PROMPT.md                      # AI context prompt
└── README.md
```

---

# 4. BUSINESS MODEL

## 4.1 Three Revenue Streams

### Stream 1: SaaS (Hosted by LUMORA)
```
┌─────────────────────────────────────────────────────────────┐
│ SaaS MODEL                                                  │
├─────────────────────────────────────────────────────────────┤
│ • LUMORA hosts the system                                   │
│ • Restaurants access via subdomain (resto.qrdine.com)      │
│ • Monthly subscription fee                                  │
│ • LUMORA handles updates, backups, maintenance             │
│ • Lowest barrier to entry for restaurants                  │
└─────────────────────────────────────────────────────────────┘
```

### Stream 2: CodeCanyon (One-time Purchase)
```
┌─────────────────────────────────────────────────────────────┐
│ CODECANYON MODEL                                            │
├─────────────────────────────────────────────────────────────┤
│ • One-time purchase ($49-$299)                             │
│ • Buyer gets source code                                   │
│ • Buyer hosts on their own server                          │
│ • Single restaurant license                                │
│ • Optional extended support                                │
│ • No license validation (standalone mode)                  │
└─────────────────────────────────────────────────────────────┘
```

### Stream 3: Licensed Self-hosted
```
┌─────────────────────────────────────────────────────────────┐
│ LICENSED SELF-HOSTED MODEL                                  │
├─────────────────────────────────────────────────────────────┤
│ • Restaurant installs on their PC/server                   │
│ • License key validates with LUMORA server                 │
│ • Features enabled based on license tier                   │
│ • One-time or subscription pricing                         │
│ • LUMORA controls feature access remotely                  │
└─────────────────────────────────────────────────────────────┘
```

## 4.2 Configuration Modes
```typescript
// Environment variable determines mode
LICENSE_MODE = "saas" | "codecanyon" | "licensed"

// saas: Multi-tenant, subscription validated
// codecanyon: Single restaurant, no validation
// licensed: Self-hosted, license key validates features
```

---

# 5. LICENSE SYSTEM

## 5.1 License Tiers

| Tier | One-Time Price | Monthly Price | Restaurants | Cloud Storage |
|------|----------------|---------------|-------------|---------------|
| **Starter** | Rs. 15,000 | Rs. 1,500 | 1 | None |
| **Professional** | Rs. 35,000 | Rs. 3,000 | 1 | 5 GB |
| **Enterprise** | Rs. 75,000 | Rs. 6,000 | Up to 5 | 20 GB |
| **Unlimited** | Rs. 150,000 | Lifetime | Unlimited | 100 GB |

## 5.2 Feature Matrix by Tier

| Feature | Starter | Professional | Enterprise | Unlimited |
|---------|---------|--------------|------------|-----------|
| QR Ordering | ✅ | ✅ | ✅ | ✅ |
| Table Management | ✅ | ✅ | ✅ | ✅ |
| Menu Management | ✅ | ✅ | ✅ | ✅ |
| Order Management | ✅ | ✅ | ✅ | ✅ |
| Basic Billing | ✅ | ✅ | ✅ | ✅ |
| Basic Reports | ✅ | ✅ | ✅ | ✅ |
| Staff (3 max) | ✅ | - | - | - |
| Staff (10 max) | - | ✅ | - | - |
| Unlimited Staff | - | - | ✅ | ✅ |
| Tables (20 max) | ✅ | - | - | - |
| Unlimited Tables | - | ✅ | ✅ | ✅ |
| Loyalty Program | ❌ | ✅ | ✅ | ✅ |
| Promotions | ❌ | ✅ | ✅ | ✅ |
| SMS Integration | ❌ | ✅ | ✅ | ✅ |
| Advanced Reports | ❌ | ✅ | ✅ | ✅ |
| Customer CRM | ❌ | ✅ | ✅ | ✅ |
| Local Backup | ✅ | ✅ | ✅ | ✅ |
| Cloud Backup | ❌ | ✅ | ✅ | ✅ |
| Multi-location | ❌ | ❌ | ✅ | ✅ |
| API Access | ❌ | ❌ | ✅ | ✅ |
| Custom Branding | ❌ | ❌ | ✅ | ✅ |
| White Label | ❌ | ❌ | ❌ | ✅ |
| Source Code | ❌ | ❌ | ❌ | ✅ |
| Priority Support | ❌ | ❌ | ✅ | ✅ |

## 5.3 Feature Flags Implementation
```typescript
// packages/utils/features.ts

export const FEATURE_FLAGS = {
  // Core (all tiers)
  qr_ordering: ["starter", "professional", "enterprise", "unlimited"],
  table_management: ["starter", "professional", "enterprise", "unlimited"],
  menu_management: ["starter", "professional", "enterprise", "unlimited"],
  order_management: ["starter", "professional", "enterprise", "unlimited"],
  basic_billing: ["starter", "professional", "enterprise", "unlimited"],
  basic_reports: ["starter", "professional", "enterprise", "unlimited"],
  local_backup: ["starter", "professional", "enterprise", "unlimited"],

  // Professional+
  loyalty_program: ["professional", "enterprise", "unlimited"],
  promotions: ["professional", "enterprise", "unlimited"],
  sms_integration: ["professional", "enterprise", "unlimited"],
  advanced_reports: ["professional", "enterprise", "unlimited"],
  customer_crm: ["professional", "enterprise", "unlimited"],
  cloud_backup: ["professional", "enterprise", "unlimited"],

  // Enterprise+
  multi_location: ["enterprise", "unlimited"],
  api_access: ["enterprise", "unlimited"],
  custom_branding: ["enterprise", "unlimited"],

  // Unlimited only
  white_label: ["unlimited"],
  source_code: ["unlimited"],
} as const;

export type FeatureKey = keyof typeof FEATURE_FLAGS;
export type LicenseTier = "starter" | "professional" | "enterprise" | "unlimited";

export function isFeatureEnabled(feature: FeatureKey, tier: LicenseTier): boolean {
  return FEATURE_FLAGS[feature]?.includes(tier) ?? false;
}

export function getEnabledFeatures(tier: LicenseTier): FeatureKey[] {
  return Object.keys(FEATURE_FLAGS).filter(
    (feature) => isFeatureEnabled(feature as FeatureKey, tier)
  ) as FeatureKey[];
}
```

## 5.4 License Validation Flow
```
┌─────────────────────────────────────────────────────────────┐
│ LICENSE VALIDATION FLOW                                     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  RESTAURANT'S SERVER                  LUMORA LICENSE SERVER │
│  ┌─────────────────────┐             ┌─────────────────────┐│
│  │                     │             │                     ││
│  │ 1. App starts       │             │                     ││
│  │                     │             │                     ││
│  │ 2. Check local      │             │                     ││
│  │    cache            │             │                     ││
│  │    (valid < 24h?)   │             │                     ││
│  │                     │             │                     ││
│  │ 3. If expired,      │────────────▶│ 4. Validate key     ││
│  │    send license key │             │    Check status     ││
│  │                     │             │    Check expiry     ││
│  │                     │◀────────────│                     ││
│  │ 5. Receive response │             │ Return:             ││
│  │    - is_valid       │             │ - tier              ││
│  │    - tier           │             │ - features          ││
│  │    - features       │             │ - expires_at        ││
│  │    - expires_at     │             │ - max_restaurants   ││
│  │                     │             │                     ││
│  │ 6. Cache locally    │             │                     ││
│  │    (24 hours)       │             │                     ││
│  │                     │             │                     ││
│  │ 7. Enable/disable   │             │                     ││
│  │    features based   │             │                     ││
│  │    on response      │             │                     ││
│  │                     │             │                     ││
│  └─────────────────────┘             └─────────────────────┘│
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## 5.5 License Data Structure
```typescript
interface License {
  id: string;
  license_key: string;              // "QRDINE-XXXX-XXXX-XXXX"
  tier: LicenseTier;
  status: "active" | "expired" | "suspended" | "cancelled";

  // Limits
  max_restaurants: number;
  max_staff_per_restaurant: number | null;  // null = unlimited
  max_tables_per_restaurant: number | null;
  cloud_storage_gb: number;

  // Features
  features: string[];               // Enabled feature keys

  // Validity
  activated_at: Date | null;
  expires_at: Date | null;          // null = lifetime

  // Tracking
  last_validated_at: Date;
  activation_count: number;
  max_activations: number;

  // Owner
  owner_name: string;
  owner_email: string;
  owner_phone: string;

  created_at: Date;
  updated_at: Date;
}
```

---

# 6. USER ROLES & PERMISSIONS

## 6.1 Role Definitions

| Role | Level | Description |
|------|-------|-------------|
| **SUPER_ADMIN** | System | LUMORA admin - manages all restaurants |
| **OWNER** | Restaurant | Restaurant owner - full access |
| **MANAGER** | Restaurant | Restaurant manager - most permissions |
| **CASHIER** | Restaurant | Handles billing and payments |
| **WAITER** | Restaurant | Tables, orders, guest service |
| **KITCHEN** | Restaurant | Kitchen orders only |
| **HOST** | Restaurant | Seating, reservations |

## 6.2 Permission Matrix
```typescript
// packages/utils/permissions.ts

export const PERMISSIONS = {
  // ═══════════════════════════════════════════════════════════
  // DASHBOARD
  // ═══════════════════════════════════════════════════════════
  "dashboard:view": ["SUPER_ADMIN", "OWNER", "MANAGER", "CASHIER", "WAITER", "KITCHEN", "HOST"],
  "dashboard:view_revenue": ["SUPER_ADMIN", "OWNER", "MANAGER"],
  "dashboard:view_analytics": ["SUPER_ADMIN", "OWNER", "MANAGER"],

  // ═══════════════════════════════════════════════════════════
  // TABLES
  // ═══════════════════════════════════════════════════════════
  "tables:view": ["OWNER", "MANAGER", "WAITER", "HOST"],
  "tables:create": ["OWNER", "MANAGER"],
  "tables:update": ["OWNER", "MANAGER"],
  "tables:delete": ["OWNER", "MANAGER"],
  "tables:change_status": ["OWNER", "MANAGER", "WAITER", "HOST"],
  "tables:seat_guests": ["OWNER", "MANAGER", "WAITER", "HOST"],
  "tables:enter_guest_count": ["OWNER", "MANAGER", "WAITER", "HOST"],
  "tables:generate_qr": ["OWNER", "MANAGER"],

  // ═══════════════════════════════════════════════════════════
  // MENU
  // ═══════════════════════════════════════════════════════════
  "menu:view": ["OWNER", "MANAGER", "CASHIER", "WAITER", "KITCHEN"],
  "menu:create": ["OWNER", "MANAGER"],
  "menu:update": ["OWNER", "MANAGER"],
  "menu:delete": ["OWNER", "MANAGER"],
  "menu:toggle_availability": ["OWNER", "MANAGER", "KITCHEN"],

  // ═══════════════════════════════════════════════════════════
  // ORDERS
  // ═══════════════════════════════════════════════════════════
  "orders:view": ["OWNER", "MANAGER", "CASHIER", "WAITER", "KITCHEN"],
  "orders:view_all": ["OWNER", "MANAGER"],
  "orders:create": ["OWNER", "MANAGER", "WAITER"],
  "orders:update": ["OWNER", "MANAGER", "WAITER"],
  "orders:cancel": ["OWNER", "MANAGER"],
  "orders:confirm_guest_order": ["OWNER", "MANAGER", "WAITER"],
  "orders:quick_order": ["OWNER", "MANAGER", "WAITER"],

  // ═══════════════════════════════════════════════════════════
  // KITCHEN
  // ═══════════════════════════════════════════════════════════
  "kitchen:view": ["OWNER", "MANAGER", "KITCHEN"],
  "kitchen:update_status": ["OWNER", "MANAGER", "KITCHEN"],
  "kitchen:mark_ready": ["OWNER", "MANAGER", "KITCHEN"],

  // ═══════════════════════════════════════════════════════════
  // BILLING
  // ═══════════════════════════════════════════════════════════
  "billing:view": ["OWNER", "MANAGER", "CASHIER"],
  "billing:create": ["OWNER", "MANAGER", "CASHIER"],
  "billing:apply_discount": ["OWNER", "MANAGER"],
  "billing:apply_promo_code": ["OWNER", "MANAGER", "CASHIER"],
  "billing:process_payment": ["OWNER", "MANAGER", "CASHIER"],
  "billing:refund": ["OWNER", "MANAGER"],
  "billing:void": ["OWNER"],
  "billing:print": ["OWNER", "MANAGER", "CASHIER"],
  "billing:view_amount": ["OWNER", "MANAGER", "CASHIER"],  // ⚠️ WAITER CANNOT SEE

  // ═══════════════════════════════════════════════════════════
  // CUSTOMERS
  // ═══════════════════════════════════════════════════════════
  "customers:view": ["OWNER", "MANAGER", "CASHIER", "WAITER"],
  "customers:view_basic": ["OWNER", "MANAGER", "CASHIER", "WAITER"],  // Name, phone, tier
  "customers:view_spending": ["OWNER", "MANAGER"],  // ⚠️ HIDDEN FROM WAITER/CASHIER
  "customers:view_full": ["OWNER", "MANAGER"],
  "customers:create": ["OWNER", "MANAGER", "CASHIER"],
  "customers:update": ["OWNER", "MANAGER"],
  "customers:delete": ["OWNER"],
  "customers:add_points": ["OWNER", "MANAGER"],
  "customers:redeem_points": ["OWNER", "MANAGER", "CASHIER"],
  "customers:add_note": ["OWNER", "MANAGER", "CASHIER", "WAITER"],

  // ═══════════════════════════════════════════════════════════
  // PROMOTIONS
  // ═══════════════════════════════════════════════════════════
  "promotions:view": ["OWNER", "MANAGER"],
  "promotions:create": ["OWNER", "MANAGER"],
  "promotions:update": ["OWNER", "MANAGER"],
  "promotions:delete": ["OWNER", "MANAGER"],
  "promotions:toggle_status": ["OWNER", "MANAGER"],

  // ═══════════════════════════════════════════════════════════
  // REPORTS
  // ═══════════════════════════════════════════════════════════
  "reports:view": ["OWNER", "MANAGER"],
  "reports:sales": ["OWNER", "MANAGER"],
  "reports:orders": ["OWNER", "MANAGER"],
  "reports:customers": ["OWNER", "MANAGER"],
  "reports:staff": ["OWNER", "MANAGER"],
  "reports:inventory": ["OWNER", "MANAGER"],
  "reports:export": ["OWNER", "MANAGER"],

  // ═══════════════════════════════════════════════════════════
  // STAFF MANAGEMENT
  // ═══════════════════════════════════════════════════════════
  "staff:view": ["OWNER", "MANAGER"],
  "staff:create": ["OWNER"],
  "staff:update": ["OWNER"],
  "staff:delete": ["OWNER"],
  "staff:manage_roles": ["OWNER"],
  "staff:view_attendance": ["OWNER", "MANAGER"],
  "staff:manage_shifts": ["OWNER", "MANAGER"],

  // ═══════════════════════════════════════════════════════════
  // COMMUNICATION
  // ═══════════════════════════════════════════════════════════
  "communication:chat": ["OWNER", "MANAGER", "CASHIER", "WAITER", "KITCHEN", "HOST"],
  "communication:announcements_view": ["OWNER", "MANAGER", "CASHIER", "WAITER", "KITCHEN", "HOST"],
  "communication:announcements_create": ["OWNER", "MANAGER"],
  "communication:shift_notes": ["OWNER", "MANAGER", "CASHIER", "WAITER", "KITCHEN", "HOST"],
  "communication:daily_briefing_view": ["OWNER", "MANAGER", "CASHIER", "WAITER", "KITCHEN", "HOST"],
  "communication:daily_briefing_create": ["OWNER", "MANAGER"],

  // ═══════════════════════════════════════════════════════════
  // SETTINGS
  // ═══════════════════════════════════════════════════════════
  "settings:view": ["OWNER", "MANAGER"],
  "settings:update": ["OWNER"],
  "settings:integrations": ["OWNER"],
  "settings:billing_config": ["OWNER"],

  // ═══════════════════════════════════════════════════════════
  // SUPER ADMIN (LUMORA)
  // ═══════════════════════════════════════════════════════════
  "superadmin:restaurants": ["SUPER_ADMIN"],
  "superadmin:licenses": ["SUPER_ADMIN"],
  "superadmin:analytics": ["SUPER_ADMIN"],
  "superadmin:support": ["SUPER_ADMIN"],
} as const;

export type Permission = keyof typeof PERMISSIONS;
export type UserRole = "SUPER_ADMIN" | "OWNER" | "MANAGER" | "CASHIER" | "WAITER" | "KITCHEN" | "HOST";

export function hasPermission(role: UserRole, permission: Permission): boolean {
  return PERMISSIONS[permission]?.includes(role) ?? false;
}

export function hasAnyPermission(role: UserRole, permissions: Permission[]): boolean {
  return permissions.some((permission) => hasPermission(role, permission));
}

export function hasAllPermissions(role: UserRole, permissions: Permission[]): boolean {
  return permissions.every((permission) => hasPermission(role, permission));
}
```

## 6.3 Critical Permission Rules
```
╔═══════════════════════════════════════════════════════════════════════════════╗
║ ⚠️  CRITICAL PERMISSION RULES - NEVER VIOLATE                                 ║
╠═══════════════════════════════════════════════════════════════════════════════╣
║                                                                               ║
║ 1. WAITER CANNOT SEE BILL AMOUNTS                                             ║
║    - Waiter can view orders but NOT billing:view_amount                       ║
║    - This prevents staff from knowing total spending                          ║
║                                                                               ║
║ 2. CUSTOMER SPENDING DATA HIDDEN FROM WAITER/CASHIER                          ║
║    - Only OWNER and MANAGER can see customers:view_spending                   ║
║    - Waiter/Cashier see: name, phone, tier, points only                      ║
║    - Hidden: total_spent, average_order_value, lifetime_value                ║
║                                                                               ║
║ 3. ONLY OWNER CAN MANAGE STAFF                                                ║
║    - Manager can view staff and manage shifts                                 ║
║    - Only Owner can create/delete staff accounts                              ║
║                                                                               ║
║ 4. DISCOUNTS REQUIRE MANAGER+                                                 ║
║    - Cashier can apply promo codes (validated by system)                      ║
║    - Manual discounts require Manager or Owner                                ║
║                                                                               ║
║ 5. REFUNDS REQUIRE MANAGER+                                                   ║
║    - Cashier cannot process refunds                                           ║
║    - Only Manager or Owner can refund                                         ║
║                                                                               ║
║ 6. VOID REQUIRES OWNER                                                        ║
║    - Only Owner can void bills                                                ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
```

---

# 7. DATABASE SCHEMA

## 7.1 Complete Prisma Schema
```prisma
// packages/database/prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ═══════════════════════════════════════════════════════════════════════════════
// ENUMS
// ═══════════════════════════════════════════════════════════════════════════════

enum LicenseTier {
  STARTER
  PROFESSIONAL
  ENTERPRISE
  UNLIMITED
}

enum LicenseStatus {
  ACTIVE
  EXPIRED
  SUSPENDED
  CANCELLED
}

enum RestaurantStatus {
  ACTIVE
  INACTIVE
  SUSPENDED
}

enum UserRole {
  SUPER_ADMIN
  OWNER
  MANAGER
  CASHIER
  WAITER
  KITCHEN
  HOST
}

enum UserStatus {
  ACTIVE
  INACTIVE
  SUSPENDED
}

enum TableStatus {
  AVAILABLE
  OCCUPIED
  RESERVED
  CLEANING
  BLOCKED
}

enum PricingType {
  SINGLE
  VARIANTS
}

enum SessionStatus {
  ACTIVE
  COMPLETED
  CANCELLED
}

enum OrderType {
  DINE_IN
  TAKEAWAY
  DELIVERY
  PHONE
}

enum OrderSource {
  QR
  STAFF
  PHONE
  ONLINE
}

enum OrderStatus {
  PENDING
  PENDING_CONFIRMATION
  CONFIRMED
  PREPARING
  READY
  SERVED
  COMPLETED
  CANCELLED
}

enum OrderItemStatus {
  PENDING
  SENT_TO_KITCHEN
  PREPARING
  READY
  SERVED
  CANCELLED
}

enum BillStatus {
  OPEN
  PARTIALLY_PAID
  PAID
  REFUNDED
  VOIDED
  CANCELLED
}

enum PaymentStatus {
  PENDING
  COMPLETED
  FAILED
  REFUNDED
}

enum PaymentMethod {
  CASH
  CARD
  QR_PAYMENT
  ESEWA
  KHALTI
  FONEPAY
  POINTS
  SPLIT
}

enum CustomerTier {
  BRONZE
  SILVER
  GOLD
  PLATINUM
}

enum CustomerStatus {
  ACTIVE
  INACTIVE
  BLOCKED
}

enum PointsTransactionType {
  EARN
  REDEEM
  BONUS
  EXPIRE
  ADJUST
}

enum PromotionType {
  HAPPY_HOUR
  COMBO
  BOGO
  FIRST_ORDER
  PROMO_CODE
  MIN_ORDER
  FESTIVAL
  ITEM_DISCOUNT
  LOYALTY_BONUS
}

enum DiscountType {
  PERCENTAGE
  FIXED
  FREE_ITEM
}

enum PromotionStatus {
  DRAFT
  ACTIVE
  PAUSED
  SCHEDULED
  EXPIRED
}

enum ShiftStatus {
  SCHEDULED
  IN_PROGRESS
  COMPLETED
  MISSED
  CANCELLED
}

enum AttendanceStatus {
  PRESENT
  ABSENT
  LATE
  HALF_DAY
  LEAVE
}

// ═══════════════════════════════════════════════════════════════════════════════
// LICENSE & MULTI-TENANT CORE
// ═══════════════════════════════════════════════════════════════════════════════

model License {
  id                    String         @id @default(cuid())
  license_key           String         @unique
  tier                  LicenseTier
  status                LicenseStatus  @default(ACTIVE)

  // Limits
  max_restaurants       Int            @default(1)
  max_staff_per_restaurant Int?        // null = unlimited
  max_tables_per_restaurant Int?       // null = unlimited
  cloud_storage_gb      Int            @default(0)

  // Features (JSON array of enabled feature keys)
  features              Json           @default("[]")

  // Validity
  activated_at          DateTime?
  expires_at            DateTime?      // null = lifetime

  // Tracking
  last_validated_at     DateTime?
  activation_count      Int            @default(0)
  max_activations       Int            @default(1)

  // Owner info
  owner_name            String
  owner_email           String
  owner_phone           String?

  // Relations
  restaurants           Restaurant[]

  created_at            DateTime       @default(now())
  updated_at            DateTime       @updatedAt

  @@index([license_key])
  @@index([status])
}

model Restaurant {
  id                    String             @id @default(cuid())
  license_id            String
  license               License            @relation(fields: [license_id], references: [id])

  // Basic info
  name                  String
  slug                  String             @unique
  description           String?
  logo_url              String?
  cover_image_url       String?

  // Contact
  address               String?
  city                  String?
  state                 String?
  country               String             @default("Nepal")
  postal_code           String?
  phone                 String?
  email                 String?
  website               String?

  // Configuration
  currency              String             @default("NPR")
  currency_symbol       String             @default("Rs.")
  timezone              String             @default("Asia/Kathmandu")

  // Tax configuration
  tax_enabled           Boolean            @default(true)
  tax_name              String             @default("VAT")
  tax_percentage        Decimal            @default(13) @db.Decimal(5, 2)
  tax_inclusive         Boolean            @default(false)

  service_charge_enabled Boolean           @default(true)
  service_charge_percentage Decimal        @default(10) @db.Decimal(5, 2)

  // Business hours (JSON)
  business_hours        Json               @default("{}")

  // Settings (JSON - all other settings)
  settings              Json               @default("{}")

  // Status
  status                RestaurantStatus   @default(ACTIVE)

  // Relations
  users                 User[]
  tables                Table[]
  categories            Category[]
  menu_items            MenuItem[]
  table_sessions        TableSession[]
  orders                Order[]
  bills                 Bill[]
  customers             Customer[]
  promotions            Promotion[]
  staff_shifts          StaffShift[]
  staff_attendance      StaffAttendance[]
  chat_messages         ChatMessage[]
  chat_groups           ChatGroup[]
  announcements         Announcement[]
  shift_notes           ShiftNote[]
  daily_briefings       DailyBriefing[]
  lost_found_items      LostFoundItem[]
  activity_logs         ActivityLog[]

  created_at            DateTime           @default(now())
  updated_at            DateTime           @updatedAt

  @@index([slug])
  @@index([status])
}

// ═══════════════════════════════════════════════════════════════════════════════
// USERS & AUTHENTICATION
// ═══════════════════════════════════════════════════════════════════════════════

model User {
  id                    String         @id @default(cuid())
  restaurant_id         String?        // null for SUPER_ADMIN
  restaurant            Restaurant?    @relation(fields: [restaurant_id], references: [id])

  // Authentication
  email                 String
  password_hash         String
  pin                   String?        // 4-digit PIN for quick login

  // Profile
  name                  String
  phone                 String?
  avatar_url            String?

  // Role & permissions
  role                  UserRole
  permissions           Json           @default("[]")  // Additional custom permissions

  // Status
  status                UserStatus     @default(ACTIVE)
  email_verified        Boolean        @default(false)

  // Tracking
  last_login_at         DateTime?
  last_activity_at      DateTime?
  failed_login_attempts Int            @default(0)
  locked_until          DateTime?

  // Password reset
  reset_token           String?
  reset_token_expires   DateTime?

  created_at            DateTime       @default(now())
  updated_at            DateTime       @updatedAt

  @@unique([restaurant_id, email])
  @@index([email])
  @@index([role])
}

model Session {
  id                    String         @id @default(cuid())
  user_id               String

  token                 String         @unique
  refresh_token         String         @unique

  ip_address            String?
  user_agent            String?
  device_info           Json?

  expires_at            DateTime
  refresh_expires_at    DateTime

  created_at            DateTime       @default(now())
  last_used_at          DateTime       @default(now())

  @@index([token])
  @@index([refresh_token])
  @@index([user_id])
}

// ═══════════════════════════════════════════════════════════════════════════════
// TABLES
// ═══════════════════════════════════════════════════════════════════════════════

model Table {
  id                    String         @id @default(cuid())
  restaurant_id         String
  restaurant            Restaurant     @relation(fields: [restaurant_id], references: [id])

  // Basic info
  table_number          String
  name                  String?        // "Window Seat", "VIP Room 1"
  capacity              Int            @default(4)

  // Location
  floor                 String?        // "Ground Floor", "1st Floor"
  section               String?        // "Main Hall", "Outdoor", "Private"

  // QR Code
  qr_code               String         @unique  // UUID for QR
  qr_code_url           String?        // Generated QR image URL

  // OTP
  current_otp           String?        // 3-digit OTP
  otp_generated_at      DateTime?
  otp_expires_at        DateTime?

  // Status
  status                TableStatus    @default(AVAILABLE)

  // Floor plan position
  position_x            Int?
  position_y            Int?
  width                 Int            @default(100)
  height                Int            @default(100)
  rotation              Int            @default(0)
  shape                 String         @default("rectangle")  // rectangle, circle, square

  // Current session reference
  current_session_id    String?        @unique

  // Relations
  sessions              TableSession[]

  // Soft delete
  is_deleted            Boolean        @default(false)
  deleted_at            DateTime?

  created_at            DateTime       @default(now())
  updated_at            DateTime       @updatedAt

  @@unique([restaurant_id, table_number])
  @@index([restaurant_id])
  @@index([status])
  @@index([qr_code])
}

// ═══════════════════════════════════════════════════════════════════════════════
// MENU
// ═══════════════════════════════════════════════════════════════════════════════

model Category {
  id                    String         @id @default(cuid())
  restaurant_id         String
  restaurant            Restaurant     @relation(fields: [restaurant_id], references: [id])

  // Basic info
  name                  String
  name_local            String?        // Nepali name
  description           String?

  // Image
  image_url             String?
  thumbnail_url         String?

  // Display
  sort_order            Int            @default(0)
  is_active             Boolean        @default(true)

  // Relations
  menu_items            MenuItem[]

  // Soft delete
  is_deleted            Boolean        @default(false)
  deleted_at            DateTime?

  created_at            DateTime       @default(now())
  updated_at            DateTime       @updatedAt

  @@unique([restaurant_id, name])
  @@index([restaurant_id])
  @@index([sort_order])
}

model MenuItem {
  id                    String         @id @default(cuid())
  restaurant_id         String
  restaurant            Restaurant     @relation(fields: [restaurant_id], references: [id])
  category_id           String
  category              Category       @relation(fields: [category_id], references: [id])

  // Basic info
  name                  String
  name_local            String?        // Nepali name
  description           String?

  // Images
  image_url             String?
  thumbnail_url         String?
  images                Json           @default("[]")  // Array of image URLs

  // ═══════════════════════════════════════════════════════════════════════════
  // PRICING
  // ═══════════════════════════════════════════════════════════════════════════
  pricing_type          PricingType    @default(SINGLE)
  base_price            Decimal        @db.Decimal(10, 2)

  // Variant groups (for VARIANTS pricing type)
  // Example: [{ "name": "Size", "required": true, "options": [
  //   { "name": "Small", "price": 250 },
  //   { "name": "Medium", "price": 350 },
  //   { "name": "Large", "price": 450 }
  // ]}]
  variant_groups        Json?

  // Add-ons (optional extras)
  // Example: [
  //   { "name": "Extra Cheese", "price": 50 },
  //   { "name": "Mushrooms", "price": 40 }
  // ]
  addons                Json?

  // ═══════════════════════════════════════════════════════════════════════════
  // PROPERTIES
  // ═══════════════════════════════════════════════════════════════════════════
  is_vegetarian         Boolean        @default(false)
  is_vegan              Boolean        @default(false)
  is_gluten_free        Boolean        @default(false)
  spice_level           Int?           // 0-5 (0 = not spicy, 5 = very spicy)
  allergens             String[]       @default([])  // ["nuts", "dairy", "gluten"]
  calories              Int?

  // ═══════════════════════════════════════════════════════════════════════════
  // AVAILABILITY
  // ═══════════════════════════════════════════════════════════════════════════
  is_available          Boolean        @default(true)
  available_from        String?        // "11:00" (HH:mm format)
  available_until       String?        // "22:00"
  available_days        String[]       @default(["mon", "tue", "wed", "thu", "fri", "sat", "sun"])

  // Stock
  track_stock           Boolean        @default(false)
  stock_quantity        Int?
  low_stock_threshold   Int?

  // ═══════════════════════════════════════════════════════════════════════════
  // KITCHEN
  // ═══════════════════════════════════════════════════════════════════════════
  prep_time_minutes     Int            @default(15)
  kitchen_station       String?        // "hot", "cold", "bar", "grill"
  kitchen_note          String?        // Special instructions for kitchen

  // ═══════════════════════════════════════════════════════════════════════════
  // DISPLAY
  // ═══════════════════════════════════════════════════════════════════════════
  sort_order            Int            @default(0)
  is_popular            Boolean        @default(false)
  is_new                Boolean        @default(false)
  is_featured           Boolean        @default(false)
  tags                  String[]       @default([])  // ["bestseller", "chef-special"]

  // ═══════════════════════════════════════════════════════════════════════════
  // STATS
  // ═══════════════════════════════════════════════════════════════════════════
  times_ordered         Int            @default(0)
  total_revenue         Decimal        @default(0) @db.Decimal(12, 2)
  average_rating        Decimal?       @db.Decimal(2, 1)

  // Relations
  order_items           OrderItem[]

  // Soft delete
  is_deleted            Boolean        @default(false)
  deleted_at            DateTime?

  created_at            DateTime       @default(now())
  updated_at            DateTime       @updatedAt

  @@index([restaurant_id])
  @@index([category_id])
  @@index([is_available])
  @@index([sort_order])
}

// ═══════════════════════════════════════════════════════════════════════════════
// TABLE SESSIONS
// ═══════════════════════════════════════════════════════════════════════════════

model TableSession {
  id                    String         @id @default(cuid())
  restaurant_id         String
  restaurant            Restaurant     @relation(fields: [restaurant_id], references: [id])
  table_id              String
  table                 Table          @relation(fields: [table_id], references: [id])

  // ═══════════════════════════════════════════════════════════════════════════
  // GUEST COUNT (Staff only enters this)
  // ═══════════════════════════════════════════════════════════════════════════
  guest_count           Int?           // null until staff enters
  guest_count_history   Json           @default("[]")  // Track changes
  // Example: [{ "count": 4, "set_by": "user_id", "set_at": "2024-01-01T10:00:00Z", "reason": "initial" }]

  // ═══════════════════════════════════════════════════════════════════════════
  // CUSTOMER LINK
  // ═══════════════════════════════════════════════════════════════════════════
  customer_id           String?
  customer              Customer?      @relation(fields: [customer_id], references: [id])
  customer_linked_by    String?        // "staff", "guest", "auto"

  // ═══════════════════════════════════════════════════════════════════════════
  // OTP VERIFICATION
  // ═══════════════════════════════════════════════════════════════════════════
  otp_code              String         // 3-digit OTP for this session
  otp_verified          Boolean        @default(false)
  otp_verified_at       DateTime?
  otp_attempts          Int            @default(0)

  // ═══════════════════════════════════════════════════════════════════════════
  // STATUS
  // ═══════════════════════════════════════════════════════════════════════════
  status                SessionStatus  @default(ACTIVE)

  // ═══════════════════════════════════════════════════════════════════════════
  // SESSION TRACKING
  // ═══════════════════════════════════════════════════════════════════════════
  started_by            String?        // User ID (if staff started)
  started_by_type       String?        // "staff", "qr_scan"
  waiter_id             String?        // Assigned waiter

  // Timestamps
  started_at            DateTime       @default(now())
  ended_at              DateTime?

  // Notes
  notes                 String?

  // Relations
  orders                Order[]

  created_at            DateTime       @default(now())
  updated_at            DateTime       @updatedAt

  @@index([restaurant_id])
  @@index([table_id])
  @@index([status])
}

// ═══════════════════════════════════════════════════════════════════════════════
// ORDERS
// ═══════════════════════════════════════════════════════════════════════════════

model Order {
  id                    String         @id @default(cuid())
  restaurant_id         String
  restaurant            Restaurant     @relation(fields: [restaurant_id], references: [id])

  // Order number (display)
  order_number          String         // "ORD-0001"

  // Session & Table
  session_id            String?
  session               TableSession?  @relation(fields: [session_id], references: [id])
  table_id              String?
  table_number          String?        // Denormalized for display

  // Customer
  customer_id           String?
  customer              Customer?      @relation(fields: [customer_id], references: [id])
  customer_name         String?        // Denormalized
  customer_phone        String?        // Denormalized

  // ═══════════════════════════════════════════════════════════════════════════
  // ORDER TYPE & SOURCE
  // ═══════════════════════════════════════════════════════════════════════════
  order_type            OrderType      @default(DINE_IN)
  order_source          OrderSource    @default(QR)

  // ═══════════════════════════════════════════════════════════════════════════
  // STATUS
  // ═══════════════════════════════════════════════════════════════════════════
  status                OrderStatus    @default(PENDING)

  // ═══════════════════════════════════════════════════════════════════════════
  // HYBRID FLOW - STAFF CONFIRMATION
  // ═══════════════════════════════════════════════════════════════════════════
  requires_confirmation Boolean        @default(false)
  confirmed_at          DateTime?
  confirmed_by          String?        // User ID
  rejected_at           DateTime?
  rejected_by           String?        // User ID
  rejection_reason      String?

  // ═══════════════════════════════════════════════════════════════════════════
  // ITEMS
  // ═══════════════════════════════════════════════════════════════════════════
  items                 OrderItem[]
  item_count            Int            @default(0)

  // ═══════════════════════════════════════════════════════════════════════════
  // PRICING
  // ═══════════════════════════════════════════════════════════════════════════
  subtotal              Decimal        @db.Decimal(10, 2)
  discount_amount       Decimal        @default(0) @db.Decimal(10, 2)
  discount_reason       String?
  tax_amount            Decimal        @default(0) @db.Decimal(10, 2)
  service_charge        Decimal        @default(0) @db.Decimal(10, 2)
  total_amount          Decimal        @db.Decimal(10, 2)

  // ═══════════════════════════════════════════════════════════════════════════
  // PROMOTIONS
  // ═══════════════════════════════════════════════════════════════════════════
  promo_code            String?
  promotion_id          String?
  promotion_discount    Decimal        @default(0) @db.Decimal(10, 2)

  // ═══════════════════════════════════════════════════════════════════════════
  // LOYALTY POINTS
  // ═══════════════════════════════════════════════════════════════════════════
  points_earned         Int            @default(0)
  points_redeemed       Int            @default(0)
  points_discount       Decimal        @default(0) @db.Decimal(10, 2)

  // ═══════════════════════════════════════════════════════════════════════════
  // INSTRUCTIONS
  // ═══════════════════════════════════════════════════════════════════════════
  special_instructions  String?

  // ═══════════════════════════════════════════════════════════════════════════
  // TIMESTAMPS
  // ═══════════════════════════════════════════════════════════════════════════
  placed_at             DateTime       @default(now())
  confirmed_time        DateTime?
  preparing_at          DateTime?
  ready_at              DateTime?
  served_at             DateTime?
  completed_at          DateTime?
  cancelled_at          DateTime?

  // ═══════════════════════════════════════════════════════════════════════════
  // STAFF
  // ═══════════════════════════════════════════════════════════════════════════
  placed_by             String?        // User ID (if staff placed)
  placed_by_type        String?        // "staff", "guest"
  served_by             String?        // User ID
  cancelled_by          String?        // User ID
  cancellation_reason   String?

  // Relations
  bill                  Bill?

  created_at            DateTime       @default(now())
  updated_at            DateTime       @updatedAt

  @@unique([restaurant_id, order_number])
  @@index([restaurant_id])
  @@index([session_id])
  @@index([status])
  @@index([placed_at])
}

model OrderItem {
  id                    String             @id @default(cuid())
  order_id              String
  order                 Order              @relation(fields: [order_id], references: [id], onDelete: Cascade)

  menu_item_id          String
  menu_item             MenuItem           @relation(fields: [menu_item_id], references: [id])

  // Item details (denormalized for history)
  item_name             String
  item_name_local       String?

  // Quantity & Price
  quantity              Int
  unit_price            Decimal            @db.Decimal(10, 2)
  total_price           Decimal            @db.Decimal(10, 2)

  // ═══════════════════════════════════════════════════════════════════════════
  // VARIANTS & ADDONS
  // ═══════════════════════════════════════════════════════════════════════════
  // Example: [{ "group": "Size", "option": "Large", "price": 450 }]
  selected_variants     Json?

  // Example: [{ "name": "Extra Cheese", "price": 50 }]
  selected_addons       Json?

  // ═══════════════════════════════════════════════════════════════════════════
  // STATUS
  // ═══════════════════════════════════════════════════════════════════════════
  status                OrderItemStatus    @default(PENDING)

  // ═══════════════════════════════════════════════════════════════════════════
  // KITCHEN
  // ═══════════════════════════════════════════════════════════════════════════
  kitchen_station       String?
  sent_to_kitchen_at    DateTime?
  preparing_at          DateTime?
  ready_at              DateTime?
  served_at             DateTime?

  // ═══════════════════════════════════════════════════════════════════════════
  // NOTES
  // ═══════════════════════════════════════════════════════════════════════════
  special_requests      String?
  kitchen_notes         String?

  created_at            DateTime           @default(now())
  updated_at            DateTime           @updatedAt

  @@index([order_id])
  @@index([menu_item_id])
  @@index([status])
}

// ═══════════════════════════════════════════════════════════════════════════════
// BILLING & PAYMENTS
// ═══════════════════════════════════════════════════════════════════════════════

model Bill {
  id                    String         @id @default(cuid())
  restaurant_id         String
  restaurant            Restaurant     @relation(fields: [restaurant_id], references: [id])

  // Bill number (display)
  bill_number           String         // "BILL-0001"

  // Order link
  order_id              String         @unique
  order                 Order          @relation(fields: [order_id], references: [id])

  // Session & Customer
  session_id            String?
  customer_id           String?
  customer_name         String?
  customer_phone        String?

  // Table
  table_number          String?

  // ═══════════════════════════════════════════════════════════════════════════
  // AMOUNTS
  // ═══════════════════════════════════════════════════════════════════════════
  subtotal              Decimal        @db.Decimal(10, 2)
  discount_amount       Decimal        @default(0) @db.Decimal(10, 2)
  discount_reason       String?
  tax_amount            Decimal        @db.Decimal(10, 2)
  tax_percentage        Decimal        @db.Decimal(5, 2)
  service_charge        Decimal        @db.Decimal(10, 2)
  service_charge_percentage Decimal    @db.Decimal(5, 2)
  total_amount          Decimal        @db.Decimal(10, 2)

  // Rounding
  round_off             Decimal        @default(0) @db.Decimal(10, 2)
  final_amount          Decimal        @db.Decimal(10, 2)

  // ═══════════════════════════════════════════════════════════════════════════
  // PAYMENT
  // ═══════════════════════════════════════════════════════════════════════════
  payment_status        PaymentStatus  @default(PENDING)
  payment_method        PaymentMethod?
  paid_amount           Decimal        @default(0) @db.Decimal(10, 2)
  due_amount            Decimal        @db.Decimal(10, 2)

  // ═══════════════════════════════════════════════════════════════════════════
  // POINTS
  // ═══════════════════════════════════════════════════════════════════════════
  points_earned         Int            @default(0)
  points_redeemed       Int            @default(0)
  points_discount       Decimal        @default(0) @db.Decimal(10, 2)

  // ═══════════════════════════════════════════════════════════════════════════
  // STATUS
  // ═══════════════════════════════════════════════════════════════════════════
  status                BillStatus     @default(OPEN)

  // ═══════════════════════════════════════════════════════════════════════════
  // STAFF
  // ═══════════════════════════════════════════════════════════════════════════
  generated_by          String?        // User ID
  settled_by            String?        // User ID
  voided_by             String?        // User ID
  void_reason           String?

  // ═══════════════════════════════════════════════════════════════════════════
  // TIMESTAMPS
  // ═══════════════════════════════════════════════════════════════════════════
  generated_at          DateTime       @default(now())
  settled_at            DateTime?
  voided_at             DateTime?

  // Print count
  print_count           Int            @default(0)
  last_printed_at       DateTime?

  // Relations
  payments              Payment[]

  created_at            DateTime       @default(now())
  updated_at            DateTime       @updatedAt

  @@unique([restaurant_id, bill_number])
  @@index([restaurant_id])
  @@index([status])
  @@index([generated_at])
}

model Payment {
  id                    String         @id @default(cuid())
  bill_id               String
  bill                  Bill           @relation(fields: [bill_id], references: [id])

  // Amount
  amount                Decimal        @db.Decimal(10, 2)
  method                PaymentMethod

  // For card/digital payments
  transaction_id        String?
  reference             String?
  gateway_response      Json?

  // For cash
  cash_received         Decimal?       @db.Decimal(10, 2)
  change_given          Decimal?       @db.Decimal(10, 2)

  // Status
  status                PaymentStatus  @default(COMPLETED)

  // Refund
  refunded              Boolean        @default(false)
  refunded_at           DateTime?
  refund_reason         String?
  refund_amount         Decimal?       @db.Decimal(10, 2)

  // Staff
  processed_by          String?        // User ID
  processed_at          DateTime       @default(now())

  created_at            DateTime       @default(now())

  @@index([bill_id])
  @@index([method])
}

// ═══════════════════════════════════════════════════════════════════════════════
// CUSTOMERS & LOYALTY
// ═══════════════════════════════════════════════════════════════════════════════

model Customer {
  id                    String         @id @default(cuid())
  restaurant_id         String
  restaurant            Restaurant     @relation(fields: [restaurant_id], references: [id])

  // Customer ID (display)
  customer_id           String         // "CUST-0001"

  // ═══════════════════════════════════════════════════════════════════════════
  // BASIC INFO
  // ═══════════════════════════════════════════════════════════════════════════
  name                  String
  phone                 String
  email                 String?
  date_of_birth         DateTime?
  gender                String?        // "male", "female", "other"
  anniversary           DateTime?

  // ═══════════════════════════════════════════════════════════════════════════
  // AUTHENTICATION
  // ═══════════════════════════════════════════════════════════════════════════
  phone_verified        Boolean        @default(false)
  mpin_hash             String?        // 4-digit MPIN
  mpin_set_at           DateTime?
  mpin_attempts         Int            @default(0)
  mpin_locked_until     DateTime?

  // Verification
  verification_method   String?        // "staff", "sms_otp"
  verified_at           DateTime?
  verified_by           String?        // User ID (if staff verified)

  // ═══════════════════════════════════════════════════════════════════════════
  // LOYALTY - VISIBLE TO CUSTOMER
  // ═══════════════════════════════════════════════════════════════════════════
  tier                  CustomerTier   @default(BRONZE)
  points_balance        Int            @default(0)
  points_earned_lifetime Int           @default(0)
  points_redeemed_lifetime Int         @default(0)

  // ═══════════════════════════════════════════════════════════════════════════
  // SPENDING DATA - HIDDEN FROM CUSTOMER (Owner/Manager only)
  // ═══════════════════════════════════════════════════════════════════════════
  total_spent           Decimal        @default(0) @db.Decimal(12, 2)
  total_visits          Int            @default(0)
  average_order_value   Decimal        @default(0) @db.Decimal(10, 2)
  last_visit_at         DateTime?

  // ═══════════════════════════════════════════════════════════════════════════
  // PREFERENCES
  // ═══════════════════════════════════════════════════════════════════════════
  favorite_items        String[]       @default([])  // Menu item IDs
  preferred_tables      String[]       @default([])  // Table IDs
  dietary_preferences   String[]       @default([])  // ["vegetarian", "no-pork"]
  allergies             String[]       @default([])  // ["nuts", "dairy"]

  // ═══════════════════════════════════════════════════════════════════════════
  // COMMUNICATION
  // ═══════════════════════════════════════════════════════════════════════════
  sms_opt_in            Boolean        @default(true)
  email_opt_in          Boolean        @default(true)

  // ═══════════════════════════════════════════════════════════════════════════
  // REFERRAL
  // ═══════════════════════════════════════════════════════════════════════════
  referral_code         String?        @unique  // "RAMESH100"
  referred_by           String?        // Customer ID who referred
  referral_count        Int            @default(0)

  // ═══════════════════════════════════════════════════════════════════════════
  // STATUS
  // ═══════════════════════════════════════════════════════════════════════════
  status                CustomerStatus @default(ACTIVE)

  // Relations
  trusted_devices       CustomerDevice[]
  notes                 CustomerNote[]
  points_transactions   PointsTransaction[]
  sessions              TableSession[]
  orders                Order[]

  created_at            DateTime       @default(now())
  updated_at            DateTime       @updatedAt

  @@unique([restaurant_id, phone])
  @@unique([restaurant_id, customer_id])
  @@index([restaurant_id])
  @@index([phone])
  @@index([tier])
}

model CustomerDevice {
  id                    String         @id @default(cuid())
  customer_id           String
  customer              Customer       @relation(fields: [customer_id], references: [id], onDelete: Cascade)

  device_fingerprint    String
  device_name           String?
  device_info           Json?

  trusted_until         DateTime
  is_active             Boolean        @default(true)

  first_seen_at         DateTime       @default(now())
  last_seen_at          DateTime       @default(now())

  created_at            DateTime       @default(now())

  @@unique([customer_id, device_fingerprint])
  @@index([customer_id])
}

model CustomerNote {
  id                    String         @id @default(cuid())
  customer_id           String
  customer              Customer       @relation(fields: [customer_id], references: [id], onDelete: Cascade)

  note                  String
  added_by              String         // User ID
  added_by_name         String?

  created_at            DateTime       @default(now())

  @@index([customer_id])
}

model PointsTransaction {
  id                    String                   @id @default(cuid())
  customer_id           String
  customer              Customer                 @relation(fields: [customer_id], references: [id], onDelete: Cascade)

  type                  PointsTransactionType
  points                Int                      // Positive for earn, negative for redeem
  balance_after         Int

  // For EARN
  order_id              String?
  order_amount          Decimal?                 @db.Decimal(10, 2)
  multiplier            Decimal?                 @db.Decimal(3, 2)  // 1.00, 1.25, 1.50, 2.00

  // For REDEEM
  bill_id               String?
  discount_amount       Decimal?                 @db.Decimal(10, 2)

  // For BONUS
  bonus_type            String?                  // "welcome", "birthday", "referral", "manual"

  // For ADJUST/EXPIRE
  reason                String?
  adjusted_by           String?                  // User ID

  // Expiry
  expires_at            DateTime?
  expired               Boolean                  @default(false)

  created_at            DateTime                 @default(now())

  @@index([customer_id])
  @@index([type])
  @@index([created_at])
}

// ═══════════════════════════════════════════════════════════════════════════════
// PROMOTIONS
// ═══════════════════════════════════════════════════════════════════════════════

model Promotion {
  id                    String             @id @default(cuid())
  restaurant_id         String
  restaurant            Restaurant         @relation(fields: [restaurant_id], references: [id])

  // Basic info
  name                  String
  description           String?
  internal_note         String?            // Staff only

  type                  PromotionType

  // ═══════════════════════════════════════════════════════════════════════════
  // DISCOUNT
  // ═══════════════════════════════════════════════════════════════════════════
  discount_type         DiscountType
  discount_value        Decimal            @db.Decimal(10, 2)
  max_discount          Decimal?           @db.Decimal(10, 2)

  // ═══════════════════════════════════════════════════════════════════════════
  // APPLIES TO
  // ═══════════════════════════════════════════════════════════════════════════
  applies_to            String             @default("all")  // "all", "categories", "items"
  category_ids          String[]           @default([])
  item_ids              String[]           @default([])

  // ═══════════════════════════════════════════════════════════════════════════
  // TYPE-SPECIFIC CONFIG
  // ═══════════════════════════════════════════════════════════════════════════

  // For COMBO
  combo_items           Json?              // [{ category: "burgers", item_ids: [], required: true }]
  combo_price           Decimal?           @db.Decimal(10, 2)

  // For BOGO
  bogo_buy_quantity     Int?
  bogo_get_quantity     Int?
  bogo_get_discount     Decimal?           @db.Decimal(5, 2)  // Percentage off the "get" item
  bogo_same_item        Boolean            @default(true)
  bogo_get_items        String[]           @default([])

  // For PROMO_CODE
  promo_code            String?

  // For MIN_ORDER
  min_order_tiers       Json?              // [{ min: 500, discount: 5 }, { min: 1000, discount: 10 }]

  // ═══════════════════════════════════════════════════════════════════════════
  // CONDITIONS
  // ═══════════════════════════════════════════════════════════════════════════
  min_order_amount      Decimal?           @db.Decimal(10, 2)

  // ═══════════════════════════════════════════════════════════════════════════
  // SCHEDULE
  // ═══════════════════════════════════════════════════════════════════════════
  start_date            DateTime?
  end_date              DateTime?
  days_of_week          String[]           @default(["mon", "tue", "wed", "thu", "fri", "sat", "sun"])
  start_time            String?            // "15:00"
  end_time              String?            // "18:00"

  // ═══════════════════════════════════════════════════════════════════════════
  // LIMITS
  // ═══════════════════════════════════════════════════════════════════════════
  total_uses_limit      Int?               // null = unlimited
  total_uses_count      Int                @default(0)
  per_customer_limit    Int?               // null = unlimited

  // ═══════════════════════════════════════════════════════════════════════════
  // ELIGIBILITY
  // ═══════════════════════════════════════════════════════════════════════════
  customer_eligibility  String             @default("all")  // "all", "members", "new", "tier"
  eligible_tiers        String[]           @default([])     // ["gold", "platinum"]

  // ═══════════════════════════════════════════════════════════════════════════
  // DISPLAY
  // ═══════════════════════════════════════════════════════════════════════════
  show_on_menu          Boolean            @default(true)
  show_countdown        Boolean            @default(false)
  banner_message        String?
  banner_image_url      String?
  theme                 String?            // "default", "festive", "happy-hour"

  // ═══════════════════════════════════════════════════════════════════════════
  // STATUS
  // ═══════════════════════════════════════════════════════════════════════════
  status                PromotionStatus    @default(ACTIVE)

  // ═══════════════════════════════════════════════════════════════════════════
  // STATS
  // ═══════════════════════════════════════════════════════════════════════════
  times_used            Int                @default(0)
  total_discount_given  Decimal            @default(0) @db.Decimal(12, 2)

  // Relations
  usages                PromotionUsage[]

  created_by            String?
  created_at            DateTime           @default(now())
  updated_at            DateTime           @updatedAt

  @@unique([restaurant_id, promo_code])
  @@index([restaurant_id])
  @@index([status])
  @@index([type])
}

model PromotionUsage {
  id                    String         @id @default(cuid())
  promotion_id          String
  promotion             Promotion      @relation(fields: [promotion_id], references: [id])

  order_id              String
  customer_id           String?

  discount_amount       Decimal        @db.Decimal(10, 2)
  original_amount       Decimal        @db.Decimal(10, 2)
  final_amount          Decimal        @db.Decimal(10, 2)

  used_at               DateTime       @default(now())

  @@index([promotion_id])
  @@index([order_id])
}

// ═══════════════════════════════════════════════════════════════════════════════
// STAFF MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════════

model StaffShift {
  id                    String         @id @default(cuid())
  restaurant_id         String
  restaurant            Restaurant     @relation(fields: [restaurant_id], references: [id])
  user_id               String

  shift_date            DateTime       @db.Date
  shift_type            String         // "morning", "afternoon", "night", "full"

  scheduled_start       DateTime
  scheduled_end         DateTime

  actual_start          DateTime?
  actual_end            DateTime?

  clock_in_method       String?        // "pin", "biometric", "manual"
  clock_out_method      String?

  status                ShiftStatus    @default(SCHEDULED)

  break_minutes         Int            @default(0)
  overtime_minutes      Int            @default(0)

  notes                 String?

  created_at            DateTime       @default(now())
  updated_at            DateTime       @updatedAt

  @@index([restaurant_id])
  @@index([user_id])
  @@index([shift_date])
}

model StaffAttendance {
  id                    String             @id @default(cuid())
  restaurant_id         String
  restaurant            Restaurant         @relation(fields: [restaurant_id], references: [id])
  user_id               String

  date                  DateTime           @db.Date

  clock_in              DateTime?
  clock_out             DateTime?

  clock_in_method       String?
  clock_out_method      String?

  total_hours           Decimal?           @db.Decimal(4, 2)
  break_minutes         Int                @default(0)
  overtime_minutes      Int                @default(0)

  status                AttendanceStatus   @default(PRESENT)

  notes                 String?
  approved_by           String?

  created_at            DateTime           @default(now())
  updated_at            DateTime           @updatedAt

  @@unique([restaurant_id, user_id, date])
  @@index([restaurant_id])
  @@index([user_id])
  @@index([date])
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMMUNICATION
// ═══════════════════════════════════════════════════════════════════════════════

model ChatMessage {
  id                    String         @id @default(cuid())
  restaurant_id         String
  restaurant            Restaurant     @relation(fields: [restaurant_id], references: [id])

  chat_type             String         // "direct", "group"
  chat_id               String         // Group ID or conversation ID (sorted user IDs)

  sender_id             String
  sender_name           String?

  message_text          String
  attachments           Json?          // [{ type: "image", url: "..." }]

  read_by               String[]       @default([])

  sent_at               DateTime       @default(now())

  created_at            DateTime       @default(now())

  @@index([restaurant_id])
  @@index([chat_id])
  @@index([sent_at])
}

model ChatGroup {
  id                    String         @id @default(cuid())
  restaurant_id         String
  restaurant            Restaurant     @relation(fields: [restaurant_id], references: [id])

  name                  String
  type                  String         // "system", "custom"
  members               String[]       @default([])

  created_by            String?
  created_at            DateTime       @default(now())

  @@index([restaurant_id])
}

model Announcement {
  id                    String         @id @default(cuid())
  restaurant_id         String
  restaurant            Restaurant     @relation(fields: [restaurant_id], references: [id])

  title                 String
  message               String

  priority              String         @default("normal")  // "normal", "important", "urgent"

  recipients            String         @default("all")     // "all" or JSON array of user IDs or roles

  require_read_confirmation Boolean    @default(false)
  read_by               String[]       @default([])

  pinned                Boolean        @default(false)

  scheduled_at          DateTime?
  published_at          DateTime?

  created_by            String
  created_at            DateTime       @default(now())

  @@index([restaurant_id])
  @@index([published_at])
}

model ShiftNote {
  id                    String         @id @default(cuid())
  restaurant_id         String
  restaurant            Restaurant     @relation(fields: [restaurant_id], references: [id])

  shift_date            DateTime       @db.Date
  shift_type            String         // "morning", "afternoon", "night"

  notes                 String
  tags                  String[]       @default([])  // ["pending_order", "equipment", "customer"]

  written_by            String
  written_by_name       String?

  read_by               String[]       @default([])

  created_at            DateTime       @default(now())

  @@index([restaurant_id])
  @@index([shift_date])
}

model DailyBriefing {
  id                    String         @id @default(cuid())
  restaurant_id         String
  restaurant            Restaurant     @relation(fields: [restaurant_id], references: [id])

  date                  DateTime       @db.Date

  expected_covers       Int?
  reservations_count    Int?
  special_events        String?

  specials              Json?          // [{ name: "Grilled Salmon", price: 850 }]
  eighty_sixed          String[]       @default([])  // Out of stock items

  staff_notes           String[]       @default([])
  goals                 String[]       @default([])
  manager_message       String?

  read_by               String[]       @default([])

  published_by          String?
  published_at          DateTime?

  created_at            DateTime       @default(now())
  updated_at            DateTime       @updatedAt

  @@unique([restaurant_id, date])
  @@index([restaurant_id])
  @@index([date])
}

model LostFoundItem {
  id                    String         @id @default(cuid())
  restaurant_id         String
  restaurant            Restaurant     @relation(fields: [restaurant_id], references: [id])

  category              String         // "phone", "wallet", "keys", "glasses", "clothing", "bag", "jewelry", "other"
  description           String

  found_at              String         // Location (e.g., "Table 5", "Restroom")
  found_by              String         // User ID
  found_by_name         String?
  found_at_time         DateTime

  storage_location      String         // Where it's stored

  photo_url             String?
  notes                 String?

  status                String         @default("unclaimed")  // "unclaimed", "claimed", "disposed"

  // Claim details
  claimed_by_name       String?
  claimed_by_phone      String?
  claimed_at            DateTime?
  handed_over_by        String?
  verification_notes    String?

  // Disposal details
  disposed_at           DateTime?
  disposed_reason       String?

  created_at            DateTime       @default(now())
  updated_at            DateTime       @updatedAt

  @@index([restaurant_id])
  @@index([status])
}

// ═══════════════════════════════════════════════════════════════════════════════
// ACTIVITY LOG
// ═══════════════════════════════════════════════════════════════════════════════

model ActivityLog {
  id                    String         @id @default(cuid())
  restaurant_id         String
  restaurant            Restaurant     @relation(fields: [restaurant_id], references: [id])

  user_id               String?
  user_name             String?
  user_role             String?

  action                String         // "order.created", "table.status_changed", etc.
  entity_type           String         // "order", "table", "customer", "bill", etc.
  entity_id             String?

  details               Json?          // Additional context

  ip_address            String?
  user_agent            String?

  created_at            DateTime       @default(now())

  @@index([restaurant_id])
  @@index([entity_type, entity_id])
  @@index([user_id])
  @@index([created_at])
}

// ═══════════════════════════════════════════════════════════════════════════════
// SMS LOGS
// ═══════════════════════════════════════════════════════════════════════════════

model SmsLog {
  id                    String         @id @default(cuid())
  restaurant_id         String

  phone                 String
  message_type          String         // "otp", "marketing", "birthday", "notification"
  message_text          String

  provider              String         // "sparrow", "aakash"
  message_id            String?
  status                String         // "sent", "delivered", "failed"
  error_message         String?

  credits_consumed      Int            @default(1)

  sent_at               DateTime       @default(now())
  delivered_at          DateTime?

  created_at            DateTime       @default(now())

  @@index([restaurant_id])
  @@index([phone])
  @@index([sent_at])
}

// ═══════════════════════════════════════════════════════════════════════════════
// SETTINGS (Restaurant-specific settings)
// ═══════════════════════════════════════════════════════════════════════════════

model RestaurantSettings {
  id                    String         @id @default(cuid())
  restaurant_id         String         @unique

  // ═══════════════════════════════════════════════════════════════════════════
  // ORDER SETTINGS
  // ═══════════════════════════════════════════════════════════════════════════
  require_confirmation_no_session     Boolean @default(true)
  require_confirmation_active_session Boolean @default(false)
  confirmation_timeout_minutes        Int     @default(5)
  timeout_action                      String  @default("escalate")  // "auto_confirm", "escalate", "notify_guest"

  // ═══════════════════════════════════════════════════════════════════════════
  // GUEST COUNT SETTINGS
  // ═══════════════════════════════════════════════════════════════════════════
  guest_count_entry_roles             String[] @default(["WAITER", "HOST", "MANAGER"])
  guest_count_update_roles            String[] @default(["WAITER", "MANAGER"])
  require_reason_for_guest_count_update Boolean @default(false)

  // ═══════════════════════════════════════════════════════════════════════════
  // QUICK ORDER SETTINGS
  // ═══════════════════════════════════════════════════════════════════════════
  quick_order_enabled                 Boolean  @default(true)
  quick_order_roles                   String[] @default(["WAITER", "MANAGER"])
  frequent_items_count                Int      @default(10)
  quick_tags                          String[] @default(["Less spicy", "Extra spicy", "No onion", "No ice", "Rush", "VIP"])

  // ═══════════════════════════════════════════════
  ════════════════════════════
// LOYALTY SETTINGS
// ═══════════════════════════════════════════════════════════════════════════
loyalty_enabled                     Boolean  @default(true)
points_per_amount                   Int      @default(10)  // 1 point per Rs. 10
points_redemption_value             Decimal  @default(1) @db.Decimal(5, 2)  // 1 point = Rs. 1
min_order_for_redemption            Decimal  @default(500) @db.Decimal(10, 2)
max_redemption_percentage           Int      @default(50)  // Max 50% of bill
points_expiry_months                Int      @default(12)
// Tier thresholds (in points, as customers see)
silver_threshold                    Int      @default(500)
gold_threshold                      Int      @default(1500)
platinum_threshold                  Int      @default(5000)
// Tier multipliers
bronze_multiplier                   Decimal  @default(1.0) @db.Decimal(3, 2)
silver_multiplier                   Decimal  @default(1.25) @db.Decimal(3, 2)
gold_multiplier                     Decimal  @default(1.5) @db.Decimal(3, 2)
platinum_multiplier                 Decimal  @default(2.0) @db.Decimal(3, 2)
// ═══════════════════════════════════════════════════════════════════════════
// POINTS DISPLAY SETTINGS
// ═══════════════════════════════════════════════════════════════════════════
show_points_on_menu                 Boolean  @default(true)
show_points_on_cart                 Boolean  @default(true)
show_points_on_addons               Boolean  @default(true)
show_multiplier_badge               Boolean  @default(true)
show_join_prompt_to_non_members     Boolean  @default(true)
points_icon                         String   @default("💰")
// ═══════════════════════════════════════════════════════════════════════════
// VERIFICATION SETTINGS
// ═══════════════════════════════════════════════════════════════════════════
primary_verification_method         String   @default("staff")  // "staff", "sms_otp"
allow_customer_verification_choice  Boolean  @default(true)
mpin_required                       Boolean  @default(true)
mpin_length                         Int      @default(4)
device_trust_days                   Int      @default(90)
max_trusted_devices                 Int      @default(3)
// ═══════════════════════════════════════════════════════════════════════════
// SMS SETTINGS
// ═══════════════════════════════════════════════════════════════════════════
sms_provider                        String?  // "sparrow", "aakash", null
sms_api_token                       String?
sms_sender_id                       String?
otp_length                          Int      @default(4)
otp_validity_minutes                Int      @default(5)
otp_max_attempts                    Int      @default(3)
otp_resend_cooldown_seconds         Int      @default(60)
// ═══════════════════════════════════════════════════════════════════════════
// NOTIFICATION SETTINGS
// ═══════════════════════════════════════════════════════════════════════════
notify_waiter_new_order             Boolean  @default(true)
notify_kitchen_new_order            Boolean  @default(true)
notify_manager_order_delay          Boolean  @default(true)
order_delay_threshold_minutes       Int      @default(15)
// ═══════════════════════════════════════════════════════════════════════════
// PRINTING SETTINGS
// ═══════════════════════════════════════════════════════════════════════════
auto_print_kot                      Boolean  @default(false)
auto_print_bill                     Boolean  @default(false)
kot_printer_name                    String?
bill_printer_name                   String?
receipt_header                      String?
receipt_footer                      String?
created_at                          DateTime @default(now())
updated_at                          DateTime @updatedAt
}
// ═══════════════════════════════════════════════════════════════════════════════
// BACKUP LOGS
// ═══════════════════════════════════════════════════════════════════════════════
model BackupLog {
id                    String         @id @default(cuid())
restaurant_id         String?        // null for system-wide backups
type                  String         // "local", "cloud"
status                String         // "in_progress", "completed", "failed"
file_name             String?
file_size_bytes       BigInt?
file_path             String?        // Local path or cloud URL
includes_database     Boolean        @default(true)
includes_uploads      Boolean        @default(true)
includes_config       Boolean        @default(true)
started_at            DateTime       @default(now())
completed_at          DateTime?
error_message         String?
triggered_by          String?        // "scheduled", "manual", user ID
created_at            DateTime       @default(now())
@@index([restaurant_id])
@@index([type])
@@index([status])
}
---

# 8. FEATURE SPECIFICATIONS

## 8.1 Table Management

### Table Statuses

| Status | Color | Description | Can Order |
|--------|-------|-------------|-----------|
| AVAILABLE | 🟢 Green | Ready for guests | No |
| OCCUPIED | 🔵 Blue | Guests seated, session active | Yes |
| RESERVED | 🟣 Purple | Upcoming reservation | No |
| CLEANING | 🟡 Yellow | Being cleaned after guests | No |
| BLOCKED | 🔴 Red | Not available (maintenance, etc.) | No |

### Table Status Flow
┌─────────────────────────────────────────────────────────────┐
│ GUEST QR ORDERING - COMPLETE FLOW                           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. SCAN QR CODE                                            │
│     └── Guest scans QR on table                             │
│                                                             │
│  2. ENTER OTP                                               │
│     └── Guest enters 3-digit OTP from table tent           │
│     └── If wrong 3 times → Auto-call waiter                │
│                                                             │
│  3. OTP VERIFIED                                            │
│     └── Session linked to device                           │
│     └── Check if session exists (guest count set)          │
│                                                             │
│  4. BROWSE MENU (Immediate - no waiting)                    │
│     └── View categories                                     │
│     └── View items with images, prices, points             │
│     └── See variants, add-ons                              │
│                                                             │
│  5. ADD TO CART                                             │
│     └── Select variants (required)                         │
│     └── Select add-ons (optional)                          │
│     └── Add special instructions                           │
│     └── See points to earn                                 │
│                                                             │
│  6. PLACE ORDER                                             │
│     ├── IF session active (guest count set):               │
│     │   └── Order goes DIRECTLY to kitchen                 │
│     │                                                       │
│     └── IF no session (guest count NOT set):               │
│         └── Order status = PENDING_CONFIRMATION            │
│         └── Waiter receives notification                   │
│         └── Guest sees "Waiting for confirmation..."       │
│                                                             │
│  7. WAITER CONFIRMATION (Hybrid Flow)                       │
│     └── Waiter sees order                                  │
│     └── Waiter enters guest count (REQUIRED)               │
│     └── Waiter can modify order if needed                  │
│     └── Waiter confirms → Order to kitchen                 │
│     └── Guest notified "Order confirmed!"                  │
│                                                             │
│  8. TRACK ORDER                                             │
│     └── Real-time status updates                           │
│     └── PREPARING → READY → SERVED                         │
│                                                             │
│  9. REQUEST BILL                                            │
│     └── Guest taps "Request Bill"                          │
│     └── Waiter/Cashier receives notification               │
│                                                             │
│  10. PAYMENT                                                │
│      └── Pay at table (cash/card)                          │
│      └── Pay at counter                                    │
│      └── Points earned automatically                       │
│                                                             │
│  11. FEEDBACK (Optional)                                    │
│      └── Rate experience                                   │
│      └── Earn bonus points for feedback                    │
│                                                             │
└─────────────────────────────────────────────────────────────┘

### Key Rules
╔═══════════════════════════════════════════════════════════════════════════════╗
║ ⚠️  GUEST ORDERING RULES                                                      ║
╠═══════════════════════════════════════════════════════════════════════════════╣
║                                                                               ║
║ 1. GUEST CAN BROWSE MENU IMMEDIATELY                                          ║
║    - No need to wait for waiter                                               ║
║    - OTP verification is enough to see menu                                   ║
║                                                                               ║
║ 2. GUEST COUNT IS ENTERED BY STAFF ONLY                                       ║
║    - Guest NEVER enters guest count                                           ║
║    - Waiter, Host, or Manager enters it                                       ║
║    - This ensures accountability                                              ║
║                                                                               ║
║ 3. ORDER CONFIRMATION DEPENDS ON SESSION STATE                                ║
║    - Session active (guest count set) → Direct to kitchen                     ║
║    - No session (guest count not set) → Needs staff confirmation              ║
║                                                                               ║
║ 4. WAITER MUST ENTER GUEST COUNT DURING CONFIRMATION                          ║
║    - Can't confirm without guest count                                        ║
║    - Can optionally link customer for loyalty                                 ║
║                                                                               ║
║ 5. POINTS ARE SHOWN THROUGHOUT                                                ║
║    - On menu items                                                            ║
║    - In cart                                                                  ║
║    - On order confirmation                                                    ║
║    - Non-members see "Join to earn"                                           ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝

---

## 8.3 Customer Loyalty System

### Privacy Principle
╔═══════════════════════════════════════════════════════════════════════════════╗
║ CUSTOMER PRIVACY - WHO SEES WHAT                                              ║
╠═══════════════════════════════════════════════════════════════════════════════╣
║                                                                               ║
║ CUSTOMERS SEE (Points-based):                                                 ║
║ ├── Points balance                                                           ║
║ ├── Points earned lifetime                                                   ║
║ ├── Current tier                                                             ║
║ ├── Progress to next tier (in points)                                        ║
║ └── Points to earn on menu items                                             ║
║                                                                               ║
║ CUSTOMERS DON'T SEE:                                                          ║
║ ├── Total amount spent (Rs.)                                                 ║
║ ├── Average order value                                                      ║
║ ├── Individual order amounts                                                 ║
║ └── Tier thresholds in Rs.                                                   ║
║                                                                               ║
║ OWNER/MANAGER SEE (Everything):                                               ║
║ ├── All customer data                                                        ║
║ ├── Total spent                                                              ║
║ ├── Order history with amounts                                               ║
║ ├── Average order value                                                      ║
║ └── Revenue analytics                                                        ║
║                                                                               ║
║ WAITER/CASHIER SEE (Limited):                                                 ║
║ ├── Name, phone                                                              ║
║ ├── Current tier                                                             ║
║ ├── Points balance                                                           ║
║ └── Visit count                                                              ║
║                                                                               ║
║ WAITER/CASHIER DON'T SEE:                                                     ║
║ ├── Total spent                                                              ║
║ ├── Average order value                                                      ║
║ └── Individual order amounts                                                 ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝

### Tier System

| Tier | Customer Sees | Owner Sees | Points Multiplier | Birthday Bonus |
|------|---------------|------------|-------------------|----------------|
| 🥉 Bronze | Entry level | Sign up | 1× | 100 pts |
| 🥈 Silver | Earn 500 total pts | Spend Rs. 5,000 | 1.25× | 200 pts |
| 🥇 Gold | Earn 1,500 total pts | Spend Rs. 15,000 | 1.5× | 500 pts |
| 💎 Platinum | Earn 5,000 total pts | Spend Rs. 50,000 | 2× | 1000 pts |

### Points Calculation
Conversion: Rs. 10 spent = 1 base point
Formula: floor(order_amount / 10) × tier_multiplier
Example (Gold customer, Rs. 850 order):

Base points: floor(850 / 10) = 85 points
With multiplier: 85 × 1.5 = 127.5 → 127 points


### Points Display on Menu
┌─────────────────────────────────────────────────────────────┐
│ Menu Item Display (for Silver member)                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ ┌─────────────────────────────────────────────────────┐    │
│ │ Chicken Momo (Steam)                                │    │
│ │ Rs. 350                                             │    │
│ │ 💰 +44 pts (1.25×)                                  │    │
│ │                                        [ ADD ]      │    │
│ └─────────────────────────────────────────────────────┘    │
│                                                             │
│ For non-member:                                            │
│ │ 💰 Could earn 35 pts (Join to earn!)               │    │
│                                                             │
└─────────────────────────────────────────────────────────────┘

### Customer Verification Methods
METHOD 1: STAFF VERIFICATION (Default - No SMS cost)
├── Guest enters phone number
├── System shows verification code to staff
├── Staff confirms it's the right person
└── Account verified
METHOD 2: SMS OTP (Optional - Requires SMS credits)
├── Guest enters phone number
├── System sends 4-digit OTP via SMS
├── Guest enters OTP
└── Account verified
MPIN SYSTEM (For returning customers):
├── After first verification, guest sets 4-digit MPIN
├── Same device: Auto-login (no MPIN needed)
├── Different device: MPIN required
├── Forgot MPIN: SMS OTP or staff reset
└── Max 3 devices trusted per customer

---

## 8.4 Promotions System

### Promotion Types

| Type | Description | Auto-Apply |
|------|-------------|------------|
| HAPPY_HOUR | Time-based discount (e.g., 3-6 PM) | ✅ Yes |
| COMBO | Bundle items at special price | Manual select |
| BOGO | Buy one get one free/discounted | ✅ Yes |
| FIRST_ORDER | Discount for new customers | ✅ Yes |
| PROMO_CODE | Enter code for discount | Manual code |
| MIN_ORDER | Spend X get Y% off | ✅ Yes |
| FESTIVAL | Special occasion offers | ✅ Yes |
| ITEM_DISCOUNT | Direct discount on items | ✅ Yes |
| LOYALTY_BONUS | Extra points for members | ✅ Yes |

### Promotion Priority (When multiple apply)

PROMO_CODE (if entered, highest priority)
COMBO (if selected)
FIRST_ORDER (for new customers)
MIN_ORDER (tiered discounts)
HAPPY_HOUR (time-based)
BOGO (item-specific)
ITEM_DISCOUNT (item-specific)

Note: Only ONE main discount applies, but LOYALTY_BONUS points always stack

---

## 8.5 Staff Quick Order System

### Purpose

Waiter takes verbal order from guest and enters quickly via staff app.

### Quick Order Features
┌─────────────────────────────────────────────────────────────┐
│ QUICK ORDER FEATURES                                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ 1. FAST SEARCH                                              │
│    └── Type to search items instantly                       │
│                                                             │
│ 2. FREQUENTLY ORDERED (Top 10)                              │
│    └── One-tap to add popular items                        │
│                                                             │
│ 3. ONE-TAP ADD (Simple items)                               │
│    └── Coke, Water, etc. - single tap adds to order        │
│                                                             │
│ 4. MINIMAL VARIANT POPUP                                    │
│    └── For items with variants, quick selection popup      │
│                                                             │
│ 5. QUANTITY ADJUST                                          │
│    └── Easy +/- buttons                                    │
│                                                             │
│ 6. QUICK TAGS                                               │
│    └── "Less spicy", "No onion", "Rush", "VIP"            │
│                                                             │
│ 7. DIRECT TO KITCHEN                                        │
│    └── No confirmation needed (staff already verified)     │
│                                                             │
└─────────────────────────────────────────────────────────────┘

### Who Can Use Quick Order

- ✅ Waiter
- ✅ Manager
- ❌ Host (configurable)
- ❌ Cashier (configurable)
- ❌ Kitchen

---

## 8.6 Kitchen Display System

### KOT (Kitchen Order Ticket) Display
┌─────────────────────────────────────────────────────────────┐
│ KITCHEN DISPLAY - Order #1052                   Table 7    │
├─────────────────────────────────────────────────────────────┤
│ ⏱️ 5:06 PM │ 12 min ago                        🟡 PREPARING │
│                                                             │
│ ─────────────────────────────────────────────────────────── │
│                                                             │
│ 2× Chicken Momo (Steam)                                    │
│    • Less spicy                                            │
│                                                             │
│ 1× Chicken Biryani (Large)                                 │
│    • Extra raita                                           │
│                                                             │
│ 1× Veg Fried Rice                                          │
│    • No onion, extra veggies                               │
│                                                             │
│ ─────────────────────────────────────────────────────────── │
│ Special: RUSH ORDER - VIP Guest                            │
│ ─────────────────────────────────────────────────────────── │
│                                                             │
│ [ START PREPARING ]  [ MARK READY ]  [ MARK ISSUE ]        │
│                                                             │
└─────────────────────────────────────────────────────────────┘

### Order Status Flow (Kitchen)
PENDING → SENT_TO_KITCHEN → PREPARING → READY → SERVED
Kitchen staff actions:

Start preparing → Status changes to PREPARING
Mark ready → Status changes to READY, waiter notified
Mark issue → Alert manager, add note


### Kitchen Stations

HOT STATION: Main cooking
COLD STATION: Salads, cold items
GRILL STATION: Grilled items
BAR: Drinks, cocktails
DESSERT: Desserts, sweets

Each item assigned to station, kitchen staff sees only their station (configurable)

---

## 8.7 Billing & Payments

### Bill Generation
┌─────────────────────────────────────────────────────────────┐
│                        LUMORA RESTAURANT                    │
│                      123 Main Street, KTM                   │
│                        Tel: 01-4567890                      │
│                         VAT: 123456789                      │
├─────────────────────────────────────────────────────────────┤
│ Bill No: BILL-0042                    Date: 2026-01-23     │
│ Table: 7                              Time: 7:45 PM        │
│ Guests: 4                             Server: Ram          │
├─────────────────────────────────────────────────────────────┤
│ Item                          Qty    Rate      Amount      │
│ ─────────────────────────────────────────────────────────── │
│ Chicken Momo (Steam)           2    350.00      700.00    │
│ Chicken Biryani (Large)        1    450.00      450.00    │
│ Veg Fried Rice                 1    280.00      280.00    │
│ Coke                           4     60.00      240.00    │
├─────────────────────────────────────────────────────────────┤
│                              Subtotal:        1,670.00     │
│                         Service (10%):          167.00     │
│                             VAT (13%):          238.81     │
│ ─────────────────────────────────────────────────────────── │
│                          GRAND TOTAL:        Rs. 2,076     │
├─────────────────────────────────────────────────────────────┤
│ Points Earned: +156 pts (Silver 1.25×)                     │
│ Your Balance: 523 pts                                      │
├─────────────────────────────────────────────────────────────┤
│            Thank you for dining with us!                   │
│              Please visit again soon.                      │
└─────────────────────────────────────────────────────────────┘

### Payment Methods

| Method | How it Works |
|--------|--------------|
| CASH | Enter amount received, calculate change |
| CARD | Process via POS terminal, enter reference |
| QR_PAYMENT | Generic QR payment |
| ESEWA | eSewa payment gateway |
| KHALTI | Khalti payment gateway |
| FONEPAY | FonePay payment gateway |
| POINTS | Redeem loyalty points |
| SPLIT | Combine multiple methods |

### Split Payment Example
Total Bill: Rs. 2,076
Payment 1: CASH - Rs. 1,000
Payment 2: CARD - Rs. 576
Payment 3: POINTS - 500 pts (Rs. 500)
Total Paid: Rs. 2,076 ✓

---

## 8.8 Reports & Analytics

### Report Categories

1. **Sales Reports**
   - Daily/Weekly/Monthly sales
   - Sales by category
   - Sales by item
   - Sales by payment method
   - Sales by staff

2. **Order Reports**
   - Orders by status
   - Orders by source (QR vs Staff)
   - Average order value
   - Peak hours analysis
   - Order completion time

3. **Customer Reports**
   - New vs returning customers
   - Customer by tier
   - Points earned/redeemed
   - Top customers
   - Customer frequency

4. **Staff Reports**
   - Sales by waiter
   - Orders handled
   - Average service time
   - Attendance summary

5. **Inventory Reports** (Basic)
   - Low stock items
   - Items sold count
   - Category performance

---

## 8.9 Communication System

### Internal Chat

- Direct messages (staff to staff)
- Group chats (Floor Staff, Kitchen, All Staff)
- Quick replies ("On my way", "Got it", "Need help")
- Read receipts

### Announcements

- Manager/Owner broadcasts to all staff
- Priority levels: Normal, Important, Urgent
- Read confirmation tracking
- Pinned announcements

### Shift Notes

- Handover notes between shifts
- Tags for categorization
- Visible to next shift

### Daily Briefing

- Manager creates for each day
- Contains: Specials, 86'd items, goals, notes
- All staff must read and acknowledge

### Lost & Found

- Log items left by guests
- Track status (Unclaimed, Claimed, Disposed)
- Store verification details when claimed

---

# 9. API ARCHITECTURE

## 9.1 API Response Format
```typescript
// Success Response
{
  "success": true,
  "message": "Order created successfully",
  "data": {
    "id": "order_123",
    "order_number": "ORD-0042",
    // ... order data
  },
  "meta": {
    "timestamp": "2026-01-23T19:45:00.000Z"
  }
}

// Error Response
{
  "success": false,
  "message": "Validation failed",
  "error": {
    "code": "VALIDATION_ERROR",
    "details": [
      { "field": "guest_count", "message": "Guest count is required" }
    ]
  },
  "meta": {
    "timestamp": "2026-01-23T19:45:00.000Z"
  }
}

// Paginated Response
{
  "success": true,
  "data": [...],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 156,
    "totalPages": 8,
    "hasNext": true,
    "hasPrev": false
  }
}
```

## 9.2 API Endpoints Structure
/api/
├── auth/
│   ├── POST   /login              # Email/password login
│   ├── POST   /pin-login          # PIN login
│   ├── POST   /logout             # Logout
│   ├── POST   /refresh            # Refresh token
│   ├── POST   /forgot-password    # Request reset
│   └── POST   /reset-password     # Reset password
│
├── restaurants/
│   ├── GET    /                   # List (Super Admin)
│   ├── POST   /                   # Create (Super Admin)
│   ├── GET    /:id                # Get details
│   ├── PATCH  /:id                # Update
│   ├── DELETE /:id                # Delete (Super Admin)
│   ├── GET    /:id/settings       # Get settings
│   └── PATCH  /:id/settings       # Update settings
│
├── tables/
│   ├── GET    /                   # List tables
│   ├── POST   /                   # Create table
│   ├── POST   /bulk               # Bulk create
│   ├── GET    /:id                # Get table
│   ├── PATCH  /:id                # Update table
│   ├── DELETE /:id                # Delete table
│   ├── PATCH  /:id/status         # Change status
│   ├── POST   /:id/generate-qr    # Generate QR
│   ├── POST   /:id/refresh-otp    # Refresh OTP
│   └── GET    /:id/session        # Get current session
│
├── menu/
│   ├── categories/
│   │   ├── GET    /               # List categories
│   │   ├── POST   /               # Create category
│   │   ├── GET    /:id            # Get category
│   │   ├── PATCH  /:id            # Update category
│   │   ├── DELETE /:id            # Delete category
│   │   └── PATCH  /reorder        # Reorder categories
│   │
│   └── items/
│       ├── GET    /               # List items
│       ├── POST   /               # Create item
│       ├── GET    /:id            # Get item
│       ├── PATCH  /:id            # Update item
│       ├── DELETE /:id            # Delete item
│       ├── PATCH  /:id/availability # Toggle availability
│       └── PATCH  /reorder        # Reorder items
│
├── orders/
│   ├── GET    /                   # List orders
│   ├── POST   /                   # Create order (staff)
│   ├── GET    /:id                # Get order
│   ├── PATCH  /:id                # Update order
│   ├── POST   /:id/confirm        # Confirm order (hybrid flow)
│   ├── POST   /:id/reject         # Reject order
│   ├── PATCH  /:id/status         # Update status
│   └── POST   /:id/cancel         # Cancel order
│
├── sessions/
│   ├── GET    /                   # List active sessions
│   ├── POST   /                   # Start session (staff)
│   ├── GET    /:id                # Get session
│   ├── PATCH  /:id/guest-count    # Update guest count
│   ├── POST   /:id/link-customer  # Link customer
│   └── POST   /:id/end            # End session
│
├── bills/
│   ├── GET    /                   # List bills
│   ├── POST   /                   # Generate bill
│   ├── GET    /:id                # Get bill
│   ├── POST   /:id/payment        # Add payment
│   ├── POST   /:id/settle         # Settle bill
│   ├── POST   /:id/void           # Void bill
│   └── POST   /:id/print          # Print bill
│
├── customers/
│   ├── GET    /                   # List customers
│   ├── POST   /                   # Create customer
│   ├── GET    /:id                # Get customer
│   ├── PATCH  /:id                # Update customer
│   ├── DELETE /:id                # Delete customer
│   ├── GET    /:id/points         # Get points history
│   ├── POST   /:id/points/adjust  # Adjust points
│   ├── GET    /:id/orders         # Get order history
│   └── POST   /:id/notes          # Add note
│
├── promotions/
│   ├── GET    /                   # List promotions
│   ├── POST   /                   # Create promotion
│   ├── GET    /:id                # Get promotion
│   ├── PATCH  /:id                # Update promotion
│   ├── DELETE /:id                # Delete promotion
│   ├── PATCH  /:id/status         # Toggle status
│   └── POST   /validate-code      # Validate promo code
│
├── staff/
│   ├── GET    /                   # List staff
│   ├── POST   /                   # Create staff
│   ├── GET    /:id                # Get staff
│   ├── PATCH  /:id                # Update staff
│   ├── DELETE /:id                # Delete staff
│   ├── GET    /shifts             # List shifts
│   ├── POST   /shifts             # Create shift
│   ├── GET    /attendance         # Attendance report
│   └── POST   /clock              # Clock in/out
│
├── reports/
│   ├── GET    /sales              # Sales report
│   ├── GET    /orders             # Orders report
│   ├── GET    /customers          # Customers report
│   ├── GET    /staff              # Staff report
│   └── GET    /dashboard          # Dashboard stats
│
├── communication/
│   ├── GET    /chats              # List chats
│   ├── POST   /chats/message      # Send message
│   ├── GET    /announcements      # List announcements
│   ├── POST   /announcements      # Create announcement
│   ├── GET    /shift-notes        # Get shift notes
│   ├── POST   /shift-notes        # Create shift note
│   ├── GET    /daily-briefing     # Get briefing
│   └── POST   /daily-briefing     # Create briefing
│
├── lost-found/
│   ├── GET    /                   # List items
│   ├── POST   /                   # Add item
│   ├── PATCH  /:id/claim          # Mark claimed
│   └── PATCH  /:id/dispose        # Mark disposed
│
├── guest/                          # PUBLIC ENDPOINTS (no auth)
│   ├── POST   /verify-otp         # Verify table OTP
│   ├── GET    /menu               # Get menu for table
│   ├── POST   /order              # Place order
│   ├── GET    /order/:id/status   # Track order
│   ├── POST   /request-bill       # Request bill
│   ├── POST   /register           # Register customer
│   ├── POST   /verify-phone       # Verify phone (SMS)
│   ├── POST   /login              # Customer login (MPIN)
│   └── GET    /promotions         # Active promotions
│
└── license/
├── POST   /validate           # Validate license key
├── GET    /status             # Get license status
└── POST   /activate           # Activate license
## 9.3 Authentication Headers
Authorization: Bearer <access_token>
X-Restaurant-ID: <restaurant_id>        # Required for restaurant-scoped endpoints
X-Device-ID: <device_fingerprint>       # For customer device tracking

---

# 10. UI/UX GUIDELINES

## 10.1 Design Principles

MOBILE-FIRST

Guest interface optimized for phones
Staff interface works on tablets


CLARITY

Clear visual hierarchy
Obvious CTAs
Status always visible


SPEED

Fast loading
Instant feedback
Optimistic UI updates


ACCESSIBILITY

Large touch targets (min 44px)
Good contrast
Clear error messages


NEPAL CONTEXT

NPR currency formatting
Nepali language option
Local payment methods




## 10.2 Color Scheme
```css
/* Primary Colors */
--primary: #FF6B35;        /* Warm orange - brand color */
--primary-dark: #E55A2B;
--primary-light: #FF8F66;

/* Status Colors */
--success: #22C55E;        /* Green */
--warning: #F59E0B;        /* Amber */
--error: #EF4444;          /* Red */
--info: #3B82F6;           /* Blue */

/* Table Status Colors */
--table-available: #22C55E;  /* Green */
--table-occupied: #3B82F6;   /* Blue */
--table-reserved: #A855F7;   /* Purple */
--table-cleaning: #F59E0B;   /* Yellow */
--table-blocked: #EF4444;    /* Red */

/* Neutrals */
--gray-50: #F9FAFB;
--gray-100: #F3F4F6;
--gray-200: #E5E7EB;
--gray-300: #D1D5DB;
--gray-400: #9CA3AF;
--gray-500: #6B7280;
--gray-600: #4B5563;
--gray-700: #374151;
--gray-800: #1F2937;
--gray-900: #111827;

/* Background */
--bg-primary: #FFFFFF;
--bg-secondary: #F9FAFB;
--bg-tertiary: #F3F4F6;
```

## 10.3 Typography
```css
/* Font Family */
--font-primary: 'Inter', system-ui, sans-serif;
--font-mono: 'JetBrains Mono', monospace;

/* Font Sizes */
--text-xs: 0.75rem;     /* 12px */
--text-sm: 0.875rem;    /* 14px */
--text-base: 1rem;      /* 16px */
--text-lg: 1.125rem;    /* 18px */
--text-xl: 1.25rem;     /* 20px */
--text-2xl: 1.5rem;     /* 24px */
--text-3xl: 1.875rem;   /* 30px */
--text-4xl: 2.25rem;    /* 36px */
```

## 10.4 Component Specifications

### Buttons
Primary Button:

Background: --primary
Text: white
Padding: 12px 24px
Border-radius: 8px
Min-height: 44px (touch target)

Secondary Button:

Background: transparent
Border: 1px solid --gray-300
Text: --gray-700

Danger Button:

Background: --error
Text: white


### Cards
Card:

Background: white
Border-radius: 12px
Shadow: 0 1px 3px rgba(0,0,0,0.1)
Padding: 16px


### Forms
Input:

Height: 44px
Border: 1px solid --gray-300
Border-radius: 8px
Padding: 0 12px
Focus: border-color --primary

Label:

Font-size: --text-sm
Color: --gray-700
Margin-bottom: 4px


---

# 11. DESKTOP APPLICATION

## 11.1 Electron App Features

### Setup Wizard
┌─────────────────────────────────────────────────────────────┐
│ QR DINE SETUP WIZARD                                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ Step 1: Welcome                                             │
│ Step 2: License Agreement                                   │
│ Step 3: License Key Activation                              │
│ Step 4: Installation Type (Express/Custom)                 │
│ Step 5: Database Setup (New/Existing PostgreSQL)           │
│ Step 6: Installation Location                               │
│ Step 7: Server Configuration (Port, Network)               │
│ Step 8: Admin Account Creation                              │
│ Step 9: Installing... (Progress)                           │
│ Step 10: Complete!                                          │
│                                                             │
└─────────────────────────────────────────────────────────────┘

### System Tray Manager
┌──────────────────────────┐
│  🟢 QR Dine Running      │
│  ──────────────────────  │
│  Open Dashboard          │
│  Open Admin Panel        │
│  ──────────────────────  │
│  Start Service           │
│  Stop Service            │
│  Restart Service         │
│  ──────────────────────  │
│  View Logs               │
│  Database Backup         │
│  ──────────────────────  │
│  Settings                │
│  Check for Updates       │
│  About                   │
│  ──────────────────────  │
│  Exit                    │
└──────────────────────────┘

## 11.2 Backup System

### Local Backup

Location: C:\QRDine\Backups\
Includes: Database, uploads, configuration
Schedule: Daily (configurable)
Retention: Last 7 backups (configurable)
Always available (no license required)


### Cloud Backup (License Required)

Requires: Professional+ license
Storage: 5GB / 20GB / 100GB based on tier
Encryption: AES-256
Auto-sync: Daily
- Restore: From any backup point
- Accessible from any installation (with license)
11.3 In-App Updates
┌─────────────────────────────────────────────────────────────┐
│ UPDATE AVAILABLE                                            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ QR Dine v1.2.0 is available!                               │
│ Current version: v1.1.0                                    │
│                                                             │
│ What's new:                                                │
│ • New kitchen display features                             │
│ • Improved order tracking                                  │
│ • Bug fixes and performance improvements                   │
│                                                             │
│ [ Download & Install ]  [ Remind Me Later ]  [ Skip ]      │
│                                                             │
└─────────────────────────────────────────────────────────────┘

Update Process:
1. Download update in background
2. Verify integrity (checksum)
3. Prompt user to restart
4. Apply update on restart
5. Migrate database if needed
6. Start new version
11.4 Windows Service
Service Name: QRDineService
Display Name: QR Dine Server
Description: QR Dine Restaurant Management System Server
Startup Type: Automatic

Actions:
- Start: Starts Next.js server + PostgreSQL (if bundled)
- Stop: Gracefully shuts down
- Restart: Stop + Start

Monitoring:
- Health check every 30 seconds
- Auto-restart on crash
- Log to Windows Event Log

12. CODING CONVENTIONS
12.1 TypeScript
typescript// ✅ DO: Use strict types
interface Order {
  id: string;
  order_number: string;
  status: OrderStatus;
  items: OrderItem[];
  total_amount: number;
}

// ❌ DON'T: Use 'any'
const order: any = {};

// ✅ DO: Use enums for fixed values
enum OrderStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  PREPARING = 'PREPARING',
}

// ✅ DO: Use optional chaining
const customerName = order.customer?.name ?? 'Guest';

// ✅ DO: Use proper null checks
if (order.customer_id) {
  // customer exists
}
```

## 12.2 File Naming
```
Components:    PascalCase     Button.tsx, OrderCard.tsx
Pages:         lowercase      page.tsx, layout.tsx
Utilities:     camelCase      formatDate.ts, calculatePoints.ts
Constants:     camelCase      constants.ts (UPPER_CASE inside)
Types:         PascalCase     Order.ts, Customer.ts
Hooks:         camelCase      useOrders.ts, useToast.ts
Services:      camelCase      orderService.ts
API Routes:    lowercase      route.ts
12.3 Component Structure
typescript// components/orders/OrderCard.tsx

import { useState } from 'react';
import { Order } from '@/types';
import { formatCurrency } from '@/lib/utils';
import { Badge } from '@/components/ui';

// 1. Types/Interfaces first
interface OrderCardProps {
  order: Order;
  onStatusChange?: (status: OrderStatus) => void;
  showCustomer?: boolean;
}

// 2. Component
export function OrderCard({
  order,
  onStatusChange,
  showCustomer = true
}: OrderCardProps) {
  // 3. Hooks
  const [isExpanded, setIsExpanded] = useState(false);

  // 4. Derived values
  const itemCount = order.items.length;
  const formattedTotal = formatCurrency(order.total_amount);

  // 5. Handlers
  const handleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  // 6. Render
  return (
    <div className="order-card">
      {/* ... */}
    </div>
  );
}

// 7. Default export at bottom
export default OrderCard;
12.4 API Route Structure
typescript// app/api/orders/route.ts

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { withAuth, withRestaurant } from '@/lib/api/middleware';
import { successResponse, errorResponse } from '@/lib/api/response';
import { hasPermission } from '@/lib/auth/permissions';

// 1. Validation schema
const createOrderSchema = z.object({
  table_id: z.string(),
  items: z.array(z.object({
    menu_item_id: z.string(),
    quantity: z.number().min(1),
    selected_variants: z.array(z.any()).optional(),
    selected_addons: z.array(z.any()).optional(),
    special_requests: z.string().optional(),
  })),
  special_instructions: z.string().optional(),
});

// 2. GET handler
export async function GET(request: NextRequest) {
  return withAuth(async (session) => {
    return withRestaurant(session, async (restaurant) => {
      // Check permission
      if (!hasPermission(session.user.role, 'orders:view')) {
        return errorResponse('Forbidden', 403);
      }

      // Get query params
      const { searchParams } = new URL(request.url);
      const status = searchParams.get('status');
      const page = parseInt(searchParams.get('page') || '1');
      const limit = parseInt(searchParams.get('limit') || '20');

      // Query database
      const orders = await prisma.order.findMany({
        where: {
          restaurant_id: restaurant.id,
          ...(status && { status: status as OrderStatus }),
        },
        include: {
          items: true,
          customer: true,
        },
        orderBy: { created_at: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      });

      const total = await prisma.order.count({
        where: {
          restaurant_id: restaurant.id,
          ...(status && { status: status as OrderStatus }),
        },
      });

      return successResponse(orders, undefined, {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      });
    });
  })(request);
}

// 3. POST handler
export async function POST(request: NextRequest) {
  return withAuth(async (session) => {
    return withRestaurant(session, async (restaurant) => {
      // Check permission
      if (!hasPermission(session.user.role, 'orders:create')) {
        return errorResponse('Forbidden', 403);
      }

      // Parse and validate body
      const body = await request.json();
      const validation = createOrderSchema.safeParse(body);

      if (!validation.success) {
        return errorResponse('Validation failed', 400, {
          code: 'VALIDATION_ERROR',
          details: validation.error.errors,
        });
      }

      const data = validation.data;

      // Create order in transaction
      const order = await prisma.$transaction(async (tx) => {
        // Generate order number
        const orderNumber = await generateOrderNumber(tx, restaurant.id);

        // Create order
        const newOrder = await tx.order.create({
          data: {
            restaurant_id: restaurant.id,
            order_number: orderNumber,
            table_id: data.table_id,
            status: 'PENDING',
            order_source: 'STAFF',
            placed_by: session.user.id,
            placed_by_type: 'staff',
            // ... calculate totals
          },
          include: {
            items: true,
          },
        });

        // Log activity
        await tx.activityLog.create({
          data: {
            restaurant_id: restaurant.id,
            user_id: session.user.id,
            user_name: session.user.name,
            action: 'order.created',
            entity_type: 'order',
            entity_id: newOrder.id,
            details: { order_number: orderNumber },
          },
        });

        return newOrder;
      });

      return successResponse(order, 'Order created successfully');
    });
  })(request);
}
12.5 Database Conventions
typescript// ✅ DO: Always include restaurant_id
const orders = await prisma.order.findMany({
  where: {
    restaurant_id: restaurant.id,  // ALWAYS filter by restaurant
    status: 'PENDING',
  },
});

// ✅ DO: Use transactions for related operations
await prisma.$transaction(async (tx) => {
  const order = await tx.order.create({ ... });
  await tx.orderItem.createMany({ ... });
  await tx.activityLog.create({ ... });
});

// ✅ DO: Use soft delete where needed
await prisma.menuItem.update({
  where: { id: itemId },
  data: {
    is_deleted: true,
    deleted_at: new Date(),
  },
});

// ✅ DO: Add proper indexes in schema
@@index([restaurant_id])
@@index([status])
@@index([created_at])
12.6 Error Handling
typescript// lib/api/errors.ts

export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number = 400,
    public code: string = 'APP_ERROR',
    public details?: any
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class ValidationError extends AppError {
  constructor(details: any) {
    super('Validation failed', 400, 'VALIDATION_ERROR', details);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') {
    super(message, 401, 'UNAUTHORIZED');
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden') {
    super(message, 403, 'FORBIDDEN');
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(`${resource} not found`, 404, 'NOT_FOUND');
  }
}

// Usage in API
try {
  const order = await orderService.getById(orderId);
  if (!order) {
    throw new NotFoundError('Order');
  }
  return successResponse(order);
} catch (error) {
  if (error instanceof AppError) {
    return errorResponse(error.message, error.statusCode, {
      code: error.code,
      details: error.details,
    });
  }
  console.error('Unexpected error:', error);
  return errorResponse('Internal server error', 500);
}
```

---

# 13. CRITICAL RULES

## 13.1 Security Rules
```
╔═══════════════════════════════════════════════════════════════════════════════╗
║ 🔒 SECURITY RULES - MUST FOLLOW                                               ║
╠═══════════════════════════════════════════════════════════════════════════════╣
║                                                                               ║
║ 1. ALWAYS VALIDATE INPUTS                                                     ║
║    - Use Zod for all API inputs                                               ║
║    - Never trust client data                                                  ║
║                                                                               ║
║ 2. ALWAYS CHECK PERMISSIONS                                                   ║
║    - Every API endpoint must verify permissions                               ║
║    - Use hasPermission() helper                                               ║
║                                                                               ║
║ 3. ALWAYS FILTER BY RESTAURANT                                                ║
║    - Every query must include restaurant_id                                   ║
║    - Never expose data from other restaurants                                 ║
║                                                                               ║
║ 4. NEVER EXPOSE SENSITIVE DATA                                                ║
║    - Password hashes                                                          ║
║    - API keys/tokens                                                          ║
║    - License keys (show only partial)                                         ║
║    - Customer spending to unauthorized roles                                  ║
║                                                                               ║
║ 5. USE PARAMETERIZED QUERIES                                                  ║
║    - Prisma handles this automatically                                        ║
║    - Never concatenate SQL strings                                            ║
║                                                                               ║
║ 6. HASH PASSWORDS PROPERLY                                                    ║
║    - Use bcrypt with salt rounds >= 10                                        ║
║    - Never store plain text passwords                                         ║
║                                                                               ║
║ 7. IMPLEMENT RATE LIMITING                                                    ║
║    - Login attempts: 5 per minute                                             ║
║    - API requests: 100 per minute                                             ║
║    - OTP requests: 3 per hour                                                 ║
║                                                                               ║
║ 8. USE HTTPS ONLY                                                             ║
║    - All production traffic must be HTTPS                                     ║
║    - Set secure cookie flags                                                  ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
```

## 13.2 Business Logic Rules
```
╔═══════════════════════════════════════════════════════════════════════════════╗
║ 📋 BUSINESS LOGIC RULES - MUST FOLLOW                                         ║
╠═══════════════════════════════════════════════════════════════════════════════╣
║                                                                               ║
║ 1. GUEST COUNT                                                                ║
║    - ONLY staff can enter/update guest count                                  ║
║    - Guest NEVER enters guest count                                           ║
║    - Track all changes with who/when/reason                                   ║
║                                                                               ║
║ 2. ORDER CONFIRMATION (Hybrid Flow)                                           ║
║    - Session active (guest count set) → Direct to kitchen                     ║
║    - No session (guest count not set) → Needs staff confirmation              ║
║    - Staff MUST enter guest count during confirmation                         ║
║                                                                               ║
║ 3. CUSTOMER PRIVACY                                                           ║
║    - Customers see: Points, tier (points-based)                               ║
║    - Customers don't see: Spending amounts                                    ║
║    - Waiter/Cashier don't see: Spending amounts                               ║
║    - Owner/Manager see: Everything                                            ║
║                                                                               ║
║ 4. POINTS CALCULATION                                                         ║
║    - Formula: floor(amount / 10) × tier_multiplier                            ║
║    - Points earned AFTER payment confirmed                                    ║
║    - Points displayed on menu, cart, confirmation                             ║
║                                                                               ║
║ 5. BILLING RULES                                                              ║
║    - Only CASHIER+ can process payments                                       ║
║    - Only MANAGER+ can give discounts                                         ║
║    - Only MANAGER+ can process refunds                                        ║
║    - Only OWNER can void bills                                                ║
║    - Waiter CANNOT see bill amounts                                           ║
║                                                                               ║
║ 6. TABLE OTP                                                                  ║
║    - OTP is 3 digits                                                          ║
║    - OTP refreshes when table becomes AVAILABLE                               ║
║    - Max 3 attempts, then auto-call waiter                                    ║
║    - OTP expires after 4 hours of inactivity                                  ║
║                                                                               ║
║ 7. ORDER NUMBERS                                                              ║
║    - Format: ORD-XXXX (daily reset or continuous)                             ║
║    - Must be unique per restaurant                                            ║
║    - Generated in transaction to prevent duplicates                           ║
║                                                                               ║
║ 8. LICENSE VALIDATION                                                         ║
║    - Validate on startup                                                      ║
║    - Re-validate every 24 hours                                               ║
║    - Cache locally for offline periods                                        ║
║    - Graceful degradation if server unreachable                               ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
```

## 13.3 Development Rules
```
╔═══════════════════════════════════════════════════════════════════════════════╗
║ 💻 DEVELOPMENT RULES - MUST FOLLOW                                            ║
╠═══════════════════════════════════════════════════════════════════════════════╣
║                                                                               ║
║ 1. COMPLETE ONE STEP BEFORE NEXT                                              ║
║    - Each step must be tested and working                                     ║
║    - Don't skip steps                                                         ║
║    - Don't combine multiple steps                                             ║
║                                                                               ║
║ 2. FOLLOW THE SPECIFICATION                                                   ║
║    - This document is the source of truth                                     ║
║    - Don't deviate without explicit approval                                  ║
║    - If spec conflicts, ask for clarification                                 ║
║                                                                               ║
║ 3. WRITE COMPLETE CODE                                                        ║
║    - No placeholders or "// TODO: implement"                                  ║
║    - No partial implementations                                               ║
║    - Code must compile and run                                                ║
║                                                                               ║
║ 4. ADD PROPER ERROR HANDLING                                                  ║
║    - Try-catch for async operations                                           ║
║    - Meaningful error messages                                                ║
║    - Log errors appropriately                                                 ║
║                                                                               ║
║ 5. TEST BEFORE MARKING COMPLETE                                               ║
║    - Verify API endpoints work                                                ║
║    - Verify UI renders correctly                                              ║
║    - Verify database operations succeed                                       ║
║                                                                               ║
║ 6. MAINTAIN CONSISTENCY                                                       ║
║    - Follow naming conventions                                                ║
║    - Follow code structure patterns                                           ║
║    - Follow API response formats                                              ║
║                                                                               ║
║ 7. DOCUMENT AS YOU GO                                                         ║
║    - Add comments for complex logic                                           ║
║    - Update ROADMAP.md after each step                                        ║
║    - Note any deviations or decisions                                         ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
env# .env.example

# ═══════════════════════════════════════════════════════════════════════════════
# APPLICATION
# ═══════════════════════════════════════════════════════════════════════════════
NODE_ENV=development
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_APP_NAME="QR Dine"

# ═══════════════════════════════════════════════════════════════════════════════
# LICENSE MODE
# ═══════════════════════════════════════════════════════════════════════════════
# Options: "saas" | "codecanyon" | "licensed"
LICENSE_MODE=licensed
LICENSE_SERVER_URL=https://license.qrdine.com/api

# ═══════════════════════════════════════════════════════════════════════════════
# DATABASE
# ═══════════════════════════════════════════════════════════════════════════════
DATABASE_URL=postgresql://postgres:password@localhost:5432/qrdine

# ═══════════════════════════════════════════════════════════════════════════════
# AUTHENTICATION
# ═══════════════════════════════════════════════════════════════════════════════
JWT_SECRET=your-super-secret-jwt-key-min-32-chars
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

# ═══════════════════════════════════════════════════════════════════════════════
# FILE STORAGE
# ═══════════════════════════════════════════════════════════════════════════════
# Options: "local" | "s3"
STORAGE_TYPE=local
STORAGE_LOCAL_PATH=./uploads

# For S3 (optional)
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_REGION=ap-south-1
AWS_S3_BUCKET=qrdine-uploads

# ═══════════════════════════════════════════════════════════════════════════════
# SMS (Optional)
# ═══════════════════════════════════════════════════════════════════════════════
# Provider: "sparrow" | "aakash"
SMS_PROVIDER=sparrow
SPARROW_SMS_TOKEN=your-sparrow-sms-token
SPARROW_SMS_FROM=QRDine

# ═══════════════════════════════════════════════════════════════════════════════
# PAYMENT GATEWAYS (Optional)
# ═══════════════════════════════════════════════════════════════════════════════
ESEWA_MERCHANT_ID=
ESEWA_SECRET_KEY=

KHALTI_PUBLIC_KEY=
KHALTI_SECRET_KEY=

FONEPAY_MERCHANT_CODE=
FONEPAY_SECRET_KEY=

# ═══════════════════════════════════════════════════════════════════════════════
# REAL-TIME (Optional)
# ═══════════════════════════════════════════════════════════════════════════════
PUSHER_APP_ID=
PUSHER_KEY=
PUSHER_SECRET=
PUSHER_CLUSTER=ap2
NEXT_PUBLIC_PUSHER_KEY=
NEXT_PUBLIC_PUSHER_CLUSTER=ap2

# ═══════════════════════════════════════════════════════════════════════════════
# BACKUP (For cloud backup)
# ═══════════════════════════════════════════════════════════════════════════════
BACKUP_ENCRYPTION_KEY=your-backup-encryption-key
CLOUD_BACKUP_URL=https://backup.qrdine.com/api

APPENDIX B: Sample Seed Data
typescript// packages/database/prisma/seed.ts

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed...');

  // ═══════════════════════════════════════════════════════════════════════════
  // 1. Create License
  // ═══════════════════════════════════════════════════════════════════════════
  const license = await prisma.license.create({
    data: {
      license_key: 'QRDINE-DEV-0000-0000',
      tier: 'UNLIMITED',
      status: 'ACTIVE',
      max_restaurants: 999,
      features: JSON.stringify([
        'qr_ordering', 'table_management', 'menu_management',
        'loyalty_program', 'promotions', 'sms_integration',
        'advanced_reports', 'multi_location', 'cloud_backup',
      ]),
      owner_name: 'Development',
      owner_email: 'dev@qrdine.com',
    },
  });
  console.log('✅ License created');

  // ═══════════════════════════════════════════════════════════════════════════
  // 2. Create Restaurant
  // ═══════════════════════════════════════════════════════════════════════════
  const restaurant = await prisma.restaurant.create({
    data: {
      license_id: license.id,
      name: 'LUMORA Restaurant',
      slug: 'lumora',
      description: 'Fine dining experience in the heart of Kathmandu',
      address: '123 Durbar Marg',
      city: 'Kathmandu',
      country: 'Nepal',
      phone: '+977-1-4567890',
      email: 'info@lumora.com',
      currency: 'NPR',
      currency_symbol: 'Rs.',
      timezone: 'Asia/Kathmandu',
      tax_percentage: 13,
      service_charge_percentage: 10,
      business_hours: JSON.stringify({
        monday: { open: '10:00', close: '22:00' },
        tuesday: { open: '10:00', close: '22:00' },
        wednesday: { open: '10:00', close: '22:00' },
        thursday: { open: '10:00', close: '22:00' },
        friday: { open: '10:00', close: '23:00' },
        saturday: { open: '10:00', close: '23:00' },
        sunday: { open: '11:00', close: '21:00' },
      }),
    },
  });
  console.log('✅ Restaurant created');

  // ═══════════════════════════════════════════════════════════════════════════
  // 3. Create Users
  // ═══════════════════════════════════════════════════════════════════════════
  const passwordHash = await bcrypt.hash('password123', 10);
  const pinHash = await bcrypt.hash('1234', 10);

  const users = await Promise.all([
    prisma.user.create({
      data: {
        restaurant_id: restaurant.id,
        email: 'owner@lumora.com',
        password_hash: passwordHash,
        pin: pinHash,
        name: 'Restaurant Owner',
        phone: '+977-9841000001',
        role: 'OWNER',
        status: 'ACTIVE',
      },
    }),
    prisma.user.create({
      data: {
        restaurant_id: restaurant.id,
        email: 'manager@lumora.com',
        password_hash: passwordHash,
        pin: pinHash,
        name: 'Ram Manager',
        phone: '+977-9841000002',
        role: 'MANAGER',
        status: 'ACTIVE',
      },
    }),
    prisma.user.create({
      data: {
        restaurant_id: restaurant.id,
        email: 'cashier@lumora.com',
        password_hash: passwordHash,
        pin: pinHash,
        name: 'Sita Cashier',
        phone: '+977-9841000003',
        role: 'CASHIER',
        status: 'ACTIVE',
      },
    }),
    prisma.user.create({
      data: {
        restaurant_id: restaurant.id,
        email: 'waiter@lumora.com',
        password_hash: passwordHash,
        pin: pinHash,
        name: 'Hari Waiter',
        phone: '+977-9841000004',
        role: 'WAITER',
        status: 'ACTIVE',
      },
    }),
    prisma.user.create({
      data: {
        restaurant_id: restaurant.id,
        email: 'kitchen@lumora.com',
        password_hash: passwordHash,
        pin: pinHash,
        name: 'Kumar Kitchen',
        phone: '+977-9841000005',
        role: 'KITCHEN',
        status: 'ACTIVE',
      },
    }),
  ]);
  console.log('✅ Users created');

  // ═══════════════════════════════════════════════════════════════════════════
  // 4. Create Tables
  // ═══════════════════════════════════════════════════════════════════════════
  const tables = await Promise.all(
    Array.from({ length: 10 }, (_, i) =>
      prisma.table.create({
        data: {
          restaurant_id: restaurant.id,
          table_number: `T${i + 1}`,
          name: i < 2 ? 'Window Seat' : i < 4 ? 'Garden View' : null,
          capacity: i < 4 ? 2 : i < 8 ? 4 : 6,
          floor: 'Ground Floor',
          section: i < 5 ? 'Main Hall' : 'Private Area',
          qr_code: `${restaurant.slug}-table-${i + 1}-${Date.now()}`,
          current_otp: String(Math.floor(100 + Math.random() * 900)),
          otp_generated_at: new Date(),
          status: 'AVAILABLE',
          position_x: (i % 5) * 150 + 50,
          position_y: Math.floor(i / 5) * 150 + 50,
        },
      })
    )
  );
  console.log('✅ Tables created');

  // ═══════════════════════════════════════════════════════════════════════════
  // 5. Create Categories
  // ═══════════════════════════════════════════════════════════════════════════
  const categories = await Promise.all([
    prisma.category.create({
      data: {
        restaurant_id: restaurant.id,
        name: 'Appetizers',
        name_local: 'खाजा',
        description: 'Start your meal right',
        sort_order: 1,
      },
    }),
    prisma.category.create({
      data: {
        restaurant_id: restaurant.id,
        name: 'Momos',
        name_local: 'मःम',
        description: 'Nepali dumplings',
        sort_order: 2,
      },
    }),
    prisma.category.create({
      data: {
        restaurant_id: restaurant.id,
        name: 'Main Course',
        name_local: 'मुख्य खाना',
        description: 'Hearty main dishes',
        sort_order: 3,
      },
    }),
    prisma.category.create({
      data: {
        restaurant_id: restaurant.id,
        name: 'Rice & Noodles',
        name_local: 'भात र चाउमिन',
        description: 'Rice and noodle dishes',
        sort_order: 4,
      },
    }),
    prisma.category.create({
      data: {
        restaurant_id: restaurant.id,
        name: 'Beverages',
        name_local: 'पेय पदार्थ',
        description: 'Drinks and refreshments',
        sort_order: 5,
      },
    }),
    prisma.category.create({
      data: {
        restaurant_id: restaurant.id,
        name: 'Desserts',
        name_local: 'मिठाई',
        description: 'Sweet endings',
        sort_order: 6,
      },
    }),
  ]);
  console.log('✅ Categories created');

  // ═══════════════════════════════════════════════════════════════════════════
  // 6. Create Menu Items
  // ═══════════════════════════════════════════════════════════════════════════
  const menuItems = await Promise.all([
    // Momos
    prisma.menuItem.create({
      data: {
        restaurant_id: restaurant.id,
        category_id: categories[1].id, // Momos
        name: 'Chicken Momo',
        name_local: 'चिकन मःम',
        description: 'Juicy chicken dumplings served with tomato achar',
        pricing_type: 'VARIANTS',
        base_price: 250,
        variant_groups: JSON.stringify([
          {
            name: 'Style',
            required: true,
            options: [
              { name: 'Steam', price: 250 },
              { name: 'Fried', price: 280 },
              { name: 'Jhol', price: 300 },
              { name: 'C.Momo', price: 320 },
            ],
          },
        ]),
        addons: JSON.stringify([
          { name: 'Extra Achar', price: 30 },
          { name: 'Extra Sauce', price: 20 },
        ]),
        prep_time_minutes: 15,
        kitchen_station: 'hot',
        is_popular: true,
        sort_order: 1,
      },
    }),
    prisma.menuItem.create({
      data: {
        restaurant_id: restaurant.id,
        category_id: categories[1].id, // Momos
        name: 'Veg Momo',
        name_local: 'भेज मःम',
        description: 'Fresh vegetable dumplings',
        pricing_type: 'VARIANTS',
        base_price: 200,
        variant_groups: JSON.stringify([
          {
            name: 'Style',
            required: true,
            options: [
              { name: 'Steam', price: 200 },
              { name: 'Fried', price: 230 },
              { name: 'Jhol', price: 250 },
            ],
          },
        ]),
        is_vegetarian: true,
        prep_time_minutes: 15,
        kitchen_station: 'hot',
        sort_order: 2,
      },
    }),
    // Main Course
    prisma.menuItem.create({
      data: {
        restaurant_id: restaurant.id,
        category_id: categories[2].id, // Main Course
        name: 'Chicken Biryani',
        name_local: 'चिकन बिरयानी',
        description: 'Aromatic rice with tender chicken',
        pricing_type: 'VARIANTS',
        base_price: 350,
        variant_groups: JSON.stringify([
          {
            name: 'Size',
            required: true,
            options: [
              { name: 'Regular', price: 350 },
              { name: 'Large', price: 450 },
            ],
          },
        ]),
        addons: JSON.stringify([
          { name: 'Extra Raita', price: 50 },
          { name: 'Boiled Egg', price: 30 },
        ]),
        prep_time_minutes: 20,
        kitchen_station: 'hot',
        is_popular: true,
        sort_order: 1,
      },
    }),
    prisma.menuItem.create({
      data: {
        restaurant_id: restaurant.id,
        category_id: categories[2].id, // Main Course
        name: 'Butter Chicken',
        name_local: 'बटर चिकन',
        description: 'Creamy tomato-based chicken curry',
        pricing_type: 'SINGLE',
        base_price: 450,
        prep_time_minutes: 25,
        kitchen_station: 'hot',
        spice_level: 2,
        sort_order: 2,
      },
    }),
    // Rice & Noodles
    prisma.menuItem.create({
      data: {
        restaurant_id: restaurant.id,
        category_id: categories[3].id, // Rice & Noodles
        name: 'Veg Fried Rice',
        name_local: 'भेज फ्राइड राइस',
        description: 'Wok-tossed rice with vegetables',
        pricing_type: 'SINGLE',
        base_price: 250,
        is_vegetarian: true,
        prep_time_minutes: 15,
        kitchen_station: 'hot',
        sort_order: 1,
      },
    }),
    prisma.menuItem.create({
      data: {
        restaurant_id: restaurant.id,
        category_id: categories[3].id, // Rice & Noodles
        name: 'Chicken Chowmein',
        name_local: 'चिकन चाउमिन',
        description: 'Stir-fried noodles with chicken',
        pricing_type: 'SINGLE',
        base_price: 280,
        prep_time_minutes: 15,
        kitchen_station: 'hot',
        sort_order: 2,
      },
    }),
    // Beverages
    prisma.menuItem.create({
      data: {
        restaurant_id: restaurant.id,
        category_id: categories[4].id, // Beverages
        name: 'Coke',
        name_local: 'कोक',
        description: 'Chilled Coca-Cola',
        pricing_type: 'SINGLE',
        base_price: 60,
        is_vegetarian: true,
        is_vegan: true,
        prep_time_minutes: 1,
        kitchen_station: 'bar',
        sort_order: 1,
      },
    }),
    prisma.menuItem.create({
      data: {
        restaurant_id: restaurant.id,
        category_id: categories[4].id, // Beverages
        name: 'Fresh Lime Soda',
        name_local: 'लेमन सोडा',
        description: 'Refreshing lime with soda',
        pricing_type: 'VARIANTS',
        base_price: 80,
        variant_groups: JSON.stringify([
          {
            name: 'Type',
            required: true,
            options: [
              { name: 'Sweet', price: 80 },
              { name: 'Salty', price: 80 },
              { name: 'Mixed', price: 80 },
            ],
          },
        ]),
        is_vegetarian: true,
        is_vegan: true,
        prep_time_minutes: 3,
        kitchen_station: 'bar',
        sort_order: 2,
      },
    }),
    // Desserts
    prisma.menuItem.create({
      data: {
        restaurant_id: restaurant.id,
        category_id: categories[5].id, // Desserts
        name: 'Gulab Jamun',
        name_local: 'गुलाब जामुन',
        description: 'Sweet milk dumplings in sugar syrup',
        pricing_type: 'SINGLE',
        base_price: 120,
        is_vegetarian: true,
        prep_time_minutes: 5,
        kitchen_station: 'dessert',
        sort_order: 1,
      },
    }),
  ]);
  console.log('✅ Menu items created');

  // ═══════════════════════════════════════════════════════════════════════════
  // 7. Create Restaurant Settings
  // ═══════════════════════════════════════════════════════════════════════════
  await prisma.restaurantSettings.create({
    data: {
      restaurant_id: restaurant.id,
      require_confirmation_no_session: true,
      require_confirmation_active_session: false,
      confirmation_timeout_minutes: 5,
      guest_count_entry_roles: ['WAITER', 'HOST', 'MANAGER'],
      guest_count_update_roles: ['WAITER', 'MANAGER'],
      quick_order_enabled: true,
      quick_order_roles: ['WAITER', 'MANAGER'],
      loyalty_enabled: true,
      points_per_amount: 10,
      show_points_on_menu: true,
      primary_verification_method: 'staff',
    },
  });
  console.log('✅ Restaurant settings created');

  // ═══════════════════════════════════════════════════════════════════════════
  // 8. Create Sample Customer
  // ═══════════════════════════════════════════════════════════════════════════
  await prisma.customer.create({
    data: {
      restaurant_id: restaurant.id,
      customer_id: 'CUST-0001',
      name: 'Ramesh Sharma',
      phone: '+977-9841234567',
      email: 'ramesh@example.com',
      phone_verified: true,
      verification_method: 'staff',
      tier: 'SILVER',
      points_balance: 350,
      points_earned_lifetime: 850,
      points_redeemed_lifetime: 500,
      total_spent: 8500,
      total_visits: 12,
      average_order_value: 708.33,
    },
  });
  console.log('✅ Sample customer created');

  // ═══════════════════════════════════════════════════════════════════════════
  // 9. Create Sample Promotion
  // ═══════════════════════════════════════════════════════════════════════════
  await prisma.promotion.create({
    data: {
      restaurant_id: restaurant.id,
      name: 'Happy Hour',
      description: '20% off all beverages from 3-6 PM',
      type: 'HAPPY_HOUR',
      discount_type: 'PERCENTAGE',
      discount_value: 20,
      applies_to: 'categories',
      category_ids: [categories[4].id], // Beverages
      days_of_week: ['mon', 'tue', 'wed', 'thu', 'fri'],
      start_time: '15:00',
      end_time: '18:00',
      show_on_menu: true,
      show_countdown: true,
      banner_message: '🕐 Happy Hour! 20% off all drinks until 6 PM',
      status: 'ACTIVE',
    },
  });
  console.log('✅ Sample promotion created');

  // ═══════════════════════════════════════════════════════════════════════════
  // 10. Create Chat Groups
  // ═══════════════════════════════════════════════════════════════════════════
  await Promise.all([
    prisma.chatGroup.create({
      data: {
        restaurant_id: restaurant.id,
        name: 'All Staff',
        type: 'system',
        members: users.map(u => u.id),
      },
    }),
    prisma.chatGroup.create({
      data: {
        restaurant_id: restaurant.id,
        name: 'Kitchen Team',
        type: 'system',
        members: users.filter(u => ['KITCHEN', 'MANAGER', 'OWNER'].includes(u.role)).map(u => u.id),
      },
    }),
    prisma.chatGroup.create({
      data: {
        restaurant_id: restaurant.id,
        name: 'Floor Staff',
        type: 'system',
        members: users.filter(u => ['WAITER', 'CASHIER', 'MANAGER', 'OWNER'].includes(u.role)).map(u => u.id),
      },
    }),
  ]);
  console.log('✅ Chat groups created');

  console.log('');
  console.log('🎉 Seed completed successfully!');
  console.log('');
  console.log('📋 Login credentials:');
  console.log('   Owner:   owner@lumora.com / password123 / PIN: 1234');
  console.log('   Manager: manager@lumora.com / password123 / PIN: 1234');
  console.log('   Cashier: cashier@lumora.com / password123 / PIN: 1234');
  console.log('   Waiter:  waiter@lumora.com / password123 / PIN: 1234');
  console.log('   Kitchen: kitchen@lumora.com / password123 / PIN: 1234');
  console.log('');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

---

# END OF SPECIFICATION
```
╔═══════════════════════════════════════════════════════════════════════════════╗
║                                                                               ║
║  QR DINE - COMPLETE SYSTEM SPECIFICATION                                      ║
║                                                                               ║
║  Version: 1.0.0                                                               ║
║  Last Updated: January 2026                                                   ║
║  Total Pages: ~100                                                            ║
║                                                                               ║
║  This document is the SINGLE SOURCE OF TRUTH for QR DINE development.        ║
║  All developers and AI assistants MUST follow this specification.            ║
║                                                                               ║
║  Document Sections:                                                           ║
║  ├── 1. Project Overview                                                     ║
║  ├── 2. Tech Stack                                                           ║
║  ├── 3. Project Structure                                                    ║
║  ├── 4. Business Model                                                       ║
║  ├── 5. License System                                                       ║
║  ├── 6. User Roles & Permissions                                             ║
║  ├── 7. Database Schema (Complete Prisma)                                    ║
║  ├── 8. Feature Specifications                                               ║
║  ├── 9. API Architecture                                                     ║
║  ├── 10. UI/UX Guidelines                                                    ║
║  ├── 11. Desktop Application                                                 ║
║  ├── 12. Coding Conventions                                                  ║
║  ├── 13. Critical Rules                                                      ║
║  ├── Appendix A: Environment Variables                                       ║
║  └── Appendix B: Sample Seed Data                                            ║
║                                                                               ║
║  © 2026 LUMORA. All rights reserved.                                         ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝

---

## How to Use This File

1. **Create the file**:
   - Create `PROJECT-SPEC.md` in your project root folder
   - Copy ALL content above (from `# QR DINE - Complete System Specification` to the end)
   - Paste into the file and save

2. **File size**: This is approximately 100KB of text (~4000 lines)

3. **Next files needed**:
   - `ROADMAP.md` - 50-step development roadmap
   - `AI-PROMPT.md` - Context prompt for VS Code Claude

---

**Do you want me to create the `ROADMAP.md` file next?**

This will be the detailed 50-step roadmap with:
- Each step's tasks
- Deliverables
- Verification checklist
- Dependencies
