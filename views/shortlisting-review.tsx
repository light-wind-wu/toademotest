'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Shell from '@/components/layout/shell';
import Button from '@/components/ui-legacy/button';
import { Toast, useToast } from '@/components/ui-legacy/toast';
import { SuccessCelebration } from '@/components/ui-legacy/success-celebration';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { UnderlineTabs } from '@/components/ui-legacy/underline-tabs';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui-legacy/tooltip';
import AiSummaryCard from '@/components/ui-legacy/ai-summary-card';
import {
  RowMenuButton,
  RowDropdown,
  DropdownItem,
} from '@/components/ui-legacy/row-actions';
import {
  Select,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Info, Folder, ChevronDown, Check, Send, X, Users, ClipboardCheck, CalendarCheck, Eye,
  Sparkles, AlertTriangle, ArrowRight, RotateCcw,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { availabilityWarnings, loadWeights, reweightScore, scoreSuitability } from '@/lib/scoring';
import type { ScoringWeights } from '@/lib/scoring';
import { z } from 'zod';
import type { Application, ProjectEntry, Programme, SuitabilityScore } from '@/lib/types';
import { loadProjects, loadProgrammes } from '@/lib/storage';
import { toEducationLevel, INTERN_CATEGORIES } from '@/lib/data';
import {
  INTAKE_YEARS,
  INTAKE_BASE_YEAR,
  INTERNSHIP_WINDOWS,
  shiftMMMYY,
  toMonthIndex,
  mmmyyToISO,
  mmmyyToISOEnd,
} from '@/lib/internship-period';
import { addNotification } from '@/lib/notifications';
import { useRole } from '@/lib/role';
import { logAccess } from '@/lib/audit';
import { getEngagements } from '@/lib/participants';
import applicationSeed from '@/data/applications.json';
import {
  getIoShortlistTask1Session,
  type IoShortlistTask1Session,
} from '@/lib/ut-scenarios';

const APP_KEY      = 'dsta_applications';
const APP_VER_KEY  = 'dsta_applications_seed_v';
const APP_SEED_VER = '32';

const ENABLED_SHORTLIST_CATEGORIES = [
  'Tech UP',
  'Undergraduate Student',
  'Polytechnic Scholar/Polytechnic Student',
] as const;

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const;

function loadApps(): Application[] {
  try {
    const ver = localStorage.getItem(APP_VER_KEY);
    const raw = localStorage.getItem(APP_KEY);
    const stored = raw ? JSON.parse(raw) as Application[] : [];
    const storedIds = new Set(stored.map(app => app.id));
    const additions = (applicationSeed as Application[]).filter(app => !storedIds.has(app.id));
    const merged = [...stored, ...additions];
    if (additions.length > 0 || ver !== APP_SEED_VER) saveApps(merged);
    return merged;
  } catch { return applicationSeed as Application[]; }
}

function saveApps(apps: Application[]) {
  localStorage.setItem(APP_KEY, JSON.stringify(apps));
  localStorage.setItem(APP_VER_KEY, APP_SEED_VER);
}

const TABS = [
  { key: 'shortlist',          label: 'Shortlist' },
  { key: 'interview-outcomes', label: 'Interview Outcomes' },
  { key: 'offers-extended',    label: 'Offer Extended' },
  { key: 'fully-placed',       label: 'Fully Placed' },
] as const;

type TabKey = typeof TABS[number]['key'];

const STATUS_BY_TAB: Record<TabKey, Set<Application['status']>> = {
  'shortlist':          new Set(['Pending Review', 'Shortlisted for Interview']),
  'interview-outcomes': new Set(['Interview Completed']),
  'offers-extended':    new Set(['Offer Extended']),
  'fully-placed':       new Set(['Offer Accepted', 'Active Intern', 'Internship Completed']),
};

interface IntakeOption {
  year: string;
  category: string;
  intakeId: string;
  intakeTitle: string;
  programmeId: string;
  programmeTitle: string;
  start?: string;
  end?: string;
}

interface WindowOption {
  label: string;
  value: string;
  start: string;
  end: string;
}

function extractYearFromTitle(title: string): string | null {
  const m = title.match(/\b(20\d{2})\b/);
  return m ? m[1] : null;
}

function extractYearFromIso(date?: string): string | null {
  if (!date) return null;
  const y = new Date(date).getFullYear();
  return Number.isNaN(y) ? null : String(y);
}

function buildIntakeOptions(programmes: Programme[]): IntakeOption[] {
  const out: IntakeOption[] = [];
  for (const prog of programmes) {
    const category = toEducationLevel(prog.educationLevel);
    const year = extractYearFromTitle(prog.title)
      ?? extractYearFromIso(prog.start)
      ?? extractYearFromIso(prog.end)
      ?? String(INTAKE_BASE_YEAR);

    if (prog.intakeWindows && prog.intakeWindows.length > 0) {
      for (const w of prog.intakeWindows) {
        out.push({
          year,
          category,
          intakeId: w.id || `${prog.id}-${w.start}`,
          intakeTitle: w.intakeTitle || prog.timeline || `${w.start} – ${w.end}`,
          programmeId: prog.id,
          programmeTitle: prog.title,
          start: w.start,
          end: w.end,
        });
      }
    } else {
      out.push({
        year,
        category,
        intakeId: prog.id,
        intakeTitle: prog.timeline || `${prog.start || ''} – ${prog.end || ''}`,
        programmeId: prog.id,
        programmeTitle: prog.title,
        start: prog.start,
        end: prog.end,
      });
    }
  }
  return out;
}

function buildWindowOptions(category: string, year: number): WindowOption[] {
  const presets = INTERNSHIP_WINDOWS[category] || [];
  const shift = year - INTAKE_BASE_YEAR;
  return presets.map((p, idx) => {
    const start = shiftMMMYY(p.start, shift);
    const end = shiftMMMYY(p.end, shift);
    return {
      label: formatWindowLabelDate(start, end),
      value: `${category}-${year}-${idx}`,
      start,
      end,
    };
  });
}

function formatISODate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return `${d} ${MONTHS[m - 1]} ${y}`;
}

function formatWindowLabelDate(start: string, end: string): string {
  const startIso = mmmyyToISO(start);
  const endIso = mmmyyToISOEnd(end);
  if (!startIso || !endIso) return `${start} – ${end}`;
  return `${formatISODate(startIso)} – ${formatISODate(endIso)}`;
}

interface CandidateRow {
  app: Application;
  score: number | null;
  sui: SuitabilityScore | undefined;
  rank: number | null;
  projectPosition: number | null;
  disciplineMatch: boolean;
  skillsMatched: number;
  skillsTotal: number;
}

const outcomeReasonSchema = z.string().trim().min(10, 'Add at least 10 characters so the decision is auditable.');

type OutcomeDecision = {
  app: Application;
  mode: 'refer' | 'reject';
} | null;

function mentorFeedbackLabel(decision: Application['mentorDecision']): string {
  if (decision === 'Accepted') return 'Recommend for offer';
  if (decision === 'Rejected') return 'Reject';
  if (decision === 'Referred') return 'Refer';
  return 'Awaiting feedback';
}

function mentorFeedbackTextClass(decision: Application['mentorDecision']): string {
  if (decision === 'Accepted') return 'text-success';
  if (decision === 'Rejected') return 'text-danger';
  if (decision === 'Referred') return 'text-warning';
  return 'text-fg-muted';
}

function remainingPlacements(project: ProjectEntry): number {
  return Math.max(project.slots - project.matched, 0);
}

function recommendedShortlist(project: ProjectEntry, candidateCount: number): [number, number] {
  if (project.recommendedShortlistMin != null && project.recommendedShortlistMax != null) {
    return [project.recommendedShortlistMin, project.recommendedShortlistMax];
  }
  const remaining = remainingPlacements(project);
  if (remaining === 0) return [0, 0];
  return [
    Math.min(remaining + 1, candidateCount) || remaining + 1,
    Math.min(remaining + 2, candidateCount) || remaining + 2,
  ];
}

export default function ShortlistingReviewPage() {
  const router = useRouter();
  const { profile } = useRole();
  const { toast, showToast } = useToast();

  const [apps, setApps] = useState<Application[]>([]);
  const [projects, setProjects] = useState<ProjectEntry[]>([]);
  const [programmes, setProgrammes] = useState<Programme[]>([]);
  const [weights, setWeights] = useState<ScoringWeights>({ discipline: 50, skills: 30, standing: 20 });

  const [year, setYear]               = useState<string>(String(INTAKE_BASE_YEAR));
  const [category, setCategory]       = useState<string>('');
  const [windowValue, setWindowValue] = useState<string>('');
  const [activeTab, setActiveTab]     = useState<TabKey>('shortlist');
  const [viewingProjectId, setViewingProjectId] = useState<string>('');
  const [selectedByProject, setSelectedByProject] = useState<Record<string, Set<string>>>({});
  const [dispatchProjectIds, setDispatchProjectIds] = useState<Set<string>>(new Set());
  const [expandedEligible, setExpandedEligible]   = useState<Set<string>>(new Set());
  const [reviewOpen, setReviewOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [dispatchSuccessOpen, setDispatchSuccessOpen] = useState(false);
  const [aiPanelApp, setAiPanelApp] = useState<Application | null>(null);
  const [mentorOutcomeApp, setMentorOutcomeApp] = useState<Application | null>(null);
  const [outcomeDecision, setOutcomeDecision] = useState<OutcomeDecision>(null);
  const [outcomeDestination, setOutcomeDestination] = useState<string>('talent-pool');
  const [outcomeReason, setOutcomeReason] = useState('');
  const [outcomeError, setOutcomeError] = useState('');
  const [utSession, setUtSession] = useState<IoShortlistTask1Session | null>(null);

  // Refs to apply seed-time default selections once per intake, not on every render.
  const defaultSelectedAppliedRef = useRef(false);
  const prevFilteredProjectsRef = useRef<ProjectEntry[]>([]);

  useEffect(() => {
    const scenario = getIoShortlistTask1Session();
    setUtSession(scenario);
    setApps(loadApps());
    setProjects(loadProjects());
    setProgrammes(loadProgrammes());
    setWeights(loadWeights());
    if (scenario?.active) {
      setYear(scenario.year);
    }
  }, []);

  const intakeOptions = useMemo(() => buildIntakeOptions(programmes), [programmes]);

  const yearOptions = useMemo(() => INTAKE_YEARS.map(String), []);
  const categoryOptions = useMemo(() => INTERN_CATEGORIES, []);
  const windowOptions = useMemo(() => {
    if (!year || !category) return [];
    return buildWindowOptions(category, parseInt(year, 10));
  }, [year, category]);

  const selectedWindow = useMemo(() => windowOptions.find(w => w.value === windowValue), [windowOptions, windowValue]);

  const selectedUtCategory = useMemo(
    () => utSession?.categories?.find(fixture =>
      fixture.year === year && fixture.category === category,
    ),
    [utSession, year, category],
  );

  const selectedIntake = useMemo(() => {
    if (!year || !category || !selectedWindow) return undefined;
    return intakeOptions.find(o => {
      if (utSession?.active && (!selectedUtCategory || (
        o.programmeId !== selectedUtCategory.programmeId ||
        o.intakeId !== selectedUtCategory.intakeId
      ))) return false;
      if (o.year !== year || o.category !== category) return false;
      const optStart = toMonthIndex(o.start);
      const optEnd = toMonthIndex(o.end);
      const winStart = toMonthIndex(selectedWindow.start);
      const winEnd = toMonthIndex(selectedWindow.end);
      if (optStart === null || optEnd === null || winStart === null || winEnd === null) return false;
      return optStart <= winEnd && winStart <= optEnd;
    });
  }, [intakeOptions, year, category, selectedWindow, utSession, selectedUtCategory]);

  const intakeProjects = useMemo(() => {
    if (!selectedIntake) return [];
    return projects
      .filter(p => {
        if (utSession?.active && !utSession.projectIds.includes(p.id)) return false;
        if (p.archived) return false;
        if (!p.programme || p.programme === 'unassigned') return false;
        if (p.programme !== selectedIntake.programmeId) return false;
        if (p.intakeId) return p.intakeId === selectedIntake.intakeId;
        const start = p.internshipPeriodStart;
        if (start) {
          const m = start.match(/(\d{2})$/);
          if (m) {
            const yy = parseInt(m[1], 10);
            const full = yy >= 50 ? 1900 + yy : 2000 + yy;
            if (String(full) === selectedIntake.year) return true;
          }
        }
        return true;
      })
      .sort((a, b) => a.title.localeCompare(b.title));
  }, [projects, selectedIntake, utSession]);

  const filteredProjects = useMemo(() => {
    if (activeTab === 'shortlist') return intakeProjects;
    const statusSet = STATUS_BY_TAB[activeTab];
    return intakeProjects.filter(project => apps.some(app => {
      if (utSession?.active && !utSession.applicantIds.includes(app.id)) return false;
      return app.shortlistedFor === project.id && statusSet.has(app.status);
    }));
  }, [activeTab, intakeProjects, apps, utSession]);

  useEffect(() => {
    if (filteredProjects.length === 0) {
      setViewingProjectId('');
      return;
    }
    if (!filteredProjects.some(p => p.id === viewingProjectId)) {
      setViewingProjectId(filteredProjects[0].id);
    }
  }, [filteredProjects, viewingProjectId]);

  useEffect(() => {
    if (!viewingProjectId) return;
    setExpandedEligible(prev => {
      if (prev.has(viewingProjectId)) return prev;
      const next = new Set(prev);
      next.add(viewingProjectId);
      return next;
    });
  }, [viewingProjectId]);

  const dispatchedIds = useMemo(() => {
    const set = new Set<string>();
    for (const app of apps) {
      if (app.shortlistedFor && app.status === 'Shortlisted for Interview') {
        set.add(app.id);
      }
    }
    return set;
  }, [apps]);

  const applicationsByProject = useMemo(() => {
    const map: Record<string, CandidateRow[]> = {};
    if (!selectedIntake) return map;
    const statusSet = STATUS_BY_TAB[activeTab];

    for (const project of filteredProjects) {
      const rows: CandidateRow[] = [];
      for (const app of apps) {
        if (utSession?.active && !utSession.applicantIds.includes(app.id)) continue;
        if (!statusSet.has(app.status)) continue;
        if (activeTab === 'shortlist') {
          if (app.programmeId !== selectedIntake.programmeId) continue;
          if (app.intakeId && app.intakeId !== selectedIntake.intakeId) continue;
          if (app.shortlistedFor && app.shortlistedFor !== project.id) continue;
        } else {
          if (app.shortlistedFor !== project.id) continue;
        }

        const explicitSuitability = app.suitabilityScores.find(s => s.projectId === project.id);
        if (utSession?.active && !explicitSuitability) continue;
        const sui = explicitSuitability ?? scoreSuitability(app, project);
        const score = sui ? Math.round(reweightScore(sui, weights)) : null;
        const disciplineMatch = sui?.disciplineScore != null ? sui.disciplineScore >= 68 : false;
        const skillsTotal = project.skills?.length || 0;
        const skillsMatched = skillsTotal > 0 && sui?.skillsScore != null
          ? Math.max(1, Math.round((sui.skillsScore / 100) * skillsTotal))
          : 0;
        const rank = app.projectRankings.indexOf(project.id) + 1 || null;

        rows.push({ app, score, sui, rank, projectPosition: null, disciplineMatch, skillsMatched, skillsTotal });
      }
      rows.sort((a, b) => (b.score ?? -1) - (a.score ?? -1));
      rows.forEach((row, index) => { row.projectPosition = index + 1; });
      map[project.id] = rows;
    }
    return map;
  }, [apps, filteredProjects, selectedIntake, activeTab, weights, utSession]);

  useEffect(() => {
    if (activeTab !== 'shortlist') {
      setSelectedByProject({});
      defaultSelectedAppliedRef.current = false;
      prevFilteredProjectsRef.current = [];
      return;
    }

    const filteredChanged =
      filteredProjects.length !== prevFilteredProjectsRef.current.length ||
      filteredProjects.some((p, i) => p.id !== prevFilteredProjectsRef.current[i]?.id);

    if (filteredChanged) {
      defaultSelectedAppliedRef.current = false;
      prevFilteredProjectsRef.current = filteredProjects;
    }

    if (defaultSelectedAppliedRef.current) return;

    const next: Record<string, Set<string>> = {};
    for (const project of filteredProjects) {
      const candidates = applicationsByProject[project.id] || [];
      const selected = new Set<string>();
      const hasExplicitSelectionHints = candidates.some(
        row => row.sui?.defaultSelected !== undefined,
      );

      // Prefer seed-time default selections when present.
      for (const row of candidates) {
        if (row.sui?.defaultSelected === true) {
          selected.add(row.app.id);
        }
      }

      // Fall back to the original top-N auto-selection for records without defaults.
      if (!hasExplicitSelectionHints && selected.size === 0) {
        const recommended = Math.min(Math.max(project.slots + 1, 2), candidates.length);
        for (let i = 0; i < recommended; i++) {
          if (candidates[i]) selected.add(candidates[i].app.id);
        }
      }

      next[project.id] = selected;
    }
    setSelectedByProject(next);
    setDispatchProjectIds(new Set(filteredProjects
      .filter(project => remainingPlacements(project) > 0)
      .map(project => project.id)));
    defaultSelectedAppliedRef.current = true;
  }, [filteredProjects, activeTab, applicationsByProject]);

  const viewingProject = useMemo(
    () => filteredProjects.find(p => p.id === viewingProjectId),
    [filteredProjects, viewingProjectId]
  );

  const selectedProjectByApplicant = useMemo(() => {
    const map: Record<string, string> = {};
    for (const [projectId, applicantIds] of Object.entries(selectedByProject)) {
      for (const applicantId of applicantIds) map[applicantId] = projectId;
    }
    return map;
  }, [selectedByProject]);

  const tabCounts = useMemo(() => {
    const counts: Record<TabKey, number> = {
      'shortlist': 0,
      'interview-outcomes': 0,
      'offers-extended': 0,
      'fully-placed': 0,
    };
    if (!selectedIntake) return counts;
    // Shortlist tab counts projects (matching prototype), other stages count applicants.
    counts.shortlist = intakeProjects.length;
    for (const app of apps) {
      for (const key of TABS.map(t => t.key)) {
        if (key === 'shortlist') continue;
        if (STATUS_BY_TAB[key].has(app.status)) {
          const inIntake = app.programmeId === selectedIntake.programmeId
            && (!app.intakeId || app.intakeId === selectedIntake.intakeId);
          if (inIntake) counts[key]++;
          break;
        }
      }
    }
    return counts;
  }, [apps, selectedIntake, intakeProjects]);

  const dispatchEnabled = activeTab === 'shortlist' && selectedIntake != null;
  const dispatchSummary = useMemo(() => {
    if (!dispatchEnabled) return null;
    let total = 0;
    const projectsToDispatch: string[] = [];
    for (const project of filteredProjects) {
      if (remainingPlacements(project) === 0) continue;
      if (!dispatchProjectIds.has(project.id)) continue;
      const ids = selectedByProject[project.id];
      if (!ids || ids.size === 0) continue;
      const newIds = Array.from(ids).filter(id => !dispatchedIds.has(id));
      if (newIds.length === 0) continue;
      total += newIds.length;
      projectsToDispatch.push(project.id);
    }
    return { total, projectCount: projectsToDispatch.length, projectIds: projectsToDispatch };
  }, [dispatchEnabled, filteredProjects, selectedByProject, dispatchedIds, dispatchProjectIds]);

  const selectedDispatchProjectCount = useMemo(
    () => filteredProjects.filter(project =>
      remainingPlacements(project) > 0 && dispatchProjectIds.has(project.id),
    ).length,
    [filteredProjects, dispatchProjectIds],
  );

  const projectTitles = useMemo(() => {
    const map: Record<string, string> = {};
    for (const p of projects) map[p.id] = p.title;
    return map;
  }, [projects]);

  function toggleCandidate(projectId: string, appId: string) {
    const project = projects.find(item => item.id === projectId);
    if (!project || remainingPlacements(project) === 0) return;
    setSelectedByProject(prev => {
      const set = new Set(prev[projectId] || []);
      if (set.has(appId)) {
        set.delete(appId);
      } else {
        const selectedElsewhere = Object.entries(prev).some(
          ([otherProjectId, applicantIds]) =>
            otherProjectId !== projectId && applicantIds.has(appId),
        );
        if (selectedElsewhere) return prev;
        set.add(appId);
      }
      return { ...prev, [projectId]: set };
    });
  }

  function toggleEligibleExpanded(projectId: string) {
    setExpandedEligible(prev => {
      const next = new Set(prev);
      if (next.has(projectId)) next.delete(projectId);
      else next.add(projectId);
      return next;
    });
  }

  function toggleDispatchProject(projectId: string) {
    const project = projects.find(item => item.id === projectId);
    if (!project || remainingPlacements(project) === 0) return;
    setDispatchProjectIds(prev => {
      const next = new Set(prev);
      if (next.has(projectId)) next.delete(projectId);
      else next.add(projectId);
      return next;
    });
  }

  function getNewSelectedCount(projectId: string): number {
    const ids = selectedByProject[projectId] || new Set<string>();
    return Array.from(ids).filter(id => !dispatchedIds.has(id)).length;
  }

  function openDispatchReview() {
    if (!dispatchSummary || dispatchSummary.total === 0) return;
    setReviewOpen(true);
  }

  function proceedToConfirm() {
    setReviewOpen(false);
    setConfirmOpen(true);
  }

  function confirmDispatch() {
    if (!selectedIntake || !dispatchEnabled || !dispatchSummary) return;
    const actor = `${profile.name} (${profile.title})`;
    const updates: Record<string, string> = {};

    const nextApps = apps.map(app => {
      for (const pid of dispatchSummary.projectIds) {
        const ids = selectedByProject[pid];
        if (ids?.has(app.id) && !dispatchedIds.has(app.id)) {
          const proj = projects.find(p => p.id === pid);
          updates[pid] = proj?.title || pid;
          return {
            ...app,
            status: 'Shortlisted for Interview' as Application['status'],
            shortlistedFor: pid,
          };
        }
      }
      return app;
    });

    setApps(nextApps);
    saveApps(nextApps);

    for (const [pid, title] of Object.entries(updates)) {
      const proj = projects.find(p => p.id === pid);
      addNotification({
        forRole: 'mentor',
        ...(proj?.mentorUserId ? { forMentorId: proj.mentorUserId } : {}),
        title: `Shortlist dispatched — ${title}`,
        body:  `${actor} dispatched a shortlist for your project "${title}". Please set interview availability.`,
        href:  '/mentor/projects',
        tier:  'action',
      });
    }

    logAccess({
      actor,
      action: 'decision',
      detail: `Dispatched shortlist for intake ${selectedIntake.intakeTitle}`,
      subjectId: selectedIntake.programmeId,
    });

    setConfirmOpen(false);
    setDispatchProjectIds(prev => {
      const next = new Set(prev);
      dispatchSummary.projectIds.forEach(id => next.delete(id));
      return next;
    });
    showToast(
      `${dispatchSummary.total} candidate${dispatchSummary.total !== 1 ? 's have' : ' has'} been sent across ${dispatchSummary.projectCount} project${dispatchSummary.projectCount !== 1 ? 's' : ''}. Projects with remaining seats stay open.`,
      'success',
      'Candidates dispatched'
    );
    setDispatchSuccessOpen(true);
  }

  function proceedToOffer(app: Application) {
    if (app.preOfferChecks !== 'completed') {
      showToast('Complete the pre-offer checks in Applications before preparing the offer.', 'warning', 'Pre-offer checks pending');
      return;
    }
    router.push(`/offer-letter?appId=${app.id}`);
  }

  function openOutcomeAction(app: Application, mode: 'refer' | 'reject') {
    setOutcomeDecision({ app, mode });
    setOutcomeDestination('talent-pool');
    setOutcomeReason('');
    setOutcomeError('');
  }

  function confirmOutcomeAction() {
    if (!outcomeDecision) return;
    const parsed = outcomeReasonSchema.safeParse(outcomeReason);
    if (!parsed.success) {
      setOutcomeError(parsed.error.issues[0]?.message || 'Add a reason for this decision.');
      return;
    }

    const { app, mode } = outcomeDecision;
    const currentProjectId = app.shortlistedFor;
    const triedProjects = Array.from(new Set([
      ...(app.triedProjects || []),
      ...(currentProjectId ? [currentProjectId] : []),
    ]));
    const today = new Date().toISOString().split('T')[0];
    let updated: Application;

    if (mode === 'reject') {
      updated = {
        ...app,
        status: 'Rejected',
        ioRejectionRemark: parsed.data,
        triedProjects,
        rejectionEmailSent: true,
        rejectionEmailSentDate: today,
      };
      addNotification({
        forRole: 'applicant',
        forEmail: app.email,
        title: 'Update on your application',
        body: `We regret to inform you that your application to ${app.programmeName} was unsuccessful.`,
        href: '/apply/applications',
        tier: 'info',
      });
    } else if (outcomeDestination === 'talent-pool') {
      updated = {
        ...app,
        status: 'Pending Review',
        shortlistedFor: undefined,
        triedProjects,
        talentPool: {
          addedDate: today,
          sourceProjectId: currentProjectId,
          reason: parsed.data,
        },
        mentorDecision: null,
      };
    } else {
      updated = {
        ...app,
        status: 'Shortlisted for Interview',
        shortlistedFor: outcomeDestination,
        triedProjects,
        talentPool: undefined,
        mentorDecision: null,
        mentorNotes: undefined,
        mentorScores: undefined,
        mentorRejectionRemark: undefined,
        mentorAiSummary: undefined,
        mentorTranscript: undefined,
        interviewSlots: undefined,
        confirmedSlot: undefined,
        meetingLink: undefined,
      };
      const target = projects.find(project => project.id === outcomeDestination);
      addNotification({
        forRole: 'mentor',
        ...(target?.mentorUserId ? { forMentorId: target.mentorUserId } : {}),
        title: `New applicant referred — ${target?.title || 'your project'}`,
        body: `${app.name} has been referred to your project for interview review.`,
        href: '/mentor/projects',
        tier: 'action',
      });
    }

    const nextApps = apps.map(item => item.id === app.id ? updated : item);
    setApps(nextApps);
    saveApps(nextApps);
    setMentorOutcomeApp(null);
    setOutcomeDecision(null);
    showToast(
      mode === 'reject'
        ? `${app.name}'s application has been rejected.`
        : outcomeDestination === 'talent-pool'
          ? `${app.name} has been moved to the Talent Pool.`
          : `${app.name} has been referred to another project.`,
      'success',
      mode === 'reject' ? 'Decision recorded' : 'Candidate referred',
    );
  }

  const handleYearChange = (value: string) => {
    setYear(value);
    setCategory('');
    setWindowValue('');
  };

  const handleCategoryChange = (value: string) => {
    setCategory(value);
    setWindowValue('');
  };

  return (
    <Shell activeRoute="/shortlisting-review">
      <div className="mb-1">
        <h1 className="text-headline-lg text-fg">Project Shortlisting</h1>
        <p className="text-body-md text-fg-muted mt-1">
          Select an internship intake, review ranked applicants by project, and dispatch selected applicants to mentors for interview.
        </p>
      </div>

      <div className="card px-[18px] py-4 mb-5">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
          <div>
            <label className="block text-[12px] font-medium text-fg mb-1.5">
              Year <span className="text-danger">*</span>
            </label>
            <Select value={year} onValueChange={v => handleYearChange(v ?? '')}>
              <SelectTrigger className="w-full h-[38px] text-[12px]">
                <SelectValue placeholder="Select year" />
              </SelectTrigger>
              <SelectContent>
                {yearOptions.map(y => (
                  <SelectItem key={y} value={y}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="block text-[12px] font-medium text-fg mb-1.5">
              Intern category <span className="text-danger">*</span>
            </label>
            <Select value={category} onValueChange={v => handleCategoryChange(v ?? '')} disabled={!year}>
              <SelectTrigger className="w-full h-[38px] text-[12px]">
                <SelectValue placeholder={year ? 'Select category' : 'Select a year first'} />
              </SelectTrigger>
              <SelectContent className="max-w-[min(28rem,var(--available-width))]">
                {categoryOptions.map(c => {
                  const enabled = ENABLED_SHORTLIST_CATEGORIES.includes(c as typeof ENABLED_SHORTLIST_CATEGORIES[number]);
                  return (
                    <SelectItem key={c} value={c} disabled={!enabled} className="whitespace-normal leading-snug">
                      {c}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="block text-[12px] font-medium text-fg mb-1.5">
              Internship window <span className="text-danger">*</span>
            </label>
            <Select value={windowValue} onValueChange={v => setWindowValue(v ?? '')} disabled={!category}>
              <SelectTrigger className="w-full h-[38px] text-[12px]">
                <span className={cn('flex-1 text-left text-[12px]', !windowValue && 'text-fg-subtle')}>
                  {windowValue
                    ? windowOptions.find(w => w.value === windowValue)?.label
                    : category ? 'Select window' : 'Select an intern category first'}
                </span>
              </SelectTrigger>
              <SelectContent>
                {windowOptions.map(w => (
                  <SelectItem key={w.value} value={w.value}>{w.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {!selectedIntake ? (
        <div className="card flex flex-col items-center justify-center text-center py-20">
          <div className="w-12 h-12 rounded-full bg-bg-muted flex items-center justify-center mb-4">
            <Folder size={24} className="text-fg-muted" />
          </div>
          <h2 className="text-body-lg font-semibold text-fg mb-1">Select an intern category to begin</h2>
          <p className="text-body-md text-fg-muted max-w-md">
            Projects will appear after the intern category and internship window have been selected.
          </p>
        </div>
      ) : (
        <>
          <div className="mb-3">
            <UnderlineTabs
              ariaLabel="Shortlisting stage"
              value={activeTab}
              onValueChange={(v) => setActiveTab(v as TabKey)}
              tabs={TABS.map(t => ({ value: t.key, label: t.label, count: tabCounts[t.key] }))}
              size="sm"
            />
          </div>

          <section className="mb-3 flex items-start gap-3 border border-info/25 bg-info-bg px-4 py-3" aria-labelledby="review-guidance">
            <Info size={17} className="mt-0.5 shrink-0 text-info" aria-hidden="true" />
            <div>
              <h2 id="review-guidance" className="text-[13px] font-semibold text-fg">
                {activeTab === 'shortlist'
                  ? 'Applicants are ranked based on their discipline of study, skills, and project preferences.'
                  : activeTab === 'interview-outcomes'
                    ? 'Mentor interview conclusions are ready for IO review.'
                    : 'Review applicants in the selected stage.'}
              </h2>
              <p className="mt-0.5 text-[11px] text-fg-muted">
                {activeTab === 'shortlist'
                  ? 'The highest-ranked applicants are pre-selected for IO review. An applicant can be selected for only one active project shortlist at a time.'
                  : activeTab === 'interview-outcomes'
                    ? 'View the Mentor’s submitted scores, recommendation and remarks. The eventual IO decision is recorded separately.'
                    : 'Select a project to view applicants and their current status.'}
              </p>
            </div>
          </section>

          <div className="grid min-h-[510px] min-w-0 overflow-hidden rounded-lg border border-border bg-surface lg:grid-cols-[380px_minmax(0,1fr)]">
            <aside className="relative z-10 flex min-h-0 min-w-0 flex-col overflow-hidden border-b border-border bg-surface lg:overflow-visible lg:border-b-0 lg:border-r">
              <div className="flex min-h-[42px] items-center justify-between border-b border-border bg-bg-subtle/50 px-4">
                <span className="text-[12px] font-semibold text-fg">Projects ({filteredProjects.length})</span>
                <span className="inline-flex items-center gap-1 text-[12px] text-fg-muted">
                  Status
                  <Tooltip>
                    <TooltipTrigger>
                      <Info size={13} className="text-fg-muted" />
                    </TooltipTrigger>
                    <TooltipContent side="right">Project shortlist status</TooltipContent>
                  </Tooltip>
                </span>
              </div>
              <div className="flex min-w-0 flex-col">
                {filteredProjects.map(project => {
                  const candidates = applicationsByProject[project.id] || [];
                  const isViewing = project.id === viewingProjectId;
                  const remaining = remainingPlacements(project);
                  const isFull = remaining === 0;
                  const selectedCount = getNewSelectedCount(project.id);
                  const [recommendedMin, recommendedMax] = recommendedShortlist(project, candidates.length);
                  const isInRange = selectedCount >= recommendedMin && selectedCount <= recommendedMax;
                  const isAbove = !isFull && selectedCount > recommendedMax;
                  const dispatchedCount = candidates.filter(row => dispatchedIds.has(row.app.id)).length;
                  const shortlistStatusText = isFull
                    ? 'Shortlist already dispatched'
                    : dispatchedCount > 0
                      ? `${dispatchedCount} candidate${dispatchedCount !== 1 ? 's' : ''} sent · ${remaining} seat${remaining !== 1 ? 's' : ''} remaining`
                    : isInRange
                      ? `${selectedCount} applicant${selectedCount !== 1 ? 's' : ''} selected`
                      : isAbove
                        ? 'Above recommended range'
                        : 'Below recommended range';
                  const statusText = activeTab === 'interview-outcomes'
                    ? `${candidates.length} conclusion${candidates.length !== 1 ? 's' : ''} ready for IO review`
                    : activeTab === 'shortlist'
                      ? shortlistStatusText
                      : `${candidates.length} candidate${candidates.length !== 1 ? 's' : ''} in this stage`;
                  return (
                    <div
                      key={project.id}
                      className={cn(
                        'group relative box-border grid w-full min-w-0 border-b text-left transition-colors',
                        activeTab === 'shortlist' ? 'grid-cols-[48px_minmax(0,1fr)]' : 'grid-cols-1',
                        isViewing
                          ? 'z-10 border-y border-[#E7E4DD] bg-[#F4F2EC]'
                          : 'border-border bg-surface hover:bg-bg-muted'
                      )}
                    >
                      {activeTab === 'shortlist' && <div className="flex justify-center pt-5">
                          <Checkbox
                            checked={!isFull && dispatchProjectIds.has(project.id)}
                            disabled={isFull}
                            onCheckedChange={() => toggleDispatchProject(project.id)}
                            className={cn(isFull && 'bg-bg-muted border-border opacity-60')}
                            aria-label={`Include ${project.title} in dispatch`}
                          />
                      </div>}
                        <button
                          type="button"
                          onClick={() => setViewingProjectId(project.id)}
                          className={cn('min-w-0 py-[15px] pr-[18px] text-left', activeTab === 'shortlist' ? 'px-0' : 'pl-[18px]')}
                        >
                          <p className="truncate text-[14px] font-semibold leading-snug text-fg">
                            {project.title}
                          </p>
                          <p className="mt-0.5 text-[12px] text-fg-muted">
                            {activeTab === 'interview-outcomes'
                              ? `${candidates.length} mentor conclusion${candidates.length !== 1 ? 's' : ''} submitted`
                              : activeTab === 'shortlist'
                                ? `${project.slots} placement${project.slots !== 1 ? 's' : ''} · recommended shortlist ${recommendedMin}–${recommendedMax}`
                                : `${candidates.length} candidate${candidates.length !== 1 ? 's' : ''}`}
                          </p>
                          <p className={cn(
                            'mt-1 text-[12px] font-medium',
                            activeTab !== 'shortlist' || isInRange || isFull || dispatchedCount > 0 ? 'text-success' : 'text-warning',
                          )}>
                            {statusText}
                          </p>
                        </button>
                      {isViewing && (
                        <span
                          className="absolute right-[-10px] top-1/2 z-10 h-[18px] w-[18px] -translate-y-1/2 rotate-45 border-t border-r border-[#E7E4DD] bg-[#F4F2EC]"
                          aria-hidden="true"
                        />
                      )}
                    </div>
                  );
                })}
                </div>
              </aside>

            <div className="flex min-h-0 min-w-0 flex-col bg-surface">
              {viewingProject ? (
                <>
                  <div className="px-4 py-3 border-b border-border bg-[#F9F8F4] flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <h2 className="text-[15px] font-semibold text-fg">{viewingProject.title}</h2>
                      <p className="text-[10px] text-fg-muted">
                        {activeTab === 'interview-outcomes'
                          ? `${(applicationsByProject[viewingProject.id] || []).length} submitted Mentor conclusion${(applicationsByProject[viewingProject.id] || []).length !== 1 ? 's' : ''}`
                          : `${viewingProject.slots} placement${viewingProject.slots !== 1 ? 's' : ''}`}
                        {activeTab === 'shortlist' && remainingPlacements(viewingProject) > 0 && (() => {
                          const [min, max] = recommendedShortlist(
                            viewingProject,
                            (applicationsByProject[viewingProject.id] || []).length,
                          );
                          return <> · Recommended shortlist: {min}–{max}</>;
                        })()}
                      </p>
                      {applicationsByProject[viewingProject.id]?.some(row => dispatchedIds.has(row.app.id)) && (
                        <p className="mt-0.5 text-[10px] font-semibold text-success">
                          {(() => {
                            const sent = applicationsByProject[viewingProject.id].filter(row => dispatchedIds.has(row.app.id)).length;
                            return `${sent} candidate${sent !== 1 ? 's' : ''} sent`;
                          })()}
                        </p>
                      )}
                    </div>
                    <div className="inline-flex items-center gap-1 border border-border rounded-full px-2 py-1 text-[10px] font-medium text-fg bg-surface shrink-0">
                      {activeTab === 'shortlist'
                        ? remainingPlacements(viewingProject) === 0
                          ? 'Fully filled'
                          : `${(selectedByProject[viewingProject.id] || new Set()).size} candidate${((selectedByProject[viewingProject.id] || new Set()).size !== 1) ? 's' : ''} selected`
                        : `${(applicationsByProject[viewingProject.id] || []).length} candidate${((applicationsByProject[viewingProject.id] || []).length !== 1) ? 's' : ''}`}
                    </div>
                  </div>

                  <div className="flex-1 p-4">
                    {remainingPlacements(viewingProject) === 0 && activeTab === 'shortlist' ? (
                      <div className="text-center py-12 text-body-md text-fg-muted">
                        <p className="font-semibold text-fg">All placements are filled</p>
                        <p>This project is complete and cannot receive another shortlist.</p>
                      </div>
                    ) : (applicationsByProject[viewingProject.id] || []).length === 0 ? (
                      <div className="text-center py-12 text-body-md text-fg-muted">
                        No applicants in this stage for the selected project.
                      </div>
                    ) : (
                      <CandidateList
                        rows={applicationsByProject[viewingProject.id] || []}
                        selected={selectedByProject[viewingProject.id] || new Set()}
                        onToggle={(appId) => toggleCandidate(viewingProject.id, appId)}
                        expanded={expandedEligible.has(viewingProject.id)}
                        onToggleExpanded={() => toggleEligibleExpanded(viewingProject.id)}
                        activeTab={activeTab}
                        onView360={(app) => window.open(`/candidate360/${app.id}?from=shortlisting-review`, '_blank')}
                        onAiSummary={setAiPanelApp}
                        onViewMentorOutcome={setMentorOutcomeApp}
                        viewingProjectId={viewingProject.id}
                        projectTitles={projectTitles}
                        dispatchedIds={dispatchedIds}
                        selectedProjectByApplicant={selectedProjectByApplicant}
                        project={viewingProject}
                        weights={weights}
                        onProceedToOffer={proceedToOffer}
                        onRefer={(app) => openOutcomeAction(app, 'refer')}
                        onReject={(app) => openOutcomeAction(app, 'reject')}
                      />
                    )}
                  </div>
                </>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center text-body-md text-fg-muted py-20">
                  <p className="font-semibold text-fg">Select a project to review</p>
                  <p>Choose a project from the left panel to view its system-ranked applicants.</p>
                </div>
              )}
            </div>
          </div>

          {activeTab === 'shortlist' && <div className="sticky bottom-0 z-20 bg-surface/95 backdrop-blur-md border-t border-border py-2 px-7 min-h-[58px] flex items-center justify-between gap-4 shadow-[0_-8px_24px_rgba(16,24,40,.06)]">
            <p className="text-[12px] text-fg">
              {dispatchSummary && dispatchSummary.total > 0
                ? `${dispatchSummary.total} applicant${dispatchSummary.total !== 1 ? 's' : ''} in ${selectedDispatchProjectCount} project${selectedDispatchProjectCount !== 1 ? 's' : ''} ready to dispatch to mentors`
                : selectedDispatchProjectCount > 0
                  ? `${selectedDispatchProjectCount} project${selectedDispatchProjectCount !== 1 ? 's are' : ' is'} selected`
                  : 'No projects selected for dispatch'}
            </p>
            <Button
              disabled={!dispatchEnabled || !dispatchSummary || dispatchSummary.total === 0}
              onClick={openDispatchReview}
              className="h-[34px] text-[12px]"
            >
              <Check size={14} /> Dispatch selected applicants
            </Button>
          </div>}
        </>
      )}

      <Dialog open={reviewOpen} onOpenChange={setReviewOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-headline-md">Review selected applicants</DialogTitle>
            <DialogDescription className="text-body-md text-fg-muted">
              Check the applicants and projects included in this dispatch.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 mb-4 max-h-[360px] overflow-y-auto pr-1">
            {dispatchSummary?.projectIds.map(pid => {
              const proj = projects.find(p => p.id === pid);
              const selectedIds = selectedByProject[pid] || new Set<string>();
              const newIds = Array.from(selectedIds).filter(id => !dispatchedIds.has(id));
              return (
                <div key={pid} className="border border-border rounded-xl p-4">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-body-sm font-semibold text-fg">{proj?.title || pid}</p>
                    <span className="inline-flex items-center rounded-full border border-border px-2.5 py-1 text-[12px] font-medium text-fg">
                      {newIds.length} applicant{newIds.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <p className="text-body-sm text-fg-muted mt-2">
                    {newIds.map(appId => apps.find(a => a.id === appId)?.name).filter(Boolean).join(', ') || 'No new candidates selected'}
                  </p>
                </div>
              );
            })}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setReviewOpen(false)}>Cancel</Button>
            <Button onClick={proceedToConfirm}>Continue</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-headline-md">Confirm dispatch</DialogTitle>
            <DialogDescription className="text-body-md text-fg-muted">
              This is the final confirmation. The assigned mentors will be notified immediately.
            </DialogDescription>
          </DialogHeader>

          {(() => {
            const belowRecommendedProjects = (dispatchSummary?.projectIds || []).filter(pid => {
              const proj = projects.find(p => p.id === pid);
              const newIds = Array.from(selectedByProject[pid] || new Set<string>()).filter(id => !dispatchedIds.has(id));
              const [recommendedMin] = proj
                ? recommendedShortlist(proj, (applicationsByProject[pid] || []).length)
                : [0, 0];
              return newIds.length < recommendedMin;
            });
            const aboveRecommendedProjects = (dispatchSummary?.projectIds || []).filter(pid => {
              const proj = projects.find(p => p.id === pid);
              const newIds = Array.from(selectedByProject[pid] || new Set<string>()).filter(id => !dispatchedIds.has(id));
              const [, recommendedMax] = proj
                ? recommendedShortlist(proj, (applicationsByProject[pid] || []).length)
                : [0, 0];
              return newIds.length > recommendedMax;
            });
            return (
              <div className="bg-warning-bg border border-warning/30 rounded-xl p-4 mb-5 space-y-2">
                <p className="text-body-sm font-semibold text-warning">
                  {dispatchSummary?.total} applicant{dispatchSummary?.total !== 1 ? 's' : ''} across {dispatchSummary?.projectCount} project{dispatchSummary?.projectCount !== 1 ? 's' : ''} will be sent to the assigned mentors for interview.
                </p>
                <p className="text-body-sm text-warning/80">
                  Only the applicants listed here will be marked as sent to mentor.
                </p>
                {belowRecommendedProjects.length > 0 && (
                  <p className="text-body-sm text-warning/80">
                    {belowRecommendedProjects.length} project{belowRecommendedProjects.length !== 1 ? 's are' : ' is'} below the recommended shortlist. IO may proceed with this exception.
                  </p>
                )}
                {aboveRecommendedProjects.length > 0 && (
                  <p className="text-body-sm text-warning/80">
                    {aboveRecommendedProjects.length} project{aboveRecommendedProjects.length !== 1 ? 's are' : ' is'} above the recommended shortlist. IO may proceed with this exception.
                  </p>
                )}
              </div>
            );
          })()}

          <DialogFooter>
            <Button variant="outline" onClick={() => { setConfirmOpen(false); setReviewOpen(true); }}>Back</Button>
            <Button onClick={confirmDispatch}>
              <Send size={14} /> Confirm and dispatch
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={dispatchSuccessOpen} onOpenChange={setDispatchSuccessOpen}>
        <DialogContent className="border-none bg-transparent p-0 shadow-none">
          <SuccessCelebration
            title="Task Completed"
            message="You have successfully completed this test task. Your responses have been recorded."
            buttonText="Back to Tasks"
            onButtonClick={() => {
              setDispatchSuccessOpen(false);
              router.push('/start-tasks');
            }}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={mentorOutcomeApp != null} onOpenChange={(open) => !open && setMentorOutcomeApp(null)}>
        <DialogContent className="max-w-2xl">
          {mentorOutcomeApp && (() => {
            const project = projects.find(item => item.id === mentorOutcomeApp.shortlistedFor);
            const scores = mentorOutcomeApp.mentorScores;
            const scoreEntries = scores ? [
              ['Technical knowledge', scores.technicalKnowledge],
              ['Problem solving', scores.problemSolving],
              ['Communication', scores.communication],
              ['Initiative & drive', scores.initiativeDrive],
            ] as const : [];
            const average = scoreEntries.length
              ? scoreEntries.reduce((sum, [, score]) => sum + score, 0) / scoreEntries.length
              : null;
            const slot = mentorOutcomeApp.confirmedSlot != null
              ? mentorOutcomeApp.interviewSlots?.[mentorOutcomeApp.confirmedSlot]
              : undefined;
            return (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2 text-headline-md">
                    <ClipboardCheck size={18} className="text-accent" /> Mentor&apos;s interview conclusion
                  </DialogTitle>
                  <DialogDescription className="text-body-md text-fg-muted">
                    Review the submitted assessment before recording a separate IO decision.
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-4 rounded-xl border border-border bg-bg-subtle/40 p-4">
                    <div>
                      <p className="text-body-md font-semibold text-fg">{mentorOutcomeApp.name}</p>
                      <p className="mt-0.5 text-body-sm text-fg-muted">{project?.title || 'Project not available'}</p>
                      {slot && (
                        <p className="mt-2 flex items-center gap-1.5 text-[12px] text-fg-muted">
                          <CalendarCheck size={13} /> Conducted {slot.date} at {slot.time}
                        </p>
                      )}
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-[11px] text-fg-muted">Mentor feedback</p>
                      <p className={cn('mt-0.5 text-body-sm font-semibold', mentorFeedbackTextClass(mentorOutcomeApp.mentorDecision))}>
                        {mentorFeedbackLabel(mentorOutcomeApp.mentorDecision)}
                      </p>
                    </div>
                  </div>

                  {scoreEntries.length > 0 && (
                    <section className="rounded-xl border border-border p-4" aria-labelledby="mentor-score-heading">
                      <div className="mb-3 flex items-center justify-between">
                        <h3 id="mentor-score-heading" className="text-body-sm font-semibold text-fg">Submitted assessment</h3>
                        <span className="text-body-sm font-semibold text-fg">{average?.toFixed(1)} / 10</span>
                      </div>
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        {scoreEntries.map(([label, score]) => (
                          <div key={label} className="flex items-center justify-between border-b border-border pb-2 text-body-sm">
                            <span className="text-fg-muted">{label}</span>
                            <span className="font-semibold tabular-nums text-fg">{score.toFixed(1)}</span>
                          </div>
                        ))}
                      </div>
                    </section>
                  )}

                  <section className="rounded-xl border border-border p-4" aria-labelledby="mentor-remarks-heading">
                    <h3 id="mentor-remarks-heading" className="text-body-sm font-semibold text-fg">Mentor remarks</h3>
                    <p className="mt-2 whitespace-pre-wrap text-body-sm leading-relaxed text-fg-muted">
                      {mentorOutcomeApp.mentorNotes || mentorOutcomeApp.mentorRejectionRemark || 'No remarks were submitted.'}
                    </p>
                    {mentorOutcomeApp.mentorRejectionRemark && mentorOutcomeApp.mentorNotes && (
                      <p className="mt-3 rounded-lg border border-danger/20 bg-danger-bg px-3 py-2 text-body-sm text-danger">
                        {mentorOutcomeApp.mentorRejectionRemark}
                      </p>
                    )}
                  </section>
                </div>

                <DialogFooter>
                  <Button variant="outline" onClick={() => setMentorOutcomeApp(null)}>Close</Button>
                  <Button variant="ghost" onClick={() => window.open(`/candidate360/${mentorOutcomeApp.id}?from=shortlisting-review`, '_blank')}>
                    View Candidate 360
                  </Button>
                  {mentorOutcomeApp.mentorDecision === 'Accepted' && (
                    <Button onClick={() => proceedToOffer(mentorOutcomeApp)}>
                      Proceed to offer <ArrowRight size={14} />
                    </Button>
                  )}
                  {(mentorOutcomeApp.mentorDecision === 'Rejected' || mentorOutcomeApp.mentorDecision === 'Referred') && (
                    <>
                      <Button variant="outline" onClick={() => openOutcomeAction(mentorOutcomeApp, 'refer')}>
                        <RotateCcw size={14} /> Refer
                      </Button>
                      <Button variant="danger" onClick={() => openOutcomeAction(mentorOutcomeApp, 'reject')}>
                        Reject application
                      </Button>
                    </>
                  )}
                </DialogFooter>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

      <Dialog open={outcomeDecision != null} onOpenChange={(open) => !open && setOutcomeDecision(null)}>
        <DialogContent className="max-w-lg">
          {outcomeDecision && (
            <>
              <DialogHeader>
                <DialogTitle>
                  {outcomeDecision.mode === 'refer' ? `Refer ${outcomeDecision.app.name}` : `Reject ${outcomeDecision.app.name}`}
                </DialogTitle>
                <DialogDescription>
                  {outcomeDecision.mode === 'refer'
                    ? 'Choose where the candidate should continue. The current project will be recorded as a previous attempt.'
                    : 'This removes the candidate from the active internship pipeline and notifies them.'}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                {outcomeDecision.mode === 'refer' && (
                  <div>
                    <label className="mb-1.5 block text-body-sm font-medium text-fg">Destination</label>
                    <Select value={outcomeDestination} onValueChange={(value) => setOutcomeDestination(value || 'talent-pool')}>
                      <SelectTrigger className="w-full">
                        <span className="truncate text-left text-body-sm">
                          {outcomeDestination === 'talent-pool'
                            ? 'Talent Pool — rematch later'
                            : projects.find(project => project.id === outcomeDestination)?.title || 'Select destination'}
                        </span>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="talent-pool">Talent Pool — rematch later</SelectItem>
                        {intakeProjects
                          .filter(project => project.id !== outcomeDecision.app.shortlistedFor && remainingPlacements(project) > 0)
                          .map(project => <SelectItem key={project.id} value={project.id}>{project.title}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div>
                  <label htmlFor="outcome-reason" className="mb-1.5 block text-body-sm font-medium text-fg">
                    Internal reason <span className="text-danger">*</span>
                  </label>
                  <textarea
                    id="outcome-reason"
                    value={outcomeReason}
                    onChange={(event) => { setOutcomeReason(event.target.value); setOutcomeError(''); }}
                    rows={4}
                    className={cn(
                      'w-full rounded-md border bg-surface px-3 py-2 text-body-sm text-fg outline-none focus:border-accent focus:ring-2 focus:ring-accent/20',
                      outcomeError ? 'border-danger' : 'border-border',
                    )}
                    placeholder={outcomeDecision.mode === 'refer'
                      ? 'Explain why another project or Talent Pool is more suitable.'
                      : 'Record the IO rationale for rejecting this application.'}
                  />
                  {outcomeError && <p className="mt-1 text-body-sm text-danger">{outcomeError}</p>}
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setOutcomeDecision(null)}>Cancel</Button>
                <Button variant={outcomeDecision.mode === 'reject' ? 'danger' : 'primary'} onClick={confirmOutcomeAction}>
                  {outcomeDecision.mode === 'refer' ? 'Confirm referral' : 'Confirm rejection'}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {aiPanelApp && (
        <>
          <div className="fixed inset-0 z-[150] bg-fg/20" onClick={() => setAiPanelApp(null)} />
          <div className="fixed top-0 right-0 bottom-0 z-[200] w-full max-w-md bg-surface border-l border-border shadow-2xl flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div>
                <p className="text-label-sm font-semibold text-fg-muted">AI summary</p>
                <h2 className="text-body-lg font-semibold text-fg">{aiPanelApp.name}</h2>
              </div>
              <button
                type="button"
                onClick={() => setAiPanelApp(null)}
                className="p-2 rounded-full hover:bg-bg-subtle text-fg-muted transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5">
              <AiSummaryCard app={aiPanelApp} engagements={getEngagements(aiPanelApp.email)} />
            </div>
            <div className="px-5 py-4 border-t border-border flex items-center justify-end gap-2">
              <Button variant="ghost" onClick={() => setAiPanelApp(null)}>Cancel</Button>
              <Button onClick={() => window.open(`/candidate360/${aiPanelApp.id}?from=shortlisting-review`, '_blank')}>
                View 360 Candidate
              </Button>
            </div>
          </div>
        </>
      )}

      <Toast message={toast} />
    </Shell>
  );
}

function CandidateList({
  rows,
  selected,
  onToggle,
  expanded,
  onToggleExpanded,
  activeTab,
  onView360,
  onAiSummary,
  onViewMentorOutcome,
  viewingProjectId,
  projectTitles,
  dispatchedIds,
  selectedProjectByApplicant,
  project,
  weights,
  onProceedToOffer,
  onRefer,
  onReject,
}: {
  rows: CandidateRow[];
  selected: Set<string>;
  onToggle: (appId: string) => void;
  expanded: boolean;
  onToggleExpanded: () => void;
  activeTab: TabKey;
  onView360: (app: Application) => void;
  onAiSummary: (app: Application) => void;
  onViewMentorOutcome: (app: Application) => void;
  viewingProjectId: string;
  projectTitles: Record<string, string>;
  dispatchedIds: Set<string>;
  selectedProjectByApplicant: Record<string, string>;
  project: ProjectEntry;
  weights: ScoringWeights;
  onProceedToOffer: (app: Application) => void;
  onRefer: (app: Application) => void;
  onReject: (app: Application) => void;
}) {
  const [menuApp, setMenuApp] = useState<Application | null>(null);
  const [menuPos, setMenuPos] = useState<{ top: number; right: number }>({ top: 0, right: 0 });
  const [expandedExplanationId, setExpandedExplanationId] = useState<string | null>(null);

  const selectedRows = rows.filter(r => selected.has(r.app.id) && !dispatchedIds.has(r.app.id));
  const eligibleRows = rows.filter(r => (!selected.has(r.app.id) || dispatchedIds.has(r.app.id)) && !r.app.talentPool);
  const talentPoolRows = rows.filter(r => !selected.has(r.app.id) && !dispatchedIds.has(r.app.id) && !!r.app.talentPool);

  function openMenu(e: React.MouseEvent, app: Application) {
    e.stopPropagation();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setMenuPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right });
    setMenuApp(app);
  }

  function candidateStatus(row: CandidateRow): { disabled: boolean; label?: string; variant?: 'muted' | 'warning' | 'success' } {
    const app = row.app;
    if (dispatchedIds.has(app.id)) {
      const title = app.shortlistedFor ? projectTitles[app.shortlistedFor] || 'another project' : 'another project';
      return {
        disabled: true,
        label: app.shortlistedFor === viewingProjectId ? `sent to ${title}` : `selected for ${title}`,
        variant: app.shortlistedFor === viewingProjectId ? 'success' : 'warning',
      };
    }
    const selectedProjectId = selectedProjectByApplicant[app.id];
    if (selectedProjectId && selectedProjectId !== viewingProjectId) {
      return {
        disabled: true,
        label: `selected for ${projectTitles[selectedProjectId] || 'another project'}`,
        variant: 'warning',
      };
    }
    if (app.shortlistedFor && app.shortlistedFor !== viewingProjectId) {
      const title = projectTitles[app.shortlistedFor] || 'another project';
      return { disabled: true, label: `selected for ${title}`, variant: 'warning' };
    }
    return { disabled: false, label: 'Available', variant: 'muted' };
  }

  return (
    <div className="space-y-4">
      {activeTab === 'shortlist' && (
        <>
          {selectedRows.length > 0 && (
            <div className="overflow-hidden rounded-lg border border-border bg-surface">
              <div className="border-b border-border bg-bg-subtle/50 px-4 py-3">
                <h3 className="text-[13px] font-semibold text-fg">Selected for dispatch</h3>
              </div>
              <div className="overflow-x-auto">
                <CandidateTableHeader />
                {selectedRows.map((row, i) => (
                  <CandidateRowCard
                    key={row.app.id}
                    row={row}
                    checked={true}
                    disabled={false}
                    onToggle={() => onToggle(row.app.id)}
                    statusLabel={undefined}
                    statusVariant={undefined}
                    onMenu={openMenu}
                    isLast={i === selectedRows.length - 1}
                    project={project}
                    weights={weights}
                    explanationOpen={expandedExplanationId === row.app.id}
                    onToggleExplanation={() => setExpandedExplanationId(current => current === row.app.id ? null : row.app.id)}
                    onAiSummary={() => onAiSummary(row.app)}
                  />
                ))}
              </div>
            </div>
          )}

          <div className="border border-border rounded-lg overflow-hidden bg-surface">
            <div className="px-4 py-3 bg-bg-subtle/50 border-b border-border flex items-center justify-between">
              <h3 className="text-[13px] font-semibold text-fg">Other eligible applicants</h3>
              <button
                type="button"
                onClick={onToggleExpanded}
                className="flex items-center gap-1 text-[12px] font-medium text-accent hover:underline"
                aria-label={expanded ? 'Collapse other eligible applicants' : 'Expand other eligible applicants'}
                aria-expanded={expanded}
              >
                <ChevronDown size={14} className={cn('transition-transform', expanded && 'rotate-180')} />
              </button>
            </div>
            {expanded && (
              <div className="overflow-x-auto">
                <CandidateTableHeader />
                {eligibleRows.map((row, i) => {
                  const status = candidateStatus(row);
                  return (
                    <CandidateRowCard
                      key={row.app.id}
                      row={row}
                      checked={selected.has(row.app.id)}
                      disabled={status.disabled}
                      onToggle={() => !status.disabled && onToggle(row.app.id)}
                      statusLabel={status.label}
                      statusVariant={status.variant}
                      onMenu={openMenu}
                      isLast={i === eligibleRows.length - 1}
                      project={project}
                      weights={weights}
                      explanationOpen={expandedExplanationId === row.app.id}
                      onToggleExplanation={() => setExpandedExplanationId(current => current === row.app.id ? null : row.app.id)}
                      onAiSummary={() => onAiSummary(row.app)}
                    />
                  );
                })}
              </div>
            )}
          </div>

          <section className="overflow-hidden rounded-lg border border-border bg-surface" aria-labelledby="talent-pool-heading">
            <div className="flex items-start justify-between gap-4 border-b border-border bg-bg-subtle/50 px-4 py-3">
              <div>
                <h3 id="talent-pool-heading" className="flex items-center gap-2 text-[13px] font-semibold text-fg">
                  <Users size={14} className="text-accent" /> Talent Pool ({talentPoolRows.length})
                </h3>
                <p className="mt-0.5 text-[11px] text-fg-muted">Applicants available for rematching to this project.</p>
              </div>
            </div>
            {talentPoolRows.length === 0 ? (
              <div className="px-4 py-5 text-center text-[12px] text-fg-muted">
                No Talent Pool applicants match this project.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <CandidateTableHeader />
                {talentPoolRows.map((row, index) => {
                  const status = candidateStatus(row);
                  const triedCurrentProject = row.app.triedProjects?.includes(viewingProjectId) ?? false;
                  const triedTitles = (row.app.triedProjects || []).map(id => projectTitles[id] || id);
                  const context = [
                    row.score != null ? `Recommended match ${row.score}%` : null,
                    triedTitles.length > 0 ? `Previous attempt: ${triedTitles.join(', ')}` : 'No previous project attempt',
                  ].filter(Boolean).join(' · ');
                  return (
                    <CandidateRowCard
                      key={row.app.id}
                      row={row}
                      checked={false}
                      disabled={status.disabled || triedCurrentProject}
                      onToggle={() => !status.disabled && !triedCurrentProject && onToggle(row.app.id)}
                      statusLabel={triedCurrentProject ? 'Previously tried this project' : 'Available to assign'}
                      statusVariant={triedCurrentProject ? 'warning' : 'success'}
                      contextLine={context}
                      onMenu={openMenu}
                      isLast={index === talentPoolRows.length - 1}
                      project={project}
                      weights={weights}
                      explanationOpen={expandedExplanationId === row.app.id}
                      onToggleExplanation={() => setExpandedExplanationId(current => current === row.app.id ? null : row.app.id)}
                      onAiSummary={() => onAiSummary(row.app)}
                    />
                  );
                })}
              </div>
            )}
          </section>
        </>
      )}

      {activeTab === 'interview-outcomes' && (
        <InterviewOutcomeList
          rows={rows}
          projectTitles={projectTitles}
          onViewConclusion={onViewMentorOutcome}
          onView360={onView360}
          onProceedToOffer={onProceedToOffer}
          onRefer={onRefer}
          onReject={onReject}
        />
      )}

      {activeTab !== 'shortlist' && activeTab !== 'interview-outcomes' && (
        <div className="overflow-x-auto rounded-lg border border-border bg-surface">
          <CandidateTableHeader />
          {rows.map((row, i) => (
            <CandidateRowCard
              key={row.app.id}
              row={row}
              checked={false}
              disabled={true}
              onToggle={() => {}}
              statusLabel={row.app.status}
              statusVariant="muted"
              onMenu={openMenu}
              hideCheckbox
              isLast={i === rows.length - 1}
            />
          ))}
        </div>
      )}

      {menuApp && (
        <RowDropdown pos={menuPos} onClose={() => setMenuApp(null)}>
          <div className="px-4 py-2 text-[12px] font-semibold text-fg-muted uppercase tracking-wider">Actions</div>
          <DropdownItem
            label="View 360 candidate"
            onClick={() => { onView360(menuApp); setMenuApp(null); }}
          />
        </RowDropdown>
      )}
    </div>
  );
}

function CandidateRowCard({
  row,
  checked,
  disabled,
  onToggle,
  statusLabel,
  statusVariant,
  onMenu,
  hideCheckbox,
  isLast,
  contextLine,
  project,
  weights,
  explanationOpen,
  onToggleExplanation,
  onAiSummary,
}: {
  row: CandidateRow;
  checked: boolean;
  disabled: boolean;
  onToggle: () => void;
  statusLabel?: string;
  statusVariant?: 'muted' | 'warning' | 'success';
  onMenu: (e: React.MouseEvent, app: Application) => void;
  hideCheckbox?: boolean;
  isLast?: boolean;
  contextLine?: string;
  project?: ProjectEntry;
  weights?: ScoringWeights;
  explanationOpen?: boolean;
  onToggleExplanation?: () => void;
  onAiSummary?: () => void;
}) {
  const app = row.app;
  const availabilityIssues = project ? availabilityWarnings(app, project) : [];
  const availabilityText = app.availability
    ? app.availability.from && app.availability.to
      ? `${app.availability.from} – ${app.availability.to}`
      : app.availability.weeks ? `${app.availability.weeks} weeks available` : 'Availability on file'
    : 'Availability not provided';
  const scoreParts = weights ? [
    { label: 'Discipline', value: row.sui?.disciplineScore, weight: weights.discipline },
    { label: 'Skills', value: row.sui?.skillsScore, weight: weights.skills },
    { label: 'Academic standing', value: row.sui?.standingScore, weight: weights.standing },
  ] : [];
  const evidence = [
    'Application',
    app.cvFileName ? 'CV' : null,
    app.transcriptFileName ? 'Transcript' : null,
    row.rank ? 'Project preferences' : null,
  ].filter((item): item is string => Boolean(item));
  const recommendationReasons = [
    row.projectPosition ? `Ranked #${row.projectPosition} of ${project ? 'eligible applicants' : 'this list'}` : null,
    row.disciplineMatch ? `${app.course} aligns with the required discipline` : null,
    row.skillsTotal > 0 ? `${row.skillsMatched} of ${row.skillsTotal} required skills matched` : null,
    row.rank ? `Candidate ranked this project preference #${row.rank}` : null,
  ].filter((item): item is string => Boolean(item));
  const watchouts = [
    !row.disciplineMatch ? 'Discipline alignment is below the recommended threshold.' : null,
    row.skillsTotal > 0 && row.skillsMatched < row.skillsTotal ? `${row.skillsTotal - row.skillsMatched} required skill${row.skillsTotal - row.skillsMatched !== 1 ? 's are' : ' is'} not evidenced.` : null,
    !app.availability ? 'Availability has not been provided.' : null,
    ...availabilityIssues,
  ].filter((item): item is string => Boolean(item));
  const explanationId = `recommendation-${app.id}`;

  return (
    <div
      className={cn(
        'group grid min-w-[780px] grid-cols-[28px_minmax(140px,1.45fr)_minmax(130px,1.25fr)_88px_82px_72px_105px_120px_28px] items-start bg-surface px-3 py-3 transition-colors',
        !isLast && 'border-b border-border',
        disabled ? 'opacity-70' : 'hover:bg-bg-subtle/30'
      )}
    >
      {!hideCheckbox ? (
        <div className="pt-0.5">
          <Checkbox checked={checked} disabled={disabled} onCheckedChange={onToggle} />
        </div>
      ) : <span aria-hidden="true" />}
      <div className="min-w-0 pr-2">
        <p className="truncate text-[12px] font-semibold text-fg">{app.name}</p>
        {statusLabel && (
          <p className={cn(
            'mt-1 text-[10px]',
            statusVariant === 'success' ? 'text-success'
              : statusVariant === 'warning' ? 'text-warning'
              : 'text-fg-muted'
          )}>
            {statusLabel}
          </p>
        )}
        {contextLine && <p className="mt-1 line-clamp-2 text-[10px] text-fg-subtle">{contextLine}</p>}
      </div>
      <div className="min-w-0 pr-2 text-[10px] text-fg-muted">
        <p className="truncate font-medium text-fg">GPA {app.gpa.toFixed(1)} · Year {app.year}</p>
        <p className="mt-1 line-clamp-2">{app.course}</p>
        <p className="mt-1 truncate text-fg-subtle">{app.school}</p>
      </div>
      <div className="pr-2 text-[10px] text-fg-muted">
        <p className="font-semibold text-fg">#{row.projectPosition ?? '—'}</p>
        <p className="mt-1">Preference #{row.rank ?? '—'}</p>
      </div>
      <div className="pr-2 text-[10px]">
        <p className="font-semibold tabular-nums text-accent">{row.score != null ? `${row.score}%` : '—'}</p>
        <p className={cn('mt-1', row.disciplineMatch ? 'text-success' : 'text-warning')}>
          {row.disciplineMatch ? 'Discipline matched' : 'Review discipline'}
        </p>
      </div>
      <div className="pr-2 text-[10px] text-fg-muted">
        <p className="font-semibold text-fg">{row.skillsTotal > 0 ? `${row.skillsMatched}/${row.skillsTotal}` : '—'}</p>
        <p className="mt-1">required skills</p>
      </div>
      <div className="pr-2 text-[10px]">
        <p className={cn(
          'font-medium',
          availabilityIssues.length > 0 || !app.availability ? 'text-warning' : 'text-success',
        )}>
          {availabilityIssues.length > 0 ? 'Conflict' : app.availability ? 'Matched' : 'Not provided'}
        </p>
        {app.availability?.weeks && <p className="mt-1 text-fg-muted">{app.availability.weeks} weeks</p>}
      </div>
      <div className="pr-2">
        {onToggleExplanation ? (
          <button
            type="button"
            onClick={onToggleExplanation}
            className="inline-flex items-center gap-1 text-left text-[10px] font-semibold text-accent hover:underline"
            aria-expanded={explanationOpen}
            aria-controls={explanationId}
          >
            <Sparkles size={12} className="shrink-0" /> Why recommended
            <ChevronDown size={12} className={cn('shrink-0 transition-transform', explanationOpen && 'rotate-180')} />
          </button>
        ) : <span className="text-[10px] text-fg-muted">—</span>}
      </div>

      <RowMenuButton onClick={(e) => onMenu(e, app)} alwaysVisible />

      {explanationOpen && (
        <div className="col-start-2 col-end-[-2] mt-3">
          <section
            id={explanationId}
            role="region"
            aria-label={`AI recommendation explanation for ${app.name}`}
            className="mt-3 rounded-lg border border-accent/20 bg-accent/5 p-3"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-[11px] font-semibold text-fg">Recommendation rationale</p>
                <p className="mt-0.5 text-[10px] text-fg-muted">
                  {app.summary || app.notes || row.sui?.reasoning || buildFallbackSummary(row) || 'Based on the available application and project data.'}
                </p>
              </div>
              {row.sui?.confidence && (
                <span className="text-[10px] font-medium text-fg-muted">Confidence: {row.sui.confidence}</span>
              )}
            </div>

            <div className="mt-3 grid gap-3 lg:grid-cols-2">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-fg-muted">Recommended because</p>
                <ul className="mt-1.5 space-y-1 text-[11px] text-fg">
                  {recommendationReasons.map(reason => <li key={reason} className="flex gap-2"><Check size={12} className="mt-0.5 shrink-0 text-success" />{reason}</li>)}
                </ul>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-fg-muted">Watch-outs</p>
                {watchouts.length > 0 ? (
                  <ul className="mt-1.5 space-y-1 text-[11px] text-fg">
                    {watchouts.map(item => <li key={item} className="flex gap-2"><AlertTriangle size={12} className="mt-0.5 shrink-0 text-warning" />{item}</li>)}
                  </ul>
                ) : <p className="mt-1.5 text-[11px] text-success">No material watch-outs identified.</p>}
              </div>
            </div>

            {scoreParts.length > 0 && (
              <div className="mt-3 border-t border-border pt-3">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-fg-muted">Score breakdown</p>
                <table className="mt-2 w-full border-collapse text-[10px]">
                  <thead>
                    <tr className="border-b border-border text-left text-fg-muted">
                      {scoreParts.map(part => <th key={part.label} className="pb-1.5 font-medium">{part.label}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="text-fg">
                      {scoreParts.map(part => (
                        <td key={part.label} className="pt-1.5 font-semibold tabular-nums">
                          {part.value == null ? 'N/A' : `${Math.round((part.value / 100) * part.weight)} / ${part.weight}`}
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            )}

            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3">
              <p className="text-[10px] text-fg-muted">Evidence: {evidence.join(' · ')} · {availabilityText}</p>
              {onAiSummary && (
                <button type="button" onClick={onAiSummary} className="text-[11px] font-semibold text-accent hover:underline">
                  View full AI summary
                </button>
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

function CandidateTableHeader() {
  return (
    <div className="grid min-w-[780px] grid-cols-[28px_minmax(140px,1.45fr)_minmax(130px,1.25fr)_88px_82px_72px_105px_120px_28px] border-b border-border bg-bg-subtle/30 px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-fg-muted">
      <span aria-hidden="true" />
      <span>Candidate</span>
      <span>Academic</span>
      <span>Ranking</span>
      <span>Match</span>
      <span>Skills</span>
      <span>Availability</span>
      <span>AI rationale</span>
      <span className="sr-only">Actions</span>
    </div>
  );
}

function InterviewOutcomeList({
  rows,
  projectTitles,
  onViewConclusion,
  onView360,
  onProceedToOffer,
  onRefer,
  onReject,
}: {
  rows: CandidateRow[];
  projectTitles: Record<string, string>;
  onViewConclusion: (app: Application) => void;
  onView360: (app: Application) => void;
  onProceedToOffer: (app: Application) => void;
  onRefer: (app: Application) => void;
  onReject: (app: Application) => void;
}) {
  if (rows.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-surface px-5 py-12 text-center">
        <ClipboardCheck size={24} className="mx-auto mb-3 text-fg-muted" />
        <p className="text-body-sm font-semibold text-fg">No mentor conclusions submitted</p>
        <p className="mt-1 text-body-sm text-fg-muted">Completed mentor assessments will appear here for IO review.</p>
      </div>
    );
  }

  return (
    <section className="overflow-hidden rounded-lg border border-border bg-surface" aria-labelledby="mentor-conclusions-heading">
      <div className="border-b border-border bg-bg-subtle/50 px-4 py-3">
        <h3 id="mentor-conclusions-heading" className="text-[13px] font-semibold text-fg">Mentor conclusions ({rows.length})</h3>
        <p className="mt-0.5 text-[11px] text-fg-muted">Submitted assessments are read-only. IO decisions are recorded separately.</p>
      </div>
      <div className="divide-y divide-border">
        {rows.map(row => {
          const app = row.app;
          const scores = app.mentorScores ? Object.values(app.mentorScores) : [];
          const average = scores.length > 0 ? scores.reduce((sum, score) => sum + score, 0) / scores.length : null;
          return (
            <article key={app.id} className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center">
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-semibold text-fg">{app.name}</p>
                <p className="mt-1 text-[11px] text-fg-muted">
                  Mentor feedback:{' '}
                  <span className={cn('font-semibold', mentorFeedbackTextClass(app.mentorDecision))}>
                    {mentorFeedbackLabel(app.mentorDecision)}
                  </span>
                </p>
                <p className="mt-1 text-[11px] text-fg-muted">
                  {app.shortlistedFor ? projectTitles[app.shortlistedFor] || app.shortlistedFor : 'Project not available'}
                  {average != null ? ` · Assessment ${average.toFixed(1)} / 10` : ''}
                </p>
                <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-fg-muted">
                  {app.mentorNotes || app.mentorRejectionRemark || 'No mentor remarks submitted.'}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Button variant="ghost" size="sm" onClick={() => onView360(app)}>Candidate 360</Button>
                <Button variant="outline" size="sm" onClick={() => onViewConclusion(app)}>
                  <Eye size={13} /> View conclusion
                </Button>
                {app.mentorDecision === 'Accepted' && (
                  <div className="flex flex-col items-end gap-0.5">
                    <Button size="sm" onClick={() => onProceedToOffer(app)}>
                      Proceed to offer <ArrowRight size={13} />
                    </Button>
                    {app.preOfferChecks !== 'completed' && (
                      <span className="text-[10px] font-medium text-warning">Pre-offer checks pending</span>
                    )}
                  </div>
                )}
                {(app.mentorDecision === 'Rejected' || app.mentorDecision === 'Referred') && (
                  <>
                    <Button variant="outline" size="sm" onClick={() => onRefer(app)}>
                      <RotateCcw size={13} /> Refer
                    </Button>
                    <Button variant="danger" size="sm" onClick={() => onReject(app)}>Reject</Button>
                  </>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function buildFallbackSummary(row: CandidateRow): string {
  const parts: string[] = [];
  if (row.rank) parts.push('Top-ranked for this project');
  if (row.skillsMatched > 0) parts.push(`${row.skillsMatched}/${row.skillsTotal} skills matched`);
  return parts.join(' · ');
}
