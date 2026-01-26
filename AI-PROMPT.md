# QR DINE - AI Development Context

> **PASTE THIS ENTIRE FILE TO CLAUDE AT THE START OF EVERY SESSION**

---

## CRITICAL: Read Before Coding

You are helping build QR DINE, a restaurant management system.
All specifications have been finalized. DO NOT deviate from them.

**Reference Documents in Project**:
- `PROJECT-SPEC.md` - Complete system specification
- `ROADMAP.md` - 50-step development plan

**ALWAYS follow the specifications in these documents.**

---

## Project Quick Reference

### Tech Stack
- Next.js 14 (App Router), TypeScript, Tailwind CSS
- Prisma ORM, PostgreSQL
- Electron (Windows desktop app)
- Monorepo with Turborepo

### Project Structure
```
qr-dine/
├── apps/web/           # Next.js app
├── apps/desktop/       # Electron app
├── apps/license-server/# License API
├── packages/database/  # Prisma
├── packages/ui/        # Components
├── packages/types/     # TypeScript types
├── packages/utils/     # Utilities
└── packages/config/    # Configurations
```

### User Roles
SUPER_ADMIN, OWNER, MANAGER, CASHIER, WAITER, KITCHEN, HOST

### Key Business Rules
1. Guest count entered by STAFF ONLY (never guest)
2. Customer spending data hidden from Waiter/Cashier
3. Points shown to customers, spending shown to owners
4. License validates features for self-hosted installs
5. All tables must have restaurant_id (multi-tenant)

---

## Current Session

**Current Step**: [STEP NUMBER]
**Step Name**: [STEP NAME]

**What I Need**:
1. Complete code for this step
2. All files with full paths
3. All commands to run
4. Verification steps

---

## Coding Rules

1. TypeScript strict mode - no `any`
2. All inputs validated with Zod
3. All API responses use standard format
4. Always include restaurant_id for multi-tenancy
5. Always check permissions
6. Complete code only - no snippets or placeholders

---

## How to Respond

1. List all files to create/modify
2. Provide COMPLETE code for each file
3. List commands to run (in order)
4. Explain how to verify it works
5. Ask me to confirm before moving on

---

*Now, please help me with the current step.*
```

---

## How to Use These Files

### One-Time Setup
```
1. Create your project folder: C:\Projects\qr-dine
2. Create these 3 files in the root:
   - PROJECT-SPEC.md
   - ROADMAP.md
   - AI-PROMPT.md
3. Open folder in VS Code
```

### Every Time You Start Coding
```
1. Open VS Code with your project
2. Open Claude extension
3. Open AI-PROMPT.md
4. Copy EVERYTHING from AI-PROMPT.md
5. Paste to Claude chat
6. Add your current step info:

   "Current Step: 1 - Project Setup & Monorepo Structure

   Please begin this step."

7. Claude now knows everything and will follow the spec!
```

### When Starting a New Chat Session
```
Always paste AI-PROMPT.md first!

Then say:
"I'm continuing QR DINE development.
Current Step: [number]
Previous steps completed: [list]

Please continue with Step [number]."
```

---

## Visual Workflow
```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  YOUR WORKFLOW                                              │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 1. Open VS Code                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                         ↓                                   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 2. Open Claude Extension                            │   │
│  └─────────────────────────────────────────────────────┘   │
│                         ↓                                   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 3. Copy AI-PROMPT.md content                        │   │
│  └─────────────────────────────────────────────────────┘   │
│                         ↓                                   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 4. Paste to Claude + Add current step               │   │
│  └─────────────────────────────────────────────────────┘   │
│                         ↓                                   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 5. Claude provides code (following our spec!)       │   │
│  └─────────────────────────────────────────────────────┘   │
│                         ↓                                   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 6. You create files & run commands                  │   │
│  └─────────────────────────────────────────────────────┘   │
│                         ↓                                   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 7. Test & verify                                    │   │
│  └─────────────────────────────────────────────────────┘   │
│                         ↓                                   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 8. Update ROADMAP.md (mark step complete)           │   │
│  └─────────────────────────────────────────────────────┘   │
│                         ↓                                   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 9. Move to next step (repeat from step 4)           │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## If Claude Goes Wrong Direction

If VS Code Claude suggests something different from our spec:
```
"STOP. This doesn't match the PROJECT-SPEC.md.

According to our specification:
[paste the relevant section from PROJECT-SPEC.md]

Please follow the specification exactly."
