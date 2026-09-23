# Directory UX Design Brief

**Module:** Common Capability — Directory / Candidate 360 Profile  
**Audience:** Product, UX, Business Analysis, Development and QA  
**Document status:** Working design brief  
**Version:** 0.2  
**Prepared date:** 28 August 2026  

## 1. Purpose

This brief defines the product information architecture, screen destinations, content hierarchy, role visibility, interaction boundaries and design states required for the internal **Directory**.

The brief is intended to give UX enough product direction to design the Directory and Candidate 360 Profile without making unconfirmed business decisions. It is not a replacement for the SyRS, data dictionary, API specification or detailed field validation rules.

## 2. Source Priority

Where source materials conflict, use the following priority:

1. Confirmed Product Decisions recorded in this brief.
2. [Candidate 360 Workshop MOM — 29 July 2026](</Users/evanzhang/Desktop/meeting minutes/20260729 - TOA R2 - Internship Workshop MOM v1.0 - Candidate 360.docx>).
3. Latest applicable SyRS.
4. Existing TOA prototype, for interaction and visual reference only.

The existing prototype must not override confirmed product logic. In particular, the current Candidate 360 prototype is application-centric; the Directory defined in this brief is person-centric.

## 3. Product Definition

### 3.1 First-level navigation

The first-level internal navigation item is named:

> **Directory**

Selecting Directory opens the People Directory landing page.

### 3.2 Product concept

Directory is the internal registry of people known to TOA. It consolidates a person's factual profile, relationships and DSTA journey across the supported workstreams.

The detail view is the person's **Candidate 360 Profile**. It is not an Application Detail page and must not duplicate workstream transaction screens.

### 3.3 Population in scope

Directory includes:

- People who registered using email but have not created or submitted any workstream record.
- People who first accessed TOA using Singpass but have not created or submitted any workstream record.
- Internship applicants and interns, regardless of outcome.
- Scholarship applicants and scholars, regardless of outcome, when the Scholarship workstream is available.
- Activity and event applicants or participants, when the Outreach workstream is available.
- People with multiple concurrent or historical relationships with DSTA.
- Historical people records, subject to the final migration and identity-linking rules.

### 3.4 Out of scope for Directory

Directory does not directly perform:

- Application screening, shortlisting or rejection.
- Interview scheduling or evaluation.
- Offer preparation, issuance or response processing.
- Internship approval, change-request approval or termination actions.
- Event administration.
- Scholarship assessment or approval.

Directory may show a summary of these records and link the user to the corresponding source-of-record screen.

## 4. Confirmed Product Principles

### 4.1 One person, one persistent identity

- Every person receives a system-generated, immutable `Person ID`.
- Email and Singpass are login identities, not the Person primary key.
- A Person may have both an email login identity and a Singpass login identity.
- Linking a second login method must not create a duplicate Person.
- Changing an email address must not change the Person ID.
- Applications, internships, scholarships, events, credentials and documents must relate to the Person ID.

### 4.2 Live Person creation

For current live use, a Person is created only through:

- Email registration; or
- Singpass login.

Manual Person creation is not included in the current direction.

Historical migration may create legacy Person records as a controlled system process. A migrated Person without a TOA login identity is displayed as a `Historical Record`. If the Person later registers, the verified login identity is linked to the existing Person rather than creating a second Person.

### 4.3 Registered Only

`Registered Only` is a computed Directory segment, not a permanent relationship or manually maintained status.

A Person is Registered Only when the Person has registered through email or Singpass and has no Internship, Scholarship, Activity or Event application or participation record.

Once a relevant business record is created, the Person automatically leaves the Registered Only segment.

### 4.4 Relationships are derived

- A Person does not have one global Candidate Status.
- Relationships and their statuses are derived from the relevant source-of-record modules.
- A Person may hold multiple relationships at the same time.
- Directory must not copy and independently maintain Application, Internship, Scholarship or Event statuses.

Examples:

- `Applicant · Under Review`
- `Intern · Active`
- `Scholar · Active`
- `Event Participant · BrainHack 2026`
- `Intern · Completed 2025`

### 4.5 Role and field-level access

- Access is controlled by both role and field sensitivity.
- Viewing a profile does not automatically grant access to every field or related record.
- Sensitive-field reveal, download, export, merge and internal-note actions must be permission controlled and audited.

### 4.6 Trustworthy search

- The initial search scope is authorised structured information.
- Internal notes, confidential reasons and AI-inferred personality attributes are not included in the initial search scope.
- AI-generated content must not become a permanent factual Person attribute without a defined review process.

## 5. Information Architecture

```text
Directory
├── All People
│   ├── Registered Only
│   ├── Internship
│   ├── Scholarship
│   └── Activities & Events
│
└── Person Detail
    ├── Overview
    ├── Profile
    ├── DSTA Journey
    ├── Credentials & Documents
    └── Internal
```

### 5.1 Saved views, not mutually exclusive categories

`Registered Only`, `Internship`, `Scholarship` and `Activities & Events` are saved filter views within the People Directory. They are not mutually exclusive tabs or Person Types.

A Person may appear in more than one saved view. For example, a current Scholar who previously completed an internship and attended an event appears in all applicable views.

### 5.2 Recommended routes

```text
/directory
/directory/{personId}
```

The detail route uses the persistent Person ID, not an Application ID, email address or source-system record ID.

## 6. Screen Inventory

| Screen ID | Design destination | Form factor | Notes |
|---|---|---|---|
| `DIR-01` | People Directory | Full page | Default landing page for the Directory menu. |
| `DIR-02` | Person Detail — Overview | Shared detail shell / tab | Executive summary and current context. |
| `DIR-03` | Person Detail — Profile | Shared detail shell / tab | Factual profile, education, skills and interests. |
| `DIR-04` | Person Detail — DSTA Journey | Shared detail shell / tab | Clickable cross-workstream timeline. |
| `DIR-05` | Person Detail — Credentials & Documents | Shared detail shell / tab | Certificates, badges and authorised documents. |
| `DIR-06` | Person Detail — Internal | Shared detail shell / restricted tab | Notes, system activity and audit information. |
| `DIR-07` | Download Profile Preview | Preview page or modal | User verifies export content before generating the PDF. |
| `DIR-08` | Potential Duplicate / Merge Person | Page, drawer or guided modal | IO Admin-only comparison and merge flow. |

`DIR-02` to `DIR-06` use the same Person Detail shell and persistent header. UX may implement the tabs as route segments or in-page navigation, provided deep-link and back-navigation behaviour remain clear.

## 7. Role and Visibility Rules

The following is the working role model for design. Any TBC item must be visibly annotated in the UX handoff.

| Capability / content | IO | IO Admin | Mentor | Management | Outreach Officer | Candidate |
|---|---|---|---|---|---|---|
| Open internal Directory | Yes, within authorised scope | Yes | No general Directory | Deferred | Yes | No |
| View basic Person profile | Authorised scope | Yes | Assigned Person only | Deferred | Yes | Own portal profile only |
| View contact details | Yes, permission controlled | Yes | Limited / assigned only | Deferred | Yes | Own details only |
| View current and historical relationships | Authorised scope | Yes | Assigned records only | Deferred | Yes | Own portal records only |
| Add Internal Note | Yes | Yes | No | Deferred | Yes | No |
| View Internal Notes | Yes, subject to classification | Yes | No | Deferred | Yes | No |
| View sensitive decision reasons | Restricted | Permission controlled | No | Deferred | Yes | No |
| View access and reveal audit | Limited where permitted | Yes | No | Deferred | Yes | No |
| Download Profile PDF | Permission controlled | Yes | No by default | Deferred | Yes | Separate candidate-portal output only |
| Batch export | Permission controlled | Yes | No | Deferred | Yes | No |
| Merge Person | No | Yes | No | No | No | No |

Management access is intentionally deferred and does not block the initial UX design. UX does not need to create Management-specific frames until the permission scope is confirmed.

Outreach Officer has full Directory viewing, notes, audit, PDF and export access under the current Product decision. Person merge remains an IO Admin-only data-administration capability.

### 7.1 Audited actions

At minimum, audit:

- Profile access where required by policy.
- Sensitive-field reveal.
- Profile PDF generation and download.
- Batch export.
- Internal-note creation or amendment.
- Person merge and undo, if undo is supported.
- Login-identity linking.

## 8. Shared Person Detail Shell

### 8.1 Persistent header

The header remains visible across `DIR-02` to `DIR-06` and contains:

- Person name.
- Persistent Person ID.
- Optional profile photo.
- Current education or employment headline.
- One or more current or historical relationship badges.
- Email and contact number, subject to permission and masking rules.
- Last Updated timestamp.
- Record source or data-freshness indicator.

### 8.2 Header actions

Recommended actions:

- `Add Internal Note` — authorised roles only.
- `Download Profile` — permission controlled.
- `Open Current Application` — shown only when applicable.
- `Open Current Internship` — shown only when applicable.
- Additional source-record links when applicable.

Do not place the following workflow actions in Candidate 360:

- Reject or shortlist Application.
- Schedule or evaluate Interview.
- Prepare or send Offer.
- Approve a request.
- Terminate an Internship.

### 8.3 Relationship display

Display multiple relationship badges where applicable. Do not collapse them into a single overall status.

The UI must distinguish:

- Current relationship.
- Historical relationship.
- Current action or pending record.
- Outcome where relevant.

## 9. DIR-01 — People Directory

### 9.1 Purpose

Provide an authorised, searchable and filterable registry of every Person in TOA, including people with no recorded business interaction after registration.

### 9.2 Page structure

1. Page title and short description.
2. Global Person search.
3. Saved views.
4. Filters and sort controls.
5. People result table or list.
6. Batch-selection and export actions.
7. Pagination or approved result-loading pattern.

### 9.3 Saved views

Initial saved views:

- `All People`
- `Registered Only`
- `Internship`
- `Scholarship`
- `Activities & Events`

These views are shortcuts to filter criteria. UX must avoid presenting them as exclusive Person Types.

### 9.4 Default result columns

| Column | Content guidance |
|---|---|
| Person | Name, Person ID and optional image or initials. |
| Relationships | One or more relationship badges; prioritise current relationships. |
| Education | Current institution, course and year where available. |
| Current Activity | Most relevant active Application, Internship, Scholarship or Activity record. |
| Latest Touchpoint | Latest recorded DSTA journey item and date. |
| Last Updated | Latest authoritative profile update timestamp. |

The result row opens the Person Detail Overview.

### 9.5 Structured search scope

Initial search fields:

- Name.
- Person ID.
- Verified email, subject to permission.
- Institution.
- Course of Study.
- Structured Skills.
- Areas of Interest.
- Project title.
- Programme or Event name.
- Relationship type.
- Intern Category.
- Relevant year.

Do not initially index:

- Internal Notes.
- Termination or rejection reasons.
- Confidential Assessment content.
- Mentor free-text feedback.
- Email body content.
- AI-generated summaries.
- AI-inferred personality attributes.

### 9.6 Recommended filters

- Relationship.
- Workstream.
- Current / Historical relationship.
- Institution.
- Course of Study.
- Year of Study.
- Intern Category.
- Touchpoint Type.
- Last Interaction period.
- Record Source.

### 9.7 Sort options

Recommended initial options:

- Name A–Z / Z–A.
- Latest Touchpoint.
- Last Updated.

Additional ranking or AI relevance is TBC and must not replace deterministic sort options.

### 9.8 Registered Only row

For a Registered Only Person:

- Relationships: `—`
- Current Activity: `—`
- Latest Touchpoint: `No recorded activities`
- Profile and registration-source information remain available according to permission.

Do not label the Person `Inactive`, `Cold`, `Rejected` or `Not Engaged`.

## 10. DIR-02 — Person Detail: Overview

### 10.1 Purpose

Provide a concise, management-friendly understanding of the Person before the user navigates to detailed records.

### 10.2 Content hierarchy

1. Executive or AI-assisted summary, when enabled.
2. Current relationships.
3. Current activities and active source-record links.
4. Recent DSTA touchpoints.
5. Key structured skills and areas of interest.
6. Key achievements.
7. Available credentials.
8. Data-freshness and source indicators.

### 10.3 AI summary behaviour

If included in the release, show:

- `AI-generated` label.
- Generated timestamp.
- Source records used or an equivalent source explanation.
- Refresh or regenerate action, subject to permission.
- Clear distinction between sourced facts and generated narrative.

AI-generated personality tags must not be saved or presented as verified facts without a separately confirmed review process.

### 10.4 Registered Only empty state

Show the available factual profile and a neutral journey message:

> No recorded DSTA activities.

Do not generate an engagement assessment from the absence of records.

## 11. DIR-03 — Person Detail: Profile

### 11.1 Purpose

Present factual, relatively stable Person information and its source freshness.

### 11.2 Recommended sections

- Personal Particulars.
- Contact Information.
- Education History.
- Current Academic Status.
- Structured Skills.
- Areas of Interest.
- Profile Documents summary.
- Data Source and Last Updated information.

### 11.3 Field presentation states

UX must design:

- Value available.
- Value missing.
- Value masked.
- Value revealed by an authorised user.
- No permission.
- Historical value superseded by a newer authoritative value, where supplied by the migration result.

### 11.4 Data provenance

Where data may originate from multiple systems, provide an unobtrusive source or freshness treatment.

Field-level source precedence and conflicting-source resolution are handled as part of the separate Data Migration work. Directory consumes the resulting canonical value and does not require a source-conflict resolution workflow in the current UX scope.

## 12. DIR-04 — Person Detail: DSTA Journey

### 12.1 Purpose

Provide one chronological view of the Person's recorded DSTA touchpoints across workstreams.

### 12.2 Journey types

- Application.
- Internship.
- Scholarship.
- Event or Outreach Activity.
- Programme.
- Competition.
- Award or other approved touchpoint.

### 12.3 Timeline item content

Each item should support:

- Date or period.
- Touchpoint type.
- Title.
- Relevant status or outcome.
- Short description.
- Source workstream.
- Related record link.
- Deliverable or feedback availability where permitted.

### 12.4 Interaction

Every Journey item is clickable. The interaction may:

- Expand a read-only summary; and/or
- Open the source-of-record detail page.

The Journey does not directly perform approvals or transactional workstream actions.

### 12.5 Timeline filters

- All Touchpoints.
- Internship.
- Scholarship.
- Activities & Events.
- Application.
- Programme / Competition.
- Year or period.

### 12.6 Empty state

For Registered Only people, show:

> No recorded DSTA activities.

The profile remains accessible; do not hide the Person from Directory.

## 13. DIR-05 — Credentials & Documents

### 13.1 Credential content

- Certificate of Achievement.
- Digital Badge.
- Credential ID, where applicable.
- Issue date.
- Related Internship, Programme or Activity.
- Completion year and relevant category.
- View or download action according to permission.

### 13.2 Document content

- CV.
- Academic Transcript.
- Other authorised profile or final documents.

### 13.3 Digital Badge states and persistence

The initial Digital Badge business states are:

- `Not Available`
- `Available`

Once a Digital Badge is issued after successful completion of its related Internship, it remains available permanently in the Person's record.

Do not design `Expired`, `Revoked` or `Reissued` Badge states in the current scope. A temporary generation failure is a technical error and must not become a long-term business status.

Certificate states remain governed by the applicable Internship completion and credential-issuance requirements.

### 13.4 Relationship to source records

A Credential relates to the specific Internship, Programme or Activity that earned it. It must not be stored only as an untraceable Person-level label.

## 14. DIR-06 — Person Detail: Internal

### 14.1 Visibility

This tab is visible only to authorised internal roles. Content may be further restricted by field classification.

### 14.2 Content

- Internal Notes.
- System Activity Log.
- Status Change History.
- Access and Sensitive-field Reveal Audit.
- Record Source and Merge History.

### 14.3 Internal Notes

Each note should retain:

- Note content.
- Author.
- Author role.
- Created timestamp.
- Last amended timestamp, if editing is permitted.
- Classification or visibility scope, if required.

Internal Notes are excluded from Candidate-facing views and all profile exports.

### 14.4 Communication history boundary

Do not display full email communication history or appeal-letter content in Candidate 360 unless a later requirement explicitly changes this rule.

The system may show audit events such as:

- Email Generated.
- Email Sent.
- Status Changed.
- Rejection Action Recorded.
- Record Accessed.
- Sensitive Field Revealed.

## 15. DIR-07 — Download Profile Preview

### 15.1 Purpose

Allow the user to verify the permitted export content before generating or downloading a Candidate 360 Profile PDF.

### 15.2 Format

- The downloaded profile combines relevant on-screen subsections into one continuous profile.
- The PDF should use the same information hierarchy as the web profile where practical.
- Display generated date and data cut-off or Last Updated timestamp.
- The output must remain readable when sections contain missing or long values.

### 15.3 Confirmed exclusions

- Active Application detail.
- Internal Notes.
- Activity and Access Audit.
- Sensitive decision reasons.
- Full email history.

### 15.4 Conditional inclusions

When the information exists in the Person record and the exporting user is authorised to view it, the Profile PDF includes:

- Contact Details.
- Profile photo.
- Assessment summary.
- Mentor feedback.
- Candidate feedback.

If the profile photo does not exist, the PDF must not reserve an empty photo placeholder.

### 15.5 Batch Excel export

Batch export originates from `DIR-01`, uses the active result filters and is permission controlled.

Potential export templates include:

- Executive Summary.
- Undergraduate Scholar List.
- Filtered People List.

Final template names and fields remain TBC. UX should support a clear pre-export scope summary rather than exposing every database field.

## 16. DIR-08 — Potential Duplicate / Merge Person

### 16.1 Role

Only IO Admin may perform a Person merge.

### 16.2 Entry points

- Potential Duplicate indicator in Directory results.
- Data-quality or administration workflow.
- Person Detail warning where permitted.

### 16.3 Duplicate-detection rules

Use the following working confidence model:

- **High confidence:** the same verified Singpass identity or the same authoritative Source Person ID. The system may link the record through the controlled identity-linking process while retaining an audit trail.
- **Medium confidence:** a combination such as Name, Date of Birth and Verified Email indicates a Potential Duplicate. The system must prompt IO Admin to compare and decide.
- **Low confidence:** a name-only or weak contextual match. Do not automatically merge or present it as a confirmed duplicate.

Email alone is not a sufficient reason to merge two Person records.

### 16.4 Required comparison content

- Person IDs.
- Names and identity summary.
- Linked login methods.
- Contact information, subject to permission.
- Source-system identifiers.
- Profile conflicts.
- Count and type of related records.
- Last Updated and source freshness.

### 16.5 Merge flow

1. Compare potential duplicates.
2. Select the surviving Person record.
3. Resolve or acknowledge conflicting fields.
4. Enter a required merge reason.
5. Review affected record counts.
6. Confirm the merge.
7. Show the completed audit result.

The merge must not physically delete related Applications, Internships, Events, Scholarships, Credentials or Documents. All source references and audit history must be retained.

Undo Merge is required in the initial scope. The system must retain enough identity, relationship and source-reference history to restore the pre-merge Person records through an authorised IO Admin action.

## 17. State and Frame Matrix

### 17.1 DIR-01 People Directory

| Required frame | UX requirement |
|---|---|
| Default — All People | Standard result list with default columns. |
| Registered Only | People with a login registration but no relevant business or participation records. |
| Saved view applied | Show active view and allow additional filtering. |
| Search results | Query, result count and clear-search behaviour. |
| No results | Neutral empty state with clear filter/search reset. |
| Filters applied | Active filter summary and clear-all behaviour. |
| Batch selected | Selected count and permitted batch actions. |
| Export configuration | Scope, template and permission messaging. |
| Export success / failure | Clear result and recovery path. |
| Restricted result or field | Do not reveal protected information in row previews. |
| Potential Duplicate | Non-destructive warning and IO Admin path. |

### 17.2 Person Detail

| Required frame | UX requirement |
|---|---|
| Registered Only | Factual profile with no relationships or Journey items. |
| One active relationship | Clear primary current context. |
| Multiple active relationships | Show several badges without forcing one global status. |
| Historical record only | Make record age and source clear. |
| Rich multi-year Journey | Timeline remains scannable and filterable. |
| Missing profile fields | Neutral missing-data treatment. |
| Masked and revealed fields | Permission-aware interaction and audit notice. |
| No permission | Do not expose existence or content beyond approved copy. |
| No Credentials | Useful empty state without implying an error. |
| Potential Duplicate | Warning does not block normal read-only access unless policy requires it. |
| PDF preview | Confirm included and excluded sections before download. |

### 17.3 Internal tab

| Required frame | UX requirement |
|---|---|
| Notes available | Chronological notes with author and timestamp. |
| No notes | Clear empty state and Add Note action for authorised users. |
| Activity log available | Filterable or grouped event list where volume is high. |
| Restricted internal content | Role-appropriate restriction treatment. |
| Merge history | Show source and surviving Person IDs without exposing unauthorised data. |

## 18. Sample Profiles for UX

UX should use realistic text lengths and at least the following three scenarios.

### 18.1 Sample A — Registered Only

```text
Name: Daniel Goh
Person ID: PER-0001042
Registration: Email
Institution: National University of Singapore
Course: Computer Engineering
Year of Study: Year 1
Relationships: None
Current Activity: None
DSTA Journey: No recorded activities
Credentials: None
```

Purpose: validate the Directory promise that a registered Person remains discoverable without an Application, Internship, Scholarship or Activity record.

### 18.2 Sample B — Active Intern

```text
Name: Alicia Tan
Person ID: PER-0000142
Login identities: Email and Singpass
Current relationship: Intern · Active
Other relationship: Event Participant · BrainHack 2025
Institution: Nanyang Technological University
Course: Computer Science
Current activity: Autonomous Systems Research Internship
Credential: Pending Issuance
```

Purpose: validate a current relationship, a prior event touchpoint and a future credential.

### 18.3 Sample C — Multi-relationship and historical journey

```text
Name: Jun Hao Lim
Person ID: PER-0000028
Current relationship: Scholar · Active
Historical relationships: Intern · Completed 2021; Intern · Completed 2025
Activities: YDSP Camp, Research@YDSP, BrainHack, Tech UP
Credentials: Two Internship badges and one Certificate of Achievement
Sources: TOA plus migrated historical records
```

Purpose: validate multiple badges, overlapping relationships, a long Journey and mixed data sources.

Sample values are UX test data only and must not be treated as production records or final data-dictionary values.

## 19. Responsive Scope

Recommended design scope:

- Primary: Desktop at 1440 px.
- Required adaptation annotation: Desktop / tablet-width internal layout at 1024 px.
- Internal Directory mobile design: Out of scope unless separately requested.

Candidate-facing Certificates, Badges and personal profile functions belong to the Candidate Portal and require separate mobile coverage.

## 20. Existing Prototype Treatment

The existing Candidate 360 prototype may be used as a source of interaction ideas, but it must be revised conceptually before final UX design.

Key differences:

- Current prototype entry is based on Application ID; new Directory uses Person ID.
- Current prototype groups history using email; new Directory links records through Person ID.
- Current prototype includes Application workflow decisions; new Candidate 360 is read-oriented and links to source modules.
- Current engagement entries are too limited to support record links, status, source, deliverables, feedback and permissions.
- Directory must add a first-level landing page for all people, including Registered Only people.

The current Engagement Score, Project Fit Ranking, re-engagement eDM action and AI Chatbot are not core Directory IA requirements for the initial UX design.

AI Summary may be retained as an Overview aid if the source, permissions and generated-content treatment are designed clearly.

## 21. Deferred Decisions and External Dependencies

The following items do not block the initial UX design:

1. **Management access:** final Management field and action permissions are deferred. Do not create Management-specific Directory frames at this stage.
2. **Data Migration:** field-level source precedence, conflicting-source resolution and migration mapping are handled in the separate Data Migration work. Directory displays the canonical values produced by that work.
3. **Credential generation operation:** the technical retry and support process for a failed Badge or Certificate generation is an operational design dependency, not an additional long-term credential status.

UX must carry these items as dependencies and must not create new business rules to resolve them.

## 22. UX Handoff Expectations

The UX handoff should include:

- One Directory sitemap.
- The Screen Inventory mapped to frames.
- DIR-01 default, filtered, empty, export and duplicate states.
- Person Detail shared shell and five tab designs.
- Registered Only, Active Intern and Multi-relationship sample profiles.
- Role and restricted-field annotations.
- Web-to-PDF content mapping.
- Desktop 1440 designs and 1024 adaptation notes.
- A visible list of TBC decisions carried forward from this brief.

UX should not infer missing business rules from the existing prototype where this brief marks a rule TBC.
