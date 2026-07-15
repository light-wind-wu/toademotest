# MUI usage — where PRIZM was not used

PRIZM 4.0 is the design system for this app. **Default to PRIZM / Radix components.**
Where PRIZM genuinely lacks a component, the sanctioned fallback (per the project's
component rules) is **MUI — restyled to PRIZM tokens** — never the default Material
look. Hand-build only if neither fits.

**Component fallback order:** PRIZM/Radix → MUI (restyled to PRIZM) → hand-build.

Every MUI usage must be:
- **restyled to PRIZM tokens** — PRIZM colour (`rgb(var(--color-*))`), radius, type,
  spacing. No MUI theme palette, no default Material blue/elevation.
- **listed in this file** with the reason PRIZM couldn't cover it.

---

## Registry

| Component | Where | PRIZM restyle |
|---|---|---|
| **Stepper** (vertical) | `views/candidate360.tsx` — Activity + DSTA Journey timelines | PRIZM 4.0 ships no stepper, so MUI styled to PRIZM (per the fallback order; user directive: don't hand-build). `PrizmStepConnector` + `PRIZM_STEPPER_SX`. The **white card is the `StepLabel` label, so the node sits beside it (aligned)**. **No visible rail** — MUI can't give *both* beside-alignment and an unbroken rail, and the segmented half-rail read as broken; the connector line is set `transparent` and kept only for its vertical spacing. Chronology is carried by the year-group headers, the most-recent-first order, and the icon nodes. No `StepContent`. No Material palette/elevation. |

## Packages
- `@mui/material` (v6), `@emotion/react`, `@emotion/styled` — client-side only (views are
  `'use client'`). Used by the candidate-360 steppers. Reuse this MUI-styled-to-PRIZM
  Stepper for future steppers/wizards (`views/programme-form.tsx`,
  `views/project-request-form.tsx`) rather than hand-building.
