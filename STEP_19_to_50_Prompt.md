# Complete Step 19-50 Prompt Library

## How to Use

When starting each step, use this prompt format:

```
I'm working on QR DINE project.

Current Step: {NUMBER} - {NAME}
Previous Step Status: Completed ✓

Please provide complete implementation for this step including:
1. All files to create/modify
2. Complete code (not snippets)
3. Commands to run
4. Testing instructions
5. Confirmation checklist

Let's begin Step {NUMBER}.
```

---

# PHASE 3: STAFF OPERATIONS (Steps 19-28)

---

## Step 19 Prompt

<step_19>
STEP: 19
NAME: Waiter Dashboard & Table Overview
GOAL: Create the main waiter interface with table overview and notifications
DEPENDS_ON: Step 18 completed

TASKS:
1. Create waiter dashboard layout
2. Build table overview component (grid/list view)
3. Implement table status cards with real-time updates
4. Add notification panel for new orders, requests
5. Create quick action buttons (water served, assistance, etc.)
6. Build waiter sidebar with navigation
7. Implement table filtering (by status, section, floor)
8. Add assigned tables vs all tables toggle
9. Create session timer display per table

TABLE CARD STATES:
- AVAILABLE (Green): Empty, ready for guests
- OCCUPIED (Yellow): Has active session
- NEEDS_ATTENTION (Orange): Assistance requested
- BILL_REQUESTED (Red): Waiting for bill
- CLEANING (Purple): Being cleaned

FILES TO CREATE:
- /apps/web/app/(dashboard)/waiter/page.tsx
- /apps/web/app/(dashboard)/waiter/layout.tsx
- /apps/web/app/(dashboard)/waiter/components/TableGrid.tsx
- /apps/web/app/(dashboard)/waiter/components/TableCard.tsx
- /apps/web/app/(dashboard)/waiter/components/WaiterSidebar.tsx
- /apps/web/app/(dashboard)/waiter/components/NotificationPanel.tsx
- /apps/web/app/(dashboard)/waiter/components/QuickActions.tsx
- /apps/web/lib/hooks/useWaiterTables.ts

COMPLETION CRITERIA:
[ ] Waiter dashboard loads correctly
[ ] Table cards display with correct status colors
[ ] Real-time updates work (table status changes)
[ ] Notifications panel shows new orders
[ ] Filtering by status/floor works
[ ] Quick actions are functional
[ ] Session timer updates in real-time
</step_19>

---

## Step 20 Prompt

<step_20>
STEP: 20
NAME: Waiter Quick Order & Guest Count Entry
GOAL: Allow waiter to take orders and manage guest count
DEPENDS_ON: Step 19 completed

TASKS:
1. Create quick order interface for waiter
2. Build guest count entry modal (STAFF ONLY - Critical Rule!)
3. Implement menu quick select with search
4. Add order notes and special instructions
5. Create order preview before submission
6. Build item quantity adjustment
7. Add variant/addon selection

BUSINESS RULES (CRITICAL):
1. Guest count can ONLY be entered by staff
2. Guest can NEVER modify guest count
3. Guest count history is tracked
4. Order placed by waiter = auto-confirmed

FILES TO CREATE:
- /apps/web/app/(dashboard)/waiter/orders/new/page.tsx
- /apps/web/app/(dashboard)/waiter/components/GuestCountModal.tsx
- /apps/web/app/(dashboard)/waiter/components/QuickOrderPanel.tsx
- /apps/web/app/(dashboard)/waiter/components/MenuQuickSelect.tsx
- /apps/web/lib/hooks/useQuickOrder.ts

COMPLETION CRITERIA:
[ ] Guest count modal works (staff only)
[ ] Quick menu search works
[ ] Items can be added to order
[ ] Variants/addons can be selected
[ ] Order submission works
[ ] Order appears in kitchen immediately
</step_20>

---

## Step 21 Prompt

<step_21>
STEP: 21
NAME: Order Confirmation Flow
GOAL: Implement hybrid order confirmation (guest orders need staff approval)
DEPENDS_ON: Step 20 completed

TASKS:
1. Create pending orders queue for waiter
2. Build order confirmation interface
3. Implement order rejection with reason
4. Add order modification before confirmation
5. Build confirmation notification to guest

HYBRID ORDER FLOW:
- Guest orders → PENDING → Waiter confirms → Kitchen
- Staff orders → Direct to Kitchen (auto-confirmed)

FILES TO CREATE:
- /apps/web/app/(dashboard)/waiter/orders/pending/page.tsx
- /apps/web/app/(dashboard)/waiter/components/PendingOrderCard.tsx
- /apps/web/app/(dashboard)/waiter/components/OrderConfirmModal.tsx
- /apps/web/app/(dashboard)/waiter/components/OrderRejectModal.tsx
- /apps/web/lib/services/order-confirmation.service.ts

COMPLETION CRITERIA:
[ ] Pending orders list shows correctly
[ ] Order can be confirmed (goes to kitchen)
[ ] Order can be rejected (with reason)
[ ] Guest receives notification on confirm/reject
[ ] Staff orders skip pending state
</step_21>

---

## Step 22 Prompt

<step_22>
STEP: 22
NAME: Kitchen Dashboard & KOT Display
GOAL: Create kitchen display system for order management
DEPENDS_ON: Step 21 completed

TASKS:
1. Create kitchen dashboard layout
2. Build KOT (Kitchen Order Ticket) component
3. Implement order queue with priorities
4. Add order status workflow (Pending → Preparing → Ready)
5. Create order timing display with color coding
6. Build multi-station support (Grill, Fry, etc.)
7. Implement order bumping (mark as done)
8. Add audio alerts for new orders

TIME COLOR CODING:
- 0-5 min: Green (Fresh)
- 5-10 min: Yellow (Normal)
- 10-15 min: Orange (Getting late)
- 15+ min: Red (Urgent)

FILES TO CREATE:
- /apps/web/app/(dashboard)/kitchen/page.tsx
- /apps/web/app/(dashboard)/kitchen/components/KOTCard.tsx
- /apps/web/app/(dashboard)/kitchen/components/OrderQueue.tsx
- /apps/web/app/(dashboard)/kitchen/components/StationTabs.tsx
- /apps/web/app/(dashboard)/kitchen/components/AudioAlert.tsx
- /apps/web/lib/hooks/useKitchenOrders.ts

COMPLETION CRITERIA:
[ ] Kitchen dashboard shows order queue
[ ] KOT cards display correctly
[ ] Status can be changed
[ ] Time display updates in real-time
[ ] Color coding works based on time
[ ] Audio alert plays on new order
</step_22>

---

## Step 23 Prompt

<step_23>
STEP: 23
NAME: Kitchen Order Status Management
GOAL: Complete kitchen workflow with item-level tracking
DEPENDS_ON: Step 22 completed

TASKS:
1. Implement item-level status tracking
2. Create partial order completion (some items ready)
3. Build course management (appetizer, main, dessert)
4. Add expeditor view (order coordinator)
5. Implement rush order flagging
6. Create order recall with reason

FILES TO CREATE:
- /apps/web/app/(dashboard)/kitchen/components/ItemStatusTracker.tsx
- /apps/web/app/(dashboard)/kitchen/components/CourseManager.tsx
- /apps/web/app/(dashboard)/kitchen/components/ExpeditorView.tsx
- /apps/web/app/(dashboard)/kitchen/components/RecallModal.tsx
- /apps/web/lib/services/kitchen.service.ts

COMPLETION CRITERIA:
[ ] Individual item status can be updated
[ ] Partial completion shows correctly
[ ] Rush orders are flagged
[ ] Recall with reason works
</step_23>

---

## Step 24 Prompt

<step_24>
STEP: 24
NAME: Cashier Dashboard & Billing
GOAL: Create cashier interface for billing and payments
DEPENDS_ON: Step 23 completed

TASKS:
1. Create cashier dashboard layout
2. Build active sessions list (tables with bills)
3. Implement bill generation from session
4. Create bill preview with itemization
5. Add discount application (with reason)
6. Build tax calculation
7. Implement bill splitting options

CRITICAL RULE: Waiter cannot see bill amounts!

FILES TO CREATE:
- /apps/web/app/(dashboard)/cashier/page.tsx
- /apps/web/app/(dashboard)/cashier/components/BillRequestList.tsx
- /apps/web/app/(dashboard)/cashier/components/BillPreview.tsx
- /apps/web/app/(dashboard)/cashier/components/DiscountModal.tsx
- /apps/web/app/(dashboard)/cashier/components/BillSplitModal.tsx
- /apps/web/lib/services/billing.service.ts

COMPLETION CRITERIA:
[ ] Cashier dashboard shows pending bills
[ ] Bill can be generated from session
[ ] Bill preview shows itemization
[ ] Tax calculation is correct
[ ] Discount can be applied
</step_24>

---

## Step 25 Prompt

<step_25>
STEP: 25
NAME: Payment Processing
GOAL: Implement payment collection and processing
DEPENDS_ON: Step 24 completed

TASKS:
1. Create payment interface
2. Implement multiple payment methods (Cash, Card, QR, Split)
3. Build cash payment with change calculation
4. Add card payment integration (placeholder)
5. Implement QR payment (eSewa, Khalti)
6. Create split payment between multiple methods
7. Add tip handling

FILES TO CREATE:
- /apps/web/app/(dashboard)/cashier/payment/[billId]/page.tsx
- /apps/web/app/(dashboard)/cashier/components/PaymentMethodSelector.tsx
- /apps/web/app/(dashboard)/cashier/components/CashPayment.tsx
- /apps/web/app/(dashboard)/cashier/components/SplitPayment.tsx
- /apps/web/lib/services/payment.service.ts

COMPLETION CRITERIA:
[ ] Payment method selection works
[ ] Cash payment with change calculation
[ ] Split payment works
[ ] Bill marked as PAID after full payment
</step_25>

---

## Step 26 Prompt

<step_26>
STEP: 26
NAME: Bill Generation & Printing
GOAL: Create printable bills and receipts
DEPENDS_ON: Step 25 completed

TASKS:
1. Create bill template (thermal printer format 80mm)
2. Build receipt template (A4 format)
3. Implement print functionality
4. Add bill export (PDF)
5. Create QR code on bill (for feedback/loyalty)
6. Build KOT print template
7. Add reprint functionality with tracking

REPRINT TRACKING (Critical for IRD compliance):
- Each reprint must show "Copy of Original"
- Reprint count must be displayed
- Reprint history stored in database

FILES TO CREATE:
- /apps/web/app/(dashboard)/cashier/components/BillPrintTemplate.tsx
- /apps/web/app/(dashboard)/cashier/components/ReceiptTemplate.tsx
- /apps/web/app/(dashboard)/cashier/components/KOTPrintTemplate.tsx
- /apps/web/lib/services/print.service.ts
- /apps/web/lib/utils/thermal-print.ts

COMPLETION CRITERIA:
[ ] Thermal bill template works (80mm)
[ ] Print to thermal printer works
[ ] PDF export works
[ ] Reprint tracking works
[ ] "Copy of Original" shows on reprints
</step_26>

---

## Step 27 Prompt

<step_27>
STEP: 27
NAME: End of Day Settlement
GOAL: Implement EOD reports and cash drawer management
DEPENDS_ON: Step 26 completed

TASKS:
1. Create EOD settlement interface
2. Build daily sales summary
3. Implement cash drawer reconciliation
4. Add payment method breakdown
5. Create shift handover report
6. Build variance tracking (expected vs actual)
7. Implement EOD closing process

FILES TO CREATE:
- /apps/web/app/(dashboard)/cashier/eod/page.tsx
- /apps/web/app/(dashboard)/cashier/components/EODSummary.tsx
- /apps/web/app/(dashboard)/cashier/components/PaymentBreakdown.tsx
- /apps/web/app/(dashboard)/cashier/components/CashReconciliation.tsx
- /apps/web/lib/services/eod.service.ts

COMPLETION CRITERIA:
[ ] EOD summary displays correctly
[ ] Payment breakdown shows all methods
[ ] Cash reconciliation works
[ ] Day can be closed
[ ] Report can be printed
</step_27>

---

## Step 28 Prompt

<step_28>
STEP: 28
NAME: Manager Dashboard & Overview
GOAL: Create manager interface with oversight capabilities
DEPENDS_ON: Step 27 completed

TASKS:
1. Create manager dashboard layout
2. Build real-time overview (tables, orders, staff)
3. Implement KPI cards (sales, covers, avg ticket)
4. Add live activity feed
5. Create staff performance view
6. Build discount/void approval system
7. Implement table reassignment

FILES TO CREATE:
- /apps/web/app/(dashboard)/manager/page.tsx
- /apps/web/app/(dashboard)/manager/components/KPICards.tsx
- /apps/web/app/(dashboard)/manager/components/AlertsPanel.tsx
- /apps/web/app/(dashboard)/manager/components/LiveActivityFeed.tsx
- /apps/web/app/(dashboard)/manager/components/ApprovalQueue.tsx
- /apps/web/lib/hooks/useManagerDashboard.ts

COMPLETION CRITERIA:
[ ] Manager dashboard loads with KPIs
[ ] Real-time updates work
[ ] Alerts display correctly
[ ] Approval queue works
</step_28>

---

# PHASE 4: ADVANCED FEATURES (Steps 29-38)

---

## Step 29 Prompt

<step_29>
STEP: 29
NAME: Customer Registration & MPIN
GOAL: Implement customer registration with MPIN for loyalty
DEPENDS_ON: Step 28 completed

TASKS:
1. Create customer registration flow (phone-based)
2. Implement MPIN setup (4-6 digits)
3. Build OTP verification for registration
4. Create customer login flow
5. Add customer profile management

FILES TO CREATE:
- /apps/web/app/(guest)/[restaurant]/register/page.tsx
- /apps/web/app/(guest)/[restaurant]/register/verify/page.tsx
- /apps/web/app/(guest)/[restaurant]/register/mpin/page.tsx
- /apps/web/app/(guest)/[restaurant]/login/page.tsx
- /apps/web/lib/services/customer.service.ts

COMPLETION CRITERIA:
[ ] Phone registration works
[ ] OTP verification works
[ ] MPIN setup works
[ ] Customer login with MPIN works
</step_29>

---

## Step 30 Prompt

<step_30>
STEP: 30
NAME: Customer Loyalty & Points
GOAL: Implement points earning and redemption system
DEPENDS_ON: Step 29 completed

TASKS:
1. Create points earning logic (Rs.100 = 1 point)
2. Build points history display
3. Implement points redemption at checkout
4. Add points balance display
5. Create staff view of customer points (Owner sees spending, Customer sees points only)
6. Build points adjustment (manual by manager)

PRIVACY RULES:
- Customer sees: Points balance only
- Owner/Manager sees: Total spending, visit history

FILES TO CREATE:
- /apps/web/app/(guest)/[restaurant]/rewards/page.tsx
- /apps/web/app/(guest)/[restaurant]/components/PointsCard.tsx
- /apps/web/app/(dashboard)/customers/[id]/page.tsx
- /apps/web/app/(dashboard)/customers/components/CustomerSpending.tsx
- /apps/web/lib/services/loyalty.service.ts

COMPLETION CRITERIA:
[ ] Points earned on payment
[ ] Points can be redeemed at checkout
[ ] Customer sees points only (no spending)
[ ] Owner/Manager sees full spending history
</step_30>

---

## Step 31 Prompt

<step_31>
STEP: 31
NAME: Membership Tiers & Benefits
GOAL: Implement tier system with automatic upgrades
DEPENDS_ON: Step 30 completed

TASKS:
1. Create tier definitions (Bronze, Silver, Gold, Platinum)
2. Implement automatic tier upgrade logic
3. Build tier benefits (points multiplier, discounts)
4. Add tier progress display

TIER STRUCTURE:
- BRONZE (Default): 1x points
- SILVER (500+ points): 1.25x points, 5% birthday discount
- GOLD (1500+ points): 1.5x points, 10% birthday discount
- PLATINUM (5000+ points): 2x points, 15% birthday discount

FILES TO CREATE:
- /apps/web/app/(guest)/[restaurant]/membership/page.tsx
- /apps/web/app/(guest)/[restaurant]/components/TierCard.tsx
- /apps/web/app/(guest)/[restaurant]/components/TierProgress.tsx
- /apps/web/lib/services/tier.service.ts

COMPLETION CRITERIA:
[ ] Tiers display correctly
[ ] Automatic upgrade works
[ ] Benefits apply correctly
[ ] Tier progress shows
</step_31>

---

## Step 32 Prompt

<step_32>
STEP: 32
NAME: Promotions — Happy Hour & Discounts
GOAL: Implement time-based and percentage discounts
DEPENDS_ON: Step 31 completed

TASKS:
1. Create promotion management interface
2. Build happy hour (time-based) discounts
3. Implement percentage discounts
4. Add flat amount discounts
5. Create promotion scheduling
6. Build promotion targeting (items, categories)

FILES TO CREATE:
- /apps/web/app/(dashboard)/promotions/page.tsx
- /apps/web/app/(dashboard)/promotions/new/page.tsx
- /apps/web/app/(dashboard)/promotions/components/PromotionForm.tsx
- /apps/web/app/(dashboard)/promotions/components/TimeScheduler.tsx
- /apps/web/lib/services/promotion.service.ts

COMPLETION CRITERIA:
[ ] Promotion CRUD works
[ ] Happy hour applies automatically
[ ] Time-based scheduling works
[ ] Discount applies in bill
</step_32>

---

## Step 33 Prompt

<step_33>
STEP: 33
NAME: Promotions — Combo, BOGO, Codes
GOAL: Implement combo deals, BOGO, and promo codes
DEPENDS_ON: Step 32 completed

TASKS:
1. Create combo deal builder
2. Implement BOGO (Buy One Get One)
3. Build promo code system
4. Add code generation (bulk)
5. Create code validation
6. Implement usage limits

FILES TO CREATE:
- /apps/web/app/(dashboard)/promotions/combos/page.tsx
- /apps/web/app/(dashboard)/promotions/combos/components/ComboBuilder.tsx
- /apps/web/app/(dashboard)/promotions/codes/page.tsx
- /apps/web/app/(dashboard)/promotions/codes/components/CodeGenerator.tsx
- /apps/web/lib/services/promo-code.service.ts

COMPLETION CRITERIA:
[ ] Combo builder works
[ ] BOGO applies correctly
[ ] Promo codes can be created
[ ] Code validation works
[ ] Usage limits enforced
</step_33>

---

## Step 34 Prompt

<step_34>
STEP: 34
NAME: Reports & Analytics Dashboard
GOAL: Build comprehensive reporting system
DEPENDS_ON: Step 33 completed

TASKS:
1. Create reports dashboard
2. Build sales reports (daily, weekly, monthly)
3. Implement item-wise sales analysis
4. Add peak hours analysis
5. Create customer analytics
6. Build staff performance reports
7. Implement export functionality (Excel, PDF)

REPORT TYPES:
1. Sales Report (Summary, Detailed, By Category)
2. Order Report (Volume, Status, Source)
3. Item Performance (Best/Worst sellers)
4. Customer Report (New, Returning, Top spenders)
5. Staff Report (Sales by server, Performance)
6. Payment Report (By method, Trends)

FILES TO CREATE:
- /apps/web/app/(dashboard)/reports/page.tsx
- /apps/web/app/(dashboard)/reports/sales/page.tsx
- /apps/web/app/(dashboard)/reports/components/SalesChart.tsx
- /apps/web/app/(dashboard)/reports/components/TopItems.tsx
- /apps/web/app/(dashboard)/reports/components/ExportButton.tsx
- /apps/web/lib/services/reports.service.ts

COMPLETION CRITERIA:
[ ] Sales reports generate correctly
[ ] Charts display properly
[ ] Date range filter works
[ ] Export to Excel works
[ ] Export to PDF works
</step_34>

---

## Step 35 Prompt

<step_35>
STEP: 35
NAME: Staff Management & Attendance
GOAL: Implement staff management and attendance tracking
DEPENDS_ON: Step 34 completed

TASKS:
1. Create staff management interface
2. Build staff CRUD operations
3. Implement shift scheduling
4. Add clock in/out system
5. Create attendance reports
6. Build overtime calculation

FILES TO CREATE:
- /apps/web/app/(dashboard)/staff/page.tsx
- /apps/web/app/(dashboard)/staff/new/page.tsx
- /apps/web/app/(dashboard)/staff/schedule/page.tsx
- /apps/web/app/(dashboard)/staff/attendance/page.tsx
- /apps/web/app/(dashboard)/staff/components/ClockInOut.tsx
- /apps/web/lib/services/attendance.service.ts

COMPLETION CRITERIA:
[ ] Staff CRUD works
[ ] Clock in/out works with PIN
[ ] Shift scheduling works
[ ] Attendance report generates
</step_35>

---

## Step 36 Prompt

<step_36>
STEP: 36
NAME: Internal Communication
GOAL: Build staff chat and messaging system
DEPENDS_ON: Step 35 completed

TASKS:
1. Create staff chat interface
2. Build direct messaging (1:1)
3. Implement group chats (by department)
4. Add system chat groups (All Staff, Kitchen, Floor)
5. Create quick reply buttons
6. Build read receipts

FILES TO CREATE:
- /apps/web/app/(dashboard)/chat/page.tsx
- /apps/web/app/(dashboard)/chat/[chatId]/page.tsx
- /apps/web/app/(dashboard)/chat/components/ChatList.tsx
- /apps/web/app/(dashboard)/chat/components/ChatWindow.tsx
- /apps/web/app/(dashboard)/chat/components/MessageBubble.tsx
- /apps/web/lib/services/chat.service.ts

COMPLETION CRITERIA:
[ ] Direct messaging works
[ ] Group chats work
[ ] Quick replies work
[ ] Read receipts show
[ ] Real-time messages work
</step_36>

---

## Step 37 Prompt

<step_37>
STEP: 37
NAME: Shift Notes & Daily Briefing
GOAL: Implement shift handover and daily briefing system
DEPENDS_ON: Step 36 completed

TASKS:
1. Create shift notes interface
2. Build handover notes creation
3. Implement daily briefing system
4. Add today's specials management
5. Create 86'd items list
6. Build read acknowledgment

FILES TO CREATE:
- /apps/web/app/(dashboard)/shift-notes/page.tsx
- /apps/web/app/(dashboard)/shift-notes/new/page.tsx
- /apps/web/app/(dashboard)/briefing/page.tsx
- /apps/web/app/(dashboard)/briefing/new/page.tsx
- /apps/web/app/(dashboard)/briefing/components/SpecialsEditor.tsx
- /apps/web/app/(dashboard)/briefing/components/EightySixList.tsx
- /apps/web/lib/services/briefing.service.ts

COMPLETION CRITERIA:
[ ] Shift notes can be created
[ ] Notes display for next shift
[ ] Daily briefing creation works
[ ] 86'd list updates menu availability
[ ] Read tracking works
</step_37>

---

## Step 38 Prompt

<step_38>
STEP: 38
NAME: Lost & Found Management
GOAL: Implement lost and found tracking system
DEPENDS_ON: Step 37 completed

TASKS:
1. Create lost & found interface
2. Build item logging form
3. Implement item photo upload
4. Add status tracking (Unclaimed, Claimed, Disposed)
5. Create claim process with verification

FILES TO CREATE:
- /apps/web/app/(dashboard)/lost-found/page.tsx
- /apps/web/app/(dashboard)/lost-found/new/page.tsx
- /apps/web/app/(dashboard)/lost-found/[id]/page.tsx
- /apps/web/app/(dashboard)/lost-found/components/ItemCard.tsx
- /apps/web/app/(dashboard)/lost-found/components/ClaimModal.tsx
- /apps/web/lib/services/lost-found.service.ts

COMPLETION CRITERIA:
[ ] Items can be logged with photo
[ ] Status tracking works
[ ] Claim process with verification works
[ ] Search and filter works
</step_38>

---

# PHASE 5: MULTI-TENANT & LICENSE (Steps 39-44)

---

## Step 39 Prompt

<step_39>
STEP: 39
NAME: Super Admin Dashboard
GOAL: Create super admin interface for managing all restaurants
DEPENDS_ON: Step 38 completed

TASKS:
1. Create super admin layout
2. Build restaurant list management
3. Implement license management
4. Add global analytics
5. Create user management (across restaurants)
6. Build audit logs

FILES TO CREATE:
- /apps/web/app/(superadmin)/layout.tsx
- /apps/web/app/(superadmin)/dashboard/page.tsx
- /apps/web/app/(superadmin)/restaurants/page.tsx
- /apps/web/app/(superadmin)/licenses/page.tsx
- /apps/web/app/(superadmin)/audit-logs/page.tsx
- /apps/web/lib/services/superadmin.service.ts

COMPLETION CRITERIA:
[ ] Super admin dashboard loads
[ ] Restaurant list management works
[ ] License management works
[ ] Global analytics display
[ ] Audit logs display
</step_39>

---

## Step 40 Prompt

<step_40>
STEP: 40
NAME: Multi-tenant Architecture
GOAL: Ensure complete data isolation between restaurants
DEPENDS_ON: Step 39 completed

TASKS:
1. Implement tenant context middleware
2. Create database row-level security
3. Build tenant-aware queries
4. Add cross-tenant protection
5. Implement tenant switching (for super admin)

MULTI-TENANT RULES:
1. EVERY database query MUST include restaurant_id filter
2. User sessions are bound to specific restaurant
3. API responses NEVER contain cross-tenant data
4. File uploads are namespaced by restaurant_id

FILES TO CREATE:
- /apps/web/middleware/tenant.ts
- /apps/web/lib/context/TenantContext.tsx
- /apps/web/lib/hooks/useTenant.ts
- /apps/web/lib/db/tenant-queries.ts

COMPLETION CRITERIA:
[ ] All queries filtered by restaurant_id
[ ] Cross-tenant access blocked
[ ] Tenant context available throughout app
[ ] Super admin can switch tenants
</step_40>

---

## Step 41 Prompt

<step_41>
STEP: 41
NAME: License Server API
GOAL: Create license validation server for self-hosted installations
DEPENDS_ON: Step 40 completed

TASKS:
1. Setup license server project (apps/license-server)
2. Create license key generation
3. Build license validation API
4. Implement hardware fingerprinting
5. Add license activation/deactivation
6. Create feature flags based on tier

LICENSE KEY FORMAT:
QRDINE-TIER-XXXXXXXX-XXXX-XXXX
Example: QRDINE-PRO-A1B2C3D4-E5F6-G7H8

FILES TO CREATE:
- /apps/license-server/package.json
- /apps/license-server/src/index.ts
- /apps/license-server/src/routes/license.routes.ts
- /apps/license-server/src/services/license.service.ts
- /apps/license-server/src/services/keygen.service.ts

COMPLETION CRITERIA:
[ ] License server runs independently
[ ] License keys generate correctly
[ ] Validation API works
[ ] Hardware fingerprinting works
[ ] Feature flags return correctly
</step_41>

---

## Step 42 Prompt

<step_42>
STEP: 42
NAME: License Validation & Feature Flags
GOAL: Implement client-side license checking and feature gating
DEPENDS_ON: Step 41 completed

TASKS:
1. Create license validation client
2. Build periodic license check (every 24 hours)
3. Implement feature flag system
4. Add license status display
5. Create grace period handling (72 hours offline)
6. Build license expiry warnings

FILES TO CREATE:
- /apps/web/lib/license/license-client.ts
- /apps/web/lib/license/feature-flags.ts
- /apps/web/lib/hooks/useFeature.ts
- /apps/web/components/FeatureGate.tsx
- /apps/web/components/UpgradePrompt.tsx
- /apps/web/app/(dashboard)/settings/license/page.tsx

COMPLETION CRITERIA:
[ ] License validates on startup
[ ] Periodic check (24h) works
[ ] Feature flags gate features correctly
[ ] Upgrade prompts display
[ ] Grace period works
</step_42>

---

## Step 43 Prompt

<step_43>
STEP: 43
NAME: Subscription & Tier Management
GOAL: Implement subscription management and tier upgrades
DEPENDS_ON: Step 42 completed

TASKS:
1. Create subscription management interface
2. Build tier comparison display
3. Implement upgrade flow
4. Add downgrade handling
5. Build invoice generation
6. Implement subscription renewal

FILES TO CREATE:
- /apps/web/app/(dashboard)/settings/subscription/page.tsx
- /apps/web/app/(dashboard)/settings/subscription/upgrade/page.tsx
- /apps/web/app/(dashboard)/settings/subscription/invoices/page.tsx
- /apps/web/app/(dashboard)/settings/subscription/components/PlanComparison.tsx
- /apps/web/lib/services/subscription.service.ts

COMPLETION CRITERIA:
[ ] Current plan displays correctly
[ ] Usage stats show
[ ] Tier comparison works
[ ] Upgrade flow works
[ ] Invoices list shows
</step_43>

---

## Step 44 Prompt

<step_44>
STEP: 44
NAME: Cloud Backup System
GOAL: Implement automatic cloud backup and restore
DEPENDS_ON: Step 43 completed

TASKS:
1. Create backup service
2. Implement scheduled backups
3. Build manual backup trigger
4. Add backup to cloud storage (S3)
5. Create restore functionality
6. Build backup encryption

FILES TO CREATE:
- /apps/web/app/(dashboard)/settings/backup/page.tsx
- /apps/web/app/(dashboard)/settings/backup/components/BackupList.tsx
- /apps/web/app/(dashboard)/settings/backup/components/RestoreModal.tsx
- /apps/web/lib/services/backup.service.ts
- /apps/web/lib/jobs/backup.job.ts

COMPLETION CRITERIA:
[ ] Scheduled backups run
[ ] Manual backup works
[ ] Cloud upload works
[ ] Restore functionality works
[ ] Encryption works
</step_44>

---

# PHASE 6: DESKTOP APP & DEPLOY (Steps 45-50)

---

## Step 45 Prompt

<step_45>
STEP: 45
NAME: Electron App Setup
GOAL: Create Electron wrapper for desktop application
DEPENDS_ON: Step 44 completed

TASKS:
1. Setup Electron project (apps/desktop)
2. Configure Electron Forge
3. Create main process
4. Build preload scripts
5. Implement window management
6. Add IPC communication
7. Create auto-launch on startup

FILES TO CREATE:
- /apps/desktop/package.json
- /apps/desktop/forge.config.js
- /apps/desktop/src/main/index.ts
- /apps/desktop/src/main/window.ts
- /apps/desktop/src/main/menu.ts
- /apps/desktop/src/preload/index.ts

COMPLETION CRITERIA:
[ ] Electron app launches
[ ] Next.js app loads inside Electron
[ ] Window management works
[ ] Native menus work
[ ] IPC communication works
</step_45>

---

## Step 46 Prompt

<step_46>
STEP: 46
NAME: Windows Installer (Setup Wizard)
GOAL: Create professional Windows installer like ZKTeco BioTime
DEPENDS_ON: Step 45 completed

TASKS:
1. Configure Electron Forge for MSI/EXE
2. Create custom installer UI with wizard steps
3. Add installation steps wizard
4. Implement database setup during install
5. Create desktop/start menu shortcuts
6. Add firewall exception prompt
7. Build uninstaller

INSTALLER WIZARD STEPS:
1. Welcome
2. License Agreement
3. Installation Path
4. Database Configuration
5. License Activation
6. Installing (progress bar)
7. Complete

FILES TO CREATE:
- /apps/desktop/installer/installer.nsi (NSIS script)
- /apps/desktop/scripts/install-postgres.ps1
- /apps/desktop/scripts/setup-database.ps1
- /apps/desktop/scripts/create-shortcuts.ps1

COMPLETION CRITERIA:
[ ] Installer wizard works
[ ] PostgreSQL installation option
[ ] License activation during install
[ ] Shortcuts created
[ ] Uninstaller works
</step_46>

---

## Step 47 Prompt

<step_47>
STEP: 47
NAME: System Tray Manager
GOAL: Create system tray application for background running
DEPENDS_ON: Step 46 completed

TASKS:
1. Create system tray icon
2. Build tray context menu
3. Implement minimize to tray
4. Add notification from tray
5. Create quick actions in tray
6. Build tray tooltip with status

FILES TO CREATE:
- /apps/desktop/src/main/tray.ts
- /apps/desktop/src/main/tray-menu.ts
- /apps/desktop/src/main/notifications.ts
- /apps/desktop/resources/tray-icon.png

COMPLETION CRITERIA:
[ ] Tray icon displays
[ ] Context menu works
[ ] Minimize to tray works
[ ] Notifications show from tray
[ ] Quick actions work
</step_47>

---

## Step 48 Prompt

<step_48>
STEP: 48
NAME: Local Backup & Restore
GOAL: Implement local backup for self-hosted installations
DEPENDS_ON: Step 47 completed

TASKS:
1. Create local backup service
2. Build backup to local drive
3. Implement backup scheduler
4. Add restore from local backup
5. Create backup verification
6. Add USB backup option

FILES TO CREATE:
- /apps/desktop/src/main/backup/local-backup.ts
- /apps/desktop/src/main/backup/backup-scheduler.ts
- /apps/desktop/src/main/backup/backup-restore.ts
- /apps/desktop/src/main/backup/usb-backup.ts
- /apps/web/app/(dashboard)/settings/local-backup/page.tsx

COMPLETION CRITERIA:
[ ] Local backup works
[ ] Scheduled backups run
[ ] Restore from backup works
[ ] Backup verification works
[ ] USB backup works
</step_48>

---

## Step 49 Prompt

<step_49>
STEP: 49
NAME: In-App Update System
GOAL: Implement automatic updates for desktop application
DEPENDS_ON: Step 48 completed

TASKS:
1. Setup update server
2. Implement update checker
3. Build download progress UI
4. Create update installer
5. Add rollback capability
6. Build update notifications

FILES TO CREATE:
- /apps/desktop/src/main/updater/update-checker.ts
- /apps/desktop/src/main/updater/update-downloader.ts
- /apps/desktop/src/main/updater/update-installer.ts
- /apps/desktop/src/main/updater/rollback.ts
- /apps/desktop/src/renderer/UpdateModal.tsx

COMPLETION CRITERIA:
[ ] Update check works
[ ] Download progress shows
[ ] Update installs correctly
[ ] App restarts after update
[ ] Rollback capability works
</step_49>

---

## Step 50 Prompt

<step_50>
STEP: 50
NAME: PWA, Documentation & CodeCanyon Prep
GOAL: Final polish - PWA support, documentation, and marketplace preparation
DEPENDS_ON: Step 49 completed

TASKS:
1. Implement PWA support
2. Create user documentation
3. Build admin documentation
4. Write API documentation
5. Create installation guide
6. Build demo data setup
7. Prepare CodeCanyon package
8. Create marketing materials

FILES TO CREATE:
- /apps/web/public/manifest.json
- /apps/web/public/sw.js
- /docs/user-guide/*.md
- /docs/admin-guide/*.md
- /docs/api/*.md
- /scripts/generate-demo-data.ts
- /scripts/prepare-codecanyon.sh
- /CHANGELOG.md
- /LICENSE.txt

COMPLETION CRITERIA:
[ ] PWA works (installable on mobile)
[ ] User documentation complete
[ ] Admin documentation complete
[ ] API documentation complete
[ ] Installation guide complete
[ ] Demo data generator works
[ ] CodeCanyon package ready
</step_50>

---

# QUICK REFERENCE — ALL STEPS

## PHASE 3: STAFF OPERATIONS (Steps 19-28)
- Step 19: Waiter Dashboard & Table Overview
- Step 20: Waiter Quick Order & Guest Count Entry
- Step 21: Order Confirmation Flow
- Step 22: Kitchen Dashboard & KOT Display
- Step 23: Kitchen Order Status Management
- Step 24: Cashier Dashboard & Billing
- Step 25: Payment Processing
- Step 26: Bill Generation & Printing
- Step 27: End of Day Settlement
- Step 28: Manager Dashboard & Overview

## PHASE 4: ADVANCED FEATURES (Steps 29-38)
- Step 29: Customer Registration & MPIN
- Step 30: Customer Loyalty & Points
- Step 31: Membership Tiers & Benefits
- Step 32: Promotions — Happy Hour & Discounts
- Step 33: Promotions — Combo, BOGO, Codes
- Step 34: Reports & Analytics Dashboard
- Step 35: Staff Management & Attendance
- Step 36: Internal Communication
- Step 37: Shift Notes & Daily Briefing
- Step 38: Lost & Found Management

## PHASE 5: MULTI-TENANT & LICENSE (Steps 39-44)
- Step 39: Super Admin Dashboard
- Step 40: Multi-tenant Architecture
- Step 41: License Server API
- Step 42: License Validation & Feature Flags
- Step 43: Subscription & Tier Management
- Step 44: Cloud Backup System

## PHASE 6: DESKTOP APP & DEPLOY (Steps 45-50)
- Step 45: Electron App Setup
- Step 46: Windows Installer (Setup Wizard)
- Step 47: System Tray Manager
- Step 48: Local Backup & Restore
- Step 49: In-App Update System
- Step 50: PWA, Documentation & CodeCanyon Prep

---

# END OF STEP 19-50 PROMPT LIBRARY
