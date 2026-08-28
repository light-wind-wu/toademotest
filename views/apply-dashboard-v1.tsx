'use client';

/* Apply Dashboard V1 — content max 1440; Part1 bg full-bleed of main column.
   Part1 hero sides fill; copy/art stay in 1440.
   Part2 status inset 24px: 335 | 60 | 1fr (Interview invited in normal flow).
   Part3 inset 24px: 1fr | 20 | 314 (fills width, right aligned).
   Map 143 | 40 | 1fr · Activity 676 | 16 | 270 */
import Image from 'next/image';
import { ArrowRight, Calendar } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Shell from '@/components/layout/shell';
import { useRole } from '@/lib/role';
import { PROJECT_MATCHES, resolveArchetype, archetypeResultImage } from '@/lib/apply-project-fit';
import { loadApplyDraft } from '@/lib/apply-application';
import { cn } from '@/lib/utils';
import { useEffect, useMemo, useState } from 'react';
import InterviewTimeslotSheet from '@/components/apply/interview-timeslot-sheet';
import LifecycleDashboardStage from '@/components/apply/applicant-dashboard/lifecycle-dashboard-stage';
import MultipleApplicationsDashboard from '@/components/apply/applicant-dashboard/multiple-applications-dashboard';
import OutOfScopeTooltip from '@/components/apply/out-of-scope-tooltip';
import DstaPublicFooter from '@/components/apply/dsta-public-footer';
import HeroRadarOverlay from '@/components/apply/hero-radar-overlay';
import { HeroV2Bg, HeroV2Fx } from '@/components/apply/hero-v2-art';
import {
  APPLICANT_HOME_DASHBOARD_ASSETS,
  APPLICANT_HOME_DASHBOARD_CONTENT,
  APPLICANT_HOME_DASHBOARD_PROGRAMMES,
} from '@/lib/applicant-home-dashboard-content';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import type { ApplyDashboardBase } from '@/lib/apply-dashboard-version';
import {
  APPLICANT_HOME_SCENARIO_CHANGED,
  isApplicantHomeScenario,
  loadApplicantHomeScenario,
} from '@/lib/applicant-home-scenario';
import {
  APPLICANT_DASHBOARD_STATES,
  APPLICANT_DASHBOARD_STATE_TO_SCENARIO,
  APPLICANT_HOME_SCENARIO_TO_STATE,
  isApplicantDashboardState,
} from '@/lib/applicant-dashboard-states';
import type {
  ApplicantHomeScenario,
  ApplicantHomeScenarioContent,
  ApplicantHomeProgrammeContent,
} from '@/lib/types';

const INTERVIEW_PROJECT_NAME = 'Designing Mission-Critical Digital Services';

const BASE_STEP_LABELS = ['Submitted', 'Under review', 'Interview', 'Offer', 'Outcome'] as const;

const HOME_SCENARIO_CONTENT = APPLICANT_HOME_DASHBOARD_CONTENT;

export interface ApplyDashboardViewProps {
  visualVariant?: ApplyDashboardBase;
  allowCustomRequest?: boolean;
}

export default function ApplyDashboardV1({
  visualVariant = 'v1',
  allowCustomRequest = true,
}: ApplyDashboardViewProps = {}) {
  const { profile } = useRole();
  const router = useRouter();
  const firstName = profile.name.split(' ')[0] || 'there';
  const [quizTaken, setQuizTaken] = useState(false);
  const [answers, setAnswers] = useState<(number | null)[]>([]);
  const [timeslotOpen, setTimeslotOpen] = useState(false);
  const [scenario, setScenario] = useState<ApplicantHomeScenario>('interview-action');

  useEffect(() => {
    const d = loadApplyDraft();
    setQuizTaken(d.quizTaken);
    setAnswers(d.quizAnswers);
    const searchParams = new URLSearchParams(window.location.search);
    const stateParam = searchParams.get('state');
    const scenarioParam = searchParams.get('scenario');
    if (isApplicantDashboardState(stateParam)) {
      setScenario(APPLICANT_DASHBOARD_STATE_TO_SCENARIO[stateParam]);
    } else if (isApplicantHomeScenario(scenarioParam)) {
      setScenario(scenarioParam);
    } else {
      setScenario(loadApplicantHomeScenario());
    }
    function onScenarioChange(event: Event) {
      const detail = (event as CustomEvent<ApplicantHomeScenario>).detail;
      if (isApplicantHomeScenario(detail)) setScenario(detail);
    }
    window.addEventListener(APPLICANT_HOME_SCENARIO_CHANGED, onScenarioChange);
    return () => window.removeEventListener(APPLICANT_HOME_SCENARIO_CHANGED, onScenarioChange);
  }, []);

  const archetype = useMemo(
    () => (quizTaken ? resolveArchetype(answers) : resolveArchetype([])),
    [quizTaken, answers],
  );
  const isMultipleApplications = scenario === 'multiple-applications';
  const contentScenario = isMultipleApplications
    ? 'interview-action'
    : scenario === 'interview-pending-confirmation'
      ? 'interview-scheduled'
      : scenario;
  const content = HOME_SCENARIO_CONTENT[contentScenario];
  const dashboardState = APPLICANT_HOME_SCENARIO_TO_STATE[scenario];
  const lifecycleConfig = dashboardState === 'no_active_application' || dashboardState === 'multiple_active_applications'
    ? null
    : APPLICANT_DASHBOARD_STATES[dashboardState];
  const heroCopy = isMultipleApplications
    ? 'You have 2 active applications. One action needs your attention.'
    : lifecycleConfig?.heroCopy ?? content.heroMessage;
  const heroBadge = isMultipleApplications ? '2 active applications' : lifecycleConfig?.badge ?? content.heroBadge;
  const assets = APPLICANT_HOME_DASHBOARD_ASSETS;
  const displayProgrammeTitle = 'University Internship 2027';
  const steps = useMemo(
    () => BASE_STEP_LABELS.map((label, index) => ({
      id: index + 1,
      label,
      done: content.progressIndex > index,
      current: content.progressIndex === index,
      hint: content.progressIndex === index ? content.progressHint : undefined,
    })),
    [content.progressHint, content.progressIndex],
  );
  const showApplicationMap =
    scenario === 'submitted' ||
    scenario === 'under-review' ||
    scenario === 'interview-action' ||
    scenario === 'interview-scheduled' ||
    scenario === 'interview-rescheduling' ||
    scenario === 'interview-completed' ||
    scenario === 'offer-action';
  const hideLatestActivity =
    scenario === 'interview-scheduled' || scenario === 'interview-rescheduling';
  const showInternshipHome =
    scenario === 'onboarding-action' ||
    scenario === 'active-internship' ||
    scenario === 'completion-action' ||
    scenario === 'journey-completed';
  const sectionEyebrow = showApplicationMap
    ? 'Application map'
    : showInternshipHome
      ? 'My internship'
      : scenario === 'draft-application'
        ? 'Application progress'
        : 'Explore internship opportunities';
  const sectionTitle = showApplicationMap
    ? 'Where you are now'
    : showInternshipHome
      ? INTERVIEW_PROJECT_NAME
      : scenario === 'draft-application'
        ? 'Finish your application'
        : 'Find the right programme for you';

  function handlePrimaryAction() {
    if (scenario === 'interview-action') {
      setTimeslotOpen(true);
      return;
    }
    router.push(content.primaryRoute);
  }

  function handleLifecyclePrimaryAction() {
    if (!lifecycleConfig?.primaryAction) return;
    if (dashboardState === 'interview_invitation') {
      setTimeslotOpen(true);
      return;
    }
    if (lifecycleConfig.primaryAction.route) router.push(lifecycleConfig.primaryAction.route);
  }

  return (
    <Shell activeRoute="/apply/dashboard" flushTop flushBottom>
      {/* Cancel shell gutter; Part1 bg full-bleed */}
      <div className="relative mx-[calc(-1*clamp(24px,2.6vw,40px))]">
          {/* ── Part 1: Hero — mobile aspect from bg (780×1108); PC 345 */}
          <header
            className={cn(
              'relative z-0 w-full overflow-hidden lg:overflow-visible',
              scenario === 'no-application'
                ? 'max-lg:aspect-[780/1108] lg:h-[300px]'
                : 'h-[300px] lg:h-[345px]',
            )}
            style={{ background: 'rgba(254, 253, 251, 1)' }}
          >
            <div className="relative mx-auto h-full w-full max-w-[1440px]">
              {/* Desktop ship bg + radar share one contain frame (sidebar-safe) */}
              <div className="ship-float pointer-events-none absolute inset-0 z-0 hidden lg:block">
                {visualVariant === 'v2' ? <HeroV2Bg /> : <HeroRadarOverlay />}
              </div>
              <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden lg:hidden">
                <Image
                  src={assets.heroMobile[visualVariant]}
                  alt=""
                  fill
                  className="object-cover object-center"
                  sizes="100vw"
                  priority
                />
              </div>

              <div className="absolute inset-x-0 top-0 z-10 px-4 pt-10 lg:inset-x-auto lg:left-16 lg:top-[60px] lg:h-[200px] lg:w-[760px] lg:px-0 lg:pt-0">
                <h1
                  className="text-[28px] font-semibold leading-8 tracking-[-0.48px] lg:text-[48px] lg:leading-[47px]"
                  style={{ color: 'rgba(15, 23, 43, 1)' }}
                >
                  Welcome back, {firstName}
                </h1>
                <p
                  className={cn(
                    'mt-2 text-[14px] font-normal lg:mt-4 lg:text-[16px]',
                    lifecycleConfig || isMultipleApplications ? 'max-w-[680px] leading-5 lg:leading-6' : 'leading-[100%]',
                  )}
                  style={{ color: 'rgba(74, 85, 104, 1)' }}
                >
                  {heroCopy}
                </p>
                <span
                  className="mt-6 inline-flex h-[22px] items-center gap-1.5 rounded-full px-2.5 text-[12px] font-normal leading-4 lg:mt-4"
                  style={{
                    background: 'rgba(0, 166, 244, 0.15)',
                    color: 'rgba(0, 105, 168, 1)',
                  }}
                >
                  <span className="size-1.5 rounded-full bg-current" aria-hidden />
                  {heroBadge}
                </span>
              </div>
            </div>
          </header>

          {visualVariant === 'v2' ? (
            <div className="pointer-events-none absolute inset-x-0 top-0 z-30 hidden h-[345px] overflow-visible lg:block">
              <div className="relative mx-auto h-full w-full max-w-[1440px] overflow-visible">
                <HeroV2Fx />
              </div>
            </div>
          ) : null}

          {isMultipleApplications ? (
            <MultipleApplicationsDashboard
              archetypeImage={archetypeResultImage(archetype.id, 'pc')}
              activityIllustration={assets.activityIllustration}
              onSelectTimeslots={() => setTimeslotOpen(true)}
            />
          ) : lifecycleConfig ? (
            <LifecycleDashboardStage
              config={lifecycleConfig}
              archetypeImage={archetypeResultImage(archetype.id, 'pc')}
              statusIllustration={assets.statusRadar[visualVariant]}
              activityIllustration={assets.activityIllustration}
              journeyTopDecoration={assets.mapTopDesktop}
              journeyTopMobileDecoration={assets.mapTopMobile}
              onPrimaryAction={handleLifecyclePrimaryAction}
            />
          ) : (
          <>
          {/* New applicants do not yet have an application status card. */}
          {scenario !== 'no-application' ? (
          <div className="relative z-20 mx-auto w-full max-w-[1440px] max-lg:mt-0 lg:-mt-[345px]">
            <div className="pointer-events-none hidden lg:block lg:h-[345px]" aria-hidden />

            {/* ── Part 2: Status — height from content; PC 335 | 60 | 1fr */}
            <section
              className="relative z-20 mx-4 -mt-[70px] overflow-hidden rounded-2xl bg-white p-6 lg:absolute lg:top-[298px] lg:right-6 lg:left-6 lg:mx-0 lg:mt-0"
              style={{
                background: 'rgba(255, 255, 255, 1)',
                border: '1px solid rgba(231, 228, 221, 1)',
              }}
            >
              <div
                className="pointer-events-none absolute bottom-[47px] right-[-0px] z-0 hidden h-[285px] w-[354px] lg:block"
                aria-hidden
              >
                <Image
                  src={assets.statusRadar[visualVariant]}
                  alt=""
                  width={354}
                  height={285}
                  className="h-[285px] w-[354px] max-w-none object-contain object-right-bottom"
                />
              </div>

              <div className="relative z-10 flex flex-col gap-6 lg:grid lg:grid-cols-[335px_minmax(0,1fr)] lg:items-start lg:gap-[60px]">
                <div
                  className="relative w-full shrink-0 overflow-hidden rounded-lg text-white max-lg:aspect-[343/371] lg:h-[338px] lg:w-[335px] lg:aspect-auto"
                  style={{ background: 'rgba(15, 45, 110, 1)' }}
                >
                  <div className="pointer-events-none absolute inset-0 z-0">
                    <Image
                      src={assets.bannerDesktop}
                      alt=""
                      fill
                      className="object-cover object-bottom max-lg:hidden"
                      sizes="335px"
                    />
                    <Image
                      src={assets.bannerMobile}
                      alt=""
                      fill
                      className="object-cover object-bottom lg:hidden"
                      sizes="100vw"
                    />
                  </div>
                  <div className="relative z-[1] p-5">
                    <p
                      className="text-[20px] font-medium tracking-[-0.48px] leading-[28.8px] lg:text-[24px]"
                      style={{ color: 'rgba(255, 255, 255, 1)' }}
                    >
                      {content.bannerLines[0]}
                      <br />
                      {content.bannerLines[1]}
                      <br />
                      {content.bannerLines[2]}
                    </p>
                    <p
                      className="mt-0.5 text-[14px] font-normal leading-[120%] lg:mt-2"
                      style={{ color: 'rgba(255, 255, 255, 0.74)' }}
                    >
                      {content.bannerBody}
                    </p>
                  </div>
                </div>

                <div className="relative z-10 flex min-w-0 w-full flex-col">
                  <div className="relative flex flex-wrap items-center justify-between gap-2">
                    <p
                      className="min-w-0 text-[12px] font-normal leading-5 lg:text-[14px]"
                      style={{ color: 'rgba(69, 85, 108, 1)' }}
                    >
                      {content.recordDate}
                    </p>
                    <span
                      className="relative z-10 inline-flex h-[22px] shrink-0 items-center rounded-full px-2.5 text-[12px] font-normal leading-4"
                      style={{
                        background: 'rgba(244, 242, 236, 1)',
                        color: 'rgba(15, 23, 43, 1)',
                      }}
                    >
                      {content.statusLabel}
                    </span>
                  </div>
                  <h2
                    className="mt-2 text-[18px] font-semibold leading-[28.8px] lg:mt-2 lg:text-[24px] lg:tracking-[-0.48px]"
                    style={{ color: 'rgba(10, 22, 40, 1)' }}
                  >
                    {displayProgrammeTitle}
                  </h2>
                  <p
                    className="mt-0.5 text-[14px] font-normal leading-[120%] lg:mt-2"
                    style={{ color: 'rgba(74, 85, 104, 1)' }}
                  >
                    {content.summary}
                  </p>
                  <p
                    className="mt-6 text-[14px] font-medium leading-[120%] lg:mt-8"
                    style={{ color: 'rgba(74, 85, 104, 1)' }}
                  >
                    {content.dueText}
                  </p>
                  <div className="relative z-10 mt-6 flex gap-2">
                    <button
                      type="button"
                      onClick={handlePrimaryAction}
                      className="h-9 min-w-0 flex-1 cursor-pointer rounded-md px-3 text-[14px] text-white lg:flex-none lg:px-4"
                      style={{ background: 'rgba(26, 101, 248, 1)', height: 36 }}
                    >
                      {content.primaryLabel}
                    </button>
                    <OutOfScopeTooltip>
                      <button
                        type="button"
                        className="h-9 min-w-0 flex-1 cursor-pointer rounded-md border border-border bg-bg px-3 text-[14px] text-fg lg:flex-none lg:px-4"
                        style={{ height: 36 }}
                      >
                        {content.secondaryLabel}
                      </button>
                    </OutOfScopeTooltip>
                  </div>
                </div>
              </div>
            </section>

            <div
              className="pointer-events-none hidden lg:block"
              /* Part2 top 298 + p-6 + 338 col + p-6 + 24 gap − hero spacer 345 */
              style={{ height: 'calc(298px + 24px + 338px + 24px + 24px - 345px)' }}
              aria-hidden
            />
          </div>
          ) : null}

          {/* ── Part 3: mobile inset 16; PC 1fr | 20 | 314 ─── */}
          <div
            className={cn(
              'relative mx-auto w-full max-w-[1440px] px-4 pb-8 lg:px-6',
              scenario === 'no-application' ? 'pt-4 lg:-mt-4 lg:pt-0' : 'pt-6 lg:pt-0',
            )}
          >
            <div className="flex flex-col gap-5 lg:grid lg:grid-cols-[minmax(0,1fr)_314px] lg:items-start lg:gap-5">
              <div className="flex min-w-0 w-full flex-col gap-5">
                <section
                  className="relative min-w-0 overflow-hidden rounded-lg p-6 max-lg:pr-6 lg:pr-8"
                  style={{
                    borderRadius: 8,
                    border: '1px solid rgba(231, 228, 221, 1)',
                    background: 'rgba(251, 252, 253, 1)',
                  }}
                >
                  <div
                    className="pointer-events-none absolute right-0 top-0 z-0 hidden h-[116px] w-[370px] lg:block"
                    aria-hidden
                  >
                    <Image
                      src={assets.mapTopDesktop}
                      alt=""
                      width={370}
                      height={116}
                      className="h-[116px] w-[370px] max-w-none object-contain object-right-top"
                    />
                  </div>
                  <div
                    className="pointer-events-none absolute right-[26px] top-[124px] z-0 h-[72px] w-[260px] lg:hidden"
                    aria-hidden
                  >
                    <Image
                      src={assets.mapTopMobile}
                      alt=""
                      width={260}
                      height={72}
                      className="h-[72px] w-[260px] max-w-none object-contain object-right-top"
                    />
                  </div>
                  <div
                    className="pointer-events-none absolute bottom-0 left-10 z-0 hidden h-[140px] w-[240px] lg:block lg:h-[177px] lg:w-[323px]"
                    aria-hidden
                  >
                    <Image
                      src={assets.mapBottomDesktop}
                      alt=""
                      fill
                      className="object-contain object-left-bottom"
                      sizes="323px"
                    />
                  </div>

                  <div className="relative z-[1]">
                    <p
                      style={{
                        fontWeight: 400,
                        fontSize: 14,
                        lineHeight: '20px',
                        color: 'rgba(69, 85, 108, 1)',
                      }}
                    >
                      {sectionEyebrow}
                    </p>
                    <h3
                      className="mt-1.5 text-[20px] font-semibold leading-[28.8px] lg:mt-0.5 lg:text-[18px] lg:leading-6 lg:tracking-[-0.45px]"
                      style={{ color: 'rgba(10, 22, 40, 1)' }}
                    >
                      {sectionTitle}
                    </h3>

                    {showApplicationMap ? (
                      <>
                    <VerticalProgressBar
                      steps={steps}
                      ariaLabel="Application progress"
                      className="mt-6 lg:hidden"
                    />

                    {/* Mobile: Interview + invitation + tasks (16px gap) */}
                    <div className="relative mt-3.5 lg:hidden">
                      <div className="relative">
                        <h4
                          className="text-[18px] font-medium leading-[28.8px]"
                          style={{ color: 'rgba(10, 22, 40, 1)' }}
                        >
                          {content.detailLabel}
                        </h4>
                        <p
                          className="mt-0.5 text-[14px] font-normal leading-[100%]"
                          style={{ color: 'rgba(74, 85, 104, 1)' }}
                        >
                          {content.progressHint}
                        </p>
                      </div>
                      <JourneyDetailCard content={content} className="relative mt-6" mobile />
                      <TasksCard content={content} className="relative mt-4" stacked />
                    </div>

                    {/* Desktop: 143 | 40 | 1fr */}
                    <div className="mt-12 hidden lg:grid lg:grid-cols-[143px_minmax(0,1fr)] lg:gap-10">
                      <VerticalProgressBar
                        steps={steps}
                        ariaLabel="Application progress"
                      />

                      <div className="min-w-0 w-full space-y-4">
                        <JourneyDetailCard content={content} />
                        <TasksCard content={content} />
                      </div>
                    </div>
                      </>
                    ) : showInternshipHome ? (
                      <InternshipHomeSection scenario={scenario} content={content} />
                    ) : (
                      <PreApplicationSection scenario={scenario} content={content} />
                    )}
                  </div>
                </section>

                {scenario === 'no-application' ? (
                  <ArchetypeDiscoveryCard content={content} />
                ) : !hideLatestActivity ? (
                <section className="relative overflow-hidden rounded-2xl border border-border bg-white p-6">
                  <div className="relative z-[1] flex flex-col lg:flex-row lg:items-start lg:justify-between lg:gap-3">
                    <div>
                      <p
                        className="text-[14px] font-normal leading-5"
                        style={{ color: 'rgba(69, 85, 108, 1)' }}
                      >
                        Latest activity
                      </p>
                      <h3
                        className="mt-1.5 text-[18px] font-semibold leading-6 lg:mt-0.5 lg:tracking-[-0.45px]"
                        style={{ color: 'rgba(10, 22, 40, 1)' }}
                      >
                        Updates from your journey
                      </h3>
                    </div>
                    {content.activity.length > 0 ? (
                      <OutOfScopeTooltip>
                        <button
                          type="button"
                          className="mt-4 self-start cursor-pointer text-[14px] font-medium leading-5 text-[rgba(26,101,248,1)] lg:mt-0"
                        >
                          Mark All Read
                        </button>
                      </OutOfScopeTooltip>
                    ) : null}
                  </div>

                  {content.activity.length === 0 ? (
                    <div className="relative z-[1] mt-6 flex min-h-[180px] flex-col items-center justify-center rounded-xl border border-dashed border-border bg-bg-subtle px-6 text-center">
                      <span className="mb-3 flex size-10 items-center justify-center rounded-full bg-bg text-fg-muted" aria-hidden>
                        <Calendar className="size-5" strokeWidth={1.5} />
                      </span>
                      <p className="text-[16px] font-semibold leading-6 text-fg">No activity yet</p>
                      <p className="mt-1 max-w-md text-[14px] leading-5 text-fg-muted">
                        Updates will appear here after you start an application.
                      </p>
                    </div>
                  ) : (
                  <div className="relative z-[1] mt-6 flex flex-col gap-4 lg:grid lg:grid-cols-[minmax(0,676px)_270px] lg:gap-4">
                    <ol
                      className="relative min-w-0 w-full lg:max-w-[676px]"
                      aria-label="Activity timeline"
                    >
                      {content.activity.map((item, i) => {
                        const isLast = i === content.activity.length - 1;
                        return (
                          <li key={item.title} className="flex items-stretch gap-6">
                            <div className="relative w-2.5 shrink-0 self-stretch">
                              <span
                                className="relative z-[1] mx-auto mt-[6px] block size-2.5 rounded-full"
                                style={{
                                  background:
                                    item.tone === 'warning'
                                      ? 'rgba(246, 104, 14, 1)'
                                      : 'rgba(26, 101, 248, 1)',
                                }}
                                aria-hidden
                              />
                              {/* Rail stretches with content+pb; line runs gap and meets next dot */}
                              {!isLast && (
                                <span
                                  className="absolute left-1/2 top-[15px] bottom-[-6px] w-px -translate-x-1/2"
                                  style={{ background: 'rgba(231, 228, 221, 1)' }}
                                  aria-hidden
                                />
                              )}
                            </div>
                            <div
                              className={cn(
                                'flex min-w-0 flex-1 flex-col lg:flex-row lg:items-start lg:justify-between lg:gap-3',
                                !isLast && 'pb-6',
                              )}
                            >
                              <div className="min-w-0">
                                <p
                                  className="text-[16px] font-medium leading-[140%] lg:text-[14px] lg:font-semibold lg:leading-5"
                                  style={{ color: 'rgba(0, 0, 0, 0.87)' }}
                                >
                                  {item.title}
                                </p>
                                <p
                                  className="mt-0.5 text-[12px] font-normal leading-[140%] lg:text-[13px] lg:leading-5"
                                  style={{ color: 'rgba(69, 85, 108, 0.87)' }}
                                >
                                  {item.body}
                                </p>
                              </div>
                              <span className="mt-4 inline-flex shrink-0 items-center gap-1 lg:mt-0 lg:pt-0.5">
                                <Calendar
                                  className="size-4 shrink-0 lg:size-3.5"
                                  strokeWidth={1.5}
                                  style={{ color: 'rgba(3, 3, 3, 1)' }}
                                />
                                <span
                                  className="text-[12px] font-normal leading-4"
                                  style={{ color: 'rgba(3, 3, 3, 1)' }}
                                >
                                  {item.date}
                                </span>
                              </span>
                            </div>
                          </li>
                        );
                      })}
                    </ol>

                    <div className="pointer-events-none relative mx-auto hidden h-[200px] w-[270px] shrink-0 lg:block">
                      <Image
                        src={assets.activityIllustration}
                        alt=""
                        fill
                        className="object-contain object-right-bottom"
                        sizes="270px"
                      />
                    </div>
                  </div>
                  )}
                </section>
                ) : null}
              </div>

              {scenario === 'no-application' ? (
                <NoApplicationAside />
              ) : showInternshipHome ? (
                <InternshipStageAside
                  scenario={scenario}
                  illustration={assets.activityIllustration}
                  onOpen={() => router.push(content.primaryRoute)}
                />
              ) : (
              <aside
                className="relative mx-auto h-auto min-h-[420px] w-full shrink-0 overflow-hidden rounded-2xl p-6 max-lg:max-w-none lg:mx-0 lg:h-[423px] lg:min-h-0 lg:w-[314px] lg:max-w-[314px]"
                style={{
                  border: '1px solid rgba(231, 228, 221, 1)',
                  boxShadow: '0px 1px 2px 0px rgba(0, 0, 0, 0.05)',
                }}
              >
                <div className="pointer-events-none absolute inset-0 z-0" aria-hidden>
                  <Image
                    src={archetypeResultImage(archetype.id, 'pc')}
                    alt=""
                    fill
                    className="object-cover object-bottom max-lg:hidden"
                    sizes="314px"
                  />
                  <Image
                    src={archetypeResultImage(archetype.id, 'mobile')}
                    alt=""
                    fill
                    className="object-cover object-bottom lg:hidden"
                    sizes="100vw"
                  />
                </div>

                <div className="relative z-[1]">
                  <p
                    className="text-[12px] font-normal leading-6"
                    style={{ color: 'rgba(41, 41, 41, 1)' }}
                  >
                    Your defender archetype
                  </p>
                  <h3
                    className="mt-0.5 text-[24px] font-semibold leading-[44px] lg:text-[28px]"
                    style={{ color: archetype.color }}
                  >
                    {archetype.name}
                  </h3>
                  <p
                    className="mt-2 text-[14px] font-normal leading-6 lg:text-[16px]"
                    style={{ color: 'rgba(69, 85, 108, 1)' }}
                  >
                    {archetype.tagline}
                  </p>
                </div>

                <OutOfScopeTooltip>
                  <button
                    type="button"
                    className="absolute bottom-9 left-6 z-[1] h-8 cursor-pointer rounded-md px-3 text-[12px] font-medium leading-4 lg:bottom-6"
                    style={{
                      background: 'rgba(26, 101, 248, 1)',
                      color: 'rgba(255, 255, 255, 1)',
                      fontWeight: 500,
                      fontSize: 12,
                      lineHeight: '16px',
                    }}
                  >
                    Play Quiz Again
                  </button>
                </OutOfScopeTooltip>
              </aside>
              )}
            </div>
          </div>
          </>
          )}
      </div>

      <DstaPublicFooter className="mx-[calc(-1*clamp(24px,2.6vw,40px))] mt-10" />

      <InterviewTimeslotSheet
        open={timeslotOpen}
        onOpenChange={setTimeslotOpen}
        projectName={INTERVIEW_PROJECT_NAME}
        allowCustomRequest={allowCustomRequest}
        sourceVersion={visualVariant}
      />
    </Shell>
  );
}

function PreApplicationSection({
  scenario,
  content,
}: {
  scenario: ApplicantHomeScenario;
  content: ApplicantHomeScenarioContent;
}) {
  const isDraft = scenario === 'draft-application';
  const stages = [
    { label: 'Profile', state: 'done' },
    { label: 'Education', state: 'done' },
    { label: 'Preferences', state: 'current' },
    { label: 'Review', state: 'upcoming' },
  ];

  return (
    <div className="mt-8 space-y-4">
      {isDraft ? (
      <div className="rounded-xl border border-border bg-white p-5 lg:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[14px] text-fg-muted">
              {isDraft ? 'Your application is saved automatically' : 'A simple path to your first application'}
            </p>
            <p className="mt-1 text-[18px] font-semibold text-fg">
              {isDraft ? '4 of 6 sections completed' : 'Explore before you commit'}
            </p>
          </div>
          <p className="text-[13px] font-medium text-accent">
            {isDraft ? 'About 8 minutes remaining' : 'Applications close 30 Sep 2026'}
          </p>
        </div>
        <VerticalProgressBar
          className="mt-6"
          ariaLabel="Draft application progress"
          steps={stages.map((stage, index) => ({
            id: index + 1,
            label: stage.label,
            done: stage.state === 'done',
            current: stage.state === 'current',
          }))}
        />
      </div>
      ) : null}

      {isDraft ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <JourneyDetailCard content={content} mobile />
          <TasksCard content={content} stacked />
        </div>
      ) : (
        <ProgrammeCards />
      )}
    </div>
  );
}

function ProgrammeCards() {
  const router = useRouter();

  return (
    <section aria-label="Programme options">
      <div className="grid gap-4 md:grid-cols-3">
        {APPLICANT_HOME_DASHBOARD_PROGRAMMES.map((programme) => (
          <ProgrammeCard
            key={programme.id}
            programme={programme}
            onView={() => router.push(programme.route)}
          />
        ))}
      </div>
    </section>
  );
}

function ProgrammeCard({
  programme,
  onView,
}: {
  programme: ApplicantHomeProgrammeContent;
  onView: () => void;
}) {
  return (
    <Card className="flex min-h-[280px] flex-col overflow-hidden shadow-none">
      <CardHeader className="flex-row items-start justify-between gap-4 p-5 pb-3">
        <Badge variant={programme.statusTone} className="shrink-0">
          {programme.status}
        </Badge>
        <Image
          src={programme.iconImage}
          alt=""
          width={44}
          height={44}
          className="size-11 shrink-0 rounded-lg object-cover"
        />
      </CardHeader>
      <CardContent className="flex-1 px-5 pb-4 pt-0">
        <CardTitle className="text-[16px] leading-6">{programme.title}</CardTitle>
        <p className="mt-2 text-[13px] leading-5 text-fg-muted">{programme.description}</p>
        <p className="mt-5 inline-flex items-center gap-2 text-[13px] font-medium leading-5 text-fg">
          <Calendar className="size-4 shrink-0" strokeWidth={1.5} aria-hidden />
          {programme.dateLabel}
        </p>
      </CardContent>
      <CardFooter className="p-5 pt-0">
        <Button onClick={onView} className="w-full justify-between">
          View Programme
          <ArrowRight className="size-4" strokeWidth={1.5} aria-hidden />
        </Button>
      </CardFooter>
    </Card>
  );
}

function ArchetypeDiscoveryCard({ content }: { content: ApplicantHomeScenarioContent }) {
  const router = useRouter();
  const task = content.tasks[1];

  return (
    <Card className="overflow-hidden rounded-2xl shadow-none">
      <div className="grid min-h-[220px] items-center gap-6 p-6 md:grid-cols-[minmax(0,1fr)_300px]">
        <div className="max-w-xl">
          <p className="text-[14px] leading-5 text-fg-muted">Not sure which opportunity suits you?</p>
          <h3 className="mt-1 text-[20px] font-semibold leading-7 text-fg">{task.title}</h3>
          <p className="mt-2 text-[14px] leading-5 text-fg-muted">{task.body}</p>
          <Button className="mt-5" onClick={() => task.route && router.push(task.route)}>
            {task.cta}
            <ArrowRight className="size-4" strokeWidth={1.5} aria-hidden />
          </Button>
        </div>
        <div className="relative hidden aspect-[334/247] overflow-hidden md:block" aria-hidden>
          <Image
            src={task.imageDesktop}
            alt=""
            fill
            className="scale-[1.02] object-cover"
            sizes="300px"
          />
        </div>
      </div>
    </Card>
  );
}

function InternshipHomeSection({
  scenario,
  content,
}: {
  scenario: ApplicantHomeScenario;
  content: ApplicantHomeScenarioContent;
}) {
  const currentIndex =
    scenario === 'onboarding-action'
      ? 0
      : scenario === 'active-internship'
        ? 2
        : scenario === 'completion-action'
          ? 3
          : 4;
  const internshipStages = [
    { label: 'Onboarding', hint: 'Complete pre-internship requirements' },
    { label: 'Ready', hint: 'Prepare for your first day' },
    { label: 'Active', hint: 'Complete your internship project' },
    { label: 'Complete', hint: 'Finish feedback and receive your certificate' },
  ];

  return (
    <div className="mt-8 grid gap-6 md:grid-cols-[180px_minmax(0,1fr)] md:gap-10">
      <div className="min-w-0">
        <VerticalProgressBar
          ariaLabel="Internship progress"
          steps={internshipStages.map((stage, index) => ({
            id: index + 1,
            label: stage.label,
            done: currentIndex > index,
            current: currentIndex === index,
            hint: currentIndex === index ? stage.hint : undefined,
          }))}
        />
      </div>

      <div className="min-w-0 space-y-4">
        <JourneyDetailCard content={content} />
        <TasksCard content={content} />
      </div>
    </div>
  );
}

function NoApplicationAside() {
  const preparationItems = [
    'Check programme eligibility',
    'Prepare your education details',
    'Prepare supporting documents',
  ];

  return (
    <aside className="relative mx-auto min-h-[360px] w-full shrink-0 overflow-hidden rounded-2xl border border-border bg-white p-6 shadow-sm max-lg:max-w-none lg:mx-0 lg:min-h-[423px] lg:w-[314px] lg:max-w-[314px]">
      <p className="text-[12px] leading-5 text-fg-muted">Application guide</p>
      <h3 className="mt-1 text-[18px] font-semibold leading-6 text-fg">Before you apply</h3>
      <p className="mt-3 text-[14px] leading-5 text-fg-muted">
        Have these ready when you start your application.
      </p>

      <ol className="mt-6 space-y-4" aria-label="Application preparation checklist">
        {preparationItems.map((item, index) => (
          <li key={item} className="flex items-center gap-3">
            <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-full border border-border bg-bg-subtle text-[12px] font-medium text-fg">
              {index + 1}
            </span>
            <span className="text-[14px] leading-5 text-fg">{item}</span>
          </li>
        ))}
      </ol>

      <div className="mt-7 flex items-center gap-4 rounded-xl bg-bg-muted px-5 py-4">
        <Image
          src="/images/application-window-calendar.svg"
          alt=""
          width={16}
          height={16}
          className="size-4 shrink-0"
        />
        <div>
          <p className="text-[14px] leading-5 text-fg-muted">Application window</p>
          <p className="mt-1 text-[14px] font-medium leading-5 text-fg">Open until 30 Sep 2026</p>
        </div>
      </div>

      <OutOfScopeTooltip>
        <Button className="mt-5">
          View Application Guide
        </Button>
      </OutOfScopeTooltip>
    </aside>
  );
}

function InternshipStageAside({
  scenario,
  illustration,
  onOpen,
}: {
  scenario: ApplicantHomeScenario;
  illustration: string;
  onOpen: () => void;
}) {
  const copy = scenario === 'onboarding-action'
    ? { eyebrow: 'Onboarding progress', value: '3 of 6', body: 'Complete your remaining tasks before day one.', cta: 'Continue Onboarding' }
    : scenario === 'active-internship'
      ? { eyebrow: 'Internship progress', value: 'Week 5 of 12', body: 'Your next mentor check-in is on 16 Oct 2026.', cta: 'View Internship' }
      : scenario === 'completion-action'
        ? { eyebrow: 'Completion checklist', value: '1 action left', body: 'Submit your internship feedback by 18 Dec 2026.', cta: 'Start Feedback' }
        : { eyebrow: 'Your achievement', value: 'Certificate ready', body: 'Your certificate and completed record are available any time.', cta: 'View Certificate' };

  return (
    <aside
      className="relative mx-auto min-h-[360px] w-full shrink-0 overflow-hidden rounded-2xl border border-border bg-white p-6 shadow-sm max-lg:max-w-none lg:mx-0 lg:min-h-[423px] lg:w-[314px] lg:max-w-[314px]"
    >
      <div className="relative z-[1]">
        <p className="text-[12px] leading-6 text-fg-muted">{copy.eyebrow}</p>
        <h3 className="mt-1 text-[26px] font-semibold leading-8 text-accent">{copy.value}</h3>
        <p className="mt-3 text-[14px] leading-6 text-fg-muted">{copy.body}</p>
      </div>
      <div className="pointer-events-none absolute inset-x-6 bottom-16 h-[180px]" aria-hidden>
        <Image src={illustration} alt="" fill className="object-contain object-right-bottom" sizes="270px" />
      </div>
      <button
        type="button"
        onClick={onOpen}
        className="absolute bottom-6 left-6 z-[1] h-8 cursor-pointer rounded-md bg-[rgba(26,101,248,1)] px-3 text-[12px] font-medium text-white"
      >
        {copy.cta}
      </button>
    </aside>
  );
}

type VerticalProgressStep = {
  id: number;
  label: string;
  done: boolean;
  current?: boolean;
  hint?: string;
};

function VerticalProgressBar({
  steps,
  ariaLabel,
  className,
}: {
  steps: readonly VerticalProgressStep[];
  ariaLabel: string;
  className?: string;
}) {
  return (
    <ol className={cn('flex flex-col', className)} aria-label={ariaLabel}>
      {steps.map((step, index) => {
        const isLast = index === steps.length - 1;
        return (
          <li key={step.id} className="flex gap-3">
            <div className="flex w-6 shrink-0 flex-col items-center">
              <StepGlyph step={step} />
              {!isLast ? (
                <span
                  className={cn(
                    'my-2 h-8 w-px shrink-0',
                    step.done ? 'bg-success' : 'bg-border',
                  )}
                  aria-hidden
                />
              ) : null}
            </div>
            <div className="min-w-0 pt-0.5">
              <p
                className={cn(
                  'text-[14px] leading-5',
                  step.done || step.current ? 'font-medium text-fg' : 'text-fg-muted',
                )}
              >
                {step.label}
              </p>
              {step.current && step.hint ? (
                <p className="mt-0.5 text-[12px] leading-4 text-fg-muted">{step.hint}</p>
              ) : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function StepGlyph({
  step,
}: {
  step: { id: number; done: boolean; current?: boolean };
}) {
  if (step.done) {
    return (
      <Image
        src="/images/step-complete.svg"
        alt=""
        width={24}
        height={24}
        className="size-6 shrink-0"
      />
    );
  }
  if (step.current) {
    return (
      <span
        className="inline-flex size-6 shrink-0 items-center justify-center rounded-full text-white"
        style={{
          background: 'rgba(27, 101, 248, 1)',
          fontWeight: 400,
          fontSize: 14,
          lineHeight: '140%',
        }}
      >
        {step.id}
      </span>
    );
  }
  return (
    <span
      className="inline-flex size-6 shrink-0 items-center justify-center rounded-full"
      style={{
        background: 'rgba(231, 228, 221, 1)',
        border: '1px solid rgba(231, 228, 221, 1)',
        color: 'rgba(98, 116, 142, 1)',
        fontWeight: 400,
        fontSize: 14,
        lineHeight: '140%',
      }}
    >
      {step.id}
    </span>
  );
}

function RespondBy({ text }: { text: string }) {
  return (
    <span className="inline-flex items-center gap-1">
      <Calendar
        className="size-4 shrink-0"
        strokeWidth={1.5}
        style={{ color: 'rgba(3, 3, 3, 1)' }}
      />
      <span
        className="text-[12px] font-normal leading-4"
        style={{ color: 'rgba(3, 3, 3, 1)' }}
      >
        {text}
      </span>
    </span>
  );
}

function JourneyDetailCard({
  content,
  className,
  mobile = false,
}: {
  content: ApplicantHomeScenarioContent;
  className?: string;
  mobile?: boolean;
}) {
  return (
    <article
      className={cn(
        'flex h-auto w-full flex-col rounded-xl border border-border bg-white p-6',
        !mobile && 'lg:h-[256px]',
        className,
      )}
    >
      {mobile ? (
        <>
          <p
            className="text-[14px] font-normal leading-5"
            style={{ color: 'rgba(69, 85, 108, 1)' }}
          >
            {content.detailLabel}
          </p>
          <p
            className="mt-1.5 text-[18px] font-semibold leading-6"
            style={{ color: 'rgba(10, 22, 40, 1)' }}
          >
            {content.detailTitle}
          </p>
          <div className="mt-3">
            <RespondBy text={content.tasksDeadline} />
          </div>
        </>
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p
              className="text-[14px] font-normal leading-5"
              style={{ color: 'rgba(69, 85, 108, 1)' }}
            >
              {content.detailLabel}
            </p>
            <RespondBy text={content.tasksDeadline} />
          </div>
          <p
            className="mt-1.5 text-[18px] font-semibold tracking-[-0.45px] leading-6"
            style={{ color: 'rgba(15, 23, 43, 1)' }}
          >
            {content.detailTitle}
          </p>
        </>
      )}

      <div className={cn('flex items-center gap-4', mobile ? 'mt-6' : 'mt-4')}>
        <span
          className="inline-flex size-10 shrink-0 items-center justify-center rounded-full text-[14px] font-medium"
          style={{
            background: 'rgba(244, 242, 236, 1)',
            color: 'rgba(15, 23, 43, 1)',
          }}
        >
          {content.detailPerson.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase()}
        </span>
        <div>
          <p
            className="text-[14px] font-medium leading-5"
            style={{ color: 'rgba(15, 23, 43, 1)' }}
          >
            {content.detailPerson}
          </p>
          <p
            className="text-[14px] font-normal leading-5"
            style={{ color: 'rgba(69, 85, 108, 1)' }}
          >
            {content.detailRole}
          </p>
        </div>
      </div>
      <div
        className={cn(
          'mt-6 flex flex-col',
          mobile ? 'gap-4' : 'gap-3 lg:flex-row lg:flex-wrap lg:gap-x-10 lg:gap-y-3',
        )}
      >
        <div>
          <p
            className="text-[14px] font-normal leading-5"
            style={{ color: 'rgba(69, 85, 108, 1)' }}
          >
            {content.detailMeta[0].label}
          </p>
          <p
            className="mt-1 text-[14px] font-medium leading-5"
            style={{ color: 'rgba(15, 23, 43, 1)' }}
          >
            {content.detailMeta[0].value}
          </p>
        </div>
        <div>
          <p
            className="text-[14px] font-normal leading-5"
            style={{ color: 'rgba(69, 85, 108, 1)' }}
          >
            {content.detailMeta[1].label}
          </p>
          <p
            className="mt-1 text-[14px] font-medium leading-5"
            style={{ color: 'rgba(15, 23, 43, 1)' }}
          >
            {content.detailMeta[1].value}
          </p>
        </div>
      </div>
    </article>
  );
}

function TasksCard({
  content,
  stacked = false,
  className,
}: {
  content: ApplicantHomeScenarioContent;
  stacked?: boolean;
  className?: string;
}) {
  const router = useRouter();

  return (
    <article
      className={cn(
        'flex h-auto w-full flex-col rounded-xl border border-border bg-white p-6',
        !stacked && 'lg:h-[308px]',
        className,
      )}
    >
      <div
        className={cn(
          'flex gap-2',
          stacked ? 'flex-col' : 'flex-wrap items-center justify-between',
        )}
      >
        <p
          className="text-[14px] font-normal leading-5"
          style={{ color: 'rgba(69, 85, 108, 1)' }}
        >
          {content.tasksKicker}
        </p>
        {!stacked && <RespondBy text={content.tasksDeadline} />}
      </div>
      <p
        className="mt-1.5 text-[18px] font-semibold tracking-[-0.45px] leading-6"
        style={{ color: 'rgba(15, 23, 43, 1)' }}
      >
        {content.tasksTitle}
      </p>
      {stacked && (
        <div className="mt-2">
          <RespondBy text={content.tasksDeadline} />
        </div>
      )}
      <div
        className={cn(
          'mt-4 grid min-h-0 flex-1 gap-3',
          stacked ? 'grid-cols-1' : 'sm:grid-cols-2',
        )}
      >
        <TaskTile
          title={content.tasks[0].title}
          body={content.tasks[0].body}
          cta={content.tasks[0].cta}
          image={stacked ? content.tasks[0].imageMobile : content.tasks[0].imageDesktop}
          compact={stacked}
          onClick={content.tasks[0].route ? () => router.push(content.tasks[0].route!) : undefined}
        />
        <TaskTile
          title={content.tasks[1].title}
          body={content.tasks[1].body}
          cta={content.tasks[1].cta}
          image={stacked ? content.tasks[1].imageMobile : content.tasks[1].imageDesktop}
          compact={stacked}
          onClick={content.tasks[1].route ? () => router.push(content.tasks[1].route!) : undefined}
        />
      </div>
    </article>
  );
}

function TaskTile({
  title,
  body,
  cta,
  image,
  compact = false,
  onClick,
}: {
  title: string;
  body: string;
  cta: string;
  image: string;
  compact?: boolean;
  onClick?: () => void;
}) {
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-lg border border-border bg-surface',
        compact ? 'min-h-[160px] p-4 pb-14' : 'h-[190px] pt-7 pl-6 pr-3 pb-3',
      )}
    >
      <p
        className={cn(
          'w-full font-semibold',
          compact
            ? 'pr-6 text-[16px] font-semibold leading-[18px]'
            : 'pr-24 text-[13px] text-fg',
        )}
        style={compact ? { color: 'rgba(15, 23, 43, 1)' } : undefined}
      >
        {title}
      </p>
      <p
        className={cn(
          'w-full',
          compact
            ? 'mt-1.5 pr-6 text-[14px] font-normal leading-5'
            : 'mt-1 pr-24 text-[12px] leading-snug text-fg-muted',
        )}
        style={compact ? { color: 'rgba(69, 85, 108, 1)' } : undefined}
      >
        {body}
      </p>
      {onClick ? (
        <button
          type="button"
          onClick={onClick}
          className={cn(
            'absolute z-[1] h-8 cursor-pointer rounded-md px-3 text-[13px] text-white',
            compact ? 'bottom-4 left-4' : 'bottom-6 left-6',
          )}
          style={{ background: 'rgba(26, 101, 248, 1)', height: 32 }}
        >
          {cta}
        </button>
      ) : (
        <OutOfScopeTooltip>
          <button
            type="button"
            className={cn(
              'absolute z-[1] h-8 cursor-pointer rounded-md px-3 text-[13px] text-white',
              compact ? 'bottom-4 left-4' : 'bottom-6 left-6',
            )}
            style={{ background: 'rgba(26, 101, 248, 1)', height: 32 }}
          >
            {cta}
          </button>
        </OutOfScopeTooltip>
      )}
      <div
        className={cn(
          'pointer-events-none absolute',
          compact
            ? 'bottom-[5px] right-[14px] size-20'
            : 'bottom-3 right-[14px] h-24 w-24',
        )}
      >
        <Image src={image} alt="" fill className="object-contain" sizes={compact ? '80px' : '96px'} />
      </div>
    </div>
  );
}
