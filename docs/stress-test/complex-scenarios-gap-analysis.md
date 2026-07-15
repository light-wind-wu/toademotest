# TOA Internship Prototype — Complex Scenarios Gap Analysis

Source: `TOA_Claude_Upload_Pack` stress-test catalogue (195 scenarios). This doc covers the
**49 "Complex Flow" scenarios**, prioritising the master-prompt focus areas: IO eligibility
screening, AI project matching, slot reservation/release, rematching after interview failure,
project invalidation, and offer/onboarding dependencies.

Verdict legend: **Supported** (works today) · **Partial** (exists but incomplete) · **Gap** (missing).
"Smallest change" = frontend/localStorage-state change (this is a no-backend mock).

---

## Implemented this session (all QA'd in preview, tsc clean)

| Scenario | Fix | Commit |
|----------|-----|--------|
| TOA-178 | PII-reveal reason already mandatory (verified Supported) | — |
| TOA-070 | Grey-case eligibility override (required reason, audited) | `bd16b97` |
| TOA-143 | Security clearance as a parallel tracked step | `b8637e6` |
| TOA-130 | Start-date change review (duration/conflict context + note) | `54e4c10` |
| TOA-084 | Capture override reason when shortlisting off AI top fit | `d587cd9` |
| TOA-090/124 | Rematch to next preference after interview failure | `8bcba49` |
| TOA-045/046 | File upload type + size validation on the application form | `77da088` |
| TOA-133 | Recover a lapsed offer (re-send / close) instead of stranding it | `b6f59b8` |
| AUG-004/TOA-050 | Gate applicant↔staff route boundary for signed-in users | `51589de` |
| TOA-025/AUG-032 | Flag mid-pipeline candidates when their project is archived | `59032c1` |
| TOA-064/TOA-063 | Enforce GPA rules built in the rule builder ('at least' was silently not enforced); inclusive boundary | `9681114` |
| TOA-007/AUG-021 | Warn + offer re-screen when eligibility criteria change after applications | `9741996` |
| AUG-052/TOA-100/117 | Gate Candidate 360 to a mentor's own candidates (no URL-hop to others' PII) | `8150ade` |
| AUG-023 | Surface IO eligibility/match overrides to the Director (read-only oversight) | `97571d8` |
| TOA-063 | Institution-specific GPA thresholds in the rule builder (NUS/NTU/SUTD 4.0, SMU 3.4) | `69960ca` |
| TOA-072/AUG-140 | Withhold auto-rejection for the configured delay (~3 days), with held/sent + "Send now" | `d5e0c12` |
| AUG-141 | Enforce the mandatory citizenship gate (was a silently-dead rule) | `0cbc867` |
| TOA-053/AUG-130 | Provisional-results applicants are conditional (IO review), not auto-rejected | `b48090d` |
| AUG-102 | Tech UP programmes auto-pass eligibility (matching only) | `fb1d24d` |
| TOA-067 | Subject-label variants unified — best-grade-wins in discipline scoring | `9ae3ede` |
| AUG-101 | Atypical university year-of-study flagged for case-by-case review | `e905244` |
| TOA-027/078 | Duration + mentor-blackout availability warnings on the shortlist | `2cdb923` |
| AUG-132 | Remind provisional-results applicants to upload final grades | `984ea79` |
| TOA-068/AUG-150/151 | Admin-configurable recognised-subject taxonomy (self-service + audited) | `5d41b18` |

> **Grounding:** the authoritative DSTA HR requirements doc (`Requirements for NTT-updatedBySheryll.docx`, saved to memory) confirms several shipped fixes map to explicit requirements — TOA-090/124 rematch ("Project Shortlisting flexibility"), TOA-025 archive ("Ad-hoc projects added/invalid"), TOA-063 the concrete NUS/NTU/SUTD 4.0 · SMU 3.4 thresholds — and makes the backlog concrete: TOA-072 auto-reject **~3 days**, TOA-027/078 duration+blackout (Tech UP), TOA-068 admin-configurable taxonomy, TOA-067 math-variant unification (YDSP), TOA-053 provisional vs final results, per-category preference counts (Uni 2–3 / Tech UP 5 / YDSP 2 + write-up).

**Verified already-Supported (no change needed):** TOA-082/086 + AUG-034 (shortlist/override control disabled when a project has 0 open slots — can't over-fill or override to a full project), TOA-004/AUG-005 (programme Close-before-Open date validation), TOA-039 (min-preferences), TOA-040 (duplicate ranking), TOA-194/AUG-051 (audit log is append-only — no delete/edit API exists), AUG-033 (offer decline → 'Offer Declined' frees the inferred reservation), AUG-041/TOA-142 (onboarding bank account validated `/^\d{6,}$/` + required name gating submit), AUG-071 (zero-weight scoring guarded — returns base score, no NaN), AUG-072 (scoring inputs are discipline/skills/standing only — no name/gender/race/age), AUG-050 (applicant hitting a staff route is bounced by the route-boundary gate above), AUG-001 (signed-out deep-link to a staff page → `/login/staff`, no content leak), AUG-061 (notification/URL to a deleted record → graceful "Applicant not found", no crash).

> **Known minor (flagged, not yet fixed):** `RuleRow` in `programme-form.tsx` passes an array value to a single `<select>` for array-valued rule types (citizenship "is one of"), producing a benign React console warning when the criteria builder is open. Pre-existing; spun off as a separate task.

---

## Top P1 gaps (build backlog, ranked)

| # | Scenario | Area | Verdict | Smallest fix | Status |
|---|----------|------|---------|--------------|--------|
| 1 | TOA-178 | Field access / IM8 | **Supported** (verified) | Reveal reason already mandatory (`confirmReveal` guards `!effectiveReason`; confirm disabled). Residual: per-field role masking granularity (minor enhancement) | ✅ |
| 2 | TOA-070 | Eligibility screening | Gap | **Grey-case override**: IO overrides an ineligible/auto-rejected applicant with a required reason → audited, status→Pending Review | ✅ `bd16b97` |
| 3 | TOA-143 | Onboarding deps | Gap | **Security clearance** as a tracked parallel step (start after shortlist, independent of interview/offer) | ✅ `b8637e6` |
| 4 | TOA-130 | Offer deps | Gap | **Start-date change review** shows project duration/end context + warns on conflict + audited decision note | ✅ `54e4c10` |
| 5 | TOA-087 | Slot reservation | Partial | **Release reserved slot** action (free an Offer-Extended reservation without rejecting the applicant) | ☐ next |
| 6 | TOA-084 | AI matching | Partial | **Capture override reason** when IO shortlists a project that isn't the AI's top fit → audited | ✅ `d587cd9` |
| 7 | TOA-092 | Rematching | Gap | **Applicant re-rank flow** when preferred projects become full/archived (`Re-rank Requested` status) | ☐ |
| 8 | TOA-027 / 078 | Matching | Gap | Factor **availability/duration/blackout** into suitability + soft-warn IO | ☐ |
| 9 | TOA-114 | Interview | Gap | **Interviewer replacement** (`interviewMentorId` override + notify) | ☐ |
| 10 | TOA-068 | Screening config | Gap | IO-editable **recognised-subject taxonomy** (move out of hardcode → admin + audit) | ✅ `5d41b18` |
| 11 | TOA-063 | Screening | Partial | **Institution-specific GPA thresholds** in the eligibility rule builder | ☐ |
| 12 | TOA-066 / 067 | Screening | Partial | Subject **compulsory-vs-optional** + **math-variant taxonomy** unification | ☐ |
| 13 | TOA-101 | Matching governance | Partial | **Cross-PC match** confirmation + badge (IO scoped by PC) | ☐ |
| 14 | TOA-123 | Interview | Partial | **External interview** mode (record outcome without in-system scheduling) | ☐ |
| 15 | TOA-072 | Notifications | Partial | **Enforce** the configured auto-reject notification delay (withhold for batch review) | ☐ |

---

## Per-scenario detail (priority set)

### B2 Eligibility Screening
- **TOA-063 — Institution-specific GPA thresholds** · *Partial*. `evalRule()` checks a flat `gpa >= X`; `calcStandingScore` only varies scale by track (poly /4, else /5). No per-institution thresholds. Fix: add an "Institution(s)" qualifier to the GPA rule in `programme-form.tsx`; `evalRule` applies the threshold only to matching schools.
- **TOA-066 — Missing-subject handling** · *Partial*. `calcDisciplineFitFromSubjects` counts present subjects, no penalty for absent. No compulsory flag. Fix: add `compulsory` to `DISCIPLINE_SUBJECTS` entries; missing compulsory → hard penalty/null.
- **TOA-067 — Math label variance** · *Partial*. Subjects matched by string inclusion; multiple math labels (H1/H2, I–VI, Additional) not unified or aggregated. Fix: a `SUBJECT_TAXONOMY` canonical map; normalise + best-grade-wins.
- **TOA-068 — Self-service subject taxonomy** · *Gap*. `DISCIPLINE_SUBJECTS` is hardcoded; only generic dropdowns are admin-editable, and criteria edits aren't audited. Fix: move the mapping to localStorage + an admin panel; `logAccess` on change.
- **TOA-070 — Grey-case override** · *Gap*. Any failed criterion → immediate `Auto-rejected`, terminal, no structured override/audit, no mandatory-vs-preferred severity. Fix: severity on rules; override dialog (required reason) → `eligibilityPass=true`, status→Pending Review, audited.
- **TOA-072 — Withheld reject notifications** · *Partial*. `autoRejectDelayDays` exists in admin automation but is never enforced; rejections fire immediately. Fix: don't send on screening; an IO-triggered/daily sweep sends after the delay.

### B2 Matching & Slots
- **TOA-027 / TOA-078 — Availability/duration/blackout** · *Gap/Partial*. `scoreSuitability` = discipline+skills+standing only; `internshipDuration` is informational; no availability/blackout fields. Preference ranking is display order, not a factor. Fix: add availability/duration/blackout to types; compute an availability factor + IO warning.
- **TOA-084 — Override AI top rec** · *Supported, missing reason*. IO can recommend/shortlist any project (manual), audited via `recordDecision`, but no "why" captured when overriding the top fit. Fix: prompt for a required reason when the chosen project ≠ AI #1; store + audit.
- **TOA-087 — Reserved-slot release** · *Partial*. Reservation is inferred from `Offer Extended` (`open = slots − matched − reserved`); no explicit release action short of rejecting/withdrawing. Fix: a "Release reservation" IO action that frees the slot without changing the applicant's terminal status.
- **TOA-092 — Re-rank when unavailable** · *Gap*. Rankings are immutable post-submit; no prompt when top projects fill/close. Fix: `Re-rank Requested` status + applicant re-rank modal.
- **TOA-101 — Cross-PC match** · *Partial*. IO can shortlist across PCs with no scoping/confirmation/badge. Fix: optional IO PC scope; cross-PC confirm + badge + audit.

### B3 / B4 / B5 — Interview, Offer, Onboarding, Access
- **TOA-114 — Interviewer replacement** · *Gap*. One immutable `mentorUserId` per project; no panel/backup, no reassignment. Fix: `interviewMentorId` override + access check + notify both mentors.
- **TOA-123 — External interview** · *Partial*. Transcript/notes upload + direct "Interview Completed" exist, but no explicit external mode or partner field. Fix: `interviewMode: 'standard' | 'external'`; record-outcome card that skips slot proposal.
- **TOA-130 — Start-date change validation** · *Gap*. IO approves any requested date with no programme-timeline/project-duration context and no decision note. Fix: surface programme `start–end` + project duration, warn on conflict, optional approval note → audit.
- **TOA-143 — Security clearance** · *Gap*. Only a generic `preOfferChecks` gate; no clearance status, can't start early/parallel. Fix: `securityClearance: { status, startedDate?, completedDate?, notes? }`; "Initiate clearance" after shortlist, tracked independently.
- **TOA-178 — Field-level access / PII** · *Partial*. `ProtectedField` + `CAN_REVEAL_PII` + reveal-reason modal + audit all exist and mentors/applicants are correctly blocked — **but the reveal reason is not actually enforced** (you can confirm with no reason). Fix: make reason mandatory (disable confirm until selected).

---

## Cross-cutting findings (the "produce" list)

**Missing/weak state-machine pieces**
- No explicit **reserved → released** slot transition (reservation inferred from status).
- No **`Re-rank Requested`** applicant status; rankings immutable post-submit.
- **Security clearance** is not a first-class parallel track; pipeline is rigidly sequential (Shortlist → Interview Scheduled → Completed → Offer) with no off-ramps for parallel processes.
- Eligibility is **binary/terminal** (`Auto-rejected`) with no mandatory-vs-preferred severity or override path.

**Missing permissions / audit**
- PII reveal reason **not enforced** (TOA-178) — the one true security gap.
- Programme **criteria edits** and **eligibility overrides** are not audited (audit currently covers record views/reveals/decisions in Candidate 360 only).
- No **IO↔PC scoping** of projects (cross-PC governance, TOA-101).

**Missing config / self-service**
- Subject taxonomy + discipline-subject mapping are **hardcoded** (TOA-067/068); not IO-editable.
- Institution-specific GPA thresholds not expressible in the rule builder (TOA-063).
- Configured **auto-reject notification delay** exists but is **never enforced** (TOA-072).

**Matching inputs not used**
- Availability, project duration, blackout dates, and preference-rank are absent from `scoreSuitability` (TOA-027/078).

---

## Implementation plan (this branch)
Building the smallest changes for the top P1 gaps in order, each QA'd before commit:
1. TOA-178 — mandatory PII-reveal reason (security).
2. TOA-070 — grey-case eligibility override (IO screening).
3. TOA-143 — security-clearance tracking (onboarding dependency).
4. TOA-130 — start-date change review context + note (offer dependency).
5. TOA-087 — release reserved slot (slot reservation/release).
… then continue down the backlog as time allows.
