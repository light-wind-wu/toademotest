"use client";

import { useState, useEffect, useMemo, Fragment } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Shell from "@/components/layout/shell";
import Button from "@/components/ui-legacy/button";
import { Toast, useToast } from "@/components/ui-legacy/toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import SingleCombobox from "@/components/ui-legacy/single-combobox";
import Combobox from "@/components/ui-legacy/combobox";
import AiSuggestField from "@/components/ui-legacy/ai-suggest-field";
import RequestContextTable from "@/components/ui-legacy/request-context-table";
import AiCheckBlock from "@/components/ui-legacy/ai-check-block";
import FieldRequired from "@/components/ui-legacy/field-required";
import { DISCIPLINE_OPTIONS, parseDisciplines, toggleDiscipline } from "@/lib/disciplines";
import { ChevronRight, Plus, Minus, X, Check, Save, ArrowLeft, ArrowRight, CheckCircle2, AlertTriangle } from "lucide-react";
import { CONTACTS, PROJECT_SUBMISSION_COLUMNS, toEducationLevel } from "@/lib/data";
import {
  loadProjects, saveProjects,
  loadProjectResponseDrafts, saveProjectResponseDrafts,
  loadRequests,
  loadSubmissions,
  loadProjectDrafts, saveProjectDrafts,
} from "@/lib/storage";
import { groupRequests, projectMatchesRequest, requestRawCategory } from "@/lib/request-groups";
import {
  runPublicProjectCheck,
  generateTitleSuggestion, generateSampleTitle,
  generateScopeSuggestion,
} from "@/lib/ai-check";
import { periodLabelToMMMYY, mmmyyToISO, mmmyyToISOEnd, INTERNSHIP_WINDOWS } from "@/lib/internship-period";

/** Normalise a stored period value to an ISO day ("2026-06-01"). Legacy month
   values (MMMYY / "Jun 2026") become the first / last day of the month. */
const isoDay = (v: string, isEnd: boolean): string => {
  if (!v) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
  const m = periodLabelToMMMYY(v);
  return m ? (isEnd ? mmmyyToISOEnd(m) : mmmyyToISO(m)) : "";
};
import DateRangePicker from "@/components/ui-legacy/date-range-picker";
import { Field, FieldDescription, FieldLabel, FieldLabelText } from "@/components/ui-legacy/field";
import { useProgramme } from "@/lib/programme-context";
import { useRole } from "@/lib/role";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type {
  ProjectEntry,
  SubmittedProject,
  ProjectRequest,
  ProjectDraft,
  ProjectResponseDraft,
  CreateProjectDraftPayload,
} from "@/lib/types";
import {
  projectStep1Schema,
  projectStep2Schema,
  projectStep3Schema,
  projectSimpleAdSchema,
  flattenErrors,
} from "@/lib/validation";

const FLASH_KEY = "dsta_flash";

/* ── ID generator ─────────────────────────────────────────────────────────── */
function generateProjectId(existing: ProjectEntry[]): string {
  const nums = existing
    .map((p) => parseInt(p.id.replace(/^PROJ-/, ""), 10))
    .filter((n) => !isNaN(n));
  const max = nums.length > 0 ? Math.max(...nums) : 0;
  return `PROJ-${String(max + 1).padStart(4, "0")}`;
}

/* ── Dropdown values from the canonical submission schema ─────────────────────
   IO- and AD (P&C)-created projects share the SAME field set as the AD upload
   (lib/data.ts PROJECT_SUBMISSION_COLUMNS) so every creation path is consistent. */
function getDropdown(colName: string): string[] {
  return (
    PROJECT_SUBMISSION_COLUMNS.find((c) => c.name === colName)
      ?.dropdownValues ?? []
  );
}

function normalizeTechCompetencies(
  techDomain: string | undefined | null,
  skills: string[] | undefined,
  options: string[],
): string[] {
  const valid = new Set(options);
  const values = [techDomain, ...(skills || [])].filter((s): s is string => !!s);
  const matched = values.filter((s) => valid.has(s));
  return Array.from(new Set(matched)).slice(0, 3);
}

function requestPeriodForProject(request: ProjectRequest | undefined): { start: string; end: string } {
  if (!request) return { start: "", end: "" };
  const parts = (request.calendarPeriod ?? '')
    .split(/\s*[–-]\s*/)
    .map((part) => part.trim())
    .filter(Boolean);
  const start = request.periodStart || parts[0] || "";
  const end = request.periodEnd || parts[1] || parts[0] || "";
  return {
    start: periodLabelToMMMYY(start),
    end: periodLabelToMMMYY(end),
  };
}

/* ── Form field wrapper ────────────────────────────────────────────────────── */
function FormField({
  label,
  required,
  error,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <Field>
      <FieldLabel>
        {label}
        {required && <span className="text-danger">*</span>}
      </FieldLabel>
      {children}
      {hint && !error && <FieldDescription>{hint}</FieldDescription>}
      {error && <FieldRequired show message={error} />}
    </Field>
  );
}

// Match the PRIZM Input/Select/Textarea primitives the programme wizard uses:
// bg-surface (white) with a subtle shadow, not bg-bg-subtle (grey).
const INPUT_CLS =
  "w-full rounded-lg border border-border bg-surface shadow-sm px-3 py-2 text-body-md text-fg focus:outline-none focus:ring-2 focus:ring-accent/30 placeholder:text-fg-muted";
const SELECT_CLS =
  "w-full rounded-lg border border-border bg-surface shadow-sm px-3 py-2 text-body-md text-fg focus:outline-none focus:ring-2 focus:ring-accent/30";
const ERROR_CLS = "border-danger ring-1 ring-danger/30";

/* ── Section divider ──────────────────────────────────────────────────────── */
function SectionDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <span className="text-[12px] font-black text-fg-subtle uppercase tracking-widest whitespace-nowrap">
        {label}
      </span>
      <div className="flex-1 border-t border-border" />
    </div>
  );
}

/* ── Stepper indicator (mirrors the programme-create wizard) ───────────────── */
const STEP_DEFS = [
  { n: 1, label: "Project Details" },
  { n: 2, label: "Project Requirements" },
  { n: 3, label: "Mentor Information" },
  { n: 4, label: "Review and Confirm" },
];

function Stepper({ step, onStepClick }: { step: number; onStepClick: (n: number) => void }) {
  return (
    <div className="flex items-center">
      {STEP_DEFS.map((s, i) => {
        const visited = s.n <= step;
        return (
          <Fragment key={s.n}>
            <button
              type="button"
              disabled={!visited}
              onClick={() => visited && onStepClick(s.n)}
              className={cn(
                "flex items-center gap-2 shrink-0 rounded-lg px-1 py-0.5 transition-colors",
                visited ? "cursor-pointer hover:bg-accent/5" : "cursor-default",
              )}
            >
              <div className={cn(
                "w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all shrink-0",
                step > s.n   ? "bg-accent text-accent-fg" :
                step === s.n ? "bg-accent text-accent-fg ring-2 ring-offset-1 ring-accent/30" :
                               "bg-bg-muted text-fg-muted border border-border",
              )}>
                {step > s.n ? <Check size={12} /> : s.n}
              </div>
              <span className={cn(
                "text-xs font-semibold whitespace-nowrap transition-colors",
                step >= s.n ? "text-accent" : "text-fg-subtle",
              )}>
                {s.label}
              </span>
            </button>
            {i < STEP_DEFS.length - 1 && (
              <div className="flex-1 mx-4 h-px relative overflow-hidden rounded">
                <div className="absolute inset-0 bg-border" />
                <div
                  className="absolute inset-0 bg-accent transition-all duration-300"
                  style={{ width: step > s.n ? "100%" : "0%" }}
                />
              </div>
            )}
          </Fragment>
        );
      })}
    </div>
  );
}

/* ── Review row ───────────────────────────────────────────────────────────────
   Compact stacked field (label over value) so summary fields can sit two-up in a
   grid. Long free-text fields pass `full` to span the whole width. */
function ReviewRow({ label, value, full = false }: { label: string; value: React.ReactNode; full?: boolean }) {
  const empty = value === "" || value === null || value === undefined;
  return (
    <div className={cn("min-w-0", full && "sm:col-span-2")}>
      <p className="text-caption text-fg-muted">{label}</p>
      <p className={cn("mt-0.5 text-body-sm break-words", empty ? "text-fg-subtle italic" : "text-fg")}>
        {empty ? "Not provided" : value}
      </p>
    </div>
  );
}

/* ── Page ─────────────────────────────────────────────────────────────────── */
export default function ProjectNewPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { role } = useRole();
  const { progOpts } = useProgramme();
  const { toast, showToast } = useToast();
  const draftId = searchParams.get("draftId") ?? "";
  // When AD (P&C) arrives from a specific request (via the respond screen) the token
  // scopes the submission to that request, so progress accrues to the right one.
  const requestToken = searchParams.get("token") ?? "";
  const requestIdParam = searchParams.get("requestId") ?? "";
  const requestCategoryParam = searchParams.get("category") ?? "";
  const responseDraftProjectIdParam = searchParams.get("responseDraftProjectId") ?? "";

  // AD (P&C) shares this wizard for manual project creation, but their projects go
  // into a review batch (pending IO approval) instead of straight into the pool.
  const isAd = role === "ad-pnc";
  const backRoute = isAd
    ? (requestToken ? `/submissions/respond?token=${encodeURIComponent(requestToken)}&mode=upload` : "/submissions")
    : "/projects";
  const backLabel = isAd ? "Project Requests" : "Projects";
  // Roles that can save/restore project drafts (mentors are redirected away).
  const canDraft = role === "ad-pnc" || role === "io" || role === "io-admin";

  const [step, setStep] = useState(1);

  // Overview
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  // Classification
  const [pc, setPc] = useState("");
  const [educationLevel, setEducationLevel] = useState("");
  const [techDomain, setTechDomain] = useState("");
  const [emergingArea, setEmergingArea] = useState("");
  // Academic requirements
  const [discipline, setDiscipline] = useState("");
  const [skills, setSkills] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState("");
  // Logistics
  const [slots, setSlots] = useState("1");
  const [internshipDuration, setInternshipDuration] = useState("");
  const [internshipPeriodStart, setInternshipPeriodStart] = useState("");
  const [internshipPeriodEnd, setInternshipPeriodEnd] = useState("");
  // Mentor information
  const [mentor, setMentor] = useState("");
  const [mentorAppointment, setMentorAppointment] = useState("");
  const [mentorUserId, setMentorUserId] = useState("");
  const [secondaryMentor, setSecondaryMentor] = useState("");
  const [secondaryMentorAppointment, setSecondaryMentorAppointment] = useState("");
  const [secondaryMentorEmail, setSecondaryMentorEmail] = useState("");
  const [mentorBio, setMentorBio] = useState("");
  // Programme attachment (optional) + declaration
  const [programme, setProgramme] = useState("");
  const [declClearance, setDeclClearance] = useState(false);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [confirmAddOpen, setConfirmAddOpen] = useState(false);

  // The request(s) this submission is responding to — all intern categories sent under
  // the same token. Drives both the level-mismatch and over-submission warnings.
  const [tokenRequests, setTokenRequests] = useState<ProjectRequest[]>([]);
  useEffect(() => {
    if (!requestToken) { setTokenRequests([]); return; }
    setTokenRequests(loadRequests().filter((r) => r.uploadToken === requestToken));
  }, [requestToken]);

  const requestCategoryFor = (request: ProjectRequest) => request.internCategory || request.educationLevel;
  const requestFromId = requestIdParam ? tokenRequests.find((r) => r.id === requestIdParam) : undefined;
  const requestedLevels = Array.from(new Set(tokenRequests.map((r) => toEducationLevel(requestCategoryFor(r)))));
  const requestDefaultLevel = requestCategoryParam || (requestFromId ? requestCategoryFor(requestFromId) : tokenRequests[0] ? requestCategoryFor(tokenRequests[0]) : "");
  const effectiveEducationLevel = educationLevel || requestDefaultLevel;
  const selectedLevel = effectiveEducationLevel ? toEducationLevel(effectiveEducationLevel) : null;
  const isSimpleAdRequest = isAd && !!requestToken;
  const internCategoryOptions = useMemo(() => {
    const seen = new Set<string>();
    const list: string[] = [];
    for (const req of tokenRequests) {
      const category = requestRawCategory(req);
      if (category && !seen.has(category)) {
        seen.add(category);
        list.push(category);
      }
    }
    return list;
  }, [tokenRequests]);
  // The specific request line for the level being submitted against.
  const matchingRequest = requestFromId ?? (selectedLevel
    ? tokenRequests.find((r) => toEducationLevel(requestCategoryFor(r)) === selectedLevel)
    : undefined);
  const requestProgrammeCentre =
    matchingRequest?.programmeCenter ||
    (matchingRequest?.pc ? CONTACTS.find((contact) => contact.email === matchingRequest.pc)?.pc : "") ||
    "";
  const levelMismatch =
    isAd && !!requestToken && requestedLevels.length > 0 && !!selectedLevel &&
    !requestedLevels.includes(selectedLevel);

  // Placements already captured against the matching request, across all statuses.
  // This includes response drafts because they already reserve requested placements
  // within the AD (P&C)'s in-progress response.
  const countedPlacements = matchingRequest
    ? [
        ...loadSubmissions().flatMap((batch) => batch.projects),
        ...loadProjectResponseDrafts().flatMap((draft) => draft.projects),
      ]
        .filter((project) => projectMatchesRequest(project, matchingRequest))
        .reduce((sum, project) => sum + project.slots, 0)
    : 0;
  const stillNeedPlacements = Math.max(0, (matchingRequest?.placements ?? 0) - countedPlacements);
  const stillNeedPlacementsLabel = matchingRequest
    ? `Still need ${stillNeedPlacements} placement${stillNeedPlacements === 1 ? '' : 's'}`
    : undefined;

  // Placements already submitted against the matching request vs what this project adds.
  const thisSlots = parseInt(slots, 10) || 0;
  const alreadyUploaded = matchingRequest?.uploaded ?? 0;
  const requestedPlacements = matchingRequest?.placements ?? 0;
  const overSubmission = isAd && !!matchingRequest && alreadyUploaded + thisSlots > requestedPlacements;
  const overBy = alreadyUploaded + thisSlots - requestedPlacements;

  // AI suggestions for the Title and Scope fields: refine what's typed, or draft a
  // fresh sample from the project's context when the field is still empty.
  const titleSuggest = () =>
    title.trim()
      ? generateTitleSuggestion(title, educationLevel, techDomain)
      : generateSampleTitle(educationLevel, techDomain, discipline);
  const scopeSuggest = () =>
    generateScopeSuggestion(
      description.trim() ? title : "",
      description.trim() ? description : "",
      educationLevel, skills, techDomain,
    );

  useEffect(() => {
    if (role === "mentor") router.replace("/projects");
  }, [role, router]);

  /* ── Drafts: restore on mount when ?draftId is present ────────────────── */
  useEffect(() => {
    if (!draftId) return;
    const draft = loadProjectDrafts().find(
      (item) => item.id === draftId && item.source === "create-project" && item.ownerRole === role,
    );
    if (!draft || !("title" in draft.payload)) return;
    applyDraftPayload(draft.payload as CreateProjectDraftPayload);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftId, role]);

  useEffect(() => {
    if (isSimpleAdRequest && requestProgrammeCentre && !pc) {
      setPc(requestProgrammeCentre);
    }
  }, [isSimpleAdRequest, requestProgrammeCentre, pc]);

  useEffect(() => {
    if (!requestToken || !responseDraftProjectIdParam) return;
    const draftProject = loadProjectResponseDrafts()
      .find((draft) => draft.requestToken === requestToken)
      ?.projects.find((project) => project.id === responseDraftProjectIdParam);
    if (!draftProject) return;
    setTitle(draftProject.title);
    setDescription(draftProject.description);
    setPc(draftProject.pc ?? requestProgrammeCentre);
    const techComps = normalizeTechCompetencies(draftProject.techDomain, draftProject.skills, getDropdown("Tech Domain"));
    setSkills(techComps);
    setTechDomain(techComps[0] ?? "");
    setEmergingArea(draftProject.emergingArea ?? "");
    setMentor(draftProject.mentor);
    setMentorAppointment(draftProject.mentorAppointment ?? "");
    setMentorUserId(draftProject.mentorUserId ?? "");
    setSecondaryMentor(draftProject.secondaryMentor ?? "");
    setSecondaryMentorAppointment(draftProject.secondaryMentorAppointment ?? "");
    setSecondaryMentorEmail(draftProject.secondaryMentorEmail ?? "");
    setMentorBio(draftProject.mentorBio);
    setDiscipline(draftProject.discipline);
    setSlots(String(draftProject.slots || 1));
    setEducationLevel(draftProject.educationLevel ?? requestCategoryParam);
    setInternshipDuration(draftProject.internshipDuration ?? "");
    setInternshipPeriodStart(isoDay(draftProject.internshipPeriodStart ?? "", false));
    setInternshipPeriodEnd(isoDay(draftProject.internshipPeriodEnd ?? "", true));
  }, [requestToken, responseDraftProjectIdParam, requestProgrammeCentre, requestCategoryParam]);

  function currentDraftPayload(): CreateProjectDraftPayload {
    return {
      requestId: requestIdParam || matchingRequest?.id,
      requestCategory: requestCategoryParam || effectiveEducationLevel || undefined,
      title, description, mentor, mentorAppointment, mentorUserId, mentorBio,
      secondaryMentor, secondaryMentorAppointment, secondaryMentorEmail,
      discipline, skills, slots, programme, pc, techDomain, emergingArea,
      educationLevel, internshipDuration, internshipPeriodStart, internshipPeriodEnd,
    };
  }

  function applyDraftPayload(payload: CreateProjectDraftPayload) {
    setTitle(payload.title);
    setDescription(payload.description);
    setMentor(payload.mentor);
    setMentorAppointment(payload.mentorAppointment ?? "");
    setMentorUserId(payload.mentorUserId);
    setSecondaryMentor(payload.secondaryMentor ?? "");
    setSecondaryMentorAppointment(payload.secondaryMentorAppointment ?? "");
    setSecondaryMentorEmail(payload.secondaryMentorEmail ?? "");
    setMentorBio(payload.mentorBio);
    setDiscipline(payload.discipline);
    const techComps = normalizeTechCompetencies(payload.techDomain, payload.skills, getDropdown("Tech Domain"));
    setSkills(techComps);
    setTechDomain(techComps[0] ?? "");
    setSlots(payload.slots);
    setProgramme(payload.programme);
    setPc(payload.pc);
    setEmergingArea(payload.emergingArea);
    setEducationLevel(payload.requestCategory ?? payload.educationLevel);
    setInternshipDuration(payload.internshipDuration);
    setInternshipPeriodStart(isoDay(payload.internshipPeriodStart, false));
    setInternshipPeriodEnd(isoDay(payload.internshipPeriodEnd, true));
  }

  /* Save the in-progress wizard as a draft (partial is fine — no validation). */
  function handleSaveDraft() {
    if (role !== "ad-pnc" && role !== "io" && role !== "io-admin") return;
    const id = draftId || `project-draft-${Date.now()}`;
    const payload = currentDraftPayload();
    const draft: ProjectDraft = {
      id,
      source: "create-project",
      ownerRole: role,
      title: payload.title.trim() || "Untitled project draft",
      savedAt: new Date().toISOString(),
      requestToken: requestToken || undefined,
      payload,
    };
    saveProjectDrafts([draft, ...loadProjectDrafts().filter((item) => item.id !== id)]);
    showToast("Project draft saved.");
    if (!draftId) {
      const params = new URLSearchParams({ draftId: id });
      if (requestToken) params.set("token", requestToken);
      if (requestIdParam || matchingRequest?.id) params.set("requestId", requestIdParam || matchingRequest?.id || "");
      if (requestCategoryParam || effectiveEducationLevel) params.set("category", requestCategoryParam || effectiveEducationLevel);
      router.replace(`/projects/new?${params.toString()}`);
    }
  }

  /* Clear the draft once the project has been created/submitted. */
  function removeCurrentDraft() {
    if (!draftId) return;
    saveProjectDrafts(loadProjectDrafts().filter((item) => item.id !== draftId));
  }

  /* ── Skills tag input ─────────────────────────────────────────────────── */
  function addSkill() {
    const s = skillInput.trim();
    if (s && !skills.includes(s)) setSkills((prev) => [...prev, s].slice(0, 3));
    setSkillInput("");
    clearError("skills");
  }


  function validateSimpleAdRequest(): Record<string, string> {
    const result = projectSimpleAdSchema.safeParse({
      title,
      description,
      pc,
      educationLevel: effectiveEducationLevel,
      skills,
      discipline,
      mentor,
      mentorAppointment,
      mentorUserId,
      secondaryMentorEmail,
      slots,
    });
    return flattenErrors(result);
  }

  function handleAddProjectClick() {
    const e = validateSimpleAdRequest();
    if (Object.keys(e).length > 0) {
      setErrors(e);
      return;
    }
    setConfirmAddOpen(true);
  }

  function handleSimpleAdRequestSubmit() {
    const e = validateSimpleAdRequest();
    if (Object.keys(e).length > 0) { setErrors(e); return; }
    setSaving(true);
    try {
      submitAsAdPnc();
    } catch {
      setSaving(false);
    }
  }

  function clearError(k: string) {
    setErrors((prev) => {
      const n = { ...prev };
      delete n[k];
      return n;
    });
  }

  /* ── Per-step validation ─────────────────────────────────────────────────
     Field set + required flags mirror the AD (P&C) canonical schema. */
  function validateStep1(): Record<string, string> {
    const result = projectStep1Schema.safeParse({
      title,
      description,
      pc,
      educationLevel,
      skills,
    });
    return flattenErrors(result);
  }

  function validateStep2(): Record<string, string> {
    const result = projectStep2Schema.safeParse({
      discipline,
      slots,
      internshipDuration,
      internshipPeriodStart,
      internshipPeriodEnd,
    });
    return flattenErrors(result);
  }

  function validateStep3(): Record<string, string> {
    const result = projectStep3Schema.safeParse({
      mentor,
      mentorAppointment,
      mentorUserId,
      secondaryMentorEmail,
    });
    return flattenErrors(result);
  }

  /* ── Step navigation ──────────────────────────────────────────────────── */
  function goToStep2() {
    const e = validateStep1();
    if (Object.keys(e).length > 0) { setErrors(e); return; }
    setErrors({});
    setStep(2);
  }
  function goToStep3() {
    const e = validateStep2();
    if (Object.keys(e).length > 0) { setErrors(e); return; }
    setErrors({});
    setStep(3);
  }
  function goToStep4() {
    const e = validateStep3();
    if (Object.keys(e).length > 0) { setErrors(e); return; }
    setErrors({});
    setStep(4);
  }

  /* ── Submit ───────────────────────────────────────────────────────────── */
  function handleSubmit() {
    const e1 = validateStep1();
    if (Object.keys(e1).length > 0) { setErrors(e1); setStep(1); return; }
    const e2 = validateStep2();
    if (Object.keys(e2).length > 0) { setErrors(e2); setStep(2); return; }
    const e3 = validateStep3();
    if (Object.keys(e3).length > 0) { setErrors(e3); setStep(3); return; }
    if (!declClearance) {
      setErrors({ declaration: "Please confirm the declaration before creating the project." });
      return;
    }
    setSaving(true);
    try {
      if (isAd) submitAsAdPnc();
      else submitAsIo();
    } catch {
      setSaving(false);
    }
  }

  /* IO creates an approved project directly in the pool. */
  function submitAsIo() {
    const projs = loadProjects();
    const newProj: ProjectEntry = {
      id: generateProjectId(projs),
      title: title.trim(),
      description: description.trim(),
      mentor: mentor.trim(),
      mentorAppointment: mentorAppointment.trim() || undefined,
      mentorUserId: mentorUserId.trim() || undefined,
      secondaryMentor: secondaryMentor.trim() || undefined,
      secondaryMentorAppointment: secondaryMentorAppointment.trim() || undefined,
      secondaryMentorEmail: secondaryMentorEmail.trim() || undefined,
      mentorBio: mentorBio.trim() || undefined,
      skills: skills,
      discipline: discipline.trim() || undefined,
      slots: parseInt(slots),
      matched: 0,
      status: "open",
      // Programme attachment is optional — empty string = approved-but-unassigned
      // (matches the approval flow + seed); attach to a programme intake later.
      programme: programme || "",
      pc: pc || undefined,
      techDomain: (techDomain || skills[0]) || undefined,
      emergingArea: emergingArea || undefined,
      educationLevel: educationLevel ? toEducationLevel(educationLevel) : undefined,
      internshipDuration: internshipDuration || undefined,
      // Hosting window (when the project can run) and length are independent:
      // the window is start–end, the duration is how many months it runs for.
      internshipPeriodStart: internshipPeriodStart || undefined,
      internshipPeriodEnd: internshipPeriodEnd || undefined,
    };
    saveProjects([...projs, newProj]);
    removeCurrentDraft();
    sessionStorage.setItem(
      "dsta_pending_toast",
      `Project "${newProj.title}" created successfully.`,
    );
    router.push("/projects");
  }

  function saveProjectToResponseDraft(project: SubmittedProject) {
    const drafts = loadProjectResponseDrafts();
    const existing = drafts.find((draft) => draft.requestToken === requestToken);
    const existingProjects = existing?.projects ?? [];
    const nextProjects = responseDraftProjectIdParam
      ? existingProjects.map((item) => item.id === responseDraftProjectIdParam ? project : item)
      : [...existingProjects, project];
    const nextDraft: ProjectResponseDraft = {
      id: existing?.id ?? `response-draft-${Date.now()}`,
      requestToken,
      savedAt: new Date().toISOString(),
      projects: nextProjects,
    };
    saveProjectResponseDrafts([nextDraft, ...drafts.filter((draft) => draft.requestToken !== requestToken)]);
  }

  /* AD (P&C) adds the project to the request response draft. It only becomes
     pending review after the AD confirms the response checks and submits. */
  function submitAsAdPnc() {
    const level = toEducationLevel(effectiveEducationLevel);
    const allReqs = loadRequests();
    // Prefer the request this submission was opened from (token); otherwise fall back
    // to the first open request for this intern category.
    const matchingReq =
      (requestIdParam && allReqs.find((r) => r.id === requestIdParam)) ||
      (requestToken && allReqs.find((r) => toEducationLevel(r.internCategory || r.educationLevel) === level && r.uploadToken === requestToken)) ||
      allReqs.find((r) => toEducationLevel(r.internCategory || r.educationLevel) === level);
    const requestPeriod = requestPeriodForProject(matchingReq);
    const proj: SubmittedProject = {
      id: responseDraftProjectIdParam || `proj-${Date.now()}`,
      requestLineId: matchingReq?.id,
      title: title.trim(),
      description: description.trim(),
      mentor: mentor.trim(),
      mentorAppointment: mentorAppointment.trim() || undefined,
      mentorUserId: mentorUserId.trim() || undefined,
      secondaryMentor: secondaryMentor.trim() || undefined,
      secondaryMentorAppointment: secondaryMentorAppointment.trim() || undefined,
      secondaryMentorEmail: secondaryMentorEmail.trim() || undefined,
      mentorDept: "",
      mentorBio: mentorBio.trim(),
      skills: skills,
      discipline: discipline.trim(),
      slots: parseInt(slots),
      preferredEducation: "Any",
      minGpa: "",
      projectType: "Technical",
      additionalRequirements: "",
      aiCheck: runPublicProjectCheck(title.trim(), description.trim(), effectiveEducationLevel, skills, techDomain || skills[0] || ""),
      status: "draft",
      pc: pc || undefined,
      techDomain: (techDomain || skills[0]) || undefined,
      emergingArea: emergingArea || undefined,
      educationLevel: level,
      internshipDuration: matchingReq?.duration || internshipDuration || undefined,
      internshipPeriodStart: internshipPeriodStart || requestPeriod.start || undefined,
      internshipPeriodEnd: internshipPeriodEnd || requestPeriod.end || undefined,
    };
    saveProjectToResponseDraft(proj);
    try {
      sessionStorage.setItem(
        FLASH_KEY,
        JSON.stringify({
          message: `Project "${proj.title}" added as draft.`,
          tone: "success",
        }),
      );
    } catch {}
    removeCurrentDraft();
    router.push(backRoute);
  }

  const disciplineList = parseDisciplines(discipline);
  const techCompetencyOptions = getDropdown("Tech Domain");

  if (isSimpleAdRequest) {
    const respondLabel = 'Respond to Request';

    return (
      <Shell activeRoute={backRoute} hideNavigation>
        <div className="mx-auto max-w-1xl min-h-[calc(100vh-160px)]">
          <nav className="mb-3 flex items-center gap-2 text-body-sm text-fg-muted">
            <button type="button" onClick={() => router.push(backRoute)} className="hover:text-accent">
              Project request
            </button>
            <ChevronRight size={14} className="text-fg-subtle" />
            <span>{respondLabel}</span>
            <ChevronRight size={14} className="text-fg-subtle" />
            <span className="font-medium text-fg">Create a New Project</span>
          </nav>

          <h1 className="text-headline-lg text-fg mb-6">Create a New Project</h1>

          {tokenRequests.length > 0 && (
            <RequestContextTable requests={tokenRequests} className="mb-6 p-5 border border-border" highlightedCategory={effectiveEducationLevel} />
          )}

          <div className="rounded-lg border border-border bg-surface p-6">
            <div className="space-y-5">
              <h2 className="text-body-lg font-semibold text-fg leading-tight ">Add New Project</h2>
              <FormField label="Programme centre" required error={errors.pc}>
                <div className={cn(INPUT_CLS, 'flex min-h-9 items-center bg-bg-muted text-fg max-w-[33%]')}>
                  {pc || requestProgrammeCentre || 'Programme centre from request'}
                </div>
              </FormField>

              <FormField label="Intern category" required error={errors.educationLevel}>
                <select
                  className={cn(SELECT_CLS, 'max-w-[33%]', errors.educationLevel && ERROR_CLS)}
                  value={educationLevel || requestDefaultLevel || ''}
                  onChange={(event) => { setEducationLevel(event.target.value); clearError("educationLevel"); }}
                >
                  {internCategoryOptions.map((category: string) => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </FormField>

              <FormField label="Project title" required error={errors.title}>
                <input
                  className={cn(INPUT_CLS, 'max-w-[33%]', errors.title && ERROR_CLS)}
                  placeholder="Type a project name, e.g. AI-Driven Threat Detection System"
                  value={title}
                  onChange={(event) => { setTitle(event.target.value); clearError("title"); }}
                />
                <AiCheckBlock
                  title={title}
                  educationLevel={effectiveEducationLevel}
                  skills={skills}
                />
              </FormField>

              <FormField label="Project scope" required error={errors.description}>
                <textarea
                  rows={5}
                  className={cn(INPUT_CLS, 'resize-none max-w-[66%]', errors.description && ERROR_CLS)}
                  placeholder="Describe the incident..."
                  value={description}
                  onChange={(event) => { setDescription(event.target.value); clearError("description"); }}
                />
                <AiCheckBlock
                  title={title}
                  description={description}
                  educationLevel={effectiveEducationLevel}
                  skills={skills}
                />
              </FormField>

              <FormField label="Tech competency (up to 3)" required error={errors.skills} hint="">
                <Combobox
                  selected={skills}
                  onToggle={(opt) => {
                    const next = skills.includes(opt) ? skills.filter((s) => s !== opt) : skills.length < 3 ? [...skills, opt] : skills;
                    setSkills(next);
                    setTechDomain(next[0] ?? "");
                    clearError("skills");
                  }}
                  options={techCompetencyOptions}
                  placeholder="Tech UP"
                  chipClassName="bg-bg-muted text-[rgba(69,85,108,1)]"
                  chips="inline"
                />
              </FormField>

              <FormField label="Discipline of study (up to 3)" required error={errors.discipline} hint="">
                <Combobox
                  selected={disciplineList}
                  onToggle={(opt) => {
                    const list = parseDisciplines(discipline);
                    if (!list.includes(opt) && list.length >= 3) return;
                    setDiscipline((prev) => toggleDiscipline(prev, opt));
                    clearError("discipline");
                  }}
                  options={DISCIPLINE_OPTIONS}
                  placeholder="Select up to 3…"
                  chipClassName="bg-bg-muted text-[rgba(69,85,108,1)]"
                  chips="inline"
                />
              </FormField>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <FormField label="Primary Mentor Name" required error={errors.mentor}>
                  <input
                    className={cn(INPUT_CLS, errors.mentor && ERROR_CLS)}
                    value={mentor}
                    onChange={(event) => { setMentor(event.target.value); clearError("mentor"); }}
                  />
                </FormField>
                <FormField label="Primary Mentor Appointment" required error={errors.mentorAppointment}>
                  <input
                    className={cn(INPUT_CLS, errors.mentorAppointment && ERROR_CLS)}
                    value={mentorAppointment}
                    onChange={(event) => { setMentorAppointment(event.target.value); clearError("mentorAppointment"); }}
                  />
                </FormField>
                <FormField label="Primary Mentor Email" required error={errors.mentorUserId}>
                  <input
                    className={cn(INPUT_CLS, errors.mentorUserId && ERROR_CLS)}
                    value={mentorUserId}
                    onChange={(event) => { setMentorUserId(event.target.value); clearError("mentorUserId"); }}
                  />
                </FormField>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <FormField label="Secondary Mentor Name">
                  <input
                    className={INPUT_CLS}
                    value={secondaryMentor}
                    onChange={(event) => setSecondaryMentor(event.target.value)}
                  />
                </FormField>
                <FormField label="Secondary Mentor Appointment">
                  <input
                    className={INPUT_CLS}
                    value={secondaryMentorAppointment}
                    onChange={(event) => setSecondaryMentorAppointment(event.target.value)}
                  />
                </FormField>
                <FormField label="Secondary Mentor Email" error={errors.secondaryMentorEmail}>
                  <input
                    className={cn(INPUT_CLS, errors.secondaryMentorEmail && ERROR_CLS)}
                    value={secondaryMentorEmail}
                    onChange={(event) => { setSecondaryMentorEmail(event.target.value); clearError("secondaryMentorEmail"); }}
                  />
                </FormField>
              </div>

              <FormField label="Number of placements" required error={errors.slots}>
                <div className="flex items-center gap-3">
                  <div className="inline-flex items-center rounded-lg border border-border bg-surface">
                    <button
                      type="button"
                      onClick={() => { setSlots(String(Math.max(1, (parseInt(slots, 10) || 1) - 1))); clearError("slots"); }}
                      className="grid h-9 w-9 place-items-center text-fg hover:bg-bg-subtle"
                      aria-label="Decrease placements"
                    >
                      <Minus size={16} />
                    </button>
                    <span className="flex h-9 w-12 items-center justify-center border-x border-border text-body-md font-medium text-fg">
                      {slots || 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => { setSlots(String((parseInt(slots, 10) || 1) + 1)); clearError("slots"); }}
                      className="grid h-9 w-9 place-items-center text-fg hover:bg-bg-subtle"
                      aria-label="Increase placements"
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                </div>
                <p className="text-body-sm text-fg-muted">
                  You may offer more placements than requested on this project. New project rows cannot be added once the requested project count for this category is reached.
                </p>
                {errors.slots && <FieldRequired show message={errors.slots} />}
              </FormField>
            </div>
          </div>
        </div>

        <div className="sticky bottom-0 z-20 -mx-[clamp(24px,2.6vw,40px)] -mb-8 mt-5 flex shrink-0 items-center justify-between gap-3 border-t border-border bg-bg-subtle px-[clamp(24px,2.6vw,40px)] py-2">
          <p className="text-body-sm text-fg">
            <Button variant="ghost" size="md" onClick={() => router.push(backRoute)}>
              Back
            </Button>
          </p>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="md" onClick={() => router.push(backRoute)}>Cancel</Button>
            <Button variant="outline" size="md" onClick={() => router.push(backRoute)}>Save and Exit</Button>
            <Button size="md" onClick={handleAddProjectClick} disabled={saving}>
              {saving ? "Saving..." : "Add Project"}
            </Button>
          </div>
        </div>

        <Dialog open={confirmAddOpen} onOpenChange={setConfirmAddOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Add project?</DialogTitle>
              <DialogDescription>
                This will create a new project request for the selected requirement.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setConfirmAddOpen(false)}>
                Cancel
              </Button>
              <Button onClick={() => { setConfirmAddOpen(false); handleSimpleAdRequestSubmit(); }}>
                <Plus size={14} />Add Project
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Toast message={toast} />
      </Shell>
    );
  }

  return (
    <Shell activeRoute={backRoute} hideNavigation={Boolean(requestToken)}>
      <div className="flex min-h-[calc(100vh-112px)] flex-col">
        {/* Breadcrumb */}
        <nav className="shrink-0 flex items-center gap-2 mb-4 text-label-md">
          <span
            className="text-fg-muted cursor-pointer hover:text-accent transition-colors"
            onClick={() => router.push(backRoute)}
          >
            {backLabel}
          </span>
          <ChevronRight size={16} className="text-fg-subtle" />
          <span className="text-fg">Create Project</span>
        </nav>

        {/* Stepper */}
        <div className="shrink-0 mb-6">
          <Stepper step={step} onStepClick={(n) => { setErrors({}); setStep(n); }} />
        </div>

        <div className="flex-1">
        <div className="card flex flex-col">
          <div className="p-6">
          {/* ── Step 1: Project Details (Overview · Classification) ─────────── */}
          {step === 1 && (
            <div className="space-y-8">
                {/* Overview */}
                <div>
                  <SectionDivider label="Overview" />
                  <div className="space-y-4">
                    <FormField
                      label="Project Title"
                      required
                      error={errors.title}
                      hint="A short, clear project name."
                    >
                      <AiSuggestField
                        value={title}
                        onChange={(v) => { setTitle(v); clearError("title"); }}
                        generate={titleSuggest}
                        placeholder="Type a project name, e.g. AI-Driven Threat Detection System"
                        inputClass={INPUT_CLS}
                        errorClass={ERROR_CLS}
                        hasError={!!errors.title}
                      />
                    </FormField>
                    <FormField
                      label="Project Scope"
                      required
                      error={errors.description}
                      hint="What the intern will do, learn, and produce. Up to 500 characters."
                    >
                      <AiSuggestField
                        multiline
                        rows={5}
                        value={description}
                        onChange={(v) => { setDescription(v); clearError("description"); }}
                        generate={scopeSuggest}
                        placeholder="Interns will work on…"
                        inputClass={INPUT_CLS}
                        errorClass={ERROR_CLS}
                        hasError={!!errors.description}
                      />
                    </FormField>
                  </div>
                </div>

                {/* Classification */}
                <div>
                  <SectionDivider label="Classification" />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField label="PC" required error={errors.pc} hint="The Programme Centre that runs this project.">
                      <select
                        className={cn(SELECT_CLS, errors.pc && ERROR_CLS)}
                        value={pc}
                        onChange={(e) => { setPc(e.target.value); clearError("pc"); }}
                      >
                        <option value="">Select PC…</option>
                        {getDropdown("PC").map((v) => (
                          <option key={v} value={v}>{v}</option>
                        ))}
                      </select>
                    </FormField>
                    <FormField label="Intern Category" required error={errors.educationLevel} hint="The category of intern this project suits.">
                      <select
                        className={cn(SELECT_CLS, errors.educationLevel && ERROR_CLS)}
                        value={educationLevel}
                        onChange={(e) => { setEducationLevel(e.target.value); setInternshipPeriodStart(""); setInternshipPeriodEnd(""); clearError("educationLevel"); }}
                      >
                        <option value="">Select category…</option>
                        {getDropdown("Intern Category").map((v) => (
                          <option key={v} value={v}>{v}</option>
                        ))}
                      </select>
                      {levelMismatch && (
                        <div className="mt-2 flex items-start gap-2 rounded-lg border border-warning/40 bg-warning-bg px-3 py-2">
                          <AlertTriangle size={14} className="mt-0.5 shrink-0 text-warning" />
                          <p className="text-caption text-fg">
                            This request asked for <span className="font-semibold">{requestedLevels.join(", ")}</span>, but you've selected{" "}
                            <span className="font-semibold">{selectedLevel}</span>. You can still submit — the IO will be shown that the level differs from what was requested.
                          </p>
                        </div>
                      )}
                    </FormField>
                    <FormField label="Tech Competency (up to 3)" required error={errors.skills} hint="Choose up to 3 competency domains.">
                      <Combobox
                        selected={skills}
                        onToggle={(opt) => {
                          const next = skills.includes(opt) ? skills.filter((s) => s !== opt) : skills.length < 3 ? [...skills, opt] : skills;
                          setSkills(next);
                          setTechDomain(next[0] ?? "");
                          clearError("skills");
                        }}
                        options={getDropdown("Tech Domain")}
                        placeholder="Select tech competencies…"
                      />
                    </FormField>
                  </div>
                </div>
            </div>
          )}

          {/* ── Step 2: Project Requirements (Academic · Logistics) ──────────── */}
          {step === 2 && (
            <div className="space-y-8">
                {/* Academic Requirements */}
                <div>
                  <SectionDivider label="Academic Requirements" />
                  <div className="space-y-4">
                    <FormField
                      label="Discipline of Study"
                      required
                      error={errors.discipline}
                      hint="Fields of study an intern should come from."
                    >
                      <Combobox
                        selected={disciplineList}
                        onToggle={(opt) => {
                          setDiscipline((prev) => toggleDiscipline(prev, opt));
                          clearError("discipline");
                        }}
                        options={DISCIPLINE_OPTIONS}
                        placeholder="Select disciplines…"
                      />
                    </FormField>
                  </div>
                </div>

                {/* Logistics */}
                <div>
                  <SectionDivider label="Logistics" />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField label="No. of Placements" required error={errors.slots} hint="How many interns you can take.">
                      <input
                        type="number"
                        min={1}
                        max={20}
                        className={cn(INPUT_CLS, errors.slots && ERROR_CLS)}
                        value={slots}
                        onChange={(e) => { setSlots(e.target.value); clearError("slots"); }}
                      />
                      {overSubmission && (
                        <div className="mt-2 flex items-start gap-2 rounded-lg border border-warning/40 bg-warning-bg px-3 py-2">
                          <AlertTriangle size={14} className="mt-0.5 shrink-0 text-warning" />
                          <p className="text-caption text-fg">
                            This request asked for <span className="font-semibold">{requestedPlacements} {selectedLevel} placement{requestedPlacements !== 1 ? "s" : ""}</span>
                            {alreadyUploaded > 0 && <> and <span className="font-semibold">{alreadyUploaded}</span> {alreadyUploaded === 1 ? "has" : "have"} already been submitted</>}.
                            {" "}Adding <span className="font-semibold">{thisSlots}</span> more would exceed it by <span className="font-semibold">{overBy}</span>. You can still submit — the IO will be notified of the over-submission.
                          </p>
                        </div>
                      )}
                    </FormField>
                    <FormField label="Project Duration" required error={errors.internshipDuration} hint="How long the internship runs.">
                      <select
                        className={cn(SELECT_CLS, errors.internshipDuration && ERROR_CLS)}
                        value={internshipDuration}
                        onChange={(e) => { setInternshipDuration(e.target.value); clearError("internshipDuration"); }}
                      >
                        <option value="">Select duration…</option>
                        {getDropdown("Project Duration").map((v) => (
                          <option key={v} value={v}>{v}</option>
                        ))}
                      </select>
                    </FormField>
                    <div className="sm:col-span-2">
                    {(() => {
                      const winPresets = INTERNSHIP_WINDOWS[educationLevel] || [];
                      const winSelected = winPresets.find(p => mmmyyToISO(p.start) === internshipPeriodStart && mmmyyToISOEnd(p.end) === internshipPeriodEnd)?.label ?? "";
                      return (
                        <FormField
                          label="Internship Window"
                          required
                          error={errors.internshipPeriodStart || errors.internshipPeriodEnd}
                          hint="Windows follow the selected intern category — a preset defaults to the 1st of the start month and last day of the end month; adjust the exact dates below. (How long an intern actually runs is the Project Duration.)"
                        >
                          {!educationLevel ? (
                            <select className={SELECT_CLS} disabled>
                              <option>Select an intern category first…</option>
                            </select>
                          ) : (
                            <div className="space-y-2">
                              {winPresets.length > 0 && (
                                <select
                                  className={SELECT_CLS}
                                  value={winSelected}
                                  onChange={(e) => {
                                    const p = winPresets.find(x => x.label === e.target.value);
                                    if (!p) return;
                                    setInternshipPeriodStart(mmmyyToISO(p.start));
                                    setInternshipPeriodEnd(mmmyyToISOEnd(p.end));
                                    clearError("internshipPeriodStart");
                                    clearError("internshipPeriodEnd");
                                  }}
                                >
                                  <option value="">Choose a window preset…</option>
                                  {winPresets.map(p => <option key={p.label} value={p.label}>{p.label}</option>)}
                                </select>
                              )}
                              <DateRangePicker
                                start={internshipPeriodStart}
                                end={internshipPeriodEnd}
                                placeholder="Select start and end date"
                                error={!!(errors.internshipPeriodStart || errors.internshipPeriodEnd)}
                                onChange={(s, e2) => {
                                  setInternshipPeriodStart(s);
                                  setInternshipPeriodEnd(e2);
                                  clearError("internshipPeriodStart");
                                  clearError("internshipPeriodEnd");
                                }}
                              />
                            </div>
                          )}
                        </FormField>
                      );
                    })()}
                    </div>
                  </div>
                </div>
              </div>
          )}

          {/* ── Step 3: Mentor Information ────────────────────────────────── */}
          {step === 3 && (
            <div>
                <SectionDivider label="Mentor Information" />
                <div className="space-y-4">
                  <FormField label="Primary Mentor Name" required error={errors.mentor} hint="Who will guide the intern day to day.">
                    <input
                      className={cn(INPUT_CLS, errors.mentor && ERROR_CLS)}
                      placeholder="e.g. Dr James Tan"
                      value={mentor}
                      onChange={(e) => { setMentor(e.target.value); clearError("mentor"); }}
                    />
                  </FormField>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField label="Primary Mentor Appointment" required error={errors.mentorAppointment} hint="The mentor's job title.">
                      <input
                        className={cn(INPUT_CLS, errors.mentorAppointment && ERROR_CLS)}
                        placeholder="e.g. Principal Engineer"
                        value={mentorAppointment}
                        onChange={(e) => { setMentorAppointment(e.target.value); clearError("mentorAppointment"); }}
                      />
                    </FormField>
                    <FormField label="Primary Mentor Email" required error={errors.mentorUserId} hint="The mentor's DSTA email address.">
                      <input
                        className={cn(INPUT_CLS, errors.mentorUserId && ERROR_CLS)}
                        placeholder="e.g. james_tan@dsta.gov.sg"
                        value={mentorUserId}
                        onChange={(e) => { setMentorUserId(e.target.value); clearError("mentorUserId"); }}
                      />
                    </FormField>
                  </div>
                  <FormField label="Secondary Mentor Name" hint="Optional — leave blank if there is no secondary mentor.">
                    <input
                      className={INPUT_CLS}
                      placeholder="Optional"
                      value={secondaryMentor}
                      onChange={(e) => setSecondaryMentor(e.target.value)}
                    />
                  </FormField>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField label="Secondary Mentor Appointment">
                      <input
                        className={INPUT_CLS}
                        placeholder="Optional"
                        value={secondaryMentorAppointment}
                        onChange={(e) => setSecondaryMentorAppointment(e.target.value)}
                      />
                    </FormField>
                    <FormField label="Secondary Mentor Email" error={errors.secondaryMentorEmail}>
                      <input
                        className={cn(INPUT_CLS, errors.secondaryMentorEmail && ERROR_CLS)}
                        placeholder="Optional"
                        value={secondaryMentorEmail}
                        onChange={(e) => { setSecondaryMentorEmail(e.target.value); clearError("secondaryMentorEmail"); }}
                      />
                    </FormField>
                  </div>
                </div>
              </div>
          )}

          {/* ── Step 4: Review, Programme & Declaration ──────────────────── */}
          {step === 4 && (
            <div className="space-y-8">
              {/* Review summary */}
              <div>
                <SectionDivider label="Review" />
                <div className="grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2">
                  <ReviewRow label="Project Title" value={title} full />
                  <ReviewRow label="Project Scope" value={description} full />
                  <ReviewRow label="PC" value={pc} />
                  <ReviewRow label="Intern Category" value={educationLevel} />
                  <ReviewRow label="Tech Competency" value={skills.join(", ")} />
                  <ReviewRow label="Discipline of Study" value={disciplineList.join(", ")} />
                  <ReviewRow label="No. of Placements" value={slots} />
                  <ReviewRow label="Project Duration" value={internshipDuration} />
                  <ReviewRow
                    label="Internship Period"
                    value={internshipPeriodStart && internshipPeriodEnd ? `${internshipPeriodStart} – ${internshipPeriodEnd}` : ""}
                  />
                  <ReviewRow label="Primary Mentor Name" value={mentor} />
                  <ReviewRow label="Primary Mentor Appointment" value={mentorAppointment} />
                  <ReviewRow label="Primary Mentor Email" value={mentorUserId} />
                  <ReviewRow label="Secondary Mentor Name" value={secondaryMentor} />
                  <ReviewRow label="Secondary Mentor Appointment" value={secondaryMentorAppointment} />
                  <ReviewRow label="Secondary Mentor Email" value={secondaryMentorEmail} />
                </div>
              </div>

              {/* Programme attachment (optional) — IO only. AD (P&C) are responding
                  to a request; their projects go into a review batch and are attached
                  to a programme later by the IO, so this step is hidden for them. */}
              {!isAd && (
                <div>
                  <SectionDivider label="Programme" />
                  <FormField label="Programme (optional)" hint="Attach to a programme now, or leave blank to do it later.">
                    <SingleCombobox
                      options={progOpts}
                      value={programme}
                      onChange={(v) => setProgramme(v)}
                      placeholder="Search programme…"
                    />
                  </FormField>
                </div>
              )}

              {/* Declaration — mirrors the AD (P&C) project upload flow */}
              <div>
                <SectionDivider label="Declaration" />
                <div
                  className={cn(
                    "rounded-xl border p-4 space-y-3 transition-colors",
                    errors.declaration ? "border-warning/50 bg-warning-bg" : "border-border bg-bg-subtle",
                  )}
                >
                  <div className="flex items-center justify-between">
                    <p className="text-label-sm text-fg-muted uppercase tracking-widest">Declaration</p>
                    {errors.declaration && (
                      <span className="text-[12px] font-bold text-warning bg-warning/10 px-2 py-0.5 rounded-full">
                        Required
                      </span>
                    )}
                  </div>
                  <label className="flex items-start gap-3 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={declClearance}
                      onChange={(e) => {
                        setDeclClearance(e.target.checked);
                        if (e.target.checked) clearError("declaration");
                      }}
                      className="mt-0.5 h-4 w-4 rounded border-border accent-accent shrink-0"
                    />
                    <div className="text-body-sm leading-snug text-fg">
                      I confirm that:
                      <ul className="mt-1.5 space-y-1 list-disc pl-5">
                        <li>Necessary security clearance has been obtained for this project</li>
                        <li>This project has received endorsement from the respective PC Head(s) prior to creation</li>
                      </ul>
                    </div>
                  </label>
                  {errors.declaration && (
                    <FieldRequired show message={errors.declaration} />
                  )}
                </div>
              </div>
            </div>
          )}
          </div>
        </div>
        </div>

        {/* Footer — full-bleed sticky action bar (matches the project-request wizard) */}
        <div className="sticky bottom-0 z-20 -mx-[clamp(24px,2.6vw,40px)] -mb-8 mt-5 flex shrink-0 items-center justify-between gap-3 border-t border-border bg-surface/95 px-[clamp(24px,2.6vw,40px)] py-4 shadow-[0_-2px_10px_rgba(0,0,0,0.05)] backdrop-blur">
          {step > 1 && (
            <Button variant="ghost" onClick={() => { setErrors({}); setStep(step - 1); }}>
              <ArrowLeft size={16} />Back
            </Button>
          )}
          <div className="flex items-center gap-3 ml-auto">
            {step === 1 && (
              <Button variant="outline" onClick={() => router.push(backRoute)}>Cancel</Button>
            )}
            {canDraft && (
              <Button variant="outline" onClick={handleSaveDraft}>
                <Save size={15} />Save Draft
              </Button>
            )}
            {step < 4 ? (
              <Button onClick={step === 1 ? goToStep2 : step === 2 ? goToStep3 : goToStep4}>
                Next: {STEP_DEFS[step].label} <ArrowRight size={16} />
              </Button>
            ) : (
              <Button onClick={handleSubmit} disabled={saving}>
                <CheckCircle2 size={16} />
                {saving ? "Saving…" : isAd ? "Submit Project" : "Create Project"}
              </Button>
            )}
          </div>
        </div>
      </div>
      <Toast message={toast} />
    </Shell>
  );
}
