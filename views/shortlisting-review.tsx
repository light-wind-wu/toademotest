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
import AiSummaryPreview from '@/components/ui-legacy/ai-summary-preview';
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
  Info, Inbox, ChevronDown, Check, Send, X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { loadWeights, reweightScore, scoreSuitability } from '@/lib/scoring';
import type { ScoringWeights } from '@/lib/scoring';
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
import {
  getIoShortlistTask1Session,
  type IoShortlistTask1Session,
} from '@/lib/ut-scenarios';

const APP_KEY      = 'dsta_applications';
const APP_VER_KEY  = 'dsta_applications_seed_v';
const APP_SEED_VER = '31';

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
    if (ver === APP_SEED_VER && raw) return JSON.parse(raw) as Application[];
    return [];
  } catch { return []; }
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
  'interview-outcomes': new Set(['Interview Scheduled', 'Interview Completed']),
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
  disciplineMatch: boolean;
  skillsMatched: number;
  skillsTotal: number;
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
  const [expandedEligible, setExpandedEligible]   = useState<Set<string>>(new Set());
  const [reviewOpen, setReviewOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [dispatchSuccessOpen, setDispatchSuccessOpen] = useState(false);
  const [aiPanelApp, setAiPanelApp] = useState<Application | null>(null);
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

        rows.push({ app, score, sui, rank, disciplineMatch, skillsMatched, skillsTotal });
      }
      rows.sort((a, b) => (b.score ?? -1) - (a.score ?? -1));
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
      const ids = selectedByProject[project.id];
      if (!ids || ids.size === 0) continue;
      const newIds = Array.from(ids).filter(id => !dispatchedIds.has(id));
      if (newIds.length === 0) continue;
      total += newIds.length;
      projectsToDispatch.push(project.id);
    }
    return { total, projectCount: projectsToDispatch.length, projectIds: projectsToDispatch };
  }, [dispatchEnabled, filteredProjects, selectedByProject, dispatchedIds]);

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
    setSelectedByProject(prev => {
      const current = prev[projectId] || new Set<string>();
      if (current.size > 0) {
        return { ...prev, [projectId]: new Set<string>() };
      }
      const candidates = applicationsByProject[projectId] || [];
      const selected = new Set<string>();
      const recommended = Math.min(Math.max(project.slots + 1, 2), candidates.length);
      const selectedElsewhere = new Set<string>();
      for (const [pid, ids] of Object.entries(prev)) {
        if (pid !== projectId) ids.forEach(id => selectedElsewhere.add(id));
      }
      for (let i = 0; i < recommended; i++) {
        const candidate = candidates[i];
        if (!candidate) continue;
        if (dispatchedIds.has(candidate.app.id)) continue;
        if (selectedElsewhere.has(candidate.app.id)) continue;
        selected.add(candidate.app.id);
      }
      return { ...prev, [projectId]: selected };
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
    showToast(
      `${dispatchSummary.total} candidate${dispatchSummary.total !== 1 ? 's have' : ' has'} been sent across ${dispatchSummary.projectCount} project${dispatchSummary.projectCount !== 1 ? 's' : ''}. Projects with remaining seats stay open.`,
      'success',
      'Candidates dispatched'
    );
    setDispatchSuccessOpen(true);
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
          Select an intake to review system-ranked applicants by project and send approved shortlists to mentors.
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
            <Inbox size={24} className="text-fg-muted" />
          </div>
          <h2 className="text-body-lg font-semibold text-fg mb-1">Select a year to begin</h2>
          <p className="text-body-md text-fg-muted max-w-md">
            Projects will appear only after the year, intern category, and internship window have been selected.
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

          <div className="grid min-h-[calc(100vh-360px)] min-w-0 overflow-hidden rounded-xl border border-border bg-surface lg:grid-cols-[minmax(260px,360px)_minmax(0,1fr)]">
            <aside className="relative z-10 flex min-h-0 min-w-0 flex-col overflow-hidden border-b border-border bg-surface shadow-lg lg:overflow-visible lg:border-b-0 lg:border-r">
              <div className="px-3 py-3 border-b border-border bg-[#FDFCFA] flex items-center justify-between">
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
                  const isValid = isFull || isInRange;
                  const isAbove = !isFull && selectedCount > recommendedMax;
                  const statusTooltip = isFull
                    ? 'All placements filled'
                    : isInRange
                      ? `Ready to shortlist · ${selectedCount} applicant${selectedCount !== 1 ? 's' : ''} selected`
                      : isAbove
                        ? `Above recommended shortlist · ${selectedCount} selected`
                        : `Select ${recommendedMin}–${recommendedMax} applicants to continue`;
                  return (
                    <div
                      key={project.id}
                      className={cn(
                        'group relative box-border w-full min-w-0 border-b px-3 py-2.5 text-left transition-colors',
                        isViewing
                          ? 'z-10 border-y border-[#E7E4DD] bg-[#F4F2EC]'
                          : 'border-border bg-surface hover:bg-bg-muted'
                      )}
                    >
                      <div className="flex items-start gap-2">
                        <div className="pt-0.5">
                          <Checkbox
                            checked={!isFull && selectedCount > 0}
                            disabled={isFull}
                            onCheckedChange={() => toggleDispatchProject(project.id)}
                            className={cn(isFull && 'bg-bg-muted border-border opacity-60')}
                            aria-label={`Include ${project.title} in dispatch`}
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => setViewingProjectId(project.id)}
                          className="flex-1 text-left min-w-0 pr-3"
                        >
                          <p className={cn('text-[12px] font-semibold leading-snug text-fg truncate')}>
                            {project.title}
                          </p>
                          <p className="text-[10px] text-fg-muted mt-0.5">
                            {project.matched} of {project.slots} placement{project.slots !== 1 ? 's' : ''} filled
                            {!isFull && <> · recommended {recommendedMin}–{recommendedMax}</>}
                          </p>
                        </button>
                        <div className="pt-0.5 shrink-0">
                          <Tooltip>
                            <TooltipTrigger>
                              <span className="inline-flex cursor-help">
                                {isValid ? (
                                  <Check size={15} className="text-success" />
                                ) : (
                                  <Info size={15} className="text-warning" />
                                )}
                              </span>
                            </TooltipTrigger>
                            <TooltipContent side="right">
                              {statusTooltip}
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      </div>
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
                        {viewingProject.matched} of {viewingProject.slots} placement{viewingProject.slots !== 1 ? 's' : ''} filled
                        {remainingPlacements(viewingProject) > 0 && (() => {
                          const [min, max] = recommendedShortlist(
                            viewingProject,
                            (applicationsByProject[viewingProject.id] || []).length,
                          );
                          return <> · Recommended shortlist: {min}–{max}</>;
                        })()}
                      </p>
                      <p className="text-[10px] text-success font-semibold mt-0.5">
                        {remainingPlacements(viewingProject) === 0
                          ? 'All placements are filled'
                          : `${remainingPlacements(viewingProject)} placement${remainingPlacements(viewingProject) !== 1 ? 's' : ''} remaining`}
                      </p>
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
                        viewingProjectId={viewingProject.id}
                        projectTitles={projectTitles}
                        dispatchedIds={dispatchedIds}
                        selectedProjectByApplicant={selectedProjectByApplicant}
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

          <div className="sticky bottom-0 z-20 bg-surface/95 backdrop-blur-md border-t border-border py-2 px-7 min-h-[58px] flex items-center justify-between gap-4 shadow-[0_-8px_24px_rgba(16,24,40,.06)]">
            <p className="text-[12px] text-fg">
              {dispatchSummary && dispatchSummary.total > 0
                ? `${dispatchSummary.total} candidate${dispatchSummary.total !== 1 ? 's' : ''} in ${dispatchSummary.projectCount} project${dispatchSummary.projectCount !== 1 ? 's' : ''} ready for submission to respective mentors`
                : 'No projects selected for dispatch.'}
            </p>
            <Button
              disabled={!dispatchEnabled || !dispatchSummary || dispatchSummary.total === 0}
              onClick={openDispatchReview}
              className="h-[34px] text-[12px]"
            >
              <Check size={14} /> Dispatch selected applicants
            </Button>
          </div>
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
  viewingProjectId,
  projectTitles,
  dispatchedIds,
  selectedProjectByApplicant,
}: {
  rows: CandidateRow[];
  selected: Set<string>;
  onToggle: (appId: string) => void;
  expanded: boolean;
  onToggleExpanded: () => void;
  activeTab: TabKey;
  onView360: (app: Application) => void;
  onAiSummary: (app: Application) => void;
  viewingProjectId: string;
  projectTitles: Record<string, string>;
  dispatchedIds: Set<string>;
  selectedProjectByApplicant: Record<string, string>;
}) {
  const [menuApp, setMenuApp] = useState<Application | null>(null);
  const [menuPos, setMenuPos] = useState<{ top: number; right: number }>({ top: 0, right: 0 });

  const selectedRows = rows.filter(r => selected.has(r.app.id) && !dispatchedIds.has(r.app.id));
  const eligibleRows = rows.filter(r => !selected.has(r.app.id) || dispatchedIds.has(r.app.id));

  function openMenu(e: React.MouseEvent, app: Application) {
    e.stopPropagation();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setMenuPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right });
    setMenuApp(app);
  }

  function candidateStatus(row: CandidateRow): { disabled: boolean; label?: string; variant?: 'muted' | 'warning' | 'success' } {
    const app = row.app;
    if (selected.has(app.id)) {
      return { disabled: true, label: undefined };
    }
    const selectedProjectId = selectedProjectByApplicant[app.id];
    if (selectedProjectId && selectedProjectId !== viewingProjectId) {
      return {
        disabled: true,
        label: `selected for ${projectTitles[selectedProjectId] || 'another project'}`,
        variant: 'warning',
      };
    }
    if (dispatchedIds.has(app.id)) {
      const title = app.shortlistedFor ? projectTitles[app.shortlistedFor] || 'another project' : 'another project';
      return {
        disabled: true,
        label: app.shortlistedFor === viewingProjectId ? `sent to ${title}` : `selected for ${title}`,
        variant: app.shortlistedFor === viewingProjectId ? 'success' : 'warning',
      };
    }
    if (app.shortlistedFor && app.shortlistedFor !== viewingProjectId) {
      const title = projectTitles[app.shortlistedFor] || 'another project';
      return { disabled: true, label: `selected for ${title}`, variant: 'warning' };
    }
    return { disabled: false, label: 'not shortlisted', variant: 'muted' };
  }

  return (
    <div className="space-y-4">
      {activeTab === 'shortlist' && (
        <>
          <div className="border border-border rounded-lg overflow-hidden bg-surface">
            <div className="px-4 py-3 bg-bg-subtle/50 border-b border-border">
              <h3 className="text-[13px] font-semibold text-fg">Selected for dispatch</h3>
            </div>
            <div>
              {selectedRows.length === 0 ? (
                <p className="text-[12px] text-fg-muted px-4 py-3">No candidates selected yet.</p>
              ) : (
                selectedRows.map((row, i) => (
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
                  />
                ))
              )}
            </div>
          </div>

          <div className="border border-border rounded-lg overflow-hidden bg-surface">
            <div className="px-4 py-3 bg-bg-subtle/50 border-b border-border flex items-center justify-between">
              <h3 className="text-[13px] font-semibold text-fg">Other eligible applicants ({eligibleRows.length})</h3>
              <button
                type="button"
                onClick={onToggleExpanded}
                className="flex items-center gap-1 text-[12px] font-medium text-accent hover:underline"
              >
                <ChevronDown size={14} className={cn('transition-transform', expanded && 'rotate-180')} />
              </button>
            </div>
            {expanded && (
              <div>
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
                    />
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}

      {activeTab !== 'shortlist' && (
        <div className="border border-border rounded-lg overflow-hidden bg-surface">
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
            onClick={() => { setMenuApp(null); }}
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
}) {
  const app = row.app;

  return (
    <div
      className={cn(
        'group flex items-start gap-3 px-4 py-3 bg-surface transition-colors',
        !isLast && 'border-b border-border',
        disabled ? 'opacity-70' : 'hover:bg-bg-subtle/30'
      )}
    >
      {!hideCheckbox && (
        <div className="pt-0.5">
          <Checkbox checked={checked} disabled={disabled} onCheckedChange={onToggle} />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[12px] font-semibold text-fg">{app.name}</span>
          {statusLabel && (
            <span className={cn(
              'text-[10px]',
              statusVariant === 'success' ? 'text-success'
                : statusVariant === 'warning' ? 'text-warning'
                : 'text-fg-muted'
            )}>
              → {statusLabel}
            </span>
          )}
        </div>
        <div className="mt-0.5 text-[11px] text-fg-muted">
          <AiSummaryPreview
            app={app}
            disciplineMatch={row.disciplineMatch}
            skillsMatched={row.skillsMatched}
            skillsTotal={row.skillsTotal}
            rank={row.rank}
          />
        </div>
      </div>

      <RowMenuButton onClick={(e) => onMenu(e, app)} alwaysVisible />
    </div>
  );
}

function buildFallbackSummary(row: CandidateRow): string {
  const parts: string[] = [];
  if (row.rank) parts.push('Top-ranked for this project');
  if (row.skillsMatched > 0) parts.push(`${row.skillsMatched}/${row.skillsTotal} skills matched`);
  return parts.join(' · ');
}
