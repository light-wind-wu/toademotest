"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Shell from "@/components/layout/shell";
import Button from "@/components/ui-legacy/button";
import {
  Upload,
  Download,
  Plus,
  Trash2,
  FileSpreadsheet,
  RotateCcw,
  CheckCircle2,
  ArrowLeft,
  FolderOpen,
  AlertTriangle,
  Save,
  X,
} from "lucide-react";
import AiSparkleIcon from "@/components/ui-legacy/ai-sparkle-icon";
import Combobox from "@/components/ui-legacy/combobox";
import { DISCIPLINE_OPTIONS, parseDisciplines, toggleDiscipline, mergeDisciplines } from "@/lib/disciplines";
import { parseSkills, removeSkill } from "@/lib/skills";
import { cn, exportProjectTemplateXLSX } from "@/lib/utils";
import { downloadRequestTemplateXLSX } from "@/lib/request-template";
import {
  CONTACTS,
  PROJECT_SUBMISSION_COLUMNS,
  loadLiveProgrammeOptions,
  toEducationLevel,
  type ProjectSubmissionColumn,
} from "@/lib/data";
import {
  loadProjectDrafts,
  loadProjects,
  loadRequests,
  loadSubmissions,
  saveProjectDrafts,
  saveProjects,
  saveRequests,
  saveSubmissions,
} from "@/lib/storage";
import RecipientInput from "@/components/ui-legacy/recipient-input";
import { useToast, Toast } from "@/components/ui-legacy/toast";
import { addNotification } from "@/lib/notifications";
import { useRole } from "@/lib/role";
import type {
  ProjectDraft,
  ProjectRequest,
  SubmittedProject,
  ProjectSubmissionBatch,
  ProjectEntry,
  EducationLevel,
  ProgCategory,
  UploadProjectDraftPayload,
} from "@/lib/types";
import {
  runAiCheck,
  generateTitleSuggestion,
  generateScopeSuggestion,
  generateSampleTitle,
} from "@/lib/ai-check";
import AiSuggestField from "@/components/ui-legacy/ai-suggest-field";
import { periodLabelToMMMYY } from "@/lib/internship-period";
import MonthYearPicker from "@/components/ui-legacy/month-year-picker";

/* ── Constants ────────────────────────────────────────────────────────────── */
const AD_PNC_EMAIL = "shuqi.ng@dsta.gov.sg";
const AD_PNC_HEAD_NAME = "Ng Shu Qi";
const PROJ_TPL_KEY = "dsta_proj_template_columns";
const PROJ_TPL_SEED_VER = "17";
const PROJ_TPL_VER_KEY = "dsta_proj_template_columns_seed_v";
const FLASH_KEY = "dsta_flash";

/* ── Column name → FormRow field mapping ──────────────────────────────────── */
const COL_TO_FIELD: Record<string, keyof FormRow> = {
  "Project Title": "title",
  "Project Scope": "description",
  PC: "pc",
  "Intern Category": "educationLevel",
  "Education Level": "educationLevel", // back-compat: header used before the rename

  "Tech Domain": "techDomain",
  "Emerging Area": "emergingArea",
  "Discipline of Study 1": "discipline",
  "Discipline of Study 2": "discipline",
  "Discipline of Study 3": "discipline",
  "Skills / Knowledge Required": "skillsRaw",
  "No. of Placements": "slots",
  "Project Duration": "internshipDuration",
  "Internship Start Month": "internshipPeriodStart",
  "Internship End Month": "internshipPeriodEnd",
  "Full Name of Main Mentor": "mentor",
  "Main Mentor Appointment": "mentorAppointment",
  "Main Mentor Email": "mentorUserId",
  "Main Mentor Write-up": "mentorBio",
};

function loadLiveColumns(): ProjectSubmissionColumn[] {
  try {
    if (localStorage.getItem(PROJ_TPL_VER_KEY) !== PROJ_TPL_SEED_VER) {
      return PROJECT_SUBMISSION_COLUMNS;
    }
    const raw = localStorage.getItem(PROJ_TPL_KEY);
    return raw ? JSON.parse(raw) : PROJECT_SUBMISSION_COLUMNS;
  } catch {
    return PROJECT_SUBMISSION_COLUMNS;
  }
}

function getMissingRequired(
  row: FormRow,
  requiredFields: (keyof FormRow)[],
): string[] {
  return requiredFields.filter((field) => {
    const val = row[field];
    if (field === "slots") return !val || (val as number) < 1;
    return !val || String(val).trim() === "";
  });
}

function getRequiredFieldLabels(
  columns: ProjectSubmissionColumn[],
): { field: keyof FormRow; label: string }[] {
  return columns
    .filter((c) => c.required && COL_TO_FIELD[c.name])
    .map((c) => ({ field: COL_TO_FIELD[c.name], label: c.name }));
}

/* ── Helpers ──────────────────────────────────────────────────────────────── */
function downloadTemplate() {
  exportProjectTemplateXLSX(PROJECT_SUBMISSION_COLUMNS);
}

/* ── Row types ────────────────────────────────────────────────────────────── */
interface FormRow extends Omit<
  SubmittedProject,
  | "aiCheck"
  | "status"
  | "preferredEducation"
  | "minGpa"
  | "projectType"
  | "additionalRequirements"
> {
  skillsRaw: string;
  levels: ProgCategory[];
}

/* Next sequential pool id (PROJ-000N) — mirrors the single-project wizard so IO
   uploads land in the pool with consistent ids. */
function generateProjectId(existing: ProjectEntry[]): string {
  const nums = existing
    .map((p) => parseInt(p.id.replace(/^PROJ-/, ""), 10))
    .filter((n) => !isNaN(n));
  const max = nums.length > 0 ? Math.max(...nums) : 0;
  return `PROJ-${String(max + 1).padStart(4, "0")}`;
}

function emptyRow(idx: number): FormRow {
  return {
    id: `new-${Date.now()}-${idx}`,
    title: "",
    description: "",
    mentor: "",
    mentorAppointment: "",
    mentorUserId: "",
    mentorDept: "",
    mentorBio: "",
    skills: [],
    skillsRaw: "",
    discipline: "",
    slots: 1,
    pc: "",
    techDomain: "",
    emergingArea: "",
    educationLevel: toEducationLevel(""),
    internshipDuration: "3 Months",
    levels: [],
  };
}

/* ── File parsing helpers ─────────────────────────────────────────────────── */
function parseCellValue(val: unknown): string {
  if (val === null || val === undefined) return "";
  if (typeof val === "string") return val.trim();
  if (typeof val === "number") return String(val);
  if (typeof val === "boolean") return String(val);
  if (val instanceof Date) return val.toISOString().split("T")[0];
  if (typeof val === "object") {
    const o = val as Record<string, unknown>;
    if ("richText" in o)
      return (o.richText as { text: string }[])
        .map((r) => r.text)
        .join("")
        .trim();
    // Hyperlink cell (e.g. Excel auto-links emails/URLs) → { text, hyperlink }
    if ("text" in o) return parseCellValue(o.text);
    if ("hyperlink" in o)
      return String(o.hyperlink)
        .replace(/^mailto:/i, "")
        .trim();
    if ("result" in o) return parseCellValue(o.result);
  }
  return String(val).trim();
}

function mapToFormRow(
  values: Record<string, string>,
  _labelToId: Record<string, string>,
): Omit<FormRow, "id"> | null {
  const title = (values["Project Title"] ?? "").trim();
  if (!title) return null;
  // Period: the template captures an explicit start and end month (mirroring the
  // programme intake window). For legacy single-column files, fall back to the
  // old "Internship Period" header for the start and derive the end from duration.
  const duration =
    values["Project Duration"] || values["Internship Duration"] || "3 Months";
  const periodStart = periodLabelToMMMYY(
    values["Internship Start Month"] ?? values["Internship Period"],
  );
  // Period (hosting window) and duration are independent — the end is taken only from
  // the explicit end-month column, never derived from the duration.
  const periodEnd = periodLabelToMMMYY(values["Internship End Month"]);
  return {
    levels: [],
    title,
    description: values["Project Scope"] ?? "",
    pc: values["PC"] ?? "",
    educationLevel: toEducationLevel(values["Intern Category"] ?? values["Intern Category"] ?? ""),
    techDomain: values["Tech Domain"] ?? "",
    emergingArea: values["Emerging Area"] ?? "",
    discipline: mergeDisciplines([
      values["Discipline of Study 1"],
      values["Discipline of Study 2"],
      values["Discipline of Study 3"],
      values["Discipline of Study"], // legacy single-column templates
    ]),
    skillsRaw: values["Skills / Knowledge Required"] ?? "",
    slots: Math.max(1, parseInt(values["No. of Placements"] ?? "1", 10) || 1),
    internshipDuration: duration,
    internshipPeriodStart: periodStart,
    internshipPeriodEnd: periodEnd,
    mentor: values["Full Name of Main Mentor"] ?? "",
    mentorAppointment: values["Main Mentor Appointment"] ?? "",
    mentorUserId:
      values["Main Mentor Email"] ?? values["Main Mentor User ID"] ?? "",
    mentorDept: "",
    mentorBio: values["Main Mentor Write-up"] ?? "",
    skills: [],
  };
}

function parseCSVText(
  text: string,
  labelToId: Record<string, string>,
): Omit<FormRow, "id">[] {
  function parseLine(line: string): string[] {
    const result: string[] = [];
    let cur = "",
      inQ = false;
    for (let i = 0; i < line.length; i++) {
      if (line[i] === '"') {
        if (inQ && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else inQ = !inQ;
      } else if (line[i] === "," && !inQ) {
        result.push(cur);
        cur = "";
      } else cur += line[i];
    }
    result.push(cur);
    return result;
  }
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 3) return [];
  const headers = parseLine(lines[0]).map((h) => h.trim());
  const rows: Omit<FormRow, "id">[] = [];
  for (let i = 2; i < lines.length; i++) {
    const vals = parseLine(lines[i]);
    const obj: Record<string, string> = {};
    headers.forEach((h, idx) => {
      obj[h] = (vals[idx] ?? "").trim();
    });
    const row = mapToFormRow(obj, labelToId);
    if (row) rows.push(row);
  }
  return rows;
}

async function parseXLSXFile(
  file: File,
  labelToId: Record<string, string>,
): Promise<Omit<FormRow, "id">[]> {
  const ExcelJS = (await import("exceljs")).default;
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(await file.arrayBuffer());
  const ws = wb.getWorksheet("Project Submission") ?? wb.worksheets[0];
  if (!ws) return [];

  const headers: string[] = [];
  ws.getRow(1).eachCell({ includeEmpty: true }, (cell, col) => {
    headers[col - 1] = parseCellValue(cell.value);
  });

  const rows: Omit<FormRow, "id">[] = [];
  ws.eachRow((row, rowNum) => {
    if (rowNum <= 2) return; // row 1 = headers, row 2 = sample
    const obj: Record<string, string> = {};
    row.eachCell({ includeEmpty: true }, (cell, col) => {
      const h = headers[col - 1];
      if (h) obj[h] = parseCellValue(cell.value);
    });
    const parsed = mapToFormRow(obj, labelToId);
    if (parsed) rows.push(parsed);
  });
  return rows;
}

/* ── Page ─────────────────────────────────────────────────────────────────── */
export default function AdPncUploadProjectsPage() {
  const { toast: toastMsg, showToast } = useToast();
  const { role } = useRole();
  // IO / IO-Admin share this bulk uploader, but their projects go straight into the
  // approved pool (like the single-project wizard's IO path), not a review batch.
  const isIo = role === "io" || role === "io-admin";
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestToken = searchParams.get("token") ?? "";
  const draftId = searchParams.get("draftId") ?? "";

  const [requests, setRequests] = useState<ProjectRequest[]>([]);
  const [columns, setColumns] = useState<ProjectSubmissionColumn[]>(
    PROJECT_SUBMISSION_COLUMNS,
  );
  const [phase, setPhase] = useState<"idle" | "parsing" | "form">("idle");
  const [rows, setRows] = useState<FormRow[]>([]);
  const [fileName, setFileName] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [declClearance, setDeclClearance] = useState(false);
  const [activeTabId, setActiveTabId] = useState<string>("");
  // Rows whose required-field validation should be shown. A freshly added manual
  // row stays out of this set (no red until the user edits it); imported rows are
  // added immediately so uploaded data is validated on sight.
  const [touchedRows, setTouchedRows] = useState<Set<string>>(new Set());
  const [draftRestored, setDraftRestored] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (rows.length > 0 && !rows.find((r) => r.id === activeTabId)) {
      setActiveTabId(rows[0].id);
    }
  }, [rows, activeTabId]);

  useEffect(() => {
    setColumns(loadLiveColumns());

    const allRequests = loadRequests();
    setRequests(requestToken ? allRequests.filter((r) => r.uploadToken === requestToken) : allRequests);
  }, [requestToken]);

  useEffect(() => {
    if (!draftId || role !== "ad-pnc") return;
    const draft = loadProjectDrafts().find(
      (item) =>
        item.id === draftId &&
        item.source === "upload-projects" &&
        item.ownerRole === role,
    );
    if (!draft || !("rows" in draft.payload)) return;
    restoreUploadDraft(draft.payload);
  }, [draftId, role]);

  /* ── Derived ──────────────────────────────────────────────────────────── */
  const openRequests = requests.filter((r) => r.status !== "matched");

  // Requested intern category(s) + per-level placement targets for the request this
  // upload is responding to (all levels under the same token). Drives the per-row
  // level-mismatch and over-submission warnings — parity with the single-project wizard.
  const tokenRequests = requests.filter((r) => !requestToken || r.uploadToken === requestToken);
  const requestedLevels = Array.from(new Set(tokenRequests.map((r) => r.educationLevel)));
  const levelTargets = new Map<string, { requested: number; alreadyUploaded: number }>();
  for (const r of tokenRequests) {
    const cur = levelTargets.get(r.educationLevel) ?? { requested: 0, alreadyUploaded: 0 };
    cur.requested += r.placements;
    cur.alreadyUploaded += r.uploaded ?? 0;
    levelTargets.set(r.educationLevel, cur);
  }
  // Total placements this upload adds per intern category (rows can share a level).
  const batchSlotsByLevel = new Map<string, number>();
  for (const row of rows) {
    const lvl = toEducationLevel(row.educationLevel ?? "");
    if (!lvl) continue;
    batchSlotsByLevel.set(lvl, (batchSlotsByLevel.get(lvl) ?? 0) + (row.slots || 0));
  }
  // Per-row helper: is this row's level unrequested / does its level exceed the request?
  function levelChecks(row: FormRow) {
    const lvl = toEducationLevel(row.educationLevel ?? "");
    const mismatch = !!requestToken && requestedLevels.length > 0 && !!lvl && !requestedLevels.includes(lvl);
    const target = lvl ? levelTargets.get(lvl) : undefined;
    const submitted = lvl ? (batchSlotsByLevel.get(lvl) ?? 0) : 0;
    const total = (target?.alreadyUploaded ?? 0) + submitted;
    const over = !!target && total > target.requested;
    return {
      lvl,
      mismatch,
      over,
      overBy: over ? total - target!.requested : 0,
      requested: target?.requested ?? 0,
      alreadyUploaded: target?.alreadyUploaded ?? 0,
      submitted,
    };
  }

  /* ── File handling ────────────────────────────────────────────────────── */
  async function handleFile(file: File) {
    setFileName(file.name);
    setPhase("parsing");

    try {
      const ext = file.name.split(".").pop()?.toLowerCase();
      let parsed: Omit<FormRow, "id">[] = [];

      if (ext === "csv") {
        parsed = parseCSVText(await file.text(), {});
      } else {
        parsed = await parseXLSXFile(file, {});
      }

      if (parsed.length === 0) {
        const empty = [emptyRow(0)];
        setRows(empty);
        setExpanded(new Set(empty.map((r) => r.id)));
        setActiveTabId(empty[0].id);
        showToast(
          "No project rows found in the file. Add at least one row with a Project Title.",
        );
      } else {
        const populated = parsed.map((p, i) => ({ ...emptyRow(i), ...p }));
        setRows(populated);
        setExpanded(new Set(populated.map((r) => r.id)));
        setTouchedRows(new Set(populated.map((r) => r.id)));
        setActiveTabId(populated[0].id);
      }
      setPhase("form");
    } catch {
      const empty = [emptyRow(0)];
      setRows(empty);
      setExpanded(new Set(empty.map((r) => r.id)));
      setPhase("form");
      showToast("Could not read the file. Check the format and try again.");
    }
  }

  function addRow() {
    const r = emptyRow(rows.length);
    setRows((prev) => [...prev, r]);
    setExpanded((prev) => {
      const n = new Set(prev);
      n.add(r.id);
      return n;
    });
    setActiveTabId(r.id);
  }

  function updateRow(id: string, patch: Partial<FormRow>) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
    // Note: editing a field (incl. applying an AI suggestion) must NOT mark the row
    // touched — validation errors only surface after a submit attempt. Once touched
    // (on submit), the row stays touched so errors update live as the user fixes them.
  }

  function removeRow(id: string) {
    if (id === activeTabId) {
      const idx = rows.findIndex((r) => r.id === id);
      const next = rows.filter((r) => r.id !== id);
      if (next.length > 0)
        setActiveTabId(next[Math.min(idx, next.length - 1)].id);
    }
    setRows((prev) => prev.filter((r) => r.id !== id));
  }

  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  }

  function resetUpload() {
    setRows([]);
    setFileName("");
    setExpanded(new Set());
    setTouchedRows(new Set());
    setDeclClearance(false);
    setPhase("idle");
    if (fileRef.current) fileRef.current.value = "";
  }

  function restoreUploadDraft(payload: UploadProjectDraftPayload) {
    const restoredRows = payload.rows as unknown as FormRow[];
    setRows(restoredRows);
    setFileName(payload.fileName);
    setDeclClearance(!!payload.declClearance);
    setTouchedRows(new Set());
    setPhase(restoredRows.length > 0 ? "form" : "idle");
    setExpanded(new Set(restoredRows.map((row) => row.id)));
    setActiveTabId(payload.activeTabId || restoredRows[0]?.id || "");
    setDraftRestored(true);
  }

  function removeCurrentDraft() {
    if (!draftId) return;
    saveProjectDrafts(loadProjectDrafts().filter((draft) => draft.id !== draftId));
  }

  function handleSaveDraft() {
    if (role !== "ad-pnc") return;
    const id = draftId || `upload-draft-${Date.now()}`;
    const payload: UploadProjectDraftPayload = {
      rows: rows as unknown as Record<string, unknown>[],
      fileName,
      requestToken,
      activeTabId,
      declClearance,
    };
    const draft: ProjectDraft = {
      id,
      source: "upload-projects",
      ownerRole: "ad-pnc",
      title: fileName || "Upload projects draft",
      savedAt: new Date().toISOString(),
      requestToken,
      payload,
    };
    const existing = loadProjectDrafts().filter((item) => item.id !== id);
    saveProjectDrafts([draft, ...existing]);
    setDraftRestored(true);
    showToast("Upload draft saved.");
    const params = new URLSearchParams({ draftId: id });
    if (requestToken) params.set("token", requestToken);
    router.push(`/submissions/upload?${params.toString()}`);
  }

  /* ── Submit ───────────────────────────────────────────────────────────── */
  function handleSubmitAll() {
    if (rows.length === 0) return;
    // Reveal validation on every row so any still-missing fields light up.
    if (!rowsValid) {
      setTouchedRows(new Set(rows.map((r) => r.id)));
      showToast("Please fill in all required fields before submitting.");
      return;
    }
    if (!declClearance) {
      showToast("Please confirm the declaration before submitting.");
      return;
    }

    // IO uploads go straight into the approved pool (unassigned), mirroring the
    // single-project wizard's IO path — no review batch.
    if (isIo) {
      const existingProjects = loadProjects();
      const newProjects: ProjectEntry[] = [];
      for (const r of rows) {
        newProjects.push({
          id: generateProjectId([...existingProjects, ...newProjects]),
          title: r.title.trim(),
          description: r.description.trim(),
          mentor: r.mentor.trim(),
          mentorAppointment: r.mentorAppointment || undefined,
          mentorUserId: r.mentorUserId || undefined,
          mentorBio: r.mentorBio || undefined,
          skills: r.skillsRaw.split(",").map((s: string) => s.trim()).filter(Boolean),
          discipline: r.discipline || undefined,
          slots: r.slots,
          matched: 0,
          status: "open",
          programme: "",
          pc: r.pc || undefined,
          techDomain: r.techDomain || undefined,
          emergingArea: r.emergingArea || undefined,
          educationLevel: r.educationLevel ? toEducationLevel(r.educationLevel) : undefined,
          internshipDuration: r.internshipDuration || undefined,
          internshipPeriodStart: r.internshipPeriodStart || undefined,
          internshipPeriodEnd: r.internshipPeriodEnd || undefined,
        });
      }
      saveProjects([...newProjects, ...existingProjects]);
      removeCurrentDraft();
      sessionStorage.setItem(
        "dsta_pending_toast",
        `${rows.length} project${rows.length !== 1 ? "s" : ""} added to Projects.`,
      );
      router.push("/projects");
      return;
    }

    // Projects are submitted against an Intern Category, not a programme — group rows
    // by Intern Category. Programme tagging happens later, when an IO attaches approved
    // projects to a programme they create.
    const grouped = new Map<string, FormRow[]>();
    for (const row of rows) {
      const level = toEducationLevel(row.educationLevel ?? "");
      if (!level) continue;
      if (!grouped.has(level)) grouped.set(level, []);
      grouped.get(level)!.push(row);
    }

    const newBatches: ProjectSubmissionBatch[] = [];
    let batchSeq = 0;
    for (const [level, projRows] of Array.from(grouped.entries())) {
      const matchingReq = requests.find((r) =>
        r.educationLevel === level && (!requestToken || r.uploadToken === requestToken),
      );
      const batch: ProjectSubmissionBatch = {
        id: `batch-${Date.now()}-${batchSeq++}`,
        uploadToken: matchingReq?.uploadToken ?? requestToken,
        pc: AD_PNC_EMAIL,
        pcHead: AD_PNC_HEAD_NAME,
        programme: "",              // unassigned — an IO tags the project to a programme later
        educationLevel: toEducationLevel(level),
        requestedEducationLevels: requestToken && requestedLevels.length ? requestedLevels : undefined,
        placements:
          matchingReq?.placements ?? projRows.reduce((s, r) => s + r.slots, 0),
        uploadedAt: new Date().toISOString().split("T")[0],
        projects: projRows.map(
          (r) =>
            ({
              id: r.id,
              title: r.title,
              description: r.description,
              mentor: r.mentor,
              mentorAppointment: r.mentorAppointment || undefined,
              mentorUserId: r.mentorUserId || undefined,
              mentorDept: r.mentorDept,
              mentorBio: r.mentorBio,
              skills: r.skillsRaw
                .split(",")
                .map((s: string) => s.trim())
                .filter(Boolean),
              discipline: r.discipline,
              slots: r.slots,
              preferredEducation: "Any",
              minGpa: "",
              projectType: "Technical",
              additionalRequirements: "",
              aiCheck: runAiCheck(
                r.title,
                r.description,
                r.educationLevel ?? "",
                r.skillsRaw
                  .split(",")
                  .map((s: string) => s.trim())
                  .filter(Boolean),
                r.techDomain ?? "",
              ),
              status: "pending" as const,
              pc: r.pc || undefined,
              techDomain: r.techDomain || undefined,
              emergingArea: r.emergingArea || undefined,
              educationLevel: r.educationLevel || undefined,
              internshipDuration: r.internshipDuration || undefined,
              internshipPeriodStart: r.internshipPeriodStart || undefined,
              internshipPeriodEnd: r.internshipPeriodEnd || undefined,
            }) as SubmittedProject,
        ),
      };
      newBatches.push(batch);
    }

    // Persist batches
    const existing = loadSubmissions();
    saveSubmissions([...newBatches, ...existing]);

    // Update matching request statuses. Accumulate onto any prior uploads (so several
    // uploads against one request add up) and note any that now exceed the request.
    const overNotes: string[] = [];
    {
      const allReqs = loadRequests();
      const updatedReqs = allReqs.map((r: ProjectRequest) => {
        const batch = newBatches.find((b) =>
          b.educationLevel === r.educationLevel && (!requestToken || b.uploadToken === r.uploadToken),
        );
        if (!batch) return r;
        const submittedSlots = batch.projects.reduce((sum, p) => sum + p.slots, 0);
        const total = (r.uploaded ?? 0) + submittedSlots;
        const newStatus =
          total > r.placements
            ? ("excess" as const)
            : total === r.placements
              ? ("matched" as const)
              : ("partial" as const);
        if (total > r.placements) {
          overNotes.push(`${r.educationLevel} by ${total - r.placements}`);
        }
        return {
          ...r,
          uploaded: total,
          created: (r.created ?? 0) + batch.projects.length,
          status: newStatus,
        };
      });
      saveRequests(updatedReqs);
      setRequests(updatedReqs);
    }

    // Intern categories submitted that the request never asked for.
    const mismatchLevels = requestToken
      ? Array.from(new Set(newBatches.map((b) => b.educationLevel).filter((lvl): lvl is EducationLevel => !!lvl && !requestedLevels.includes(lvl))))
      : [];

    const submissionNotes: string[] = [];
    if (mismatchLevels.length) submissionNotes.push(`submitted ${mismatchLevels.join(", ")} which ${mismatchLevels.length === 1 ? "was" : "were"} not requested`);
    if (overNotes.length) submissionNotes.push(`exceeded the requested placements for ${overNotes.join("; ")}`);

    addNotification({
      forRole: "io",
      title: `New project submission — ${newBatches.length} intern categor${newBatches.length !== 1 ? "ies" : "y"}`,
      body: submissionNotes.length
        ? `AD (P&C) submitted ${rows.length} project${rows.length !== 1 ? "s" : ""} — ${submissionNotes.join("; ")}.`
        : `AD (P&C) has submitted ${rows.length} project${rows.length !== 1 ? "s" : ""} for review across ${newBatches.length} intern categor${newBatches.length !== 1 ? "ies" : "y"}.`,
      href: "/projects",
      tier: "action",
    });
    removeCurrentDraft();
    // Flash a success toast on the submissions page after redirect (this page unmounts).
    try {
      sessionStorage.setItem(
        FLASH_KEY,
        JSON.stringify({
          message: `${rows.length} project${rows.length !== 1 ? "s" : ""} submitted successfully. The IO will review and approve your submissions.`,
          tone: "success",
        }),
      );
    } catch {}
    router.push("/submissions");
  }

  /* ── Validation ──────────────────────────────────────────────────────── */
  const requiredFieldDefs = getRequiredFieldLabels(columns);
  // Internship period is required alongside duration (not a spreadsheet column, so
  // appended here explicitly).
  const requiredFields: (keyof FormRow)[] = Array.from(
    new Set<keyof FormRow>([
      ...requiredFieldDefs.map((f) => f.field),
      "internshipPeriodStart",
      "internshipPeriodEnd",
    ]),
  );

  // field key → column config (for fieldType + dropdownValues)
  const colByField: Partial<Record<keyof FormRow, ProjectSubmissionColumn>> =
    {};
  for (const col of columns) {
    const field = COL_TO_FIELD[col.name];
    if (field) colByField[field] = col;
  }

  function rowMissing(row: FormRow): string[] {
    return getMissingRequired(row, requiredFields);
  }

  const rowsValid =
    rows.length > 0 && rows.every((r) => rowMissing(r).length === 0);
  const declPending = rowsValid && !declClearance;
  const canSubmit = rowsValid && declClearance;

  /* ── Render ───────────────────────────────────────────────────────────── */
  return (
    <Shell activeRoute={isIo ? "/projects" : "/submissions"} hideNavigation={!isIo}>
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() =>
            router.push(
              isIo
                ? "/projects"
                : requestToken
                  ? `/submissions/respond?token=${encodeURIComponent(requestToken)}&mode=upload`
                  : "/submissions",
            )
          }
          className="inline-flex items-center gap-1.5 text-body-sm text-fg-muted hover:text-fg transition-colors mb-3"
        >
          <ArrowLeft size={14} />
          {isIo ? "Back to Projects" : requestToken ? "Back to request" : "Back to Project Requests"}
        </button>
        <h1 className="text-headline-lg text-fg mb-1">Upload Projects</h1>
      </div>

      {draftRestored && (
        <div className="mb-5 rounded-lg border border-info/30 bg-info-bg px-4 py-3 text-body-sm text-fg">
          This upload draft is saved locally. Submit it when all project rows are complete.
        </div>
      )}

      {!isIo && requests.length === 0 ? (
        <div className="bg-surface rounded-xl border border-border p-16 flex flex-col items-center gap-3">
          <FolderOpen size={32} className="text-fg-subtle" />
          <p className="text-body-md text-fg-muted">
            No requests assigned to you. You're all caught up.
          </p>
        </div>
      ) : !isIo && openRequests.length === 0 ? (
        <div className="bg-success-bg border border-success/20 rounded-xl p-5 flex items-center gap-3">
          <CheckCircle2 size={20} className="text-success shrink-0" />
          <div>
            <p className="text-body-sm font-semibold text-success">
              All submissions complete
            </p>
            <p className="text-body-sm text-success/80">
              All requests have been responded to. The IO will review and approve
              your projects.
            </p>
          </div>
        </div>
      ) : (
        <div className="bg-surface rounded-xl border border-border shadow-sm overflow-hidden">
          {/* Upload section header */}


          <div className="px-5 py-5 space-y-5">
            {/* Idle: download + upload */}
            {phase === "idle" && (
              <>

                {/* Step 1: Download */}
                <div className="bg-bg-subtle rounded-xl p-4 flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <p className="text-body-sm font-semibold text-fg mb-1">
                      Step 1 — Download the project template
                    </p>
                    <p className="text-body-sm text-fg-muted">
                      Fill in the Excel template. Each row is one project. After
                      uploading, select the student level(s) for each row in the
                      form.
                    </p>
                  </div>
                  <button
                    onClick={() => requestToken && tokenRequests.length
                      ? downloadRequestTemplateXLSX(tokenRequests)
                      : downloadTemplate()}
                    className="shrink-0 flex items-center gap-2 px-3 py-2 bg-surface border border-border rounded-lg text-body-sm font-semibold text-fg hover:bg-bg-subtle transition-colors whitespace-nowrap"
                  >
                    <Download size={14} />
                    Download Template
                  </button>
                </div>

                {/* Step 2: Upload */}
                <div>
                  <p className="text-body-sm font-semibold text-fg mb-2">
                    Step 2 — Upload your completed file
                  </p>
                  <div
                    className="border-2 border-dashed border-border rounded-xl p-8 flex flex-col items-center gap-3 cursor-pointer hover:border-accent hover:bg-accent/5 transition-all"
                    onClick={() => fileRef.current?.click()}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      const f = e.dataTransfer.files[0];
                      if (f) handleFile(f);
                    }}
                  >
                    <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
                      <FileSpreadsheet size={20} className="text-accent" />
                    </div>
                    <div className="text-center">
                      <p className="text-body-sm font-semibold text-fg mb-0.5">
                        Upload your completed template
                      </p>
                      <p className="text-body-sm text-fg-muted">
                        Drag and drop or click to browse · Excel file (.xlsx)
                      </p>
                    </div>
                    <input
                      ref={fileRef}
                      type="file"
                      accept=".xlsx,.xls"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) handleFile(f);
                      }}
                    />
                  </div>

                </div>
              </>
            )}

            {/* Parsing */}
            {phase === "parsing" && (
              <div className="flex flex-col items-center gap-3 py-8">
                <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center animate-pulse">
                  <FileSpreadsheet size={20} className="text-accent" />
                </div>
                <p className="text-body-sm font-semibold text-fg">
                  Parsing {fileName}…
                </p>
                <p className="text-body-sm text-fg-muted">
                  Extracting project data from your spreadsheet
                </p>
              </div>
            )}

            {/* Form */}
            {phase === "form" && (
              <>
                <div className="flex items-center justify-between gap-3">
                  <p className="text-body-sm font-semibold text-fg truncate">
                    {rows.length} project{rows.length !== 1 ? "s" : ""}
                    {fileName ? ` from ${fileName}` : ""}
                  </p>
                  <div className="flex items-center gap-2 shrink-0">
                    {!isIo && (
                      <button
                        onClick={handleSaveDraft}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-body-sm text-fg hover:bg-bg-subtle transition-colors"
                      >
                        <Save size={13} />
                        Save Draft
                      </button>
                    )}
                    <button
                      onClick={resetUpload}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-body-sm text-fg-muted hover:bg-danger-bg hover:text-danger hover:border-danger/40 transition-colors"
                    >
                      <RotateCcw size={13} />
                      Replace file
                    </button>
                    <button
                      onClick={addRow}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-body-sm text-fg hover:bg-bg-subtle transition-colors"
                    >
                      <Plus size={13} />
                      Add row
                    </button>
                  </div>
                </div>

                {/* Tab bar */}
                <div className="flex overflow-x-auto border-b border-border -mx-5 px-5 gap-0 mb-4">
                  {rows.map((row, idx) => {
                    const tabMissing = touchedRows.has(row.id)
                      ? rowMissing(row)
                      : [];
                    const isActive = row.id === activeTabId;
                    return (
                      <button
                        key={row.id}
                        type="button"
                        onClick={() => setActiveTabId(row.id)}
                        className={cn(
                          "flex items-center gap-2 px-3.5 py-2.5 text-body-sm border-b-2 transition-colors shrink-0 whitespace-nowrap",
                          tabMissing.length > 0
                            ? isActive
                              ? "border-danger text-danger font-semibold"
                              : "border-transparent text-danger hover:text-danger"
                            : isActive
                              ? "border-accent text-accent font-semibold"
                              : "border-transparent text-fg-muted hover:text-fg",
                        )}
                      >
                        <span
                          className={cn(
                            "w-5 h-5 rounded flex items-center justify-center text-[12px] font-black shrink-0",
                            tabMissing.length > 0
                              ? "bg-danger/10 text-danger"
                              : isActive
                                ? "bg-accent/10 text-accent"
                                : "bg-border text-fg-muted",
                          )}
                        >
                          {idx + 1}
                        </span>
                        <span className="max-w-[130px] truncate">
                          {row.title || "Untitled"}
                        </span>
                        {tabMissing.length > 0 && (
                          <span className="text-[12px] font-bold w-4 h-4 rounded-full bg-danger text-white flex items-center justify-center shrink-0">
                            {tabMissing.length}
                          </span>
                        )}
                      </button>
                    );
                  })}
                  <button
                    type="button"
                    onClick={addRow}
                    className="flex items-center gap-1 px-3 py-2.5 text-body-sm text-fg-muted hover:text-fg transition-colors shrink-0 border-b-2 border-transparent ml-1"
                    title="Add project"
                  >
                    <Plus size={14} />
                  </button>
                </div>

                {/* Active project form */}
                {rows.map((row, idx) => {
                  if (row.id !== activeTabId) return null;
                  const showErrors = touchedRows.has(row.id);
                  const missing = showErrors ? rowMissing(row) : [];
                  const err = (field: keyof FormRow) => missing.includes(field);
                  const rowSkills = row.skillsRaw
                    .split(",")
                    .map((s) => s.trim())
                    .filter(Boolean);
                  const rowAi = runAiCheck(
                    row.title,
                    row.description,
                    row.educationLevel ?? "",
                    rowSkills,
                    row.techDomain ?? "",
                  );
                  const rowAiHits = [rowAi.grammar, rowAi.level].filter(
                    (r) => r !== "pass",
                  ).length;
                  const titleNotes = rowAi.notes.filter((n) =>
                    /title/i.test(n),
                  );
                  const scopeNotes = rowAi.notes.filter(
                    (n) => !/title/i.test(n),
                  );
                  // AI suggestions — same single-suggestion behaviour as the individual
                  // create wizard: refine what's typed, or draft a sample when empty.
                  const titleSuggest = () =>
                    row.title.trim()
                      ? generateTitleSuggestion(row.title, row.educationLevel ?? "", row.techDomain ?? "")
                      : generateSampleTitle(row.educationLevel ?? "", row.techDomain ?? "", row.discipline ?? "");
                  const scopeSuggest = () =>
                    generateScopeSuggestion(
                      row.description.trim() ? row.title : "",
                      row.description.trim() ? row.description : "",
                      row.educationLevel ?? "",
                      rowSkills,
                      row.techDomain ?? "",
                    );
                  // Label stays neutral even on error — only the box turns red (best practice).
                  const lCls = (field: keyof FormRow, req: boolean) =>
                    `block text-[12px] font-bold uppercase tracking-wider mb-1 text-fg-subtle${req ? ' after:content-["_*"]' : ""}`;
                  const iCls = (field: keyof FormRow) =>
                    `w-full border rounded-lg px-3 py-2 text-body-sm bg-surface outline-none focus:ring-1 ${err(field) ? "border-danger focus:border-danger focus:ring-danger/20" : "border-border focus:border-accent focus:ring-accent/20"}`;
                  // Error subtext shown under an invalid required field.
                  const reqErr = (field: keyof FormRow, label: string) =>
                    err(field) ? <p className="mt-1 text-[12px] text-danger">{label} is required.</p> : null;

                  return (
                    <div
                      key={row.id}
                      className={cn(
                        "border rounded-xl overflow-hidden",
                        missing.length > 0
                          ? "border-danger/40"
                          : "border-border",
                      )}
                    >
                      {/* Status bar */}
                      <div className="flex items-center justify-between px-4 py-2 bg-bg-subtle border-b border-border">
                        <div className="flex items-center gap-2 text-[13px]">
                          {missing.length > 0 ? (
                            <span className="font-bold text-danger">
                              {missing.length} required field
                              {missing.length !== 1 ? "s" : ""} missing
                            </span>
                          ) : !showErrors ? (
                            <span className="text-fg-muted">
                              New project — fill in the details below
                            </span>
                          ) : rowAiHits > 0 ? (
                            <span className="inline-flex items-center gap-1 font-bold text-warning">
                              <AiSparkleIcon size={9} />
                              {rowAiHits} AI tip{rowAiHits !== 1 ? "s" : ""}
                            </span>
                          ) : (
                            <span className="text-success flex items-center gap-1">
                              <CheckCircle2 size={11} />
                              Looks good
                            </span>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => removeRow(row.id)}
                          className="flex items-center gap-1.5 text-[13px] text-fg-muted hover:text-danger transition-colors"
                        >
                          <Trash2 size={12} />
                          Remove
                        </button>
                      </div>

                      <div className="px-4 py-4 space-y-5">
                        {/* Requested-level / placement warnings — parity with the single wizard */}
                        {(() => {
                          const c = levelChecks(row);
                          if (!c.mismatch && !c.over) return null;
                          return (
                            <div className="space-y-2">
                              {c.mismatch && (
                                <div className="flex items-start gap-2 rounded-lg border border-warning/40 bg-warning-bg px-3 py-2">
                                  <AlertTriangle size={14} className="mt-0.5 shrink-0 text-warning" />
                                  <p className="text-[12px] text-fg leading-snug">
                                    This request asked for <span className="font-semibold">{requestedLevels.join(", ")}</span>, but this project is set to{" "}
                                    <span className="font-semibold">{c.lvl}</span>. You can still submit — the IO will be shown that the level differs from what was requested.
                                  </p>
                                </div>
                              )}
                              {c.over && (
                                <div className="flex items-start gap-2 rounded-lg border border-warning/40 bg-warning-bg px-3 py-2">
                                  <AlertTriangle size={14} className="mt-0.5 shrink-0 text-warning" />
                                  <p className="text-[12px] text-fg leading-snug">
                                    {c.lvl} was requested for <span className="font-semibold">{c.requested} placement{c.requested !== 1 ? "s" : ""}</span>
                                    {c.alreadyUploaded > 0 && <> ({c.alreadyUploaded} already submitted)</>}. This upload adds <span className="font-semibold">{c.submitted}</span>, exceeding the request by{" "}
                                    <span className="font-semibold">{c.overBy}</span>. You can still submit — the IO will be notified of the over-submission.
                                  </p>
                                </div>
                              )}
                            </div>
                          );
                        })()}
                        {/* Helper: render select or text input based on template config */}
                        {(() => {
                          function selOrInp(
                            field: keyof FormRow,
                            value: string,
                            onChange: (v: string) => void,
                            placeholder = "",
                          ) {
                            const col = colByField[field];
                            const control =
                              col?.fieldType === "dropdown" &&
                              col.dropdownValues?.length ? (
                                <select
                                  value={value}
                                  onChange={(e) => onChange(e.target.value)}
                                  className={iCls(field)}
                                >
                                  <option value="">— Select —</option>
                                  {col.dropdownValues.map((v) => (
                                    <option key={v} value={v}>
                                      {v}
                                    </option>
                                  ))}
                                </select>
                              ) : (
                                <input
                                  value={value}
                                  onChange={(e) => onChange(e.target.value)}
                                  placeholder={placeholder}
                                  className={iCls(field)}
                                />
                              );
                            return (
                              <>
                                {control}
                                {reqErr(field, col?.name ?? "This field")}
                              </>
                            );
                          }

                          /* ── Internship period ↔ duration linkage ────────────
                             Kept in sync by  end = start + N months. Editing the
                             duration or the start month drives the end month;
                             editing the end month (period-first) back-fills the
                             duration. */
                          const durStd = colByField["internshipDuration"]
                            ?.dropdownValues ?? [
                            "1 Month",
                            "2 Months",
                            "3 Months",
                            "4 Months",
                            "6 Months",
                            "12 Months",
                          ];
                          const durOpts =
                            row.internshipDuration &&
                            !durStd.includes(row.internshipDuration)
                              ? [row.internshipDuration, ...durStd]
                              : durStd;
                          // Duration and internship period are INDEPENDENT: the period is
                          // the window the project can be hosted (e.g. Jan–Jun); the
                          // duration is how long it actually runs (e.g. 2 months). Setting
                          // one must never rewrite the other.
                          const setDuration = (v: string) =>
                            updateRow(row.id, { internshipDuration: v });
                          const setPeriodStart = (v: string) =>
                            updateRow(row.id, { internshipPeriodStart: v });
                          const setPeriodEnd = (v: string) =>
                            updateRow(row.id, { internshipPeriodEnd: v });
                          // Month picker for a "MMMYY" period field. `minValue`
                          // greys out months before the chosen start so the
                          // period can never invert.
                          const monthSelect = (
                            field: keyof FormRow,
                            value: string,
                            onChange: (v: string) => void,
                            minValue?: string,
                          ) => (
                            <MonthYearPicker
                              ariaLabel={String(field)}
                              value={value || ""}
                              onChange={onChange}
                              minMonth={minValue}
                              error={!!err(field)}
                            />
                          );

                          return (
                            <>
                              {/* Intern Category — set first; the AI checks the scope against it */}
                              <div>
                                <p className="text-[11px] font-semibold text-fg-subtle uppercase tracking-wider mb-3">
                                  Intern Category <span className="text-danger">*</span>
                                </p>
                                <div className="max-w-sm">
                                  {selOrInp(
                                    "educationLevel",
                                    row.educationLevel ?? "",
                                    (v) =>
                                      updateRow(row.id, { educationLevel: toEducationLevel(v) }),
                                    "Select intern category",
                                  )}
                                </div>
                              </div>

                              {/* Project Details */}
                              <div>
                                <p className="text-[11px] font-semibold text-fg-subtle uppercase tracking-wider mb-3">
                                  Project Details
                                </p>
                                <div className="space-y-4">
                                  {/* Title — with AI assistant dropdown */}
                                  <div>
                                    <div className="flex items-center gap-2 mb-1">
                                      <label className='block text-[12px] font-bold uppercase tracking-wider text-fg-subtle after:content-["_*"]'>
                                        Project Title
                                      </label>
                                      {row.title.trim() &&
                                        titleNotes.length > 0 && (
                                        <span className="group/titlewarn relative inline-flex">
                                          <span
                                            className={cn(
                                              "inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[11px] font-bold normal-case tracking-normal cursor-help",
                                              "bg-warning/10 text-warning",
                                            )}
                                          >
                                            <AlertTriangle size={11} />
                                            {titleNotes.length} issue
                                            {titleNotes.length !== 1 ? "s" : ""}
                                          </span>
                                          {/* Hover tooltip listing the title issues */}
                                          <div className="pointer-events-none absolute left-0 top-full mt-1.5 z-30 hidden w-72 rounded-lg border border-border bg-surface p-2.5 shadow-lg group-hover/titlewarn:block">
                                            <ul className="space-y-1.5">
                                              {titleNotes.map((n, ni) => (
                                                <li
                                                  key={ni}
                                                  className="flex items-start gap-1.5 text-[12px] font-normal normal-case tracking-normal text-fg leading-snug"
                                                >
                                                  <span className="w-1.5 h-1.5 rounded-full shrink-0 mt-1 bg-warning" />
                                                  {n}
                                                </li>
                                              ))}
                                            </ul>
                                          </div>
                                        </span>
                                      )}
                                    </div>
                                    <AiSuggestField
                                      value={row.title}
                                      onChange={(v) =>
                                        updateRow(row.id, { title: v })
                                      }
                                      onApply={(v) =>
                                        updateRow(row.id, {
                                          title: v,
                                          originalTitle: row.originalTitle ?? row.title,
                                        })
                                      }
                                      generate={titleSuggest}
                                      placeholder="e.g. Cybersecurity Threat Analysis"
                                      inputClass={iCls("title")}
                                    />
                                    {reqErr("title", "Project title")}
                                    {row.originalTitle && (
                                      <div className="mt-2 pl-3 border-l-2 border-border flex items-start justify-between gap-2">
                                        <p className="text-[12px] text-fg-muted italic leading-snug">
                                          <span className="not-italic font-semibold text-fg-subtle mr-1">
                                            Original:
                                          </span>
                                          {row.originalTitle}
                                        </p>
                                        <button
                                          type="button"
                                          onClick={() =>
                                            updateRow(row.id, {
                                              title: row.originalTitle!,
                                              originalTitle: undefined,
                                            })
                                          }
                                          className="text-[12px] text-fg-muted hover:text-danger transition-colors shrink-0 whitespace-nowrap"
                                        >
                                          Restore
                                        </button>
                                      </div>
                                    )}
                                  </div>

                                  {/* Scope — with AI assistant dropdown */}
                                  <div>
                                    <div className="flex items-center gap-2 mb-1">
                                      <label className='block text-[12px] font-bold uppercase tracking-wider text-fg-subtle after:content-["_*"]'>
                                        Project Scope
                                      </label>
                                      {row.description.trim() &&
                                        scopeNotes.length > 0 && (
                                        <span className="group/scopewarn relative inline-flex">
                                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[11px] font-bold normal-case tracking-normal cursor-help bg-warning/10 text-warning">
                                            <AlertTriangle size={11} />
                                            {scopeNotes.length} issue
                                            {scopeNotes.length !== 1 ? "s" : ""}
                                          </span>
                                          {/* Hover tooltip listing the scope issues */}
                                          <div className="pointer-events-none absolute left-0 top-full mt-1.5 z-30 hidden w-80 rounded-lg border border-border bg-surface p-2.5 shadow-lg group-hover/scopewarn:block">
                                            <ul className="space-y-1.5">
                                              {scopeNotes.map((n, ni) => (
                                                <li
                                                  key={ni}
                                                  className="flex items-start gap-1.5 text-[12px] font-normal normal-case tracking-normal text-fg leading-snug"
                                                >
                                                  <span className="w-1.5 h-1.5 rounded-full shrink-0 mt-1 bg-warning" />
                                                  {n}
                                                </li>
                                              ))}
                                            </ul>
                                          </div>
                                        </span>
                                      )}
                                    </div>
                                    <AiSuggestField
                                      multiline
                                      rows={5}
                                      value={row.description}
                                      onChange={(v) =>
                                        updateRow(row.id, { description: v })
                                      }
                                      onApply={(v) =>
                                        updateRow(row.id, {
                                          description: v,
                                          originalDescription:
                                            row.originalDescription ?? row.description,
                                        })
                                      }
                                      generate={scopeSuggest}
                                      placeholder="Describe what the intern will do, tools they will use, and expected deliverables…"
                                      inputClass={iCls("description")}
                                    />
                                    {reqErr("description", "Project scope")}
                                    {row.originalDescription && (
                                      <div className="mt-2 pl-3 border-l-2 border-border flex items-start justify-between gap-2">
                                        <p className="text-[12px] text-fg-muted italic leading-snug line-clamp-2">
                                          <span className="not-italic font-semibold text-fg-subtle mr-1">
                                            Original:
                                          </span>
                                          {row.originalDescription}
                                        </p>
                                        <button
                                          type="button"
                                          onClick={() =>
                                            updateRow(row.id, {
                                              description:
                                                row.originalDescription!,
                                              originalDescription: undefined,
                                            })
                                          }
                                          className="text-[12px] text-fg-muted hover:text-danger transition-colors shrink-0 whitespace-nowrap"
                                        >
                                          Restore
                                        </button>
                                      </div>
                                    )}
                                  </div>

                                  {/* Classification — every field shares one uniform column width */}
                                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-4">
                                    <div>
                                      <label
                                        className={lCls("discipline", true)}
                                      >
                                        Discipline of Study
                                      </label>
                                      <Combobox
                                        selected={parseDisciplines(row.discipline)}
                                        onToggle={(opt) =>
                                          setRows((prev) =>
                                            prev.map((r) =>
                                              r.id === row.id
                                                ? { ...r, discipline: toggleDiscipline(r.discipline, opt) }
                                                : r,
                                            ),
                                          )
                                        }
                                        options={DISCIPLINE_OPTIONS}
                                        placeholder="Select disciplines…"
                                      />
                                      {reqErr("discipline", "Discipline of study")}
                                    </div>
                                    <div>
                                      <label
                                        className={lCls("skillsRaw", true)}
                                      >
                                        Skills / Knowledge Required
                                      </label>
                                      <input
                                        value={row.skillsRaw}
                                        onChange={(e) =>
                                          updateRow(row.id, {
                                            skillsRaw: e.target.value,
                                          })
                                        }
                                        placeholder="e.g. Python, ML (comma-separated)"
                                        className={iCls("skillsRaw")}
                                      />
                                      {parseSkills(row.skillsRaw).length > 0 && (
                                        <div className="flex flex-wrap gap-1 mt-1.5">
                                          {parseSkills(row.skillsRaw).map((s) => (
                                            <span
                                              key={s}
                                              className="inline-flex items-center gap-1 px-2 py-0.5 bg-accent/10 text-accent rounded text-[13px] font-medium max-w-[200px]"
                                            >
                                              <span className="truncate">{s}</span>
                                              <button
                                                type="button"
                                                onClick={() =>
                                                  setRows((prev) =>
                                                    prev.map((r) =>
                                                      r.id === row.id
                                                        ? { ...r, skillsRaw: removeSkill(r.skillsRaw, s) }
                                                        : r,
                                                    ),
                                                  )
                                                }
                                                className="hover:text-danger transition-colors shrink-0"
                                              >
                                                <X size={10} />
                                              </button>
                                            </span>
                                          ))}
                                        </div>
                                      )}
                                      {reqErr("skillsRaw", "Skills / knowledge required")}
                                    </div>
                                    <div>
                                      <label className={lCls("pc", true)}>
                                        PC
                                      </label>
                                      {selOrInp(
                                        "pc",
                                        row.pc ?? "",
                                        (v) => updateRow(row.id, { pc: v }),
                                        "e.g. PC3",
                                      )}
                                    </div>
                                    <div>
                                      <label
                                        className={lCls("techDomain", true)}
                                      >
                                        Tech Domain
                                      </label>
                                      {selOrInp(
                                        "techDomain",
                                        row.techDomain ?? "",
                                        (v) =>
                                          updateRow(row.id, { techDomain: v }),
                                        "e.g. Cybersecurity",
                                      )}
                                    </div>
                                    <div>
                                      <label
                                        className={lCls("emergingArea", true)}
                                      >
                                        Emerging Area
                                      </label>
                                      {selOrInp(
                                        "emergingArea",
                                        row.emergingArea ?? "",
                                        (v) =>
                                          updateRow(row.id, {
                                            emergingArea: v,
                                          }),
                                        "e.g. Artificial Intelligence",
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {/* Mentor */}
                              <div>
                                <p className="text-[11px] font-semibold text-fg-subtle uppercase tracking-wider mb-3">
                                  Mentor
                                </p>
                                <div className="space-y-3">
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div>
                                      <label
                                        className={lCls("mentorUserId", true)}
                                      >
                                        Main Mentor
                                      </label>
                                      {/* Pick the mentor from the address book —
                                          name, email and appointment are filled
                                          automatically from the chosen contact. */}
                                      <div
                                        className={cn(
                                          iCls("mentorUserId"),
                                          "flex items-center focus-within:border-accent focus-within:ring-1 focus-within:ring-accent/20",
                                        )}
                                      >
                                        <RecipientInput
                                          value={
                                            row.mentorUserId
                                              ? [row.mentorUserId]
                                              : []
                                          }
                                          onChange={(emails) => {
                                            const email = emails[0] ?? "";
                                            const c = email
                                              ? CONTACTS.find(
                                                  (x) =>
                                                    x.email.toLowerCase() ===
                                                    email.toLowerCase(),
                                                )
                                              : undefined;
                                            updateRow(row.id, {
                                              mentorUserId: email,
                                              mentor: c?.name ?? "",
                                              mentorAppointment: c?.title ?? "",
                                            });
                                          }}
                                          multiple={false}
                                          allowCustom={false}
                                          placeholder="Search mentor by name or email…"
                                        />
                                      </div>
                                      {reqErr("mentorUserId", "Main mentor")}
                                    </div>
                                    <div>
                                      <label
                                        className={lCls(
                                          "mentorAppointment",
                                          true,
                                        )}
                                      >
                                        Main Mentor Appointment
                                      </label>
                                      <input
                                        value={row.mentorAppointment ?? ""}
                                        onChange={(e) =>
                                          updateRow(row.id, {
                                            mentorAppointment: e.target.value,
                                          })
                                        }
                                        placeholder="e.g. Principal Engineer"
                                        className={iCls("mentorAppointment")}
                                      />
                                      {reqErr("mentorAppointment", "Mentor appointment")}
                                    </div>
                                  </div>
                                  <div>
                                    <label className={lCls("mentorBio", true)}>
                                      Main Mentor Write-up
                                    </label>
                                    <textarea
                                      value={row.mentorBio}
                                      onChange={(e) =>
                                        updateRow(row.id, {
                                          mentorBio: e.target.value,
                                        })
                                      }
                                      rows={4}
                                      placeholder="Brief professional background of the mentor…"
                                      className={iCls("mentorBio") + " resize-none"}
                                    />
                                    {reqErr("mentorBio", "Mentor write-up")}
                                  </div>
                                </div>
                              </div>

                              {/* Logistics */}
                              <div>
                                <p className="text-[11px] font-semibold text-fg-subtle uppercase tracking-wider mb-3">
                                  Logistics
                                </p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-4">
                                  <div>
                                    <label
                                      className={lCls(
                                        "internshipDuration",
                                        true,
                                      )}
                                    >
                                      Project Duration
                                    </label>
                                    <select
                                      value={row.internshipDuration ?? ""}
                                      onChange={(e) =>
                                        setDuration(e.target.value)
                                      }
                                      className={iCls("internshipDuration")}
                                    >
                                      <option value="">— Select —</option>
                                      {durOpts.map((v) => (
                                        <option key={v} value={v}>
                                          {v}
                                        </option>
                                      ))}
                                    </select>
                                    {reqErr(
                                      "internshipDuration",
                                      "Project duration",
                                    )}
                                  </div>
                                  <div>
                                    <label
                                      className={lCls(
                                        "internshipPeriodStart",
                                        true,
                                      )}
                                    >
                                      Internship Start Month
                                    </label>
                                    {monthSelect(
                                      "internshipPeriodStart",
                                      row.internshipPeriodStart ?? "",
                                      setPeriodStart,
                                    )}
                                    {reqErr(
                                      "internshipPeriodStart",
                                      "Start month",
                                    )}
                                  </div>
                                  <div>
                                    <label
                                      className={lCls(
                                        "internshipPeriodEnd",
                                        true,
                                      )}
                                    >
                                      Internship End Month
                                    </label>
                                    {monthSelect(
                                      "internshipPeriodEnd",
                                      row.internshipPeriodEnd ?? "",
                                      setPeriodEnd,
                                      row.internshipPeriodStart ?? undefined,
                                    )}
                                    {reqErr("internshipPeriodEnd", "End month")}
                                    <p className="mt-1.5 text-[11px] leading-snug text-fg-muted">
                                      Whole months — Nov to Dec means 1&nbsp;Nov to 31&nbsp;Dec. This is when the project can be hosted; how long it runs is the duration.
                                    </p>
                                  </div>
                                  <div>
                                    <label className={lCls("slots", true)}>
                                      No. of Placements
                                    </label>
                                    <input
                                      type="number"
                                      min={1}
                                      max={99}
                                      value={row.slots || ""}
                                      onChange={(e) =>
                                        updateRow(row.id, {
                                          slots:
                                            e.target.value === ""
                                              ? 0
                                              : Math.max(
                                                  0,
                                                  Math.min(
                                                    99,
                                                    parseInt(
                                                      e.target.value,
                                                      10,
                                                    ) || 0,
                                                  ),
                                                ),
                                        })
                                      }
                                      className={iCls("slots")}
                                    />
                                    {reqErr("slots", "Number of placements")}
                                  </div>
                                </div>
                              </div>
                            </>
                          );
                        })()}
                      </div>
                    </div>
                  );
                })}

                {/* Validation warning */}
                {rows.length > 0 &&
                  rows.some((r) => rowMissing(r).length > 0) && (
                    <p className="text-body-sm text-danger text-center">
                      {rows.reduce((n, r) => n + rowMissing(r).length, 0)}{" "}
                      required field
                      {rows.reduce((n, r) => n + rowMissing(r).length, 0) !== 1
                        ? "s"
                        : ""}{" "}
                      still missing across{" "}
                      {rows.filter((r) => rowMissing(r).length > 0).length}{" "}
                      project
                      {rows.filter((r) => rowMissing(r).length > 0).length !== 1
                        ? "s"
                        : ""}
                      . Fix the highlighted fields above before submitting.
                    </p>
                  )}

                {/* Declaration */}
                {rows.length > 0 && (
                  <div
                    className={cn(
                      "rounded-xl border p-4 space-y-3 transition-colors",
                      declPending
                        ? "border-warning/50 bg-warning-bg"
                        : "border-border bg-bg-subtle",
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-label-sm text-fg-muted uppercase tracking-widest">
                        Declaration
                      </p>
                      {declPending && (
                        <span className="text-[12px] font-bold text-warning bg-warning/10 px-2 py-0.5 rounded-full">
                          Required
                        </span>
                      )}
                    </div>
                    <label className="flex items-start gap-3 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={declClearance}
                        onChange={(e) => setDeclClearance(e.target.checked)}
                        className="mt-0.5 h-4 w-4 rounded border-border accent-accent shrink-0"
                      />
                      <div className="text-body-sm leading-snug text-fg">
                        I confirm that:
                        <ul className="mt-1.5 space-y-1 list-disc pl-5">
                          <li>
                            Necessary security clearance has been obtained for all
                            projects included in this submission
                          </li>
                          <li>
                            All projects have received endorsement from the
                            respective PC Head(s) prior to submission
                          </li>
                        </ul>
                      </div>
                    </label>
                  </div>
                )}

                <div className="space-y-2">
                  <Button
                    onClick={handleSubmitAll}
                    disabled={rows.length === 0}
                    className="w-full justify-center"
                  >
                    <Upload size={15} />
                    {isIo
                      ? `Add ${rows.length} Project${rows.length !== 1 ? "s" : ""} to Projects`
                      : `Submit ${rows.length} Project${rows.length !== 1 ? "s" : ""} to IO`}
                  </Button>
                  {!canSubmit && rows.length > 0 && (
                    <p className="text-body-sm text-fg-muted text-center">
                      {!rowsValid
                        ? "Fix all required fields above before submitting."
                        : declPending
                          ? "Confirm the declaration above to enable submission."
                          : null}
                    </p>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <Toast message={toastMsg} />
    </Shell>
  );
}
