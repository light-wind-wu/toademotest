'use client';

/* Apply Dashboard V1 — content max 1440; Part1 bg full-bleed of main column.
   Part1 hero sides fill; copy/art stay in 1440.
   Part2 status inset 24px: 335 | 60 | 1fr (Interview invited in normal flow).
   Part3 inset 24px: 1fr | 20 | 314 (fills width, right aligned).
   Map 143 | 40 | 1fr · Activity 676 | 16 | 270 */
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Calendar } from 'lucide-react';
import Shell from '@/components/layout/shell';
import { useRole } from '@/lib/role';
import { resolveArchetype } from '@/lib/apply-project-fit';
import { loadApplyDraft } from '@/lib/apply-application';
import { cn } from '@/lib/utils';
import { useEffect, useMemo, useState } from 'react';
import InterviewTimeslotSheet from '@/components/apply/interview-timeslot-sheet';

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

const ACTIVITY = [
  {
    title: 'Review started',
    body: 'The team is assessing your profile and project choices.',
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

export default function ApplyDashboardV1() {
  const { profile } = useRole();
  const router = useRouter();
  const firstName = profile.name.split(' ')[0] || 'there';
  const [quizTaken, setQuizTaken] = useState(false);
  const [answers, setAnswers] = useState<(number | null)[]>([]);
  const [timeslotOpen, setTimeslotOpen] = useState(false);

  useEffect(() => {
    const d = loadApplyDraft();
    setQuizTaken(d.quizTaken);
    setAnswers(d.quizAnswers);
  }, []);

  const archetype = useMemo(
    () => (quizTaken ? resolveArchetype(answers) : resolveArchetype([])),
    [quizTaken, answers],
  );

  return (
    <Shell activeRoute="/apply/dashboard" flushTop>
      {/* Cancel shell gutter; Part1 bg full-bleed */}
      <div className="relative mx-[calc(-1*clamp(24px,2.6vw,40px))]">
          {/* ── Part 1: Hero — mobile aspect from bg (780×1108); PC 345 */}
          <header
            className="relative z-0 w-full overflow-hidden max-lg:aspect-[780/1108] lg:h-[345px] lg:overflow-visible"
            style={{ background: 'rgba(254, 253, 251, 1)' }}
          >
            <div className="relative mx-auto h-full w-full max-w-[1440px]">
              <div className="pointer-events-none absolute inset-0 z-0 hidden lg:block">
                <Image
                  src="/images/dashboard-v1-top.png"
                  alt=""
                  fill
                  className="object-contain object-right"
                  sizes="1440px"
                  priority
                />
              </div>
              <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden lg:hidden">
                <Image
                  src="/images/dashboard-v1-top-m.png"
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
                  Your next chapter is
                  <br />
                  taking shape
                </h1>
                <p
                  className="mt-2 text-[14px] font-normal leading-[100%] lg:mt-4 lg:text-[16px]"
                  style={{ color: 'rgba(74, 85, 104, 1)' }}
                >
                  Welcome back, {firstName}. Follow your application, clear your next tasks
                  <br className="hidden lg:block" />
                  {' '}and revisit the quiz whenever curiosity strikes.
                </p>
                <span
                  className="mt-6 inline-flex h-[22px] items-center gap-1.5 rounded-full px-2.5 text-[12px] font-normal leading-4 lg:mt-4"
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

          {/* Part2 overlays hero; mobile −70; PC top 298 */}
          <div className="relative z-20 mx-auto w-full max-w-[1440px] max-lg:mt-0 lg:-mt-[345px]">
            <div className="pointer-events-none hidden lg:block lg:h-[345px]" aria-hidden />

            {/* ── Part 2: Status — height from content; PC 335 | 60 | 1fr */}
            <section
              className="relative z-20 mx-4 -mt-[70px] overflow-hidden rounded-2xl bg-white p-6 lg:absolute lg:top-[298px] lg:right-6 lg:left-6 lg:mx-0 lg:mt-0"
              style={{ background: 'rgba(255, 255, 255, 1)' }}
            >
              <div
                className="pointer-events-none absolute bottom-[47px] right-[-0px] z-0 hidden h-[285px] w-[354px] lg:block"
                aria-hidden
              >
                <Image
                  src="/images/radar-v1-new.png"
                  alt=""
                  width={354}
                  height={285}
                  className="h-[285px] w-[354px] max-w-none object-contain object-right-bottom"
                />
              </div>

              <div className="relative z-10 flex flex-col gap-8 lg:grid lg:grid-cols-[335px_minmax(0,1fr)] lg:items-start lg:gap-[60px]">
                <div
                  className="relative w-full shrink-0 overflow-hidden rounded-lg text-white max-lg:aspect-[343/371] lg:h-[338px] lg:w-[335px] lg:aspect-auto"
                  style={{ background: 'rgba(15, 45, 110, 1)' }}
                >
                  <div className="pointer-events-none absolute inset-0 z-0">
                    <Image
                      src="/images/banner-bg-v1.png"
                      alt=""
                      fill
                      className="object-cover object-bottom max-lg:hidden"
                      sizes="335px"
                    />
                    <Image
                      src="/images/banner-bg-v1-m.png"
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
                      Congratulations! You
                      <br />
                      have been shortlisted
                      <br />
                      for an interview.
                    </p>
                    <p
                      className="mt-0.5 text-[14px] font-normal leading-[120%] lg:mt-2"
                      style={{ color: 'rgba(255, 255, 255, 0.74)' }}
                    >
                      The hiring mentor Aisha Rahman
                      <br className="max-lg:hidden" />
                      {' '}
                      (Digital Hub) would like to have a
                      <br className="max-lg:hidden" />
                      {' '}
                      chat with you before making a
                      <br className="max-lg:hidden" />
                      {' '}
                      final decision.
                    </p>
                  </div>
                </div>

                <div className="relative z-10 flex min-w-0 w-full flex-col">
                  <div className="relative flex flex-wrap items-center justify-between gap-2">
                    <p
                      className="min-w-0 text-[12px] font-normal leading-5 lg:text-[14px]"
                      style={{ color: 'rgba(69, 85, 108, 1)' }}
                    >
                      Submitted 24 Jul 2026
                    </p>
                    <span
                      className="relative z-10 inline-flex h-[22px] shrink-0 items-center rounded-full px-2.5 text-[12px] font-normal leading-4"
                      style={{
                        background: 'rgba(244, 242, 236, 1)',
                        color: 'rgba(15, 23, 43, 1)',
                      }}
                    >
                      Interview invited
                    </span>
                  </div>
                  <h2
                    className="mt-2 text-[18px] font-semibold leading-[28.8px] lg:mt-2 lg:text-[24px] lg:tracking-[-0.48px]"
                    style={{ color: 'rgba(10, 22, 40, 1)' }}
                  >
                    Undergraduate Internship 2027
                  </h2>
                  <p
                    className="mt-0.5 text-[14px] font-normal leading-[120%] lg:mt-2"
                    style={{ color: 'rgba(74, 85, 104, 1)' }}
                  >
                    Your application and ranked project preferences are now with the review team.
                  </p>
                  <p
                    className="mt-6 text-[14px] font-medium leading-[120%] lg:mt-8"
                    style={{ color: 'rgba(74, 85, 104, 1)' }}
                  >
                    Please confirm your availability for the interview by selecting a day/time slot.
                    First come
                    <br className="hidden lg:block" />
                    {' '}
                    first served!
                  </p>
                  <div className="relative z-10 mt-6 flex gap-2 lg:mt-8">
                    <button
                      type="button"
                      onClick={() => setTimeslotOpen(true)}
                      className="h-9 min-w-0 flex-1 cursor-pointer rounded-md px-3 text-[14px] text-white lg:flex-none lg:px-4"
                      style={{ background: 'rgba(26, 101, 248, 1)', height: 36 }}
                    >
                      Choose a Timeslot
                    </button>
                    <button
                      type="button"
                      onClick={() => router.push('/apply/applications')}
                      className="h-9 min-w-0 flex-1 cursor-pointer rounded-md border border-border bg-bg px-3 text-[14px] text-fg lg:flex-none lg:px-4"
                      style={{ height: 36 }}
                    >
                      See Next Tasks
                    </button>
                  </div>
                </div>
              </div>
            </section>

            <div
              className="pointer-events-none hidden lg:block"
              style={{ height: 'calc(298px + 24px + 338px + 24px - 345px + 20px)' }}
              aria-hidden
            />
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
                  <div
                    className="pointer-events-none absolute bottom-0 left-10 z-0 hidden h-[140px] w-[240px] lg:block lg:h-[177px] lg:w-[323px]"
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
                      className="text-[14px] font-normal leading-5"
                      style={{ color: 'rgba(69, 85, 108, 1)' }}
                    >
                      Application map
                    </p>
                    <h3
                      className="mt-1.5 text-[24px] font-semibold tracking-[-0.45px] leading-[18px] lg:mt-0.5 lg:text-[18px] lg:leading-6"
                      style={{ color: 'rgba(15, 23, 43, 1)' }}
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
                        onConfirm={() => router.push('/apply/profile')}
                        onUpdate={() => router.push('/apply/applications')}
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
                        <TasksCard onConfirm={() => router.push('/apply/profile')} onUpdate={() => router.push('/apply/applications')} />
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
                      className="mt-4 self-start cursor-pointer text-[14px] font-medium leading-5 text-[rgba(26,101,248,1)] lg:mt-0"
                    >
                      Mark all read
                    </button>
                  </div>

                  <div className="relative z-[1] mt-6 flex flex-col gap-4 lg:grid lg:grid-cols-[minmax(0,676px)_270px] lg:gap-4">
                    <ol
                      className="relative min-w-0 w-full lg:max-w-[676px]"
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
                        src="/images/activity-v1.png"
                        alt=""
                        fill
                        className="object-contain object-right-bottom"
                        sizes="270px"
                      />
                    </div>
                  </div>
                </section>
              </div>

              <aside className="relative mx-auto h-auto min-h-[420px] w-full shrink-0 overflow-hidden rounded-2xl p-6 max-lg:max-w-none lg:mx-0 lg:h-[423px] lg:min-h-0 lg:w-[314px] lg:max-w-[314px]">
                <div className="pointer-events-none absolute inset-0 z-0" aria-hidden>
                  <Image
                    src="/images/test-result-v1.png"
                    alt=""
                    fill
                    className="object-cover object-bottom max-lg:hidden"
                    sizes="314px"
                  />
                  <Image
                    src="/images/test-result-v1-m.png"
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
                    style={{ color: archetype.color }}
                  >
                    {archetype.tagline}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => router.push('/apply/project-fit')}
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

      <InterviewTimeslotSheet open={timeslotOpen} onOpenChange={setTimeslotOpen} />
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
        Respond by 30 Jul 2026
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
            Please confirm your availability for the interview by selecting a day/time slot. First
            come first served!
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
            Please confirm your availability for the interview by selecting a
            <br />
            day/time slot. First come first served!
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
            Language
          </p>
          <p
            className="mt-1 text-[14px] font-medium leading-5"
            style={{ color: 'rgba(15, 23, 43, 1)' }}
          >
            English or Mandarin
          </p>
        </div>
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
            30 min · Microsoft Teams
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
        2 tasks for you
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
          title="Confirm profile details"
          body="Check your contact and education information."
          cta="Confirm"
          onClick={onConfirm}
          image="/images/confirm-v1.png"
          compact={stacked}
        />
        <TaskTile
          title="Update availability"
          body="Add your preferred internship dates."
          cta="Update"
          onClick={onUpdate}
          image="/images/canlander-v1.png"
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
  image,
  compact = false,
}: {
  title: string;
  body: string;
  cta: string;
  onClick: () => void;
  image: string;
  compact?: boolean;
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
      <div
        className={cn(
          'pointer-events-none absolute',
          compact ? 'bottom-4 right-4 size-20' : 'bottom-3 right-3 h-24 w-24',
        )}
      >
        <Image src={image} alt="" fill className="object-contain" sizes={compact ? '80px' : '96px'} />
      </div>
    </div>
  );
}
