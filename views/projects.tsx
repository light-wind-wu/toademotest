"use client";

import { Fragment, useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Shell from "@/components/layout/shell";
import {
  FolderOpen,
  Plus,
  FileText,
  XCircle,
  RotateCcw,
  Eye,
  Info,
  ChevronLeft,
  ChevronRight,
  Check,
  X,
} from "lucide-react";
import { DEFAULT_PROGRAMMES, batchEducationLevel, progEducationLevelMap } from "@/lib/data";
import { projectMatchesRequest } from "@/lib/request-groups";
import {
  loadProjects,
  saveProjects,
  loadProgrammes,
  loadSubmissions,
  saveSubmissions,
  loadRequests,
  saveRequests,
  loadProjectDrafts,
  saveProjectDrafts,
} from "@/lib/storage";
import { useProgramme } from "@/lib/programme-context";
import Button from "@/components/ui-legacy/button";
import Modal from "@/components/ui-legacy/modal";
import CreateProjectChooser from "@/components/ui-legacy/create-project-chooser";
import { cn, exportToCSV } from "@/lib/utils";
import TableToolbar from "@/components/ui-legacy/table-toolbar";
import SortTh from "@/components/ui-legacy/sort-th";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import EmptyState from "@/components/ui-legacy/empty-state";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  RowMenuButton,
  RowDropdown,
  DropdownItem,
  DropdownDivider,
} from "@/components/ui-legacy/row-actions";
import type {
  ProjectEntry,
  Application,
  ApplicationStatus,
  ProjectSubmissionBatch,
  SubmittedProject,
  SubmissionReviewStatus,
  ProjectRequest,
  ProjectDraft,
} from "@/lib/types";
import { useRole } from "@/lib/role";
import { addNotification } from "@/lib/notifications";
import { useToast, Toast } from "@/components/ui-legacy/toast";

/* ── Storage keys ─────────────────────────────────────────────────────────── */
const PROJ_CONF_COLS_KEY = "dsta_proj_conf_cols";
const APP_KEY = "dsta_applications";

/* Candidates in these states are mid-pipeline for a project: if it is archived they
   must be rematched, not silently orphaned (TOA-025). 'matched' interns (Offer
   Accepted / Active Intern / Internship Completed) are handled separately. */
const ACTIVE_PIPELINE: ApplicationStatus[] = [
  "Shortlisted for Interview",
  "Interview Scheduled",
  "Interview Completed",
  "Offer Extended",
];
function loadAppsRaw(): Application[] {
  try {
    return JSON.parse(localStorage.getItem(APP_KEY) || "[]");
  } catch {
    return [];
  }
}
function pipelineCandidatesFor(projId: string): Application[] {
  return loadAppsRaw().filter(
    (a) =>
      a.shortlistedFor === projId &&
      ACTIVE_PIPELINE.includes(a.status) &&
      !a.projectArchived,
  );
}

/* ── Workspace tabs ──────────────────────────────────────────────────────── */
type ReviewTab = "drafts" | "pending" | "pool" | "allocated" | "archived";

type ProjectListRow =
  | {
      kind: "approved";
      tabStatus: "approved";
      project: ProjectEntry;
      id: string;
      displayId: string;
      title: string;
      programmeId: string;
      programmeLabel: string;
      pc: string;
      mentor: string;
      mentorAppointment: string;
      slots: number;
      matched: number;
      archived?: boolean;
      firstChoice: number;
    }
  | {
      kind: "submission";
      tabStatus: SubmissionReviewStatus;
      batchId: string;
      projectId: string;
      project: SubmittedProject;
      uploadToken: string;
      uploadedAt: string;
      submittedBy: string;
      requestedEducationLevels: string[];
      id: string;
      displayId: string;
      title: string;
      programmeId: string;
      programmeLabel: string;
      pc: string;
      mentor: string;
      mentorAppointment: string;
      slots: number;
      matched: number;
      remarks?: string;
      firstChoice: number;
    };
type ProjectSubmissionRow = Extract<ProjectListRow, { kind: "submission" }>;
type ProjectApprovedRow = Extract<ProjectListRow, { kind: "approved" }>;

export default function ProjectsPage() {
  const { progOpts } = useProgramme();
  const { role, profile } = useRole();
  const { toast: toastMsg, showToast: toast } = useToast();
  const router = useRouter();

  // Full programme id→title map across ALL statuses (incl. ones added to
  // localStorage), so the filter/labels cover every programme a project belongs
  // to — not just the Active/Draft set in progOpts.
  const [progTitleMap, setProgTitleMap] = useState<Record<string, string>>({});
  const [projects, setProjects] = useState<ProjectEntry[]>([]);
  const [submissions, setSubmissions] = useState<ProjectSubmissionBatch[]>([]);
  const [reservedByProject, setReservedByProject] = useState<
    Record<string, number>
  >({});
  const [firstChoiceByProject, setFirstChoiceByProject] = useState<
    Record<string, number>
  >({});
  const [searchProj, setSearchProj] = useState("");
  const [projSortCol, setProjSortCol] = useState<string | null>(null);
  const [projSortDir, setProjSortDir] = useState<1 | -1>(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [page, setPage] = useState(1);
  // Row menu + archive
  const [menuProjId, setMenuProjId] = useState<string | null>(null);
  const [menuPos, setMenuPos] = useState({ top: 0, right: 0 });
  const [archiveTarget, setArchiveTarget] = useState<ProjectEntry | null>(null);
  const [archiveRemark, setArchiveRemark] = useState("");
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [bulkApproveOpen, setBulkApproveOpen] = useState(false);
  const [bulkRejectOpen, setBulkRejectOpen] = useState(false);
  const [bulkRejectRemarks, setBulkRejectRemarks] = useState("");
  const [createChooserOpen, setCreateChooserOpen] = useState(false);
  const [recentlyApproved, setRecentlyApproved] = useState<ProjectEntry[]>([]);
  const [projectDrafts, setProjectDrafts] = useState<ProjectDraft[]>([]);
  const [collapsedPcs, setCollapsedPcs] = useState<Set<string>>(new Set());
  const canReviewProjects = role === "io" || role === "io-admin";
  const canCreateProject = role === "ad-pnc" || canReviewProjects;

  const PROJ_COL_DEFS = [
    { key: "id", label: "Project ID" },
    { key: "title", label: "Project Title" },
    { key: "programmeId", label: "Programme ID" },
    { key: "programme", label: "Programme Title" },
    { key: "pc", label: "PC" },
    { key: "mentor", label: "Mentor" },
    { key: "mentorAppointment", label: "Mentor Appointment" },
    { key: "placements", label: "Placements" },
    { key: "firstChoice", label: "Total Applications" },
  ] as const;
  type ProjColKey = (typeof PROJ_COL_DEFS)[number]["key"];
  const [projVisibleCols, setProjVisibleCols] = useState<
    Record<ProjColKey, boolean>
  >({
    id: true,
    title: true,
    programmeId: true,
    programme: true,
    pc: true,
    mentor: true,
    mentorAppointment: true,
    placements: true,
    firstChoice: true,
  });
  const DRAFT_COL_DEFS = [
    { key: "title", label: "Project Title" },
    { key: "source", label: "Source" },
    { key: "programme", label: "Programme" },
    { key: "mentor", label: "Mentor" },
    { key: "placements", label: "Placements" },
    { key: "savedAt", label: "Last Saved" },
    { key: "actions", label: "Actions" },
  ] as const;
  type DraftColKey = (typeof DRAFT_COL_DEFS)[number]["key"];
  const [draftVisibleCols, setDraftVisibleCols] = useState<
    Record<DraftColKey, boolean>
  >({
    title: true,
    source: true,
    programme: true,
    mentor: true,
    placements: true,
    savedAt: true,
    actions: true,
  });
  // IO reviewers now handle pending submissions under Project Requests → Project
  // Submissions, so the Projects workspace opens on the Project Pool for them.
  const [reviewTab, setReviewTab] = useState<ReviewTab>(
    role === "io" || role === "io-admin" ? "pool" : "pending",
  );

  const progMap: Record<string, string> = {
    unassigned: "Unassigned",
    "": "Unassigned",   // approved-but-unattached projects (no programme yet)
    ...progTitleMap,
    ...Object.fromEntries(progOpts.map((p) => [p.value, p.label])),
  };

  // If the role hydrates to an IO reviewer while sitting on the (now-removed)
  // Pending Review tab, move to the Project Pool.
  useEffect(() => {
    if (canReviewProjects && reviewTab === "pending") setReviewTab("pool");
  }, [canReviewProjects, reviewTab]);

  useEffect(() => {
    const msg = sessionStorage.getItem("dsta_pending_toast");
    if (msg) {
      sessionStorage.removeItem("dsta_pending_toast");
      toast(msg);
    }
    try {
      const sc = localStorage.getItem(PROJ_CONF_COLS_KEY);
      if (sc) setProjVisibleCols((prev) => ({ ...prev, ...JSON.parse(sc) }));
    } catch {}
    // Build a title map over ALL programmes (every status), from localStorage if
    // present, else the seed — covers programmes added after first load.
    try {
      const allProgs = loadProgrammes();
      setProgTitleMap(
        Object.fromEntries(allProgs.map((p) => [p.id, p.title])),
      );
    } catch {
      setProgTitleMap(
        Object.fromEntries(DEFAULT_PROGRAMMES.map((p) => [p.id, p.title])),
      );
    }
    setProjects(loadProjects());
    setSubmissions(loadSubmissions());
    setProjectDrafts(loadProjectDrafts());
    try {
      const appRaw = localStorage.getItem("dsta_applications");
      if (appRaw) {
        const apps = JSON.parse(appRaw);
        const counts: Record<string, number> = {};
        const firstCounts: Record<string, number> = {};
        apps.forEach(
          (a: {
            status: string;
            shortlistedFor?: string;
            projectRankings?: string[];
          }) => {
            if (a.status === "Offer Extended" && a.shortlistedFor)
              counts[a.shortlistedFor] = (counts[a.shortlistedFor] ?? 0) + 1;
            const first = a.projectRankings?.[0];
            if (first) firstCounts[first] = (firstCounts[first] ?? 0) + 1;
          },
        );
        setReservedByProject(counts);
        setFirstChoiceByProject(firstCounts);
      }
    } catch {}
  }, [role]);

  function visibleDrafts() {
    if (!canCreateProject) return [];
    return projectDrafts
      .filter((draft) => draft.ownerRole === role)
      .sort((a, b) => b.savedAt.localeCompare(a.savedAt));
  }

  function continueDraft(draft: ProjectDraft) {
    const params = new URLSearchParams({ draftId: draft.id });
    if (draft.requestToken) {
      params.set("token", draft.requestToken);
    }
    if (draft.source === "create-project" && "requestId" in draft.payload && draft.payload.requestId) {
      params.set("requestId", draft.payload.requestId);
    }
    if (draft.source === "create-project" && "requestCategory" in draft.payload && draft.payload.requestCategory) {
      params.set("category", draft.payload.requestCategory);
    }
    router.push(
      draft.source === "create-project"
        ? `/projects/new?${params.toString()}`
        : `/submissions/upload?${params.toString()}`,
    );
  }

  function deleteDraft(id: string) {
    const next = projectDrafts.filter((draft) => draft.id !== id);
    setProjectDrafts(next);
    saveProjectDrafts(next);
    toast("Draft deleted.");
  }

  function isUploadDraftRowComplete(row: Record<string, unknown>) {
    const required = [
      "title",
      "description",
      "mentor",
      "educationLevel",
      "internshipDuration",
      "internshipPeriodStart",
      "internshipPeriodEnd",
    ];
    const hasRequired = required.every((key) => String(row[key] ?? "").trim());
    const slots = Number(row.slots ?? 0);
    return hasRequired && slots > 0;
  }

  function draftMeta(draft: ProjectDraft) {
    if (draft.source === "upload-projects") {
      const payload = draft.payload;
      const rows = "rows" in payload && Array.isArray(payload.rows) ? payload.rows : [];
      const count = rows.length;
      const complete = rows.filter(isUploadDraftRowComplete).length;
      const file = "fileName" in payload && payload.fileName ? payload.fileName : "Manual entry";
      return `${count} project${count !== 1 ? "s" : ""} · ${complete} complete · ${count - complete} incomplete · ${file}`;
    }
    const payload = draft.payload;
    if ("programme" in payload && payload.programme) return `Programme ${payload.programme}`;
    if ("educationLevel" in payload && payload.educationLevel) return payload.educationLevel;
    return "Create Project";
  }

  function draftProgrammeLabel(draft: ProjectDraft) {
    const payload = draft.payload;
    if ("programme" in payload && payload.programme) {
      return progMap[payload.programme] ?? payload.programme;
    }
    return "—";
  }

  function draftMentorLabel(draft: ProjectDraft) {
    const payload = draft.payload;
    if ("mentor" in payload && payload.mentor) return payload.mentor;
    if ("rows" in payload) {
      const mentors = payload.rows
        .map((row) => String(row.mentor ?? "").trim())
        .filter(Boolean);
      const unique = Array.from(new Set(mentors));
      if (unique.length === 1) return unique[0];
      if (unique.length > 1) return `${unique.length} mentors`;
    }
    return "—";
  }

  function draftPlacementsLabel(draft: ProjectDraft) {
    const payload = draft.payload;
    if ("slots" in payload) return payload.slots || "—";
    if ("rows" in payload) {
      const slots = payload.rows.reduce(
        (sum, row) => sum + Number(row.slots ?? 0),
        0,
      );
      return slots > 0 ? String(slots) : "—";
    }
    return "—";
  }

  function openMenu(e: React.MouseEvent, projId: string) {
    e.stopPropagation();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setMenuPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right });
    setMenuProjId(projId);
  }
  function closeMenu() {
    setMenuProjId(null);
  }

  function persistArchived(projId: string, archived: boolean, remark?: string) {
    const next = projects.map((p) =>
      p.id === projId
        ? {
            ...p,
            archived,
            archiveRemark: archived ? (remark ?? "").trim() : undefined,
            archivedAt: archived ? new Date().toISOString() : undefined,
            archivedBy: archived ? profile.name : undefined,
          }
        : p,
    );
    setProjects(next);
    saveProjects(next);
  }

  // Archive + flag any mid-pipeline candidates so they surface for rematch (TOA-025).
  function archiveProject(target: ProjectEntry, remark: string) {
    const reason = remark.trim();
    persistArchived(target.id, true, reason);
    const today = new Date().toISOString().split("T")[0];
    const affected = pipelineCandidatesFor(target.id);
    if (affected.length) {
      const affectedIds = new Set(affected.map((a) => a.id));
      const apps = loadAppsRaw().map((a) =>
        affectedIds.has(a.id)
          ? {
              ...a,
              projectArchived: { project: target.title, reason, date: today },
            }
          : a,
      );
      try {
        localStorage.setItem(APP_KEY, JSON.stringify(apps));
      } catch {}
      affected.forEach((a) =>
        addNotification({
          forRole: "io",
          title: `Rematch needed — ${a.name}`,
          body: `${a.name}'s shortlisted project "${target.title}" was archived (${reason || "no reason given"}). Open their record to rematch to another preference.`,
          href: `/candidate360/${a.id}`,
          tier: "action",
        }),
      );
    }
    toast(
      affected.length
        ? `Project archived — ${affected.length} candidate${affected.length !== 1 ? "s" : ""} flagged for rematch.`
        : "Project archived — hidden from applicants.",
    );
  }

  function toggleProjCol(k: string) {
    setProjVisibleCols((prev) => {
      const next = { ...prev, [k]: !prev[k as ProjColKey] };
      try {
        localStorage.setItem(PROJ_CONF_COLS_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  }

  function toggleDraftCol(k: string) {
    setDraftVisibleCols((prev) => ({
      ...prev,
      [k]: !prev[k as DraftColKey],
    }));
  }

  function projSort(col: string) {
    if (projSortCol === col) setProjSortDir((d) => (d === 1 ? -1 : 1));
    else {
      setProjSortCol(col);
      setProjSortDir(1);
    }
  }

  function syncProjectsToRequests(updatedBatches: ProjectSubmissionBatch[]) {
    const currentReqs: ProjectRequest[] = loadRequests();
    const updated = currentReqs.map((r) => {
      const allProjs = updatedBatches.flatMap((b) => b.projects).filter((project) => projectMatchesRequest(project, r));
      const submitted = allProjs
        .filter((p) => p.status !== "rejected" && p.status !== "withdrawn")
        .reduce((s, p) => s + p.slots, 0);
      const created = allProjs.filter((p) => p.status !== "rejected" && p.status !== "withdrawn").length;
      return { ...r, uploaded: submitted, created };
    });
    saveRequests(updated);
  }

  function toggleSelectProj(batchId: string, projId: string) {
    const key = `${batchId}::${projId}`;
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }

  function togglePcGroup(key: string) {
    setCollapsedPcs((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }

  function doBulkApprove() {
    if (!canReviewProjects) return;
    let updated = [...submissions];
    const existingProjs = loadProjects();
    const nums = existingProjs
      .map((p) => parseInt(p.id.replace(/^PROJ-/, ""), 10))
      .filter((n) => !Number.isNaN(n));
    let nextNum = (nums.length > 0 ? Math.max(...nums) : 0) + 1;
    const newProjects: ProjectEntry[] = [];
    Array.from(selectedKeys).forEach((key) => {
      const [batchId, projId] = key.split("::");
      updated = updated.map((b) =>
        b.id !== batchId
          ? b
          : {
              ...b,
              projects: b.projects.map((p) => {
                if (p.id !== projId || p.status !== "pending") return p;
                const newId = `PROJ-${String(nextNum++).padStart(4, "0")}`;
                newProjects.push({
                  id: newId,
                  title: p.title,
                  description: p.description,
                  mentor: p.mentor,
                  mentorAppointment: p.mentorAppointment,
                  mentorUserId: p.mentorUserId,
                  mentorBio: p.mentorBio,
                  skills: p.skills,
                  discipline: p.discipline,
                  slots: p.slots,
                  matched: 0,
                  status: "open",
                  programme: "",
                  techDomain: p.techDomain,
                  emergingArea: p.emergingArea,
                  educationLevel: p.educationLevel,
                  internshipDuration: p.internshipDuration,
                  internshipPeriodStart: p.internshipPeriodStart,
                  internshipPeriodEnd: p.internshipPeriodEnd,
                  workingLocation: p.workingLocation,
                });
                return { ...p, status: "approved" as const };
              }),
            },
      );
    });
    const nextProjects = [...existingProjs, ...newProjects];
    setSubmissions(updated);
    setProjects(nextProjects);
    setRecentlyApproved(newProjects);
    setReviewTab("pool");
    setPage(1);
    saveSubmissions(updated);
    saveProjects(nextProjects);
    syncProjectsToRequests(updated);

    const notifiedApprove = new Set<string>();
    Array.from(selectedKeys).forEach((key) => {
      const [batchId] = key.split("::");
      if (notifiedApprove.has(batchId)) return;
      notifiedApprove.add(batchId);
      const batch = submissions.find((b) => b.id === batchId);
      if (batch) {
        addNotification({
          forRole: "ad-pnc",
          title: `Project approved — ${progMap[batch.programme] ?? batch.programme}`,
          body: `Your project submission for ${progMap[batch.programme] ?? batch.programme} has been reviewed and approved by the IO.`,
          href: "/submissions",
          tier: "info",
        });
      }
    });
    newProjects.forEach((p) => {
      addNotification({
        forRole: "mentor",
        ...(p.mentorUserId ? { forMentorId: p.mentorUserId } : {}),
        title: `Your project has been approved — ${p.title}`,
        body: `"${p.title}" has been approved by the IO and is now open for applicants.`,
        href: "/mentor/projects",
        tier: "info",
      });
    });
    toast(`${selectedKeys.size} project${selectedKeys.size !== 1 ? "s" : ""} approved.`);
    setSelectedKeys(new Set());
    setBulkApproveOpen(false);
  }

  function doBulkReject() {
    if (!canReviewProjects) return;
    let updated = [...submissions];
    Array.from(selectedKeys).forEach((key) => {
      const [batchId, projId] = key.split("::");
      updated = updated.map((b) =>
        b.id !== batchId
          ? b
          : {
              ...b,
              projects: b.projects.map((p) =>
                p.id !== projId || p.status !== "pending"
                  ? p
                  : { ...p, status: "rejected" as const, remarks: bulkRejectRemarks },
              ),
            },
      );
    });
    setSubmissions(updated);
    saveSubmissions(updated);
    syncProjectsToRequests(updated);

    const notifiedReject = new Set<string>();
    Array.from(selectedKeys).forEach((key) => {
      const [batchId] = key.split("::");
      if (notifiedReject.has(batchId)) return;
      notifiedReject.add(batchId);
      const batch = submissions.find((b) => b.id === batchId);
      if (batch) {
        addNotification({
          forRole: "ad-pnc",
          title: `Project rejected — ${progMap[batch.programme] ?? batch.programme}`,
          body: `Your project submission for ${progMap[batch.programme] ?? batch.programme} has been rejected by the IO. See the rejection remarks for details.`,
          href: "/submissions",
          tier: "action",
        });
      }
    });
    toast(`${selectedKeys.size} project${selectedKeys.size !== 1 ? "s" : ""} rejected.`);
    setSelectedKeys(new Set());
    setBulkRejectOpen(false);
  }

  const projectRequests = useMemo(() => loadRequests(), [submissions]);

  function pendingProgrammeCentre(batch: ProjectSubmissionBatch, project: SubmittedProject) {
    const linkedRequest = projectRequests.find((request) =>
      (project.requestLineId && request.id === project.requestLineId) ||
      (batch.uploadToken && request.uploadToken === batch.uploadToken && projectMatchesRequest(project, request)),
    );
    return linkedRequest?.programmeCenter || project.pc || batch.pc;
  }

  const submissionRows: ProjectSubmissionRow[] = submissions.flatMap((batch) =>
    batch.projects
      .filter((p) => p.status === "pending" || p.status === "rejected")
      .map((p) => {
        const programmeId = batch.programme || "";
        return {
          kind: "submission" as const,
          tabStatus: p.status,
          batchId: batch.id,
          projectId: p.id,
          project: p,
          uploadToken: batch.uploadToken,
          uploadedAt: batch.uploadedAt,
          submittedBy: batch.submittedBy ?? batch.pcHead,
          requestedEducationLevels: batch.requestedEducationLevels ?? (batch.educationLevel ? [batch.educationLevel] : []),
          id: p.id,
          displayId: "—",
          title: p.title,
          programmeId,
          programmeLabel: progMap[programmeId] ?? programmeId,
          pc: pendingProgrammeCentre(batch, p),
          mentor: p.mentor,
          mentorAppointment: p.mentorAppointment ?? "",
          slots: p.slots,
          matched: 0,
          remarks: p.remarks,
          firstChoice: 0,
        };
      }),
  );

  const approvedRows: ProjectApprovedRow[] = projects.map((p) => ({
    kind: "approved" as const,
    tabStatus: "approved",
    project: p,
    id: p.id,
    displayId: p.id,
    title: p.title,
    programmeId: !p.programme || p.programme === "unassigned" ? "" : p.programme,
    programmeLabel: progMap[p.programme] ?? p.programme ?? "",
    pc: p.pc ?? "",
    mentor: p.mentor,
    mentorAppointment: p.mentorAppointment ?? "",
    slots: p.slots,
    matched: p.matched,
    archived: p.archived,
    firstChoice: firstChoiceByProject[p.id] ?? 0,
  }));

  const rowMatchesFilters = (p: ProjectListRow) => {
    const q = searchProj.toLowerCase();
    const mq =
      !q ||
      p.title.toLowerCase().includes(q) ||
      p.mentor.toLowerCase().includes(q) ||
      (p.kind === "approved" && p.id.toLowerCase().includes(q)) ||
      p.pc.toLowerCase().includes(q) ||
      p.programmeLabel.toLowerCase().includes(q);
    return mq;
  };

  const filteredApprovedRows = approvedRows.filter(rowMatchesFilters);
  const pendingReviewRows = submissionRows
    .filter((p) => p.tabStatus === "pending")
    .filter(rowMatchesFilters)
    .sort((a, b) => {
      if (!projSortCol) return 0;
      let va: string | number = "";
      let vb: string | number = "";
      if (projSortCol === "title") {
        va = a.title;
        vb = b.title;
      } else if (projSortCol === "programme") {
        va = a.programmeLabel;
        vb = b.programmeLabel;
      } else if (projSortCol === "pc") {
        va = a.pc;
        vb = b.pc;
      } else if (projSortCol === "educationLevel") {
        va = a.project.educationLevel || a.requestedEducationLevels.join(", ");
        vb = b.project.educationLevel || b.requestedEducationLevels.join(", ");
      } else if (projSortCol === "mentor") {
        va = a.mentor;
        vb = b.mentor;
      } else if (projSortCol === "placements") {
        va = a.slots;
        vb = b.slots;
      } else if (projSortCol === "status") {
        va = a.tabStatus;
        vb = b.tabStatus;
      }
      if (typeof va === "string") return va.localeCompare(vb as string) * projSortDir;
      return ((va as number) - (vb as number)) * projSortDir;
    });
  const pendingTotalRows = pendingReviewRows.length;
  const pendingTotalPages = Math.max(1, Math.ceil(pendingTotalRows / rowsPerPage));
  const pendingCurrentPage = Math.min(page, pendingTotalPages);
  const pendingPageStart = (pendingCurrentPage - 1) * rowsPerPage;
  const pendingPagedRows = pendingReviewRows.slice(pendingPageStart, pendingPageStart + rowsPerPage);
  const pendingPageNumbers = Array.from({ length: pendingTotalPages }, (_, i) => i + 1);

  const pendingPcGroups = useMemo(() => {
    const pcMap = new Map<string, {
      pc: string;
      rows: ProjectSubmissionRow[];
    }>();

    pendingPagedRows.forEach((row) => {
      const pc = row.pc || "Unassigned PC";
      const group = pcMap.get(pc) ?? { pc, rows: [] };
      group.rows.push(row);
      pcMap.set(pc, group);
    });

    pcMap.forEach((group) => {
      group.rows.sort((a, b) => a.title.localeCompare(b.title));
    });

    return Array.from(pcMap.values()).sort((a, b) => a.pc.localeCompare(b.pc));
  }, [pendingPagedRows]);
  const isProjectPoolRow = (p: ProjectApprovedRow) => !p.archived && !p.programmeId;
  const isAllocatedProjectRow = (p: ProjectApprovedRow) => !p.archived && !!p.programmeId;
  const projectPoolRows = filteredApprovedRows.filter(isProjectPoolRow);
  const allocatedProjectRows = filteredApprovedRows.filter(isAllocatedProjectRow);
  const archivedProjectRows = filteredApprovedRows.filter((p) => !!p.archived);
  const projectPoolCount = approvedRows.filter(isProjectPoolRow).length;
  const allocatedProjectCount = approvedRows.filter(isAllocatedProjectRow).length;
  const archivedProjectCount = approvedRows.filter((p) => !!p.archived).length;

  const tabRows =
    reviewTab === "pool"
      ? projectPoolRows
      : reviewTab === "allocated"
        ? allocatedProjectRows
        : reviewTab === "archived"
          ? archivedProjectRows
          : [];

  const displayRows = [...tabRows].sort((a, b) => {
    if (!projSortCol) return 0;
    let va: string | number = "",
      vb: string | number = "";
    if (projSortCol === "id") {
      va = a.kind === "approved" ? a.id : "";
      vb = b.kind === "approved" ? b.id : "";
    } else if (projSortCol === "title") {
      va = a.title;
      vb = b.title;
    } else if (projSortCol === "programmeId") {
      va = a.programmeId;
      vb = b.programmeId;
    } else if (projSortCol === "programme") {
      va = a.programmeLabel;
      vb = b.programmeLabel;
    } else if (projSortCol === "pc") {
      va = a.pc;
      vb = b.pc;
    } else if (projSortCol === "mentor") {
      va = a.mentor;
      vb = b.mentor;
    } else if (projSortCol === "mentorAppointment") {
      va = a.mentorAppointment;
      vb = b.mentorAppointment;
    } else if (projSortCol === "placements") {
      va = a.matched;
      vb = b.matched;
    } else if (projSortCol === "firstChoice") {
      va = a.firstChoice;
      vb = b.firstChoice;
    }
    if (va < vb) return -1 * projSortDir;
    if (va > vb) return 1 * projSortDir;
    return 0;
  });

  // Pagination — reset to the first page whenever the underlying set changes.
  useEffect(() => {
    setPage(1);
  }, [reviewTab, searchProj, rowsPerPage]);
  const totalRows = displayRows.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / rowsPerPage));
  const currentPage = Math.min(page, totalPages);
  const pageStart = (currentPage - 1) * rowsPerPage;
  const pagedRows = displayRows.slice(pageStart, pageStart + rowsPerPage);
  const visibleCount =
    Object.values(projVisibleCols as Record<string, boolean>).filter(Boolean)
      .length +
    (canReviewProjects ? 1 : 0);
  const draftVisibleCount = Math.max(
    1,
    Object.values(draftVisibleCols).filter(Boolean).length,
  );
  const hasAnyRows = submissionRows.length + approvedRows.length > 0;
  const recentlyApprovedIds = new Set(recentlyApproved.map((p) => p.id));
  const myProjectDrafts = visibleDrafts()
    .filter((draft) => {
      const q = searchProj.toLowerCase();
      return (
        !q ||
        draft.title.toLowerCase().includes(q) ||
        draftMeta(draft).toLowerCase().includes(q) ||
        draftProgrammeLabel(draft).toLowerCase().includes(q) ||
        draftMentorLabel(draft).toLowerCase().includes(q) ||
        draft.source.toLowerCase().includes(q)
      );
    })
    .sort((a, b) => {
      if (!projSortCol) return 0;
      let va: string | number = "";
      let vb: string | number = "";
      if (projSortCol === "title") {
        va = a.title;
        vb = b.title;
      } else if (projSortCol === "source") {
        va = a.source;
        vb = b.source;
      } else if (projSortCol === "programme") {
        va = draftProgrammeLabel(a);
        vb = draftProgrammeLabel(b);
      } else if (projSortCol === "mentor") {
        va = draftMentorLabel(a);
        vb = draftMentorLabel(b);
      } else if (projSortCol === "placements") {
        va = Number(draftPlacementsLabel(a)) || 0;
        vb = Number(draftPlacementsLabel(b)) || 0;
      } else if (projSortCol === "savedAt") {
        va = a.savedAt;
        vb = b.savedAt;
      }
      if (typeof va === "string") return va.localeCompare(vb as string) * projSortDir;
      return ((va as number) - (vb as number)) * projSortDir;
    });
  const totalDraftRows = visibleDrafts().length;
  const hasAnyWorkspaceRows = hasAnyRows || myProjectDrafts.length > 0;
  const reviewTabs: Array<{ key: ReviewTab; label: string; count: number }> = [
    ...(canCreateProject ? [{ key: "drafts" as const, label: "Drafts", count: myProjectDrafts.length }] : []),
    // Pending Review moved to Project Requests → Project Submissions for IO reviewers;
    // other roles (e.g. AD (P&C)) still see their pending submissions here.
    ...(canReviewProjects ? [] : [{ key: "pending" as const, label: "Pending Review", count: pendingTotalRows }]),
    { key: "pool", label: "Project Pool", count: projectPoolCount },
    { key: "allocated", label: "Allocated Projects", count: allocatedProjectCount },
    { key: "archived", label: "Archived", count: archivedProjectCount },
  ];
  const isApprovedProjectTab =
    reviewTab === "pool" ||
    reviewTab === "allocated" ||
    reviewTab === "archived";

  return (
    <Shell activeRoute="/projects">
      <div className="mb-4 flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
        <div>
          <h1 className="text-headline-md text-fg">Projects</h1>
          {/* <p className="text-body-lg text-fg-muted">Confirmed projects available for intern matching.</p> */}
        </div>
        {canCreateProject && (
          <Button onClick={() => setCreateChooserOpen(true)} className="self-start">
            <Plus size={15} />
            Create Project
          </Button>
        )}
      </div>

      {!hasAnyWorkspaceRows ? (
        <EmptyState
          icon={FolderOpen}
          title="No projects yet"
          description="Projects appear here once submissions are approved by IO Admin."
        />
      ) : (
        <div className="bg-surface rounded-lg border border-border overflow-hidden shadow-sm">
          <TableToolbar
            search={searchProj}
            onSearch={setSearchProj}
            placeholder="Search by project, mentor, or programme..."
            {...(isApprovedProjectTab
              ? {
                  colDefs: PROJ_COL_DEFS.map((c) => ({ key: c.key, label: c.label })),
                  visibleCols: projVisibleCols,
                  onToggleCol: toggleProjCol,
                  onExport: () =>
                    exportToCSV(
                      "confirmed-projects.csv",
                      [
                        "ID",
                        "Title",
                        "Programme ID",
                        "Programme Title",
                        "PC",
                        "Mentor",
                        "Mentor Appointment",
                        "Slots",
                        "Matched",
                        "Total Applications",
                        "Project Status",
                      ],
                      displayRows.map((p) => [
                        p.displayId,
                        p.title,
                        p.programmeId,
                        p.programmeLabel,
                        p.pc,
                        p.mentor,
                        p.mentorAppointment,
                        p.archived ? "—" : p.slots,
                        p.archived ? "—" : p.matched,
                        p.archived ? "—" : p.firstChoice,
                        p.archived ? "Archived" : "Active",
                      ]),
                    ),
                }
              : reviewTab === "drafts"
                ? {
                    colDefs: DRAFT_COL_DEFS.map((c) => ({ key: c.key, label: c.label })),
                    visibleCols: draftVisibleCols,
                    onToggleCol: toggleDraftCol,
                    onExport: () =>
                      exportToCSV(
                        "draft-projects.csv",
                        ["Title", "Source", "Programme", "Mentor", "Placements", "Last Saved"],
                        myProjectDrafts.map((draft) => [
                          draft.title,
                          draft.source === "upload-projects" ? "Upload Projects" : "Create Project",
                          draftProgrammeLabel(draft),
                          draftMentorLabel(draft),
                          draftPlacementsLabel(draft),
                          new Date(draft.savedAt).toLocaleString(),
                        ]),
                      ),
                  }
                : {
                    onExport: () =>
                      exportToCSV(
                        "pending-projects.csv",
                        ["Project", "Programme", "Submitted By", "Mentor", "Slots", "Status"],
                        pendingReviewRows.map((p) => [
                          p.title,
                          p.programmeLabel,
                          p.pc,
                          p.mentor,
                          p.slots,
                          "Pending Review",
                        ]),
                      ),
                  })}
          />
          <div className="border-b border-border bg-surface px-4 py-3 overflow-x-auto">
            <Tabs
              value={reviewTab}
              onValueChange={(key) => {
                setReviewTab(key as ReviewTab);
                setSearchProj("");
              }}
            >
              <TabsList aria-label="Project review workspace">
                {reviewTabs.map((item) => (
                  <TabsTrigger key={item.key} value={item.key}>
                    {item.label} ({item.count})
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>

          {reviewTab === "drafts" && (
            <Table className="text-left">
              <TableHeader className="bg-bg-subtle">
                <TableRow>
                  {draftVisibleCols.title && (
                    <SortTh col="title" label="Project Title" sortCol={projSortCol} sortDir={projSortDir} onSort={projSort} />
                  )}
                  {draftVisibleCols.source && (
                    <SortTh col="source" label="Source" sortCol={projSortCol} sortDir={projSortDir} onSort={projSort} />
                  )}
                  {draftVisibleCols.programme && (
                    <SortTh col="programme" label="Programme" sortCol={projSortCol} sortDir={projSortDir} onSort={projSort} />
                  )}
                  {draftVisibleCols.mentor && (
                    <SortTh col="mentor" label="Mentor" sortCol={projSortCol} sortDir={projSortDir} onSort={projSort} />
                  )}
                  {draftVisibleCols.placements && (
                    <SortTh col="placements" label="Placements" sortCol={projSortCol} sortDir={projSortDir} onSort={projSort} />
                  )}
                  {draftVisibleCols.savedAt && (
                    <SortTh col="savedAt" label="Last Saved" sortCol={projSortCol} sortDir={projSortDir} onSort={projSort} />
                  )}
                  {draftVisibleCols.actions && <TableHead className="px-4 py-3 w-36" />}
                </TableRow>
              </TableHeader>
              <TableBody>
                {myProjectDrafts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={draftVisibleCount} className="px-4 py-10 text-center text-body-sm text-fg-muted">
                      No draft projects.
                    </TableCell>
                  </TableRow>
                ) : (
                  myProjectDrafts.map((draft) => (
                    <TableRow key={draft.id} className="group hover:bg-bg-subtle/50 transition-colors">
                      {draftVisibleCols.title && (
                        <TableCell className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <FileText size={14} className="text-fg-muted" />
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-fg truncate">{draft.title}</p>
                              <p className="text-body-sm text-fg-muted">{draftMeta(draft)}</p>
                            </div>
                          </div>
                        </TableCell>
                      )}
                      {draftVisibleCols.source && (
                        <TableCell className="px-4 py-3">
                          <span className="badge bg-bg-muted text-fg-muted text-caption font-normal">
                            {draft.source === "upload-projects" ? "Upload Projects" : "Create Project"}
                          </span>
                        </TableCell>
                      )}
                      {draftVisibleCols.programme && (
                        <TableCell className="px-4 py-3 text-body-sm text-fg-muted">
                          {draftProgrammeLabel(draft)}
                        </TableCell>
                      )}
                      {draftVisibleCols.mentor && (
                        <TableCell className="px-4 py-3 text-body-sm text-fg-muted">
                          {draftMentorLabel(draft)}
                        </TableCell>
                      )}
                      {draftVisibleCols.placements && (
                        <TableCell className="px-4 py-3 text-body-sm text-fg-muted">
                          {draftPlacementsLabel(draft)}
                        </TableCell>
                      )}
                      {draftVisibleCols.savedAt && (
                        <TableCell className="px-4 py-3 text-body-sm text-fg-muted">
                          {new Date(draft.savedAt).toLocaleString()}
                        </TableCell>
                      )}
                      {draftVisibleCols.actions && (
                        <TableCell className="px-4 py-3">
                          <div className="flex items-center justify-end gap-2">
                            <Button size="sm" variant="outline" onClick={() => continueDraft(draft)}>
                              Continue
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => deleteDraft(draft.id)}>
                              Delete
                            </Button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}

          {reviewTab === "pending" && (
          <>
            {canReviewProjects && selectedKeys.size > 0 && (
                <div className="mx-4 mb-3 flex items-center gap-2 rounded-lg border border-accent/20 bg-accent/5 px-4 py-2.5">
                  <span className="text-body-sm font-semibold text-accent">{selectedKeys.size} selected</span>
                  <Button type="button" variant="ghost" size="sm" onClick={() => setSelectedKeys(new Set())}>Clear</Button>
                  <Button size="sm" onClick={() => setBulkApproveOpen(true)}>
                    <Check size={13} />
                    Approve {selectedKeys.size}
                  </Button>
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={() => {
                      setBulkRejectRemarks("");
                      setBulkRejectOpen(true);
                    }}
                  >
                    <X size={13} />
                    Reject {selectedKeys.size}
                  </Button>
                </div>
            )}

            {pendingReviewRows.length === 0 ? (
              <div className="py-16">
                <EmptyState
                  icon={FileText}
                  title="No pending review projects"
                  description="Projects submitted for IO review will appear here."
                />
              </div>
            ) : (
              <Table className="text-left">
                <TableHeader className="bg-bg-subtle">
                  <TableRow>
                    {canReviewProjects && <TableHead className="w-10 px-4 py-2.5" />}
                    <SortTh className="text-left" col="pc" label="Programme Centre" sortCol={projSortCol} sortDir={projSortDir} onSort={projSort} />
                    <SortTh className="text-left" col="title" label="Project" sortCol={projSortCol} sortDir={projSortDir} onSort={projSort} />
                    <SortTh className="text-left" col="educationLevel" label="Intern Category" sortCol={projSortCol} sortDir={projSortDir} onSort={projSort} />
                    <SortTh className="text-left" col="mentor" label="Mentor" sortCol={projSortCol} sortDir={projSortDir} onSort={projSort} />
                    <SortTh className="text-left" col="placements" label="Slots" sortCol={projSortCol} sortDir={projSortDir} onSort={projSort} />
                    <SortTh className="text-left" col="status" label="Status" sortCol={projSortCol} sortDir={projSortDir} onSort={projSort} />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingPcGroups.map((pcGroup) => {
                    const pcCollapsed = collapsedPcs.has(pcGroup.pc);
                    const pcProjectCount = pcGroup.rows.length;
                    const pcKeys = pcGroup.rows.map((row) => `${row.batchId}::${row.projectId}`);
                    const pcAllSelected = pcKeys.length > 0 && pcKeys.every((key) => selectedKeys.has(key));
                    const pcSomeSelected = pcKeys.some((key) => selectedKeys.has(key));
                    const pcSlots = pcGroup.rows.reduce((sum, row) => sum + row.slots, 0);
                    const pcCategoryCount = new Set(
                      pcGroup.rows.map((row) => row.project.educationLevel || row.requestedEducationLevels.join(", ") || "—"),
                    ).size;

                    return (
                      <Fragment key={pcGroup.pc}>
                        <TableRow
                          className="bg-surface text-body-sm font-normal text-fg transition-colors hover:bg-bg-subtle/50"
                        >
                          {canReviewProjects && (
                            <TableCell className="w-10 px-4 py-3" onClick={(e) => e.stopPropagation()}>
                              <Checkbox
                                checked={pcAllSelected}
                                data-state={pcSomeSelected && !pcAllSelected ? "indeterminate" : undefined}
                                aria-label={`Select pending projects for ${pcGroup.pc}`}
                                onCheckedChange={() => {
                                  setSelectedKeys((prev) => {
                                    const next = new Set(prev);
                                    if (pcAllSelected) pcKeys.forEach((key) => next.delete(key));
                                    else pcKeys.forEach((key) => next.add(key));
                                    return next;
                                  });
                                }}
                              />
                            </TableCell>
                          )}
                          <TableCell className="px-4 py-3 text-left">
                            <button
                              type="button"
                              aria-label={`${pcCollapsed ? "Expand" : "Collapse"} ${pcGroup.pc} projects`}
                              onClick={() => togglePcGroup(pcGroup.pc)}
                              className="flex min-w-0 items-center gap-2 rounded-md text-left"
                            >
                              <ChevronRight size={16} className={cn("shrink-0 text-fg-muted transition-transform", !pcCollapsed && "rotate-90")} />
                              <span className="text-body-sm font-normal text-fg">{pcGroup.pc}</span>
                            </button>
                          </TableCell>
                          <TableCell className="px-4 py-3 text-left text-body-sm font-normal text-fg">
                            {pcProjectCount} project{pcProjectCount !== 1 ? "s" : ""} to review
                          </TableCell>
                          <TableCell className="px-4 py-3 text-left text-body-sm font-normal text-fg">
                            {pcCategoryCount} intern categor{pcCategoryCount === 1 ? "y" : "ies"}
                          </TableCell>
                          <TableCell className="px-4 py-3 text-left text-body-sm font-normal text-fg">—</TableCell>
                          <TableCell className="px-4 py-3 text-left text-body-sm font-normal text-fg">{pcSlots}</TableCell>
                          <TableCell className="px-4 py-3 text-left">
                            <span className="badge bg-warning-bg text-warning text-caption font-normal">
                              {pcProjectCount} pending
                            </span>
                          </TableCell>
                        </TableRow>

                        {!pcCollapsed && pcGroup.rows.map((p) => {
                          const rowKey = `${p.batchId}::${p.projectId}`;
                          return (
                            <TableRow
                              key={rowKey}
                              className={cn("cursor-pointer bg-bg text-body-sm font-normal text-fg-muted transition-colors hover:bg-bg-subtle/40", selectedKeys.has(rowKey) && "bg-accent/5")}
                              onClick={() => router.push(`/requests/project/${encodeURIComponent(p.batchId)}/${encodeURIComponent(p.projectId)}`)}
                            >
                              {canReviewProjects && (
                                <TableCell className="w-10 px-4 py-3" onClick={(e) => e.stopPropagation()}>
                                  <Checkbox
                                    checked={selectedKeys.has(rowKey)}
                                    onCheckedChange={() => toggleSelectProj(p.batchId, p.projectId)}
                                    aria-label={`Select ${p.title}`}
                                  />
                                </TableCell>
                              )}
                              <TableCell className="px-4 py-3 text-left text-body-sm text-fg-muted" />
                              <TableCell className="px-4 py-3 text-left">
                                <span className="text-body-sm font-normal text-fg-muted">{p.title}</span>
                              </TableCell>
                              <TableCell className="px-4 py-3 text-left text-body-sm font-normal text-fg-muted">
                                {p.project.educationLevel || p.requestedEducationLevels.join(", ") || "—"}
                              </TableCell>
                              <TableCell className="px-4 py-3 text-left">
                                <p className="text-body-sm font-normal text-fg-muted">{p.mentor}</p>
                                <p className="text-body-sm font-normal text-fg-subtle">{p.mentorAppointment || "—"}</p>
                              </TableCell>
                              <TableCell className="px-4 py-3 text-left text-body-sm font-normal text-fg-muted">{p.slots}</TableCell>
                              <TableCell className="px-4 py-3 text-left">
                                <span className="badge bg-warning-bg text-warning text-caption font-normal">Pending Review</span>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </Fragment>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </>
          )}

          {isApprovedProjectTab && (
          <>
                {reviewTab === "pool" && recentlyApproved.length > 0 && (
                  <div className="mx-4 mb-3 inline-flex items-center gap-2 rounded-lg border border-success/20 bg-success-bg/50 px-3 py-1.5 text-body-sm font-medium text-success">
                    <Check size={13} />
                    {recentlyApproved.length} project{recentlyApproved.length !== 1 ? "s" : ""} newly approved
                  </div>
                )}

            <Table className="text-left">
              <TableHeader className="bg-bg-subtle">
                <TableRow>
                  {projVisibleCols.id && (
                    <SortTh col="id" label="Project ID" sortCol={projSortCol} sortDir={projSortDir} onSort={projSort} />
                  )}
                  {projVisibleCols.title && (
                    <SortTh col="title" label="Project Title" sortCol={projSortCol} sortDir={projSortDir} onSort={projSort} />
                  )}
                  {projVisibleCols.programmeId && (
                    <SortTh col="programmeId" label="Programme ID" sortCol={projSortCol} sortDir={projSortDir} onSort={projSort} />
                  )}
                  {projVisibleCols.programme && (
                    <SortTh col="programme" label="Programme Title" sortCol={projSortCol} sortDir={projSortDir} onSort={projSort} />
                  )}
                  {projVisibleCols.pc && (
                    <SortTh col="pc" label="PC" sortCol={projSortCol} sortDir={projSortDir} onSort={projSort} />
                  )}
                  {projVisibleCols.mentor && (
                    <SortTh col="mentor" label="Mentor" sortCol={projSortCol} sortDir={projSortDir} onSort={projSort} />
                  )}
                  {projVisibleCols.mentorAppointment && (
                    <SortTh
                      col="mentorAppointment"
                      label="Mentor Appointment"
                      sortCol={projSortCol}
                      sortDir={projSortDir}
                      onSort={projSort}
                      buttonClassName="min-h-10 h-auto"
                      labelClassName="whitespace-normal"
                    />
                  )}
                  {projVisibleCols.placements && (
                    <SortTh col="placements" label="Placements" sortCol={projSortCol} sortDir={projSortDir} onSort={projSort} center />
                  )}
                  {projVisibleCols.firstChoice && (
                    <SortTh
                      col="firstChoice"
                      label="Total Applications"
                      sortCol={projSortCol}
                      sortDir={projSortDir}
                      onSort={projSort}
                      center
                      buttonClassName="min-h-10 h-auto"
                      labelClassName="whitespace-normal"
                    >
                      <span title="Applicants who ranked this project as their 1st choice" className="cursor-help">
                        <Info size={12} className="text-fg-subtle" />
                      </span>
                    </SortTh>
                  )}
                  {canReviewProjects && <TableHead className="px-4 py-3 w-10" />}
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayRows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={visibleCount} className="px-4 py-10 text-center text-body-sm text-fg-muted">
                      No {reviewTabs.find((item) => item.key === reviewTab)?.label.toLowerCase()} projects.
                    </TableCell>
                  </TableRow>
                )}
                {pagedRows.map((p) => (
                  <TableRow
                    key={p.id}
                    className={cn(
                      "group cursor-pointer transition-colors hover:bg-bg-subtle/50",
                      recentlyApprovedIds.has(p.id) &&
                        "border-l-4 border-success bg-success-bg/40",
                    )}
                    onClick={() => {
                      localStorage.setItem("dsta_project_view", JSON.stringify(p.project));
                      router.push(`/projects/${p.id}`);
                    }}
                  >
                    {projVisibleCols.id && (
                      <TableCell className="px-4 py-3 text-body-sm font-medium text-fg-muted">{p.displayId}</TableCell>
                    )}
                    {projVisibleCols.title && (
                      <TableCell className="px-4 py-3">
                        <span className="text-sm font-medium text-fg group-hover:text-accent transition-colors">{p.title}</span>
                      </TableCell>
                    )}
                    {projVisibleCols.programmeId && (
                      <TableCell className="px-4 py-3 text-body-sm font-medium text-fg-muted">{p.programmeId || "—"}</TableCell>
                    )}
                    {projVisibleCols.programme && (
                      <TableCell className="px-4 py-3 text-body-sm text-fg-muted">{p.programmeLabel || "—"}</TableCell>
                    )}
                    {projVisibleCols.pc && (
                      <TableCell className="px-4 py-3 text-body-sm text-fg-muted">{p.pc || "—"}</TableCell>
                    )}
                    {projVisibleCols.mentor && (
                      <TableCell className="px-4 py-3 text-body-sm text-fg-muted">{p.mentor}</TableCell>
                    )}
                    {projVisibleCols.mentorAppointment && (
                      <TableCell className="px-4 py-3 text-body-sm text-fg-muted">{p.mentorAppointment || "—"}</TableCell>
                    )}
                    {projVisibleCols.placements && (
                      <TableCell className="px-4 py-3 text-center">
                        {p.archived ? (
                          <span className="text-body-sm text-fg-muted">—</span>
                        ) : (
                          <>
                            <p className="text-body-sm font-medium text-fg">{p.matched}/{p.slots}</p>
                            {(reservedByProject[p.id] ?? 0) > 0 && (
                              <p className="text-label-sm text-accent font-medium">{reservedByProject[p.id]} reserved</p>
                            )}
                          </>
                        )}
                      </TableCell>
                    )}
                    {projVisibleCols.firstChoice && (
                      <TableCell className="px-4 py-3 text-center">
                        {p.archived ? (
                          <span className="text-body-sm text-fg-muted">—</span>
                        ) : (
                          <span className={cn("text-body-sm font-medium", p.firstChoice > 0 ? "text-accent" : "text-fg-muted")}>{p.firstChoice}</span>
                        )}
                      </TableCell>
                    )}
                    {canReviewProjects && (
                      <TableCell className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <RowMenuButton onClick={(e) => openMenu(e, p.id)} />
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <div className="px-4 py-3 bg-surface border-t border-border flex justify-between items-center text-body-sm text-fg-muted">
              <div className="flex items-center gap-4">
              <span className="font-medium">Rows per page:</span>
              <Select
                value={String(rowsPerPage)}
                onValueChange={(value) => setRowsPerPage(Number(value ?? 10))}
              >
                <SelectTrigger className="h-8 w-[88px] text-body-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[10, 25, 50].map((value) => (
                    <SelectItem key={value} value={String(value)}>
                      {value}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-4">
              <span className="font-bold text-fg">
                {totalRows === 0
                  ? "0"
                  : `${pageStart + 1}–${Math.min(pageStart + rowsPerPage, totalRows)}`}{" "}
                of {totalRows}
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage <= 1}
                  aria-label="Previous page"
                  className="p-1.5 rounded-lg border border-border text-fg-muted hover:bg-bg-subtle disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft size={16} />
                </button>
                <span className="px-1 font-medium text-fg">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage >= totalPages}
                  aria-label="Next page"
                  className="p-1.5 rounded-lg border border-border text-fg-muted hover:bg-bg-subtle disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </div>
          </>
          )}

          {reviewTab === "drafts" && (
            <div className="px-4 py-3 bg-surface border-t border-border flex justify-end items-center text-body-sm text-fg-muted">
              <span className="font-bold text-fg">
                Showing {myProjectDrafts.length} of {totalDraftRows} draft project{totalDraftRows !== 1 ? "s" : ""}
              </span>
            </div>
          )}

          {reviewTab === "pending" && (
            <div className="flex flex-col gap-3 border-t border-border bg-surface px-4 py-3 text-body-sm text-fg-muted md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-2">
                <span>Rows per page:</span>
                <Select
                  value={String(rowsPerPage)}
                  onValueChange={(value) => {
                    setRowsPerPage(Number(value));
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="h-8 w-[88px] text-body-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[10, 25, 50].map((value) => (
                      <SelectItem key={value} value={String(value)}>
                        {value}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Pagination className="mx-0 w-auto justify-end">
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      href="#"
                      aria-disabled={pendingCurrentPage <= 1}
                      className={pendingCurrentPage <= 1 ? "pointer-events-none opacity-50" : undefined}
                      onClick={(event) => {
                        event.preventDefault();
                        setPage((current) => Math.max(1, current - 1));
                      }}
                    />
                  </PaginationItem>
                  {pendingPageNumbers.map((pageNumber) => (
                    <PaginationItem key={pageNumber}>
                      <PaginationLink
                        href="#"
                        isActive={pageNumber === pendingCurrentPage}
                        onClick={(event) => {
                          event.preventDefault();
                          setPage(pageNumber);
                        }}
                      >
                        {pageNumber}
                      </PaginationLink>
                    </PaginationItem>
                  ))}
                  <PaginationItem>
                    <PaginationNext
                      href="#"
                      aria-disabled={pendingCurrentPage >= pendingTotalPages}
                      className={pendingCurrentPage >= pendingTotalPages ? "pointer-events-none opacity-50" : undefined}
                      onClick={(event) => {
                        event.preventDefault();
                        setPage((current) => Math.min(pendingTotalPages, current + 1));
                      }}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </div>
      )}

      {/* Row dropdown */}
      {menuProjId && (
        <div className="fixed inset-0 z-[150]" onClick={closeMenu} />
      )}
      {menuProjId &&
        (() => {
          const p = projects.find((x) => x.id === menuProjId);
          if (!p) return null;
          return (
            <RowDropdown pos={menuPos} onClose={closeMenu} width="w-56">
              <DropdownItem
                icon={<Eye size={14} className="text-fg-muted" />}
                label="View Details"
                onClick={() => {
                  closeMenu();
                  localStorage.setItem("dsta_project_view", JSON.stringify(p));
                  router.push(`/projects/${p.id}`);
                }}
              />
              <DropdownDivider />
              {p.archived ? (
                <DropdownItem
                  icon={<RotateCcw size={14} className="text-fg-muted" />}
                  label="Unarchive Project"
                  onClick={() => {
                    closeMenu();
                    persistArchived(p.id, false);
                    toast("Project unarchived.");
                  }}
                />
              ) : (
                <DropdownItem
                  icon={<XCircle size={14} className="text-danger" />}
                  label="Archive Project"
                  danger
                  onClick={() => {
                    closeMenu();
                    setArchiveRemark("");
                    setArchiveTarget(p);
                  }}
                />
              )}
            </RowDropdown>
          );
        })()}

      {canReviewProjects && (
      <Modal
        open={bulkApproveOpen}
        onClose={() => setBulkApproveOpen(false)}
        maxWidth="sm"
        labelledBy="bulk-approve-title"
      >
        <h2 id="bulk-approve-title" className="text-headline-md text-fg mb-2">
          Approve {selectedKeys.size} Project{selectedKeys.size !== 1 ? "s" : ""}?
        </h2>
        <p className="text-body-md text-fg-muted mb-6">
          All selected projects will be added to the confirmed projects list and
          made visible to applicants.
        </p>
        <div className="flex justify-end gap-2">
          <Button onClick={doBulkApprove}>
            <Check size={14} />
            Confirm Approval
          </Button>
          <Button variant="ghost" onClick={() => setBulkApproveOpen(false)}>
            Cancel
          </Button>
        </div>
      </Modal>
      )}

      {canReviewProjects && (
      <Modal
        open={bulkRejectOpen}
        onClose={() => setBulkRejectOpen(false)}
        maxWidth="sm"
        labelledBy="bulk-reject-title"
      >
        <h2 id="bulk-reject-title" className="text-headline-md text-fg mb-2">
          Reject {selectedKeys.size} Project{selectedKeys.size !== 1 ? "s" : ""}?
        </h2>
        <p className="text-body-md text-fg-muted mb-4">
          The same rejection remarks will be sent to AD (P&amp;C) for all selected
          projects.
        </p>
        <label className="block text-label-sm text-fg mb-1">
          Rejection Remarks <span className="text-danger">*</span>
        </label>
        <textarea
          rows={3}
          className="w-full rounded-lg border border-border bg-bg-subtle px-3 py-2 text-body-md text-fg resize-none focus:outline-none focus:ring-2 focus:ring-accent/30 mb-4"
          placeholder="Explain what needs to be changed across all selected projects..."
          value={bulkRejectRemarks}
          onChange={(e) => setBulkRejectRemarks(e.target.value)}
        />
        <div className="flex justify-end gap-2">
          <Button
            variant="danger"
            disabled={!bulkRejectRemarks.trim()}
            onClick={doBulkReject}
          >
            <X size={14} />
            Reject Projects
          </Button>
          <Button variant="ghost" onClick={() => setBulkRejectOpen(false)}>
            Cancel
          </Button>
        </div>
      </Modal>
      )}

      {/* Archive confirmation */}
      {archiveTarget && (
        <Modal
          open
          onClose={() => setArchiveTarget(null)}
          labelledBy="archive-project-title"
        >
          <h2
            id="archive-project-title"
            className="text-headline-sm font-bold text-fg mb-1"
          >
            Archive this project?
          </h2>
          <p className="text-body-sm text-fg-muted mb-4">
            This marks <strong>{archiveTarget.title}</strong> as no longer
            required. It will be hidden from applicants and excluded from
            matching. You can unarchive it later.
          </p>
          {archiveTarget.matched > 0 && (
            <div className="flex items-start gap-2 mb-4 px-3 py-2.5 bg-warning-bg border border-warning/20 rounded-lg">
              <span className="text-body-sm text-fg">
                This project already has{" "}
                <strong>{archiveTarget.matched}</strong> matched intern
                {archiveTarget.matched !== 1 ? "s" : ""}. Archiving won&apos;t
                affect them, but no new applicants can be placed.
              </span>
            </div>
          )}
          {(() => {
            const n = pipelineCandidatesFor(archiveTarget.id).length;
            if (!n) return null;
            return (
              <div className="flex items-start gap-2 mb-4 px-3 py-2.5 bg-danger-bg border border-danger/20 rounded-lg">
                <span className="text-body-sm text-fg">
                  <strong>{n}</strong> candidate{n !== 1 ? "s are" : " is"}{" "}
                  mid-pipeline (shortlisted or interviewing) for this project.
                  They&apos;ll be flagged{" "}
                  <strong>&ldquo;rematch needed&rdquo;</strong> and you&apos;ll
                  be notified to move them to another preference.
                </span>
              </div>
            );
          })()}
          <label className="block text-label-sm font-semibold text-fg-muted mb-1">
            Reason for archiving <span className="text-danger">*</span>
          </label>
          <textarea
            rows={3}
            value={archiveRemark}
            onChange={(e) => setArchiveRemark(e.target.value)}
            placeholder="e.g. Requirement withdrawn by PC; mentor no longer available…"
            className="w-full px-3 py-2 text-body-sm border border-border rounded-lg bg-bg-subtle resize-none focus:outline-none focus:ring-2 focus:ring-accent/30 mb-4"
          />
          <div className="flex justify-end gap-2">
            <Button
              variant="danger"
              disabled={!archiveRemark.trim()}
              onClick={() => {
                archiveProject(archiveTarget, archiveRemark);
                setArchiveTarget(null);
              }}
            >
              <XCircle size={14} /> Archive Project
            </Button>
            <Button variant="ghost" onClick={() => setArchiveTarget(null)}>
              Cancel
            </Button>
          </div>
        </Modal>
      )}

      {/* Add-projects chooser — same interface AD (P&C) get when responding to a request */}
      <CreateProjectChooser open={createChooserOpen} onClose={() => setCreateChooserOpen(false)} />

      <Toast message={toastMsg} />
    </Shell>
  );
}
