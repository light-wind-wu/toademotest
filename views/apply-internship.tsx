'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Shell from '@/components/layout/shell';
import Modal from '@/components/ui-legacy/modal';
import Button from '@/components/ui-legacy/button';
import { useRole } from '@/lib/role';
import {
  Briefcase, CalendarDays, MapPin, Clock, User2,
  Mail as MailIcon, CheckCircle2, Award, FileText, Hourglass,
  TrendingUp, Star,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Application, ProjectEntry } from '@/lib/types';
import applicationsSeed from '@/data/applications.json';
import { loadProjects } from '@/lib/storage';

const IO_APPS_KEY     = 'dsta_applications';
const IO_APPS_VER_KEY = 'dsta_applications_seed_v';
const IO_APPS_VER     = '31';

function loadIoApps(): Application[] {
  try {
    const ver = localStorage.getItem(IO_APPS_VER_KEY);
    if (ver !== IO_APPS_VER) return applicationsSeed as Application[];
    const r = localStorage.getItem(IO_APPS_KEY);
    return r ? (JSON.parse(r) as Application[]) : (applicationsSeed as Application[]);
  } catch { return applicationsSeed as Application[]; }
}

function fmtDate(iso?: string) {
  if (!iso) return '—';
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-SG', { day: 'numeric', month: 'long', year: 'numeric' });
}

function fmtDateShort(iso?: string) {
  if (!iso) return '—';
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-SG', { day: 'numeric', month: 'short', year: 'numeric' });
}

function getProgress(start?: string, end?: string) {
  if (!start || !end) return null;
  const s   = new Date(start + 'T00:00:00').getTime();
  const e   = new Date(end   + 'T00:00:00').getTime();
  const now = Date.now();
  const total   = e - s;
  const elapsed = Math.max(0, Math.min(now - s, total));
  const pct         = Math.round((elapsed / total) * 100);
  const totalWeeks  = Math.round(total   / (7 * 86400000));
  const weeksDone   = Math.floor(elapsed / (7 * 86400000));
  const daysLeft    = Math.max(0, Math.ceil((e - now) / 86400000));
  return { pct, totalWeeks, weeksDone, daysLeft };
}

const INTERNSHIP_STATUSES = new Set([
  'Offer Accepted', 'Active Intern', 'Internship Completed', 'Withdrawn', 'Terminated',
]);

const STATUS_CFG: Record<string, { label: string; color: string; bg: string; icon: typeof CheckCircle2 }> = {
  'Offer Accepted':       { label: 'Confirmed — Not yet started', color: 'text-info',      bg: 'bg-info-bg border-info/20',          icon: CheckCircle2 },
  'Active Intern':        { label: 'Currently Active',            color: 'text-success',   bg: 'bg-success-bg border-success/20',    icon: CheckCircle2 },
  'Internship Completed': { label: 'Completed',                   color: 'text-fg-muted',  bg: 'bg-bg-muted border-border',          icon: CheckCircle2 },
  'Withdrawn':            { label: 'Withdrawn',                   color: 'text-warning',   bg: 'bg-warning-bg border-warning/20',    icon: Hourglass    },
  'Terminated':           { label: 'Terminated',                  color: 'text-danger',    bg: 'bg-danger-bg border-danger/20',      icon: Hourglass    },
};

function InfoRow({ icon: Icon, label, value }: { icon: typeof Briefcase; label: string; value?: string }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3 py-3 border-b border-border last:border-0">
      <Icon size={15} className="text-fg-muted shrink-0 mt-0.5" />
      <div>
        <p className="text-[12px] font-bold uppercase tracking-widest text-fg-subtle mb-0.5">{label}</p>
        <p className="text-body-sm text-fg">{value}</p>
      </div>
    </div>
  );
}

export default function ApplyInternship() {
  const { profile } = useRole();
  const router = useRouter();
  const [app,             setApp]             = useState<Application | null | 'loading'>('loading');
  const [project,         setProject]         = useState<ProjectEntry | null>(null);
  const [showWelcomeLetter, setShowWelcomeLetter] = useState(false);

  useEffect(() => {
    const allApps = loadIoApps();
    const myApp   = allApps.find(
      a => a.email === profile.email && INTERNSHIP_STATUSES.has(a.status)
    ) ?? null;
    setApp(myApp);
    if (myApp?.shortlistedFor) {
      const projects = loadProjects();
      setProject(projects.find(p => p.id === myApp.shortlistedFor) ?? null);
    }
  }, [profile.email]);

  if (app === 'loading') return null;

  if (!app) {
    return (
      <Shell activeRoute="/apply/internship">
        <div className="mb-6">
          <h1 className="text-headline-lg text-fg mb-1">My Internship</h1>
          <p className="text-body-md text-fg-muted">Your internship details will appear here once you have accepted an offer.</p>
        </div>
        <div className="rounded-2xl border border-border bg-surface p-12 text-center">
          <Briefcase size={36} className="text-fg-subtle mx-auto mb-3" />
          <p className="text-body-lg font-semibold text-fg mb-1">No active internship</p>
          <p className="text-body-md text-fg-muted">Accept an offer to see your internship details here.</p>
        </div>
      </Shell>
    );
  }

  const cfg      = STATUS_CFG[app.status];
  const Icon     = cfg?.icon ?? CheckCircle2;
  const progress = app.status === 'Active Intern' ? getProgress(app.internshipStartDate, app.internshipEndDate) : null;

  return (
    <Shell activeRoute="/apply/internship">
      <div className="mb-6">
        <h1 className="text-headline-lg text-fg mb-1">My Internship</h1>
        <p className="text-body-md text-fg-muted">{app.programmeName}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

        {/* Left column */}
        <div className="space-y-4">

          {/* Status */}
          {cfg && (
            <div className={cn('rounded-2xl border p-5', cfg.bg)}>
              <div className="flex items-center gap-2 mb-1">
                <Icon size={16} className={cfg.color} />
                <p className="text-body-sm font-bold text-fg">Status</p>
              </div>
              <p className={cn('text-body-md font-semibold', cfg.color)}>{cfg.label}</p>
            </div>
          )}

          {/* Progress (active only) */}
          {progress && (
            <div className="rounded-2xl border border-border bg-surface p-5">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp size={14} className="text-accent" />
                <p className="text-[12px] font-bold uppercase tracking-widest text-fg-subtle">Progress</p>
              </div>
              <div className="flex items-end justify-between mb-2">
                <p className="text-body-sm font-semibold text-fg">
                  Week {progress.weeksDone} of {progress.totalWeeks}
                </p>
                <p className="text-[13px] font-bold text-accent">{progress.pct}%</p>
              </div>
              <div className="w-full h-2 rounded-full bg-bg-subtle overflow-hidden">
                <div
                  className="h-full rounded-full bg-accent transition-all"
                  style={{ width: `${progress.pct}%` }}
                />
              </div>
              <p className="text-[13px] text-fg-subtle mt-2">
                {progress.daysLeft} day{progress.daysLeft !== 1 ? 's' : ''} remaining
              </p>
            </div>
          )}

          {/* Internship period */}
          <div className="rounded-2xl border border-border bg-surface p-5">
            <p className="text-[12px] font-bold uppercase tracking-widest text-fg-subtle mb-3">Internship Period</p>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CalendarDays size={13} className="text-fg-muted shrink-0" />
                  <p className="text-[12px] text-fg-subtle uppercase tracking-widest font-bold">Start</p>
                </div>
                <p className="text-body-sm font-semibold text-fg">{fmtDateShort(app.internshipStartDate)}</p>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CalendarDays size={13} className="text-fg-muted shrink-0" />
                  <p className="text-[12px] text-fg-subtle uppercase tracking-widest font-bold">End</p>
                </div>
                <p className="text-body-sm font-semibold text-fg">{fmtDateShort(app.internshipEndDate)}</p>
              </div>
              {app.creditBearing !== undefined && (
                <div className="pt-2 border-t border-border flex items-center justify-between">
                  <p className="text-[12px] font-bold uppercase tracking-widest text-fg-subtle">Credit-Bearing</p>
                  <p className="text-body-sm text-fg">{app.creditBearing ? 'Yes' : 'No'}</p>
                </div>
              )}
            </div>
          </div>

          {/* Documents */}
          <div className="rounded-2xl border border-border bg-surface p-5">
            <p className="text-[12px] font-bold uppercase tracking-widest text-fg-subtle mb-3">Documents</p>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <MailIcon size={14} className={app.welcomeLetterSent ? 'text-success' : 'text-fg-subtle'} />
                <div className="flex-1 min-w-0">
                  <p className="text-body-sm font-semibold text-fg">Welcome Letter</p>
                  <p className="text-[13px] text-fg-muted">
                    {app.welcomeLetterSent ? `Sent ${fmtDate(app.welcomeLetterSentDate)}` : 'Not yet sent'}
                  </p>
                </div>
                {app.welcomeLetterSent && app.welcomeLetterBody && (
                  <button
                    onClick={() => setShowWelcomeLetter(true)}
                    className="text-[12px] font-semibold text-accent hover:underline shrink-0"
                  >
                    View
                  </button>
                )}
                {app.welcomeLetterSent && !app.welcomeLetterBody && <CheckCircle2 size={13} className="text-success shrink-0" />}
              </div>
              {app.status === 'Internship Completed' && (
                <div className="flex items-center gap-3">
                  <Award size={14} className={app.cocSent ? 'text-success' : 'text-fg-subtle'} />
                  <div className="flex-1 min-w-0">
                    <p className="text-body-sm font-semibold text-fg">Certificate of Completion</p>
                    <p className="text-[13px] text-fg-muted">
                      {app.cocSent ? `Issued ${fmtDate(app.cocSentDate)}` : 'Not yet issued'}
                    </p>
                  </div>
                  {app.cocSent && <CheckCircle2 size={13} className="text-success shrink-0" />}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right column — project + contact */}
        <div className="md:col-span-2 space-y-4">
          {project ? (
            <div className="rounded-2xl border border-border bg-surface overflow-hidden">
              <div className="px-5 py-4 border-b border-border bg-bg-subtle">
                <p className="text-[12px] font-bold uppercase tracking-widest text-fg-subtle mb-1">Assigned Project</p>
                <p className="text-body-md font-bold text-fg">{project.title}</p>
              </div>
              <div className="px-5 py-4">
                <InfoRow icon={User2}    label="Mentor"           value={project.mentor && project.mentorAppointment ? `${project.mentor} · ${project.mentorAppointment}` : project.mentor} />
                <InfoRow icon={MapPin}   label="Working Location" value={project.workingLocation} />
                <InfoRow icon={Clock}    label="Project Duration"         value={project.internshipDuration} />
                <InfoRow icon={FileText} label="Tech Domain"      value={project.techDomain} />

                {project.description && (
                  <div className="pt-3 mt-1">
                    <p className="text-[12px] font-bold uppercase tracking-widest text-fg-subtle mb-2">Project Scope</p>
                    <p className="text-body-sm text-fg leading-relaxed">{project.description}</p>
                  </div>
                )}

                {project.skills && project.skills.length > 0 && (
                  <div className="pt-3 mt-2 border-t border-border">
                    <p className="text-[12px] font-bold uppercase tracking-widest text-fg-subtle mb-2">Skills</p>
                    <div className="flex flex-wrap gap-1.5">
                      {project.skills.map(s => (
                        <span key={s} className="text-[13px] font-semibold px-2.5 py-1 rounded-full bg-accent/10 border border-accent/20 text-accent">
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-border bg-surface p-8 text-center">
              <p className="text-body-sm text-fg-muted">Project details not available.</p>
            </div>
          )}

          <div className="rounded-2xl border border-border bg-surface p-5">
            <p className="text-[12px] font-bold uppercase tracking-widest text-fg-subtle mb-2">DSTA Internship Office</p>
            <p className="text-body-sm text-fg-muted">For any queries regarding your internship, please contact:</p>
            <p className="text-body-sm font-semibold text-accent mt-1">internship@dsta.gov.sg</p>
          </div>
        </div>

      </div>

      {/* ── Post-internship feedback prompt ── */}
      {app.status === 'Internship Completed' && (
        <div className="mt-6">
          {app.internFeedback ? (
            <div className="flex items-center gap-3 px-5 py-4 bg-success-bg border border-success/20 rounded-2xl">
              <CheckCircle2 size={18} className="text-success shrink-0" />
              <div>
                <p className="text-body-md font-semibold text-fg">Feedback submitted</p>
                <p className="text-body-sm text-fg-muted">Thank you — your feedback has been received.</p>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-4 px-5 py-4 bg-accent/5 border border-accent/20 rounded-2xl">
              <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center shrink-0">
                <Star size={18} className="text-accent" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-body-md font-semibold text-fg">Share your internship feedback</p>
                <p className="text-body-sm text-fg-muted">A few quick questions to help us improve the programme.</p>
              </div>
              <Button onClick={() => router.push(`/apply/feedback/${app.id}`)} className="shrink-0">
                <Star size={13} /> Give Feedback
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Welcome letter modal */}
      {app && typeof app !== 'string' && app.welcomeLetterBody && (
        <Modal open={showWelcomeLetter} onClose={() => setShowWelcomeLetter(false)} maxWidth="md" labelledBy="welcome-letter-view-title">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 id="welcome-letter-view-title" className="text-headline-md text-fg">Welcome Letter</h2>
              <p className="text-body-sm text-fg-muted mt-0.5">{app.programmeName} · {fmtDate(app.welcomeLetterSentDate)}</p>
            </div>
          </div>
          <div className="bg-bg-subtle border border-border rounded-xl px-5 py-4 max-h-[60vh] overflow-y-auto">
            <pre className="text-body-sm text-fg whitespace-pre-wrap font-sans leading-relaxed">
              {app.welcomeLetterBody}
            </pre>
          </div>
          <div className="flex justify-end mt-4">
            <button onClick={() => setShowWelcomeLetter(false)} className="text-body-sm text-fg-muted hover:text-fg transition-colors">Close</button>
          </div>
        </Modal>
      )}

    </Shell>
  );
}
