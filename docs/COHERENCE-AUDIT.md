# DSTA Portal — Coherence Audit & Consolidation Plan

_Snapshot audit of the prototype to regain coherence. The app's structure is sound;
the incoherence is concentrated in the storage/seed layer and duplicated logic._

## Verdict
- **Macro structure: healthy.** `app/*` are thin route wrappers; real logic lives in `views/`. Roles map cleanly to areas (IO, AD(P&C), mentor, director, DCE, applicant).
- **End-to-end flow: coherent.** request → AD(P&C) submit → IO review/approve → approved+unassigned project → attach to programme → applicant apply → screen → shortlist → interview → offer → onboard → active intern → complete → (offboard).
- **The mess is in two places:** (1) the localStorage seed/version layer, (2) duplicated approval + load logic. Fix those and most of the coherence returns.

---

## Hotspots, prioritized

### P1 — Storage & seed layer (the #1 source of fragility)
- **Seed-version sprawl:** the same version constant is hardcoded across many files (e.g. `PROJECTS_SEED_VER` in 8+ files). Just unified projects to `'23'`, but every other entity (requests, submissions, applications, templates…) repeats the pattern.
- **`dsta_requests_seed_v` conflict:** `admin-settings.tsx` sets `'9'`, `project-request-form.tsx` sets `'10'` — no reconciliation.
- **Destructive re-seed-on-load duplicated in 20+ views:** each view re-implements `if (ver !== SEED) { overwrite from JSON }`. This is what was wiping runtime data when versions disagreed.
- **Orphaned seed keys:** offer-letter / welcome-letter / certificate templates are loaded but their `_seed_v` keys are never set in `resetDemoData` → version checks can misbehave.
- **~15 unused `dsta_*` keys** referenced nowhere meaningful (e.g. `dsta_microsite`, `dsta_edm_campaigns`, `dsta-widget-state` with a stray hyphen).

**Fix:** one `lib/storage.ts` module — central `SEED_VERSIONS` map, generic `loadSeeded(key, seed, version)` + `save(key, value)`. Delete the 20+ inline reseed blocks. Drop dead keys.

### P2 — Approval logic triplicated
- Three sites build a `ProjectEntry` on approval: `submission-review.tsx`, `request-review-detail.tsx`, `requests.tsx` (bulk).
- They drifted: single-approve in `submission-review` copies `pc`; the other two **drop `pc`**. (Period + unassigned now consistent after today's work.)

**Fix:** one `buildProjectEntry(submitted, nextId)` helper + one `approveSubmittedProject(...)` used by all three. Single source of truth for the submission→project promotion.

### P3 — Repeated load + notify boilerplate
- `loadProjects()` / `loadSubmissions()` / `loadApps()` reimplemented in 20+ files.
- Approval notify pattern (`addNotification` ×2 + toast) duplicated; bulk uses `showToast`, singles use `sessionStorage('dsta_pending_toast')`.

**Fix:** fold loaders into `lib/storage.ts`; extract `notifyProjectApproved(project)` / `notifyProjectRejected(...)`.

### P4 — Status vocabulary not centralized
- `SubmissionReviewStatus` is defined in `lib/types.ts` but `requests.tsx` **redefines it inline** instead of importing.

**Fix:** import the union from `types.ts` everywhere; never redefine literals locally.

### P5 — Overlapping / dead screens (lower urgency)
- **Two review screens:** `submission-review.tsx` (`/requests/review`, batch view) vs `request-review-detail.tsx` (`/requests/project/[batchId]/[projId]`, project detail). High overlap — candidate for merge (detail-in-modal).
- **Possibly legacy:** `mentor-evaluate.tsx` (`/mentor/evaluate/[id]`) may be superseded by `/mentor/interviews/[id]/evaluate`.
- **Duplicate entry points:** `/projects/request` and `/requests/new` both render `project-request-form.tsx` → pick one canonical, redirect the other.
- _Not duplicates (intentional):_ `applications` (roster) vs `candidate360` (full record) vs `shortlist` (fast-path decision); programme/form new-vs-edit reuse.

### P6 — Minor
- **MUI in 2 files** (`components/ui/date-picker.tsx`, `candidate360.tsx` stepper) vs shadcn everywhere else — theming can drift from PRIZM tokens. Migrate when convenient.
- **Naming:** `ProjectRequest.programme` actually holds an *Education Level*, not a programme id — rename to `educationLevel` for clarity.
- **Orphaned fields** set but never displayed (`cvLeadership/Activities`, `mentorAiSummary`, `SuitabilityScore` component scores, `senderName`).

---

## Recommended sequence (data cleanup is LAST)
1. **P1 — `lib/storage.ts`** (central seed versions + load/save). Biggest coherence win, removes the data-wipe class of bugs.
2. **P2 — unify approval** into one helper.
3. **P3/P4 — fold loaders + statuses** into the shared modules.
4. **P5 — merge/redirect** the duplicate screens; delete confirmed-dead routes.
5. **Then** regenerate clean seed data to match the settled model, and drop dead `dsta_*` keys.

Each step is independent, mechanical, and verifiable (`tsc` + build). Do them one at a time on this branch.
