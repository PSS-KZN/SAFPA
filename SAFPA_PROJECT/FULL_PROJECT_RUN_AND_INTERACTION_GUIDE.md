# SAFPA Full Project Run and Interaction Guide

## 1) Project shape

This project is split into two applications:

- frontend/
  - React + Vite web app

- backend/
  - Express + TypeScript + Prisma API service

There is no root package.json script orchestrating both apps.
Run each app from its own folder, or use npm --prefix from the project root.

## 2) High-level architecture

1. User opens frontend in browser (http://localhost:5173)
2. Frontend page calls a service in frontend/src/services
3. services/http.ts sends request to backend (default http://localhost:4000)
4. Backend static `/uploads` serving exposes stored assets such as branding logos
5. Backend authScopeMiddleware resolves actor and applies role/tenant restrictions
6. Domain route validates payload with Zod
7. Prisma reads/writes SQLite database
8. Route writes audit logs for key state changes
9. Response returns to frontend and page updates UI state

## 3) Prerequisites

- Node.js installed
- npm available
- Ports available:
  - 5173 for frontend
  - 4000 for backend

## 4) First-time setup (recommended)

From project root:

1. Install frontend dependencies
```bash
npm --prefix frontend install
```

2. Install backend dependencies
```bash
npm --prefix backend install
```

3. Prepare backend database and client
```bash
npm --prefix backend run prisma:generate
npm --prefix backend run prisma:push
npm --prefix backend run prisma:seed
```

## 5) Daily run (two terminals)

### Terminal 1: backend

From project root:
```bash
npm --prefix backend run dev
```

or from backend folder:
```bash
cd backend
npm run dev
```

### Terminal 2: frontend

From project root:
```bash
npm --prefix frontend run dev
```

or from frontend folder:
```bash
cd frontend
npm run dev
```

## 6) Why npm run dev from project root fails

This repository does not have a root package.json with a dev script.
So this command fails:
```bash
npm run dev
```

Use one of these patterns instead:
```bash
npm --prefix backend run dev
npm --prefix frontend run dev
```

## 7) Environment configuration

Backend env (backend/.env):
- DATABASE_URL=file:./dev.db
- PORT=4000
- FRONTEND_ORIGIN=http://localhost:5173

Frontend env (optional):
- VITE_API_BASE_URL=http://localhost:4000

If VITE_API_BASE_URL is not set, frontend defaults to http://localhost:4000.

## 8) How auth, role, and scope work together

### Frontend side

- RoleContext stores selected session in localStorage key: safpa_session
- RoleContext primes a default session on first load so initial API requests include actor headers
- TenantBrandingContext fetches the active parlour record for non-SAFPA users so tenant shell branding stays in sync with backend parlour data
- services/http.ts reads safpa_session and sends headers:
  - x-user-id
  - x-user-name
  - x-user-role
  - x-parlour-id
  - x-branch-id
  - Authorization: Bearer <userId>
- services/http.ts also resolves relative asset paths such as `/uploads/branding/...` against the backend origin for branded logos

### Backend side

- authScopeMiddleware reads headers/token and resolves actor
- Falls back to header-only actor resolution for demo role switching when a valid role header is present
- Applies role-based route permissions
- Applies tenant restrictions by parlour and branch where relevant
- Static `/uploads` serving exposes uploaded documents and branding logos from backend storage
- Rejects unauthorized requests with 401/403

## 9) How data and modules interact

### Core modules

- SAFPA admin: parlours, subscriptions, resources, network reporting, audit
- Parlour admin: branches, users, products, templates, branding workspace, website config
- Operations/CRM: leads, members, policies, payments, collections, funeral cases
- Shared records: documents, communications, reports, audit

### Typical flow example

Website lead to reporting:
1. Website form submits lead to backend
2. Lead appears in leads module
3. Lead is converted to member
4. Member gets policy
5. Payment and billing events are recorded
6. Communication reminders/receipts are logged
7. Reports aggregate this data
8. Audit trail captures key transitions

## 10) Files and storage interactions

- Database:
  - SQLite file from DATABASE_URL

- Uploaded documents:
  - Stored on disk in backend/uploads
  - Metadata stored in DocumentRecord table
  - Download endpoint serves file by document id

- Uploaded branding logos:
  - Stored on disk in backend/uploads/branding
  - Asset path stored on the Parlour record
  - Served through backend static `/uploads` routing

- Tenant branding state:
  - Loaded from the backend parlour record, not just frontend mock data
  - Consumed by tenant shell components, branding workspace, parlour dashboard, and website preview

## 11) Automation interactions

- Billing and reconciliation flows are exposed through payments routes
- Reminder automation is exposed via communications route:
  - POST /api/communications/run-reminders
- Subscription administration is exposed via subscriptions routes for SAFPA admin workflows
- Branding and website publishing interactions are exposed through parlours routes:
  - PATCH /api/parlours/:id/branding
  - POST /api/parlours/:id/logo
  - GET /api/parlours/availability/subdomain
- These actions write to communication logs and audit logs

## 12) Build and verification

### Build both apps

- npm --prefix backend run build
- npm --prefix frontend run build

### Branding-focused backend verification

- npm --prefix backend run test:branding

Frontend production build notes:
- frontend build runs TypeScript project build plus Vite bundle generation
- Vite splits vendor output into separate chunks for React, router, charts, lucide, and remaining vendor code

### Health check backend

- GET http://localhost:4000/api/health

### Example smoke checks (PowerShell)

- Invoke-RestMethod -Method Get -Uri 'http://localhost:4000/api/health'

- Check subdomain availability:
```powershell
Invoke-RestMethod -Method Get -Uri 'http://localhost:4000/api/parlours/availability/subdomain?value=ubuntu-funerals'
```

You can run additional endpoint checks using x-user-* headers to verify role-scoped behavior.

## 13) Troubleshooting

- Frontend cannot reach backend:
  - ensure backend dev server is running
  - check VITE_API_BASE_URL and backend PORT

- CORS errors:
  - ensure FRONTEND_ORIGIN in backend/.env matches frontend URL

- Branding images do not load:
  - ensure backend dev server is running and serving `/uploads`
  - check that the stored logo path points to the same backend configured in `VITE_API_BASE_URL`

- Empty UI data:
  - run backend seed script
  - confirm role/parlour context is not filtering results out

- Branding publish blocked:
  - ensure required branding fields are complete in the branding workspace
  - confirm the chosen SAFPA-hosted subdomain is valid and available

- Prisma client/runtime errors:
  - run `npm --prefix backend run prisma:generate`
  - run `npm --prefix backend run prisma:push`

## 14) What each guide covers

- BACKEND_CODEBASE_GUIDE.md
  - Backend architecture, routes, security, and operations

- FRONTEND_CODEBASE_GUIDE.md
  - Frontend structure, routing, services, and run flow

- FULL_PROJECT_RUN_AND_INTERACTION_GUIDE.md
  - End-to-end startup steps and how frontend/backend work together
