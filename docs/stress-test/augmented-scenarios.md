# TOA Stress Test — Augmented Scenarios (Claude-authored)

Additional scenarios beyond the 195-row catalogue, biased toward (a) edge cases the
catalogue under-covers and (b) the surfaces recently built in this prototype
(auth/session gate, onboarding, application withdraw, eligibility/match overrides,
security clearance, programmes browse). Same columns as the source catalogue.
IDs prefixed `AUG-`. Priority: P1 = must-handle, P2 = should, P3 = nice.

> Implemented ones link the commit. The rest feed the backlog.

## Auth / session (the new /login gate)
- **AUG-001 [P1] Edge — Deep-link while signed out.** Pre: no session; user opens `/candidate360/APP-0004`. Expected: auth gate redirects to the matching login (staff console), preserving intent; after sign-in lands on the role home (not the deep link, since identity drives routing). Stress: gate ordering, no flash of protected content.
- **AUG-002 [P1] Exception — Session lost mid-application.** Pre: applicant is on step 3 of the form; session cleared (timeout). Expected: draft is preserved (localStorage draft), gate sends to Singpass login, resuming returns to the saved step. Stress: draft persistence vs session, no data loss.
- **AUG-003 [P2] Edge — Role-switch demo control changes identity mid-task.** Pre: IO has an unsaved modal open; uses the demo role switcher. Expected: unsaved-changes guard warns before navigating away; session stays signed in. Stress: unsaved-changes integration with the switcher.
- **AUG-004 [P2] Negative — Applicant reaches a staff route post-login.** Pre: signed in as applicant; navigates to `/applications`. Expected: shell gate redirects applicants away from staff routes (currently the gate only redirects the *signed-out*; signed-in cross-role access isn't blocked — GAP to consider).
- **AUG-005 [P2] Security — Sign-out leaves no protected data on screen.** Pre: IO viewing a revealed NRIC; signs out. Expected: redirect to login; on re-entry, fields are re-masked (reveal state not persisted). Stress: PII reveal lifecycle.

## Application form
- **AUG-010 [P1] Edge — Rank the same project twice.** Pre: applicant adds project A to preferences, tries to add A again. Expected: duplicate is prevented (already in list). (covers TOA-040)
- **AUG-011 [P1] Edge — Submit with zero preferences.** Pre: ranking step, no projects selected. Expected: submit blocked with a clear message; cannot proceed. (covers TOA-039)
- **AUG-012 [P1] Edge — Upload oversized / wrong-type file.** Pre: CV upload > limit, or `.exe`. Expected: rejected with a specific error; no state corruption. (covers TOA-045/046)
- **AUG-013 [P2] Edge — Reopen a submitted programme's form by URL.** Pre: applicant already submitted to PROG-X; opens `/apply/PROG-X`. Expected: it detects the existing submission and offers to view it rather than starting a fresh duplicate (covers TOA-058 dup-application).
- **AUG-014 [P2] Edge — Provisional results flagged.** Pre: applicant has no final grades. Expected: a "provisional" flag captured; screening treats it as conditional, not a hard fail (covers TOA-053).

## Eligibility / screening
- **AUG-020 [P1] Edge — GPA exactly at threshold.** Pre: threshold 3.50, applicant 3.50. Expected: inclusive (>=) pass, deterministic. (covers TOA-064)
- **AUG-021 [P1] Edge — Eligibility edited after applications received.** Pre: programme has screened applicants; IO edits a rule. Expected: warn that existing results won't retro-change unless re-screened; offer "re-screen affected". (covers TOA-007/074)
- **AUG-022 [P2] Edge — Override then the candidate withdraws.** Pre: IO overrode eligibility (AUG/TOA-070); applicant withdraws. Expected: override record retained for audit; status moves to Withdrawn cleanly.
- **AUG-023 [P2] Audit — Override visible to Director.** Expected: eligibility/match overrides surface in the Director's oversight (or at least the audit), not just the IO's Candidate 360.

## Matching / slots / rematch
- **AUG-030 [P1] Exception — Rematch after interview failure.** Pre: candidate fails the interview for project A but has ranked B/C. Expected: IO can move the candidate to the next preference (re-enter the pipeline for B) instead of only rejecting. (covers TOA-090/124) — master-prompt priority.
- **AUG-031 [P1] Edge — Shortlist to a full project.** Pre: project A has 0 open slots. Expected: the shortlist control is disabled / warns; can't over-fill. (covers TOA-082/086)
- **AUG-032 [P1] Exception — Project archived after candidates shortlisted.** Pre: candidates shortlisted to A; A is archived. Expected: those candidates are flagged "project withdrawn — rematch needed", not silently orphaned. (covers TOA-025)
- **AUG-033 [P2] Edge — Reserved slot released on offer decline.** Pre: candidate had Offer Extended (slot reserved); declines. Expected: the reserved slot frees automatically for others. (relates TOA-087)
- **AUG-034 [P2] Edge — Match override to a project that is full.** Pre: IO overrides AI top to choose project B which has 0 slots. Expected: blocked or warned (don't reserve a non-existent slot).

## Offer / onboarding
- **AUG-040 [P1] Edge — Offer expires with no response.** Pre: offerDeadline passed, no response. Expected: surfaces as "Offer expired" to IO with a re-offer/close action; not stuck in Offer Extended forever. (covers TOA-133)
- **AUG-041 [P1] Edge — Invalid bank details at onboarding.** Pre: account number non-numeric/too short. Expected: blocked with inline error (already enforced in apply-onboarding — verify). (covers TOA-142)
- **AUG-042 [P2] Exception — Start date requested after internship end date.** Pre: requested start ≥ end. Expected: the date-change review warns (built in TOA-130) — verify the warning triggers.
- **AUG-043 [P2] Exception — Accept then withdraw before onboarding done.** Pre: Offer Accepted, onboarding incomplete; applicant withdraws. Expected: clean transition; slot released; mentor/IO notified. (covers TOA-131)
- **AUG-044 [P2] Security — Onboarding bank/NRIC treated as sensitive.** Expected: onboarding PII isn't shown to the mentor; only IO/AD see it (currently mentor sees a summary on Confirm Onboarding — check scope). (relates TOA-147)

## Access / audit / security
- **AUG-050 [P1] Negative — Access another applicant's record by URL.** Pre: applicant signed in; opens `/apply/feedback/<someone-else-id>` or `/candidate360/<id>`. Expected: blocked / not-found (applicant can only see their own; candidate360 is staff-only). (covers TOA-050)
- **AUG-051 [P1] Audit — Audit log cannot be deleted/edited.** Expected: no UI affordance to delete access-log entries; they are append-only. (covers TOA-194)
- **AUG-052 [P2] Edge — Mentor sees only assigned candidates.** Expected: a mentor opening a non-assigned candidate is blocked. (covers TOA-100/117)
- **AUG-053 [P3] Edge — Idle session timeout.** Expected: after inactivity, session expires and the next action routes to login. (relates TOA-186)

## Data integrity / concurrency (localStorage mock realities)
- **AUG-060 [P2] Edge — Two roles edit the same candidate.** Pre: IO and (demo-switched) mentor act on the same app. Expected: last-write-wins is acknowledged; no crash; ideally a stale-state notice (mock limitation to document).
- **AUG-061 [P2] Edge — Notification points to a withdrawn/deleted record.** Expected: following the link lands gracefully (empty state), not a crash.
- **AUG-062 [P1] Edge — Seed-version bump wipes edited demo data.** Expected: bumping the applications seed version resets demo state predictably (documented behaviour, with a console note) — avoid silent data loss surprises.

## AI explainability
- **AUG-070 [P1] Edge — Suitability with no component data.** Pre: a candidate whose scores lack raw components. Expected: weight slider still re-ranks (fixed earlier via backfillScoreComponents) — verify across seed.
- **AUG-071 [P2] Negative — Weights all zero.** Pre: IO drags all weight to one factor / zero others. Expected: scores remain finite and ranked (no NaN/divide-by-zero). (relates TOA-095)
- **AUG-072 [P2] Negative — AI must not use prohibited attributes.** Expected: scoring inputs are discipline/skills/standing only — no name/gender/race/age. (covers TOA-096) — verify by inspection.

## Presentation / a11y / localization
- **AUG-080 [P3] Edge — Very long names / titles overflow.** Expected: truncation with title tooltips, no layout break.
- **AUG-081 [P3] Localization — Date format consistency.** Expected: dates render en-SG consistently across screens (some mix DD MMM YYYY vs ISO) — document inconsistencies.

---

# Batch 2 — derived from the DSTA HR requirements doc (`Requirements for NTT-updatedBySheryll.docx`)

These scenarios encode the authoritative requirements as test cases. Many pin down concrete
numbers the earlier catalogue left open. IDs `AUG-1xx`.

## Per-category matching rules
- **AUG-100 [P1] Edge — University institution-specific GPA.** Pre: GPA cut-off NUS/NTU/SUTD ≥ 4.0, SMU ≥ 3.4. Expected: an NUS 3.9 fails, an SMU 3.5 passes, an unlisted school isn't GPA-gated. (covers TOA-063) ✅ `69960ca`
- **AUG-101 [P2] Edge — Year of study weighting.** Pre: Year-3 vs Year-1 university applicants. Expected: Year-3 is the typical target; other years are flagged "case-by-case" for the IO rather than auto-passed/failed.
- **AUG-102 [P1] Edge — Tech UP applicants are all eligible.** Pre: a Tech UP programme. Expected: every applicant is pre-screened/inducted → eligibility auto-passes; only project matching (discipline + skills + duration) applies. No eligibility auto-reject for Tech UP.
- **AUG-103 [P1] Edge — Tech UP ranks up to 5 projects.** Expected: the ranking step allows up to 5 preferences (vs Uni's 2–3), enforced per category.
- **AUG-104 [P1] Exception — Duration mismatch vs project min duration / blackout.** Pre: applicant's available window is shorter than a project's minimum duration, or overlaps a mentor blackout. Expected: matching de-prioritises / soft-warns the IO; not a hard auto-match. (covers TOA-027/078)
- **AUG-105 [P2] Edge — Brainhack / competition priority boost.** Pre: two similar candidates, one a Brainhack participant. Expected: the competition signal raises suitability/priority (explainable in the score reasoning).
- **AUG-106 [P2] Edge — Relevant experience fallback to project skills.** Pre: applicant has no prior internship. Expected: skills picked up from school/personal projects are used instead — no null-penalty for missing internship.

## YDSP specifics
- **AUG-110 [P1] Edge — YDSP subject-grade conversion table.** Pre: letter grades A–D mapped to points/marks/GPA per the doc table. Expected: grades convert consistently for eligibility.
- **AUG-111 [P1] Edge — Math label variants unified.** Pre: subjects labelled "Mathematics 1/2", "Advanced Mathematics", "Core Mathematics". Expected: all matched on the "Mathematics" stem and the best grade counts. (covers TOA-067)
- **AUG-112 [P2] Edge — Partial subject combination.** Pre: student has Bio + Chem but no Physics. Expected: only the subjects the student has are counted/considered — no hard fail for an absent optional science.
- **AUG-113 [P1] Edge — YDSP ranks up to 2 projects + write-up.** Expected: max 2 preferences, each requiring a 100–200 word write-up that's routed to the mentor; submit blocked if a write-up is missing/out of range.
- **AUG-114 [P2] Edge — YDSP duration (min 2 weeks full-time).** Pre: a December full-time stint under 2 weeks. Expected: flagged as below the minimum attachment length.

## Qualification categories (Post-JC / Post-Poly / Poly / JC)
- **AUG-120 [P1] Edge — Dynamic fields per qualification type.** Pre: applicant selects A-Level / IB / NUS High / Poly Diploma / O-Level / Others. Expected: the form shows only the relevant academic fields + validation for that type.
- **AUG-121 [P1] Edge — A-Level subject structures.** Pre: 4×H2 / 3×H2+1×H1 / 3×H2 with compulsory H1 GP, Project Work, Mother Tongue. Expected: each structure validates; missing compulsory H1 is flagged.
- **AUG-122 [P1] Edge — NUS High GPA out of 5 vs Poly out of 4.** Expected: GPA scale is interpreted per qualification (÷5 vs ÷4), 2 dp; standing score normalises correctly across scales. (relates the existing track-based scaling)
- **AUG-123 [P2] Edge — "Others (overseas)" → manual review.** Pre: an overseas qualification. Expected: routed to manual review, not auto-rejected by a rule it can't satisfy.
- **AUG-124 [P2] Edge — O-Level English record presence.** Pre: poly applicant with/without O-Level (or NA-Level) English. Expected: English qualification captured and considered.

## Provisional vs final results
- **AUG-130 [P1] Edge — Apply before final results.** Pre: applicant ticks "provisional results". Expected: screening treats them as conditional (not a hard fail), and a different criteria set may apply. (covers TOA-053)
- **AUG-131 [P1] Exception — Replace provisional with final later.** Expected: the system lets the applicant upload final results that replace the provisional ones, then re-screens. (relates TOA-007/AUG-021 re-screen)
- **AUG-132 [P2] Edge — Reminder to upload finals.** Pre: Post-JC ~mid-Feb / Post-Poly ~mid–end-Mar. Expected: a reminder notification is queued/sent to applicants still on provisional results.

## Eligibility / rejection process
- **AUG-140 [P1] Edge — Rejection withheld ~3 days.** Pre: an applicant fails screening. Expected: the auto-rejection notification is NOT sent immediately; it's released ~3 days after application (configurable). (covers TOA-072)
- **AUG-141 [P1] Edge — Mandatory citizenship gate.** Pre: a non-citizen applicant. Expected: hard-fail on the Singapore-Citizen mandatory criterion regardless of academics.
- **AUG-142 [P2] Edge — Min academic per category is mandatory.** Expected: failing the category's minimum academic bar is a hard fail (mandatory, not preferred).

## Configurable filtering (admin self-service)
- **AUG-150 [P1] Edge — Admin edits criteria without NTT.** Expected: GPA cut-offs, subject classifications, recognised-subject lists and shortlisting logic are editable in the programme-creation page by DSTA admins (no code change). (covers TOA-068)
- **AUG-151 [P2] Audit — Criteria/taxonomy edits are audited.** Expected: changes to recognised subjects / thresholds are written to the access/audit log with actor + timestamp.
- **AUG-152 [P2] Edge — Add/remove a recognised subject mid-programme.** Expected: adding/removing a subject updates matching going forward and offers to re-screen (ties to AUG-021).

## Matching/offer constraints
- **AUG-160 [P1] Edge — Only one project offered.** Pre: a candidate suitable for multiple projects. Expected: at most one active offer/placement at a time — the others are not offered in parallel. (doc: "we can just offer one project")
- **AUG-161 [P1] Exception — 2nd-choice mentor declines to host (invalid project).** Pre: candidate routed to 2nd preference but that project is invalid / mentor won't host. Expected: IO can shortlist an alternative based on availability + skillset (not strictly the ranked next). (extends TOA-090/124)
- **AUG-162 [P2] Edge — Exhausted all preferences.** Pre: failed/again unmatched across all ranked projects. Expected: rejected at the end of matching, cleanly, once matching is done.

## AI CV extraction (University, on top of discipline + skills)
- **AUG-170 [P2] Edge — Extract prior internship / competitions / non-academic achievements.** Expected: these three fields are extracted from the CV and surfaced to the IO (with the usual "AI-estimated, may be inaccurate" caveat + override).
