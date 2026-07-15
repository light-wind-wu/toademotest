# Storage consolidation (P1/P3) — status & notes

Centralising the scattered localStorage seed/load/save logic into `lib/storage.ts`
(see `docs/COHERENCE-AUDIT.md`). Goal: one loader/saver per entity so a model
change touches the module + the type, not ~50 views.

## `lib/storage.ts` API
- `loadProgrammes()/saveProgrammes()` · `loadProjects()/saveProjects()`
  · `loadRequests()/saveRequests()` · `loadSubmissions()/saveSubmissions()`
- `loadJSON(key, fallback)` / `save(key, value)` for non-seeded UI state.
- Central `SEED_VERSIONS` + `STORAGE_KEYS`. Reference data reseeds on version
  bump (overwrite); applications keep the merge strategy in `utils.ts`.

## Migration status
- ✅ `lib/storage.ts` created; `views/projects.tsx` migrated (reference pattern).
- ⏳ Sweep of remaining ~35 core data-entity files (projects/requests/submissions/programmes).
- ⏸️ **Applications** — already half-centralised via `utils.loadAppsFromStorage`; light touch later.
- ⏸️ **Templates** — deferred (see bug below).

## Known bug to fix later — offer-letter dual key
Offer-letter data is read/written under **two different keys**:
- `views/applications.tsx` → `dsta_offer_letter_templates` (`OL_VER_KEY = dsta_offer_letter_templates_seed_v`)
- `views/templates.tsx`, `views/offer-letter-compose.tsx` → `dsta_offer_letters` (`dsta_offer_letters_seed_v`)

Same `OL_KEY` constant name, different localStorage keys → the compose/template
screens and the applications screen read different stores. Pick one canonical key,
migrate the other, then fold into `lib/storage.ts`. **Not** part of the mechanical
sweep — needs a deliberate decision on which key is source of truth.
