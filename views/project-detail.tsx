'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Shell from '@/components/layout/shell';
import { useRole } from '@/lib/role';
import Button from '@/components/ui-legacy/button';
import Modal from '@/components/ui-legacy/modal';
import SingleCombobox from '@/components/ui-legacy/single-combobox';
import { Toast, useToast } from '@/components/ui-legacy/toast';
import {
  ChevronRight, MapPin, Clock, Users, Briefcase, Brain,
  Rocket, GraduationCap, Wrench, User, Building2, BookOpen,
  Loader2, Check, AlertCircle, XCircle, RotateCcw, Archive, ChevronDown, FolderPlus,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useProgramme } from '@/lib/programme-context';
import { addNotification } from '@/lib/notifications';
import { loadLiveProgrammeOptions } from '@/lib/data';
import { loadProjects, saveProjects } from '@/lib/storage';
import { loadWeights, reweightScore, scoreSuitability } from '@/lib/scoring';
import { SuitabilityBadge } from '@/components/ui-legacy/suitability-badge';
import type { ProjectEntry, Application } from '@/lib/types';
import { PROJECT_SUBMISSION_COLUMNS, COLUMN_SECTIONS, type ProjectSubmissionColumn, type ColumnSection } from '@/lib/data';

/* ── AI suggestion types & helpers ─────────────────────────────────────────── */
type AISuggestion = {
  levelLabel: string;
  titleStatus: 'ok' | 'needs-change';
  titleFeedback: string;
  suggestedTitle?: string;
  scopeFeedback: string;
  suggestedScope: string;
  changes: string[];
};

const LEVEL_MAP: Record<string, { label: string; tier: 'sec' | 'jc' | 'poly' | 'ug' | 'sci' }> = {
  'Integrated Programme (IP)': { label: 'Secondary School',    tier: 'sec'  },
  'Junior College':                            { label: 'Junior College',      tier: 'jc'   },
  'Post Junior College':                       { label: 'Post Junior College', tier: 'jc'   },
  'Polytechnic':                               { label: 'Polytechnic',         tier: 'poly' },
  'Post Polytechnic':                          { label: 'Post Polytechnic',    tier: 'poly' },
  'University':                                { label: 'Undergraduate',       tier: 'ug'   },
  'Scholarship Candidate Interns (SCI)':       { label: 'Scholarship Candidate', tier: 'sci' },
  // Legacy values retained for existing project records
  'IP':              { label: 'Secondary School',           tier: 'sec'  },
  'IP Scholar':      { label: 'Secondary School (Scholar)', tier: 'sec'  },
  'JC Intern':         { label: 'Junior College',             tier: 'jc'   },
  'JC Scholar':        { label: 'Junior College (Scholar)',   tier: 'jc'   },
  'Post-JC/Post-Poly': { label: 'Post-Secondary',            tier: 'poly' },
  'Poly Scholar':      { label: 'Polytechnic (Scholar)',      tier: 'poly' },
  'Tech UP':           { label: 'Professional',               tier: 'ug'   },
  'UG Intern':         { label: 'Undergraduate',              tier: 'ug'   },
  'UG Scholar':        { label: 'Undergraduate (Scholar)',    tier: 'ug'   },
  'SCI':               { label: 'Research / Post-Graduate',   tier: 'sci'  },
};

function buildAISuggestion(proj: ProjectEntry): AISuggestion {
  const cat = Array.isArray(proj.educationLevel) ? proj.educationLevel[0] : proj.educationLevel ?? '';
  const { label, tier } = LEVEL_MAP[cat] ?? { label: 'Undergraduate', tier: 'ug' };
  const title = proj.title ?? '';
  const scope = proj.description ?? '';

  if (tier === 'sec') return {
    levelLabel: label,
    titleStatus: 'needs-change',
    titleFeedback: 'The current title uses domain-specific terminology that secondary school students may find unfamiliar. A simpler, curiosity-driven title would better engage IP participants.',
    suggestedTitle: `Exploring ${title}: A Beginner's Introduction`,
    scopeFeedback: 'The scope references advanced technical concepts and assumes prior knowledge beyond secondary school. Language should be simplified and the project framed as a guided discovery experience.',
    suggestedScope: `In this project, you will get a hands-on introduction to ${title.toLowerCase()}. Through guided activities and experiments, you will learn how engineers at DSTA approach real-world challenges in this area. No advanced background is required — curiosity and enthusiasm are enough. By the end, you will have built a simple working prototype and gained an appreciation for how technology is used in defence.\n\nExpected deliverables: a short project report and a working demo presented to your mentor.`,
    changes: [
      'Reframed title to be exploratory and inviting rather than technical',
      'Removed assumed prior knowledge of domain concepts',
      'Replaced technical deliverables with guided learning activities',
      'Added explicit statement that no advanced background is needed',
      'Simplified scope language to secondary-school reading level',
    ],
  };

  if (tier === 'jc') return {
    levelLabel: label,
    titleStatus: 'ok',
    titleFeedback: 'The title is reasonably clear for JC-level interns, though a brief descriptive phrase could help set expectations.',
    scopeFeedback: 'Some parts of the scope assume knowledge beyond the JC curriculum. Learning outcomes should connect to concepts familiar from H2 subjects and deliverables should be structured as progressive milestones.',
    suggestedScope: `Interns will explore the principles behind ${title.toLowerCase()} through structured experiments and guided research. ${scope.split('.')[0]}. No university-level background is assumed — interns will be introduced to required concepts progressively. Learning outcomes include an appreciation of how AI and engineering methods are applied in defence. Deliverables include a research summary and a short demonstration of findings.`,
    changes: [
      'Scoped deliverables to be achievable within a JC intern\'s knowledge base',
      'Added progressive learning structure so concepts build gradually',
      'Removed references to techniques typically taught only at university level',
      'Made learning outcomes more explicit and concrete',
    ],
  };

  if (tier === 'poly') return {
    levelLabel: label,
    titleStatus: 'ok',
    titleFeedback: 'The title is appropriate for polytechnic-level interns with applied technical background.',
    scopeFeedback: 'The scope is mostly well-calibrated but could better highlight the hands-on, applied nature of the work — polytechnic students respond well to practical outcomes and tangible artefacts.',
    suggestedScope: `${scope} Interns are expected to apply skills from their diploma modules to build, test, and iterate on the solution. The emphasis is on practical implementation and real-world testing rather than theoretical analysis.`,
    changes: [
      'Emphasised applied, hands-on nature of the project',
      'Aligned deliverables with polytechnic diploma module outcomes',
      'Added explicit expectation of iterative prototyping',
    ],
  };

  if (tier === 'sci') return {
    levelLabel: label,
    titleStatus: 'needs-change',
    titleFeedback: 'For SCI-level participants, the title should signal the research nature of the engagement more clearly.',
    suggestedTitle: `${title}: Research Investigation and Novel Contributions`,
    scopeFeedback: 'The scope should emphasise original research contribution, publication potential, and independent problem formulation — consistent with graduate-level expectations of the SCI programme.',
    suggestedScope: `This project is a research-led investigation into ${title.toLowerCase()}. The intern is expected to conduct a literature review, identify open research questions, propose and execute experiments, and synthesise findings into a technical report suitable for internal publication or conference submission. ${scope} Deliverables include a research report, experimental codebase, and a formal presentation to senior engineers.`,
    changes: [
      'Repositioned scope as an independent research engagement',
      'Added literature review and original contribution requirements',
      'Framed deliverables for potential internal publication',
      'Aligned expectations with post-graduate research norms',
    ],
  };

  // UG / Tech UP default
  return {
    levelLabel: label,
    titleStatus: 'ok',
    titleFeedback: 'The title is well-suited for undergraduate-level interns with a relevant technical background.',
    scopeFeedback: 'The scope is appropriate in technical depth. Consider making deliverables more concrete and specifying evaluation criteria so interns have clear success metrics.',
    suggestedScope: `${scope} Interns should document their methodology, present interim findings at the midpoint, and submit a final technical report with reproducible code. Evaluation criteria include correctness, code quality, and clarity of the final report.`,
    changes: [
      'Added concrete evaluation criteria for deliverables',
      'Included interim milestone (midpoint check-in)',
      'Specified documentation and reproducibility requirements',
      'Aligned technical depth with undergraduate coursework expectations',
    ],
  };
}


/* ── Detail row ─────────────────────────────────────────────────────────────── */
function DetailRow({ label, value }: {
  icon?: React.ElementType; label: string; value?: string | string[];
}) {
  if (!value || (Array.isArray(value) && value.length === 0)) return null;
  return (
    <div>
      <p className="text-caption text-fg-muted mb-1">{label}</p>
      {Array.isArray(value) ? (
        <div className="flex flex-wrap gap-1.5">
          {value.map(v => (
            <span key={v} className="text-[13px] font-semibold px-2.5 py-1 rounded-full bg-bg-subtle border border-border text-fg">
              {v}
            </span>
          ))}
        </div>
      ) : (
        <p className="text-body-md text-fg">{value}</p>
      )}
    </div>
  );
}

/* ── Placement bar ──────────────────────────────────────────────────────────── */
function PlacementBar({ confirmed, reserved, slots }: { confirmed: number; reserved: number; slots: number }) {
  const confirmedPct = slots > 0 ? Math.round((confirmed / slots) * 100) : 0;
  const reservedPct  = slots > 0 ? Math.round((reserved  / slots) * 100) : 0;
  const open = Math.max(0, slots - confirmed - reserved);
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-body-sm font-semibold text-fg">{confirmed} / {slots} filled</span>
        {reserved > 0 && <span className="text-caption text-accent font-semibold">{reserved} reserved</span>}
      </div>
      <div className="h-2.5 rounded-full bg-bg-subtle overflow-hidden flex">
        <div className="h-full bg-success transition-all"    style={{ width: `${confirmedPct}%` }} />
        <div className="h-full bg-accent/50 transition-all" style={{ width: `${reservedPct}%` }} />
      </div>
      <div className="flex items-center gap-4 mt-2 text-[13px] text-fg-muted">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-success inline-block" />{confirmed} filled</span>
        {reserved > 0 && <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-accent/50 inline-block" />{reserved} reserved</span>}
        {open > 0     && <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-border-strong inline-block" />{open} open</span>}
      </div>
    </div>
  );
}

/* ── Divider with label ─────────────────────────────────────────────────────── */
function SectionDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 py-1">
      <span className="text-[12px] font-black text-fg-subtle uppercase tracking-widest whitespace-nowrap">{label}</span>
      <div className="flex-1 border-t border-border" />
    </div>
  );
}

/* ── Column name → ProjectEntry value resolver ─────────────────────────────── */
function resolveField(proj: ProjectEntry, colName: string): string | string[] | undefined {
  switch (colName) {
    case 'Project Title':               return proj.title;
    case 'Project Scope':               return proj.description;
    case 'PC':                          return proj.pc;
    case 'Intern Category':          return proj.educationLevel;
    case 'Tech Domain':                 return proj.techDomain;
    case 'Emerging Area':               return proj.emergingArea;
    case 'Discipline of Study':         return proj.discipline;
    case 'Skills / Knowledge Required': return proj.skills;
    case 'No. of Placements':           return String(proj.slots);
    case 'Internship Duration':         return proj.internshipDuration;
    case 'Working Location':            return proj.workingLocation;
    case 'Full Name of Main Mentor':    return proj.mentor;
    case 'Main Mentor Appointment':     return proj.mentorAppointment;
    case 'Main Mentor Email':            return proj.mentorUserId;
    case 'Main Mentor Write-up':        return proj.mentorBio;
    default:                            return undefined;
  }
}

/* ── Icon per column name ───────────────────────────────────────────────────── */
function iconFor(colName: string): React.ElementType | undefined {
  switch (colName) {
    case 'PC':                          return Building2;
    case 'Intern Category':          return undefined;
    case 'Tech Domain':                 return undefined;
    case 'Emerging Area':               return Rocket;
    case 'Discipline of Study':         return BookOpen;
    case 'Skills / Knowledge Required': return Wrench;
    case 'No. of Placements':           return Users;
    case 'Internship Duration':         return Clock;
    case 'Working Location':            return undefined;
    case 'Full Name of Main Mentor':    return undefined;
    case 'Main Mentor Appointment':     return Briefcase;
    case 'Main Mentor Email':            return undefined;
    default:                            return Briefcase;
  }
}

/* ── Page ─────────────────────────────────────────────────────────────────────── */
export default function ProjectDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const { role, profile } = useRole();
  const { progOpts } = useProgramme();
  const isMentor = role === 'mentor';
  const backRoute = isMentor ? '/mentor/projects' : '/projects';
  const [proj, setProj]           = useState<ProjectEntry | null>(null);
  const [apps, setApps]           = useState<Application[]>([]);
  const [tplCols, setTplCols]     = useState<ProjectSubmissionColumn[]>(PROJECT_SUBMISSION_COLUMNS);
  const [progTitle, setProgTitle] = useState<string>('');
  const [confirmArchive, setConfirmArchive] = useState(false);
  const [archiveRemark,  setArchiveRemark]  = useState('');
  const [confirmAssign,  setConfirmAssign]  = useState(false);
  const [assignProg,     setAssignProg]     = useState('');
  const [detailsOpen,    setDetailsOpen]    = useState(false);
  const { toast, showToast }      = useToast();

  const PROJ_TPL_KEY      = 'dsta_proj_template_columns';
  const PROJ_TPL_VER_KEY  = 'dsta_proj_template_columns_seed_v';
  const PROJ_TPL_SEED_VER = '13';

  useEffect(() => {
    try {
      // Load from the versioned projects list for freshness (reseeds if stale)
      const allProjs: ProjectEntry[] = loadProjects();
      const targetId = params?.id ?? (() => {
        try { return (JSON.parse(localStorage.getItem('dsta_project_view') ?? '{}') as ProjectEntry).id; } catch { return undefined; }
      })();
      const found = allProjs.find(p => p.id === targetId);
      if (found) {
        setProj(found);
        const opts = loadLiveProgrammeOptions();
        const match = opts.find(o => o.value === found.programme);
        setProgTitle(match?.label ?? found.programme ?? '');
      }

      const appRaw = localStorage.getItem('dsta_applications');
      if (appRaw) setApps(JSON.parse(appRaw));

      // Reseed template columns if stale, then load
      if (localStorage.getItem(PROJ_TPL_VER_KEY) !== PROJ_TPL_SEED_VER) {
        localStorage.setItem(PROJ_TPL_KEY, JSON.stringify(PROJECT_SUBMISSION_COLUMNS));
        localStorage.setItem(PROJ_TPL_VER_KEY, PROJ_TPL_SEED_VER);
        setTplCols(PROJECT_SUBMISSION_COLUMNS);
      } else {
        const tplRaw = localStorage.getItem(PROJ_TPL_KEY);
        if (tplRaw) {
          const parsed = JSON.parse(tplRaw);
          if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].section) setTplCols(parsed);
        }
      }
    } catch {}
  }, [params?.id]);

  const reserved = useMemo(() =>
    apps.filter(a => a.status === 'Offer Extended' && a.shortlistedFor === proj?.id).length,
  [apps, proj]);

  const pipeline = useMemo(() =>
    apps.filter(a => ['Shortlisted for Interview', 'Interview Scheduled', 'Interview Completed'].includes(a.status) && a.shortlistedFor === proj?.id).length,
  [apps, proj]);

  // Open slots = total minus those already placed or offered. No room → can't shortlist more.
  const openSlots = useMemo(() => proj ? Math.max(0, proj.slots - proj.matched - reserved) : 0, [proj, reserved]);
  const isFull = !!proj && openSlots <= 0;

  const weights = useMemo(() => loadWeights(), []);

  // Project pool: ALL eligible applicants in this programme who are still available to
  // shortlist (not yet shortlisted/placed), scored against THIS project and ranked by
  // suitability — so strong matches surface even if they didn't rank it first. Those who
  // ranked the project keep a preference tag.
  const poolApps = useMemo(() =>
    apps
      .filter(a => a.programmeId === proj?.programme)
      .filter(a => a.eligibilityPass && !a.shortlistedFor && (a.status === 'Pending Review' || a.status === 'Pending Screening'))
      .map(a => {
        const s = a.suitabilityScores?.find(x => x.projectId === proj?.id) ?? (proj ? scoreSuitability(a, proj) : undefined);
        return {
          app:     a,
          score:   s ? Math.round(reweightScore(s, weights)) : 0,
          sui:     s,
          rankPos: (a.projectRankings ?? []).indexOf(proj?.id ?? ''),
        };
      })
      .sort((x, y) => y.score - x.score),
  [apps, proj, weights]);

  function shortlistApplicant(app: Application) {
    if (!proj) return;
    const updated = apps.map(a => a.id === app.id
      ? { ...a, status: 'Shortlisted for Interview' as const, shortlistedFor: proj.id }
      : a);
    setApps(updated);
    try { localStorage.setItem('dsta_applications', JSON.stringify(updated)); } catch {}
    addNotification({
      forRole: 'mentor',
      ...(proj.mentorUserId ? { forMentorId: proj.mentorUserId } : {}),
      title: `New applicant shortlisted — ${proj.title}`,
      body: `${app.name} has been shortlisted for your project "${proj.title}". Please set your interview availability.`,
      href: '/mentor/projects', tier: 'action',
    });
    showToast(`${app.name} shortlisted for interview.`);
  }

  if (!proj) {
    return (
      <Shell activeRoute="/projects">
        <div className="flex items-center justify-center py-32">
          <p className="text-body-lg text-fg-muted">No project data found.</p>
        </div>
      </Shell>
    );
  }


  const isUnassigned = !proj.programme || proj.programme === 'unassigned';

  function assignProgramme(progId: string) {
    if (!proj || !progId) return;
    try {
      const all: ProjectEntry[] = loadProjects();
      const next = all.map(p => p.id === proj.id ? { ...p, programme: progId } : p);
      saveProjects(next);
      const updated = { ...proj, programme: progId };
      localStorage.setItem('dsta_project_view', JSON.stringify(updated));
      setProj(updated);
      const match = progOpts.find(o => o.value === progId);
      setProgTitle(match?.label ?? progId);
      showToast(`Project assigned to ${match?.label ?? progId}.`);
    } catch {}
  }

  function setArchived(archived: boolean, remark?: string) {
    if (!proj) return;
    try {
      const patch = archived
        ? { archived: true, archiveRemark: (remark ?? '').trim(), archivedAt: new Date().toISOString(), archivedBy: profile.name }
        : { archived: false, archiveRemark: undefined, archivedAt: undefined, archivedBy: undefined };
      const all: ProjectEntry[] = loadProjects();
      const next = all.map(p => p.id === proj.id ? { ...p, ...patch } : p);
      saveProjects(next);
      const updated = { ...proj, ...patch };
      localStorage.setItem('dsta_project_view', JSON.stringify(updated));
      setProj(updated);
      showToast(archived ? 'Project archived — hidden from applicants.' : 'Project unarchived.');
    } catch {}
  }

  return (
    <Shell activeRoute={isMentor ? '/mentor/projects' : '/projects'}>
      {/* Breadcrumb */}
      <nav className="mb-4 flex shrink-0 items-center gap-2 text-label-md">
        <span
          className="cursor-pointer text-fg-muted transition-colors hover:text-accent"
          onClick={() => router.push(backRoute)}
        >
          {isMentor ? 'My Projects' : 'Projects'}
        </span>
        <ChevronRight size={14} className="text-fg-subtle" />
        <span className="max-w-[420px] truncate font-semibold text-fg">{proj.title}</span>
      </nav>

      {/* Header */}
      <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-3 flex-wrap mb-1.5">
            <h1 className="text-headline-lg text-fg">{proj.title}</h1>
            {/* Project status */}
            <span className={cn('text-caption-bold px-2.5 py-1 rounded-full', proj.archived ? 'bg-danger-bg text-danger' : 'bg-success-bg text-success')}>
              {proj.archived ? 'Archived' : 'Active'}
            </span>
          </div>
          <p className="text-body-md text-fg-muted font-mono">{proj.id}</p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center justify-start gap-2 md:justify-end">
          <Button variant="outline" size="md" onClick={() => router.push(backRoute)}>Back</Button>
          {!isMentor && isUnassigned && !proj.archived && (
            <Button size="md" onClick={() => { setAssignProg(''); setConfirmAssign(true); }}><FolderPlus size={16} />Assign to Programme</Button>
          )}
          {!isMentor && (proj.archived
            ? <Button variant="outline" size="md" onClick={() => setArchived(false)}><RotateCcw size={16} />Unarchive Project</Button>
            : <Button variant="outline" size="md" onClick={() => { setArchiveRemark(''); setConfirmArchive(true); }}><Archive size={16} />Archive Project</Button>
          )}
        </div>
      </div>

      {proj.archived && (
        <div className="flex items-start gap-3 mb-5 px-4 py-3 bg-danger-bg/40 border border-danger/20 rounded-2xl">
          <XCircle size={16} className="text-danger shrink-0 mt-0.5" />
          <div>
            <p className="text-body-sm font-semibold text-fg">This project has been archived</p>
            {proj.archiveRemark && <p className="text-body-sm text-fg-muted mt-0.5">Reason: {proj.archiveRemark}</p>}
          </div>
        </div>
      )}

      {!isMentor && isUnassigned && !proj.archived && (
        <div className="flex items-start gap-3 mb-5 px-4 py-3 bg-warning-bg/40 border border-warning/20 rounded-2xl">
          <AlertCircle size={16} className="text-warning shrink-0 mt-0.5" />
          <div>
            <p className="text-body-sm font-semibold text-fg">This project is not assigned to a programme</p>
            <p className="text-body-sm text-fg-muted mt-0.5">Assign it to a programme so eligible applicants can be ranked and shortlisted for it.</p>
          </div>
        </div>
      )}

      {/* Row 1 — Applicants + Placement Status (IO), equal height */}
      {!isMentor && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-stretch mb-5">

          {/* Applicants — who ranked this project #1 */}
          <div className="card p-6 lg:col-span-2">
              <div className="flex items-center gap-2 mb-1">
                <Users size={18} className="text-accent" />
                <h2 className="text-headline-md text-fg">Applicants</h2>
                <span className="ml-1 inline-flex items-center justify-center min-w-[22px] h-[22px] px-1.5 rounded-full bg-accent/12 text-accent text-[13px] font-bold">{poolApps.length}</span>
              </div>
              <p className="text-body-sm text-fg-muted mb-4">
                Eligible applicants available for this project, ranked by project suitability. Those who ranked it are tagged with their preference.
              </p>
              {!proj.archived && isFull && (
                <div className="flex items-start gap-2 mb-4 px-4 py-2.5 rounded-lg bg-bg-subtle border border-border">
                  <Check size={14} className="text-success shrink-0 mt-0.5" />
                  <p className="text-body-sm text-fg-muted">
                    All <span className="font-semibold text-fg">{proj.slots}</span> slot{proj.slots !== 1 ? 's' : ''} for this project are filled — shortlisting is closed.
                  </p>
                </div>
              )}
              {poolApps.length === 0 ? (
                <p className="text-body-sm text-fg-muted py-6 text-center border border-dashed border-border rounded-xl">No eligible applicants available to shortlist for this project.</p>
              ) : (
                <>
                  <div className="overflow-x-auto -mx-2">
                    <table className="w-full text-left border-collapse">
                      <thead className="border-b border-border">
                        <tr>
                          <th className="px-2 py-3 text-table-header tracking-wider text-fg">Name</th>
                          <th className="px-2 py-3 text-table-header tracking-wider text-fg">Name of Institution</th>
                          <th className="px-2 py-3 text-table-header tracking-wider text-fg text-center">Project suitability</th>
                          <th className="px-2 py-3 text-table-header tracking-wider text-fg text-center">Programme Eligibility</th>
                          <th className="px-2 py-3" />
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {poolApps.map(({ app: a, score, sui, rankPos }) => {
                          const canShortlist = !proj.archived && !isFull && a.status === 'Pending Review';
                          const rankLabel = rankPos >= 0 ? (['1st', '2nd', '3rd', '4th', '5th'][rankPos] ?? `${rankPos + 1}th`) : null;
                          return (
                            <tr
                              key={a.id}
                              onClick={() => router.push(`/candidate360/${a.id}?from=projects&proj=${proj.id}`)}
                              className="hover:bg-bg-subtle/50 transition-colors group cursor-pointer"
                            >
                              <td className="px-2 py-3">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <p className="text-body-md font-semibold text-fg group-hover:text-accent transition-colors">{a.name}</p>
                                  {rankLabel && (
                                    <span className="inline-flex items-center px-1.5 py-0.5 rounded-full bg-accent/10 text-accent border border-accent/20 text-[11px] font-bold shrink-0">
                                      {rankLabel} choice
                                    </span>
                                  )}
                                </div>
                                {a.track && <p className="text-[12px] text-fg-subtle mt-0.5">{a.track}</p>}
                              </td>
                              <td className="px-2 py-3 text-body-sm text-fg">{a.school}</td>
                              <td className="px-2 py-3 text-center">
                                {score > 0
                                  ? <SuitabilityBadge score={score} sui={sui} weights={weights} variant="plain" className="text-body-md" />
                                  : <span className="text-fg-subtle">—</span>}
                              </td>
                              <td className="px-2 py-3 text-center">
                                {a.eligibilityPass
                                  ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[13px] font-semibold bg-success-bg text-success border border-success/20"><Check size={11} />Eligible</span>
                                  : <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[13px] font-semibold bg-warning-bg text-warning border border-warning/20"><AlertCircle size={11} />Review</span>}
                              </td>
                              <td className="px-2 py-3 text-right">
                                {canShortlist
                                  ? <span onClick={e => e.stopPropagation()}><Button size="sm" onClick={() => shortlistApplicant(a)}>Shortlist</Button></span>
                                  : <span className="inline-flex items-center gap-1 text-[13px] font-semibold text-accent group-hover:underline">Open<ChevronRight size={13} /></span>}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  <p className="flex items-start gap-1.5 text-[12px] text-fg-subtle mt-3">
                    <AlertCircle size={12} className="shrink-0 mt-0.5" />
                    Project suitability is an AI estimate from each applicant&apos;s discipline of study, skills &amp; academic standing. Hover a score for the breakdown. Use it as a guide.
                  </p>
                </>
              )}
            </div>
          {/* Placement Status — same row as Applicants */}
          {proj.archived ? (
            <div className="card p-6 lg:col-span-1">
              <h2 className="text-headline-md text-fg mb-2">Placement Status</h2>
              <p className="text-body-sm text-fg-muted">Not applicable — this project has been archived.</p>
            </div>
          ) : (
            <div className="card p-6 lg:col-span-1">
              <h2 className="text-headline-md text-fg mb-4">Placement Status</h2>
              <PlacementBar confirmed={proj.matched} reserved={reserved} slots={proj.slots} />
              <div className="grid grid-cols-2 gap-3 mt-5">
                <div className="rounded-xl bg-bg-subtle px-4 py-3 text-center">
                  <p className="text-headline-md text-success font-bold">{proj.matched}</p>
                  <p className="text-caption text-fg-muted">Filled</p>
                </div>
                <div className="rounded-xl bg-bg-subtle px-4 py-3 text-center">
                  <p className="text-headline-md text-accent font-bold">{reserved}</p>
                  <p className="text-caption text-fg-muted">Offer Sent</p>
                </div>
                <div className="rounded-xl bg-bg-subtle px-4 py-3 text-center">
                  <p className="text-headline-md text-fg-muted font-bold">{pipeline}</p>
                  <p className="text-caption text-fg-muted">Interviewing</p>
                </div>
                <div className="rounded-xl bg-bg-subtle px-4 py-3 text-center">
                  <p className="text-headline-md text-fg font-bold">{Math.max(0, proj.slots - proj.matched - reserved)}</p>
                  <p className="text-caption text-fg-muted">Open</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Row 2 — Project Details + Mentor Details, side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">

        {/* Project Details card — Overview scope + all non-Mentor sections */}
        <div className="card p-6 lg:col-span-2">
          <button onClick={() => setDetailsOpen(o => !o)} className="w-full flex items-start justify-between gap-3 text-left">
            <div className="min-w-0">
              <h2 className="text-headline-md text-fg">Project Details</h2>
              {progTitle && (
                <p className="flex items-center gap-1.5 text-body-sm text-fg-muted mt-0.5">
                  <Briefcase size={12} className="text-accent shrink-0" />{progTitle}
                </p>
              )}
            </div>
            <ChevronDown size={20} className={cn('text-fg-muted shrink-0 mt-1 transition-transform', detailsOpen && 'rotate-180')} />
          </button>

          {detailsOpen && (
            <div className="mt-5 pt-5 border-t border-border">

            {/* Project Scope — rendered as a prose block, not a grid row */}
            {(() => {
              const hasScopeCol = tplCols.some(c => c.section === 'Overview' && c.name === 'Project Scope');
              const val = hasScopeCol ? resolveField(proj, 'Project Scope') : undefined;
              if (!val) return null;
              return (
                <>
                  <SectionDivider label="Project Scope" />
                  <p className="text-body-md text-fg leading-relaxed mt-3 mb-6">{val}</p>
                </>
              );
            })()}

            {/* Remaining sections: Classification, Academic Requirements, Logistics */}
            {(() => {
              const renderSections = COLUMN_SECTIONS.filter(s => s !== 'Overview' && s !== 'Mentor Information');
              const activeSections = renderSections.filter(s => tplCols.some(c => c.section === s));
              return activeSections.map((sec, i) => {
                const secCols = tplCols.filter(c => c.section === sec);
                const isLast  = i === activeSections.length - 1;
                return (
                  <div key={sec}>
                    <SectionDivider label={sec} />
                    <div className={`grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5 mt-4 ${isLast ? '' : 'mb-6'}`}>
                      {secCols.map(c => (
                        <DetailRow key={c.name} icon={iconFor(c.name)} label={c.name} value={resolveField(proj, c.name)} />
                      ))}
                    </div>
                  </div>
                );
              });
            })()}
            </div>
          )}
          </div>


          {/* Mentor Information — beside Project Details */}
          {(() => {
            const mentorCols = tplCols.filter(c => c.section === 'Mentor Information');
            if (mentorCols.length === 0) return null;
            const mentorNameCol = mentorCols.find(c => c.name === 'Full Name of Main Mentor');
            const writeupCol    = mentorCols.find(c => c.name === 'Main Mentor Write-up');
            const otherCols     = mentorCols.filter(c => c !== mentorNameCol && c !== writeupCol);
            const gridCols      = [...(mentorNameCol ? [mentorNameCol] : []), ...otherCols];
            const bio           = writeupCol ? resolveField(proj, 'Main Mentor Write-up') : undefined;
            return (
              <div className="card p-6 lg:col-span-1">
                <h2 className="text-headline-md text-fg mb-5">Mentor Information</h2>
                {gridCols.length > 0 && (
                  <div className={`grid grid-cols-1 gap-y-5 ${bio ? 'mb-5' : ''}`}>
                    {gridCols.map(c => (
                      <DetailRow key={c.name} icon={iconFor(c.name)} label={c.name} value={resolveField(proj, c.name)} />
                    ))}
                  </div>
                )}
                {bio && (
                  <>
                    {gridCols.length > 0 && <div className="border-t border-border mb-5" />}
                    <div>
                      <p className="text-caption text-fg-muted mb-1.5">Main Mentor Write-up</p>
                      <p className="text-body-md text-fg leading-relaxed">{bio}</p>
                    </div>
                  </>
                )}
              </div>
            );
          })()}
      </div>

      {/* Archive project confirmation */}
      <Modal open={confirmArchive} onClose={() => setConfirmArchive(false)} labelledBy="archive-project-detail-title">
        <h2 id="archive-project-detail-title" className="text-headline-sm font-bold text-fg mb-1">Archive this project?</h2>
        <p className="text-body-sm text-fg-muted mb-4">
          This marks <strong>{proj.title}</strong> as no longer required. It will be hidden from applicants and excluded from matching. You can unarchive it later.
        </p>
        {proj.matched > 0 && (
          <div className="flex items-start gap-2 mb-4 px-3 py-2.5 bg-warning-bg border border-warning/20 rounded-xl">
            <AlertCircle size={15} className="text-warning shrink-0 mt-0.5" />
            <p className="text-body-sm text-fg">This project already has <strong>{proj.matched}</strong> matched intern{proj.matched !== 1 ? 's' : ''}. Archiving it won&apos;t affect them, but no new applicants can be placed.</p>
          </div>
        )}
        <label className="block text-[13px] font-semibold text-fg-muted mb-1">Reason for archiving <span className="text-danger">*</span></label>
        <textarea rows={3} value={archiveRemark} onChange={e => setArchiveRemark(e.target.value)}
          placeholder="e.g. Requirement withdrawn by PC; mentor no longer available…"
          className="w-full px-3 py-2 text-body-sm border border-border rounded-lg bg-bg-subtle resize-none focus:outline-none focus:ring-2 focus:ring-accent/30 mb-4" />
        <div className="flex justify-end gap-2">
          <Button variant="danger" disabled={!archiveRemark.trim()} onClick={() => { setConfirmArchive(false); setArchived(true, archiveRemark); }}>
            <XCircle size={14} /> Archive Project
          </Button>
          <Button variant="ghost" onClick={() => setConfirmArchive(false)}>Cancel</Button>
        </div>
      </Modal>

      {/* Assign to programme */}
      <Modal open={confirmAssign} onClose={() => setConfirmAssign(false)} labelledBy="assign-programme-title">
        <h2 id="assign-programme-title" className="text-headline-sm font-bold text-fg mb-1">Assign to a programme</h2>
        <p className="text-body-sm text-fg-muted mb-4">
          Select the programme <strong>{proj.title}</strong> belongs to. Once assigned, eligible applicants in that programme can be ranked and shortlisted for it.
        </p>
        <label className="block text-[13px] font-semibold text-fg-muted mb-1">Programme <span className="text-danger">*</span></label>
        <div className="mb-4">
          <SingleCombobox
            options={progOpts}
            value={assignProg}
            onChange={setAssignProg}
            placeholder="Search programme…"
          />
        </div>
        <div className="flex justify-end gap-2">
          <Button disabled={!assignProg} onClick={() => { setConfirmAssign(false); assignProgramme(assignProg); }}>
            <FolderPlus size={14} /> Assign
          </Button>
          <Button variant="ghost" onClick={() => setConfirmAssign(false)}>Cancel</Button>
        </div>
      </Modal>

      <Toast message={toast} />
    </Shell>
  );
}
