# IA revamp — Phase 1 (nav shell)

Rebuilds the app's global navigation around the **TOA-handoff-3** information
architecture, mapped onto the routes that already exist in this (yzlee77) repo.
**Phase 1 introduces no new screens** — every nav destination points at a page
that already works for that role. New IA leaves/screens come in later phases.

Source of truth for the taxonomy: `/tmp/toa-handoff-3/toa/project/ia/*`
(`data.js` → `window.IA.INTERNAL` / `APPLICANT`, `shell.jsx`). Re-mapped against
the yzlee77 routes (the handoff Sitemap targets the diverged JH-NTT tree).

## What shipped

| Piece | Where |
|---|---|
| **Nav model** — `getNav(role, flags)` → rail sections (existing-route mapped) + groups; `buildSearchIndex`/`runSearch`; `isSectionActive`; `WORKSTREAMS` | `lib/ia-nav.ts` |
| **Role-aware rail** — 112px rail, workstream switcher, vertical section buttons, live action badges. **No flyout** (see below). On mobile, a **burger button** in the header opens a left slide-in **drawer** of the sections | `components/layout/ia-rail.tsx` |
| **Section tabs** — on a section's landing page, an on-page tab switcher for its groups (e.g. Projects → Projects / Project Requests; Admin → Templates / System Admin). Renders nothing for single-group sections. Keeps groups reachable on every viewport without a flyout | `components/layout/section-tabs.tsx` (rendered once in the shell, above page content) |
| **Cross-IA search** — topbar search spanning every section/group the role can reach; keyboard nav, hover-highlight, outside-click close | `components/layout/topbar.tsx` |
| **Shell wiring** | `components/layout/shell.tsx` (`IaRail` + `SectionTabs`; old `Sidebar` deleted) |

**No rail flyout.** The new design puts the group switcher *on the section's landing
page* as tabs (`SectionTabs`), so a rail flyout would duplicate it. Clicking a rail
section just navigates to its landing; the landing's tabs switch between groups. This
also means mobile needs no special handling for groups — the drawer lists sections, and
the landing tabs (which scroll horizontally) reach the groups on touch too.

## Section taxonomy per role (mapped to existing routes)

- **io-admin**: Dashboard `/dashboard` · Programmes `/programmes` · Projects `/projects` (flyout: Projects, Project Requests `/requests`) · Applications `/applications` · Internships `/interns` · Analytics `/analytics` · Admin `/admin` (flyout: Templates `/templates`, System Admin `/admin`)
- **io**: same, but the settings section is just **Templates** `/templates` (no system-admin access), and Projects has no Requests group.
- **mentor**: Dashboard `/mentor` · My Projects `/mentor/projects` · Candidates `/mentor/interviews` · My Interns `/mentor/interns`
- **ad-pnc**: Projects `/submissions`
- **director**: Approvals `/director`
- **applicant**: Apply `/apply` (pre-application) → Home `/apply/dashboard` + Applications `/apply/applications` once applied; Internship `/apply/internship` when active.

Live action badges (ported from the old sidebar) sum onto their section/flyout
group: IO applications/requests/interns, mentor pending/interviews/eval,
director approvals, applicant feedback.

## Verified

tsc clean; all six roles render the correct sections, route to working pages,
show correct badges; the Projects/Admin flyout lists its groups; cross-IA search
returns + navigates. (Hover flyouts can't be driven by synthetic events in the
preview harness — verified by invoking the real React handler; real-mouse hover
works.)

## Per-role dashboard action cards (done — IO + mentor)

`components/ui/dashboard-cards.tsx` renders the IA spec's `DASH_CARDS` as a "Needs
your attention" tile grid with **live counts** from localStorage (same data as the
rail badges), each tile navigating to its section. Added to the IO and mentor
dashboards above the existing widgets (additive — nothing removed).

- **IO/io-admin:** applicants to review · interviews to schedule · offers to generate ·
  internships in progress · project requests pending · change requests to review.
- **Mentor:** interviews assigned · feedback to submit · your interns · assessments due.
- **Director — intentionally skipped:** single page (the `/director` approval queue), so
  the spec's director cards (analytics/roster targets it can't reach) would be circular.
- **Applicant — intentionally skipped:** the applicant home already has a state-aware
  "Tasks" section (confirm interview, offer extended, onboarding, …) that is the
  applicant-card equivalent; adding `APPLICANT_CARDS` would duplicate it.

## Deferred to later phases

- The full IA **leaf** set (most are new screens) and the deep **Admin Settings**
  tree (`ia/flows-admin.jsx`): Access & permissions, Communications, Applicant
  experience, Workflow & approvals, Capacity & scheduling, System.
- Per-role IA **dashboard action cards** (`DASH_CARDS`) — the existing per-role
  dashboards already serve as the role landing pages; the IA card grid is a
  deliberate redesign for a later phase.
- Record-level search results (`pageData` rows) and Candidate-360-as-slide-over.
- Re-enabling/region for the Outreach & Scholarship workstreams.
