# Programme V2 design QA

## Visual truth

- Primary reference: `/Users/jiangxiaoming/.codex/generated_images/01a00e57-b758-7b10-bfed-c9d0bc5e2710/exec-14b3af5b-dd57-4e12-b6bc-671cbc8eef30.png`
- Supporting references:
  - `/Users/jiangxiaoming/.codex/generated_images/01a00e57-b758-7b10-bfed-c9d0bc5e2710/exec-8f0bbaec-a785-43bf-825c-ed49db82075b.png`
  - `/Users/jiangxiaoming/.codex/generated_images/01a00e57-b758-7b10-bfed-c9d0bc5e2710/exec-af074d19-da8b-417b-b03d-20a18c22c385.png`
- Implementation screenshot: `/Users/jiangxiaoming/Documents/ChatGPT/UT Prototype/programme-v2-implementation.png`
- Side-by-side comparison: `/Users/jiangxiaoming/Documents/ChatGPT/UT Prototype/programme-v2-comparison.png`

The references define the Programme IA, secondary navigation, density, borders, blue accent, and enterprise-light content treatment. The V2 screen intentionally keeps the repository's current shared application shell and PRIZM tokens instead of recreating the older global header shown in the references.

## Test state

- URL: `http://127.0.0.1:3059/programmes-v2`
- Viewport: 1440 × 1024, DPR 2
- Role: IO Admin
- State: Active programmes, no search or category filter
- Full-view evidence was sufficient because the secondary navigation and complete table are legible at the target viewport; no separate crop was needed.

## Findings and fixes

- P2 — The first pass allowed the table's right-side assigned-project and action columns to become cramped. Fixed by reducing the secondary navigation to 260 px and assigning stable semantic column widths.
- Post-fix — Programme hierarchy, All Programmes and New Programme entry points, current-programme context, status tabs, filters, table, and row actions are visible without horizontal clipping.
- Intentional difference — The current dark shared top bar and expanded global navigation remain unchanged to preserve the active product shell and avoid affecting other routes.

## Interaction checks

- Multiple-intake row expands and collapses correctly.
- Draft tab shows the appropriate empty state; Active restores the active list.
- Searching for `Tech UP` narrows the list to the matching programme and clearing restores the list.
- Row action menu opens and exposes View, Edit, Duplicate, status, and Delete actions.
- Existing browser console inspection showed no runtime errors.
- TypeScript strict check passes.

## Result

final result: passed

---

# Applicant applications design QA

## Visual truth

- Primary list reference: `/Users/jiangxiaoming/Downloads/Main.jpg`
- Primary detail reference: `/Users/jiangxiaoming/Downloads/Applications detail.jpg`
- List implementation: `/private/tmp/applications-list-implementation.png`
- Detail implementation: `/private/tmp/application-detail-implementation.png`
- Side-by-side comparisons:
  - `/private/tmp/applications-list-comparison.png`
  - `/private/tmp/application-detail-comparison.png`

The references define the two-column application-card layout, stage tabs, restrained enterprise styling, horizontal progress tracker, timeline, document rows, and right-hand supporting cards. The implementation keeps that structure while applying the brief's internship-specific content model.

## Test state

- List URL: `http://127.0.0.1:3000/apply/applications`
- Detail URL: `http://127.0.0.1:3000/apply/applications/app-ui-2027`
- List viewport: 1440 × 1212, CSS pixels, DPR 1
- Detail viewport: 1440 × 1073, CSS pixels, DPR 1
- Applicant: Jenny Aw
- List filter: All (6)
- Detail state: University Internship 2027, Under review
- Full-view native-resolution evidence was sufficient because labels, card hierarchy, and controls remained legible; no focused crop was required.

## Findings and fixes

- P2 — Replaced non-semantic utility colors in the completed progress step and neutral timeline marker with PRIZM semantic tokens.
- Post-fix — Header, filter counts, application-card grid, action-required CTA, five-stage journey, timeline, documents, summary, key details, contact, and next-step card are visible without clipping at their matched reference viewports.
- Intentional difference — Programme and intake replace job title and department because the supplied screen brief defines internship applications rather than job applications.
- Intentional difference — The detail tracker includes Offer as a fifth stage, matching the brief's required Submitted → Under review → Interview → Offer → Outcome model.
- Intentional difference — The existing DSTA ship illustration is preserved in place of the reference rocket illustration to retain the product's established SVG visual language.

## Interaction checks

- All, Needs action, In progress, and Closed filters show the correct record counts and filter the grid.
- View application opens the matching detail route.
- Confirm interview routes to the interview task flow.
- Document download controls invoke the mock download behavior.
- Withdraw opens a confirmation dialog; cancelling preserves the application.
- Missing-record handling and responsive single-column layouts are present.
- TypeScript strict check and `git diff --check` pass.

## Result

final result: passed
