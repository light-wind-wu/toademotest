'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Shell from '@/components/layout/shell';
import Modal from '@/components/ui-legacy/modal';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ArrowRight, Briefcase, CalendarDays, MapPin, Clock, User2,
  Mail as MailIcon, Award, FileText,
  ShieldCheck, MessageSquareHeart, Quote, Share2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  APPLICANT_HOME_SCENARIO_CHANGED,
  isApplicantHomeScenario,
  loadApplicantHomeScenario,
} from '@/lib/applicant-home-scenario';
import { loadApplicantInternshipRecord } from '@/lib/applicant-internship';
import type {
  ApplicantHomeScenario,
  ApplicantInternshipTaskId,
} from '@/lib/types';

function fmtDate(iso?: string) {
  if (!iso) return '—';
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-SG', { day: 'numeric', month: 'long', year: 'numeric' });
}

function fmtDateShort(iso?: string) {
  if (!iso) return '—';
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-SG', { day: 'numeric', month: 'short', year: 'numeric' });
}

const COMPLETION_TASK_ICONS: Record<ApplicantInternshipTaskId, typeof Award> = {
  feedback: MessageSquareHeart,
  testimonial: Quote,
  linkedin: Share2,
  certificate: Award,
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
  const router = useRouter();
  const [showWelcomeLetter, setShowWelcomeLetter] = useState(false);
  const [homeScenario, setHomeScenario] = useState<ApplicantHomeScenario>('interview-action');

  useEffect(() => {
    setHomeScenario(loadApplicantHomeScenario());
    const handleScenarioChange = (event: Event) => {
      const detail = (event as CustomEvent<ApplicantHomeScenario>).detail;
      if (isApplicantHomeScenario(detail)) setHomeScenario(detail);
    };
    window.addEventListener(APPLICANT_HOME_SCENARIO_CHANGED, handleScenarioChange);
    return () => window.removeEventListener(APPLICANT_HOME_SCENARIO_CHANGED, handleScenarioChange);
  }, []);

  const phase = homeScenario === 'completion-action' ? 'offboarding' : 'onboarding';
  const internship = loadApplicantInternshipRecord(phase);
  const { action, project } = internship;
  const isOffboarding = internship.phase === 'offboarding';

  return (
    <Shell activeRoute="/apply/internship" flushTop>
      <div className="relative mx-[calc(-1*clamp(24px,2.6vw,40px))] min-h-[calc(100vh-64px)] bg-bg-subtle">
        <header className="border-b border-border bg-bg px-[clamp(24px,2.6vw,40px)] py-10">
          <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[13px] font-medium text-fg-muted">Internship record</p>
              <h1 className="mt-2 text-[38px] font-semibold leading-[44px] tracking-[-0.8px] text-fg">My Internship</h1>
              <p className="mt-2 text-[16px] leading-6 text-fg-muted">{internship.programmeName}</p>
            </div>
            <Badge variant={internship.statusTone}>{internship.statusLabel}</Badge>
          </div>
        </header>

        <div className="mx-auto w-full max-w-[1440px] px-[clamp(24px,2.6vw,40px)] py-8">
          <Card className="relative overflow-hidden border-accent/30 shadow-none">
            <CardContent className="relative z-[1] flex min-h-[220px] flex-col justify-between gap-6 p-6 pr-6 sm:pr-52 lg:flex-row lg:items-center">
              <div className="max-w-2xl">
                <p className="text-[13px] font-medium text-accent">{action.label}</p>
                <h2 className="mt-2 text-[24px] font-semibold leading-8 text-fg">{action.title}</h2>
                <p className="mt-2 text-[14px] leading-6 text-fg-muted">{action.body}</p>
                <Button className="mt-5" onClick={() => router.push(action.route)}>
                  {action.cta}
                  <ArrowRight className="size-4" aria-hidden />
                </Button>
              </div>
            </CardContent>
            <div className="pointer-events-none absolute bottom-0 right-0 hidden h-[180px] w-[180px] sm:block" aria-hidden>
              <Image src="/images/activity-v1.png" alt="" fill className="object-contain object-right-bottom" sizes="180px" />
            </div>
          </Card>

          {isOffboarding ? (
            <section className="mt-6" aria-labelledby="completion-tasks-title">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-[13px] font-medium text-fg-muted">Offboarding</p>
                  <h2 id="completion-tasks-title" className="mt-1 text-[20px] font-semibold text-fg">Completion tasks</h2>
                </div>
                <p className="text-[13px] text-fg-muted">Complete the required task first. Optional actions remain available afterwards.</p>
              </div>

              <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {internship.completionTasks.map((task) => {
                  const TaskIcon = COMPLETION_TASK_ICONS[task.id];
                  return (
                    <Card key={task.id} className="shadow-none">
                      <CardContent className="flex h-full flex-col p-5">
                        <div className="flex items-start justify-between gap-3">
                          <span className="inline-flex size-9 items-center justify-center rounded-md bg-bg-muted text-accent"><TaskIcon className="size-4" aria-hidden /></span>
                          <Badge variant={task.statusTone}>{task.status}</Badge>
                        </div>
                        <h3 className="mt-4 text-[16px] font-semibold text-fg">{task.title}</h3>
                        <p className="mt-2 flex-1 text-[13px] leading-5 text-fg-muted">{task.body}</p>
                        <Button className="mt-5 self-start" variant={task.id === 'feedback' ? 'solid' : 'outline'} onClick={() => router.push(task.route)}>{task.cta}</Button>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </section>
          ) : null}

          <div className="mt-5 grid gap-5 md:grid-cols-[minmax(0,2fr)_minmax(280px,0.8fr)]">
            <div className="space-y-5">
              <Card className="shadow-none">
                  <CardHeader className="border-b border-border">
                    <p className="text-[12px] font-medium text-fg-muted">Assigned project</p>
                    <CardTitle className="mt-1 text-[20px] leading-7">{project.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-2">
                    <div className="grid gap-x-8 md:grid-cols-2">
                      <InfoRow icon={User2} label="Mentor" value={project.mentor && project.mentorAppointment ? `${project.mentor} · ${project.mentorAppointment}` : project.mentor} />
                      <InfoRow icon={MapPin} label="Working location" value={project.workingLocation} />
                      <InfoRow icon={Clock} label="Project duration" value={project.duration} />
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

            </div>

            <aside className="space-y-5">
              <Card className="shadow-none">
                <CardHeader><CardTitle className="text-[17px]">Important dates</CardTitle></CardHeader>
                <CardContent>
                  <dl className="space-y-4">
                    <div className="flex items-start gap-3"><CalendarDays className="mt-0.5 size-4 text-fg-muted" aria-hidden /><div><dt className="text-[12px] text-fg-muted">Start date</dt><dd className="mt-1 text-[14px] font-medium text-fg">{fmtDateShort(internship.internshipStartDate)}</dd></div></div>
                    <div className="flex items-start gap-3"><CalendarDays className="mt-0.5 size-4 text-fg-muted" aria-hidden /><div><dt className="text-[12px] text-fg-muted">End date</dt><dd className="mt-1 text-[14px] font-medium text-fg">{fmtDateShort(internship.internshipEndDate)}</dd></div></div>
                    <div className="flex items-start gap-3"><ShieldCheck className="mt-0.5 size-4 text-fg-muted" aria-hidden /><div><dt className="text-[12px] text-fg-muted">Credit-bearing</dt><dd className="mt-1 text-[14px] font-medium text-fg">{internship.creditBearing ? 'Yes' : 'No'}</dd></div></div>
                  </dl>
                </CardContent>
              </Card>

              <Card className="shadow-none">
                <CardHeader><CardTitle className="text-[17px]">Documents</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-3">
                    <MailIcon className={cn('size-4 shrink-0', internship.welcomeLetter.status === 'available' ? 'text-success' : 'text-fg-muted')} aria-hidden />
                    <div className="min-w-0 flex-1"><p className="text-[14px] font-medium text-fg">Welcome letter</p><p className="mt-1 text-[12px] text-fg-muted">{internship.welcomeLetter.status === 'available' ? `Sent ${fmtDate(internship.welcomeLetter.date)}` : 'Not yet available'}</p></div>
                    {internship.welcomeLetter.status === 'available' && internship.welcomeLetter.body ? <Button variant="ghost" size="sm" onClick={() => setShowWelcomeLetter(true)}>View</Button> : null}
                  </div>
                  {isOffboarding ? (
                    <div className="flex items-center gap-3 border-t border-border pt-4">
                      <Award className={cn('size-4 shrink-0', internship.certificate.status === 'available' ? 'text-success' : 'text-fg-muted')} aria-hidden />
                      <div className="min-w-0 flex-1"><p className="text-[14px] font-medium text-fg">Certificate of Completion</p><p className="mt-1 text-[12px] text-fg-muted">{internship.certificate.status === 'available' ? `Issued ${fmtDate(internship.certificate.date)}` : 'Pending final clearance'}</p></div>
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
      {internship.welcomeLetter.body && (
        <Modal open={showWelcomeLetter} onClose={() => setShowWelcomeLetter(false)} maxWidth="md" labelledBy="welcome-letter-view-title">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 id="welcome-letter-view-title" className="text-headline-md text-fg">Welcome Letter</h2>
              <p className="text-body-sm text-fg-muted mt-0.5">{internship.programmeName} · {fmtDate(internship.welcomeLetter.date)}</p>
            </div>
          </div>
          <div className="bg-bg-subtle border border-border rounded-xl px-5 py-4 max-h-[60vh] overflow-y-auto">
            <pre className="text-body-sm text-fg whitespace-pre-wrap font-sans leading-relaxed">
              {internship.welcomeLetter.body}
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
