'use client';

/* Apply Dashboard V2 — probing B layout (forked from V1; asset variants *-v2*).
   Content max 1440; Part1 bg full-bleed of main column. */
import Image from 'next/image';
import { Calendar } from 'lucide-react';
import Shell from '@/components/layout/shell';
import { useRole } from '@/lib/role';
import { PROJECT_MATCHES, resolveArchetype, archetypeResultImage } from '@/lib/apply-project-fit';
import { loadApplyDraft, programmeTitleForVariant } from '@/lib/apply-application';
import { loadUtApplicantVariant } from '@/lib/ut-track';
import { cn } from '@/lib/utils';
import { useEffect, useMemo, useState } from 'react';
import InterviewTimeslotSheet from '@/components/apply/interview-timeslot-sheet';
import OutOfScopeDialog from '@/components/apply/out-of-scope-dialog';
import { HeroV2Bg, HeroV2Fx } from '@/components/apply/hero-v2-art';

const STEPS: {
  id: number;
  label: string;
  done: boolean;
  current?: boolean;
  hint?: string;
}[] = [
  { id: 1, label: 'Submitted', done: true },
  { id: 2, label: 'Under Review', done: true },
  { id: 3, label: 'Interview', done: false, current: true, hint: 'Choose a timeslot' },
  { id: 4, label: 'Outcome', done: false },
];

const INTERVIEW_PROJECT_NAME = PROJECT_MATCHES[0].name;

const ACTIVITY = [
  {
    title: 'Interview invitation received',
    body: `Aisha Rahman invited you to interview for ${INTERVIEW_PROJECT_NAME}.`,
    date: '26 Jul 2026',
    tone: 'accent' as const,
  },
  {
    title: 'Application received',
    body: 'Your Undergraduate Internship 2027 submission is complete.',
    date: '24 Jul 2026',
    tone: 'accent' as const,
  },
  {
    title: 'Quiz result saved',
    body: 'Your Pioneer archetype can be replayed without changing your application.',
    date: '24 Jul 2026',
    tone: 'warning' as const,
  },
];

export default function ApplyDashboardV2() {
  const { profile } = useRole();
  const firstName = profile.name.split(' ')[0] || 'there';
  const [quizTaken, setQuizTaken] = useState(false);
  const [answers, setAnswers] = useState<(number | null)[]>([]);
  const [timeslotOpen, setTimeslotOpen] = useState(false);
  const [outOfScopeOpen, setOutOfScopeOpen] = useState(false);
  const [programmeTitle, setProgrammeTitle] = useState('Undergraduate Internship 2027');

  useEffect(() => {
    const d = loadApplyDraft();
    setQuizTaken(d.quizTaken);
    setAnswers(d.quizAnswers);
    setProgrammeTitle(
      d.programmeTitle ||
        programmeTitleForVariant(loadUtApplicantVariant() ?? 'undergraduate'),
    );
  }, []);

  const archetype = useMemo(
    () => (quizTaken ? resolveArchetype(answers) : resolveArchetype([])),
    [quizTaken, answers],
  );

  return (
    <Shell activeRoute="/apply/dashboard" flushTop>
      {/* Cancel shell gutter; Part1 bg full-bleed */}
      <div className="relative mx-[calc(-1*clamp(24px,2.6vw,40px))]">
          {/* ── Part 1: Hero — bitmap under Part 2; FX layered after Part 2 */}
          <header
            className="relative z-0 w-full overflow-hidden bg-bg lg:h-[313px] lg:bg-[rgba(254,253,251,1)]"
          >
            <div className="relative mx-auto h-full w-full max-w-[1440px]">
              {/* PC bitmap only — covered by status card where they overlap */}
              <div className="pointer-events-none absolute inset-0 z-0 hidden lg:block">
                <HeroV2Bg />
              </div>

              {/* Mobile banner — fixed 242, not a full-bleed text background */}
              <div className="relative h-[242px] w-full lg:hidden" aria-hidden>
                <Image
                  src="/images/dashboard-v2-top-m.png"
                  alt=""
                  fill
                  className="object-cover object-center"
                  sizes="100vw"
                  priority
                />
              </div>

              {/* Mobile copy below banner */}
              <div
                className="relative z-10 px-4 pb-0 pt-6 lg:hidden"
                style={{
                  background:
                    'linear-gradient(180deg, #F9F9F9 0%, rgba(255, 255, 255, 0) 100%)',
                }}
              >
                <h1
                  className="text-[28px] font-semibold leading-8 tracking-[-0.48px]"
                  style={{ color: 'rgba(15, 23, 43, 1)' }}
                >
                  Your next chapter is
                  <br />
                  taking shape
                </h1>
                <p
                  className="mt-2 text-[14px] font-normal leading-[140%]"
                  style={{ color: 'rgba(74, 85, 104, 1)' }}
                >
                  Welcome back, {firstName}. Follow your application, clear your next tasks and
                  revisit the quiz whenever curiosity strikes.
                </p>
                <span
                  className="mt-6 inline-flex h-[22px] items-center gap-1.5 rounded-full px-2.5 text-[12px] font-normal leading-4"
                  style={{
                    background: 'rgba(0, 166, 244, 0.15)',
                    color: 'rgba(0, 105, 168, 1)',
                  }}
                >
                  <span className="size-1.5 rounded-full bg-current" aria-hidden />
                  Interview invitation received
                </span>
              </div>

              {/* PC copy overlaid on art */}
              <div className="absolute inset-x-auto left-16 top-[60px] z-10 hidden h-[200px] w-[760px] lg:block">
                <h1
                  className="text-[48px] font-semibold leading-[47px] tracking-[-0.48px]"
                  style={{ color: 'rgba(15, 23, 43, 1)' }}
                >
                  Your next chapter is
                  <br />
                  taking shape
                </h1>
                <p
                  className="mt-4 text-[16px] font-normal leading-[100%]"
                  style={{ color: 'rgba(74, 85, 104, 1)' }}
                >
                  Welcome back, {firstName}. Follow your application, clear your next tasks
                  <br />
                  and revisit the quiz whenever curiosity strikes.
                </p>
                <span
                  className="mt-4 inline-flex h-[22px] items-center gap-1.5 rounded-full px-2.5 text-[12px] font-normal leading-4"
                  style={{
                    background: 'rgba(0, 166, 244, 0.15)',
                    color: 'rgba(0, 105, 168, 1)',
                  }}
                >
                  <span className="size-1.5 rounded-full bg-current" aria-hidden />
                  Interview invitation received
                </span>
              </div>
            </div>
          </header>

          {/* Radar / diagonal — same contain box as bg, stacked above Part 2 */}
          <div className="pointer-events-none absolute inset-x-0 top-0 z-30 hidden h-[313px] overflow-visible lg:block">
            <div className="relative mx-auto h-full w-full max-w-[1440px] overflow-visible">
              <HeroV2Fx />
            </div>
          </div>

          {/* ── Part 2: Status card — above bg, below FX */}
          <div className="relative z-20 mx-auto w-full max-w-[1440px] px-4 lg:px-6">
            <section
              className="relative mt-6 overflow-hidden rounded-2xl border border-border bg-white p-6 lg:-mt-[47px] lg:min-h-[330px] lg:p-8"
            >
              {/* Desktop radar — fill card height; width 397 */}
              <div
                className="pointer-events-none absolute inset-y-0 right-0 z-0 hidden w-[397px] lg:block"
                aria-hidden
              >
                <Image
                  src="/images/radar-v2.png"
                  alt=""
                  fill
                  className="object-cover object-right"
                  sizes="397px"
                />
              </div>

              <div className="relative z-10 flex w-full flex-col lg:pr-[calc(397px+16px)]">
                {/* PC: title + badge inline */}
                <div className="hidden flex-wrap items-center gap-2 lg:flex">
                  <h2
                    className="text-[24px] font-semibold tracking-[-0.48px] leading-[28.8px]"
                    style={{ color: 'rgba(10, 22, 40, 1)' }}
                  >
                    {programmeTitle}
                  </h2>
                  <span
                    className="inline-flex h-[22px] shrink-0 items-center rounded-full px-2.5 text-[12px] font-normal leading-4"
                    style={{
                      background: 'rgba(0, 188, 125, 0.15)',
                      color: 'rgba(0, 122, 85, 1)',
                    }}
                  >
                    Interview invited
                  </span>
                </div>
                <p
                  className="mt-2 hidden items-center gap-1.5 text-[14px] font-normal leading-5 lg:inline-flex"
                  style={{ color: 'rgba(69, 85, 108, 1)' }}
                >
                  <Image
                    src="/images/calendar-days.svg"
                    alt=""
                    width={14}
                    height={14}
                    className="size-3.5 shrink-0"
                    aria-hidden
                  />
                  Submitted 24 Jul 2026
                </p>

                {/* Mobile: title → date 2px → badge 16px → box 24px → content 24px → buttons 16px */}
                <h2
                  className="text-[18px] font-semibold leading-7 lg:hidden"
                  style={{ color: 'rgba(10, 22, 40, 1)' }}
                >
                  {programmeTitle}
                </h2>
                <p
                  className="mt-0.5 inline-flex items-center gap-1.5 text-[12px] font-normal leading-5 lg:hidden"
                  style={{ color: 'rgba(69, 85, 108, 1)' }}
                >
                  <Image
                    src="/images/calendar-days.svg"
                    alt=""
                    width={14}
                    height={14}
                    className="size-3.5 shrink-0"
                    aria-hidden
                  />
                  Submitted 24 Jul 2026
                </p>
                <span
                  className="mt-4 inline-flex h-[22px] w-fit shrink-0 items-center rounded-full px-2.5 text-[12px] font-normal leading-4 lg:hidden"
                  style={{
                    background: 'rgba(0, 188, 125, 0.15)',
                    color: 'rgba(0, 122, 85, 1)',
                  }}
                >
                  Interview invited
                </span>

                <div
                  className="mt-6 rounded-xl px-5 py-[22px] lg:mt-5 lg:p-[21px]"
                  style={{
                    background: 'rgba(0, 166, 244, 0.03)',
                    border: '1px solid rgba(0, 132, 209, 0.3)',
                  }}
                >
                  <p
                    className="text-[16px] font-semibold leading-5 tracking-[-0.35px] lg:text-[18px] lg:leading-[14px]"
                    style={{ color: 'rgba(0, 105, 168, 1)' }}
                  >
                    Congratulations! You have been shortlisted for an interview
                  </p>
                  <p
                    className="mt-2 text-[14px] font-normal"
                    style={{
                      lineHeight: '22.75px',
                      color: 'rgba(0, 105, 168, 1)',
                    }}
                  >
                    The hiring mentor Aisha Rahman (Digital Hub) would like to have a chat with you
                    before making a final decision.
                  </p>
                </div>

                <p
                  className="mt-6 lg:mt-5"
                  style={{
                    fontWeight: 400,
                    fontSize: 13,
                    lineHeight: '18.85px',
                    color: 'rgba(95, 101, 112, 1)',
                  }}
                >
                  Please confirm your availability for the interview by selecting a day/time slot.
                  First come first served!
                </p>

                <div className="mt-4 flex flex-wrap gap-2 lg:mt-5">
                  <button
                    type="button"
                    onClick={() => setTimeslotOpen(true)}
                    className="h-9 min-w-0 flex-1 cursor-pointer rounded-md px-4 text-[14px] text-white sm:flex-none"
                    style={{ background: 'rgba(26, 101, 248, 1)', height: 36 }}
                  >
                    Choose a Timeslot
                  </button>
                  <button
                    type="button"
                    onClick={() => setOutOfScopeOpen(true)}
                    className="h-9 min-w-0 flex-1 cursor-pointer rounded-md border border-border bg-white px-4 text-[14px] text-fg sm:flex-none"
                    style={{ height: 36 }}
                  >
                    View Application
                  </button>
                </div>
              </div>
            </section>
          </div>

          {/* ── Part 3: mobile inset 16; PC 1fr | 20 | 314 ─── */}
          <div className="relative mx-auto w-full max-w-[1440px] px-4 pb-8 pt-5 lg:px-6">
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
                      src="/images/map-right-top-v1.png"
                      alt=""
                      width={370}
                      height={116}
                      className="h-[116px] w-[370px] max-w-none object-contain object-right-top"
                    />
                  </div>
                  {/* Mobile map art — temporarily off
                  <div
                    className="pointer-events-none absolute right-4 top-[108px] z-0 h-[72px] w-[260px] lg:hidden"
                    aria-hidden
                  >
                    <Image
                      src="/images/map-right-top-v1-m.png"
                      alt=""
                      width={260}
                      height={72}
                      className="h-[72px] w-[260px] max-w-none object-contain object-right-top"
                    />
                  </div>
                  */}
                  <div
                    className="pointer-events-none absolute bottom-0 left-[20px] z-0 hidden h-[140px] w-[240px] lg:block lg:h-[177px] lg:w-[323px]"
                    aria-hidden
                  >
                    <Image
                      src="/images/map-left-down-v1.png"
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
                      Application map
                    </p>
                    <h3
                      className="mt-1.5 text-[20px] font-semibold leading-[28.8px] lg:mt-0.5 lg:text-[18px] lg:leading-6 lg:tracking-[-0.45px]"
                      style={{ color: 'rgba(10, 22, 40, 1)' }}
                    >
                      Where you are now
                    </h3>

                    {/* Mobile: horizontal step dots — 24 below title, 14 above Interview */}
                    <ol
                      className="mt-6 flex w-full items-center lg:hidden"
                      aria-label="Application progress"
                    >
                      {STEPS.map((step, i) => {
                        const isLast = i === STEPS.length - 1;
                        return (
                          <li
                            key={step.id}
                            className={cn('flex items-center', !isLast && 'min-w-0 flex-1')}
                          >
                            <StepGlyph step={step} />
                            {!isLast && (
                              <span
                                className="mx-2 h-px min-w-[12px] flex-1"
                                style={{ background: 'rgba(163, 163, 163, 1)' }}
                                aria-hidden
                              />
                            )}
                          </li>
                        );
                      })}
                    </ol>

                    {/* Mobile: Interview + invitation + tasks (16px gap) */}
                    <div className="relative mt-3.5 lg:hidden">
                      <div className="relative">
                        <h4
                          className="text-[18px] font-medium leading-[28.8px]"
                          style={{ color: 'rgba(10, 22, 40, 1)' }}
                        >
                          Interview
                        </h4>
                        <p
                          className="mt-0.5 text-[14px] font-normal leading-[100%]"
                          style={{ color: 'rgba(74, 85, 104, 1)' }}
                        >
                          Choose a timeslot
                        </p>
                      </div>
                      <InterviewInvitationCard className="relative mt-6" mobile />
                      <TasksCard
                        className="relative mt-4"
                        stacked
                        onConfirm={() => setOutOfScopeOpen(true)}
                        onUpdate={() => setOutOfScopeOpen(true)}
                      />
                    </div>

                    {/* Desktop: 143 | 40 | 1fr */}
                    <div className="mt-12 hidden lg:grid lg:grid-cols-[143px_minmax(0,1fr)] lg:gap-10">
                      <ol
                        className="flex w-[143px] shrink-0 flex-col"
                        aria-label="Application progress"
                      >
                        {STEPS.map((step, i) => {
                          const isLast = i === STEPS.length - 1;
                          const lineDone = step.done;
                          return (
                            <li key={step.id} className="flex gap-3">
                              <div className="flex w-6 shrink-0 flex-col items-center">
                                <StepGlyph step={step} />
                                {!isLast && (
                                  <>
                                    <span className="block w-px shrink-0" style={{ height: 8 }} aria-hidden />
                                    <span
                                      className="block w-px shrink-0"
                                      style={{
                                        height: 62,
                                        background: lineDone
                                          ? 'rgba(69, 85, 108, 1)'
                                          : 'rgba(163, 163, 163, 1)',
                                      }}
                                      aria-hidden
                                    />
                                    <span className="block w-px shrink-0" style={{ height: 8 }} aria-hidden />
                                  </>
                                )}
                              </div>
                              <div className="min-w-0 pt-0.5">
                                <p
                                  className="text-[14px] font-normal leading-[140%]"
                                  style={{
                                    color:
                                      step.done || step.current
                                        ? 'rgba(0, 0, 0, 0.87)'
                                        : 'rgba(74, 85, 104, 1)',
                                  }}
                                >
                                  {step.label}
                                </p>
                                {step.hint && (
                                  <p
                                    className="mt-0.5 text-[12px] font-normal leading-[140%]"
                                    style={{ color: 'rgba(74, 85, 104, 0.87)' }}
                                  >
                                    {step.hint}
                                  </p>
                                )}
                              </div>
                            </li>
                          );
                        })}
                      </ol>

                      <div className="min-w-0 w-full space-y-4">
                        <InterviewInvitationCard />
                        <TasksCard
                          onConfirm={() => setOutOfScopeOpen(true)}
                          onUpdate={() => setOutOfScopeOpen(true)}
                        />
                      </div>
                    </div>
                  </div>
                </section>

                {/* Latest activity — title below: 676 | 16 | 270 */}
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
                    <button
                      type="button"
                      onClick={() => setOutOfScopeOpen(true)}
                      className="mt-4 self-start cursor-pointer text-[14px] font-medium leading-5 text-[rgba(26,101,248,1)] lg:mt-0"
                    >
                      Mark all read
                    </button>
                  </div>

                  <ol
                    className="relative z-[1] mt-6 min-w-0 w-full"
                    aria-label="Activity timeline"
                  >
                    {ACTIVITY.map((item, i) => {
                      const isLast = i === ACTIVITY.length - 1;
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
                </section>
              </div>

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

                <button
                  type="button"
                  onClick={() => setOutOfScopeOpen(true)}
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
              </aside>
            </div>
          </div>
      </div>

      <InterviewTimeslotSheet
        open={timeslotOpen}
        onOpenChange={setTimeslotOpen}
        projectName={INTERVIEW_PROJECT_NAME}
        allowCustomRequest
        sourceVersion="v2"
      />
      <OutOfScopeDialog open={outOfScopeOpen} onOpenChange={setOutOfScopeOpen} />
    </Shell>
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

function RespondBy() {
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
        Respond by 30 Aug 2026
      </span>
    </span>
  );
}

function InterviewInvitationCard({
  className,
  mobile = false,
}: {
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
            Interview invitation
          </p>
          <p
            className="mt-1.5 text-[18px] font-semibold leading-6"
            style={{ color: 'rgba(10, 22, 40, 1)' }}
          >
            Choose a timeslot to confirm your interview.
          </p>
          <div className="mt-3">
            <RespondBy />
          </div>
        </>
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p
              className="text-[14px] font-normal leading-5"
              style={{ color: 'rgba(69, 85, 108, 1)' }}
            >
              Interview invitation
            </p>
            <RespondBy />
          </div>
          <p
            className="mt-1.5 text-[18px] font-semibold tracking-[-0.45px] leading-6"
            style={{ color: 'rgba(15, 23, 43, 1)' }}
          >
            Choose a timeslot to confirm your interview.
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
          AR
        </span>
        <div>
          <p
            className="text-[14px] font-medium leading-5"
            style={{ color: 'rgba(15, 23, 43, 1)' }}
          >
            Aisha Rahman
          </p>
          <p
            className="text-[14px] font-normal leading-5"
            style={{ color: 'rgba(69, 85, 108, 1)' }}
          >
            Mentor · Digital Hub
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
            Format
          </p>
          <p
            className="mt-1 text-[14px] font-medium leading-5"
            style={{ color: 'rgba(15, 23, 43, 1)' }}
          >
            Microsoft Teams
          </p>
        </div>
        <div>
          <p
            className="text-[14px] font-normal leading-5"
            style={{ color: 'rgba(69, 85, 108, 1)' }}
          >
            Duration
          </p>
          <p
            className="mt-1 text-[14px] font-medium leading-5"
            style={{ color: 'rgba(15, 23, 43, 1)' }}
          >
            30 minutes
          </p>
        </div>
      </div>
    </article>
  );
}

function TasksCard({
  onConfirm,
  onUpdate,
  stacked = false,
  className,
}: {
  onConfirm: () => void;
  onUpdate: () => void;
  stacked?: boolean;
  className?: string;
}) {
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
          Keep things moving
        </p>
        {!stacked && <RespondBy />}
      </div>
      <p
        className="mt-1.5 text-[18px] font-semibold tracking-[-0.45px] leading-6"
        style={{ color: 'rgba(15, 23, 43, 1)' }}
      >
        2 tasks need your attention
      </p>
      {stacked && (
        <div className="mt-2">
          <RespondBy />
        </div>
      )}
      <div
        className={cn(
          'mt-4 grid min-h-0 flex-1 gap-3',
          stacked ? 'grid-cols-1' : 'sm:grid-cols-2',
        )}
      >
        <TaskTile
          title="Update your contact details"
          body="Add a current email address and mobile number."
          cta="Update Details"
          onClick={onConfirm}
          compact={stacked}
        />
        <TaskTile
          title="Provide additional information"
          body="The review team has requested additional information."
          cta="View Request"
          onClick={onUpdate}
          compact={stacked}
        />
      </div>
    </article>
  );
}

function TaskTile({
  title,
  body,
  cta,
  onClick,
  compact = false,
}: {
  title: string;
  body: string;
  cta: string;
  onClick: () => void;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-lg border border-border bg-surface',
        compact ? 'min-h-[140px] p-4 pb-14' : 'h-[160px] px-6 pb-3 pt-7',
      )}
    >
      <p
        className={cn(
          'w-full font-semibold',
          compact
            ? 'text-[16px] font-semibold leading-[18px]'
            : 'text-[13px] text-fg',
        )}
        style={compact ? { color: 'rgba(15, 23, 43, 1)' } : undefined}
      >
        {title}
      </p>
      <p
        className={cn(
          'w-full',
          compact
            ? 'mt-1.5 text-[14px] font-normal leading-5'
            : 'mt-1 text-[12px] leading-snug text-fg-muted',
        )}
        style={compact ? { color: 'rgba(69, 85, 108, 1)' } : undefined}
      >
        {body}
      </p>
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
    </div>
  );
}
