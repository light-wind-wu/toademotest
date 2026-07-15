# Programme Detail PRIZM 4 Review

Date: 2026-07-01

Scope:
- `views/programme-detail.tsx`
- `docs/Prizm4/prizm4_l123_page_spec.md`
- `docs/Prizm4/PRIZM.md`

## Summary

The Programme Detail page was reviewed against the PRIZM 4 L1/L2/L3 page rules and the TOA page conventions. The page needed 13 updates in total. This pass fixes the P0/P1 items and the IA issues that affected status hierarchy, readability, and detail-page structure.

## P0 Fixes

1. **Duplicate programme status**
   - The page header is the primary status location.
   - Removed the repeated `Programme Status` field from the Programme Details metadata area.

2. **Completed page readability**
   - Removed page-wide `opacity-60 pointer-events-none select-none`.
   - Completed pages must remain readable under WCAG AA. Disable actions directly instead of dimming readable content.

3. **Confirmed Projects table**
   - Replaced page-local native table styling with PRIZM table primitives from `components/ui/table.tsx`.
   - Table header/body typography now follows detail-table scale.

## P1 Fixes

1. **Programme Details typography**
   - Metadata values use body-small scale and medium emphasis.
   - Long description text uses smaller readable prose with constrained line length.

2. **Eligibility Requirements**
   - Empty state now uses PRIZM Empty State.
   - Generated eligibility prose uses body-small text with relaxed line height and readable measure.
   - Disclosure trigger now exposes `aria-expanded`.

3. **Programme Intakes**
   - Application Window, Internship Period, and Applications values now use body-small scale.
   - The `new` application count uses a PRIZM/TOA Badge treatment instead of arbitrary `text-[13px] font-bold`.

4. **Confirmed Projects badges and empty state**
   - Intake/count/status indicators use Badge treatments.
   - Empty project state uses PRIZM Empty State instead of a custom dashed empty block.

## IA Fixes

1. **Single source of truth for lifecycle status**
   - Programme status appears once, beside the H1.

2. **Clearer detail-page hierarchy**
   - Programme Details is metadata only.
   - Eligibility Requirements is a separate business section rather than being grouped as programme metadata.

3. **Readable completed state**
   - Completed status no longer visually weakens all page content.

4. **Status vs action separation**
   - Header status remains display-only.
   - Lifecycle-changing actions remain in the action area.

5. **Consistent data density**
   - Detail metadata, generated prose, intake summaries, and project tables now use typography levels that match their information density.

## Deferred Items

The following P2 items are intentionally deferred:

1. Application form preview drawer still uses its current custom renderer. If this preview becomes formal product UI, replace or wrap native controls with PRIZM primitives.
2. Date/calendar controls inside the preview renderer were not changed.
3. Remaining low-risk arbitrary typography in form-preview internals can be handled in a dedicated pass.
