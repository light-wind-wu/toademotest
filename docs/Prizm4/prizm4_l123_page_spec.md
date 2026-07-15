# PRIZM 4 · L1 / L2 / L3 Page Specification for TOA

> Generated on 2026-07-01.  
> Scope: TOA Enterprise pages, especially Programmes, Projects, Requests, Review / Preview, and Operational Detail pages.  
> Inputs compared: `summary.html` audit summary + `prizm4-page-rules(3).md` current rules.

---

## 0. Decision Summary

**Decision: the current `prizm4-page-rules(3).md` should be updated.**

The current MD is useful and already covers the main TOA page patterns, but it mixes three layers in one file:

1. **Official PRIZM 4 rules** — stable components, semantic tokens, Enterprise theme.
2. **TOA project extensions** — `SortTh`, `StatusBadge`, `AppStatusBadge`, list status dot pattern, project typography tokens.
3. **Page-specific review decisions** — Programmes / Requests / Projects table behaviour and Review page UX choices.

This L1 / L2 / L3 split should be used so future Codex / AI work can understand what is official, what is a TOA wrapper, and what is only a specific page decision.

### Update priority

| Priority | Update | Reason |
| --- | --- | --- |
| P0 | Replace mandatory `components/ui/date-picker.tsx` rule | PRIZM Date Picker is planned, not shipped. Do not force a missing official component. |
| P0 | Remove all hard-coded status hex values | The current MD bans raw hex but later uses `#00C950` and `#00A6F4`. |
| P1 | Add a dedicated “Unpublished PRIZM Components” section | Prevent future AI / Codex sessions from fabricating planned components. |
| P1 | Clarify official PRIZM vs TOA project wrappers | `SortTh`, `StatusBadge`, `AppStatusBadge`, `text-metric`, list status dot are project conventions, not official PRIZM exports. |
| P1 | Tooltip must use `components/ui/tooltip.tsx` | Current MD describes tooltip style but should explicitly require the component primitive. |
| P2 | Convert table hover/status deviations into explicit TOA overrides | Keep review decisions only when they are labelled as TOA page rules, not PRIZM defaults. |

---

## 1. Session / Section: PRIZM 4 Unpublished Components Dedicated Area

This section must be added near the top of the MD, before normal component rules.

### Principle

If PRIZM marks a component as **planned**, it is **not an available official primitive**. The project may use a temporary TOA wrapper, but the wrapper must be named and documented as project-specific. Do not create a file that looks like an official PRIZM primitive unless the source exists in PRIZM.

### Planned component matrix

| PRIZM component | Official status | Current MD treatment | Required MD update | Temporary TOA implementation rule |
| --- | --- | --- | --- | --- |
| `Date Picker` | Planned | Current MD says: “Date controls must use `components/ui/date-picker.tsx`.” | **Update required.** Replace with “Date Picker is planned; do not require `date-picker.tsx` as an official primitive.” | Use a temporary `ProjectDateField` / `ToaDateField` wrapper composed from `Field` + `Input` + `Popover` + `Calendar`. Label it as a TOA wrapper and keep it MUI-free. |
| `Accordion` | Planned | Current MD already says not to invent a shared accordion primitive; use accessible disclosure. | Keep, but move into this dedicated section. | Use `button` + `aria-expanded` + semantic tokens + chevron. Do not create `components/ui/accordion.tsx` as PRIZM official. |
| `Toggle Group` | Planned | Not clearly documented. Current MD uses Tabs for filtered views. | Add rule. | Use `Tabs` for single-view switching. Use Checkbox / Button group only when it is a clear multi-select control. Do not invent `toggle-group.tsx`. |
| `Number Input` | Planned | Not clearly documented. | Add rule. | Use `Field` + `Input` with validation, helper text, min/max copy, and keyboard-safe handling. Do not create PRIZM `number-input.tsx`. |
| `Tree` | Planned | Not clearly documented. | Add rule. | Use Table, grouped list, or disclosure list. Use hierarchy only when it is essential. Do not create `tree.tsx`. |
| `Scroll Area` | Planned | Not clearly documented. | Add rule. | Prefer native overflow with PRIZM surfaces. Do not create custom scrollbars unless reviewed. |

### Copy block to add to MD

```md
## Unpublished PRIZM Components

PRIZM planned components are roadmap placeholders, not shipped primitives. Do not create or require official-looking `components/ui/<planned-component>.tsx` files unless the source exists in PRIZM.

- Date Picker is planned. Until it ships, date controls must use a TOA-specific wrapper composed from `Field`, `Input`, `Popover`, and `Calendar`, or a simple validated text/date input when the interaction does not need a calendar panel. Name the wrapper as project-specific, for example `components/toa/toa-date-field.tsx`, not `components/ui/date-picker.tsx`.
- Accordion is planned. Use an accessible disclosure pattern: `button`, `aria-expanded`, chevron, semantic tokens, and keyboard focus states. Do not create a shared PRIZM accordion primitive.
- Toggle Group, Number Input, Tree, and Scroll Area are planned. Use existing stable components or documented TOA wrappers; mark any wrapper as project-owned.
```

---

## 2. L1 — PRIZM Foundation Rules

L1 is the non-negotiable PRIZM layer. It applies before any TOA-specific page decisions.

### L1.1 Theme and runtime

- Root must use Enterprise light mode: `<html data-zone="enterprise" data-mode="light">`.
- Use local Inter / system font stack from the app. No remote font URLs, CDN fonts, or third-party scripts.
- Use PRIZM semantic tokens. Do not use raw Tailwind palettes or inline hex colours.
- Prefer PRIZM component variants before overriding `className`.
- If a PRIZM source file or planned component path is missing, stop and report it instead of fabricating a substitute.

### L1.2 Stable component priority

Use stable PRIZM primitives before page-local UI:

| Need | PRIZM stable primitive |
| --- | --- |
| Primary / secondary action | `Button` |
| Text input | `Input`, `Textarea`, `Field`, `Label` |
| Select / searchable select | `Select`, `Combobox` |
| Boolean selection | `Checkbox`, `Radio Group`, `Switch` |
| Data list | `Table` |
| Status / metadata label | `Badge` |
| Container | `Card`, `Frame`, `Group`, `Stack`, `Separator` |
| Empty region | `Empty State` |
| Dialog / drawer / floating layer | `Dialog`, `Sheet`, `Popover`, `Tooltip`, `Menu`, `Hover Card` |
| Navigation | `Tabs`, `Breadcrumb`, `Pagination`, `Navigation Menu`, `Link` |
| Type | `Heading`, `Text`, `Prose`, `Code`, `Kbd` |

### L1.2.1 Card primitive standard

PRIZM Card is a stable primitive. Use `components/ui/card.tsx` for primary detail-page and dashboard surfaces before introducing page-local `div.card` structures.

Official Card baseline from PRIZM:

- Root: `rounded-lg border border-border bg-surface text-fg shadow-sm`.
- Header: title + description region with `p-6` and compact vertical gap.
- Title: `text-lg font-semibold leading-none`.
- Description/body copy: `text-sm text-fg-muted`.
- Content: `p-6 pt-0`.
- Footer: action row with `p-6 pt-0`.

TOA usage rules:

- Do not nest cards for ordinary field groups inside a detail card. Use grid sections, dividers, tables, or accessible disclosures.
- Summary metric cards may use the Card root with compact padding, but metric labels stay caption-scale and metric values should not exceed the page's approved metric/headline scale.
- Avoid `rounded-xl` for normal detail/list cards unless an existing component explicitly requires it.
- Card is a grouping surface, not a typography escape hatch. Text inside cards must still follow the relevant detail/list typography table.

### L1.3 Colour and status

- Status colours must use semantic status tokens: `bg-success`, `text-success`, `bg-info`, `text-info`, `bg-warning`, `text-warning`, `bg-danger`, `text-danger`.
- Colour must never be the only carrier of meaning. Every dot, badge, alert, and action state needs visible text or an accessible name.
- Do not use inline colour values such as `#00C950` or `#00A6F4` in page code or MD examples.

### L1.4 Accessibility

- Focusable elements need visible focus state using PRIZM accent focus treatment.
- Icon-only controls need `aria-label`.
- Interactive targets should be at least 32px high in compact Enterprise UI; 40px+ for primary actions.
- Body copy should not be reduced to caption scale for paragraph-length content.
- Do not use page-wide opacity on readable text if it risks failing WCAG AA.

---

## 3. L2 — TOA Page Pattern Rules

L2 converts PRIZM primitives into repeatable TOA page patterns.

### L2.1 Enterprise operational list page

Use for Programmes, Projects, Requests, Applications, and other admin lists.

**Required structure**

1. Breadcrumb or section context when needed.
2. Page header: title, short helper text, primary action.
3. One list card: toolbar, tabs or filters, table, footer range / pagination.
4. Table primitives only. No hand-styled native table markup.
5. Empty states stay inside the active table/list card.

**List card behaviour**

- Search uses `Input` pattern with accessible label / name.
- Single-view switching uses `Tabs`.
- Column visibility uses `Popover` + `Checkbox`.
- Sorting is not built into PRIZM Table. Use TOA `SortTh` only as a project wrapper.
- Pagination uses PRIZM pagination when data is paginated; otherwise use simple count copy.

**TOA status display exception**

For dense list rows, TOA may use a low-emphasis `ListStatusText` pattern — semantic dot + ordinary text — when a filled badge is visually too loud. This is **not** the official PRIZM Badge component. It must be documented as TOA project UI and must use semantic tokens only:

| Status | List dot token | Text rule |
| --- | --- | --- |
| Draft | `bg-bg-muted` | `text-fg`, ordinary body text |
| Active | `bg-success` | `text-fg`, ordinary body text |
| Completed | `bg-info` | `text-fg`, ordinary body text |

Use Badge for process states that need clearer status emphasis, such as Application Status or Overall Status.

### L2.2 Create / Review / Preview page

Use for create-programme final review and similar confirmation pages.

- Use dashboard-first summary at top, then expandable disclosure sections.
- Do not show fields that do not exist yet in the workflow state. In create review, do not show `Programme Status` before creation.
- Do not repeat `Programme details` if the top summary already shows identity and metadata.
- Keep `Description` behind an info icon or Sheet when it is long.
- Main disclosure order for programme creation review: `Eligibility Requirements` → `Intake Windows` → `Programme Timeline`.
- Use accessible disclosure pattern until PRIZM Accordion ships.
- Long visualisations, such as timeline, stay behind expandable sections unless they are the primary review task.

### L2.3 Operational detail page

Use for existing object detail pages such as programme detail, project detail, request detail.

- Hierarchy: breadcrumb → H1 object name + primary status → actions → summary dashboard when useful → metadata summary → task sections.
- Status is real data and should be visible in the header.
- Use Badge / TOA `StatusBadge` for lifecycle states. If using `StatusBadge`, document it as a wrapper around PRIZM Badge.
- Destructive and lifecycle-changing actions must remain separate from status display.
- Avoid nested cards for ordinary field groups; prefer grid sections, dividers, or disclosures.
- Empty related-record sections use Empty State when they are primary content regions.
- Existing-object detail pages may use a compact dashboard when the object has important child relationships, for example intakes, assigned projects, shared projects, and placements. Dashboard metrics must summarize the page model; they must not duplicate a table row-by-row.

### L2.3.1 Operational detail typography

Use this table for Level 3 detail pages, including `programme-detail.tsx`.

| Detail role | Preferred style | Rule |
| --- | --- | --- |
| Page title | `text-headline-lg text-fg` | Use once for the object name. Place the primary lifecycle badge beside it. |
| Header status | `StatusBadge` / `Badge` | Use semantic status tokens and visible text. Do not repeat the same status in another high-emphasis location. |
| Dashboard metric value | `text-headline-md text-fg` or approved metric token | Use for compact object summary values only. |
| Dashboard metric label | `text-caption text-fg-muted` | Keep labels low-emphasis. |
| Card title | `text-headline-md` for major cards, `text-body-sm font-medium` for compact subsections | Do not use heading scale for ordinary row labels. |
| Metadata label | `text-caption text-fg-muted` | Use above key-value fields. |
| Metadata value | `text-body-sm font-medium text-fg` | Use for most detail values. Use `text-body-md` only for primary identity or approved standalone prose. |
| Long generated prose | `text-body-sm leading-relaxed` with `max-w-[70ch-80ch]` | Keep readable measure and WCAG AA contrast. |
| Detail table header | PRIZM `TableHead` default or `text-table-header` | Use only through PRIZM table primitives. |
| Detail table body | PRIZM `TableCell` default `text-sm` | Do not enlarge dense tabular rows to heading/body-md scale. |
| Table-cell badge | `Badge` with `text-caption font-normal` or equivalent | Avoid bold caption badges inside dense tables unless explicitly reviewed. |

Completed or locked detail pages must not dim readable page content with page-wide opacity. Disable the relevant controls directly and keep content text at accessible contrast.

### L2.4 Form / template preview surface

- Preview surfaces are still product UI. They must use PRIZM semantic tokens.
- Do not hard-code preview colours, typography sizes, borders, or shadows.
- Fixed geometry is allowed only for decorative document marks in thumbnails, not for readable copy.
- If an edit action changes the programme-specific form, save it as a programme-specific version; do not mutate the master template silently.

---

## 4. L3 — Page-Specific Rules

L3 is where reviewed implementation choices for specific pages live. These rules can change as product feedback changes.

### L3.1 Programmes list

- Use one list card containing toolbar, status tabs, table, and footer.
- Status tabs: `All`, `Active`, `Draft`, `Completed` via `Tabs`.
- Header-level filters can live inside `SortTh` filter prop when the reviewed pattern asks for table-header filtering.
- Programme Status may use TOA `ListStatusText` dot + ordinary text, but dots must use semantic tokens only.
- Education Level uses neutral / outline Badge because it is categorical metadata.
- Application Status uses semantic Badge because it is a process status.
- Footer uses pagination if paginated; otherwise use count copy.

### L3.2 Requests page

- Requests tables reuse Programmes table header rhythm.
- Sent table headers use `SortTh` for sortable data columns.
- Overall Status uses the same semantic badge treatment as Application Status unless that pattern changes.
- Tooltip must use PRIZM `TooltipProvider`, `Tooltip`, `TooltipTrigger`, `TooltipContent`.
- Tooltip copy should be concise and action-oriented.

### L3.3 Projects page

- Use the same single list-card structure as Programmes.
- Workspace tabs use `Tabs`, `TabsList`, `TabsTrigger`, not local `nav` buttons.
- Toolbar search and Columns control should be shared across all workspace tabs.
- Every table uses `SortTh` for sortable columns as a TOA wrapper.
- Parent rows have no tinted default fill; hover / selected treatment must be token-based.
- Empty tab regions use Empty State and distinguish true empty from filtered-zero.

### L3.4 Review / Preview UX options

- For final production, keep the most compact review layout; do not show all option explanations in the user-facing flow.
- Option A style: dashboard-first compact review + disclosures.
- Option E style: left index + right preview is acceptable for design comparison, but fields must match the same source model.
- If there are multiple intakes, avoid repeating full programme data per intake; show intake windows as repeatable rows or cards.
- Do not show `Need check` copy or non-existing status fields in create review.

### L3.5 Programme detail

Programme detail is a Level 3 operational detail page for an existing programme. It must follow the create-programme Step 2 / Step 3 information model after the programme exists.

**Required IA**

1. Header: programme title + one primary `StatusBadge` + actions.
2. Compact summary dashboard:
   - `intakes`
   - `assigned projects`
   - `shared projects`
   - `placements`
3. Programme Details metadata.
4. Eligibility Requirements.
5. Intake Windows.
6. Programme Timeline when present / in scope.

**Intake and project relationship**

- Projects are assigned to intakes, not merely to the programme as a flat list.
- Use the `ProjectAttachment` join as the preferred source of truth: `intakeId → projectId → placements`.
- The legacy `ProjectEntry.programme` / `ProjectEntry.intakeId` fields are transition fallback only.
- In the detail UI, show assigned projects inside the selected or expanded Intake Window section.
- Use the section label `Assigned Projects`, not `Confirmed Projects`, when the table is scoped to the selected intake.
- If a project appears in multiple intake attachment rows, mark it as `Shared project`; otherwise mark it as `Single intake`.
- Project counts in the dashboard must be unique project counts; placement counts must sum attachment placements.

**Card and typography**

- Main sections use PRIZM Card root: `rounded-lg border border-border bg-surface text-fg shadow-sm`.
- Do not place a second Card inside the Intake Windows card just to frame Assigned Projects. Use a divider and subsection heading.
- Dashboard metric cards may be compact Cards; metric labels stay `text-caption text-fg-muted`.
- Detail metadata values use `text-body-sm font-medium`; generated eligibility text uses `text-body-sm leading-relaxed`; project tables use PRIZM Table body sizing.
- Programme detail `Application Form` preview should use the same read-only modal preview pattern as programme creation/editing, not a separate interactive submission drawer.

---

## 5. Official vs TOA Extension Registry

| Name | Layer | Rule |
| --- | --- | --- |
| `Button`, `Input`, `Select`, `Checkbox`, `Table`, `Badge`, `Tabs`, `Pagination`, `Empty State`, `Sheet`, `Tooltip` | L1 official PRIZM | Use directly from `components/ui`. |
| `SortTh` | L2 TOA wrapper | Allowed for sortable/filterable table headers because PRIZM Table does not ship sorting. Must not be described as PRIZM official. |
| `StatusBadge`, `AppStatusBadge` | L2 TOA wrapper | Allowed only if implemented on top of PRIZM Badge variants and semantic tokens. |
| `ListStatusText` / dot + text | L2 TOA extension | Allowed for dense list rows only. Use semantic tokens. Do not use raw hex. |
| `text-metric`, `text-table-header`, `text-headline-lg` project tokens | L2 typography mapping | Allowed when mapped to PRIZM Heading/Text roles. Do not present as official PRIZM typography primitive. |
| `ToaDateField` / `ProjectDateField` | L2 temporary wrapper | Allowed while Date Picker is planned. Do not name it `components/ui/date-picker.tsx`. |

---

## 6. Patch Map for `prizm4-page-rules(3).md`

### Replace

```md
- Date controls must use `components/ui/date-picker.tsx`; this component must stay free of MUI-specific DOM/classes.
```

With:

```md
- Date Picker is a PRIZM planned component, not a shipped primitive. Do not require `components/ui/date-picker.tsx` as an official PRIZM component. Until PRIZM ships Date Picker, use a TOA-specific wrapper composed from `Field`, `Input`, `Popover`, and `Calendar`, or a validated simple input where a calendar panel is unnecessary. The wrapper must be clearly named as project-owned, such as `components/toa/toa-date-field.tsx`, and must stay free of MUI-specific DOM/classes.
```

### Replace status dot colours

```md
- `Active`: success dot, `#00C950`.
- `Completed`: info dot, `#00A6F4`.
```

With:

```md
- `Active`: success dot, `bg-success`.
- `Completed`: info dot, `bg-info`.
```

### Add after Component Rules heading

```md
### Official PRIZM vs TOA project wrappers

Components in `components/ui` should match shipped PRIZM primitives unless the MD explicitly marks them as TOA-owned wrappers. `SortTh`, `StatusBadge`, `AppStatusBadge`, list status dot patterns, and temporary date-field wrappers are TOA project conventions, not official PRIZM exports. They must use PRIZM semantic tokens and stable primitives internally.
```

### Add Tooltip rule

```md
- Tooltips must use `components/ui/tooltip.tsx` (`TooltipProvider`, `Tooltip`, `TooltipTrigger`, `TooltipContent`). Do not hand-roll tooltip positioning, dark tooltip blocks, or page-local hover-only labels.
```

### Clarify Tabs rule

```md
- Tabs must use `components/ui/tabs.tsx`. A page may place `TabsList` inside a border-bottom toolbar wrapper for TOA list-card rhythm, but the trigger styling and selected state must come from the PRIZM Tabs primitive, not local `nav` buttons.
```

### Clarify Table hover rule

```md
- PRIZM Table provides the baseline table primitive. If TOA keeps `hover:bg-bg-subtle/50` for Programmes / Requests / Projects, document it as a TOA list-page override. Do not describe this as the PRIZM Table default.
```

---

## 7. Codex / AI Execution Checklist

Before changing an L1 / L2 / L3 page, Codex should answer these checks:

1. **Layer check** — Is this official PRIZM, TOA wrapper, or page-specific rule?
2. **Component check** — Does PRIZM already ship a stable primitive? If yes, use it.
3. **Planned component check** — Is the needed component planned? If yes, use documented TOA fallback. Do not fabricate official source files.
4. **Token check** — Search for raw colours and arbitrary visual styling: `#[0-9a-fA-F]`, `text-blue`, `bg-slate`, `style={`.
5. **A11y check** — Verify labels, focus state, keyboard access, and visible status text.
6. **Page pattern check** — Does the page follow the right L2 pattern: List, Review / Preview, Operational Detail, or Form Preview?
7. **Regression check** — Run TypeScript and preview the route.

---

## 8. Recommended MD Structure

Use this order for the updated rules file:

1. `Required Foundation` — L1 runtime, tokens, theme, AI source-of-truth.
2. `Unpublished PRIZM Components` — planned components and TOA fallbacks.
3. `Official Components vs TOA Wrappers` — registry of wrappers.
4. `Component Rules` — stable PRIZM primitives and composition rules.
5. `L2 Page Pattern Rules` — list, review, operational detail, preview.
6. `L3 Page Rules` — Programmes, Requests, Projects, and page-specific decisions.
7. `Visual Rules` — radius, control height, typography mapping.
8. `Review Checklist` — mechanical checks and route verification.

---

## 9. Final Working Rule

**Use PRIZM first. Use TOA wrappers only when PRIZM does not ship the behaviour or when a reviewed TOA UX decision requires a lighter pattern. Always label wrappers as project-owned, and never let page-specific decisions overwrite L1 PRIZM rules.**
