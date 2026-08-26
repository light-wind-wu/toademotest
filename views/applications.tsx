'use client';

import { useState, useMemo, useEffect, Fragment, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import Shell from '@/components/layout/shell';
import Button from '@/components/ui-legacy/button';
import Modal from '@/components/ui-legacy/modal';
import Slider from '@/components/ui-legacy/slider';
import SortTh from '@/components/ui-legacy/sort-th';
import { Toast, useToast } from '@/components/ui-legacy/toast';
import type { ActiveFilter } from '@/components/filter-panel';
import TableToolbar from '@/components/ui-legacy/table-toolbar';
import TabBar from '@/components/ui-legacy/tab-bar';
import {
  CheckCircle2, XCircle, Clock, UserCheck, UserX,
  ChevronRight, Info, AlertTriangle, Award,
  History, Briefcase, Check, X, CalendarClock, CalendarCheck, Mail,
  FileText, Star, Users, ExternalLink, User, SlidersHorizontal,
  Filter, ArrowUp, ArrowDown, ArrowUpDown, Send,
  LayoutList, Columns3, CalendarRange, RotateCcw,
} from 'lucide-react';
import { cn, exportToCSV } from '@/lib/utils';
import { addNotification } from '@/lib/notifications';
import ProgToggle from '@/components/ui-legacy/prog-toggle';
import { INTERN_CATEGORIES } from '@/lib/data';
import AiSparkleIcon from '@/components/ui-legacy/ai-sparkle-icon';
import DatePicker from '@/components/ui-legacy/date-picker';
import type {
  Application, ApplicationStatus, ProjectEntry,
  Programme, SuitabilityScore, CriteriaGroup, CriteriaRule,
  OfferLetterTemplate,
} from '@/lib/types';
import seedData from '@/data/applications.json';
import offerLetterSeed from '@/data/offer-letter-templates.json';
import { loadProjects, loadProgrammes } from '@/lib/storage';

/* ── Seed / localStorage ────────────────────────────────────────────── */
const APP_KEY      = 'dsta_applications';
const APP_VER_KEY  = 'dsta_applications_seed_v';
const APP_SEED_VER = '31';

/* Pre-decision applicants open the focused shortlisting page; everyone else goes
   straight to the full Candidate 360 deep-dive. */
function openApplicantHref(app: Application): string {
  return (app.status === 'Pending Review' || app.status === 'Auto-rejected')
    ? `/shortlist/${app.id}`
    : `/candidate360/${app.id}`;
}

function migrateApps(apps: Application[]): Application[] {
  return apps
    .filter(a => a.id !== 'APP-7100') // one-time cleanup of the removed docs-demo applicant
    .map(a => (a.status as string) === 'Start Date Requested' ? { ...a, status: 'Date Change Requested' as Application['status'] } : a);
}
function loadApps(): Application[] {
  try {
    const ver = localStorage.getItem(APP_VER_KEY);
    const s = localStorage.getItem(APP_KEY);
    if (ver === APP_SEED_VER && s) { /* version matches, fall through to existing load */ }
    else if (ver !== APP_SEED_VER) {
      // Version mismatch — merge seed records in without wiping test data
      const existing: Application[] = s ? migrateApps(JSON.parse(s)) : [];
      const existingIds = new Set(existing.map((a: Application) => a.id));
      const merged = [...existing, ...(seedData as Application[]).filter((a: Application) => !existingIds.has(a.id))];
      localStorage.setItem(APP_KEY, JSON.stringify(merged));
      localStorage.setItem(APP_VER_KEY, APP_SEED_VER);
      return merged;
    }
    const _s = s;
    if (!s) return seedData as Application[];
    const stored: Application[] = migrateApps(JSON.parse(s));
    // Merge in any new seed entries not already stored
    const storedIds = new Set(stored.map(a => a.id));
    const newFromSeed = (seedData as Application[]).filter(a => !storedIds.has(a.id));
    return newFromSeed.length > 0 ? [...stored, ...newFromSeed] : stored;
  } catch { return seedData as Application[]; }
}
function saveApps(apps: Application[]) {
  localStorage.setItem(APP_KEY, JSON.stringify(apps));
  localStorage.setItem(APP_VER_KEY, APP_SEED_VER);
}

function evalRule(rule: CriteriaRule, app: Application): boolean {
  const { type, operator, value } = rule;
  if (type === 'gpa') {
    // Institution scope (TOA-063): a scoped threshold only applies to applicants from
    // those schools (e.g. NUS/NTU/SUTD ≥ 4.0 vs SMU ≥ 3.4). Off-scope applicants pass
    // this rule and are governed by whichever GPA rule (if any) names their school.
    if (rule.institutions?.length
        && !rule.institutions.some(inst => app.school.toLowerCase().includes(inst.toLowerCase()))) {
      return true;
    }
    const t = parseFloat(value as string);
    if (Number.isNaN(t)) return true; // no threshold configured → don't block anyone
    // Accept both the rule-builder vocabulary ('at least'/'at most', from OPS.number)
    // and the hand-authored seed vocabulary ('>=' etc.). 'at least' is inclusive, so a
    // GPA exactly at the threshold passes (TOA-064).
    switch (operator) {
      case '>=':
      case 'at least': return app.gpa >= t;
      case '<=':
      case 'at most':  return app.gpa <= t;
      case '>':        return app.gpa >  t;
      case '<':        return app.gpa <  t;
      default:         return app.gpa >= t; // "Minimum GPA" rule defaults to inclusive lower-bound
    }
  }
  if (type === 'institution') {
    const vals = (Array.isArray(value) ? value : [value]) as string[];
    return vals.some(v => app.school.toLowerCase().includes(v.toLowerCase()));
  }
  if (type === 'major' || type === 'education') {
    const vals = (Array.isArray(value) ? value : [value]) as string[];
    return vals.some(v => app.course.toLowerCase().includes(v.toLowerCase()));
  }
  if (type === 'citizenship') {
    // Mandatory gate (AUG-141). Only enforced when the applicant's citizenship is
    // known; unknown → benefit of the doubt (no regression on records without it).
    if (!app.citizenship) return true;
    const vals = (Array.isArray(value) ? value : [value]) as string[];
    const inList = vals.some(v => v.toLowerCase() === app.citizenship!.toLowerCase());
    return operator === 'is not' ? !inList : inList;
  }
  // a-level, IB subject rules — not yet on the Application → benefit of doubt
  return true;
}

function describeRule(rule: CriteriaRule): string {
  const vals = (Array.isArray(rule.value) ? rule.value : [rule.value]) as string[];
  switch (rule.type) {
    case 'gpa':
      return `Minimum GPA ${rule.operator} ${rule.value}`
        + (rule.institutions?.length ? ` (for ${rule.institutions.join(' / ')})` : '');
    case 'institution':
      return `Institution: ${vals.join(' / ')}`;
    case 'major':
      return `Field of study: ${vals.join(' / ')}`;
    case 'education':
      return `Qualification: ${vals.join(' / ')}`;
    case 'citizenship':
      return `Citizenship: ${vals.join(' or ')}`;
    case 'a-level':
      return `A-Level subject: ${vals.join(', ')}${rule.gradeValue ? ` (min grade ${rule.gradeValue})` : ''}`;
    case 'IB':
      return `IB subject: ${vals.join(', ')}${rule.gradeValue ? ` (min score ${rule.gradeValue})` : ''}`;
    default:
      return `${rule.type.replace(/_/g, ' ')}`;
  }
}

function evalGroup(group: CriteriaGroup, app: Application): { pass: boolean; labels: string[] } {
  if (group.matchType === 'ALL') {
    const labels: string[] = [];
    for (const rule of group.rules) {
      if (!evalRule(rule, app))
        labels.push(describeRule(rule));
    }
    return { pass: labels.length === 0, labels };
  }
  // matchType === 'ANY' — at least one pathway must fully pass
  if (group.pathways.length === 0) return { pass: true, labels: [] };
  const anyPass = group.pathways.some(pw => pw.rules.every(r => evalRule(r, app)));
  if (anyPass) return { pass: true, labels: [] };
  const pathwaySummary = group.pathways
    .map(pw => pw.rules.map(r => describeRule(r)).join(' + '))
    .join('; or ');
  return { pass: false, labels: [`Did not meet any qualifying pathway: ${pathwaySummary}`] };
}

import {
  scoreSuitability, reweightScore, reweightedTopScore,
  calcSkillsScore, calcDisciplineScore,
  loadWeights, saveWeights, DEFAULT_WEIGHTS,
  type ScoringWeights,
} from '@/lib/scoring';
import { SuitabilityBadge } from '@/components/ui-legacy/suitability-badge';

// TOA-072 — auto-rejection is withheld for a configured number of days after the
// application date (lets the IO batch-review grey cases before applicants are told).
function loadAutoRejectDelayDays(): number {
  try {
    const s = JSON.parse(localStorage.getItem('dsta_admin_settings') || '{}');
    const n = Number(s.autoRejectDelayDays);
    return Number.isFinite(n) && n >= 0 ? n : 3;
  } catch { return 3; }
}
function addDaysIso(iso: string, days: number): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

function screenPending(
  apps: Application[],
  programmes: Programme[],
  projects: ProjectEntry[],
  delayDays: number,
): Application[] {
  if (!apps.some(a => a.status === 'Pending Screening')) return apps;

  return apps.map(app => {
    if (app.status !== 'Pending Screening') return app;
    const prog = programmes.find(p => p.id === app.programmeId);
    const reqs = prog?.requirements ?? [];
    // AUG-102 — reserved for future pre-screened programme types (was Tech UP, now retired).
    const isTechUp = false;
    const failedCriteria: string[] = [];
    let anyFail = false;
    if (!isTechUp) {
      for (const group of reqs) {
        const { pass, labels } = evalGroup(group, app);
        if (!pass) {
          failedCriteria.push(...labels);
          anyFail = true;
        }
      }
    }
    // Every configured criterion is an eligibility filter. Failing one makes the applicant
    // ineligible — EXCEPT for an applicant on provisional results (TOA-053), whose academic
    // shortfall is conditional and routed to IO review rather than auto-rejected. Mandatory
    // gates (citizenship) still hard-fail even on provisional results.
    const hasMandatoryFail = failedCriteria.some(l => /^Citizenship/i.test(l));
    const conditional = anyFail && !!app.provisionalResults && !hasMandatoryFail;
    const eligibilityPass = !anyFail;
    // Hard auto-reject. The rejection email is NOT sent now — it is held until
    // appliedDate + delay (released by the sweep below).
    if (anyFail && !conditional) {
      return { ...app, status: 'Auto-rejected', eligibilityPass, failedCriteria, suitabilityScores: [],
        rejectionEmailSent: false, rejectionEmailSentDate: undefined,
        rejectionDueDate: addDaysIso(app.appliedDate, delayDays) };
    }
    // Pass, or a provisional conditional — score and route to review.
    const newStatus: ApplicationStatus = 'Pending Review';
    const progProjects = projects.filter(p => p.programme === app.programmeId && (p.status === 'open' || p.status === 'in-progress'));
    const scoredApp    = { ...app, status: newStatus, eligibilityPass };
    const suitabilityScores: SuitabilityScore[] = progProjects.length > 0
      ? progProjects.map(proj => scoreSuitability(scoredApp, proj))
      : app.projectRankings.map(pid => {
          const proj = projects.find(p => p.id === pid);
          if (!proj) return { projectId: pid, projectTitle: pid, score: 50, reasoning: 'Project data unavailable.' };
          return scoreSuitability(scoredApp, proj);
        });
    return { ...app, status: newStatus, eligibilityPass, failedCriteria, suitabilityScores };
  });
}

/* TOA-072 — release any held auto-rejections whose due date has arrived. Returns the
   updated list plus the apps that were just released (so the caller can notify them). */
function releaseDueRejections(apps: Application[]): { apps: Application[]; released: Application[] } {
  const today = new Date().toISOString().split('T')[0];
  const released: Application[] = [];
  const next = apps.map(app => {
    if (app.status === 'Auto-rejected' && app.rejectionEmailSent !== true
        && app.rejectionDueDate && app.rejectionDueDate <= today) {
      const sent = { ...app, rejectionEmailSent: true, rejectionEmailSentDate: today };
      released.push(sent);
      return sent;
    }
    return app;
  });
  return { apps: released.length ? next : apps, released };
}

/* Recompute suitability scores for all reviewed apps whenever new programme
   projects appear that weren't scored at initial screening time. */
function refreshScores(
  apps: Application[],
  projects: ProjectEntry[],
): Application[] {
  return apps.map(app => {
    if (app.status !== 'Pending Review') return app;
    const progProjects = projects.filter(
      p => p.programme === app.programmeId && (p.status === 'open' || p.status === 'in-progress')
    );
    // Defensive: a malformed record missing suitabilityScores must not crash the whole
    // view — treat it as unscored and recompute rather than throwing on .length.
    const scored = app.suitabilityScores ?? [];
    // Only recompute if there are more project slots available than currently scored
    if (progProjects.length <= scored.length) return app.suitabilityScores ? app : { ...app, suitabilityScores: scored };
    return { ...app, suitabilityScores: progProjects.map(proj => scoreSuitability(app, proj)) };
  });
}

/* ── Status config ──────────────────────────────────────────────────── */
const STATUS_CONFIG: Record<ApplicationStatus, { label: string; color: string; dot: string; icon: typeof CheckCircle2 }> = {
  'Pending Screening':   { label: 'Pending Screening',   color: 'bg-bg-muted text-fg-muted border-border',        dot: 'bg-fg-muted', icon: Clock          },
  'Auto-rejected':       { label: 'Auto-rejected',       color: 'bg-danger-bg text-danger border-danger/20',       dot: 'bg-danger',   icon: XCircle        },
  'Pending Review':        { label: 'Pending Review',        color: 'bg-warning-bg text-warning border-warning/20',    dot: 'bg-warning',  icon: Clock          },
  'Shortlisted for Interview':         { label: 'Shortlisted for Interview',         color: 'bg-accent/10 text-accent border-accent/20',       dot: 'bg-accent',   icon: UserCheck      },
  'Rejected':            { label: 'Rejected',            color: 'bg-danger-bg text-danger border-danger/20',       dot: 'bg-danger',   icon: UserX          },
  'Interview Scheduled': { label: 'Interview Scheduled', color: 'bg-success-bg text-success border-success/20',    dot: 'bg-success',  icon: CalendarClock  },
  'Interview Completed': { label: 'Interview Completed', color: 'bg-success-bg text-success border-success/20',    dot: 'bg-success',  icon: CalendarCheck  },
  'Offer Extended':        { label: 'Offer Extended',        color: 'bg-accent/10 text-accent border-accent/20',       dot: 'bg-accent',   icon: Mail           },
  'Offer Accepted':        { label: 'Offer Accepted',        color: 'bg-success-bg text-success border-success/20',    dot: 'bg-success',  icon: CheckCircle2   },
  'Offer Declined':        { label: 'Offer Declined',        color: 'bg-danger-bg text-danger border-danger/20',       dot: 'bg-danger',   icon: XCircle        },
  'Date Change Requested':  { label: 'Date Change Requested',  color: 'bg-warning-bg text-warning border-warning/20',    dot: 'bg-warning',  icon: Clock          },
  'Active Intern':         { label: 'Active Intern',         color: 'bg-success-bg text-success border-success/20',    dot: 'bg-success',  icon: CheckCircle2   },
  'Internship Completed':  { label: 'Internship Completed',  color: 'bg-bg-muted text-fg-muted border-border',         dot: 'bg-fg-muted', icon: CheckCircle2   },
  'Withdrawn':             { label: 'Withdrawn',             color: 'bg-danger-bg text-danger border-danger/20',       dot: 'bg-danger',   icon: UserX          },
  'Terminated':            { label: 'Terminated',            color: 'bg-danger-bg text-danger border-danger/20',       dot: 'bg-danger',   icon: UserX          },
  'Accepted':              { label: 'Accepted',              color: 'bg-success-bg text-success border-success/20',    dot: 'bg-success',  icon: CheckCircle2   },
};

function StatusBadge({ status }: { status: ApplicationStatus }) {
  const cfg = STATUS_CONFIG[status];
  return (
    <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[13px] font-semibold border whitespace-nowrap', cfg.color)}>
      <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', cfg.dot)} />
      {cfg.label}
    </span>
  );
}

function MentorDecisionBadge({ decision }: { decision: string | null | undefined }) {
  if (decision === 'Accepted') return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[13px] font-semibold bg-success-bg text-success border border-success/20 whitespace-nowrap">
      <CheckCircle2 size={10} />Recommended
    </span>
  );
  if (decision === 'Rejected') return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[13px] font-semibold bg-danger-bg text-danger border border-danger/20 whitespace-nowrap">
      <XCircle size={10} />Not Recommended
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[13px] font-semibold bg-bg-subtle text-fg-muted border border-border whitespace-nowrap">
      <Clock size={10} />Awaiting
    </span>
  );
}

interface ScoreBreakdown {
  course:            string;
  projectDiscipline: string;
  projectSkills:     string[];
  disciplineScore:   number;
  skillsScore:       number;
  weights:           ScoringWeights;
}

function ScoreBadge({ score, breakdown }: { score: number; breakdown?: ScoreBreakdown }) {
  const color =
    score >= 85 ? 'bg-success-bg text-success border-success/20' :
    score >= 70 ? 'bg-accent/10 text-accent border-accent/20' :
    score >= 55 ? 'bg-warning-bg text-warning border-warning/20' :
                  'bg-danger-bg text-danger border-danger/20';
  const ref = useRef<HTMLSpanElement>(null);
  const [tip, setTip] = useState<{ top: number; left: number; badgeTop: number } | null>(null);

  function onEnter() {
    if (!breakdown || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    const left = Math.max(8, Math.min(r.right - 272, window.innerWidth - 272 - 8));
    setTip({ top: r.bottom + 6, left, badgeTop: r.top });
  }

  const popover = tip && breakdown ? (
    <ScorePopover breakdown={breakdown} pos={tip} onClose={() => setTip(null)} />
  ) : null;

  return (
    <>
      <span
        ref={ref}
        onMouseEnter={onEnter}
        onMouseLeave={() => setTip(null)}
        className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[13px] font-bold border cursor-default', color)}
      >
        <AiSparkleIcon size={10} />
        {score}
      </span>
      {typeof window !== 'undefined' && popover && createPortal(popover, document.body)}
    </>
  );
}

function ScorePopover({
  breakdown, pos, onClose,
}: {
  breakdown: ScoreBreakdown;
  pos: { top: number; left: number; badgeTop: number };
  onClose: () => void;
}) {
  const { course, projectDiscipline, projectSkills, disciplineScore, skillsScore, weights } = breakdown;
  const { matched } = calcSkillsScore(course, projectSkills);
  const matchedSet = new Set(matched.map(s => s.toLowerCase()));
  const divRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [adjustedTop, setAdjustedTop] = useState(pos.top);

  useEffect(() => {
    if (!divRef.current) return;
    const rect = divRef.current.getBoundingClientRect();
    const vh = window.innerHeight;
    if (rect.bottom > vh - 8) {
      setAdjustedTop(Math.max(8, pos.badgeTop - rect.height - 6));
    }
    setVisible(true);
  }, []);

  const discTier =
    disciplineScore >= 85 ? { label: 'Strong match',   color: 'text-success' } :
    disciplineScore >= 68 ? { label: 'Good match',     color: 'text-accent'  } :
    disciplineScore >= 42 ? { label: 'Partial match',  color: 'text-warning' } :
                            { label: 'Weak match',     color: 'text-danger'  };

  const totalScore = Math.min(99, Math.max(1, Math.round(
    (weights.discipline / 100) * disciplineScore + (weights.skills / 100) * skillsScore
  )));

  return (
    <div
      ref={divRef}
      onMouseEnter={() => {}}
      onMouseLeave={onClose}
      style={{ position: 'fixed', top: adjustedTop, left: pos.left, zIndex: 9999, width: 272, opacity: visible ? 1 : 0, transition: 'opacity 0.08s' }}
      className="bg-surface border border-border rounded-xl shadow-xl p-4 pointer-events-auto"
    >
      <div className="flex items-center justify-between mb-3">
        <p className="text-label-sm font-bold text-fg flex items-center gap-1.5">
          <AiSparkleIcon size={11} /> Score Breakdown
        </p>
        <span className={cn(
          'text-[13px] font-bold px-2 py-0.5 rounded-lg border',
          totalScore >= 85 ? 'bg-success-bg text-success border-success/20' :
          totalScore >= 70 ? 'bg-accent/10 text-accent border-accent/20' :
          totalScore >= 55 ? 'bg-warning-bg text-warning border-warning/20' :
                             'bg-danger-bg text-danger border-danger/20'
        )}>{totalScore}</span>
      </div>

      {/* Discipline */}
      <div className="mb-3 pb-3 border-b border-border">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[12px] font-bold uppercase tracking-widest text-fg-subtle">
            Discipline · {weights.discipline}%
          </span>
          <span className="text-[13px] font-bold text-fg">{disciplineScore}</span>
        </div>
        <p className="text-body-sm text-fg">{course || '—'}</p>
        {projectDiscipline && (
          <p className="text-[13px] text-fg-muted mt-0.5">Required: {projectDiscipline}</p>
        )}
        <span className={cn('text-[13px] font-semibold mt-1 inline-block', discTier.color)}>
          {discTier.label}
        </span>
      </div>

      {/* Skills */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-[12px] font-bold uppercase tracking-widest text-fg-subtle">
            Skills · {weights.skills}%
          </span>
          <span className="text-[13px] font-bold text-fg">{skillsScore}</span>
        </div>
        {projectSkills.length === 0 ? (
          <p className="text-[13px] text-fg-muted">No specific skills required by this project.</p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {projectSkills.map(skill => {
              const sl  = skill.toLowerCase();
              const hit = matchedSet.has(sl) || matched.some(m => sl.includes(m) || m.includes(sl));
              return (
                <span
                  key={skill}
                  className={cn(
                    'inline-flex items-center gap-1 text-[12px] font-semibold px-2 py-0.5 rounded-full border',
                    hit
                      ? 'bg-success-bg text-success border-success/20'
                      : 'bg-bg-subtle text-fg-muted border-border'
                  )}
                >
                  {hit ? '✓' : '✗'} {skill}
                </span>
              );
            })}
          </div>
        )}
        <p className="text-[12px] text-fg-subtle mt-2 leading-snug">
          Assessed from applicant&apos;s course of study and application materials.
        </p>
      </div>
    </div>
  );
}

/* ── AI Highlights ──────────────────────────────────────────────────── */
const LEADERSHIP_KEYWORDS = [
  'president', 'captain', 'chairperson', 'vice-president', 'head of',
  'director', 'secretary', 'treasurer', 'committee', 'co-founder', 'founder',
];

type Highlight = { type: 'dsta' | 'repeat' | 'leadership' | 'achievement'; text: string };

function buildHighlights(app: Application, allApps: Application[]): Highlight[] {
  const out: Highlight[] = [];
  if (app.previousDSTA)
    out.push({ type: 'dsta', text: app.previousDSTADetails ?? 'Has previous DSTA engagement.' });
  const repeats = allApps.filter(a => a.email === app.email && a.id !== app.id).length;
  if (repeats > 0)
    out.push({ type: 'repeat', text: `Repeat applicant — ${repeats} other application${repeats !== 1 ? 's' : ''} on record.` });
  for (const ach of app.achievements) {
    const lower = ach.toLowerCase();
    out.push({
      type: LEADERSHIP_KEYWORDS.some(kw => lower.includes(kw)) ? 'leadership' : 'achievement',
      text: ach,
    });
  }
  return out;
}

const POST_SHORTLIST = new Set<ApplicationStatus>([
  'Shortlisted for Interview', 'Interview Scheduled', 'Interview Completed',
  'Offer Extended', 'Accepted', 'Rejected',
]);

/* ── Panel sub-components ───────────────────────────────────────────── */
function PanelSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-5">
      <p className="text-[12px] font-black text-fg-subtle uppercase tracking-widest mb-2">{title}</p>
      {children}
    </div>
  );
}

function ProjectVacancyCard({
  project, pipelineCount, reservedCount, score, breakdown, selected, onSelect,
}: {
  project: ProjectEntry;
  pipelineCount: number;
  reservedCount: number;
  score: number;
  breakdown?: ScoreBreakdown;
  selected: boolean;
  onSelect: (id: string) => void;
}) {
  const remaining = project.slots - project.matched;
  const open      = Math.max(0, remaining - reservedCount);
  const full      = remaining <= 0;
  return (
    <button
      type="button"
      disabled={full}
      onClick={() => onSelect(project.id)}
      className={cn(
        'w-full text-left rounded-xl border p-3 transition-all',
        full      ? 'opacity-50 cursor-not-allowed border-border' :
        selected  ? 'border-accent bg-accent/5 cursor-pointer' :
                    'border-border hover:border-accent/40 hover:bg-bg-subtle cursor-pointer',
      )}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <p className="text-body-sm font-semibold text-fg leading-snug">{project.title}</p>
        <ScoreBadge score={score} breakdown={breakdown} />
      </div>
      <div className="flex flex-wrap gap-1.5 mb-2">
        <span className={cn(
          'inline-flex items-center px-2 py-0.5 rounded-full text-[13px] font-semibold border',
          full         ? 'bg-bg-muted text-fg-muted border-border' :
          open === 0   ? 'bg-warning-bg text-warning border-warning/20' :
                         'bg-success-bg text-success border-success/20',
        )}>
          {full ? 'Closed' : `${open} open`}
        </span>
        {reservedCount > 0 && (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[13px] font-semibold bg-accent/10 text-accent border border-accent/20">
            {reservedCount} offer{reservedCount !== 1 ? 's' : ''} sent
          </span>
        )}
        {pipelineCount > 0 && (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[13px] font-semibold bg-bg-muted text-fg-muted border border-border">
            {pipelineCount} interviewing
          </span>
        )}
      </div>
      <div className="h-1.5 w-full bg-bg-muted rounded-full overflow-hidden">
        <div className="h-full bg-accent rounded-full" style={{ width: `${Math.min(100, (project.matched / project.slots) * 100)}%` }} />
      </div>
      <p className="text-[12px] text-fg-muted mt-1">{project.matched}/{project.slots} slots filled</p>
    </button>
  );
}


type TabFilter = 'All' | 'Eligible' | 'Ineligible' | 'In Progress' | 'Closed' | ApplicationStatus;
type ApplicationsView = 'list' | 'board';

const BOARD_COLUMNS: {
  key: string;
  label: string;
  description: string;
  statuses: ApplicationStatus[];
  accent: string;
}[] = [
  { key: 'screening', label: 'Screening', description: 'Eligibility checks', statuses: ['Pending Screening', 'Auto-rejected'], accent: 'bg-fg-muted' },
  { key: 'review', label: 'Review', description: 'Ready for shortlisting', statuses: ['Pending Review'], accent: 'bg-warning' },
  { key: 'interview', label: 'Interview', description: 'Shortlist and outcome', statuses: ['Shortlisted for Interview', 'Interview Scheduled', 'Interview Completed'], accent: 'bg-accent' },
  { key: 'offer', label: 'Offer', description: 'Checks and response', statuses: ['Offer Extended', 'Date Change Requested'], accent: 'bg-success' },
  { key: 'closed', label: 'Closed', description: 'Completed or exited', statuses: ['Accepted', 'Rejected', 'Offer Accepted', 'Offer Declined', 'Active Intern', 'Internship Completed', 'Withdrawn', 'Terminated'], accent: 'bg-fg-subtle' },
];

/* ── Offer letter helpers (for bulk offer) ──────────────────────────── */
const OL_KEY      = 'dsta_offer_letter_templates';
const OL_VER_KEY  = 'dsta_offer_letter_templates_seed_v';
const OL_SEED_VER = '4';

function loadOfferTemplates(): OfferLetterTemplate[] {
  try {
    const ver = localStorage.getItem(OL_VER_KEY);
    if (ver !== OL_SEED_VER) {
      const f = offerLetterSeed as OfferLetterTemplate[];
      localStorage.setItem(OL_KEY, JSON.stringify(f));
      localStorage.setItem(OL_VER_KEY, OL_SEED_VER);
      return f;
    }
    const raw = localStorage.getItem(OL_KEY);
    return raw ? JSON.parse(raw) : (offerLetterSeed as OfferLetterTemplate[]);
  } catch { return offerLetterSeed as OfferLetterTemplate[]; }
}

function substituteOfferVars(text: string, vars: Record<string, string>): string {
  return Object.entries(vars).reduce(
    (t, [k, v]) => t.replace(new RegExp(`{{${k}}}`, 'g'), v), text
  );
}

function buildOfferVars(app: Application, project: ProjectEntry | null, deadline: string): Record<string, string> {
  const stipend = app.year <= 2 ? '$1,200 per month' : app.year === 3 ? '$1,500 per month' : '$1,800 per month';
  const fmt = (d: string) => new Date(d).toLocaleDateString('en-SG', { day: 'numeric', month: 'long', year: 'numeric' });
  return {
    applicant_name:      app.name,
    project_title:       project?.title              ?? '',
    mentor_name:         project?.mentor             ?? '',
    programme_name:      app.programmeName,
    internship_duration: project?.internshipDuration ?? '',
    working_location:    project?.workingLocation    ?? '',
    portal_link:         'https://talent.dsta.gov.sg',
    monthly_stipend:     stipend,
    offer_date:          fmt(new Date().toISOString().split('T')[0]),
    offer_deadline:      deadline ? fmt(deadline) : '[TBD]',
  };
}

/* ── Column filter dropdown ─────────────────────────────────────────── */
function ColFilterDropdown({
  kind, options, current, onApply, onClose, pos,
}: {
  kind: 'text' | 'multiselect';
  options?: string[];
  current: string | string[];
  onApply: (v: string | string[]) => void;
  onClose: () => void;
  pos: { top: number; left: number };
}) {
  const divRef = useRef<HTMLDivElement>(null);
  const [draft, setDraft] = useState<string | string[]>(current);
  const [query, setQuery] = useState('');

  // Searchable checkbox list (#3) — surface a filter input only when the list is long.
  const showSearch    = kind === 'multiselect' && (options?.length ?? 0) > 8;
  const shownOptions  = showSearch
    ? (options ?? []).filter(o => o.toLowerCase().includes(query.toLowerCase()))
    : (options ?? []);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (divRef.current && !divRef.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  const content = (
    <div
      ref={divRef}
      style={{ position: 'fixed', top: pos.top, left: pos.left, zIndex: 9999, minWidth: 210 }}
      className="bg-surface border border-border rounded-xl shadow-xl overflow-hidden"
      onClick={e => e.stopPropagation()}
    >
      <div className="p-3">
        {kind === 'text' ? (
          <input
            autoFocus
            value={draft as string}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') { onApply(draft); onClose(); }
              if (e.key === 'Escape') onClose();
            }}
            placeholder="Filter by name…"
            className="input text-body-sm w-full"
          />
        ) : (
          <>
            {showSearch && (
              <input
                autoFocus
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={e => { if (e.key === 'Escape') onClose(); }}
                placeholder="Search…"
                aria-label="Filter options"
                className="input text-body-sm w-full mb-2"
              />
            )}
            <div className="max-h-52 overflow-y-auto space-y-0.5">
              {shownOptions.length === 0 ? (
                <p className="px-2 py-3 text-body-sm text-fg-muted text-center">No matches</p>
              ) : shownOptions.map(opt => (
                <label key={opt} className="flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer hover:bg-bg-subtle">
                  <input
                    type="checkbox"
                    checked={(draft as string[]).includes(opt)}
                    onChange={() => {
                      const arr = draft as string[];
                      setDraft(arr.includes(opt) ? arr.filter(x => x !== opt) : [...arr, opt]);
                    }}
                    className="w-4 h-4 accent-accent rounded border-border shrink-0"
                  />
                  <span className="text-body-sm text-fg">{opt}</span>
                </label>
              ))}
            </div>
          </>
        )}
      </div>
      <div className="flex items-center justify-between px-3 py-2 border-t border-border bg-bg-subtle">
        <button
          onClick={() => { onApply(kind === 'text' ? '' : []); onClose(); }}
          className="text-body-sm text-fg-muted hover:text-fg transition-colors"
        >
          Clear
        </button>
        <button
          onClick={() => { onApply(draft); onClose(); }}
          className="text-body-sm font-semibold bg-accent text-white px-3 py-1 rounded-lg hover:bg-accent/90 transition-colors"
        >
          Apply
        </button>
      </div>
    </div>
  );

  if (typeof window === 'undefined') return null;
  return createPortal(content, document.body);
}

/* ── Column definitions ─────────────────────────────────────────────── */
const COL_DEFS = [
  { key: 'name',           label: 'Name' },
  { key: 'firstChoice',    label: 'First-Choice Project' },
  { key: 'eligible',       label: 'Programme Eligibility' },
  { key: 'status',         label: 'Status' },
  { key: 'preOfferChecks', label: 'Pre-offer Checks' },
  { key: 'appliedDate',    label: 'Applied Date' },
] as const;
type ColKey = typeof COL_DEFS[number]['key'];

/* ── Main page ──────────────────────────────────────────────────────── */
export default function ApplicationsPage() {
  const [apps, setApps]         = useState<Application[]>([]);
  const [projects, setProjects] = useState<ProjectEntry[]>([]);
  // `activeProg` holds the selected intern category (or 'all') — IOs work by intern category.
  const [activeProg, setActiveProgLocal] = useState<string>(() => {
    if (typeof window === 'undefined') return 'all';
    try {
      const c = localStorage.getItem('dsta_app_pending_category');
      if (c) { localStorage.removeItem('dsta_app_pending_category'); return c; }
    } catch {}
    return 'all';
  });
  const [statusFilter, setStatusFilter] = useState<TabFilter>(() => {
    if (typeof window === 'undefined') return 'Eligible';
    try {
      const f = localStorage.getItem('dsta_app_pending_filter');
      if (f) { localStorage.removeItem('dsta_app_pending_filter'); return f as TabFilter; }
    } catch {}
    return 'Eligible';
  });
  const [search, setSearch]     = useState('');
  const [viewMode, setViewMode] = useState<ApplicationsView>(() => {
    if (typeof window === 'undefined') return 'list';
    return localStorage.getItem('dsta_applications_view') === 'board' ? 'board' : 'list';
  });
  const [appFilters, setAppFilters] = useState<ActiveFilter[]>([]);
  const [visibleCols, setVisibleCols] = useState<Record<ColKey, boolean>>({
    name: true, firstChoice: true, eligible: true, status: true, preOfferChecks: true, appliedDate: false,
  });
  const [sortCol, setSortCol]   = useState<string | null>('appliedDate');
  const [sortDir, setSortDir]   = useState<1 | -1>(-1);
  const { toast, showToast }    = useToast();
  const router                  = useRouter();
  const [bulkSelected,        setBulkSelected]        = useState<Set<string>>(new Set());
  const [bulkRejectOpen,      setBulkRejectOpen]      = useState(false);
  const [bulkRejectRemark,    setBulkRejectRemark]    = useState('');
  // Pre-offer checks
  const [preOfferConfirmApp,  setPreOfferConfirmApp]  = useState<Application | null>(null);
  const [bulkPreOfferOpen,    setBulkPreOfferOpen]    = useState(false);
  // Bulk offer
  const [bulkOfferOpen,       setBulkOfferOpen]       = useState(false);
  const [bulkOfferDeadline,   setBulkOfferDeadline]   = useState('');
  const [bulkOfferTemplateId, setBulkOfferTemplateId] = useState('');
  const [offerTemplates,      setOfferTemplates]      = useState<OfferLetterTemplate[]>([]);
  // View sent offer
  const [viewOfferApp,        setViewOfferApp]        = useState<Application | null>(null);
  const [reofferDeadline,     setReofferDeadline]     = useState('');
  // reset the re-offer date whenever the viewed offer changes
  useEffect(() => { setReofferDeadline(''); }, [viewOfferApp]);

  const [weights,        setWeights]        = useState<ScoringWeights>({ ...DEFAULT_WEIGHTS });
  const [showWeightPanel, setShowWeightPanel] = useState(false);
  const weightBtnRef  = useRef<HTMLButtonElement>(null);
  const weightPopRef  = useRef<HTMLDivElement>(null);

  // Column-header filters
  const [colHeaderFilters, setColHeaderFilters] = useState<{ name: string; school: string[]; eligible: string[]; status: string[] }>({
    name: '', school: [], eligible: [], status: [],
  });
  const [openColFilter, setOpenColFilter] = useState<string | null>(null);
  const [colFilterPos,  setColFilterPos]  = useState({ top: 0, left: 0 });

  function openColFilterFor(col: string, e: React.MouseEvent<HTMLButtonElement>) {
    e.stopPropagation();
    const r = e.currentTarget.getBoundingClientRect();
    setColFilterPos({ top: r.bottom + 4, left: r.left });
    setOpenColFilter(prev => prev === col ? null : col);
  }

  const APP_COLS_KEY = 'dsta_app_cols';
  const defaultAppCols: Record<ColKey, boolean> = { name: true, firstChoice: true, eligible: true, status: true, preOfferChecks: true, appliedDate: false };

  useEffect(() => { setWeights(loadWeights()); }, []);
  useEffect(() => { saveWeights(weights); }, [weights]);

  useEffect(() => {
    if (!showWeightPanel) return;
    function handle(e: MouseEvent | KeyboardEvent) {
      if (e instanceof KeyboardEvent) { if (e.key === 'Escape') setShowWeightPanel(false); return; }
      if (
        weightPopRef.current && !weightPopRef.current.contains(e.target as Node) &&
        weightBtnRef.current && !weightBtnRef.current.contains(e.target as Node)
      ) setShowWeightPanel(false);
    }
    document.addEventListener('mousedown', handle);
    document.addEventListener('keydown', handle);
    return () => { document.removeEventListener('mousedown', handle); document.removeEventListener('keydown', handle); };
  }, [showWeightPanel]);

  useEffect(() => {
    const loadedProjects = loadProjects();
    const programmes     = loadProgrammes();
    const loadedApps     = loadApps();
    setProjects(loadedProjects);
    const delayDays = loadAutoRejectDelayDays();
    const screened  = screenPending(loadedApps, programmes, loadedProjects, delayDays);
    const { apps: swept, released } = releaseDueRejections(screened);
    const refreshed = refreshScores(swept, loadedProjects);
    if (refreshed !== loadedApps) saveApps(refreshed);
    // Notify applicants whose held rejection was just released.
    released.forEach(a => addNotification({
      forRole: 'applicant', forEmail: a.email,
      title: `Application outcome — ${a.programmeName}`,
      body: `Thank you for applying to ${a.programmeName}. After review, your application was not successful on this occasion.`,
      href: '/apply/applications', tier: 'info',
    }));
    setApps(refreshed);
    try { const s = localStorage.getItem(APP_COLS_KEY); if (s) setVisibleCols(prev => ({ ...prev, ...JSON.parse(s) })); } catch {}
    setOfferTemplates(loadOfferTemplates());
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function toggleCol(key: ColKey) {
    setVisibleCols(prev => {
      const next = { ...prev, [key]: !prev[key] };
      try { localStorage.setItem(APP_COLS_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  }

  function setActiveProg(id: string) {
    setActiveProgLocal(id);
    setStatusFilter('Eligible');
  }

  function changeView(next: ApplicationsView) {
    setViewMode(next);
    try { localStorage.setItem('dsta_applications_view', next); } catch {}
  }

  const reservedByProject = useMemo(() => {
    const counts: Record<string, number> = {};
    apps.forEach(a => {
      if (a.status === 'Offer Extended' && a.shortlistedFor)
        counts[a.shortlistedFor] = (counts[a.shortlistedFor] ?? 0) + 1;
    });
    return counts;
  }, [apps]);

  const progApps  = useMemo(
    () => activeProg === 'all' ? apps : apps.filter(a => a.internCategory === activeProg),
    [apps, activeProg],
  );

  const schoolOptions = useMemo(() => {
    const seen: Record<string, true> = {};
    const schools: string[] = [];
    progApps.forEach(a => { if (!seen[a.school]) { seen[a.school] = true; schools.push(a.school); } });
    return schools.sort().map(s => ({ value: s, label: s }));
  }, [progApps]);

  const statusOptions = useMemo(() => {
    const seen = new Set<string>();
    progApps.forEach(a => seen.add(a.status));
    return Array.from(seen).sort();
  }, [progApps]);

  function handleSort(col: string) {
    if (sortCol === col) setSortDir(d => (d === 1 ? -1 : 1));
    else { setSortCol(col); setSortDir(1); }
  }

  function togglePreOfferChecks(app: Application) {
    const next = app.preOfferChecks === 'completed' ? 'pending' : 'completed';
    const updated = { ...app, preOfferChecks: next } as Application;
    const all = apps.map(a => a.id === app.id ? updated : a);
    setApps(all);
    saveApps(all);
    if (next === 'completed') showToast(`Pre-offer checks completed for ${app.name}.`);
  }

  function confirmPreOfferComplete() {
    if (!preOfferConfirmApp) return;
    togglePreOfferChecks({ ...preOfferConfirmApp, preOfferChecks: 'pending' }); // force to pending so toggle sets to completed
    setPreOfferConfirmApp(null);
  }

  // AUG-132 — remind a provisional-results applicant to upload their final grades.
  function sendFinalsReminder(app: Application) {
    const today = new Date().toISOString().split('T')[0];
    const next = apps.map(a => a.id === app.id ? { ...a, finalsReminderSentDate: today } : a);
    setApps(next); saveApps(next);
    addNotification({ forRole: 'applicant', forEmail: app.email,
      title: `Action needed — upload your final results (${app.programmeName})`,
      body: `Your ${app.programmeName} application was submitted with provisional results. Please log in and upload your final examination results so screening can be completed.`,
      href: '/apply/applications', tier: 'action' });
    showToast(`Final-results reminder sent to ${app.name}.`);
  }

  // TOA-072 — IO releases a held auto-rejection before its scheduled date.
  function sendRejectionNow(app: Application) {
    const today = new Date().toISOString().split('T')[0];
    const next = apps.map(a => a.id === app.id
      ? { ...a, rejectionEmailSent: true, rejectionEmailSentDate: today } : a);
    setApps(next); saveApps(next);
    addNotification({ forRole: 'applicant', forEmail: app.email,
      title: `Application outcome — ${app.programmeName}`,
      body: `Thank you for applying to ${app.programmeName}. After review, your application was not successful on this occasion.`,
      href: '/apply/applications', tier: 'info' });
    showToast(`Rejection sent to ${app.name}.`);
  }

  function doBulkPreOfferComplete() {
    const today = new Date().toISOString().split('T')[0];
    const next = apps.map(a => bulkSelected.has(a.id) ? { ...a, preOfferChecks: 'completed' as const } : a);
    setApps(next); saveApps(next);
    showToast(`Pre-offer checks marked complete for ${bulkSelected.size} applicant${bulkSelected.size !== 1 ? 's' : ''}.`);
    setBulkPreOfferOpen(false);
    setBulkSelected(new Set());
  }

  function doBulkExtendOffer() {
    if (!bulkOfferDeadline) return;
    const tmpl = offerTemplates.find(t => t.id === bulkOfferTemplateId) ?? offerTemplates[0];
    const today = new Date().toISOString().split('T')[0];
    const next = apps.map(a => {
      if (!bulkSelected.has(a.id)) return a;
      const proj = projects.find(p => p.id === a.shortlistedFor) ?? null;
      const body = tmpl ? substituteOfferVars(tmpl.body, buildOfferVars(a, proj, bulkOfferDeadline)) : '';
      return { ...a, status: 'Offer Extended' as const, offerDeadline: bulkOfferDeadline, offerLetterBody: body };
    });
    setApps(next); saveApps(next);
    bulkSelected.forEach(id => {
      const a = apps.find(x => x.id === id);
      if (a) addNotification({ forRole: 'applicant', forEmail: a.email, title: `Offer extended — ${a.programmeName}`, body: `An internship offer has been extended to you for ${a.programmeName}. Please log in to review and respond.`, href: '/apply/applications', tier: 'action' });
    });
    showToast(`Offer extended to ${bulkSelected.size} applicant${bulkSelected.size !== 1 ? 's' : ''}.`);
    setBulkOfferOpen(false);
    setBulkSelected(new Set());
  }

  // TOA-133 — recover a lapsed offer (deadline passed, no response). An offer must
  // never be stuck in 'Offer Extended' forever: the IO can either re-send with a new
  // deadline (slot stays reserved) or close it (slot released, treated as declined).
  function doReoffer(app: Application, newDeadline: string) {
    if (!newDeadline) return;
    const next = apps.map(a => a.id === app.id ? { ...a, offerDeadline: newDeadline } : a);
    setApps(next); saveApps(next);
    const pretty = new Date(newDeadline).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    addNotification({ forRole: 'applicant', forEmail: app.email, title: `Offer re-sent — ${app.programmeName}`, body: `Your internship offer for ${app.programmeName} has been re-sent with a new response deadline of ${pretty}. Please log in to review and respond.`, href: '/apply/applications', tier: 'action' });
    showToast(`Offer re-sent to ${app.name} · new deadline ${pretty}.`);
    setViewOfferApp(null);
  }
  function doCloseExpiredOffer(app: Application) {
    const next = apps.map(a => a.id === app.id ? { ...a, status: 'Offer Declined' as const } : a);
    setApps(next); saveApps(next);
    addNotification({ forRole: 'applicant', forEmail: app.email, title: `Offer closed — ${app.programmeName}`, body: `Your internship offer for ${app.programmeName} has lapsed as no response was received by the deadline.`, href: '/apply/applications', tier: 'info' });
    showToast(`Offer for ${app.name} closed (lapsed). Reserved slot released.`);
    setViewOfferApp(null);
  }

  function updateApp(updated: Application) {
    const next = apps.map(a => a.id === updated.id ? updated : a);
    setApps(next);
    saveApps(next);
    const msg = updated.status === 'Shortlisted for Interview'
      ? `${updated.name} shortlisted for ${projects.find(p => p.id === updated.shortlistedFor)?.title ?? ''}`
      : updated.status === 'Interview Completed'
      ? `Interview completed for ${updated.name}`
      : updated.status === 'Offer Extended'
      ? `Offer extended to ${updated.name}`
      : `${updated.name} marked as ${updated.status}`;
    showToast(msg);
  }

  /* Bulk selection — clear when tab/programme changes */
  useEffect(() => { setBulkSelected(new Set()); }, [statusFilter, activeProg]);

  function toggleBulkSelect(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    setBulkSelected(prev => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });
  }
  function doBulkReject() {
    const remark = bulkRejectRemark.trim();
    const today  = new Date().toISOString().split('T')[0];
    const next = apps.map(a => bulkSelected.has(a.id)
      ? { ...a, status: 'Rejected' as const, ioRejectionRemark: remark || undefined, rejectionEmailSent: true, rejectionEmailSentDate: today }
      : a);
    setApps(next);
    saveApps(next);
    showToast(`${bulkSelected.size} application${bulkSelected.size !== 1 ? 's' : ''} rejected. Notifications sent.`);
    setBulkSelected(new Set());
    setBulkRejectRemark('');
    setBulkRejectOpen(false);
  }

  /* Filter + sort */
  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = progApps.filter(a => {
      // Tab filter — skipped when searching so results span all buckets
      if (!q) {
        if      (statusFilter === 'Eligible')    { if (!(a.status === 'Pending Review' && a.eligibilityPass)) return false; }
        else if (statusFilter === 'Ineligible')  { if (!(a.status === 'Auto-rejected' || (a.status === 'Pending Review' && !a.eligibilityPass))) return false; }
        else if (statusFilter === 'In Progress') { if (a.status !== 'Shortlisted for Interview' && a.status !== 'Interview Scheduled') return false; }
        else if (statusFilter === 'Closed')      { if (!['Accepted','Rejected','Offer Accepted','Offer Declined','Active Intern','Internship Completed','Withdrawn','Terminated'].includes(a.status)) return false; }
        else if (statusFilter === 'Offer Extended') { if (a.status !== 'Offer Extended' && a.status !== 'Date Change Requested') return false; }
        else if (statusFilter !== 'All')         { if (a.status !== statusFilter) return false; }
      }
      // Search
      if (q && !a.name.toLowerCase().includes(q) && !a.school.toLowerCase().includes(q)) return false;
      // Column header filters
      if (colHeaderFilters.name && !a.name.toLowerCase().includes(colHeaderFilters.name.toLowerCase())) return false;
      if (colHeaderFilters.school.length > 0 && !colHeaderFilters.school.includes(a.school)) return false;
      if (colHeaderFilters.eligible.length > 0) {
        const eligLabel = a.eligibilityPass ? 'Eligible' : 'Ineligible';
        if (!colHeaderFilters.eligible.includes(eligLabel)) return false;
      }
      if (colHeaderFilters.status.length > 0 && !colHeaderFilters.status.includes(a.status)) return false;
      return true;
    });
    if (!sortCol) {
      if (statusFilter === 'Ineligible') list = [...list].sort((a, b) => (a.status === 'Auto-rejected' ? 1 : 0) - (b.status === 'Auto-rejected' ? 1 : 0));
      return list;
    }
    list = [...list].sort((a, b) => {
      let av: string | number = '';
      let bv: string | number = '';
      if (sortCol === 'name')        { av = a.name;        bv = b.name; }
      if (sortCol === 'school')      { av = a.school;      bv = b.school; }
      if (sortCol === 'year')        { av = a.year;        bv = b.year; }
      if (sortCol === 'appliedDate') { av = a.appliedDate; bv = b.appliedDate; }
      if (av < bv) return -sortDir;
      if (av > bv) return sortDir;
      return 0;
    });
    if (statusFilter === 'Ineligible') list = list.sort((a, b) => (a.status === 'Auto-rejected' ? 1 : 0) - (b.status === 'Auto-rejected' ? 1 : 0));
    if (statusFilter === 'Interview Completed') {
      const decisionOrder = (d: string | null | undefined) => d === 'Accepted' ? 0 : d === 'Rejected' ? 1 : 2;
      list = [...list].sort((a, b) => decisionOrder(a.mentorDecision) - decisionOrder(b.mentorDecision));
    }
    return list;
  }, [progApps, statusFilter, search, colHeaderFilters, sortCol, sortDir]);

  // Board columns represent the complete workflow, so status tabs are intentionally
  // replaced by columns while shared search and column filters remain active.
  const boardVisible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return progApps.filter(a => {
      if (q && !a.name.toLowerCase().includes(q) && !a.school.toLowerCase().includes(q) && !a.course.toLowerCase().includes(q)) return false;
      if (colHeaderFilters.name && !a.name.toLowerCase().includes(colHeaderFilters.name.toLowerCase())) return false;
      if (colHeaderFilters.school.length > 0 && !colHeaderFilters.school.includes(a.school)) return false;
      if (colHeaderFilters.eligible.length > 0) {
        const label = a.eligibilityPass ? 'Eligible' : 'Ineligible';
        if (!colHeaderFilters.eligible.includes(label)) return false;
      }
      if (colHeaderFilters.status.length > 0 && !colHeaderFilters.status.includes(a.status)) return false;
      return true;
    }).sort((a, b) => b.appliedDate.localeCompare(a.appliedDate));
  }, [progApps, search, colHeaderFilters]);

  const allVisibleSelected = visible.length > 0 && visible.every(a => bulkSelected.has(a.id));
  const someVisibleSelected = visible.some(a => bulkSelected.has(a.id));
  function toggleSelectAll() {
    setBulkSelected(allVisibleSelected ? new Set() : new Set(visible.map(a => a.id)));
  }

  const interviewActionCount = progApps.filter(a => a.status === 'Interview Completed' && !!a.mentorDecision).length;

  const FILTER_TABS: { label: string; value: TabFilter; count: number }[] = [
    { label: 'Eligible',         value: 'Eligible',          count: progApps.filter(a => a.status === 'Pending Review' && a.eligibilityPass).length },
    { label: 'Ineligible',       value: 'Ineligible',        count: progApps.filter(a => a.status === 'Auto-rejected' || (a.status === 'Pending Review' && !a.eligibilityPass)).length },
    { label: 'In Progress',          value: 'In Progress',          count: progApps.filter(a => a.status === 'Shortlisted for Interview' || a.status === 'Interview Scheduled').length },
    { label: 'Interview Completed',  value: 'Interview Completed',  count: progApps.filter(a => a.status === 'Interview Completed').length },
    { label: 'Offer Extended',       value: 'Offer Extended',       count: progApps.filter(a => a.status === 'Offer Extended' || a.status === 'Date Change Requested').length },
    { label: 'Closed',               value: 'Closed',               count: progApps.filter(a => ['Accepted','Rejected','Offer Accepted','Offer Declined','Active Intern','Internship Completed','Withdrawn','Terminated'].includes(a.status)).length },
  ];

  return (
    <Shell activeRoute="/applications">
      {/* Header */}
      <div className="mb-4 flex flex-col items-start justify-between gap-4 sm:flex-row">
        <div>
          <h1 className="text-headline-lg text-fg">Applications</h1>
          <p className="mt-1 text-body-sm text-fg-muted">
            Review eligibility, shortlist candidates and track each application through offer.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center rounded-lg border border-border bg-bg-subtle p-0.5" role="group" aria-label="Applications view">
            <button
              type="button"
              onClick={() => changeView('list')}
              aria-pressed={viewMode === 'list'}
              className={cn('inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-body-sm font-semibold transition-colors', viewMode === 'list' ? 'bg-surface text-fg shadow-sm' : 'text-fg-muted hover:text-fg')}
            >
              <LayoutList size={14} />List
            </button>
            <button
              type="button"
              onClick={() => changeView('board')}
              aria-pressed={viewMode === 'board'}
              className={cn('inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-body-sm font-semibold transition-colors', viewMode === 'board' ? 'bg-surface text-fg shadow-sm' : 'text-fg-muted hover:text-fg')}
            >
              <Columns3 size={14} />Board
            </button>
          </div>
          <Button variant="outline" onClick={() => router.push('/shortlisting-review')}>
            <Send size={14} /> Shortlisting Review
          </Button>
        </div>
      </div>

      {/* Programme selector */}
      <div className="mb-4">
        <ProgToggle
          options={[{ value: 'all', label: 'All categories' }, ...INTERN_CATEGORIES.map(c => ({ value: c, label: c }))]}
          value={activeProg}
          onChange={setActiveProg}
        />
      </div>

      {/* Table */}
      <div className="card overflow-hidden">

        {/* Search + Filters toolbar — at the top, searches across all tabs */}
        <TableToolbar
          search={search} onSearch={setSearch} placeholder="Search by name or institution…"
          colDefs={COL_DEFS.map(c => ({ key: c.key, label: c.label }))}
          visibleCols={visibleCols} onToggleCol={k => toggleCol(k as ColKey)}
          onExport={() => exportToCSV('applications.csv',
            ['Name', 'Name of Institution', 'GPA', 'Eligible', 'Status', 'Applied Date'],
            visible.map(a => [a.name, a.school, a.gpa, a.eligibilityPass ? 'Yes' : 'No', a.status, a.appliedDate])
          )}
          extraActions={
            <button
              ref={weightBtnRef}
              onClick={() => setShowWeightPanel(p => !p)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 text-body-sm rounded-lg border transition-colors',
                showWeightPanel
                  ? 'bg-accent text-white border-accent'
                  : 'bg-surface text-fg-muted border-border hover:border-accent hover:text-accent'
              )}
            >
              <SlidersHorizontal size={13} />
              Scoring Weights
              <span className={cn(
                'text-[12px] font-bold px-1.5 py-0.5 rounded-full',
                showWeightPanel ? 'bg-white/20 text-white' : 'bg-bg-subtle text-fg-subtle'
              )}>
                {weights.discipline}/{weights.skills}/{weights.standing}
              </span>
            </button>
          }
        />

        {/* In board view, the pipeline columns replace status tabs. */}
        {viewMode === 'list' && <div className="border-b border-border px-3 py-3 overflow-x-auto">
          <TabBar
            ariaLabel="Application filter"
            value={statusFilter}
            onChange={(k) => setStatusFilter(k as TabFilter)}
            tabs={[
              ...FILTER_TABS.filter(t => t.value === 'Eligible' || t.value === 'Ineligible').map((t) => ({
                key: t.value, label: t.label, count: t.count,
                urgent: t.count > 0 && statusFilter !== t.value,
              })),
              ...FILTER_TABS.filter(t => t.value !== 'All' && t.value !== 'Eligible' && t.value !== 'Ineligible').map((t, i) => ({
                key: t.value, label: t.label, count: t.count,
                dividerBefore: i === 0,
                urgent: t.value === 'Interview Completed' && interviewActionCount > 0 && statusFilter !== t.value,
              })),
            ]}
          />
        </div>}

        {/* Bulk action bar */}
        {bulkSelected.size > 0 && (viewMode === 'board' || statusFilter !== 'Closed') && (() => {
          const selectedApps = apps.filter(a => bulkSelected.has(a.id));
          const PAST_PRE_OFFER = new Set(['Offer Extended','Offer Accepted','Active Intern','Internship Completed','Withdrawn','Terminated']);
          const canBulkPreOffer = selectedApps.some(a =>
            a.preOfferChecks !== 'completed' &&
            !PAST_PRE_OFFER.has(a.status)
          );
          const canBulkOffer    = selectedApps.some(a => a.preOfferChecks === 'completed' && a.mentorDecision === 'Accepted' && a.status === 'Interview Completed');
          return (
            <div className="flex items-center gap-3 px-4 py-2.5 bg-accent/5 border-b border-accent/20">
              <span className="text-body-sm font-semibold text-accent">{bulkSelected.size} selected</span>
              <div className="flex gap-2 ml-auto">
                <Button variant="ghost" size="sm" onClick={() => setBulkSelected(new Set())}>Clear</Button>
                {canBulkPreOffer && (
                  <Button variant="outline" size="sm" onClick={() => setBulkPreOfferOpen(true)}>
                    <Check size={13} />Mark Pre-offer Checks Complete
                  </Button>
                )}
                {canBulkOffer && (
                  <Button size="sm" onClick={() => {
                    setBulkOfferDeadline('');
                    setBulkOfferTemplateId(offerTemplates[0]?.id ?? '');
                    setBulkOfferOpen(true);
                  }}>
                    <Mail size={13} />Extend Offer to {selectedApps.filter(a => a.preOfferChecks === 'completed' && a.mentorDecision === 'Accepted' && a.status === 'Interview Completed').length}
                  </Button>
                )}
                <Button variant="danger" size="sm" onClick={() => setBulkRejectOpen(true)}>
                  <UserX size={14} />Reject Selected
                </Button>
              </div>
            </div>
          );
        })()}



        {viewMode === 'board' ? (
          <div className="overflow-x-auto bg-bg-subtle/50 p-3 sm:p-4">
            <div className="mb-3 flex items-center justify-between gap-3 px-1">
              <div>
                <p className="text-label-sm font-semibold text-fg">Application pipeline</p>
                <p className="text-[13px] text-fg-muted">{boardVisible.length} application{boardVisible.length === 1 ? '' : 's'} across all stages</p>
              </div>
              {(search || colHeaderFilters.name || colHeaderFilters.school.length > 0 || colHeaderFilters.eligible.length > 0 || colHeaderFilters.status.length > 0) && (
                <button
                  type="button"
                  onClick={() => { setSearch(''); setColHeaderFilters({ name: '', school: [], eligible: [], status: [] }); }}
                  className="inline-flex items-center gap-1.5 text-body-sm font-semibold text-accent hover:underline"
                >
                  <RotateCcw size={13} />Reset filters
                </button>
              )}
            </div>
            <div className="grid min-w-[1220px] grid-cols-5 items-start gap-3">
              {BOARD_COLUMNS.map(column => {
                const columnApps = boardVisible.filter(app => column.statuses.includes(app.status));
                return (
                  <section key={column.key} aria-labelledby={`board-${column.key}`} className="min-w-0 rounded-xl border border-border bg-surface">
                    <div className="border-b border-border px-3 py-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex min-w-0 items-center gap-2">
                          <span className={cn('h-2 w-2 shrink-0 rounded-full', column.accent)} />
                          <h2 id={`board-${column.key}`} className="text-body-sm font-bold text-fg">{column.label}</h2>
                        </div>
                        <span className="inline-flex min-w-6 justify-center rounded-full bg-bg-muted px-2 py-0.5 text-[12px] font-bold tabular-nums text-fg-muted">{columnApps.length}</span>
                      </div>
                      <p className="mt-0.5 pl-4 text-[12px] text-fg-subtle">{column.description}</p>
                    </div>
                    <div className="space-y-2 p-2">
                      {columnApps.length === 0 ? (
                        <div className="rounded-lg border border-dashed border-border px-3 py-8 text-center">
                          <p className="text-[13px] text-fg-subtle">No applications</p>
                        </div>
                      ) : columnApps.map(app => {
                        const topSui = [...(app.suitabilityScores ?? [])].sort((a, b) => reweightScore(b, weights) - reweightScore(a, weights))[0];
                        const topScore = topSui ? Math.round(reweightScore(topSui, weights)) : 0;
                        const firstChoice = projects.find(project => project.id === app.projectRankings?.[0]);
                        const attempted = app.triedProjects?.length ?? 0;
                        const availabilityWarning = !!app.projectArchived || !!app.rescheduleNote;
                        return (
                          <article
                            key={app.id}
                            tabIndex={0}
                            role="button"
                            onClick={() => router.push(openApplicantHref(app))}
                            onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') router.push(openApplicantHref(app)); }}
                            className={cn('group cursor-pointer rounded-lg border bg-surface p-3 transition-all hover:border-accent/40 hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-accent/30', bulkSelected.has(app.id) ? 'border-accent bg-accent/5' : 'border-border')}
                          >
                            <div className="mb-2 flex items-start gap-2">
                              {column.key !== 'closed' && (
                                <input
                                  type="checkbox"
                                  checked={bulkSelected.has(app.id)}
                                  onChange={() => {}}
                                  onClick={event => toggleBulkSelect(app.id, event)}
                                  aria-label={`Select ${app.name}`}
                                  className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer rounded border-border accent-accent"
                                />
                              )}
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-body-sm font-bold text-fg group-hover:text-accent">{app.name}</p>
                                <p className="mt-0.5 line-clamp-2 text-[12px] leading-snug text-fg-muted">{app.course} · {app.school}</p>
                              </div>
                              {topScore > 0 && <SuitabilityBadge score={topScore} sui={topSui} weights={weights} variant="plain" />}
                            </div>

                            <div className="mb-2 flex flex-wrap gap-1.5">
                              <StatusBadge status={app.status} />
                              <span className={cn('inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[12px] font-semibold', app.eligibilityPass ? 'border-success/20 bg-success-bg text-success' : app.provisionalResults ? 'border-warning/20 bg-warning-bg text-warning' : 'border-danger/20 bg-danger-bg text-danger')}>
                                {app.eligibilityPass ? <Check size={10} /> : app.provisionalResults ? <AlertTriangle size={10} /> : <X size={10} />}
                                {app.eligibilityPass ? 'Eligible' : app.provisionalResults ? 'Conditional' : 'Ineligible'}
                              </span>
                              {app.status === 'Interview Completed' && <MentorDecisionBadge decision={app.mentorDecision} />}
                            </div>

                            <div className="space-y-1.5 border-t border-border pt-2 text-[12px]">
                              <div className="flex items-start gap-1.5 text-fg-muted">
                                <Star size={12} className="mt-0.5 shrink-0 text-fg-subtle" />
                                <span className="line-clamp-2"><span className="font-semibold text-fg">1st choice:</span> {firstChoice?.title ?? topSui?.projectTitle ?? 'Not ranked'}</span>
                              </div>
                              <div className="flex items-center gap-1.5 text-fg-muted">
                                <CalendarRange size={12} className="shrink-0 text-fg-subtle" />
                                <span>{app.availability?.weeks ? `${app.availability.weeks} weeks` : 'Availability not stated'}</span>
                              </div>
                              {(attempted > 0 || app.previousDSTA) && (
                                <div className="flex items-center gap-1.5 text-fg-muted">
                                  <History size={12} className="shrink-0 text-fg-subtle" />
                                  <span>{attempted > 0 ? `${attempted} project attempt${attempted === 1 ? '' : 's'}` : 'Previous DSTA engagement'}</span>
                                </div>
                              )}
                              {availabilityWarning && (
                                <div className="flex items-start gap-1.5 rounded-md bg-warning-bg px-2 py-1.5 font-medium text-warning">
                                  <AlertTriangle size={12} className="mt-0.5 shrink-0" />
                                  <span>{app.projectArchived ? 'Assigned project requires rematching' : 'Interview reschedule requested'}</span>
                                </div>
                              )}
                            </div>
                            <div className="mt-2 flex items-center justify-between border-t border-border pt-2 text-[12px] text-fg-subtle">
                              <span>{app.id}</span>
                              <span>Applied {app.appliedDate}</span>
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  </section>
                );
              })}
            </div>
          </div>
        ) : <>
        {/* Mobile card list */}
        <div className="sm:hidden divide-y divide-border">
          {visible.length === 0 ? (
            <p className="px-4 py-10 text-center text-body-md text-fg-muted">No applicants in this category.</p>
          ) : visible.map(app => {
            const topSui   = [...app.suitabilityScores].sort((a, b) => reweightScore(b, weights) - reweightScore(a, weights))[0];
            const topScore = topSui ? Math.round(reweightScore(topSui, weights)) : 0;
            return (
              <div
                key={app.id}
                onClick={() => router.push(openApplicantHref(app))}
                className="flex items-center gap-3 px-4 py-4 hover:bg-bg-subtle/50 active:bg-bg-subtle cursor-pointer transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-1">
                    <p className="text-body-md font-semibold text-fg truncate">{app.name}</p>
                    {app.previousDSTA && <History size={12} className="text-accent shrink-0" />}
                  </div>
                  <p className="text-body-sm text-fg-muted mb-2">{app.school}</p>
                  <div className="flex items-center gap-2 flex-wrap">
                    <StatusBadge status={app.status} />
                    {app.eligibilityPass
                      ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[13px] font-semibold bg-success-bg text-success border border-success/20"><Check size={11} />Eligible</span>
                      : <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[13px] font-semibold bg-danger-bg text-danger border border-danger/20"><X size={11} />Ineligible</span>
                    }
                    {app.eligibilityPass && topScore > 0 && <SuitabilityBadge score={topScore} sui={topSui} weights={weights} />}
                    {app.status === 'Interview Completed' && <MentorDecisionBadge decision={app.mentorDecision} />}
                  </div>
                </div>
                <ChevronRight size={16} className="text-fg-subtle shrink-0" />
              </div>
            );
          })}
        </div>

        {/* Desktop table */}
        <div className="hidden sm:block overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead className="bg-bg-subtle border-b border-border">
            <tr>
              <th className="px-4 py-3 w-10">
                {statusFilter !== 'Closed' && (
                  <input
                    type="checkbox"
                    checked={allVisibleSelected}
                    ref={el => { if (el) el.indeterminate = someVisibleSelected && !allVisibleSelected; }}
                    onChange={toggleSelectAll}
                    className="w-4 h-4 rounded border-border accent-accent cursor-pointer"
                  />
                )}
              </th>
              {visibleCols.name && (
                <th className={cn('px-4 py-3 text-table-header tracking-wider select-none', sortCol === 'name' ? 'text-accent' : 'text-fg')}>
                  <span className="flex items-center gap-1">
                    <button onClick={() => handleSort('name')} className="flex items-center gap-1.5 hover:opacity-80 transition-opacity">
                      Name
                      {sortCol === 'name' ? (sortDir === 1 ? <ArrowUp size={13} className="text-accent" /> : <ArrowDown size={13} className="text-accent" />) : <ArrowUpDown size={13} className="text-fg-subtle" />}
                    </button>
                    <button onClick={e => openColFilterFor('name', e)} className={cn('p-0.5 rounded transition-colors ml-0.5', colHeaderFilters.name ? 'text-accent bg-accent/10' : 'text-fg-subtle hover:text-fg hover:bg-bg-muted')}>
                      <Filter size={11} />
                    </button>
                  </span>
                </th>
              )}
              {visibleCols.firstChoice && <th className="px-4 py-3 text-table-header tracking-wider text-fg">First-Choice Project</th>}
              {visibleCols.eligible && (
                <th className="px-4 py-3 text-table-header tracking-wider text-fg text-center select-none">
                  <span className="inline-flex items-center gap-1 justify-center">
                    Programme Eligibility
                    <button onClick={e => openColFilterFor('eligible', e)} className={cn('p-0.5 rounded transition-colors ml-0.5', colHeaderFilters.eligible.length > 0 ? 'text-accent bg-accent/10' : 'text-fg-subtle hover:text-fg hover:bg-bg-muted')}>
                      <Filter size={11} />
                    </button>
                  </span>
                </th>
              )}
              {visibleCols.status && (
                <th className="px-4 py-3 text-table-header tracking-wider text-fg select-none">
                  <span className="flex items-center gap-1">
                    Status
                    <button onClick={e => openColFilterFor('status', e)} className={cn('p-0.5 rounded transition-colors ml-0.5', colHeaderFilters.status.length > 0 ? 'text-accent bg-accent/10' : 'text-fg-subtle hover:text-fg hover:bg-bg-muted')}>
                      <Filter size={11} />
                    </button>
                  </span>
                </th>
              )}
              {statusFilter === 'Interview Completed' && <th className="px-4 py-3 text-table-header tracking-wider text-fg">Mentor's Decision</th>}
              {visibleCols.appliedDate && <SortTh col="appliedDate" label="Applied Date"  sortCol={sortCol} sortDir={sortDir} onSort={handleSort} />}
              {visibleCols.preOfferChecks && <th className="px-4 py-3 text-table-header tracking-wider text-fg">Pre-offer Checks</th>}
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {visible.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-16 text-center text-body-md text-fg-muted">No applicants in this category.</td>
              </tr>
            ) : visible.map((app, idx) => {
              const topScore = reweightedTopScore(app, weights);
              const isFirstAutoRej = statusFilter === 'Ineligible' && (idx === 0 || visible[idx - 1].status !== app.status) && (app.status === 'Auto-rejected' || !app.eligibilityPass);
              const prevDecisionOrder = (d: string | null | undefined) => d === 'Accepted' ? 0 : d === 'Rejected' ? 1 : 2;
              const isFirstRecommended   = statusFilter === 'Interview Completed' && app.mentorDecision === 'Accepted' && (idx === 0 || visible[idx-1].mentorDecision !== 'Accepted');
              const isFirstNotRecommended = statusFilter === 'Interview Completed' && app.mentorDecision === 'Rejected' && (idx === 0 || prevDecisionOrder(visible[idx-1].mentorDecision) < 1);
              const isFirstAwaiting       = statusFilter === 'Interview Completed' && !app.mentorDecision && (idx === 0 || visible[idx-1].mentorDecision);
              return (
                <Fragment key={app.id}>
                  {isFirstAutoRej && (
                    <tr className="bg-danger-bg/60">
                      <td colSpan={9} className="px-4 py-1.5 text-[12px] font-bold text-danger uppercase tracking-widest border-b border-danger/20">
                        Failed eligibility criteria
                      </td>
                    </tr>
                  )}
                  {isFirstRecommended && (
                    <tr className="bg-success-bg/40">
                      <td colSpan={9} className="px-4 py-1.5 text-[12px] font-bold text-success uppercase tracking-widest border-b border-success/20">
                        Mentor recommended — extend offer to proceed
                      </td>
                    </tr>
                  )}
                  {isFirstNotRecommended && (
                    <tr className="bg-danger-bg/40">
                      <td colSpan={9} className="px-4 py-1.5 text-[12px] font-bold text-danger uppercase tracking-widest border-b border-danger/20">
                        Not recommended — re-shortlist or reject
                      </td>
                    </tr>
                  )}
                  {isFirstAwaiting && (
                    <tr className="bg-bg-subtle/60">
                      <td colSpan={9} className="px-4 py-1.5 text-[12px] font-bold text-fg-muted uppercase tracking-widest border-b border-border">
                        Awaiting mentor's recommendation
                      </td>
                    </tr>
                  )}
                  <tr
                    onClick={() => router.push(openApplicantHref(app))}
                    className={cn('hover:bg-bg-subtle/50 transition-colors cursor-pointer group', bulkSelected.has(app.id) && 'bg-accent/5')}
                  >
                    <td className="px-4 py-3 w-10">
                      {statusFilter !== 'Closed' && (
                        <input
                          type="checkbox"
                          checked={bulkSelected.has(app.id)}
                          onChange={() => {}}
                          onClick={e => toggleBulkSelect(app.id, e)}
                          className="w-4 h-4 rounded border-border accent-accent cursor-pointer"
                        />
                      )}
                    </td>
                    {visibleCols.name && (
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <p className="text-body-md font-semibold text-fg group-hover:text-accent transition-colors">{app.name}</p>
                          {app.previousDSTA && (
                            <span title="Previous DSTA engagement"><History size={12} className="text-accent" /></span>
                          )}
                        </div>
                        {app.status === 'Offer Extended' && app.shortlistedFor && (
                          <>
                            <p className="text-[12px] text-accent font-semibold mt-0.5">
                              Slot reserved · {projects.find(p => p.id === app.shortlistedFor)?.title ?? app.shortlistedFor}
                            </p>
                            {app.offerDeadline && (() => {
                              const days = Math.ceil((new Date(app.offerDeadline).getTime() - Date.now()) / 86400000);
                              return days < 0
                                ? <span className="text-[12px] font-semibold text-danger">Deadline passed</span>
                                : days === 0
                                  ? <span className="text-[12px] font-semibold text-warning">Expires today</span>
                                  : days <= 3
                                    ? <span className="text-[12px] font-semibold text-warning">Expires in {days}d</span>
                                    : <span className="text-[12px] font-semibold text-fg-muted">Expires in {days}d</span>;
                            })()}
                          </>
                        )}

                        {app.status === 'Interview Completed' && app.shortlistedFor && (
                          <p className="text-[12px] text-fg-muted mt-0.5">
                            {projects.find(p => p.id === app.shortlistedFor)?.title ?? app.shortlistedFor}
                          </p>
                        )}
                        {app.status === 'Auto-rejected' && (
                          app.rejectionEmailSent
                            ? <p className="text-[12px] text-fg-muted mt-0.5">Rejection sent{app.rejectionEmailSentDate ? ` · ${app.rejectionEmailSentDate}` : ''}</p>
                            : <span className="inline-flex items-center gap-1.5 mt-0.5" onClick={e => e.stopPropagation()}>
                                <span className="text-[12px] font-semibold text-warning">Rejection held{app.rejectionDueDate ? ` · sends ${app.rejectionDueDate}` : ''}</span>
                                <button onClick={() => sendRejectionNow(app)} className="text-[12px] font-semibold text-accent hover:underline">Send now</button>
                              </span>
                        )}
                        {app.provisionalResults && app.status !== 'Auto-rejected' && (
                          <span className="inline-flex items-center gap-1.5 mt-0.5" onClick={e => e.stopPropagation()}>
                            <span className="text-[12px] font-semibold text-warning">Provisional results</span>
                            {app.finalsReminderSentDate
                              ? <span className="text-[12px] text-fg-muted">· reminder sent {app.finalsReminderSentDate}</span>
                              : <button onClick={() => sendFinalsReminder(app)} className="text-[12px] font-semibold text-accent hover:underline">Remind to upload finals</button>}
                          </span>
                        )}
                      </td>
                    )}
                    {visibleCols.firstChoice && (
                      <td className="px-4 py-3">
                        {(() => {
                          const pid = app.projectRankings?.[0];
                          if (!pid) return <span className="text-body-sm text-fg-subtle">—</span>;
                          const proj = projects.find(p => p.id === pid);
                          const s = app.suitabilityScores?.find(x => x.projectId === pid) ?? (proj ? scoreSuitability(app, proj) : undefined);
                          const score = s ? Math.round(reweightScore(s, weights)) : null;
                          return (
                            <>
                              <p className="text-body-sm text-fg">{proj?.title ?? s?.projectTitle ?? '—'}</p>
                              {score !== null && (
                                <p className="text-[12px] font-bold tabular-nums">
                                  <SuitabilityBadge score={score} sui={s} weights={weights} variant="plain" />
                                  <span className="text-fg-muted font-normal"> project suitability</span>
                                </p>
                              )}
                            </>
                          );
                        })()}
                      </td>
                    )}
                    {visibleCols.eligible && (
                      <td className="px-4 py-3 text-center">
                        {app.eligibilityPass
                          ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[13px] font-semibold bg-success-bg text-success border border-success/20"><Check size={11} />Eligible</span>
                          : (app.provisionalResults && app.status !== 'Auto-rejected')
                            ? <span title="Provisional results — academic shortfall is conditional pending final grades" className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[13px] font-semibold bg-warning-bg text-warning border border-warning/20"><AlertTriangle size={11} />Conditional</span>
                            : <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[13px] font-semibold bg-danger-bg text-danger border border-danger/20"><X size={11} />Ineligible</span>
                        }
                      </td>
                    )}
                    {visibleCols.status      && <td className="px-4 py-3 text-body-sm text-fg-muted">{STATUS_CONFIG[app.status].label}</td>}
                    {statusFilter === 'Interview Completed' && (
                      <td className="px-4 py-3">
                        <MentorDecisionBadge decision={app.mentorDecision} />
                      </td>
                    )}
                    {visibleCols.appliedDate && <td className="px-4 py-3 text-body-sm text-fg">{app.appliedDate}</td>}
                    {visibleCols.preOfferChecks && (
                      <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                        <label className="flex items-center gap-2 cursor-pointer group w-fit">
                          <input
                            type="checkbox"
                            checked={app.preOfferChecks === 'completed'}
                            onChange={() => app.preOfferChecks !== 'completed'
                              ? setPreOfferConfirmApp(app)
                              : togglePreOfferChecks(app)
                            }
                            className="w-4 h-4 rounded border-border accent-accent cursor-pointer shrink-0"
                          />
                          <span className={cn(
                            'text-body-sm transition-colors',
                            app.preOfferChecks === 'completed'
                              ? 'text-success font-medium'
                              : 'text-fg-muted group-hover:text-fg',
                          )}>
                            {app.preOfferChecks === 'completed' ? 'Completed' : 'Mark complete'}
                          </span>
                        </label>
                      </td>
                    )}
                    <td className="px-4 py-3 text-right">
                      {statusFilter === 'Interview Completed' && app.mentorDecision === 'Accepted' ? (
                        app.preOfferChecks !== 'completed' ? (
                          <div className="flex flex-col items-end gap-0.5" onClick={e => e.stopPropagation()}>
                            <Button size="sm" disabled>
                              <Mail size={12} />Extend Offer
                            </Button>
                            <span className="text-[12px] text-warning font-medium">Pre-offer checks pending</span>
                          </div>
                        ) : (
                          <Button
                            size="sm"
                            onClick={e => { e.stopPropagation(); router.push(`/offer-letter?appId=${app.id}`); }}
                          >
                            <Mail size={12} />Extend Offer
                          </Button>
                        )
                      ) : ['Offer Extended', 'Offer Accepted', 'Active Intern', 'Internship Completed', 'Date Change Requested'].includes(app.status) && app.offerLetterBody ? (
                        <button
                          onClick={e => { e.stopPropagation(); setViewOfferApp(app); }}
                          className="text-body-sm text-accent hover:underline font-medium"
                        >
                          View Offer
                        </button>
                      ) : (
                        <ChevronRight size={16} className="text-fg-subtle" />
                      )}
                    </td>
                  </tr>
                </Fragment>
              );
            })}
          </tbody>
        </table>
        </div>
        </>}
      </div>


      {/* Pre-offer single confirmation */}
      <Modal open={!!preOfferConfirmApp} onClose={() => setPreOfferConfirmApp(null)} maxWidth="sm" labelledBy="preoffer-confirm-title">
        <h2 id="preoffer-confirm-title" className="text-headline-md text-fg mb-1">Mark pre-offer checks complete?</h2>
        <p className="text-body-md text-fg-muted mb-5">
          Confirm that all background verification has been completed for{' '}
          <span className="font-semibold text-fg">{preOfferConfirmApp?.name}</span>.
          This will unlock the Extend Offer action.
        </p>
        <div className="flex gap-3 justify-end">
          <Button onClick={confirmPreOfferComplete}><Check size={14} />Confirm</Button>
          <Button variant="ghost" onClick={() => setPreOfferConfirmApp(null)}>Cancel</Button>
        </div>
      </Modal>

      {/* Bulk pre-offer confirmation */}
      <Modal open={bulkPreOfferOpen} onClose={() => setBulkPreOfferOpen(false)} maxWidth="sm" labelledBy="bulk-preoffer-confirm-title">
        <h2 id="bulk-preoffer-confirm-title" className="text-headline-md text-fg mb-1">Mark pre-offer checks complete?</h2>
        <p className="text-body-md text-fg-muted mb-5">
          Confirm that all background verification has been completed for{' '}
          <span className="font-semibold text-fg">{bulkSelected.size} applicant{bulkSelected.size !== 1 ? 's' : ''}</span>.
          This will unlock Extend Offer for each of them.
        </p>
        <div className="flex gap-3 justify-end">
          <Button onClick={doBulkPreOfferComplete}><Check size={14} />Confirm</Button>
          <Button variant="ghost" onClick={() => setBulkPreOfferOpen(false)}>Cancel</Button>
        </div>
      </Modal>

      {/* Bulk extend offer */}
      <Modal open={bulkOfferOpen} onClose={() => setBulkOfferOpen(false)} maxWidth="sm" labelledBy="bulk-extend-offer-title">
        <h2 id="bulk-extend-offer-title" className="text-headline-md text-fg mb-2">Extend Offer</h2>
        <p className="text-body-md text-fg-muted mb-5">
          Sending to{' '}
          <span className="font-semibold text-fg">
            {apps.filter(a => bulkSelected.has(a.id) && a.preOfferChecks === 'completed' && a.mentorDecision === 'Accepted').length} applicant{apps.filter(a => bulkSelected.has(a.id) && a.preOfferChecks === 'completed' && a.mentorDecision === 'Accepted').length !== 1 ? 's' : ''}
          </span>
          . Each will receive a personalised offer letter.
        </p>
        <div className="space-y-4 mb-6">
          <div>
            <label className="block text-label-sm text-fg-muted mb-1.5">Template</label>
            <select
              value={bulkOfferTemplateId}
              onChange={e => setBulkOfferTemplateId(e.target.value)}
              className="w-full px-3 py-2 text-body-sm border border-border rounded-lg bg-surface focus:outline-none focus:ring-2 focus:ring-accent/30"
            >
              {offerTemplates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-label-sm text-fg-muted mb-1.5">Offer Deadline <span className="text-danger">*</span></label>
            <DatePicker value={bulkOfferDeadline} onChange={setBulkOfferDeadline} placeholder="Select deadline" />
          </div>
        </div>
        <div className="flex gap-3 justify-end">
          <Button disabled={!bulkOfferDeadline} onClick={doBulkExtendOffer}>
            <Mail size={14} />Send Offers
          </Button>
          <Button variant="ghost" onClick={() => setBulkOfferOpen(false)}>Cancel</Button>
        </div>
      </Modal>

      {/* View sent offer */}
      {viewOfferApp && (
        <Modal open onClose={() => setViewOfferApp(null)} maxWidth="md" labelledBy="view-offer-letter-title">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 id="view-offer-letter-title" className="text-headline-md text-fg">Offer Letter</h2>
              <p className="text-body-sm text-fg-muted mt-0.5">
                Sent to <span className="font-semibold text-fg">{viewOfferApp.name}</span>
                {viewOfferApp.offerDeadline && ` · Deadline: ${new Date(viewOfferApp.offerDeadline).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`}
              </p>
            </div>
          </div>
          <div className="bg-bg-subtle border border-border rounded-xl px-5 py-4 max-h-[60vh] overflow-y-auto">
            <pre className="text-body-sm text-fg whitespace-pre-wrap font-sans leading-relaxed">
              {viewOfferApp.offerLetterBody}
            </pre>
          </div>
          {(() => {
            const today = new Date().toISOString().split('T')[0];
            const expired = viewOfferApp.status === 'Offer Extended'
              && !!viewOfferApp.offerDeadline
              && viewOfferApp.offerDeadline < today;
            if (!expired) {
              return (
                <div className="flex justify-end mt-4">
                  <Button variant="ghost" onClick={() => setViewOfferApp(null)}>Close</Button>
                </div>
              );
            }
            const reofferValid = !!reofferDeadline && reofferDeadline > today;
            return (
              <div className="mt-4 rounded-xl border border-warning/30 bg-warning-bg px-4 py-3.5">
                <div className="flex items-start gap-2 mb-3">
                  <AlertTriangle size={15} className="text-warning mt-0.5 shrink-0" />
                  <div>
                    <p className="text-body-sm font-semibold text-fg">Offer expired — no response by the deadline</p>
                    <p className="text-[13px] text-fg-muted mt-0.5 leading-relaxed">
                      The response deadline ({new Date(viewOfferApp.offerDeadline!).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}) has passed.
                      Re-send with a new deadline to keep the slot reserved, or close the offer to release the reserved slot.
                    </p>
                  </div>
                </div>
                <div className="flex items-end gap-3 flex-wrap">
                  <div className="min-w-[200px]">
                    <label className="block text-label-sm text-fg-muted mb-1.5">New deadline</label>
                    <DatePicker value={reofferDeadline} onChange={setReofferDeadline} placeholder="Select new deadline" />
                  </div>
                  <Button disabled={!reofferValid} onClick={() => doReoffer(viewOfferApp, reofferDeadline)}>
                    <Mail size={14} />Re-send Offer
                  </Button>
                  <Button variant="danger" onClick={() => doCloseExpiredOffer(viewOfferApp)}>
                    <XCircle size={14} />Close Offer
                  </Button>
                  <Button variant="ghost" className="ml-auto" onClick={() => setViewOfferApp(null)}>Cancel</Button>
                </div>
              </div>
            );
          })()}
        </Modal>
      )}

      {/* Bulk reject confirm modal */}
      <Modal open={bulkRejectOpen} onClose={() => { setBulkRejectOpen(false); setBulkRejectRemark(''); }} maxWidth="sm" labelledBy="bulk-reject-title">
        <h2 id="bulk-reject-title" className="text-headline-md text-fg mb-1">Reject {bulkSelected.size} applicant{bulkSelected.size !== 1 ? 's' : ''}?</h2>
        <p className="text-body-md text-fg-muted mb-4">
          Their applications will be marked as <span className="font-semibold text-danger">Rejected</span>.
        </p>
        <div className="mb-3">
          <label className="block text-label-sm text-fg mb-1.5">
            Rejection Reason <span className="text-danger">*</span>
          </label>
          <textarea
            rows={3}
            value={bulkRejectRemark}
            onChange={e => setBulkRejectRemark(e.target.value)}
            placeholder="e.g. Does not meet the minimum eligibility criteria for this programme…"
            className="w-full rounded-xl border border-border bg-bg-subtle px-3 py-2.5 text-body-sm text-fg resize-none focus:outline-none focus:ring-2 focus:ring-danger/20 focus:border-danger/40"
          />
        </div>
        <div className="flex items-start gap-2 px-3 py-2.5 bg-bg-subtle rounded-xl border border-border mb-5">
          <Mail size={12} className="text-fg-muted mt-0.5 shrink-0" />
          <p className="text-[13px] text-fg-muted leading-relaxed">
            A <span className="font-semibold text-fg">Pre-Interview Rejection</span> notification will be sent automatically to each applicant.
          </p>
        </div>
        <div className="flex gap-3 justify-end">
          <Button variant="danger" disabled={!bulkRejectRemark.trim()} onClick={doBulkReject}>
            <UserX size={14} />Reject {bulkSelected.size} Application{bulkSelected.size !== 1 ? 's' : ''}
          </Button>
          <Button variant="ghost" onClick={() => { setBulkRejectOpen(false); setBulkRejectRemark(''); }}>Cancel</Button>
        </div>
      </Modal>

      <Toast message={toast} />

      {/* Column header filter dropdowns */}
      {openColFilter === 'name' && (
        <ColFilterDropdown
          kind="text"
          current={colHeaderFilters.name}
          onApply={v => setColHeaderFilters(f => ({ ...f, name: v as string }))}
          onClose={() => setOpenColFilter(null)}
          pos={colFilterPos}
        />
      )}
      {openColFilter === 'school' && (
        <ColFilterDropdown
          kind="multiselect"
          options={schoolOptions.map(o => o.value)}
          current={colHeaderFilters.school}
          onApply={v => setColHeaderFilters(f => ({ ...f, school: v as string[] }))}
          onClose={() => setOpenColFilter(null)}
          pos={colFilterPos}
        />
      )}
      {openColFilter === 'eligible' && (
        <ColFilterDropdown
          kind="multiselect"
          options={['Eligible', 'Ineligible']}
          current={colHeaderFilters.eligible}
          onApply={v => setColHeaderFilters(f => ({ ...f, eligible: v as string[] }))}
          onClose={() => setOpenColFilter(null)}
          pos={colFilterPos}
        />
      )}
      {openColFilter === 'status' && (
        <ColFilterDropdown
          kind="multiselect"
          options={statusOptions}
          current={colHeaderFilters.status}
          onApply={v => setColHeaderFilters(f => ({ ...f, status: v as string[] }))}
          onClose={() => setOpenColFilter(null)}
          pos={colFilterPos}
        />
      )}

      {/* Scoring weights popover */}
      {showWeightPanel && typeof window !== 'undefined' && (() => {
        const rect = weightBtnRef.current?.getBoundingClientRect();
        if (!rect) return null;
        return createPortal(
          <div
            ref={weightPopRef}
            style={{ position: 'fixed', top: rect.bottom + 8, right: window.innerWidth - rect.right, zIndex: 9999 }}
            className="w-80 bg-surface border border-border rounded-xl shadow-lg p-4"
          >
            <div className="flex items-center justify-between mb-3">
              <p className="text-label-sm font-semibold text-fg">Suitability Score Weights</p>
              <button onClick={() => setShowWeightPanel(false)} className="text-fg-muted hover:text-fg transition-colors">
                <X size={14} />
              </button>
            </div>
            <div className="mb-3 space-y-3">
              {(['discipline', 'skills', 'standing'] as const).map(k => (
                <div key={k}>
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-body-sm text-fg">
                      {k === 'discipline' ? 'Discipline of Study' : k === 'skills' ? 'Skills Match' : 'Academic Standing'}
                    </p>
                    <span className="text-[13px] font-bold text-accent">{weights[k]}%</span>
                  </div>
                  <Slider
                    min={0} max={100} step={5}
                    value={weights[k]}
                    onChange={v => setWeights({ ...weights, [k]: v })}
                  />
                </div>
              ))}
            </div>
            <p className="text-[12px] text-fg-muted leading-relaxed mb-2">
              Discipline = field / subject fit · Skills = overlap with required skills · Standing = grades, banded
              within each school system. Weights are relative — the engine normalises them.
            </p>
            {(weights.discipline !== DEFAULT_WEIGHTS.discipline || weights.skills !== DEFAULT_WEIGHTS.skills || weights.standing !== DEFAULT_WEIGHTS.standing) && (
              <button
                onClick={() => setWeights({ ...DEFAULT_WEIGHTS })}
                className="w-full mt-1 px-3 py-1.5 text-body-sm font-semibold text-accent border border-accent/40 rounded-lg hover:bg-accent/8 transition-colors"
              >
                Reset to 50 / 30 / 20
              </button>
            )}
          </div>,
          document.body
        );
      })()}

    </Shell>
  );
}
