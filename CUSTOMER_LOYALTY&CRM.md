# QR DINE Loyalty & CRM System - Part 1

## System Overview, Recognition & Registration

**Version 1.0 | January 2025**

---

# PART 1: SYSTEM OVERVIEW

## 1.1 Goals & Objectives

### PRIMARY GOALS

1. **INCREASE REPEAT VISITS**
   - Reward customers for coming back
   - Build emotional connection with personalized greetings
   - Make customers feel valued and recognized

2. **GROW CUSTOMER LIFETIME VALUE**
   - Encourage higher spending through tier benefits
   - Create urgency with points expiry
   - Upsell through personalized recommendations

3. **REDUCE CUSTOMER CHURN**
   - Identify at-risk customers early
   - Automated win-back campaigns
   - Birthday/Anniversary reminders bring customers back

4. **ZERO-FRICTION EXPERIENCE**
   - Auto-recognition (no login needed for most actions)
   - Earn points automatically
   - Redeem with minimal verification

5. **FLEXIBLE FOR ALL RESTAURANT SIZES**
   - Small restaurants: Free options (Last 4 digits verification)
   - Large restaurants: Full features (WhatsApp OTP, SMS)
   - Everything configurable by owner

### KEY PRINCIPLES

- **SIMPLICITY**: Customer should never feel "this is complicated"
- **SECURITY**: Points = Money, protect against fraud
- **PRIVACY**: Only collect what's needed, be transparent
- **FLEXIBILITY**: Every restaurant is different, make it configurable
- **COST-EFFECTIVE**: Provide free options for small restaurants

---

## 1.2 System Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  CUSTOMER   │     │    STAFF    │     │   OWNER     │
│   PHONE     │     │   DEVICE    │     │  DASHBOARD  │
└──────┬──────┘     └──────┬──────┘     └──────┬──────┘
       │                   │                   │
       ▼                   ▼                   ▼
┌─────────────────────────────────────────────────────────────┐
│                    QR DINE APPLICATION                      │
│                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │ Recognition │  │   Points    │  │  Campaign   │        │
│  │   Engine    │  │   Engine    │  │   Engine    │        │
│  │             │  │             │  │             │        │
│  │• localStorage│ │ • Earn      │  │ • Birthday  │        │
│  │• Fingerprint│  │ • Redeem    │  │ • Win-back  │        │
│  │• Phone lookup│ │ • Expire    │  │ • Milestones│        │
│  └─────────────┘  └─────────────┘  └─────────────┘        │
│                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │    Tier     │  │  Analytics  │  │   Comms     │        │
│  │   Engine    │  │   Engine    │  │   Engine    │        │
│  │             │  │             │  │             │        │
│  │ • Calculate │  │ • RFM Score │  │ • WhatsApp  │        │
│  │ • Upgrade   │  │ • Segments  │  │ • SMS       │        │
│  │ • Benefits  │  │ • Reports   │  │ • Templates │        │
│  └─────────────┘  └─────────────┘  └─────────────┘        │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                        DATABASE                             │
│  Customer │ CustomerDevice │ PointsHistory │ LoyaltySettings│
│  Tier     │ Reward         │ Campaign      │ CustomerNote   │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                   EXTERNAL SERVICES                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │  WhatsApp   │  │    SMS      │  │   Email     │        │
│  │  Business   │  │  Gateway    │  │  Service    │        │
│  │    API      │  │ (Sparrow)   │  │ (Optional)  │        │
│  └─────────────┘  └─────────────┘  └─────────────┘        │
└─────────────────────────────────────────────────────────────┘
```

---

## 1.3 User Roles

### 👤 CUSTOMER

**CAN DO:**
- Register for loyalty program
- View own points & tier
- View order history
- Redeem points (with verification)
- Update profile
- Manage linked devices
- Opt-in/out of marketing

**CANNOT DO:**
- See total spending
- Modify points directly
- Access other customers' data

---

### 🧑‍🍳 WAITER

**CAN DO:**
- See customer name & tier at table
- See favorites & allergies (Gold+ customers only)
- Link customer to table session
- Add customer notes
- Receive VIP arrival notifications

**CANNOT DO:**
- See points balance
- See phone number (only hint)
- Process redemptions
- Modify customer data

---

### 💰 CASHIER

**CAN DO:**
- See customer name, tier, points
- Link customer to bill
- Process points redemption
- Quick-register new customer
- Apply birthday/promotional discounts

**CANNOT DO:**
- See full phone number (only hint)
- See spending history
- Modify customer data
- Link bill after payment (needs manager)

---

### 📋 MANAGER

**CAN DO:**
- Everything Waiter & Cashier can do
- Approve late bill linking (after payment)
- View customer visit history
- Add manager-only notes
- View loyalty reports
- Verify birthday dates
- Manual points adjustment (with reason)

**CANNOT DO:**
- See detailed spending (owner only)
- Change loyalty program settings
- Send marketing campaigns

---

### 👑 OWNER

**CAN DO:**
- EVERYTHING
- Configure all loyalty settings
- View complete customer data & spending
- View analytics & RFM segments
- Send marketing campaigns
- Set tier benefits & rewards
- Configure verification methods
- Export customer data

---

# PART 2: CUSTOMER RECOGNITION & AUTHENTICATION

## 2.1 Recognition Methods

QR DINE uses a **HYBRID recognition system** combining two methods:

### METHOD 1: localStorage Token (Primary)

**HOW IT WORKS:**
- When customer logs in, system generates a unique token
- Token saved in browser's localStorage
- On next visit, system reads token and identifies customer

**WHAT'S STORED IN BROWSER:**
```json
{
  "qrdine_token": "tok_a1b2c3d4e5f6g7h8",
  "qrdine_customer": {
    "name": "Ram",
    "phone_hint": "98XXX...567",
    "points": 245,
    "tier": "GOLD"
  }
}
```

**ACCURACY:** ~85-90%

**FAILS WHEN:**
- Customer clears browser data
- Customer uses different browser
- Customer uses incognito/private mode
- Safari 7-day localStorage limit (iOS)

---

### METHOD 2: Device Fingerprint (Backup)

**HOW IT WORKS:**
- System collects non-personal device characteristics
- Creates a hash (fingerprint) from these characteristics
- Fingerprint stored in database linked to customer
- On next visit, fingerprint regenerated and matched

**CHARACTERISTICS COLLECTED (Basic - Privacy Friendly):**
```json
{
  "screen": "1080x2400",
  "pixelRatio": 2.75,
  "timezone": "Asia/Kathmandu",
  "language": "en-US",
  "platform": "Android",
  "cores": 8,
  "memory": 4,
  "touch": true
}
```
→ Hash: "fp_x7y8z9a1b2c3"

**ACCURACY:** ~70-75%

**FAILS WHEN:**
- OS update changes characteristics
- Browser update
- Privacy browsers (Brave, Firefox Focus)
- Multiple customers with identical devices

---

### COMBINED HYBRID ACCURACY: ~90-95%

- **localStorage found** → HIGH confidence (instant recognition)
- **Fingerprint only** → MEDIUM confidence (show confirmation)
- **Neither found** → NOT recognized (show login option)

---

## 2.2 Hybrid Recognition Flow

```
                    Customer Scans QR Code
                            │
                            ▼
               ┌─────────────────────────┐
               │  Check localStorage     │
               │  for token              │
               └───────────┬─────────────┘
                           │
         ┌─────────────────┴─────────────────┐
         │                                   │
         ▼                                   ▼
   TOKEN FOUND                         TOKEN NOT FOUND
         │                                   │
         ▼                                   ▼
┌─────────────────┐                ┌─────────────────┐
│ Validate token  │                │ Generate device │
│ with server     │                │ fingerprint     │
└────────┬────────┘                └────────┬────────┘
         │                                  │
   ┌─────┴─────┐                           │
   │           │                           ▼
   ▼           ▼                 ┌─────────────────┐
VALID      INVALID               │ Search in DB    │
   │           │                 └────────┬────────┘
   │           │                          │
   │           │               ┌──────────┴──────────┐
   │           │               │                     │
   │           │               ▼                     ▼
   │           │            MATCH               NO MATCH
   │           │               │                     │
   ▼           ▼               ▼                     ▼
  HIGH      CLEAR           MEDIUM                  NOT
CONFIDENCE  TOKEN &       CONFIDENCE            RECOGNIZED
            RETRY
```

---

### Display States

**HIGH CONFIDENCE:**
```
🙏 नमस्ते Ram!
⭐ 245 points
🥇 Gold Member
Table OTP: [____]
Not Ram? [Switch Account]
```

**MEDIUM CONFIDENCE:**
```
🙏 Welcome back!
Is this you?
📱 98XXX...567
👤 Ram S.
[Yes, it's me] [No, switch]
```

**NOT RECOGNIZED:**
```
🙏 Welcome!
Enter Table OTP: [____]
Member? [Login]
New here? [Join Free]
```

---

## 2.3 Verification Options (Configurable)

Owner can configure verification method in settings:

| Option | Description | Security | Cost |
|--------|-------------|----------|------|
| **WhatsApp OTP** | 6-digit code via WhatsApp | ★★★★★ | Free* |
| **SMS OTP** | 6-digit code via SMS | ★★★★★ | Rs.0.5/msg |
| **WhatsApp + SMS Fallback** | Try WhatsApp first | ★★★★★ | Mixed |
| **Last 4 Digits (DEFAULT)** | Enter last 4 of phone | ★★★☆☆ | FREE |
| **No Verification** | Trust device only | ★☆☆☆☆ | FREE |

*Requires WhatsApp Business API setup

### Apply verification for:
- ☑ Points redemption
- ☑ New device login
- ☑ Profile changes (phone, email)
- ☑ Manual customer linking by staff

---

## 2.4 Complete Recognition Scenarios

### SCENARIO A: Returning Customer (localStorage exists)
1. Customer scans QR code at table
2. System checks localStorage → Token found
3. System validates token → Valid, Customer: Ram
4. System fetches latest points → 245 points
5. Display: "🙏 नमस्ते Ram! ⭐ 245 points 🥇 Gold"
6. Customer enters table OTP → Session started

**TIME:** ~1 second (instant recognition)

---

### SCENARIO B: Returning Customer (fingerprint only)
1. Customer scans QR code (cleared browser data)
2. System checks localStorage → Empty
3. System generates fingerprint → "fp_xyz789"
4. System searches fingerprint in DB → Match found: Ram
5. Display: "Welcome back! Is this you? 📱 98XXX...567 Ram S."
6. Customer clicks "Yes, it's me"
7. System sets NEW localStorage token
8. Customer enters table OTP → Session started

**TIME:** ~3 seconds (one extra confirmation click)

---

### SCENARIO C: Returning Customer (fingerprint changed, logs in)
1. Customer scans QR code (new phone or OS update)
2. System checks localStorage → Empty
3. System generates fingerprint → "fp_NEW456"
4. System searches fingerprint in DB → No match
5. Display: "Welcome! Enter Table OTP" + "Already a member? [Login]"
6. Customer clicks "Login"
7. Customer enters phone: 9841234567
8. System sends verification (based on settings)
9. Customer verifies → Account found!
10. System links NEW fingerprint + sets localStorage
11. Display: "🙏 नमस्ते Ram! ⭐ 245 points"
12. Future visits: Recognized instantly

**TIME:** ~30 seconds (full login flow)

---

### SCENARIO D: New Customer (registers)
1. Customer scans QR code (first time ever)
2. System checks localStorage → Empty
3. System checks fingerprint → No match
4. Display: "Welcome! [Login] or [Join & Get 50 Points FREE]"
5. Customer clicks "Join"
6. Customer enters: Phone, Name, DOB
7. System sends verification
8. Customer verifies → Account created!
9. System saves fingerprint + sets localStorage
10. Display: "🎉 Welcome Ram! You earned 50 points!"
11. Future visits: Recognized instantly

**TIME:** ~60 seconds (registration flow)

---

### SCENARIO E: Guest (doesn't register)
1. Customer scans QR code
2. Not recognized
3. Customer ignores "Login/Join" options
4. Customer enters table OTP only
5. Session started as GUEST
6. Can browse menu, place orders
7. NO points earned
8. System stores fingerprint in SESSION (temporary)
9. At billing: Staff can convert to member

**TIME:** ~5 seconds

---

# PART 3: CUSTOMER REGISTRATION

## 3.1 Self-Registration (Via QR)

Customer sees "Join & Get 50 Points FREE" button and clicks it:

### REQUIRED FIELDS

| Field | Purpose |
|-------|---------|
| Phone Number * | Primary identifier, OTP delivery |
| Full Name * | Greeting, receipts |
| Date of Birth * | Birthday offers |
| Marketing Consent * | Legal compliance |

### OPTIONAL FIELDS (Show more)

| Field | Purpose |
|-------|---------|
| Email | Receipts, marketing |
| Gender | Personalization |
| Anniversary Date | Anniversary offers |
| Food Preference | Menu recommendations |
| Allergies | Safety alerts |

### AFTER SUBMISSION

1. System sends verification (OTP or Last 4 digits based on settings)
2. Customer verifies
3. Account created
4. 50 welcome points added
5. Device linked (fingerprint + localStorage)
6. Welcome message sent via WhatsApp/SMS

### SUCCESS SCREEN
```
🎉 Welcome to Garden Cafe Rewards, Ram!

✅ Account created
🎁 50 Welcome Points added
📱 This device is now linked

Your Current Status:
⭐ 50 points
🥉 Bronze Member

Next Tier: Silver (450 more points or 5 visits)

[Continue to Menu]
```

---

## 3.2 Staff-Assisted Registration (At Billing)

### WHEN TO USE
- Customer ordered as guest
- At billing, customer wants to join loyalty program
- Quick registration with minimal fields

### CASHIER SCREEN

```
BILL - Table 5                              Bill #1234
───────────────────────────────────────────────────────
Customer: Guest ⚠️
          [🔗 Link Existing] [🆕 Register New]
───────────────────────────────────────────────────────
2x Chicken Momo                              Rs.500
1x Fried Rice                                Rs.350
───────────────────────────────────────────────────────
Subtotal:                                    Rs.850
Tax (13%):                                   Rs.110
───────────────────────────────────────────────────────
TOTAL:                                       Rs.960

⚠️ Customer not linked - No points will be earned
```

### QUICK REGISTRATION FORM

**Minimal Fields Only:**
- Phone Number *
- Full Name *
- Date of Birth *

**Consent:**
- ☑ Customer agrees to join loyalty program
- ☑ Customer agrees to receive WhatsApp/SMS updates

**Benefits shown:**
- 🎁 50 Welcome Points FREE
- ⭐ Earn 9 points on this bill (Rs.960)
- 💰 Total: 59 points (Rs.590 value!)

---

## 3.3 Device Linking Methods

### METHOD 1: Session Device (Automatic)

When customer ordered via QR (even as guest):
- System already captured device fingerprint
- Fingerprint stored in session (temporary)
- When staff creates account → Link fingerprint to customer
- Next visit: Fingerprint matches → Recognized!

**PROS:** Automatic, no extra step for customer
**CONS:** Only works if customer used QR

---

### METHOD 2: QR Code (At Counter)

Staff shows QR code on their screen for customer to scan:
- Customer scans → Browser opens → Device linked

**PROS:** Immediate linking, no cost
**CONS:** Customer needs phone in hand

---

### METHOD 3: Send Link (WhatsApp/SMS)

System sends message with link to customer's phone:
- Customer clicks link on their phone → Device linked

**PROS:** Customer can link anytime, works after leaving
**CONS:** Cost (if SMS), customer may not click

---

### RECOGNITION AFTER LINKING

- **Visit 1:** Staff creates account → Fingerprint linked
- **Visit 2:** Fingerprint matches → "नमस्ते Ram!" → localStorage set
- **Visit 3+:** localStorage matches → Instant "नमस्ते Ram!"

---

## 3.4 Customer Data Fields

### Required vs Optional

| Field | Required | Self-Reg | Staff-Reg | Purpose |
|-------|----------|----------|-----------|---------|
| Phone Number | ✅ | ✅ | ✅ | Primary identifier |
| Full Name | ✅ | ✅ | ✅ | Greeting, receipts |
| Date of Birth | ✅ | ✅ | ✅ | Birthday offers |
| Marketing Consent | ✅ | ✅ | ✅ | Legal compliance |
| Email | ❌ | ⚪ | ❌ | Receipts, marketing |
| Gender | ❌ | ⚪ | ❌ | Personalization |
| Anniversary | ❌ | ⚪ | ❌ | Anniversary offers |
| Food Preference | ❌ | ⚪ | ❌ | Menu recommendations |
| Allergies | ❌ | ⚪ | ❌ | Safety alerts |

✅ = Required | ⚪ = Optional | ❌ = Not shown (can add later)

### System-Generated Fields

- Customer ID
- Restaurant ID
- Points Balance
- Points Earned Total
- Points Redeemed
- Tier
- Visit Count
- Total Spent (hidden from customer)
- Last Visit Date
- Birthday Verified
- Created At
- Updated At


# PART 4: POINTS SYSTEM

## 4.1 Earning Points

### HOW POINTS ARE EARNED

| Source | Description |
|--------|-------------|
| **Spending** | Points earned based on bill amount |
| **Welcome Bonus** | 50 points on signup (one-time) |
| **Birthday Bonus** | Bonus points on birthday (tier-based) |
| **Visit Milestones** | Bonus at 5th, 10th, 25th, 50th visit |
| **Feedback Bonus** | Points for completing feedback |

---

### EARNING FORMULA

```
Base Points = Bill Amount ÷ Earning Rate
Final Points = Base Points × Tier Multiplier
```

**Example:**
- Bill: Rs.960
- Earning Rate: Rs.100 = 1 point
- Customer Tier: Gold (1.5x multiplier)
- Base Points: 960 ÷ 100 = 9.6 → Rounded to 9
- Final Points: 9 × 1.5 = 13.5 → Rounded to **14 points**

---

### TIER MULTIPLIERS (Default)

| Tier | Multiplier | Example (Rs.1000 bill) |
|------|------------|------------------------|
| 🥉 Bronze | 1.0x | 10 × 1.0 = 10 points |
| 🥈 Silver | 1.25x | 10 × 1.25 = 12 points |
| 🥇 Gold | 1.5x | 10 × 1.5 = 15 points |
| 💎 Platinum | 2.0x | 10 × 2.0 = 20 points |

---

### WHEN POINTS ARE CREDITED

- Points credited **AFTER payment is completed**
- Customer receives WhatsApp notification:

```
🎉 Points Earned at Garden Cafe!

Bill Amount: Rs.960
Points Earned: +14 ⭐ (Gold 1.5x bonus!)

New Balance: 259 points
Value: Rs.2,590

Thank you for dining with us! 🍽️
```

---

### WHAT COUNTS TOWARD POINTS

**✅ Included:**
- Food items
- Beverages
- Service charge

**❌ NOT included:**
- Tax (VAT)
- Discounts (points earned on net amount)
- Tips
- Delivery charges

*Owner can configure what to include/exclude*

---

## 4.2 Redeeming Points

### REDEMPTION FLOW

1. Customer views available rewards
2. Selects amount to redeem
3. Verification required (Last 4 digits / OTP)
4. Points redeemed, discount applied

---

### CUSTOMER REDEMPTION SCREEN

```
🎁 YOUR REWARDS

Current Points: 245 ⭐
Value: Rs.2,450

Available Rewards:
○ 10 points → Rs.100 off
○ 25 points → Rs.250 off
○ 50 points → Rs.500 off
○ 100 points → Rs.1,000 off
● Custom amount: [___] points

[Apply to Bill]
```

---

### VERIFICATION (Last 4 Digits - Default)

```
🔐 Verify to Redeem

Redeeming: 50 points (Rs.500 off)

Enter last 4 digits of your phone number:
+977 98412XX [____]

[Verify & Redeem]
```

---

### REDEMPTION RULES (Configurable)

| Setting | Default | Description |
|---------|---------|-------------|
| Redemption Rate | 10 pts = Rs.100 | How much discount per point |
| Minimum Redemption | 10 points | Minimum points to redeem |
| Maximum Discount | 50% of bill | Maximum discount allowed |
| Combine with offers | No | Can use with other discounts? |
| Points on discounted bill | Yes | Earn points on remaining amount |

---

### MAXIMUM DISCOUNT EXAMPLE

- Bill: Rs.1,000
- Customer has: 200 points (Rs.2,000 value)
- Maximum discount: 50% of bill = Rs.500
- Customer can only redeem 50 points (Rs.500)
- Remaining 150 points stay in account

---

## 4.3 Points Expiry

### EXPIRY POLICY

**Points expire after 12 MONTHS OF INACTIVITY**

- "Inactivity" = No earning or redemption transaction
- Any transaction resets the 12-month clock
- All points expire together (not individually)

---

### EXPIRY NOTIFICATION TIMELINE

```
Last Transaction                               12 Months Later
      │                                              │
      │◀──────────────────────────────────────────▶│
      │                                              │
      │              ┌─────────┐                    │
      │              │ Day 335 │                    ▼
      │              │(30 days)│            Points Expire
      │              │ before  │                    ✗
      │              └────┬────┘
      │                   │
      │                   ▼
      │         WhatsApp Notification
      │         "Your points expire in 30 days!"
```

---

### EXPIRY NOTIFICATION MESSAGE

```
⚠️ Ram, your points are expiring soon!

You have 245 points (Rs.2,450 value)
Expiring on: February 25, 2025

Visit us before then to save your points!
Any purchase will reset your expiry date.

📍 Garden Cafe
📞 9801234567
```

---

### RESET CLOCK ACTIONS

**✅ These reset the 12-month clock:**
- Making a purchase (earning points)
- Redeeming points
- Receiving bonus points (birthday, milestone)

**❌ These do NOT reset:**
- Logging in
- Viewing points
- Updating profile

---

## 4.4 Points History

### TRANSACTION TYPES

| Type | Points | Description |
|------|--------|-------------|
| EARN | + | Points from purchase |
| BONUS | + | Welcome/Birthday/Milestone/Referral |
| REDEEM | - | Used for discount |
| EXPIRE | - | Points expired due to inactivity |
| ADJUST | ± | Manual adjustment by manager (with reason) |
| REFUND | - | Points reversed due to order cancellation |

---

### CUSTOMER POINTS HISTORY VIEW

```
📊 POINTS HISTORY

Current Balance: 245 ⭐
Lifetime Earned: 1,250 points
Lifetime Redeemed: 1,005 points

DATE       │ POINTS │ DESCRIPTION                    │ BALANCE
───────────────────────────────────────────────────────────────
Jan 25     │  +14   │ Purchase (Gold 1.5x)          │ 245
Jan 20     │  -50   │ Redeemed (Rs.500 off)         │ 231
Jan 15     │  +11   │ Purchase (Gold 1.5x)          │ 281
Jan 10     │  +25   │ 10th Visit Milestone 🎉       │ 270
Jan 10     │  +9    │ Purchase (Gold 1.5x)          │ 245
Jan 01     │  +100  │ Birthday Bonus 🎂             │ 236
Dec 25     │  +15   │ Purchase (Gold 1.5x)          │ 136
Dec 20     │  -100  │ Redeemed (Rs.1000 off)        │ 121
...        │  ...   │ ...                           │ ...

[Load More]
```

---

# PART 5: MEMBERSHIP TIERS

## 5.1 Tier Structure

### 💎 PLATINUM
- **Requirement:** 5,000 points OR 50 visits
- **Multiplier:** 2.0x points
- **Birthday:** 15% discount + 100 bonus points
- **Perks:** Priority seating, exclusive offers, manager greeting

---

### 🥇 GOLD
- **Requirement:** 1,500 points OR 15 visits
- **Multiplier:** 1.5x points
- **Birthday:** 10% discount + 50 bonus points
- **Perks:** VIP notification to staff, favorites shown to waiter

---

### 🥈 SILVER
- **Requirement:** 500 points OR 5 visits
- **Multiplier:** 1.25x points
- **Birthday:** 5% discount + 25 bonus points
- **Perks:** Early access to promotions

---

### 🥉 BRONZE
- **Requirement:** Sign up (default tier)
- **Multiplier:** 1.0x points
- **Birthday:** SMS greeting
- **Perks:** Earn & redeem points

*All values configurable by owner*

---

## 5.2 Upgrade Criteria

### UPGRADE LOGIC: Points OR Visits (whichever first)

This makes it easier for customers to progress:
- High-spending, infrequent customers → Qualify via points
- Low-spending, frequent customers → Qualify via visits

**Example:**
- Ram earned 600 points in 4 visits → Silver (via points)
- Shyam earned 300 points in 5 visits → Silver (via visits)

---

### DOWNGRADE POLICY: NEVER

Once a customer achieves a tier, they **NEVER** lose it.

- Gold customer inactive for 2 years → Still Gold
- Encourages lifetime loyalty
- Simpler for customers to understand

---

### TIER UPGRADE NOTIFICATION

```
🎉 Congratulations Ram!

You've been upgraded to 🥇 GOLD Member!

Your new benefits:
⭐ 1.5x points on every purchase
🎂 10% birthday discount + 50 bonus points
👨‍🍳 VIP treatment from our staff

Thank you for being a loyal customer!
- Garden Cafe Team
```

---

### PROGRESS DISPLAY TO CUSTOMER

```
Your Status: 🥈 SILVER

Progress to 🥇 GOLD:

Points: 850 / 1,500
[████████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░] 57%

OR

Visits: 9 / 15
[████████████████████████░░░░░░░░░░░░░░░░] 60%

🎯 6 more visits to reach Gold!
```

---

## 5.3 Tier Benefits (Configurable)

### AVAILABLE BENEFIT OPTIONS

**Earning Benefits:**
- Points multiplier (1.0x - 3.0x)
- Bonus points on signup
- Bonus points per visit

**Birthday Benefits:**
- Discount percentage (0% - 50%)
- Bonus points (0 - 500)
- Free item (value limit configurable)
- Validity period (1 - 30 days)

**Service Benefits:**
- VIP notification to staff
- Show favorites & allergies to waiter
- Priority seating
- Manager greeting
- Complimentary welcome drink
- Reserved parking

**Promotional Benefits:**
- Early access to promotions
- Exclusive tier-only offers
- Double points days
- Free delivery

---

# PART 6: REWARDS & PROMOTIONS

## 6.1 Birthday Rewards

### BIRTHDAY REWARD CONFIGURATION (Per Tier)

| Tier | Discount | Free Item | Bonus Pts | Validity |
|------|----------|-----------|-----------|----------|
| 🥉 Bronze | 0% | None | 0 | - |
| 🥈 Silver | 5% | Drink | 25 | ± 3 days |
| 🥇 Gold | 10% | Dessert | 50 | ± 5 days |
| 💎 Platinum | 15% | Any (≤500) | 100 | Full week |

*All values configurable by owner*

---

### BIRTHDAY NOTIFICATION TIMELINE

```
              Birthday
                 │
──────┬──────────┼──────────┬──────────
      │          │          │
   Day -7     Day 0      Day +3
   Preview    Birthday   Reminder
   Message    SMS + WA   (if not visited)
```

---

### DAY -7: Preview Message (WhatsApp)

```
🎂 Ram, your birthday is coming!

We have a special treat waiting for you at Garden Cafe!

Your Gold Member Birthday Rewards:
🎁 10% Discount
🍰 Free Dessert
⭐ 50 Bonus Points

Valid: Jan 20 - Jan 30

See you soon! 🍽️
```

---

### DAY 0: Birthday Message (SMS + WhatsApp)

```
🎂 Happy Birthday Ram!

Garden Cafe wishes you a wonderful day!

Your Birthday Gift is ready:
🎁 10% OFF your entire bill
🍰 FREE Dessert of your choice
⭐ 50 Bonus Points

Valid until: Jan 30

Come celebrate with us! 🎉
```

---

### DAY +3: Reminder (If not visited)

```
🎁 Ram, don't forget your birthday gift!

Your rewards expire in 4 days:
• 10% Discount
• Free Dessert
• 50 Bonus Points

Visit us before Jan 30!
```

---

### VERIFIED BIRTHDAY

- Staff can mark birthday as "Verified" after checking ID
- Verified badge: 🎂✓
- Owner can require verification for birthday rewards
- Prevents fake birthdays for rewards

---

### STACKING WITH OTHER OFFERS (Configurable)

- ○ Birthday discount can combine with other offers
- ● Birthday OR other offer (whichever is better) ← DEFAULT
- ○ Birthday discount applies after other offers

---

## 6.2 Anniversary Rewards (Optional)

- Customer provides anniversary date during registration
- Similar to birthday but for couples
- Default: 10% discount for couple
- Messages: Day -3 preview, Day 0 wishes

---

## 6.3 Welcome Bonus

- 50 points FREE on signup
- One-time only
- Credited immediately after registration
- Configurable amount by owner

---

## 6.4 Visit Milestones (Configurable)

| Milestone | Default Reward |
|-----------|----------------|
| 5th visit | 50 bonus points |
| 10th visit | 100 bonus points |
| 25th visit | 200 bonus points + Free dessert |
| 50th visit | 500 bonus points + Free meal |
| 100th visit | 1000 bonus points + VIP dinner |

*Owner can enable/disable and customize rewards*

---

## 6.5 Win-back Campaigns

System identifies inactive customers:

| Inactivity | Campaign | Offer |
|------------|----------|-------|
| 30 days | "We miss you" | 5% off |
| 60 days | "Come back" | 10% off |
| 90 days | "Special offer" | 15% off |

**Mode:** Both (Automatic suggestions + Manual control)
- System shows: "45 customers haven't visited in 30 days"
- Owner clicks: [Send Win-back Offer] or [Dismiss]

---

# PART 7: MANUAL CUSTOMER ASSIGNMENT

## 7.1 When to Use

- Customer ordered as guest (system didn't recognize)
- Customer forgot to login
- Customer's friend placed the order
- Staff took order verbally
- At billing: "I have a loyalty account!"

---

## 7.2 Who Can Link

| Role | When |
|------|------|
| Waiter | During active session |
| Cashier | At billing time |
| Manager | Anytime (including late linking) |

---

## 7.3 Entry Points

### Entry Point 1: From Active Table (Waiter/Manager)

While session active, staff can link customer anytime:
- Button: [🔗 Link Loyalty Customer]

### Entry Point 2: From Billing Screen (Cashier)

At payment time, cashier can link customer:
- Shows: "Customer: Guest ⚠️ [🔗 Link to Loyalty Account]"

---

## 7.4 Linking Flow

1. Staff clicks [Link Customer] on table/bill
2. Search by phone or name
3. Select customer from results
4. Verify identity (based on settings)
5. Customer linked ✓
6. Show available rewards
7. If customer wants to redeem → Verify again

**If customer not found:**
- [Register New Customer] option
- Quick registration (phone, name, DOB)
- Device linked from session (if used QR)

---

## 7.5 Verification for Linking (Configurable)

- Last 4 digits of phone (quick, free)
- WhatsApp/SMS OTP (secure)
- No verification (trust staff)

---

## 7.6 Late Linking (After Payment)

- Allowed within 24 hours
- Requires **MANAGER APPROVAL**
- Reason must be provided
- Audit trail maintained

---

## 7.7 Device Recognition for Staff-Created Accounts

**Question:** If 1st visit was by Guest and staff assigned customer name 'Saroj', will system recognize Saroj on 2nd visit?

**Answer: YES ✅** (if staff links session device)

### Complete Flow:

**Visit 1 (Staff Creates Account):**
1. Saroj scans QR as guest → Device fingerprint captured
2. Saroj orders food
3. At billing, staff creates account (Phone, Name, DOB)
4. System asks: "Link device from this session?"
5. Staff clicks [YES] → Fingerprint linked
6. Database: CustomerDevice record created

**Visit 2 (Saroj Returns):**
1. Saroj scans QR (same phone)
2. System checks localStorage → NULL
3. System checks fingerprint → MATCH FOUND ✅
4. System recognizes: "नमस्ते Saroj! 59 points, Bronze Member"
5. System ALSO sets localStorage now
6. Database: token now set

**Visit 3+ (Future Visits):**
1. Saroj scans QR
2. System checks localStorage → found → INSTANT MATCH ✅
3. "नमस्ते Saroj!" (instant recognition)

### Recognition Reliability:
- Visit 2: ~75% (fingerprint only)
- Visit 3+: ~95% (localStorage + fingerprint backup)

---

## 7.8 Device Linking Options at Registration

| Option | Description | When to Use |
|--------|-------------|-------------|
| Session Device | Link fingerprint from current session | Customer ordered via QR |
| Show QR Code | Customer scans to link phone now | Customer has phone |
| Send Link | WhatsApp/SMS link to click later | Customer leaving |
| Skip | Customer logs in manually next time | Default |

---
# PART 8: COMMUNICATION SYSTEM

## 8.1 Communication Channels

| Message Type | WhatsApp | SMS | Email | Cost |
|--------------|----------|-----|-------|------|
| OTP Verification | ✅ | ⚪* | ❌ | Free / Rs.0.5 |
| Welcome Message | ✅ | ❌ | ⚪ | Free |
| Points Earned | ✅ | ❌ | ❌ | Free |
| Points Expiry Warning | ✅ | ❌ | ⚪ | Free |
| Tier Upgrade | ✅ | ❌ | ⚪ | Free |
| Birthday (Day -7) | ✅ | ❌ | ⚪ | Free |
| Birthday (Day 0) | ✅ | ✅** | ⚪ | Rs.0.5 (SMS) |
| Birthday Reminder | ✅ | ❌ | ❌ | Free |
| Win-back Campaign | ✅ | ⚪ | ⚪ | Free |
| Promotional Offers | ✅ | ⚪ | ⚪ | Free |

**Legend:**
- ✅ = Primary channel
- ⚪ = Optional / Fallback
- ❌ = Not used
- \* = Fallback if WhatsApp fails
- \*\* = Configurable by owner (default: Yes)

**Note:**
- WhatsApp is FREE with WhatsApp Business API (requires setup)
- SMS costs Rs.0.5 per message

---

## 8.2 Message Templates

### Welcome Message

```
🎉 Welcome to Garden Cafe Rewards, Ram!

Your account is ready:
• 50 welcome points
• 9 points from today's bill
• Total: 59 points ⭐

👉 Tap here to link your phone for auto-login:
https://qrdine.app/link/abc123xyz

(Link expires in 24 hours)
```

---

### Points Earned

```
🎉 Points Earned at Garden Cafe!

Bill Amount: Rs.960
Points Earned: +14 ⭐ (Gold 1.5x bonus!)

New Balance: 259 points
Value: Rs.2,590

Thank you for dining with us! 🍽️
```

---

### Tier Upgrade

```
🎉 Congratulations Ram!

You've been upgraded to 🥇 GOLD Member!

Your new benefits:
⭐ 1.5x points on every purchase
🎂 10% birthday discount + 50 bonus points
👨‍🍳 VIP treatment from our staff

Thank you for being a loyal customer!
- Garden Cafe Team
```

---

### Points Expiry Warning

```
⚠️ Ram, your points are expiring soon!

You have 245 points (Rs.2,450 value)
Expiring on: February 25, 2025

Visit us before then to save your points!
Any purchase will reset your expiry date.

📍 Garden Cafe
📞 9801234567
```

---

# PART 9: PRIVACY & DATA VISIBILITY

## 9.1 Data Visibility Matrix

| Data | Customer | Waiter | Cashier | Manager | Owner |
|------|----------|--------|---------|---------|-------|
| Name | ✅ | ✅ | ✅ | ✅ | ✅ |
| Phone (full) | ✅ | ❌ | ❌ | ❌ | ✅ |
| Phone (hint) | - | ❌ | ✅ | ✅ | ✅ |
| DOB | ✅ | ❌ | ❌ | ✅ | ✅ |
| Email | ✅ | ❌ | ❌ | ❌ | ✅ |
| Points Balance | ✅ | ❌ | ✅ | ✅ | ✅ |
| Tier | ✅ | ✅ | ✅ | ✅ | ✅ |
| Points History | ✅ | ❌ | ❌ | ✅ | ✅ |
| Order History | ✅ | ❌ | ❌ | ✅ | ✅ |
| Favorites | ✅ | Gold+ | ❌ | ✅ | ✅ |
| Allergies | ✅ | Gold+ | ❌ | ✅ | ✅ |
| Visit Count | ✅ | ❌ | ❌ | ✅ | ✅ |
| Last Visit | ✅ | ❌ | ❌ | ✅ | ✅ |
| Total Spending | ❌ | ❌ | ❌ | ❌ | ✅ |
| Customer Notes | ❌ | ✅ | ✅ | ✅ | ✅ |
| Manager Notes | ❌ | ❌ | ❌ | ✅ | ✅ |

**Note:** Gold+ = Only visible for Gold and Platinum tier customers

---

## 9.2 Marketing Consent

- **Opt-in required** (customer must explicitly agree)
- Separate consent for SMS and Email
- Customer can opt-out anytime
- Consent logged with timestamp

---

# PART 10: ANALYTICS & SEGMENTATION

## 10.1 RFM Analysis

**RFM = Recency, Frequency, Monetary**

| Factor | Measures |
|--------|----------|
| **R** = Recency | When did they last visit? |
| **F** = Frequency | How often do they visit? |
| **M** = Monetary | How much do they spend? |

---

## 10.2 Customer Segments

### 🌟 CHAMPIONS (High R, High F, High M)
- Best customers - reward and retain them
- **Action:** Exclusive VIP offers, early access

### 💎 LOYAL CUSTOMERS (High R, High F, Medium M)
- Regular visitors - encourage spending
- **Action:** Upsell, referral program

### 🆕 NEW CUSTOMERS (High R, Low F, Low M)
- Recently joined - encourage 2nd visit
- **Action:** Welcome campaign, 2nd visit bonus

### ⚠️ AT RISK (Low R, High F, High M)
- Were loyal but haven't visited recently
- **Action:** Win-back campaign urgently!

### 😴 HIBERNATING (Low R, Low F, Low M)
- Inactive for long time
- **Action:** Big discount or let go

---

## 10.3 Owner Dashboard

```
📊 CUSTOMER SEGMENTS                               Garden Cafe

Total Customers: 500

🌟 Champions      (25)   5%   ████                    [Send Offer]
💎 Loyal          (80)  16%   ████████                [Send Offer]
🆕 New           (120)  24%   ████████████            [View]
⚠️ At Risk        (45)   9%   █████         ⚠️       [Send Offer]
😴 Hibernating   (230)  46%   ███████████████████████ [Send Offer]

💡 INSIGHT: 45 customers at risk! Send win-back offer now.
```

---

# PART 11: STAFF FEATURES

## 11.1 Customer Notes

### Types

| Type | Visibility | Example |
|------|------------|---------|
| General Notes | All staff | "Prefers window seat" |
| Alert Notes | All staff (prominent) | "⚠️ Severe peanut allergy" |
| Manager Notes | Manager+ only | "Complained about service last time" |

---

## 11.2 VIP Notifications

When Gold/Platinum customer logs in, staff receives notification:

```
🔔 VIP Customer at Table 5

👤 Ram Shrestha
🥇 Gold Member | 18 visits

Favorites: Chicken Momo, Coke
⚠️ Allergies: Peanuts
📝 Note: "Likes extra spicy"

[Acknowledge]
```

**Configurable:** Enable/disable per tier

---

## 11.3 Feedback Collection

### Options

| Setting | Description |
|---------|-------------|
| After every visit | Ask for feedback each time |
| After every 3rd visit | Less intrusive |
| Never ask | Disabled |
| Bonus points | Configurable amount for completing feedback |

---

# PART 12: OWNER CONFIGURATION

## 12.1 All Configurable Settings

### POINTS SETTINGS

| Setting | Default |
|---------|---------|
| Earning Rate | Rs.100 = 1 point |
| Redemption Rate | 10 points = Rs.100 |
| Minimum Redemption | 10 points |
| Maximum Discount | 50% of bill |
| Points Expiry | 12 months inactivity |
| Expiry Warning | 30 days before |

---

### TIER SETTINGS

| Setting | Default |
|---------|---------|
| Silver Requirements | 500 pts OR 5 visits |
| Gold Requirements | 1500 pts OR 15 visits |
| Platinum Requirements | 5000 pts OR 50 visits |
| Tier Multipliers | 1x / 1.25x / 1.5x / 2x |
| Tier Benefits | See Part 5.3 |

---

### VERIFICATION SETTINGS

| Setting | Default |
|---------|---------|
| OTP Method | Last 4 Digits (FREE) |
| Verify for Redemption | Yes |
| Verify for New Device | Yes |
| Verify for Staff Linking | Yes |

---

### BIRTHDAY SETTINGS

| Setting | Default |
|---------|---------|
| Birthday Rewards per Tier | See Part 6.1 |
| Validity Period | Configurable per tier |
| Require Verified Birthday | No |
| Send SMS on Birthday | Yes |
| Stack with Other Offers | No (better offer applies) |

---

### NOTIFICATION SETTINGS

| Setting | Default |
|---------|---------|
| Welcome Message | WhatsApp |
| Points Earned | WhatsApp |
| Birthday Messages | WhatsApp + SMS |
| Win-back Campaigns | WhatsApp |

---

### STAFF SETTINGS

| Setting | Default |
|---------|---------|
| VIP Notifications | Gold + Platinum |
| Show Favorites to Waiter | Gold + Platinum |
| Allow Customer Notes | Yes |
| Feedback Collection | Every visit (configurable) |

---

# PART 13: DATABASE SCHEMA

## Prisma Schema

```prisma
// ═══════════════════════════════════════════════════════════════════════════
// LOYALTY & CRM DATABASE SCHEMA
// ═══════════════════════════════════════════════════════════════════════════

model Customer {
  id                    String          @id @default(cuid())
  restaurant_id         String

  // Basic Info
  phone                 String
  name                  String
  email                 String?
  date_of_birth         DateTime?
  date_of_birth_verified Boolean        @default(false)
  gender                String?         // "male", "female", "other"
  anniversary_date      DateTime?

  // Preferences
  food_preference       String?         // "veg", "non-veg", "vegan"
  allergies             String[]

  // Loyalty
  points_balance        Int             @default(0)
  points_earned_total   Int             @default(0)
  points_redeemed_total Int             @default(0)
  tier                  CustomerTier    @default(BRONZE)

  // Stats
  visit_count           Int             @default(0)
  total_spent           Decimal         @default(0)
  last_visit_at         DateTime?
  points_expire_at      DateTime?

  // Marketing
  marketing_consent_sms   Boolean       @default(false)
  marketing_consent_email Boolean       @default(false)

  // Timestamps
  created_at            DateTime        @default(now())
  updated_at            DateTime        @updatedAt

  // Relations
  restaurant            Restaurant      @relation(fields: [restaurant_id], references: [id])
  devices               CustomerDevice[]
  points_history        PointsHistory[]
  notes                 CustomerNote[]

  @@unique([restaurant_id, phone])
  @@index([restaurant_id, tier])
  @@index([restaurant_id, last_visit_at])
}

model CustomerDevice {
  id                    String          @id @default(cuid())
  customer_id           String
  restaurant_id         String

  token                 String?         @unique
  fingerprint_hash      String
  device_info           Json?

  is_active             Boolean         @default(true)
  created_at            DateTime        @default(now())
  last_seen_at          DateTime        @default(now())

  customer              Customer        @relation(fields: [customer_id], references: [id])

  @@unique([restaurant_id, fingerprint_hash])
}

model PointsHistory {
  id                    String          @id @default(cuid())
  customer_id           String
  restaurant_id         String

  type                  PointsType
  points                Int
  balance_after         Int
  description           String
  reference_id          String?         // Order ID, Campaign ID, etc.

  created_at            DateTime        @default(now())
  created_by            String?         // Staff ID for manual adjustments

  customer              Customer        @relation(fields: [customer_id], references: [id])
}

model CustomerNote {
  id                    String          @id @default(cuid())
  customer_id           String
  restaurant_id         String

  type                  NoteType
  content               String

  created_at            DateTime        @default(now())
  created_by            String          // Staff ID

  customer              Customer        @relation(fields: [customer_id], references: [id])
}

model LoyaltySettings {
  id                    String          @id @default(cuid())
  restaurant_id         String          @unique

  // Points
  earning_rate          Int             @default(100)    // Rs per point
  redemption_rate       Int             @default(10)     // Points per Rs.100
  min_redemption        Int             @default(10)
  max_discount_percent  Int             @default(50)
  points_expiry_months  Int             @default(12)
  expiry_warning_days   Int             @default(30)

  // Verification
  verification_method   String          @default("LAST_4_DIGITS")
  // Options: WHATSAPP_OTP, SMS_OTP, WHATSAPP_SMS_FALLBACK, LAST_4_DIGITS, NONE

  // Tiers (JSON for flexibility)
  tier_settings         Json

  // Birthday
  birthday_settings     Json
  require_verified_birthday Boolean     @default(false)
  birthday_sms_enabled  Boolean         @default(true)

  // Notifications
  notification_settings Json

  // Staff
  vip_notification_tiers String[]      @default(["GOLD", "PLATINUM"])
  show_favorites_tiers  String[]       @default(["GOLD", "PLATINUM"])

  created_at            DateTime        @default(now())
  updated_at            DateTime        @updatedAt

  restaurant            Restaurant      @relation(fields: [restaurant_id], references: [id])
}

// ═══════════════════════════════════════════════════════════════════════════
// ENUMS
// ═══════════════════════════════════════════════════════════════════════════

enum CustomerTier {
  BRONZE
  SILVER
  GOLD
  PLATINUM
}

enum PointsType {
  EARN
  BONUS
  REDEEM
  EXPIRE
  ADJUST
  REFUND
}

enum NoteType {
  GENERAL
  ALERT
  MANAGER_ONLY
}
```

---

# PART 14: COMPLETE USER JOURNEYS

## 14.1 New Customer Journey

```
1. Scans QR → Not recognized → "Join & Get 50 Points FREE"
2. Enters: Phone, Name, DOB → Verifies
3. Account created → 50 welcome points → Device linked
4. Enters table OTP → Session started
5. Browses menu → Places order
6. Payment completed → Points earned
7. WhatsApp: "Welcome! You earned X points"
8. Next visit: "🙏 नमस्ते Ram!" (auto-recognized)
```

---

## 14.2 Returning Customer Journey

```
1. Scans QR → Recognized → "🙏 नमस्ते Ram! 245 points"
2. Enters table OTP → Session started
3. Browses menu → Sees "🎁 Use 50 points for Rs.500 off"
4. Adds items → Applies reward → Verifies (Last 4 digits)
5. Reward applied → Places order
6. Payment completed → Points earned (minus redeemed)
7. WhatsApp: "You earned X points, redeemed Y points"
```

---

## 14.3 Guest-to-Member Conversion

```
1. Guest scans QR → Not recognized → Skips login
2. Enters table OTP → Orders as guest
3. At billing → "I want to join loyalty!"
4. Cashier clicks [Register New]
5. Enters: Phone, Name, DOB → Creates account
6. Links session device → "Session Device" option selected
7. 50 welcome points + points from bill = 59 points
8. WhatsApp sent with link to fully link device
9. Next visit: Fingerprint recognized → "नमस्ते!"
10. Customer confirms → localStorage set → Future: instant recognition
```

---

## 14.4 Birthday Redemption Journey

```
Day -7: WhatsApp → "Your birthday is coming! 10% off waiting"
Day 0: SMS + WhatsApp → "Happy Birthday! Claim your gift"

1. Customer visits on birthday
2. Scans QR → Recognized → "🎂 Happy Birthday Ram!"
3. System shows: "Birthday rewards available!"
   • 10% discount
   • Free dessert
   • 50 bonus points
4. Customer orders → Birthday discount auto-applied
5. Selects free dessert
6. Payment completed
7. 50 bonus points credited + order points
8. WhatsApp: "Hope you had a great birthday! You earned X points"
```

---

# COMPLETE SYSTEM SUMMARY

## 1. Customer Recognition & Authentication
- Recognition: Hybrid (localStorage + Basic Device Fingerprint)
- MPIN: Removed
- Login on new device: Configurable OTP method
- Redemption verification: Configurable OTP method
- Default: Last 4 digits (FREE)

## 2. Customer Registration
- Required: Phone, Name, DOB, Marketing Consent
- Optional: Email, Gender, Anniversary, Food Preference, Allergies
- Methods: Self-registration (full form) or Staff quick registration (minimal fields)

## 3. Points System (All Configurable)
- Earning Rate: Default Rs.100 = 1 point
- Redemption Rate: Default 10 points = Rs.100
- Minimum Redemption: Default 10 points
- Maximum Discount: Default 50% of bill
- Expiry: 12 months inactivity, WhatsApp notification 30 days before

## 4. Membership Tiers
- Upgrade: Points OR Visits (whichever first)
- Downgrade: Never
- Benefits: Customizable by owner
- Default: Bronze (signup), Silver (500pts/5 visits), Gold (1500pts/15 visits), Platinum (5000pts/50 visits)

## 5. Birthday & Special Occasions
- Rewards: Configurable per tier (discount + free item + bonus points)
- Validity: Configurable per tier
- Stackable: Configurable
- Verification: Optional verified badge
- Messages: Day -7 (WhatsApp), Day 0 (SMS+WhatsApp), Day +3 (reminder)
- Anniversary: Optional feature

## 6. Manual Customer Assignment
- Who: Waiter + Cashier + Manager
- Entry Points: Active table or billing screen
- Verification: Configurable (Last 4 digits/OTP/None)
- Late linking: Yes, with manager approval
- New registration: Yes, quick registration at billing
- Show rewards: Yes, prompt to apply

## 7. Privacy & Data Visibility
- Customer sees: Points, tier, rewards, order history (NOT total spending)
- Waiter sees: Name, tier, favorites/allergies (Gold+ only)
- Cashier sees: Name, tier, points, phone hint
- Manager sees: Everything waiter/cashier sees + visit count
- Owner sees: Everything
- Marketing: Opt-in required

## 8. Staff Features
- Customer notes: Yes
- VIP notification: Configurable (Gold/Platinum arrivals)

## 9. Analytics
- RFM Analysis: Full implementation
- Segments: Champions, Loyal, New, At Risk, Hibernating
- Actions: View customers, send campaigns, automatic suggestions

## 10. Communication Channels
- Primary: WhatsApp (free, rich messages)
- Secondary: SMS (important messages, configurable)
- Optional: Email, Push notifications

## 11. OTP System
- 5 configurable options: WhatsApp/SMS/Hybrid/Last 4 Digits/None
- Default: Last 4 Digits (FREE, accessible to all restaurants)
- Owner can upgrade to SMS or WhatsApp anytime
- Applies to: Redemption, new device login, profile changes, manual linking

## 12. Device Recognition for Staff-Created Accounts
- Session fingerprint automatically linked when staff creates account
- Visit 2: Fingerprint recognition (~75%)
- Visit 3+: localStorage + fingerprint (~95%)
- Fallback: Manual login if fingerprint fails
- Multiple linking options: Session device, QR code, WhatsApp/SMS link, skip

---

**END OF LOYALTY & CRM SPECIFICATION**

*Document Version: 1.0*
*Last Updated: January 2025*
*Ready for Implementation*

