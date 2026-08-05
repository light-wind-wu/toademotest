'use client';

/* B-end usability-test briefing.
   Desktop: fixed 1440×900 artboard, scales as one unit.
   Mobile: natural scroll layout (artboard shrink made type unreadably small).
   Staff track requires signed-in session; applicant track is reached from /catlog
   before Singpass and routes Task 1 → /login. */
import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { ArrowRight } from 'lucide-react';
import { useSession } from '@/lib/session';
import { loadUtTrack, type UtTrack } from '@/lib/ut-track';
import Topbar from '@/components/layout/topbar';
import { cn } from '@/lib/utils';

const ART_W = 1440;
const ART_H = 900;
const HEADER_H = 64;

const PANEL_W = 1166;
const PANEL_H = 650;
const PANEL_LEFT = (ART_W - PANEL_W) / 2;
const PANEL_TOP = (ART_H - PANEL_H) / 2;

const PAGE_BG = 'rgba(248, 247, 242, 1)';
const TITLE = 'rgba(10, 22, 40, 1)';
const MUTED = 'rgba(69, 85, 108, 1)';
const ACCENT = 'rgba(26, 101, 248, 1)';
const TASK_TITLE = 'rgba(32, 32, 32, 1)';
const EYEBROW = 'rgba(124, 134, 147, 1)';
const CARD_BORDER = 'rgba(231, 228, 221, 1)';
const CARD_SHADOW =
  '0px 4px 6px -4px rgba(0, 0, 0, 0.05), 0px 10px 15px -3px rgba(0, 0, 0, 0.1)';

const STAFF_TASKS = [
  {
    id: 1,
    title: 'Create Project Requests',
    description:
      'Create and issue Project Requests to the relevant Programme Centres for the annual internship intake.',
    href: '/requests/new',
  },
  {
    id: 2,
    title: 'Review Project Submissions',
    description:
      'Assume that internship projects have subsequently been submitted by AD (P&C). Review the submitted projects and take the appropriate actions.',
    href: '/submissions',
  },
  {
    id: 3,
    title: 'Track Intake Progress',
    description:
      'Monitor the status of issued requests and submitted projects so the annual internship intake stays on schedule.',
    href: '/projects',
  },
] as const;

const APPLICANT_TASKS = [
  {
    id: 1,
    title: 'Sign in and start your application',
    description:
      'Sign in with Singpass (or email) to begin the Polytechnic Internship 2027 application. Complete the flow through account setup, application form, and submission.',
    href: '/login',
  },
] as const;

const STAFF_COPY = {
  heading: 'Prepare the Annual Internship Intake',
  body: 'You are responsible for preparing the upcoming annual internship intake and managing the related project submissions.',
  note: 'During this exercise, you will complete the following two tasks.',
} as const;

const APPLICANT_COPY = {
  heading: 'Apply for the Polytechnic Internship',
  body: 'You are an applicant exploring DSTA internship opportunities. Start by signing in, then complete your application from personal details through to submission.',
  note: 'During this exercise, you will complete the following task.',
} as const;

type TaskItem = (typeof STAFF_TASKS)[number] | (typeof APPLICANT_TASKS)[number];
type Copy = typeof STAFF_COPY | typeof APPLICANT_COPY;

export default function StartTasks() {
  const router = useRouter();
  const { signedIn } = useSession();
  const [mounted, setMounted] = useState(false);
  const [track, setTrack] = useState<UtTrack>('staff');
  const [scale, setScale] = useState(1);
  /** Desktop artboard + décor images only — mobile uses plain scroll layout. */
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    setMounted(true);
    setTrack(loadUtTrack());
  }, []);

  useEffect(() => {
    if (!mounted) return;
    if (track === 'staff' && !signedIn) router.replace('/catlog');
  }, [mounted, signedIn, track, router]);

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)');
    const sync = () => setIsDesktop(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  useEffect(() => {
    if (!isDesktop) return;
    function update() {
      const next = Math.min(
        window.innerWidth / ART_W,
        (window.innerHeight - HEADER_H) / ART_H,
        1,
      );
      setScale(next);
    }
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [isDesktop]);

  const isApplicant = track === 'applicant';
  const tasks = isApplicant ? APPLICANT_TASKS : STAFF_TASKS;
  const copy = isApplicant ? APPLICANT_COPY : STAFF_COPY;

  if (!mounted || (track === 'staff' && !signedIn)) {
    return (
      <div
        className="flex min-h-screen items-center justify-center text-body-sm text-fg-muted"
        style={{ background: PAGE_BG }}
      >
        Loading…
      </div>
    );
  }

  return (
    <div
      className="flex min-h-screen flex-col"
      style={{ background: PAGE_BG }}
      data-zone="enterprise"
      data-mode="light"
    >
      <Topbar navigationHidden hideProfile={isApplicant} />

      {/* Mobile — plain bg, no décor images */}
      {!isDesktop && (
        <div className="flex flex-1 flex-col pt-16">
          <MobileBriefing
            copy={copy}
            tasks={tasks}
            onStart={(href) => router.push(href)}
          />
        </div>
      )}

      {/* Desktop — scaled 1440 artboard with décor */}
      {isDesktop && (
      <div className="flex flex-1 items-center justify-center overflow-hidden pt-16">
        <div
          className="relative shrink-0"
          style={{ width: ART_W * scale, height: ART_H * scale }}
        >
          <div
            className="absolute left-0 top-0 origin-top-left"
            style={{
              width: ART_W,
              height: ART_H,
              transform: `scale(${scale})`,
            }}
          >
            <Image
              src="/images/left-top.png"
              alt=""
              width={467}
              height={314}
              priority
              className="pointer-events-none absolute object-contain"
              style={{ left: -60, top: 40, width: 467, height: 314, zIndex: 0 }}
            />
            <Image
              src="/images/right-bottom.png"
              alt=""
              width={651}
              height={326}
              priority
              className="pointer-events-none absolute object-contain"
              style={{ right: -80, bottom: -40, width: 651, height: 326, zIndex: 0 }}
            />

            <div
              className="absolute flex flex-col bg-white"
              style={{
                left: PANEL_LEFT,
                top: PANEL_TOP,
                width: PANEL_W,
                height: PANEL_H,
                zIndex: 2,
                borderRadius: 12,
                border: `1px solid ${CARD_BORDER}`,
                boxShadow: CARD_SHADOW,
                padding: '28px 34px',
              }}
            >
              <BriefingHeader copy={copy} />
              <div
                className={isApplicant ? 'grid grid-cols-1' : 'grid grid-cols-2'}
                style={{
                  marginTop: 11,
                  gap: 16,
                  maxWidth: isApplicant ? 560 : undefined,
                }}
              >
                {tasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    label={`Task ${task.id}`}
                    title={task.title}
                    description={task.description}
                    cta={`Start Task ${task.id}`}
                    onClick={() => router.push(task.href)}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
      )}
    </div>
  );
}

function BriefingHeader({ copy }: { copy: Copy }) {
  return (
    <>
      <p
        style={{
          color: EYEBROW,
          fontWeight: 500,
          fontSize: 17,
          lineHeight: '34px',
          letterSpacing: 3.38,
          textTransform: 'uppercase',
        }}
      >
        Usability Test Scenario
      </p>
      <h1
        style={{
          marginTop: 13,
          color: TITLE,
          fontWeight: 600,
          fontSize: 20,
          lineHeight: '30px',
          letterSpacing: -0.41,
        }}
      >
        {copy.heading}
      </h1>
      <p
        style={{
          marginTop: 0,
          color: TITLE,
          fontWeight: 400,
          fontSize: 20,
          lineHeight: '30px',
          letterSpacing: -0.41,
        }}
      >
        {copy.body}
      </p>
      <p
        style={{
          marginTop: 20,
          color: MUTED,
          fontWeight: 400,
          fontSize: 14,
          lineHeight: '20px',
        }}
      >
        {copy.note}
      </p>
    </>
  );
}

function MobileBriefing({
  copy,
  tasks,
  onStart,
}: {
  copy: Copy;
  tasks: readonly TaskItem[];
  onStart: (href: string) => void;
}) {
  return (
    <div className="mx-auto w-full max-w-lg flex-1 px-4 py-6">
      <section
        className="rounded-xl border bg-white p-5"
        style={{ borderColor: CARD_BORDER, boxShadow: CARD_SHADOW }}
      >
        <p
          className="text-[11px] font-medium uppercase tracking-[0.2em]"
          style={{ color: EYEBROW }}
        >
          Usability Test Scenario
        </p>
        <h1
          className="mt-3 text-[18px] font-semibold leading-snug tracking-tight"
          style={{ color: TITLE }}
        >
          {copy.heading}
        </h1>
        <p className="mt-2 text-[15px] leading-relaxed" style={{ color: TITLE }}>
          {copy.body}
        </p>
        <p className="mt-4 text-[13px] leading-5" style={{ color: MUTED }}>
          {copy.note}
        </p>

        <div className="mt-5 flex flex-col gap-3">
          {tasks.map((task) => (
            <TaskCard
              key={task.id}
              label={`Task ${task.id}`}
              title={task.title}
              description={task.description}
              cta={`Start Task ${task.id}`}
              onClick={() => onStart(task.href)}
              compact
            />
          ))}
        </div>
      </section>
    </div>
  );
}

function TaskCard({
  label,
  title,
  description,
  cta,
  onClick,
  compact = false,
}: {
  label: string;
  title: string;
  description: string;
  cta: string;
  onClick: () => void;
  compact?: boolean;
}) {
  return (
    <div
      className="flex flex-col"
      style={{
        border: `0.95px solid ${CARD_BORDER}`,
        background: 'rgba(255, 255, 255, 1)',
        borderRadius: 8,
        padding: compact ? 16 : 22,
      }}
    >
      <p
        style={{
          fontWeight: 600,
          fontSize: compact ? 14 : 16,
          lineHeight: '20px',
          textTransform: 'uppercase',
          color: ACCENT,
        }}
      >
        {label}
      </p>
      <h2
        style={{
          marginTop: 4,
          fontWeight: 600,
          fontSize: compact ? 15 : 16,
          lineHeight: compact ? '22px' : '20px',
          color: TASK_TITLE,
        }}
      >
        {title}
      </h2>
      <p
        style={{
          marginTop: 6,
          flex: 1,
          fontWeight: 400,
          fontSize: compact ? 13 : 13,
          lineHeight: '20px',
          color: MUTED,
        }}
      >
        {description}
      </p>
      <button
        type="button"
        onClick={onClick}
        className={cn(
          'mt-4 inline-flex cursor-pointer items-center justify-center gap-1 rounded-md text-white transition-opacity hover:opacity-90',
          compact ? 'h-9 w-full px-3 text-[13px]' : 'w-fit px-3 text-[12px]',
        )}
        style={{
          height: compact ? 36 : 30,
          padding: compact ? '0 12px' : '0 12px',
          background: ACCENT,
          fontWeight: 600,
          lineHeight: '16px',
        }}
      >
        {cta}
        <ArrowRight className="size-3.5 shrink-0" strokeWidth={1.5} />
      </button>
    </div>
  );
}
