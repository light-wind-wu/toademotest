# PRIZM 4 Page Compliance Rules

Use these rules when building or reviewing TOA pages against PRIZM 4 Enterprise.

## Official PRIZM Source of Truth

Use this hierarchy when PRIZM official guidance, TOA project rules, and client-reviewed page feedback appear to conflict:

1. **Official PRIZM component status is the gate.** Before treating any `components/ui/<slug>.tsx` file as available, confirm the PRIZM registry marks the component as `stable`. Components marked `planned` are roadmap slugs and must not be documented as shipped PRIZM primitives.
2. **PRIZM component conventions remain mandatory.** Components and project wrappers must use semantic tokens, `cn()` class merging where applicable, accessible states, local assets, and no raw Tailwind palette utilities in page/component code.
3. **TOA page patterns are project-layer rules, not official PRIZM templates.** Until PRIZM ships Enterprise templates, TOA patterns such as list cards, review/preview pages, and operational detail layouts should be documented as TOA page patterns that compose PRIZM primitives.
4. **Client-reviewed exceptions are allowed only as TOA wrappers or token mappings.** If a client approves a visual treatment that differs from a PRIZM default, document the reason and implement it through a named TOA wrapper, semantic utility, or token layer. Do not scatter raw colours or page-local custom controls across individual views.

## Required Foundation

- The root document must run in Enterprise light mode: `<html data-zone="enterprise" data-mode="light">`.
- UI fonts must use the local Inter stack from `app/globals.css`; do not add remote font URLs or CDN font loading.
- Use semantic tokens only: `bg-surface`, `bg-bg-subtle`, `text-fg`, `text-fg-muted`, `border-border`, `bg-accent`, `text-accent-fg`, status tokens, and related project tokens.
- Do not use raw Tailwind palette classes such as `text-blue-600`, `bg-slate-50`, `border-red-200`, or inline hex colors.
- Do not use inline visual styles for color, border, radius, spacing, typography, or shadows unless rendering email content that is intentionally isolated from the app UI.
- Do not introduce external URL references in product UI or component examples, including CDN scripts/styles, Google Fonts, remote images, third-party analytics, or external icon imports. Keep fonts, icons, and assets repo-local.
- If a reviewed TOA visual treatment needs an exact colour that PRIZM does not expose as a ready-to-use utility, define it once as a named TOA semantic token or utility class in the token/style layer, then consume only that named utility in page code.

## Component Rules

- Prefer PRIZM/Base UI components in `components/ui` before creating page-local controls.
- Before requiring a PRIZM component in this MD, verify that the official PRIZM registry marks the component slug as `stable`. Do not require components that are only `planned`.
- TOA-specific components such as `SortTh`, `StatusBadge`, `AppStatusBadge`, `TableToolbar`, status-dot helpers, and page-level review/layout wrappers are TOA project wrappers. They may compose PRIZM primitives, but they must not be described as official PRIZM primitives. These wrappers must still follow PRIZM conventions: semantic tokens, accessible states, local assets, and no raw colour values in page code.
- Search inputs must use the PRIZM input pattern. Use the shared input styling/classes from the project component system, include a visible label or accessible name, keep focus treatment on the accent ring, and avoid page-local input chrome that diverges from `components/ui/input` guidance.
- Select controls must use `components/ui/select.tsx`, not native `<select>` styling in page code.
- When a select dropdown style issue is fixed and confirmed in preview, immediately update this MD rule document with the confirmed pattern. Do not leave the fix only in page code. Future select changes must reuse the documented `components/ui/select.tsx` pattern instead of reintroducing native `<select>`, inline `backgroundImage` overrides, page-local chevrons, or ad hoc dropdown styling.
- Date controls must not assume an official PRIZM Date Picker exists until the PRIZM registry marks Date Picker as `stable`. Until then, use a clearly named TOA temporary date-control wrapper composed from available stable primitives such as `Field`, `Label`, `Input`, `Button`, `Popover`, and `Calendar` if those primitives exist in the project. The wrapper must stay free of MUI-specific DOM/classes and must be documented as a TOA temporary wrapper, not an official PRIZM primitive.
- Buttons must use `components/ui/button.tsx`, preserving both color classes and typography classes.
- Data tables must use the PRIZM table primitives from `components/ui/table.tsx` (`Table`, `TableHeader`, `TableBody`, `TableRow`, `TableHead`, `TableCell`) instead of page-local native table markup. Do not hand-style `<table>`, `<thead>`, `<tbody>`, `<tr>`, `<th>`, or `<td>` in page code for application lists.
- Data table rows must follow the PRIZM table interaction pattern: consistent row height, clear hover/selected state, semantic row/cell structure, and no oversized custom highlight overlays. Sort affordances should be in table headers only and should reset cleanly when sorting is cleared.
- List table headers across TOA should follow the confirmed Programmes table pattern. Use `components/ui/sort-th.tsx` for sortable headers, including headers with filter affordances via its `filter` prop. Avoid page-local `TableHead` + custom button/filter compositions when the Programmes `SortTh` pattern can represent the column.
- List table body rows across TOA should match the Programmes table default row treatment: no tinted default background for ordinary parent rows, `hover:bg-bg-subtle/50 transition-colors` for hover, semantic selected state only when a row is actively selected, and `bg-surface hover:bg-bg-subtle/40` for expanded child/detail rows.
- Table row selection must use `components/ui/checkbox.tsx`, not native `<input type="checkbox">` with `accent-*` styling.
- Column visibility panels must use the PRIZM checkbox pattern. Checkbox options should use the shared checkbox component or the same visual contract: square control, selected checkmark, semantic token colors, keyboard-accessible toggling, and no ad hoc pseudo-checkboxes.
- Forms should be composed from reusable field/input/select components where possible; page-local form chrome should be limited to layout.
- Cards, alerts, sheets, menus, tabs, tables, and badges should map to existing PRIZM-style `components/ui` primitives before custom Tailwind structures are introduced.
- Tabs must follow the PRIZM tabs pattern. Use tabs for switching filtered views, keep selected/hover/focus states token-based, and avoid badge-style notification pills in tab labels unless the PRIZM tabs implementation explicitly supports that treatment. Counts may be shown as plain count text or subtle count indicators.
- Pagination must use the PRIZM pagination component when page navigation exists. Use `components/ui/pagination.tsx` (`Pagination`, `PaginationContent`, `PaginationItem`, `PaginationPrevious`, `PaginationLink`, `PaginationNext`) for list-card footers, and pair the controls with range copy such as `Showing 1-10 of 24 programmes`. If the table is not paginated, do not show pagination controls; use explicit count copy such as `Showing 4 of 4 programmes` instead.
- Badges are for status labels only. Programme/application/system statuses may use badges, but badges must use PRIZM badge sizing, semantic variants, and sentence/title-case copy where the product copy allows it. Do not use strong badge styling for cross-tab action counts or notification counts inside tables.
- Badge typography inside data tables must not overpower table body text. Table cells use PRIZM table body sizing (`text-sm` in `components/ui/table.tsx`), so inline badges inside table cells should use regular/medium body-scale typography, not bold caption styling. Avoid `font-semibold`, `font-bold`, or `text-caption-bold` for table-cell badges unless the badge is the primary row state and explicitly reviewed.
- Empty data regions must use the PRIZM Empty State pattern instead of plain centered text rows. Compose from `components/ui/empty-state.tsx` or the same contract: centered flex column, optional muted icon container, `text-sm font-semibold text-fg` title, `mt-1 max-w-xs text-sm text-fg-muted` description, and optional CTA below the text. Use this for true empty datasets and filtered-zero results in list/table surfaces. Keep copy short, specific, and action-oriented; include a primary action only when the user can resolve the empty state from that page.
- Form/template preview surfaces are still product UI, even when they visually echo a paper form. Use semantic PRIZM tokens for preview chrome (`bg-surface`, `bg-bg-muted`, `border-border`, `border-border-strong`, `bg-accent`, `text-accent`, `text-accent-fg`, `text-fg-muted`) and typography tokens (`text-caption`, `text-body-sm`, `text-headline-sm`). Do not hard-code hex colours or arbitrary text sizes in preview modals or preview thumbnail captions. Tiny decorative document marks inside a thumbnail may use fixed geometry, but not fixed text sizes for readable copy.


## Planned / Unreleased PRIZM Components

Use this section when a needed interaction maps to a PRIZM roadmap component that is not yet shipped as a stable primitive.

| Component / pattern | PRIZM status assumption | TOA rule before official release |
| --- | --- | --- |
| Date Picker | Treat as unavailable unless registry says `stable` | Use a TOA temporary date-control wrapper composed from stable Field/Input/Button/Popover/Calendar primitives where available. Do not require `components/ui/date-picker.tsx` until it is stable. |
| Accordion | Planned / not a shared primitive yet | Use an accessible disclosure pattern: `button`, `aria-expanded`, semantic tokens, chevron, keyboard support. Do not create a generic `components/ui/accordion.tsx` and call it PRIZM. |
| Toggle Group | Planned / not a shared primitive yet | Use PRIZM Tabs for single-view switching, Checkbox for multi-select, or Button groups only when the interaction has been reviewed. |
| Number Input | Planned / not a shared primitive yet | Use Field + Input with validation, helper text, and accessible error states. Do not invent spinner controls unless reviewed. |
| Tree | Planned / not a shared primitive yet | Use Table, grouped lists, or disclosure rows depending on density. Keep DOM reading order aligned with visual order. |
| Scroll Area | Planned / not a shared primitive yet | Prefer native overflow with restrained scroll containers. Do not create custom scrollbars unless required and reviewed. |

When any planned component becomes stable, update this MD and replace the TOA temporary wrapper rule with the official PRIZM component path and usage contract.

## Review Detail Page Rules

Use this section for programme creation review pages and other final confirmation/detail views. These pages are not list tables: they should help the user scan a completed setup, expand details when needed, and confirm with confidence.

- Basis: the PRIZM components index groups typography into stable `Heading`, `Text`, and `Prose` primitives, with `Badge`, `Table`, `Card`, `Field`, `Tabs`, and `Sheet` as stable supporting components. In this codebase, those typography contracts are implemented by `components/ui/heading.tsx`, `components/ui/text.tsx`, `components/ui/prose.tsx`, `tailwind.config.ts`, and the relevant UI primitives. `Accordion` is listed as planned, so do not invent a separate shared accordion primitive until it exists; use an accessible disclosure pattern with PRIZM tokens.
- Review pages should use a dashboard-first detail pattern: a concise summary at the top, followed by collapsible detail sections. This matches the `Option A - Dashboard-first accordion` direction from the programme preview exploration.
- When the top summary already displays programme identity and metadata, do not repeat a separate `Programme details` disclosure section. Programme `Description` should stay attached to the programme title as a compact info icon that opens a right-side Sheet, matching the `View criteria detail` interaction pattern. Do not expand long description text inline inside the review card. For the create-programme Review step, the main disclosure order is `Eligibility Requirements`, `Intake Windows`, then `Programme Timeline`.
- If multiple review layouts are shown for design comparison, switch them with PRIZM tabs. The `Option E - Left index + right preview` layout must use the same main review fields as the accordion layout: `Eligibility Requirements`, intake-specific `Intake Windows`, and `Programme Timeline`. Keep `Description` as the top-title Sheet trigger, and do not introduce `Programme Status` or a separate `Programme details` section in this layout.
- The top-level review surface should use PRIZM card/surface treatment: `bg-surface`, `border-border`, `rounded-lg`, and restrained shadow only where the existing card component applies it. Do not use a large tinted block as the default review background.
- Preserve business field labels exactly as originally defined when those fields are present. Visual restructuring must not rename labels such as `Programme Title`, `Education Level`, `Programme Status`, `Application Form`, `Intake Windows`, `Description`, `Eligibility Requirements`, or `Programme Timeline`.
- Do not show fields that do not exist yet in the current workflow state. In the create-programme Review step, `Programme Status` has not been created yet, so it should be omitted. It may appear when reviewing or editing an existing programme where status is an existing field.
- Summary metrics may use `text-metric` for numbers only, with `text-caption` or `text-label-sm` labels. Do not use `text-metric` for ordinary field values.
- Section rows in the detail accordion should be `button` elements with `aria-expanded`, a clear text label, optional helper text, optional subtle count chip, and a chevron. Use semantic tokens only: `text-fg`, `text-fg-muted`, `bg-bg-subtle`, `bg-surface`, `border-border`, and status tokens when the chip represents a real status.
- Detail sections should default to compact, scan-friendly typography. Generated eligibility prose and other explanatory paragraphs inside Review detail panels should use `text-body-sm`, `leading-relaxed`, and a readable measure around 70-80 characters. Reserve `text-body-md` for the top programme identity or standalone prose blocks with explicit review approval.
- Place heavy or long visualizations, including `Programme Timeline`, behind an expandable section unless the user is specifically reviewing that visualization as the primary task.

### Review Detail Typography

| Use case | PRIZM component / class | Size / weight source | Rule |
| --- | --- | --- | --- |
| Page title outside the card | `Heading` (`as="h1"`) or `text-headline-lg` | `Heading` maps to PRIZM heading sizes; project token 30/36, 600 | Use for the page-level heading only, such as `Create Programme` or a standalone review page title. |
| Review card title or major section title | `Heading` (`as="h2"`) or `text-headline-sm` | `Heading` / project token 20/28, 600 | Use for a true card title or major section. Avoid using heading scale for ordinary row labels. |
| Accordion row title | `Text size="sm" weight="medium"` or `text-body-sm font-medium` | `Text` primitive `sm`; project token 14/20 | Use for section labels such as `Eligibility Requirements` or `Intake Windows`. Keep it body-scale, not headline-scale. |
| Accordion row helper text | `Text size="xs" variant="muted"` or `text-caption text-fg-muted` | `Text` primitive `xs`; project token 12/16, 400 | Use for secondary scan copy such as `Shown to applicants` or application-window hints. |
| Field label in a key-value detail block | `Text size="xs" variant="muted"` or `text-caption text-fg-muted` | `Text` primitive `xs`; project token 12/16, 400 | Use for labels above values, for example `Programme Title`. This matches the low-emphasis metadata role in review details. |
| Field value in a key-value detail block | `Text size="sm" weight="medium"` or `text-body-sm font-medium text-fg` | `Text` primitive `sm`; project token 14/20 | Use for most review values. Use `text-body-md font-semibold` only when the value is the primary page identity, such as the programme name at the top summary. |
| Long description or generated prose | `Text size="sm"` for compact UI, `Prose` for long-form content | `Text` primitive `sm`; `Prose` uses base text with long-form spacing | Use compact `Text size="sm"` in Review panels. Use `Prose` only for true long-form content blocks, not dense operational metadata. |
| Count chip / metadata chip | `text-caption font-medium` | `tailwind.config.ts`: caption 12/16; badge rules require table-safe typography | Use subtle chips for counts such as `2 projects`. Do not use `text-caption-bold` unless the chip is a reviewed primary status. |
| Table header inside a detail page | `TableHead` default or `text-table-header` | `components/ui/table.tsx`: `text-xs font-semibold`; project token 12/16, 600 | If a real table appears inside a detail section, use PRIZM table primitives and keep header text on the table-header scale. |
| Table body inside a detail page | `TableCell` default `text-sm` | `components/ui/table.tsx`: `text-sm text-fg`; Tailwind `text-sm` maps to body-scale table text | Use for tabular rows such as assigned project lists. Do not enlarge table body values to `text-body-md` unless the table is no longer acting as dense tabular data. |

## Operational Detail Page Rules

Use this section for existing-object detail pages such as `views/programme-detail.tsx`, where the entity already exists and has lifecycle state, related records, and management actions. These pages differ from create-review pages: status is real data and should be visible, but the page must still remain scannable and WCAG AA compliant.

- Page structure should follow a stable detail-page hierarchy: breadcrumb, page header, primary metadata summary, then task-specific sections such as intakes, eligibility, applications, projects, or timeline. Avoid repeating the same status in multiple high-emphasis locations unless one instance is the page-header status and the other is a low-emphasis metadata field.
- The page title should be the object name only, using `text-headline-lg text-fg`. Do not prepend labels such as `Programme:` in the H1. Keep the title and primary lifecycle status on the same visual row when space allows.
- The page-header status is the primary status instance. Use `StatusBadge`, `AppStatusBadge`, or the shared PRIZM badge component for real lifecycle states such as `Draft`, `Active`, `Completed`, `Open`, or `Closed`. Status badges must use semantic status tokens, sentence/title-case labels, and body/caption-scale typography.
- In metadata cards, status can be repeated only when it helps comparison with other fields. If repeated, label it with `text-caption text-fg-muted` and render the value with the same badge treatment, not a larger heading. Do not show status as both a coloured badge and a coloured action label in the same compact cluster.
- Use badges only for statuses or reviewed categorical metadata. Use neutral outline badges for non-status metadata such as `Education Level`; use filled/semantic badges only when colour communicates a real state. Never rely on colour alone: the text label must communicate the state without the colour.
- Destructive or lifecycle-changing actions (`Activate`, `Mark Completed`, `Delete`) must remain separate from status display. Use PRIZM `Button` variants and semantic icon/text tokens, with visible text labels and confirmation dialogs for destructive or irreversible actions.
- Completed or locked detail pages should not reduce the opacity of the entire content below WCAG AA readability. Avoid page-wide `opacity-60` on readable text. If a section is disabled, disable controls directly and use muted helper text while keeping primary text at `text-fg` or `text-fg-muted` contrast.
- Detail cards should use `bg-surface`, `border-border`, `rounded-lg`, and the shared card spacing rhythm. Avoid nested cards for ordinary field groups; use grid sections, dividers, or accordions instead.
- Long descriptions, eligibility prose, and explanatory copy should use `text-body-sm leading-relaxed text-fg` with a readable measure around 70-80 characters. Do not use `text-body-md` for dense paragraphs unless the user has explicitly reviewed it as a reading-focused block.
- Real tables inside detail pages must use PRIZM table primitives. Header text stays `text-table-header` / `text-xs font-semibold`; body cells stay `text-sm`; row-level status badges use table-safe badge typography, not bold heading weight.
- Empty related-record sections inside detail pages should use the PRIZM Empty State pattern when the section is a primary content region. For small inline gaps, use concise muted copy such as `No assigned projects yet.` with `text-body-sm text-fg-muted`.

### Operational Detail Typography

| Use case | PRIZM component / class | Rule |
| --- | --- | --- |
| Breadcrumb | `Breadcrumb` plus `Text size="sm"` / `text-sm` muted ancestors | Use for location context only. Breadcrumb text must not compete with the page title. |
| Page title / object name | `Heading as="h1"` or `text-headline-lg text-fg` | One per page. Use the programme/project/request name as the H1. |
| Header status badge | Shared `Badge` / `StatusBadge`, `text-caption` or `Text size="sm"` scale | Place next to the H1. Use semantic status tokens and a visible text label. |
| Card title | `Heading as="h2"` or `text-headline-sm`; compact cards may use `Text size="sm" weight="medium"` | Use heading scale for major cards; use body/label scale for compact sections. |
| Field label | `Text size="xs" variant="muted"` or `text-caption text-fg-muted` | Labels identify metadata fields and should stay low emphasis. |
| Field value | `Text size="sm" weight="medium"` or `text-body-sm font-medium text-fg` | Default for metadata values. Use `font-mono` only for IDs. |
| Primary numeric value | `text-metric text-fg` | Use only in summary metrics, never in ordinary field values. |
| Paragraph / description | `Text size="sm"` with `leading-relaxed`; `Prose` only for long-form content | Keep line length to about 70-80 characters and avoid full-width paragraph spans. |
| Helper / timestamp text | `Text size="xs" variant="muted"` or `text-caption text-fg-muted` | Use for update dates, secondary counts, and explanatory hints. |
| Table header | `text-table-header` or `TableHead` default | Use only through PRIZM table primitives. |
| Table body | `text-sm text-fg` or `TableCell` default | Keep row values dense and readable; do not promote table text to heading scale. |

### WCAG AA Detail Page Requirements

- Normal text below 18 pt must meet at least 4.5:1 contrast against its background. Large text at 18 pt regular / 14 pt bold or above must meet at least 3:1. Use semantic text/background tokens that satisfy these ratios in Enterprise light mode.
- Status colours must not be the only carrier of meaning. Every badge, dot, alert, and action state needs visible text, an accessible name, or both.
- Focusable elements must have a visible focus state using the accent focus ring or equivalent token. Icon-only controls need an `aria-label`.
- Body copy should use at least the PRIZM body scale (`text-body-sm` / `text-sm`) and adequate line height (`leading-relaxed` for paragraphs). Avoid `text-caption` for paragraph-length content.
- Keep paragraph line length within a readable measure, roughly 70-80 characters. If a full-width card contains prose, constrain the prose block with `max-w-[78ch]` or an equivalent layout.
- Do not apply opacity to containers that include readable text unless the resulting computed contrast still meets WCAG AA. Prefer disabling controls and using semantic disabled states instead.
- Interactive targets should be at least 32px high in compact enterprise UI, and preferably 40px+ for primary actions. Do not make status badges look clickable unless they are interactive.
- Error, warning, and destructive states must pair colour with text and iconography where useful. Use `text-danger`, `text-warning`, and related background tokens only when contrast has been checked against the chosen surface.
- The reading order in DOM should match visual order: breadcrumb, H1/status, actions, then content sections. Do not move core page meaning into visually positioned elements that screen readers encounter out of context.

## Programmes List Rules

The IO Admin Programmes list has received browser review comments mapping its visible regions to PRIZM 4 references. Apply these interpretations when editing `views/programmes.tsx` and related shared components:

- Footer count / pagination: when Programmes rows are paginated, replace the plain count-only footer with the PRIZM pagination pattern from `components/ui/pagination.tsx`. Show the visible range and filtered total (`Showing 1-10 of 24 programmes`) on the left and the pagination controls on the right. Use disabled Previous/Next states at the boundaries and reset to page 1 when search, tabs, header filters, or sort order changes. If the table is not paginated, a plain count-only footer remains acceptable.
- Programme status tabs: the `All`, `Active`, `Draft`, and `Completed` controls should be implemented with the PRIZM tabs pattern, not a bespoke segmented control. Keep counts subtle and avoid status-badge styling in tab headers.
- Programmes table filtering: do not keep separate top-toolbar filters for `Programme status`, `Education level`, and `Application status` when the review asks to return filtering to the table header. In that mode, remove those three toolbar filters and expose the filter affordance from the corresponding table headers (`Programme Status`, `Education Level`, `Application Status`) alongside the sort affordance.
- Columns menu: the column visibility popover must render options with PRIZM checkbox behavior and visual styling. The collapsed `Columns` trigger can remain a button, but the expanded list should not use custom checkmark boxes that diverge from the checkbox component.
- Keyword search: the Programmes search field should align with the PRIZM input component. Preserve accessible labelling, compact Enterprise field height, semantic border/background tokens, and accent focus ring.
- Programme Status column: use the client-reviewed low-emphasis treatment: a small status dot plus ordinary text, not a filled badge. This is a TOA page-pattern exception for the Programmes list only.
  - `Draft`: subtle dot using `bg-bg-muted`.
  - `Active`: success dot using a named TOA semantic utility such as `toa-programme-status-active-dot`.
  - `Completed`: info dot using a named TOA semantic utility such as `toa-programme-status-completed-dot`.
  - If the client-approved visual requires exact green/cyan values, define those values once in the TOA token/style layer, for example in `styles/tokens/toa-status.css`, and expose only named semantic utilities to page code. Do not repeat raw hex values in `views/programmes.tsx`, row renderers, or inline styles.
  - Status label text must remain ordinary body text (`text-fg`), not status-colored text.
  - Do not use PRIZM `Badge` for Programme Status in the Programmes list unless the client-reviewed dot pattern changes. Existing-object detail pages may still use `StatusBadge`, `AppStatusBadge`, or PRIZM `Badge` for primary lifecycle status where the status is part of the page header.
- Education Level column: use a neutral / outline badge treatment because education level is categorical metadata, not a system state. Avoid colored fills where color does not carry an actionable or status meaning.
- Application Status column: keep PRIZM colored badge treatment for application states such as `Open` and `Closed`, because these are real process statuses. Use sentence/title-case text and avoid all-caps if the shared badge component allows product-case labels.
- Programmes table badges: `Education Level` and `Application Status` badges should not appear bold in the table. Match PRIZM table body scale and use normal/medium weight so labels such as `University`, `Post JC/Post Poly`, and `Closed` read as metadata/status chips rather than high-emphasis row titles.
- Programmes table typography: desktop table body content should stay on the PRIZM table body scale (`text-sm`). Use `text-sm font-medium` only for fields that need light emphasis, such as `Programme Title`, `Programme ID`, and the `Applications` count. Do not use `text-body-md` or `font-semibold` for table body values.
- Table body/header: the programmes grid should use PRIZM table primitives and table spacing consistently across header, body, hover state, and selected state. Body cells should align to the table body size (`text-sm`) and avoid oversized or heavier nested text except where explicitly reviewed. Avoid page-local table markup or one-off row highlight styles when PRIZM table states are available.
- Empty Programmes states should use the PRIZM Empty State component inside the table/list card. For no programmes, use a title such as `No programmes yet`, a short description, and a `Create Programme` CTA. For filtered-zero results, use a title such as `No programmes match your filters`, supporting copy that suggests clearing filters, and avoid adding a creation CTA unless the user is in a true no-data state.

## Requests Page Rules

Apply these confirmed interpretations when editing `views/requests.tsx`:

- Requests list table headers should follow the Programmes desktop table header implementation: use `SortTh` for sortable columns, keep the same sort icon / hover / active states, and pass filter controls through the `filter` prop instead of hand-building a local header layout.
- Requests parent rows should use the same default row colour as the Programmes table: no `bg-bg-subtle/*` default fill. Use `hover:bg-bg-subtle/50 transition-colors` for hover and reserve tinted backgrounds for selected rows or expanded child rows.
- Requests Sent table headers should also use `SortTh`, not plain `TableHead`, so `Recipient`, `Education Levels`, `Placements Requested`, `Request Date`, `Deadline`, and `Overall Status` share the Programmes list header rhythm.
- Requests Sent `Overall Status` should use the same visual treatment as the Programmes `Application Status` badge: `.badge` sizing with semantic status background/text tokens and table-safe typography such as `text-caption font-normal`. Do not use an outlined/bordered chip for this column unless the Application Status pattern changes too.
- Status tooltips in the Requests table should follow the PRIZM tooltip surface pattern: `bg-surface-elevated`, `border-border`, `rounded-md`, `text-xs`, normal weight, left-aligned copy, and a modest shadow. Avoid dark, centered, bold tooltip blocks for table status explanations.
- Requests status tooltip copy should be concise and action-oriented. Prefer short phrases such as `Request sent. Awaiting project submission.` over multi-line sentence blocks.
- Empty Requests states should use the PRIZM Empty State component for both Sent and available/project-request lists. Use page-specific copy such as `No requests sent` with a short next step, or `No projects match your filters` for filtered-zero states. Keep the empty state inside the active table/list card and avoid plain `<TableCell>` text-only placeholders.

## Projects Page Rules

Apply these confirmed interpretations when editing `views/projects.tsx`:

- Projects workspace tabs must follow the Programmes tab implementation: use `components/ui/tabs.tsx` (`Tabs`, `TabsList`, `TabsTrigger`) inside the same `border-b border-border px-3 py-3 overflow-x-auto` wrapper. Do not use page-local `nav` + custom `button` tab styling.
- Projects should use the same single list-card structure as Programmes: one outer `bg-surface` table card containing `TableToolbar`, tabs, the active table, and the footer. Do not wrap each project tab in its own nested `section` card or add tab-local title/description headers inside the card.
- Projects Drafts and Pending Review tabs should share the top `TableToolbar` search behavior rather than having search only on Project Pool / Allocated / Archived. Keep the toolbar above tabs, matching Programmes.
- Projects workspace tabs should all preserve the Programmes-style `Columns` toolbar control. Configure the column definitions per tab so Drafts, Pending Review, Project Pool, Allocated Projects, and Archived expose only the columns that actually exist in that table.
- All Projects workspace lists should follow the Programmes desktop table header implementation. Draft Projects, Pending Review, Project Pool, Allocated Projects, and Archived tables should use `SortTh` for sortable data columns instead of plain `TableHead` labels.
- Do not add header filter controls to the Projects Pending Review `Status` column unless a reviewed filter workflow is added. The confirmed requirement is sortable headers only for that table.
- Projects table parent rows should use the Programmes default row treatment: no tinted default fill, `hover:bg-bg-subtle/50 transition-colors`, and selected or recently-approved tint only when representing a real row state.
- Projects table body typography should match the Programmes table scale. Project titles should use `text-sm font-medium` with the standard hover accent. Numeric emphasis such as placements, reservations, and total applications should use medium weight rather than `font-semibold`.
- Projects table badges, including Draft source and Pending Review, should use PRIZM badge sizing with table-safe typography such as `text-caption font-normal`.
- Empty Projects states should use the PRIZM Empty State component in each tab/table region. Distinguish true empty data from filtered-zero results: true empty tabs may include an action such as creating/importing a project when available, while filtered-zero states should suggest adjusting search, filters, or tab scope. Do not use page-local title/description blocks that visually compete with the table card.

## Visual Rules

- Enterprise operational pages should use restrained surfaces: `rounded-md` or `rounded-lg` by default.
- TOA is an Enterprise product surface. Do not use C3-only liquid glass treatments such as `surface-glass-chrome`, `surface-glass-panel`, or `variant="glass"` on `Sheet`, `Popover`, `Tooltip`, `HoverCard`, `Menu`, or `ContextMenu` unless the product surface is explicitly moved to C3.
- TOA list-card, review, preview, and operational detail layouts are TOA page patterns, not official PRIZM Enterprise templates. Document them as project patterns that compose stable PRIZM primitives.
- Avoid `rounded-xl` unless framing a preview, modal-like surface, or an existing component requires it.
- Buttons, inputs, and selects should align to PRIZM control sizing: compact fields around `h-9`; major sticky CTA buttons may use `h-11`.
- Focus states must use the accent focus ring or outline token.
- Text scale should follow PRIZM Typography primitives: use `Heading`, `Text`, or `Prose` when practical; otherwise use the matching project typography tokens (`text-body-sm`, `text-label-md`, `text-headline-md`) rather than arbitrary sizes.
- Do not combine color and typography in a way that lets `tailwind-merge` remove required color classes. Validate CTA text color in the browser when button variants change.

## Review Checklist

- Inspect computed styles in browser for font family, font size, color, background, radius, and control height.
- Check primary CTA contrast: `bg-accent` must pair with `text-accent-fg`.
- Search target page files for raw colors and arbitrary visual classes before finishing:
  - `#[0-9a-fA-F]`
  - `text-blue|bg-blue|border-blue`
  - `text-slate|bg-slate|border-slate`
  - `style={{`
  - `surface-glass|variant="glass"`
  - `https://|http://|fonts.googleapis|fonts.gstatic|cdn`
- For client-reviewed status colours, verify the exact colour appears only in the TOA token/style layer and that page code uses named semantic utilities such as `toa-programme-status-active-dot`.
- Run `pnpm exec tsc --noEmit`.
- Verify the route returns `200 OK` or visually loads in the browser.
