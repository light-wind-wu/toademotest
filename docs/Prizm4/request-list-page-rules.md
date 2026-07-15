# Request List Page PRIZM 4 Rules

Use this document when building or reviewing `views/requests.tsx`, especially the Project Requests list card and the Draft / Open / Closed request tabs.

## Scope

- Page: `/requests`
- View file: `views/requests.tsx`
- Product zone: PRIZM 4 Enterprise, light mode
- Primary pattern: operational list page with grouped parent rows, optional expanded sub-rows, toolbar controls, pagination, and row action menus

## Foundation

- Use semantic PRIZM tokens only: `bg-surface`, `bg-bg`, `bg-bg-subtle`, `bg-bg-muted`, `border-border`, `text-fg`, `text-fg-muted`, `text-fg-subtle`, `bg-accent`, `text-accent-fg`, and status tokens.
- Do not use raw palette classes such as `text-blue-*`, `bg-slate-*`, `border-gray-*`, inline hex colors, or external URLs.
- Use PRIZM table primitives from `components/ui/table.tsx` for list tables.
- Use shared TOA wrappers only when they preserve PRIZM contracts, for example `SortTh`, `TableToolbar`, `StatusBadge`, and request status helpers.

## Page Headline

- The page title must be a single `h1` using the page headline scale.
- Required copy: `Project Requests`.
- Recommended class: `text-headline-md text-fg`.
- The headline sits above the list card and should not be repeated inside the table card.
- The primary page CTA, when present, belongs on the right side of the page header and uses the PRIZM Button component.
- Do not add explanatory subtitle copy unless the page has a reviewed need for onboarding context.

## Search And Toolbar

- Search belongs in the shared table toolbar above the tabs.
- The search input should follow the PRIZM input pattern: semantic border/background tokens, compact Enterprise height, visible icon, accessible name, and accent focus ring.
- Placeholder copy should describe the active data scope:
  - Sent/request tabs: `Programme Centre...`
  - Project review tabs: `Search by project, mentor, or programme...`
- Toolbar actions should stay secondary except true page creation actions. `Edit Columns` and `Export` are secondary toolbar controls.
- Column visibility must use the PRIZM checkbox pattern or a project wrapper that matches it.
- Do not put tab-specific search bars inside individual Draft / Open / Closed tab panels.

## Table Title And List Card

- The request list uses one outer list card: `bg-surface rounded-lg border border-border overflow-hidden shadow-sm`.
- Tabs, toolbar, table, empty state, and pagination live inside this single card.
- Do not add a separate table title inside the card when the page headline already names the page.
- If a table title becomes necessary for a future subsection, use compact body/label scale, not another page headline.
- Table headers should use `SortTh` for sortable columns and `TableHead` only for non-sortable/action columns.
- Header text follows PRIZM table header scale: `text-xs font-semibold text-fg-muted`.

## Tabs

- Draft / Open / Closed must use `components/ui/tabs.tsx`.
- Counts may appear as plain text in the tab label, for example `Draft (1)`.
- Counts should not be styled as badges unless the PRIZM tabs component formally supports that treatment.
- Empty states for these tabs do not need a primary CTA. The page-level `Create Project Request` action already exists in the page header.

## Parent Row

Parent rows summarize one request group or draft group. They must use the PRIZM regular table-body treatment:

```tsx
text-body-sm font-normal text-fg
```

Rules:

- Default parent rows should not have a tinted background.
- Hover state: `hover:bg-bg-subtle/50 transition-colors`.
- Expandable rows may use a muted chevron icon, but the chevron must not become the primary visual emphasis.
- Parent row primary cells use `text-fg`, not `text-fg-muted`.
- Parent row values should use normal weight. Avoid `font-medium`, `font-semibold`, and headline-scale text unless a reviewed exception exists.
- Status labels are the exception: render status through the approved status badge/tooltip pattern.

Examples:

- Programme Centre parent value: `text-body-sm font-normal text-fg`
- AD(P&C) parent value: `text-body-sm font-normal text-fg`
- Placements parent value: `text-body-sm font-normal text-fg`
- Request Date / Response Deadline parent value: `text-body-sm font-normal text-fg`

## Sub-Row

Sub-rows show secondary line-level information under an expanded parent row. They must use the PRIZM grey secondary treatment:

```tsx
text-body-sm font-normal text-fg-muted
```

Rules:

- Sub-rows may use `bg-bg hover:bg-bg-subtle/40`.
- Sub-row text is secondary information and should be muted.
- Do not use bold or medium weight in sub-rows.
- Empty spacer cells should remain visually empty.
- Status labels and line-status flags are exceptions. They may use their approved status/badge treatment because they communicate state.

Examples:

- Intern category sub-row: `text-body-sm font-normal text-fg-muted`
- Per-line placements such as `0 / 3`: `text-body-sm font-normal text-fg-muted`

## Empty State

- Empty Draft / Open / Closed tabs should use the PRIZM Empty State contract:
  - centered flex column
  - optional muted icon container
  - title: `text-sm font-semibold text-fg`
  - description: `mt-1 max-w-xs text-sm text-fg-muted`
- These tab empty states should not include a main CTA.
- Keep empty copy short and tab-specific:
  - Draft: `No draft requests`
  - Open: `No open requests`
  - Closed: `No closed requests`
- Keep the empty state inside the list card, replacing the table body for the active empty tab.

## Pagination

- Use `components/ui/pagination.tsx` for page navigation.
- Pagination belongs in the list-card footer, below the table.
- Pair pagination controls with a rows-per-page selector when the list can exceed one page.
- Use semantic muted body text for footer labels: `text-body-sm text-fg-muted`.
- Disable Previous / Next at boundaries with `aria-disabled` and a visible disabled state.
- Reset to page 1 when search, filters, tabs, column scope, or page size changes.
- If the active tab has no rows, show only the empty state and omit pagination.

## Kebab Menu

- Row-level actions use an icon-only kebab trigger with `MoreVertical`.
- The trigger must have an accessible label, for example `aria-label="Request actions"`.
- The trigger should be visually secondary: muted icon color, compact button size, and no filled background by default.
- Stop row click propagation from the action cell so opening the menu does not expand/collapse the parent row.
- Menu content should use the shared `Menu` primitives and semantic tokens.
- Use clear verb-first item labels such as `View details`, `Edit draft`, `Delete draft`, or `Send request`.
- Destructive actions must use the approved danger treatment and confirmation flow.

## Quick Review Checklist

- Page headline is one `h1`: `Project Requests`.
- Toolbar search is above tabs and uses PRIZM input styling.
- The list is one card, not nested cards.
- Table headers use `SortTh` where sortable.
- Parent rows: `text-body-sm font-normal text-fg`.
- Sub-rows: `text-body-sm font-normal text-fg-muted`.
- Status badges/tooltips are the only row text exceptions.
- Draft / Open / Closed empty states have no main CTA.
- Pagination uses PRIZM pagination primitives and is hidden for empty tabs.
- Kebab menus are accessible, muted, and do not trigger row expansion.
