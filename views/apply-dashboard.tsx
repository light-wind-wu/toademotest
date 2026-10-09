'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CalendarDays, ClipboardList, GraduationCap } from 'lucide-react';
import Shell from '@/components/layout/shell';
import DstaPublicFooter from '@/components/apply/dsta-public-footer';
import OutOfScopeTooltip from '@/components/apply/out-of-scope-tooltip';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useRole } from '@/lib/role';
import { cn } from '@/lib/utils';
import { loadApplyDraft } from '@/lib/apply-application';
import { resolveArchetype, archetypeResultImage } from '@/lib/apply-project-fit';
import { useApplicantScenarioData } from '@/lib/applicant-scenario-data';
import { isApplicantHomeScenario, saveApplicantHomeScenario } from '@/lib/applicant-home-scenario';
import { APPLICANT_DASHBOARD_STATES, APPLICANT_DASHBOARD_STATE_TO_SCENARIO, APPLICANT_HOME_SCENARIO_TO_STATE, isApplicantDashboardState } from '@/lib/applicant-dashboard-states';
import type { ApplicantDashboardStateConfig } from '@/lib/types';

// One shared layout for every applicant stage, independent of legacy visual versions.
export default function ApplyDashboardPage() {
  const router = useRouter();
  const { profile } = useRole();
  const { homeScenario, interviews, applications } = useApplicantScenarioData();
  const [ready, setReady] = useState(false);
  const [archetype, setArchetype] = useState(() => resolveArchetype([]));
  const [quizTaken, setQuizTaken] = useState(false);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const state = params.get('state');
    const scenario = params.get('scenario');
    if (isApplicantDashboardState(state)) saveApplicantHomeScenario(APPLICANT_DASHBOARD_STATE_TO_SCENARIO[state]);
    else if (isApplicantHomeScenario(scenario)) saveApplicantHomeScenario(scenario);
    const draft = loadApplyDraft();
    setArchetype(resolveArchetype(draft.quizAnswers));
    setQuizTaken(draft.quizTaken);
    setReady(true);
  }, []);

  const state = APPLICANT_HOME_SCENARIO_TO_STATE[homeScenario];
  const noApplication = state === 'no_active_application';
  const multiple = state === 'multiple_active_applications';
  const config: ApplicantDashboardStateConfig = noApplication ? {
    ...APPLICANT_DASHBOARD_STATES.draft_application,
    badge: 'No application yet', spotlightTitle: 'Find your internship at DSTA',
    spotlightCopy: 'Explore our internship programmes and choose one that fits your interests and study stage.',
    metadata: [], dueText: undefined,
    primaryAction: { label: 'Explore Internships', route: '/join-us/student/internships' }, secondaryAction: null,
    journeyTitle: 'Get started', journeyItems: ['Explore internship programmes', 'Prepare your details and supporting documents', 'Start your application'],
  } : multiple ? {
    ...APPLICANT_DASHBOARD_STATES.interview_invitation,
    badge: 'Multiple applications', spotlightTitle: 'One application needs your attention',
    spotlightCopy: 'Review your interview invitation and track each application from My Applications.',
    primaryAction: { label: 'View Interviews', route: '/apply/interviews' },
    secondaryAction: { label: 'View All Applications', route: '/apply/applications' },
  } : APPLICANT_DASHBOARD_STATES[state];
  const interview = interviews[0];
  const interviewStage = homeScenario.startsWith('interview-');
  const pending = homeScenario === 'interview-pending-confirmation';
  const invitation = homeScenario === 'interview-action';
  const rescheduling = homeScenario === 'interview-rescheduling';
  const confirmed = homeScenario === 'interview-scheduled';
  const closed = config.pattern === 'closed';
  const internshipStage = ['onboarding', 'internship', 'completion'].includes(config.journeyStage);
  const title = invitation ? 'Choose an interview timeslot' : pending ? 'Your interview request is under review' : config.spotlightTitle;
  const description = invitation ? 'Choose an available timeslot to confirm your interview, or request another time if none of the suggested slots work for you.'
    : pending ? 'The interview team will review your comments and contact you with an update. Your interview is not confirmed yet.'
    : confirmed && interview ? interview.statusMessage : config.spotlightCopy;
  const primary = interviewStage && (invitation || pending || confirmed || rescheduling)
    ? { label: invitation ? 'Choose a Timeslot' : pending ? 'View Request' : rescheduling ? 'Reschedule Interview' : 'Manage Interview', route: '/apply/interviews' } : config.primaryAction;
  const secondary = pending ? { label: 'View Application', route: '/apply/applications/app-ui-2027' } : config.secondaryAction;
  const metadata = interviewStage ? [
    { label: 'Programme', value: applications.find(item => item.focal)?.programme ?? 'University Internship 2027' },
    { label: 'Application reference', value: 'APP-UI27-00418' },
    ...(confirmed && interview?.confirmedStart ? [{ label: 'Interview date', value: interview.confirmedStart }] : invitation || rescheduling ? [{ label: 'Respond by', value: interview?.respondBy ?? config.dueText ?? 'See interview details' }] : [{ label: 'Status', value: config.badge }]),
  ] : config.metadata;
  const nextSteps = invitation ? ['Choose an available timeslot or request another time', 'Check your interview confirmation', 'Prepare for your interview']
    : pending ? ['The interview team reviews your comments', 'You receive an update in the portal and by email', 'Review and confirm the interview arrangements'] : config.journeyItems.length ? config.journeyItems : config.guideItems;
  const stages = internshipStage
    ? [{ id: 'offer', label: 'Offer accepted' }, { id: 'onboarding', label: 'Onboarding' }, { id: 'internship', label: 'Internship' }, { id: 'completion', label: 'Completion' }] as const
    : [{ id: 'application', label: noApplication ? 'Explore' : config.state === 'draft_application' ? 'Draft' : 'Submitted' }, { id: 'review', label: 'Under review' }, { id: 'interview', label: 'Interview' }, { id: 'offer', label: 'Outcome' }] as const;
  function navigate(route: string) {
    router.push(route === '/apply/applications' && !multiple ? '/apply/applications/app-ui-2027' : route);
  }
  if (!ready) return <div className="p-6 text-sm text-fg-muted">Loading dashboard…</div>;

  return <Shell activeRoute="/apply/dashboard" flushTop flushBottom>
    <div data-dashboard-scenario={homeScenario} className="relative mx-[calc(-1*clamp(24px,2.6vw,40px))] bg-bg text-fg">
      <header className="relative mx-auto h-[192px] w-full max-w-[1440px] px-6">
        <img src="/images/dashboard-figjam-banner.png" alt="" className="pointer-events-none absolute inset-x-0 top-0 h-[227px] w-full object-cover object-right max-sm:opacity-40" />
        <h1 className="relative pt-20 text-[32px] font-semibold leading-10 tracking-tight max-sm:text-2xl">Welcome back, {profile.name.split(' ')[0] || 'there'}</h1>
      </header>
      <div className="relative mx-auto max-w-[1440px] space-y-4 px-6 pb-8">
        <Card className="relative overflow-hidden p-6 shadow-none">
          <img src="/images/dashboard-figjam-journey.png" alt="" width={241} height={73} className="pointer-events-none absolute left-[140px] top-px h-[73px] w-[241px] max-sm:opacity-40" />
          <div className="relative"><p className="text-sm leading-5 text-fg-muted">{internshipStage ? 'Internship map' : 'Application map'}</p><h2 className="mt-0.5 text-lg font-semibold leading-6">Your journey</h2></div>
          <ol aria-label="Applicant journey progress" className="relative mt-6 flex items-center overflow-x-auto pb-1">
            {stages.map((stage, index) => {
              const done = config.completedStages.includes(stage.id);
              const current = !done && config.journeyStage === stage.id;
              const terminal = closed && config.terminalStage === stage.id;
              return <li key={stage.id} aria-current={current ? 'step' : undefined} className={cn('flex items-center', index < stages.length - 1 ? 'flex-1' : 'shrink-0')}>
                <span className="flex shrink-0 items-center gap-2">
                  {done ? <img src="/images/application-detail-complete.svg" alt="Completed" width={24} height={24} className="size-[24px]" /> : <span className={cn('flex size-[24px] items-center justify-center rounded-full border text-sm', terminal ? 'border-danger bg-danger text-accent-fg' : current ? 'border-accent bg-accent text-accent-fg' : 'border-border text-fg-muted')}>{terminal ? '×' : index + 1}</span>}
                  <span className={cn('whitespace-nowrap text-sm', !done && !current && 'text-fg-muted')}>{terminal ? config.terminalLabel ?? stage.label : stage.label}</span>
                </span>
                {index < stages.length - 1 && <span aria-hidden className="mx-2 h-px min-w-6 flex-1 bg-border-strong" />}
              </li>;
            })}
          </ol>
        </Card>
        <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_314px]">
          <Card className="min-w-0 p-6 shadow-none">
            <h2 className="text-2xl font-semibold leading-8 tracking-tight">{title}</h2>
            <p className="mt-1 text-sm leading-5 text-fg-muted">{description}</p>
            {metadata.length > 0 && <dl className="mt-7 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {metadata.map((item, index) => {
                const Icon = /programme/i.test(item.label) ? GraduationCap : /date|time|respond|updated|period/i.test(item.label) ? CalendarDays : ClipboardList;
                return <div key={item.label} className={cn('flex min-w-0 gap-3', index > 0 && index % 3 !== 0 && 'lg:border-l lg:border-border lg:pl-4')}>
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-bg-muted text-fg-muted"><Icon className="size-5" aria-hidden /></span>
                  <div className="min-w-0"><dt className="text-sm leading-5 text-fg-muted">{item.label}</dt><dd className="mt-1 break-words text-sm leading-5">{item.value}</dd></div>
                </div>;
              })}
            </dl>}
            {!interviewStage && config.dueText && !closed && <p className="mt-4 text-sm text-fg-muted">{config.dueText}</p>}
            <div className="mt-7 flex flex-wrap gap-3">
              {primary?.route && <Button size="sm" onClick={() => navigate(primary.route!)}>{primary.label}</Button>}
              {secondary && (secondary.route ? <Button size="sm" variant="outline" onClick={() => navigate(secondary.route!)}>{secondary.label}</Button> : <OutOfScopeTooltip><Button size="sm" variant="outline">{secondary.label}</Button></OutOfScopeTooltip>)}
            </div>
            <section className="relative mt-6 min-h-[170px] border-t border-border pt-6">
              <img src="/images/dashboard-figjam-next.png" alt="" width={224} height={167} className="pointer-events-none absolute bottom-[-10px] right-[-8px] hidden h-auto w-56 sm:block" />
              <h3 className="relative text-lg font-semibold leading-6">{config.journeyTitle}</h3>
              <ol className="relative mt-5 space-y-4 sm:pr-56">
                {nextSteps.map((item, index) => <li key={item} className="flex gap-4 text-sm leading-6"><span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-info/10 text-xs text-info">{index + 1}</span><span>{item}</span></li>)}
              </ol>
            </section>
            {config.postInternshipItems && <div className="mt-6 divide-y divide-border border-t border-border">{config.postInternshipItems.map(item => <div key={item.title} className="flex flex-wrap items-center justify-between gap-3 py-4"><div><p className="text-sm font-medium">{item.title}</p><p className="mt-1 text-xs text-fg-muted">{item.status}</p></div>{item.route && <Button size="sm" variant="outline" onClick={() => navigate(item.route!)}>{item.action}</Button>}</div>)}</div>}
            {closed && <Badge variant="subtle" className="mt-5">{config.badge}</Badge>}
          </Card>
          <Card className="relative min-h-[389px] overflow-hidden p-6 shadow-none">
            <img src={archetypeResultImage(archetype.id, 'pc')} alt="" className="pointer-events-none absolute inset-0 h-full w-full object-cover object-bottom" />
            <div className="relative"><p className="text-sm leading-5 text-fg-muted">Your defender archetype</p><h2 className="mt-2 text-2xl font-semibold leading-8 text-warning">{archetype.name}</h2><p className="mt-1 max-w-[245px] text-sm leading-5">{archetype.tagline}</p></div>
            <Button size="sm" className="absolute bottom-6 left-6" onClick={() => router.push('/apply/project-fit')}>{quizTaken ? 'Retake Quiz' : 'Take Quiz'}</Button>
          </Card>
        </div>
      </div>
      <DstaPublicFooter />
    </div>
  </Shell>;
}
