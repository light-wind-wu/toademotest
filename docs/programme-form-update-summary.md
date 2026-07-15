# Programme Form Update Summary

## Scope

This document summarises the updates made around the Create Programme flow, mainly `views/programme-form.tsx`, plus the related PRIZM rule and UX proposal documents.

## Files Updated

- `views/programme-form.tsx`
- `views/programmes.tsx`
- `views/projects.tsx`
- `docs/prizm4-page-rules.md`
- `docs/project-intake-assignment-proposal.md`
- `docs/programme-form-update-summary.md`

## Select Dropdown PRIZM Fix

The programme form previously used native `<select>` controls in several places. These were replaced with the PRIZM/Base UI select pattern from `components/ui/select.tsx`.

Updated areas include:

- Eligibility criteria rule type dropdown
- Eligibility operator dropdown
- Subject-grade minimum grade dropdown
- Single-select value dropdowns
- The reusable local `Sel` wrapper used by programme form fields

The fix removes page-local native select styling, inline `backgroundImage` overrides, and local chevron handling.

## PRIZM Rule Added

`docs/prizm4-page-rules.md` now explicitly states:

- Select controls must use `components/ui/select.tsx`.
- When a select dropdown style issue is fixed and confirmed in preview, the confirmed pattern must be documented.
- Future changes must not reintroduce native `<select>`, page-local chevrons, inline background overrides, or ad hoc dropdown styling.
- Application data tables must use the PRIZM table primitives from `components/ui/table.tsx`.
- Table row selection must use `components/ui/checkbox.tsx`, not native checkbox inputs with page-local `accent-*` styling.

## Programmes And Projects Table Migration

The Programmes and Projects list pages were migrated away from page-local native table markup.

Updated pages:

- `views/programmes.tsx`
- `views/projects.tsx`

Both pages now use:

- `Table`
- `TableHeader`
- `TableBody`
- `TableRow`
- `TableHead`
- `TableCell`

The Projects page also replaced native row-selection checkboxes with the PRIZM `Checkbox` component.

The Projects page union-row type issue was fixed by narrowing approved and submission rows before accessing submission-only fields such as `batchId` and `projectId`.

## Projects Page Section Split

The Projects page was corrected so review submissions and confirmed projects are no longer mixed into one status tab group.

Updated behavior:

- `Project requests pending approval` is now its own section.
- Pending project request submissions are reviewed from that section.
- Bulk approve/reject actions apply only to pending project requests.
- `Confirmed projects` is a separate section for projects that have already been approved.
- Confirmed projects now use `All`, `Active`, and `Archived` tabs.

Reason:

- `Pending Review` and `Rejected` belong to the project request review workflow.
- `Active` and `Archived` belong to confirmed projects.
- Mixing both concepts under `All / Pending Review / Rejected / Approved` made the page read as if project requests and real projects were the same entity.

## Project Intake Assignment Redesign

Step 4 Attach Projects was redesigned to support IO workflows:

- IO can batch-select projects.
- A project can be attached to multiple intake windows.
- Assignments are represented with removable intake chips.
- A single project can be managed through a multi-intake dialog.
- Selected projects can be assigned in bulk through a batch dialog.
- Batch assignment supports:
  - Add to selected intakes
  - Replace with selected intakes

The implementation uses the existing many-to-many `ProjectAttachment` join model, where one `(projectId, intakeId, programmeId)` row represents one assignment.

## Step 4 Layout Update

Step 4 was changed to a left-right operational layout.

Left side:

- Intake overview
- Intake labels and project counts
- First few assigned projects per intake
- Quick removal of project assignment from an intake

Right side:

- Project pool
- Select all / selected count
- Multi-intake enabled indicator
- Needs-attention indicator
- Project rows with assignment chips
- `Manage` action for single project assignment

The `Assign selected` button is now the primary action button.

## PRIZM Compliance Notes

The updated Step 4 follows the PRIZM 4 Enterprise direction:

- Uses semantic token classes such as `bg-surface`, `bg-bg-subtle`, `text-fg`, `text-fg-muted`, and `border-border`.
- Uses PRIZM/Base UI components from `components/ui`.
- Uses restrained `rounded-lg` / `rounded-md` surfaces for operational UI.
- Avoids raw Tailwind colour palettes for the updated flow.
- Avoids native select controls for assignment.

Known existing note:

- A pre-existing stepper progress style still uses inline width styling for dynamic progress. This was not introduced by the Step 4 changes.

## Preview And Verification

Preview server:

- `http://127.0.0.1:3037`

Verified routes:

- `/programmes/new` returned `200`
- `/programmes` returned `200`

Checks run during the update:

- `pnpm exec tsc --noEmit`
- Targeted search for native select and raw palette patterns in `views/programme-form.tsx`
- Local route requests with `curl`

Note:

- A later TypeScript run surfaced an unrelated existing issue in `views/projects.tsx` around `ProjectListRow.batchId` and `ProjectListRow.projectId`. That issue is outside this update scope.

## Follow-Up Guidance

Future changes to this flow should preserve the project-first assignment model:

- Do not return to one row = one intake dropdown.
- Keep multi-intake assignment visible through chips.
- Keep batch assignment available for IO users.
- If the confirmed UI pattern changes after review, update `docs/project-intake-assignment-proposal.md` and this summary.
