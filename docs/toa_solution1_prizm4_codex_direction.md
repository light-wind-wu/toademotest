# TOA Internship — Solution 1 Project-first Allocation UX Direction

## 1. Purpose

This document gives Codex a clear direction to update the TOA Internship prototype using **Solution 1: Project-first Allocation** and **PRIZM 4.0 Enterprise principles**.

The goal is **not** to expose the full allocation data model to users.  
The goal is to let IO complete allocation review with a simple, guided experience:

```text
AD(P&C) Uploads Project
↓
Project Created
↓
System Suggests Programme + Intake
↓
IO Confirms / Edits / Rejects
```

---

## 2. Core Business Logic

### Solution 1: Project-first Allocation

Use this as the source of truth:

```text
AD(P&C) uploads project information.
The system immediately creates Project records and Project IDs.
The system then suggests Programme + Intake allocation records.
IO does not approve project creation.
IO only reviews, confirms, edits, or rejects allocation suggestions.
```

### Key logic changes

| Area | Old / Risky Logic | New Solution 1 Logic |
|---|---|---|
| Project creation | Project may appear to wait for IO approval | Project is created immediately after AD(P&C) upload |
| IO review | IO approves project creation | IO confirms allocation |
| Programme + Intake | Could be treated as fixed before upload | System suggests Programme + Intake after Project is created |
| Allocation | May be hidden or implied | Explicit pending suggestion until IO action |
| Project detail | May show only final approved result | Shows Project created + allocation pending / confirmed records |

---

## 3. PRIZM 4.0 Enterprise Guardrails

Before changing UI, Codex must follow PRIZM 4.0 conventions.

### Required setup

```html
<html data-zone="enterprise" data-mode="light">
```

### AI / Codex setup

Codex should first read:

```text
PRIZM.md
llms.txt
llms/<component>.md
components-api.ts
```

Use these files as the source of truth for component props, usage, accessibility notes, and available variants.

### Non-negotiable PRIZM rules

```text
- Use PRIZM Enterprise zone.
- Use PRIZM components before building custom UI.
- Use semantic Tailwind tokens only.
- Do not use raw Tailwind colours.
- Prefer existing component variants over className overrides.
- Do not add external URLs, CDNs, remote fonts, or third-party scripts.
- Keep UI air-gap safe.
```

### Correct token usage

```tsx
// Correct
<div className="bg-bg text-fg border-border">
  <span className="text-accent">Pending allocation</span>
</div>

// Wrong
<div className="bg-slate-50 text-slate-900 border-slate-200">
  <span className="text-blue-600">Pending allocation</span>
</div>
```

---

## 4. UX Direction

### Main UX principle

```text
Hide system complexity.
Show IO a clear decision workflow.
```

The internal system can manage:

```text
Programme
Intake
Project
Allocation Record
Suggested Slots
Confirmed Slots
Match Reason
Confidence
Source Upload Batch
```

But the main UI should only show:

```text
Project Created
Suggested Programme
Suggested Intake
Suggested Slots
Reason
Status
Actions: Confirm / Edit / Reject
```

### Primary user actions

Use only three main actions for each allocation suggestion:

```text
Confirm
Edit
Reject
```

Do not expose advanced actions on the main page.

Advanced changes should be placed inside a right-side **Sheet**:

```text
Edit Allocation Sheet
- Project summary
- Suggested Programme
- Suggested Intake
- Suggested slots
- Editable Programme
- Editable Intake
- Editable slots
- Change reason
- Save changes
```

---

## 5. PRIZM Component Mapping

| UX Area | PRIZM Component Direction | Usage |
|---|---|---|
| Page title / hierarchy | Breadcrumb, Heading, Text | Show page context and task |
| Summary metrics | Card, Badge | Pending / confirmed / rejected counts |
| Main list | Table or Card | Table for dense lists, Card for guided review |
| Status | Badge | Suggested, Edited, Confirmed, Rejected |
| Main actions | Button | Confirm / Edit / Reject |
| Edit details | Sheet | Right-side allocation edit drawer |
| Inline explanation | Alert | Explain system recommendation |
| Success feedback | Toast | Confirm / edit / reject feedback |
| Loading state | Skeleton, Spinner | Page and list loading |
| Empty state | Empty State | No pending allocation |
| Filters | Select, Combobox, Field | Year, Education Level, Intake, Status |
| Grouping by intake | Tabs | Intake 1 / Intake 2 / Unmatched |
| Overflow actions | Menu | Secondary row actions only |

---

## 6. Page-level Update Direction

## 6.1 IO — Programmes List

URL:

```text
/programmes
```

### Goal

Show Programmes as **Year + Education Level containers**, with simple allocation status.

### Use PRIZM components

```text
Card
Table
Badge
Button
Select
Combobox
Pagination
```

### Row fields

```text
Programme Name
Year
Education Level
Intake Count
Confirmed Slots
Pending Allocation Count
Programme Status
Allocation Status
Action
```

### Recommended row example

```text
Junior College Internship 2026
Education Level: Junior College
Intakes: 2
Confirmed slots: 18 / 30
Pending allocation: 4 projects
Action: Review pending allocation
```

### UX rule

Do not show internal Allocation Record IDs on this page.

---

## 6.2 IO — Programme Creation Step 1

URL:

```text
/programmes/new
```

### Goal

Create the Programme container only.

### Use PRIZM components

```text
Field
Input
Select
Combobox
Textarea
Card
Button
```

### Fields

```text
Year
Education Level
Programme Name
Programme Owner
Description
```

### Behaviour

Programme Name can be auto-generated but editable:

```text
Junior College Internship 2026
University Internship 2026
Polytechnic Internship 2026
```

### UX rule

Do not attach Projects in Step 1.  
Do not expose Allocation Records here.

---

## 6.3 IO — Programme Creation Intake Setup

URL:

```text
/programmes/new
```

### Goal

Create multiple Intake windows under the Programme.

### Use PRIZM components

```text
Card
Field
Input
Select
Button
Badge
Alert
```

### Intake card fields

```text
Intake Name
Application Open Date
Application Close Date
Internship Start Month
Internship End Month
Planned Slots
```

### Capacity summary

Each intake card should show a compact read-only summary:

```text
Planned: 20
Confirmed: 0
Pending: 0
Available: 20
```

### UX rule

During creation, confirmed and pending counts can be disabled / empty state.  
Keep this step light.

---

## 6.4 IO — Programme Creation Attach Projects Step

Current label:

```text
Attach Projects
```

Recommended new label:

```text
Review Suggested Projects
```

Alternative:

```text
Review Project Suggestions by Intake
```

### Goal

This is no longer a traditional “select approved projects” step.  
It should become a guided review of system suggestions grouped by Intake.

### Use PRIZM components

```text
Tabs
Card
Table
Badge
Button
Sheet
Alert
Toast
Empty State
```

### Page structure

```text
Programme: Junior College Internship 2026

Tabs:
- Intake 1
- Intake 2
- Unmatched
- All suggestions
```

### Project suggestion card fields

```text
Project Title
Project ID
Suggested Programme
Suggested Intake
Suggested Slots
Recommendation Reason
Status
Actions
```

### Main actions

```text
Confirm
Edit
Reject
```

### Edit action

Open a right-side Sheet.  
Do not edit complex allocation fields inline in the table.

---

## 6.5 IO — Programme Detail

URL:

```text
/programmes/PROG-0007
```

### Goal

Programme detail becomes the main workspace for reviewing and managing Project allocation.

### Recommended tabs

```text
Overview
Intakes
Project Allocation
Eligibility
Timeline
```

### Project Allocation tab

Group records by status:

```text
Pending Suggestions
Confirmed Projects
Rejected / Unmatched
```

### Use PRIZM components

```text
Tabs
Card
Table
Badge
Button
Sheet
Alert
Toast
Empty State
```

### Row fields

```text
Project
Intake
Suggested Slots
Confirmed Slots
Status
Action
```

### UX rule

Click row or Edit button to open a Sheet.  
Main page should remain compact.

---

## 6.6 IO — Project Request List

URL:

```text
/requests
```

### Goal

Reframe as request / upload tracking, not approval queue.

### Use PRIZM components

```text
Card
Table
Badge
Button
Select
Combobox
Pagination
```

### Row fields

```text
Request Title
AD(P&C)
Target Education Level
Projects Created
Allocation Pending
Status
Next Action
```

### Status examples

```text
Pending AD Upload
Project Created
Allocation Pending
Partially Confirmed
Completed
```

### Copy rule

Use:

```text
Review allocation
```

Do not use:

```text
Approve project
```

---

## 6.7 IO — Project Request Creation

URL:

```text
/requests/new
```

### Goal

IO sends a request to AD(P&C).  
This does not create the Project directly.

### Use PRIZM components

```text
Field
Input
Textarea
Select
Combobox
Button
Alert
```

### Fields

```text
Request Title
Target Year
Target Education Level
Expected Intake Window
Requested Project Count
Requested Slots
Skills / Domain
AD(P&C) Recipient
Due Date
Notes to AD(P&C)
```

### CTA copy

Use:

```text
Send request to AD(P&C)
```

Do not use:

```text
Create Project
```

---

## 6.8 IO — Project Request Review

URL:

```text
/requests/project/batch-001/SUB-0003
```

### Recommended new framing

```text
Project Allocation Review
```

### Goal

Show that the Project already exists and IO is reviewing allocation suggestions.

### Header content

```text
Project already created
Project ID: PROJ-0008
Allocation Status: Pending IO Confirmation
```

### Use PRIZM components

```text
Breadcrumb
Heading
Card
Badge
Table
Button
Sheet
Alert
Toast
```

### Main content

```text
Suggested Programme
Suggested Intake
Suggested Slots
Recommendation Reason
Actions: Confirm / Edit / Reject
```

### Copy rules

Do not use:

```text
Approve Project
Approval creates Project
Pending Project Creation
```

Use:

```text
Confirm Allocation
Edit Suggestion
Reject Suggestion
```

---

## 6.9 IO — Project Detail

URL:

```text
/projects/PROJ-0008
```

### Goal

Project detail should show Project information plus Allocation workspace.

### Use PRIZM components

```text
Card
Table
Badge
Button
Sheet
Alert
Toast
```

### Header

```text
Project Title
Project ID
Project Status: Allocation Pending
Source: AD Upload / batch-001 / SUB-0003
```

### Allocation section

Support one Project with multiple allocation suggestions:

```text
Allocation 1
Programme: JC Internship 2026
Intake: Aug–Sep
Slots: 2
Status: Confirmed

Allocation 2
Programme: Polytechnic Internship 2026
Intake: Sep–Dec
Slots: 1
Status: Suggested
```

### UX rule

Do not show a single fixed Programme field as the only allocation relationship.

---

## 6.10 AD(P&C) — Upload Projects

URL:

```text
/submissions/upload
```

### Goal

AD(P&C) uploads Project information only.  
AD(P&C) does not select final Programme + Intake in Solution 1.

### Use PRIZM components

```text
Field
Input
Textarea
Select
Combobox
Button
Alert
Toast
Skeleton
```

### Fields

```text
Project Title
Project Description
Mentor
Department / Business Unit
Suitable Education Level
Required Skills
Requested Slots
Estimated Duration
Preferred Start Window
Attachment
```

### Success state

After upload, show:

```text
Project Created
Project ID generated
Allocation Status: Pending IO Confirmation
Next Step: IO will review system suggestions
```

### Copy rule

Do not show:

```text
Waiting for IO approval to create project
```

Use:

```text
Project created. Allocation pending IO confirmation.
```

---

## 7. Status Model

### Project status

```text
Project Created
Allocation Pending
Partially Confirmed
Allocation Confirmed
Allocation Rejected
Withdrawn
```

### Allocation status

```text
Suggested
IO Modified
Confirmed
Rejected
Superseded
```

### Request status

```text
Draft
Sent to AD(P&C)
AD Uploaded
Project Created
Allocation Suggested
Allocation Reviewed
Closed
```

---

## 8. Suggested Data Shape

Use this data internally.  
Do not expose all fields on the main page.

```ts
type AllocationStatus =
  | "suggested"
  | "io_modified"
  | "confirmed"
  | "rejected"
  | "superseded";

type AllocationRecord = {
  id: string;
  projectId: string;
  programmeId: string;
  intakeId: string;
  suggestedSlots: number;
  confirmedSlots?: number;
  recommendationReason: string;
  confidence?: "high" | "medium" | "low";
  status: AllocationStatus;
  ioModifiedReason?: string;
  confirmedBy?: string;
  confirmedAt?: string;
};

type Project = {
  id: string;
  title: string;
  sourceRequestId?: string;
  uploadBatchId?: string;
  adPnc: string;
  mentor?: string;
  department?: string;
  suitableEducationLevel: string[];
  requestedSlots: number;
  estimatedDuration?: string;
  preferredStartWindow?: string;
  status:
    | "project_created"
    | "allocation_pending"
    | "partially_confirmed"
    | "allocation_confirmed"
    | "allocation_rejected";
};
```

---

## 9. Microcopy Guidelines

### Use these terms

```text
Project Created
Allocation Pending
System Suggestion
Confirm Allocation
Edit Suggestion
Reject Suggestion
Pending IO Confirmation
```

### Avoid these terms

```text
Approve Project
Approval creates Project
Pending Project Creation
Attach approved project
Final allocation by system
```

### Recommended user-facing explanation

```text
The project has already been created. The system has suggested where it best fits based on education level, intake timing, project duration, skills, and requested slots. Please confirm, edit, or reject the suggested allocation.
```

---

## 10. MVP Implementation Order

Implement the logic in this order:

```text
P0
1. AD(P&C) Upload Projects success state
2. Project Request Review → Project Allocation Review
3. Project Detail Allocation section
4. Programme Detail Project Allocation tab

P1
5. Programme Creation Attach Projects → Review Suggested Projects
6. Programme List allocation summary
7. Programme Creation Step 1 field cleanup
8. Intake Setup capacity summary

P2
9. Timeline visualisation
10. Annual report fields
11. Dashboard summary cards
```

---

## 11. Acceptance Criteria

### Business logic

```text
- AD upload creates Project immediately.
- IO does not approve Project creation.
- IO confirms allocation only.
- System suggestions remain pending until IO action.
- One Project can have multiple allocation suggestions.
```

### UX

```text
- Main actions are Confirm, Edit, Reject.
- Advanced editing happens in a Sheet.
- Main page remains compact.
- Statuses are visible through Badges.
- Feedback appears through Toast or Alert.
- Empty and loading states are handled.
```

### PRIZM compliance

```text
- Uses PRIZM Enterprise zone.
- Uses semantic tokens only.
- Uses PRIZM components before custom UI.
- No raw Tailwind colour utilities.
- No external URLs, CDNs, remote fonts, or third-party scripts.
- Component usage should be checked against llms/<component>.md.
```

---

## 12. Codex Prompt

```text
You are updating the TOA Internship prototype using PRIZM 4.0 Enterprise principles.

First read PRIZM.md, llms.txt, and the relevant llms/<component>.md files. Use PRIZM components before creating custom UI. Use semantic tokens only. Do not use raw Tailwind colours. Do not add external URLs, CDNs, remote fonts or third-party scripts.

Theme:
Set the root to:
<html data-zone="enterprise" data-mode="light">

Business logic:
Implement Solution 1: Project-first allocation.
AD(P&C) uploads project information. The system immediately creates Project records and Project IDs. The system then suggests Programme + Intake allocation records. IO does not approve project creation. IO only reviews, confirms, edits or rejects allocation suggestions.

UX principles:
Keep the operation simple.
Do not expose the full allocation data model on the main page.
Use progressive disclosure:
- Main page shows compact project suggestion summary.
- Primary action is Confirm.
- Secondary actions are Edit and Reject.
- Edit opens a right-side PRIZM Sheet.
- Success feedback uses Toast or Alert.
- Status uses Badge.

Required PRIZM components:
- Button for actions
- Card for summary and project suggestion cards
- Table for dense lists
- Badge for statuses
- Field, Input, Select, Combobox, Textarea for forms
- Tabs for intake grouping
- Sheet for edit drawer
- Alert for system recommendation explanation
- Toast for action success
- Skeleton and Empty State for loading / no data

Page updates:
1. Programmes list:
   Show Programme by Year + Education Level.
   Add intake count, confirmed slots, pending allocation count and allocation status.
   Use Card summary + Table list.

2. Programme creation Step 1:
   Keep it simple.
   Fields: Year, Education Level, Programme Name, Owner, Description.
   Do not attach projects here.

3. Intake setup:
   Use one Card per intake.
   Fields: Intake name, application window, internship period, planned slots.
   Show read-only capacity summary.

4. Attach Projects step:
   Rename to "Review Suggested Projects".
   Group suggestions by Intake using Tabs.
   Each suggestion shows Project title, Project ID, suggested slots, reason and status.
   Actions: Confirm, Edit, Reject.
   Edit opens Sheet.

5. Project request review:
   Reframe as "Project Allocation Review".
   Show Project ID because Project already exists.
   Do not use "Approve Project".
   Use "Confirm Allocation".

6. Project detail:
   Add Allocation section.
   Support multiple Programme + Intake suggestions per Project.
   Use Badge for Suggested, Edited, Confirmed, Rejected.

7. AD(P&C) Upload Projects:
   Do not ask AD(P&C) to select Programme + Intake.
   After upload, show:
   Project Created
   Project ID generated
   Allocation Status: Pending IO Confirmation
```

---

## 13. Final Design Principle

```text
The goal is not to expose the allocation model.
The goal is to let IO complete allocation review with three simple actions:
Confirm, Edit, Reject.
```
