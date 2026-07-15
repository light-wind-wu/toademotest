# Changelog

Notable changes, newest first. Entries are written **before each commit**.

## IA revamp — per-role dashboard action cards

**Files:** `components/ui/dashboard-cards.tsx`, `views/dashboard.tsx`,
`views/mentor-dashboard.tsx`, `docs/ia-revamp.md`

The IA spec's `DASH_CARDS` as a "Needs your attention" tile grid with live counts
from localStorage (same data as the rail badges), each tile navigating to its
section. Added to the IO and mentor dashboards above the existing widgets (additive).
Director + applicant intentionally skipped (director = single-page/circular; applicant
already has an equivalent state-aware Tasks section). See `docs/ia-revamp.md`.

## IA revamp — drop flyout for on-page section tabs; mobile burger menu

**Files:** `components/layout/ia-rail.tsx`, `components/layout/section-tabs.tsx`,
`components/layout/shell.tsx`, `components/layout/topbar.tsx`, `docs/ia-revamp.md`

Per the new design (group switching lives on the section landing page as tabs, not a
rail flyout):
- **Removed the rail flyout.** Clicking a rail section just navigates to its landing.
- **Added `SectionTabs`** (rendered in the shell above page content): an on-page tab
  switcher for a section's groups — Projects → Projects / Project Requests, Admin →
  Templates / System Admin — so those pages stay reachable on every viewport without a
  flyout. Renders nothing for single-group sections.
- **Mobile: burger menu in the header.** Replaced the horizontally-scrolling bottom nav
  with a burger button (header, left) that opens a left slide-in drawer of the sections
  (workstream switcher + sections + badges). Avoids bottom-nav overflow with many items.
  Topbar mobile padding bumped to clear the burger.

Verified: desktop rail has no flyout; /projects and /admin show their tabs (and the tab
navigates to /requests, /templates); single-group pages show no tab bar; mobile burger
opens the drawer; groups reachable via tabs on all viewports. tsc clean.

## IA revamp — Phase 1 (nav shell)

**Branch:** `design-changes-ia-revamp` · **Files:** `lib/ia-nav.ts`,
`components/layout/ia-rail.tsx`, `components/layout/topbar.tsx`, `shell.tsx`,
`docs/ia-revamp.md` (old `sidebar.tsx` removed)

Rebuild global nav around the TOA-handoff-3 IA, mapped onto existing routes (no
new screens). Role-aware **rail** + hover **flyouts** (section groups) + workstream
switcher + ported live action badges + mobile bottom nav; **cross-IA search** in
the topbar (spans every section/group the role can reach, keyboard + mouse). See
`docs/ia-revamp.md` for the per-role taxonomy and what's deferred. Verified across
all six roles; tsc clean.

## Candidate 360 — IM8 controls: least-privilege, reason-for-access, decision audit

**Files:** `views/candidate360.tsx`, `lib/audit.ts`, `components/layout/sidebar.tsx`

The remaining IM8/DSS hardening items from the QA report:
- **Least-privilege reveal** — only personnel-handling roles (`io-admin`, `io`, `ad-pnc`,
  `director`) get the reveal control on protected particulars. Mentors/applicants see a
  lock + masked values only, with a note that revealing is restricted to officers.
- **Reason-for-access prompt** — revealing a particular now opens a dialog requiring a
  reason (preset list + "Other"); the chosen reason is written to the access log with the
  field and the named officer (IM8 purpose limitation).
- **Decision audit trail** — reject, interview outcome (accept/reject), advance-to-offer,
  advance-to-shortlist, and recommend/un-recommend now write `decision` entries to the IM8
  access log, attributed to the named officer. New `'decision'` action type in `lib/audit.ts`
  (rendered with a distinct icon/tone in the access-log card).
- **Purpose-of-access banner** — a one-line IM8 banner atop Record & documents states why the
  record is being accessed (assessing the application for <programme>) and that access +
  reveals are logged and attributed.
- **Logo warning** — fixed the Next.js `<Image>` aspect-ratio console warning on the sidebar
  logo (set width/height via inline style).

---

## Candidate 360 — harden protected particulars (IM8 data-minimisation)

**Files:** `views/candidate360.tsx`

Follow-up to the QA pass (decision: keep the fields, fix the handling):
- **Lazy reveal** — each particular's cleartext is now produced only inside a
  `reveal()` thunk on click; it is never stored on the object or passed as a prop
  while masked, so masked values aren't resident in the component tree (verified:
  no NRIC cleartext in the DOM until revealed). Hiding drops it from state.
- Masks are fixed placeholders that don't embed the real value.
- The card is flagged **"Sample data"** with a note that the particulars are
  synthetic prototype data; reveal still logs to the IM8 access log (named officer).
- Removed the now-unused `maskAllButLast` helper.

---

## Candidate 360 — QA pass fixes (a11y + IM8 + hygiene)

**Files:** `views/candidate360.tsx`, `components/layout/topbar.tsx`

Outcome of a QA pass (accessibility, PRIZM, runtime, IM8/DSS, hygiene). Verified
clean: 1 `h1` + ordered headings, no missing labels/alt, no duplicate ids, no
positive tabindex, contrast 5.1–16.2:1 on all reviewed text, no raw colour tokens,
type on the PRIZM4 16/14/12 scale, no real runtime errors (a setState-in-render
crash in old console logs was stale — line refs predate the current 2440-line file).

Fixes applied:
- **IM8 non-repudiation:** access-log entries (view + reveal) now attribute to the
  **named officer** — `Davina Lim (Senior Internship Officer)` — instead of the bare
  role string `io-admin`.
- **A11y (shared chrome):** the topbar notification bell button had no accessible
  name — added `aria-label` ("Notifications, N unread") + `aria-expanded`.
- **Hygiene:** removed the dead `a.by === 'AI assist'` sparkle branch in Assessments
  (no row ever uses that label — fit scoring is deterministic, never AI), making the
  "fit is not AI" intent explicit in code.

---

## Candidate 360 — stronger AI-summary border animation

**Files:** `app/globals.css`

- The AI-card "Animated Border" now reads more strongly **without getting thicker**
  (stays 1px): a concentrated bright blue→teal "comet" arc sweeps around a dim base so
  the rotation is clearly visible, plus a soft teal glow (`abGlow`) that blooms with the
  sweep and fades as it settles. Still plays twice on mount/refresh then stops; honours
  reduced-motion.

---

## Candidate 360 — card-height + clarity pass; badge audit; scroll-up fix

**Files:** `views/candidate360.tsx`, `components/layout/kinetic-bounce.tsx`

- **AI summary shortened** with an expand/contract pattern: the lead narrative shows
  always; the 3 supporting facts collapse behind a "Show supporting facts" toggle.
- **Ask-AI chip row** gets a right-edge fade mask so the horizontal scroll ("more →")
  is an obvious affordance.
- **Beyond-résumé toggle** promoted from a faint text link to a full-width bordered
  button ("Show working style & goals"), matching the Journey toggle.
- **Engagement card relocated** from the bottom of the left (insight) column to the
  right column, directly under the DSTA Journey — it's a warmth score derived from those
  touchpoints, so it now sits beneath its source instead of reading as a footnote.
- **Badge audit** (per PRIZM badge doc — badges are non-interactive semantic status
  labels): no tabs on this screen; status badges (status, Returning, verdict, engagement
  tier) and count chips are used correctly. Neutralized the **Interests** tags (were
  accent pills that mimicked status badges) so the badge/accent treatment is reserved for
  actual status.
- **Kinetic bounce — scroll-up jank fixed**: when native scroll resumes off an edge, any
  lingering bounce offset is snapped toward zero instead of decaying across the friction
  tail, so it no longer fights the upward scroll.

---

## Candidate 360 — inline AI-summary Refresh, rail-less timelines

**Files:** `views/candidate360.tsx`, `docs/mui-usage.md`

- **Refresh moved inline** onto the AI-summary "Updated just now · …" meta line as a small
  icon-only button (matching the reference), instead of a full-width second header button
  beside the title. Frees the header row for the title alone.
- **Steppers drop the visible rail.** MUI can't give both beside-alignment (node next to the
  card) and an unbroken rail, so the segmented half-rail read as broken. The `PrizmStepConnector`
  line is now `transparent` (kept only for its vertical spacing); chronology is carried by the
  year-group headers, most-recent-first order, and the icon nodes. Applied to both the DSTA
  Journey and "Activity for this cycle" timelines. Stays on MUI styled to PRIZM (no hand-build).
- Removed the now-unused `StepContent` import; updated `docs/mui-usage.md` to record the
  rail-less decision.

---

## Candidate 360 — header CTA prominence, larger Journey text, fit-row CTA anchor

**Files:** `views/candidate360.tsx`

- **"Open application" header button** → `secondary` (filled) instead of transparent
  `outline`, so it reads as a button against the bare-header canvas (was nearly
  invisible next to the solid primary/danger).
- **Journey text bumped** from `body-sm` → `body-md` for touchpoint titles and details
  — the content was too small for a primary card.
- **Fit-row "Recommend" no longer floats**: the right column now stretches
  (`self-stretch justify-between`) so fit% sits top and the Recommend action anchors to
  the bottom, instead of hanging in the top-right whitespace above the sub-score bars.

---

## Candidate 360 — fix Journey year-divider type role

**Files:** `views/candidate360.tsx`

- The Journey year divider was `text-body-md font-extrabold` (800) — heavier than its own
  section heading (`body-md` semibold/600), inverting the hierarchy. `font-extrabold` is
  reserved for the prominent display numbers (fit %, gauge value). Re-roled the year to a
  subordinate `text-body-sm font-bold text-fg-muted` sub-label (it already has a rule line
  to read as a divider). Rest of the card's type scale/roles were already correct and
  consistent with the screen.

---

## Candidate 360 — cap the fit list + delightful strong-lead gauge

**Files:** `views/candidate360.tsx`, `app/globals.css`

- **Programme-fit list capped to the top 5** by default with a **"Show all N projects"**
  expander (collapses back to "Show top 5"). The full ~21-row list was the page's main
  scroll driver; recruiters act on the strongest fits first. Re-rank motion + rank
  numbers still apply to the visible rows; expanding reveals the tail inline.
- **Engagement gauge animates**: the arc now **draws in from empty on mount** (strong
  leads visibly fill more). For **strong leads (Champion / Hot tiers)** a soft, slow
  **breathing halo** in the tier colour celebrates them — subtle, not flashy. Extracted
  into an `EngagementGauge` component. Both honour `prefers-reduced-motion` (no draw-in
  transition; halo not rendered). New `.gauge-pulse` keyframes in globals.css.

---

## Candidate 360 — ground timeline entries (stop the text floating)

**Files:** `views/candidate360.tsx`

The DSTA Journey / Activity entries read as text floating in the card's whitespace.
Following the Workable / Todoist / Airbnb activity-feed pattern, each step's **body now
sits in a subtle tinted panel** (`bg-bg-subtle`, rounded) so the details + CTA are
contained, while the icon · title · tag stay anchored on the timeline rail. Applied to
both MUI steppers (Journey + Activity this cycle) for consistency.

---

## Candidate 360 — fix broken stepper connector + migrate Journey to MUI Stepper; a11y on duplicate "Open application"

**Files:** `views/candidate360.tsx`, `docs/mui-usage.md`

- **Fixed the "Activity this cycle" stepper**: the connector line was a broken stub
  because all content sat in `StepLabel`. Moved the body into **`StepContent`**, whose
  left border is the *continuous* connector line. New shared `PRIZM_STEPPER_SX` aligns
  the line under the 36px node (`marginLeft:15`), indents content to the label text, and
  drops the last step's trailing line. Steps are `active expanded` (always open).
- **Migrated the "DSTA Journey" timeline (`C360JourneyTimeline`) to the MUI Stepper** —
  it was hand-built (manual dot + `bg-border` line), inconsistent with the standing
  "use MUI Stepper, restyled to PRIZM" rule and with the Activity timeline. Now one
  PRIZM-styled `Stepper` per year group (year header breaks the line). Documented the
  second usage in `docs/mui-usage.md`.
- **a11y — duplicate "Open application" buttons**: the header and the journey CTAs all
  read "Open application" with no context for screen-reader users. Added descriptive
  `aria-label`s — header: `Open {name}'s application`; journey: `{cta}: {title} ({year})`.

---

## Candidate 360 — un-card the identity header (consistency + less chrome)

**Files:** `views/candidate360.tsx`

- The identity header (avatar · name · status · actions) was wrapped in a bespoke
  card (`rounded-lg shadow-sm border bg-surface`). Removed the card so the header
  sits **bare on the canvas**, matching the **project-detail** and **programme-detail**
  page headers (breadcrumb → title + badges + actions, no wrapper). The card was
  redundant chrome and the odd one out among detail pages; the bare header also lets
  the brand atmosphere read behind it. The `<h1>` (single page heading) is unchanged.

---

## Kinetic bounce — fix jank (single rAF writer + GPU layer)

**Files:** `components/layout/kinetic-bounce.tsx`

The bounce was janky because the transform was written from **two competing sources** —
synchronously on every wheel event (trackpads fire many per frame) *and* in the rAF
decay loop — so the painted offset oscillated frame-to-frame, and the large content
subtree wasn't on its own compositor layer. Now:
- **One writer**: wheel only accrues `pendingImpulse`; a single rAF `frame()` applies it,
  runs friction, and writes the transform exactly once per frame.
- **GPU**: uses `translate3d` and toggles `will-change: transform` on while animating
  (cleared when it settles), so the content is promoted to its own layer.
- Verified the per-frame trail is now a smooth monotonic ramp that converges with no
  oscillation. Behaviour unchanged otherwise (subtle, recedes immediately, both edges).

---

## Candidate 360 — match header badges + PRIZM AI-card animated border

**Files:** `views/candidate360.tsx`, `app/globals.css`

- **Header badges matched**: the status pill (`StatusBadge`) was `body-md` / `py-px` while
  "Returning" was `body-sm` / `py-0.5` — different height/weight. Unified `StatusBadge` to
  `body-sm font-bold py-0.5` and gave "Returning" a matching `border-accent/20`, so the two
  pills are now a consistent set.
- **Animated border (PRIZM AI-card spec)**: the primary AI summary card now plays the
  PRIZM "rotate clockwise twice then pause" border — a masked conic-gradient accent sweep
  (`@property --ab-angle`) used *sparingly* for emphasis. Replays on mount and on Refresh
  (`spinKey`). Honours `prefers-reduced-motion` (not shown).
- **Loading state confirmed**: the AI card already implements the PRIZM "Status When AI is
  Working" behaviour — 3 `aria-live` skeleton bars on Refresh (never blank), "Thinking…"
  for Ask AI. Verified, no change needed.

---

## Candidate 360 — back to MUI steppers, de-AI'd fit, shorter cards (above the fold)

**Files:** `views/candidate360.tsx`, `docs/mui-usage.md`

- **Steppers back to MUI styled to PRIZM** (per directive: don't hand-build). Continuous
  rail via `StepContent`'s border (icon-only `StepLabel`; the white card lives in
  `StepContent`). Updated `docs/mui-usage.md`.
- **Fit is consistently non-AI:** the assessment row renamed "AI match" → **"Best project
  fit"**, `by: Project-fit scoring`, **sparkle removed** (matches the de-AI'd Project-fit
  card). Note explains the 0–100 score in plain terms.
- **Shorter cards (more above the fold):**
  - **Ask AI + prompt chips** now a single **horizontal-scroll** row (was a 3-row wrap).
  - **"Beyond the résumé"** uses **progressive disclosure** — quote + interests shown;
    working style & goals behind a "Working style & goals" toggle.

---

## Candidate 360 — Journey to latest-2, AI-match polish, Ask-AI gradient, thinner AI border

**Files:** `views/candidate360.tsx`, `app/globals.css`

- **DSTA Journey collapsed to the latest 2 touchpoints** by default (was 2 *year groups*,
  i.e. up to ~6). "Show full journey · N earlier touchpoints" reveals the rest — much less
  scrolling.
- **AI match assessment:** keep the same fill as other assessment rows (white/border) and
  just apply the **sparkle** (reverted the accent container). Its note now **explains the
  score** in plain terms ("How well this candidate fits the project (0–100), from
  discipline, skills & academic standing. A screening signal to review — not a decision.").
- **Ask AI button** now carries a subtle **blue→teal brand gradient** in enterprise-light
  tokens (`--toa-blue`/`--toa-teal`) + accent border, instead of a flat accent tint.
- **AI summary border** stroke thinned to **1px** (per ref).

---

## Candidate 360 — fix broken steppers (hand-built rail), AI sparkle on AI match

**Files:** `views/candidate360.tsx`, `app/globals.css`, `docs/mui-usage.md`

- **Fixed the broken steppers.** Moving content into `StepLabel` had killed MUI's
  continuous connector (it only stubs between cards). MUI's vertical Stepper can't place
  the card *beside* the node with an unbroken rail, so both timelines (Activity + DSTA
  Journey) are now a **hand-built flex timeline** — icon node + a `flex-1` rail line +
  the white bordered card beside it (matches the design ref). Removed all MUI imports +
  `PrizmStepConnector`/`PRIZM_STEPPER_SX`; updated `docs/mui-usage.md` (MUI now unused).
- **Margin** between the last Journey card and "Show full journey" tidied.
- **AI transparency:** the "AI match" assessment (`by: AI assist`) now carries the
  **sparkle + a subtle accent container** plus its explainer note, so AI-derived output is
  clearly flagged (the deterministic Project-fit card stays un-sparkled).
- **AI summary border** a touch more obvious (brand blue→teal sweep 0.55 → 0.7).

---

## Candidate 360 — stepper cards (white/bordered), gauge static, brand AI border, copy

**Files:** `views/candidate360.tsx`, `app/globals.css`

- **Steppers reverted to white bordered cards** (per design ref) — each Activity / Journey
  entry is now `border border-border bg-surface shadow-sm`, not the tinted panel.
- **Engagement gauge fully static** — removed the draw-in transition (reduce motion);
  renders at its final value immediately.
- **AI summary animated border** now matches the PRIZM "Animated Border" ref: a brand
  **blue → teal** gradient ring (`--toa-blue`/`--toa-teal`) that rotates twice then pauses,
  instead of the faint single-accent sweep.
- **Copy:** "Activity this cycle" → "Activity for this cycle"; engagement explainer
  rewritten for a non-technical HR reader ("A warmth score: how recently and how often
  this person has engaged with DSTA… doesn't affect the hiring decision.").

---

## Candidate 360 — remove Message candidate, ground stepper entries, redesign Access log

**Files:** `views/candidate360.tsx`, `app/globals.css`

- **Removed the "Message candidate" CTA** from the header (all candidate-360 states).
- **Stepper entries grounded.** Titles in the Activity + Journey timelines were floating
  on the label line above their body panel. Each step is now a single tinted card (title +
  meta + body together) beside the icon node, so nothing floats. (Dropped the separate
  `StepContent`; the icon node + connector rail remain.)
- **Access log redesigned.** Collapses runs of the identical action by the same actor
  (e.g. 27× "Opened Candidate 360" → one row with `×27`), adds an action icon + semantic
  tone (reveal = warning/Eye, access = accent/History), and right-aligns a compact time.
- **AI summary border** nudged back up from too-subtle: sweep opacity 0.22 → 0.32, ring 1.25px.

---

## Kinetic bounce — subtler + fix big-swipe slam; AI border subtler again

**Files:** `components/layout/kinetic-bounce.tsx`, `app/globals.css`

- **Big-swipe wonkiness fixed.** A fast/large trackpad swipe dumped a huge impulse into
  one frame, slamming the band to max and jittering on the momentum tail. Now per-frame
  travel is **capped (`STEP`)** and the excess discarded, so any swipe size eases in.
  Verified: a single giant event → ~2px; sustained momentum → smooth ramp to ~6.6px.
- **More subtle:** max travel 16→**10px**, sensitivity `K` 0.12→0.05, touch follow
  0.3→0.22.
- **AI summary border** dialled down further — sweep opacity 0.4→**0.22**, ring 1.5→1px,
  narrower arc.

---

## Candidate 360 / global — polish pass (border, motion, AI framing)

**Files:** `components/ui/button.tsx`, `app/globals.css`, `views/candidate360.tsx`

- **Secondary button** gets a crisper edge globally: `border-border` → `border-border-strong`.
- **AI summary animated border** toned down — sweep opacity 0.9 → 0.4, narrower arc.
- **Engagement gauge: reduced motion** — removed the perpetual breathing halo; kept only
  the single quiet draw-in.
- **"Project fit" is not AI** — it's a deterministic discipline/skills/standing score.
  Reworded the advisory note from "AI assists — …" to "Fit scores are computed from
  discipline, skills & standing — advisory only; the decision stays with you."
- **"Show all" no longer animates oddly** — the FLIP reorder now runs only when the row
  count is unchanged (a true reorder), skipping expand/collapse.

---

## Candidate 360 — sub-scores back to chips; badge usage tightened

**Files:** `views/candidate360.tsx`

- **Sub-scores: bar charts → chips.** The project sub-scores (Discipline / Skills /
  Standing) were rendered as progress bars — a divergence from the prototype, which used
  compact chips. Reverted `SubScore` to a chip (`label value`), laid out as a wrapping row.
- **Badges used judiciously** (per PRIZM badge guidance — badges are for status/semantic
  labels, not decorative metadata). Demoted two metadata-as-badge pills to plain text:
  the DSTA Journey "N touchpoints · N years" summary and the Engagement "Loyal · repeat
  engager" descriptor. Kept genuine status badges (application status, Project-fit verdict,
  engagement tier, Current / Their #1 row flags, count badges).

---

## Global — align type tokens to the PRIZM 4 scale

**Files:** `tailwind.config.ts`, `views/candidate360.tsx`

The custom `fontSize` tokens were a full step below PRIZM 4 (which uses Tailwind's default
scale): `body-md` 14 (should be **16**), `body-sm` 12 (→ **14**), `caption` 11 (→ **12**),
headings undersized too. That's why the UI read small and off-prototype. Remapped the
tokens to PRIZM 4 sizes/weights — body **16**/24, secondary **14**/20, metadata·badges
**12**/16, card title 20/28, subsection 24/32, section 30/36; headings semibold (600),
labels/badges medium (500). Token names unchanged, so all existing usages pick up the
correct sizes (with the 16px root). Required a dev-server restart (Tailwind reads the
config at startup). Spot-checked candidate 360 + dashboard — no overflow.
Also renamed **"Programme fit & recommendation" → "Project fit & recommendation"** (the
listed items are projects, not programmes).

---

## Global — fix the type scale (root was undersizing every screen)

**Files:** `app/globals.css`, `views/candidate360.tsx`

Type audit found the real cause of "everything's too small": the fluid root
`font-size` capped at 15px and resolved to only **13.6px at 1440** (and never reached
16px), so the entire rem-based PRIZM scale rendered ~15% under its designed px —
`body-md` ≈ 12 (not 14), `body-sm` ≈ 10 (not 12), `caption` ≈ 9 (not 11). The hardcoded
22px name didn't scale, exaggerating the gap.
- **Root clamp** `clamp(12.5px, 0.28vw + 9.6px, 15px)` → `clamp(13.5px, 0.34vw + 11px,
  16px)`: ~15.4px @1280, **~16px @1440+**, still shrinking on small laptops. Now the
  tokens hit their designed sizes (body-md 14 / body-sm 12 / caption 11).
- **Reverted the now-redundant per-card bumps** (Journey + Programme-fit titles/details
  body-md → back to `body-sm`): those were compensating for the undersized root and would
  otherwise outweigh the `body-md` card headings. Roles now sit in correct hierarchy.
- Spot-checked dashboard, applications (dense table), candidate 360 — no overflow,
  layouts intact.

---

## Kinetic bounce — friction model (subtle, never sticks at peak)

**Files:** `components/layout/kinetic-bounce.tsx`

The continuous rubber-band *held* the band extended for as long as wheel/momentum events
kept arriving, so it read as too strong and lingered at the peak. Replaced the
hold-then-spring with a **per-frame friction decay**: a push adds a small impulse and a
rAF loop eases the offset back toward 0 every frame, so it recedes immediately — even
mid-momentum it sits low (~6px) instead of pinning at the max, and returns to 0 within
~120ms of the push stopping. Max travel cut 26→**16px**, sensitivity 0.18→0.12. Touch
keeps a damped finger-follow and decays on release. Still no-ops under
`prefers-reduced-motion`.

---

## Kinetic bounce — snappier + extended to chrome-less flows

**Files:** `components/layout/kinetic-bounce.tsx`, `views/adpnc-portal.tsx`,
`views/project-upload.tsx`

- **Less strong, snappier**: max travel 46→**26px**, sensitivity 0.28→**0.18**, stronger
  resistance (0.55→0.7), and a faster return — spring **0.34s→0.19s**, release idle
  90→**60ms**, glow fade 0.42→0.24s. The band now snaps back quickly so users get the
  feedback without it getting in the way of their task.
- **Extended beyond the main app chrome**: added `KineticBounce` to the `Shell`-less
  flows — the AD(P&C) token **portal** and the mentor project **upload** page. New
  `fullBleed` prop positions the edge bloom at the true viewport edges (the default
  insets past the sidebar/topbar for in-Shell pages).

---

## Kinetic bounce — continuous, repeatable, both edges

**Files:** `components/layout/kinetic-bounce.tsx`

Reworked the wheel path from a one-shot bounce into a **continuous rubber-band**, fixing
three issues:
- **Repeatable** — was locked to one bounce per gesture and only re-armed after the wheel
  went fully idle (trackpad momentum prevented that, so it felt like "once"). Now every
  outward push pulls the band and it springs back when the push stops, re-triggering
  immediately.
- **Both edges** — dropped the `fromMiddle` guard that suppressed the bounce whenever an
  edge was reached by scrolling through the middle (i.e. always, for the bottom). Bottom
  now bounces like the top.
- **Constant feedback everywhere** — already global via `Shell`; now also overscrolls on
  pages too short to scroll (both edges register), so users always get end-of-content
  feedback. The edge bloom’s intensity tracks the pull and fades on release.
- Damped resistance curve (the further you push, the less it gives); springs over ~0.34s.
  Still no-ops under `prefers-reduced-motion`. Touch keeps its damped finger-follow.

---

## Kinetic bounce — add a subtle on-brand edge bloom

**Files:** `components/layout/kinetic-bounce.tsx`

The overscroll bounce was pure motion ("no visual indicator"). Added a delightful,
restrained **edge bloom** as the end-of-scroll cue:
- A soft **teal → blue radial glow** (brand `--toa-teal` / `--toa-blue`) blooms from
  whichever edge you push against, then fades.
- **Wheel**: one-shot bloom (fade up ~32% → out over 540ms) fired with the bounce.
- **Touch**: the glow tracks the finger — intensity scales with pull distance — and
  fades on release, alongside the existing damped finger-follow.
- Glows are `position: fixed` within the content area (offset past the sidebar/topbar:
  `top-[64px]`, `md:left-[112px]`), `pointer-events-none`, `aria-hidden`, invisible at
  rest.
- Honours `prefers-reduced-motion` — the whole effect (bounce + bloom) no-ops.

---

## Brand layer — atmosphere on-brand ("Dynamic Minimalism")

**Files:** `app/globals.css`, `public/brand-atmosphere.svg` (new)

Applied the DSTA 1DSTAExp brand guide to the page background, as a **brand layer above
PRIZM** (PRIZM tokens untouched — brand lives in `--toa-*`).
- **Brand palette tokens** added: `--toa-blue` (Vista #4480DB), `--toa-teal` (Teal
  #36D1B5), `--toa-green` (Emerald #5BCB85), `--toa-navy` (Prussian #141C4A).
- **Body atmosphere rebuilt** to the guide's "Dynamic Minimalism": luminous **analogous
  blue → teal → green** radial glows over `brand-atmosphere.svg` — faint orbital
  trajectories, orbit arcs and two luminous nodes (the guide's signature motif).
- **Removed** the old blueprint dot+line "viewfinder" grid (it keyed off the PRIZM accent
  and read more techy-blueprint than brand).
- `--toa-brand-gradient` (avatars/sign-in) re-pointed to brand **Yale → Teal02**
  (`27 67 146 → 0 148 121`), kept dark enough for white initials (large-text 3:1).
- Static + `background-attachment: fixed`; no motion (reduced-motion safe).
- Tuned the glow opacities (~0.20–0.26) and SVG stroke/node opacities (~0.24–0.30 /
  0.45–0.5) so the brand canvas is clearly apparent in the gutters and open areas
  (e.g. the dashboard) while staying behind the opaque content cards.

---

## Candidate 360 — quieten the re-rank cues (Mobbin leaderboard pattern)

**Files:** `views/candidate360.tsx`

The previous rank# + Δ-chip + "live" badge added visual noise. Pared back to the
restrained pattern mature leaderboards use (Uxcel / Duolingo / Brilliant on Mobbin):
- **Removed** the persistent "Re-ranks list live" badge and the per-row ↑/↓ delta chips.
- **Rank number** kept but quieted to a single muted numeral in a left gutter (no "#"
  prefix) — the title is now the only bold element per row.
- **fit% moved to the right**, paired with the Recommend action (score-on-the-right
  leaderboard convention), so the two numbers no longer stack in one gutter.
- Movement is now shown by a **brief, subtle row highlight** on cards whose rank
  changed (fades over ~700ms; honours `prefers-reduced-motion`) instead of numeric
  deltas — plus the existing FLIP travel.
- The polite `aria-live` announcement (new top fit) is retained — zero visual cost.
- List is now a semantic `<ol>`.

---

## Candidate 360 — make live re-ranking discoverable (rank #, Δ cue, live status)

**Files:** `views/candidate360.tsx`

The FLIP reorder works, but dynamic movement is jarring if users don't expect it.
Three PRIZM-token / a11y-safe signals now make the motion legible (extracted into a
new `FitRankedList` component that owns the FLIP + cues):
- **Explicit rank numbers (#1–#N)** on each card — a zero-motion anchor so the list
  reads as a *ranking*; movement now means "the ranking updated", not "things jumped".
- **Transient ↑/↓ delta chip** on any card whose rank changed (fades after ~1.8s;
  green/up, muted/down) — explains *why* a card moved. `aria-hidden` (the info is
  also announced; see below); the fade is `transition-opacity`, neutralised under
  `prefers-reduced-motion`.
- **Anticipatory "Re-ranks list live" pill** on the Score-weighting control — tells
  users *before* they drag that adjusting it reorders the list below.
- **Polite `aria-live` announcement** ("List re-ranked. Best fit now …") so
  screen-reader users get the outcome they can't perceive visually.

---

## Candidate 360 — live rank motion (FLIP) + correct "Open application" target

**Files:** `views/candidate360.tsx`

- **Programme-fit cards now animate to their new rank** when the score weighting
  re-sorts them, instead of jumping. New `useFlipReorder` hook does a FLIP
  (First-Last-Invert-Play) via the Web Animations API: moved rows are snapped to
  their old position and glided to the new one.
- **Consistent motion language**: reorder travel is defined once via `FLIP_DURATION`
  (280ms) + `FLIP_EASING` (`cubic-bezier(0.22, 1, 0.36, 1)`, a decelerate curve) —
  longer than PRIZM's 150ms state-change timing because a full-row translation reads
  better with more travel. Reusable for any future live-reranking list.
- **Honours `prefers-reduced-motion`**: WAAPI isn't covered by the global
  reduced-motion CSS (which only neutralises CSS transitions/animations), so the hook
  gates on `matchMedia('(prefers-reduced-motion: reduce)')` and skips the animation.
- The hook runs after every commit and animates only rows that actually moved
  (`|Δy| ≥ 1px`), so unrelated re-renders are a cheap no-op. Called before the
  component's early returns to keep hook order stable.
- **"Open application" header button** now opens the candidate's own application
  page (`/shortlist/{id}`) instead of the applications list (`/applications`).

---

## Candidate 360 — Ask-AI conversation pattern, FAB removed

**Files:** `views/candidate360.tsx`

- **Removed the floating chat FAB** entirely (and its `chatOpen` / `chatInput` /
  `chatEndRef` state). Ask-AI is no longer a separate floating surface — the whole
  interaction lives inside the AI summary card.
- **Conversation thread redesigned** to match the supplied reference:
  - The thread now renders **above** the Ask AI row (most recent context first),
    not below the composer.
  - User turns show a **"YOU ASKED"** uppercase accent eyebrow + the question in a
    right-aligned accent bubble.
  - AI turns lead with the sparkle, then the answer, then **Sources** chips
    (Application form / Academic transcript, `FileText` icon) and a **Helpful?**
    Yes/No control (`ThumbsUp`/`ThumbsDown`, toggled via new `feedback` state,
    `aria-pressed`).
- **Prompt chips updated** to `Why is {first} a strong match?` /
  `Any interview feedback?` / `What are the risks?`.

---

## Activity log → MUI Stepper (PRIZM has no stepper)

**Files:** `views/candidate360.tsx`, `docs/mui-usage.md`, `package.json`

- The "Activity this cycle" timeline now uses **MUI's vertical `Stepper`**, restyled
  to PRIZM tokens — PRIZM 4.0 has no stepper component, so MUI is the sanctioned
  fallback (component order: PRIZM/Radix → MUI restyled → hand-build).
- Restyle: `PrizmStepConnector` (2px `--color-border` line), `StepIconComponent`
  overridden with the PRIZM tone-dot + lucide icon, labels on PRIZM type tokens — no
  Material palette/elevation.
- Added deps: `@mui/material` (v6), `@emotion/react`, `@emotion/styled` (client-side
  only). **All MUI usage is documented in `docs/mui-usage.md`.**
- Standing rule going forward: use MUI for components PRIZM lacks, restyle to PRIZM,
  and record each use in `docs/mui-usage.md`.

---

## Candidate 360 — standalone page, AI-card & header cleanup, PRIZM type sweep, inline AI

**Files:** `views/candidate360.tsx`, `app/globals.css`, `components/layout/topbar.tsx`

### Structure
- **Candidate 360 is now a single standalone page**, not a dual-mode overlay. Removed
  the intermediate "journey landing" mode, the `mode`/`setMode` state, the
  "Back to journey" header control, and the now-unused `JourneyRow`/`JourneyPopover`
  components (~240 lines). The breadcrumb (Applications › Name) is the way back;
  `openApp` now only swaps which application is viewed.
- Identity header CTAs vertically centred (`items-center`).

### AI summary card
- **Opaque** light-blue fill restored with the attention glow (new
  `--color-accent-subtle` token — an opaque ~6% accent surface; the previous
  translucent tint let the background grid bleed through).
- Title is a plain card heading again (sparkle + text), no longer a pill that
  mimicked the **Ask AI** action; Ask AI is a tinted accent affordance, not a
  solid primary fill.
- Supporting facts are plain text rows — **no decorative icon bullets**.
- Removed the always-on "Show more" and the per-factor sub-score bars (those
  sub-scores live only in the Programme-fit card now; the AI card's bars were a
  duplicate and the source of misleading `0`s).
- **Ask AI answers render inline in the card** (conversation thread) instead of
  opening the floating chat FAB.
- Keyboard hint is device-aware (`⌘↵` on Mac, `Ctrl+↵` elsewhere).

### Score-weighting allocation bar
- Distinct interaction states on the drag handles: rest → hover (soft accent
  halo) → focus (medium halo) → active/grabbing (solid accent fill + white grip).
- Lit (active-pair) segment toned down (`/80`) so it no longer merges into the
  solid Discipline segment.

### Activity log
- Renamed **"This cycle · activity log" → "Activity this cycle."**
- Continuous connector line (spacing moved off the card margin onto the stretched
  flex item, matching the DSTA Journey timeline).
- Semantic colour fix: "Eligibility check passed" now uses `success` (was neutral grey).

### Consistency / design-system
- **Header icons removed** from all card/accordion titles except the meaningful
  ones (AI sparkle, IM8 shield on Personal particulars); every header is now a
  consistent title + optional right-side meta/badge.
- **PRIZM type-scale sweep**: replaced arbitrary `text-[11/12/13px]` with role
  tokens (`caption`/`body-sm`/`body-md`); kept the deliberate 22px name / 18px
  avatar display sizes.
- "Open application" header button is now **secondary (outline)**, not ghost.

### Chrome
- Topbar title left margin fixed (`md:pl-[136px]` — a clean fixed gutter past the
  112px rail), independent of the centred body content.

---

## Previously committed on this branch
- `85de67a` feat(layout): brand atmosphere background, 1440px max-width, kinetic overscroll bounce
- `b1c4a40` feat(candidate360): open-to-record, allocation-bar weighting, AI sparkle, a11y/PRIZM QA
