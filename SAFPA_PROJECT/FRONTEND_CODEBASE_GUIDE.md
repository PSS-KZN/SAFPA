# SAFPA Frontend Codebase Guide

## 1) What this frontend is

The frontend is a React + TypeScript + Vite application for SAFPA FPOS.

It provides:
- Role-based dashboards and workflows
- CRUD screens for core domains (parlours, branches, users, products, leads, members, policies, collections, funeral cases, documents, communications, reports)
- Parlour branding management, logo upload, and hosted website readiness/publishing flows
- Tenant-aware shell branding for parlour-scoped users
- HTTP client integration to the backend API
- Session persistence in localStorage for demo role switching

Default frontend URL:
- http://localhost:5173

Default backend base URL used by frontend:
- http://localhost:4000

Developer API reference also available from the backend:
- http://localhost:4000/api/docs

## 2) Stack

- React 19
- TypeScript
- Vite
- React Router 7
- Tailwind CSS 4 via the Vite plugin
- Recharts
- lucide-react

## 3) Folder layout (frontend)

- frontend/src/main.tsx
  - StrictMode bootstrap and global stylesheet import

- frontend/src/App.tsx
  - Route map, role-based route guards, and default redirects by role

- frontend/src/components/layout/
  - App shell components (sidebar/topbar/layout)

- frontend/src/contexts/RoleContext.tsx
  - Session user context, localStorage persistence, and demo role switching

- frontend/src/contexts/TenantBrandingContext.tsx
  - Fetches the active parlour record for non-SAFPA users so layout and parlour pages can render tenant branding

- frontend/src/pages/
  - Domain pages by module:
    - audit
    - collections
    - communications
    - documents
    - funeralCases
    - leads
    - members
    - parlour
    - policies
    - reports
    - safpa
    - website

- frontend/src/services/
  - API clients by domain (one file per module)

- frontend/src/index.css
  - Tailwind import, theme tokens, and shared UI utility classes

- frontend/vite.config.ts
  - React and Tailwind Vite plugins plus manual vendor chunk splitting

- frontend/src/types/
  - Shared TS types used by pages and services

- frontend/src/data/
  - Demo static data still used for role/user simulation in RoleContext

## 4) Routing and role access

App.tsx uses:
- BrowserRouter
- ProtectedRoute wrappers
- role-based default paths

Main role landing routes:
- safpa_admin -> /safpa
- parlour_owner -> /parlour
- branch_manager -> /parlour
- policy_admin -> /members
- collections_clerk -> /collections
- operations_coordinator -> /funeral-cases
- reporting_analyst -> /reports

If a user visits a route they are not allowed to access, they are redirected to the role default route.

Additional route groups currently exposed:
- SAFPA admin: parlours, subscriptions, resources
- Parlour owner: branches, users, products, branding workspace, communication templates, website preview
- Shared operational routes: leads, members, policies, collections, funeral cases, communications, reports, documents
- Reporting analyst: reports only
- Audit log route: /audit-log for safpa_admin and parlour_owner

## 5) Session and request behavior

RoleContext.tsx:
- Stores current user session in localStorage key: safpa_session
- Provides switchRole for demo role changes
- Restores session on refresh from localStorage
- Primes a default session on first load so initial API calls carry actor headers immediately

TenantBrandingContext.tsx:
- Loads the active parlour record for non-admin users with a parlourId
- Drives branded layout surfaces such as the sidebar, top bar, and parlour dashboard

services/http.ts:
- Uses VITE_API_BASE_URL if set, otherwise defaults to http://localhost:4000
- Reads safpa_session and injects request headers:
  - x-user-id
  - x-user-name
  - x-user-role
  - x-parlour-id (if available)
  - x-branch-id (if available)
  - Authorization: Bearer <userId>
- Resolves relative asset paths such as /uploads/branding/... against the backend origin for logo rendering

This header model aligns with backend auth/scope middleware.

## 6) Service layer design

Each service file in frontend/src/services maps to backend domain routes.

During frontend integration or debugging, the backend Swagger UI at `http://localhost:4000/api/docs` can be used to inspect available endpoints grouped by business module.

Examples:
- parloursApi.ts -> /api/parlours, /api/parlours/:id/branding, /api/parlours/:id/logo, /api/parlours/availability/subdomain
- branchesApi.ts -> /api/branches
- usersApi.ts -> /api/users
- leadsApi.ts -> /api/leads
- membersApi.ts -> /api/members
- policiesApi.ts -> /api/policies
- paymentsApi.ts -> /api/payments
- communicationsApi.ts -> /api/communications
- documentsApi.ts -> /api/documents
- funeralCasesApi.ts -> /api/funeral-cases
- reportsApi.ts -> /api/reports
- resourcesApi.ts -> /api/resources
- subscriptionsApi.ts -> /api/subscriptions
- auditApi.ts -> /api/audit

Pattern:
1. Page calls service function
2. Service uses request/jsonRequest from http.ts
3. Backend validates, authorizes, and responds
4. Page updates local component state

Branding-specific behavior:
- Branding.tsx loads the current parlour profile, edits brand colors/contact/profile fields, checks SAFPA-hosted subdomain availability, and can publish when readiness requirements are met
- Logo uploads use multipart FormData through parloursApi.ts and are then rendered via resolveAssetUrl
- WebsitePreview.tsx renders a tenant website preview from saved branding fields rather than static mock-only content

## 7) Styling and UI behavior

- Global styles are in frontend/src/index.css
- Tailwind CSS 4 is loaded with @import "tailwindcss"
- Shared theme tokens define typography and animation, alongside reusable card, badge, button, and table utility classes
- Layout is responsive, role-aware, and branding-aware for parlour tenants
- Page-level loading/error states are implemented for API-backed views

Production build behavior:
- Vite splits vendor output into dedicated chunks for React, router, charts, lucide, and remaining vendor code

## 8) Environment variables

Common frontend variable:
- VITE_API_BASE_URL

If not set, frontend calls backend at:
- http://localhost:4000

## 9) NPM scripts (frontend/package.json)

- npm run dev
  - Start Vite dev server

- npm run build
  - Type-check and build production bundle

- npm run preview
  - Preview built app

- npm run lint
  - Run ESLint

## 10) How to run frontend

### Option A: from frontend folder

1. cd frontend
2. npm install
3. npm run dev

```bash
cd frontend
npm install
npm run dev
```

### Option B: from project root

```bash
npm --prefix frontend install
npm --prefix frontend run dev
```

Note:
- There is no root package.json script for dev.
- npm run dev from root (without --prefix) will fail.

## 11) Known demo-mode behavior

- RoleContext currently uses frontend/src/data/users.ts to simulate user selection
- API calls still use backend for domain data and mutations
- The provider primes a default safpa_session on first load so initial API requests include actor headers
- Tenant branding is not mocked in the layout; it is fetched from the backend parlour record for the active parlour context
- Demo user data includes a dedicated `reporting_analyst` user for reports-only access
- This keeps role-switching quick for demo while using backend persistence for flows

## 12) Quick troubleshooting

- Frontend loads but API calls fail:
  - Ensure backend is running on port 4000
  - Verify `VITE_API_BASE_URL` if using a non-default backend URL
  - Use `http://localhost:4000/api/docs` or `http://localhost:4000/api/routes` to confirm the backend endpoint exists

- 401 or 403 responses:
  - Ensure `safpa_session` exists and includes role/parlour context
  - Switch role in top bar to one allowed for the route

- Logos or branding images do not render:
  - Ensure the backend is serving the correct base URL for `/uploads/...` assets
  - Verify `VITE_API_BASE_URL` points to the backend that owns the uploaded branding files

- Empty tables:
  - Ensure backend seed has been run
  - Confirm current role/parlour scope can view that module data
