# SAFPA Frontend Codebase Guide

## 1) What this frontend is

The frontend is a React + TypeScript + Vite application for SAFPA FPOS.

It provides:
- Role-based dashboards and workflows
- CRUD screens for core domains (parlours, branches, users, products, leads, members, policies, collections, funeral cases, documents, communications, reports)
- HTTP client integration to the backend API
- Session persistence in localStorage for demo role switching

Default frontend URL:
- http://localhost:5173

Default backend base URL used by frontend:
- http://localhost:4000

## 2) Stack

- React 19
- TypeScript
- Vite
- React Router
- Tailwind CSS
- Recharts
- lucide-react

## 3) Folder layout (frontend)

- frontend/src/main.tsx
  - App bootstrap

- frontend/src/App.tsx
  - Route map and role-based route guards

- frontend/src/components/layout/
  - App shell components (sidebar/topbar/layout)

- frontend/src/contexts/RoleContext.tsx
  - Session user context and role switching

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

## 5) Session and request behavior

RoleContext.tsx:
- Stores current user session in localStorage key: safpa_session
- Provides switchRole for demo role changes
- Restores session on refresh from localStorage

services/http.ts:
- Uses VITE_API_BASE_URL if set, otherwise defaults to http://localhost:4000
- Reads safpa_session and injects request headers:
  - x-user-id
  - x-user-name
  - x-user-role
  - x-parlour-id (if available)
  - x-branch-id (if available)
  - Authorization: Bearer <userId>

This header model aligns with backend auth/scope middleware.

## 6) Service layer design

Each service file in frontend/src/services maps to backend domain routes.

Examples:
- parloursApi.ts -> /api/parlours
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
- auditApi.ts -> /api/audit

Pattern:
1. Page calls service function
2. Service uses request/jsonRequest from http.ts
3. Backend validates, authorizes, and responds
4. Page updates local component state

## 7) Styling and UI behavior

- Global styles are in frontend/src/index.css
- Tailwind is used for utility styling
- Layout is responsive and role-aware
- Page-level loading/error states are implemented for API-backed views

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
- This keeps role-switching quick for demo while using backend persistence for flows

## 12) Quick troubleshooting

- Frontend loads but API calls fail:
  - Ensure backend is running on port 4000
  - Verify `VITE_API_BASE_URL` if using a non-default backend URL

- 401 or 403 responses:
  - Ensure `safpa_session` exists and includes role/parlour context
  - Switch role in top bar to one allowed for the route

- Empty tables:
  - Ensure backend seed has been run
  - Confirm current role/parlour scope can view that module data
