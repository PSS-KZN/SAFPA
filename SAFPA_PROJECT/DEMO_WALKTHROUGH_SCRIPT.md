# SAFPA FPOS Demo Walkthrough Script

## Purpose

Use this script to guide a live demo of SAFPA FPOS for management. It is structured to show the platform from national oversight down to customer self-service, while keeping the story focused on business value.

Recommended demo length: 12 to 18 minutes.

---

## Demo Goal

Position SAFPA FPOS as a single operating system that helps:

- SAFPA manage member parlours at federation level
- funeral parlours run daily operations across branches and staff
- teams manage leads, members, policies, collections, and funeral cases in one place
- customers self-serve for policy and payment needs

Core message to repeat during the demo:

"This is not just a dashboard. It is a role-based operating platform that gives SAFPA national oversight, gives parlours operational control, and gives customers a cleaner digital experience."

---

## Before You Start

Make sure:

- backend is running on `http://localhost:4000`
- frontend is running on `http://localhost:5173`
- you start from the login page: `http://localhost:5173/login`
- you keep the left sidebar expanded so navigation is easy to follow for your manager

Demo password for all users: `demo123`

Useful demo accounts:

- SAFPA Admin: `kagiso@safpa.org.za`
- Parlour Owner: `bongani@ubuntufunerals.co.za`
- Policy Admin: `lindiwe@ubuntufunerals.co.za`
- Collections Clerk: `mpho@ubuntufunerals.co.za`
- Operations Coordinator: `sibongile@ubuntufunerals.co.za`
- Customer Portal: `sibusiso.m@gmail.com`

To switch roles during the demo:

1. Click `Logout` in the lower left sidebar.
2. On the login page, select the next role.
3. Choose the matching user and sign in with `demo123`.

---

## Suggested Demo Flow

Use this order unless you need a shorter version:

1. SAFPA Admin
2. Parlour Owner
3. Policy Admin
4. Collections Clerk
5. Operations Coordinator
6. Customer Portal

This flow tells a clean story from federation oversight to front-line operations to end customer experience.

---

## Opening Script

"I want to show you SAFPA FPOS as a full operating environment for the funeral parlour ecosystem. The platform is multi-tenant and role-based, so SAFPA sees network-wide adoption and performance, while each parlour sees only the tools and data relevant to its business. I’ll walk from national oversight, into parlour operations, and then end in the customer portal."

---

## 1. SAFPA Admin Demo

Login as:

- Role: `SAFPA Admin`
- User: `kagiso@safpa.org.za`

Landing page: `SAFPA Dashboard`

### What to click

1. Open `SAFPA Dashboard`.
2. Pause on the KPI cards and adoption snapshot cards.
3. Scroll to the collections trend, policy breakdown, member growth, and parlour overview table.
4. Open `Parlour Management`.
5. Click into one parlour detail record.
6. Open `Resources & Notices`.
7. Open `Reports`.
8. Open `Audit Log`.

### What to say

"At the SAFPA level, the system gives a national view of parlour performance, onboarding, activity health, and adoption. This is important because SAFPA is not managing day-to-day funeral operations directly, but it does need visibility into member growth, collections quality, and whether parlours are actually active on the platform."

"The parlour management view is where SAFPA can monitor onboarding progress, tenant health, branch setup, and user readiness. That means the platform supports both oversight and intervention."

"Resources and notices allow SAFPA to distribute templates, training, policy updates, and partner material centrally. So the platform is not only transactional, it also becomes a member enablement channel."

"The audit log provides traceability for sensitive actions across the network, which matters for governance, support, and trust."

### Value line

"For SAFPA, this turns member digitisation into something measurable, manageable, and scalable."

---

## 2. Parlour Owner Demo

Login as:

- Role: `Parlour Owner`
- User: `bongani@ubuntufunerals.co.za`

Landing page: `Dashboard`

### What to click

1. Open `Dashboard`.
2. Point out active members, policies, collection rate, arrears, open funeral cases, and new leads.
3. Open `Branches`.
4. Open `Users`.
5. Open `Products`.
6. Open `Branding`.
7. Open `Website Preview`.
8. Open `Comm. Templates`.

### What to say

"This is the owner view of a single funeral parlour. The platform brings together the commercial side of the business, the operational side, and the customer-facing side in one workspace."

"From one dashboard, the owner can see business health: members, policy activity, collections performance, arrears exposure, and operational case load."

"Branches and users show that this is not a single-office tool. It supports distributed teams and role-based access across the business."

"Products define the funeral cover offerings, while branding and website preview show how the parlour can maintain a digital presence without building a separate website stack from scratch."

"Communication templates support consistent outbound messaging for reminders, receipts, policy events, and customer updates."

### Value line

"For the owner, this is the control center for revenue, service delivery, staff, and brand."

---

## 3. Policy Admin Demo

Login as:

- Role: `Policy Admin`
- User: `lindiwe@ubuntufunerals.co.za`

Landing page: `Policy Overview`

### What to click

1. Open `Policy Overview`.
2. Open `Leads`.
3. Open one lead detail record.
4. Open `Members`.
5. Open one member detail record.
6. Open `Policies`.
7. Open one policy detail record.
8. Open `Documents`.
9. Open `Communications`.

### What to say

"This role shows the member and policy servicing engine. The journey starts with a lead, converts into a member, becomes an active policy, and then continues through documents and communication history."

"This is important because many funeral parlours still manage this process across paper files, WhatsApp, and spreadsheets. Here it is structured and visible."

"The documents area keeps policy and member documentation in one place, and communications provides a shared record of what has been sent or triggered."

### Value line

"For administration teams, the platform reduces fragmentation and gives a clean member-to-policy lifecycle."

---

## 4. Collections Clerk Demo

Login as:

- Role: `Collections Clerk`
- User: `mpho@ubuntufunerals.co.za`

Landing page: `Collections`

### What to click

1. Open `Collections`.
2. Point out due premiums, failed payments, receipts, and arrears indicators.
3. Open a receipt if one is visible.
4. Open `Communications`.
5. Open `Reports`.

### What to say

"Collections is where the revenue protection story becomes visible. The team can monitor what is due, what has failed, and where arrears follow-up is needed."

"Because collections is linked to communications and reporting, this is not an isolated finance screen. It supports follow-up, accountability, and performance tracking."

"For a funeral parlour, stronger collection discipline directly improves cash flow and reduces revenue leakage."

### Value line

"For finance teams, the platform turns premium collection into an actively managed process instead of a reactive clean-up exercise."

---

## 5. Operations Coordinator Demo

Login as:

- Role: `Operations Coordinator`
- User: `sibongile@ubuntufunerals.co.za`

Landing page: `Operations Overview`

### What to click

1. Open `Operations Overview`.
2. Open `Funeral Cases`.
3. Open one funeral case detail page.
4. Open `Documents`.
5. Open `Communications`.
6. Open `Reports`.

### What to say

"This role demonstrates that the product is not only about policies and payments. It also supports the actual service delivery side of the business."

"Funeral cases can be tracked from notification through scheduling, document handling, communications, and closure. That gives operations teams a clearer workflow and better coordination during a sensitive process."

"This matters because funeral service quality is not only operational; it directly affects customer trust and brand reputation."

### Value line

"For operations, the platform brings structure and visibility to a process that is normally high-pressure and time-sensitive."

---

## 6. Customer Portal Demo

Login as:

- Role: `Policyholder / Customer`
- User: `sibusiso.m@gmail.com`

Landing page: `My Policy`

### What to click

1. Open `My Policy`.
2. Open `Payments`.
3. Open `Support`.

### What to say

"The last part of the demo is the customer experience. The same platform that supports SAFPA and parlour staff also extends into self-service for the policyholder."

"Customers can view policy information, see payment-related information, and access support from a dedicated portal experience."

"This helps modernise the customer relationship while reducing manual support pressure on the parlour."

### Value line

"For customers, the platform creates transparency and easier access to service."

---

## Close The Demo

Suggested closing statement:

"What I wanted to show is that SAFPA FPOS is not a narrow point solution. It connects federation oversight, parlour management, policy administration, collections, funeral operations, communications, reporting, and customer self-service in one role-based platform. That gives SAFPA a scalable digitisation model and gives parlours a practical operating system for growth and control."

---

## If You Need A Shorter 5-Minute Version

Use only these three stops:

1. `SAFPA Admin` for national oversight and parlour management
2. `Parlour Owner` for branches, branding, website, and operations control
3. `Policyholder / Customer` for self-service

Short closing line:

"The platform works at three levels: federation oversight, parlour operations, and customer service."

---

## Live Demo Tips

- Move slowly on dashboard pages and narrate the business meaning, not only the widgets.
- Prefer one strong example per page instead of trying to explain every card.
- If data on a page looks busy, summarize the outcome: oversight, control, collections, service delivery, or self-service.
- If something loads slowly, use the moment to reinforce the architecture: multi-role, multi-tenant, single platform.
- If time is tight, skip detailed record pages and stay on overview screens.

---

## Optional Q&A Answers

### If asked, "What is the real differentiator here?"

"The differentiator is that the platform connects SAFPA-level oversight with real parlour operating workflows, instead of offering only a reporting layer or only a parlour back-office tool."

### If asked, "Why does role-based access matter?"

"Because different users need different data and responsibilities. The owner, policy admin, collections clerk, operations coordinator, and customer should not all see the same interface or data scope."

### If asked, "Why is the customer portal important?"

"It shows that the platform improves not only internal administration, but also customer trust, transparency, and accessibility."