'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Shell from '@/components/layout/shell';
import Button from '@/components/ui-legacy/button';
import Modal from '@/components/ui-legacy/modal';
import { Toast, useToast } from '@/components/ui-legacy/toast';
import {
  ChevronRight, ChevronLeft, UserCheck, UserX, CheckCircle2, AlertTriangle,
  ExternalLink, ListOrdered, Briefcase, Search, Users, Info, Layers, CalendarClock, ChevronDown,
} from 'lucide-react';
import AiSparkleIcon from '@/components/ui-legacy/ai-sparkle-icon';
import DocLink from '@/components/ui-legacy/doc-link';
import AiSummaryCard from '@/components/ui-legacy/ai-summary-card';
import { getEngagements } from '@/lib/participants';
import { cn } from '@/lib/utils';
import { loadWeights, reweightScore, scoreSuitability, availabilityWarnings, type ScoringWeights } from '@/lib/scoring';
import type { Application, ApplicationStatus, ProjectEntry, SuitabilityScore } from '@/lib/types';
import seedData from '@/data/applications.json';
import { loadProjects } from '@/lib/storage';
import { addNotification } from '@/lib/notifications';
import { useRole } from '@/lib/role';
import { logAccess } from '@/lib/audit';
import programmesJson from '@/data/programmes.json';

const PROG_NAME: Record<string, string> = Object.fromEntries(
  (programmesJson as { id: string; title: string }[]).map(p => [p.id, p.title]),
);

/* ── Storage (mirrors candidate360) ─────────────────────────────────────────── */
const APP_KEY      = 'dsta_applications';
const APP_VER_KEY  = 'dsta_applications_seed_v';
const APP_SEED_VER = '31';

function loadApps(): Application[] {
  try {
    const ver = localStorage.getItem(APP_VER_KEY);
    const raw = localStorage.getItem(APP_KEY);
    if (ver === APP_SEED_VER && raw) return (JSON.parse(raw) as Application[]).filter(a => a.id !== 'APP-7100');
    const existing: Application[] = (raw ? JSON.parse(raw) : []).filter((a: Application) => a.id !== 'APP-7100');
    const seed = seedData as Application[];
    const ids = new Set(existing.map(a => a.id));
    const merged = [...existing, ...seed.filter(a => !ids.has(a.id))];
    localStorage.setItem(APP_KEY, JSON.stringify(merged));
    localStorage.setItem(APP_VER_KEY, APP_SEED_VER);
    return merged;
  } catch { return seedData as Application[]; }
}

const PIPELINE_STATUSES = new Set<ApplicationStatus>([
  'Shortlisted for Interview', 'Interview Scheduled', 'Interview Completed',
]);
const SHORTLISTED_ONWARDS = new Set<ApplicationStatus>([
  'Shortlisted for Interview', 'Interview Scheduled', 'Interview Completed',
  'Offer Extended', 'Offer Accepted', 'Active Intern', 'Internship Completed',
]);

function scoreCls(score: number | null) {
  if (score === null) return 'text-fg-subtle';
  return score >= 80 ? 'text-success' : score >= 60 ? 'text-accent' : score >= 40 ? 'text-warning' : 'text-danger';
}

export default function ShortlistPage() {
  const params = useParams<{ id: string }>();
  const id     = params.id;
  const router = useRouter();
  const { toast, showToast } = useToast();

  const [apps,     setApps]     = useState<Application[]>([]);
  const [projects, setProjects] = useState<ProjectEntry[]>([]);
  const [weights,  setWeights]  = useState<ScoringWeights>({ discipline: 50, skills: 30, standing: 20 });
  const [rejectOpen,   setRejectOpen]   = useState(false);
  const [rejectRemark, setRejectRemark] = useState('');
  const [otherSearch,  setOtherSearch]  = useState('');
  const [otherOpen,    setOtherOpen]    = useState(false);
  const [confirmId,    setConfirmId]    = useState<string | null>(null);
  const [overrideReason, setOverrideReason] = useState('');
  const { profile } = useRole();

  useEffect(() => {
    setApps(loadApps());
    setProjects(loadProjects());
    setWeights(loadWeights());
  }, []);

  const app = apps.find(a => a.id === id);
  const engagements = useMemo(() => (app ? getEngagements(app.email) : []), [app?.email]); // eslint-disable-line react-hooks/exhaustive-deps

  /* Slots already reserved / in pipeline, to compute true open slots */
  const reservedByProject = useMemo<Record<string, number>>(() => {
    const c: Record<string, number> = {};
    for (const a of apps) { if (a.shortlistedFor && a.status === 'Offer Extended') c[a.shortlistedFor] = (c[a.shortlistedFor] ?? 0) + 1; }
    return c;
  }, [apps]);
  const pipelineByProject = useMemo<Record<string, number>>(() => {
    const c: Record<string, number> = {};
    for (const a of apps) { if (a.shortlistedFor && PIPELINE_STATUSES.has(a.status)) c[a.shortlistedFor] = (c[a.shortlistedFor] ?? 0) + 1; }
    return c;
  }, [apps]);

  /* How many applicants ranked each project #1 ("applied" = first choice) */
  const firstChoiceByProject = useMemo<Record<string, number>>(() => {
    const c: Record<string, number> = {};
    for (const a of apps) { const first = a.projectRankings?.[0]; if (first) c[first] = (c[first] ?? 0) + 1; }
    return c;
  }, [apps]);

  /* Projects this applicant can be shortlisted to: same programme, not yet confirmed */
  type ShortRow = { project: ProjectEntry; open: number; pipeline: number; demand: number; score: number | null; sui?: SuitabilityScore };
  const shortlistable = useMemo<ShortRow[]>(() => {
    if (!app) return [];
    return projects
      .filter(p => p.status !== 'confirmed' && p.programme === app.programmeId && !p.archived)
      .map(p => {
        // Use the pre-computed score if present, else compute it live (e.g. projects
        // added after the applicant was screened) so every project is scored.
        const s = app.suitabilityScores.find(x => x.projectId === p.id) ?? scoreSuitability(app, p);
        return {
          project:  p,
          open:     Math.max(0, p.slots - p.matched - (reservedByProject[p.id] ?? 0)),
          pipeline: pipelineByProject[p.id] ?? 0,
          demand:   firstChoiceByProject[p.id] ?? 0,
          score:    Math.round(reweightScore(s, weights)),
          sui:      s,
        };
      })
      .sort((a, b) => (b.score ?? -1) - (a.score ?? -1));
  }, [app, projects, reservedByProject, pipelineByProject, firstChoiceByProject, weights]);

  // AI top-fit = highest-scored shortlistable project (the list is sorted by score).
  const aiTopId = shortlistable[0]?.project.id;
  // Reset the override reason whenever the confirm dialog closes.
  useEffect(() => { if (confirmId === null) setOverrideReason(''); }, [confirmId]);

  /* Their ranked preferences first, then the remaining open projects */
  const rankedPrefs = useMemo(() => {
    if (!app) return [];
    return app.projectRankings
      .map(pid => shortlistable.find(x => x.project.id === pid))
      .filter((x): x is NonNullable<typeof x> => Boolean(x));
  }, [app, shortlistable]);
  const otherProjects = useMemo(() => {
    if (!app) return [];
    let list = shortlistable.filter(x => !app.projectRankings.includes(x.project.id));
    const q = otherSearch.trim().toLowerCase();
    if (q) {
      list = list.filter(x =>
        x.project.title.toLowerCase().includes(q) ||
        x.project.mentor.toLowerCase().includes(q) ||
        (x.project.techDomain ?? '').toLowerCase().includes(q) ||
        (x.project.skills ?? []).some(s => s.toLowerCase().includes(q)),
      );
    }
    return list; // already sorted by score
  }, [app, shortlistable, otherSearch]);
  const otherTotal = useMemo(
    () => (app ? shortlistable.filter(x => !app.projectRankings.includes(x.project.id)).length : 0),
    [app, shortlistable],
  );

  function saveApp(updated: Application) {
    const next = apps.map(a => a.id === updated.id ? updated : a);
    setApps(next);
    localStorage.setItem(APP_KEY, JSON.stringify(next));
    localStorage.setItem(APP_VER_KEY, APP_SEED_VER);
  }

  function doShortlist(projectId: string) {
    if (!app) return;
    const today = new Date().toISOString().split('T')[0];
    const actor = `${profile.name} (${profile.title})`;
    const isOverride = !!aiTopId && projectId !== aiTopId;
    const matchOverride = isOverride
      ? { chosen: projectId, topFit: aiTopId!, reason: overrideReason.trim(), by: actor, date: today }
      : undefined;
    saveApp({ ...app, status: 'Shortlisted for Interview', shortlistedFor: projectId, ...(matchOverride ? { matchOverride } : {}) });
    if (isOverride) {
      const topTitle    = projects.find(p => p.id === aiTopId)?.title ?? aiTopId;
      const chosenTitle = projects.find(p => p.id === projectId)?.title ?? projectId;
      logAccess({ actor, action: 'decision', detail: `Shortlist override — chose "${chosenTitle}" over AI top fit "${topTitle}": ${overrideReason.trim()}`, subjectId: app.id });
    }
    const proj = projects.find(p => p.id === projectId);
    addNotification({
      forRole: 'mentor',
      ...(proj?.mentorUserId ? { forMentorId: proj.mentorUserId } : {}),
      title: `New applicant shortlisted — ${proj?.title ?? 'your project'}`,
      body:  `${app.name} has been shortlisted for your project "${proj?.title ?? projectId}". Please set your interview availability.`,
      href:  '/mentor/projects',
      tier:  'action',
    });
    showToast(`${app.name} shortlisted for ${proj?.title ?? 'interview'}.`);
  }

  function doReject() {
    if (!app) return;
    const today = new Date().toISOString().split('T')[0];
    saveApp({ ...app, status: 'Rejected', ioRejectionRemark: rejectRemark, rejectionEmailSent: true, rejectionEmailSentDate: today });
    setRejectOpen(false);
    showToast(`${app.name} rejected. Notification sent to ${app.email}.`);
  }

  /* Open a project from its perspective (same as clicking a record in the Projects tab) */
  function openProject(pid: string) {
    const p = projects.find(x => x.id === pid);
    if (p) localStorage.setItem('dsta_project_view', JSON.stringify(p));
    router.push(`/projects/${pid}`);
  }

  if (apps.length > 0 && !app) {
    return (
      <Shell activeRoute="/applications">
        <div className="card p-10 text-center">
          <p className="text-body-md text-fg-muted mb-4">Applicant not found.</p>
          <Button variant="outline" onClick={() => router.push('/applications')}>
            <ChevronLeft size={15} /> Back to Applications
          </Button>
        </div>
      </Shell>
    );
  }
  if (!app) return <Shell activeRoute="/applications"><div className="p-10" /></Shell>;

  const isPending  = app.status === 'Pending Review';
  const isPipeline = SHORTLISTED_ONWARDS.has(app.status);
  const placed     = app.shortlistedFor ? projects.find(p => p.id === app.shortlistedFor) : null;
  const placedScoreRaw = app.suitabilityScores.find(s => s.projectId === app.shortlistedFor);
  const placedScore    = placedScoreRaw ? Math.round(reweightScore(placedScoreRaw, weights)) : null;

  /* A compact project card — info grouped tightly; suitability + Shortlist share the footer */
  const ProjectCard = ({ project, open, pipeline, demand, score, sui, ranked }: ShortRow & { ranked?: number }) => {
    const full = open <= 0;
    const availWarnings = availabilityWarnings(app, project);
    return (
      <div className="flex flex-col border border-border rounded-xl bg-surface p-4 hover:border-accent/40 transition-colors">
        {/* Title row */}
        <div className="flex items-start gap-2">
          {ranked !== undefined && (
            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-accent/10 text-accent text-[11px] font-bold shrink-0 mt-0.5">{ranked}</span>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-body-md font-semibold text-fg leading-snug line-clamp-2">{project.title}</p>
            <p className="text-body-sm text-fg-muted truncate mt-0.5">
              {project.mentor}{project.techDomain ? ` · ${project.techDomain}` : ''}
            </p>
          </div>
        </div>

        {/* Capacity & demand */}
        <div className="flex flex-wrap items-center gap-1.5 mt-3">
          <span className={cn(
            'inline-flex items-center gap-1 text-[12px] font-semibold px-2 py-0.5 rounded-full border',
            full ? 'bg-danger-bg text-danger border-danger/30' : 'bg-success-bg text-success border-success/30',
          )}>
            <span className={cn('w-1.5 h-1.5 rounded-full', full ? 'bg-danger' : 'bg-success')} />
            {full ? 'No slots open' : `${open} slot${open !== 1 ? 's' : ''} open`}
          </span>
          {pipeline > 0 && (
            <span className="inline-flex items-center gap-1 text-[12px] font-semibold px-2 py-0.5 rounded-full bg-warning-bg text-warning border border-warning/30">
              <CalendarClock size={11} />{pipeline} interviewing
            </span>
          )}
          <button
            type="button"
            onClick={() => openProject(project.id)}
            title="Applicants who ranked this project as their 1st choice — open the project to see them"
            className="inline-flex items-center gap-1 text-[12px] font-semibold px-2 py-0.5 rounded-full bg-bg-subtle text-fg-muted border border-border hover:border-accent/40 hover:text-accent transition-colors"
          >
            <Users size={11} />{demand} applied <ChevronRight size={11} />
          </button>
        </div>

        {/* Availability soft-warnings (TOA-027/078) — duration / blackout mismatch */}
        {availWarnings.length > 0 && (
          <div className="mt-2 flex flex-col gap-1">
            {availWarnings.map(w => (
              <span key={w} className="inline-flex items-start gap-1 text-[12px] font-medium text-warning">
                <AlertTriangle size={11} className="mt-0.5 shrink-0" />{w}
              </span>
            ))}
          </div>
        )}

        {/* Footer — suitability + action together */}
        <div className="flex items-center justify-between gap-2 mt-3 pt-3 border-t border-border">
          {score !== null ? (
            <div className="relative group/score cursor-help flex items-baseline gap-1.5">
              <span className={cn('text-headline-sm font-bold tabular-nums leading-none', scoreCls(score))}>{score}%</span>
              <span className="inline-flex items-center gap-0.5 text-[11px] text-fg-subtle">
                <AiSparkleIcon size={9} /> Project suitability
              </span>
              <span className="pointer-events-none absolute bottom-full left-0 mb-2 z-50 w-72 rounded-lg bg-fg/95 text-surface text-[12px] leading-relaxed px-3 py-2.5 shadow-xl opacity-0 group-hover/score:opacity-100 transition-opacity duration-150 text-left space-y-1">
                <span className="block font-bold text-surface">Suitability breakdown</span>
                {sui?.disciplineScore != null && (
                  <span className="flex items-center justify-between gap-3">
                    <span className="text-surface/75">Discipline of study · {weights.discipline}%</span>
                    <span className="font-bold tabular-nums">{sui.disciplineScore}</span>
                  </span>
                )}
                {sui?.skillsScore != null && (
                  <span className="flex items-center justify-between gap-3">
                    <span className="text-surface/75">Skills · {weights.skills}%</span>
                    <span className="font-bold tabular-nums">{sui.skillsScore}</span>
                  </span>
                )}
                {sui?.standingScore != null && (
                  <span className="flex items-center justify-between gap-3">
                    <span className="text-surface/75">Standing · {weights.standing}%</span>
                    <span className="font-bold tabular-nums">{sui.standingScore}</span>
                  </span>
                )}
                <span className="flex items-center justify-between gap-3 pt-1 mt-1 border-t border-surface/20">
                  <span className="font-semibold">Suitability{sui?.confidence ? ` · ${sui.confidence} confidence` : ''}</span>
                  <span className="font-black tabular-nums">{score}</span>
                </span>
                {sui?.reasoning && <span className="block mt-1 text-surface/70">{sui.reasoning}</span>}
                <span className="block text-surface/50">AI-estimated — may not always be accurate.</span>
              </span>
            </div>
          ) : <span className="text-[12px] text-fg-subtle">No project suitability score</span>}
          <Button size="sm" disabled={full} onClick={() => setConfirmId(project.id)} className="shrink-0">
            <UserCheck size={13} /> Shortlist
          </Button>
        </div>
      </div>
    );
  };

  return (
    <Shell activeRoute="/applications">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 mb-4 text-label-md">
        <span className="text-fg-muted cursor-pointer hover:text-accent transition-colors" onClick={() => router.push('/applications')}>Applications</span>
        <ChevronRight size={16} className="text-fg-subtle" />
        <span className="text-fg truncate max-w-[220px]">{app.name}</span>
      </nav>

      {/* Header banner + AI summary — side by side, equal height */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch mb-4">
        <div className="card p-5">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h1 className="text-headline-lg text-fg">{app.name}</h1>
              {app.eligibilityPass ? (
                <span className="inline-flex items-center gap-1 text-[12px] font-bold px-2 py-0.5 rounded-full bg-success-bg text-success border border-success/30">
                  <CheckCircle2 size={11} /> Eligible
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[12px] font-bold px-2 py-0.5 rounded-full bg-warning-bg text-warning border border-warning/30">
                  <AlertTriangle size={11} /> Review eligibility
                </span>
              )}
            </div>
            <p className="flex items-center gap-1.5 text-body-md text-fg-muted mt-1">
              <Layers size={14} className="text-accent shrink-0" />
              Applying to <span className="font-semibold text-fg">{PROG_NAME[app.programmeId] ?? app.programmeId}</span>
            </p>
            {/* Uploaded documents — view / download */}
            <div className="flex flex-wrap items-center gap-2 mt-3">
              <DocLink label="CV" name={app.cvFileName} data={app.cvFileData} />
              <DocLink label="Transcript" name={app.transcriptFileName} data={app.transcriptFileData} />
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button variant="outline" onClick={() => router.push(`/candidate360/${app.id}?from=shortlist`)}>
              <ExternalLink size={14} /> Candidate 360
            </Button>
          </div>
        </div>
      </div>
        <AiSummaryCard app={app} engagements={engagements} />
      </div>

      {/* Body */}
      {isPipeline ? (
        /* Already shortlisted / in pipeline */
        <div className="card p-5">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center shrink-0">
              <CheckCircle2 size={20} className="text-success" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-headline-md text-fg">Already shortlisted</h2>
              <p className="text-body-sm text-fg-muted mt-0.5">
                {app.name} is shortlisted for <span className="font-semibold text-fg">{placed?.title ?? app.shortlistedFor}</span>
                {placedScore !== null && <> · <span className={cn('font-bold', scoreCls(placedScore))}>{placedScore}%</span> project suitability</>}.
                Current status: <span className="font-medium text-fg">{app.status}</span>.
              </p>
              <div className="mt-3">
                <Button variant="outline" size="sm" onClick={() => router.push(`/candidate360/${app.id}?from=shortlist`)}>
                  <ExternalLink size={13} /> Candidate 360
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : isPending ? (
        <>
          {!app.eligibilityPass && (
            <div className="flex items-start gap-2 mb-4 px-4 py-2.5 rounded-lg bg-warning-bg border border-warning/30">
              <AlertTriangle size={14} className="text-warning shrink-0 mt-0.5" />
              <p className="text-body-sm text-warning">This applicant did not meet all preferred criteria — review before shortlisting.</p>
            </div>
          )}

          {/* Their ranked preferences */}
          <div className="card p-5 mb-4">
            <div className="flex items-center gap-2 mb-1">
              <ListOrdered size={15} className="text-accent" />
              <h2 className="text-headline-md text-fg">Applicant&apos;s ranked projects</h2>
            </div>
            <p className="text-body-sm text-fg-muted mb-1.5">
              Pick the project to shortlist {app.name.split(' ')[0]} for an interview. Each shows open slots, applicant demand, and a project suitability score.
            </p>
            <p className="flex items-start gap-1.5 text-[12px] text-fg-subtle mb-4">
              <Info size={12} className="shrink-0 mt-0.5" />
              Project suitability is AI-estimated from discipline &amp; skills — a guide, not a decision. Hover a score for the breakdown.
            </p>
            {rankedPrefs.length > 0 ? (
              <div className="space-y-2.5">
                {rankedPrefs.map((x, i) => <ProjectCard key={x.project.id} {...x} ranked={i + 1} />)}
              </div>
            ) : (
              <p className="text-body-sm text-fg-muted">This applicant did not rank any project still open in this programme.</p>
            )}
          </div>

          {/* Other open projects — collapsed by default to keep the ranked picks in focus */}
          {otherTotal > 0 && (
            <div className="card p-0 overflow-hidden">
              <button
                type="button"
                onClick={() => setOtherOpen(o => !o)}
                className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-bg-subtle/50 transition-colors"
              >
                <ChevronDown size={18} className={cn('text-fg-muted shrink-0 transition-transform', otherOpen && 'rotate-180')} />
                <div className="flex-1 min-w-0">
                  <h2 className="text-headline-md text-fg">Other open projects <span className="text-fg-subtle font-normal">· {otherTotal}</span></h2>
                  <p className="text-body-sm text-fg-muted">Projects they didn&apos;t rank — {otherOpen ? 'sorted by project suitability.' : 'expand to browse or search the full pool.'}</p>
                </div>
                {!otherOpen && <span className="text-[13px] font-semibold text-accent shrink-0">Browse</span>}
              </button>

              {otherOpen && (
                <div className="px-5 pb-5 border-t border-border pt-4">
                  {otherTotal > 6 && (
                    <div className="relative mb-3">
                      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-subtle pointer-events-none" />
                      <input
                        type="text"
                        value={otherSearch}
                        onChange={e => setOtherSearch(e.target.value)}
                        placeholder="Search by title, mentor, domain, or skill…"
                        className="w-full pl-8 pr-3 py-2 rounded-lg border border-border bg-surface text-body-sm text-fg outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all placeholder:text-fg-muted"
                      />
                    </div>
                  )}
                  {otherProjects.length > 0 ? (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 max-h-[460px] overflow-y-auto pr-1">
                      {otherProjects.map(x => <ProjectCard key={x.project.id} {...x} />)}
                    </div>
                  ) : (
                    <p className="text-center py-6 text-body-sm text-fg-muted">No projects match &ldquo;{otherSearch}&rdquo;.</p>
                  )}
                </div>
              )}
            </div>
          )}
        </>
      ) : (
        /* Any other status (rejected, offer declined, etc.) */
        <div className="card p-5">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-bg-subtle flex items-center justify-center shrink-0">
              <Briefcase size={20} className="text-fg-muted" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-headline-md text-fg">Not awaiting a shortlist decision</h2>
              <p className="text-body-sm text-fg-muted mt-0.5">
                This application is currently <span className="font-medium text-fg">{app.status}</span>. Open Candidate 360 to review or manage it.
              </p>
              <div className="mt-3">
                <Button variant="outline" size="sm" onClick={() => router.push(`/candidate360/${app.id}?from=shortlist`)}>
                  <ExternalLink size={13} /> Candidate 360
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sticky footer — terminal Reject action, kept out of the header */}
      {isPending && (
        <>
          <div className="h-20" />
          <div className="fixed bottom-0 md:left-[112px] left-0 right-0 z-20 bg-surface border-t border-border px-6 py-3.5 flex items-center justify-end gap-4">
            <Button variant="danger" onClick={() => { setRejectRemark(''); setRejectOpen(true); }}>
              <UserX size={14} /> Reject Applicant
            </Button>
          </div>
        </>
      )}

      {/* Shortlist confirmation modal */}
      <Modal open={confirmId !== null} onClose={() => setConfirmId(null)} maxWidth="sm" labelledBy="shortlist-confirm-title">
        <h2 id="shortlist-confirm-title" className="text-headline-md text-fg mb-2">Shortlist for interview?</h2>
        <p className="text-body-md text-fg-muted mb-4">
          Shortlist <span className="font-semibold text-fg">{app.name}</span> for{' '}
          <span className="font-semibold text-fg">{projects.find(p => p.id === confirmId)?.title ?? 'this project'}</span>.
          This moves them to the interview stage and notifies the mentor to set their availability.
        </p>
        {/* TOA-084: overriding the AI top fit requires a logged justification. */}
        {!!aiTopId && confirmId !== aiTopId && (
          <div className="mb-5">
            <div className="flex items-start gap-2 px-3 py-2.5 bg-warning-bg border border-warning/20 rounded-xl mb-3">
              <AlertTriangle size={13} className="text-warning mt-0.5 shrink-0" />
              <p className="text-body-sm text-fg-muted">
                This isn&apos;t the AI top match — <span className="font-semibold text-fg">{projects.find(p => p.id === aiTopId)?.title ?? aiTopId}</span> scored highest.
                Please record why you&apos;re overriding it.
              </p>
            </div>
            <label className="block text-[12px] font-bold uppercase tracking-widest text-fg-subtle mb-1.5">Override justification <span className="text-danger">*</span></label>
            <textarea
              rows={2} value={overrideReason} onChange={e => setOverrideReason(e.target.value)}
              placeholder="e.g. Stronger skills fit for this team; candidate's stated interest; availability aligns better."
              className="w-full rounded-xl border border-border bg-bg-subtle px-3 py-2 text-body-sm text-fg resize-none focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
            />
          </div>
        )}
        <div className="flex justify-end gap-2">
          <Button
            disabled={!!aiTopId && confirmId !== aiTopId && !overrideReason.trim()}
            onClick={() => { if (confirmId) doShortlist(confirmId); setConfirmId(null); }}
          >
            <UserCheck size={14} /> Confirm Shortlist
          </Button>
          <Button variant="ghost" onClick={() => setConfirmId(null)}>Cancel</Button>
        </div>
      </Modal>

      {/* Reject modal */}
      <Modal open={rejectOpen} onClose={() => setRejectOpen(false)} maxWidth="sm" labelledBy="reject-applicant-title">
        <h2 id="reject-applicant-title" className="text-headline-md text-fg mb-2">Reject {app.name}?</h2>
        <p className="text-body-md text-fg-muted mb-4">A rejection notification will be sent to {app.email}.</p>
        <label className="block text-label-sm text-fg mb-1">Reason <span className="text-danger">*</span></label>
        <textarea
          rows={3}
          className="w-full rounded-lg border border-border bg-bg-subtle px-3 py-2 text-body-md text-fg resize-none focus:outline-none focus:ring-2 focus:ring-accent/30 mb-4"
          placeholder="Brief reason for rejection…"
          value={rejectRemark}
          onChange={e => setRejectRemark(e.target.value)}
        />
        <div className="flex justify-end gap-2">
          <Button variant="danger" disabled={!rejectRemark.trim()} onClick={doReject}>
            <UserX size={14} /> Reject Applicant
          </Button>
          <Button variant="ghost" onClick={() => setRejectOpen(false)}>Cancel</Button>
        </div>
      </Modal>

      <Toast message={toast} />
    </Shell>
  );
}
