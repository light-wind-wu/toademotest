# Existing Applicant Journey IA

## 1. Document purpose

This document defines the proposed information architecture and screen structure for an existing applicant managing:

- Interview scheduling and rescheduling
- Internship offers
- Onboarding
- Internship completion and offboarding
- Testimonial requests
- LinkedIn sharing
- Internship certificates

The product UI is English. Explanatory notes in this document are written in Chinese, while proposed labels and calls to action use English.

---

## 2. IA conclusion

不同入口不应该形成多套重复流程。Email、TOA Notification、Home 和各列表页只负责提醒、索引与导流；实际业务内容应归属于稳定的业务对象。

- **Application Record** 是 Interview 与 Offer 的唯一业务归属。
- **Internship Record** 是 Onboarding、Active Internship、Offboarding、Testimonial 与 Certificate 的唯一业务归属。
- **Home** 只回答两个问题：用户现在需要做什么，以及接下来会发生什么。
- **My Interviews** 与 **My Offers** 可以作为跨 Application 的索引页，但打开项目后应进入对应的 Application Record。
- **Certification** 不应长期作为空的独立页面。Certificate 应属于相应的 Internship Record；一级入口可以在证书可用时作为快捷方式出现。

---

## 3. Proposed top-level information architecture

```text
Home
├── Required actions
├── Upcoming
├── Awaiting confirmation
└── Latest activity

My Applications
└── Application Record
    ├── Overview
    ├── Interview
    ├── Offer
    ├── Documents
    └── Timeline

My Interviews
└── Interview index
    └── Open Application Record / Interview

My Offers
└── Offer index
    └── Open Application Record / Offer

My Internship
└── Internship Record
    ├── Overview
    ├── Onboarding
    ├── Internship details
    ├── Offboarding
    ├── Testimonial
    └── Certificate
```

### Navigation responsibilities

| Surface | Responsibility |
|---|---|
| Home | Prioritised actions, upcoming events and passive status updates |
| Notifications | Event inbox and deep links; not a workflow owner |
| My Applications | All applications and their complete application-stage history |
| My Interviews | Cross-application interview index |
| My Offers | Cross-application offer index |
| My Internship | Accepted internship, onboarding, active placement and completion record |
| Certification | Optional shortcut to an available certificate; otherwise hidden or contextual |

---

## 4. Entry-point routing rules

所有入口应落到同一个 canonical detail page，避免同一任务在 Home、Notifications 和列表中显示不同的数据或状态。

| Entry point | Canonical destination |
|---|---|
| Email interview link | Application Record → Interview |
| TOA interview notification | Application Record → Interview |
| Home interview task card | Application Record → Interview |
| My Interviews item | Application Record → Interview |
| Email offer link | Application Record → Offer |
| TOA offer notification | Application Record → Offer |
| Home pending offer card | Application Record → Offer |
| My Offers item | Application Record → Offer |
| Offboarding email | Internship Record → Offboarding |
| TOA offboarding notification | Internship Record → Offboarding |
| Certificate notification | Internship Record → Certificate |

### Authentication and deep linking

- Email deep links should preserve a `returnTo` destination through login.
- After authentication, the applicant should land directly on the relevant record and section.
- Do not return the applicant to Home and require them to find the task again.
- Invalid or expired links should resolve to the relevant record with a clear status explanation.

### Persistent context header

Every workflow detail should retain:

- Programme or internship name
- Intake
- Application ID or Internship ID
- Current macro stage
- Current status
- Relevant deadline, including time zone

---

## 5. Shared lifecycle model

不要使用一个过度详细的全局 stepper 来表达所有业务状态。全局 journey 只表达宏观阶段，详细状态放在当前页面的状态卡中。

### Macro journey

```text
Application
→ Interview
→ Offer
→ Internship
→ Completed
```

### Application lifecycle

```text
Submitted
→ Under Review
→ Interview Invited
→ Interview Scheduled
→ Interview Completed
→ Offer Received
→ Offer Accepted / Offer Rejected / Offer Expired
```

### Internship lifecycle

```text
Offer Accepted
→ Onboarding Required
→ Onboarding Completed
→ Active Internship
→ Completion Required
→ Offboarding
→ Completed
→ Certificate Available
```

---

## 6. UT-8 — Existing Applicant Managing Interview

### 6.1 Possible entry points

- Email notification → Login → Application Record → Interview
- TOA Notification → Relevant Application → Interview
- Home task card → Relevant Application → Interview
- My Applications → Relevant Application → Interview
- My Interviews → Relevant Application → Interview

### 6.2 Recommended interview state model

```text
Interview Invited
→ Selecting Availability
→ Availability Submitted
→ Interview Scheduled
→ Interview Completed
```

Alternative availability branch:

```text
Available Timeslots Unsuitable
→ Alternative Time Requested
→ Awaiting Mentor Confirmation
→ Interview Scheduled
```

### 6.3 Important status distinctions

以下状态不能混用：

| Status | Meaning |
|---|---|
| Timeslot Selected | Applicant has selected a slot locally but may not have submitted it |
| Availability Submitted | One or more preferences were submitted and confirmation is pending |
| Interview Scheduled | A final date and time have been confirmed |
| Time Change Requested | Applicant submitted an alternative time |
| Awaiting Mentor Confirmation | Passive state; applicant has no current action |

如果选择单个 slot 后系统立即确认，应直接进入 **Interview Scheduled**。如果用户提交多个 preferred timeslots，则应进入 **Availability Submitted**，而不是显示 Scheduled。

### 6.4 Main scheduling flow

```text
Receive Interview Invitation
→ Access TOA
→ Review Application / Project Context
→ Open Interview Scheduling Request
→ Review Available Dates and Timeslots
→ Select Preferred Timeslot(s)
→ Review Selection
→ Submit Availability
→ View Confirmation or Scheduled Interview Details
```

### 6.5 Alternative availability flow

```text
Review Available Timeslots
→ Select “Suggest Another Time”
→ Review Original Slots
→ Enter Alternative Availability and Comments
→ Review Request
→ Submit Request
→ Await Mentor Confirmation
→ View Confirmed Interview Details
```

### 6.6 Screen inventory

| Screen/state | Purpose | Primary action | Key information |
|---|---|---|---|
| Home — Interview Action Card | Surface an urgent scheduling task | Select Interview Timeslots | Programme, deadline, action summary |
| Interview Invitation | Provide context before scheduling | Choose Availability | Project, mentor, format, duration, deadline |
| Select Availability | Select one or more available slots | Review Selection | Date, time, time zone, availability rules |
| Review Availability | Prevent submission errors | Submit Availability | Selected slots, preference order, comments |
| Availability Submitted | Confirm successful submission | View Application | Submitted preferences, expected response time |
| Interview Scheduled | Show final interview details | View / Manage Interview | Date, time, time zone, mentor, format, joining details |
| Suggest Another Time | Capture alternative availability | Review Request | Original slot, suggested times, comments |
| Review Time Change | Confirm the change request | Submit Request | Original vs suggested time |
| Awaiting Confirmation | Communicate passive status | View Request Details | Suggested time, original slot, mentor, request status |

### 6.7 Interview UX rules

- `Await Interview Time Confirmation` must not look like an enabled primary button.
- Pending rescheduling must hide slot-selection and repeat-reschedule actions.
- Use a status label such as `Awaiting confirmation` plus `No action is needed`.
- The scheduled state should support `Add to Calendar` when appropriate.
- Always show the time zone alongside interview times.
- The timeline should record invitation, availability submission, confirmation and rescheduling events.

---

## 7. UT-9 — Existing Applicant Managing Offer

### 7.1 Possible entry points

- Email offer link → Login → Application Record → Offer
- TOA Notification → Relevant Application → Offer
- Home pending offer task card → Offer
- My Applications → Relevant Application → Offer
- My Offers → Relevant Application → Offer

### 7.2 Offer state model

```text
Offer Received
→ Response Required
├── Offer Accepted
│   → Onboarding Required
│   → Onboarding Completed
├── Offer Rejected
├── Offer Expired
└── Offer Withdrawn
```

在提交后还应支持短暂的 `Response Submitted` 或 `Processing` 状态，防止用户重复提交。

### 7.3 Accept offer flow

```text
Receive Internship Offer
→ Open Relevant Application / Offer
→ Review Offer
→ Review Key Details and Response Deadline
→ Select Accept Offer
→ Review Decision
→ Confirm Acceptance
→ View Confirmation
→ Go to Internship Record
→ Complete Onboarding Actions
```

### 7.4 Reject offer flow

```text
Review Internship Offer
→ Select Reject Offer
→ Provide Reason / Remarks, if required
→ Review Decision
→ Confirm Rejection
→ View Updated Application Status
```

Rejection reason should only be mandatory when required by the business. The user must be able to review the decision before final submission.

### 7.5 Screen inventory

| Screen/state | Purpose | Primary action | Key information |
|---|---|---|---|
| Home — Offer Action Card | Surface the highest-priority decision | Review Offer | Programme, response deadline, urgency |
| Offer Overview | Present the complete offer | Accept Offer | Project, department, mentor, dates, location, terms |
| Accept Offer Review | Confirm understanding | Confirm Acceptance | Key terms, start/end date, commitments |
| Reject Offer | Capture rejection decision | Review Rejection | Reason, optional remarks |
| Reject Offer Review | Prevent accidental rejection | Confirm Rejection | Offer and entered reason |
| Decision Confirmation | Confirm response and explain next step | Go to Internship Record / View Application | Submitted decision and effective status |

### 7.6 Offer UX rules

- Offer deadline must be visually prominent and include a time zone.
- `Accept Offer` is the primary action; `Reject Offer` is secondary but discoverable.
- Do not place irreversible submission directly on the initial Offer Overview.
- Once accepted, preserve the offer in the Application Record as read-only history.
- Create or reveal the Internship Record and provide `Go to Internship Record`.
- Onboarding should not remain inside the Offer detail page.

---

## 8. Onboarding

### 8.1 Ownership

Onboarding belongs to the Internship Record because it starts after an offer is accepted and prepares the applicant for an active internship.

### 8.2 Recommended flow

```text
Accept Offer
→ Open Internship Record
→ Review Onboarding Requirements
→ Complete Required Actions
→ Submit Required Information / Documents
→ Review Completion
→ Confirm Completion
```

### 8.3 Onboarding screen structure

- Internship summary
- Start date and onboarding deadline
- Required actions checklist
- Optional preparation items
- Required documents
- Contact or support information
- Completion status
- Blocking issues, if any

Each requirement should have its own status: `Not started`, `In progress`, `Submitted`, `Needs update`, or `Completed`.

---

## 9. Offboarding

### 9.1 Possible entry points

- Email offboarding link → Login → Internship Record → Offboarding
- TOA Notification → Internship Record → Offboarding
- Home completion task card → Internship Record → Offboarding
- My Internship → Completed Internship → Offboarding

### 9.2 Main offboarding flow

```text
Receive Offboarding Notification
→ Open Internship Record
→ Review Internship Details and Completion Status
→ Submit Internship Feedback
→ Review Feedback
→ Confirm Submission
→ View Completion Status
```

### 9.3 Offboarding Hub

Offboarding 应使用统一的 Completion Hub，但清楚区分任务性质：

| Type | Item | Behaviour |
|---|---|---|
| Required | Submit Internship Feedback | Blocks completion when required |
| Optional | Request Testimonial | Independent request and status flow |
| Optional / External | Share Experience on LinkedIn | Editable preview and external handoff |

不要把三个功能都表现成必须完成的 checklist item。

### 9.4 Feedback screen inventory

| Screen/state | Primary action |
|---|---|
| Offboarding Overview | Start Feedback |
| Feedback Form | Review Feedback |
| Feedback Review | Submit Feedback |
| Feedback Submitted | Return to Internship Record |

### 9.5 Testimonial branch

```text
Open Completed Internship
→ Request Testimonial
→ Provide Request Details, if required
→ Review Request
→ Submit Request
→ Mentor Reviews Request
→ Monitor Request Status
→ View Testimonial When Available
```

Recommended statuses:

- Not requested
- Request submitted
- Under mentor review
- More information required
- Testimonial available
- Request declined

### 9.6 LinkedIn sharing branch

```text
Complete Internship / Offboarding
→ Select Share on LinkedIn
→ Review Suggested Content
→ Edit Content
→ Confirm External Handoff
→ Continue to LinkedIn
```

Before leaving TOA, explain:

- Which internship information will be included
- Which content is editable
- That the applicant is leaving TOA
- That nothing will be published automatically by TOA

---

## 10. Internship Certificate

### 10.1 Ownership

Certificate is the final output of an Internship Record, not a separate lifecycle. A top-level Certification navigation item may act as a shortcut only when a certificate exists.

### 10.2 Eligibility conditions

- Internship is completed.
- Required offboarding actions are completed.
- Final approval or clearance is complete.
- Certificate generation has succeeded.

### 10.3 Certificate state model

| State | UI behaviour |
|---|---|
| Locked | Explain unmet requirements and link to the required action |
| Processing | Show approval or generation progress; no repeated action |
| Available | Show certificate details, View and Download actions |

### 10.4 Suggested flow

```text
Complete Internship
→ Complete Required Offboarding Actions
→ Final Clearance
→ Certificate Available
→ Open Internship Record / Certificate
→ View Certificate
→ Download Certificate, if required
```

### 10.5 Certificate details

- Applicant name
- Internship or project name
- Internship period
- Completion date
- Issuing organisation
- Certificate ID
- Generated date
- `View Certificate`
- `Download PDF`

---

## 11. Home information architecture

Home 不复制完整业务详情，只显示最重要的下一步和状态摘要。

### 11.1 Content priority

1. **Required Action**
   - Select interview timeslots
   - Respond to offer
   - Complete onboarding requirement
   - Submit required offboarding feedback

2. **Upcoming**
   - Scheduled interview
   - Internship start date
   - Upcoming onboarding deadline

3. **Awaiting Confirmation**
   - Alternative interview time pending
   - Offer response processing
   - Testimonial request under review

4. **Latest Activity**
   - Interview invitation received
   - Availability submitted
   - Offer issued
   - Offer response submitted
   - Feedback submitted
   - Certificate available

### 11.2 Card behaviour

| Card type | Primary behaviour |
|---|---|
| Required action | Strong primary CTA |
| Upcoming | View or manage details |
| Awaiting confirmation | Status-first, neutral link only |
| Activity | Read-only event with contextual deep link |

Passive states must not use an action-looking primary button. For example:

- Status: `Awaiting confirmation`
- Supporting text: `No action is needed while your mentor reviews the request.`
- Link: `View request details`

---

## 12. Reusable page and component patterns

The journeys can be covered with a small number of reusable templates:

- Home task card variants
- Home status card variants
- Application Record shell
- Internship Record shell
- Interview scheduling form
- Review and confirmation page
- Offer detail and decision page
- Requirements checklist
- Offboarding Hub
- Certificate locked / processing / available states
- Timeline event list

### Shared action rules

- One clear primary action per state.
- Review before irreversible submission.
- Submission confirmation must explain the resulting status and next step.
- Pending states suppress duplicate submission actions.
- Status, deadline and time zone must remain visible where relevant.
- The same record must show consistent state regardless of entry point.

---

## 13. Accessibility requirements

- Do not communicate status through colour alone; pair colour with text and an icon.
- Implement the journey stepper as an ordered list and expose the current step semantically.
- Show date, time and time zone together.
- Support keyboard interaction and visible focus across scheduling and decision flows.
- Manage focus correctly in confirmation dialogs.
- Announce asynchronous status changes to screen readers.
- Identify external LinkedIn navigation before handoff.
- Provide accessible certificate metadata and a meaningful PDF filename.
- Do not use disabled-looking buttons to communicate passive status.

---

## 14. Recommended implementation order

1. Establish canonical Application Record and Internship Record routing.
2. Define shared interview, offer, internship and certificate status types.
3. Implement Home action/status card rules.
4. Complete Interview Scheduling and Alternate Availability flows.
5. Build Offer acceptance and rejection flows.
6. Connect accepted offers to the Internship Record and Onboarding.
7. Add Offboarding Hub, Feedback, Testimonial and LinkedIn handoff.
8. Add Certificate eligibility and viewer states.
9. Verify deep links, pending-state action suppression and accessibility.

---

## 15. Complete page inventory and descriptions

The recommended IA contains **37 user-visible pages or page states**. These do not require 37 independent routes: several items are state variants built from the same reusable page template.

### 15.1 Core entry and record pages — 6

| # | Page | Description | Primary action |
|---:|---|---|---|
| 1 | **Home** | Applicant landing page that prioritises required actions, upcoming events, awaiting-confirmation states and recent activity across all applications and internships. It should show only the most relevant summary and route users to the canonical record. | Contextual task CTA, such as `Select Interview Timeslots` or `Review Offer` |
| 2 | **My Applications** | Searchable and filterable list of draft, active and closed applications. Each card summarises programme, stage, current status, latest update and any required action. | `View Application` |
| 3 | **Application Record — Overview** | Canonical record for one application. It provides programme context, macro journey progress, current next step, application summary, documents and timeline. Interview and Offer workflows are opened from this record. | Contextual next step |
| 4 | **My Interviews** | Cross-application index of interview invitations, pending availability submissions, scheduled interviews, rescheduling requests and completed interviews. It does not duplicate interview details. | `View Interview` |
| 5 | **My Offers** | Cross-application index of active, accepted, rejected, expired and withdrawn offers. It highlights response deadlines and routes to the relevant Application Record. | `Review Offer` or `View Offer` |
| 6 | **Internship Record — Overview** | Canonical record created or revealed after an offer is accepted. It shows internship dates, project, mentor, location, onboarding progress, active-placement information and completion status. | Contextual internship action |

### 15.2 Interview pages and states — 8

| # | Page | Description | Primary action |
|---:|---|---|---|
| 7 | **Interview Invitation** | Introduces the interview request before the applicant selects a time. It provides the relevant programme/project context, mentor, interview format, expected duration and scheduling deadline. | `Choose Availability` |
| 8 | **Select Availability** | Displays available interview dates and timeslots in the applicant's time zone. It supports single-slot selection or ranked preferences depending on the scheduling model. | `Review Selection` |
| 9 | **Review Availability** | Lets the applicant verify selected timeslots, preference order, time zone and optional comments before submitting availability. | `Submit Availability` |
| 10 | **Availability Submitted** | Confirms that preferred timeslots were submitted successfully but have not necessarily been scheduled. It explains what happens next and when the applicant should expect an update. | `View Application` |
| 11 | **Interview Scheduled** | Shows the confirmed interview date, time, time zone, mentor, format, duration, location or meeting details and preparation guidance. | `View / Manage Interview` |
| 12 | **Suggest Another Time** | Allows the applicant to propose alternative availability when the offered slots or confirmed interview are unsuitable. It shows the original options and collects suggested times and comments. | `Review Request` |
| 13 | **Review Time Change** | Compares the original interview slot with the proposed alternative and lets the applicant verify the request before submission. | `Submit Request` |
| 14 | **Awaiting Interview Time Confirmation** | Passive status shown after an alternative time is submitted. It displays the suggested time, original slot, mentor and request status, while suppressing additional scheduling actions. | `View Request Details` |

### 15.3 Offer pages and states — 5

| # | Page | Description | Primary action |
|---:|---|---|---|
| 15 | **Offer Overview** | Presents the complete internship offer, including project, department, mentor, internship dates, location, work arrangement, relevant terms, documents and response deadline. | `Accept Offer` |
| 16 | **Accept Offer Review** | Summarises the decision and key offer terms before the applicant commits. It should clearly state the effect of acceptance and the onboarding steps that follow. | `Confirm Acceptance` |
| 17 | **Reject Offer** | Captures an optional or required rejection reason and remarks. It should explain that the decision will close the offer and may close the application. | `Review Rejection` |
| 18 | **Reject Offer Review** | Provides a final summary of the offer and rejection reason to prevent accidental submission of an irreversible decision. | `Confirm Rejection` |
| 19 | **Offer Decision Confirmation** | Confirms that an acceptance or rejection response was submitted, shows the resulting application status and directs the applicant to the appropriate next destination. | `Go to Internship Record` or `View Application` |

### 15.4 Onboarding pages and states — 4

| # | Page | Description | Primary action |
|---:|---|---|---|
| 20 | **Onboarding Requirements** | Checklist of required and optional actions before the internship begins. It shows deadlines, individual item status, blocking issues and overall onboarding progress. | `Continue` on the next incomplete requirement |
| 21 | **Onboarding Requirement Detail** | Task-specific form or document page for one onboarding requirement, such as submitting personal information, acknowledgements or required documents. | `Review Submission` |
| 22 | **Onboarding Review** | Summarises the information and documents about to be submitted for an onboarding requirement or final onboarding completion. | `Submit` |
| 23 | **Onboarding Completion Confirmation** | Confirms successful completion, identifies any items still under review and explains what the applicant should expect before the internship starts. | `Return to Internship Record` |

### 15.5 Offboarding and feedback pages — 4

| # | Page | Description | Primary action |
|---:|---|---|---|
| 24 | **Offboarding Overview** | Completion hub for a finished or finishing internship. It separates required feedback from optional testimonial and LinkedIn-sharing actions and shows certificate eligibility progress. | `Start Feedback` |
| 25 | **Internship Feedback Form** | Collects structured feedback about the internship, project, mentorship and learning experience. It should support saving progress when the form is long. | `Review Feedback` |
| 26 | **Feedback Review** | Shows all feedback responses before final submission and provides edit links for each section. | `Submit Feedback` |
| 27 | **Feedback Submitted** | Confirms that feedback has been received, updates the completion status and explains whether any remaining action blocks the certificate. | `Return to Internship Record` |

### 15.6 Testimonial pages and states — 4

| # | Page | Description | Primary action |
|---:|---|---|---|
| 28 | **Request Testimonial** | Allows the applicant to request a testimonial from the relevant mentor. It may collect the intended use, focus areas and optional supporting comments. | `Review Request` |
| 29 | **Review Testimonial Request** | Summarises the recipient and request details before sending the request to the mentor. | `Submit Request` |
| 30 | **Testimonial Request Status** | Tracks whether the request is submitted, under mentor review, requires more information, was declined or is complete. It does not prompt repeat submission while pending. | Contextual action or `View Details` |
| 31 | **View Testimonial** | Displays the completed testimonial, issue date and mentor information, with options to view or download it when supported. | `Download Testimonial` |

### 15.7 LinkedIn sharing pages — 2

| # | Page | Description | Primary action |
|---:|---|---|---|
| 32 | **LinkedIn Share Preview** | Shows pre-populated internship information and suggested post content. The applicant can edit the text and review what information will leave TOA. | `Continue to LinkedIn` |
| 33 | **External Handoff Confirmation** | Clearly states that the applicant is leaving TOA, identifies the information being transferred and confirms that TOA will not publish automatically. | `Open LinkedIn` |

### 15.8 Certificate pages and states — 4

| # | Page | Description | Primary action |
|---:|---|---|---|
| 34 | **Certificate Locked** | Explains that the certificate is not yet eligible and lists unmet conditions such as incomplete feedback, internship completion or final clearance. Each resolvable requirement links to its task. | `Complete Required Action` |
| 35 | **Certificate Processing** | Indicates that required actions are complete but final approval or certificate generation is still in progress. It provides an expected update where possible and prevents repeated requests. | `Return to Internship Record` |
| 36 | **Certificate Available** | Shows certificate metadata, including internship, completion period, issue date and certificate ID, and provides viewing and download actions. | `View Certificate` |
| 37 | **Certificate Viewer** | Provides a readable preview of the generated certificate with applicant, internship and issuing-organisation details. | `Download PDF` |

### 15.9 Count summary

| Module | Page/state count |
|---|---:|
| Core entry and record pages | 6 |
| Interview | 8 |
| Offer | 5 |
| Onboarding | 4 |
| Offboarding and feedback | 4 |
| Testimonial | 4 |
| LinkedIn sharing | 2 |
| Certificate | 4 |
| **Total** | **37** |

If a standalone **Certification Index** is retained instead of routing directly to the certificate within an Internship Record, the total becomes **38**. The recommended structure remains 37 pages/states with Certification treated as a contextual shortcut.

---

## 16. Existing-page reuse, new applicant pages and flow connections

### 16.1 Delivery rules

- Existing routes and views must be **updated in place**. Do not recreate an existing page under a second route.
- Any change to an existing page requires product confirmation before implementation.
- New workflow pages use the naming convention **`applicant-xxxx`**.
- Only index destinations belong in the main menu. Review, confirmation and task-detail pages are reached through contextual links and must not create additional menu clutter.
- Every new page must provide a clear previous step, next step and return destination.
- Home, Notifications, My Applications, My Interviews and My Offers must deep-link to the same canonical record and workflow state.

### 16.2 Existing pages to reuse and update — confirmation required

The following pages already exist. They must not be recreated.

| Applicant page ID | Existing route | Existing role | Proposed update requiring confirmation |
|---|---|---|---|
| `applicant-home` | `/apply/dashboard` | Applicant Home | Update task/status cards and deep links for Interview, Offer, Onboarding, Offboarding and Certificate states. Replace action-looking controls in passive states with status treatment. |
| `applicant-applications` | `/apply/applications` | Application list | Add consistent interview/offer state labels and route each contextual CTA to the relevant Application Record workflow. |
| `applicant-application-detail` | `/apply/applications/[id]` | Canonical Application Record | Retain as the owner of Interview and Offer context. Add workflow entry cards, status variants and links to new review/confirmation pages. |
| `applicant-interviews` | `/apply/interviews` | Existing empty menu destination | Replace the placeholder with a cross-application Interview index; do not duplicate the interview detail. |
| `applicant-offers` | `/apply/offers` | Existing empty menu destination | Replace the placeholder with a cross-application Offer index; each item opens the relevant offer workflow. |
| `applicant-availability` | `/apply/availability` | Existing availability form | Reuse for available timeslot selection and send the applicant to `applicant-interview-review` before submission. |
| `applicant-interview-proposed` | `/apply/interview-proposed` | Existing alternative-time form | Reuse for suggested availability and send the applicant to `applicant-interview-reschedule-review`. |
| `applicant-onboarding` | `/apply/onboarding` | Existing onboarding form/summary | Reuse as the onboarding overview and requirements checklist. Move individual requirements and review/confirmation into linked applicant pages. |
| `applicant-internship` | `/apply/internship` | Existing Internship Record | Retain as the canonical owner of onboarding status, active internship, offboarding, testimonial and certificate entry points. |
| `applicant-feedback` | `/apply/feedback/[id]` | Existing feedback form | Retain as the feedback form and add save/review routing before final submission. |
| `applicant-certification` | `/apply/certification` | Existing empty menu destination | Replace the placeholder with contextual locked, processing or available certificate states linked to the Internship Record. |

No UI code changes to the pages above should begin until the proposed updates are confirmed.

### 16.3 New applicant pages

These pages do not currently have an equivalent route and can be added using the `applicant-xxxx` convention.

| # | New page ID | Proposed route | Description |
|---:|---|---|---|
| 1 | `applicant-interview-review` | `/apply/applicant-interview-review` | Reviews selected interview timeslots, preference order, time zone and comments before submission. |
| 2 | `applicant-interview-confirmation` | `/apply/applicant-interview-confirmation` | Confirms submitted availability or a successfully scheduled interview and routes back to the Application Record. |
| 3 | `applicant-interview-reschedule-review` | `/apply/applicant-interview-reschedule-review` | Compares the original slot with proposed alternative availability before submitting a time-change request. |
| 4 | `applicant-offer-detail` | `/apply/applicant-offer-detail` | Displays the full offer terms, documents, project details and response deadline for a selected application. |
| 5 | `applicant-offer-review` | `/apply/applicant-offer-review` | Reviews an offer acceptance before final confirmation. |
| 6 | `applicant-offer-reject` | `/apply/applicant-offer-reject` | Captures rejection reason or remarks and presents the rejection review state. |
| 7 | `applicant-offer-confirmation` | `/apply/applicant-offer-confirmation` | Confirms the submitted offer decision and routes accepted applicants to onboarding or rejected applicants back to the Application Record. |
| 8 | `applicant-onboarding-requirement` | `/apply/applicant-onboarding-requirement` | Handles one onboarding requirement, form or document submission while retaining internship context. |
| 9 | `applicant-onboarding-review` | `/apply/applicant-onboarding-review` | Reviews onboarding information or documents before submission. |
| 10 | `applicant-onboarding-confirmation` | `/apply/applicant-onboarding-confirmation` | Confirms onboarding submission and shows completed, pending-review and remaining requirements. |
| 11 | `applicant-offboarding` | `/apply/applicant-offboarding` | Provides the completion hub for required feedback, optional testimonial request, LinkedIn sharing and certificate readiness. |
| 12 | `applicant-feedback-review` | `/apply/applicant-feedback-review` | Reviews all internship feedback responses before final submission. |
| 13 | `applicant-feedback-confirmation` | `/apply/applicant-feedback-confirmation` | Confirms feedback submission and updates offboarding and certificate eligibility. |
| 14 | `applicant-testimonial-request` | `/apply/applicant-testimonial-request` | Captures and reviews a testimonial request to the relevant mentor. |
| 15 | `applicant-testimonial-status` | `/apply/applicant-testimonial-status` | Shows request progress and the completed testimonial when available. |
| 16 | `applicant-linkedin-share` | `/apply/applicant-linkedin-share` | Provides editable suggested content and an explicit confirmation before handing off to LinkedIn. |
| 17 | `applicant-certificate-viewer` | `/apply/applicant-certificate-viewer` | Displays the generated certificate and provides the final PDF download action. |

The new-page list contains **17 routes**. Existing pages provide the list, record, form and status surfaces; the new routes mainly cover missing workflow detail, review and confirmation steps.

### 16.4 Connected Interview flow

```text
applicant-home
or applicant-applications
or applicant-interviews
→ applicant-application-detail
→ applicant-availability
→ applicant-interview-review
→ applicant-interview-confirmation
→ applicant-application-detail (Interview Scheduled / Availability Submitted)
```

Alternative availability branch:

```text
applicant-application-detail (Interview Scheduled)
→ applicant-interview-proposed
→ applicant-interview-reschedule-review
→ applicant-application-detail (Awaiting Interview Time Confirmation)
→ applicant-application-detail (Interview Scheduled after confirmation)
```

### 16.5 Connected Offer and Onboarding flow

```text
applicant-home
or applicant-applications
or applicant-offers
→ applicant-application-detail
→ applicant-offer-detail
├── Accept
│   → applicant-offer-review
│   → applicant-offer-confirmation
│   → applicant-onboarding
│   → applicant-onboarding-requirement
│   → applicant-onboarding-review
│   → applicant-onboarding-confirmation
│   → applicant-internship
└── Reject
    → applicant-offer-reject
    → applicant-offer-confirmation
    → applicant-application-detail (Offer Rejected)
```

### 16.6 Connected Offboarding, Testimonial and LinkedIn flow

```text
applicant-home
or applicant-internship
→ applicant-offboarding
├── Required feedback
│   → applicant-feedback
│   → applicant-feedback-review
│   → applicant-feedback-confirmation
│   → applicant-offboarding
├── Testimonial
│   → applicant-testimonial-request
│   → applicant-testimonial-status
│   → applicant-internship
└── Share experience
    → applicant-linkedin-share
    → LinkedIn external handoff
    → applicant-offboarding
```

### 16.7 Connected Certificate flow

```text
applicant-internship
or applicant-offboarding
or Certificate notification
→ applicant-certification
├── Locked
│   → relevant required action
├── Processing
│   → applicant-internship
└── Available
    → applicant-certificate-viewer
    → Download PDF
    → applicant-internship
```

### 16.8 Route-state requirements

- Workflow pages must receive an `applicationId` or `internshipId`; they must never rely on an ambiguous globally selected record.
- Review pages must preserve the applicant's draft data when navigating back.
- Confirmation pages must prevent duplicate submissions after refresh.
- Breadcrumbs and back actions must return to the correct record, not always to Home.
- Notification and email links must resolve the same record IDs used by menu and Home entry points.
- Completed workflow pages should update the originating Home card, list card and record timeline consistently.
