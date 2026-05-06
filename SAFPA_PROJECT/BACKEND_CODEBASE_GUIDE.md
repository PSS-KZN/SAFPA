# SAFPA Backend Codebase Guide

## 1) What this backend is

The backend is an Express + TypeScript API using Prisma with SQLite for demo persistence.

It is responsible for:
- Domain APIs for all major modules
- Parlour branding, hosted website readiness, subdomain checks, and logo asset management
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
- Image validation/inspection for branding logos: sharp
- Spreadsheet parsing for imports: xlsx
- API documentation UI: swagger-ui-express

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
    - subscriptions.ts

- backend/uploads/
  - Runtime storage for uploaded files, including branding logos under backend/uploads/branding

- backend/src/lib/
  - prisma.ts: shared Prisma client
  - audit.ts: centralized audit writer
  - id.ts: ID generation helper
  - openapi.ts: generated OpenAPI document builder for Swagger UI
  - routeCatalog.ts: route enumeration helper used by `/api/routes` and `/api/docs`
  - session.ts: actor/session resolution + role/scope middleware
  - subscription.ts: tier limit checks

- backend/src/types/express.d.ts
  - Request type extension for resolved actor context

- backend/prisma/schema.prisma
  - Data models, including parlour branding and website publishing fields

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

- npm run test:branding
  - Runs the Node test suite covering phase 7 parlour-branding authorization and publish constraints

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
3. Static /uploads file serving
4. Public Swagger/OpenAPI endpoints
5. Dev-only `/api/routes` endpoint
6. authScopeMiddleware
7. Route handlers

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
4. Falls back to header-only actor resolution for demo role switching when a valid role header is present
5. Applies role permissions by route prefix and method
6. Applies tenant scope checks:
   - Non-admin users are constrained to their parlourId
   - Branch managers are constrained to their branch for report queries

Special case rules:
- Parlour branding and logo routes under /api/parlours/:id/(branding|logo) are explicitly limited to safpa_admin and parlour_owner
- Website inquiry intake remains public through /api/leads/website-inquiry
- Reporting endpoints under `/api/reports` are available to `safpa_admin`, `parlour_owner`, `branch_manager`, `policy_admin`, `collections_clerk`, and `reporting_analyst`

Headers commonly used:
- x-user-id
- x-user-name
- x-user-role
- x-parlour-id (optional)
- x-branch-id (optional)
- Authorization: Bearer <userId>

## 8) Route map

Mounted in server.ts:

- /uploads (static files)
- /api/docs
- /api/docs/openapi.json
- /api/routes (development only)
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
- /api/subscriptions

Important parlour subroutes implemented in parlours.ts:
- GET /api/parlours/availability/subdomain
- GET /api/parlours/:id
- PATCH /api/parlours/:id/branding
- POST /api/parlours/:id/logo
- PATCH /api/parlours/:id/status

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
- ParlourSubscription
- FuneralCase
- AuditEntry

Many workflow-heavy fields are JSON-based (tasks, dependants, beneficiaries, notes, metadata, tags).

Parlour now also carries branding and website fields such as:
- primaryColor, secondaryColor, accentColor
- logo, tagline, businessDescription, supportEmail, supportPhone, physicalAddress
- websiteTemplate, websiteSubdomain, customDomain, customDomainStatus, customDomainDnsTarget, customDomainNotes
- websitePublished, websitePublishStatus, brandingCompletedAt

## 10) Cross-cutting backend features

### 10.0 API discovery and documentation

The backend now provides two developer-facing API discovery surfaces:

- Swagger UI at `/api/docs`
- Generated OpenAPI JSON at `/api/docs/openapi.json`

It also provides a development-only route index:

- `/api/routes`

Behavior:

- Swagger UI is public so the docs page can load without auth headers
- `/api/routes` is only mounted when `NODE_ENV` is not `production`
- The OpenAPI document is generated from the backend's mounted routers rather than maintained manually
- Swagger operations are grouped by business module such as Authentication, Parlour Management, Collections & Payments, Funeral Operations, and Reporting & Analytics

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

parlours.ts also provides branding logo upload handling:
- Multipart logo upload with in-memory buffering
- MIME validation limited to PNG, JPEG, and WebP
- Image dimension validation through sharp
- Disk write into backend/uploads/branding
- Cleanup of previously managed branding logo assets when replaced

### 10.4 Automation endpoint

communications.ts provides reminder automation:
- POST /api/communications/run-reminders
  - Creates reminder log rows for due/overdue policies
  - Writes audit entry for dispatch run

### 10.5 Subscription administration

subscriptions.ts provides SAFPA-admin subscription operations:
- Subscription listing and detail reads
- Create and update subscription records
- Access limited to SAFPA admin actors by authScopeMiddleware

### 10.6 Branding and hosted website workflow

parlours.ts provides branding-specific domain behavior:
- Subdomain availability checks for SAFPA-hosted tenant sites
- Automatic readiness evaluation based on required branding/profile fields
- Publish-state resolution across draft, ready, needs_review, and published
- Enforcement that a website cannot be published until branding readiness rules pass
- Audit logging for branding updates and logo uploads

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

For branding or upload changes, also run:
8. npm run test:branding

For route catalog or Swagger documentation changes, also:
9. Verify `/api/routes` and `/api/docs` locally

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

- Need to inspect available backend endpoints quickly:
  - open `http://localhost:4000/api/routes` for the development route index
  - open `http://localhost:4000/api/docs` for Swagger UI

- File upload/download issues:
  - ensure backend process can read/write backend/uploads

- Branding publish or subdomain issues:
  - verify the parlour has all required branding fields before requesting published status
  - check for subdomain conflicts with `GET /api/parlours/availability/subdomain?value=...`

## 14) Current implementation status

Backend domain APIs are implemented and compile successfully.

Validated flows include:
- Website lead intake + lead conversion
- Parlour branding updates, subdomain availability checks, and logo upload validation
- Member creation and bulk import
- Policy/payment updates and arrears flow
- Reconciliation import records
- Communication send + reminder automation
- Document upload/download/delete lifecycle
- Funeral case updates and task progression
- Reporting endpoints including network and filtered dashboards
- Audit logging across core mutations
- Generated route index and Swagger API docs
