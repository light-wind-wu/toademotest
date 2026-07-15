# AI Agent Instructions for DSTA Talent Acquisition Portal

## Purpose
This repository is a mockup frontend app. There is no backend, external API, or database integration. All mock data is persisted to `localStorage` and seeded from `data/*.json`.

## Key project rules
- `app/*/page.tsx` files must remain thin wrappers only. Each page file should simply re-export the corresponding view from `views/`.
- All page logic belongs in `views/`, not in `app/`.
- `components/ui/` are PRIZM 4.0 components, vendored from the PRIZM repo. Add new PRIZM components by copying them from the PRIZM source.
- UI primitives in `components/ui/` should not be edited manually unless the change is part of a PRIZM update.
- App chrome lives in `components/layout/` and affects all pages.
- Data shapes belong in `lib/types.ts` — add or update types there rather than inline.
- Seed data lives in `data/*.json`; use it as the source of truth for initial mock state.

## Tech stack
- Next.js 14 App Router
- TypeScript (strict)
- Tailwind CSS with PRIZM 4.0 design conventions
- lucide-react icons
- localStorage for persistence
- `@dnd-kit` for drag-and-drop

## PRIZM 4.0 design conventions

- Read `docs/PRIZM.md` and `docs/llms.txt` before writing or updating any UI.
- Use PRIZM 4.0 components from `components/ui/` as the first choice when building interfaces.
- Use semantic Tailwind tokens only; avoid raw Tailwind colors like `bg-slate-500` or `text-blue-600`.
- Merge classes with `cn()` from `lib/utils.ts`.
- No external URLs or Google Fonts; the app should use system fonts / air-gap-safe styling.
- The HTML root should honor `data-zone="enterprise" data-mode="light"` where applicable.
- Validate all new form submissions with Zod 4.

## Component directories

- `components/ui/` — PRIZM 4.0 components, vendored from the PRIZM repo. Do not edit.
- `components/ui-legacy/` — TOA-specific extensions and composite components built on top of PRIZM primitives.
  - When a page needs a component that PRIZM does not ship, or needs additional named exports (e.g. `AppStatusBadge`, `StatusBadge`), implement the wrapper in `components/ui-legacy/`.
  - `ui-legacy` components should import base PRIZM components from `components/ui/` (or `components/rc3/` when applicable) rather than hand-rolling substitutes.
  - Page and feature code imports from `components/ui-legacy/` when the extended API is needed.

## Running and building
- `npm run dev` — start development server
- `npm run build` — production build + TypeScript check
- `npm run lint` — no dedicated lint script present in `package.json`, so use project conventions and TypeScript checks

## LocalStorage keys
Use these keys when working with persistence logic or mock data storage:
- `dsta_programmes`
- `dsta_projects`
- `dsta_requests`
- `dsta_widget_order`
- `dsta_hidden_widgets`

## Recommended behavior for AI agents
- Prefer small, targeted changes that preserve existing structure.
- When editing UI, follow `docs/PRIZM.md` design tokens and `docs/llms.txt` component guidance.
- Do not move logic into `app/` pages; keep routing wrappers thin.
- Do not manually modify `components/ui/` PRIZM files; extend or wrap them in `components/ui-legacy/` when the project needs a different API.
- Preserve the existing project conventions and link to docs instead of duplicating them.

## References
- `CLAUDE.md` — high-level project overview and folder conventions
- `docs/PRIZM.md` — design system and styling rules
- `docs/llms.txt` — PRIZM component index and slugs
