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

# LinkedIn Suggested Post Image — QA

## Evidence

- Route: `http://127.0.0.1:3000/apply/applicant-linkedin-share`
- Screenshot: `/private/tmp/applicant-linkedin-share-with-poster.png`
- Project asset: `public/images/internship-completed-linkedin.png`

## Checks

- The supplied square internship-completion poster is displayed beside the editable suggested copy.
- The complete artwork remains visible at its original aspect ratio without cropping or distortion.
- The post copy, external-navigation notice, and Continue/Cancel actions remain visible and usable.
- The layout collapses naturally below the desktop breakpoint.
- TypeScript strict check and `git diff --check` pass.

## Result

final result: passed

---

# Applicant Feedback Completion — QA

## Evidence

- Review route: `http://127.0.0.1:3000/apply/applicant-feedback-review`
- Confirmation route: `http://127.0.0.1:3000/apply/applicant-feedback-confirmation`
- Completed Offboarding route: `http://127.0.0.1:3000/apply/applicant-offboarding`
- Completed-state screenshot: `/private/tmp/applicant-offboarding-feedback-completed-viewport.png`

## Interaction and state checks

- Submit Feedback persists the validated draft to the offboarding internship record and clears the saved draft.
- Submission routes to the feedback confirmation page.
- Return to Offboarding shows `Required action completed`, a success notice, and a completed feedback card.
- The previous required-action warning and Start Feedback action are no longer shown after submission.
- Certificate eligibility is clearly shown as unlocked, while the optional LinkedIn and resume actions remain available.
- Refresh-safe completion is derived from the existing localStorage-backed internship record.
- TypeScript strict check and `git diff --check` pass.

## Result

final result: passed

---

# Applicant offer detail — merged review and direct period editing QA

## Evidence

- Original offer detail: `/private/tmp/dsta-offer-period-audit/01-offer-detail.png`
- Merged implementation: `/private/tmp/applicant-offer-detail-merged-final.png`
- Period editing sheet: `/private/tmp/applicant-offer-period-sheet-final.png`
- Corrected project date format: `/private/tmp/applicant-offer-period-sheet-date-format-final.png`
- Combined date-range picker: `/private/tmp/applicant-offer-period-range-picker-final.png`
- Offer rejection reason select: `/private/tmp/applicant-offer-reject-reason-select-final.png`
- Side-by-side comparison: `/private/tmp/applicant-offer-detail-comparison-final.jpg`
- Browser viewport: 1105 × 896 CSS pixels, DPR 1

## Findings and fixes

- Replaced the separate period-change request treatment with an `Edit` action inside the existing Internship period field.
- Merged acceptance review into the offer detail card with exactly five review confirmations followed by `Remarks (optional)`.
- Removed the intermediate accept-review route from the primary flow; Accept Offer now continues directly to the existing accepted confirmation route.
- Added a right-side period editor with the programme window clearly stated and date inputs constrained to 1 Sept–31 Dec 2026.
- A valid changed period saves immediately, updates the visible field, records an IO notification, and shows a success toast; no pending approval, approve, or reject state is introduced.
- P1 found during validation — a standalone field error component caused a missing field-context runtime error. Replaced it with a semantic alert paragraph and rechecked the repaired sheet.
- Annotation fix — replaced locale-dependent native date inputs with the existing project date picker, so field values now use the project format such as `1 Sept 2026` while retaining calendar selection.
- Annotation fix — removed the redundant Remarks helper sentence while retaining the optional label, textarea placeholder, validation, and character counter.
- Annotation fix — expanded the visible `IO notified` abbreviation to `Internship Officer notified` for clarity.
- Annotation fix — renamed the date-range callout from `Available window` to `Internship duration` without changing its constraints.
- Annotation fix — removed the `Restore offered dates` action and its unused handler; Cancel and Save changes remain available.
- Annotation fix — combined Start date and End date into one split range control, opening a shared two-calendar panel modelled on the supplied reference.

## Interaction and technical checks

- `Edit` opens the right-side sheet; Cancel closes it without changing the saved dates.
- Valid dates save and display the `Updated` and `IO notified` treatments.
- Dates outside the programme window are rejected and the sheet stays open with an inline error.
- Date picker calendars disable dates outside the programme window; the start picker also cannot select a date after the current end date.
- The combined range control updates both dates, saves successfully, closes the sheet, updates the offer period, and shows the existing notification toast.
- Offer rejection uses a PRIZM select with six common reasons; keyboard opening, option selection, selected-state display, and the unchanged optional Remarks field were verified.
- All five review checkboxes are required before Accept Offer becomes enabled; Remarks remains optional and is limited to 500 characters.
- The final acceptance destination is verified statically; the destructive final submission was not triggered during browser QA.
- Typography, spacing, semantic colors, borders, radii, copy, focus treatment, and full-page composition were checked against the combined comparison image.
- TypeScript strict check and `git diff --check` pass.

## Result

final result: passed

---

# Public Internships — Simplified Types QA

## Evidence

- Reference: `/var/folders/cy/xls3c3zs60q8z3k0hnj3_hpm0000gp/T/codex-clipboard-d111cba6-818a-4440-8545-31e3d831d008.png`
- Desktop implementation: `/Users/jiangxiaoming/Documents/ChatGPT/UT Prototype/public-internships-simplified-top.png`
- Project drill-down: `/Users/jiangxiaoming/Documents/ChatGPT/UT Prototype/public-internships-simplified-projects-viewport.png`
- Mobile implementation: `/Users/jiangxiaoming/Documents/ChatGPT/UT Prototype/public-internships-simplified-mobile.png`
- Side-by-side comparison: `/Users/jiangxiaoming/Documents/ChatGPT/UT Prototype/public-internships-simplified-comparison.png`

## Findings and fixes

- Replaced the project-first information architecture with four recognisable internship-type cards.
- Made application availability visible before users take action: `Open now`, `Not open yet`, and `Projects available`.
- Upcoming programmes use non-interactive availability rows, avoiding a misleading disabled call to action.
- Kept project details behind explicit Polytechnic and University project actions so the initial page remains concise.
- Removed the duplicated programme selector, search sidebar, preparation steps, and large contact panel.
- Preserved the project source of truth from `data/projects.json` and progressively discloses mentor and discipline details.

## Interaction and responsive checks

- University and Polytechnic project actions reveal the matching seeded project set.
- Student-type switching updates the visible projects without navigating away.
- Project detail disclosure and application actions remain available within each project card.
- The four type cards collapse to a single column at mobile width with no horizontal overflow.
- Browser console reported no errors; TypeScript strict check and `git diff --check` pass.

## Result

final result: passed

---

# Applicant offboarding — resume description QA

## Evidence

- Source annotation: browser screenshot targeting the former Request testimonial card.
- Updated offboarding card: `/private/tmp/applicant-offboarding-resume-card-final.png`
- Reordered offboarding cards: `/private/tmp/applicant-offboarding-resume-card-last-final.png`
- Editable generated draft: `/private/tmp/applicant-resume-description-page-final.png`

## Findings and interaction checks

- Replaced the testimonial card with `Build your resume entry` and a clear `Generate Resume Description` action.
- The destination now generates realistic achievement-focused content from the internship and project context instead of opening a mentor request form.
- The generated content is editable, limited to 800 characters and saved to prototype local storage.
- Save Description returns to Offboarding; Not Now remains available.
- Corrected the related Record context programme to `University Internship 2026` for consistency with the offboarding record.
- Annotation fix — moved `Build your resume entry` to the third card and aligned the optional-action checklist order.
- Feedback annotation — removed the duplicate header-level Save Draft and Review Feedback actions; the single form-bottom action set remains.
- TypeScript strict check and `git diff --check` pass.

## Result

final result: passed

---

# Public Internships — Hero Background QA

- Source asset: `/Users/jiangxiaoming/Downloads/ChatGPT Image 2026年7月28日 18_16_43 1.jpg`
- Desktop capture: `/Users/jiangxiaoming/Documents/ChatGPT/UT Prototype/public-internships-hero-desktop.png`
- Mobile capture: `/Users/jiangxiaoming/Documents/ChatGPT/UT Prototype/public-internships-hero-mobile.png`
- The supplied illustration is stored locally and never hotlinked.
- Desktop preserves the people, drone and defence interface while a left-to-right surface gradient protects headline contrast.
- Mobile lowers image contrast and keeps the title within the first viewport without horizontal overflow.
- Browser console, TypeScript strict check and `git diff --check` pass.

## Result

final result: passed

---

# Public internships project browser design QA

## Visual truth and implementation evidence

- Source content reference: `/var/folders/cy/xls3c3zs60q8z3k0hnj3_hpm0000gp/T/codex-clipboard-3b925228-2ee8-4344-9c26-24781a9bd746.png`
- Source pixels: 3024 × 2620, density unspecified.
- Desktop implementation: `/Users/jiangxiaoming/Documents/ChatGPT/UT Prototype/public-internships-desktop-final.png`
- Project-browser focus: `/Users/jiangxiaoming/Documents/ChatGPT/UT Prototype/public-internships-projects-final.png`
- Mobile implementation: `/Users/jiangxiaoming/Documents/ChatGPT/UT Prototype/public-internships-mobile.png`
- Side-by-side comparison: `/Users/jiangxiaoming/Documents/ChatGPT/UT Prototype/public-internships-qa-comparison.jpg`

The supplied screenshot is a legacy Types of Internship modal and is used as the content-structure reference rather than a pixel-identical visual target. The implementation intentionally keeps the current public DSTA header, local ship illustration and PRIZM 4.0 Enterprise-light tokens while converting the content into a programme-led project browser.

## Test state

- URL: `http://127.0.0.1:3000/join-us/student/internships`
- Desktop viewport override: 1440 × 900 CSS pixels; screenshot output 1309 × 818 pixels due to the in-app browser panel scale.
- Mobile viewport override: 390 × 844 CSS pixels; screenshot output 354 × 767 pixels due to the same panel scale.
- Initial programme: University Internship, two available projects.
- Interaction state: Polytechnic selected, `radar` search applied, Radar Signal Classification detail expanded.
- Density normalization: the reference was proportionally resized to the 818-pixel implementation screenshot height for the side-by-side content comparison. Pixel-level fidelity was not asserted because the reference and implementation intentionally represent different shells and states.

## Fidelity review

- Fonts and typography: existing system font stack and PRIZM weights are retained; headings, metadata and small labels remain legible at desktop and mobile sizes.
- Spacing and layout rhythm: the desktop layout uses a three-programme comparison grid followed by a sticky filter and divided project results; mobile collapses each region to one column without horizontal overflow.
- Colors and visual tokens: all new surfaces, borders, text and status treatments use PRIZM semantic tokens. Blue remains the single interaction accent.
- Image quality and assets: the existing local DSTA logo and ship line-art SVG are preserved without substitutes, external assets or code-drawn approximations.
- Copy and content: programme eligibility, period, project count, technical domain, work arrangement, duration, skills, mentor and suitable disciplines are available in English. The primary page message now explicitly tells applicants they can browse projects.

## Findings and comparison history

- First pass: no P0, P1 or P2 layout or task-flow issues were found at the desktop or mobile breakpoint.
- P3 — Next Image reported a logo aspect-ratio warning. Fixed by applying a fixed height with automatic width; the final browser console contains no errors.
- Intentional difference — The reference lists JC and post-JC internship types, while the project source of truth currently contains University, Polytechnic and Tech UP programmes. The interface exposes only programme/project combinations backed by `data/projects.json` rather than inventing unavailable projects.
- Focused-region evidence was required because the project browser sits below the fold. `public-internships-projects-final.png` confirms that programme filters, search, project metadata and Apply/View project actions are visible together.

## Interaction checks

- Programme selection updates the visible project list and clears stale search/detail state.
- Keyword search filters title, description, technical domain, discipline and skills.
- Project details expand and collapse in place to show mentor and suitable disciplines.
- Empty search results provide a clear recovery action.
- Application CTAs continue into the existing applicant sign-in/application flow.
- TypeScript strict check passes and the final browser console has no runtime errors.

## Result

final result: passed

---

# Multi-application Applicant Home design QA

## Visual truth and IA

- IA source: `/Users/jiangxiaoming/Downloads/applicant-dashboard-application-ia-updated (1).xlsx`, `Multi-App IA!A1:H54`
- Visual reference: `/var/folders/cy/xls3c3zs60q8z3k0hnj3_hpm0000gp/T/codex-clipboard-602a5bf9-3df7-4ba8-87fe-3c54d52bffe8.png`
- Implementation evidence: `/Users/jiangxiaoming/Documents/ChatGPT/UT Prototype/multiple-applications-dashboard-implementation.jpg`

The reference defines the multi-application hierarchy and content density. The implementation intentionally retains the portal's current top bar, compact rail, ship hero, PRIZM tokens, card radii, typography, and existing dashboard artwork.

## Test state

- URL: `http://127.0.0.1:3061/apply/dashboard?state=multiple_active_applications`
- Browser evidence: 1281 px wide full-page capture
- Applicant: Jenny Aw
- Applications: University Internship 2027 (Interview invitation) and Research Internship 2027 (Under review)
- Priority rule: one required action with the nearest deadline

## Findings and fixes

- The user-level hero remains application-neutral and reports two active applications with one attention item.
- Only the University Internship interview task receives the dominant Primary Spotlight and CTA.
- Both applications use compact, independent lifecycle summaries; no duplicate full Journey, Guide, or Activity module is rendered per application.
- The Interview Guide follows the highest-priority task, the Defender Archetype appears once, and activity is aggregated with programme labels.
- The research application CTA was routed to the existing applications overview because this prototype has no separate research detail record.
- Intentional visual difference: the supplied screenshot uses a separate concept shell; this implementation preserves the established applicant dashboard shell and PRIZM visual system as requested.

## Interaction and technical checks

- `Select Timeslots` opens the existing interview-timeslot dialog.
- The profile scenario switcher includes `Multiple active applications`.
- Application CTAs route only to existing views.
- Browser console has no runtime errors; only an existing Next Image performance warning was observed.
- TypeScript strict check and `git diff --check` pass.

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

---

# Public Internships — DSTA Site Chrome QA

## Evidence

- Official desktop header: `/Users/jiangxiaoming/Documents/ChatGPT/UT Prototype/dsta-student-source-top.png`
- Official desktop footer: `/Users/jiangxiaoming/Documents/ChatGPT/UT Prototype/dsta-student-source-footer.png`
- Local desktop header: `/Users/jiangxiaoming/Documents/ChatGPT/UT Prototype/public-internships-dsta-header-desktop.png`
- Local desktop footer: `/Users/jiangxiaoming/Documents/ChatGPT/UT Prototype/public-internships-dsta-footer-desktop.png`
- Header comparison: `/Users/jiangxiaoming/Documents/ChatGPT/UT Prototype/public-internships-dsta-header-comparison.png`
- Footer comparison: `/Users/jiangxiaoming/Documents/ChatGPT/UT Prototype/public-internships-dsta-footer-comparison.png`
- Mobile menu: `/Users/jiangxiaoming/Documents/ChatGPT/UT Prototype/public-internships-dsta-mobile-menu.png`
- Mobile footer: `/Users/jiangxiaoming/Documents/ChatGPT/UT Prototype/public-internships-dsta-mobile-footer.png`

## Findings and fixes

- Removed the applicant-only `Back to Applicant Home` control from the public page.
- Reused the existing Singapore Government masthead and DSTA logo assets.
- Matched the official white public navigation, active Join Us treatment, compact search control, and responsive menu pattern.
- Expanded the existing public footer into the official two-layer structure: charcoal navigation followed by the navy legal bar.
- Kept the existing compact footer mode unchanged for applicant screens that already use it.
- Collapsed footer sub-navigation on smaller screens to avoid an excessively long mobile footer.

## Interaction and responsive checks

- Government masthead disclosure remains interactive.
- Mobile navigation opens and closes correctly and exposes all primary links.
- Back to top returns the page to the top with smooth scrolling.
- Desktop navigation and footer columns appear at wide breakpoints; mobile has no horizontal overflow.
- Browser console reported no errors; TypeScript strict check and `git diff --check` pass.

## Result

final result: passed
