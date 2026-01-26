# QR-Dine Implementation Gap Analysis

> Analysis of FEATURE_DOCUMENTATION.md vs Current Implementation
> Generated: January 25, 2026

---

## Executive Summary

| Category | Count |
|----------|-------|
| Fully Implemented | 22 features |
| Partially Implemented | 8 features |
| Not Implemented | 6 features |
| Mechanism Changes Needed | 5 areas |

---

## 1. FULLY IMPLEMENTED FEATURES ✅

These features are documented and fully built in the codebase:

### Core System
| Feature | Documentation Section | Implementation Location |
|---------|----------------------|------------------------|
| Multi-tenant Architecture | §1, §16 | License model, restaurant_id on all tables |
| User Roles (7 roles) | §1 | User model with role enum |
| Role-based Permissions | §6 | RolePermission model |
| Activity Log/Audit Trail | §7 | ActivityLog model, /api/activity-log |
| Session Management | §8 | TableSession model |

### Guest Experience
| Feature | Documentation Section | Implementation Location |
|---------|----------------------|------------------------|
| QR Code Table Linking | §18 | Table.qrCode, /m/[restaurant]/[table] |
| OTP Verification | §19 | Table.currentOtp, /api/guest/verify-otp |
| Guest Menu Browsing | §18 | /m/[restaurant]/[table]/menu |
| Guest Cart & Ordering | §18 | /m/[restaurant]/[table]/cart, order |

### Staff Operations
| Feature | Documentation Section | Implementation Location |
|---------|----------------------|------------------------|
| Kitchen Display (KDS) | §3 | /[restaurant]/kitchen |
| Order Management | §14 | /[restaurant]/orders |
| Table Management | §5 | /[restaurant]/tables |
| Billing & Payments | §23 | /[restaurant]/billing |
| EOD Settlement | §23 | /[restaurant]/billing/eod |

### Advanced Features
| Feature | Documentation Section | Implementation Location |
|---------|----------------------|------------------------|
| Customer Loyalty (4 tiers) | §21 | Customer model, PointsTransaction |
| Promotions (9 types) | §28 | Promotion model, /[restaurant]/promotions |
| Staff Management | §9 | Staff model, StaffShift, StaffAttendance |
| Internal Chat | §29 | ChatMessage, ChatGroup models |
| Daily Briefings | §29 | DailyBriefing model, /[restaurant]/briefing |
| Shift Notes | §29 | ShiftNote model, /[restaurant]/shift-notes |
| Lost & Found | §29 | LostFoundItem model, /[restaurant]/lost-found |
| Reports & Analytics | §15 | /[restaurant]/reports/* (5 report types) |

### Super Admin
| Feature | Documentation Section | Implementation Location |
|---------|----------------------|------------------------|
| Multi-restaurant Management | §16 | /superadmin/restaurants |
| License Management | §30 | License model, /superadmin/licenses |

---

## 2. PARTIALLY IMPLEMENTED FEATURES ⚠️

These features are documented but only partially built:

### 2.1 Bar Display System (BDS)
**Documentation:** §3 - Separate bar display with drink-specific workflow
**Current State:** Combined with Kitchen Display
**Gap:**
- No separate `/[restaurant]/bar` route
- No bar-specific filtering (instant drinks vs mixed drinks)
- Missing bartender-specific item actions

**Recommendation:**
```
Create /[restaurant]/bar with:
- Filter items by kitchenStation = "bar"
- Add drink-specific prep time categories
- Separate notification stream for bar orders
```

### 2.2 6 Dining Phases Tracking
**Documentation:** §2 - Every session goes through 6 phases with specific timestamps
**Current State:** TableSession has basic timestamps
**Gap:**
- Missing phase-specific statuses (BROWSING, ASSISTANCE_NEEDED, BILL_REQUESTED)
- Missing timestamps: browsingAt, assistanceRequestedAt, billRequestedAt, vacatedAt, cleaningStartedAt
- No assistance request feature for guests

**Recommendation:**
```typescript
// Add to TableSession model:
currentPhase: Phase // SEATING | ORDERING | PREPARATION | ASSISTANCE | BILLING | CLEANUP
browsingAt: DateTime?
assistanceRequestedAt: DateTime?
assistanceAcknowledgedAt: DateTime?
billRequestedAt: DateTime?
vacatedAt: DateTime?
cleaningStartedAt: DateTime?
cleaningDoneAt: DateTime?
```

### 2.3 Hybrid Order Flow
**Documentation:** §24 - Guest orders need staff confirmation when no active session
**Current State:** Orders go directly to kitchen
**Gap:**
- Missing `requiresConfirmation` field on Order
- No PENDING_CONFIRMATION status
- No confirmation timeout/escalation logic
- Missing staff confirmation UI

**Recommendation:**
```typescript
// Order model additions:
requiresConfirmation: Boolean @default(false)
confirmedAt: DateTime?
confirmedBy: String?
rejectedAt: DateTime?
rejectedBy: String?
rejectionReason: String?

// New status:
PENDING_CONFIRMATION // Before CONFIRMED

// Settings:
confirmationTimeoutMinutes: Int @default(5)
timeoutAction: "auto_confirm" | "escalate" | "notify_guest"
```

### 2.4 Guest Count Management
**Documentation:** §25 - Staff ONLY enters guest count
**Current State:** Guest count field exists but flow not enforced
**Gap:**
- No UI prompt for waiter to enter guest count during order confirmation
- No tracking of who set guest count and when
- No guest count history

**Recommendation:**
```typescript
// TableSession additions:
guestCountHistory: Json @default("[]")
// Format: [{ count: 4, setBy: "userId", setAt: "...", reason: "initial" }]
```

### 2.5 Quick Order System
**Documentation:** §25 - Fast waiter ordering with frequent items
**Current State:** Basic order creation exists
**Gap:**
- No "Frequently Ordered" items list
- No one-tap add for simple items
- No quick tags ("Less spicy", "Rush", "VIP")
- No fast search interface

**Recommendation:**
```
Create /[restaurant]/quick-order with:
- Top 10 frequently ordered items
- Fast search with item suggestions
- Quick tag buttons
- Minimal variant popup
```

### 2.6 Customer Verification (MPIN)
**Documentation:** §26 - Staff verification (default) + SMS OTP + MPIN
**Current State:** Basic customer model exists
**Gap:**
- No MPIN system for returning customers
- No device fingerprinting/trusted devices
- No staff verification flow
- SMS OTP not integrated

**Recommendation:**
```typescript
// Customer model additions:
mpinHash: String?
mpinSetAt: DateTime?
mpinAttempts: Int @default(0)
mpinLockedUntil: DateTime?
verificationMethod: String? // "staff" | "sms_otp"
verifiedAt: DateTime?
verifiedBy: String?

// CustomerDevice model exists but needs:
- Trust/verify flow implementation
- Max 3 devices per customer
```

### 2.7 Points Display on Menu
**Documentation:** §27 - Show points customer will earn on each item
**Current State:** Loyalty system exists but points not shown on menu
**Gap:**
- Menu items don't show potential points
- Cart doesn't show total points to earn
- No "Join to earn" prompt for non-members
- No tier multiplier badge

**Recommendation:**
```
Guest menu should show:
- "💰 +44 pts (1.25×)" on each item for members
- "Could earn 35 pts (Join to earn!)" for non-members
- Total points to earn in cart summary
```

### 2.8 Table Merge/Transfer Operations
**Documentation:** §5 - Merge tables, unmerge, transfer with smart QR handling
**Current State:** Basic table management
**Gap:**
- No table merge functionality
- No unmerge functionality
- No transfer session between tables
- No smart QR handling when guest scans different table

**Recommendation:**
```typescript
// Table model additions:
isMainTable: Boolean @default(true)
mergedWithTableId: String?
mergedTables: Table[] // relation

// API endpoints needed:
POST /api/tables/merge
POST /api/tables/unmerge
POST /api/tables/transfer
```

---

## 3. NOT IMPLEMENTED FEATURES ❌

These features are documented but NOT built:

### 3.1 Biometric Integration
**Documentation:** §22 - ZKTeco device integration for staff attendance
**Gap:** Complete feature missing
- No BiometricDevice model
- No StaffBiometric model
- No BiometricLog model
- No device sync API
- No fingerprint enrollment

**Priority:** Medium (can use manual clock-in for now)

### 3.2 Desktop App & Windows Installer
**Documentation:** §31 - Electron app with NSIS installer
**Gap:** Complete feature missing
- No `/apps/desktop` folder
- No Electron setup
- No system tray manager
- No Windows service
- No setup wizard

**Priority:** Low (web app works fine initially)

### 3.3 Backup System
**Documentation:** §32 - Local + cloud backup
**Gap:** Complete feature missing
- No BackupLog model
- No backup API
- No scheduled backups
- No cloud backup integration

**Priority:** High (critical for production)

### 3.4 Reservation System
**Documentation:** §11 - Host/Reception features with reservations
**Gap:** Minimal implementation
- TABLE_RESERVED status exists
- No Reservation model
- No reservation management UI
- No waitlist management
- No reservation confirmation SMS

**Priority:** Medium

### 3.5 Real-time WebSocket/SSE
**Documentation:** §3, §4 - Live updates for KDS, waiter notifications
**Gap:** Partial implementation
- `/api/notifications/stream` exists but unclear implementation
- No Pusher/WebSocket setup visible
- Kitchen uses 10-second polling instead of real-time

**Priority:** Medium (polling works but not ideal)

### 3.6 Payment Gateway Integration
**Documentation:** §23 - eSewa, Khalti, Fonepay integration
**Gap:** Models exist but no actual integration
- Payment methods defined in enum
- No gateway API calls
- No payment verification
- No webhook handlers

**Priority:** High (for cashless payments)

---

## 4. MECHANISM CHANGES NEEDED 🔧

These are working features that need design/logic changes:

### 4.1 Order Flow - Add Confirmation Step

**Current:** Guest order → Kitchen
**Documented:** Guest order → PENDING_CONFIRMATION → Staff confirms → Kitchen

```
CHANGE NEEDED:
┌─────────────┐     ┌───────────────────┐     ┌──────────────┐     ┌─────────┐
│ Guest Order │ --> │ PENDING_CONFIRM   │ --> │ Staff Confirm│ --> │ Kitchen │
└─────────────┘     │ (if no session)   │     │ + Guest Count│     └─────────┘
                    └───────────────────┘     └──────────────┘

Files to modify:
- apps/web/app/api/guest/order/route.ts (add confirmation logic)
- apps/web/app/[restaurant]/orders/page.tsx (add confirmation UI)
- packages/database/prisma/schema.prisma (add Order fields)
```

### 4.2 Table OTP - 3 Digits, Not 4

**Current:** 4-digit OTP generation
**Documented:** 3-digit OTP (000-999)

```
CHANGE NEEDED:
File: apps/web/app/api/tables/[id]/otp/route.ts

// Current:
const otp = Math.floor(1000 + Math.random() * 9000).toString()

// Change to:
const otp = Math.floor(100 + Math.random() * 900).toString().padStart(3, '0')

Also update:
- Guest OTP input UI (3 fields instead of 4)
- Table display UI (show 3 digits)
```

### 4.3 Customer Privacy - Hide Spending from Waiter/Cashier

**Current:** All customer data visible to all staff
**Documented:** Spending data hidden from Waiter/Cashier

```
CHANGE NEEDED:
Waiter/Cashier should only see:
- name, phone
- tier
- points_balance
- total_visits

Hidden from Waiter/Cashier (Owner/Manager only):
- total_spent
- average_order_value
- individual order amounts

Files to modify:
- apps/web/app/api/loyalty/customers/route.ts (filter by role)
- apps/web/app/api/loyalty/customers/[id]/route.ts (filter by role)
- apps/web/app/[restaurant]/customers/page.tsx (conditional display)
```

### 4.4 Waiter Cannot See Bill Amounts

**Current:** Waiter sees full order/bill details
**Documented:** Waiter CANNOT see billing:view_amount

```
CHANGE NEEDED:
In Order/Bill displays for Waiter role:
- Hide subtotal, tax, total fields
- Show only item names and quantities
- No bill generation access

Files to modify:
- apps/web/app/[restaurant]/orders/page.tsx (hide amounts for WAITER)
- Permission check in components
```

### 4.5 Activity Log - Add Missing Categories

**Current:** Basic activity logging
**Documented:** 9 categories with priority levels

```
CHANGE NEEDED:
Add missing activity types:
- assistance_requested / acknowledged / completed
- table_transferred
- table_merged / unmerged
- guest_count_updated (with history)
- item_out_of_stock (86'd)
- vip_customer_arrived

Add priority levels:
- critical, urgent, warning, info, notice

File: apps/web/lib/activity-log.ts
```

---

## 5. IMPLEMENTATION PRIORITY MATRIX

### Immediate (Before Launch)
1. ⚠️ Hybrid Order Flow with confirmation
2. ⚠️ Customer privacy (hide spending from staff)
3. ⚠️ Waiter billing restrictions
4. ❌ Payment gateway integration (at least one)
5. ❌ Backup system (at minimum local backup)

### Short-term (First Month)
1. ⚠️ 6 Dining Phases tracking
2. ⚠️ Guest count management workflow
3. ⚠️ Points display on menu
4. ⚠️ Table merge/transfer operations
5. 🔧 OTP change to 3 digits

### Medium-term (Quarter 1)
1. ⚠️ Quick Order system
2. ⚠️ Customer MPIN verification
3. ⚠️ Bar Display System (separate from KDS)
4. ❌ Reservation system
5. ❌ Real-time WebSocket

### Long-term (Quarter 2+)
1. ❌ Biometric integration
2. ❌ Desktop app & installer
3. ❌ Advanced multi-station kitchen

---

## 6. FILES REQUIRING CHANGES

### Database Schema (packages/database/prisma/schema.prisma)
```diff
+ Order: requiresConfirmation, confirmedAt, confirmedBy, rejectedAt, rejectionReason
+ TableSession: currentPhase, phase timestamps, guestCountHistory
+ Table: isMainTable, mergedWithTableId
+ Customer: mpinHash, mpinSetAt, verificationMethod, verifiedAt, verifiedBy
+ New: Reservation model
+ New: BackupLog model (if not exists)
```

### API Routes (apps/web/app/api/)
```
+ POST /api/orders/[id]/confirm (staff confirmation)
+ POST /api/orders/[id]/reject
+ POST /api/tables/merge
+ POST /api/tables/unmerge
+ POST /api/tables/transfer
+ POST /api/customers/verify-mpin
+ GET/POST /api/reservations
+ POST /api/backup
```

### UI Pages (apps/web/app/[restaurant]/)
```
+ /quick-order (new page)
+ /bar (new page or enhance kitchen)
+ /reservations (new page)
Modify: /orders (add confirmation flow)
Modify: /customers (hide spending for waiter/cashier)
Modify: /tables (add merge/transfer)
```

### Guest UI (apps/web/app/m/)
```
Modify: Menu to show points to earn
Modify: Cart to show total points
Add: Assistance request button
Add: Bill request feature
```

---

## 7. SUMMARY

The QR-Dine system has a solid foundation with most core features implemented. The main gaps are:

1. **Order Confirmation Flow** - Critical business logic not implemented
2. **Privacy Controls** - Staff seeing data they shouldn't
3. **Payment Integration** - No actual payment processing
4. **Missing Models** - Reservation, Backup tracking
5. **Real-time Updates** - Currently using polling

The codebase is well-structured and follows good patterns. Implementing the missing features should be straightforward given the existing architecture.

---

> This analysis should be reviewed and used to create implementation tasks.
> Last Updated: January 25, 2026
