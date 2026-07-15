# DSTA Talent Outreach & Acquisition (TOA) Portal — User Guide

---

## Overview

The TOA Portal supports the end-to-end management of DSTA's internship programmes — from programme setup and project collection, through to applicant screening and shortlisting. This guide covers what each page does, how to navigate the key workflows, and what every status label means.

---

## Roles & Access

| Role | Who | What they can do |
|---|---|---|
| **IO** | Internship Officer | Create and manage programmes, review submitted projects, approve/reject projects, shortlist applicants |
| **IO Admin** | Senior IO (e.g. Celine) | Everything an IO can do, plus send project requests to Programme Centres and access the Admin tab |
| **Mentor** | DSTA subject-matter expert | View shortlisted applicant profiles, conduct interviews, record evaluation outcome |

> **Note:** All IOs see all programmes. The programme toggle is a convenience filter — there is no system-enforced ownership per IO.

---

## Navigation

The left sidebar links to all major sections. What you see depends on your role.

| Section | Visible to | Purpose |
|---|---|---|
| **Dashboard** | IO, IO Admin, Mentor | KPI summary, recent activity, quick stats |
| **Programmes** | IO, IO Admin | Create, view, and manage internship programmes |
| **Projects** | IO, IO Admin, Mentor | Review submitted projects, approve/reject, view confirmed project list |
| **Proj Requests** | IO Admin only | Send project requests to Programme Centre heads, track submission status |
| **Applications** | IO, IO Admin | View and triage applicant applications, shortlist for interview |
| **Templates** | IO Admin only | Manage application form templates, email templates, and the project submission CSV template |
| **Admin** | IO Admin only | System-level configuration |

---

## The Internship Workflow (End-to-End)

---

### Step 1 — Create a Programme

**Who:** IO / IO Admin  
**Where:** Programmes → New Programme

The IO creates a programme shell for a cohort (e.g. "UG Intern 2026"). This sets the frame for the entire cycle.

**What to fill in:**
- Programme title, category (e.g. UG Intern, YDSP, JC Scholar), description
- Application window open and close dates
- Internship start and end dates
- **Eligibility criteria** — rules that determine whether an applicant qualifies
- **Application form template** — the form applicants will fill in

**Eligibility criteria types:**
- **Mandatory** — applicants who fail are auto-rejected after a set number of days
- **Non-mandatory** — applicants who fail are marked Ineligible but remain in the system; the IO can still shortlist them at their discretion

Once saved, the programme appears in **Draft** status.

---

### Step 2 — Activate the Programme

**Who:** IO / IO Admin  
**Where:** Programmes → click a programme → Activate

When the programme is ready to accept projects and (eventually) applicants, click **Activate**. The status moves from Draft → Active.

> An Active programme is visible to the rest of the system. Once all internship activity concludes, mark it **Completed** — this locks the programme and makes all cards read-only.

---

### Step 3 — Send a Project Request

**Who:** IO Admin only  
**Where:** Proj Requests → New Request

The IO Admin sends a formal request to each Programme Centre (PC) head, specifying how many intern placements are needed for a given programme.

The system generates a **secure upload link** that is sent to the AD (P&C) contact. When the PC head has coordinated with mentors and compiled the project list, the AD (P&C) uses that link to upload the Excel file back to the portal.

**Request statuses:**

| Status | Meaning |
|---|---|
| **Pending** | Request sent; no projects received yet |
| **Overdue** | Deadline has passed; no upload received |
| **Partial** | Some projects submitted, but count is below what was requested |
| **Submitted** | All expected projects have been received |
| **Excess** | More projects submitted than placements requested |

**Column labels on the Requests table:**

| Column | Meaning |
|---|---|
| Placements Requested | Number of intern slots the IO asked this PC to fill |
| Placements Submitted | Number of projects actually uploaded by the AD (P&C) |
| Projects Received | Number of individual project entries in the upload |
| Submission Gap | Difference between requested and submitted — how many are still outstanding |

---

### Step 4 — Review & Approve Projects

**Who:** IO / IO Admin  
**Where:** Projects → Submissions tab

Once the AD (P&C) uploads projects, they appear in the **Submissions** tab as individual project cards awaiting review. Each submission runs through two AI checks automatically:

**AI Engine 1 — Project Quality Check**
- **Grammar check** — flags poor grammar or unclear writing
- **Level-appropriateness check** — determines if the writeup is pitched at the right level for the target intern category (e.g. YDSP submissions should be secondary-school comprehensible; UG submissions can be more technical)

The AI check result appears as a badge on each project row:

| Badge | Meaning |
|---|---|
| **Pass** | Grammar and level both acceptable |
| **Warn** | Minor issues detected — review before approving |
| **Fail** | Significant issues — advise the PC to revise |

The IO can approve or reject each project individually, or select multiple and bulk-approve/reject. A remarks field is available when rejecting so feedback can be recorded.

**Submission review statuses:**

| Status | Meaning |
|---|---|
| **Pending** | Awaiting IO review |
| **Approved** | IO approved; project moves to Confirmed Projects |
| **Rejected** | IO rejected; project appears in the Rejected tab with remarks |

---

### Step 5 — Confirmed Projects

**Who:** IO / IO Admin / Mentor  
**Where:** Projects → Confirmed Projects tab

Once approved, a project appears here. Clicking a project row opens the **Project Detail** page showing:
- Project scope, tech domain, emerging area, intern category
- Mentor and co-mentor names
- Required skills and discipline of study
- Placement status (how many slots filled vs total)
- Working location (On-Site / Hybrid)

**Project placement statuses:**

| Status | Meaning |
|---|---|
| **Open** | No interns matched yet |
| **Partial** | Some slots filled, others still available |
| **Matched** | All slots filled |

---

### Step 6 — Application Window

**Who:** Applicant (external-facing — not yet built in the portal)  
**Where:** Applicant-facing application form linked to the programme

Applicants:
1. Fill in personal details and academic information
2. Upload their CV
3. Answer a "get to know you" question (analysed by AI for project recommendations)
4. Browse the programme's confirmed project list and bookmark projects of interest
5. Submit a ranked preference list of up to 5 projects

**AI Engine 2 — Project Recommendation**  
Reads the applicant's "get to know you" answer and recommends relevant projects from the programme pool directly to the applicant.

---

### Step 7 — Eligibility Screening

**Who:** System (automatic)  
**Where:** Applications tab

When an application is submitted, the system checks it against the programme's eligibility criteria.

**Application statuses (full list):**

| Status | Meaning |
|---|---|
| **Pending** | Application received; eligibility check not yet run |
| **Under Review** | Eligibility passed or in IO discretion zone; IO is reviewing |
| **Auto-rejected** | Failed a mandatory eligibility criterion; will be rejected after the hold period |
| **Rejected** | Manually rejected by IO, or auto-rejection confirmed |
| **Shortlisted** | IO has shortlisted this applicant for a specific project interview |
| **Interview** | Interview scheduled or completed; awaiting mentor evaluation |
| **Accepted** | Applicant offered and accepted a placement |

---

### Step 8 — AI Match Scoring & Shortlisting

**Who:** IO / IO Admin  
**Where:** Applications tab

**AI Engine 3 — CV Match Scoring**  
For all non-rejected applicants, the system parses each CV and scores the applicant's suitability against each of their ranked project preferences. The score (0–100) appears in the Applications table.

The IO uses the score as one input alongside their own judgement to shortlist applicants for a specific project. When shortlisting:
- The IO selects which project the applicant is being shortlisted for
- The applicant's status changes to **Shortlisted**
- The assigned mentor is notified

> **Repeat applicants** who have previously interned at DSTA are flagged automatically — this is a signal the IO can use when making shortlisting decisions.

---

### Step 9 — Interview & Mentor Evaluation

**Who:** Mentor  
**Where:** Mentor view (Projects / Applications)

The mentor receives the shortlisted applicant's profile (personal details, academic record, CV, AI suitability score, project preferences, and "get to know you" answer).

The mentor arranges the interview directly with the applicant (Teams, Zoom, or phone — mentor's choice), then returns to the portal to record their evaluation outcome.

- If the mentor **accepts** → applicant status moves to **Accepted**, and the project's matched count increases
- If the mentor **rejects** → the slot reopens and the IO can shortlist another applicant for that project

---

## Programmes — Status Reference

| Status | Meaning |
|---|---|
| **Draft** | Programme created but not yet active; no applications accepted |
| **Active** | Programme is live; projects can be submitted and applications can be received |
| **Completed** | Cycle closed; all cards become read-only |

**Application window statuses** (shown on programme cards):

| Status | Meaning |
|---|---|
| **Open** | Current date is within the application window |
| **Closed** | Application window has passed |

---

## Templates

**Where:** Templates tab (IO Admin only)

Three types of templates are managed here:

### Application Form Templates
Define the fields applicants fill in when they apply. Each template is linked to a programme category. Templates are built using a drag-and-drop form builder with sections and fields (textbox, dropdown, date picker, file upload, radio, checkbox).

To create a new template: click **Add Application Form** → fill in name, category, description → click **Create Template** → add sections and fields in the editor → **Save changes**.

To preview what the applicant sees: click **Preview** (eye icon) in the template editor toolbar.

### Email Templates
Pre-written email bodies for key trigger points (e.g. acknowledgement of application, shortlist notification). Can be viewed and edited directly in the portal.

### Project Submission Template
The standardised CSV/Excel template sent to AD (P&C) contacts when a project request is raised. The template defines the exact columns PC heads must fill in:

| Column | Description |
|---|---|
| PC | Programme Centre code |
| Project Title | Max 255 characters; AI-checked for suitability |
| Tech Domain | Primary technology domain |
| Emerging Area | Emerging technology area |
| Project Scope | Overview, learning outcomes, deliverables (max 500 chars); AI-checked |
| Intern Category | Target intern group |
| Discipline of Study | Required academic discipline |
| No. of Placements | Integer — how many interns the project can take |
| Internship Duration | 1, 2, 3, 4, 6, or 12 months (or specify) |
| Skills / Knowledge Required | Key skills the intern should have |
| Full Name of Main Mentor | Supervising mentor's full name |
| Name(s) of Co-mentor(s) | Comma-separated co-mentor names |
| Working Location | On-Site or Hybrid |

---

## Dashboard

**Where:** Dashboard (all roles)

The dashboard provides a summary of the active programme cycle. Use the programme toggle to switch between cohorts. Key widgets include:

- **KPI Summary** — total applications, acceptance rate, average response time, headcount filled
- **Application Funnel** — total → shortlisted → interview → offers made → accepted → withdrawals
- **Top Schools** — breakdown of applicant institutions
- **Recent Activity** — latest status changes and actions

Widgets can be rearranged (drag-and-drop) or hidden using the customise button.

---

## Workstreams

The sidebar shows a **Workstream** switcher at the top. Currently only **Internship** is available. Outreach and Scholarship are planned for future releases.
