# Funeral Service And Case Management Implementation Plan

## Objective

Implement the remaining gaps for funeral service and case management so the platform fully supports:

- logging death notices
- scheduling funeral milestones
- assigning branch staff
- assigning vehicles
- managing a task checklist
- tracking cases from opening to closure

## Implementation Progress

- [x] Extend backend funeral case schema for death notice, milestones, richer task data, vehicles, and closure metadata.
- [x] Add backend lifecycle validation and milestone CRUD endpoints.
- [x] Update frontend shared types and funeral case API client.
- [x] Expand the new funeral case form for death notice intake.
- [x] Add milestones, closure workflow, and richer assignments to the case detail page.
- [x] Update the funeral case list for closure-oriented filtering and visibility.
- [x] Run frontend and end-to-end validation.
- [ ] Regenerate the Prisma client after releasing the locked Windows query-engine file.

## Current State Summary

The existing funeral case module already supports:

- case creation with deceased details and date of death
- funeral date and venue capture
- case status tracking using `logged`, `in_progress`, `scheduled`, `completed`, and `archived`
- task checklist CRUD with assignee and due date
- staff assignment CRUD
- vehicle assignment CRUD
- notes, suppliers, and linked documents

The main gap is that funeral milestones are not implemented as a first-class workflow. The current system only has:

- one `funeralDate`
- generic case tasks with optional due dates

That is not sufficient for a real funeral operations timeline.

## Required Outcome

After implementation, a funeral case should support a structured operational flow:

1. Death notice is logged.
2. Case is opened and assigned to a branch and coordinator.
3. Standard and custom milestones are scheduled.
4. Staff and vehicles are assigned per case.
5. Tasks are tracked against the case and milestone dates.
6. The case progresses through opening, preparation, service delivery, and closure.
7. Closure metadata is recorded for audit and reporting.

## Scope To Implement

### 1. Death Notice Workflow

#### Goal

Turn the current case creation form into an explicit death notice intake flow.

#### Backend changes

- Extend `FuneralCase` with dedicated intake metadata:
  - `deathNoticeLoggedAt`
  - `deathNoticeLoggedBy`
  - `informantName`
  - `informantPhone`
  - `placeOfDeath`
  - `causeOfDeath` optional
  - `bodyCollected` boolean
  - `bodyCollectionLocation` optional
- Update the create and update Zod schemas in `backend/src/routes/funeralCases.ts`.
- Persist the new fields in `backend/prisma/schema.prisma`.
- Add audit events for death notice logging and updates.

#### Frontend changes

- Update `frontend/src/pages/funeralCases/NewFuneralCase.tsx` to include:
  - informant details
  - place of death
  - body collection details
  - optional cause of death
- Rename the first section from generic case logging to an explicit death notice intake section.
- Show these fields on `frontend/src/pages/funeralCases/FuneralCaseDetail.tsx`.

#### Acceptance criteria

- A user can log a death notice with contact and intake information.
- Intake data is visible on the case detail page.
- Audit entries reflect who logged the notice and when.

### 2. Funeral Milestones

#### Goal

Add a first-class milestone timeline instead of relying only on `funeralDate` and generic task due dates.

#### Proposed model

Add a `milestones` JSON field to `FuneralCase` with entries like:

```json
[
  {
    "id": "ms1",
    "type": "body_collection",
    "title": "Body Collection",
    "scheduledDate": "2026-05-10",
    "scheduledTime": "09:00",
    "status": "pending",
    "assignedStaffId": "u7",
    "assignedVehicleId": "vhc_1",
    "notes": "Collect from hospital mortuary"
  }
]
```

#### Standard milestone types

- `death_notice_logged`
- `body_collection`
- `family_meeting`
- `documentation_collection`
- `funeral_service`
- `burial_or_cremation`
- `post_funeral_followup`
- `case_closure`

#### Backend changes

- Add `milestones Json?` to `FuneralCase` in `backend/prisma/schema.prisma`.
- Add milestone schemas in `backend/src/routes/funeralCases.ts`.
- Add milestone endpoints:
  - `POST /api/funeral-cases/:id/milestones`
  - `PATCH /api/funeral-cases/:id/milestones/:milestoneId`
  - `DELETE /api/funeral-cases/:id/milestones/:milestoneId`
- Add audit logging for milestone create, update, complete, and delete actions.
- On case creation, optionally seed default milestones.

#### Frontend changes

- Extend `frontend/src/types/index.ts` with a `FuneralCaseMilestone` type.
- Extend `frontend/src/services/funeralCasesApi.ts` with milestone CRUD calls.
- Add a Milestones section to `frontend/src/pages/funeralCases/FuneralCaseDetail.tsx`.
- Support:
  - add milestone
  - edit milestone
  - assign staff and vehicle to milestone
  - set scheduled date and time
  - mark milestone complete
  - show overdue milestones

#### Acceptance criteria

- Users can manage multiple milestones per funeral case.
- Milestones appear in chronological order.
- Each milestone can optionally reference assigned staff and vehicle.
- Overdue and completed states are visible in the UI.

### 3. Branch Staff Assignment

#### Goal

Improve the current free-text staff assignment into a real branch-aware assignment flow.

#### Backend changes

- Validate assigned staff against existing users for the same parlour and branch.
- Store both:
  - `staffUserId`
  - `displayName`
- Prevent assigning users outside the case branch unless the actor is a parlour owner or admin.

#### Frontend changes

- Replace free-text staff entry with a selectable list of available branch staff.
- Keep manual role labels if needed, such as:
  - coordinator
  - driver
  - pallbearer lead
  - family liaison
- Show assigned staff in both case-level assignments and milestone-level assignments.

#### Acceptance criteria

- Users can assign actual branch staff members to a case.
- Invalid cross-branch assignments are blocked.
- Staff assignments remain editable.

### 4. Vehicle Assignment

#### Goal

Keep current vehicle assignment, but make it operationally useful.

#### Backend changes

- Keep current case vehicle CRUD.
- Add optional fields to vehicle entries:
  - `capacity`
  - `purpose`
  - `availabilityStatus`
- Allow milestones to reference assigned vehicle IDs.

#### Frontend changes

- Extend the Vehicles section on the case detail page.
- Allow the user to assign a case vehicle to a milestone.
- Show whether a vehicle is allocated for body collection, service, or family transport.

#### Acceptance criteria

- Vehicles can be assigned to the case.
- Vehicles can also be linked to specific milestones.
- Vehicle usage is visible from the case detail page.

### 5. Task Checklist

#### Goal

Keep the current checklist feature, but connect it more clearly to operations.

#### Backend changes

- Add optional task fields:
  - `category`
  - `milestoneId`
  - `completedAt`
  - `completedBy`
- Update task create and update schemas.
- Record audit detail when a task is completed.

#### Frontend changes

- Add task categories such as:
  - documentation
  - logistics
  - family support
  - ceremony
  - finance
- Allow a task to be linked to a milestone.
- Show overdue tasks separately.
- Show who completed the task and when.

#### Acceptance criteria

- Users can create and complete tasks as they can today.
- Tasks can optionally be associated with milestones.
- The UI distinguishes pending, overdue, and completed tasks.

### 6. Case Lifecycle And Closure

#### Goal

Make case closure explicit and auditable.

#### Backend changes

- Add closure fields to `FuneralCase`:
  - `closedAt`
  - `closedBy`
  - `closureSummary`
  - `closureChecklistComplete` boolean
- Restrict transition to `completed` unless minimum closure rules pass.
- Restrict transition to `archived` unless case is already completed.
- Add audit events for completion and archival.

#### Suggested lifecycle rules

- `logged`: death notice captured
- `in_progress`: work has started
- `scheduled`: at least funeral service milestone is scheduled
- `completed`: service delivered and closure details captured
- `archived`: closed case moved out of active operations

#### Frontend changes

- Add a closure panel on the case detail page.
- Require a closure summary before marking a case completed.
- Show closure timestamp and actor once completed.
- Add filters for open, scheduled, completed, and archived cases.

#### Acceptance criteria

- A case cannot be completed without closure metadata.
- A user can see exactly when and by whom the case was closed.
- Archived cases remain visible in filtered history views.

## Files To Update

### Backend

- `backend/prisma/schema.prisma`
- `backend/src/routes/funeralCases.ts`
- `backend/prisma/seed.ts`
- optional tests under `backend/src/tests/`

### Frontend

- `frontend/src/types/index.ts`
- `frontend/src/services/funeralCasesApi.ts`
- `frontend/src/pages/funeralCases/NewFuneralCase.tsx`
- `frontend/src/pages/funeralCases/FuneralCaseDetail.tsx`
- `frontend/src/pages/funeralCases/FuneralCasesList.tsx`

## Recommended Implementation Order

1. Extend Prisma model for death notice, milestones, task metadata, and closure fields.
2. Update backend Zod schemas and CRUD endpoints.
3. Add milestone endpoints and lifecycle validation.
4. Extend frontend shared types and API clients.
5. Update new case form for explicit death notice intake.
6. Add milestones UI to the funeral case detail page.
7. Improve staff and vehicle assignment UX.
8. Add closure workflow UI and validations.
9. Add backend tests for status transition and milestone CRUD.
10. Run backend and frontend validation.

## Validation Checklist

- Create a funeral case with full death notice intake.
- Add default milestones and a custom milestone.
- Assign staff and vehicles to the case.
- Link a milestone to assigned staff and vehicle.
- Add checklist tasks and complete some of them.
- Move case from `logged` to `in_progress` to `scheduled` to `completed`.
- Confirm invalid lifecycle transitions are rejected.
- Archive a completed case.
- Verify audit log coverage for major actions.

## Definition Of Done

This requirement is fully implemented when:

- death notices are captured with sufficient intake information
- milestones exist as a first-class case timeline
- branch staff and vehicles can be assigned operationally
- task checklist supports real execution tracking
- case closure is explicit, validated, and auditable
- the case lifecycle is enforced from opening to closure

## Notes

- The current system already provides a solid base for case CRUD, assignments, notes, suppliers, and checklist management.
- The milestone timeline and closure workflow are the main missing capabilities.
- If implementation should stay lightweight, milestones can remain JSON on `FuneralCase` for now.
- If reporting and scheduling are expected to grow, milestones should eventually move to a dedicated Prisma model.