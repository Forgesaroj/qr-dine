# Nepal IRD E-Billing Compliance Roadmap

## Part 1A: Overview, Requirements & CBMS API

**Version 1.0 | January 2025**

---

# TABLE OF CONTENTS

1. Executive Summary
2. Compliance Overview
3. Who Must Comply
4. Technical Requirements Checklist
5. CBMS API Integration
6. Invoice Requirements

---

# 1. EXECUTIVE SUMMARY

## What is IRD E-Billing?

E-Billing (Electronic Billing) is the mandatory computerized invoicing system required by Nepal's **Inland Revenue Department (IRD)** for businesses exceeding certain turnover thresholds.

**Key Benefits:**
- Real-time tax monitoring
- Transaction transparency
- Fraud prevention
- Standardized invoice formats
- Centralized billing data via CBMS

## What is CBMS?

**Central Billing Monitoring System (CBMS)** is IRD's centralized platform that:
- Receives invoice data from approved billing software
- Monitors business transactions in real-time
- Cross-references buyer/seller data
- Enables tax compliance verification

## Why This Matters for QR DINE

- Restaurants with turnover > NPR 5 Crore MUST use IRD-approved e-billing
- Cloud-based software has additional compliance requirements
- Non-compliance results in penalties and invoice rejection
- **QR DINE must be IRD-compliant to serve the Nepal market**

---

# 2. COMPLIANCE OVERVIEW

## Regulatory Framework

| Regulation | Description |
|------------|-------------|
| विद्युतीय बीजक सम्बन्धी कार्यविधि, २०७४ | E-Billing Directive 2074 (4th Amendment) |
| Value Added Tax Act, 2052 | VAT regulations |
| Income Tax Act, 2058 | Income tax requirements |
| CBMS Integration Guidelines | API specifications |

## Key Compliance Areas

```
┌─────────────────────────────────────────────────────────────────┐
│                    IRD E-BILLING COMPLIANCE                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐            │
│  │  DATABASE   │  │   INVOICE   │  │    CBMS     │            │
│  │ REQUIREMENTS│  │   FORMAT    │  │ INTEGRATION │            │
│  │             │  │             │  │             │            │
│  │ • SQL DB    │  │ • Annex 5   │  │ • Real-time │            │
│  │ • Audit Log │  │ • Fiscal Yr │  │ • API Sync  │            │
│  │ • No Delete │  │ • Reprint   │  │ • Error Log │            │
│  └─────────────┘  └─────────────┘  └─────────────┘            │
│                                                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐            │
│  │   REPORTS   │  │   ACCESS    │  │   CLOUD     │            │
│  │  & EXPORT   │  │  CONTROL    │  │  HOSTING    │            │
│  │             │  │             │  │             │            │
│  │ • Annex 6   │  │ • Roles     │  │ • Nepal Srv │            │
│  │ • Excel/PDF │  │ • Auth Log  │  │ • IRD Access│            │
│  │ • VAT Rpt   │  │ • Backup    │  │ • Agreement │            │
│  └─────────────┘  └─────────────┘  └─────────────┘            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

# 3. WHO MUST COMPLY

## Mandatory E-Billing Thresholds

| Business Type | Annual Turnover | Requirement |
|---------------|-----------------|-------------|
| General Business | > NPR 10 Crore | IRD-approved e-billing |
| Hotels, Restaurants, Canteens | > NPR 5 Crore | IRD-approved e-billing |
| Any VAT-registered business | > NPR 25 Crore | Real-time CBMS sync |
| Large enterprises | > NPR 35 Crore | Stricter enforcement |

## QR DINE Customer Tiers

**TIER 1: Small Restaurants (< NPR 5 Cr)**
- E-billing: Optional but recommended
- CBMS: Not required
- QR DINE: Full features, CBMS-ready for future

**TIER 2: Medium Restaurants (NPR 5-25 Cr)**
- E-billing: MANDATORY
- CBMS: Required (batch sync acceptable)
- QR DINE: Full compliance mode

**TIER 3: Large Restaurants (> NPR 25 Cr)**
- E-billing: MANDATORY
- CBMS: Real-time sync REQUIRED
- QR DINE: Real-time CBMS integration

---

# 4. TECHNICAL REQUIREMENTS CHECKLIST

## 4.1 Database Requirements

| # | Requirement | Priority |
|---|-------------|----------|
| 1 | SQL-based database (PostgreSQL/MySQL/MSSQL) | CRITICAL |
| 2 | Prevent deletion of saved invoice data | CRITICAL |
| 3 | Automated daily backups | CRITICAL |
| 4 | Automated log archives | CRITICAL |
| 5 | Data recovery mechanism | HIGH |
| 6 | Record versioning (no overwrite) | CRITICAL |
| 7 | Audit trail for all actions | CRITICAL |

## 4.2 Invoice Requirements

| # | Requirement | Priority |
|---|-------------|----------|
| 1 | Fiscal year-based numbering (Annex 5) | CRITICAL |
| 2 | Sequential invoice numbers | CRITICAL |
| 3 | No gaps in invoice sequence | CRITICAL |
| 4 | Reprint shows "Copy of Original - 1,2,3..." | CRITICAL |
| 5 | Cancellation with reason | CRITICAL |
| 6 | Cancelled invoices in reports | HIGH |
| 7 | Invoice cannot be edited after save | CRITICAL |
| 8 | All mandatory fields present | CRITICAL |

## 4.3 Reporting Requirements

| # | Requirement | Priority |
|---|-------------|----------|
| 1 | Sales Register (Daily/Monthly/Yearly) | CRITICAL |
| 2 | Purchase Register | HIGH |
| 3 | VAT Reports (Annex 6 format) | CRITICAL |
| 4 | Audit Trail Report | CRITICAL |
| 5 | Activity Log Report | HIGH |
| 6 | CBMS Sync Status Report | HIGH |
| 7 | Export to Excel | CRITICAL |
| 8 | Export to PDF | CRITICAL |
| 9 | Export to XML | HIGH |

## 4.4 Access Control Requirements

| # | Requirement | Priority |
|---|-------------|----------|
| 1 | Role-based access control | CRITICAL |
| 2 | User authentication (login) | CRITICAL |
| 3 | Session management | HIGH |
| 4 | Password policy enforcement | HIGH |
| 5 | Backup access restricted | CRITICAL |
| 6 | Log archive access restricted | HIGH |
| 7 | Login attempt logging | HIGH |

## 4.5 CBMS Integration Requirements

| # | Requirement | Priority |
|---|-------------|----------|
| 1 | Invoice POST to CBMS API | CRITICAL |
| 2 | Credit Note POST to CBMS API | CRITICAL |
| 3 | Real-time sync capability | CRITICAL |
| 4 | Batch sync fallback | HIGH |
| 5 | Retry mechanism for failures | HIGH |
| 6 | Sync status tracking | HIGH |
| 7 | Error logging | HIGH |

## 4.6 Documentation Requirements

| # | Requirement | Priority |
|---|-------------|----------|
| 1 | User manual (Nepali or English) | CRITICAL |
| 2 | Technical documentation | HIGH |
| 3 | API documentation | HIGH |
| 4 | Training materials | MEDIUM |

---

# 5. CBMS API INTEGRATION

## 5.1 API Endpoints

### Production Environment

| Purpose | URL |
|---------|-----|
| Post Sales Invoice | `https://cbapi.ird.gov.np/api/bill` |
| Post Credit Note | `https://cbapi.ird.gov.np/api/billreturn` |
| CBMS Portal | `https://cbms.ird.gov.np` |

### Test Environment (Legacy)

| Purpose | URL |
|---------|-----|
| Post Sales Invoice | `http://202.166.207.75:9050/api/bill` |
| Post Credit Note | `http://202.166.207.75:9050/api/billreturn` |

## 5.2 Authentication

Uses **Taxpayer Portal credentials** in request body:

```json
{
  "username": "TAXPAYER_USERID",
  "password": "TAXPAYER_PASSWORD",
  "seller_pan": "PAN_NUMBER"
}
```

**Important Notes:**
- Credentials are Taxpayer Portal login (not separate CBMS credentials)
- Password changes in Taxpayer Portal must be updated in billing software
- Credentials sent in every API request (no token-based auth)

## 5.3 Invoice API (POST /api/bill)

### Request Model

```typescript
interface BillViewModel {
  // Authentication
  username: string;           // Taxpayer Portal UserID
  password: string;           // Taxpayer Portal Password
  seller_pan: string;         // Seller's PAN number

  // Buyer Information
  buyer_pan: string;          // Buyer's PAN (empty string if no PAN)
  buyer_name: string;         // Buyer's name

  // Invoice Details
  fiscal_year: string;        // Format: "2080.081"
  invoice_number: string;     // Unique invoice number
  invoice_date: string;       // Format: "2080.10.15" (BS date)

  // Amounts
  total_sales: number;        // Total including all taxes
  taxable_sales_vat: number;  // VAT taxable amount
  vat: number;                // VAT amount (13%)
  excisable_amount: number;   // Excise taxable (0 if none)
  excise: number;             // Excise duty (0 if none)
  taxable_sales_hst: number;  // Health Service Tax taxable
  hst: number;                // Health Service Tax amount
  amount_for_esf: number;     // Education Service Fee taxable
  esf: number;                // Education Service Fee
  export_sales: number;       // Export sales (0% VAT)
  tax_exempted_sales: number; // Tax exempted sales

  // Metadata
  isrealtime: boolean;        // true = realtime, false = batch
  datetimeClient: string;     // ISO timestamp
}
```

### Response Codes

| Code | Meaning | Action |
|------|---------|--------|
| 200 | Success | Mark as synced |
| 100 | Credentials invalid | Check username/password |
| 101 | Bill already exists | Skip (already synced) |
| 102 | Save exception | Check field values, retry |
| 103 | Unknown exception | Log error, retry later |
| 104 | Model invalid | Check required fields |

## 5.4 Credit Note API (POST /api/billreturn)

### Request Model

```typescript
interface BillReturnViewModel {
  // Authentication (same as invoice)
  username: string;
  password: string;
  seller_pan: string;

  // Buyer Information
  buyer_pan: string;
  buyer_name: string;

  // Reference
  fiscal_year: string;
  ref_invoice_number: string;   // Original invoice number

  // Credit Note Details
  credit_note_number: string;
  credit_note_date: string;     // BS date format
  reason_for_return: string;

  // Amounts (same structure as invoice)
  total_sales: number;
  taxable_sales_vat: number;
  vat: number;
  // ... other tax fields

  // Metadata
  isrealtime: boolean;
  datetimeClient: string;
}
```

### Response Codes

| Code | Meaning | Action |
|------|---------|--------|
| 200 | Success | Mark as synced |
| 100 | Credentials invalid | Check username/password |
| 101 | Original bill not found | Verify ref_invoice_number |
| 102 | Save exception | Check field values |
| 103 | Unknown exception | Log error, retry |
| 104 | Model invalid | Check required fields |
| 105 | Bill does not exist | Original invoice not in CBMS |

## 5.5 Sample TypeScript Implementation

```typescript
// CBMS Service Example
export class CBMSService {
  private apiUrl = 'https://cbapi.ird.gov.np';

  async postInvoice(invoice: BillViewModel): Promise<CBMSResponse> {
    const response = await fetch(`${this.apiUrl}/api/bill`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(invoice),
      signal: AbortSignal.timeout(30000)
    });

    const result = await response.json();

    return {
      success: result.code === 200 || result.code === 101,
      code: result.code,
      message: this.getResponseMessage(result.code)
    };
  }

  private getResponseMessage(code: number): string {
    const messages: Record<number, string> = {
      200: 'Success - Invoice synced to CBMS',
      100: 'Authentication failed - Check credentials',
      101: 'Invoice already exists in CBMS',
      102: 'Error saving - Check field values',
      103: 'Unknown error - Contact support',
      104: 'Invalid model - Missing required fields',
      105: 'Referenced invoice not found'
    };
    return messages[code] || `Unknown code: ${code}`;
  }
}
```

---

# 6. INVOICE REQUIREMENTS

## 6.1 Invoice Number Format (Annex 5)

### Structure

```
{FISCAL_YEAR}-{BRANCH_CODE}-{SEQUENCE}

Examples:
- 2081-KTM-00001  (Kathmandu branch, 1st invoice)
- 2081-PKR-00156  (Pokhara branch, 156th invoice)
- 2081-001-00001  (Branch code as number)
```

### Rules

| Rule | Description |
|------|-------------|
| Fiscal Year Reset | Sequence resets at start of new fiscal year |
| No Gaps | Invoice numbers must be sequential |
| No Reuse | Cancelled invoice numbers cannot be reused |
| Branch Unique | Each branch has its own sequence |
| Immutable | Cannot change invoice number after creation |

### Nepal Fiscal Year

| Fiscal Year | Start Date (BS) | End Date (BS) |
|-------------|-----------------|---------------|
| 2081.082 | 2081 Shrawan 1 | 2082 Ashad 31 |
| 2082.083 | 2082 Shrawan 1 | 2083 Ashad 31 |

## 6.2 Required Invoice Fields

### Seller Information

| Field | Required |
|-------|----------|
| Seller Name | ✅ |
| Seller PAN | ✅ |
| Seller Address | ✅ |
| Seller Phone | ✅ |

### Buyer Information

| Field | Required |
|-------|----------|
| Buyer Name | ✅ |
| Buyer PAN | ⚪ (if VAT registered) |
| Buyer Address | ⚪ |

### Invoice Details

| Field | Required |
|-------|----------|
| Invoice Number | ✅ |
| Invoice Date (BS) | ✅ |
| Fiscal Year | ✅ |

### Line Items

| Field | Required |
|-------|----------|
| S.N. | ✅ |
| Description | ✅ |
| Quantity | ✅ |
| Rate | ✅ |
| Amount | ✅ |

### Totals

| Field | Required |
|-------|----------|
| Subtotal | ✅ |
| Taxable Amount | ✅ |
| VAT (13%) | ✅ |
| Grand Total | ✅ |
| Amount in Words | ✅ |

## 6.3 Printed Invoice Format

```
╔════════════════════════════════════════════════════════════════╗
║                         TAX INVOICE                            ║
║                          कर बीजक                                ║
╠════════════════════════════════════════════════════════════════╣
║  RESTAURANT NAME                                               ║
║  Address, City                                                 ║
║  Phone: 01-XXXXXXX  |  VAT/PAN: 123456789                     ║
╠════════════════════════════════════════════════════════════════╣
║  Invoice No: 2081-KTM-00001        Date: 2081.10.15           ║
║  Fiscal Year: 2081.082             Time: 14:35:22             ║
╠════════════════════════════════════════════════════════════════╣
║  Customer: Ram Shrestha            PAN: 987654321             ║
╠════════════════════════════════════════════════════════════════╣
║  S.N │ Description          │ Qty │ Rate     │ Amount         ║
║  ────┼──────────────────────┼─────┼──────────┼────────────    ║
║   1  │ Chicken Momo         │  2  │   350.00 │      700.00    ║
║   2  │ Chicken Biryani      │  1  │   450.00 │      450.00    ║
║   3  │ Coke (300ml)         │  2  │    60.00 │      120.00    ║
╠════════════════════════════════════════════════════════════════╣
║  Subtotal:                                       Rs. 1,270.00  ║
║  Service Charge (10%):                           Rs.   127.00  ║
║  Taxable Amount:                                 Rs. 1,397.00  ║
║  VAT (13%):                                      Rs.   181.61  ║
║  ────────────────────────────────────────────────────────────  ║
║  GRAND TOTAL:                                    Rs. 1,578.61  ║
╠════════════════════════════════════════════════════════════════╣
║  In Words: One Thousand Five Hundred Seventy Eight Rupees      ║
║            and Sixty One Paisa Only                            ║
╠════════════════════════════════════════════════════════════════╣
║  Cashier: Hari Prasad              Table: 5                   ║
║                                                                ║
║                      ** ORIGINAL COPY **                       ║
╚════════════════════════════════════════════════════════════════╝
```

## 6.4 Reprint Control

| Print Type | Label |
|------------|-------|
| Original | "ORIGINAL COPY" |
| 1st Reprint | "Copy of Original - 1" |
| 2nd Reprint | "Copy of Original - 2" |
| Nth Reprint | "Copy of Original - N" |

**Rules:**
- Each reprint logged with timestamp and user
- Reprint count stored in database
- Reports must show reprint history

## 6.5 Invoice Cancellation

| Rule | Description |
|------|-------------|
| Reason Required | Must provide cancellation reason |
| Audit Log | Log who cancelled, when, why |
| No Deletion | Invoice record cannot be deleted |
| In Reports | Cancelled invoices appear in reports |
| No Reuse | Invoice number cannot be reused |

# 7. DATABASE & AUDIT REQUIREMENTS

## 7.1 Database Requirements

### Mandatory: SQL Database

| Acceptable | Not Acceptable |
|------------|----------------|
| PostgreSQL | MongoDB |
| MySQL | Firebase |
| Microsoft SQL Server | DynamoDB |
| MariaDB | Cassandra |

### Data Integrity Rules

1. **NO HARD DELETE**
   - Use soft delete (is_deleted flag)
   - Preserve all historical data
   - Audit log for soft deletes

2. **NO OVERWRITE**
   - Create new version for edits
   - Preserve original record
   - Link versions together

3. **IMMUTABLE AFTER FINALIZE**
   - Invoices cannot be edited after creation
   - Only cancellation allowed
   - Credit notes for corrections

4. **REFERENTIAL INTEGRITY**
   - Foreign keys enforced
   - Cascade rules defined
   - No orphan records

## 7.2 Audit Trail Requirements

### What to Log

| Event | Log Details |
|-------|-------------|
| Invoice Created | User, timestamp, invoice data |
| Invoice Printed | User, timestamp, print type |
| Invoice Reprinted | User, timestamp, reprint count |
| Invoice Cancelled | User, timestamp, reason |
| CBMS Sync | Timestamp, status, response |
| User Login | User, timestamp, IP, device |
| User Logout | User, timestamp |
| Failed Login | Username, timestamp, IP |
| Data Export | User, timestamp, export type |
| Settings Changed | User, timestamp, old/new values |

### Audit Log Schema

```sql
CREATE TABLE audit_log (
  id              UUID PRIMARY KEY,
  restaurant_id   UUID NOT NULL,
  action          VARCHAR(50) NOT NULL,
  entity_type     VARCHAR(50) NOT NULL,
  entity_id       UUID,
  user_id         UUID,
  user_name       VARCHAR(100),
  user_role       VARCHAR(50),
  created_at      TIMESTAMP DEFAULT NOW(),
  ip_address      VARCHAR(45),
  user_agent      TEXT,
  old_value       JSONB,
  new_value       JSONB,
  metadata        JSONB
);

CREATE INDEX idx_audit_restaurant ON audit_log(restaurant_id, created_at);
CREATE INDEX idx_audit_entity ON audit_log(entity_type, entity_id);
CREATE INDEX idx_audit_user ON audit_log(user_id, created_at);
```

## 7.3 Backup Requirements

| Type | Frequency | Retention |
|------|-----------|-----------|
| Full Backup | Daily | 30 days |
| Incremental | Hourly | 7 days |
| Transaction Log | Every 15 min | 3 days |
| Archive | Monthly | 7 years |

**Rules:**
- Automated backups (no manual intervention)
- Encrypted backup files
- Off-site storage
- Regular restore testing
- Backup access restricted to authorized users only

## 7.4 Log Archive Requirements

| Log Type | Archive After | Retain For |
|----------|---------------|------------|
| Audit Logs | 90 days | 7 years |
| Access Logs | 30 days | 5 years |
| Error Logs | 30 days | 2 years |
| CBMS Sync Logs | 90 days | 7 years |

---

# 8. CLOUD HOSTING REQUIREMENTS

## 8.1 Server Location Mandate

```
╔═══════════════════════════════════════════════════════════╗
║                    CRITICAL RULE                          ║
║                                                           ║
║   Central server MUST be physically located in NEPAL      ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
```

**Acceptable Hosting:**
- ✅ Nepal-based data centers
- ✅ Nepal-registered cloud providers
- ✅ Self-hosted servers in Nepal

**NOT Acceptable:**
- ❌ AWS (Singapore, Mumbai, etc.)
- ❌ Google Cloud (any region)
- ❌ Azure (any region)
- ❌ DigitalOcean (any region)
- ❌ Any server outside Nepal

## 8.2 Nepal Hosting Providers

| Provider | Services |
|----------|----------|
| Subisu | Colocation, Cloud |
| Worldlink | Data Center, Cloud |
| Vianet | Colocation |
| NTC | Cloud Services |
| Nepal Datacenter | Colocation, Cloud |

## 8.3 Third-Party Hosting Agreement

If using third-party hosting, a **tripartite agreement** is required:

### Parties to Agreement

1. **User** - The business using the software
2. **Software Provider** - QR DINE / LUMORA
3. **Server Provider** - Hosting company

### Agreement Template

```
TRIPARTITE AGREEMENT FOR E-BILLING SOFTWARE HOSTING
(As per IRD Format)

PARTIES:
1. User: [Restaurant Name], PAN: [XXX]
2. Software Provider: LUMORA Technology Pvt. Ltd., PAN: [XXX]
3. Server Provider: [Hosting Company], PAN: [XXX]

TERMS:
1. Server location: [Physical address in Nepal]
2. Data ownership: User owns all billing data
3. IRD access: All parties agree to provide IRD access upon request
4. Data security: [Security measures]
5. Backup responsibility: [Who handles backups]
6. Uptime guarantee: [SLA terms]
7. Data retention: Minimum 7 years
8. Termination: Data handover procedures

SIGNATURES:
User: _________________ Date: _________
Software Provider: _________________ Date: _________
Server Provider: _________________ Date: _________
```

**Submission:** Agreement must be submitted to IRD before going live.

## 8.4 Multi-Tenancy Requirements

For SaaS deployment serving multiple restaurants:

| Requirement | Description |
|-------------|-------------|
| Data Isolation | Each tenant's data completely separate |
| Schema Separation | Separate database or schema per tenant |
| Access Control | No cross-tenant data access |
| Backup Isolation | Per-tenant backup capability |
| Audit Separation | Tenant-specific audit logs |

## 8.5 Multinational Exception

For multinational companies with servers abroad:

1. ✅ Maintain **AUDIT SERVER inside Nepal**
2. ✅ Notify IRD of BOTH server locations
3. ✅ Grant IRD access to Nepal audit server
4. ✅ Real-time sync to Nepal audit server

**Note:** This exception is ONLY for multinational companies with existing global infrastructure.

---

# 9. SOFTWARE REGISTRATION PROCESS

## 9.1 Overview

```
┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐
│  STEP 1 │───►│  STEP 2 │───►│  STEP 3 │───►│  STEP 4 │
│ Prepare │    │ Submit  │    │  IRD    │    │ Receive │
│  Docs   │    │ Apply   │    │ Testing │    │ Approval│
└─────────┘    └─────────┘    └─────────┘    └─────────┘

Timeline: 2-4 weeks (depending on IRD workload)
```

## 9.2 Required Documents

| # | Document | Format | Required |
|---|----------|--------|----------|
| 1 | Company PAN Certificate | PDF | ✅ |
| 2 | Company VAT Certificate | PDF | ✅ |
| 3 | Company Registration | PDF | ✅ |
| 4 | Application Letter | PDF | ✅ |
| 5 | Software Documentation | PDF | ✅ |
| 6 | User Manual (Nepali/English) | PDF | ✅ |
| 7 | Sample Invoice (Printed) | Physical | ✅ |
| 8 | Sample Invoice (Digital) | PDF | ✅ |
| 9 | Demo Video | MP4/Link | ✅ |
| 10 | Technical Architecture | PDF | ✅ |
| 11 | CBMS Test Report | PDF | ✅ |
| 12 | Hosting Agreement (if cloud) | PDF | ✅* |

## 9.3 Application Letter Template

```
Date: [Date in BS]

To,
The Director General
Inland Revenue Department
Lazimpat, Kathmandu

Subject: Application for E-Billing Software Registration

Respected Sir/Madam,

We, [Company Name], a company registered under the laws of Nepal
(PAN: [PAN Number]), hereby apply for the registration of our
electronic billing software "[Software Name]" as per the
E-Billing Directive, 2074.

Software Details:
- Name: QR DINE Restaurant Management System
- Version: 1.0.0
- Type: Cloud-based
- Target Users: Restaurants, Hotels, Canteens

We confirm that:
1. The software meets all technical requirements
2. The software integrates with CBMS via Web API
3. All documentation is attached herewith
4. We will provide access for testing and inspection

Attached Documents:
1. Company Registration Certificate
2. PAN/VAT Certificates
3. Technical Documentation
4. User Manual
5. Sample Invoices
6. Demo Video Link
7. CBMS Test Report
8. Hosting Agreement

We request you to kindly process our application.

Thanking you,

[Authorized Signature]
[Name]
[Designation]
[Company Name]
[Contact Number]
[Email]
```

## 9.4 CBMS Test Checklist

| # | Test Case | Expected Result |
|---|-----------|-----------------|
| 1 | Post valid invoice | Response: 200 |
| 2 | Post duplicate invoice | Response: 101 |
| 3 | Post invalid credentials | Response: 100 |
| 4 | Post invalid model | Response: 104 |
| 5 | Post credit note | Response: 200 |
| 6 | Credit note - invalid ref | Response: 105 |
| 7 | Network timeout handling | Retry works |
| 8 | Batch sync (multiple) | All synced |

## 9.5 IRD Evaluation Process

### What IRD Tests

| Area | Tests |
|------|-------|
| Invoice Format | Annex 5 compliance, all required fields |
| Numbering | Fiscal year based, sequential, no gaps |
| Reprint Control | Copy labels, reprint logging |
| Cancellation | Reason capture, audit trail |
| Reports | Annex 6 format, export capability |
| CBMS | Real-time sync, error handling |
| Security | Access control, data protection |
| Audit | Complete audit trail |

### Common Rejection Reasons

| Issue | Solution |
|-------|----------|
| Missing fields on invoice | Add all required fields |
| Wrong date format | Use BS date format |
| No reprint control | Implement copy labeling |
| CBMS sync fails | Fix API integration |
| No audit trail | Implement comprehensive logging |
| Server outside Nepal | Move to Nepal hosting |

## 9.6 After Approval

1. **Certificate Issued** - Keep safely
2. **Listed on IRD Website** - Appears in approved list
3. **Can Onboard Customers** - Start serving businesses
4. **Annual Compliance** - Maintain compliance
5. **Version Updates** - Major updates may need re-evaluation

---

# 10. IMPLEMENTATION ROADMAP

## 10.1 Phase Overview (12 Weeks)

```
PHASE 1: Foundation (Week 1-2)
├── Database schema updates
├── Audit logging system
└── Nepal date utilities

PHASE 2: Invoice System (Week 3-4)
├── Invoice number generator
├── Invoice format (Annex 5)
├── Reprint control
└── Cancellation flow

PHASE 3: CBMS Integration (Week 5-6)
├── CBMS service implementation
├── Sync queue & retry logic
├── Error handling
└── Sync status UI

PHASE 4: Reports (Week 7-8)
├── Sales register (Annex 6)
├── VAT reports
├── Audit trail reports
└── Export functionality

PHASE 5: Testing & Documentation (Week 9-10)
├── CBMS integration testing
├── User manual creation
├── Technical documentation
└── Demo video

PHASE 6: Registration & Launch (Week 11-12)
├── Prepare application documents
├── Submit to IRD
├── Address feedback
└── Receive approval
```

## 10.2 Week-by-Week Tasks

### Week 1: Database Updates
- Add IRD-specific fields to Invoice table
- Create InvoiceAuditLog table
- Create CBMSSyncLog table
- Create RestaurantCBMSConfig table
- Add fiscal year tracking
- Implement soft delete
- Migration scripts

### Week 2: Audit & Utilities
- Implement AuditService
- Audit middleware for API routes
- Nepal date conversion utilities
- Fiscal year calculation
- Amount to words converter
- Testing

### Week 3: Invoice Generation
- Invoice number generator service
- Fiscal year auto-detection
- Invoice creation with all IRD fields
- Invoice validation rules
- Bill-to-Invoice conversion

### Week 4: Reprint & Cancellation
- Reprint tracking system
- Copy label generation
- Invoice cancellation flow
- Cancellation reason capture
- Print template with IRD format
- PDF generation

### Week 5: CBMS Service
- CBMSService implementation
- Invoice POST function
- Credit Note POST function
- Response handling
- Error classification
- Credential management

### Week 6: Sync System
- Sync queue implementation
- Background job for batch sync
- Retry logic with backoff
- Sync status tracking
- Admin UI for sync status
- Manual sync trigger

### Week 7: Sales & VAT Reports
- Sales Register report (Annex 6)
- Daily sales summary
- Monthly sales summary
- VAT collected report
- Export to Excel

### Week 8: Audit & Export
- Audit trail report
- CBMS sync status report
- Activity log report
- Export to PDF
- Export to XML
- Report date range filters

### Week 9: Testing
- CBMS test environment setup
- Integration test suite
- Test all CBMS scenarios
- Load testing sync queue
- Security testing
- Bug fixes

### Week 10: Documentation
- User manual (English)
- User manual (Nepali)
- Technical documentation
- API documentation
- Demo video recording

### Week 11: Application
- Compile all documents
- CBMS test report
- Sample invoices
- Application letter
- Review checklist
- Submit application

### Week 12: Approval
- Respond to IRD queries
- Fix any issues found
- Receive approval
- Update production config
- Customer onboarding prep

---

# 11. GO-LIVE CHECKLIST

## Pre-Launch Checklist

### Technical Readiness
- [ ] All features implemented
- [ ] All tests passing
- [ ] CBMS integration tested
- [ ] Production database ready
- [ ] Backups configured
- [ ] SSL certificates installed
- [ ] Server in Nepal confirmed
- [ ] Monitoring configured

### Documentation Readiness
- [ ] User manual complete
- [ ] Technical docs complete
- [ ] Training materials ready
- [ ] Support documentation

### Compliance Readiness
- [ ] IRD approval received
- [ ] Hosting agreement signed
- [ ] CBMS credentials obtained
- [ ] Production CBMS URL configured

## Customer Onboarding Checklist

For each restaurant going live:

- [ ] Collect restaurant PAN
- [ ] Collect VAT certificate
- [ ] Get Taxpayer Portal credentials
- [ ] Configure CBMS settings
- [ ] Set fiscal year
- [ ] Configure invoice format
- [ ] Test CBMS sync
- [ ] Train staff
- [ ] Go live with monitoring

---

# 12. MAINTENANCE & COMPLIANCE

## Ongoing Tasks

### Daily
- Monitor CBMS sync status (automated)
- Check failed syncs (automated alerts)
- Backup verification

### Weekly
- Review CBMS sync report
- Check audit logs
- Verify backup integrity

### Monthly
- Generate compliance report
- Review access logs
- Update documentation

### Yearly
- Fiscal year rollover
- Renew hosting agreement
- IRD compliance review
- Archive old data

## Version Update Rules

### Minor Updates (Bug Fixes)
- No IRD notification required
- Internal testing sufficient

### Major Updates (New Features)
- Review against IRD requirements
- Test CBMS integration
- Update documentation
- May need IRD re-evaluation

### Breaking Changes
- Requires IRD notification
- May need re-certification
- Coordinate with IRD before release

---
# 13. DATABASE SCHEMA

## 13.1 Invoice Table (Prisma)

```prisma
model Invoice {
  id                    String    @id @default(cuid())
  restaurant_id         String

  // ═══════════════════════════════════════════════════════════
  // IRD REQUIRED FIELDS
  // ═══════════════════════════════════════════════════════════

  // Invoice Identification
  invoice_number        String    // "2081-KTM-00001"
  fiscal_year           String    // "2081.082"
  invoice_date_bs       String    // "2081.10.15"
  invoice_date_ad       DateTime

  // Seller Information
  seller_pan            String
  seller_name           String
  seller_address        String
  seller_phone          String?

  // Buyer Information
  buyer_pan             String?
  buyer_name            String
  buyer_address         String?

  // ═══════════════════════════════════════════════════════════
  // AMOUNTS
  // ═══════════════════════════════════════════════════════════

  subtotal              Decimal   @db.Decimal(12, 2)
  discount_amount       Decimal   @default(0) @db.Decimal(12, 2)
  discount_reason       String?

  taxable_amount        Decimal   @db.Decimal(12, 2)
  vat_rate              Decimal   @default(13) @db.Decimal(5, 2)
  vat_amount            Decimal   @db.Decimal(12, 2)

  service_charge_rate   Decimal?  @db.Decimal(5, 2)
  service_charge        Decimal   @default(0) @db.Decimal(12, 2)
  excise_amount         Decimal   @default(0) @db.Decimal(12, 2)
  hst_amount            Decimal   @default(0) @db.Decimal(12, 2)
  esf_amount            Decimal   @default(0) @db.Decimal(12, 2)
  export_amount         Decimal   @default(0) @db.Decimal(12, 2)
  exempt_amount         Decimal   @default(0) @db.Decimal(12, 2)

  total_amount          Decimal   @db.Decimal(12, 2)
  amount_in_words       String?

  // ═══════════════════════════════════════════════════════════
  // CBMS SYNC
  // ═══════════════════════════════════════════════════════════

  cbms_required         Boolean   @default(true)
  cbms_synced           Boolean   @default(false)
  cbms_synced_at        DateTime?
  cbms_response_code    Int?
  cbms_response_message String?
  cbms_retry_count      Int       @default(0)
  cbms_last_retry_at    DateTime?
  cbms_error            String?

  // ═══════════════════════════════════════════════════════════
  // PRINT & CANCELLATION
  // ═══════════════════════════════════════════════════════════

  print_count           Int       @default(0)
  first_printed_at      DateTime?
  first_printed_by      String?
  last_printed_at       DateTime?
  last_printed_by       String?

  status                InvoiceStatus @default(ACTIVE)
  is_cancelled          Boolean   @default(false)
  cancelled_at          DateTime?
  cancelled_by          String?
  cancellation_reason   String?

  // ═══════════════════════════════════════════════════════════
  // REFERENCES
  // ═══════════════════════════════════════════════════════════

  bill_id               String?   @unique
  order_id              String?
  session_id            String?
  payment_method        String?

  created_by            String
  created_by_name       String
  created_at            DateTime  @default(now())
  updated_at            DateTime  @updatedAt

  // Relations
  restaurant            Restaurant @relation(fields: [restaurant_id], references: [id])
  items                 InvoiceItem[]
  audit_logs            InvoiceAuditLog[]

  @@unique([restaurant_id, invoice_number])
  @@index([restaurant_id, fiscal_year])
  @@index([restaurant_id, cbms_synced])
  @@index([restaurant_id, invoice_date_ad])
}

enum InvoiceStatus {
  ACTIVE
  CANCELLED
}
```

## 13.2 Invoice Item Table

```prisma
model InvoiceItem {
  id                String    @id @default(cuid())
  invoice_id        String

  serial_number     Int
  description       String
  description_local String?
  quantity          Decimal   @db.Decimal(10, 2)
  unit_price        Decimal   @db.Decimal(12, 2)
  total_price       Decimal   @db.Decimal(12, 2)

  menu_item_id      String?

  created_at        DateTime  @default(now())

  invoice           Invoice   @relation(fields: [invoice_id], references: [id])

  @@index([invoice_id])
}
```

## 13.3 Invoice Audit Log Table

```prisma
model InvoiceAuditLog {
  id              String    @id @default(cuid())
  invoice_id      String
  restaurant_id   String

  action          InvoiceAuditAction

  user_id         String
  user_name       String
  user_role       String

  created_at      DateTime  @default(now())
  ip_address      String?
  user_agent      String?

  old_value       Json?
  new_value       Json?
  metadata        Json?

  invoice         Invoice   @relation(fields: [invoice_id], references: [id])

  @@index([invoice_id])
  @@index([restaurant_id, created_at])
}

enum InvoiceAuditAction {
  CREATED
  PRINTED
  REPRINTED
  CANCELLED
  CBMS_SYNC_ATTEMPT
  CBMS_SYNC_SUCCESS
  CBMS_SYNC_FAILED
  EXPORTED
  VIEWED
}
```

## 13.4 CBMS Sync Log Table

```prisma
model CBMSSyncLog {
  id                String    @id @default(cuid())
  restaurant_id     String

  type              CBMSSyncType
  reference_id      String
  invoice_number    String
  fiscal_year       String

  request_payload   Json
  request_timestamp DateTime  @default(now())

  response_code     Int?
  response_message  String?
  response_payload  Json?
  response_timestamp DateTime?

  status            CBMSSyncStatus
  error_message     String?

  attempt_number    Int       @default(1)
  next_retry_at     DateTime?

  created_at        DateTime  @default(now())
  updated_at        DateTime  @updatedAt

  @@index([restaurant_id, status])
  @@index([type, reference_id])
  @@index([status, next_retry_at])
}

enum CBMSSyncType {
  INVOICE
  CREDIT_NOTE
}

enum CBMSSyncStatus {
  PENDING
  IN_PROGRESS
  SUCCESS
  FAILED
  SKIPPED
}
```

## 13.5 Restaurant CBMS Config Table

```prisma
model RestaurantCBMSConfig {
  id                String    @id @default(cuid())
  restaurant_id     String    @unique

  enabled           Boolean   @default(false)
  api_url           String    @default("https://cbapi.ird.gov.np")

  username          String    // Encrypted
  password          String    // Encrypted
  seller_pan        String

  sync_mode         CBMSSyncMode @default(REALTIME)
  batch_interval    Int       @default(5)
  max_retry         Int       @default(3)
  retry_delay       Int       @default(15)

  last_sync_at      DateTime?
  last_sync_status  String?
  credentials_valid Boolean   @default(true)

  created_at        DateTime  @default(now())
  updated_at        DateTime  @updatedAt

  restaurant        Restaurant @relation(fields: [restaurant_id], references: [id])
}

enum CBMSSyncMode {
  REALTIME
  BATCH
  MANUAL
}
```

---

# 14. API IMPLEMENTATION

## 14.1 CBMS Service

```typescript
// lib/services/cbms.service.ts

interface CBMSConfig {
  apiUrl: string;
  username: string;
  password: string;
  sellerPan: string;
}

interface CBMSResponse {
  success: boolean;
  code: number;
  message: string;
}

export class CBMSService {
  private config: CBMSConfig;
  private restaurantId: string;

  constructor(restaurantId: string) {
    this.restaurantId = restaurantId;
  }

  async initialize(): Promise<boolean> {
    const config = await prisma.restaurantCBMSConfig.findUnique({
      where: { restaurant_id: this.restaurantId }
    });

    if (!config || !config.enabled) return false;

    this.config = {
      apiUrl: config.api_url,
      username: decrypt(config.username),
      password: decrypt(config.password),
      sellerPan: config.seller_pan
    };

    return true;
  }

  async postInvoice(invoice: {
    buyerPan?: string;
    buyerName: string;
    fiscalYear: string;
    invoiceNumber: string;
    invoiceDate: string;
    totalSales: number;
    taxableSalesVat: number;
    vat: number;
  }): Promise<CBMSResponse> {

    const payload = {
      username: this.config.username,
      password: this.config.password,
      seller_pan: this.config.sellerPan,
      buyer_pan: invoice.buyerPan || '',
      buyer_name: invoice.buyerName,
      fiscal_year: invoice.fiscalYear,
      invoice_number: invoice.invoiceNumber,
      invoice_date: invoice.invoiceDate,
      total_sales: invoice.totalSales,
      taxable_sales_vat: invoice.taxableSalesVat,
      vat: invoice.vat,
      excisable_amount: 0,
      excise: 0,
      taxable_sales_hst: 0,
      hst: 0,
      amount_for_esf: 0,
      esf: 0,
      export_sales: 0,
      tax_exempted_sales: 0,
      isrealtime: true,
      datetimeClient: new Date().toISOString()
    };

    try {
      const response = await fetch(`${this.config.apiUrl}/api/bill`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(30000)
      });

      const result = await response.json();
      const code = result.code || response.status;

      return {
        success: code === 200 || code === 101,
        code,
        message: this.getResponseMessage(code)
      };

    } catch (error) {
      return {
        success: false,
        code: 0,
        message: `Network error: ${error.message}`
      };
    }
  }

  private getResponseMessage(code: number): string {
    const messages: Record<number, string> = {
      200: 'Success - Invoice synced',
      100: 'Auth failed - Check credentials',
      101: 'Invoice already exists',
      102: 'Save error - Check data',
      103: 'Unknown error',
      104: 'Invalid model - Missing fields',
      105: 'Invoice not found'
    };
    return messages[code] || `Unknown: ${code}`;
  }
}
```

## 14.2 Invoice Number Generator

```typescript
// lib/services/invoice-number.service.ts

export class InvoiceNumberService {

  async generateNextNumber(
    restaurantId: string,
    branchCode: string = '001'
  ): Promise<string> {

    const fiscalYear = getCurrentFiscalYear();
    const prefix = `${fiscalYear}-${branchCode}-`;

    return await prisma.$transaction(async (tx) => {
      const lastInvoice = await tx.invoice.findFirst({
        where: {
          restaurant_id: restaurantId,
          invoice_number: { startsWith: prefix }
        },
        orderBy: { invoice_number: 'desc' },
        select: { invoice_number: true }
      });

      let nextSequence = 1;

      if (lastInvoice) {
        const parts = lastInvoice.invoice_number.split('-');
        const lastSeq = parseInt(parts[parts.length - 1], 10);
        nextSequence = lastSeq + 1;
      }

      const seqStr = nextSequence.toString().padStart(5, '0');
      return `${prefix}${seqStr}`;
    });
  }

  validateFormat(invoiceNumber: string): boolean {
    const pattern = /^\d{4}-[A-Z0-9]{1,5}-\d{5}$/;
    return pattern.test(invoiceNumber);
  }
}
```

## 14.3 Nepal Date Utilities

```typescript
// lib/utils/nepal-date.ts

import NepaliDate from 'nepali-date-converter';

// AD to BS: "2081.10.15"
export function adToBS(adDate: Date): string {
  const nd = new NepaliDate(adDate);
  const y = nd.getYear();
  const m = (nd.getMonth() + 1).toString().padStart(2, '0');
  const d = nd.getDate().toString().padStart(2, '0');
  return `${y}.${m}.${d}`;
}

// BS to AD
export function bsToAD(bsDate: string): Date {
  const [y, m, d] = bsDate.split('.').map(Number);
  const nd = new NepaliDate(y, m - 1, d);
  return nd.toJsDate();
}

// Get current fiscal year: "2081.082"
export function getCurrentFiscalYear(): string {
  const today = new NepaliDate();
  const year = today.getYear();
  const month = today.getMonth(); // 0-indexed

  // Shrawan is month 3 (0-indexed)
  if (month < 3) {
    return `${year - 1}.${year.toString().slice(-3)}`;
  }
  return `${year}.${(year + 1).toString().slice(-3)}`;
}

// Today in BS
export function getTodayBS(): string {
  return adToBS(new Date());
}
```

## 14.4 Number to Words

```typescript
// lib/utils/number-to-words.ts

const ones = [
  '', 'One', 'Two', 'Three', 'Four', 'Five',
  'Six', 'Seven', 'Eight', 'Nine', 'Ten',
  'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen',
  'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'
];

const tens = [
  '', '', 'Twenty', 'Thirty', 'Forty',
  'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'
];

export function numberToWords(amount: number): string {
  if (isNaN(amount)) return '';
  if (amount === 0) return 'Zero Rupees Only';

  const rupees = Math.floor(amount);
  const paisa = Math.round((amount - rupees) * 100);

  let result = '';

  if (rupees > 0) {
    result = convert(rupees) + ' Rupees';
  }

  if (paisa > 0) {
    result += (result ? ' and ' : '') + convert(paisa) + ' Paisa';
  }

  return result + ' Only';
}

function convert(num: number): string {
  if (num === 0) return '';
  if (num < 20) return ones[num];
  if (num < 100) {
    return tens[Math.floor(num / 10)] +
           (num % 10 ? ' ' + ones[num % 10] : '');
  }
  if (num < 1000) {
    return ones[Math.floor(num / 100)] + ' Hundred' +
           (num % 100 ? ' ' + convert(num % 100) : '');
  }
  if (num < 100000) {
    return convert(Math.floor(num / 1000)) + ' Thousand' +
           (num % 1000 ? ' ' + convert(num % 1000) : '');
  }
  if (num < 10000000) {
    return convert(Math.floor(num / 100000)) + ' Lakh' +
           (num % 100000 ? ' ' + convert(num % 100000) : '');
  }
  return convert(Math.floor(num / 10000000)) + ' Crore' +
         (num % 10000000 ? ' ' + convert(num % 10000000) : '');
}

// Examples:
// numberToWords(1765.06)
// => "One Thousand Seven Hundred Sixty Five Rupees and Six Paisa Only"
```

---

# 15. APPENDIX

## 15.1 Glossary

| Term | Nepali | Description |
|------|--------|-------------|
| IRD | आन्तरिक राजस्व विभाग | Inland Revenue Department |
| CBMS | केन्द्रीय बिलिङ अनुगमन प्रणाली | Central Billing Monitoring System |
| PAN | स्थायी लेखा नम्बर | Permanent Account Number |
| VAT | मूल्य अभिवृद्धि कर | Value Added Tax (13%) |
| BS | बि.सं. | Bikram Sambat (Nepali calendar) |

## 15.2 Nepal Calendar Months

| # | Month | English |
|---|-------|---------|
| 1 | Baishakh | Apr-May |
| 2 | Jestha | May-Jun |
| 3 | Ashad | Jun-Jul |
| 4 | Shrawan | Jul-Aug |
| 5 | Bhadra | Aug-Sep |
| 6 | Ashwin | Sep-Oct |
| 7 | Kartik | Oct-Nov |
| 8 | Mangsir | Nov-Dec |
| 9 | Poush | Dec-Jan |
| 10 | Magh | Jan-Feb |
| 11 | Falgun | Feb-Mar |
| 12 | Chaitra | Mar-Apr |

**Fiscal Year:** Shrawan 1 to Ashad 31

## 15.3 Response Codes

### Invoice API

| Code | Message | Action |
|------|---------|--------|
| 200 | Success | ✅ Mark synced |
| 100 | Auth failed | Check credentials |
| 101 | Already exists | ✅ Skip |
| 102 | Save error | Retry |
| 103 | Unknown error | Log & retry |
| 104 | Invalid model | Check fields |

### Credit Note API

| Code | Message | Action |
|------|---------|--------|
| 200 | Success | ✅ Mark synced |
| 105 | Bill not found | Check ref_invoice |

## 15.4 Environment Variables

```env
# Database
DATABASE_URL="postgresql://..."

# CBMS
CBMS_API_URL="https://cbapi.ird.gov.np"
CBMS_TEST_URL="http://202.166.207.75:9050"

# Encryption
ENCRYPTION_KEY="your-32-char-key"

# Cron
CRON_SECRET="your-secret"

# Features
ENABLE_CBMS_SYNC="true"
CBMS_SYNC_MODE="REALTIME"
```

## 15.5 IRD Contact

| Item | Value |
|------|-------|
| Office | Lazimpat, Kathmandu |
| Website | https://ird.gov.np |
| Taxpayer Portal | https://taxpayerportal.ird.gov.np |
| CBMS Portal | https://cbms.ird.gov.np |
| IT Support | 9851185946 |

## 15.6 NPM Packages

| Package | Purpose |
|---------|---------|
| nepali-date-converter | Date conversion |
| prisma | Database ORM |
| zod | Validation |
| node-cron | Background jobs |

---

# DOCUMENT SUMMARY

## Files in This Series

| File | Content |
|------|---------|
| IRD_ROADMAP_1A.md | Overview, Requirements, CBMS API, Invoice Format |
| IRD_ROADMAP_1B.md | Database Rules, Hosting, Registration, Roadmap |
| IRD_ROADMAP_1C.md | Database Schema, Code Implementation, Appendix |

## Quick Reference

### Thresholds
- Restaurants: > NPR 5 Crore
- General: > NPR 10 Crore
- Real-time CBMS: > NPR 25 Crore

### Key URLs
- Production: `https://cbapi.ird.gov.np/api/bill`
- Test: `http://202.166.207.75:9050/api/bill`

### Invoice Format
- Pattern: `{FISCAL_YEAR}-{BRANCH}-{SEQUENCE}`
- Example: `2081-KTM-00001`

### Key Requirements
1. SQL Database
2. No hard deletes
3. Audit trail
4. CBMS integration
5. Server in Nepal (cloud)
6. User manual

---

**END OF DOCUMENT**

*Part of QR DINE Project Documentation*
