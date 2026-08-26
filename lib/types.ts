// 'dce' (Deputy Chief Executive) was removed as a role — the DCE approval flow is
// dormant. To bring it back, re-add 'dce' here and restore the entries in role.tsx,
// topbar.tsx, ia-nav.ts, ia-rail.tsx, session.ts and notifications.ts.
export type UserRole     = 'io-admin' | 'io' | 'mentor' | 'ad-pnc' | 'new-applicant' | 'existing-scholar-applicant' | 'director';

export type ProjectDraftSource = 'create-project' | 'upload-projects';

export interface CreateProjectDraftPayload {
  requestId?: string;
  requestCategory?: string;
  title: string;
  description: string;
  mentor: string;
  mentorAppointment: string;
  mentorUserId: string;
  secondaryMentor?: string;
  secondaryMentorAppointment?: string;
  secondaryMentorEmail?: string;
  mentorBio: string;
  discipline: string;
  skills: string[];
  slots: string;
  programme: string;
  pc: string;
  techDomain: string;
  emergingArea: string;
  educationLevel: string;
  internshipDuration: string;
  internshipPeriodStart: string;
  internshipPeriodEnd: string;
}

export interface UploadProjectDraftPayload {
  rows: Record<string, unknown>[];
  fileName: string;
  requestToken?: string;
  activeTabId?: string;
  declClearance?: boolean;
}

export interface ProjectDraft {
  id: string;
  source: ProjectDraftSource;
  ownerRole: Extract<UserRole, 'ad-pnc' | 'io' | 'io-admin'>;
  title: string;
  savedAt: string;
  requestToken?: string;
  payload: CreateProjectDraftPayload | UploadProjectDraftPayload;
}

export interface ProjectResponseDraft {
  id: string;
  requestToken: string;
  savedAt: string;
  projects: SubmittedProject[];
}

export type DSTAEngagementKind =
  | 'internship' | 'techup-course' | 'techup-event' | 'programme' | 'scholarship' | 'competition' | 'other';

export interface DSTAEngagementEntry {
  year: number;
  title: string;
  details?: string;
  kind?: DSTAEngagementKind;
}
export type ProgStatus   = 'Draft' | 'Active' | 'Completed';
export type AppStatus    = 'Open' | 'Closed';
export type ProgCategory = 'Junior College' | 'Post Junior College' | 'Polytechnic' | 'Post Polytechnic' | 'University' | 'Integrated Programme (IP)';

/**
 * Intern Category — the single canonical key that links project requests,
 * submitted/approved projects, and programmes. One value per record. This is THE
 * field used for matching a project to a programme intake. (The field is still
 * named `educationLevel` in stored records for back-compat; the user-facing concept
 * is "Intern Category". See INTERN_CATEGORIES in lib/data.ts.)
 */
export type EducationLevel =
  | 'Undergraduate Scholar/Merit Scholar'
  | 'Tech UP'
  | 'Undergraduate Student'
  | 'Junior College Scholar/Junior College Student'
  | 'Polytechnic Scholar/Polytechnic Student'
  | 'Post Junior College/Post Polytechnic Student'
  | 'Young Defence Scientist Programme';

export type CriteriaMatchType = 'ALL' | 'ANY';

export interface CriteriaRule {
  id:          number;
  type:        string;
  operator:    string;
  value:       string | string[];
  gradeValue?: string;
  // Optional institution scope for a GPA rule (TOA-063): the threshold only applies
  // to applicants from these schools (e.g. NUS/NTU/SUTD ≥ 4.0 vs SMU ≥ 3.4). Empty/
  // absent = applies to everyone.
  institutions?: string[];
}

export interface CriteriaPathway {
  id:    number;
  rules: CriteriaRule[];
}

export interface CriteriaGroup {
  id:        number;
  matchType: CriteriaMatchType;
  rules:     CriteriaRule[];     // used when matchType='ALL'
  pathways:  CriteriaPathway[];  // used when matchType='ANY'
}

export interface IntakeWindow {
  id?:       string;   // stable id so a project can bind to a specific intake (back-compat: generated on the fly when absent)
  intakeTitle?: string;   // auto-derived: "<programme title> (<MMMYY start> – <MMMYY end>)"
  appOpen:   string;
  appClose:  string;
  start:     string;
  end:       string;
}

export interface Programme {
  id:              string;
  title:           string;
  educationLevel:  EducationLevel;   // the single Education Level this programme recruits for
  status:          ProgStatus;
  appOpen:         string;
  appDeadline:     string;
  start:           string;
  end:             string;
  timeline:        string;
  daysLeft:        number;
  description?:    string;
  formTemplate?:   string;
  requirements:    CriteriaGroup[];
  intakeWindows?: IntakeWindow[];
}

/** Address-book entry used by the recipient autocomplete (To / Cc pickers). */
export interface Contact {
  name:        string;
  email:       string;
  title?:      string;
  pc?:         string;
  department?: string;
}

export type FormFieldType = 'textbox' | 'textarea' | 'dropdown' | 'calendar' | 'radio' | 'checkbox' | 'upload' | 'subject-grade-table' | 'number';
export type FormSection = string;

export interface FormField {
  id:        string;
  section:   FormSection;
  label:     string;
  type:      FormFieldType;
  required:  boolean;
  mandatory: boolean;
  myInfo?:   boolean;
  options?:  string[];
  maxChars?: number;
  remarks?:  string;
  hidden?:    boolean;
  isCustom?:  boolean;
  fullWidth?: boolean;
  showWhen?:  { fieldId: string; value: string };
}

export interface AppFormTemplate {
  id:          string;
  name:        string;
  description: string;
  updatedAt:   string;
  fields?:     FormField[];
}

export interface EmailTemplate {
  id:        string;
  name:      string;
  trigger:   string;
  subject:   string;
  body:      string;
  updatedAt: string;
  // What the template is used for. 'project-request' templates are the only ones
  // offered when an IO creates a project request; others are applicant-facing.
  category?: 'project-request' | 'application';
}

export interface OfferLetterTemplate {
  id:        string;
  name:      string;
  trigger:   string;
  body:      string;
  updatedAt: string;
}

export interface WelcomeLetterTemplate {
  id:        string;
  name:      string;
  trigger:   string;
  body:      string;
  updatedAt: string;
}

export interface CertificateTemplate {
  id:        string;
  name:      string;
  trigger:   string;
  body:      string;
  updatedAt: string;
  style?:    'classic' | 'modern' | 'formal';
}

/** Which section of the eligibility builder a criterion belongs to.
 *  `basic`      — baseline identity gates implied by the programme itself
 *                 (Nationality, Education Level); shown minimised.
 *  `academic`   — the per-programme cut-offs officers actually tune
 *                 (GPA/CAP, subject grades, IB score).
 *  `additional` — optional advanced filters (Institution, Course/Major, Age). */
export type ReqTier = 'basic' | 'academic' | 'additional';

export interface ReqTypeDef {
  key:          string;
  label:        string;
  tier:         ReqTier;
  kind:         'select' | 'multiselect' | 'number' | 'text' | 'subject-grade';
  opts?:        string[];
  gradeOpts?:   string[];
  groups?:      { label: string; opts: string[] }[];
  searchable?:  boolean;
  placeholder?: string;
  step?:        string;
}

/* ── Applications ──────────────────────────────────────────────────────── */
export type ApplicationStatus =
  | 'Pending Screening'
  | 'Auto-rejected'
  | 'Pending Review'
  | 'Shortlisted for Interview'
  | 'Rejected'
  | 'Interview Scheduled'
  | 'Interview Completed'
  | 'Offer Extended'
  | 'Offer Accepted'
  | 'Offer Declined'
  | 'Date Change Requested'
  | 'Active Intern'
  | 'Internship Completed'
  | 'Withdrawn'
  | 'Terminated'
  | 'Accepted';

export interface SuitabilityScore {
  projectId:       string;
  projectTitle:    string;
  score:           number;   // 0–100, computed at default weights
  reasoning:       string;
  disciplineScore?: number;  // raw discipline/subject-fit component 0–100
  skillsScore?:    number;   // raw skills component 0–100
  standingScore?:  number;   // raw academic standing component 0–100 (within-track band)
  confidence?:     'High' | 'Medium' | 'Low';  // how complete the applicant data was
  defaultSelected?: boolean; // seed-time hint for shortlisting-review default selection
}

export interface Application {
  id:              string;
  programmeId:     string;
  // The specific programme intake this application is for. Absent on legacy/seed
  // records → the application is attributed to the programme's first intake.
  intakeId?:       string;
  programmeName:   string;
  /** Intern category the applicant belongs to — used to view applications by category. */
  internCategory?: EducationLevel;
  status:          ApplicationStatus;
  appliedDate:     string;
  shortlistedFor?: string;  // projectId if shortlisted/interview
  /** Optional human-readable / AI-generated summary surfaced in shortlisting review. */
  summary?:        string;
  /** Optional internal notes surfaced in shortlisting review when summary is absent. */
  notes?:          string;
  /** Internal rematching pool context. This is visible only to authorised IO users. */
  talentPool?: {
    addedDate?: string;
    sourceProjectId?: string;
    reason?: string;
  };
  // Personal
  name:            string;
  email:           string;
  school:          string;
  course:          string;
  year:            number;
  gpa:             number;
  // Mandatory eligibility input (must be Singapore Citizen). Absent on legacy/seed
  // records → eligibility gives benefit of the doubt rather than auto-failing.
  citizenship?:    'Singapore Citizen' | 'Singapore PR' | 'Foreigner';
  // Internship availability (TOA-027/078) — drives a soft duration/blackout match warning
  // against each project. Absent = no warning surfaced.
  availability?:   { weeks?: number; from?: string; to?: string };  // from/to: YYYY-MM-DD
  // Education background (drives cross-track fair scoring)
  track?:          'University' | 'Polytechnic' | 'JC (A-Level)' | 'IB' | 'NUS High' | 'Secondary';
  subjects?:       { name: string; level?: string; grade: string }[];  // for subject-based tracks
  // Eligibility
  eligibilityPass:   boolean;
  failedCriteria:    string[];
  // Applicant applied before final results (TOA-053). Provisional grades are treated as
  // conditional: an academic shortfall routes to IO review instead of a hard auto-reject
  // (mandatory gates like citizenship still hard-fail). Cleared when finals replace them.
  provisionalResults?: boolean;
  finalsReminderSentDate?: string; // YYYY-MM-DD — IO reminded the applicant to upload finals (AUG-132)
  // Grey-case manual override of an eligibility failure (IO discretion, audited).
  eligibilityOverride?: { by: string; reason: string; date: string };
  // IO shortlisted to a project that wasn't the AI's top-fit — justification (audited).
  matchOverride?: { chosen: string; topFit: string; reason: string; by: string; date: string };
  // Projects already attempted (failed interview / not proceeded) — drives rematch to
  // the next ranked preference (TOA-090/124) without re-offering an exhausted project.
  triedProjects?: string[];
  // The candidate's shortlisted project was archived while they were mid-pipeline
  // (TOA-025). Flags them for rematch so they aren't silently orphaned; cleared once
  // the IO rematches to another preference.
  projectArchived?: { project: string; reason: string; date: string };
  // Projects
  projectRankings:   string[];        // projectIds in preference order
  suitabilityScores: SuitabilityScore[];
  // Background
  previousDSTA:        boolean;
  previousDSTADetails?: string;
  achievements:        string[];
  // Interview scheduling
  interviewSlots?:   { date: string; time: string; duration?: string }[];   // mentor's proposed slots
  confirmedSlot?:    number;                              // applicant-selected index
  // Mentor evaluation (set after Interview Completed)
  mentorDecision?:          'Accepted' | 'Rejected' | 'Referred' | null;
  mentorNotes?:             string;
  mentorRejectionRemark?:   string;
  ioRejectionRemark?:       string;
  mentorScores?:     {
    technicalKnowledge: number;
    problemSolving:     number;
    communication:      number;
    initiativeDrive:    number;
  };
  // Meeting invite (set when applicant confirms interview slot)
  meetingLink?:      string;
  // Set by applicant when no proposed slots work — cleared when mentor proposes new slots
  rescheduleNote?:   string;
  // AI-generated interview summary (set after mentor triggers generation)
  mentorAiSummary?:   string;
  // Interview transcript uploaded by mentor (plain text)
  mentorTranscript?:  string;
  // Offer response
  offerResponse?:    'Accepted' | 'Declined';
  // Offer deadline & reminder (set when offer is extended)
  offerDeadline?:     string;   // YYYY-MM-DD
  offerReminderDays?: number;   // 0 = off; N = remind N days before deadline
  offerLetterBody?:   string;   // full composed offer letter text shown to applicant
  // Pre-offer checks (offline process; must be completed before extending offer)
  preOfferChecks?:   'pending' | 'completed';
  // Security clearance — a PARALLEL track the IO can start after shortlist (before or
  // independent of the interview/offer pipeline). Absent = not started.
  securityClearance?: { status: 'in-progress' | 'completed'; startedDate: string; completedDate?: string };
  // Exit clearance (done on FormSG before offboarding — e.g. laptop/access pass return)
  exitClearance?:    {
    status:     'completed';
    fileName?:  string;
    fileData?:  string;   // data URL of the uploaded clearance (mock storage)
    uploadedAt: string;   // YYYY-MM-DD
  };
  // Internship dates (set when offer accepted)
  internshipStartDate?: string;   // YYYY-MM-DD
  internshipEndDate?:   string;   // YYYY-MM-DD
  // Credit-bearing (collected after offer acceptance)
  creditBearing?:        boolean;
  creditBearingDetails?: string;
  // Onboarding information submission (by the intern, after accepting the offer and
  // before the mentor confirms onboarding → Active Intern). Mock for a FormSG submission.
  onboarding?: {
    submittedAt:        string;   // ISO
    // Allowance disbursement
    bankName:           string;
    bankAccountName:    string;
    bankAccountNo:      string;
    // Emergency contact
    emergencyName:      string;
    emergencyRelation:  string;
    emergencyPhone:     string;
    // Logistics
    shirtSize?:         string;
    dietary?:           string;
    // Policy acknowledgements (IM8 / PDPA)
    itPolicyAck:        boolean;
    pdpaAck:            boolean;
  };
  // Start date change request (by applicant)
  startDateChangeRequest?: { requestedDate: string; reason: string };
  // Welcome letter
  welcomeLetterSent?:     boolean;
  welcomeLetterSentDate?: string;  // YYYY-MM-DD
  welcomeLetterBody?:     string;
  // Application withdrawal (by the applicant, before offer acceptance — distinct
  // from the post-acceptance terminationRequest offboarding flow)
  withdrawnDate?:   string;        // YYYY-MM-DD
  withdrawnReason?: string;
  // Rejection notification
  rejectionEmailSent?:     boolean;
  rejectionEmailSentDate?: string; // YYYY-MM-DD
  // Auto-reject is withheld for a configured delay (TOA-072): the rejection is only
  // released on/after this date (appliedDate + autoRejectDelayDays). Set on screening.
  rejectionDueDate?:       string; // YYYY-MM-DD
  // Certificate of completion
  cocSent?:     boolean;
  cocSentDate?: string;            // YYYY-MM-DD
  cocStyle?:    'classic' | 'modern' | 'formal';  // style chosen when issued
  // Offboarding requests — only one is active at a time
  terminationRequest?: {
    type:            'withdrawal' | 'forced';
    reason:          string;
    status:          'pending' | 'approved' | 'rejected';
    directorRemark?: string;
    submittedDate?:  string;
    decidedDate?:    string;
  };
  earlyCompletionRequest?: {
    reason:            string;
    mentorConfirmed:   boolean;
    status:            'pending' | 'approved' | 'rejected';
    directorRemark?:   string;
    submittedDate?:    string;
    decidedDate?:      string;
  };
  extensionRequest?: {
    newEndDate:       string;
    reason:           string;
    status:           'pending' | 'approved' | 'rejected';
    directorRemark?:  string;
    submittedDate?:   string;
    decidedDate?:     string;
  };
  // Full application form values (CV/transcript parsed fields + written responses)
  formValues?:       Record<string, string | string[]>;
  // Uploaded documents (data URLs — mock storage) for IO view/download
  cvFileName?:          string;
  cvFileData?:          string;
  transcriptFileName?:  string;
  transcriptFileData?:  string;
  // Leadership / CCA detected from the CV (keyword extraction — mock for a future LLM)
  cvLeadership?:        string[];
  cvActivities?:        string[];
  // Fun Q&A
  funAnswer:  string;
  // Post-internship feedback (submitted by intern)
  // Each rating maps to one analytics dimension:
  //   calibration → project scope suitability / optimal learning level
  //   sentiment   → overall sentiment about the programme
  //   mentorship  → effectiveness & quality of mentor guidance
  //   environment → workplace culture sentiment
  internFeedback?: {
    submittedAt: string;
    ratings: { calibration: number; sentiment: number; mentorship: number; environment: number };
    scopeFit:  'too-easy' | 'just-right' | 'too-hard';  // calibration directional signal
    recommend: number;        // 0–10 likelihood to recommend (NPS input)
    highlights: string;
    improvements: string;
    mentorMessage?: string;  // visible to mentor; rest is IO-only
  };
  // Post-internship evaluation (submitted by mentor) — scored 0–10 per attribute,
  // mirroring the interview evaluation; overall is the computed composite average.
  mentorEvaluation?: {
    submittedAt: string;
    ratings: { technical: number; quality: number; communication: number; initiative: number };
    strengths: string;
    areasForGrowth: string;
    recommend: 'scholarship' | 'rehire' | 'neither';
  };
}

/* ── Projects ──────────────────────────────────────────────────────────── */
export type RequestStatus = 'pending' | 'overdue' | 'partial' | 'matched' | 'excess';

export interface ProjectRequest {
  id?:          string;
  uploadToken?: string;
  pc:           string;
  programmeCenter?: string;
  headName:     string;
  senderName?:  string;
  internCategory?: string;
  educationLevel: EducationLevel;   // the requested Intern Category. Requests are raised per category, not per programme.
  calendarPeriod?: string;          // free-text period label (her request-workflow UX)
  periodStart?: string;             // Calendar Period start day, ISO "YYYY-MM-DD" (legacy seed may still hold "MMM YYYY")
  periodEnd?:   string;             // Calendar Period end day, ISO "YYYY-MM-DD" (legacy seed may still hold "MMM YYYY")
  duration?:    string;             // requested internship duration label (e.g. "3 Months")
  placements:   number;
  created:      number;
  uploaded:     number;
  sentDate:     string;
  deadline:     string;
  status:       RequestStatus;
  // Withdrawn by the IO (e.g. to reduce the ask): the request is pulled back, moves
  // to the Closed tab with a "Withdrawn" badge, and the AD (P&C) is notified. To change
  // the ask afterwards the IO raises a fresh request. All rows of one upload token share this.
  withdrawn?:     boolean;
  withdrawnDate?: string;   // YYYY-MM-DD
  // IO-editable email content composed in the request preview (all rows of one
  // upload token share these). Used by the "Email Sent" view instead of the default template.
  emailSubject?: string;
  emailIntro?:   string;   // body above the placements table
  emailClosing?: string;   // body below the placements table
  emailTo?:      string;   // IO-editable To recipients (preview)
  emailCc?:      string;   // IO-editable Cc recipients (preview)
}

export type ProjectRequestAuditAction =
  | 'created'
  | 'draft-saved'
  | 'sent'
  | 'deadline-updated'
  | 'placements-updated'
  | 'reminder-sent'
  | 'withdrawn'
  | 'deleted';

export interface ProjectRequestAuditEntry {
  id: string;
  requestKey: string;
  action: ProjectRequestAuditAction;
  actor: string;
  at: string;
  summary: string;
  changes?: Array<{
    field: string;
    from?: string;
    to?: string;
  }>;
}

export interface ProjectEntry {
  id:          string;
  title:       string;
  mentor:                string;
  mentorAppointment?:    string;
  mentorUserId?:         string;
  secondaryMentor?:      string;
  secondaryMentorAppointment?: string;
  secondaryMentorEmail?: string;
  mentorBio?:            string;
  skills?:     string[];
  discipline?: string;
  description?: string;
  slots:       number;
  matched:     number;
  /** Optional UT/product guidance for how many candidates should be dispatched. */
  recommendedShortlistMin?: number;
  recommendedShortlistMax?: number;
  status:      'confirmed' | 'in-progress' | 'open';
  archived?:      boolean;  // IO archived the project — no longer required, hidden from applicants
  archiveRemark?: string;   // reason captured when archiving
  archivedAt?:    string;
  archivedBy?:    string;
  approvedAt?:    string;
  approvedBy?:    string;
  sourceSubmissionBatchId?:   string;
  sourceSubmissionProjectId?: string;
  programme:   string;
  pc?:               string;
  techDomain?:       string;
  emergingArea?:     string;
  educationLevel?:   EducationLevel;   // the Education Level this project recruits for (matches Programme.educationLevel)
  internshipDuration?: string;   // duration in months (numeric value as string), linked to the period below
  // Internship period (month granularity, "MMMYY" e.g. "Jun26"). end = start + duration months.
  internshipPeriodStart?: string;
  internshipPeriodEnd?:   string;
  // Assignment to a programme intake. `programme` empty = approved-but-unassigned; when assigned,
  // `intakeId` records the SPECIFIC intake the project's period was matched into.
  intakeId?:         string;
  workingLocation?:  string;
  requiresDce?:      boolean;
  // Availability matching (TOA-027/078). Minimum weeks the project needs an intern for,
  // and mentor blackout windows the attachment must avoid. Absent = no constraint.
  minDurationWeeks?: number;
  blackoutPeriods?:  { start: string; end: string }[];  // YYYY-MM-DD ranges
}

/* ── Programme ↔ Project attachment (late-binding M:N join) ─────────────────
   Target model: an approved project is a POOLED resource. Programme intakes draw
   from the pool by creating a ProjectAttachment row — the link is NOT a field
   baked into the project. One project can attach to many intakes (across many
   programmes) as long as placements remain and the education level matches.
   `programmeId` is denormalised from the intake for cheap filtering.

   TRANSITION: written alongside the legacy `ProjectEntry.programme`/`intakeId`
   (dual-write) until the ~42 read-sites move onto this join, after which the
   legacy single-link fields are removed. See docs/COHERENCE-AUDIT.md. */
export interface ProjectAttachment {
  projectId:   string;
  intakeId:    string;
  programmeId: string;
  placements?: number;
}

/* ── Project Submissions ───────────────────────────────────────────────── */
export type SubmissionReviewStatus = 'draft' | 'pending' | 'frozen' | 'approved' | 'rejected' | 'returnedForUpdate' | 'withdrawn';

export interface AiCheckResult {
  grammar:          'pass' | 'warn' | 'fail';
  level:            'pass' | 'warn' | 'fail';
  spelling?:        'pass' | 'warn' | 'fail';
  publicReadiness?: 'pass' | 'warn' | 'fail';
  notes:            string[];
  suggestedTitle?:  string;
  suggestedScope?:  string;
}

export interface SubmittedProject {
  id:                  string;
  requestLineId?:      string;
  title:               string;
  description:         string;
  mentor:                string;
  mentorAppointment?:    string;
  mentorEmail?:          string;
  mentorUserId?:         string;
  secondaryMentor?:      string;
  secondaryMentorAppointment?: string;
  secondaryMentorEmail?: string;
  mentorDept:            string;
  mentorBio:           string;
  skills:              string[];
  discipline:          string;
  slots:               number;
  preferredEducation:  string;
  minGpa:              string;
  projectType:         string;
  additionalRequirements: string;
  aiCheck:             AiCheckResult;
  status:              SubmissionReviewStatus;
  remarks?:            string;
  submittedAt?:        string;
  submittedBy?:        string;
  reviewedAt?:         string;
  reviewedBy?:         string;
  frozenAt?:           string;
  frozenBy?:           string;
  withdrawnAt?:        string;
  withdrawnBy?:        string;
  resubmittedAt?:      string;
  resubmittedBy?:      string;
  originalTitle?:      string;
  originalDescription?: string;
  pc?:                 string;
  techDomain?:         string;
  emergingArea?:       string;
  educationLevel?:     EducationLevel;   // the Education Level this submitted project recruits for (canonical link key)
  internshipDuration?: string;   // duration in months (numeric value as string), linked to the period below
  // Internship period (month granularity, "MMMYY" e.g. "Jun26"). end = start + duration months.
  internshipPeriodStart?: string;
  internshipPeriodEnd?:   string;
  // Optional original display label for the period (e.g. "1 Jul 2026 – 30 Sep 2026").
  calendarPeriod?:       string;
  workingLocation?:    string;
}

export interface ProjectSubmissionBatch {
  id:           string;
  uploadToken:  string;
  pc:           string;
  pcHead:       string;
  submittedBy?: string;
  programme:    string;        // the (real) programme ID the submitted projects belong to
  educationLevel?: EducationLevel;   // the Education Level this batch answers (links to ProjectRequest.educationLevel). Falls back to the programme's level when absent.
  requestedEducationLevels?: EducationLevel[];  // the education level(s) the request this submission responded to actually asked for. Set when submitted against a request token; lets the IO spot when AD (P&C) answered with a different level than requested.
  placements:   number;
  uploadedAt:   string;
  projects:     SubmittedProject[];
  // DCE batch-approval stage (TOA / SCI flow). Only used when DCE approval is enabled
  // (admin toggle); absent = not yet routed to DCE. Set when IO routes a batch and when
  // the DCE decides.
  dceStatus?:   'pending' | 'approved' | 'rejected';
  dceReason?:   string;   // required on reject
  dceBy?:       string;   // DCE persona name
  dceDate?:     string;   // YYYY-MM-DD
}

export interface PCProgramme {
  programme:  string;
  placements: number;
}

export interface PCEntry {
  id:           number;
  pcName:       string;
  headName:     string;
  cc:           string[];
  programmes:   PCProgramme[];
  requirements: string;
  open:         boolean;
}

/* ── Applicant self-service application ────────────────────────────────── */
export interface MyApplication {
  id:                 string;
  programmeId:        string;
  programmeName:      string;
  submittedAt:        string;
  status:             ApplicationStatus;
  formValues:         Record<string, string | string[]>;
  projectPreferences: string[]; // ordered confirmed project IDs, max 5
}

export type CandidateApplicationStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'UNDER REVIEW'
  | 'INTERVIEW'
  | 'OFFER RECEIVED'
  | 'OFFER ACCEPTED'
  | 'OFFER DECLINED'
  | 'OFFER EXPIRED'
  | 'UNSUCCESSFUL'
  | 'WITHDRAWN';

export type ApplicantApplicationFilter = 'all' | 'needs-action' | 'in-progress' | 'closed';

export interface ApplicantApplicationTimelineEvent {
  title: string;
  description: string;
  date: string;
  tone: 'current' | 'complete' | 'neutral';
}

export interface ApplicantApplicationDocument {
  label: string;
  fileName: string;
  meta: string;
  kind: 'resume' | 'transcript' | 'portfolio';
}

export interface ApplicantApplicationRecord {
  id: string;
  programmeName: string;
  intake: string;
  applicationWindow: string;
  applicationId: string;
  submittedAt: string;
  updatedAt: string;
  status: CandidateApplicationStatus;
  filter: Exclude<ApplicantApplicationFilter, 'all'>;
  statusMessage: string;
  currentStep: number;
  nextStep: string;
  deadline?: string;
  primaryAction?:
    | 'resume'
    | 'confirm-interview'
    | 'confirm-slot'
    | 'manage-interview'
    | 'await-interview-confirmation'
    | 'view-offer'
    | 'view-outcome';
  interviewState?:
    | 'awaiting-confirmation'
    | 'timeslot-selected'
    | 'time-change-requested'
    | 'confirmed'
    | 'completed';
  interviewDetails?: {
    card: 'scheduled' | 'rescheduling';
    selectedDate: string;
    selectedTime: string;
    timezone: string;
    mentor: string;
    mentorRole: string;
    format: string;
    location: string;
    duration: string;
    originalDate?: string;
    originalTime?: string;
    requestStatus?: string;
    availabilityNote?: string;
  };
  location: string;
  type: string;
  department: string;
  contactEmail: string;
  timeline: ApplicantApplicationTimelineEvent[];
  documents: ApplicantApplicationDocument[];
  summary: {
    personal: string;
    education: string;
    availability: string;
    interests: string[];
    projectPreferences: string[];
  };
}

export interface ApplicantMockEmail {
  id: string;
  subject: string;
  senderName: string;
  senderEmail: string;
  recipientName: string;
  recipientEmail: string;
  programmeName: string;
  projectName: string;
  mentorName: string;
  responseDeadline: string;
  receivedAt: string;
  read: boolean;
}

export interface ApplicantInterviewSlotSelection {
  id: string;
  dateLabel: string;
  timeLabel: string;
  displayDateTime: string;
}

export interface ApplicantInterviewConfirmationEmail {
  id: string;
  subject: string;
  senderName: string;
  senderEmail: string;
  recipientName: string;
  recipientEmail: string;
  projectName: string;
  mentorName: string;
  interviewDateTime: string;
  format: string;
  duration: string;
  teamsMeetingPath: string;
  meetingId: string;
  meetingPasscode: string;
  receivedAt: string;
  read: boolean;
}

export interface ApplicantOfferEmail {
  id: string;
  subject: string;
  senderName: string;
  senderEmail: string;
  recipientName: string;
  recipientEmail: string;
  programmeName: string;
  projectName: string;
  internshipPeriod: string;
  reportingLocation: string;
  workArrangement: string;
  allowance: string;
  responseDeadline: string;
  offerId: string;
  receivedAt: string;
  read: boolean;
}

/** Prototype-only Applicant Home states from APP-01 in the UX design brief. */
export type ApplicantHomeScenario =
  | 'no-application'
  | 'draft-application'
  | 'submitted'
  | 'under-review'
  | 'interview-action'
  | 'interview-scheduled'
  | 'interview-rescheduling'
  | 'interview-completed'
  | 'offer-action'
  | 'onboarding-action'
  | 'active-internship'
  | 'completion-action'
  | 'journey-completed';

export type ApplicantScenarioId =
  | 'SUBMITTED'
  | 'S01' | 'S02' | 'S03' | 'S04' | 'S05' | 'S06'
  | 'S07' | 'S08' | 'S09' | 'S10' | 'S11';

export interface ApplicantScenarioApplicationRecord {
  applicationId: string;
  programme: string;
  statusBadge: CandidateApplicationStatus;
  tabGroup: 'in-progress' | 'closed';
  cardMessage: string;
  actionDeadline: string | null;
  primaryCta: string;
  secondaryCta: string | null;
  focal: boolean;
}

export interface ApplicantScenarioInterviewRecord {
  interviewId: string;
  project: string;
  status: 'ACTION REQUIRED' | 'AWAITING MENTOR CONFIRMATION' | 'CONFIRMED' | 'COMPLETED';
  tabGroup: 'needs-action' | 'in-progress' | 'upcoming' | 'past';
  respondBy: string;
  applicantAlternativeAvailability: string | null;
  confirmedStart: string | null;
  statusMessage: string;
  primaryCta: string;
}

export interface ApplicantScenarioOfferRecord {
  offerId: string;
  project: string;
  status: 'RESPONSE REQUIRED' | 'ACCEPTED — ONBOARDING' | 'ACCEPTED';
  issuedDate: string;
  responseDeadline: string;
  decision: 'Accepted' | null;
  onboardingProgress: string;
  onboardingStatus: string;
  statusMessage: string;
  primaryCta: string;
}

export interface ApplicantScenarioInternshipRecord {
  internshipId: string;
  project: string;
  status: 'UPCOMING — ONBOARDING' | 'IN PROGRESS' | 'ENDING SOON — ACTION REQUIRED' | 'COMPLETED';
  startDate: string;
  endDate: string;
  exitClearance: string;
  internshipFeedback: string;
  testimonial: string;
  certificate: string;
  statusMessage: string;
  primaryCta: string;
}

export interface ApplicantScenarioCertificationRecord {
  certificateId: string | null;
  internshipId: string | null;
  project: string | null;
  status: 'EMPTY' | 'PENDING' | 'AVAILABLE';
  certificateNumber: string | null;
  issueDate: string | null;
  availableDate: string | null;
  statusMessage: string;
  primaryCta: string | null;
}

export type ApplicantInternshipPhase = 'onboarding' | 'offboarding';

export interface ApplicantInternshipAction {
  label: string;
  title: string;
  body: string;
  cta: string;
  route: string;
}

export interface ApplicantInternshipProject {
  id: string;
  title: string;
  mentor: string;
  mentorAppointment: string;
  workingLocation: string;
  duration: string;
  techDomain: string;
  description: string;
  skills: string[];
}

export interface ApplicantInternshipDocument {
  status: 'pending' | 'available';
  date?: string;
  body?: string;
}

export type ApplicantInternshipTaskId =
  | 'feedback'
  | 'testimonial'
  | 'linkedin'
  | 'certificate';

export interface ApplicantInternshipTask {
  id: ApplicantInternshipTaskId;
  status: string;
  statusTone: 'info' | 'success' | 'warning' | 'subtle';
  title: string;
  body: string;
  cta: string;
  route: string;
}

export interface ApplicantInternshipFeedback {
  submittedAt: string;
  ratings: {
    calibration: number;
    sentiment: number;
    mentorship: number;
    environment: number;
  };
  scopeFit: 'too-easy' | 'just-right' | 'too-hard';
  recommend: number;
  highlights: string;
  improvements: string;
  mentorMessage?: string;
}

/** Seed-backed applicant internship record used by the My Internship prototype. */
export interface ApplicantInternshipRecord {
  phase: ApplicantInternshipPhase;
  applicationId: string;
  applicantName: string;
  applicantEmail: string;
  programmeName: string;
  statusLabel: string;
  statusTone: 'info' | 'success' | 'warning' | 'subtle';
  internshipStartDate: string;
  internshipEndDate: string;
  creditBearing: boolean;
  action: ApplicantInternshipAction;
  project: ApplicantInternshipProject;
  welcomeLetter: ApplicantInternshipDocument;
  certificate: ApplicantInternshipDocument;
  completionTasks: ApplicantInternshipTask[];
  feedback?: ApplicantInternshipFeedback;
}

export interface ApplicantHomeTaskContent {
  title: string;
  body: string;
  cta: string;
  route: string | null;
  imageDesktop: string;
  imageMobile: string;
}

export interface ApplicantHomeActivityContent {
  title: string;
  body: string;
  date: string;
  tone: 'accent' | 'warning';
}

export type ApplicantWorkflowPageId =
  | 'applicant-interview-review'
  | 'applicant-interview-confirmation'
  | 'applicant-interview-reschedule-review'
  | 'applicant-offer-detail'
  | 'applicant-offer-review'
  | 'applicant-offer-reject'
  | 'applicant-offer-confirmation'
  | 'applicant-onboarding-requirement'
  | 'applicant-onboarding-review'
  | 'applicant-onboarding-confirmation'
  | 'applicant-offboarding'
  | 'applicant-feedback-review'
  | 'applicant-feedback-confirmation'
  | 'applicant-testimonial-request'
  | 'applicant-testimonial-status'
  | 'applicant-linkedin-share'
  | 'applicant-certificate-viewer';

export interface ApplicantWorkflowDetail {
  label: string;
  value: string;
}

export interface ApplicantWorkflowPageConfig {
  id: ApplicantWorkflowPageId;
  eyebrow: string;
  title: string;
  description: string;
  status?: string;
  statusTone?: 'info' | 'success' | 'warning' | 'subtle';
  activeRoute: string;
  backLabel: string;
  backRoute: string;
  primaryLabel: string;
  primaryRoute: string;
  secondaryLabel?: string;
  secondaryRoute?: string;
  notice?: string;
  details: ApplicantWorkflowDetail[];
  checklist?: string[];
}

export interface ApplicantHomeScenarioContent {
  scenarioId: string | null;
  label: string;
  heroLines: readonly [string, string];
  heroMessage: string;
  heroBadge: string;
  bannerLines: readonly [string, string, string];
  bannerBody: string;
  recordDate: string;
  statusLabel: string;
  summary: string;
  dueText: string;
  primaryLabel: string;
  primaryRoute: string;
  secondaryLabel: string;
  progressIndex: -1 | 0 | 1 | 2 | 3 | 4;
  progressHint: string;
  detailLabel: string;
  detailTitle: string;
  detailPerson: string;
  detailRole: string;
  detailMeta: readonly [
    { label: string; value: string },
    { label: string; value: string },
  ];
  tasksKicker: string;
  tasksTitle: string;
  tasksDeadline: string;
  tasks: readonly [ApplicantHomeTaskContent, ApplicantHomeTaskContent];
  activity: readonly ApplicantHomeActivityContent[];
}

export interface ApplicantHomeDashboardAssets {
  heroDesktop: { v1: string; v2: string };
  heroMobile: { v1: string; v2: string };
  statusRadar: { v1: string; v2: string };
  bannerDesktop: string;
  bannerMobile: string;
  activityIllustration: string;
  mapTopDesktop: string;
  mapTopMobile: string;
  mapBottomDesktop: string;
}

export interface ApplicantHomeDashboardData {
  assets: ApplicantHomeDashboardAssets;
  scenarios: Record<ApplicantHomeScenario, ApplicantHomeScenarioContent>;
}
