# SAFPA FPOS — Role & Page Reference

**Platform:** SAFPA Funeral Parlour Operating System (FPOS)  
**Version:** Demo v1.0  
**Date:** April 2026

This document describes every user role in the system, the pages each role can access, and every tab or section available within those pages.

---

## Access Enforcement (Demo v1.0)

The demo now enforces role permissions at both navigation and route level.

- **Route guards are active**: Direct URL access to pages outside a role's permission set is blocked and redirected to that role's default landing page.
- **Branch Manager data is branch-scoped**: Leads, Members, Policies, Collections, Funeral Cases, Documents, and related detail pages only show records for the manager's assigned branch.
- **Branch Manager member onboarding restriction**: Branch Managers can access member list and detail pages only. They cannot access Add Member or Bulk Import routes.
- **Policy Admin document scope**: On the Documents page, Policy Admin sees only member and policy documents.
- **Operations Coordinator document scope**: On the Documents page, Operations Coordinator sees only funeral case documents.

---

## Aesthetic & Theme
To align with the sensitive and professional nature of the funeral industry, the SAFPA FPOS UI is built using a **Clean, Dignified, and Professional Aesthetic**:
- **Backgrounds**: Soft, respectful light slate (`#f8fafc`).
- **Typography**: Clean, highly legible *Inter* font.
- **Accents**: Deep, grounding navy/charcoal sidebars (`#0f172a`) with subtle blue accents.
- **Components**: Crisp white cards with elegant, diffused shadows and smooth, calming interactive transitions.

---

## Roles Overview

| Role | Display Name | Default Landing Page | Description |
|------|-------------|---------------------|-------------|
| `safpa_admin` | SAFPA Admin | SAFPA Dashboard | National association administrator. Manages member parlours, aggregate reporting, and resources. |
| `parlour_owner` | Parlour Owner | Parlour Dashboard | Owner of a funeral parlour. Full access to their tenant including branches, staff, products, collections, and reporting. |
| `branch_manager` | Branch Manager | Parlour Dashboard | Manages a single branch. Can see members, policies, collections, funeral cases, and communications scoped to their branch. |
| `policy_admin` | Policy Admin | Members | Handles member registration, policy lifecycle, dependants, beneficiaries, and document management. |
| `collections_clerk` | Collections Clerk | Collections | Monitors premiums, processes failed payments, manages arrears follow-up, and imports reconciliation files. |
| `operations_coordinator` | Operations Coordinator | Funeral Cases | Manages funeral case workflow from death notice to closure, including tasks, staff, vehicles, and family communications. |

---

## Role-by-Role Page Access

---

### 1. SAFPA Admin (`safpa_admin`)

The SAFPA Admin role has full visibility across all participating parlours at an aggregate level. They cannot access operational tenant data unless explicitly permitted.

**Demo user:** Kagiso Mabena / Nomvula Khumalo

---

#### SAFPA Dashboard `/safpa`

The national overview dashboard.

| Section | What it shows |
|---------|--------------|
| KPI Cards | Total parlours, active parlours, total members across the network, total policies, collection rate (%), new leads this month |
| Collections Trend Chart | Monthly bar chart of premiums collected vs due across all parlours |
| Policy Status Breakdown | Pie chart showing the split of active, suspended, lapsed, draft, and pending policies |
| Member Growth Chart | Line chart showing cumulative member growth across participating parlours |
| Parlour Overview Table | List of all parlours with region, tier, onboarding progress bar, member count, branch count, and a View link |

---

#### Parlour Management `/safpa/parlours`

List and management of all SAFPA member parlours.

| Section | What it shows |
|---------|--------------|
| Parlour Table | Name, region, tier badge (basic/standard/premium), status badge (onboarding/active/suspended), onboarding progress %, member count, branch count, View action |
| Add Parlour Button | Opens form to create a new parlour tenant |

**Parlour Detail** `/safpa/parlours/:id`

| Section | What it shows |
|---------|--------------|
| Parlour Info Card | Name, status badge, tier, total members, contact email/phone, joined date |
| Onboarding Progress | Step-by-step checklist (tenant created, branches configured, users added, website live, data imported, payment connected) |
| Users | Grid of users for this parlour with role badges and status |
| Branches | Table of branches with city, province, manager name, status |

---

#### Resources & Notices `/safpa/resources`

Publish and manage resources for member parlours (FR-007).

| Section | What it shows |
|---------|--------------|
| Resource Type Stats | Count cards for each type: Notice, Training, Partner, Policy, Template |
| Search & Filter Bar | Full-text search; filter by type (all / notice / training / partner / policy / template) |
| Resource Cards | Each card shows: type badge, title, description, tags, file size, published date, published by, Download button |
| Publish Resource Button | Opens form to create and publish a new resource |

**Resource types:**
- **Notice** — Association announcements and event communications
- **Training** — Guides, toolkits, and educational materials
- **Partner** — Approved commercial partners with negotiated member rates
- **Policy** — Regulatory updates, codes of conduct, and compliance bulletins
- **Template** — Reusable communication and operational templates

---

#### Reports `/reports`

Aggregate analytics across the SAFPA network.

| Section | What it shows |
|---------|--------------|
| Collections Report Chart | Bar chart: monthly collected vs due across all parlours |
| Member Growth Chart | Line chart: new members per month and total member count |
| Funeral Volume Chart | Bar chart: number of funeral cases per month |
| Policy Distribution Chart | Pie chart: breakdown of policy products |
| Export CSV Button | Downloads collections report as a CSV file |

> Note: The Branch Performance table is hidden for SAFPA Admin — it is only relevant at parlour level.

---

#### Audit Log `/audit-log`

Full system-wide audit trail of sensitive actions.

| Section | What it shows |
|---------|--------------|
| Search Bar | Filter by user name, action type, or entity label |
| Action Filter | Dropdown to filter by specific action types |
| Audit Table | Timestamp, user name, user role badge, action badge, entity type + label, detail description |

SAFPA Admin sees audit entries across all parlours.

---

### 2. Parlour Owner (`parlour_owner`)

The Parlour Owner has full access to their own parlour's tenant. They can configure, manage, and report on all aspects of their business.

**Demo users:** Bongani Ndlovu, Ayanda Cele, Noxolo Mtshali

---

#### Parlour Dashboard `/parlour`

Operational overview for the parlour.

| Section | What it shows |
|---------|--------------|
| KPI Cards | Active members, active policies, collection rate (%), total arrears, open funeral cases, new leads this month |
| Monthly Collections Chart | Bar chart of collections for the current year |
| Member Growth Chart | Line chart showing member growth trend |
| Recent Activity Log | Last 5 system events (payments, case updates, new members) |

---

#### Branches `/parlour/branches`

Manage the parlour's physical branches.

| Section | What it shows |
|---------|--------------|
| Branch Cards Grid | Each card: branch name, status badge (active/inactive), address, city/province, manager name, phone number, Edit and Deactivate buttons |
| Add Branch Button | Opens form to create a new branch |

---

#### Users `/parlour/users`

Manage staff user accounts and roles.

| Section | What it shows |
|---------|--------------|
| Users Table | Avatar initials, full name, email address, role badge, status badge (active/inactive), Edit and Deactivate actions |
| Add User Button | Opens form to create a new user and assign a role |

---

#### Products `/parlour/products`

Configure funeral cover products and packages.

| Section | What it shows |
|---------|--------------|
| Product Cards Grid | Each card: product name, description, premium from (R), cover from (R), waiting period (days), max dependants, active/inactive status, Edit and Activate/Deactivate buttons |
| Add Product Button | Opens form to create a new product |

---

#### Communication Templates `/parlour/comm-templates`

Manage SMS and email templates for automated and manual messages.

| Section | What it shows |
|---------|--------------|
| Stats Row | Count of SMS templates, email templates, and active templates |
| Type Filter Tabs | All / SMS / EMAIL |
| Template Cards | Each card: channel badge (SMS/Email), template name, active/inactive badge, trigger type, last updated date, email subject (if applicable), body preview |
| Expand/Preview Button | Reveals full template body and list of available merge variables |
| Edit Button | Opens template editor |
| Activate/Deactivate Toggle | Enables or disables the template |
| New Template Button | Opens form to create a new template |

**Trigger types:**
- Payment Reminder
- Payment Receipt
- Policy Activated
- Policy Lapsed
- Policy Suspended
- Funeral Case Update
- Welcome
- Custom

---

#### Website Preview `/website`

View and configure the parlour's auto-generated public website.

| Section | What it shows |
|---------|--------------|
| Hero Section | Parlour name, tagline, Call to Action buttons (Our Services, Get a Quote) |
| Services Section | Three service cards (Funeral Services, Memorial Services, Repatriation) |
| Packages Section | Three pricing cards built from the parlour's active products |
| Contact Form | Name, phone, email, message fields with Submit button |
| Footer | Parlour name, address, phone, email, social links |

---

#### Leads `/leads`

CRM pipeline for prospective members.

| Section | What it shows |
|---------|--------------|
| Status Filter Tabs | All / New / Contacted / Qualified / Converted / Lost |
| Leads Table | Full name, phone, source (website/branch/agent/referral), status badge, assigned to, created date, View action |
| Add Lead Button | Opens form to capture a new lead |

**Lead Detail** `/leads/:id`

| Section | What it shows |
|---------|--------------|
| Contact Info Card | Name, phone, email, source, date, assigned to |
| Notes Editor | Existing notes list, text input to add a new note |
| Action Buttons | Mark Contacted, Convert to Member, Mark Lost |

---

#### Members `/members`

Full member register for the parlour.

| Section | What it shows |
|---------|--------------|
| Search Bar | Filter members by name, ID number, or phone |
| Members Table | Full name, ID number, phone, policy count, status badge (active/inactive/suspended), join date, View action |
| Add Member Button | Opens 4-step registration wizard |
| Bulk Import Button | Opens CSV/Excel import tool |

**Add Member Wizard** `/members/new`

| Step | What it collects |
|------|-----------------|
| Step 1 — Personal Info | First name, last name, ID number, phone, email, address, city, province, branch |
| Step 2 — Dependants | Add dependants (name, ID, relationship, date of birth) |
| Step 3 — Beneficiary | Add beneficiaries (name, ID, relationship, percentage split) |
| Step 4 — Package | Select product/package; shows premium, cover, waiting period |

**Bulk Import** `/members/import`

| Section | What it shows |
|---------|--------------|
| File Upload Dropzone | Drag and drop or browse for CSV/Excel file |
| Validation Preview Table | Each row shown with valid/error status; invalid rows highlighted |
| Download Template Button | Downloads the standard import template |
| Import Button | Processes valid rows |

**Member Detail** `/members/:id`

| Section | What it shows |
|---------|--------------|
| Member Header | Avatar initials, full name, ID number, status badge |
| Contact Details Card | Phone, email, address, join date |
| Dependants Card | List of dependants with relationship and date of birth |
| Beneficiaries Card | List of beneficiaries with relationship and percentage |
| Policies Table | Policy number, product, premium, cover, status badge, View link |
| Payment History Table | Date, amount, method, reference, status badge |
| Documents Section | Uploaded documents with type badge, uploader, date, size; Upload button; drop zone |

---

#### Policies `/policies`

Policy register for the parlour.

| Section | What it shows |
|---------|--------------|
| Status Filter Tabs | All / Active / Suspended / Lapsed / Draft / Pending |
| Policies Table | Policy number, member name, product, premium, cover amount, status badge, arrears amount, View action |

**Policy Detail** `/policies/:id`

| Section | What it shows |
|---------|--------------|
| Policy Header | Policy number, status badge (all 8 states styled) |
| Policy Details Card | Product name, premium/month, cover amount, billing frequency, start date, next due date |
| Policyholder Card | Member name, ID, phone, email with link to member profile |
| Financial Status Card | Arrears amount, last payment date, Record Payment button, Reinstate button |
| Status Timeline | Chronological list of lifecycle events (created, activated, suspended, lapsed, reinstated) |
| Payment History Table | Date, amount, method, reference, status badge |
| Documents Section | Uploaded documents with type badge; Upload button; drop zone |

**Policy statuses:** draft · pending · active · suspended · lapsed · reinstated · cancelled · closed

---

#### Collections `/collections`

Premium collection monitoring and reconciliation.

| Tab | What it shows |
|-----|--------------|
| **Overview** | 4 KPI cards (Collected, Failed, Pending, In Arrears); Collections Trend bar chart (collected vs failed by month) |
| **Transactions** | Payment table: date, member, policy number, amount, method, reference, status badge, Receipt link |
| **Arrears** | Policies with outstanding balances: policy number, product, premium, arrears amount, status badge, last payment date, Send Reminder and View Policy actions |
| **Reconciliation** | File upload dropzone for provider settlement files; Download Template button; Previous Imports table (file name, imported by, date, matched count, exceptions count, status) |

**Receipt View** `/collections/receipt/:id`

| Section | What it shows |
|---------|--------------|
| Receipt Card | Reference number, date, member name, policy number, payment method, status, amount (large display) |
| Print Button | Triggers browser print |

---

#### Funeral Cases `/funeral-cases`

Funeral service case management.

| Section | What it shows |
|---------|--------------|
| Status Filter Tabs | All / Logged / In Progress / Scheduled / Completed / Archived |
| Cases Table | Case number, deceased name, date of death, funeral date, type (policy/cash/private), coordinator, status badge, task progress bar, View action |
| New Case Button | Opens case creation form |

**New Funeral Case** `/funeral-cases/new`

| Section | What it collects |
|---------|-----------------|
| Deceased Info | Full name, ID number, date of death |
| Case Type | Policy-linked / Cash / Private |
| Member Search | Searches existing members if policy-linked |
| Service Details | Funeral date, coordinator, venue |

**Funeral Case Detail** `/funeral-cases/:id`

| Section | What it shows |
|---------|--------------|
| Case Header | Case number, status badge |
| Deceased Info Card | Name, ID, date of death, funeral date, venue, coordinator, case type, linked policy badge |
| Task Checklist | Progress bar (completed/total), clickable task rows (toggle complete/incomplete), assignee and due date per task, Add Task button |
| Notes Section | Existing notes list, add note input |
| Staff Assigned Card | List of assigned staff with roles, Remove button, Assign Staff button |
| Vehicles Card | Assigned vehicles with registration, type, driver, Remove button, Assign Vehicle button |
| Suppliers Card | Assigned suppliers with service and confirmed/pending status, Add Supplier button |
| Documents Section | Case documents with type badges, uploader, date; Upload button; drop zone |
| Communication Log | Per-case SMS/email history with recipient, message, date; Send Communication button |

---

#### Communications `/communications`

Log of all outbound messages sent from the parlour.

| Section | What it shows |
|---------|--------------|
| Type Filter Tabs | All / SMS / Email |
| Communications Table | Channel type badge, recipient name, contact (phone/email), template name, subject (email only), delivery status badge, sent timestamp |

---

#### Documents `/documents`

Central document repository for the parlour.

| Section | What it shows |
|---------|--------------|
| Summary Stats | Document count by entity type (Member, Policy, Funeral Case) and total |
| Search Bar | Filter by document name or linked entity name |
| Entity Type Filter | All / Members / Policies / Funeral Cases |
| Document Type Filter | All / ID Copy / Death Certificate / Proof of Address / Policy Document / Receipt / Burial Order / Consent Form / Other |
| Documents Table | File name, document type badge, entity type badge, linked entity name, uploaded by, upload date, file size, View and Delete actions |
| Upload Drop Zone | Drag and drop or browse to upload a new document |

---

#### Reports `/reports`

Parlour-level analytics and exports.

| Section | What it shows |
|---------|--------------|
| Collections Report Chart | Bar chart: monthly collected vs due |
| Member Growth Chart | Line chart: new members and total members |
| Funeral Volume Chart | Bar chart: number of cases per month |
| Policy Distribution Chart | Pie chart: breakdown by product |
| Branch Performance Table | Branch name, member count, collection rate % |
| Export CSV Button | Downloads collections data |

---

#### Audit Log `/audit-log`

Audit trail scoped to this parlour's tenant.

| Section | What it shows |
|---------|--------------|
| Search Bar | Filter by user, action, or entity |
| Action Filter | Dropdown to filter by action type |
| Audit Table | Timestamp, user name, role badge, action badge, entity type + label, detail |

---

### 3. Branch Manager (`branch_manager`)

The Branch Manager sees the same parlour dashboard and operational pages as the Parlour Owner but cannot access parlour-level configuration (branches, users, products, templates, website).

**Demo users:** Thabo Mokoena, Zanele Mkhize

**Accessible pages:**

| Page | Notes |
|------|-------|
| Parlour Dashboard `/parlour` | Same KPI and chart view as owner |
| Leads `/leads` and `/leads/:id` | Branch-scoped leads |
| Members `/members` and `/members/:id` | Branch-scoped member list and detail |
| Policies `/policies` and `/policies/:id` | Branch-scoped policy list and detail |
| Collections `/collections` | Branch-scoped data across all 4 tabs: Overview, Transactions, Arrears, Reconciliation |
| Funeral Cases `/funeral-cases` and detail | Full case workflow |
| Communications `/communications` | Delivery log |
| Documents `/documents` | Branch-scoped documents |
| Reports `/reports` | Includes branch performance table |

**Not accessible:** SAFPA Admin pages, Branches config, Users, Products, Comm. Templates, Website Preview, Audit Log.

---

### 4. Policy Admin (`policy_admin`)

Focused on the member and policy lifecycle. Lands on Members.

**Demo user:** Lindiwe Sithole

**Accessible pages:**

| Page | Notes |
|------|-------|
| Leads `/leads` and `/leads/:id` | Capture and convert leads |
| Members `/members`, `/members/new`, `/members/import`, `/members/:id` | Full member management including wizard and bulk import |
| Policies `/policies` and `/policies/:id` | Full policy lifecycle management |
| Communications `/communications` | View delivery log |
| Documents `/documents` | Upload and manage member and policy documents (funeral case docs hidden for this role) |
| Reports `/reports` | Collections and member reports (no branch performance) |

**Not accessible:** SAFPA Admin pages, Parlour config, Collections (financial), Funeral Cases, Audit Log.

---

### 5. Collections Clerk (`collections_clerk`)

Focused entirely on premium collection and financial reconciliation. Lands on Collections.

**Demo user:** Mpho Tau

**Accessible pages:**

| Page | Notes |
|------|-------|
| Collections `/collections` | Full access to all 4 tabs |
| Communications `/communications` | View and send payment reminders |
| Reports `/reports` | Collections-focused reporting |

**Collections tabs in detail:**

| Tab | Clerk's actions |
|-----|----------------|
| Overview | Monitor daily collection KPIs and trends |
| Transactions | Review each payment; open receipts |
| Arrears | Identify overdue policies; trigger Send Reminder |
| Reconciliation | Import provider settlement file; review matched/exception counts; view import history |

**Not accessible:** SAFPA Admin pages, Members, Policies, Funeral Cases, Documents, Audit Log.

---

### 6. Operations Coordinator (`operations_coordinator`)

Manages funeral service delivery from first contact to case closure. Lands on Funeral Cases.

**Demo user:** Sibongile Mthembu

**Accessible pages:**

| Page | Notes |
|------|-------|
| Funeral Cases `/funeral-cases`, `/funeral-cases/new`, `/funeral-cases/:id` | Full case workflow |
| Communications `/communications` | View and send case-related messages |
| Documents `/documents` | Upload and manage case documents (member/policy docs hidden for this role) |

**Funeral Case Detail sections in detail:**

| Section | Coordinator's actions |
|---------|-----------------------|
| Task Checklist | Toggle tasks complete; view assignees and due dates |
| Staff Assigned | Assign and remove staff from a case |
| Vehicles | Assign and remove vehicles |
| Suppliers | Add suppliers and confirm service status |
| Documents | Upload death certificates, burial orders, ID copies |
| Communication Log | View case communications; send updates to family |
| Notes | Add operational notes to the case record |

**Not accessible:** SAFPA Admin pages, Parlour config, Members, Policies, Collections, Audit Log.

---

## Summary Matrix

| Page / Feature | SAFPA Admin | Parlour Owner | Branch Manager | Policy Admin | Collections Clerk | Ops Coordinator |
|----------------|:-----------:|:-------------:|:--------------:|:------------:|:-----------------:|:---------------:|
| SAFPA Dashboard | ✓ | — | — | — | — | — |
| Parlour Management | ✓ | — | — | — | — | — |
| Resources & Notices | ✓ | — | — | — | — | — |
| Parlour Dashboard | — | ✓ | ✓ | — | — | — |
| Branches | — | ✓ | — | — | — | — |
| Users | — | ✓ | — | — | — | — |
| Products | — | ✓ | — | — | — | — |
| Comm. Templates | — | ✓ | — | — | — | — |
| Website Preview | — | ✓ | — | — | — | — |
| Leads | — | ✓ | ✓ | ✓ | — | — |
| Members | — | ✓ | ✓ | ✓ | — | — |
| Policies | — | ✓ | ✓ | ✓ | — | — |
| Collections | — | ✓ | ✓ | — | ✓ | — |
| Funeral Cases | — | ✓ | ✓ | — | — | ✓ |
| Communications | — | ✓ | ✓ | ✓ | ✓ | ✓ |
| Documents | — | ✓ | ✓ | ✓ | — | ✓ |
| Reports | ✓ | ✓ | ✓ | ✓ | ✓ | — |
| Audit Log | ✓ | ✓ | — | — | — | — |

---

## Switching Roles in the Demo

The demo includes a **Role Switcher** in the top navigation bar. Selecting a different role will:
1. Switch to the corresponding demo user account.
2. Navigate automatically to that role's default landing page.
3. Update the sidebar to show only the pages accessible to that role.

This allows a single demo session to demonstrate all six user perspectives without separate logins.
