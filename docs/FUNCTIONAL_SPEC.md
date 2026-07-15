# DSTA Talent Outreach & Acquisition (TOA) Portal — Functional Specification

> **Status:** Derived from the working prototype (Next.js mockup, localStorage-backed).
> This document captures the intended behaviour as expressed by the prototype logic and
> is written as **epics → user stories → acceptance criteria**. It is a functional
> specification, not an implementation guide.

---

## 1. Purpose & Scope

The TOA Portal manages the end-to-end DSTA internship lifecycle: sourcing internship
projects from divisions, publishing internship programmes and intakes, receiving and
screening student applications, matching and shortlisting candidates, running interviews,
extending offers, onboarding interns, and offboarding them at the end of the internship.

**In scope:** the Internship workstream (live). Outreach and Scholarship workstreams are
placeholders in the navigation and out of scope for this spec.

## 2. Personas / Roles

| Role | Persona (demo) | Description |
|------|----------------|-------------|
| **IO** | Rachel Koh | Internship Officer — manages applications, screening, shortlisting, offers, interns. |
| **IO-Admin** | Davina Tan | Senior Internship Officer — everything an IO can do, plus project requests and the Admin console. |
| **AD-PnC** | Ng Shu Qi | AD (Personnel & Contracts) — submits internship projects in response to IO requests. |
| **Mentor** | Wei Jian Lim | Project mentor — proposes interview slots, evaluates candidates, confirms onboarding, evaluates interns. |
| **Director** | Abbey Chua | Approval authority for offboarding requests (withdrawal, termination, extension, early completion). |
| **Applicant (New)** | Jenny Aw | First-time student internship applicant. |
| **Applicant (Existing Scholar)** | Marcus Tan | Existing DSTA scholarship candidate applying for a programme. |

> A **DCE** (Deputy Chief Executive) approval role exists in the schema but is dormant;
> it can be re-enabled via a feature flag for a secondary offer/submission approval gate.

## 3. Epic Map

The requested flow (Project Creation → Programme Creation → Applications → Screening →
Matching → Shortlisting → Interview → Offer → Onboarding → Offboarding) is preserved, with
two refinements: **Project Creation** is split into *sourcing/submission* vs
*review/approval/pooling* (they involve different roles and states), and **cross-cutting
capabilities** (access, admin config, notifications, analytics) that don't fit the linear
funnel are given their own epics.

| # | Epic | Primary roles |
|---|------|---------------|
| E1 | Platform Access & Role Portals | All |
| E2 | Project Sourcing & Submission | IO-Admin, AD-PnC |
| E3 | Project Review, Approval & Pooling | IO / IO-Admin |
| E4 | Programme & Intake Setup | IO / IO-Admin |
| E5 | Eligibility Criteria Configuration | IO / IO-Admin |
| E6 | Applications & Applicant Portal | Applicant |
| E7 | Application Screening | System, IO |
| E8 | Applicant–Project Matching & Suitability Scoring | System, IO |
| E9 | Shortlisting | IO |
| E10 | Interviews & Evaluation | Mentor, Applicant, IO |
| E11 | Offer & Approval | IO, (DCE optional), Applicant |
| E12 | Onboarding | Applicant, Mentor, IO |
| E13 | Offboarding & Post-Internship | Mentor, IO, Applicant, Director |
| E14 | Administration, Notifications & Analytics | IO-Admin |

**Legend:** each story is `As a <role>, I want <capability>, so that <benefit>`.
**AC** = acceptance criteria / business rules.

---

## E1 — Platform Access & Role Portals

**E1-S1 — Applicant sign-in.** As an applicant, I want to sign in with Singpass (or a
guardian's Singpass for under-16s), so that I can access my application portal securely.
- **AC:** Applicant login offers Singpass; a guardian option lets a parent set up an
  under-16 account (flagged `guardian`). Session records method + timestamp and persists.

**E1-S2 — Staff sign-in.** As a staff member, I want to sign in with Corppass or staff SSO,
so that I reach my role's console.
- **AC:** Staff login offers Corppass / WOG SSO. Applicant and staff audiences are
  segregated; a role mismatch redirects to the role's home.

**E1-S3 — Role-aware navigation.** As a signed-in user, I want to see only the navigation
and pages relevant to my role, so that I'm not exposed to irrelevant functions.
- **AC:** Rail + topbar render a per-role tree (e.g. IO: Dashboard/Programmes/Projects/
  Applications/Internships/Analytics, plus Requests + Admin for IO-Admin; Mentor: Dashboard/
  My Projects/Candidates/My Interns; AD-PnC: Dashboard/Project Requests/My Projects;
  Director: Approvals). Applicant routes (`/apply/*`) are inaccessible to staff and vice versa.

**E1-S4 — Action badges.** As a staff user, I want live counts on my nav items, so that I
know where work is waiting.
- **AC:** Badges reflect real pending counts (e.g. IO applications awaiting screening/review,
  pending project submissions, interns needing onboarding/COC; mentor interviews/evaluations
  awaiting action; director pending requests).

**E1-S5 — Role-specific dashboard.** As any signed-in user, I want a dashboard summarising
what needs my attention, so that I can act quickly.
- **AC:** IO dashboard shows a live applicant funnel, cohort filter, quick-create actions,
  and task cards. Mentor, AD-PnC, Director and Applicant dashboards each surface their
  role's tasks and summaries.

**E1-S6 — Cross-portal search & notifications.** As a staff user, I want a global search and
a notifications bell, so that I can find records and stay on top of events.
- **AC:** Search spans role-accessible pages and live records. The bell shows an unread
  count scoped to the user's role/email/mentor identity.

**E1-S7 — Demo role switching.** As a demonstrator, I want to switch personas without
re-login, so that I can showcase every role.
- **AC:** Gated behind the `roleSwitcher` feature flag; persists the active role.

---

## E2 — Project Sourcing & Submission

**E2-S1 — Raise a project request.** As an IO-Admin, I want to request internship projects
from a Programme Centre by education level, so that divisions supply enough projects for an
intake.
- **AC:** Request captures PC Head (To), AD-PnC (Cc), a response deadline, and one or more
  **education-level rows each with a placement count**. A request is keyed by education
  level (not a specific programme). An outbound email can be previewed/customised.

**E2-S2 — Token portal for divisions.** As an AD-PnC, I want to open a secure link without
logging in, so that I can respond to an IO request quickly.
- **AC:** Each request carries a unique `uploadToken`; the portal link authenticates via the
  token and shows the request context (education level, placements, deadline, requesting IO).

**E2-S3 — Bulk project submission.** As an AD-PnC, I want to download a template, fill it,
and upload multiple projects at once, so that I can respond at scale.
- **AC:** A spreadsheet template (defined columns) can be downloaded, populated, and
  uploaded; parsed rows pre-fill an editable batch; submitting creates a batch with status
  `pending` (awaiting IO review).

**E2-S4 — Single project submission.** As an AD-PnC, I want to add one project via a guided
form, so that I can respond when I only have a few.
- **AC:** A step form captures title, description, mentor (name/dept/bio/appointment),
  discipline, skills, slots, education level, internship duration and period
  (start/end MMMYY), tech domain, working location, and remarks. Submitting creates a
  single-row `pending` batch.

**E2-S5 — Automated writing checks.** As an AD-PnC, I want automated quality feedback on my
submission, so that I can improve it before an IO reviews it.
- **AC:** Grammar/tone, readability, and scope-alignment checks each return pass/warn/fail
  (e.g. title capitalisation and length, description word count and sentence length,
  intern-facing language, deliverables, skills coverage, track-appropriate wording).

**E2-S6 — Request progress tracking.** As an IO-Admin, I want to see each request's fill
status, so that I can chase divisions before deadlines slip.
- **AC:** Request status derives from submissions vs placements and the deadline:
  `pending` → `overdue` / `partial` / `matched` / `excess`.

---

## E3 — Project Review, Approval & Pooling

**E3-S1 — Review submitted projects.** As an IO, I want to review projects submitted against
a request, so that only quality projects reach applicants.
- **AC:** A pending queue lists submitted projects with their automated check results; the
  IO can open each for detail.

**E3-S2 — AI review assist.** As an IO, I want an AI summary of a submission's strengths and
gaps, so that I can review faster.
- **AC:** An on-demand LLM review summarises the project and flags issues; it is advisory
  only and does not approve/reject.

**E3-S3 — Edit before deciding.** As an IO, I want to edit a submission's fields before
approving, so that minor issues don't require a full rejection cycle.
- **AC:** IO can amend title, scope, mentor, skills, slots, domain, location; checks re-run
  on scope/title changes.

**E3-S4 — Approve / reject.** As an IO, I want to approve or reject submitted projects
(individually or in bulk), so that the approved pool stays clean.
- **AC:** Approve creates a pooled `ProjectEntry` (status `open`) inheriting all fields and
  notifies the submitter + mentor. Reject records a remark, hides the project, and notifies
  the AD-PnC to revise.

**E3-S5 — Pooled, shared projects.** As an IO, I want approved projects to live in a shared
pool rather than being owned by one programme, so that multiple intakes can draw from them.
- **AC:** An approved project is a shared resource; placements are consumed only when an
  applicant is matched (`available = slots − matched`), not when attached to an intake.

**E3-S6 — Archive a project.** As an IO, I want to archive a project no longer needed, so
that it stops being offered.
- **AC:** Archiving removes the project from the pool/applicant view; any candidates
  shortlisted to it are flagged for rematch and the IO is notified.

**Project state machine:** submission `pending → approved | rejected`; on approval →
`ProjectEntry` `open → in-progress → confirmed`, with `archived` as a withdrawal branch.

---

## E4 — Programme & Intake Setup

**E4-S1 — Create a programme (guided wizard).** As an IO, I want a step-by-step wizard to
create a programme, so that I configure everything consistently.
- **AC:** Three steps — **Details** (title, education level/category, description, eligibility,
  status), **Set Up Intakes & Assign Projects**, **Review**. Title and category are required
  to advance.

**E4-S2 — Education-level driven setup.** As an IO, I want the education level to drive
sensible defaults, so that I don't configure everything from scratch.
- **AC:** Selecting a category (Junior College, Post-JC/Post-Poly, Polytechnic, University,
  YDSP) preloads level-appropriate eligibility defaults and auto-derives the application form
  template, and filters the attachable project pool to that level.

**E4-S3 — Multiple intakes.** As an IO, I want to define multiple intake windows per
programme, so that one programme can run several application/internship cycles.
- **AC:** Each intake has an auto-derived title, an application window (open/close), and an
  internship period (start/end month), each validated (no past dates; close ≥ open; period
  within/after the application window). Each intake gets a stable `intakeId`.

**E4-S4 — Attach projects to intakes.** As an IO, I want to attach approved pooled projects
to specific intakes, so that applicants have projects to be matched to.
- **AC:** Only projects whose education level equals the programme's are attachable (hard
  gate). Projects auto-allocate to intakes whose window fits their period; mismatches surface
  in a "Needs Attention" bucket with soft warnings (period outside window, duration longer
  than window) that the IO may override. Placements per intake are configurable.

**E4-S5 — Application form linkage & preview.** As an IO, I want the correct application form
attached and previewable, so that applicants answer the right questions.
- **AC:** The form template is derived from the education level, stored on the programme, and
  previewable in the wizard.

**E4-S6 — Publish / draft / status.** As an IO, I want to publish, draft, or complete a
programme, so that I control when it accepts applications.
- **AC:** Status is `Draft | Active | Completed`. "Save as Draft" always drafts; "Publish"
  activates. Applications are only accepted when a programme is Active **and** its
  application window is open (derived Open/Closed).

**E4-S7 — Manage existing programmes.** As an IO, I want to edit, duplicate, or delete a
programme, so that I can reuse and maintain them.
- **AC:** Edit reloads the wizard; duplicate pre-fills a new programme; delete removes it.
  Unsaved changes are guarded.

---

## E5 — Eligibility Criteria Configuration

**E5-S1 — Basic requirements.** As an IO, I want to set baseline gates (Nationality,
Education Level, Race) as simple field/value rows, so that identity requirements are quick
to configure.
- **AC:** Basic requirements are add-field rows (choose field → choose value); each field is
  used at most once; they are managed separately from academic criteria.

**E5-S2 — Academic requirements with AND/OR.** As an IO, I want to express academic cut-offs
including "any of" pathways, so that I can accept multiple qualification routes.
- **AC:** Criteria are groups with `matchType` ALL (all rules) or ANY (one of several
  pathways). Rule types include GPA (with optional institution scope), subject+grade
  (A-Level/IB/O-Level/IP/NUS High), IB total score, CAP, course/major, institution, age,
  clearance. Academic requirements are shown as a flat, Requirement/Value builder with OR
  branches presented as "Any one of" option blocks.

**E5-S3 — Level-specific defaults.** As an IO, I want criteria to preload per education
level and stay level-specific, so that switching levels doesn't bleed criteria across levels.
- **AC:** Each level loads its own defaults (e.g. University → citizenship + level + ANY[GPA
  ≥ 4.0 for NUS/NTU/SUTD, GPA ≥ 3.6 for SMU]); switching level in create mode reloads that
  level's defaults rather than carrying edits over.

**E5-S4 — Plain-English summary.** As an IO, I want an auto-generated plain-English summary
of the criteria, so that I (and applicants) can read requirements without decoding rules.
- **AC:** Rules render as prose (e.g. "be a Singapore Citizen", "have a minimum GPA of 4.0
  (NUS / NTU / SUTD applicants)", "have achieved at least a B in Mathematics (H2) and Physics
  (H2)"); multi-group criteria render as a numbered list.

**E5-S5 — Re-screening on change.** As an IO, I want to optionally re-screen affected
applications when I change criteria, so that existing results reflect the new rules without
disrupting downstream candidates.
- **AC:** On criteria change, only applications in Pending Review / Auto-rejected are
  eligible for re-screening (shortlisted and later stages are untouched). The IO opts in;
  affected applications are re-queued to Pending Screening.

---

## E6 — Applications & Applicant Portal

**E6-S1 — Discover open programmes.** As an applicant, I want to browse open programmes with
deadlines, so that I can choose where to apply.
- **AC:** Active programmes with open windows are listed with a deadline countdown and an
  "Apply" action.

**E6-S2 — Complete an application.** As an applicant, I want a guided, template-driven form,
so that I provide exactly what a programme needs.
- **AC:** Form steps are template-driven (mandatory: name, email, school, course, year, GPA;
  conditional: CV, transcript, subject grades, achievements, availability, fun Q&A). Field
  types include text, dropdown, calendar, radio/checkbox, upload, subject-grade table, and
  MyInfo-populated fields.

**E6-S3 — CV upload & parsing.** As an applicant, I want my CV parsed to pre-fill details, so
that I fill less manually.
- **AC:** CV (PDF) upload extracts text and mock-parses skills/institution/GPA; CV and
  transcript are stored with the application.

**E6-S4 — Save drafts.** As an applicant, I want to save and resume a draft, so that I don't
lose progress.
- **AC:** Drafts persist per programme and appear on the dashboard with a "Resume" action.

**E6-S5 — Rank project preferences.** As an applicant, I want to rank up to N preferred
projects, so that my interests inform matching.
- **AC:** Applicant selects an ordered list of project preferences (max configurable, default 5).

**E6-S6 — Track applications.** As an applicant, I want to track each application's stage, so
that I know what's happening and what's next.
- **AC:** Dashboard shows submitted applications with a simplified status
  (Submitted → Under Review → Interview → Offer → Outcome) and task cards for required
  actions (resume draft, confirm interview slot, respond to offer, etc.).

---

## E7 — Application Screening

**E7-S1 — Automatic eligibility screening.** As the system, I want to auto-evaluate each
submitted application against the programme's criteria, so that IOs focus on genuine
candidates.
- **AC:** On submission, each `CriteriaGroup` is evaluated (`ALL`/`ANY`); the outcome sets
  `eligibilityPass` and collects `failedCriteria`. Pass → **Pending Review**; fail →
  **Auto-rejected**.

**E7-S2 — Mandatory gates.** As the system, I want mandatory gates (e.g. citizenship) to hard-
reject, so that ineligible applicants can't proceed.
- **AC:** A failed mandatory gate auto-rejects regardless of provisional status; unknown
  citizenship is given benefit of the doubt (legacy records).

**E7-S3 — Provisional results.** As an IO, I want applicants awaiting final results to be
routed to review rather than auto-rejected, so that borderline cases aren't lost.
- **AC:** If a non-mandatory rule fails but the applicant flagged provisional results, route
  to Pending Review (conditional) instead of auto-reject.

**E7-S4 — Delayed rejection release.** As an IO, I want auto-rejection emails held for a grace
period, so that I can review grey cases before applicants are notified.
- **AC:** Auto-rejected applications set a `rejectionDueDate` = applied date + configured
  delay (default 3 days); the rejection email is released only once the delay lapses.

**E7-S5 — Manual eligibility override.** As an IO, I want to override an auto-rejection with a
reason, so that I can admit an applicant the rules wrongly excluded.
- **AC:** Override moves the application to Pending Review and records an audited reason.

---

## E8 — Applicant–Project Matching & Suitability Scoring

**E8-S1 — Suitability scoring.** As the system, I want to score each eligible applicant
against every open project in the programme, so that IOs get a ranked fit.
- **AC:** On reaching Pending Review, compute a 0–100 suitability score per project from
  weighted components (default 50% discipline, 30% skills, 20% standing); results stored per
  applicant per project with reasoning.

**E8-S2 — Fair, within-track standing.** As the system, I want standing scored within the
applicant's own education track, so that JC/Poly/Uni candidates are compared fairly.
- **AC:** Standing bands (top/strong/solid/borderline) use track-specific thresholds; skills
  scoring applies a within-track band adjustment.

**E8-S3 — Availability warnings.** As an IO, I want soft warnings when an applicant's
availability doesn't fit a project, so that I match realistically.
- **AC:** If applicant availability (weeks/date range) is short of a project's minimum
  duration or overlaps a blackout period, surface a warning (non-blocking).

**E8-S4 — Education-level match key.** As the system, I want education level to be the hard
link between applicants, projects and programmes, so that matches are valid.
- **AC:** Only projects whose education level equals the programme's are eligible for
  matching.

---

## E9 — Shortlisting

**E9-S1 — Review candidates with AI top-fit.** As an IO, I want candidates presented with
their suitability scores and their own preferences, so that I can shortlist informed.
- **AC:** The shortlist view sorts by suitability (AI top-fit), shows the applicant's ranked
  preferences with scores, and allows searching other open projects.

**E9-S2 — Shortlist to a project.** As an IO, I want to shortlist an applicant to a specific
project, so that they proceed to interview.
- **AC:** Shortlisting sets `shortlistedFor = projectId` and status → **Shortlisted for
  Interview**, and notifies the project's mentor.

**E9-S3 — Override audit.** As an IO, I want to record a reason when I shortlist against the
AI top-fit, so that decisions are auditable.
- **AC:** Choosing a non-top-fit project requires an override reason, logged with who/when.

**E9-S4 — Reject at review.** As an IO, I want to reject a reviewed candidate with a remark,
so that they're informed and removed from the pipeline.
- **AC:** Reject sets status → **Rejected**, records `ioRejectionRemark`, and notifies the
  applicant.

**E9-S5 — Candidate 360.** As an IO, I want a full candidate view (history, scores, timeline,
access log), so that I can make an informed decision.
- **AC:** A candidate deep-dive shows profile, suitability, pipeline timeline, and rematch
  options.

---

## E10 — Interviews & Evaluation

**E10-S1 — Propose interview slots.** As a mentor, I want to propose interview slots for my
shortlisted candidates, so that interviews can be scheduled.
- **AC:** Mentor sets `interviewSlots` (date/time/duration); the candidate is invited to
  confirm.

**E10-S2 — Confirm a slot.** As an applicant, I want to confirm one of the proposed slots (or
request a reschedule), so that my interview is booked.
- **AC:** Confirming sets `confirmedSlot`, generates a meeting link, and moves status →
  **Interview Scheduled**; reschedule requests prompt new slots.

**E10-S3 — Evaluate the interview.** As a mentor, I want to score and decide after the
interview, so that the IO can act on my recommendation.
- **AC:** Mentor records scores (technical knowledge, problem-solving, communication,
  initiative — 0–10), notes/transcript, an optional AI summary, and a decision
  (Accepted/Rejected with remark). Status → **Interview Completed**; the IO is notified.

**E10-S4 — Rematch after rejection.** As an IO, I want to rematch a mentor-rejected candidate
to their next project preference, so that strong candidates aren't lost to one "no".
- **AC:** Tried projects are tracked; the IO can rematch to another preference or reject.

---

## E11 — Offer & Approval

**E11-S1 — Compose & send an offer.** As an IO, I want to compose an offer letter from a
template with a deadline, so that accepted candidates receive a clear, timely offer.
- **AC:** Offer letter supports variable substitution (name, project, mentor, programme,
  duration, location, stipend, dates, portal link), a deadline (default = today +
  `offerValidityDays`), and an optional reminder. Status → **Offer Extended**; the applicant
  is notified.

**E11-S2 — Respond to an offer.** As an applicant, I want to accept, decline, or request a
start-date change, so that I control my commitment.
- **AC:** Accept → **Offer Accepted** (proceeds to onboarding); decline / deadline lapse →
  **Offer Declined**; date change → **Date Change Requested** pending IO approval.

**E11-S3 — Optional secondary approval (DCE).** As an IO-Admin, I want an optional approval
gate before finalisation, so that higher sign-off can be enforced when required.
- **AC:** When the DCE/secondary-approval flag is enabled, the relevant batch/offer routes
  for approval before finalisation; disabled by default.

---

## E12 — Onboarding

**E12-S1 — Submit onboarding details.** As an accepted applicant, I want to submit onboarding
information, so that I'm ready to start.
- **AC:** Onboarding captures allowance/bank details, emergency contact, logistics (shirt
  size, dietary), and mandatory policy acknowledgements (IM8, PDPA); timestamped.

**E12-S2 — Welcome letter.** As an IO, I want to compose and send a welcome letter, so that
interns feel prepared.
- **AC:** Welcome letter is template-driven with variable substitution; sending sets
  `welcomeLetterSent` + date. It is optional and non-blocking.

**E12-S3 — Confirm onboarding & activate.** As a mentor, I want to confirm onboarding and set
start/end dates, so that the intern becomes active.
- **AC:** Mentor confirms onboarding (warned if the applicant hasn't submitted, but may
  proceed), sets internship dates if unset; status → **Active Intern**.

---

## E13 — Offboarding & Post-Internship

**E13-S1 — Mark internship complete.** As an IO/system, I want internships marked complete at
the end date, so that closeout tasks are triggered.
- **AC:** After the internship end date, status → **Internship Completed**; applicant and
  mentor are notified for feedback/evaluation.

**E13-S2 — Intern feedback.** As an intern, I want to submit end-of-internship feedback, so
that DSTA can improve the programme.
- **AC:** Feedback captures ratings (calibration, sentiment, mentorship, environment), scope
  fit, an NPS score, highlights/improvements, and an optional message to the mentor; stored
  with timestamp.

**E13-S3 — Mentor evaluation.** As a mentor, I want to evaluate my intern, so that outcomes
and recommendations are recorded.
- **AC:** Evaluation captures scores (technical, quality, communication, initiative — 0–10),
  strengths/growth areas, and a recommendation (scholarship / rehire / neither).

**E13-S4 — Certificate of completion.** As an IO, I want to issue a certificate, so that
interns receive formal recognition.
- **AC:** Certificate supports style options (classic/modern/formal) and preview; issuing
  sets `cocSent` + date; automatable N days after completion.

**E13-S5 — Withdrawal / termination / extension / early completion.** As a stakeholder, I
want to raise exit requests, so that non-standard exits are handled with approval.
- **AC:** Applicant may withdraw (pre-acceptance directly; post-acceptance via request);
  IO/mentor may raise a forced termination; applicant may request early completion or an
  extension (new end date). Each request awaits **Director** approval.

**E13-S6 — Director approvals.** As a Director, I want to approve/reject exit requests with a
remark, so that offboarding is governed.
- **AC:** Director sees pending withdrawal/forced-termination/early-completion/extension
  requests with context and Approve/Reject actions (remark captured, timestamped). Approval
  moves the application to **Withdrawn** / **Terminated** / updated dates accordingly.

**E13-S7 — Exit clearance.** As an IO, I want to collect exit clearance before final closeout,
so that assets/access are returned.
- **AC:** An exit-clearance record (status, uploaded file) is captured before final
  completion.

---

## E14 — Administration, Notifications & Analytics

**E14-S1 — Manage users & permissions.** As an IO-Admin, I want to manage IO users and role
visibility, so that access matches responsibilities.
- **AC:** Invite/assign/remove IO staff (io-admin/io); a role×section menu-visibility matrix
  controls navigation (Dashboard locked on).

**E14-S2 — Manage communication templates.** As an IO-Admin, I want to manage email, letter,
notification, and certificate templates, so that communications are consistent.
- **AC:** Templates for system emails, offer/welcome letters, certificates, and in-app
  notifications are editable with variable substitution.

**E14-S3 — Manage application forms.** As an IO-Admin, I want to build/edit application form
templates, so that programmes collect the right data.
- **AC:** Form builder supports sectioned, typed fields with validation, conditional
  visibility, and MyInfo population; templates are versioned.

**E14-S4 — Manage reference data.** As an IO-Admin, I want to manage dropdown lists, the
recognised-subject taxonomy, and scoring reference data, so that criteria and matching stay
accurate.
- **AC:** Dropdown lists are versioned; recognised subjects are editable per qualification;
  suitability scoring inputs (disciplines, standing bands, default weights) are configurable.

**E14-S5 — Configure automation & system parameters.** As an IO-Admin, I want to set
automation delays and global parameters/feature flags, so that the portal behaves per policy.
- **AC:** Configurable: auto-reject delay, welcome-letter lead time, certificate lead time,
  offer validity days, max project ranks, interview duration; feature flags (AI summary, AI
  matching, role switcher, DCE approval, etc.). A "Reset Demo Data" action reseeds.

**E14-S6 — Microsite & campaigns.** As an IO-Admin, I want to configure the public microsite
(and outreach campaigns), so that prospective applicants are informed.
- **AC:** Microsite branding, programme spotlight, FAQ, and CTA copy are editable.

**E14-S7 — Role-scoped notifications.** As any user, I want relevant in-app notifications, so
that I'm alerted to events affecting me.
- **AC:** Notifications are scoped by role/email/mentor identity, carry a tier
  (action/info), a deep link, and read state; triggered by pipeline events (submission
  approved/rejected, applicant assigned, interview invite, offer extended, exit request
  pending, etc.).

**E14-S8 — Analytics & reporting.** As an IO-Admin, I want dashboards on applications,
projects, pipeline, and feedback, so that I can report and improve.
- **AC:** Analytics tabs cover application volume/trends (with optional AI summary), project
  demand/utilisation, multi-year talent pipeline (conversion, re-engagement, scholarship
  awards, full-time hires), and intern-feedback themes/NPS.

---

## Appendix A — Application Status State Machine

| From | To | Trigger (role) |
|------|-----|----------------|
| Pending Screening | Pending Review | Auto-screen pass (System) |
| Pending Screening | Auto-rejected | Auto-screen fail — mandatory gate or non-provisional shortfall (System) |
| Auto-rejected | Pending Review | Eligibility override (IO) |
| Pending Review | Shortlisted for Interview | Shortlist (IO) |
| Pending Review | Rejected | Reject with remark (IO) |
| Shortlisted for Interview | Interview Scheduled | Confirm slot (Applicant) after mentor proposes slots |
| Interview Scheduled | Interview Completed | Submit evaluation (Mentor) |
| Interview Completed | Offer Extended | Extend offer (IO) — mentor decision Accepted |
| Interview Completed | Rejected | Mentor rejected / IO rejects |
| Offer Extended | Offer Accepted | Accept (Applicant) |
| Offer Extended | Offer Declined | Decline / deadline lapse (Applicant) |
| Offer Extended | Date Change Requested | Request start-date change (Applicant) |
| Date Change Requested | Offer Extended | Approve change (IO) |
| Offer Accepted | Active Intern | Confirm onboarding (Mentor) |
| Active Intern | Internship Completed | End date reached / mark complete (System/IO) |
| Active Intern | Withdrawn | Approve withdrawal (Director) |
| Active Intern | Terminated | Approve forced termination (Director) |
| Any pre-acceptance | Withdrawn | Withdraw (Applicant) |

**Terminal:** Auto-rejected, Rejected, Offer Declined, Withdrawn, Terminated, Internship Completed.
**Successful:** Offer Accepted, Active Intern, Internship Completed.

## Appendix B — Key Statuses by Entity

- **Programme:** Draft → Active → Completed (applications accepted only when Active + window open).
- **Project request:** pending → overdue / partial / matched / excess.
- **Project submission (batch/row):** pending → approved / rejected.
- **Project (pooled):** open → in-progress → confirmed; archived (withdrawal branch).

## Appendix C — Cross-Cutting Business Rules

1. **Education level is the canonical key** linking requests → submissions → projects →
   programmes → matching.
2. **Projects are pooled and shared (M:N to intakes);** placements are consumed on applicant
   match, not on intake attachment. Period/duration mismatches are soft (overridable) warnings.
3. **Eligibility is hard-gated** (mandatory gates auto-reject); provisional-results applicants
   route to review; auto-rejections are delayed before notification.
4. **Criteria changes re-screen only pre-shortlist applications**, preserving downstream
   candidates.
5. **AI is assistive, not authoritative** — writing checks, review summaries, CV parsing, and
   suitability scoring inform but never decide; IO/mentor/Director hold the decisions.
6. **Overrides are audited** (shortlist against AI top-fit, eligibility override).
