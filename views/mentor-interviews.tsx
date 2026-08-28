'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Shell from '@/components/layout/shell';
import { CalendarClock, Clock, ChevronRight, ChevronDown, Check, X } from 'lucide-react';
import { cn, mentorIdMatches } from '@/lib/utils';
import { useRole } from '@/lib/role';
import type { Application, ProjectEntry } from '@/lib/types';
import { loadProjects } from '@/lib/storage';
import seedData from '@/data/applications.json';

/* ── Storage ───────────────────────────────────────────────────────────────── */
const APP_KEY      = 'dsta_applications';
const APP_VER_KEY  = 'dsta_applications_seed_v';
const APP_SEED_VER = '31';

function loadApps(): Application[] {
  try {
    const ver = localStorage.getItem(APP_VER_KEY);
    const raw = localStorage.getItem(APP_KEY);
    if (ver === APP_SEED_VER && raw) return JSON.parse(raw) as Application[];
    const existing: Application[] = raw ? JSON.parse(raw) : [];
    const seedArr = seedData as Application[];
    const eIds = new Set(existing.map((a: Application) => a.id));
    const merged = [...existing, ...seedArr.filter((a: Application) => !eIds.has(a.id))];
    localStorage.setItem(APP_KEY, JSON.stringify(merged));
    localStorage.setItem(APP_VER_KEY, APP_SEED_VER);
    return merged;
  } catch { return seedData as Application[]; }
}

/* ── Scoring ───────────────────────────────────────────────────────────────── */
const SCORE_ATTRS = [
  { key: 'technicalKnowledge' as const },
  { key: 'problemSolving'     as const },
  { key: 'communication'      as const },
  { key: 'initiativeDrive'    as const },
] as const;
type ScoreKey = typeof SCORE_ATTRS[number]['key'];
type Scores   = Record<ScoreKey, number>;

function avgScore(s: Scores): number {
  const v = Object.values(s);
  return v.reduce((a, b) => a + b, 0) / v.length;
}
function scoreColor(v: number) {
  return v >= 8 ? 'text-success' : v >= 6 ? 'text-accent' : v >= 4 ? 'text-warning' : 'text-danger';
}

/* ── Helpers ───────────────────────────────────────────────────────────────── */
function fmtSlot(slot: { date: string; time: string; duration?: string }): string {
  const d       = new Date(slot.date + 'T00:00:00');
  const dateStr = d.toLocaleDateString('en-SG', { weekday: 'short', day: 'numeric', month: 'short' });
  const [h, m]  = slot.time.split(':').map(Number);
  const suffix  = h >= 12 ? 'PM' : 'AM';
  const timeStr = `${h % 12 || 12}:${String(m).padStart(2, '0')} ${suffix}`;
  return slot.duration ? `${dateStr} · ${timeStr} (${slot.duration})` : `${dateStr} · ${timeStr}`;
}

function slotDateTime(slot: { date: string; time: string }) {
  return new Date(`${slot.date}T${slot.time}`);
}

function TimeChip({ slot }: { slot: { date: string; time: string } }) {
  const now    = new Date();
  const dt     = slotDateTime(slot);
  const diffMs = dt.getTime() - now.getTime();
  const diffH  = diffMs / (1000 * 60 * 60);
  const isToday = dt.toDateString() === now.toDateString();

  if (diffMs < 0)           return <span className="text-[12px] font-bold px-1.5 py-0.5 rounded bg-warning-bg text-warning">Overdue</span>;
  if (isToday && diffH < 1) return <span className="text-[12px] font-bold px-1.5 py-0.5 rounded bg-danger-bg text-danger">Starting soon</span>;
  if (isToday)              return <span className="text-[12px] font-bold px-1.5 py-0.5 rounded bg-accent/10 text-accent">Today</span>;
  return null;
}

/* ── Interview row ─────────────────────────────────────────────────────────── */
function InterviewRow({
  app, projectTitle, section, onClick,
}: {
  app:          Application;
  projectTitle: string;
  section:      'upcoming' | 'eval' | 'completed';
  onClick:      () => void;
}) {
  const slot = app.interviewSlots?.[app.confirmedSlot ?? -1];
  const avg  = app.mentorScores ? avgScore(app.mentorScores as Scores) : null;

  return (
    <div
      onClick={onClick}
      className="flex items-center gap-4 px-5 py-3.5 border-b border-border/60 last:border-b-0 cursor-pointer hover:bg-bg-subtle/50 group transition-colors"
    >
      <div className={cn(
        'w-2 h-2 rounded-full shrink-0',
        section === 'upcoming'  ? 'bg-accent'
        : section === 'eval'    ? 'bg-warning'
        : 'bg-fg-subtle',
      )} />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-3 mb-0.5">
          <p className={cn('text-body-md font-semibold truncate', section === 'completed' ? 'text-fg-muted' : 'text-fg')}>{app.name}</p>
          {section === 'completed' && app.mentorDecision && (
            <span className={cn(
              'inline-flex items-center gap-1 text-[12px] font-bold px-2 py-0.5 rounded-full shrink-0',
              app.mentorDecision === 'Accepted'
                ? 'bg-success-bg text-success'
                : 'bg-danger-bg text-danger',
            )}>
              {app.mentorDecision === 'Accepted'
                ? <><Check size={9} />Accepted</>
                : <><X size={9} />Rejected</>}
            </span>
          )}
        </div>
        <p className="text-body-sm text-fg-muted truncate">{projectTitle}</p>
        {slot && (
          <p className="text-[13px] text-fg-subtle mt-0.5 flex items-center gap-1">
            <Clock size={9} className="shrink-0" />{fmtSlot(slot)}
          </p>
        )}
      </div>

      <div className="flex items-center gap-3 shrink-0">
        {avg !== null ? (
          <span className={cn('text-body-md font-black tabular-nums', section === 'completed' ? 'text-fg-muted' : scoreColor(avg))}>
            {avg.toFixed(1)}<span className="text-body-sm font-normal text-fg-muted ml-0.5">/ 10</span>
          </span>
        ) : slot && section === 'upcoming' ? (
          <TimeChip slot={slot} />
        ) : null}
        <ChevronRight size={15} className="text-fg-subtle group-hover:text-fg-muted transition-colors" />
      </div>
    </div>
  );
}

/* ── Main page ─────────────────────────────────────────────────────────────── */
export default function MentorInterviewsPage() {
  const { profile } = useRole();
  const router      = useRouter();

  const [apps,     setApps]     = useState<Application[]>([]);
  const [projects, setProjects] = useState<ProjectEntry[]>([]);

  useEffect(() => {
    setApps(loadApps());
    setProjects(loadProjects());
  }, []);

  const mentorPrefix = profile.email.split('@')[0];
  const myProjectIds = useMemo(
    () => new Set(
      projects
        .filter(p => mentorIdMatches(p.mentorUserId, profile.email))
        .map(p => p.id)
    ),
    [projects, mentorPrefix, profile.email]
  );

  const upcoming = useMemo(() =>
    apps
      .filter(a =>
        a.shortlistedFor &&
        myProjectIds.has(a.shortlistedFor) &&
        a.status === 'Interview Scheduled' &&
        a.confirmedSlot !== undefined
      )
      .sort((a, b) => {
        const sa = a.interviewSlots?.[a.confirmedSlot!];
        const sb = b.interviewSlots?.[b.confirmedSlot!];
        if (!sa || !sb) return 0;
        return slotDateTime(sa).getTime() - slotDateTime(sb).getTime();
      }),
  [apps, myProjectIds]);

  const needsEval = useMemo(() =>
    apps
      .filter(a =>
        a.shortlistedFor &&
        myProjectIds.has(a.shortlistedFor) &&
        a.status === 'Interview Completed' &&
        !a.mentorDecision
      )
      .sort((a, b) => {
        const sa = a.interviewSlots?.[a.confirmedSlot!];
        const sb = b.interviewSlots?.[b.confirmedSlot!];
        if (!sa || !sb) return 0;
        return slotDateTime(sa).getTime() - slotDateTime(sb).getTime();
      }),
  [apps, myProjectIds]);

  const completed = useMemo(() =>
    apps
      .filter(a =>
        a.shortlistedFor &&
        myProjectIds.has(a.shortlistedFor) &&
        (
          (a.status === 'Interview Completed' && !!a.mentorDecision) ||
          a.status === 'Offer Extended' ||
          a.status === 'Offer Accepted'
        )
      )
      .sort((a, b) => {
        const sa = a.interviewSlots?.[a.confirmedSlot!];
        const sb = b.interviewSlots?.[b.confirmedSlot!];
        if (!sa || !sb) return 0;
        return slotDateTime(sb).getTime() - slotDateTime(sa).getTime(); // newest first
      }),
  [apps, myProjectIds]);

  const [completedOpen, setCompletedOpen] = useState(false);

  const hasAny = upcoming.length > 0 || needsEval.length > 0 || completed.length > 0;

  return (
    <Shell activeRoute="/mentor/interviews">
      <div className="mb-5">
        <h1 className="text-headline-lg text-fg mb-1">Interviews</h1>
      </div>

      {!hasAny ? (
        <div className="rounded-2xl border border-border bg-surface p-12 text-center">
          <CalendarClock size={36} className="text-fg-subtle mx-auto mb-3" />
          <p className="text-body-lg font-semibold text-fg mb-1">All caught up</p>
          <p className="text-body-md text-fg-muted">No interviews scheduled or evaluations pending.</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-border bg-surface overflow-hidden">

          {upcoming.length > 0 && (
            <div>
              <div className="px-5 py-2.5 bg-bg-subtle/50 border-b border-border">
                <p className="text-[12px] font-bold uppercase tracking-widest text-fg-subtle">
                  Upcoming Interview · {upcoming.length}
                </p>
              </div>
              {upcoming.map(app => (
                <InterviewRow
                  key={app.id}
                  app={app}
                  projectTitle={projects.find(p => p.id === app.shortlistedFor)?.title ?? ''}
                  section="upcoming"
                  onClick={() => router.push(`/mentor/interviews/${app.id}`)}
                />
              ))}
            </div>
          )}

          {needsEval.length > 0 && (
            <div className={cn(upcoming.length > 0 && 'border-t border-border')}>
              <div className="px-5 py-2.5 bg-bg-subtle/50 border-b border-border">
                <p className="text-[12px] font-bold uppercase tracking-widest text-fg-subtle">
                  Pending Evaluation · {needsEval.length}
                </p>
              </div>
              {needsEval.map(app => (
                <InterviewRow
                  key={app.id}
                  app={app}
                  projectTitle={projects.find(p => p.id === app.shortlistedFor)?.title ?? ''}
                  section="eval"
                  onClick={() => router.push(`/mentor/interviews/${app.id}/outcome`)}
                />
              ))}
            </div>
          )}

          {completed.length > 0 && (
            <div className={cn((upcoming.length > 0 || needsEval.length > 0) && 'border-t border-border')}>
              <button
                onClick={() => setCompletedOpen(v => !v)}
                className="w-full px-5 py-2.5 bg-bg-subtle/50 border-b border-border flex items-center justify-between hover:bg-bg-subtle transition-colors"
              >
                <p className="text-[12px] font-bold uppercase tracking-widest text-fg-subtle">
                  Completed · {completed.length}
                </p>
                <ChevronDown size={13} className={cn('text-fg-subtle transition-transform duration-200', completedOpen && 'rotate-180')} />
              </button>
              {completedOpen && completed.map(app => (
                <InterviewRow
                  key={app.id}
                  app={app}
                  projectTitle={projects.find(p => p.id === app.shortlistedFor)?.title ?? ''}
                  section="completed"
                  onClick={() => router.push(`/mentor/interviews/${app.id}`)}
                />
              ))}
            </div>
          )}

        </div>
      )}
    </Shell>
  );
}
