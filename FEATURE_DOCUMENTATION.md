# QR-Dine Feature Documentation

> Comprehensive documentation of all features designed for the QR-Dine Restaurant Management System.
> This document serves as the implementation reference for the development team.

---

## Table of Contents

1. [System Overview](#system-overview)
2. [6 Dining Phases](#6-dining-phases)
3. [Kitchen & Bar Display System](#kitchen--bar-display-system)
4. [Waiter Dashboard](#waiter-dashboard)
5. [Table Management](#table-management)
6. [Manager Dashboard](#manager-dashboard)
7. [Activity Log (Audit Trail)](#activity-log-audit-trail)
8. [Session Timeline](#session-timeline)
9. [Staff Performance Tracking](#staff-performance-tracking)
10. [Restaurant Service Modes](#restaurant-service-modes)
11. [Host/Reception Features](#hostreception-features)
12. [Seating Styles (Nepal vs Western)](#seating-styles-nepal-vs-western)
13. [Phone Order Feature](#phone-order-feature)
14. [Order Source & Dining Choice](#order-source--dining-choice)
15. [Clickable Reports System](#clickable-reports-system)
16. [Super Admin Dashboard](#super-admin-dashboard)
17. [Settings & Configuration](#settings--configuration)
18. [Guest QR Experience](#guest-qr-experience)
19. [OTP Verification System](#otp-verification-system)
20. [Menu System with Multi-Price Items](#menu-system-with-multi-price-items)
21. [Customer Loyalty & CRM](#customer-loyalty--crm)
22. [Biometric Integration](#biometric-integration)
23. [Cashier Dashboard](#cashier-dashboard)
24. [Hybrid Order Flow](#hybrid-order-flow)
25. [Quick Order & Guest Count Management](#quick-order--guest-count-management)
26. [Customer Verification System](#customer-verification-system)
27. [Points Display on Menu](#points-display-on-menu)
28. [Promotions & Offers](#promotions--offers)
29. [Internal Communication System](#internal-communication-system)
30. [License System & Feature Flags](#license-system--feature-flags)
31. [Desktop App & Windows Installer](#desktop-app--windows-installer)
32. [Backup System](#backup-system)
33. [Development Roadmap](#development-roadmap)
34. [PROJECT-SPEC.md Template](#project-specmd-template)

---

## System Overview

QR-Dine is a comprehensive restaurant management system designed for both Western-style and Nepal-style restaurants. The system handles:

- **Guest Experience**: QR code ordering, real-time order tracking
- **Staff Operations**: Waiter dashboard, kitchen display, bar display
- **Management**: Analytics, activity logs, performance tracking
- **Multi-tenant**: Super admin manages multiple restaurants

### User Roles

| Role | Access Level | Primary Functions |
|------|--------------|-------------------|
| Super Admin | System-wide | Manage restaurants, global analytics |
| Owner | Restaurant-wide | Full access, settings, reports |
| Manager | Restaurant-wide | Staff management, operations, reports |
| Cashier | Billing focused | Bills, payments, end-of-day |
| Host/Receptionist | Front-of-house | Seating, reservations, waitlist |
| Waiter/Server | Floor operations | Orders, serving, table management |
| Kitchen Staff | Kitchen only | Order preparation, KDS |
| Bar Staff | Bar only | Drink preparation, BDS |

---

## 6 Dining Phases

Every table session goes through these phases with specific statuses and timestamps:

### Phase 1: Seating
```
Statuses: WAITING → SEATED
Timestamps: waitingAt, seatedAt
Activities:
  - table_seated: Guest seated at table
  - session_started: New session created
  - guest_count_updated: Party size changed
```

### Phase 2: Ordering
```
Statuses: BROWSING → ORDERING → ORDER_PLACED
Timestamps: browsingAt, orderPlacedAt
Activities:
  - order_placed: New order submitted
  - items_added: Items added to existing order
  - order_modified: Order changed (quantity, special requests)
```

### Phase 3: Preparation
```
Statuses: IN_KITCHEN → PREPARING → READY
Timestamps: kitchenReceivedAt, prepStartedAt, readyAt
Activities:
  - kitchen_received: Order received in kitchen
  - bar_received: Drinks received at bar
  - prep_started: Cooking started
  - drink_started: Drink preparation started
  - item_ready: Individual item ready
  - drink_ready: Drink ready
```

### Phase 4: Assistance
```
Statuses: EATING → ASSISTANCE_NEEDED
Timestamps: servedAt, assistanceRequestedAt
Activities:
  - water_served: Water/complimentary items served
  - food_served: Main dishes served
  - drink_served: Drinks served
  - assistance_requested: Guest pressed help button
  - assistance_acknowledged: Staff responded
  - assistance_completed: Issue resolved
```

### Phase 5: Billing
```
Statuses: BILL_REQUESTED → PAYING → PAID
Timestamps: billRequestedAt, billPrintedAt, paidAt
Activities:
  - bill_requested: Guest requested bill
  - bill_printed: Bill generated
  - bill_delivered: Bill given to guest
  - payment_collected: Payment received
  - partial_payment: Split payment made
  - payment_completed: Full payment done
```

### Phase 6: Cleanup
```
Statuses: VACATED → CLEANING → AVAILABLE
Timestamps: vacatedAt, cleaningStartedAt, cleaningDoneAt
Activities:
  - table_vacated: Guests left
  - cleaning_started: Staff cleaning table
  - cleaning_done: Table ready for next guests
  - session_ended: Session closed
```

### Phase Transition Diagram
```
┌──────────┐   ┌──────────┐   ┌─────────────┐   ┌────────────┐   ┌─────────┐   ┌─────────┐
│ SEATING  │ → │ ORDERING │ → │ PREPARATION │ → │ ASSISTANCE │ → │ BILLING │ → │ CLEANUP │
└──────────┘   └──────────┘   └─────────────┘   └────────────┘   └─────────┘   └─────────┘
     ↓              ↓               ↓                 ↓               ↓             ↓
  seated_at    order_placed   kitchen_received   food_served    bill_printed   vacated_at
```

---

## Kitchen & Bar Display System

### Kitchen Display System (KDS)

Two view modes available:

#### Simple View (Default)
```
┌─────────────────────────────────────────────────────────────┐
│ 🍳 KITCHEN DISPLAY                              [⚙️ Settings]│
├─────────────────────────────────────────────────────────────┤
│ ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐ │
│ │ ORDER #12       │ │ ORDER #13       │ │ ORDER #14       │ │
│ │ Table 5    4min │ │ Table 8    2min │ │ Table 3    NEW  │ │
│ ├─────────────────┤ ├─────────────────┤ ├─────────────────┤ │
│ │ □ Momo (2)      │ │ □ Dal Bhat      │ │ □ Chowmein (2)  │ │
│ │   - Extra spicy │ │ □ Veg Momo      │ │ □ Fried Rice    │ │
│ │ □ Thukpa        │ │   - No onion    │ │                 │ │
│ │                 │ │ □ Kheer         │ │                 │ │
│ └─────────────────┘ └─────────────────┘ └─────────────────┘ │
│                                                             │
│ [PENDING: 3] [PREPARING: 2] [READY: 1]                     │
└─────────────────────────────────────────────────────────────┘

Item Actions:
□ (checkbox) → Click to mark as PREPARING → Click again for READY
Long press → Options: Delay, Out of Stock, Split Order
```

#### Advanced View (Multi-Station)
```
┌──────────────────────────────────────────────────────────────────┐
│ 🍳 KITCHEN DISPLAY - ADVANCED                    [Simple View]   │
├──────────────────────────────────────────────────────────────────┤
│  [ALL] [GRILL] [FRY] [COLD] [DESSERT]           Filter by station│
├────────────────────┬────────────────────┬────────────────────────┤
│ 📥 INCOMING (5)    │ 🔥 COOKING (3)     │ ✅ READY (2)          │
├────────────────────┼────────────────────┼────────────────────────┤
│ ORD#12 - Table 5   │ ORD#10 - Table 2   │ ORD#08 - Table 7      │
│ ┌────────────────┐ │ ┌────────────────┐ │ ┌────────────────────┐ │
│ │🔥 Momo (2)     │ │ │🔥 Grilled Fish │ │ │✅ Chowmein (DONE)  │ │
│ │   GRILL - 12m  │ │ │   8:45 elapsed │ │ │   Waiting pickup   │ │
│ │   Extra spicy  │ │ │   Est: 2m left │ │ │   Ready 2m ago     │ │
│ │   [Start] [!]  │ │ │   [Done] [+2m] │ │ │   [Picked Up]      │ │
│ └────────────────┘ │ └────────────────┘ │ └────────────────────┘ │
│ │🍳 Thukpa       │ │                    │                        │
│ │   FRY - 15m    │ │                    │                        │
└────────────────────┴────────────────────┴────────────────────────┘

Features:
- Station filtering (Grill, Fry, Cold, Dessert)
- Estimated prep time per item
- Timer with countdown
- Drag items between columns
- Color coding for urgency
```

### Bar Display System (BDS)
```
┌─────────────────────────────────────────────────────────────┐
│ 🍺 BAR DISPLAY                                  [⚙️ Settings]│
├─────────────────────────────────────────────────────────────┤
│ ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐ │
│ │ ORDER #12       │ │ ORDER #13       │ │ ORDER #14       │ │
│ │ Table 5    2min │ │ Table 8    1min │ │ Table 3    NEW  │ │
│ ├─────────────────┤ ├─────────────────┤ ├─────────────────┤ │
│ │ □ Coke (2)      │ │ □ Mango Lassi   │ │ □ Beer (3)      │ │
│ │ □ Fresh Juice   │ │ □ Lemon Soda    │ │ □ Cocktail      │ │
│ │   - Less sugar  │ │                 │ │   - No ice      │ │
│ └─────────────────┘ └─────────────────┘ └─────────────────┘ │
│                                                             │
│ [PENDING: 3] [MAKING: 2] [READY: 4]                        │
└─────────────────────────────────────────────────────────────┘

Drink Categories:
- 🥤 Soft Drinks (instant)
- 🍺 Beer/Bottled (instant)
- 🧃 Fresh Juice (3-5 min)
- 🍹 Cocktails (5-8 min)
- ☕ Hot Drinks (3-5 min)
```

### KDS/BDS Interaction Workflow
```
Order Placed → Split by destination
                    ↓
        ┌──────────┴──────────┐
        ↓                     ↓
   Kitchen Items          Bar Items
        ↓                     ↓
   KDS Receives          BDS Receives
        ↓                     ↓
   Cook Starts           Bartender Starts
        ↓                     ↓
   Item Ready            Drink Ready
        ↓                     ↓
        └──────────┬──────────┘
                   ↓
           Waiter Notified
                   ↓
           Food Picked Up
                   ↓
           Served to Guest
```

---

## Waiter Dashboard

### Main Dashboard Layout
```
┌──────────────────────────────────────────────────────────────┐
│ 👤 Welcome, Ram!                               [🔔 3] [☰]    │
├──────────────────────────────────────────────────────────────┤
│                    MY TABLES TODAY                           │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐            │
│  │ T-01 🟢 │ │ T-05 🟡 │ │ T-08 🔴 │ │ T-12 ⚪ │            │
│  │ Seated  │ │ Ordering│ │ Needs   │ │ Empty   │            │
│  │ 2 guests│ │ 4 guests│ │ Attn!   │ │         │            │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘            │
├──────────────────────────────────────────────────────────────┤
│ 🔔 ALERTS                                                    │
│ ┌──────────────────────────────────────────────────────────┐ │
│ │ 🔴 Table 8 - Assistance requested (2 min ago)            │ │
│ │ 🟡 Table 5 - Food ready for pickup                       │ │
│ │ 🟡 Table 3 - Bill requested                              │ │
│ └──────────────────────────────────────────────────────────┘ │
├──────────────────────────────────────────────────────────────┤
│ 📊 TODAY'S STATS                                             │
│ Tables Served: 12  │  Orders: 28  │  Tips: Rs 1,250         │
└──────────────────────────────────────────────────────────────┘

Status Colors:
🟢 Green - All good, guests comfortable
🟡 Yellow - Action needed soon (food ready, bill requested)
🔴 Red - Urgent attention required (assistance, complaints)
⚪ White/Gray - Empty table
```

### Table Detail View
```
┌──────────────────────────────────────────────────────────────┐
│ ← Back                TABLE 5                    [📋 Actions]│
├──────────────────────────────────────────────────────────────┤
│ Guests: 4  │  Seated: 45 min ago  │  Total: Rs 2,450        │
├──────────────────────────────────────────────────────────────┤
│ CURRENT ORDERS                                               │
│ ┌──────────────────────────────────────────────────────────┐ │
│ │ Order #45                              Status: PREPARING │ │
│ │ ├─ Momo (2) ............... Rs 400    🔥 Cooking        │ │
│ │ ├─ Dal Bhat ............... Rs 350    ✅ Ready          │ │
│ │ ├─ Thukpa ................. Rs 300    ⏳ Pending        │ │
│ │ └─ Coke (2) ............... Rs 100    ✅ Ready          │ │
│ └──────────────────────────────────────────────────────────┘ │
│                                                              │
│ ┌──────────────────────────────────────────────────────────┐ │
│ │ Order #47 (Additional)                 Status: IN_KITCHEN│ │
│ │ ├─ Fried Rice ............. Rs 250    ⏳ Pending        │ │
│ │ └─ Ice Cream .............. Rs 150    ⏳ Pending        │ │
│ └──────────────────────────────────────────────────────────┘ │
├──────────────────────────────────────────────────────────────┤
│ [🍽️ Pick Up Ready] [➕ Add Order] [💳 Generate Bill]        │
│ [🔄 Transfer Table] [📝 Add Note] [🆘 Report Issue]         │
└──────────────────────────────────────────────────────────────┘
```

### Waiter Actions
```
Primary Actions:
├─ Pick Up Food: Mark ready items as picked up
├─ Mark Served: Confirm food delivered to table
├─ Add Order: Place additional order for table
├─ Generate Bill: Create bill for table
├─ Print Bill: Send to printer
└─ Collect Payment: Mark as paid

Table Actions:
├─ Transfer Table: Move guests to different table
├─ Change Waiter: Reassign to another waiter
├─ Add Note: Add special instructions
├─ Mark Water Served: Log water service
└─ Report Issue: Flag problem for manager

Quick Actions (Swipe gestures):
├─ Swipe Right: Quick acknowledge
├─ Swipe Left: See order details
└─ Long Press: Action menu
```

---

## Table Management

### Table Operations

#### 1. Merge Tables
```
Use Case: Large party needs multiple tables

Flow:
1. Select primary table (main bill goes here)
2. Select tables to merge
3. Confirm merge
4. All orders consolidated to primary table
5. Merged tables show linked status

Visual:
┌─────┐     ┌─────┐           ┌───────────────┐
│ T-1 │  +  │ T-2 │    →      │   T-1 + T-2   │
│  4  │     │  4  │           │      8        │
└─────┘     └─────┘           └───────────────┘

Database:
- Primary table: isMainTable = true
- Secondary tables: mergedWithTableId = primaryTableId
- Session links all tables
```

#### 2. Unmerge Tables
```
Use Case: Party splits or group leaves partially

Flow:
1. Select merged table group
2. Choose "Unmerge"
3. Assign orders to respective tables
4. Split bill if needed
5. Tables become independent

Rules:
- Only if no unpaid bills span multiple tables
- Manager approval if active orders
- Activity logged for audit
```

#### 3. Transfer Table
```
Use Case: Guest wants different table, table issue

Flow:
1. Select source table with active session
2. Click "Transfer"
3. Select destination table (must be available)
4. Confirm transfer
5. Session, orders, QR all move

What Transfers:
✅ Active session (same ID)
✅ All orders
✅ Bill in progress
✅ Guest QR context
❌ Table-specific notes
❌ Reservation (stays with original table)

Activity Log:
- table_transferred: from T-1 to T-5, reason: "Guest preference"
```

#### 4. Change Table (Smart QR Handling)
```
Scenario: Guest scans QR at new table while session active elsewhere

Detection:
- Guest has session at Table 1
- Guest scans QR at Table 5
- System detects mismatch

Options Presented:
┌──────────────────────────────────────────────────────┐
│ You have an active session at Table 1               │
│                                                      │
│ What would you like to do?                          │
│                                                      │
│ [Continue at Table 1]    [Move to Table 5]          │
│                                                      │
│ Note: Moving will transfer all your orders          │
└──────────────────────────────────────────────────────┘

If "Move to Table 5":
1. Check if Table 5 is available
2. If occupied → Show error or call waiter
3. If available → Transfer session
4. Update waiter dashboard
5. Log activity
```

### Table Status States
```
AVAILABLE → RESERVED → OCCUPIED → BILL_PENDING → CLEANING → AVAILABLE

Additional States:
- MERGED (part of merged group)
- BLOCKED (out of service)
- RESERVED_ARRIVING (reservation within 15 min)
```

---

## Manager Dashboard

### Dashboard Layout
```
┌──────────────────────────────────────────────────────────────────┐
│ 🏪 MANAGER DASHBOARD                    Today: Jan 25, 2026     │
├──────────────────────────────────────────────────────────────────┤
│ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ │
│ │ 💰 Revenue  │ │ 📋 Orders   │ │ 🪑 Tables   │ │ 👥 Staff    │ │
│ │  Rs 45,230  │ │     78      │ │   12/20     │ │    8/10     │ │
│ │  ↑ 12%      │ │  ↑ 8%      │ │   Occupied  │ │   Active    │ │
│ └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘ │
├──────────────────────────────────────────────────────────────────┤
│ 🚨 ALERTS REQUIRING ATTENTION                           [View All]│
│ ┌──────────────────────────────────────────────────────────────┐ │
│ │ 🔴 HIGH: Table 8 waiting 15+ min for food         [Resolve] │ │
│ │ 🔴 HIGH: Kitchen delay - 5 orders backed up       [View]    │ │
│ │ 🟡 MED:  Table 3 assistance request (5 min)       [Assign]  │ │
│ │ 🟡 MED:  Low stock alert: Chicken Momo            [Restock] │ │
│ │ 🟢 LOW:  Staff break request - Ram                [Approve] │ │
│ └──────────────────────────────────────────────────────────────┘ │
├──────────────────────────────────────────────────────────────────┤
│ 📊 LIVE FLOOR VIEW                                               │
│ ┌──────────────────────────────────────────────────────────────┐ │
│ │    [T1]🟢   [T2]🟡   [T3]🔴   [T4]⚪   [T5]🟢              │ │
│ │                                                              │ │
│ │    [T6]🟡   [T7]🟢   [T8]🔴   [T9]⚪   [T10]🟢             │ │
│ │                                                              │ │
│ │    BAR ████████░░   KITCHEN ██████████░░░░                   │ │
│ │         80%                    65%                           │ │
│ └──────────────────────────────────────────────────────────────┘ │
├──────────────────────────────────────────────────────────────────┤
│ [📈 Reports] [👥 Staff] [⚙️ Settings] [📋 Activity Log]        │
└──────────────────────────────────────────────────────────────────┘
```

### Alert Categories & Escalation
```
Alert Priorities:

🔴 HIGH (Immediate Action):
├─ Assistance request > 5 min unacknowledged
├─ Food waiting > 15 min (configurable)
├─ Complaint received
├─ Payment issue
└─ Staff emergency

🟡 MEDIUM (Needs Attention):
├─ Table waiting > 10 min for waiter
├─ Order delayed > standard time
├─ Stock running low
├─ Staff break requests
└─ Reservation arriving soon

🟢 LOW (Informational):
├─ Table feedback received
├─ Order completed
├─ Bill paid
└─ Session ended

Auto-Escalation Rules:
- Unacknowledged HIGH → Push notification after 2 min
- Unresolved HIGH → SMS to owner after 10 min
- Multiple HIGHs → Auto-pause new seating
```

### Manager Actions
```
Quick Actions:
├─ Approve/Deny: Voids, discounts, refunds
├─ Reassign: Move orders between staff
├─ Override: Prices, items, restrictions
├─ Communicate: Broadcast to all staff
└─ Emergency: Pause operations, alert all

Table Actions:
├─ Comp Item: Free item (with reason)
├─ Apply Discount: % or fixed amount
├─ Void Order: Remove with reason
├─ Priority: Bump order in kitchen
└─ Investigate: View full session timeline

Staff Actions:
├─ Reassign Tables: Change waiter assignments
├─ Send Break: Approve staff breaks
├─ End Shift: Clock out staff
└─ Performance: View real-time metrics
```

---

## Activity Log (Audit Trail)

### Activity Categories

```typescript
enum ActivityCategory {
  SEATING = 'seating',      // Table and seating activities
  ORDER = 'order',          // Order-related activities
  KITCHEN = 'kitchen',      // Kitchen/preparation activities
  BAR = 'bar',              // Bar activities
  WAITER = 'waiter',        // Waiter/service activities
  BILLING = 'billing',      // Payment and billing
  MANAGER = 'manager',      // Manager actions
  STAFF = 'staff',          // Staff management
  ISSUE = 'issue',          // Problems and resolutions
  SYSTEM = 'system'         // Automated system events
}
```

### Activity Types by Category

```typescript
// SEATING Activities
'table_seated'           // Guest seated at table
'session_started'        // New dining session began
'guest_count_updated'    // Party size changed
'table_transferred'      // Moved to different table
'tables_merged'          // Multiple tables combined
'tables_unmerged'        // Merged tables separated

// ORDER Activities
'order_placed'           // New order submitted
'items_added'            // Items added to order
'order_modified'         // Order changed
'item_cancelled'         // Item removed from order
'order_cancelled'        // Entire order cancelled
'special_request'        // Special instruction added

// KITCHEN Activities
'kitchen_received'       // Order received in kitchen
'prep_started'           // Cooking began
'item_ready'             // Item finished cooking
'order_ready'            // All items ready
'item_delayed'           // Item taking longer
'item_out_of_stock'      // Item unavailable

// BAR Activities
'bar_received'           // Drink order received
'drink_started'          // Drink being made
'drink_ready'            // Drink ready for pickup

// WAITER Activities
'food_picked_up'         // Waiter took food from kitchen
'food_served'            // Food delivered to table
'drink_served'           // Drinks delivered
'water_served'           // Water/complimentary served
'table_checked'          // Waiter checked on table

// BILLING Activities
'bill_requested'         // Guest asked for bill
'bill_generated'         // Bill created
'bill_printed'           // Bill sent to printer
'bill_delivered'         // Bill given to guest
'payment_received'       // Payment collected
'partial_payment'        // Split payment made
'payment_completed'      // Full payment done
'refund_issued'          // Money returned

// MANAGER Activities
'discount_applied'       // Discount given
'item_comped'            // Free item given
'order_voided'           // Order cancelled by manager
'price_override'         // Price manually changed
'staff_reassigned'       // Staff assignment changed
'escalation_resolved'    // Alert handled

// ISSUE Activities
'assistance_requested'   // Guest needs help
'assistance_acknowledged'// Staff responded
'assistance_completed'   // Help provided
'complaint_received'     // Guest complained
'complaint_resolved'     // Complaint handled
'food_returned'          // Food sent back
'item_replaced'          // Replacement provided
```

### Activity Log Schema
```typescript
interface ActivityLog {
  id: string;
  restaurantId: string;
  sessionId?: string;        // Links to table session
  tableId?: string;
  orderId?: string;
  orderItemId?: string;
  billId?: string;

  activityType: string;      // Specific activity
  activityCategory: string;  // Category grouping

  description: string;       // Human-readable description
  priority: 'info' | 'warning' | 'alert' | 'critical';

  performedBy: 'customer' | 'staff' | 'manager' | 'system';
  userId?: string;           // Staff who performed
  userName?: string;         // Denormalized for display
  userRole?: string;

  details?: {                // Additional context
    previousValue?: any;
    newValue?: any;
    reason?: string;
    amount?: number;
    itemName?: string;
    tableName?: string;
    [key: string]: any;
  };

  createdAt: Date;
}
```

### Activity Log Display
```
┌──────────────────────────────────────────────────────────────────┐
│ 📋 ACTIVITY LOG                          [Filter] [Export] [🔄] │
├──────────────────────────────────────────────────────────────────┤
│ Filters: [All Categories ▼] [All Staff ▼] [Today ▼] [All ▼]    │
├──────────────────────────────────────────────────────────────────┤
│ 2:45 PM │ 🟢 order    │ Order #456 placed          │ Table 5   │
│         │             │ 3 items, Rs 850            │ Ram (W)   │
├─────────┼─────────────┼────────────────────────────┼───────────┤
│ 2:43 PM │ 🟡 kitchen  │ Item delayed: Dal Bhat     │ Table 3   │
│         │             │ +5 min, reason: high demand│ System    │
├─────────┼─────────────┼────────────────────────────┼───────────┤
│ 2:40 PM │ 🔴 issue    │ Assistance requested       │ Table 8   │
│         │             │ Waiting: 3 min             │ Customer  │
├─────────┼─────────────┼────────────────────────────┼───────────┤
│ 2:38 PM │ 🟢 billing  │ Payment received           │ Table 2   │
│         │             │ Rs 1,200, Cash             │ Sita (C)  │
└──────────────────────────────────────────────────────────────────┘

Legend:
🟢 Info - Normal operations
🟡 Warning - Delays, issues
🔴 Alert - Needs attention
⚫ Critical - Immediate action required
```

---

## Session Timeline

### Session Timeline View
```
┌──────────────────────────────────────────────────────────────────┐
│ SESSION TIMELINE                                   Session #123 │
│ Table 5 │ Started: 1:30 PM │ Duration: 1h 15m │ Status: ACTIVE │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│ 1:30 PM ●──────────────────────────────────────────────────────│
│         │ 🪑 SEATING PHASE                                      │
│         │ ├─ Table seated (4 guests)              Ram           │
│         │ └─ Session started                      System        │
│         │                                                       │
│ 1:35 PM ●──────────────────────────────────────────────────────│
│         │ 📋 ORDERING PHASE                                     │
│         │ ├─ Order #456 placed (3 items, Rs 850)  Customer     │
│         │ │   • Momo (2) - Rs 400                              │
│         │ │   • Dal Bhat - Rs 350                              │
│         │ │   • Coke - Rs 100                                  │
│         │ └─ Water served                         Ram          │
│         │                                                       │
│ 1:38 PM ●──────────────────────────────────────────────────────│
│         │ 🍳 KITCHEN PHASE                                      │
│         │ ├─ Order received in kitchen            System       │
│         │ ├─ Coke ready                           Bar          │
│         │ ├─ Momo prep started                    Kitchen      │
│         │ └─ Dal Bhat prep started                Kitchen      │
│         │                                                       │
│ 1:50 PM ●──────────────────────────────────────────────────────│
│         │ 🍽️ SERVICE PHASE                                      │
│         │ ├─ Coke served                          Ram          │
│         │ ├─ Momo ready                           Kitchen      │
│         │ ├─ Food picked up                       Ram          │
│         │ └─ All items served                     Ram          │
│         │                                                       │
│ 2:15 PM ●──────────────────────────────────────────────────────│
│         │ 📋 ADDITIONAL ORDER                                   │
│         │ └─ Order #458 placed (1 item, Rs 150)   Customer     │
│         │     • Ice Cream - Rs 150                             │
│                                                                  │
│ ──────── NOW ──────────────────────────────────────────────────│
│                                                                  │
│ Pending: Bill not yet requested                                 │
└──────────────────────────────────────────────────────────────────┘
```

### Session Metrics
```
┌──────────────────────────────────────────────────────────────────┐
│ SESSION METRICS                                                  │
├─────────────────┬────────────────┬───────────────────────────────┤
│ Duration        │ 1h 15m         │ ████████████████░░░░ ongoing │
├─────────────────┼────────────────┼───────────────────────────────┤
│ Total Orders    │ 2              │ Order #456, #458             │
├─────────────────┼────────────────┼───────────────────────────────┤
│ Total Items     │ 4              │ Momo(2), Dal Bhat, Coke, Ice │
├─────────────────┼────────────────┼───────────────────────────────┤
│ Total Amount    │ Rs 1,000       │ Rs 850 + Rs 150              │
├─────────────────┼────────────────┼───────────────────────────────┤
│ Avg Item Time   │ 12 min         │ From order to served         │
├─────────────────┼────────────────┼───────────────────────────────┤
│ Issues          │ 0              │ No issues reported           │
├─────────────────┼────────────────┼───────────────────────────────┤
│ Waiter Visits   │ 5              │ Water, food, check-ins       │
└─────────────────┴────────────────┴───────────────────────────────┘
```

---

## Staff Performance Tracking

### Staff Work Done Metrics
```
Per-Staff Tracking:
├─ Tables Served Today
├─ Orders Handled
├─ Items Served
├─ Revenue Generated
├─ Tips Received
├─ Average Service Time
├─ Customer Ratings
├─ Issues Handled
├─ Assistance Response Time
└─ Upselling Success Rate
```

### Staff Performance Dashboard
```
┌──────────────────────────────────────────────────────────────────┐
│ 👤 STAFF PERFORMANCE                              Today | Week  │
├──────────────────────────────────────────────────────────────────┤
│ ┌──────────────────────────────────────────────────────────────┐│
│ │ Ram Sharma - Waiter                              🟢 Active  ││
│ │ ─────────────────────────────────────────────────────────── ││
│ │ Tables: 12    Orders: 28    Revenue: Rs 15,400    Tips: 850 ││
│ │ Avg Response: 2.5 min    Rating: 4.8/5    Issues: 1        ││
│ │                                                             ││
│ │ [View Details] [Assign Table] [Message]                     ││
│ └──────────────────────────────────────────────────────────────┘│
│                                                                  │
│ ┌──────────────────────────────────────────────────────────────┐│
│ │ Sita Thapa - Waiter                              🟢 Active  ││
│ │ ─────────────────────────────────────────────────────────── ││
│ │ Tables: 10    Orders: 24    Revenue: Rs 12,200    Tips: 720 ││
│ │ Avg Response: 3.1 min    Rating: 4.6/5    Issues: 0        ││
│ └──────────────────────────────────────────────────────────────┘│
│                                                                  │
│ ┌──────────────────────────────────────────────────────────────┐│
│ │ Hari Kitchen - Cook                              🟢 Active  ││
│ │ ─────────────────────────────────────────────────────────── ││
│ │ Items Cooked: 85    Avg Prep: 11 min    On-time: 92%       ││
│ └──────────────────────────────────────────────────────────────┘│
└──────────────────────────────────────────────────────────────────┘
```

---

## Restaurant Service Modes

### Mode Types

#### 1. Assigned Tables Mode
```
Description: Each waiter has specific tables assigned

Configuration:
- Tables assigned to specific waiters
- Waiter sees only their tables on dashboard
- Clear accountability per table
- Manager can reassign anytime

Use Case:
- Formal restaurants
- Large venues with zones
- Performance tracking important

Visual:
┌─────────────────────────────────────────────┐
│ FLOOR MAP - Assigned Mode                   │
│                                             │
│   Zone A (Ram)        Zone B (Sita)         │
│   ┌─────┐ ┌─────┐    ┌─────┐ ┌─────┐       │
│   │ T1  │ │ T2  │    │ T5  │ │ T6  │       │
│   └─────┘ └─────┘    └─────┘ └─────┘       │
│   ┌─────┐ ┌─────┐    ┌─────┐ ┌─────┐       │
│   │ T3  │ │ T4  │    │ T7  │ │ T8  │       │
│   └─────┘ └─────┘    └─────┘ └─────┘       │
└─────────────────────────────────────────────┘
```

#### 2. Open Floor Mode
```
Description: Any waiter can serve any table

Configuration:
- No table assignments
- First available waiter takes table
- Flexible coverage
- Shared tips option

Use Case:
- Casual restaurants
- Small venues
- Team-based service

Visual:
┌─────────────────────────────────────────────┐
│ FLOOR MAP - Open Floor Mode                 │
│                                             │
│   All Staff Pool: Ram, Sita, Hari           │
│   ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐          │
│   │ T1  │ │ T2  │ │ T3  │ │ T4  │          │
│   │ Any │ │ Any │ │ Any │ │ Any │          │
│   └─────┘ └─────┘ └─────┘ └─────┘          │
│   ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐          │
│   │ T5  │ │ T6  │ │ T7  │ │ T8  │          │
│   │ Any │ │ Any │ │ Any │ │ Any │          │
│   └─────┘ └─────┘ └─────┘ └─────┘          │
└─────────────────────────────────────────────┘
```

#### 3. Hybrid Mode
```
Description: Some tables assigned, some open

Configuration:
- VIP/premium tables assigned
- Regular tables open
- Flexible reassignment
- Best of both worlds

Use Case:
- Mixed casual/fine dining
- Variable staffing
- Special sections (patio, VIP)

Visual:
┌─────────────────────────────────────────────┐
│ FLOOR MAP - Hybrid Mode                     │
│                                             │
│   VIP Section (Ram only)   Open Section    │
│   ┌─────┐ ┌─────┐         ┌─────┐ ┌─────┐  │
│   │ V1  │ │ V2  │         │ T1  │ │ T2  │  │
│   │ Ram │ │ Ram │         │ Any │ │ Any │  │
│   └─────┘ └─────┘         └─────┘ └─────┘  │
│                           ┌─────┐ ┌─────┐  │
│   Patio (Sita)           │ T3  │ │ T4  │  │
│   ┌─────┐ ┌─────┐         │ Any │ │ Any │  │
│   │ P1  │ │ P2  │         └─────┘ └─────┘  │
│   └─────┘ └─────┘                          │
└─────────────────────────────────────────────┘
```

### Mode Configuration
```typescript
interface ServiceModeConfig {
  mode: 'assigned' | 'open_floor' | 'hybrid';

  // For Assigned mode
  tableAssignments?: {
    tableId: string;
    waiterId: string;
    priority?: number;  // Backup waiter
  }[];

  // For Hybrid mode
  assignedTables?: string[];   // These are assigned
  openTables?: string[];       // These are open

  // Common settings
  allowReassignment: boolean;  // Manager can change
  autoAssignOnSeat: boolean;   // System auto-assigns
  showAllTables: boolean;      // Staff sees all or assigned only
}
```

---

## Host/Reception Features

### Host Dashboard
```
┌──────────────────────────────────────────────────────────────────┐
│ 🎯 HOST STATION                          Fri, Jan 25  6:30 PM   │
├──────────────────────────────────────────────────────────────────┤
│  [📋 Waitlist] [📅 Reservations] [🗺️ Floor Map] [⏰ Timeline]   │
├──────────────────────────────────────────────────────────────────┤
│ QUICK STATS                                                      │
│ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ │
│ │ 🪑 Tables   │ │ 👥 Waitlist │ │ 📅 Reserved │ │ ⏱️ Avg Wait │ │
│ │   8/20      │ │     5       │ │     3       │ │    15 min   │ │
│ │  Available  │ │   Waiting   │ │   Tonight   │ │             │ │
│ └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘ │
├──────────────────────────────────────────────────────────────────┤
│ 🔔 UPCOMING (Next 30 min)                                        │
│ ┌──────────────────────────────────────────────────────────────┐ │
│ │ 6:45 PM │ Reservation │ Mr. Sharma (4) │ Table 8  │ [Seat]  │ │
│ │ 7:00 PM │ Reservation │ Ms. Thapa (2)  │ Table 3  │ [Prep]  │ │
│ │ NOW     │ Walk-in     │ Party of 6     │ Waiting  │ [Seat]  │ │
│ └──────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
```

### Waitlist Management
```
┌──────────────────────────────────────────────────────────────────┐
│ 📋 WAITLIST                                    [+ Add to List]   │
├──────────────────────────────────────────────────────────────────┤
│ # │ Name          │ Party │ Wait    │ Pref     │ Status         │
├───┼───────────────┼───────┼─────────┼──────────┼────────────────┤
│ 1 │ Ram Karki     │ 4     │ 12 min  │ Booth    │ 🟡 Table ready │
│ 2 │ Sita Sharma   │ 2     │ 8 min   │ Window   │ ⏳ Waiting     │
│ 3 │ Hari Thapa    │ 6     │ 5 min   │ Any      │ ⏳ Waiting     │
│ 4 │ Maya KC       │ 3     │ 2 min   │ Quiet    │ ⏳ Waiting     │
└───┴───────────────┴───────┴─────────┴──────────┴────────────────┘

Actions per row:
[📱 Notify] [🪑 Seat Now] [⏸️ Skip] [❌ Remove] [📝 Edit]

Notification:
- SMS: "Your table is ready! Please come to the host stand."
- Configurable auto-notify when table matches
```

### Reservation System
```
┌──────────────────────────────────────────────────────────────────┐
│ 📅 RESERVATIONS                    [+ New Reservation]          │
├──────────────────────────────────────────────────────────────────┤
│ Today: Jan 25, 2026                                             │
│                                                                  │
│ ◄ │ 5PM │ 6PM │ 7PM │ 8PM │ 9PM │ 10PM │ ►                     │
│ ──┼─────┼─────┼─────┼─────┼─────┼──────┼────                    │
│T1 │     │ ███ │ ███ │     │     │      │  ███ = Booked         │
│T2 │     │     │ ███ │ ███ │     │      │                       │
│T3 │ ███ │ ███ │     │     │ ███ │ ███  │                       │
│T4 │     │     │     │ ███ │ ███ │      │                       │
│T5 │     │ ███ │ ███ │ ███ │     │      │                       │
│                                                                  │
│ Upcoming:                                                        │
│ ┌──────────────────────────────────────────────────────────────┐│
│ │ 7:00 PM │ Mr. Sharma │ 4 ppl │ T8 │ Special: Anniversary   ││
│ │         │ 9841234567 │       │    │ [Confirm] [Edit] [Cancel]││
│ └──────────────────────────────────────────────────────────────┘│
│ ┌──────────────────────────────────────────────────────────────┐│
│ │ 7:30 PM │ Ms. Thapa  │ 2 ppl │ T3 │ Pref: Window seat      ││
│ │         │ 9851234567 │       │    │ [Confirm] [Edit] [Cancel]││
│ └──────────────────────────────────────────────────────────────┘│
└──────────────────────────────────────────────────────────────────┘

Reservation Fields:
- Name, Phone, Email (optional)
- Party size
- Date & Time
- Table preference (specific or type)
- Special requests/notes
- Occasion (Birthday, Anniversary, Business)
- Deposit (if required)
```

### Floor Map View
```
┌──────────────────────────────────────────────────────────────────┐
│ 🗺️ FLOOR MAP                              [Edit Layout]         │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│     ENTRANCE                                                     │
│        ↓                                                         │
│   ┌─────────┐                                                   │
│   │ HOST    │                                                   │
│   │ STAND   │                                                   │
│   └─────────┘                                                   │
│                                                                  │
│   ┌───┐ ┌───┐ ┌───┐ ┌───┐        ┌───────────┐                 │
│   │T1 │ │T2 │ │T3 │ │T4 │        │   BAR     │                 │
│   │🟢│ │🔴│ │🟡│ │⚪│        │ ░░░░░░░░░ │                 │
│   │ 2 │ │ 4 │ │ 4 │ │ 2 │        └───────────┘                 │
│   └───┘ └───┘ └───┘ └───┘                                       │
│                                                                  │
│   ┌───────┐ ┌───────┐            WINDOW SECTION                 │
│   │  T5   │ │  T6   │            ┌───┐ ┌───┐ ┌───┐             │
│   │  🟢  │ │  🔴  │            │T9 │ │T10│ │T11│             │
│   │   6   │ │   6   │            │⚪│ │🟢│ │🟡│             │
│   └───────┘ └───────┘            └───┘ └───┘ └───┘             │
│                                                                  │
│   BOOTH SECTION                  ┌─────────────────┐            │
│   ┌─────┐ ┌─────┐               │    KITCHEN      │            │
│   │ B1  │ │ B2  │               │    (Staff)      │            │
│   │ 🟢 │ │ ⚪ │               └─────────────────┘            │
│   │  4  │ │  4  │                                               │
│   └─────┘ └─────┘                                               │
│                                                                  │
│ Legend: 🟢 Available  🟡 Reserved Soon  🔴 Occupied  ⚪ Cleaning │
│         Number = Capacity                                        │
└──────────────────────────────────────────────────────────────────┘

Click on table:
- If Available → Seat guest (opens seating dialog)
- If Occupied → View session details
- If Reserved → View reservation details
```

### No-Show Handling
```
Reservation Status Flow:
CONFIRMED → ARRIVED | NO_SHOW | CANCELLED

No-Show Detection:
- Auto-mark after grace period (configurable: 15-30 min)
- Or manual mark by host

No-Show Actions:
┌──────────────────────────────────────────────────────────────────┐
│ ⚠️ NO-SHOW: Mr. Sharma (7:00 PM reservation)                    │
│                                                                  │
│ Party of 4 │ Table 8 │ 20 min past reservation                  │
│                                                                  │
│ Actions:                                                         │
│ [📞 Call Guest] [⏰ Extend 15min] [❌ Mark No-Show] [🪑 Release] │
│                                                                  │
│ Note: Guest has 1 previous no-show on record                    │
└──────────────────────────────────────────────────────────────────┘

No-Show Tracking:
- Record in customer history
- Flag repeat no-shows
- Optional: require deposit for flagged guests
```

---

## Seating Styles (Nepal vs Western)

### Configuration
```typescript
interface SeatingStyleConfig {
  style: 'western' | 'nepal' | 'hybrid';

  // Western Style Settings
  western?: {
    hostRequired: boolean;        // Must go through host
    reservationEnabled: boolean;  // Accept reservations
    waitlistEnabled: boolean;     // Manage queue
    tableAssignment: 'host' | 'customer_choice';
  };

  // Nepal Style Settings
  nepal?: {
    selfSeating: boolean;         // Guests seat themselves
    qrOnTable: boolean;           // QR codes on each table
    waiterAssignOnOrder: boolean; // Assign waiter when order placed
    callWaiterButton: boolean;    // Show call waiter in app
  };

  // Hybrid Settings
  hybrid?: {
    peakHoursStyle: 'western';    // Use western during busy times
    offPeakStyle: 'nepal';        // Use nepal during slow times
    peakHours: { start: string; end: string }[];
  };
}
```

### Western Style Flow
```
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│   Guest      │    │    Host      │    │   Table      │
│   Arrives    │ →  │   Greets     │ →  │  Assigned    │
└──────────────┘    └──────────────┘    └──────────────┘
                           ↓
                    ┌──────────────┐
                    │ If no table: │
                    │  - Waitlist  │
                    │  - Est. time │
                    └──────────────┘

Features:
✅ Reservations required for peak hours
✅ Host controls all seating
✅ Waitlist with notifications
✅ Table assignment by host
✅ VIP/preference handling
```

### Nepal Style Flow
```
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│   Guest      │    │   Finds      │    │   Scans QR   │
│   Enters     │ →  │ Empty Table  │ →  │   Orders     │
└──────────────┘    └──────────────┘    └──────────────┘
                                              ↓
                                       ┌──────────────┐
                                       │   Waiter     │
                                       │  Auto-assign │
                                       └──────────────┘

Features:
✅ Self-seating (no host needed)
✅ QR code on each table
✅ Instant ordering
✅ Waiter assigned when order placed
✅ Call waiter button available
❌ No reservations (walk-in only)
❌ No formal waitlist
```

### Settings UI
```
┌──────────────────────────────────────────────────────────────────┐
│ ⚙️ SEATING STYLE SETTINGS                                        │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│ Seating Style:                                                   │
│ ○ Western (Host-managed)                                        │
│   - Guests greeted at entrance                                  │
│   - Host assigns tables                                         │
│   - Reservations and waitlist                                   │
│                                                                  │
│ ● Nepal Style (Self-seating)                                    │
│   - Guests seat themselves                                      │
│   - QR codes on tables                                          │
│   - Order triggers waiter assignment                            │
│                                                                  │
│ ○ Hybrid (Time-based)                                           │
│   - Western during peak hours                                   │
│   - Nepal style during off-peak                                 │
│                                                                  │
├──────────────────────────────────────────────────────────────────┤
│ Nepal Style Options:                                             │
│ ┌──────────────────────────────────────────────────────────────┐│
│ │ ☑️ Enable self-seating                                       ││
│ │ ☑️ Show "Call Waiter" button in customer app                 ││
│ │ ☑️ Auto-assign waiter on first order                         ││
│ │ ☐ Require guest count before ordering                        ││
│ │ ☑️ Allow table change via QR scan                            ││
│ └──────────────────────────────────────────────────────────────┘│
│                                                                  │
│ [Save Changes]                                                   │
└──────────────────────────────────────────────────────────────────┘
```

---

## Phone Order Feature

### Overview
```
Phone orders allow customers to call ahead and place orders for:
1. Pickup (Takeaway)
2. Future dine-in (arrive and food ready)
3. Undecided (convert later)

This is common in Nepal where customers call ahead to avoid waiting.
```

### Phone Order Flow
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  Customer Calls │ →  │  Staff Takes    │ →  │  Order Created  │
│                 │    │  Order          │    │  (Source: PHONE)│
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                                      ↓
                              ┌────────────────────────────────────┐
                              │                                    │
                              ↓                                    ↓
                    ┌─────────────────┐              ┌─────────────────┐
                    │ Dining Choice:  │              │ Dining Choice:  │
                    │    TAKEAWAY     │              │    DINE_IN      │
                    └─────────────────┘              └─────────────────┘
                              ↓                                    ↓
                    ┌─────────────────┐              ┌─────────────────┐
                    │ Prep immediately│              │ Smart timing:   │
                    │ Pack for pickup │              │ - ETA captured  │
                    └─────────────────┘              │ - Prep scheduled│
                                                    │ - Table assigned│
                                                    │   on arrival    │
                                                    └─────────────────┘
```

### Phone Order UI (Staff)
```
┌──────────────────────────────────────────────────────────────────┐
│ 📞 NEW PHONE ORDER                                               │
├──────────────────────────────────────────────────────────────────┤
│ Customer Details:                                                │
│ ┌──────────────────────────────────────────────────────────────┐│
│ │ Name:  [_________________]                                   ││
│ │ Phone: [_________________] [📱 Lookup]                       ││
│ │                                                              ││
│ │ Found: Ram Sharma (2 previous orders)                        ││
│ └──────────────────────────────────────────────────────────────┘│
│                                                                  │
│ Dining Choice:                                                   │
│ ┌────────────────┐ ┌────────────────┐ ┌────────────────┐        │
│ │ 🍽️ Dine-In     │ │ 🥡 Takeaway    │ │ ❓ Decide Later│        │
│ │   (Come eat)   │ │  (Pickup)      │ │   (Flexible)   │        │
│ └────────────────┘ └────────────────┘ └────────────────┘        │
│                                                                  │
│ If Dine-In:                                                      │
│ ┌──────────────────────────────────────────────────────────────┐│
│ │ Expected Arrival: [___] minutes from now                     ││
│ │ Party Size:       [___] guests                               ││
│ │ Table Preference: [Any ▼]                                    ││
│ └──────────────────────────────────────────────────────────────┘│
│                                                                  │
│ If Takeaway:                                                     │
│ ┌──────────────────────────────────────────────────────────────┐│
│ │ Pickup Time: [___] minutes from now                          ││
│ └──────────────────────────────────────────────────────────────┘│
│                                                                  │
├───────────────────────────────────────────────��──────────────────┤
│ ORDER ITEMS:                                          [+ Add]   │
│ ┌──────────────────────────────────────────────────────────────┐│
│ │ Momo (Chicken) x 2 ...................... Rs 400            ││
│ │ Dal Bhat Set ............................ Rs 350            ││
│ │ Coke ................................... Rs 50              ││
│ ├──────────────────────────────────────────────────────────────┤│
│ │                              Subtotal:    Rs 800            ││
│ └──────────────────────────────────────────────────────────────┘│
│                                                                  │
│ [Cancel] [Save Draft]                      [Place Order →]      │
└──────────────────────────────────────────────────────────────────┘
```

### Smart Prep Timing
```
For Dine-In Phone Orders:

┌──────────────────────────────────────────────────────────────────┐
│ SMART PREP SCHEDULING                                            │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│ Order #789 - Phone Order (Dine-In)                              │
│ Customer: Ram Sharma                                            │
│ Expected Arrival: 7:00 PM (25 min from now)                     │
│                                                                  │
│ Items & Prep Time:                                              │
│ ├─ Momo (2) ............. 12 min prep                           │
│ ├─ Dal Bhat ............. 8 min prep                            │
│ └─ Coke ................ 0 min (instant)                        │
│                                                                  │
│ Prep Schedule:                                                   │
│ ┌──────────────────────────────────────────────────────────────┐│
│ │ NOW        6:45       6:50       6:55      7:00              ││
│ │  │          │          │          │         │                ││
│ │  │          │──Momo────│──────────│─Ready──▸│                ││
│ │  │          │          │──DalBhat─│─Ready──▸│                ││
│ │  │          │          │          │──Coke──▸│                ││
│ │  │          │          │          │         │                ││
│ │  │          ▲ Start    │          │    ▲ Customer            ││
│ │  │          │ Prep     │          │    │ Arrives             ││
│ └──────────────────────────────────────────────────────────────┘│
│                                                                  │
│ Kitchen sees: "Start at 6:45 PM" with countdown timer           │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

### Phone Order Conversion
```
Scenario: Customer calls, undecided, then decides dine-in

┌──────────────────────────────────────────────────────────────────┐
│ 🔄 CONVERT ORDER #789                                            │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│ Current: DECIDE_LATER                                           │
│ Customer: Ram Sharma (9841234567)                               │
│ Order Total: Rs 800                                             │
│ Placed: 15 min ago                                              │
│                                                                  │
│ Convert to:                                                      │
│ ┌─────────────────────────┐ ┌─────────────────────────┐         │
│ │ 🍽️ DINE-IN              │ │ 🥡 TAKEAWAY             │         │
│ │                         │ │                         │         │
│ │ Assign to Table: [T5 ▼] │ │ Ready for pickup in:   │         │
│ │ Party size: [2]         │ │ [10] minutes           │         │
│ │                         │ │                         │         │
│ │ [Convert to Dine-In]    │ │ [Convert to Takeaway]  │         │
│ └─────────────────────────┘ └─────────────────────────┘         │
│                                                                  │
│ Order Status: PENDING (not sent to kitchen yet)                 │
│ Note: Kitchen will be notified once converted                   │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

---

## Order Source & Dining Choice

### Order Source Types
```typescript
enum OrderSource {
  AT_TABLE = 'at_table',       // Customer at table (QR or waiter)
  PHONE_CALL = 'phone_call',   // Called in order
  COUNTER = 'counter',         // Walk-up counter order
  ONLINE = 'online'            // Future: online ordering
}
```

### Dining Choice Types
```typescript
enum DiningChoice {
  DINE_IN = 'dine_in',         // Eating at restaurant
  TAKEAWAY = 'takeaway',       // Pickup, packed
  DECIDE_LATER = 'decide_later' // Convert later
}
```

### Source + Choice Matrix
```
┌─────────────┬─────────────────────────────────────────────────────┐
│ Order       │                    Dining Choice                    │
│ Source      ├─────────────────┬─────────────────┬─────────────────┤
│             │    DINE_IN      │    TAKEAWAY     │  DECIDE_LATER   │
├─────────────┼─────────────────┼─────────────────┼─────────────────┤
│ AT_TABLE    │ ✅ Default      │ ❌ N/A          │ ❌ N/A          │
│             │ Guest at table  │ (already dined) │                 │
├─────────────┼─────────────────┼─────────────────┼─────────────────┤
│ PHONE_CALL  │ ✅ Come & eat   │ ✅ Pickup       │ ✅ Flexible     │
│             │ Smart prep time │ Prep immediate  │ Convert later   │
├─────────────┼─────────────────┼─────────────────┼─────────────────┤
│ COUNTER     │ ✅ Seat after   │ ✅ Pack & go    │ ✅ Flexible     │
│             │ order           │                 │                 │
└─────────────┴─────────────────┴─────────────────┴─────────────────┘
```

### Kitchen Display with Source/Choice
```
┌─────────────────────────────────────────────────────────────────┐
│ 🍳 KITCHEN DISPLAY                                              │
├─────────────────────────────────────────────────────────────────┤
│ ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐    │
│ │ 📞 PHONE #89    │ │ 🪑 TABLE #90    │ │ 🥡 COUNTER #91  │    │
│ │ Dine-In        │ │ Dine-In        │ │ Takeaway       │    │
│ │ ETA: 7:00 PM   │ │                 │ │ PACK IT!       │    │
│ ├─────────────────┤ ├─────────────────┤ ├─────────────────┤    │
│ │ ⏰ Start: 6:48  │ │ Table 5        │ │ Ready: 15 min  │    │
│ │    (12 min)    │ │ NOW            │ │                 │    │
│ ├─────────────────┤ ├─────────────────┤ ├─────────────────┤    │
│ │ □ Momo (2)     │ │ □ Fried Rice   │ │ □ Chowmein (2) │    │
│ │ □ Dal Bhat     │ │ □ Noodle Soup  │ │ □ Momo (1)     │    │
│ └─────────────────┘ └─────────────────┘ └─────────────────┘    │
│                                                                 │
│ Icons: 📞 Phone  🪑 Table  🥡 Takeaway  🏪 Counter             │
└─────────────────────────────────────────────────────────────────┘

Visual Cues:
- Phone Dine-In: Shows countdown to start prep
- Table Order: Shows table number
- Takeaway: Shows "PACK IT!" badge
- Counter: Shows pickup name
```

---

## Clickable Reports System

### Report Dashboard
```
┌──────────────────────────────────────────────────────────────────┐
│ 📊 REPORTS & ANALYTICS                         [Export] [Print] │
├──────────────────────────────────────────────────────────────────┤
│ Quick Links:                                                     │
│ [Today] [Yesterday] [This Week] [This Month] [Custom Range]     │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│ ┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐ │
│ │ 💰 Revenue       │ │ 📋 Orders        │ │ 🪑 Tables        │ │
│ │   Rs 1,45,230   ←Click               │ │                  │ │
│ │   ↑ 12% vs last │ │     234          │ │   185 sessions   │ │
│ │                  │ │   ↑ 8%           │ │   Avg: 45 min    │ │
│ │ [View Details →] │ │ [View Details →] │ │ [View Details →] │ │
│ └──────────────────┘ └──────────────────┘ └──────────────────┘ │
│                                                                  │
│ ┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐ │
│ │ 👥 Staff         │ │ 🍽️ Menu Items    │ │ ⚠️ Issues        │ │
│ │   12 active      │ │                  │ │                  │ │
│ │   Top: Ram       │ │   Top: Momo      │ │   3 complaints   │ │
│ │                  │ │   456 sold       │ │   All resolved   │ │
│ │ [View Details →] │ │ [View Details →] │ │ [View Details →] │ │
│ └──────────────────┘ └──────────────────┘ └──────────────────┘ │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘

Every card header is clickable → Opens detailed report
```

### Drill-Down Example: Revenue
```
Click "Revenue Rs 1,45,230" →

┌──────────────────────────────────────────────────────────────────┐
│ 💰 REVENUE DETAILS                              [← Back] [Export]│
├──────────────────────────────────────────────────────────────────┤
│ Period: Today (Jan 25, 2026)                                    │
│ Total: Rs 1,45,230                                              │
├──────────────────────────────────────────────────────────────────┤
│ BREAKDOWN BY HOUR                                                │
│ ┌──────────────────────────────────────────────────────────────┐│
│ │ 11AM │████                           │ Rs 8,500              ││
│ │ 12PM │████████████                   │ Rs 22,400   ← Click   ││
│ │  1PM │██████████████████             │ Rs 35,200             ││
│ │  2PM │████████████████               │ Rs 28,900             ││
│ │  3PM │██████████                     │ Rs 18,230             ││
│ │  ...                                                         ││
│ └──────────────────────────────────────────────────────────────┘│
│                                                                  │
│ BREAKDOWN BY CATEGORY                                            │
│ ├─ Food:     Rs 1,12,500 (77%)  [View Items →]                  │
│ ├─ Drinks:   Rs 28,730 (20%)    [View Items →]                  │
│ └─ Other:    Rs 4,000 (3%)      [View Items →]                  │
│                                                                  │
│ BREAKDOWN BY PAYMENT METHOD                                      │
│ ├─ Cash:     Rs 89,500 (62%)    [View Transactions →]           │
│ ├─ Card:     Rs 45,730 (31%)    [View Transactions →]           │
│ └─ eSewa:    Rs 10,000 (7%)     [View Transactions →]           │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘

Click "12PM Rs 22,400" →

┌──────────────────────────────────────────────────────────────────┐
│ 💰 REVENUE: 12:00 PM - 1:00 PM                  [← Back] [Export]│
├──────────────────────────────────────────────────────────────────┤
│ Total: Rs 22,400 │ Orders: 28 │ Avg Order: Rs 800              │
├──────────────────────────────────────────────────────────────────┤
│ INDIVIDUAL ORDERS                                                │
│ ┌─────┬──────────┬─────────┬──────────┬─────────┬──────────────┐│
│ │ #   │ Time     │ Table   │ Amount   │ Status  │ Staff        ││
│ ├─────┼──────────┼─────────┼──────────┼─────────┼──────────────┤│
│ │ 145 │ 12:02 PM │ T-5     │ Rs 850   │ Paid    │ Ram    [→]  ││
│ │ 146 │ 12:05 PM │ T-8     │ Rs 1,200 │ Paid    │ Sita   [→]  ││
│ │ 147 │ 12:12 PM │ T-3     │ Rs 650   │ Paid    │ Ram    [→]  ││
│ │ ... │                                                        ││
│ └─────┴──────────┴─────────┴──────────┴─────────┴──────────────┘│
│                                                                  │
│ [← Previous Hour]                           [Next Hour →]       │
└──────────────────────────────────────────────────────────────────┘

Click Order #145 →

┌──────────────────────────────────────────────────────────────────┐
│ 📋 ORDER #145 DETAILS                           [← Back] [Print]│
├──────────────────────────────────────────────────────────────────┤
│ Table: 5 │ Waiter: Ram │ Time: 12:02 PM │ Status: PAID         │
├──────────────────────────────────────────────────────────────────┤
│ SESSION CONTEXT                                                  │
│ Session ID: sess_abc123 [View Full Timeline →]                  │
│ Started: 11:45 AM │ Ended: 1:15 PM │ Guests: 4                  │
├──────────────────────────────────────────────────────────────────┤
│ ORDER ITEMS                                                      │
│ ├─ Momo (Chicken) x 2 .................. Rs 400                 │
│ │   Special: Extra spicy                                        │
│ │   Prep: 11 min │ Served by: Ram                               │
│ ├─ Dal Bhat ............................ Rs 350                 │
│ │   Prep: 8 min │ Served by: Ram                                │
│ └─ Coke ................................ Rs 100                 │
│     Prep: 1 min │ Served by: Ram                                │
├──────────────────────────────────────────────────────────────────┤
│ PAYMENT                                                          │
│ Subtotal: Rs 850 │ Discount: Rs 0 │ Tax: Rs 0                   │
│ Total: Rs 850 │ Method: Cash │ Collected by: Sita               │
├──────────────────────────────────────────────────────────────────┤
│ TIMELINE                                                         │
│ 12:02 │ Order placed                                            │
│ 12:03 │ Kitchen received                                        │
│ 12:04 │ Coke ready                                              │
│ 12:05 │ Coke served                                             │
│ 12:14 │ Momo ready                                              │
│ 12:15 │ Dal Bhat ready                                          │
│ 12:16 │ All items served                                        │
│  1:10 │ Bill requested                                          │
│  1:12 │ Payment collected                                       │
└──────────────────────────────────────────────────────────────────┘
```

---

## Super Admin Dashboard

### Multi-Restaurant Overview
```
┌──────────────────────────────────────────────────────────────────┐
│ 🌐 SUPER ADMIN DASHBOARD                      Welcome, Admin!   │
├──────────────────────────────────────────────────────────────────┤
│ SYSTEM OVERVIEW                                                  │
│ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ │
│ │ 🏪 Total    │ │ ✅ Active   │ │ 👥 Users    │ │ 📋 Orders   │ │
│ │     12      │ │     10      │ │    156      │ │   1,234     │ │
│ │ Restaurants │ │ Online Now  │ │   Today     │ │   Today     │ │
│ └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘ │
├──────────────────────────────────────────────────────────────────┤
│ RESTAURANTS                                     [+ Add New]     │
│ ┌──────────────────────────────────────────────────────────────┐│
│ │ 🏪 Himalayan Kitchen                          🟢 Online      ││
│ │    Revenue Today: Rs 45,230  │  Orders: 78  │  Issues: 2    ││
│ │    [View Dashboard] [Settings] [Reports]                     ││
│ ├──────────────────────────────────────────────────────────────┤│
│ │ 🏪 Momo House                                 🟢 Online      ││
│ │    Revenue Today: Rs 32,100  │  Orders: 56  │  Issues: 0    ││
│ │    [View Dashboard] [Settings] [Reports]                     ││
│ ├──────────────────────────────────────────────────────────────┤│
│ │ 🏪 Thamel Café                               🟡 Slow         ││
│ │    Revenue Today: Rs 18,500  │  Orders: 34  │  Issues: 1    ││
│ │    [View Dashboard] [Settings] [Reports]                     ││
│ └──────────────────────────────────────────────────────────────┘│
├──────────────────────────────────────────────────────────────────┤
│ [📊 Global Reports] [👥 User Management] [⚙️ System Settings]   │
└──────────────────────────────────────────────────────────────────┘
```

### Super Admin Capabilities
```
Restaurant Management:
├─ Create new restaurants
├─ Activate/Deactivate restaurants
├─ Configure subscription/billing
├─ Set feature access levels
└─ View all restaurant data

User Management:
├─ Create restaurant owners
├─ Reset passwords
├─ View login history
├─ Manage access levels
└─ Impersonate users (support)

System Settings:
├─ Global configurations
├─ Feature flags
├─ API rate limits
├─ Maintenance mode
└─ Backup settings

Reports:
├─ Cross-restaurant analytics
├─ Revenue aggregation
├─ Usage statistics
├─ Performance metrics
└─ Audit logs
```

---

## Appendix

### Status Color Legend
```
🟢 Green  - Good, available, active, success
🟡 Yellow - Warning, needs attention, pending
🔴 Red    - Alert, urgent, error, occupied
⚪ White  - Empty, inactive, cleaning
🔵 Blue   - Information, reserved, scheduled
```

### Common Keyboard Shortcuts (Staff Dashboards)
```
General:
- Esc: Close modal/dialog
- R: Refresh data
- /: Search
- ?: Help

Waiter Dashboard:
- N: New order
- T: Table list
- A: Alerts
- B: Bills

Kitchen Display:
- Space: Mark item ready
- Enter: Acknowledge order
- 1-9: Select order by position

Manager Dashboard:
- S: Staff overview
- F: Floor map
- L: Activity log
- P: Reports
```

---

## Settings & Configuration

Complete restaurant configuration system accessible by Owner and Manager.

### Settings Categories

| Category | Settings |
|----------|----------|
| **Restaurant Setup** | |
| Restaurant Profile | Name, logo, contact, address, VAT, hours |
| Table Management | Sections, tables, capacity, QR codes |
| Menu Management | Categories, items, variants, availability |
| **Operations** | |
| Service Mode | Seating style, waiter assignment, session start |
| Kitchen Settings | Stations, display mode, order flow |
| Notifications | Sounds, alerts, escalation |
| Service Targets | Time targets for all services |
| **Billing & Payments** | |
| Payment Methods | Cash, card, QR providers (Fonepay, eSewa, Khalti), split payments |
| Tax & Charges | VAT (13%), service charge (10%), packing, rounding |
| Printing | Printers, bill format, KOT, auto-print |
| **Staff & Security** | |
| Staff Management | Employees, roles, permissions |
| Attendance | Clock in/out, biometric, breaks, overtime |
| Security | PINs, manager approvals, audit logging, session timeout |
| **System** | |
| Language & Region | Language (English/Nepali), currency (NPR), date/time format |
| Backup & Data | Auto backup, restore, export, delete |
| Integrations | Biometric devices, POS terminal, accounting, SMS gateway, API |

### Service Targets Configuration

```
Waiter Targets:
- Water service after seating: 3 minutes
- Response to assistance request: 2 minutes
- Food pickup after ready: 2 minutes
- Bill delivery after request: 2 minutes

Kitchen Targets:
- Average prep time: 15 minutes
- On-time rate target: 90%
- By category: Starters (8m), Main (15m), Drinks (3m), Desserts (5m)

Cleaning Targets:
- Table cleaning time: 5 minutes
- Response to cleaning request: 2 minutes
```

### Notification Settings

```
Waiter Notifications:
- New session started (water service)
- Order placed
- Food ready for pickup
- Guest assistance request
- Bill requested
- Table change

Kitchen Notifications:
- New order received
- Order modification
- Order cancelled
- Rush order

Manager Notifications:
- Discount approval needed
- Refund approval needed
- Issue reported
- Long wait time alert
- Low staff alert
- Biometric device offline

Escalation:
- First reminder after: 2 minutes
- Escalate to manager after: 5 minutes
```

### Settings Access by Role

| Setting | Owner | Manager | Others |
|---------|-------|---------|--------|
| Restaurant Profile | ✓ Edit | View | — |
| Table Management | ✓ Edit | ✓ Edit | — |
| Menu Management | ✓ Edit | ✓ Edit | — |
| Service Mode | ✓ Edit | View | — |
| Kitchen Settings | ✓ Edit | ✓ Edit | — |
| Payment Methods | ✓ Edit | View | — |
| Tax & Charges | ✓ Edit | View | — |
| Security | ✓ Edit | — | — |
| Backup & Data | ✓ Edit | — | — |

---

## Guest QR Experience

Complete flow when guest scans table QR code.

### Guest Journey Overview

```
┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐
│  SCAN   │───►│  ENTER  │───►│  MENU   │───►│  ORDER  │
│   QR    │    │   OTP   │    │  VIEW   │    │  PLACE  │
└─────────┘    └─────────┘    └─────────┘    └─────────┘

┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐
│  TRACK  │───►│ REQUEST │───►│  VIEW   │───►│   PAY   │
│  ORDER  │    │  HELP   │    │  BILL   │    │         │
└─────────┘    └─────────┘    └─────────┘    └─────────┘
```

### Welcome Screen Features

- Restaurant logo and name
- Table number display
- Guest count selector
- WiFi info display
- Language toggle (EN/नेपाली)

### Menu Features

| Feature | Description |
|---------|-------------|
| Category View | Browse by food category with images |
| Search | Search menu items |
| Filter | Veg, non-veg, spicy filters |
| Item Details | Photos, description, price, tags |
| Variants | Size options, cooking styles, toppings |
| Special Instructions | Per item and overall order notes |

### Order Flow

1. **Add to Cart**: Select variants, add-ons, quantity
2. **Cart View**: Edit items, see total with tax breakdown
3. **Place Order**: Submit to kitchen
4. **Order Confirmation**: Order number, estimated time
5. **Track Order**: Real-time cooking progress per item
6. **Push Notifications**: "Your food is ready!"

### Assistance Features

| Request Type | Description |
|--------------|-------------|
| 💧 Water Refill | Quick request |
| 🍴 Cutlery/Napkins | Quick request |
| 🧂 Condiments | Quick request |
| 🙋 Call Waiter | General assistance |
| ⚠️ Food Issue | Report problems (wrong item, quality, etc.) |

### Bill Features

- Session summary (duration, guest count)
- All orders listed with timestamps
- Price breakdown (subtotal, service, VAT)
- Request bill button
- Payment options display (Cash, Card, QR)

### Post-Payment

- Thank you screen
- Star rating (1-5)
- Feedback text box
- Digital receipt option (email)
- Social media links

### Smart Features

| Feature | Description |
|---------|-------------|
| Active Session Detection | Remember returning guest |
| Table Change | Move session to new table if guest scans different QR |
| Guest Count Update | Change party size anytime |
| Join Table | New guest can join existing session |

### Guest Interface Settings (Configurable)

```
Ordering:
- ☑️ Allow guest ordering via QR
- ☐ Menu view only (waiter takes order)

Order Tracking:
- ☑️ Show order status to guest
- ☑️ Show estimated time
- ☑️ Show individual item status
- ☑️ Send push notifications

Assistance:
- ☑️ Allow water refill request
- ☑️ Allow call waiter
- ☑️ Allow report food issue
- ☑️ Allow bill request

Billing:
- ☑️ Show running bill to guest
- ☑️ Show price breakdown
- ☐ Allow direct payment via QR
```

---

## OTP Verification System

3-digit OTP verification to ensure guest is physically at the table (prevents fake orders from QR photos).

### Why OTP?

| Problem | Solution |
|---------|----------|
| Someone scans QR from photo | OTP on table tent verifies presence |
| Prank orders from outside | Must see physical OTP to order |
| Multiple fake sessions | OTP changes after each cleaning |

### OTP Flow

```
┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐
│  SCAN   │───►│  ENTER  │───►│ VERIFY  │───►│ SESSION │
│   QR    │    │   OTP   │    │   OTP   │    │ STARTED │
└─────────┘    └─────────┘    └─────────┘    └─────────┘
```

### OTP Display Methods

1. **Digital Display (Best)**: E-ink/LCD on table, auto-updates via WiFi
2. **Printed Card**: Waiter replaces card after each cleaning
3. **Verbal**: Waiter tells guest the code when asked

### OTP Lifecycle

```
┌─────────────────┐
│     FRESH       │ ← After cleaning
│   OTP: 836      │   Ready for new guest
└────────┬────────┘
         │ Guest verifies OTP
         ▼
┌─────────────────┐
│    VERIFIED     │ ← Session started
│   OTP: 836      │   Same OTP, but locked
│   (locked)      │
└────────┬────────┘
         │ Session ends (payment done)
         ▼
┌─────────────────┐
│    EXPIRED      │ ← Waiting for cleaning
│   OTP: 836      │   Cannot be used
│   (invalid)     │
└────────┬────────┘
         │ Table cleaned
         ▼
┌─────────────────┐
│     FRESH       │ ← NEW OTP generated
│   OTP: 291      │   Cycle repeats
└─────────────────┘
```

### Security Features

- **Max Attempts**: 2 wrong entries before auto-call waiter
- **Auto Call Waiter**: System automatically calls waiter after 2 failed attempts
- **Call Waiter Button**: Guest can manually call for help from OTP screen
- **Lockout**: 2 minutes after max attempts
- **Notification**: Alert waiter on failed attempts

### OTP Settings

| Setting | Default |
|---------|---------|
| OTP length | 3 digits |
| Reset trigger | After table cleaning |
| Max attempts | 2 |
| Lockout duration | 2 minutes |
| Auto-call waiter | Yes (after 2 fails) |
| Waiter bypass | Allowed |

### Data Structure

```typescript
TableOTP {
  id: string
  table_id: string
  otp_code: string           // "836"
  status: "fresh" | "verified" | "expired"
  created_at: Date
  verified_at: Date | null
  expired_at: Date | null
  session_id: string | null
  generated_after_cleaning_id: string
}

OTPVerificationAttempt {
  id: string
  table_id: string
  entered_code: string
  correct_code: string
  is_correct: boolean
  attempt_number: number
  triggered_auto_call: boolean
  device_info: { user_agent, ip_address }
  attempt_at: Date
}
```

---

## Menu System with Multi-Price Items

Flexible menu system supporting variants, add-ons, and dynamic pricing.

### Multi-Price Scenarios

| Scenario | Example | Price Structure |
|----------|---------|-----------------|
| Size variants | Pizza S/M/L | Base price per size |
| Premium options | Vodka Regular/Premium | Base + premium upgrade |
| Toppings | Pizza + extra cheese | Base + topping add-ons |
| Cooking style | Momo Steam/Fried/Jhol | Different price per style |
| Combo | Size + Premium + Toppings | All combined |

### Variant Types

| Type | Selection | Example |
|------|-----------|---------|
| Single select (required) | Must choose one | Size: S/M/L |
| Single select (optional) | Default available | Crust: Regular/Thin/Cheese Burst |
| Multi select | Can choose multiple | Toppings: Cheese, Mushrooms, Pepperoni |

### Price Types

- **Absolute**: Full price (e.g., Large Pizza = Rs. 850)
- **Add-on**: Added to base (e.g., Cheese Burst = +Rs. 100)
- **Negative**: Discount (e.g., Veg patty = -Rs. 50)

### Example: Pizza Configuration

```
MARGHERITA PIZZA
├── Size (Required, Single Select)
│   ├── Small (8")   - Rs. 450
│   ├── Medium (10") - Rs. 650  ← default
│   └── Large (12")  - Rs. 850
├── Crust Type (Optional, Single Select)
│   ├── Regular      - +Rs. 0   ← default
│   ├── Thin Crust   - +Rs. 0
│   └── Cheese Burst - +Rs. 100
└── Toppings (Optional, Multi Select)
    ├── Extra Cheese - +Rs. 80
    ├── Mushrooms    - +Rs. 60
    ├── Olives       - +Rs. 50
    ├── Jalapeños    - +Rs. 40
    ├── Pepperoni    - +Rs. 100
    └── Chicken      - +Rs. 120
```

### Example: Cocktail with Premium Spirits

```
COSMOPOLITAN
├── Spirit (Required, Single Select)
│   ├── Regular Vodka       - Rs. 450 (House pour)
│   ├── Premium (Absolut)   - Rs. 550
│   └── Super Premium (Grey Goose) - Rs. 750
└── Extras (Optional, Multi Select)
    ├── Double shot  - +Rs. 200
    ├── Sugar rim    - +Rs. 0
    ├── Extra lime   - +Rs. 0
    └── Virgin       - -Rs. 200 (no alcohol)
```

### Live Price Calculation

Price updates in real-time as guest selects options:

```
Large Pizza (Rs. 850)
+ Cheese Burst (+Rs. 100)
+ Extra Cheese (+Rs. 80)
+ Mushrooms (+Rs. 60)
+ Pepperoni (+Rs. 100)
─────────────────────────
TOTAL: Rs. 1,190
```

### Cart Display

Items show selected variants and add-ons:
```
Margherita Pizza - Large, Cheese Burst
+ Extra Cheese
+ Mushrooms
+ Pepperoni
Qty: 1                           Rs. 1,190
```

### KOT Display

Kitchen Order Ticket shows full customization:
```
1× MARGHERITA PIZZA
   ► Size: LARGE
   ► Crust: CHEESE BURST
   + Extra Cheese
   + Mushrooms
   + Pepperoni
   Note: Extra crispy please
```

### Data Structure

```typescript
MenuItem {
  id: string
  name: string
  short_name: string
  description: string
  category_id: string
  image_url: string
  thumbnail_url: string
  pricing_type: "single" | "variants"
  base_price: number | null

  variant_groups: [
    {
      id: string
      name: string
      display_name: string
      selection_type: "single" | "multi"
      required: boolean
      sort_order: number
      options: [
        {
          id: string
          name: string
          price: number
          price_type: "absolute" | "addon"
          description: string
          is_default: boolean
          is_available: boolean
        }
      ]
    }
  ]

  addons: [
    {
      id: string
      name: string
      price: number
      is_available: boolean
      tags: string[]
    }
  ]

  station: string
  prep_time_minutes: { default: number, [variant]: number }
  tags: string[]
  is_vegetarian: boolean
  is_spicy: boolean
  is_available: boolean
}

OrderItem {
  menu_item_id: string
  selected_variants: [{ group_name, option_name, price }]
  selected_addons: [{ name, price }]
  base_price: number
  addons_price: number
  unit_price: number
  quantity: number
  total_price: number
  special_instructions: string
  display_name: string
  display_addons: string
}
```

---

## Customer Loyalty & CRM

Complete customer database, loyalty points, memberships, and engagement tools.

### System Flow

```
┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐
│ CAPTURE │───►│  EARN   │───►│ REDEEM  │───►│ ENGAGE  │
│ CUSTOMER│    │ POINTS  │    │ REWARDS │    │  RETAIN │
└─────────┘    └─────────┘    └─────────┘    └─────────┘
```

### Customer Capture Points

| Touchpoint | How Customer Registers |
|------------|------------------------|
| QR Order | Enter phone to earn points |
| Bill Payment | Cashier asks for phone |
| Reservation | Phone required for booking |
| Phone Order | Already have phone |
| WiFi Login | Phone/email for WiFi access |
| Feedback Form | Optional phone entry |

### Membership Tiers

| Tier | Requirement | Point Rate | Birthday Reward |
|------|-------------|------------|-----------------|
| 🥉 Bronze | Sign up | 1 pt / Rs. 10 | 100 pts |
| 🥈 Silver | Rs. 5,000 spent | 1.25 pts / Rs. 10 | 200 pts |
| 🥇 Gold | Rs. 15,000 spent | 1.5 pts / Rs. 10 | 500 pts + free dessert every 5th visit |
| 💎 Platinum | Rs. 50,000 spent | 2 pts / Rs. 10 | 1000 pts + free meal + 10% permanent discount |

### Points Earning

| Action | Points |
|--------|--------|
| Rs. 10 spent (Bronze) | 1 point |
| Rs. 10 spent (Silver) | 1.25 points |
| Rs. 10 spent (Gold) | 1.5 points |
| Rs. 10 spent (Platinum) | 2 points |
| Sign up (welcome) | 50 points |
| Birthday | 100-1000 pts (by tier) |
| First order | 25 bonus points |
| Referral (friend joins) | 100 points |
| Review/feedback | 10 points |
| Complete profile | 20 points |
| Double points day | 2× points |

### Points Redemption

| Redemption | Points Required | Value |
|------------|-----------------|-------|
| Rs. 50 off | 50 points | Rs. 50 |
| Rs. 100 off | 100 points | Rs. 100 |
| Rs. 250 off | 250 points | Rs. 250 |
| Free Momo | 150 points | ~Rs. 350 |
| Free Dessert | 80 points | ~Rs. 150 |
| Free Drink | 50 points | ~Rs. 100 |

### Redemption Rules

- Minimum order: Rs. 500 to redeem
- Maximum redemption: 50% of bill
- Points expire: 12 months after earning
- No cash value

### Guest Registration Flow

1. **Scan QR & Verify OTP**
2. **Prompt to Join** (optional, can skip)
3. **Quick Registration**: Phone, Name, Email (optional), DOB (optional)
4. **OTP Verification** (4-digit SMS code)
5. **Welcome Screen**: Show welcome bonus + tier + benefits

### Returning Customer Recognition

- System recognizes phone from previous device/session
- Shows: "Is this you? 📱 984-123-4567 | 👤 Ramesh S. | 🥈 SILVER | 💰 320 pts"
- One-tap confirmation

### Guest Rewards View

```
┌─────────────────────────────────────┐
│ 👤 Ramesh Sharma                    │
│ 📱 984-123-4567                     │
│ 🥈 SILVER MEMBER                    │
│                                     │
│ ┌───────────────────────────────┐  │
│ │        320 POINTS             │  │
│ │        Available              │  │
│ │        Worth up to Rs. 320    │  │
│ └───────────────────────────────┘  │
│                                     │
│ PROGRESS TO GOLD 🥇                 │
│ ████████████░░░░░░░░ 65%           │
│ Rs. 9,750 / Rs. 15,000             │
│                                     │
│ YOUR BENEFITS:                      │
│ ✓ 1.25× points on every order      │
│ ✓ 200 pts birthday reward          │
│ ✓ Priority seating                 │
│ ✓ Exclusive Silver offers          │
└─────────────────────────────────────┘
```

### Cashier Integration

- Search customer by phone at payment
- View tier, points, visit history
- Apply points discount with one click
- Register new customer inline
- Show points earned on this order

### CRM Dashboard (Manager)

```
┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
│  TOTAL   │ │  ACTIVE  │ │   NEW    │ │  POINTS  │
│CUSTOMERS │ │ (30 day) │ │ (Today)  │ │ REDEEMED │
│  1,245   │ │   487    │ │    8     │ │ Rs.2,450 │
└──────────┘ └──────────┘ └──────────┘ └──────────┘

MEMBERSHIP BREAKDOWN:
💎 Platinum:    12 (1%)     Rs. 8.5L total spent
🥇 Gold:        89 (7%)     Rs. 15.2L total spent
🥈 Silver:     245 (20%)    Rs. 18.7L total spent
🥉 Bronze:     899 (72%)    Rs. 12.1L total spent
```

### Data Structure

```typescript
Customer {
  id: string
  phone: string
  name: string
  email: string | null
  date_of_birth: Date | null

  tier: "bronze" | "silver" | "gold" | "platinum"
  total_points: number
  available_points: number
  total_spent: number
  total_visits: number

  preferences: {
    favorite_items: string[]
    dietary_restrictions: string[]
    seating_preference: string
  }

  sms_opt_in: boolean
  email_opt_in: boolean

  created_at: Date
  last_visit_at: Date
}

PointsTransaction {
  id: string
  customer_id: string
  type: "earn" | "redeem" | "bonus" | "expire"
  points: number
  description: string
  order_id: string | null
  created_at: Date
  expires_at: Date | null
}

LoyaltySettings {
  enabled: boolean
  point_value: number  // 1 point = Rs. X
  earning_rate: { bronze, silver, gold, platinum }
  tier_thresholds: { silver, gold, platinum }
  welcome_bonus: number
  birthday_rewards: { bronze, silver, gold, platinum }
  min_order_for_redemption: number
  max_redemption_percent: number
  points_expiry_months: number
}
```

---

## Biometric Integration

Integration with biometric devices for staff attendance tracking.

### Supported Devices

| Brand | Models | Connection |
|-------|--------|------------|
| ZKTeco | K40, K50, F18 | LAN, SDK, Push |
| eSSL | X990, K30, X7 | LAN, SDK |
| Realand | A-F211, A-C030 | LAN |
| Hikvision | DS-K1T320 series | LAN, SDK |

### Connection Methods

1. **LAN Connection**: Device on same network, direct API calls
2. **SDK Integration**: Vendor SDK for advanced features
3. **Push Protocol**: Device pushes data to server

### Device Configuration

```
┌─────────────────────────────────────────────────────────────┐
│ + ADD BIOMETRIC DEVICE                                      │
│                                                             │
│ Device Name: [ Main Entrance_____________ ]                 │
│ Device Type: [ ZKTeco K40 ▼ ]                              │
│ Location:    [ Kitchen Entrance ▼ ]                        │
│                                                             │
│ ═══════════════════════════════════════════════════════════│
│ CONNECTION SETTINGS                                         │
│ ═══════════════════════════════════════════════════════════│
│                                                             │
│ Connection: ● LAN (Network)  ○ Push Protocol               │
│                                                             │
│ IP Address: [ 192.168.1.100__ ]                            │
│ Port:       [ 4370 ]                                       │
│                                                             │
│ [ Test Connection ]  Status: 🟢 Connected                  │
│                                                             │
│ ═══════════════════════════════════════════════════════════│
│ SYNC SETTINGS                                               │
│ ═══════════════════════════════════════════════════════════│
│                                                             │
│ Sync frequency: [ Every 5 minutes ▼ ]                      │
│ ☑️ Auto-sync attendance logs                               │
│ ☑️ Push staff data to device                               │
│                                                             │
│ [ Save Device ]                                            │
└─────────────────────────────────────────────────────────────┘
```

### Staff Enrollment

1. Register fingerprint on device
2. Map device user ID to staff record in system
3. Sync staff data to device

### Attendance Sync

- Device logs → System every 5 minutes
- Match punch with scheduled shift
- Calculate: On-time, Late, Early departure, Overtime
- Grace period configurable (default: 5 minutes)

### Sync Logs

```
| Time       | Staff     | Device        | Status      |
|------------|-----------|---------------|-------------|
| 8:00 AM    | Ram       | Main Entrance | Clock In ✅ |
| 8:15 AM    | Sita      | Main Entrance | Late ⚠️     |
| 12:30 PM   | Ram       | Kitchen       | Break Out   |
| 1:00 PM    | Ram       | Kitchen       | Break In    |
| 5:05 PM    | Ram       | Main Entrance | Clock Out ✅|
```

### Offline Handling

- Device stores punches locally
- Sync when connection restored
- Manual sync button available
- Alert manager if device offline > 30 minutes

### Data Structure

```typescript
BiometricDevice {
  id: string
  name: string
  device_type: "zkteco" | "essl" | "realand" | "hikvision"
  model: string
  location: string
  ip_address: string
  port: number
  connection_type: "lan" | "push"
  sync_frequency_minutes: number
  is_active: boolean
  last_sync_at: Date
  status: "online" | "offline"
}

StaffBiometric {
  id: string
  staff_id: string
  device_id: string
  device_user_id: string
  enrolled_at: Date
  fingerprint_count: number
}

BiometricLog {
  id: string
  device_id: string
  device_user_id: string
  staff_id: string
  punch_type: "in" | "out" | "break_out" | "break_in"
  punch_time: Date
  synced_at: Date
  matched_shift_id: string | null
}
```

---

## Cashier Dashboard

Complete billing, payment, and cash management system.

### Main Dashboard

```
┌─────────────────────────────────────────────────────────────┐
│ 💰 CASHIER DASHBOARD                    Cashier: Sita       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐           │
│ │ PENDING     │ │ TODAY'S     │ │ CASH IN     │           │
│ │ BILLS       │ │ COLLECTION  │ │ DRAWER      │           │
│ │     5       │ │ Rs. 45,230  │ │ Rs. 12,500  │           │
│ └─────────────┘ └─────────────┘ └─────────────┘           │
│                                                             │
│ ═══════════════════════════════════════════════════════════│
│ PENDING BILLS                                               │
│ ═══════════════════════════════════════════════════════════│
│                                                             │
│ Bill #    │ Table │ Amount   │ Requested │ Action         │
│ ──────────┼───────┼──────────┼───────────┼──────────────  │
│ B-1052    │ T1    │ Rs.1,840 │ 2 min ago │ [Collect]      │
│ B-1053    │ T5    │ Rs.2,450 │ 5 min ago │ [Collect]      │
│ B-1054    │ T8    │ Rs.890   │ Just now  │ [Collect]      │
│                                                             │
│ ═══════════════════════════════════════════════════════════│
│ QUICK ACTIONS                                               │
│ ═══════════════════════════════════════════════════════════│
│                                                             │
│ [📋 Create Bill] [💵 Open Drawer] [📊 Today's Report]     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Payment Methods

| Method | Details |
|--------|---------|
| 💵 Cash | Accept cash, calculate change |
| 💳 Card | Visa, Mastercard, UnionPay |
| 📱 QR | Fonepay, eSewa, Khalti, ConnectIPS |
| ✂️ Split | Multiple methods per bill |

### Payment Collection Flow

1. **Select Bill**: From pending list or search
2. **Verify Amount**: Show bill breakdown
3. **Apply Discounts** (if any, may need manager PIN)
4. **Apply Loyalty Points** (if customer registered)
5. **Select Payment Method**
6. **Process Payment**
7. **Print Receipt**
8. **Close Bill**

### Discount Types

| Type | Example | Authorization |
|------|---------|---------------|
| Percentage | 10% off | Manager PIN if > 10% |
| Fixed Amount | Rs. 200 off | Manager PIN if > Rs. 500 |
| Item Void | Remove item | Manager PIN if kitchen started |
| Comp | Full comp | Manager PIN required |

### Cash Drawer Management

```
CASH DRAWER OPERATIONS:
├── Open Drawer
│   ├── For change
│   ├── Cash payment
│   └── Manual open (logged)
├── Cash In
│   ├── Starting float
│   └── Manager deposit
├── Cash Out
│   ├── Petty cash (needs reason + manager approval)
│   └── Change request
└── Close Drawer (End of day)
    ├── Count cash
    ├── Verify against expected
    └── Record variance
```

### Daily Settlement

```
┌─────────────────────────────────────────────────────────────┐
│ 📊 END OF DAY SETTLEMENT                                    │
│                                                             │
│ Date: Jan 23, 2026                                         │
│ Cashier: Sita                                              │
│                                                             │
│ ═══════════════════════════════════════════════════════════│
│ SALES SUMMARY                                               │
│ ═══════════════════════════════════════════════════════════│
│                                                             │
│ Total Bills:              45                               │
│ Gross Sales:              Rs. 67,890                       │
│ Discounts:                - Rs. 2,340                      │
│ Refunds:                  - Rs. 450                        │
│ Net Sales:                Rs. 65,100                       │
│                                                             │
│ ═══════════════════════════════════════════════════════════│
│ PAYMENT BREAKDOWN                                           │
│ ═══════════════════════════════════════════════════════════│
│                                                             │
│ Cash:                     Rs. 35,200                       │
│ Card:                     Rs. 22,400                       │
│ QR Payments:              Rs. 7,500                        │
│ ─────────────────────────────────────────────              │
│ Total:                    Rs. 65,100                       │
│                                                             │
│ ═══════════════════════════════════════════════════════════│
│ CASH DRAWER                                                 │
│ ═══════════════════════════════════════════════════════════│
│                                                             │
│ Opening Float:            Rs. 5,000                        │
│ + Cash Sales:             Rs. 35,200                       │
│ - Cash Out:               Rs. 2,000 (petty cash)           │
│ ─────────────────────────────────────────────              │
│ Expected in Drawer:       Rs. 38,200                       │
│                                                             │
│ Actual Count:             Rs. 38,150                       │
│ Variance:                 - Rs. 50 (Short)                 │
│                                                             │
│ [ Submit Settlement ]                                       │
└─────────────────────────────────────────────────────────────┘
```

### Refund Processing

| Refund Type | Process |
|-------------|---------|
| Full Refund | Cancel entire bill, return payment |
| Partial Refund | Refund specific items |
| Item Replacement | No refund, replace with new item |

All refunds require:
- Reason selection
- Manager approval
- Customer signature (optional)
- Logged in activity trail

### Cashier Permissions

| Action | Cashier | With Manager PIN |
|--------|---------|------------------|
| Collect payment | ✓ | — |
| Print bill | ✓ | — |
| Apply discount ≤ 10% | ✓ | — |
| Apply discount > 10% | — | ✓ |
| Void item (kitchen not started) | ✓ | — |
| Void item (kitchen started) | — | ✓ |
| Process refund | — | ✓ |
| Open drawer (no sale) | ✓ | Logged |
| Cash out | — | ✓ |

### Data Structures

```typescript
Bill {
  id: string
  bill_number: string
  session_id: string
  table_id: string

  subtotal: number
  service_charge: number
  tax_amount: number
  discount_amount: number
  discount_reason: string
  total_amount: number
  rounding_adjustment: number

  status: "open" | "printed" | "paid" | "voided"
  payment_status: "pending" | "partial" | "completed"

  created_at: Date
  printed_at: Date
  paid_at: Date
}

Payment {
  id: string
  bill_id: string
  amount: number
  payment_method: "cash" | "card" | "qr_fonepay" | "qr_esewa" | "qr_khalti"
  status: "pending" | "completed" | "failed" | "refunded"
  transaction_reference: string
  collected_by: string
  paid_at: Date
}

CashDrawer {
  id: string
  cashier_id: string
  opening_balance: number
  current_balance: number
  expected_balance: number
  status: "open" | "closed"
  opened_at: Date
  closed_at: Date

  cash_in_total: number
  cash_out_total: number
  variance: number
}

Refund {
  id: string
  bill_id: string
  amount: number
  reason: string
  refund_method: "cash" | "card" | "store_credit"
  approved_by: string
  processed_by: string
  created_at: Date
}
```

---

## Hybrid Order Flow

The Hybrid Order Flow allows guests to browse and order immediately via QR while staff confirms orders when session isn't active yet.

### Flow Overview

```
┌─────────────────────────────────────────────────────────────┐
│  HYBRID ORDER FLOW                                          │
│                                                             │
│  1. Guest scans QR                                          │
│  2. Guest enters table OTP ✅                               │
│  3. Guest browses menu freely                              │
│  4. Guest adds items to cart                               │
│  5. Guest taps "Place Order"                               │
│  6. ⏳ Order sent to waiter for confirmation                │
│  7. Waiter receives notification                           │
│  8. Waiter confirms order + enters guest count             │
│  9. ✅ Order goes to kitchen                                │
│  10. Guest notified "Order confirmed!"                     │
└─────────────────────────────────────────────────────────────┘
```

### Two Scenarios

#### Scenario 1: Staff Seats Guest First (Recommended)
1. Guest arrives at restaurant
2. Staff seats guest at table
3. Staff enters guest count → Session starts
4. Guest scans QR and enters OTP
5. Guest can order immediately (session already active)

#### Scenario 2: Guest Scans Before Staff Seats
1. Guest sits at table (self-seating)
2. Guest scans QR and enters OTP
3. No session yet - Guest sees "Waiting for staff" or can browse menu
4. Guest adds items and places order
5. Order goes to waiter for confirmation
6. Waiter enters guest count and confirms
7. Order sent to kitchen

### Order Confirmation Settings

| Condition | Confirmation Required? |
|-----------|------------------------|
| Guest orders, no session | Yes - waiter confirms + enters count |
| Guest orders, session active | No - direct to kitchen |
| Staff quick order | No - staff already at table |

### Guest Capabilities

| Action | Before Confirm | After Confirm |
|--------|----------------|---------------|
| Browse menu | ✅ | ✅ |
| Add to cart | ✅ | ✅ |
| Edit pending order | ✅ | ❌ |
| Cancel pending order | ✅ | ❌ (call waiter) |
| Track order | ❌ | ✅ |

### Waiter Capabilities During Confirmation

| Action | Allowed |
|--------|---------|
| View order items | ✅ |
| Enter guest count | ✅ (required) |
| Link customer | ✅ (optional) |
| Add/remove items | ✅ |
| Add special instructions | ✅ |
| Confirm order | ✅ |
| Reject order | ✅ (with reason) |

### Order Rejection Reasons

- Item(s) not available
- Kitchen closed
- Table issue (wrong table, already occupied)
- Guest left
- Other (with notes)

---

## Quick Order & Guest Count Management

### Guest Count Entry (Staff Only)

**Important**: Guest count is ALWAYS entered by restaurant staff, never by guests.

#### Who Can Enter/Update Guest Count

| Role | Enter Initial Count | Update During Session |
|------|---------------------|----------------------|
| Waiter | ✅ | ✅ |
| Host | ✅ | ❌ |
| Manager | ✅ | ✅ |
| Cashier | ❌ | ❌ |
| Guest | ❌ | ❌ (can request via Call Waiter) |

#### Guest Count Update Popup

When updating guest count, staff must provide:
- New count (using +/- buttons)
- Reason for change:
  - More guests arrived
  - Some guests left
  - Initial count was incorrect

All guest count changes are logged in activity history.

### Quick Order Feature

Waiters can place orders quickly using a streamlined interface.

#### Features

- **Search & Add**: Search for items by name
- **Frequently Ordered**: Shows top 10 most ordered items
- **One-Tap Add**: Simple items added with single tap
- **Variant Popup**: Items with variants show quick selection popup
- **Special Instructions**: Quick tags like "Less spicy", "No onion", "Rush", "VIP"

#### Quick Tags

Configurable quick tags for special instructions:
- Less spicy / Extra spicy
- No onion / No garlic
- No ice
- Less oil
- Extra sauce
- Rush
- VIP

---

## Customer Verification System

### Verification Methods

#### Method 1: Staff Verification (Default)

```
Guest provides phone → Staff searches → Shows customer info
                                      → Staff verifies identity
                                      → Links to session
```

- Best for known customers
- Fast for repeat visitors
- Staff handles verification

#### Method 2: SMS OTP (Via Sparrow SMS)

```
Guest enters phone → System sends OTP → Guest enters OTP
                                      → Verified automatically
                                      → Links to session
```

- Best for new customers
- Secure verification
- Uses Sparrow SMS API

### MPIN System

For returning customers on different devices:

- **4-digit PIN** set by customer
- Used when trusted device not recognized
- **Max 3 attempts** before lockout
- Can reset via SMS OTP

### Device Fingerprinting

Trusted devices are remembered:
- **Trust Period**: 90 days
- Automatic login on recognized devices
- Multiple devices can be trusted
- Customer can view/remove trusted devices

### Verification Data Structure

```typescript
Customer {
  // ... basic info

  phone_verified: boolean
  verification_method: "staff" | "sms_otp"
  verified_at: Date
  verified_by: string  // Staff ID if staff verified

  mpin_hash: string    // Hashed 4-digit PIN
  mpin_attempts: number
  mpin_locked_until: Date

  trusted_devices: CustomerDevice[]
}

CustomerDevice {
  device_fingerprint: string
  device_info: JSON
  trusted_until: Date
  is_active: boolean
  first_seen_at: Date
  last_seen_at: Date
}
```

---

## Points Display on Menu

### Where Points Are Shown

1. **On Menu Items**: Each item shows potential points
2. **In Cart**: Total points for order
3. **On Variants/Add-ons**: Points per selection
4. **By Tier**: Multiplier shown (e.g., "1.25× Silver")

### Points Calculation

```
Base points = 10% of item price
Tier multiplier applied:
  - Bronze: 1× (base)
  - Silver: 1.25×
  - Gold: 1.5×
  - Platinum: 2×
```

### Example Display

```
┌─────────────────────────────────┐
│ Chicken Momo                    │
│ Rs. 350                         │
│ 💰 +35 pts (or +44 pts Silver)  │
│                         [ADD]   │
└─────────────────────────────────┘
```

### Cart Points Summary

```
┌─────────────────────────────────┐
│ Your Order                      │
│ 2× Chicken Momo      Rs. 700    │
│ 1× Biryani           Rs. 450    │
│ ─────────────────────────────   │
│ Subtotal: Rs. 1,150             │
│ 💰 Points you'll earn: +127 pts │
│ (1.25× Silver member bonus)     │
└─────────────────────────────────┘
```

---

## Promotions & Offers

### Promotion Types

| Type | Description | Auto-Apply |
|------|-------------|------------|
| Happy Hour | Time-based discount | ✅ Yes |
| Combo Deal | Bundle items at special price | Manual select |
| BOGO | Buy one get one free/discounted | ✅ Yes |
| First Order | Welcome discount for new customers | ✅ Yes |
| Promo Code | Enter code for discount | Manual code |
| Minimum Order | Spend X get Y% off | ✅ Yes |
| Festival Offer | Special occasion promotions | ✅ Yes |
| Item Discount | Direct discount on items | ✅ Yes |
| Loyalty Bonus | Extra points on specific items | ✅ Yes |

### Happy Hour

- Auto-discount during specific hours
- Example: 20% off drinks 3-6 PM daily
- Shows countdown timer on menu
- Highlights discounted items

### Combo Deals

- Bundle multiple items at special price
- Example: Burger + Fries + Drink = Rs. 450 (Save Rs. 120)
- Shows as separate "Combos" category
- Displays savings amount

### BOGO (Buy One Get One)

- Buy one item, get another free or discounted
- Can apply to same item or different items
- Configurable: 100% off, 50% off, or fixed discount
- Max uses per order configurable

### First Order Discount

- Welcome offer for new registered customers
- Percentage or fixed amount off
- Maximum discount cap (e.g., max Rs. 200)
- Auto-applied at checkout

### Promo Codes

- Unique codes customers enter
- Configurable: percentage or fixed discount
- Validity period and usage limits
- Per-customer limits
- Can target specific tiers

### Minimum Order Offers

- Tiered discounts based on order amount
- Example:
  - Rs. 500+ → 5% off
  - Rs. 1000+ → 10% off
  - Rs. 2000+ → 15% off
- Shows progress bar in cart

### Festival Offers

- Special occasion promotions (Dashain, Tihar, etc.)
- Can include special menu items
- Festival-themed banners
- Date range controlled

### Promotion Data Structure

```typescript
Promotion {
  id: string
  restaurant_id: string

  name: string
  type: PromotionType
  status: "active" | "paused" | "scheduled" | "expired"

  // Discount
  discount_type: "percentage" | "fixed" | "free_item"
  discount_value: number
  max_discount: number

  // Applies to
  applies_to: "all" | "categories" | "items"
  category_ids: string[]
  item_ids: string[]

  // Schedule
  start_date: Date
  end_date: Date
  days_of_week: string[]
  start_time: string
  end_time: string

  // Limits
  total_uses_limit: number
  per_customer_limit: number

  // Display
  show_on_menu: boolean
  show_countdown: boolean
  banner_message: string
}
```

---

## Internal Communication System

### Features Overview

| Feature | Description | Who Uses |
|---------|-------------|----------|
| Internal Chat | Staff-to-staff messaging | All staff |
| Announcements | Manager broadcasts to all staff | Manager/Owner |
| Shift Notes | Pass info to next shift | All staff |
| Daily Briefing | Manager's notes for the day | Manager creates, all read |
| Lost & Found | Log items left by guests | All staff |

### Internal Chat

- **Groups**: All Staff, Kitchen Team, Floor Staff (system groups)
- **Direct Messages**: One-on-one messaging
- **Quick Replies**: "On my way", "Got it", "Need help"
- **Online Status**: Shows who is currently working

### Announcements

- **Priority Levels**: Normal, Important (highlighted), Urgent (push notification)
- **Recipients**: All staff, specific roles, specific people
- **Read Confirmation**: Track who has read
- **Pin to Top**: Important announcements stay visible
- **Schedule**: Can schedule for later

### Shift Notes

- Handover notes from previous shift
- Quick tags: Customer issue, Equipment, Stock, VIP, Pending order, Complaint
- Read tracking
- Browse previous days

### Daily Briefing

Manager creates daily briefing with:
- Expected covers and reservations
- Today's specials
- 86'd items (out of stock)
- Staff notes
- Daily goals
- Manager's message

Staff must acknowledge reading.

### Lost & Found

Track items left by guests:
- Categories: Phone, Wallet, Keys, Glasses, Clothing, Bag, Jewelry, Other
- Found details: Location, time, found by
- Storage location
- Photo upload
- Claim verification process
- Disposal tracking

---

## License System & Feature Flags

### Business Model

QR Dine supports three revenue streams:

1. **SaaS (Hosted)**: Monthly subscription, hosted on LUMORA servers
2. **CodeCanyon (One-time)**: Source code purchase, buyer self-hosts
3. **Licensed Self-hosted**: Install on customer's PC, license enables features

### License Tiers

| Tier | Price Model | Features |
|------|-------------|----------|
| Starter | Rs. 15,000 or Rs. 1,500/month | 1 restaurant, 20 tables, basic features |
| Professional | Rs. 35,000 or Rs. 3,000/month | Unlimited tables, loyalty, promotions, SMS |
| Enterprise | Rs. 75,000 or Rs. 6,000/month | 5 restaurants, all features |
| Unlimited | Rs. 150,000 lifetime | Unlimited restaurants, white-label |

### Feature Flags

```typescript
const FEATURE_FLAGS = {
  // Core (all tiers)
  qr_ordering: ["starter", "professional", "enterprise", "unlimited"],
  table_management: ["starter", "professional", "enterprise", "unlimited"],
  basic_reports: ["starter", "professional", "enterprise", "unlimited"],

  // Professional+
  loyalty_program: ["professional", "enterprise", "unlimited"],
  promotions: ["professional", "enterprise", "unlimited"],
  sms_integration: ["professional", "enterprise", "unlimited"],
  advanced_reports: ["professional", "enterprise", "unlimited"],

  // Enterprise+
  multi_location: ["enterprise", "unlimited"],
  api_access: ["enterprise", "unlimited"],

  // Unlimited only
  white_label: ["unlimited"],
  source_code: ["unlimited"],
};
```

### License Validation Flow

1. Restaurant installs QR Dine
2. On first run, asks for LICENSE KEY
3. System sends key to LUMORA license server
4. Server validates and returns:
   - Is valid? ✓/✗
   - License tier
   - Enabled features list
   - Expiry date
   - Max restaurants allowed
5. System caches license locally (24h)
6. Periodic re-validation

---

## Desktop App & Windows Installer

### Electron Desktop Application

QR Dine includes a Windows desktop application built with Electron.

#### Features

- **System Tray Manager**: Start/stop/restart server
- **Background Service**: Runs automatically on Windows startup
- **Database Management**: Built-in PostgreSQL
- **Backup Tools**: Local and cloud backup
- **Update Manager**: In-app updates

### Windows Installer (Setup Wizard)

Professional installer like ZKTeco BioTime:

#### Installation Steps

1. **Welcome**: Version info, what will be installed
2. **License Agreement**: Accept terms
3. **License Key**: Enter and validate license
4. **Installation Type**: Express (recommended) or Custom
5. **Database Setup**: Install new PostgreSQL or use existing
6. **Installation Location**: Choose folder
7. **Server Configuration**: Port, network access, startup options
8. **Admin Account**: Restaurant name, admin email, password
9. **Installing**: Progress bar with status
10. **Complete**: Success, open browser, shortcuts

### System Tray Manager

Right-click menu options:
- Open Dashboard
- Open Admin Panel
- Start Service
- Stop Service
- Restart Service
- View Logs
- Database Backup
- Settings
- Check for Updates
- About
- Exit

### Bundled Components

- Node.js runtime
- PostgreSQL database
- All dependencies
- Windows Service configuration

---

## Backup System

### Local Backup

Always available, stored on restaurant's PC.

- **Location**: C:\QRDine\Backups\
- **Includes**: Database, uploaded images, configuration
- **Schedule**: Configurable (daily recommended)
- **Retention**: Keep last N backups

### Cloud Backup (License Required)

Available for Professional tier and above.

| Tier | Cloud Storage |
|------|---------------|
| Starter | ❌ No cloud backup |
| Professional | 5 GB |
| Enterprise | 20 GB |
| Unlimited | 100 GB |

#### Cloud Features

- Auto-sync daily
- Encrypted (AES-256)
- Browse backup history
- Restore from any backup
- Download to local

### Backup Data Structure

```typescript
Backup {
  id: string
  type: "local" | "cloud"
  restaurant_id: string

  includes: {
    database: boolean
    images: boolean
    configuration: boolean
  }

  size_bytes: number
  encrypted: boolean

  created_at: Date
  expires_at: Date

  // For cloud
  cloud_url: string
  upload_status: "pending" | "uploading" | "completed" | "failed"
}
```

---

## Development Roadmap

### 50-Step Implementation Plan

#### PHASE 1: FOUNDATION (Steps 1-8)

| Step | Name |
|------|------|
| 1 | Project Setup & Monorepo Structure |
| 2 | Database Schema — Core Tables |
| 3 | Database Schema — Menu & Orders |
| 4 | Database Schema — Customer & Loyalty |
| 5 | Database Schema — Staff & Communication |
| 6 | Authentication System |
| 7 | UI Component Library |
| 8 | API Architecture & Base Utilities |

#### PHASE 2: CORE RESTAURANT (Steps 9-18)

| Step | Name |
|------|------|
| 9 | Restaurant Setup & Configuration |
| 10 | Table Management & Floor Plan |
| 11 | Menu Categories Management |
| 12 | Menu Items Management |
| 13 | QR Code Generation & OTP System |
| 14 | Guest QR Scan & Verification Flow |
| 15 | Guest Menu Browse & Cart |
| 16 | Guest Order Placement (Hybrid Flow) |
| 17 | Order Management & Status Tracking |
| 18 | Real-time Notifications |

#### PHASE 3: STAFF OPERATIONS (Steps 19-28)

| Step | Name |
|------|------|
| 19 | Waiter Dashboard & Table Overview |
| 20 | Waiter Quick Order & Guest Count Entry |
| 21 | Order Confirmation Flow |
| 22 | Kitchen Dashboard & KOT Display |
| 23 | Kitchen Order Status Management |
| 24 | Cashier Dashboard & Billing |
| 25 | Payment Processing |
| 26 | Bill Generation & Printing |
| 27 | End of Day Settlement |
| 28 | Manager Dashboard |

#### PHASE 4: ADVANCED FEATURES (Steps 29-38)

| Step | Name |
|------|------|
| 29 | Customer Registration & MPIN |
| 30 | Customer Loyalty & Points |
| 31 | Membership Tiers & Benefits |
| 32 | Promotions — Happy Hour & Discounts |
| 33 | Promotions — Combo, BOGO, Codes |
| 34 | Reports & Analytics |
| 35 | Staff Management & Attendance |
| 36 | Internal Communication |
| 37 | Shift Notes & Daily Briefing |
| 38 | Lost & Found Management |

#### PHASE 5: MULTI-TENANT & LICENSE (Steps 39-44)

| Step | Name |
|------|------|
| 39 | Super Admin Dashboard |
| 40 | Multi-tenant Architecture |
| 41 | License Server API |
| 42 | License Validation & Feature Flags |
| 43 | Subscription & Tier Management |
| 44 | Cloud Backup System |

#### PHASE 6: DESKTOP APP & DEPLOYMENT (Steps 45-50)

| Step | Name |
|------|------|
| 45 | Electron App Setup |
| 46 | Windows Installer |
| 47 | System Tray Manager |
| 48 | Local Backup & Restore |
| 49 | In-App Update System |
| 50 | PWA & CodeCanyon Preparation |

### Tech Stack

- **Frontend**: Next.js 14, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, Prisma ORM
- **Database**: PostgreSQL
- **Desktop**: Electron
- **Real-time**: WebSocket/Pusher

---

## PROJECT-SPEC.md Template

A complete ~100-page system specification document is available for development reference.

### Document Structure

The PROJECT-SPEC.md contains 13 main sections plus appendices:

| Section | Content |
|---------|---------|
| 1. Project Overview | Basic info, system description, key differentiators |
| 2. Tech Stack | Core application, desktop app, dev tools, external services |
| 3. Project Structure | Complete monorepo folder structure |
| 4. Business Model | Three revenue streams (SaaS, CodeCanyon, Licensed) |
| 5. License System | Tiers, feature matrix, validation flow |
| 6. User Roles & Permissions | Complete permission matrix with ~70 permissions |
| 7. Database Schema | Full Prisma schema with all models |
| 8. Feature Specifications | Table management, QR ordering, loyalty, promotions |
| 9. API Architecture | Response formats, endpoints structure (~80 endpoints) |
| 10. UI/UX Guidelines | Design principles, color scheme, typography |
| 11. Desktop Application | Setup wizard, system tray, backup, updates |
| 12. Coding Conventions | TypeScript, file naming, component structure |
| 13. Critical Rules | Security, business logic, development rules |
| Appendix A | Environment variables |
| Appendix B | Sample seed data |

### Key Technical Specifications

#### Database Models (Complete Prisma Schema)

```
Core Models:
├── License           # License key management
├── Restaurant        # Restaurant configuration
├── User              # Staff accounts
├── Session           # Authentication sessions
├── Table             # Table management
├── Category          # Menu categories
├── MenuItem          # Menu items with variants
├── TableSession      # Active dining sessions
├── Order             # Order management
├── OrderItem         # Order line items
├── Bill              # Billing records
├── Payment           # Payment transactions
├── Customer          # Customer profiles
├── CustomerDevice    # Trusted devices
├── CustomerNote      # Staff notes on customers
├── PointsTransaction # Loyalty points history
├── Promotion         # Promotions & offers
├── PromotionUsage    # Promotion tracking
├── StaffShift        # Shift scheduling
├── StaffAttendance   # Clock in/out records
├── ChatMessage       # Internal messages
├── ChatGroup         # Chat groups
├── Announcement      # Staff announcements
├── ShiftNote         # Shift handover notes
├── DailyBriefing     # Daily staff briefings
├── LostFoundItem     # Lost & found tracking
├── ActivityLog       # Audit trail
├── SmsLog            # SMS tracking
├── RestaurantSettings # Per-restaurant config
└── BackupLog         # Backup history
```

#### API Endpoints Structure

```
/api/
├── auth/             # Login, logout, refresh, password reset
├── restaurants/      # Restaurant CRUD, settings
├── tables/           # Table management, QR, OTP
├── menu/             # Categories, items
├── orders/           # Order CRUD, status, confirm/reject
├── sessions/         # Table sessions, guest count
├── bills/            # Billing, payments, settlements
├── customers/        # Customer CRM, points
├── promotions/       # Promotions management
├── staff/            # Staff management, shifts, attendance
├── reports/          # Sales, orders, customers, staff reports
├── communication/    # Chat, announcements, briefings
├── lost-found/       # Lost & found management
├── guest/            # Public APIs (no auth required)
└── license/          # License validation
```

#### Permission System (~70 Permissions)

```typescript
// Permission categories:
PERMISSIONS = {
  // Dashboard
  "dashboard:view", "dashboard:view_revenue", "dashboard:view_analytics"

  // Tables
  "tables:view", "tables:create", "tables:update", "tables:delete"
  "tables:change_status", "tables:seat_guests", "tables:enter_guest_count"

  // Menu
  "menu:view", "menu:create", "menu:update", "menu:delete"
  "menu:toggle_availability"

  // Orders
  "orders:view", "orders:view_all", "orders:create", "orders:update"
  "orders:cancel", "orders:confirm_guest_order", "orders:quick_order"

  // Kitchen
  "kitchen:view", "kitchen:update_status", "kitchen:mark_ready"

  // Billing
  "billing:view", "billing:create", "billing:apply_discount"
  "billing:apply_promo_code", "billing:process_payment"
  "billing:refund", "billing:void", "billing:print", "billing:view_amount"

  // Customers
  "customers:view", "customers:view_basic", "customers:view_spending"
  "customers:view_full", "customers:create", "customers:update"
  "customers:delete", "customers:add_points", "customers:redeem_points"

  // Promotions
  "promotions:view", "promotions:create", "promotions:update"
  "promotions:delete", "promotions:toggle_status"

  // Reports
  "reports:view", "reports:sales", "reports:orders"
  "reports:customers", "reports:staff", "reports:export"

  // Staff Management
  "staff:view", "staff:create", "staff:update", "staff:delete"
  "staff:manage_roles", "staff:view_attendance", "staff:manage_shifts"

  // Communication
  "communication:chat", "communication:announcements_view"
  "communication:announcements_create", "communication:shift_notes"

  // Settings
  "settings:view", "settings:update", "settings:integrations"

  // Super Admin
  "superadmin:restaurants", "superadmin:licenses", "superadmin:analytics"
}
```

### Critical Business Rules

#### Security Rules
1. Always validate inputs with Zod
2. Always check permissions
3. Always filter by restaurant_id
4. Never expose sensitive data (password hashes, full license keys)
5. Use parameterized queries (Prisma handles automatically)
6. Hash passwords with bcrypt (salt rounds >= 10)
7. Implement rate limiting
8. Use HTTPS only in production

#### Business Logic Rules
1. Guest count is entered by STAFF ONLY
2. Order confirmation depends on session state
3. Customers see points, not spending amounts
4. Points calculated: `floor(amount / 10) × tier_multiplier`
5. Only CASHIER+ can process payments
6. Only MANAGER+ can give discounts/refunds
7. Only OWNER can void bills
8. Table OTP: 3 digits, max 3 attempts, expires 4 hours
9. License validates on startup, re-validates every 24 hours

#### Development Rules
1. Complete one step before next
2. Follow this specification exactly
3. Write complete code (no TODOs)
4. Add proper error handling
5. Test before marking complete
6. Maintain consistency in naming
7. Document as you go

### Usage Instructions

1. **Create PROJECT-SPEC.md**: Copy the complete template to project root
2. **Create ROADMAP.md**: 50-step development roadmap
3. **Create AI-PROMPT.md**: Context prompt for AI assistants

This document serves as the SINGLE SOURCE OF TRUTH for all development.

---

## Document Version

| Version | Date       | Author | Changes |
|---------|------------|--------|---------|
| 1.0     | 2026-01-25 | System | Initial comprehensive documentation |
| 1.1     | 2026-01-25 | System | Added Settings, Guest QR, OTP, Menu, Loyalty, Biometric, Cashier |
| 1.2     | 2026-01-25 | System | Added Hybrid Order Flow, Quick Order, Customer Verification, Points Display, Promotions, Communication, License System, Desktop App, Backup, Development Roadmap |
| 1.3     | 2026-01-25 | System | Added PROJECT-SPEC.md Template Reference with complete specification overview |

---

> **Note**: This document will be updated as new features are designed and implemented.
> Last updated: January 25, 2026
