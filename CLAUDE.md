# CLAUDE.md — DSTA Talent Acquisition Portal

## Project Overview

A Next.js 14 mockup of the DSTA Talent Acquisition Portal. All data is persisted in `localStorage` — there is no backend, no database, no API calls.

---

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 14 App Router |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS + PRIZM 4.0 design system |
| Icons | lucide-react (stroke-width 1.5 globally) |
| Data | localStorage + static JSON seed files |
| UI primitives | PRIZM 4.0 (components/ui/) |

---

## Folder Structure

```
app/                   # Next.js routing layer ONLY
  dashboard/page.tsx   # → thin wrapper: export { default } from '@/views/dashboard'
  programmes/page.tsx
  programmes/[id]/page.tsx
  projects/page.tsx

views/                 # All actual page logic lives here
  dashboard.tsx
  programmes.tsx
  programme-detail.tsx
  projects.tsx

components/
  layout/              # App shell (shared across all pages)
    shell.tsx          # Wraps sidebar + topbar + main content
    sidebar.tsx        # Fixed left nav
    topbar.tsx         # Fixed top bar with search/profile
  ui/                  # PRIZM 4.0 components (vendored from the PRIZM repo)

data/                  # Editable seed data (JSON)
  programmes.json
  projects.json
  requests.json
  programme-options.json

lib/
  data.ts              # Imports JSON files, exports typed constants
  types.ts             # All TypeScript types for the project

docs/
  PRIZM.md             # PRIZM 4.0 design system specification — READ BEFORE ANY UI WORK
  llms.txt             # PRIZM component index and slugs
```

---

## PRIZM 4.0 Design Rules

**Always read `docs/PRIZM.md` and `docs/llms.txt` before writing any UI code.**

- Build UI with PRIZM 4.0 components from `components/ui/` whenever possible.
- HTML root: `data-zone="enterprise" data-mode="light"`
- DSTA blue: `#00328a` = `bg-accent` / `text-accent`
- Use **semantic tokens only** — `bg-bg`, `text-fg-muted`, `bg-surface`, `border-border`, `text-danger`, etc.
- Merge classes with `cn()` from `lib/utils.ts` rather than concatenating strings.
- lucide-react icons: global `stroke-width: 1.5` via CSS.
- Keep all assets repo-local; no external URLs or Google Fonts.

### `components/ui-legacy/` — TOA extensions

- PRIZM 4.0 components live in `components/ui/` and are kept identical to upstream.
- `components/ui-legacy/` holds TOA-specific wrappers, composites, and components that extend PRIZM's API surface (e.g. `StatusBadge`, `CategoryBadge`, `AppStatusBadge`).
- Always import PRIZM primitives from `components/ui/` inside `components/ui-legacy/`.
- Application code should import from `components/ui-legacy/` when it relies on an extended export.

## Form validation

- Validate every new form submission with Zod 4.
- Use Next.js Server Actions for server-side schema validation.
- Share the same Zod schema between client preview and server action.

---

## Development Rules

1. `app/*/page.tsx` files must remain thin wrappers — one line only: `export { default } from '@/views/...'`
2. All page logic goes in `views/`, not in `app/`
3. Data shapes are defined in `lib/types.ts` — add types there, not inline
4. JSON seed files in `data/` are the source of truth for initial mock data
5. `components/ui/` is PRIZM 4.0 components vendored from the PRIZM repo — never manually edit those files; extend in `components/ui-legacy/` instead.
6. `components/layout/` contains app-wide chrome — changes affect every page

---

## Git Branching

- `main` — stable, always deployable
- `chore/migration-and-cleanup` — current active branch for Phase 4 reorganization
- Create feature branches off `main` for new features

---

## NPM Commands

```bash
npm run dev      # Start dev server at localhost:3000
npm run build    # Production build + TypeScript check
npm run lint     # ESLint
```

---

## localStorage Keys

| Key | Contents |
|---|---|
| `dsta_programmes` | Programme[] — seeded from data/programmes.json on first load |
| `dsta_projects` | ProjectEntry[] — seeded from data/projects.json |
| `dsta_requests` | ProjectRequest[] — seeded from data/requests.json |
| `dsta_widget_order` | string[] — dashboard widget arrangement |
| `dsta_hidden_widgets` | string[] — hidden dashboard widgets |
