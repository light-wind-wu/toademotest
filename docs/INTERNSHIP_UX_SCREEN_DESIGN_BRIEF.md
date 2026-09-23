# TOA Internship — UX Screen Design Brief

**Document status:** Product draft v0.3 — 17 Aug 2026  
**Audience:** UX/UI design team  
**Scope:** Internship module  
**Purpose:** Provide enough product information for UX to proceed directly to screen design for items marked `Missing IA` or `Revise IA` in the current Screen Plan.

## 1. How to use this brief

The UX team's current screen estimate remains the working estimate. This brief does not recalculate the number of screens. It defines:

- where each screen sits in the product;
- how users enter it;
- what information it must contain;
- the primary and secondary actions;
- the main states that require design coverage;
- where an existing screen or pattern should be reused.
- the confirmed entity status transitions and provisional UX states in Appendix A.

Different states of the same page, confirmation dialogs, drawers, empty states, and homepage task cards may be designed as separate frames, but they are not new navigation destinations unless the Screen Plan already treats them as separate screens.

## 2. Source priority

Where the source materials differ, use this order of priority:

1. Latest confirmed product direction in the Screen Plan and working sessions.
2. Latest process diagrams supplied by Product.
3. New Status List based on the 12 August demo.
4. SyRS dated 11 August 2026.
5. Existing prototype screens and reusable product patterns.

Do not expose internal DSTA-only statuses, remarks, security information, or confidential termination reasons to Applicants unless this brief explicitly says so.

### 2.1 Reference artefacts

The paths below identify the exact working artefacts used for this design round. When the brief is distributed outside the current shared workspace, Product should replace local paths with the corresponding Teams, SharePoint or Figma links.

| Reference artefact | Version / date | Used for | Validity |
|---|---|---|---|
| [Screen Plan](/Users/evanzhang/Desktop/重要逻辑截图/screens%20plan.csv) | Working copy, last updated 16 Aug 2026 | UX screen estimate, completed/incomplete screens, `Missing IA` and `Revise IA` items | Current working screen inventory. Screen count remains owned by UX. |
| [New Status List](/Users/evanzhang/Desktop/重要逻辑截图/TOA%20Overall%20Function%20List%20-%20New%20Status%20List（Based%20on%20Demo%200812）.csv) | Based on demo dated 12 Aug 2026; file updated 16 Aug 2026 | Confirmed Programme, Project Request, Project, Application, Interview, Offer-response and Onboarding statuses | Current through Onboarding. Offboarding and Change Request rows are incomplete. |
| [System Requirements Specification (SyRS) 20260811](/Users/evanzhang/Downloads/System%20Requirements%20Specification%20%28SyRS%29%2020260811.docx) | Version 11 Aug 2026 | Functional requirements, business rules, fields, permissions and exceptions | Current requirements reference; open/TBC content must not be treated as confirmed. |
| [Programme Process](/Users/evanzhang/Desktop/重要逻辑截图/Programme-Process.png) | Working process, 16 Aug 2026 | Programme creation and lifecycle | Current working process. |
| [Project Request Process](/Users/evanzhang/Desktop/重要逻辑截图/Request-Project.png) | Working process, 16 Aug 2026 | Project Request, Project submission, IO/DCE review | Current working process; DCE review contains offline steps. |
| [Shortlisting Process](/Users/evanzhang/Desktop/重要逻辑截图/Shortlisting-process.png) | Working process, 16 Aug 2026 | Eligibility, suitability, shortlisting, Talent Pool and rejection | Current working process. |
| [Interview Process](/Users/evanzhang/Desktop/重要逻辑截图/Interview-process.png) | Working process, 16 Aug 2026 | Interview invitation, slot response, reschedule, offline phone arrangement and Mentor outcome | Current working process. Offline phone-call activity is not a TOA screen. |
| [IO Decision after Interview Process](/Users/evanzhang/Desktop/重要逻辑截图/IO-decisionafterinterview-process.png) | Working process, 16 Aug 2026 | Proceed to Offer, Refer and Reject | Current working process. |
| [Offer Process](/Users/evanzhang/Desktop/重要逻辑截图/offer-process.png) | Working process, 16 Aug 2026 | Pre-offer security check, Offer preparation, sending and Applicant response | Current working process. Where date-change logic conflicts, Section 18 of this brief applies. |
| [Onboarding Process](/Users/evanzhang/Desktop/重要逻辑截图/Onboarding-process.png) | Working process, 16 Aug 2026 | Welcome Letter, Onboarding tasks and IO progress tracking | Current working process. Mobile Declaration remains in scope until Product removes it. |
| Offboarding Process | Not yet supplied | Assessment, Feedback, Certificate, Testimonial and non-standard internship outcomes | Missing. Current designs use SyRS, Screen Plan and provisional states in Appendix A. |

### 2.2 Existing prototype routes

Prototype routes are visual and interaction references, not the final source of business truth. Where an existing route conflicts with this brief, follow this brief and annotate the change in the design.

| Area | Route | Use in this design round |
|---|---|---|
| Internal Dashboard | `/dashboard` | Reuse shell, action-card and work-queue patterns. |
| Internal Applications | `/applications` | Reuse Application list, status and pre-offer patterns. |
| Internal Offer Preparation | `/offer-letter?appId={applicationId}` | Starting reference for IO-OFR-01; add the requirements in Section 9. |
| Internal Internships | `/interns` | Starting reference for Onboarding, active internship and feedback work queues. |
| Candidate 360 | `/candidate360/{candidateId}` | Starting reference for COM-01. |
| Shortlisting Review | `/shortlisting-review` and `/shortlist/{applicationId}` | Starting reference for IO-APP-01 to IO-APP-03. |
| Mentor Dashboard | `/mentor` | Starting reference for Mentor action cards. |
| Mentor Projects | `/mentor/projects` | Starting reference for MEN-01. |
| Mentor Interviews | `/mentor/interviews` and `/mentor/interviews/{interviewId}` | Starting reference for MEN-02. |
| Mentor Interview Outcome | `/mentor/interviews/{interviewId}/evaluate` | Starting reference for MEN-03 and MEN-04. |
| Mentor Interns | `/mentor/interns` | Starting reference for Assessment, Testimonial and Change Requests. |
| Applicant Home | `/apply/dashboard` | Starting reference for APP-01. |
| Applicant Applications | `/apply/applications` | Starting reference for APP-02 and APP-03. |
| Applicant Interviews | `/apply/interviews` and `/apply/interview-proposed` | Starting reference for APP-04 and APP-05. |
| Applicant Offers | `/apply/offers` | Route exists as a target; screen must be designed from APP-06 and APP-07 requirements. |
| Applicant Onboarding | `/apply/onboarding` | Starting reference for APP-10. |
| Applicant Internship | `/apply/internship` | Starting reference for APP-08 and the completion sections. |

## 3. Screen Plan coverage map

Use this table to locate the product instruction for each `Missing IA` or `Revise IA` item. Screen IDs identify design destinations or reusable page patterns; they do not change the UX team's current screen estimate.

| Screen Plan item | Design instruction in this brief |
|---|---|
| B1.2 Applicant creates profile | Section 17 — form error messages and copy |
| B1.4 Applicant accesses Homepage | APP-01 |
| B1.5 My Applications | APP-02, APP-03 |
| B2.2 IO shortlists Applicants | IO-APP-01, IO-APP-02, IO-APP-03 |
| B3.1 Mentor receives applicant profiles | MEN-01 |
| B3.2 Mentor schedules interview | MEN-02 |
| B3.2.1 Mentor reschedules interview | MEN-02 — reschedule state |
| B3.2.2 Applicant confirms interview | APP-04, APP-05 |
| B3.2.3 Applicant receives reschedule request | APP-04, APP-05 — reschedule state |
| B3.3 Mentor submits interview outcome | MEN-03, MEN-04 |
| B3.4 IO decision after interview | IO-APP-04 |
| B4.1 IO prepares and sends Offer | IO-OFR-01, IO-OFR-02 |
| B4.2 Applicant responds to Offer | APP-06, APP-07 and APP-01 Offer card state |
| B5.1 Applicant receives Welcome Letter | APP-08, APP-09 and APP-01 Welcome Letter state |
| B5.1.1 Applicant completes Onboarding | APP-10 and APP-01 Onboarding state |
| B5.1.2 IO confirms Onboarding | IO-INT-01, IO-INT-02 |
| C1.2 Mentor completes Assessment | MEN-05, MEN-06, MEN-07 |
| C1.2.1 PC Head email endorsement | PCH-01 |
| C1.3 Intern receives Certificate | APP-11, APP-12, APP-13 |
| C1.4 Intern submits Feedback | APP-14, APP-15 |
| C1.4.1 LinkedIn sharing | APP-16 with entry from APP-15 or APP-13 |
| C1.4.2 Mentor creates Testimonial | MEN-08, MEN-09, MEN-10, MEN-11 |
| C1.4.3 Intern requests Testimonial | APP-17, then reuse MEN-09 to MEN-11 |
| C1.5 IO reviews Feedback | IO-INT-03, IO-INT-04 |
| C1.5.1 Extension | MEN-12, CHG-01, IO-CHG-01, MGT-CHG-01 |
| C1.5.2 Early Completion | MEN-13, IO-CHG-02, CHG-02 |
| C1.5.3 Mentor-initiated Termination | MEN-14, IO-CHG-03, MGT-CHG-02, CHG-03 |
| C1.5.3 IO/IO Admin-initiated Termination | IO-CHG-04, IO-CHG-05, MGT-CHG-02 |
| Common — Candidate 360 | COM-01 |
| Common — Dashboard | COM-02 |

## 4. Product-wide information architecture

### 4.1 Applicant portal

Primary navigation:

1. **Home** — task-first landing page and current journey summary.
2. **My Applications** — application list and application details.
3. **My Internship** — available after an Offer is accepted; contains Welcome Letter, Onboarding, active internship, completion actions and documents.
4. **Profile** — personal and reusable profile information.
5. **Notifications** — action and information notifications with deep links.

Applicant screens must use responsive layouts. Mobile is a required design breakpoint.

### 4.2 Mentor portal

Primary navigation:

1. **Dashboard** — tasks and items requiring attention.
2. **My Projects** — projects assigned to the Mentor.
3. **Candidates / Interviews** — assigned candidates, interview calendar and interview tasks.
4. **My Interns** — active and completed interns, assessment, testimonial and change-request actions.
5. **Notifications** — action and information notifications with deep links.

### 4.3 IO and IO Admin portal

Primary navigation:

1. **Dashboard** — operational work queue and action cards.
2. **Programmes**
3. **Projects** — Projects and, for IO Admin, Project Requests.
4. **Applications** — screening, shortlisting, interview outcome and Offer actions.
5. **Internships** — Onboarding, active internships, completion and change requests.
6. **Candidate 360** — entered from candidate name links and global search.
7. **Analytics**
8. **Administration / Templates** — role dependent.

### 4.4 Canonical record structures

Use the following structures so that users do not encounter a different information model at every stage.

#### Application Detail

- Overview
- Eligibility
- Project matching / shortlisting
- Interview
- Offer
- Documents
- Activity / audit history

Show only tabs applicable to the role and current stage.

#### Internship Detail

- Overview
- Welcome Letter
- Onboarding
- Assessment
- Feedback
- Testimonial
- Change Requests
- Documents
- Activity / audit history

Show only sections applicable to the role and current stage.

## 5. Shared UX rules

### 5.1 Page header

Record-detail screens should use a consistent header containing:

- record title or person's name;
- programme / project context;
- current user-facing status;
- record ID where useful;
- primary action;
- secondary actions under an overflow menu;
- back navigation to the originating list.

### 5.2 Task and notification deep links

Every actionable email, notification and dashboard task must deep-link to the relevant record and action context. The user should not have to locate the item again after opening a task.

### 5.3 Status presentation

- Show a status badge on list rows and detail headers.
- Applicant-facing status language should be simple and must not reveal internal recommendations.
- Where both main status and sub-status exist, show the main status prominently and the sub-status as supporting text.
- Keep status history in a timeline on detail pages where users need traceability.

### 5.4 Page, modal and state usage

- Use a **page** for multi-section review, substantial data entry or a record that users may revisit.
- Use a **modal** for confirmation, short remarks, decline reasons or a single irreversible action.
- Use a **drawer** for quick contextual review when the user must remain in a list or work queue.
- Use an **inline state** for reminders, empty states, loading, success and non-blocking warnings.

### 5.5 Common states to design

For all pages where applicable, include:

- loading;
- empty / no record;
- read-only;
- validation error;
- permission denied;
- action success;
- action failure with retry;
- expired / action no longer available.

## 6. Applicant foundation screens

### APP-01 — Applicant Home

**Related stages:** B1.4 and subsequent Applicant stages  
**Screen Plan instruction:** Revise IA  
**Role:** Applicant  
**Entry:** Successful login; Home navigation.

#### Purpose

Provide one task-first landing page that adapts to the Applicant's current journey. It must not become a generic analytics dashboard.

#### Page sections

1. **Welcome header**
   - Applicant name.
   - Short contextual message.
   - Notification access.
2. **Action required**
   - Resume draft application.
   - Confirm or reschedule interview.
   - Respond to Offer.
   - Complete Onboarding.
   - Complete Internship Feedback.
   - View Certificate or Testimonial when available.
3. **My Applications summary**
   - Programme.
   - Application date.
   - Applicant-facing status.
   - One contextual action.
4. **My Internship summary**
   - Shown only after Offer acceptance.
   - Project, Mentor and internship period.
   - Onboarding or internship status.
5. **Recent notifications**
   - Maximum of the most recent relevant items with a `View all` action.

#### Required state variants

- No application yet.
- Draft application.
- Application under review.
- Interview action required.
- Offer action required.
- Onboarding action required.
- Active internship.
- Completion action required.
- Journey completed.

The action card is an entry component, not a replacement for the underlying detail page.

### APP-02 — My Applications List

**Related stage:** B1.5  
**Screen Plan instruction:** Missing IA  
**Role:** Applicant  
**Entry:** `My Applications` navigation; `View all applications` from Home.

#### Page content

- Page title and short description.
- Filter controls: `All`, `Needs Action`, `In Progress` and `Closed`. These are list filters, not Application entity statuses.
- Application cards or responsive rows containing:
  - programme name;
  - intake / application window;
  - application ID;
  - submitted / last updated date;
  - applicant-facing status;
  - current next step and relevant deadline, only when Candidate action is required;
  - contextual action: `Resume Application`, `View Application`, `Confirm Interview`, `Confirm New Slot`, `View Offer` or `View Outcome`.

#### Additional product clarification — B1.5

Use the following Candidate-facing Application statuses for My Applications:

1. `DRAFT`
2. `SUBMITTED`
3. `UNDER REVIEW`
4. `INTERVIEW`
5. `OFFER RECEIVED`
6. `OFFER ACCEPTED`
7. `OFFER DECLINED`
8. `OFFER EXPIRED`
9. `UNSUCCESSFUL`
10. `WITHDRAWN`

`WITHDRAWN` is required as a Candidate-facing status even though it is not yet present in the 12 August source Status List. The master status catalogue and SyRS should be aligned to this product decision.

Map records into the four list filters as follows:

| Filter | Included records | Card treatment |
|---|---|---|
| `All` | Every retained Application belonging to the Candidate | Show the applicable treatment below. |
| `Needs Action` | Open-window `DRAFT`; `INTERVIEW` when Candidate confirmation or reschedule confirmation is pending; `OFFER RECEIVED` | Show Status, Next Action, deadline where applicable and a primary CTA. |
| `In Progress` | `SUBMITTED`; `UNDER REVIEW`; `INTERVIEW` when no Candidate response is currently required | Show Status and `View Application`; do not manufacture a Candidate task. |
| `Closed` | `OFFER ACCEPTED`; `OFFER DECLINED`; `OFFER EXPIRED`; `UNSUCCESSFUL`; `WITHDRAWN`; a Draft whose Application Window has closed | Show final Status/Outcome and `View Application`. A closed Draft is a derived UI state, not a new canonical status. |

The Candidate-facing status alone is not sufficient to determine `Needs Action`. For `INTERVIEW`, derive the action from the Interview sub-status: `AWAITING CANDIDATE CONFIRMATION` or an active reschedule request requires action; a confirmed or completed Interview does not.

For every Application card, always show Programme, intake/application window, Application ID, submitted or last-updated date and Candidate-facing status. Then apply conditional content:

- When action is required: show `Status + Next Action + applicable deadline + primary CTA`.
- When no action is required: show `Status + View Application`.
- When closed: show `Final Status/Outcome + View Application`.

#### Duplicate Application rule

- An Applicant may hold no more than one Application for the same Programme and Application Window / Intake.
- Prevent creation or submission of a second Application for the same Programme and Application Window, and direct the Applicant to the existing record.
- The same Applicant may apply again under a different Intake or Application Window, subject to the applicable eligibility and window rules.
- Candidate-facing copy should refer to Programme and Intake/Application Window rather than `same job`, because the Application is not created against one Project vacancy.

#### States

- No applications.
- Draft only.
- Multiple applications.
- Needs Action and mixed-status records.
- Closed / unsuccessful application.

### APP-03 — My Application Detail

**Related stage:** B1.5  
**Screen Plan instruction:** Missing IA  
**Role:** Applicant  
**Entry:** Select an application from APP-02 or a Home task card.

#### Page header

- Programme name.
- Application ID.
- Applicant-facing status.
- Application date.
- Current next step.

#### Page sections

1. **Journey progress**
   - Submitted.
   - Under Review.
   - Interview.
   - Offer.
   - Outcome.
2. **Application summary**
   - Personal, education and availability summary.
   - Areas of Interest.
   - Ranked Project preferences.
3. **Interview**
   - Displayed when an interview exists.
   - Current invitation or confirmed schedule.
   - Link to Interview Detail.
4. **Offer**
   - Displayed when an Offer exists.
   - Response deadline and current response status.
   - Link to Offer Detail.
5. **Documents**
   - CV and academic transcript.
6. **Application history**
   - Applicant-visible events only.

#### Candidate Application withdrawal

- For a Draft, use `Discard Draft`; do not label the action as withdrawal.
- Allow `Withdraw Application` after submission and before an Offer is issued, including the `SUBMITTED`, `UNDER REVIEW` and `INTERVIEW` stages.
- Require a confirmation step before withdrawal. The final withdrawal-reason requirement and reason values remain TBC unless defined in the field-level specification.
- After an Offer has been issued, remove `Withdraw Application`; the Candidate uses the Offer `Decline` flow instead.
- After Offer acceptance, any request to leave follows the Internship Withdrawal process and is not an Application withdrawal.
- A withdrawn Application becomes read-only, displays `WITHDRAWN`, cancels active Candidate interview actions and retains an Applicant-visible history entry. Internal notifications and downstream cleanup follow the applicable workflow rules.

Internal eligibility findings, Mentor recommendation and IO remarks must not be displayed.

## 7. Shortlisting and Candidate 360

### IO-APP-01 — Shortlisting Workspace IA Revision

**Related stage:** B2.2  
**Screen Plan instruction:** Revise IA  
**Roles:** IO, IO Admin  
**Entry:** Applications work queue; Project Detail; Dashboard task.

Keep the existing Project Shortlisting screens, but use a consistent three-level hierarchy:

1. **Shortlisting workspace/list** — select programme, intake or project context.
2. **Candidate comparison / shortlist view** — compare candidates within the selected context.
3. **Application Detail — Shortlist** — review one candidate and take a decision.

#### Candidate comparison information

- Candidate name and education summary.
- Eligibility result.
- Suitability score and explanation.
- Applicant's ranked preference.
- Availability warning.
- Previous project / interview attempts.
- Current application status.

#### Actions

- Shortlist to selected Project.
- Refer to another Project or Talent Pool.
- Reject with reason.
- Open Candidate 360.

Selecting a non-top-fit Project should require an override reason where the rule applies.

### IO-APP-02 — Talent Pool Application Shortlist

**Related stage:** B2.2  
**Role:** IO  
**Entry:** Shortlisting workspace; `Talent Pool` filter/tab; referral action.

#### Page sections

- Search and filters: programme, internship category, discipline, skills, availability and previous attempt.
- Candidate result list.
- Recommended Project matches.
- Tried / excluded Projects.
- Selection summary for batch or individual dispatch.

#### Actions

- Assign to Project for interview.
- Open Application Detail.
- Keep in Talent Pool.
- Reject.

### IO-APP-03 — Application Detail — Shortlist

**Related stage:** B2.2  
**Role:** IO  
**Entry:** Candidate row from any shortlisting workspace.

#### Page sections

- Candidate header and current application status.
- Profile and education summary.
- CV and transcript access.
- Eligibility evidence.
- Areas of Interest and Project rankings.
- Suitability results by Project.
- Availability and duration compatibility.
- Previous shortlist/interview attempts.
- Decision history.

#### Sticky decision area

- `Shortlist for Interview`.
- `Refer to Another Project / Talent Pool`.
- `Reject Application`.
- Project selector when shortlisting or referring.
- Mandatory reason when overriding the recommended match or rejecting.

### COM-01 — Candidate 360

**Related item:** Common — Candidate 360  
**Screen Plan instruction:** Revise IA  
**Roles:** Authorised IO and IO Admin  
**Entry:** Candidate name links, Application Detail, Internship Detail, global search.

Candidate 360 is a full-page candidate record, not a duplicate application form.

#### Page header

- Candidate name and persistent candidate ID.
- Current education / employment headline.
- Current relationship with DSTA.
- Contact information subject to role permission.
- Actions: add internal note, open current application, open internship record.

#### Page sections or tabs

1. Overview.
2. Education and skills.
3. Applications.
4. Project matches and preferences.
5. Interviews and assessments.
6. Internships and outcomes.
7. Documents.
8. Internal notes — authorised roles only.
9. Activity and access history — authorised roles only.

Do not mix active-application decisions into Candidate 360. Those actions remain in Application Detail.

## 8. Interview screens

### MEN-01 — Mentor Projects and Interview IA Revision

**Related stage:** B3.1  
**Screen Plan instruction:** Revise IA  
**Role:** Mentor  
**Entry:** Mentor Dashboard, `My Projects`, `Candidates / Interviews`.

Use the following hierarchy:

```text
My Projects
└── Project Detail
    └── Assigned Candidates
        ├── Candidate Profile
        ├── Interview Detail / Scheduling
        └── Interview Outcome

Candidates / Interviews
├── Candidate List
├── Calendar View
└── Interview Detail
```

#### Mentor Project List

- Project title.
- Internship category and window.
- Placements.
- Number of assigned candidates.
- Interview progress summary.
- Outstanding Mentor tasks.

#### Project Detail — candidates section

- Candidate name and contact information available to the Mentor.
- Application summary.
- CV and transcript where permitted for the internship category.
- Interview main status and sub-status.
- Contextual action.

### MEN-02 — Interview Detail / Scheduling

**Related stages:** B3.2 and B3.2.1  
**Roles:** Mentor; Applicant has a separate responsive view  
**Entry:** Mentor Project Detail, Interview Calendar, notification deep link.

#### Page sections

1. Candidate and Project summary.
2. Current interview status.
3. Proposed or confirmed schedule.
4. Slot management.
5. Meeting information after confirmation.
6. Applicant response.
7. Reschedule history.
8. Supporting documents.

#### Mentor actions by state

- **Shortlisted:** Create one or more slots.
- **Awaiting Candidate Confirmation:** Edit/cancel unpublished slots; send reminder where permitted.
- **Candidate Confirmed:** View confirmed schedule; reschedule; cancel.
- **Reschedule Requested:** Create and send alternative slots.
- **Interview Scheduled:** Mark as completed after the interview.
- **Invitation Expired:** Create new slots or close the interview task.

If the Mentor conducts scheduling by offline phone call, do not design a phone-call workflow. Provide a `Record offline arrangement` action to capture the confirmed schedule or proceed to completion.

### MEN-03 — Interview Outcome Edit

**Related stage:** B3.3  
**Role:** Mentor  
**Entry:** `Complete assessment` task after Interview completion; Interview Detail.

#### Page content

- Candidate and Project context.
- Confirmed interview date and attendance outcome.
- Optional interview notes and transcript upload.
- Candidate Assessment:
  - Recommend for Offer.
  - Refer.
  - Recommend for Rejection.
- Assessment remarks.
- Confirmed internship start date.
- Confirmed internship end date.
- Save draft and submit actions.

#### Submission behaviour

- Display a confirmation summary before final submission.
- After submission, the outcome becomes read-only to the Mentor unless returned for amendment.
- Notify IO and change the interview status to Completed.

### MEN-04 — Interview Outcome View

**Related stage:** B3.3  
**Role:** Mentor  
**Entry:** Submitted Interview Outcome; Candidate history.

Display the submitted values, submitted date/time, status and any subsequent return-for-amendment instruction. Do not show the eventual confidential IO decision unless it is intended for Mentor visibility.

### APP-04 — My Interviews List

**Related stages:** B3.2.2 and B3.2.3  
**Role:** Applicant  
**Entry:** Application Detail; Home task; notification.

#### List content

- Programme and Project.
- Interview main status.
- Confirmed or proposed date/time.
- Action deadline.
- Contextual action: `Select slot`, `Confirm new slot`, `View details`.

An interview may also be reached from Application Detail. Keep both entry points consistent.

### APP-05 — Interview Detail

**Related stages:** B3.2.2 and B3.2.3  
**Role:** Applicant  
**Entry:** My Interviews List, Application Detail, notification deep link.

#### Page sections

- Programme, Project and Mentor summary.
- Current invitation status.
- Available slots or confirmed slot.
- Meeting mode, location or link after confirmation.
- Response deadline where applicable.
- Reschedule history.
- Guidance and contact information.

#### Applicant actions

- Select and confirm one slot.
- Request another time.
- Confirm a replacement slot.
- Withdraw from interview, where permitted.

Use a confirmation dialog before submitting a slot. After confirmation, show a clear success state and calendar information.

### IO-APP-04 — IO Interview Outcome Review

**Related stage:** B3.4  
**Screen Plan instruction:** Missing IA  
**Roles:** IO, IO Admin  
**Entry:** Dashboard work queue; Applications list; Application Detail > Interview.

#### Page sections

- Candidate and Application summary.
- Project and Mentor context.
- Interview schedule and attendance.
- Mentor's submitted assessment and remarks.
- Interview notes / transcript where authorised.
- Previous Project attempts and Talent Pool history.
- IO decision history.

#### Decision actions

1. **Proceed to Offer** — moves to Offer preparation.
2. **Refer** — select another Project or return to Talent Pool.
3. **Reject Application** — require reason and confirmation.

The Applicant must not see the Mentor recommendation or internal IO remarks.

## 9. Offer preparation, sending and response screens

### IO-OFR-01 — Offer Preparation / Review

**Related stage:** B4.1  
**Roles:** IO, IO Admin  
**Entry:** `Proceed to Offer` from IO-APP-04; Application Detail > Offer; Dashboard `Offers to prepare` task.  
**Prototype reference:** `/offer-letter?appId={applicationId}`  
**Application status on entry:** `OFFER PREPARING`

#### Purpose

Allow IO to prepare, validate, preview and send one candidate-specific Offer without leaving the Application context. Preparation and Review are two modes/states of the same page, not separate navigation destinations.

#### Page layout

Use a two-panel desktop layout where space permits:

1. **Offer configuration panel**
   - Candidate and Application summary.
   - Pre-offer / security-check status.
   - Offer template.
   - Internship start and end dates.
   - Reporting location.
   - Mentor and contact details.
   - Remuneration and benefits.
   - Response Deadline.
   - Reminder setting.
   - Attachments.
2. **Offer Letter preview panel**
   - Rendered candidate-specific letter.
   - Clear unresolved-variable warnings.
   - Page / document preview controls.
3. **Sticky action area**
   - `Back to Application`.
   - `Preview / Review`.
   - `Send Offer` when ready.

#### Field and content sources

| Information | Default source | IO editability |
|---|---|---|
| Candidate name and identifier | Submitted Application / Candidate 360 | Read-only; correct at source if wrong. |
| Programme and internship category | Application / Programme | Read-only. |
| Project title and description | Approved matched Project | Read-only unless an authorised Project correction is completed separately. |
| Mentor name and contact | Approved Project / Mentor assignment | Read-only unless the assignment is changed separately. |
| Internship start and end dates | Confirmed Interview Outcome; otherwise Applicant availability / Programme window | Editable before sending, subject to Programme window and end-after-start validation. |
| Reporting location and contact | Project / configured location | Editable before sending where authorised. |
| Remuneration | Configured remuneration rule for internship category and duration | Editable only where authorised; an override must require a reason. Final rule/value source remains a Product configuration item. |
| Benefits and Terms and Conditions | Selected active Offer template | Editable through template selection; candidate-specific amendment only where authorised. |
| Response Deadline | Default: seven calendar days from issue date | Editable before sending; cannot be earlier than the issue date. Exact cut-off time follows the confirmed system rule. |
| Reminder | System configuration | IO may enable/disable or select a permitted schedule. |
| Offer Letter body | Active Offer template with variable substitution | Editable before sending where permitted. |
| Attachments | Template/configuration plus authorised upload | Display filename, format and size; exact upload constraints remain in the field specification. |

#### Auto-save behaviour

- Create an Offer draft automatically when IO first changes a field or generated letter content.
- Auto-save changed fields after a short idle period and when a field loses focus.
- Preserve the draft when IO navigates away and allow IO to resume from the Application or Dashboard.
- Auto-save must not send the Offer, notify the Applicant or change the Application beyond `OFFER PREPARING`.
- Show one of the following non-blocking indicators in the page header or sticky action area:
  - `Saving…`
  - `All changes saved at HH:mm`
  - `Unable to save — Retry`
- If save fails, keep the user's current values on screen and provide `Retry` before navigation.
- Do not use `Save as Draft` as the primary action. A separate `Discard draft changes` action may be placed under the overflow menu with confirmation.

#### Readiness validation

The Offer work state is `PREPARING` until all mandatory information is valid. It becomes `READY TO SEND` when:

- pre-offer/security check is recorded as completed where required;
- an active Offer template is selected;
- all required variables have resolved;
- internship dates are valid and within the permitted window;
- remuneration and reporting information are present;
- Response Deadline is valid;
- required attachments are available.

`READY TO SEND` is a work/readiness state for UX. The confirmed Status List currently records the Application as `OFFER PREPARING` until the Offer is sent.

#### Review mode / frame

Review mode must show a read-only summary of:

- recipient;
- Programme and Project;
- internship period;
- Mentor and reporting details;
- remuneration and benefits;
- Response Deadline and reminder;
- complete Offer Letter;
- attachments;
- warnings or unresolved values.

Actions:

- `Back to edit`.
- `Send Offer`.

#### Send confirmation

Before sending, show a confirmation dialog containing the Applicant, email address, response deadline and statement that sending will notify the Applicant and create an active Offer.

After successful sending:

- set the Applicant view to `OFFER RECEIVED`;
- set the DSTA Application view to `AWAITING RESPONSE`;
- display the business label `Offer Extended` on the sent Offer record;
- record sender and sent date/time;
- notify the Applicant;
- navigate to IO-OFR-02.

If sending fails, remain on IO-OFR-01, retain the draft and show retry guidance. Do not show the Offer as extended.

### IO-OFR-02 — Sent Offer Detail / Version History

**Related stage:** B4.1 and post-send Offer management  
**Roles:** IO, IO Admin  
**Entry:** Application Detail > Offer; Applications work queue; send-success redirect from IO-OFR-01.  
**Prototype context:** `/applications` Offer detail / sent-Offer interaction.

#### Page header

- Applicant and Application ID.
- Offer version.
- Offer status.
- Sent date/time and sender.
- Response Deadline.
- Applicant response where available.

#### Page sections

1. Offer summary.
2. Complete sent Offer Letter — read-only.
3. Recipient and delivery status.
4. Reminder history.
5. Applicant response and remarks where applicable.
6. Version history showing active and superseded Offers.
7. Audit timeline.

#### Actions by state

| State | Available actions |
|---|---|
| `AWAITING RESPONSE` | View, resend notification, extend Response Deadline where permitted, revise and re-send, withdraw Offer. |
| `OFFER ACCEPTED` | View and download only; subsequent date changes use the applicable internship amendment/change process. |
| `OFFER DECLINED` | View response; revise and re-send where IO approves an applicable amendment. |
| `OFFER EXPIRED` | Close or revise and re-send with a new Response Deadline. |
| Superseded version | View only; link to the active version. |
| Withdrawn | View only; display withdrawal reason to authorised internal users. |

#### Revise and re-send

- Start from the last sent version.
- Require a revision reason.
- Allow permitted Offer fields and letter content to be changed.
- Require a new Review and Send confirmation.
- Create a new Offer version.
- Mark the previous version as superseded and retain it in history.
- Reset the active Response Deadline and reminder schedule.
- Notify the Applicant that a revised Offer is available.
- Permit the Applicant to respond only to the active version.

#### Withdraw Offer

- Available only before the Offer is accepted and subject to role permission.
- Require a withdrawal reason and confirmation.
- Stop future reminders and disable Applicant response.
- Notify the Applicant using approved neutral wording.
- Retain the withdrawn Offer and reason in internal audit history.
- `WITHDRAWN` is required for UX design but remains a final-enumeration confirmation item.

### APP-06 — My Offer

**Related stage:** B4.2  
**Screen Plan instruction:** Missing IA  
**Role:** Applicant  
**Entry:** Applicant navigation or Application Detail when an active Offer exists.

#### Page content

- Active Offer card with Programme, Project, internship period, response deadline and status.
- Previous superseded Offer versions, if any, shown as read-only history.
- Contextual action to open the active Offer.

### APP-07 — Offer Detail

**Related stage:** B4.2  
**Role:** Applicant  
**Entry:** My Offer, Home task card, email or notification deep link.

#### Page sections

1. Offer summary:
   - Project title and description.
   - Confirmed internship start/end dates.
   - Reporting location.
   - Mentor name and email.
   - Remuneration and applicable benefits.
   - Response deadline.
2. Complete Offer Letter preview.
3. Terms and Conditions.
4. Acceptance declaration.
5. Response actions.

#### Actions and states

- **Accept Offer:** require declaration acknowledgement and final confirmation.
- **Decline Offer:** require a configured decline reason; show remarks when applicable.
- **Request Start/End Date Change:** for the current design, capture this through the Decline flow using the relevant decline reason and remarks. Do not design a separate accepted-with-date-change state until Product confirms it.
- **Expired:** show the Offer as read-only and disable response actions.
- **Accepted:** show acceptance date/time and enable Offer Letter download.
- **Declined:** show submitted reason at an appropriate Applicant-visible level.
- **Superseded:** show read-only and direct the Applicant to the active revised Offer.

The Home Offer card is a stateful entry component. It must show the deadline and link to APP-07.

## 10. Welcome Letter and Onboarding

### APP-08 — My Internship / Internship Overview

**Related stage:** B5.1  
**Screen Plan instruction:** Missing IA  
**Role:** Applicant / Intern  
**Entry:** `My Internship` after Offer acceptance; Home task card.

#### Page header

- Programme and Project.
- Internship period.
- Mentor.
- Applicant-facing internship / onboarding status.

#### Page sections

- Next action.
- Welcome Letter.
- Onboarding progress.
- First-day information.
- Key contacts.
- Documents.
- Later lifecycle sections such as Feedback, Certificate and Testimonial appear when applicable.

If the user has only one internship, navigate directly to the Internship Detail. If multiple records are supported, show a simple list before the detail page.

### APP-09 — Welcome Letter View

**Related stage:** B5.1  
**Role:** Applicant / Intern  
**Entry:** APP-08; Home card; email/notification deep link.

#### Content

- Internship start date.
- Reporting time and location.
- Contact person.
- First-day instructions.
- Complete Welcome Letter preview.
- Download action where permitted.

#### Timing states

- Scheduled for two weeks before the start date.
- If the start date is within two weeks, available immediately after the applicable trigger.
- Not yet available.
- Available.
- Reissued / updated.

### APP-10 — Onboarding Checklist

**Related stage:** B5.1.1  
**Screen Plan instruction:** Missing IA  
**Role:** Applicant / Intern  
**Entry:** Home task card; APP-08; notification.

#### Checklist overview

Show each task with status: `Not Started`, `In Progress`, `Submitted`, `Completed` or `Action Required`.

Required task areas:

1. **Profile photograph**
   - Reuse the valid photograph from the Application where available.
   - Require upload if no valid photograph is available.
2. **Bank details**
   - Bank name.
   - Account holder name.
   - Bank account number.
   - Supporting document upload.
   - Hide or mark not applicable for categories exempt from this task.
3. **Mobile Declaration**
   - Include IMEI guidance where required.
   - Keep this task in the design until Product formally removes it.
4. **Acceptable Use Policy**
   - Policy content or document link.
   - Mandatory acknowledgement.
5. **Entry-pass instruction**
   - QR code or external instruction where configured.

#### Actions

- Save progress.
- Continue an incomplete task.
- Review completed information.
- Submit Onboarding.

Before submission, show a summary and identify any incomplete mandatory tasks. After submission, show `Submitted for confirmation` and make fields read-only unless returned for correction.

### IO-INT-01 — Internship List — Onboarding Work Queue

**Related stage:** B5.1.2  
**Screen Plan instruction:** Missing IA  
**Role:** IO  
**Entry:** Internships navigation; Dashboard onboarding task.

#### List content

- Applicant / Intern name.
- Programme and Project.
- Confirmed start date.
- Onboarding progress.
- Missing or action-required task count.
- Submission date.
- Current status.
- Contextual action: `Review`, `Follow up`, `View`.

#### Filters

- Onboarding status.
- Start-date range.
- Programme / internship category.
- Programme Centre.
- Missing task.

### IO-INT-02 — Internship Detail — Onboarding

**Related stage:** B5.1.2  
**Role:** IO  
**Entry:** IO-INT-01, Dashboard task, notification.

#### Page sections

- Applicant and Internship summary.
- Onboarding progress.
- Profile photograph.
- Bank details and supporting document.
- Mobile Declaration.
- Acceptable Use Policy acknowledgement.
- Submission and verification history.
- Validation or mismatch warnings.

#### Actions

- Confirm Onboarding completion.
- Return for correction with remarks.
- View supporting document.
- Follow up / resend notification where permitted.

Use IO as the confirmation actor for this design. The previous `internship detail (feedback)` label in the Screen Plan should be treated as `Internship Detail — Onboarding`.

## 11. Assessment and endorsement

### MEN-05 — Mentor Dashboard / Assessment Task

**Related stage:** C1.2  
**Screen Plan instruction:** Missing IA  
**Role:** Mentor  
**Entry:** Mentor Dashboard; notification.

Show an `Assessment due` task containing Intern name, Project, internship end date, due date, assessment status and `Start / Continue assessment` action.

### MEN-06 — Intern Assessment Form

**Related stage:** C1.2  
**Role:** Mentor  
**Entry:** MEN-05; Intern Detail > Assessment.

#### Page sections

1. Intern and internship summary.
2. Performance criteria with a five-star rating per criterion.
3. Overall Performance Assessment.
4. Strengths.
5. Areas for Improvement.
6. Additional Comments on the Intern's Performance.
7. Recommend for Career: Yes / No and supporting elaboration where applicable.
8. Recommend for Scholarship: Yes / No and supporting elaboration where applicable.
9. Optional appreciation / thank-you message.

#### Actions

- Save draft.
- Generate or refine supported elaboration using AI where enabled.
- Continue to review.

Clearly label AI-generated content and require Mentor review before submission.

### MEN-07 — Assessment Review / Confirmation

**Related stage:** C1.2  
**Role:** Mentor  
**Entry:** `Review` from MEN-06.

Display a read-only summary of all assessment sections, validation issues and the submission consequence. Actions:

- Back to edit.
- Submit assessment.

After submission, show success, date/time and the next endorsement status where applicable.

### PCH-01 — PC Head Actionable Endorsement Email

**Related stage:** C1.2.1  
**Screen Plan instruction:** Missing IA — interaction channel confirmed; detailed rules remain TBC  
**Role:** PC Head  
**Entry:** Actionable email received by the mapped PC Head at their corporate email address. No TOA login or portal navigation is required.

This is an interactive email, not a TOA screen or PC Head portal. UX must design the email content and its interaction states. The technical implementation may use an approved actionable-email mechanism, but it must return a structured response to TOA.

#### Confirmed product direction

- PC Head responds from the email rather than signing in to a PC Head portal.
- The email provides an accept/reject endorsement decision and a Remarks input.
- The submitted decision and Remarks are returned to and recorded in TOA.
- UX must treat the email as a design artefact, but not as a TOA navigation destination or portal page.

#### Email content

- Intern and internship summary.
- Read-only Assessment summary.
- Mentor and submission date.
- Accept/reject endorsement decision. Working labels are `Endorse` and `Do Not Endorse`; final wording is TBC.
- Remarks input.

#### Actions

- Select the positive or negative endorsement decision.
- Enter Remarks. The field is confirmed; its required/optional rule is TBC.
- Submit the response directly from the email.

After submission, the email service sends the decision and Remarks back to TOA against the relevant Assessment. The Assessment view for authorised internal users must update to the resulting endorsement status. The final identity, timestamp, message identifier and audit-metadata requirements remain TBC.

The current design assumption is that a response is accepted only for the intended corporate-email recipient and active invitation. UX should show states for validation, submitting, success, already responded, expired and submission failure/retry, while keeping the unresolved rules below annotated as TBC.

#### Unconfirmed points — do not let UX define these as policy

1. **Final decision labels:** whether the email uses `Accept / Reject`, `Endorse / Do Not Endorse`, or another approved wording.
2. **Remarks requirement:** whether Remarks are mandatory for both decisions, mandatory only for a negative decision, or optional for a positive decision.
3. **Email technology and supported clients:** the approved implementation, such as an Outlook actionable message or equivalent, and which desktop/mobile email clients must support the interaction.
4. **Identity validation:** how TOA verifies the responder, including corporate-email identity, invitation/message token, SSO or another control.
5. **Forwarding and delegation:** whether a forwarded email can be actioned and whether an authorised delegate may respond for the original PC Head.
6. **Response deadline:** expiry duration, reminder timing, behaviour after expiry and whether IO/IO Admin may extend or resend the invitation.
7. **Response amendment:** whether PC Head may change a submitted decision, and who may reopen or resend an endorsement request.
8. **Unsupported-client fallback:** what PC Head should do if interactive email controls are not supported or submission from the email fails permanently.
9. **Email content scope:** whether the full Assessment appears in the email, as an attachment, or as an approved read-only summary, and which personal information may be shown.
10. **Negative-decision follow-up:** resulting Assessment status, whether the Mentor must revise/resubmit, and which roles receive a notification.
11. **Audit and notification detail:** final metadata retained in TOA and the exact success/failure notifications sent to PC Head, Mentor, IO and IO Admin.

Until these are confirmed, UX may design the states listed in Appendix D using neutral working copy, but must not hard-code policy-dependent values or irreversible behaviour.

## 12. Certificate, feedback and LinkedIn sharing

### APP-11 — Certificate Entry on Intern Home

**Related stage:** C1.3  
**Screen Plan instruction:** Missing IA  
**Role:** Intern  
**Entry:** Home notification / task; My Internship.

Show a `Certificate available` card only when the Certificate has been issued. Include issue date and `View certificate` action.

### APP-12 — Certificate List

**Related stage:** C1.3  
**Role:** Intern  
**Entry:** My Internship > Certificates.

Show Certificate name, Programme / internship category, completion year, issue date and status. Support future multiple credentials without over-designing the first release.

### APP-13 — Certificate Detail / Preview

**Related stage:** C1.3  
**Role:** Intern  
**Entry:** APP-11 or APP-12.

#### Content and actions

- Certificate preview.
- Certificate metadata.
- Download Certificate.
- Digital Badge information and credential ID where available.
- LinkedIn sharing entry where enabled.

States: generating, available, reissued and unavailable/error.

### APP-14 — Internship Feedback Form

**Related stage:** C1.4  
**Screen Plan instruction:** Missing IA  
**Role:** Intern  
**Entry:** Home task; My Internship > Feedback; notification.

#### Page sections

- Overall Internship Rating.
- Project Feedback.
- Mentor Feedback.
- Learning Experience.
- Suggestions for Improvement.
- Additional Comments.
- Internship Reflection.
- Appreciation recipient: Mentor and/or IO where enabled.
- Appreciation message where a recipient is selected.
- Optional Internship photographs.
- Caption per photograph.
- Photo consent / acknowledgement.

#### Actions

- Save draft.
- Review feedback.
- Submit.

The submitted feedback becomes read-only to the Intern. Clearly explain who can access the feedback where required by policy.

### APP-15 — Feedback Review / Success

**Related stage:** C1.4  
**Role:** Intern  
**Entry:** Review from APP-14; shown as success after submission.

Before submission, display a complete read-only review. After submission:

- confirm success and submission date/time;
- provide `Return to My Internship`;
- provide `Create LinkedIn post` where available;
- do not imply that content has already been posted externally.

### APP-16 — LinkedIn Post Preview / Editor

**Related stage:** C1.4.1  
**Screen Plan instruction:** Missing IA  
**Role:** Intern  
**Entry:** Feedback success or Internship Completion section.

#### Page content

- Generated draft based on permitted internship information and reflection.
- Editable post text.
- Character count.
- Optional inclusion of Programme, Project or completion credential.
- Privacy reminder not to disclose classified or sensitive information.

#### Actions

- Regenerate where enabled.
- Copy text.
- Open LinkedIn sharing flow.
- Return to completion page.

TOA does not automatically publish the content to LinkedIn. Do not show a false `Published` state.

## 13. Testimonial screens

### MEN-08 — Intern Detail — Testimonial Section

**Related stage:** C1.4.2  
**Screen Plan instruction:** Missing IA  
**Role:** Mentor  
**Entry:** My Interns > Intern Detail; Dashboard testimonial task.

Show:

- Testimonial eligibility and request source.
- Current Testimonial status.
- Existing draft or final Testimonial.
- Clearance status.
- `Create testimonial`, `Continue draft` or `View testimonial` action.

### MEN-09 — Testimonial Editor

**Related stages:** C1.4.2 and C1.4.3  
**Role:** Mentor  
**Entry:** MEN-08; Intern testimonial request task.

#### Page sections

- Intern and internship context.
- Relevant Assessment summary.
- Intern request details where the Intern initiated the request.
- Testimonial editor.
- AI assistance controls.
- Preview.

#### Actions

- Generate draft.
- Rewrite / refine tone.
- Manually edit.
- Discard generated version.
- Save draft.
- Preview.
- Submit for clearance.

The Mentor remains responsible for the final content. AI output must never be submitted automatically.

### MEN-10 — AI Generate / Rewrite Interaction

**Related stages:** C1.4.2 and C1.4.3  
**Role:** Mentor  
**Presentation:** Drawer or modal attached to MEN-09.

Allow the Mentor to select a supported action such as generate, shorten, expand or adjust tone. Show generated content as a proposed replacement with `Use this version` and `Keep current version` actions.

### MEN-11 — Testimonial Detail / Status

**Related stages:** C1.4.2 and C1.4.3  
**Role:** Mentor; authorised internal users have a corresponding read-only view  
**Entry:** MEN-08; submitted Testimonial notification.

#### Page sections

- Final submitted content.
- Version / submission date.
- Clearance timeline.
- Remarks returned by clearance reviewers where visible to the Mentor.
- Current status.

Use generic clearance stages for HCD and DSTA Security. Do not hard-code the approval order until Product confirms it.

### APP-17 — Testimonial Request

**Related stage:** C1.4.3  
**Screen Plan instruction:** Missing IA / clarification required  
**Role:** Intern  
**Entry:** My Internship > Testimonial.

#### Page states

- Not requested: explanation and `Request testimonial` action.
- Request form: optional purpose/message and confirmation.
- Requested: request date and current status.
- In preparation / clearance: simple progress state without internal remarks.
- Available: view/download action.
- Not available / declined: neutral outcome message.

Submitting the request creates a Mentor task and uses the same Mentor Testimonial Editor as the Mentor-initiated path.

## 14. Internship feedback review

### IO-INT-03 — Internship Feedback List

**Related stage:** C1.5  
**Screen Plan instruction:** Missing IA  
**Role:** IO  
**Entry:** Internships > Feedback; Analytics deep link.

#### List content

- Intern.
- Programme / Project.
- Mentor.
- Programme Centre.
- Completion date.
- Overall rating.
- Submission date.
- Review / attention indicator where applicable.

#### Filters

- Programme and internship category.
- Programme Centre.
- Mentor.
- Rating range.
- Submission date.

### IO-INT-04 — Internship Feedback Detail

**Related stage:** C1.5  
**Role:** IO  
**Entry:** IO-INT-03.

Display all submitted ratings, comments, reflection, appreciation message and permitted photographs. Include Internship and Mentor context. The page is read-only; access is restricted to authorised roles. Provide a link to aggregated reporting where available.

## 15. Internship change requests

Use one reusable Change Request information pattern across Extension, Early Completion and Termination while retaining the Screen Plan's separate screen designs.

### Shared Change Request detail structure

- Request type and ID.
- Intern, Project and current internship period.
- Requester and submitted date/time.
- Requested effective date or revised end date.
- Reason / justification.
- Supporting documents.
- Current status.
- Review and decision timeline.
- Role-appropriate remarks.
- Final outcome and resulting internship dates/status.

### MEN-12 — Extension Request Form

**Related stage:** C1.5.1  
**Role:** Mentor  
**Entry:** Intern Detail > Actions > Request Extension.

#### Fields

- Existing internship end date — read-only.
- Requested extension period or revised end date.
- Extension justification.
- Supporting documents.

#### Actions

- Save draft where supported.
- Review request.
- Submit.

### CHG-01 — Extension Request Detail / Timeline

**Related stage:** C1.5.1  
**Roles:** Mentor, IO, Management Approver with role-specific actions  
**Entry:** Intern Detail; Change Request list; notification.

Display the shared Change Request structure. Mentor sees submitted information and non-confidential outcome. IO and Management see review information appropriate to their role.

### IO-CHG-01 — IO Extension Review

**Related stage:** C1.5.1  
**Role:** IO  
**Entry:** Dashboard task; Extension Request Detail.

#### Actions

- Recommend.
- Do Not Recommend.
- Enter mandatory recommendation remarks.
- Submit to Management Approver.

Show the effect of the proposed end date on remuneration and leave only where those values are available.

### MGT-CHG-01 — Management Extension Approval

**Related stage:** C1.5.1  
**Role:** Authorised Management Approver using the approved role configuration  
**Entry:** Approval task / secure notification.

Display the request, IO recommendation and supporting documents. Actions:

- Approve with remarks.
- Reject with remarks.

After approval, show the revised internship end date and Amendment Letter status where applicable.

### MEN-13 — Early Completion Request Form

**Related stage:** C1.5.2  
**Role:** Mentor  
**Entry:** Intern Detail > Actions > Request Early Completion.

#### Fields

- Current internship end date — read-only.
- Proposed completion date.
- Early Completion reason.
- Project milestones achieved: Yes / No.
- Supporting documents.

#### Actions

- Review.
- Submit.

### IO-CHG-02 — Early Completion Review

**Related stage:** C1.5.2  
**Role:** IO  
**Entry:** Dashboard task; Early Completion Request Detail.

Display request details, milestones and supporting documents. Actions:

- Approve with reason.
- Reject with reason.

On approval, show the updated completion date, internship outcome and Certificate eligibility result.

### CHG-02 — Early Completion Request Status / Detail

**Related stage:** C1.5.2  
**Roles:** Mentor and IO  
**Entry:** Intern Detail > Change Requests.

Use the shared detail structure with states: Submitted, Under IO Review, Approved and Rejected.

### MEN-14 — Mentor Termination Request Form

**Related stage:** C1.5.3 — Mentor-initiated  
**Role:** Mentor  
**Entry:** Intern Detail > Actions > Request Termination.

#### Fields

- Proposed effective date.
- Termination reason.
- Supporting remarks.
- Supporting documents.

Include a warning that submission starts a formal review and does not immediately terminate the internship.

### IO-CHG-03 — Mentor-initiated Termination Review

**Related stage:** C1.5.3 — Mentor-initiated  
**Role:** IO  
**Entry:** Dashboard task; Termination Request Detail.

#### Actions

- Recommend.
- Do Not Recommend.
- Enter mandatory recommendation remarks.
- Submit to Management Approver.

### MGT-CHG-02 — Termination Approval

**Related stage:** C1.5.3  
**Role:** Authorised Management Approver  
**Entry:** Approval task.

Display role-permitted request information, IO recommendation and supporting documents. Actions:

- Approve with reason.
- Reject with reason.

### CHG-03 — Termination Request Detail

**Related stage:** C1.5.3  
**Roles:** Requester, IO and Management with controlled visibility  
**Entry:** Intern Detail > Change Requests; task notification.

Use the shared detail structure. The Mentor view must not expose confidential IO/Admin-only information.

### IO-CHG-04 — IO / IO Admin Termination Request Form

**Related stage:** C1.5.3 — IO/IO Admin-initiated  
**Roles:** IO, IO Admin  
**Entry:** Internship Detail > Actions > Initiate Termination.

#### Fields

- Proposed effective date.
- Termination reason.
- Confidentiality classification / visibility.
- Supporting remarks.
- Supporting documents.

This path goes directly to the authorised Management Approver without requiring the same IO recommendation step used for a Mentor-initiated request.

### IO-CHG-05 — Restricted Termination Detail

**Related stage:** C1.5.3 — IO/IO Admin-initiated  
**Roles:** IO, IO Admin, Management Approver  
**Entry:** Change Request list; approval task.

Show confidential reason and restricted documents only to authorised roles. Mentor and other parties receive only the permitted outcome notification and effective date.

## 16. Dashboard IA revision

### COM-02 — Role-specific Dashboard

**Related item:** Common — Dashboard  
**Screen Plan instruction:** Revise IA  
**Roles:** IO, IO Admin and Mentor; Applicant uses APP-01.

#### IO / IO Admin action groups

- Applications requiring review.
- Shortlisting decisions.
- Interview outcomes requiring decision.
- Offers to prepare or follow up.
- Onboarding requiring review.
- Assessments / feedback requiring attention.
- Change Requests requiring review.
- Project Requests requiring attention — IO Admin only.

#### Mentor action groups

- Candidates assigned.
- Interviews awaiting slot setup or reschedule.
- Interview outcomes to submit.
- Active Interns.
- Assessments due.
- Testimonial tasks.
- Change Request status updates.

Each card must display a live count and deep-link to a filtered list or specific task. Do not duplicate a full operational list on the Dashboard.

## 17. Form error messages and copy

The Screen Plan item `B1.2 — Missing form error messages / copy` is a content and validation deliverable rather than navigation IA. UX should still include the following states in form designs:

- required field missing;
- invalid format;
- duplicate account or email;
- incorrect OTP;
- expired OTP;
- resend cooldown;
- upload type or size failure;
- session expired;
- system error with retry;
- successful account creation.

Use inline validation next to the relevant field and a page-level summary only when multiple errors block submission. Final wording should be confirmed through the field-level specification and content review.

## 18. Product decisions applied for UX design

The following decisions should be used for the current design round:

1. **Onboarding confirmation actor:** IO.
2. **Offer date-change request:** design within the Decline flow using a configured reason and remarks until a separate acceptance-with-date-change flow is confirmed.
3. **Offline interview scheduling:** do not design a phone-call workflow; provide a way for the Mentor to record the agreed schedule or completion.
4. **PC Head endorsement:** use an actionable corporate email. PC Head selects an accept/reject endorsement decision, enters Remarks and submits from the email; TOA records the response. Working labels are `Endorse` and `Do Not Endorse`, subject to confirmation. Do not design a PC Head portal page.
5. **Testimonial clearance:** show HCD and DSTA Security as generic clearance statuses without assuming a fixed sequence.
6. **Applicant internal visibility:** do not show eligibility reasoning, Mentor recommendation, IO recommendation, security-check information or confidential termination reasons.
7. **Change Request screens:** reuse a common layout and timeline while keeping Extension, Early Completion and Termination as distinct screen variants already counted by UX.
8. **Mobile Declaration:** retain in Onboarding until Product confirms removal.
9. **Internal Offer flow:** use two navigation destinations — IO-OFR-01 for Preparation/Review and IO-OFR-02 for the sent Offer, versions and post-send actions.
10. **Offer draft saving:** use auto-save with visible save state; do not require `Save as Draft` as the primary action.
11. **My Applications IA:** use `All / Needs Action / In Progress / Closed` as filters, derive Candidate tasks from status plus sub-status, prevent duplicate Applications within the same Programme and Application Window/Intake, and permit Candidate withdrawal after submission until Offer issuance.

## 19. Open items that should not block the first design round

UX may proceed to detailed screen design using the assumptions above. Keep these items annotated for later confirmation and do not invent final policy values:

1. PC Head actionable-email details listed under PCH-01: decision labels, Remarks requirement, email technology/client support, identity validation, forwarding/delegation, response deadline, amendment/reopen rules, fallback, content scope, negative-decision handling, audit fields and notifications.
2. Whether Candidate Application withdrawal requires a reason and, if so, the configured reason values and Remarks rule.
3. Final ordering and responsibility of HCD and DSTA Security Testimonial clearance.
4. Whether Applicant `My Offer` remains a separate list page if only one active Offer is permitted.
5. Whether multiple internship records must be supported in the first release of `My Internship`.
6. Exact reminder schedules and expiry cut-off times for other workflows.
7. Exact file types, maximum sizes and maximum file counts.
8. Exact form validation rules and final UX copy.
9. Final unique Stage ID for the IO/IO Admin-initiated Termination path, which currently duplicates `C1.5.3`.
10. Final Offer entity enumeration names for Ready to Send, Superseded and Withdrawn; the Application status flow in Appendix A remains the confirmed source until then.

## 20. UX handoff checklist

Before marking a screen complete, confirm that the design shows:

- the role and entry point;
- page title and record context;
- current status;
- required information sections;
- primary and secondary actions;
- validation and confirmation states;
- success and failure outcomes;
- responsive Applicant behaviour;
- permission-based hidden information;
- deep-link destination from task/email/notification;
- links back to the relevant list or record;
- reuse of existing TOA screen and component patterns.

## Appendix A — Status Flow Tables

### A.1 How UX should use the status tables

The status tables below separate:

1. **Confirmed source statuses** — explicitly listed in `TOA Overall Function List - New Status List (Based on Demo 0812)`.
2. **Parallel decision attributes** — values that describe eligibility, Mentor recommendation or assignment but are not the main lifecycle status.
3. **Provisional UX states** — states required to design the current screens but not yet confirmed as final system enumerations.

UX may use the provisional states to produce wireframes, but they must remain annotated as `TBC` until Product confirms the final state and enumeration catalogue.

Do not combine statuses belonging to different entities. For example, an Application, Interview and Internship may each have a status at the same time.

### A.2 Status display rules

- Internal status labels may use the confirmed status name, rendered in sentence case in the interface.
- Applicant-facing labels must use simplified language and must not expose internal decisions.
- Where an entity has a main status and sub-status, display the main status as the badge and the sub-status as supporting text.
- A trigger or action such as `Send reminder` is not itself a status.
- Loading, API failure and retry are UI states, not business statuses.
- Status history should record the previous status, new status, action, actor and date/time where auditability is required.
- The source typo `IINTERVIEW ONGOING` is normalised to `INTERVIEW ONGOING` in this brief.

### A.3 Programme status — confirmed

| Current status | Trigger | Next status | UX implication |
|---|---|---|---|
| — | Save as draft | `DRAFT` | Show `Edit`, `Continue` and permitted delete actions. |
| `DRAFT` | Create / activate Programme | `ACTIVE` | Programme becomes operational and can contain application windows. |
| `ACTIVE` | Mark Programme completed | `COMPLETED` | Show as read-only unless an authorised amendment rule exists. |

#### Intake application-window status — confirmed parallel status

| Current status | Trigger | Next status | UX implication |
|---|---|---|---|
| `CLOSED` or not started | System time enters the configured application period | `OPEN` | Applicant can access the application action. |
| `OPEN` | System time is outside the configured application period | `CLOSED` | Disable new submission and show the closed-window message. |

The Programme status and intake application-window status must be displayed separately. An `ACTIVE` Programme may have a `CLOSED` application window.

### A.4 Project Request status — confirmed

| Current status | Trigger | Next status | UX implication |
|---|---|---|---|
| — | Save Project Request | `DRAFT` | Editable by IO Admin; not yet sent or monitored. |
| `DRAFT` | Send Request | `PENDING` | Start response-deadline monitoring. |
| `PENDING` | Partial requested placements submitted | `INCOMPLETE` | Show submitted versus outstanding placements. |
| `PENDING` or `INCOMPLETE` | All requested placements submitted | `FULFILLED` | No outstanding placement action remains. |
| `PENDING` or `INCOMPLETE` | Response Deadline passes | `OVERDUE` | Show extension and follow-up actions where permitted. |
| `PENDING`, `INCOMPLETE`, `FULFILLED` or `OVERDUE` | IO manually closes the request | `CLOSED` | End the request process and make it read-only except for permitted history/actions. |
| `OVERDUE` | Response Deadline is extended | `TBC — recalculate` | The source list does not define the resulting status. Product must confirm whether it returns to `PENDING` or `INCOMPLETE` according to placements already submitted. |

### A.5 Project status — confirmed

| Current status | Trigger | Next status | UX implication |
|---|---|---|---|
| — | Create draft or upload Project | `NOT SUBMITTED` | Project remains editable by the submitting party. |
| `NOT SUBMITTED` | Submit Project | `PENDING REVIEW` | Lock submitted content except for authorised review actions. |
| `RETURN FOR UPDATE` | Resubmit Project | `PENDING REVIEW` | Create or increment the submission version and retain history. |
| `PENDING REVIEW` | IO locks / routes the Project for DCE review | `PENDING DCE APPROVAL` | Prevent AD (P&C) changes while review is in progress. |
| `PENDING REVIEW` or `PENDING DCE APPROVAL` | Return for update | `RETURN FOR UPDATE` | Show comments and an amendment/resubmission action. |
| `PENDING DCE APPROVAL` | Record rejection | `REJECTED` | Terminal outcome unless an authorised replacement process is started. |
| `PENDING DCE APPROVAL` | Record approval | `APPROVED` | Project becomes eligible for Programme assignment. |

#### Project–Programme assignment — confirmed parallel status

| Value | Rule |
|---|---|
| `ASSIGNED` | Internship year, internship category and internship window match, and at least one placement is available. |
| `NOT ASSIGNED` | The assignment conditions are not fully satisfied. |

Assignment is not a Project lifecycle status. Display it separately from `APPROVED`, `REJECTED` and other Project statuses.

### A.6 Application status — confirmed

The Applicant and DSTA see different status vocabularies for the same Application.

| Trigger | Candidate view | DSTA view | Parallel attribute / UX note |
|---|---|---|---|
| Save application | `DRAFT` | — | Applicant may resume the form. |
| Submit application | `SUBMITTED` | `PENDING SCREENING` | Application becomes read-only to the Applicant unless a correction path is opened. |
| Mandatory criteria fulfilled | `UNDER REVIEW` | `PENDING REVIEW` | Eligibility = `ELIGIBLE`. |
| Mandatory criteria not fulfilled | No immediate Candidate value defined | Existing screening state until rejection is released | Eligibility = `INELIGIBLE`. Do not expose detailed failed criteria to the Applicant. |
| IO dispatches the Applicant for Project interview | No new Candidate value defined at dispatch | `SHORTLISTED` | Interview main status = `SHORTLISTED`. |
| Mentor sends interview invitation / slots | `INTERVIEW` | `INTERVIEW ONGOING` | Interview = `INTERVIEW INVITED`; sub-status = `AWAITING CANDIDATE CONFIRMATION`. |
| Mentor submits interview outcome | Remains within Applicant Interview stage until IO acts | `INTERVIEW COMPLETED` | Mentor decision is stored separately. |
| IO refers Applicant to another Project / Talent Pool | Do not expose internal loop detail | `BACK TO UNDER REVIEW` | Return to shortlisting/rematching. |
| Security check marked complete and Offer preparation begins | Continue to show a neutral under-review state | `OFFER PREPARING` | Do not expose security-check information to the Applicant. |
| Offer sent successfully | `OFFER RECEIVED` | `AWAITING RESPONSE` | Display Offer response deadline and action. |
| Applicant accepts Offer | `OFFER ACCEPTED` | `OFFER ACCEPTED` | Create Onboarding tasks. |
| Applicant declines Offer | `OFFER DECLINED` | `OFFER DECLINED` | Store configured decline reason and permitted remarks. |
| Offer response deadline passes | `OFFER EXPIRED` | `OFFER EXPIRED` | Disable response actions unless a revised Offer is issued. |
| IO or automatic process rejects Application | `UNSUCCESSFUL` | `REJECTED` | Applicant must not see internal rejection analysis or remarks. |
| Applicant withdraws after submission and before Offer issuance | `WITHDRAWN` | `WITHDRAWN` — add to master catalogue | Make the Application read-only, cancel active Candidate interview actions and retain history. |

#### Applicant-facing status simplification

Use these mappings when the Applicant page needs a single journey label:

| DSTA status | Applicant-facing journey label |
|---|---|
| `PENDING SCREENING`, `PENDING REVIEW`, `BACK TO UNDER REVIEW` | `UNDER REVIEW` |
| `SHORTLISTED`, `INTERVIEW ONGOING`, `INTERVIEW COMPLETED` | `INTERVIEW` |
| `OFFER PREPARING` | `UNDER REVIEW` |
| `AWAITING RESPONSE` | `OFFER RECEIVED` |
| `REJECTED` | `UNSUCCESSFUL` |
| `WITHDRAWN` | `WITHDRAWN` |

### A.7 Eligibility and Mentor decision — confirmed parallel attributes

These values must not be used as the main Application status badge.

| Attribute | Confirmed values | Visibility |
|---|---|---|
| Eligibility | `ELIGIBLE`, `INELIGIBLE` | IO / IO Admin. Applicant sees only the resulting simplified Application status. |
| Mentor decision | `RECOMMENDED FOR OFFER`, `RECOMMENDED FOR REJECTION`, `REFER` | Mentor and authorised IO users. Do not expose directly to the Applicant. |

### A.8 Interview status — confirmed

| Current main status | Trigger | Next main status | Sub-status | UX implication |
|---|---|---|---|---|
| `SHORTLISTED` | Mentor sends available slot(s) | `INTERVIEW INVITED` | `AWAITING CANDIDATE CONFIRMATION` | Applicant selects a slot or requests another time. |
| `INTERVIEW INVITED` | Applicant confirms a slot | `INTERVIEW SCHEDULED` | `CANDIDATE CONFIRMED` | Show confirmed schedule and generated meeting/calendar information. |
| `INTERVIEW INVITED` or `INTERVIEW SCHEDULED` | Mentor sends replacement slot(s) | `INTERVIEW INVITED` | `AWAITING CANDIDATE CONFIRMATION` | Preserve reschedule history and require a new Applicant response. |
| `INTERVIEW SCHEDULED` | Mentor marks interview completed | `INTERVIEW COMPLETED` | `PENDING EVALUATION` | Enable Interview Outcome entry. |
| `INTERVIEW COMPLETED` | Mentor submits feedback/outcome | `COMPLETED` | — | Make the submitted outcome read-only and notify IO. |

The process diagram contains an expired-invitation branch, but the source Status List does not define a canonical expired Interview status. UX should design the expired state, while Product confirms whether it is a business status or only an action state.

### A.9 Offer response status — confirmed through Application status

The source Status List does not define a separate Offer entity status column. For the current design, use the Application statuses below to drive Offer screens. `PREPARING` and `READY TO SEND` are Offer work states used within IO-OFR-01; they do not replace the confirmed DSTA Application status `OFFER PREPARING`.

| Actor | Trigger | Offer work / record state | Candidate view | DSTA Application view | Offer screen behaviour |
|---|---|---|---|---|---|
| IO | Starts or edits Offer draft | `PREPARING` | Continue neutral under-review display | `OFFER PREPARING` | Auto-save draft; Send disabled until valid. |
| System | All mandatory Offer information becomes valid | `READY TO SEND` | Continue neutral under-review display | `OFFER PREPARING` | Enable Review and Send; this is a derived readiness state. |
| IO | Sends Offer successfully | Business label: `OFFER EXTENDED` | `OFFER RECEIVED` | `AWAITING RESPONSE` | Active Offer; Accept and Decline available. |
| Applicant | Accepts Offer | `ACCEPTED` | `OFFER ACCEPTED` | `OFFER ACCEPTED` | Read-only accepted Offer; download enabled where permitted. |
| Applicant | Declines Offer | `DECLINED` | `OFFER DECLINED` | `OFFER DECLINED` | Read-only submitted response. |
| System | Response deadline passes | `EXPIRED` | `OFFER EXPIRED` | `OFFER EXPIRED` | Read-only expired Offer; response disabled. |
| IO | Revises and re-sends Offer | `ACTIVE` new version; previous version `SUPERSEDED` | `OFFER RECEIVED` | `AWAITING RESPONSE` | Applicant can respond only to the new active version. Final enum names are TBC. |
| IO / IO Admin | Withdraws active Offer before acceptance | `WITHDRAWN` | Neutral withdrawn/unavailable message | Final DSTA Application status TBC | Disable response and reminders; retain internal reason and history. |

A revised Offer, superseded version and withdrawn Offer are required by the current screen brief, but their final canonical status names are not present in the source list and remain `TBC`.

### A.10 Onboarding status — confirmed

| Current DSTA Internship status | Trigger | Next DSTA Internship status | Candidate view | UX implication |
|---|---|---|---|---|
| — | Offer accepted and Onboarding tasks created / incomplete | `Onboarding` | Not defined in source list | Show Onboarding Checklist and incomplete-task progress. |
| `Onboarding` | Applicant submits Onboarding tasks | `Onboarding` | Not defined in source list | Show `Submitted for confirmation`; fields become read-only unless returned. |
| `Onboarding` | IO confirms Onboarding information | `Onboarding Complete` | Not defined in source list | Remove outstanding Onboarding action and prepare the active-internship state. |

The source list does not define the transition from `Onboarding Complete` to an active Internship status. Product must confirm the trigger and final enumeration.

### A.11 Provisional Offboarding and Change Request states — not final enumerations

The source Status List contains headings for Intern, Change Requests, Offboarding, Completion, Withdrawal, Forced Withdrawal, Early Completion and Extension, but does not yet provide status values. The following states are required for UX design only.

| Entity / process | Provisional UX state flow | Notes requiring Product confirmation |
|---|---|---|
| Internship lifecycle | `ONBOARDING COMPLETE` → `ACTIVE` → `COMPLETED` | Confirm the activation trigger and final canonical labels. Early Completion and Termination are exception outcomes. An approved Extension should normally update the end date and retain an active status rather than become a permanent lifecycle status. |
| Intern Assessment | `DRAFT` → `SUBMITTED` → `PENDING ENDORSEMENT` → `ENDORSED` / `NOT ENDORSED` | Confirm whether `COMPLETED` is required after endorsement and whether all categories require PC Head endorsement. |
| Internship Feedback | `DRAFT` → `SUBMITTED` | IO review is read-only and should not necessarily create a new Feedback status. |
| Certificate | `PENDING GENERATION` → `AVAILABLE` | Confirm whether the formal system value is `ISSUED`. `Generating` and generation failure may remain operational states rather than stored business statuses. |
| Testimonial | `DRAFT` → `SUBMITTED FOR CLEARANCE` → `PENDING CLEARANCE` → `RETURNED FOR UPDATE` / `CLEARED` → `AVAILABLE` | Confirm HCD and DSTA Security sequence and whether `SENT` is separate from `AVAILABLE`. |
| Extension Request | `DRAFT` → `SUBMITTED` → `UNDER IO REVIEW` → `PENDING MANAGEMENT APPROVAL` → `APPROVED` / `REJECTED` | Approval updates the internship end date and may trigger an Amendment Letter. |
| Early Completion Request | `DRAFT` → `SUBMITTED` → `UNDER IO REVIEW` → `APPROVED` / `REJECTED` | Current Product direction uses IO as final decision-maker; confirm if Management approval is ever required. |
| Mentor-initiated Termination | `DRAFT` → `SUBMITTED` → `UNDER IO REVIEW` → `PENDING MANAGEMENT APPROVAL` → `APPROVED` / `REJECTED` | Mentor sees only permitted remarks and outcome information. |
| IO/IO Admin-initiated Termination | `DRAFT` → `PENDING MANAGEMENT APPROVAL` → `APPROVED` / `REJECTED` | Confidential reasons and documents must remain restricted. |

### A.12 Status-dependent screen actions

UX should use status to determine available actions instead of displaying every action at all times.

| Entity and status | Primary action examples |
|---|---|
| Application `DRAFT` | Resume / Edit Application |
| Application `PENDING SCREENING`, `PENDING REVIEW` or `BACK TO UNDER REVIEW` | View Application / Withdraw Application before Offer issuance |
| Application `INTERVIEW` | View / Confirm Interview / Withdraw Application before Offer issuance |
| Application `OFFER RECEIVED` | View and Respond to Offer |
| Application `OFFER ACCEPTED`, `OFFER DECLINED`, `OFFER EXPIRED`, `UNSUCCESSFUL` or `WITHDRAWN` | View only |
| Interview `SHORTLISTED` | Set Up Interview |
| Interview `INTERVIEW INVITED` | View Applicant Response / Reschedule |
| Interview `INTERVIEW SCHEDULED` | View Schedule / Reschedule / Mark Completed |
| Interview `INTERVIEW COMPLETED` + `PENDING EVALUATION` | Complete Interview Outcome |
| Interview `COMPLETED` | View Submitted Outcome |
| Offer `AWAITING RESPONSE` | Accept / Decline |
| Offer `OFFER ACCEPTED`, `OFFER DECLINED` or `OFFER EXPIRED` | View only |
| Onboarding `Onboarding` before submission | Complete Tasks |
| Onboarding `Onboarding` after submission | View Submitted Information |
| Onboarding `Onboarding Complete` | View Onboarding Summary |
| Change Request `UNDER IO REVIEW` | IO Review action only |
| Change Request `PENDING MANAGEMENT APPROVAL` | Management decision action only |
| Change Request `APPROVED` or `REJECTED` | View outcome and timeline |

### A.13 Unified cross-entity status transition matrix

This matrix is the single UX reference for actor, pre-status, trigger and resulting status. Rows marked `Provisional` are design assumptions pending the final enumeration catalogue.

| Entity | Pre-status | Actor | Trigger / action | Resulting main status | Sub-status / parallel value | Applicant-facing label | Basis |
|---|---|---|---|---|---|---|---|
| Application | — | Applicant | Save application | `DRAFT` | — | `DRAFT` | Confirmed |
| Application | `DRAFT` | Applicant | Submit application | `PENDING SCREENING` | Candidate view = `SUBMITTED` | `SUBMITTED` | Confirmed |
| Application | `PENDING SCREENING` | System | Eligibility passed | `PENDING REVIEW` | Eligibility = `ELIGIBLE` | `UNDER REVIEW` | Confirmed |
| Application | `PENDING SCREENING` | System / IO | Eligibility failed and rejection released | `REJECTED` | Eligibility = `INELIGIBLE` | `UNSUCCESSFUL` | Confirmed outcome; exact delayed-release transition timing follows configuration |
| Application | `PENDING REVIEW` or `BACK TO UNDER REVIEW` | IO | Dispatch for Project interview | `SHORTLISTED` | Interview = `SHORTLISTED` | Continue `UNDER REVIEW` until invitation | Confirmed |
| Application | `SHORTLISTED` | Mentor | Send interview invitation | `INTERVIEW ONGOING` | Interview = `INTERVIEW INVITED`; `AWAITING CANDIDATE CONFIRMATION` | `INTERVIEW` | Confirmed |
| Application | `INTERVIEW ONGOING` | Mentor | Submit interview outcome | `INTERVIEW COMPLETED` | Mentor decision = Recommend Offer / Rejection / Refer | `INTERVIEW` | Confirmed |
| Application | `INTERVIEW COMPLETED` | IO | Refer to another Project / Talent Pool | `BACK TO UNDER REVIEW` | Previous attempts retained | `UNDER REVIEW` | Confirmed |
| Application | `INTERVIEW COMPLETED` | IO | Proceed to Offer / security check completed | `OFFER PREPARING` | Offer work state = `PREPARING` | `UNDER REVIEW` | Confirmed DSTA status |
| Application | `OFFER PREPARING` | IO | Send Offer | `AWAITING RESPONSE` | Offer business label = `OFFER EXTENDED` | `OFFER RECEIVED` | Confirmed DSTA/Candidate statuses |
| Application | `AWAITING RESPONSE` | Applicant | Accept Offer | `OFFER ACCEPTED` | Offer = `ACCEPTED` | `OFFER ACCEPTED` | Confirmed |
| Application | `AWAITING RESPONSE` | Applicant | Decline Offer | `OFFER DECLINED` | Decline reason stored | `OFFER DECLINED` | Confirmed |
| Application | `AWAITING RESPONSE` | System | Response Deadline passes | `OFFER EXPIRED` | — | `OFFER EXPIRED` | Confirmed |
| Application | Any open review state | IO / System | Reject Application | `REJECTED` | Internal reason retained | `UNSUCCESSFUL` | Confirmed |
| Application | Any submitted pre-Offer state | Applicant | Withdraw Application before Offer issuance | `WITHDRAWN` | Cancel active Candidate interview actions; retain history | `WITHDRAWN` | Confirmed Product direction; add enum to master Status List / SyRS |
| Interview | `SHORTLISTED` | Mentor | Publish slot(s) | `INTERVIEW INVITED` | `AWAITING CANDIDATE CONFIRMATION` | Invitation to confirm | Confirmed |
| Interview | `INTERVIEW INVITED` | Applicant | Confirm slot | `INTERVIEW SCHEDULED` | `CANDIDATE CONFIRMED` | Interview confirmed | Confirmed |
| Interview | `INTERVIEW INVITED` or `INTERVIEW SCHEDULED` | Mentor | Reschedule / publish replacement slots | `INTERVIEW INVITED` | `AWAITING CANDIDATE CONFIRMATION` | New time requires confirmation | Confirmed |
| Interview | `INTERVIEW SCHEDULED` | Mentor | Mark completed | `INTERVIEW COMPLETED` | `PENDING EVALUATION` | Interview completed | Confirmed |
| Interview | `INTERVIEW COMPLETED` | Mentor | Submit outcome | `COMPLETED` | Mentor decision stored separately | Interview completed | Confirmed |
| Offer work item | — | IO | Start preparing Offer | `PREPARING` | Application = `OFFER PREPARING` | Continue `UNDER REVIEW` | UX work state |
| Offer work item | `PREPARING` | System | All readiness checks pass | `READY TO SEND` | Application remains `OFFER PREPARING` | Continue `UNDER REVIEW` | Derived UX work state |
| Offer record | `READY TO SEND` | IO | Send successfully | `OFFER EXTENDED` / active | Application = `AWAITING RESPONSE` | `OFFER RECEIVED` | Business label plus confirmed Application status |
| Offer record | Active / `AWAITING RESPONSE` | IO | Revise and re-send | New active version | Previous version = `SUPERSEDED` | `OFFER RECEIVED` | Provisional Offer enum |
| Offer record | Active / `AWAITING RESPONSE` | IO / IO Admin | Withdraw before acceptance | `WITHDRAWN` | Application result TBC | Offer unavailable / withdrawn | Provisional Offer enum |
| Onboarding | — | System | Offer accepted and tasks created | `Onboarding` | Task-level progress | Onboarding action required | Confirmed DSTA status |
| Onboarding | `Onboarding` | Applicant | Submit tasks | `Onboarding` | Submitted for confirmation | Submitted | Confirmed main status; Candidate label is UX copy |
| Onboarding | `Onboarding` | IO | Confirm Onboarding | `Onboarding Complete` | — | Onboarding completed | Confirmed DSTA status |
| Internship | `Onboarding Complete` | System / IO | Internship starts / activation confirmed | `ACTIVE` | — | Internship active | Provisional |
| Internship | `ACTIVE` | System / IO | Normal internship end confirmed | `COMPLETED` | Completion tasks triggered | Internship completed | Provisional |
| Assessment | — | System | Assessment task becomes due | `DRAFT` / not started | Due date | Assessment required | Provisional |
| Assessment | `DRAFT` | Mentor | Submit Assessment | `SUBMITTED` | `PENDING ENDORSEMENT` where required | Not Applicant-facing | Provisional |
| Assessment | `SUBMITTED` | PC Head | Submit positive endorsement through actionable email | `ENDORSED` | TOA records decision and Remarks; final audit metadata TBC | Not Applicant-facing | Provisional |
| Assessment | `SUBMITTED` | PC Head | Submit negative endorsement through actionable email | `NOT ENDORSED` | TOA records decision and Remarks; requiredness and follow-up TBC | Not Applicant-facing | Provisional |
| Testimonial | — | Mentor or Intern request | Start Testimonial | `DRAFT` | Request source retained | Requested / in preparation | Provisional |
| Testimonial | `DRAFT` | Mentor | Submit for clearance | `PENDING CLEARANCE` | HCD / Security stages | In preparation | Provisional |
| Testimonial | `PENDING CLEARANCE` | Clearance reviewer | Return for update | `RETURNED FOR UPDATE` | Remarks | In preparation | Provisional |
| Testimonial | `PENDING CLEARANCE` | Clearance reviewer(s) | Clear final content | `CLEARED` | — | Available soon | Provisional |
| Testimonial | `CLEARED` | System / authorised user | Release to Intern | `AVAILABLE` | — | Testimonial available | Provisional |
| Extension Request | `DRAFT` | Mentor | Submit | `SUBMITTED` | — | Submitted | Provisional |
| Extension Request | `SUBMITTED` | IO | Recommend / Do Not Recommend | `PENDING MANAGEMENT APPROVAL` | IO recommendation | Under review | Provisional |
| Extension Request | `PENDING MANAGEMENT APPROVAL` | Management Approver | Approve / Reject | `APPROVED` / `REJECTED` | New end date on approval | Approved / Not approved | Provisional |
| Early Completion Request | `DRAFT` | Mentor | Submit | `UNDER IO REVIEW` | — | Submitted / under review | Provisional |
| Early Completion Request | `UNDER IO REVIEW` | IO | Approve / Reject | `APPROVED` / `REJECTED` | Outcome and Certificate eligibility updated | Approved / Not approved | Provisional |
| Mentor Termination Request | `DRAFT` | Mentor | Submit | `UNDER IO REVIEW` | — | Submitted / under review | Provisional |
| Mentor Termination Request | `UNDER IO REVIEW` | IO | Recommend / Do Not Recommend | `PENDING MANAGEMENT APPROVAL` | IO recommendation | Under review | Provisional |
| Mentor Termination Request | `PENDING MANAGEMENT APPROVAL` | Management Approver | Approve / Reject | `APPROVED` / `REJECTED` | Effective date on approval | Permitted neutral outcome | Provisional |
| IO/Admin Termination Request | `DRAFT` | IO / IO Admin | Submit | `PENDING MANAGEMENT APPROVAL` | Confidential reason restricted | Not visible until permitted notification | Provisional |
| IO/Admin Termination Request | `PENDING MANAGEMENT APPROVAL` | Management Approver | Approve / Reject | `APPROVED` / `REJECTED` | Effective date on approval | Permitted neutral outcome | Provisional |

## Appendix B — Role and Action Matrix for Design

### B.1 Legend

- **V** — view.
- **C/E** — create or edit.
- **S** — submit or perform the primary action.
- **R** — review, return or recommend.
- **A** — final approval.
- **Own** — only the user's own record.
- **Assigned** — only records assigned to the user.
- **—** — no screen access in the current scope.

### B.2 Matrix

| Screen / capability | Applicant / Intern | Mentor | IO | IO Admin | PC Head | Management Approver |
|---|---|---|---|---|---|---|
| Applicant Home, own Applications and Profile | V/C/E/S — Own | — | V where authorised | V where authorised | — | — |
| Candidate application documents | V — Own | V — Assigned and category-permitted | V | V | — | — |
| Eligibility and shortlisting | Result only | — | V/R/S | V/R/S | — | — |
| Candidate 360 | — | Limited assigned-candidate information only through Candidate Profile | V | V | — | — |
| Interview slot setup / reschedule | Confirm/request change — Own | C/E/S — Assigned | V | V | — | — |
| Interview Outcome | — | C/E/S then V — Assigned | V | V | — | — |
| IO decision after interview | Outcome only when communicated | No internal IO remarks | R/S | R/S | — | — |
| Offer preparation, review and send | — | — | C/E/S | C/E/S | — | — |
| Sent Offer / version history | V active/own permitted versions | — | V/E subject to state | V/E subject to state | — | — |
| Offer response | S — Own | — | V | V | — | — |
| Onboarding tasks | C/E/S — Own | V only if explicitly required | V/R/confirm | V/R/confirm | — | — |
| Intern Assessment | No access unless a permitted final document is released | C/E/S — Assigned | V | V | R/S through mapped corporate email only | — |
| Internship Feedback | C/E/S then V — Own | No access unless explicitly authorised | V | V | — | — |
| Testimonial | Request and view final — Own | C/E/S — Assigned | V / clearance tracking where authorised | V / clearance tracking where authorised | — | — |
| Extension Request | View permitted outcome | C/E/S — Assigned | R/S | R/S | No action unless separately configured | A |
| Early Completion Request | View permitted outcome | C/E/S — Assigned | R/A under current direction | R/A under current direction | — | — |
| Mentor-initiated Termination | Permitted outcome only | C/E/S and permitted outcome | R/S | R/S | — | A |
| IO/Admin-initiated Termination | Permitted outcome only | Permitted outcome only; no confidential reason | C/E/S | C/E/S | — | A |
| Confidential termination reasons/documents | — | — | V subject to classification | V subject to classification | — | V/A subject to classification |
| Dashboard / Work Queue | Applicant Home only | Assigned tasks | Role work queue | Role work queue plus admin-specific tasks | — (email action only; no TOA portal in current scope) | Approval queue |

### B.3 Permission design rules

- Hide unavailable actions rather than displaying controls that the role can never use.
- Disable an action only when the role normally has access but the current status blocks it; explain why.
- Apply field-level masking to NRIC, bank information, IMEI and other classified data according to the approved data classification.
- Mentor access to CV and academic transcript must be independently configurable and limited to assigned candidates.
- Applicant and Mentor views must not reveal confidential IO, IO Admin, security or Management remarks.
- The same detail page may display different sections and actions by role; UX should annotate role variants instead of duplicating the entire page unnecessarily.

## Appendix C — Minimum Field Specifications for Screen Design

These specifications provide the minimum information required to design controls and layouts. Exact character limits, file types and file sizes remain governed by the final field-level specification; do not invent visible limits in the UI until confirmed.

### C.1 Common field behaviour

- Mark required fields consistently.
- Show conditional fields only when their trigger condition applies.
- Preserve valid values when the user moves between steps or returns to a draft.
- For auto-saved forms, show save state without requiring a `Save Draft` button.
- Use inline validation after blur and on submission; do not validate untouched fields immediately on load.
- Date and time display for Singapore users: `DD MMM YYYY`, `HH:mm`, timezone `SGT` where ambiguity is possible.
- Do not allow an end date earlier than a start date.
- File-upload components must support upload progress, success, failure, replace, remove and download/view where permitted.
- For text areas with an unconfirmed maximum length, design sufficient space for realistic multi-paragraph content but do not show a numerical character counter.

### C.2 Interview scheduling — MEN-02 / APP-05

| Field | Control | Required | Default / source | Editable / validation |
|---|---|---|---|---|
| Candidate and Project | Read-only summary | Yes | Assigned shortlist record | Not editable. |
| Interview slot date | Date picker | Yes | None | Must be a permitted future date. |
| Start time | Time picker | Yes | None | Must precede end time. |
| Duration / end time | Duration select or time picker | Yes | Configured interview duration | Must be positive and within permitted scheduling rules. |
| Meeting mode | Single-select | Yes | Configured default | Online / in-person or configured values. |
| Location / meeting information | Text / configured location | Conditional | Based on meeting mode | Required when relevant. Meeting link may be system-generated after Applicant confirmation. |
| Applicant response deadline | Date/time or derived text | Where configured | System rule | Must be before the proposed slot. Exact rule TBC. |
| Reschedule reason | Text area | Conditional | None | Required when Mentor replaces a confirmed schedule. |

### C.3 Interview Outcome — MEN-03

| Field | Control | Required | Default / source | Editable / validation |
|---|---|---|---|---|
| Attendance outcome | Single-select | Yes | Interview record | Values must cover attended, withdrawn/no longer proceeding and other approved outcomes. Final enum TBC. |
| Candidate Assessment | Radio / single-select | Yes | None | Recommend for Offer, Refer, Recommend for Rejection. |
| Assessment remarks | Text area | Yes | None | Must support realistic multi-paragraph feedback. |
| Interview notes | Text area | No | None | Internal visibility only. |
| Transcript / notes attachment | File upload | No | None | Exact file rules TBC. |
| Confirmed start date | Date picker | Yes where Offer is recommended | Applicant availability / interview discussion | Must fall within permitted internship window. |
| Confirmed end date | Date picker | Yes where Offer is recommended | Selected duration | Must be after start date and comply with duration/window rules. |

### C.4 Offer Preparation — IO-OFR-01

Use the complete source/editability table in Section 9. Additionally:

- unresolved template variables must block `READY TO SEND`;
- changing the template must warn before replacing manually edited letter content;
- remuneration override must require an authorised role and reason;
- Response Deadline and dates must show inline relationship errors;
- preview must use realistic multi-page letter content;
- send failure must retain the auto-saved draft.

### C.5 Onboarding — APP-10 / IO-INT-02

| Field / task | Control | Required | Default / source | Conditional / validation |
|---|---|---|---|---|
| Profile photograph | Image upload / preview | Conditional | Reuse valid Application photo | Required when no valid photo exists. Exact image rules TBC. |
| Bank name | Searchable single-select or approved selector | Yes unless exempt | Existing verified Candidate 360 value | Reference-data source TBC; allow update only after shared-profile warning. |
| Bank account holder name | Text input | Yes unless exempt | Existing verified value | Must match supporting document subject to review. |
| Bank account number | Masked text input | Yes unless exempt | Existing verified value, masked | Bank-specific format rules TBC. Provide show/hide only where approved. |
| Bank supporting document | File upload | Yes when bank details submitted/changed | Existing verified document where reusable | Exact file rules TBC. |
| Mobile Declaration / IMEI | Guided form / text input | Conditional | Existing value where available | Requirement depends on configured onboarding rules. |
| Acceptable Use Policy | Document/link plus checkbox | Yes | Active configured policy | Acknowledgement must be recorded with date/time and version. |
| Entry-pass instruction | QR/instruction block | Conditional | Configuration | May be informational or an external action. |

### C.6 Intern Assessment — MEN-06

| Field | Control | Required | Default / source | Conditional / validation |
|---|---|---|---|---|
| Performance rating per criterion | Five-star rating | Yes | Configured criterion list | One rating per applicable criterion. |
| Overall Performance Assessment | Rating / configured control | Yes | None | Scale must be consistent with configured assessment. |
| Strengths | Text area | Yes | None | Multi-line. |
| Areas for Improvement | Text area | Yes | None | Multi-line. |
| Additional Comments | Text area | No | None | Multi-line. |
| Recommend for Career | Yes/No | Conditional | None | Display where applicable. |
| Career elaboration | Text area with optional AI assistance | Conditional | None / generated draft | Required when the configured recommendation rule requires it. |
| Recommend for Scholarship | Yes/No | Conditional | None | Display where applicable. |
| Scholarship elaboration | Text area with optional AI assistance | Conditional | None / generated draft | Required when the configured recommendation rule requires it. |
| Appreciation message | Text area | No | None | Subject to clearance where required. |

### C.7 Internship Feedback — APP-14

| Field | Control | Required | Default / source | Conditional / validation |
|---|---|---|---|---|
| Overall Internship Rating | Rating scale | Yes | None | Display scale labels, not numbers alone. |
| Project Feedback | Rating plus text area | Yes | None | Final scale TBC. |
| Mentor Feedback | Rating plus text area | Yes | None | Final scale TBC. |
| Learning Experience | Rating plus text area | Yes | None | Final scale TBC. |
| Suggestions for Improvement | Text area | No | None | Multi-line. |
| Additional Comments | Text area | No | None | Multi-line. |
| Internship Reflection | Text area | No | None | May feed the LinkedIn draft with explicit user action. |
| Appreciation recipient | Multi-select | Conditional | Associated Mentor / IO | Show only eligible recipients. |
| Appreciation message | Text area | Conditional | None | Required when recipient selected if configured. |
| Internship photographs | Multi-file image upload | No | None | File count/type/size TBC. |
| Photo caption | Text input | Conditional | None | Required per photo only if configured. |
| Photo consent | Checkbox | Conditional | Active consent text | Required when photos are uploaded. |

### C.8 Testimonial — MEN-09 / APP-17

| Field | Control | Required | Default / source | Conditional / validation |
|---|---|---|---|---|
| Request purpose/message | Text area | No | Intern input | Visible to assigned Mentor. |
| Testimonial content | Rich text or supported editor | Yes before submission | Manual or AI-assisted draft | Mentor must review/edit before submission. |
| AI action | Generate/rewrite controls | No | Assessment and permitted internship context | Must not auto-submit or overwrite without confirmation. |
| Clearance remarks | Read-only / text area by reviewer | Conditional | Clearance workflow | Visibility depends on role. |

### C.9 Change Requests

| Request type | Required fields | Conditional fields / rules |
|---|---|---|
| Extension | Requested extension period or revised end date; justification | Supporting documents where relevant; revised date must be later than current end date. |
| Early Completion | Proposed completion date; reason; Project milestones achieved | Supporting documents; proposed date must precede current end date. |
| Mentor Termination | Effective date; reason | Supporting remarks/documents; formal-review warning required. |
| IO/Admin Termination | Effective date; reason; confidentiality/visibility classification | Supporting remarks/documents; restricted information must be role controlled. |
| IO review | Recommend / Do Not Recommend; reason | Required for Extension and Mentor-initiated Termination. |
| Management decision | Approve / Reject; reason | Required where Management is the final approver. |

### C.10 PC Head Actionable Endorsement Email — PCH-01

| Field / data | Control | Required | Default / source | Conditional / validation |
|---|---|---|---|---|
| Intern and internship summary | Read-only email content | Yes | Submitted Assessment and internship record | Display only information approved for PC Head review. |
| Assessment summary | Read-only email content / approved attachment or content block | Yes | Submitted Mentor Assessment | Must identify the Assessment version being endorsed. |
| Decision | Single-select action | Yes | None | Positive/negative endorsement; working values are `Endorse`, `Do Not Endorse`. Final labels TBC. |
| Remarks | Multi-line text input in email | TBC | None | Field confirmed; requiredness by decision is TBC. |
| Recipient identity | System-captured | TBC | Intended corporate email recipient | Exact identity validation, forwarding and delegation rules TBC. |
| Submission metadata | System-captured | TBC | Assessment ID and technical response metadata | Final timestamp, invitation/message ID and audit-retention requirements TBC. |

## Appendix D — Screen and Frame Matrix

`Mobile required` means UX must provide a mobile design frame. `Responsive behaviour only` means desktop is the primary frame but UX must annotate how the layout adapts at the stated minimum width.

| Screen IDs | Required design frames / states | Responsive requirement | Reuse guidance |
|---|---|---|---|
| APP-01 | No application; draft; under review; interview task; Offer task; Onboarding task; active internship; completion task | Mobile 390 and desktop 1440 required | One state-aware Home template. |
| APP-02 | Empty; draft only; multiple applications; All/Needs Action/In Progress/Closed filters; action-required cards; closed outcomes | Mobile and desktop required | Reuse one responsive list/card pattern with status-derived content. |
| APP-03 | Under review; Interview section active; Offer section active; Withdraw confirmation; withdrawn/read-only; outcome/closed | Mobile and desktop required | One Application Detail with conditional sections and status-controlled actions. |
| IO-APP-01 | Default shortlist; filtered; candidates selected; no results | Desktop 1440; annotate 1024 | Reuse existing shortlisting workspace. |
| IO-APP-02 | Talent Pool results; empty; candidate selected | Desktop 1440; annotate 1024 | Reuse candidate-result table. |
| IO-APP-03 | Default review; override reason; reject confirmation; decision success | Desktop 1440; annotate 1024 | Reuse Application Detail shell. |
| COM-01 | Overview; Applications; Interviews; Internships; Documents; restricted notes | Desktop 1440; annotate 1024 | One Candidate 360 shell with role-visible tabs. |
| MEN-01 | Project list; candidate list; calendar; empty/no tasks | Desktop 1440; annotate 1024 | Reuse Mentor shell and cards/list. |
| MEN-02 | Set slots; awaiting confirmation; confirmed; reschedule requested; expired; offline arrangement | Desktop 1440; responsive behaviour at 1024 | One Interview Detail state machine. |
| MEN-03 | Draft; validation errors; review-ready; submit confirmation; submit failure | Desktop 1440; responsive behaviour at 1024 | Form pattern. |
| MEN-04 | Submitted/read-only; returned for amendment | Desktop 1440; responsive behaviour at 1024 | Read-only version of MEN-03. |
| APP-04 | No interviews; action required; scheduled; completed | Mobile and desktop required | Responsive list/card pattern. |
| APP-05 | Select slot; confirm; reschedule request; confirmed; expired; withdrawn | Mobile and desktop required | One responsive detail page. |
| IO-APP-04 | Review; Proceed to Offer; Refer; Reject; decision success/failure | Desktop 1440; annotate 1024 | Reuse Application Detail shell and decision panel. |
| IO-OFR-01 | Preparing; saving; saved; save failed; readiness errors; Ready to Send; Review; send confirmation; send failure | Desktop 1440; annotate 1024 | Two-panel editor/preview; stack at 1024. |
| IO-OFR-02 | Awaiting response; accepted; declined; expired; revise/resend; superseded; withdrawn | Desktop 1440; annotate 1024 | Reuse record-detail, version and timeline patterns. |
| APP-06 | Active Offer; previous/superseded history; no active Offer | Mobile and desktop required | Responsive Offer list/card. |
| APP-07 | Awaiting response; accept confirmation; decline modal; accepted; declined; expired; superseded | Mobile and desktop required | Single Offer Detail with state variants. |
| APP-08 | Welcome/Onboarding; active; completion; multiple records if supported | Mobile and desktop required | One Internship Detail shell. |
| APP-09 | Not available; available; updated/reissued; load error | Mobile and desktop required | Reuse document preview. |
| APP-10 | Checklist not started; in progress; upload; validation errors; review; submitted; returned; completed | Mobile and desktop required | Reuse task checklist and form sections. |
| IO-INT-01 | Default queue; filters; no results; attention state | Desktop 1440; annotate 1024 | Reuse internal work-queue table. |
| IO-INT-02 | Submitted review; mismatch warning; return correction; confirm; completed | Desktop 1440; annotate 1024 | Reuse Internship Detail shell. |
| MEN-05 | Assessment due; overdue; submitted | Desktop 1440; annotate 1024 | Dashboard task card/list. |
| MEN-06 | Not started; auto-saved draft; AI assistance; validation errors; ready for review | Desktop 1440; annotate 1024 | Assessment form pattern. |
| MEN-07 | Review; submit confirmation; success; failure | Desktop 1440; annotate 1024 | Read-only review pattern. |
| PCH-01 | Default email; positive decision; negative decision; Remarks validation variant; submitting; success; already responded; expired; submission failure/retry | Desktop and mobile email-client layouts | Actionable email template; labels and policy-dependent rules remain TBC; no TOA page or portal shell. |
| APP-11 to APP-13 | Home card; certificate list; generating; available; preview; reissued; error | Mobile and desktop required | Reuse document/card patterns. |
| APP-14, APP-15 | Draft; validation; review; submit confirmation; success; submitted/read-only | Mobile and desktop required | Multi-section responsive form. |
| APP-16 | Initial generated draft; edited; regenerate confirmation; copied/shared; external-open failure | Mobile and desktop required | Editor/preview pattern. |
| MEN-08 to MEN-11 | Empty; draft; AI proposal; preview; pending clearance; returned; cleared; available | Desktop 1440; annotate 1024 | Reuse Intern Detail, editor and timeline patterns. |
| APP-17 | Not requested; request form; submitted; in preparation; available; unavailable | Mobile and desktop required | Reuse My Internship section and status card. |
| IO-INT-03, IO-INT-04 | List/default/empty/filter; detail/read-only/restricted | Desktop 1440; annotate 1024 | Reuse work queue and Internship Detail. |
| MEN-12, CHG-01, IO-CHG-01, MGT-CHG-01 | Draft; submitted; IO review; Management approval; approved; rejected | Mentor desktop with 1024 adaptation; internal desktop | Shared Change Request shell and timeline. |
| MEN-13, IO-CHG-02, CHG-02 | Draft; submitted; IO review; approved; rejected | Mentor desktop with 1024 adaptation; IO desktop | Shared Change Request shell and timeline. |
| MEN-14, IO-CHG-03, MGT-CHG-02, CHG-03 | Draft; submitted; IO review; Management approval; approved; rejected; restricted view | Internal/Mentor desktop; annotate 1024 | Shared Change Request shell with role variant. |
| IO-CHG-04, IO-CHG-05 | Draft; confidential fields; approval; approved; rejected; restricted disclosure | Desktop 1440; annotate 1024 | Shared Change Request shell with field-level restriction. |
| COM-02 | IO; IO Admin; Mentor; empty/no tasks; loading/failure | Desktop 1440; annotate 1024 | Role-specific content in one Dashboard pattern. |

## Appendix E — Sample Content for UX Mockups

Use one consistent fictional record across related screens so the design demonstrates realistic content length and continuity. The values below are mock content only and do not define business policy.

### E.1 Primary sample record

| Item | Sample value |
|---|---|
| Applicant | Amelia Tan Wei Ling |
| Long-name test | Nur Aisyah Binte Mohamed Ibrahim |
| Application ID | APP20260423-00001 |
| Interview ID | IS20260423-00001 |
| Programme | DSTA Undergraduate Internship Programme 2026 |
| Internship category | Undergraduate Student |
| Project | AI-Assisted Mission Planning and Decision Support for Complex Maritime Operations |
| Programme Centre | C4I Programme Centre |
| Mentor | Marcus Lim, Senior Engineer |
| Interview | 18 Aug 2026, 10:00–10:45 SGT |
| Internship period | 1 Sep 2026–30 Nov 2026 |
| Reporting location | DSTA, 1 Depot Road, Singapore 109679 |
| Remuneration | SGD 1,500 per month — illustrative display value only |
| Offer Response Deadline | 25 Aug 2026, 23:59 SGT |
| Extension requested end date | 31 Dec 2026 |

### E.2 Sample UX copy

| Scenario | Suggested working copy |
|---|---|
| Auto-save complete | `All changes saved at 14:32.` |
| Auto-save failed | `We couldn't save your latest changes. Your entries are still on this page. Try again before leaving.` |
| Offer send confirmation | `Send this Offer to Amelia Tan Wei Ling? She will be notified and must respond by 25 Aug 2026, 23:59 SGT.` |
| Offer send success | `Offer sent successfully.` |
| Offer expired | `This Offer expired on 25 Aug 2026 and can no longer be accepted or declined.` |
| Interview reschedule | `Your interview time has changed. Select and confirm a new slot.` |
| Onboarding submitted | `Your Onboarding information has been submitted for review.` |
| Onboarding returned | `Some Onboarding information needs your attention. Review the highlighted tasks and submit again.` |
| Assessment submitted | `Assessment submitted successfully. You can view the submitted assessment while endorsement is pending.` |
| PC Head endorsement prompt | `Review the assessment, select your endorsement decision and enter any required Remarks.` — working copy; labels and requiredness TBC. |
| PC Head endorsement success | `Your endorsement response has been submitted to TOA.` |
| Restricted information | `You do not have permission to view this information.` |
| Change Request submitted | `Request submitted. You will be notified when the review status changes.` |

UX should also test layouts with:

- a Project title of at least 90 characters;
- a multi-paragraph Assessment remark;
- four or more supporting-document filenames;
- a three-step approval timeline;
- a long email address and long Programme Centre name;
- both no-data and high-volume list states.

## Appendix F — Responsive Design Scope

### F.1 Required design canvases

| User group | Required frames | Minimum design expectation |
|---|---|---|
| Applicant / Intern | 390 px mobile and 1440 px desktop | Produce both frames for every APP screen. Review layout at 768 px tablet. |
| PC Head actionable email | Desktop and mobile email-client layouts | Interactive decision controls, remarks and submission states must remain usable in supported corporate email clients. |
| Mentor | 1440 px desktop | Annotate behaviour down to 1024 px. A dedicated mobile design is not required in the current scope unless separately requested. |
| IO / IO Admin / Management | 1440 px desktop | Annotate behaviour down to 1024 px. Tables may use horizontal scrolling only as a last resort. |

These widths are design-review canvases, not implementation breakpoint constants.

### F.2 Responsive behaviour rules

- Convert Applicant tables into cards or stacked rows on mobile.
- Stack two-column forms into a single column on mobile.
- Keep the current status and primary action visible near the top of the page.
- Use a sticky bottom action bar on mobile for critical actions such as Confirm Interview, Accept/Decline Offer and Submit Onboarding.
- Allow horizontal scrolling for tab labels; do not compress them into unreadable text.
- Replace persistent side navigation with the approved mobile drawer/navigation pattern.
- Document preview pages should fit width and provide explicit zoom/download controls.
- Drawers on desktop should become full-screen sheets or pages on mobile where content is substantial.
- Confirmation dialogs must fit within the mobile viewport without hiding actions.
- Preserve a minimum 44 px touch target for mobile controls.
- Long status labels and Project titles must wrap without clipping.
