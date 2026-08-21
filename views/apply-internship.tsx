'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Shell from '@/components/layout/shell';
import Modal from '@/components/ui-legacy/modal';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useRole } from '@/lib/role';
import {
  ArrowRight, Briefcase, CalendarDays, MapPin, Clock, User2,
  Mail as MailIcon, CheckCircle2, Award, FileText, Hourglass,
  TrendingUp, ShieldCheck, MessageSquareHeart, Quote, Share2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  APPLICANT_HOME_SCENARIO_CHANGED,
  isApplicantHomeScenario,
  loadApplicantHomeScenario,
} from '@/lib/applicant-home-scenario';
import type { ApplicantHomeScenario, Application, ProjectEntry } from '@/lib/types';
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
    <div className="flex items-start gap-3 border-b border-border py-4 last:border-0">
      <Icon size={17} className="mt-0.5 shrink-0 text-fg-muted" />
      <div>
        <p className="text-[12px] leading-5 text-fg-muted">{label}</p>
        <p className="mt-1 text-[14px] font-medium leading-5 text-fg">{value}</p>
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
  const [homeScenario, setHomeScenario] = useState<ApplicantHomeScenario>('interview-action');

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

  useEffect(() => {
    setHomeScenario(loadApplicantHomeScenario());
    const handleScenarioChange = (event: Event) => {
      const detail = (event as CustomEvent<ApplicantHomeScenario>).detail;
      if (isApplicantHomeScenario(detail)) setHomeScenario(detail);
    };
    window.addEventListener(APPLICANT_HOME_SCENARIO_CHANGED, handleScenarioChange);
    return () => window.removeEventListener(APPLICANT_HOME_SCENARIO_CHANGED, handleScenarioChange);
  }, []);

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

  const isCompletionScenario = homeScenario === 'completion-action';
  const cfg = isCompletionScenario
    ? { label: 'Completion action required', color: 'text-warning', bg: 'bg-warning-bg border-warning/20', icon: Hourglass }
    : STATUS_CFG[app.status];
  const isBeforeStart = !isCompletionScenario && app.status === 'Offer Accepted';
  const isActive = !isCompletionScenario && app.status === 'Active Intern';
  const isCompleted = isCompletionScenario || app.status === 'Internship Completed';
  const progress = isActive ? getProgress(app.internshipStartDate, app.internshipEndDate) : null;
  const statusVariant = isCompletionScenario
    ? 'warning'
    : app.status === 'Active Intern'
    ? 'success'
    : app.status === 'Offer Accepted'
      ? 'info'
      : app.status === 'Terminated'
        ? 'danger'
        : app.status === 'Withdrawn'
          ? 'warning'
          : 'subtle';
  const nextAction = isBeforeStart
    ? {
        label: 'Prepare for your internship',
        title: 'Get ready for your first day',
        body: 'Review your onboarding requirements and make sure your information is up to date before the internship begins.',
        cta: 'Continue Onboarding',
        route: '/apply/onboarding',
      }
    : isActive
      ? {
          label: 'Internship in progress',
          title: 'Keep your internship record up to date',
          body: 'Review your internship details, documents and mentor information whenever you need them.',
          cta: 'View Onboarding Record',
          route: '/apply/onboarding',
        }
      : isCompleted
        ? {
            label: 'Completion action required',
            title: 'Complete your offboarding',
            body: 'Submit the required internship feedback to complete your record. You can also request a testimonial, prepare a LinkedIn post and track certificate eligibility.',
            cta: 'Start Offboarding',
            route: '/apply/applicant-offboarding',
          }
        : {
            label: 'Internship record',
            title: 'This internship record is closed',
            body: 'The record remains available for reference. Contact the internship office if you need help.',
            cta: 'Contact Internship Office',
            route: 'mailto:internship@dsta.gov.sg',
          };

  return (
    <Shell activeRoute="/apply/internship" flushTop>
      <div className="relative mx-[calc(-1*clamp(24px,2.6vw,40px))] min-h-[calc(100vh-64px)] bg-bg-subtle">
        <header className="border-b border-border bg-bg px-[clamp(24px,2.6vw,40px)] py-10">
          <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[13px] font-medium text-fg-muted">Internship record</p>
              <h1 className="mt-2 text-[38px] font-semibold leading-[44px] tracking-[-0.8px] text-fg">My Internship</h1>
              <p className="mt-2 text-[16px] leading-6 text-fg-muted">{app.programmeName}</p>
            </div>
            {cfg ? <Badge variant={statusVariant}>{cfg.label}</Badge> : null}
          </div>
        </header>

        <div className="mx-auto w-full max-w-[1440px] px-[clamp(24px,2.6vw,40px)] py-8">
          <Card className="relative overflow-hidden border-accent/30 shadow-none">
            <CardContent className="relative z-[1] flex min-h-[220px] flex-col justify-between gap-6 p-6 pr-6 sm:pr-52 lg:flex-row lg:items-center">
              <div className="max-w-2xl">
                <p className="text-[13px] font-medium text-accent">{nextAction.label}</p>
                <h2 className="mt-2 text-[24px] font-semibold leading-8 text-fg">{nextAction.title}</h2>
                <p className="mt-2 text-[14px] leading-6 text-fg-muted">{nextAction.body}</p>
                <Button className="mt-5" onClick={() => nextAction.route.startsWith('mailto:') ? window.location.assign(nextAction.route) : router.push(nextAction.route)}>
                  {nextAction.cta}
                  <ArrowRight className="size-4" aria-hidden />
                </Button>
              </div>
              {progress ? (
                <div className="w-full max-w-xs rounded-lg border border-border bg-bg p-4 lg:shrink-0">
                  <div className="flex items-center justify-between gap-3">
                    <span className="inline-flex items-center gap-2 text-[13px] font-medium text-fg"><TrendingUp className="size-4 text-accent" aria-hidden />Internship progress</span>
                    <span className="text-[13px] font-semibold text-accent">{progress.pct}%</span>
                  </div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-bg-muted"><div className="h-full rounded-full bg-accent" style={{ width: `${progress.pct}%` }} /></div>
                  <p className="mt-2 text-[12px] text-fg-muted">Week {progress.weeksDone} of {progress.totalWeeks} · {progress.daysLeft} days remaining</p>
                </div>
              ) : null}
            </CardContent>
            <div className="pointer-events-none absolute bottom-0 right-0 hidden h-[180px] w-[180px] sm:block" aria-hidden>
              <Image src="/images/activity-v1.png" alt="" fill className="object-contain object-right-bottom" sizes="180px" />
            </div>
          </Card>

          {isCompleted ? (
            <section className="mt-6" aria-labelledby="completion-tasks-title">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-[13px] font-medium text-fg-muted">Offboarding</p>
                  <h2 id="completion-tasks-title" className="mt-1 text-[20px] font-semibold text-fg">Completion tasks</h2>
                </div>
                <p className="text-[13px] text-fg-muted">Complete the required task first. Optional actions remain available afterwards.</p>
              </div>

              <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <Card className="shadow-none">
                  <CardContent className="flex h-full flex-col p-5">
                    <div className="flex items-start justify-between gap-3">
                      <span className="inline-flex size-9 items-center justify-center rounded-md bg-bg-muted text-accent"><MessageSquareHeart className="size-4" aria-hidden /></span>
                      <Badge variant={app.internFeedback ? 'success' : 'warning'}>{app.internFeedback ? 'Completed' : 'Required'}</Badge>
                    </div>
                    <h3 className="mt-4 text-[16px] font-semibold text-fg">Internship feedback</h3>
                    <p className="mt-2 flex-1 text-[13px] leading-5 text-fg-muted">Share feedback on your project, mentorship and learning experience.</p>
                    <Button className="mt-5 self-start" onClick={() => router.push(`/apply/feedback/${app.id}`)}>{app.internFeedback ? 'View Feedback' : 'Start Feedback'}</Button>
                  </CardContent>
                </Card>

                <Card className="shadow-none">
                  <CardContent className="flex h-full flex-col p-5">
                    <div className="flex items-start justify-between gap-3">
                      <span className="inline-flex size-9 items-center justify-center rounded-md bg-bg-muted text-accent"><Quote className="size-4" aria-hidden /></span>
                      <Badge variant="subtle">Optional</Badge>
                    </div>
                    <h3 className="mt-4 text-[16px] font-semibold text-fg">Request a testimonial</h3>
                    <p className="mt-2 flex-1 text-[13px] leading-5 text-fg-muted">Ask your mentor for a testimonial to support future applications.</p>
                    <Button className="mt-5 self-start" variant="outline" onClick={() => router.push('/apply/applicant-testimonial-request')}>Request Testimonial</Button>
                  </CardContent>
                </Card>

                <Card className="shadow-none">
                  <CardContent className="flex h-full flex-col p-5">
                    <div className="flex items-start justify-between gap-3">
                      <span className="inline-flex size-9 items-center justify-center rounded-md bg-bg-muted text-accent"><Share2 className="size-4" aria-hidden /></span>
                      <Badge variant="subtle">Optional</Badge>
                    </div>
                    <h3 className="mt-4 text-[16px] font-semibold text-fg">Share your experience</h3>
                    <p className="mt-2 flex-1 text-[13px] leading-5 text-fg-muted">Prepare editable content before continuing to LinkedIn.</p>
                    <Button className="mt-5 self-start" variant="outline" onClick={() => router.push('/apply/applicant-linkedin-share')}>Prepare Post</Button>
                  </CardContent>
                </Card>

                <Card className="shadow-none">
                  <CardContent className="flex h-full flex-col p-5">
                    <div className="flex items-start justify-between gap-3">
                      <span className="inline-flex size-9 items-center justify-center rounded-md bg-bg-muted text-accent"><Award className="size-4" aria-hidden /></span>
                      <Badge variant="info">Pending</Badge>
                    </div>
                    <h3 className="mt-4 text-[16px] font-semibold text-fg">Certificate eligibility</h3>
                    <p className="mt-2 flex-1 text-[13px] leading-5 text-fg-muted">Available after feedback, offboarding and final clearance are complete.</p>
                    <Button className="mt-5 self-start" variant="outline" onClick={() => router.push('/apply/certification')}>View Status</Button>
                  </CardContent>
                </Card>
              </div>
            </section>
          ) : null}

          <div className="mt-5 grid gap-5 md:grid-cols-[minmax(0,2fr)_minmax(280px,0.8fr)]">
            <div className="space-y-5">
              {project ? (
                <Card className="shadow-none">
                  <CardHeader className="border-b border-border">
                    <p className="text-[12px] font-medium text-fg-muted">Assigned project</p>
                    <CardTitle className="mt-1 text-[20px] leading-7">{project.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-2">
                    <div className="grid gap-x-8 md:grid-cols-2">
                      <InfoRow icon={User2} label="Mentor" value={project.mentor && project.mentorAppointment ? `${project.mentor} · ${project.mentorAppointment}` : project.mentor} />
                      <InfoRow icon={MapPin} label="Working location" value={project.workingLocation} />
                      <InfoRow icon={Clock} label="Project duration" value={project.internshipDuration} />
                      <InfoRow icon={FileText} label="Tech domain" value={project.techDomain} />
                    </div>
                    {project.description ? (
                      <div className="mt-5 border-t border-border pt-5">
                        <h2 className="text-[16px] font-semibold text-fg">About this project</h2>
                        <p className="mt-3 text-[14px] leading-6 text-fg-muted">{project.description}</p>
                      </div>
                    ) : null}
                    {project.skills && project.skills.length > 0 ? (
                      <div className="mt-5 border-t border-border pt-5">
                        <p className="text-[13px] font-medium text-fg-muted">Skills you may develop</p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {project.skills.map((skill) => <Badge key={skill} variant="outline">{skill}</Badge>)}
                        </div>
                      </div>
                    ) : null}
                  </CardContent>
                </Card>
              ) : (
                <Card className="p-8 text-center shadow-none"><p className="text-[14px] text-fg-muted">Project details are not available yet.</p></Card>
              )}

            </div>

            <aside className="space-y-5">
              <Card className="shadow-none">
                <CardHeader><CardTitle className="text-[17px]">Important dates</CardTitle></CardHeader>
                <CardContent>
                  <dl className="space-y-4">
                    <div className="flex items-start gap-3"><CalendarDays className="mt-0.5 size-4 text-fg-muted" aria-hidden /><div><dt className="text-[12px] text-fg-muted">Start date</dt><dd className="mt-1 text-[14px] font-medium text-fg">{fmtDateShort(app.internshipStartDate)}</dd></div></div>
                    <div className="flex items-start gap-3"><CalendarDays className="mt-0.5 size-4 text-fg-muted" aria-hidden /><div><dt className="text-[12px] text-fg-muted">End date</dt><dd className="mt-1 text-[14px] font-medium text-fg">{fmtDateShort(app.internshipEndDate)}</dd></div></div>
                    {app.creditBearing !== undefined ? <div className="flex items-start gap-3"><ShieldCheck className="mt-0.5 size-4 text-fg-muted" aria-hidden /><div><dt className="text-[12px] text-fg-muted">Credit-bearing</dt><dd className="mt-1 text-[14px] font-medium text-fg">{app.creditBearing ? 'Yes' : 'No'}</dd></div></div> : null}
                  </dl>
                </CardContent>
              </Card>

              <Card className="shadow-none">
                <CardHeader><CardTitle className="text-[17px]">Documents</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-3">
                    <MailIcon className={cn('size-4 shrink-0', app.welcomeLetterSent ? 'text-success' : 'text-fg-muted')} aria-hidden />
                    <div className="min-w-0 flex-1"><p className="text-[14px] font-medium text-fg">Welcome letter</p><p className="mt-1 text-[12px] text-fg-muted">{app.welcomeLetterSent ? `Sent ${fmtDate(app.welcomeLetterSentDate)}` : 'Not yet available'}</p></div>
                    {app.welcomeLetterSent && app.welcomeLetterBody ? <Button variant="ghost" size="sm" onClick={() => setShowWelcomeLetter(true)}>View</Button> : null}
                  </div>
                  {isCompleted ? (
                    <div className="flex items-center gap-3 border-t border-border pt-4">
                      <Award className={cn('size-4 shrink-0', app.cocSent ? 'text-success' : 'text-fg-muted')} aria-hidden />
                      <div className="min-w-0 flex-1"><p className="text-[14px] font-medium text-fg">Certificate of Completion</p><p className="mt-1 text-[12px] text-fg-muted">{app.cocSent ? `Issued ${fmtDate(app.cocSentDate)}` : 'Pending final clearance'}</p></div>
                      <Button variant="outline" size="sm" onClick={() => router.push('/apply/certification')}>View status</Button>
                    </div>
                  ) : null}
                </CardContent>
              </Card>

              <Card className="shadow-none">
                <CardContent className="flex items-start gap-3 p-5">
                  <MailIcon className="mt-0.5 size-4 shrink-0 text-fg-muted" aria-hidden />
                  <div><p className="text-[14px] font-medium text-fg">Need help?</p><p className="mt-1 text-[13px] leading-5 text-fg-muted">Contact the DSTA Internship Office.</p><a className="mt-2 block text-[13px] font-medium text-accent hover:underline" href="mailto:internship@dsta.gov.sg">internship@dsta.gov.sg</a></div>
                </CardContent>
              </Card>
            </aside>
          </div>
        </div>
      </div>

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
