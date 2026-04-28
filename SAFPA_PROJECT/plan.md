## Defect Override Plan (Updated 2026-04-28)

This section supersedes the previous completion snapshot and tracks the active defect list raised in review.

### User-reported defects and implementation status

1. Fix branch manager dashboard.
- Completed: branch-scoped reporting now filters open funeral cases by `branchId` in backend reports aggregation.
- Completed: parlour dashboard now handles loading/error states properly and branch manager new-lead count is branch-scoped.

2. Show newly added products in Add Member.
- Completed: Add Member now loads products dynamically from `/api/products` (active products only).

3. After creating a member, return to members table.
- Completed: successful create now redirects to `/members` instead of staying on step 4.

4. Add lead functionality.
- Completed: Leads page now has a functional Add Lead modal wired to `POST /api/leads`.

5. Policy creation ownership/functionality visibility.
- Completed: Policies page now includes Create Policy flow (modal + API wiring).
- Completed: UI copy clarifies policy creation responsibility (Parlour Owner and Policy Admin).

6. Communications send message composer.
- Completed: Send Message now supports typed custom message and channel selection for `sms`, `email`, or `both`.

7. Documents filtering by selected member/policy/case.
- Completed: Documents page now includes linked-record filter in addition to entity type and document type.

8. Payment static portal location/functionality.
- Completed: Collections page now includes a dedicated `portal` tab for manual payment capture (policy, amount, method, status, date, reference).

### Remaining for release hardening

1. Add automated API contract/regression tests.
2. Execute full role-based UAT pass and close defects.
3. Freeze demo dataset and finalize walkthrough runbook.

---

## Plan: SAFPA Demo Functionalization (Backend + End-to-End)

Convert the current UI-first demo into a real end-to-end system by adding a backend API + database, wiring all create/manage actions (starting with Add Parlour), introducing subscription-tier feature gating, adding a separate reporting role/dashboard, and enabling workflow automation (billing events, lead conversion, communication triggers, documents, and reconciliation). This approach keeps the existing frontend screens and upgrades them to functional transactions with auditability.

**Mandatory repository structure (frontend/backend split)**
1. The solution must use distinct top-level folders with no mixed app/server code:
- frontend/ - React/Vite UI application only.
- backend/ - API, business logic, jobs, and persistence only.

2. Target folder layout for implementation:
- frontend/src, frontend/public, frontend/package.json
- backend/src, backend/prisma, backend/package.json
- shared/ (optional) for cross-cutting TypeScript contracts only (DTOs/enums), with zero runtime coupling.

3. Migration requirement from current state:
- Move existing Vite app content currently under safpa-fpos/ into frontend/.
- Keep backend implementation isolated in backend/ (no backend code under frontend/ and no frontend code under backend/).
- Frontend consumes backend only through HTTP API contracts; no direct DB access.

4. Separation guardrails:
- Independent build/test scripts per folder.
- Independent environment files: frontend/.env and backend/.env.
- CI must run frontend and backend pipelines separately.


**Steps**
1. Phase 1 - Foundation and architecture decisions (blocks all later phases).
2. Create a backend service in the same repo (recommended: Node + Express + TypeScript + Prisma + PostgreSQL/SQLite for demo), define REST API contracts for parlours, branches, users, products, leads, members, policies, payments, billing events, documents, templates, communications, funeral cases, reports, and audit logs (depends on step 1).
3. Introduce DB schema and seed scripts from existing mock data to preserve demo look-and-feel while enabling mutations; include tenant keys (parlourId, branchId), role scope, and lifecycle fields for policies/payments/cases (depends on step 2).
4. Add auth/session and role permissions in backend; extend role model with separate reporting role; enforce branch/parlour scope centrally in middleware (depends on step 2, parallel with step 3 after contracts stabilize).
5. Phase 2 - Frontend data integration and shared state.
6. Add API client layer and query/mutation hooks; replace direct imports from src/data with backend calls and optimistic UI/loading/error states; keep mock fallback only for local dev bootstrap (depends on step 2 and step 3).
7. Add global app state for authenticated user + tenant context and role-aware navigation; include reporting role landing route and guarded report pages (depends on step 4 and step 6).
8. Phase 3 - Admin and parlour management flows (core call requirement).
9. Implement SAFPA Admin CRUD for parlours, including fully working Add Parlour flow with validation, immediate list refresh, and detail view; auto-provision tenant defaults on creation (onboarding steps, default templates, default package placeholders) (depends on step 6).
10. Implement subscription tier management screens and backend rules; enforce tier feature gates (module access, limits for branches/users/products/import volume/report exports) and show upgrade prompts where blocked (depends on step 9).
11. Implement parlour admin CRUD for branches, users, branding settings, and products/packages; persist logo/color/contact/website settings used by the website generator (depends on step 6, parallel with step 10 once APIs exist).
12. Phase 4 - CRM, policy/member management, and website lead pipeline.
13. Make website inquiry form submit to backend lead endpoint; create lead records tied to parlour and source=website; show success tracking and anti-spam validation (depends on step 11).
14. Implement lead actions: contacted/lost updates and Convert to Member flow that creates member + optional starter policy and updates lead status atomically (depends on step 13).
15. Wire Add Member wizard and Bulk Import (CSV/Excel) to backend with validation report, duplicate detection, partial success handling, and downloadable error file (depends on step 6, parallel with step 14).
16. Implement configurable policy rules per product/parlour: waiting period, allowed status transitions, lapse/reinstate constraints, and beneficiary/dependant validation rules; enforce on policy actions and API layer (depends on step 11 and step 15).
17. Phase 5 - Collections, communications, documents, cases, reporting.
18. Add payment capture flow (card/credit/debit terminology, EFT/net banking options), static provider adapter for demo processing, scheduled billing event generation, arrears tracking, and reconciliation import processing (depends on step 16).
19. Enable automated communication triggers (payment reminders, receipts, policy updates) using template engine and communication log writes for SMS/email channels; keep provider adapters configurable with mock send mode for demo (depends on step 18).
20. Implement secure document upload/storage metadata flow (member/policy/case linkage, role checks, size/type validation, download permissions, audit entries) (depends on step 6, parallel with step 19).
21. Complete funeral case workflow actions (create/update milestones, assignments, checklist/task persistence, status progression to closure) and link communication/documents to case timeline (depends on step 6, parallel with step 20).
22. Build reporting role dashboard with role-specific metrics: active policies, premiums due vs collected, arrears, branch performance; support date/branch/product filters and CSV export from real aggregates (depends on step 18 and step 21).
23. Phase 6 - Hardening, demo script, and rollout readiness.
24. Add audit logging for all create/update/delete/status actions, plus critical read events where needed for compliance demo (depends on steps 9-22).
25. Seed an end-to-end demo scenario and script: add parlour -> configure branches/users/products/branding -> website lead -> convert to member -> create policy -> collect payment -> generate reminder/receipt -> upload docs -> open and close funeral case -> view reporting dashboard (depends on all prior phases).
26. Execute regression + role-based UAT and fix blockers; freeze demo data and handoff runbook for Thursday walkthrough (depends on step 25).

**What needs to be added (Gap-to-Feature Checklist)**
1. SAFPA Admin module additions:
- Working Add/Edit/Deactivate Parlour flows with backend persistence.
- Subscription tier CRUD (basic/standard/premium) plus feature limits.
- Dynamic onboarding progress and adoption tracking tied to real events.

2. Parlour Admin module additions:
- Branch CRUD with manager assignment and active/inactive controls.
- User CRUD with role assignment, activation, and scoped access rules.
- Branding settings CRUD (logo, primary color, contact details, website metadata).
- Product/package CRUD with waiting period and dependant limit configuration.

3. Website and Lead pipeline additions:
- Inquiry form submit endpoint and persistence as source=website leads.
- Anti-spam and required-field validation on inquiry submissions.
- Lead action handlers (contacted/lost/qualified) with audit entries.
- Lead-to-member conversion transaction creating linked customer records.

4. Policy and Member management additions:
- Add Member wizard submit flow to real API.
- Dependant and beneficiary validation rules and save/update actions.
- Configurable policy rules per parlour/product (waiting period, transitions).
- Enforced status transition logic (draft/pending/active/suspended/lapsed/reinstated/cancelled/closed).

5. Bulk import additions:
- CSV and Excel parser support with column mapping.
- Duplicate detection and validation report per row.
- Partial success import with downloadable error file.

6. Collections and reconciliation additions:
- Payment capture form and API write flow (debit/credit card, EFT/net banking).
- Static payment provider adapter for demo transaction outcomes.
- Scheduled billing event generation and monthly due processing.
- Overdue/arrears tracking updates and reminder trigger actions.
- Reconciliation file processing with matched/exception workflow.

7. Communication and document additions:
- Communication template create/edit/activate/deactivate actions.
- Automated triggers for payment reminders, receipts, and policy updates.
- Secure document upload flow with entity linking and permission checks.
- Download/view controls and full audit trail entries.

8. Funeral case management additions:
- New case submission persistence and assignment workflow.
- Milestone/task checklist create/update/complete persistence.
- Status progression from opening to closure with timeline updates.

9. Reporting role additions:
- Separate reporting role in auth, route guards, and sidebar.
- Reporting dashboard backed by real aggregates (not static arrays).
- Filters for date range, branch, and product plus export.

10. Platform-level additions:
- Backend API service, database schema, seed data, and migrations.
- Authentication/session handling with centralized role/tenant authorization.
- End-to-end audit logging for all critical state changes.
- Demo seed scenario and scripted walkthrough path for stakeholder review.


**Relevant files**
- c:/Users/Umar/Desktop/SAFPA/SAFPA_PROJECT/safpa-fpos/src/App.tsx - add reporting role routes, updated route guards, and API-ready app wrappers.
- Path note: entries below reference current locations; execution must relocate UI files to frontend/src and server files to backend/src per the mandatory split.

- Structure rule for execution: all UI files must live under frontend/src and all API/domain/data-access files must live under backend/src; no mixed ownership.

- c:/Users/Umar/Desktop/SAFPA/SAFPA_PROJECT/safpa-fpos/src/components/layout/Sidebar.tsx - role-aware navigation updates including reporting role and gated modules.
- c:/Users/Umar/Desktop/SAFPA/SAFPA_PROJECT/safpa-fpos/src/contexts/RoleContext.tsx - transition from static user switching to auth + permission context.
- c:/Users/Umar/Desktop/SAFPA/SAFPA_PROJECT/safpa-fpos/src/types/index.ts - extend domain models for policy rules, billing events, subscription gates, upload metadata, report filters.
- c:/Users/Umar/Desktop/SAFPA/SAFPA_PROJECT/safpa-fpos/src/pages/safpa/ParlourList.tsx - implement Add Parlour modal/form and CRUD wiring.
- c:/Users/Umar/Desktop/SAFPA/SAFPA_PROJECT/safpa-fpos/src/pages/safpa/ParlourDetail.tsx - onboarding, package assignment, and status management wiring.
- c:/Users/Umar/Desktop/SAFPA/SAFPA_PROJECT/safpa-fpos/src/pages/parlour/Branches.tsx - add branch CRUD flows.
- c:/Users/Umar/Desktop/SAFPA/SAFPA_PROJECT/safpa-fpos/src/pages/parlour/UserManagement.tsx - add user CRUD/role assignment/status actions.
- c:/Users/Umar/Desktop/SAFPA/SAFPA_PROJECT/safpa-fpos/src/pages/parlour/Products.tsx - add package CRUD and policy-rule configuration linkage.
- c:/Users/Umar/Desktop/SAFPA/SAFPA_PROJECT/safpa-fpos/src/pages/parlour/CommunicationTemplates.tsx - template CRUD + trigger mapping.
- c:/Users/Umar/Desktop/SAFPA/SAFPA_PROJECT/safpa-fpos/src/pages/website/WebsitePreview.tsx - inquiry submission and branding configuration consumption.
- c:/Users/Umar/Desktop/SAFPA/SAFPA_PROJECT/safpa-fpos/src/pages/leads/LeadDetail.tsx - status actions and Convert to Member transaction.
- c:/Users/Umar/Desktop/SAFPA/SAFPA_PROJECT/safpa-fpos/src/pages/members/AddMember.tsx - create member and policy starter flow.
- c:/Users/Umar/Desktop/SAFPA/SAFPA_PROJECT/safpa-fpos/src/pages/members/BulkImport.tsx - real import pipeline hookup.
- c:/Users/Umar/Desktop/SAFPA/SAFPA_PROJECT/safpa-fpos/src/pages/policies/PolicyDetail.tsx - record payment, reinstate, rule-aware status transitions.
- c:/Users/Umar/Desktop/SAFPA/SAFPA_PROJECT/safpa-fpos/src/pages/collections/CollectionsDashboard.tsx - billing/reconciliation/reminders workflow.
- c:/Users/Umar/Desktop/SAFPA/SAFPA_PROJECT/safpa-fpos/src/pages/funeralCases/NewFuneralCase.tsx - case creation API wiring.
- c:/Users/Umar/Desktop/SAFPA/SAFPA_PROJECT/safpa-fpos/src/pages/funeralCases/FuneralCaseDetail.tsx - task and milestone persistence.
- c:/Users/Umar/Desktop/SAFPA/SAFPA_PROJECT/safpa-fpos/src/pages/documents/DocumentsList.tsx - upload/download actions and filtering.
- c:/Users/Umar/Desktop/SAFPA/SAFPA_PROJECT/safpa-fpos/src/pages/communications/CommunicationLog.tsx - send message flow and trigger history.
- c:/Users/Umar/Desktop/SAFPA/SAFPA_PROJECT/safpa-fpos/src/pages/reports/ReportsDashboard.tsx - role-specific real metrics and filters.
- c:/Users/Umar/Desktop/SAFPA/SAFPA_PROJECT/safpa-fpos/src/utils/dataScope.ts - align frontend checks with backend permission rules.
- c:/Users/Umar/Desktop/SAFPA/SAFPA_PROJECT/safpa-fpos/src/data/* - replace static direct usage with seed-only role.
- c:/Users/Umar/Desktop/SAFPA/SAFPA_PROJECT/safpa-fpos/backend/* - new backend service (controllers/services/repos/jobs).
- c:/Users/Umar/Desktop/SAFPA/SAFPA_PROJECT/safpa-fpos/backend/prisma/schema.prisma - relational schema and enums.

**Verification**
1. Automated: frontend lint/build and backend typecheck/test; verify migrations and seed run successfully.
2. API verification: contract tests for core CRUD and lifecycle transitions (parlour, member, policy, payment, case).
3. Role verification: confirm each role sees only allowed routes/data (including separate reporting role).
4. Demo path verification: execute scripted journey end-to-end without manual data patching.
5. Data integrity checks: lead->member conversion links, payment->policy balance updates, billing events generated, arrears recalculated.
6. Reporting verification: dashboard totals reconcile against transactional tables for selected date/branch filters.
7. Non-functional smoke checks: upload limits, error handling, empty states, and reload persistence.

**Decisions**
- Chosen implementation depth: Real backend API + database (not frontend-only local storage).
- Reporting model: Separate reporting role with dedicated dashboard access.
- Repository structure decision: enforce a hard split into frontend/ and backend/ folders before feature wiring begins.

- Subscription scope: CRUD plus enforced in-app feature gating.
- Payments: Keep one static/mock provider adapter for demo while supporting multiple method options in UX and data model.

**Further Considerations**
1. Deployment shape for demo: single machine local stack versus cloud-hosted demo URL; recommendation is cloud-hosted staging to avoid local environment drift during stakeholder walkthrough.
2. If time compresses, keep reconciliation import to CSV-only for v1 and add Excel parsing next iteration while preserving same UI.
3. Decide database engine for demo day: SQLite (fast setup) or Postgres (closer to production); recommendation is Postgres if deployment is cloud-hosted.