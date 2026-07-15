# Project Intake Assignment Proposal

## Context

In the Create Programme flow, Step 4 Attach Projects currently treats project assignment as a per-row single-select action. This is not enough for IO operations because:

- IO users need batch assignment workflows.
- One project may need to be attached to multiple intake windows.
- A single `Assign to...` dropdown cannot represent multi-intake assignment clearly.

## Recommended UX Direction

Use a project-first assignment model:

- Show projects in a pool/table.
- Let each project display all assigned intake windows as removable chips.
- Use a `Manage` action for single-project multi-intake assignment.
- Use checkbox selection plus batch actions for IO bulk work.

This keeps the workflow clear: IO selects projects first, then chooses which intake windows those projects should cover.

## Implemented Pattern

The Create Programme Step 4 implementation now follows this pattern:

- Intake summaries remain at the top so IO can see how many projects each intake currently has.
- The project pool is the main working area for assignment.
- Each project row has a checkbox for batch selection.
- Each project row shows assigned intake windows as removable chips.
- The `Manage` action opens a multi-intake assignment dialog for one project.
- `Assign selected` opens a batch assignment dialog for selected projects.
- Batch assignment supports both add and replace modes.
- One project can be attached to more than one intake window through the existing `ProjectAttachment` join model.

This is the confirmed direction for future changes to this flow. Do not reintroduce a per-row single-intake dropdown as the primary assignment control.

## Main Layout

```text
Attach Projects

POOL · UNIVERSITY                                      0 of 22 allocated

[ ] Select all   0 selected
[ All projects v ] [ Period v ] [ Free placements v ]      [ Assign selected v ]

Intake: UG (Jun27-Jul27)                               0 projects
No projects allocated to this intake yet.

Needs your attention · 22
These projects match the level but do not fit the intake window exactly.

[ ] AI/ML in Defence Logistics
    Hui Shan Tan · EDS · Jan27-Apr27 · 2 of 3 placements free
    Assigned intakes: [ UG Jun27-Jul27 x ] [ UG Jun27-Aug27 x ]
                                                        [ Manage ]

[ ] Signal Processing R&D
    Kah Leong Ng · SECC · Aug27-Nov27 · 3 of 3 placements free
    Assigned intakes: None
                                                        [ Manage ]
```

## Single Project Assignment

Each project row should have a `Manage` action. Opening it shows a modal or side panel:

```text
Assign project to intakes

Project: AI/ML in Defence Logistics
Free placements: 2 of 3

[ ] UG (Jun27-Jul27)
[ ] UG (Jun27-Aug27)
[ ] Polytechnic (Sep27-Dec27)

Cancel                                      Apply
```

The project can be assigned to more than one intake. Selected intakes appear as chips on the project row.

## Batch Assignment

IO users should be able to select multiple projects and apply intake assignment in bulk.

Batch modal:

```text
Assign 4 projects to intakes

[ ] UG (Jun27-Jul27)
[ ] UG (Jun27-Aug27)
[ ] Polytechnic (Sep27-Dec27)

Mode
(*) Add to selected intakes
( ) Replace with selected intakes

Cancel                                      Apply
```

Default mode should be `Add to selected intakes` because it preserves existing assignments.

## Assignment Rules

- One project can be attached to multiple intake windows.
- The same project may appear under multiple intake summaries if it is assigned to multiple intakes.
- Project capacity must be validated globally, not per intake display.
- Removing an intake chip removes only that assignment, not the project itself.
- Batch assignment should support both add and replace behavior.

## Capacity Handling

If the app tracks only project-to-intake attachment, show a warning when assignment count may exceed available placements.

Example:

```text
This project is attached to 3 intakes but only has 2 free placements.
```

If allocation counts are supported later, intake chips can include counts:

```text
[ UG Jun27-Jul27 · 1 x ] [ UG Jun27-Aug27 · 1 x ]
```

## Design Notes

- Do not use a single native select for assignment; it cannot represent multiple intake windows.
- Do not create one column per intake; the layout will break when there are many intakes.
- Keep IO batch actions visible near the project pool.
- Use PRIZM components from `components/ui`, including `Select`, `Checkbox`, `Dialog` or `Sheet`, `Button`, and existing token-based surfaces.
- Keep the page operational and dense, not card-heavy or marketing-like.

## Implementation Notes

- Store assignment as a many-to-many relationship between project id and intake id.
- Keep page routing thin; implementation belongs in `views/programme-form.tsx` or extracted view helpers, not in `app/*/page.tsx`.
- Any new shared data shape should be added to `lib/types.ts`.
- If assignment state is persisted, use existing localStorage patterns and seed data conventions.
- After implementation, verify `/programmes/new` and update this document if the confirmed behavior changes.
