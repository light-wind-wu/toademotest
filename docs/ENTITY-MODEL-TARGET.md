# DSTA Portal — Target Entity Model (to-be)

_The cleaned-up model the consolidation builds toward. Compare with the current state in
[ENTITY-MODEL.md](./ENTITY-MODEL.md). Each change maps to a numbered issue from that doc._

## Target ER Diagram

```mermaid
erDiagram
    APPLICANT {
        string email PK "natural person key (NEW entity, fix #6)"
        string name
        string citizenship
        string track "education background"
    }
    EDUCATION_LEVEL {
        string label PK "Uni / JC / Poly / PostJC-Poly / YDSP"
    }
    PROGRAMME {
        string id PK
        string educationLevel FK "single level (was category[], fix #2)"
        string status "Draft/Active/Completed"
    }
    INTAKE_WINDOW {
        string id PK "embedded in Programme.intakeWindows[]"
        string start "MMMYY-derived"
        string end
    }
    PROJECT_REQUEST {
        string id PK
        string educationLevel FK "renamed from 'programme' (fix #1)"
        string uploadToken
    }
    SUBMISSION_BATCH {
        string id PK
        string uploadToken FK "= ProjectRequest.uploadToken"
        string educationLevel FK "canonical name (fix #2)"
        string programmeId FK "optional"
    }
    SUBMITTED_PROJECT {
        string id PK "embedded in SUBMISSION_BATCH.projects[]"
        string educationLevel FK "was preferredEducation/internCategory (fix #2)"
        string mentorUserId FK
        string reviewStatus "pending/approved/rejected"
    }
    PROJECT_ENTRY {
        string id PK
        string programmeId FK "Programme.id ('' = approved+unassigned)"
        string intakeId FK "IntakeWindow.id"
        string educationLevel FK "was internCategory (fix #2)"
        string mentorUserId FK
        string sourceSubmissionId FK "NEW — traceability (fix #3)"
        string sourceBatchId FK "NEW"
    }
    APPLICATION {
        string id PK
        string applicantEmail FK "→ Applicant (NEW, fix #5/#6)"
        string programmeId FK "Programme.id"
        string shortlistedFor FK "ProjectEntry.id"
        string_array projectRankings FK "ProjectEntry.id[] (ranked)"
    }
    SUITABILITY_SCORE {
        string projectId FK "ProjectEntry.id (embedded in Application)"
        number score
    }
    MENTOR {
        string mentorUserId PK "email / user id"
    }

    APPLICANT            ||--o{ APPLICATION        : "applicantEmail"
    EDUCATION_LEVEL      ||--o{ PROGRAMME          : "educationLevel"
    EDUCATION_LEVEL      ||--o{ PROJECT_REQUEST    : "educationLevel"
    EDUCATION_LEVEL      ||--o{ PROJECT_ENTRY      : "educationLevel"
    EDUCATION_LEVEL      ||--o{ SUBMISSION_BATCH   : "educationLevel"
    EDUCATION_LEVEL      ||--o{ SUBMITTED_PROJECT  : "educationLevel"
    PROGRAMME            ||--o{ INTAKE_WINDOW      : "has intakes"
    PROGRAMME            ||--o{ PROJECT_ENTRY      : "programmeId (0 = unassigned)"
    INTAKE_WINDOW        ||--o{ PROJECT_ENTRY      : "intakeId"
    PROJECT_REQUEST      ||--o| SUBMISSION_BATCH   : "uploadToken"
    PROGRAMME            ||--o{ SUBMISSION_BATCH   : "programmeId"
    SUBMISSION_BATCH     ||--o{ SUBMITTED_PROJECT  : "contains"
    SUBMITTED_PROJECT    ||--o| PROJECT_ENTRY      : "sourceSubmissionId (traceable)"
    PROGRAMME            ||--o{ APPLICATION        : "programmeId"
    PROJECT_ENTRY        ||--o{ APPLICATION        : "shortlistedFor"
    PROJECT_ENTRY        }o--o{ APPLICATION        : "projectRankings[]"
    APPLICATION          ||--o{ SUITABILITY_SCORE  : "scores per project"
    PROJECT_ENTRY        ||--o{ SUITABILITY_SCORE  : "projectId"
    MENTOR               ||--o{ PROJECT_ENTRY      : "mentorUserId"
    MENTOR               ||--o{ SUBMITTED_PROJECT  : "mentorUserId"
```

`MY_APPLICATION` is **removed** — the applicant-facing list becomes a projection of
`APPLICATION` filtered by `applicantEmail` (no separate stored array → no drift, fix #5).

## What changed vs current

| Fix | Change | Code impact | Breaking? |
|---|---|---|---|
| **#1** | `ProjectRequest.programme` → **`educationLevel`** | rename field + refs; migrate seed JSON | low — mechanical rename |
| **#2** | One canonical **`educationLevel: EducationLevel`** field on Programme / ProjectEntry / SubmittedProject / Batch / Request (replaces `category[]`, `internCategory`, `preferredEducation`) | rename + collapse `category[]`→single; keep `toEducationLevel()` only for legacy parsing | medium — touches matching/filtering |
| **#3** | `ProjectEntry` gains **`sourceSubmissionId` + `sourceBatchId`**; approval stops regenerating identity-only | set both in the single approval helper (P2) | low — additive fields |
| **#4** | Central **`archiveProject(id)`** scrubs refs in `Application.projectRankings[] / shortlistedFor / suitabilityScores[]` | one helper; replaces ad-hoc `projectArchived` patching | low — additive helper |
| **#5** | Drop stored `MyApplication`; derive applicant view from `Application` by `applicantEmail` | apply-form writes Application; applicant views filter | medium — changes apply flow |
| **#6** | New **`Applicant`** entity keyed by `email`; `Application.applicantEmail` FK; identity fields move to Applicant | new store `dsta_applicants`; Application slims to pipeline state | medium — biggest change |

## Field-naming standard (the canonical keys)

| Concept | Canonical field | Type | Used by |
|---|---|---|---|
| Education level | `educationLevel` | `EducationLevel` enum | Programme, ProjectEntry, SubmittedProject, Batch, Request |
| Programme link | `programmeId` | `string` (`''`=none) | ProjectEntry, Application, Batch |
| Intake link | `intakeId` | `string` | ProjectEntry |
| Project link | `projectId` / `*ProjectId` | `string` | Application refs, SuitabilityScore |
| Applicant link | `applicantEmail` | `string` | Application |
| Mentor link | `mentorUserId` | `string` | ProjectEntry, SubmittedProject |
| Submission trace | `sourceSubmissionId` / `sourceBatchId` | `string` | ProjectEntry |

## Sequencing (fold into the P1–P5 consolidation)

1. **P1 `lib/storage.ts`** — central seed versions + load/save. (No model change yet; removes the wipe bugs.)
2. **P2 approval helper** — apply **#3** (`sourceSubmissionId/BatchId`) while unifying the 3 approval paths.
3. **#1 + #2 rename pass** — `educationLevel` everywhere; collapse `category[]`. Do as one mechanical sweep + seed migration.
4. **#4 `archiveProject()`** — central ref-scrub.
5. **#6 `Applicant` + #5 drop MyApplication** — the largest change; do last, deliberately.
6. **Regenerate seed data** to satisfy the target keys.

> **Out of scope of the ERD (noted):** `Application` still has many lifecycle status fields
> (`status`, `eligibilityPass`, `mentorDecision`, `offerResponse`, clearances, request sub-statuses).
> That's domain complexity, not a key problem — document it as a separate **state machine** rather
> than forcing it into the entity model.
