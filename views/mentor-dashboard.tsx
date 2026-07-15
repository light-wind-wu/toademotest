'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Shell from '@/components/layout/shell';
import DashboardCards from '@/components/ui-legacy/dashboard-cards';
import {
  CalendarClock, CheckCircle, Users2, Briefcase,
  ChevronRight, Award,
} from 'lucide-react';
import { cn, mentorIdMatches } from '@/lib/utils';
import { useRole } from '@/lib/role';
import type { Application, ProjectEntry } from '@/lib/types';
import { loadProjects } from '@/lib/storage';
import seedData from '@/data/applications.json';
import programmesJson from '@/data/programmes.json';

const PROG_NAME: Record<string, string> = Object.fromEntries(
  (programmesJson as { id: string; title: string }[]).map(p => [p.id, p.title])
);

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

function getHour() { return new Date().getHours(); }
function greeting() {
  const h = getHour();
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
}

/* ── Main ──────────────────────────────────────────────────────────────────── */
export default function MentorDashboard() {
  const { profile } = useRole();
  const router = useRouter();

  const [apps,     setApps]     = useState<Application[]>([]);
  const [projects, setProjects] = useState<ProjectEntry[]>([]);

  useEffect(() => {
    setApps(loadApps());
    setProjects(loadProjects());
  }, []);

  const mentorPrefix = profile.email.split('@')[0];
  const myProjects = useMemo(
    () => projects.filter(p => mentorIdMatches(p.mentorUserId, profile.email)),
    [projects, mentorPrefix, profile.email]
  );
  const myProjectIds = useMemo(() => new Set(myProjects.map(p => p.id)), [myProjects]);

  const myApps = useMemo(
    () => apps.filter(a => a.shortlistedFor && myProjectIds.has(a.shortlistedFor)),
    [apps, myProjectIds]
  );

  const toSchedule    = myApps.filter(a => a.status === 'Shortlisted for Interview' && !a.interviewSlots?.length).length;
  const toEvaluate    = myApps.filter(a => a.status === 'Interview Completed' && !a.mentorDecision).length;
  const activeInterns = myApps.filter(a => a.status === 'Offer Accepted' || a.status === 'Active Intern').length;

  const tasks = [
    toSchedule > 0 && {
      icon: CalendarClock,
      label: `${toSchedule} applicant${toSchedule !== 1 ? 's' : ''} awaiting interview scheduling`,
      sub: 'Set your availability so applicants can confirm a slot.',
      tag: 'Action needed',
      tagCls: 'bg-warning-bg text-warning',
      bg: 'hover:bg-warning/5',
      color: 'text-warning',
      href: '/mentor/projects',
    },
    toEvaluate > 0 && {
      icon: Award,
      label: `${toEvaluate} applicant${toEvaluate !== 1 ? 's' : ''} awaiting your evaluation`,
      sub: 'Interviews are done — submit your scores and decision.',
      tag: 'Action needed',
      tagCls: 'bg-accent/10 text-accent',
      bg: 'hover:bg-accent/5',
      color: 'text-accent',
      href: '/mentor/projects',
    },
    activeInterns > 0 && {
      icon: Users2,
      label: `${activeInterns} active intern${activeInterns !== 1 ? 's' : ''}`,
      sub: 'View your confirmed interns and their status.',
      tag: 'Active',
      tagCls: 'bg-success-bg text-success',
      bg: 'hover:bg-success/5',
      color: 'text-success',
      href: '/mentor/interns',
    },
  ].filter(Boolean) as {
    icon: React.ElementType; label: string; sub: string;
    tag: string; tagCls: string; bg: string; color: string; href: string;
  }[];

  return (
    <Shell activeRoute="/mentor">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <div className="flex flex-col gap-2">
          <h1 className="text-headline-lg text-fg">{greeting()}, {profile.name.split(' ')[0]}</h1>
          <p className="text-body-sm text-fg-muted">Your interns, interviews and assessments at a glance.</p>
        </div>
      </div>

      {/* Per-role action cards — needs your attention */}
      <DashboardCards />

      <div className="grid grid-cols-12 gap-4">

        {/* My Projects */}
        <div className="col-span-12 lg:col-span-6 card p-4">
          <h2 className="text-headline-md text-fg mb-4">My Projects</h2>
          {myProjects.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center gap-2">
              <Briefcase size={32} className="text-fg-subtle" />
              <p className="text-body-md font-medium text-fg-muted">No projects assigned</p>
              <p className="text-body-sm text-fg-subtle">Contact your IO if you believe this is an error.</p>
            </div>
          ) : (
            <div className="space-y-1">
              {myProjects.map(project => {
                const filled = project.matched;
                const total  = project.slots;
                const pct    = total > 0 ? Math.round((filled / total) * 100) : 0;
                const barCls = pct >= 100 ? 'bg-success' : pct >= 50 ? 'bg-accent' : 'bg-warning';
                return (
                  <div
                    key={project.id}
                    onClick={() => router.push('/mentor/projects')}
                    className="flex items-center gap-3 px-2 py-1.5 -mx-2 rounded-lg hover:bg-bg-subtle cursor-pointer group transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-body-md font-medium text-fg-muted group-hover:text-accent transition-colors truncate">{project.title}</p>
                      {PROG_NAME[project.programme] && (
                        <p className="text-body-sm text-fg-subtle truncate">{PROG_NAME[project.programme]}</p>
                      )}
                    </div>
                    <div className="w-24 shrink-0">
                      <div className="h-2 bg-border rounded-full overflow-hidden">
                        <div className={cn('h-full rounded-full transition-all duration-500', barCls)} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                    <span className="text-body-md font-semibold text-fg w-14 text-right shrink-0 tabular-nums">{filled}/{total} slots</span>
                    <ChevronRight size={13} className="text-fg-subtle group-hover:text-accent shrink-0 transition-colors" />
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Tasks */}
        <div className="col-span-12 lg:col-span-6 card p-4 flex flex-col gap-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <h2 className="text-headline-md text-fg">Tasks</h2>
              {tasks.length > 0 && (
                <span className="bg-warning-bg text-warning text-caption-bold px-2.5 py-1 rounded-full">{tasks.length} Open</span>
              )}
            </div>
          </div>
          {tasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center gap-2">
              <CheckCircle size={28} className="text-success" />
              <p className="text-body-md font-medium text-fg">All caught up</p>
              <p className="text-body-sm text-fg-muted">No pending interviews to schedule or evaluations to submit.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {tasks.map((t, i) => (
                <a key={i} href={t.href} className={`flex items-center gap-3 px-3 py-3 rounded-lg ${t.bg} cursor-pointer border border-border/50 transition-colors no-underline`}>
                  <t.icon size={18} className={`${t.color} shrink-0`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-body-md font-semibold text-fg truncate">{t.label}</p>
                    <p className="text-body-sm text-fg-muted mt-0.5">{t.sub}</p>
                  </div>
                  <span className={`text-caption-bold px-2 py-0.5 rounded shrink-0 ${t.tagCls}`}>{t.tag}</span>
                </a>
              ))}
            </div>
          )}
        </div>

      </div>
    </Shell>
  );
}
