# SAFPA Backend Codebase Guide

## 1) What this backend is

The backend is an Express + TypeScript API using Prisma with SQLite for demo persistence.

It is responsible for:
- Domain APIs for all major modules
- Authentication/session resolution and tenant scope enforcement
- Role-based access checks in middleware
- Subscription-tier feature limits
- Input validation via Zod
- Database persistence via Prisma
- Audit logging for important state-changing actions

Default API base URL:
- http://localhost:4000

Default frontend origin expected by CORS:
- http://localhost:5173

## 2) Stack

- Runtime: Node.js
- API server: Express 5
- Language: TypeScript
- Validation: Zod
- ORM: Prisma
- Demo database: SQLite
- Upload handling: multer
- Spreadsheet parsing for imports: xlsx

## 3) Backend layout

- backend/src/server.ts
  - App bootstrap, middleware, and route mounting

- backend/src/routes/
  - Domain routers:
    - auth.ts
    - parlours.ts
    - branches.ts
    - users.ts
    - products.ts
    - leads.ts
    - members.ts
    - policies.ts
    - payments.ts
    - templates.ts
    - communications.ts
    - documents.ts
    - funeralCases.ts
    - reports.ts
    - audit.ts
    - resources.ts

- backend/src/lib/
  - prisma.ts: shared Prisma client
  - audit.ts: centralized audit writer
  - id.ts: ID generation helper
  - session.ts: actor/session resolution + role/scope middleware
  - subscription.ts: tier limit checks

- backend/src/types/express.d.ts
  - Request type extension for resolved actor context

- backend/prisma/schema.prisma
  - Data models

- backend/prisma/seed.ts
  - Demo data seeding

- backend/.env
  - Runtime configuration

## 4) Environment variables

From backend/.env.example:

- DATABASE_URL="file:./dev.db"
- PORT=4000
- FRONTEND_ORIGIN=http://localhost:5173

## 5) NPM scripts (backend/package.json)

- npm run dev
  - Starts development server with ts-node-dev

- npm run build
  - Compiles TypeScript to dist

- npm run start
  - Starts compiled server from dist/server.js

- npm run prisma:generate
  - Generates Prisma client

- npm run prisma:push
  - Pushes schema to database

- npm run prisma:seed
  - Seeds demo data

## 6) How to run backend

### Option A: from backend folder

1. cd backend
2. npm install
3. npm run prisma:generate
4. npm run prisma:push
5. npm run prisma:seed
6. npm run dev

```bash
cd backend
npm install
npm run prisma:generate
npm run prisma:push
npm run prisma:seed
npm run dev
```

### Option B: from project root

```bash
npm --prefix backend install
npm --prefix backend run prisma:generate
npm --prefix backend run prisma:push
npm --prefix backend run prisma:seed
npm --prefix backend run dev
```

Important:
- There is no root package.json script for dev.
- Running npm run dev from the project root (without --prefix backend or --prefix frontend) will fail.

## 7) Request flow and security model

Current middleware order in server.ts:

1. CORS
2. express.json()
3. authScopeMiddleware
4. Route handlers

How authScopeMiddleware works (session.ts):

1. Allows configured public endpoints:
   - /api/health
   - /api/auth/login
   - /api/auth/session
   - /api/leads/website-inquiry
2. Resolves actor from:
   - x-user-id header, or
   - Authorization: Bearer <userId>
3. Loads active user from AppUser where possible
4. Applies role permissions by route prefix and method
5. Applies tenant scope checks:
   - Non-admin users are constrained to their parlourId
   - Branch managers are constrained to their branch for report queries

Headers commonly used:
- x-user-id
- x-user-name
- x-user-role
- x-parlour-id (optional)
- x-branch-id (optional)
- Authorization: Bearer <userId>

## 8) Route map

Mounted in server.ts:

- /api/health
- /api/auth
- /api/parlours
- /api/branches
- /api/users
- /api/products
- /api/leads
- /api/members
- /api/policies
- /api/payments
- /api/templates
- /api/communications
- /api/documents
- /api/funeral-cases
- /api/reports
- /api/audit
- /api/resources

## 9) Data model overview

Core Prisma models:

- Parlour, Branch, AppUser
- Product
- Lead
- Member
- Policy
- PaymentTransaction
- BillingEvent
- ReconciliationImport
- CommunicationTemplate
- CommunicationLog
- DocumentRecord
- ResourceAsset
- FuneralCase
- AuditEntry

Many workflow-heavy fields are JSON-based (tasks, dependants, beneficiaries, notes, metadata, tags).

## 10) Cross-cutting backend features

### 10.1 Audit logging

writeAuditLog is used across mutation-heavy routes to persist who changed what and when.

### 10.2 Subscription tier gates

subscription.ts enforces limits by parlour tier:
- branches count
- users count
- products count
- bulk import row limits
- report export availability

### 10.3 File upload/storage flow

documents.ts provides:
- Metadata-only document creation
- Multipart upload endpoint using multer memory storage
- Disk write into backend/uploads
- Download endpoint by document ID
- Disk cleanup when a stored document is deleted

### 10.4 Automation endpoint

communications.ts provides reminder automation:
- POST /api/communications/run-reminders
  - Creates reminder log rows for due/overdue policies
  - Writes audit entry for dispatch run

## 11) Auth endpoints

Implemented in auth.ts:

- POST /api/auth/login
  - Accepts userId or email
  - Returns token and user payload

- GET /api/auth/session
  - Validates actor from x-user-id or Bearer token
  - Returns authenticated true/false plus user payload

## 12) Adding a new endpoint (recommended pattern)

1. Add Zod schema in the domain router
2. Implement route handler
3. Perform Prisma read/write
4. Add writeAuditLog for state changes
5. Return typed JSON payload
6. Run npm run build
7. Smoke-test endpoint with role/scope headers

## 13) Quick troubleshooting

- Prisma client errors:
  - npm run prisma:generate

- DB schema drift:
  - npm run prisma:push

- Missing demo data:
  - npm run prisma:seed

- CORS issue from frontend:
  - verify FRONTEND_ORIGIN in backend/.env

- Root terminal dev command fails:
  - use `npm --prefix backend run dev`
  - run frontend separately with `npm --prefix frontend run dev`

- File upload/download issues:
  - ensure backend process can read/write backend/uploads

## 14) Current implementation status

Backend domain APIs are implemented and compile successfully.

Validated flows include:
- Website lead intake + lead conversion
- Member creation and bulk import
- Policy/payment updates and arrears flow
- Reconciliation import records
- Communication send + reminder automation
- Document upload/download/delete lifecycle
- Funeral case updates and task progression
- Reporting endpoints including network and filtered dashboards
- Audit logging across core mutations
