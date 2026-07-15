'use client';

/* ─────────────────────────────────────────────────────────────────────────────
   Per-role dashboard action cards (IA spec: window.IA.DASH_CARDS).

   A "needs your attention" grid on each role's dashboard: one tile per work queue,
   with a LIVE count derived from localStorage (the same data the rail badges use),
   a semantic tone, an icon, and a click that navigates to the relevant section.
   Additive — sits above the existing dashboard widgets, removes nothing.
   ──────────────────────────────────────────────────────────────────────────── */
import { useEffect, useState } from 'react';
import {
  ClipboardList, Calendar, FileText, GraduationCap, Folder, TriangleAlert,
  BarChart3, ChevronRight, type LucideIcon,
} from 'lucide-react';
import { useRole } from '@/lib/role';
import { useProgramme } from '@/lib/programme-context';
import { useUnsavedChanges } from '@/lib/unsaved-changes';
import { mentorIdMatches } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { loadProjects, loadSubmissions } from '@/lib/storage';
import type { UserRole } from '@/lib/types';

type Tone = 'accent' | 'info' | 'warning' | 'danger' | 'success';
interface CardDef { key: string; label: string; count: number; tone: Tone; icon: LucideIcon; route: string }

const TONE: Record<Tone, { tile: string; iconWrap: string; count: string }> = {
  accent:  { tile: 'hover:border-accent/40',   iconWrap: 'bg-accent/10 text-accent',     count: 'text-accent' },
  info:    { tile: 'hover:border-accent/40',   iconWrap: 'bg-accent/10 text-accent',     count: 'text-fg' },
  warning: { tile: 'hover:border-warning/40',  iconWrap: 'bg-warning-bg text-warning',   count: 'text-warning' },
  danger:  { tile: 'hover:border-danger/40',   iconWrap: 'bg-danger-bg text-danger',     count: 'text-danger' },
  success: { tile: 'hover:border-success/40',  iconWrap: 'bg-success-bg text-success',   count: 'text-success' },
};

type AppRow = {
  programmeId?: string; status?: string; mentorDecision?: string; shortlistedFor?: string;
  interviewSlots?: unknown[]; mentorEvaluation?: unknown; email?: string;
  welcomeLetterSent?: boolean; cocSent?: boolean;
  extensionRequest?: { status?: string }; earlyCompletionRequest?: { status?: string }; terminationRequest?: { status?: string };
};

const readJSON = <T,>(key: string, fallback: T): T => {
  try { const raw = localStorage.getItem(key); return raw ? (JSON.parse(raw) as T) : fallback; } catch { return fallback; }
};

function ioCards(activeProg: string): CardDef[] {
  const apps = readJSON<AppRow[]>('dsta_applications', []).filter(a => a.programmeId === activeProg);
  const subs = loadSubmissions();
  const review   = apps.filter(a => a.status === 'Pending Screening' || a.status === 'Pending Review' || (a.status === 'Interview Completed' && !!a.mentorDecision)).length;
  const schedule = apps.filter(a => a.status === 'Shortlisted for Interview' && !a.interviewSlots?.length).length;
  const offers   = apps.filter(a => a.status === 'Interview Completed' && a.mentorDecision === 'Accepted').length;
  const assess   = apps.filter(a => a.status === 'Active Intern').length;
  const requests = subs.flatMap(b => b.projects).filter(p => p.status === 'pending').length;
  const changes  = apps.filter(a => a.extensionRequest?.status === 'pending' || a.earlyCompletionRequest?.status === 'pending').length;
  return [
    { key: 'review',   label: 'Applicants to review',          count: review,   tone: 'accent',  icon: ClipboardList,  route: '/applications' },
    { key: 'schedule', label: 'Interviews to schedule',        count: schedule, tone: 'info',    icon: Calendar,       route: '/applications' },
    { key: 'offers',   label: 'Offers pending generation',     count: offers,   tone: 'warning', icon: FileText,       route: '/applications' },
    { key: 'assess',   label: 'Internships pending assessment',count: assess,   tone: 'accent',  icon: GraduationCap,  route: '/interns' },
    { key: 'requests', label: 'Project requests pending approval', count: requests, tone: 'warning', icon: Folder,     route: '/projects' },
    { key: 'changes',  label: 'Extension requests pending review', count: changes, tone: 'danger', icon: TriangleAlert, route: '/interns' },
  ];
}

function mentorCards(email: string): CardDef[] {
  const projects = loadProjects();
  const myProjIds = new Set(projects.filter(p => mentorIdMatches(p.mentorUserId, email)).map(p => p.id));
  const apps = readJSON<AppRow[]>('dsta_applications', []).filter(a => a.shortlistedFor && myProjIds.has(a.shortlistedFor));
  const interviews = apps.filter(a => a.status === 'Interview Scheduled' || (a.status === 'Shortlisted for Interview' && a.interviewSlots?.length)).length;
  const feedback   = apps.filter(a => a.status === 'Interview Completed' && !a.mentorDecision).length;
  const interns    = apps.filter(a => a.status === 'Offer Accepted' || a.status === 'Active Intern' || a.status === 'Internship Completed').length;
  const assess     = apps.filter(a => a.status === 'Internship Completed' && !a.mentorEvaluation).length;
  const requests   = apps.filter(a => a.extensionRequest?.status === 'pending' || a.earlyCompletionRequest?.status === 'pending').length;
  return [
    { key: 'interviews', label: 'Interviews assigned',       count: interviews, tone: 'info',    icon: Calendar,      route: '/mentor/interviews' },
    { key: 'feedback',   label: 'Feedback to submit',        count: feedback,   tone: 'warning', icon: ClipboardList, route: '/mentor/interviews' },
    { key: 'interns',    label: 'Your interns',              count: interns,    tone: 'accent',  icon: GraduationCap, route: '/mentor/interns' },
    { key: 'assess',     label: 'Assessments due',           count: assess,     tone: 'warning', icon: BarChart3,     route: '/mentor/interns' },
    { key: 'requests',   label: 'Requests to review',        count: requests,   tone: 'danger',  icon: TriangleAlert, route: '/mentor/interns' },
  ];
}

// NOTE: director cards intentionally omitted — the director role has a single page
// (the /director approval queue), so the spec's director cards (which target analytics /
// roster the app's director can't reach) would be circular/redundant with that queue.

const INTERNAL: ReadonlySet<UserRole> = new Set<UserRole>(['io', 'io-admin', 'mentor']);

export default function DashboardCards() {
  const { role, profile } = useRole();
  const { activeProg } = useProgramme();
  const { safeNavigate } = useUnsavedChanges();
  const [cards, setCards] = useState<CardDef[]>([]);

  useEffect(() => {
    let next: CardDef[] = [];
    if (role === 'io' || role === 'io-admin') next = ioCards(activeProg);
    else if (role === 'mentor') next = mentorCards(profile.email);
    setCards(next);
  }, [role, activeProg, profile.email]);

  if (!INTERNAL.has(role) || cards.length === 0) return null;

  return (
    <section className="mb-6">
      <h2 className="text-body-md font-semibold text-fg mb-2.5">Needs your attention</h2>
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        {cards.map((c) => {
          const t = TONE[c.tone];
          const Icon = c.icon;
          const muted = c.count === 0;
          return (
            <button
              key={c.key}
              onClick={() => safeNavigate(c.route)}
              className={cn('group flex flex-col items-start gap-2 rounded-xl border border-border bg-surface p-3.5 text-left transition-colors', muted ? 'hover:border-border-strong' : t.tile)}
            >
              <span className={cn('grid place-items-center w-8 h-8 rounded-lg shrink-0', muted ? 'bg-bg-subtle text-fg-subtle' : t.iconWrap)}>
                <Icon size={16} />
              </span>
              <span className={cn('text-headline-sm font-extrabold tabular-nums leading-none', muted ? 'text-fg-subtle' : t.count)}>{c.count}</span>
              <span className="flex items-center gap-0.5 text-body-sm font-medium text-fg-muted leading-snug">
                {c.label}
                <ChevronRight size={13} className="shrink-0 opacity-0 -translate-x-1 transition-all group-hover:opacity-100 group-hover:translate-x-0" />
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
