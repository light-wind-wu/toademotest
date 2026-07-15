'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Shell from '@/components/layout/shell';
import { Users2, User, CheckCircle2, Clock, Award } from 'lucide-react';
import { cn, mentorIdMatches } from '@/lib/utils';
import { useRole } from '@/lib/role';
import type { Application, ProjectEntry } from '@/lib/types';
import { loadProjects } from '@/lib/storage';
import allAppsSeed from '@/data/applications.json';

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
    const seedArr = allAppsSeed as Application[];
    const eIds = new Set(existing.map((a: Application) => a.id));
    const merged = [...existing, ...seedArr.filter((a: Application) => !eIds.has(a.id))];
    localStorage.setItem(APP_KEY, JSON.stringify(merged));
    localStorage.setItem(APP_VER_KEY, APP_SEED_VER);
    return merged;
  } catch { return allAppsSeed as Application[]; }
}

const INTERN_STATUSES = ['Offer Extended', 'Offer Accepted', 'Active Intern', 'Internship Completed'];

function statusConfig(status: string) {
  if (status === 'Offer Extended')       return { label: 'Offer Extended', cls: 'bg-info-bg text-info',       Icon: Clock        };
  if (status === 'Offer Accepted')       return { label: 'Offer Accepted', cls: 'bg-accent/10 text-accent',   Icon: CheckCircle2 };
  if (status === 'Active Intern')        return { label: 'Active',         cls: 'bg-success-bg text-success', Icon: CheckCircle2 };
  if (status === 'Internship Completed') return { label: 'Completed',      cls: 'bg-bg-muted text-fg-muted',  Icon: Award        };
  return                                        { label: status,            cls: 'bg-bg-muted text-fg-muted',  Icon: Clock        };
}

/* ── Scoring helpers (mirror the interview evaluation) ──────────────────────── */
const EVAL_ATTRS = [
  { key: 'technical'     as const, label: 'Technical Ability'  },
  { key: 'quality'       as const, label: 'Quality of Work'    },
  { key: 'communication' as const, label: 'Communication'      },
  { key: 'initiative'    as const, label: 'Initiative & Drive' },
] as const;
type EvalScores = { technical: number; quality: number; communication: number; initiative: number };
function evalAvg(s: EvalScores): number {
  const v = Object.values(s);
  return v.reduce((a, b) => a + b, 0) / v.length;
}
function scoreColor(v: number) {
  return v >= 8 ? 'text-success' : v >= 6 ? 'text-accent' : v >= 4 ? 'text-warning' : 'text-danger';
}

/* ── Main page ─────────────────────────────────────────────────────────────── */
export default function MentorInterns() {
  const { profile } = useRole();
  const router = useRouter();
  const [apps,     setApps]     = useState<Application[]>([]);
  const [projects, setProjects] = useState<ProjectEntry[]>([]);

  useEffect(() => {
    setApps(loadApps());
    setProjects(loadProjects());
  }, []);

  const mentorPrefix = profile.email.split('@')[0];
  const myProjectIds = useMemo(
    () => new Set(projects.filter(p => mentorIdMatches(p.mentorUserId, profile.email)).map(p => p.id)),
    [projects, mentorPrefix, profile.email]
  );
  const myProjects = useMemo(
    () => projects.filter(p => mentorIdMatches(p.mentorUserId, profile.email)),
    [projects, mentorPrefix, profile.email]
  );

  const interns = useMemo(
    () => apps.filter(a => a.shortlistedFor && myProjectIds.has(a.shortlistedFor) && INTERN_STATUSES.includes(a.status)),
    [apps, myProjectIds]
  );

  const completedPendingEval = interns.filter(a => a.status === 'Internship Completed' && !a.mentorEvaluation);
  const completedEvaluated   = interns.filter(a => a.status === 'Internship Completed' && !!a.mentorEvaluation);

  const projectOf = (app: Application) => myProjects.find(p => p.id === app.shortlistedFor);

  return (
    <Shell activeRoute="/mentor/interns">
      <div className="mb-5">
        <h1 className="text-headline-lg text-fg mb-1">My Interns</h1>
      </div>

      {interns.length === 0 ? (
        <div className="rounded-2xl border border-border bg-surface p-12 text-center">
          <Users2 size={36} className="text-fg-subtle mx-auto mb-3" />
          <p className="text-body-lg font-semibold text-fg mb-1">No interns yet</p>
          <p className="text-body-md text-fg-muted">Once an applicant accepts an offer for one of your projects, they will appear here.</p>
        </div>
      ) : (
        <div className="space-y-5">

          {/* Intern list */}
          <div className="rounded-2xl border border-border bg-surface overflow-hidden">
            <div className="px-5 py-3.5 bg-bg-subtle border-b border-border">
              <p className="text-label-sm font-bold text-fg">{interns.length} intern{interns.length !== 1 ? 's' : ''}</p>
            </div>
            {interns.map(app => {
              const proj = projectOf(app);
              const { label, cls, Icon } = statusConfig(app.status);
              const evalDone = app.status === 'Internship Completed' && !!app.mentorEvaluation;
              return (
                <button
                  key={app.id}
                  onClick={() => router.push(`/candidate360/${app.id}`)}
                  className="w-full text-left flex items-center gap-4 px-5 py-4 border-b border-border last:border-b-0 hover:bg-bg-subtle/50 transition-colors"
                >
                  <div className="w-9 h-9 rounded-full bg-accent/10 flex items-center justify-center shrink-0">
                    <User size={16} className="text-accent" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-body-md font-semibold text-fg truncate">{app.name}</p>
                    {proj && <p className="text-[13px] text-fg-muted mt-0.5 truncate">{proj.title}</p>}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {evalDone && (
                      <span className="text-[12px] font-semibold px-2 py-0.5 rounded-full bg-success-bg text-success border border-success/20">
                        Evaluated
                      </span>
                    )}
                    <span className={cn('inline-flex items-center gap-1 text-[13px] font-semibold px-2.5 py-1 rounded-full', cls)}>
                      <Icon size={11} />{label}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Pending evaluations */}
          {completedPendingEval.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Award size={15} className="text-warning" />
                <p className="text-label-sm font-bold text-fg">
                  Evaluations pending ({completedPendingEval.length})
                </p>
              </div>
              <div className="space-y-2">
                {completedPendingEval.map(app => {
                  const proj = projectOf(app);
                  return (
                    <button
                      key={app.id}
                      onClick={() => router.push(`/mentor/evaluate/${app.id}`)}
                      className="w-full text-left flex items-center gap-4 px-5 py-4 rounded-xl border border-warning/30 bg-warning-bg/40 hover:bg-warning-bg/70 transition-colors"
                    >
                      <div className="w-9 h-9 rounded-full bg-warning/15 flex items-center justify-center shrink-0">
                        <Award size={16} className="text-warning" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-body-md font-semibold text-fg truncate">{app.name}</p>
                        <p className="text-[13px] text-fg-muted mt-0.5 truncate">{proj?.title ?? 'Internship completed'} — evaluation pending</p>
                      </div>
                      <span className="text-[13px] font-semibold text-accent shrink-0">Evaluate →</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Completed evaluations */}
          {completedEvaluated.length > 0 && (
            <div>
              <p className="text-label-sm font-bold text-fg mb-3">Submitted evaluations</p>
              <div className="space-y-2">
                {completedEvaluated.map(app => {
                  const ev = app.mentorEvaluation!;
                  const recMap = { scholarship: 'Scholarship', rehire: 'Re-engagement', neither: 'No recommendation' };
                  const avg = evalAvg(ev.ratings);
                  return (
                    <div key={app.id} className="border border-border rounded-xl px-4 py-3 bg-surface">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2.5">
                          <p className="text-body-sm font-semibold text-fg">{app.name}</p>
                          <span className={cn('text-body-sm font-bold tabular-nums', scoreColor(avg))}>
                            {avg.toFixed(1)}<span className="text-[12px] text-fg-muted font-normal"> / 10</span>
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[12px] font-semibold px-2 py-0.5 rounded-full bg-success-bg text-success border border-success/20">
                            {recMap[ev.recommend]}
                          </span>
                          <span className="text-[13px] text-fg-muted">{ev.submittedAt}</span>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {EVAL_ATTRS.map(({ key, label }) => (
                          <div key={key} className="text-center">
                            <p className={cn('text-[18px] font-bold leading-none tabular-nums', scoreColor(ev.ratings[key]))}>{ev.ratings[key].toFixed(1)}</p>
                            <p className="text-[12px] text-fg-muted mt-0.5">{label}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        </div>
      )}
    </Shell>
  );
}
