'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Shell from '@/components/layout/shell';
import { useRole } from '@/lib/role';
import {
  CheckCircle, CalendarClock, Briefcase, Bell,
  ChevronRight, FileText, ChevronDown, ChevronUp,
  Calendar, CalendarSearch, CheckCircle2, Clock, ClipboardCheck, ArrowRight,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import applicationsSeed from '@/data/applications.json';
import type { Application, ApplicationStatus, MyApplication } from '@/lib/types';
import { APPLICANT_STATUS_META } from '@/lib/applicant-status';
import { loadProgrammes, loadProjects } from '@/lib/storage';

/* ── Storage ─────────────────────────────────────────────────────────────── */
const MY_APPS_KEY     = 'dsta_my_applications';
const IO_APPS_KEY     = 'dsta_applications';
const IO_APPS_VER_KEY = 'dsta_applications_seed_v';
const IO_APPS_VER     = '31';
const DRAFT_PREFIX    = 'dsta_apply_draft_';

interface DraftInfo { programmeId: string; programmeName: string; step: number; savedAt: string; }
type Programme = ReturnType<typeof loadProgrammes>[number];

function loadMyApps(): MyApplication[] {
  try { const r = localStorage.getItem(MY_APPS_KEY); return r ? JSON.parse(r) : []; } catch { return []; }
}
function loadIoApps(): Application[] {
  try {
    const ver = localStorage.getItem(IO_APPS_VER_KEY);
    if (ver !== IO_APPS_VER) return applicationsSeed as Application[];
    const r = localStorage.getItem(IO_APPS_KEY);
    return r ? (JSON.parse(r) as Application[]) : (applicationsSeed as Application[]);
  } catch { return applicationsSeed as Application[]; }
}
function loadDrafts(programmes: Programme[]): DraftInfo[] {
  const progMap = new Map(programmes.map(p => [p.id, p.title]));
  const drafts: DraftInfo[] = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key?.startsWith(DRAFT_PREFIX)) continue;
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const d = JSON.parse(raw);
      if (!d.programmeId) continue;
      drafts.push({ programmeId: d.programmeId, programmeName: progMap.get(d.programmeId) ?? d.programmeId, step: d.step ?? 0, savedAt: d.savedAt ?? '' });
    }
  } catch {}
  return drafts;
}

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
}
function formatDate(iso: string) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-SG', { day: 'numeric', month: 'short', year: 'numeric' });
}

/* ── Application list row ────────────────────────────────────────────────── */
function AppRow({ app, ioApp, projectMap }: { app: MyApplication; ioApp?: Application; projectMap: Map<string, string> }) {
  const [expanded, setExpanded] = useState(false);
  const meta = APPLICANT_STATUS_META[app.status] ?? APPLICANT_STATUS_META['Pending Screening'];
  const Icon = meta.icon;
  const hasInterviewInvite = app.status === 'Shortlisted for Interview' &&
    (ioApp?.interviewSlots ?? []).length > 0 && ioApp?.confirmedSlot === undefined;

  return (
    <div className="border-b border-border last:border-0">
      <button
        type="button"
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-start gap-3 p-4 text-left hover:bg-bg-subtle/50 transition-colors"
      >
        <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border',
          hasInterviewInvite ? 'bg-warning-bg border-warning/30' : meta.bgColor)}>
          <Icon size={14} className={hasInterviewInvite ? 'text-warning' : meta.color} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-0.5">
            <p className="text-body-md font-semibold text-fg leading-snug">{app.programmeName}</p>
            {hasInterviewInvite ? (
              <span className="inline-flex items-center text-[12px] font-bold px-2 py-0.5 rounded-full border bg-warning-bg border-warning/30 text-warning">
                Interview Invitation
              </span>
            ) : (
              <span className={cn('inline-flex items-center text-[12px] font-bold px-2 py-0.5 rounded-full border', meta.bgColor, meta.color)}>
                {meta.label}
              </span>
            )}
          </div>
          <p className="text-body-sm text-fg-muted">Submitted {formatDate(app.submittedAt)}</p>
        </div>
        <div className="shrink-0 self-center text-fg-subtle">
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </div>
      </button>
      {expanded && app.projectPreferences.length > 0 && (
        <div className="px-4 py-3 bg-bg-subtle/50 border-t border-border">
          <p className="text-[12px] font-bold uppercase tracking-widest text-fg-subtle mb-2">Project Preferences</p>
          <div className="space-y-1.5">
            {app.projectPreferences.map((projId, i) => (
              <div key={projId} className="flex items-center gap-2 px-2.5 py-1.5 bg-surface rounded-lg border border-border">
                <div className="w-4 h-4 rounded-full bg-accent text-white text-[12px] font-black flex items-center justify-center shrink-0">{i + 1}</div>
                <p className="text-body-sm text-fg font-medium truncate">{projectMap.get(projId) ?? projId}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function DraftRow({ draft }: { draft: DraftInfo }) {
  const router = useRouter();
  return (
    <div className="flex items-center gap-3 p-4 border-b border-border last:border-0 hover:bg-bg-subtle/50 transition-colors">
      <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border bg-bg-subtle border-border">
        <FileText size={14} className="text-fg-muted" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <p className="text-body-md font-semibold text-fg truncate">{draft.programmeName}</p>
          <span className="text-[12px] font-bold px-2 py-0.5 rounded-full border bg-bg-subtle border-border text-fg-muted">Draft</span>
        </div>
        <p className="text-body-sm text-fg-muted">Last saved {formatDate(draft.savedAt)}</p>
      </div>
      <button onClick={() => router.push(`/apply/${draft.programmeId}`)}
        className="shrink-0 flex items-center gap-1 text-body-sm font-semibold text-accent hover:underline">
        Resume <ChevronRight size={13} />
      </button>
    </div>
  );
}

/* ── Task builder ────────────────────────────────────────────────────────── */
type TaskRow = { icon: LucideIcon; color: string; bg: string; label: string; sub: string; tag: string; tagCls: string; route: string; };

function buildTasks(ioApps: Application[]): TaskRow[] {
  const tasks: TaskRow[] = [];
  for (const a of ioApps) {
    if (a.status === 'Shortlisted for Interview' && (a.interviewSlots ?? []).length > 0 && a.confirmedSlot === undefined) {
      tasks.push({ icon: Bell, color: 'text-accent', bg: 'hover:bg-accent/5', label: 'Interview invitation received', sub: a.programmeName, tag: 'Action Required', tagCls: 'bg-warning-bg text-warning', route: '/apply/applications' });
    }
    if (a.status === 'Interview Scheduled') {
      tasks.push({ icon: CalendarClock, color: 'text-accent', bg: 'hover:bg-accent/5', label: 'Interview scheduled', sub: a.programmeName, tag: 'Upcoming', tagCls: 'bg-accent/10 text-accent', route: '/apply/applications' });
    }
    if (a.status === 'Offer Extended') {
      tasks.push({ icon: Briefcase, color: 'text-success', bg: 'hover:bg-success-bg', label: 'Internship offer extended', sub: a.programmeName, tag: 'Action Required', tagCls: 'bg-success/10 text-success', route: '/apply/applications' });
    }
    // After accepting the offer, the intern submits onboarding info (before the mentor activates them).
    if (a.status === 'Offer Accepted' && !a.onboarding) {
      tasks.push({ icon: ClipboardCheck, color: 'text-warning', bg: 'hover:bg-warning-bg', label: 'Submit onboarding information', sub: a.programmeName, tag: 'Action Required', tagCls: 'bg-warning-bg text-warning', route: '/apply/onboarding' });
    }
    if (a.status === 'Date Change Requested') {
      tasks.push({ icon: CalendarSearch, color: 'text-warning', bg: 'hover:bg-warning-bg', label: 'Start date change pending', sub: a.programmeName, tag: 'Pending', tagCls: 'bg-warning/10 text-warning', route: '/apply/applications' });
    }
  }
  return tasks;
}

/* ── Open Programmes landing (pre-application) ───────────────────────────── */
function OpenProgrammesLanding({ progs }: { progs: Programme[] }) {
  const { profile } = useRole();
  const router      = useRouter();
  return (
    <Shell activeRoute="/apply/dashboard">
      <div className="mb-8">
        <h1 className="text-headline-lg text-fg mb-1">Welcome, {profile.name.split(' ')[0]}.</h1>
        <p className="text-body-md text-fg-muted">Apply to a DSTA internship programme to get started.</p>
      </div>

      {progs.length === 0 ? (
        <div className="card p-12 text-center">
          <Clock size={36} className="text-fg-subtle mx-auto mb-3" />
          <p className="text-body-lg font-semibold text-fg mb-1">No programmes open right now</p>
          <p className="text-body-md text-fg-muted">Check back soon for upcoming internship programmes.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {progs.map(prog => {
            const daysLeft = prog.daysLeft ?? 0;
            const urgent   = daysLeft > 0 && daysLeft <= 7;
            return (
              <div key={prog.id} className="card p-5 flex flex-col gap-3 hover:shadow-md transition-shadow">
                <h2 className="text-headline-md text-fg leading-snug">{prog.title}</h2>
                {(prog as Programme & { description?: string }).description && (
                  <p className="text-body-sm text-fg-muted line-clamp-2">{(prog as Programme & { description?: string }).description}</p>
                )}
                <div className="flex flex-col gap-1 text-body-sm text-fg-muted">
                  <div className="flex items-center gap-2">
                    <Calendar size={13} className="shrink-0 text-fg-subtle" />
                    <span>Deadline: <span className="text-fg font-medium">
                      {prog.appDeadline ? new Date(prog.appDeadline).toLocaleDateString('en-SG', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                    </span></span>
                  </div>
                  {daysLeft > 0 && (
                    <div className={`flex items-center gap-2 ${urgent ? 'text-warning' : 'text-fg-muted'}`}>
                      <Clock size={13} className="shrink-0" />
                      <span className="font-medium">{daysLeft} day{daysLeft !== 1 ? 's' : ''} left</span>
                      {urgent && <span className="text-[12px] font-bold uppercase tracking-wide text-warning bg-warning/10 px-1.5 py-0.5 rounded-full">Closing soon</span>}
                    </div>
                  )}
                </div>
                <div className="mt-auto pt-1">
                  <button
                    onClick={() => router.push(`/apply/${prog.id}`)}
                    className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl bg-accent text-white text-body-sm font-semibold hover:bg-accent/90 transition-colors"
                  >
                    Apply Now <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Shell>
  );
}

/* ── Main ────────────────────────────────────────────────────────────────── */
export default function ApplicantDashboard() {
  const { profile } = useRole();
  const router      = useRouter();

  const [ioApps,     setIoApps]     = useState<Application[]>([]);
  const [myApps,     setMyApps]     = useState<MyApplication[]>([]);
  const [drafts,     setDrafts]     = useState<DraftInfo[]>([]);
  const [openProgs,  setOpenProgs]  = useState<Programme[]>([]);
  const [projectMap, setProjectMap] = useState<Map<string, string>>(new Map());
  const [dataLoaded, setDataLoaded] = useState(false);

  useEffect(() => {
    const projs = loadProjects();
    setProjectMap(new Map(projs.map(p => [p.id, p.title])));

    const allIo = loadIoApps();
    const myIo  = allIo.filter(a => a.email === profile.email);
    setIoApps(myIo);

    const loaded = loadMyApps();
    const myMap  = new Map(loaded.map(a => [a.id, a]));
    for (const io of myIo) {
      if (!myMap.has(io.id)) {
        myMap.set(io.id, { id: io.id, programmeId: io.programmeId, programmeName: io.programmeName,
          submittedAt: io.appliedDate, status: io.status, formValues: {}, projectPreferences: io.projectRankings });
      } else {
        const ex = myMap.get(io.id)!;
        if (ex.status !== io.status) myMap.set(io.id, { ...ex, status: io.status });
      }
    }
    // Scope to the current applicant: MY_APPS_KEY is a single global list, so prune any
    // rows synced under a different persona (only surfaces via the dev role-switcher).
    const myIds  = new Set(myIo.map(a => a.id));
    const synced = Array.from(myMap.values()).filter(a => myIds.has(a.id));
    setMyApps(synced);
    localStorage.setItem(MY_APPS_KEY, JSON.stringify(synced));

    const progs = loadProgrammes();
    const submittedProgIds = new Set(synced.map(a => a.programmeId));
    setDrafts(loadDrafts(progs).filter(d => !submittedProgIds.has(d.programmeId)));
    setOpenProgs(progs.filter(p => p.status === 'Active'));
    setDataLoaded(true);
  }, [profile.email]);

  if (!dataLoaded) return null;

  // Before any application — show open programmes landing
  if (myApps.length === 0 && ioApps.length === 0 && drafts.length === 0) {
    return <OpenProgrammesLanding progs={openProgs} />;
  }

  const tasks          = buildTasks(ioApps);
  const totalApps      = myApps.length + drafts.length;
  const appliedProgIds = new Set([...myApps.map(a => a.programmeId), ...drafts.map(d => d.programmeId)]);
  const newProgs       = openProgs.filter(p => !appliedProgIds.has(p.id));

  return (
    <Shell activeRoute="/apply/dashboard">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <div>
          <h1 className="text-headline-lg text-fg">{greeting()}, {profile.name.split(' ')[0]}</h1>
          <p className="text-body-md text-fg-muted mt-0.5">
            {tasks.length > 0
              ? `You have ${tasks.length} item${tasks.length !== 1 ? 's' : ''} requiring your attention.`
              : "Here's an overview of your applications."}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-4">

        {/* Left — My Applications */}
        <div className="col-span-12 lg:col-span-6 card p-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-headline-md text-fg">My Applications</h2>
            <button onClick={() => router.push('/apply/applications')}
              className="text-body-sm font-semibold text-accent hover:underline flex items-center gap-1">
              View all <ChevronRight size={13} />
            </button>
          </div>

          {totalApps === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center gap-2">
              <FileText size={32} className="text-fg-subtle" />
              <p className="text-body-md font-medium text-fg-muted">No applications yet</p>
              <p className="text-body-sm text-fg-subtle">Your submitted applications will appear here.</p>
            </div>
          ) : (
            <div className="divide-y divide-border -mx-4 -mb-4 border-t border-border mt-2">
              {drafts.map(d => <DraftRow key={d.programmeId} draft={d} />)}
              {(() => {
                const ioMap = new Map(ioApps.map(a => [a.id, a]));
                return myApps.map(a => <AppRow key={a.id} app={a} ioApp={ioMap.get(a.id)} projectMap={projectMap} />);
              })()}
            </div>
          )}
        </div>

        {/* Right — Tasks */}
        <div className="col-span-12 lg:col-span-6 card p-4 flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <h2 className="text-headline-md text-fg">Tasks</h2>
            {tasks.length > 0 && (
              <span className="bg-warning-bg text-warning text-caption-bold px-2.5 py-1 rounded-full">{tasks.length} Open</span>
            )}
          </div>

          {tasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center gap-2">
              <CheckCircle size={28} className="text-success" />
              <p className="text-body-md font-medium text-fg">All caught up</p>
              <p className="text-body-sm text-fg-muted">No pending actions right now.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {tasks.map((t, i) => (
                <button key={i} onClick={() => router.push(t.route)}
                  className={cn('w-full flex items-center gap-3 px-3 py-3 rounded-lg border border-border/50 transition-colors text-left', t.bg)}>
                  <t.icon size={18} className={cn(t.color, 'shrink-0')} />
                  <div className="flex-1 min-w-0">
                    <p className="text-body-md font-semibold text-fg truncate">{t.label}</p>
                    <p className="text-body-sm text-fg-muted mt-0.5 truncate">{t.sub}</p>
                  </div>
                  <span className={cn('text-[12px] font-bold px-2 py-0.5 rounded shrink-0', t.tagCls)}>{t.tag}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Bottom — Open Programmes (only when there are programmes not yet applied to) */}
        {newProgs.length > 0 && (
          <div className="col-span-12 card p-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-headline-md text-fg">Open for Applications</h2>
                <p className="text-body-sm text-fg-muted mt-0.5">Programmes you haven't applied to yet.</p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
              {newProgs.map(prog => {
                const daysLeft = prog.daysLeft ?? 0;
                const urgent   = daysLeft > 0 && daysLeft <= 7;
                return (
                  <div key={prog.id} className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl border border-border hover:border-accent/30 hover:bg-accent/5 transition-all group">
                    <div className="min-w-0">
                      <p className="text-body-md font-semibold text-fg truncate">{prog.title}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <Calendar size={12} className="text-fg-subtle shrink-0" />
                        <span className="text-body-sm text-fg-muted">
                          Closes {prog.appDeadline ? new Date(prog.appDeadline).toLocaleDateString('en-SG', { day: 'numeric', month: 'short' }) : '—'}
                        </span>
                        {urgent && (
                          <span className="text-[11px] font-bold text-warning bg-warning/10 px-1.5 py-0.5 rounded-full">Closing soon</span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => router.push(`/apply/${prog.id}`)}
                      className="shrink-0 flex items-center gap-1 text-body-sm font-semibold text-accent group-hover:gap-2 transition-all"
                    >
                      Apply <ArrowRight size={14} />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </div>
    </Shell>
  );
}
