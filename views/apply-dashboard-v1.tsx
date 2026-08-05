'use client';

/* Apply Dashboard V1 — comps layout with cut assets (*-v1*). */
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
    <Shell activeRoute="/apply/dashboard">
      {/* Hero + overlapping status card share one stacking context */}
      <div className="relative mx-[calc(-1*clamp(24px,2.6vw,40px))] -mt-3 md:-mt-4">
        {/* ── Hero — full-bleed; flush under topbar ───────────────────────── */}
        <header
          className="relative z-0 h-auto min-h-[280px] overflow-visible lg:h-[345px] lg:min-h-0"
          style={{ background: 'rgba(254, 253, 251, 1)' }}
        >
          <div className="pointer-events-none absolute inset-y-0 right-6 left-0 z-0 hidden lg:block">
            <Image
              src="/images/dashboard-v1-top.png"
              alt=""
              fill
              className="object-contain object-right"
              sizes="100vw"
              priority
            />
          </div>

          <div className="relative z-10 px-6 pb-6 pt-10 lg:absolute lg:left-16 lg:top-[60px] lg:h-[200px] lg:w-[760px] lg:p-0">
            <h1
              className="text-[28px] font-semibold tracking-[-0.48px] lg:text-[48px] lg:leading-[47px]"
              style={{ color: 'rgba(15, 23, 43, 1)' }}
            >
              Your next chapter is
              <br />
              taking shape
            </h1>
            <p
              className="mt-4 text-[14px] font-normal leading-normal lg:text-[16px] lg:leading-[100%]"
              style={{ color: 'rgba(74, 85, 104, 1)' }}
            >
              Welcome back, {firstName}. Follow your application, clear your next tasks
              <br className="hidden lg:block" />
              {' '}and revisit the quiz whenever curiosity strikes.
            </p>
            <span
              className="mt-4 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-normal leading-4"
              style={{
                background: 'rgba(0, 166, 244, 0.15)',
                color: 'rgba(0, 105, 168, 1)',
              }}
            >
              <span className="size-1.5 rounded-full bg-current" aria-hidden />
              Interview invitation received
            </span>
          </div>

          <div className="pointer-events-none relative z-0 mx-auto h-[160px] w-full max-w-[420px] lg:hidden">
            <Image
              src="/images/dashboard-v1-top-m.png"
              alt=""
              fill
              className="object-contain object-center"
              sizes="100vw"
            />
          </div>
        </header>

        {/* ── Status card — 298px from header top → overlaps hero by 47px ─ */}
        <section
          className="relative z-20 mx-6 overflow-hidden rounded-2xl bg-white p-6 max-lg:mt-4 lg:absolute lg:left-0 lg:right-0 lg:top-[298px] lg:mt-0"
          style={{ background: 'rgba(255, 255, 255, 1)' }}
        >
          {/* Radar: 100%, flush bottom-right inside card */}
          <div
            className="pointer-events-none absolute bottom-0 right-0 z-0 hidden h-[285px] w-[354px] lg:block"
            aria-hidden
          >
            <Image
              src="/images/radar-v1.png"
              alt=""
              width={354}
              height={285}
              className="h-[285px] w-[354px] max-w-none object-contain object-right-bottom"
            />
          </div>

          <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-[60px]">
            {/* Left panel 335×338 — banner fills panel */}
            <div
              className="relative h-auto min-h-[220px] w-full shrink-0 overflow-hidden rounded-lg text-white lg:h-[338px] lg:w-[335px]"
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
                  className="text-[24px] font-medium tracking-[-0.48px] leading-[28.8px]"
                  style={{ color: 'rgba(255, 255, 255, 1)' }}
                >
                  Congratulations! You
                  <br />
                  have been shortlisted
                  <br />
                  for an interview.
                </p>
                <p
                  className="mt-2 text-[14px] font-normal leading-[100%]"
                  style={{ color: 'rgba(255, 255, 255, 0.74)' }}
                >
                  The hiring mentor Aisha Rahman
                  <br />
                  (Digital Hub) would like to have a
                  <br />
                  chat with you before making a
                  <br />
                  final decision.
                </p>
              </div>
            </div>

            {/* Right content */}
            <div className="relative z-10 flex min-w-0 flex-1 flex-col">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <p
                  className="text-[14px] font-normal leading-5"
                  style={{ color: 'rgba(69, 85, 108, 1)' }}
                >
                  Submitted 24 Jul 2026
                </p>
                <span
                  className="rounded-full px-2.5 py-0.5 text-[12px] font-normal leading-4"
                  style={{
                    background: 'rgba(244, 242, 236, 1)',
                    color: 'rgba(15, 23, 43, 1)',
                  }}
                >
                  Interview invited
                </span>
              </div>
              <h2
                className="mt-2 text-[24px] font-semibold tracking-[-0.48px] leading-[28.8px]"
                style={{ color: 'rgba(10, 22, 40, 1)' }}
              >
                Undergraduate Internship 2027
              </h2>
              <p
                className="mt-2 text-[14px] font-normal leading-[100%]"
                style={{ color: 'rgba(74, 85, 104, 1)' }}
              >
                Your application and ranked project preferences are now with the review team.
              </p>
              <p
                className="mt-8 text-[14px] font-medium leading-[100%]"
                style={{ color: 'rgba(74, 85, 104, 1)' }}
              >
                Please confirm your availability for the interview by selecting a day/time slot.
                First come
                <br />
                first served!
              </p>
              <div className="relative z-10 mt-8 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setTimeslotOpen(true)}
                  className="h-9 cursor-pointer rounded-md px-4 text-[14px] text-white"
                  style={{ background: 'rgba(26, 101, 248, 1)' }}
                >
                  Choose a Timeslot
                </button>
                <button
                  type="button"
                  onClick={() => router.push('/apply/applications')}
                  className="h-9 cursor-pointer rounded-md border border-border bg-bg px-4 text-[14px] text-fg"
                >
                  See Next Tasks
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Spacer so following content clears the absolutely positioned card */}
        <div
          className="pointer-events-none hidden lg:block"
          style={{ height: 'calc(298px + 24px + 338px + 24px - 345px + 20px)' }}
          aria-hidden
        />
      </div>

      {/* Align with status card above: cancel shell gutter, use exact 24px */}
      <div className="relative mx-[calc(-1*clamp(24px,2.6vw,40px))] px-6 pb-8 pt-5">
        {/* ── Two columns: left (map + activity) | right (archetype) ───── */}
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
          {/* Left column */}
          <div className="flex min-w-0 flex-1 flex-col gap-5">
            {/* First block: Application map — corner décor, no full map-bg */}
            <section
              className="relative min-w-0 overflow-hidden rounded-lg p-6"
              style={{
                borderRadius: 8,
                border: '1px solid rgba(231, 228, 221, 1)',
                background: 'rgba(251, 252, 253, 1)',
              }}
            >
              {/* Corner décor — under content */}
              <div
                className="pointer-events-none absolute right-0 top-0 z-0 h-[116px] w-[370px]"
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
                className="pointer-events-none absolute bottom-0 left-10 z-0 h-[140px] w-[240px] lg:h-[177px] lg:w-[323px]"
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
                  className="mt-0.5 text-[18px] font-semibold tracking-[-0.45px] leading-6"
                  style={{ color: 'rgba(15, 23, 43, 1)' }}
                >
                  Where you are now
                </h3>

                <div className="mt-12 flex flex-col gap-6 sm:flex-row sm:items-start sm:gap-10">
                  {/* Stepper tree 143×343 — quiz-like nodes 24×24 */}
                  <ol
                    className="flex h-auto w-full shrink-0 flex-col sm:h-[343px] sm:w-[143px]"
                    aria-label="Application progress"
                  >
                    {STEPS.map((step, i) => {
                      const isLast = i === STEPS.length - 1;
                      const lineDone = step.done;
                      return (
                        <li key={step.id} className="flex min-h-0 flex-1 gap-3">
                          <div className="flex w-6 shrink-0 flex-col items-center">
                            {step.done ? (
                              <Image
                                src="/images/step-complete.svg"
                                alt=""
                                width={24}
                                height={24}
                                className="size-6 shrink-0"
                              />
                            ) : step.current ? (
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
                            ) : (
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
                            )}
                            {!isLast && (
                              <>
                                <span className="block w-px shrink-0" style={{ height: 8 }} aria-hidden />
                                <span
                                  className="block w-px min-h-[20px] flex-1 shrink-0"
                                  style={{
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

                  {/* Right content — 40px from stepper */}
                  <div className="min-w-0 flex-1 space-y-4">
                    {/* Interview invitation — 256× padding 24 */}
                    <article
                      className="flex h-auto flex-col rounded-xl border border-border bg-white p-6 sm:h-[256px]"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p
                          className="text-[14px] font-normal leading-5"
                          style={{ color: 'rgba(69, 85, 108, 1)' }}
                        >
                          Interview invitation
                        </p>
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
                      </div>
                      <p
                        className="mt-1.5 text-[18px] font-semibold tracking-[-0.45px] leading-6"
                        style={{
                          color: 'rgba(15, 23, 43, 1)',
                          fontWeight: 600,
                          fontSize: 18,
                          lineHeight: '24px',
                          letterSpacing: '-0.45px',
                        }}
                      >
                        Please confirm your availability for the interview by selecting a
                        <br />
                        day/time slot. First come first served!
                      </p>
                      <div className="mt-4 flex items-center gap-4">
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
                      <div className="mt-6 flex flex-wrap gap-x-10 gap-y-3">
                        <div>
                          <p
                            className="text-[14px] font-normal leading-5"
                            style={{ color: 'rgba(69, 85, 108, 1)' }}
                          >
                            Language
                          </p>
                          <p
                            className="text-[14px] font-medium leading-5"
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
                            className="text-[14px] font-medium leading-5"
                            style={{ color: 'rgba(15, 23, 43, 1)' }}
                          >
                            30 min · Microsoft Teams
                          </p>
                        </div>
                      </div>
                    </article>

                    {/* Keep things moving — 308 */}
                    <article
                      className="flex h-auto flex-col rounded-xl border border-border bg-white p-6 sm:h-[308px]"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p
                          className="text-[14px] font-normal leading-5"
                          style={{ color: 'rgba(69, 85, 108, 1)' }}
                        >
                          Keep things moving
                        </p>
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
                      </div>
                      <p
                        className="mt-1.5 text-[18px] font-semibold tracking-[-0.45px] leading-6"
                        style={{ color: 'rgba(15, 23, 43, 1)' }}
                      >
                        2 tasks for you
                      </p>
                      <div className="mt-4 grid min-h-0 flex-1 gap-3 sm:grid-cols-2">
                        <TaskTile
                          title="Confirm profile details"
                          body="Check your contact and education information."
                          cta="Confirm"
                          onClick={() => router.push('/apply/profile')}
                          image="/images/confirm-v1.png"
                        />
                        <TaskTile
                          title="Update availability"
                          body="Add your preferred internship dates."
                          cta="Update"
                          onClick={() => router.push('/apply/applications')}
                          image="/images/canlander-v1.png"
                        />
                      </div>
                    </article>
                  </div>
                </div>
              </div>
            </section>

            {/* Latest activity — stays in left column */}
            <section className="relative overflow-hidden rounded-2xl border border-border bg-white p-6">
              <div className="relative z-[1] flex items-start justify-between gap-3">
                <div>
                  <p
                    className="text-[14px] font-normal leading-5"
                    style={{ color: 'rgba(69, 85, 108, 1)' }}
                  >
                    Latest activity
                  </p>
                  <h3
                    className="mt-0.5 text-[18px] font-semibold tracking-[-0.45px] leading-6"
                    style={{ color: 'rgba(15, 23, 43, 1)' }}
                  >
                    Updates from your journey
                  </h3>
                </div>
                <button
                  type="button"
                  className="shrink-0 cursor-pointer text-[13px] font-semibold text-[rgba(26,101,248,1)]"
                >
                  Mark all read
                </button>
              </div>

              <div className="relative z-[1] mt-6 flex gap-6">
                <ol className="min-w-0 flex-1 space-y-0" aria-label="Activity timeline">
                  {ACTIVITY.map((item, i) => {
                    const isLast = i === ACTIVITY.length - 1;
                    return (
                      <li key={item.title} className="flex gap-3">
                        <div className="flex w-2.5 shrink-0 flex-col items-center">
                          <span
                            className="mt-1.5 size-2.5 shrink-0 rounded-full"
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
                              className="my-1 w-px flex-1 min-h-[36px]"
                              style={{ background: 'rgba(231, 228, 221, 1)' }}
                              aria-hidden
                            />
                          )}
                        </div>
                        <div className={cn('flex min-w-0 flex-1 items-start justify-between gap-3', !isLast && 'pb-5')}>
                          <div className="min-w-0">
                            <p
                              className="text-[14px] font-semibold leading-5"
                              style={{ color: 'rgba(15, 23, 43, 1)' }}
                            >
                              {item.title}
                            </p>
                            <p
                              className="mt-0.5 text-[13px] font-normal leading-5"
                              style={{ color: 'rgba(69, 85, 108, 1)' }}
                            >
                              {item.body}
                            </p>
                          </div>
                          <span className="inline-flex shrink-0 items-center gap-1 pt-0.5">
                            <Calendar
                              className="size-3.5"
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

                <div className="pointer-events-none relative hidden h-[200px] w-[240px] shrink-0 lg:block">
                  <Image
                    src="/images/activity-v1.png"
                    alt=""
                    fill
                    className="object-contain object-right-bottom"
                    sizes="240px"
                  />
                </div>
              </div>
            </section>
          </div>

          {/* Right: archetype 314×423 */}
          <aside className="relative mx-auto h-auto w-full max-w-[314px] shrink-0 overflow-hidden rounded-2xl p-6 lg:mx-0 lg:h-[423px] lg:w-[314px]">
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
                sizes="314px"
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
                className="text-[28px] font-semibold leading-[44px]"
                style={{ color: 'rgba(52, 146, 145, 1)' }}
              >
                {archetype.name}
              </h3>
              <p
                className="text-[16px] font-normal leading-6"
                style={{ color: 'rgba(58, 67, 81, 1)' }}
              >
                {archetype.tagline}
              </p>
            </div>

            <button
              type="button"
              onClick={() => router.push('/apply/project-fit')}
              className="relative z-[1] mt-6 h-8 cursor-pointer rounded-md px-3 text-[12px] font-medium leading-4 text-white lg:absolute lg:bottom-6 lg:left-6 lg:mt-0"
              style={{ background: 'rgba(26, 101, 248, 1)', color: 'rgba(255, 255, 255, 1)' }}
            >
              Play Quiz Again
            </button>
          </aside>
        </div>
      </div>

      <InterviewTimeslotSheet open={timeslotOpen} onOpenChange={setTimeslotOpen} />
    </Shell>
  );
}

function TaskTile({
  title,
  body,
  cta,
  onClick,
  image,
}: {
  title: string;
  body: string;
  cta: string;
  onClick: () => void;
  image: string;
}) {
  return (
    <div className="relative h-[190px] overflow-hidden rounded-lg border border-border bg-surface p-3">
      <p className="pr-24 text-[13px] font-semibold text-fg">{title}</p>
      <p className="mt-1 pr-24 text-[12px] leading-snug text-fg-muted">{body}</p>
      <button
        type="button"
        onClick={onClick}
        className="absolute bottom-3 left-3 z-[1] h-8 cursor-pointer rounded-md px-3 text-[13px] text-white"
        style={{ background: 'rgba(26, 101, 248, 1)', height: 32 }}
      >
        {cta}
      </button>
      <div className="pointer-events-none absolute bottom-3 right-3 h-24 w-24">
        <Image src={image} alt="" fill className="object-contain" sizes="96px" />
      </div>
    </div>
  );
}
