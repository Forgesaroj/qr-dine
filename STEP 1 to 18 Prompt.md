Complete 50-Step Prompt Library
How to Use
When starting each step, use this prompt format:
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

PHASE 1: FOUNDATION
Step 1 Prompt
<step_1>
STEP: 1
NAME: Project Setup & Monorepo Structure
GOAL: Create the complete project structure with all configurations

TASKS:
1. Initialize monorepo with Turborepo
2. Setup Next.js 14 with App Router in apps/web
3. Setup packages (database, ui, types, utils, config)
4. Configure TypeScript (strict mode)
5. Configure Tailwind CSS
6. Configure ESLint & Prettier
7. Setup path aliases
8. Create environment files
9. Create README.md

EXPECTED OUTPUT:
- Working monorepo structure
- All packages linked correctly
- TypeScript compiling
- Tailwind working
- Dev server running on localhost:3000

COMMANDS TO PROVIDE:
- All npm/pnpm commands to initialize
- All configuration file contents

FILES TO CREATE:
- /package.json (root)
- /turbo.json
- /tsconfig.json (root)
- /.eslintrc.js
- /.prettierrc
- /.env.example
- /apps/web/package.json
- /apps/web/tsconfig.json
- /apps/web/tailwind.config.ts
- /apps/web/next.config.js
- /apps/web/app/layout.tsx
- /apps/web/app/page.tsx
- /packages/database/package.json
- /packages/ui/package.json
- /packages/types/package.json
- /packages/utils/package.json
- /packages/config/package.json

COMPLETION CRITERIA:
[ ] pnpm install runs without errors
[ ] pnpm dev starts Next.js on localhost:3000
[ ] TypeScript compiles without errors
[ ] Tailwind classes work in components
[ ] All packages are accessible via aliases
</step_1>

Step 2 Prompt
<step_2>
STEP: 2
NAME: Database Schema — Core Tables
GOAL: Create core database tables for multi-tenant system
DEPENDS_ON: Step 1 completed

TASKS:
1. Setup Prisma in packages/database
2. Configure PostgreSQL connection
3. Create core tables:
   - License (for license management)
   - Restaurant (multi-tenant core)
   - User (staff accounts)
   - Table (restaurant tables)
   - Role & Permission enums
4. Create initial migration
5. Generate Prisma client
6. Create basic seed script

SCHEMA REQUIREMENTS:
- All tables must have: id, created_at, updated_at
- Use cuid() for IDs
- Include restaurant_id for multi-tenancy
- Define all necessary enums
- Add proper indexes
- Add unique constraints where needed

TABLES TO CREATE:
1. License
   - id, license_key, tier, status, max_restaurants
   - features (JSON), activated_at, expires_at

2. Restaurant
   - id, license_id, name, slug, logo_url
   - address, phone, email, currency, timezone
   - settings (JSON), status

3. User
   - id, restaurant_id, email, password_hash, name
   - phone, avatar_url, role, permissions (JSON)
   - pin, status, last_login_at

4. Table
   - id, restaurant_id, table_number, name, capacity
   - floor, section, qr_code, current_otp
   - otp_generated_at, status, position_x, position_y

ENUMS TO CREATE:
- LicenseTier: STARTER, PROFESSIONAL, ENTERPRISE, UNLIMITED
- LicenseStatus: ACTIVE, EXPIRED, SUSPENDED, CANCELLED
- RestaurantStatus: ACTIVE, INACTIVE, SUSPENDED
- UserRole: SUPER_ADMIN, OWNER, MANAGER, CASHIER, WAITER, KITCHEN, HOST
- UserStatus: ACTIVE, INACTIVE, SUSPENDED
- TableStatus: AVAILABLE, OCCUPIED, RESERVED, CLEANING, BLOCKED

FILES TO CREATE:
- /packages/database/package.json
- /packages/database/tsconfig.json
- /packages/database/prisma/schema.prisma
- /packages/database/prisma/seed.ts
- /packages/database/index.ts
- /packages/database/client.ts

COMMANDS TO PROVIDE:
- Prisma init
- Migration commands
- Seed command
- Generate client command

COMPLETION CRITERIA:
[ ] Prisma schema valid
[ ] Migration runs successfully
[ ] Database tables created in PostgreSQL
[ ] Seed data inserted
[ ] Prisma client generated and importable
</step_2>

Step 3 Prompt
<step_3>
STEP: 3
NAME: Database Schema — Menu & Orders
GOAL: Create menu, order, session, and billing tables
DEPENDS_ON: Step 2 completed

TASKS:
1. Add menu tables (Category, MenuItem)
2. Add session table (TableSession)
3. Add order tables (Order, OrderItem)
4. Add billing tables (Bill, Payment)
5. Create migration
6. Update seed script with sample menu

TABLES TO CREATE:
1. Category
   - id, restaurant_id, name, name_local, description
   - image_url, sort_order, is_active

2. MenuItem
   - id, restaurant_id, category_id, name, name_local
   - description, image_url, thumbnail_url
   - pricing_type, base_price, variant_groups (JSON), addons (JSON)
   - is_vegetarian, is_vegan, spice_level, allergens
   - is_available, available_from, available_until, available_days
   - prep_time_minutes, kitchen_station
   - sort_order, is_popular, is_new, times_ordered

3. TableSession
   - id, restaurant_id, table_id, guest_count
   - customer_id, otp_code, otp_verified, otp_verified_at
   - status, started_by, started_by_type, waiter_id
   - started_at, ended_at, notes

4. Order
   - id, restaurant_id, order_number, session_id
   - table_id, customer_id, order_type, order_source
   - status, requires_confirmation
   - confirmed_at, confirmed_by, rejected_at, rejected_by, rejection_reason
   - subtotal, discount_amount, tax_amount, service_charge, total_amount
   - promo_code, promotion_id, points_earned, points_redeemed
   - special_instructions
   - placed_at, preparing_at, ready_at, served_at, completed_at, cancelled_at
   - placed_by, served_by

5. OrderItem
   - id, order_id, menu_item_id, quantity
   - unit_price, total_price
   - selected_variants (JSON), selected_addons (JSON)
   - status, kitchen_station
   - sent_to_kitchen_at, preparing_at, ready_at, served_at
   - special_requests

6. Bill
   - id, restaurant_id, bill_number, order_id, session_id, customer_id
   - subtotal, discount_amount, tax_amount, service_charge, total_amount
   - payment_status, payment_method
   - points_earned, points_redeemed, points_discount
   - status, generated_by, settled_by
   - generated_at, settled_at

7. Payment
   - id, bill_id, amount, method
   - transaction_id, reference
   - cash_received, change_given
   - status, processed_by, processed_at

ENUMS TO ADD:
- PricingType: SINGLE, VARIANTS
- SessionStatus: ACTIVE, COMPLETED, CANCELLED
- OrderType: DINE_IN, TAKEAWAY, DELIVERY, PHONE
- OrderSource: QR, STAFF, PHONE, ONLINE
- OrderStatus: PENDING, PENDING_CONFIRMATION, CONFIRMED, PREPARING, READY, SERVED, COMPLETED, CANCELLED
- OrderItemStatus: PENDING, SENT_TO_KITCHEN, PREPARING, READY, SERVED, CANCELLED
- BillStatus: OPEN, PARTIALLY_PAID, PAID, REFUNDED, CANCELLED
- PaymentStatus: PENDING, COMPLETED, FAILED, REFUNDED
- PaymentMethod: CASH, CARD, QR_PAYMENT, ESEWA, KHALTI, FONEPAY, POINTS

COMPLETION CRITERIA:
[ ] All tables created
[ ] Relations defined correctly
[ ] Migration runs successfully
[ ] Sample menu data seeded
</step_3>

Step 4 Prompt
<step_4>
STEP: 4
NAME: Database Schema — Customer & Loyalty
GOAL: Create customer, loyalty, and promotions tables
DEPENDS_ON: Step 3 completed

TASKS:
1. Add customer tables
2. Add loyalty tables (points, tiers)
3. Add promotion tables
4. Create migration
5. Update seed script

TABLES TO CREATE:
1. Customer
   - id, restaurant_id, customer_id (display ID)
   - name, phone, email, date_of_birth
   - phone_verified, mpin_hash, mpin_attempts, mpin_locked_until
   - verification_method, verified_at, verified_by
   - tier, points_balance, points_earned_lifetime, points_redeemed_lifetime
   - total_spent, total_visits, average_order_value
   - favorite_items, dietary_preferences, allergies
   - sms_opt_in, email_opt_in, status

2. CustomerDevice
   - id, customer_id, device_fingerprint, device_info (JSON)
   - trusted_until, is_active, first_seen_at, last_seen_at

3. CustomerNote
   - id, customer_id, note, added_by, created_at

4. PointsTransaction
   - id, customer_id, type, points, balance_after
   - order_id, order_amount, multiplier (for earn)
   - bill_id, discount_amount (for redeem)
   - bonus_type, reason, adjusted_by (for bonus/adjust)
   - expires_at, expired

5. Promotion
   - id, restaurant_id, name, description, internal_note
   - type, discount_type, discount_value, max_discount
   - applies_to, category_ids, item_ids
   - combo_items (JSON), combo_price
   - bogo_buy_quantity, bogo_get_quantity, bogo_get_discount, bogo_same_item, bogo_get_items
   - promo_code, min_order_tiers (JSON), min_order_amount
   - start_date, end_date, days_of_week, start_time, end_time
   - total_uses_limit, total_uses_count, per_customer_limit
   - customer_eligibility, eligible_tiers
   - show_on_menu, show_countdown, banner_message, banner_image_url
   - status, times_used, total_discount_given
   - created_by

6. PromotionUsage
   - id, promotion_id, order_id, customer_id
   - discount_amount, original_amount, final_amount, used_at

ENUMS TO ADD:
- CustomerTier: BRONZE, SILVER, GOLD, PLATINUM
- CustomerStatus: ACTIVE, INACTIVE, BLOCKED
- PointsTransactionType: EARN, REDEEM, BONUS, EXPIRE, ADJUST
- PromotionType: HAPPY_HOUR, COMBO, BOGO, FIRST_ORDER, PROMO_CODE, MIN_ORDER, FESTIVAL, ITEM_DISCOUNT, LOYALTY_BONUS
- DiscountType: PERCENTAGE, FIXED, FREE_ITEM
- PromotionStatus: DRAFT, ACTIVE, PAUSED, SCHEDULED, EXPIRED

COMPLETION CRITERIA:
[ ] All customer tables created
[ ] All promotion tables created
[ ] Relations correct
[ ] Migration successful
</step_4>

Step 5 Prompt
<step_5>
STEP: 5
NAME: Database Schema — Staff & Communication
GOAL: Create staff management, communication, and activity log tables
DEPENDS_ON: Step 4 completed

TASKS:
1. Add staff management tables (shifts, attendance)
2. Add communication tables (chat, announcements)
3. Add activity log table
4. Add lost & found table
5. Create migration
6. Finalize complete seed script

TABLES TO CREATE:
1. StaffShift
   - id, restaurant_id, user_id, shift_date, shift_type
   - scheduled_start, scheduled_end, actual_start, actual_end
   - clock_in_method, clock_out_method, status
   - break_minutes, overtime_minutes, notes

2. StaffAttendance
   - id, restaurant_id, user_id, date
   - clock_in, clock_out, clock_in_method, clock_out_method
   - total_hours, break_minutes, status
   - notes, approved_by

3. ChatMessage
   - id, restaurant_id, chat_type, chat_id
   - sender_id, message_text, attachments (JSON)
   - read_by, sent_at

4. ChatGroup
   - id, restaurant_id, name, type, members, created_by

5. Announcement
   - id, restaurant_id, title, message, priority
   - recipients, require_read_confirmation, read_by
   - pinned, scheduled_at, published_at, created_by

6. ShiftNote
   - id, restaurant_id, shift_date, shift_type
   - notes, tags, written_by, read_by

7. DailyBriefing
   - id, restaurant_id, date
   - expected_covers, reservations_count, special_events
   - specials (JSON), eighty_sixed
   - staff_notes, goals, manager_message
   - read_by, published_by, published_at

8. LostFoundItem
   - id, restaurant_id, category, description
   - found_at, found_by, found_at_time, storage_location
   - photo_url, notes, status
   - claimed_by_name, claimed_by_phone, claimed_at
   - handed_over_by, verification_notes
   - disposed_at, disposed_reason

9. ActivityLog
   - id, restaurant_id, user_id, user_name
   - action, entity_type, entity_id, details (JSON)
   - ip_address, user_agent, created_at

ENUMS TO ADD:
- ShiftStatus: SCHEDULED, IN_PROGRESS, COMPLETED, MISSED, CANCELLED
- AttendanceStatus: PRESENT, ABSENT, LATE, HALF_DAY, LEAVE

COMPLETION CRITERIA:
[ ] All tables created
[ ] Complete database schema finished
[ ] Full seed script with sample data for all tables
[ ] Database ready for application development
</step_5>

Step 6 Prompt
<step_6>
STEP: 6
NAME: Authentication System
GOAL: Implement complete authentication with roles and permissions
DEPENDS_ON: Step 5 completed

TASKS:
1. Setup authentication library (JWT-based)
2. Create login page (email/password)
3. Create PIN login (quick staff access)
4. Implement role-based permissions
5. Create auth middleware
6. Create session management
7. Create password reset flow
8. Create registration (owner only)

FILES TO CREATE:
/apps/web/
├── app/
│   ├── (auth)/
│   │   ├── layout.tsx
│   │   ├── login/page.tsx
│   │   ├── pin-login/page.tsx
│   │   ├── forgot-password/page.tsx
│   │   └── reset-password/page.tsx
│   └── api/
│       └── auth/
│           ├── login/route.ts
│           ├── logout/route.ts
│           ├── pin-login/route.ts
│           ├── refresh/route.ts
│           ├── forgot-password/route.ts
│           └── reset-password/route.ts
├── lib/
│   └── auth/
│       ├── session.ts
│       ├── password.ts
│       ├── jwt.ts
│       ├── permissions.ts
│       └── middleware.ts
└── middleware.ts

PERMISSION MATRIX TO IMPLEMENT:
- Define all permissions per role
- SUPER_ADMIN: All permissions
- OWNER: All restaurant permissions
- MANAGER: Most permissions except owner-level
- CASHIER: Billing, orders, customers
- WAITER: Tables, orders, customers (limited)
- KITCHEN: Kitchen orders only
- HOST: Tables, reservations

FEATURES:
- JWT access & refresh tokens
- Secure password hashing (bcrypt)
- Role-based route protection
- Permission checking utility
- Session persistence
- Auto logout on inactivity

COMPLETION CRITERIA:
[ ] Login with email/password works
[ ] PIN login works for staff
[ ] JWT tokens generated correctly
[ ] Protected routes redirect to login
[ ] Role-based access working
[ ] Password reset flow complete
</step_6>

Step 7 Prompt
<step_7>
STEP: 7
NAME: UI Component Library
GOAL: Create reusable UI components with Tailwind CSS
DEPENDS_ON: Step 6 completed

TASKS:
1. Setup component library structure in packages/ui
2. Create base components
3. Create form components
4. Create layout components
5. Create feedback components
6. Export all components

COMPONENTS TO CREATE:

Base Components:
- Button (variants: primary, secondary, danger, ghost; sizes: sm, md, lg)
- Badge (variants: success, warning, error, info)
- Avatar (sizes, fallback initials)
- Card (with header, body, footer)
- Divider

Form Components:
- Input (text, email, password, number)
- Textarea
- Select (single, searchable)
- Checkbox
- Radio
- Switch/Toggle
- DatePicker
- TimePicker
- FileUpload
- OTPInput (for 3-4 digit codes)
- PINInput (for 4 digit PIN)

Layout Components:
- Container
- Stack (vertical/horizontal)
- Grid
- Sidebar
- Header
- DashboardLayout
- AuthLayout
- GuestLayout

Feedback Components:
- Modal (sizes: sm, md, lg, xl, full)
- Drawer (left, right)
- Toast/Notification
- Alert
- Spinner/Loading
- Skeleton
- EmptyState
- ErrorBoundary

Data Components:
- DataTable (sortable, filterable, pagination)
- List
- Tabs
- Accordion
- Dropdown/Menu
- Tooltip
- Popover

HOOKS TO CREATE:
- useToast
- useModal
- useDisclosure
- useMediaQuery
- useDebounce

COMPLETION CRITERIA:
[ ] All components created and typed
[ ] Components exported from packages/ui
[ ] Components importable in apps/web
[ ] Basic Storybook or demo page showing components
[ ] Dark mode support (optional but recommended)
</step_7>

Step 8 Prompt
<step_8>
STEP: 8
NAME: API Architecture & Base Utilities
GOAL: Create API structure with validation and error handling
DEPENDS_ON: Step 7 completed

TASKS:
1. Create API response utilities
2. Create API middleware
3. Setup Zod validation schemas
4. Create error handling
5. Create base CRUD utilities
6. Create API documentation structure

FILES TO CREATE:
/apps/web/lib/
├── api/
│   ├── response.ts        # Success/error response helpers
│   ├── errors.ts          # Custom error classes
│   ├── middleware.ts      # Auth, validation middleware
│   └── utils.ts           # Common utilities
├── validators/
│   ├── auth.ts
│   ├── restaurant.ts
│   ├── table.ts
│   ├── menu.ts
│   ├── order.ts
│   ├── customer.ts
│   └── common.ts
└── services/
    ├── restaurant.service.ts
    ├── table.service.ts
    ├── menu.service.ts
    ├── order.service.ts
    └── customer.service.ts

API RESPONSE FORMAT:
{
  success: boolean,
  message?: string,
  data?: T,
  error?: {
    code: string,
    details?: any
  },
  meta?: {
    page?: number,
    limit?: number,
    total?: number
  }
}

ERROR HANDLING:
- ValidationError (400)
- UnauthorizedError (401)
- ForbiddenError (403)
- NotFoundError (404)
- ConflictError (409)
- InternalError (500)

MIDDLEWARE TO CREATE:
- withAuth (check authentication)
- withPermission (check specific permission)
- withRestaurant (load restaurant context)
- withValidation (validate request body)
- withRateLimit (basic rate limiting)

COMPLETION CRITERIA:
[ ] Response utilities working
[ ] Error handling consistent
[ ] Validation schemas created
[ ] Middleware functions working
[ ] Service layer structure ready
[ ] Sample API endpoint working with all utilities
</step_8>

PHASE 2: CORE RESTAURANT
Step 9 Prompt
<step_9>
STEP: 9
NAME: Restaurant Setup & Configuration
GOAL: Restaurant profile, settings, and configuration pages
DEPENDS_ON: Step 8 completed

TASKS:
1. Create restaurant settings pages
2. Create restaurant profile form
3. Create business hours configuration
4. Create tax settings
5. Create API endpoints for settings

PAGES TO CREATE:
/apps/web/app/(dashboard)/settings/
├── page.tsx                 # Settings overview/menu
├── profile/page.tsx         # Restaurant name, logo, contact
├── business-hours/page.tsx  # Operating hours per day
├── taxes/page.tsx           # VAT, service charge config
├── notifications/page.tsx   # Notification preferences
└── layout.tsx               # Settings layout with sidebar

API ENDPOINTS:
- GET /api/restaurants/[id]
- PATCH /api/restaurants/[id]
- GET /api/restaurants/[id]/settings
- PATCH /api/restaurants/[id]/settings
- POST /api/restaurants/[id]/logo (upload)

FEATURES:
- Restaurant name, description
- Logo upload with preview
- Address, phone, email
- Business hours (per day, open/close time)
- Tax configuration (VAT %, service charge %)
- Currency selection
- Timezone selection

COMPLETION CRITERIA:
[ ] Settings pages render correctly
[ ] Restaurant profile can be updated
[ ] Logo upload works
[ ] Business hours can be configured
[ ] Tax settings save correctly
[ ] All settings persist to database
</step_9>

Step 10 Prompt
<step_10>
STEP: 10
NAME: Table Management & Floor Plan
GOAL: Complete table management with visual floor plan
DEPENDS_ON: Step 9 completed

TASKS:
1. Create table list/grid page
2. Create add/edit table form
3. Create floor plan visual view
4. Create QR code generation
5. Create table status management
6. Create API endpoints

PAGES TO CREATE:
/apps/web/app/(dashboard)/tables/
├── page.tsx              # Table list with grid/list toggle
├── new/page.tsx          # Add new table
├── [id]/page.tsx         # Table details & edit
├── floor-plan/page.tsx   # Visual floor plan
└── qr-codes/page.tsx     # Print all QR codes

API ENDPOINTS:
- GET /api/tables
- POST /api/tables
- GET /api/tables/[id]
- PATCH /api/tables/[id]
- DELETE /api/tables/[id]
- POST /api/tables/[id]/generate-qr
- POST /api/tables/[id]/refresh-otp
- PATCH /api/tables/[id]/status
- POST /api/tables/bulk (bulk create)

FEATURES:
- Table list with status badges
- Table grid view (card layout)
- Add single table
- Bulk add tables (Table 1-10)
- Edit table details
- Delete table (with confirmation)
- Visual floor plan (drag & drop positioning)
- QR code generation per table
- QR code download (PNG, PDF)
- Print all QR codes
- Table status quick toggle
- Filter by floor/section/status

TABLE CARD DISPLAY:
- Table number & name
- Capacity
- Current status (color coded)
- Time occupied (if occupied)
- Guest count (if occupied)
- Quick actions (view, change status)

COMPLETION CRITERIA:
[ ] Table list displays correctly
[ ] Can add new table
[ ] Can edit table
[ ] Can delete table
[ ] Floor plan shows tables visually
[ ] QR code generates correctly
[ ] QR code can be downloaded
[ ] Table status can be changed
[ ] Bulk table creation works
</step_10>

Step 11-18 Prompts (Continue Pattern)
<step_11>
STEP: 11
NAME: Menu Categories Management
GOAL: Category CRUD with images and sorting
DEPENDS_ON: Step 10 completed
... (similar detailed structure)
</step_11>

<step_12>
STEP: 12
NAME: Menu Items Management
GOAL: Complete menu item management with variant pricing
DEPENDS_ON: Step 11 completed
... (similar detailed structure)
</step_12>

<step_13>
STEP: 13
NAME: QR Code Generation & OTP System
GOAL: QR code system and OTP verification
DEPENDS_ON: Step 12 completed
... (similar detailed structure)
</step_13>

<step_14>
STEP: 14
NAME: Guest QR Scan & Verification Flow
GOAL: Guest-facing QR scan and OTP entry
DEPENDS_ON: Step 13 completed
... (similar detailed structure)
</step_14>

<step_15>
STEP: 15
NAME: Guest Menu Browse & Cart
GOAL: Guest menu viewing with cart functionality
DEPENDS_ON: Step 14 completed
... (similar detailed structure)
</step_15>

<step_16>
STEP: 16
NAME: Guest Order Placement (Hybrid Flow)
GOAL: Order placement with staff confirmation
DEPENDS_ON: Step 15 completed
... (similar detailed structure)
</step_16>

<step_17>
STEP: 17
NAME: Order Management & Status Tracking
GOAL: Order status management and tracking
DEPENDS_ON: Step 16 completed
... (similar detailed structure)
</step_17>

<step_18>
STEP: 18
NAME: Real-time Notifications
GOAL: WebSocket/Pusher for real-time updates
DEPENDS_ON: Step 17 completed
... (similar detailed structure)
</step_18>

Quick Reference — All Steps
PHASE 1: FOUNDATION (Steps 1-8)
├── Step 1:  Project Setup & Monorepo Structure
├── Step 2:  Database Schema — Core Tables
├── Step 3:  Database Schema — Menu & Orders
├── Step 4:  Database Schema — Customer & Loyalty
├── Step 5:  Database Schema — Staff & Communication
├── Step 6:  Authentication System
├── Step 7:  UI Component Library
└── Step 8:  API Architecture & Base Utilities

PHASE 2: CORE RESTAURANT (Steps 9-18)
├── Step 9:  Restaurant Setup & Configuration
├── Step 10: Table Management & Floor Plan
├── Step 11: Menu Categories Management
├── Step 12: Menu Items Management
├── Step 13: QR Code Generation & OTP System
├── Step 14: Guest QR Scan & Verification Flow
├── Step 15: Guest Menu Browse & Cart
├── Step 16: Guest Order Placement (Hybrid Flow)
├── Step 17: Order Management & Status Tracking
└── Step 18: Real-time Notifications

PHASE 3: STAFF OPERATIONS (Steps 19-28)
├── Step 19: Waiter Dashboard & Table Overview
├── Step 20: Waiter Quick Order & Guest Count Entry
├── Step 21: Order Confirmation Flow
├── Step 22: Kitchen Dashboard & KOT Display
├── Step 23: Kitchen Order Status Management
├── Step 24: Cashier Dashboard & Billing
├── Step 25: Payment Processing
├── Step 26: Bill Generation & Printing
├── Step 27: End of Day Settlement
└── Step 28: Manager Dashboard & Overview

PHASE 4: ADVANCED FEATURES (Steps 29-38)
├── Step 29: Customer Registration & MPIN
├── Step 30: Customer Loyalty & Points
├── Step 31: Membership Tiers & Benefits
├── Step 32: Promotions — Happy Hour & Discounts
├── Step 33: Promotions — Combo, BOGO, Codes
├── Step 34: Reports & Analytics Dashboard
├── Step 35: Staff Management & Attendance
├── Step 36: Internal Communication
├── Step 37: Shift Notes & Daily Briefing
└── Step 38: Lost & Found Management

PHASE 5: MULTI-TENANT & LICENSE (Steps 39-44)
├── Step 39: Super Admin Dashboard
├── Step 40: Multi-tenant Architecture
├── Step 41: License Server API
├── Step 42: License Validation & Feature Flags
├── Step 43: Subscription & Tier Management
└── Step 44: Cloud Backup System

PHASE 6: DESKTOP APP & DEPLOY (Steps 45-50)
├── Step 45: Electron App Setup
├── Step 46: Windows Installer (Setup Wizard)
├── Step 47: System Tray Manager
├── Step 48: Local Backup & Restore
├── Step 49: In-App Update System
└── Step 50: PWA, Documentation & CodeCanyon Prep

How to Use This Prompt System
Starting a Step
I'm working on QR DINE project.

Current Step: 1 - Project Setup & Monorepo Structure
Previous Step: None (Starting fresh)

Please provide complete implementation for Step 1.
Continuing to Next Step
I'm working on QR DINE project.

Current Step: 2 - Database Schema — Core Tables
Previous Step: Step 1 completed ✓

Please provide complete implementation for Step 2.
If You Get Stuck
I'm working on QR DINE project.

Current Step: 6 - Authentication System
Status: In Progress (stuck on JWT implementation)

Issue: [Describe your issue]

Please help me resolve this before continuing.
Reviewing Completed Work
I'm working on QR DINE project.

Completed Steps: 1, 2, 3, 4, 5
Current Step: 6 - Authentication System

Before starting Step 6, please verify my database schema is correct.
Here's my current schema.prisma: [paste schema]
