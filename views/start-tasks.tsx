'use client';

/* B-end usability-test briefing.
   Desktop: fixed 1680×900 artboard, scales as one unit.
   Mobile: natural scroll layout.
   Task list is driven by /catlog path (each role starts at Task 1). */
import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { ArrowRight } from 'lucide-react';
import { useSession, signIn, signOut } from '@/lib/session';
import { useRole } from '@/lib/role';
import {
  loadUtApplicantVariant,
  loadUtCatalogPath,
  loadUtTrack,
  saveUtApplicantTaskIntent,
  type UtCatalogPath,
  type UtTrack,
} from '@/lib/ut-track';
import { getAdPncTask2RespondHref, resetUtScenario } from '@/lib/ut-scenarios';
import { restoreBaseApplyDashboardVersion } from '@/lib/apply-dashboard-version';
import Topbar from '@/components/layout/topbar';
import OutOfScopeTooltip from '@/components/apply/out-of-scope-tooltip';
import { cn } from '@/lib/utils';
import { getMyinfoProfile, saveApplicantProfile } from '@/lib/myinfo';

const ART_W = 1680;
const ART_H = 900;
const HEADER_H = 64;

const PANEL_W = 1166;
const PANEL_H = 650;
const PANEL_LEFT = (ART_W - PANEL_W) / 2;
const PANEL_TOP = (ART_H - PANEL_H) / 2;

const PAGE_BG = 'rgba(248, 247, 242, 1)';
const ACCENT = 'rgba(26, 101, 248, 1)';
const TASK_TITLE = 'rgba(32, 32, 32, 1)';
const CARD_BORDER = 'rgba(231, 228, 221, 1)';
const CARD_SHADOW =
  '0px 4px 6px -4px rgba(0, 0, 0, 0.05), 0px 10px 15px -3px rgba(0, 0, 0, 0.1)';

type TaskDef = {
  id: number;
  title: string;
  href: string;
  /** Optional live resolve (e.g. token from submissions list data). */
  resolveHref?: () => string;
  /**
   * When false, Start Task stays clickable but shows an out-of-scope tooltip
   * instead of navigating (feature not in this UT).
   */
  enabled?: boolean;
};

const IO_ADMIN_TASKS: TaskDef[] = [
  {
    id: 1,
    title: 'Create a Project Request',
    href: '/dashboard',
  },
  {
    id: 2,
    title: 'Review a project and approve it',
    href: '/dashboard',
  },
];

const AD_PNC_TASKS: TaskDef[] = [
  {
    id: 1,
    title: 'Create and Submit a Project',
    href: '/submissions',
  },
  {
    id: 2,
    title: 'Update and Resubmit a Project',
    href: getAdPncTask2RespondHref(),
    resolveHref: getAdPncTask2RespondHref,
  },
];

const IO_PROGRAMME_TASKS: TaskDef[] = [
  {
    id: 1,
    title: 'Create a Programme',
    href: '/programmes',
  },
];

const IO_SHORTLIST_TASKS: TaskDef[] = [
  {
    id: 1,
    title: 'Shortlist Applicants',
    href: '/dashboard',
  },
];

const APPLICANT_TASKS: TaskDef[] = [
  {
    id: 1,
    title: 'B1.1 — Submit an Application',
    href: '/login',
    enabled: true,
  },
  {
    id: 2,
    title: 'B3.2 — Schedule an Interview with a Mentor',
    href: '/login',
    enabled: true,
  },
];

const PROBING_TASKS: TaskDef[] = [
  {
    id: 1,
    title: 'Explore Applicant Homepage',
    href: '/apply/dashboard',
    enabled: true,
  },
];

function briefingFor(path: UtCatalogPath, track: UtTrack): TaskDef[] {
  if (track === 'applicant' || path === 'applicant' || path === 'probing') {
    if (path === 'probing') return PROBING_TASKS;
    return APPLICANT_TASKS;
  }
  if (path === 'io-admin') return IO_ADMIN_TASKS;
  if (path === 'ad-pnc') return AD_PNC_TASKS;
  if (path === 'io-programme') return IO_PROGRAMME_TASKS;
  return IO_SHORTLIST_TASKS;
}

export default function StartTasks() {
  const router = useRouter();
  const { signedIn } = useSession();
  const { setRole } = useRole();
  const [mounted, setMounted] = useState(false);
  const [track, setTrack] = useState<UtTrack>('staff');
  const [path, setPath] = useState<UtCatalogPath>('io-admin');
  const [scale, setScale] = useState(1);
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    setMounted(true);
    setTrack(loadUtTrack());
    setPath(loadUtCatalogPath());
    /* Returning to the task list restores V1/V2 so the 4th timeslot option is visible again. */
    restoreBaseApplyDashboardVersion();
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

  const tasks = useMemo(() => briefingFor(path, track), [path, track]);
  const isApplicant = track === 'applicant';
  const taskCols = tasks.length === 1 ? 'grid-cols-1' : 'grid-cols-2';

  function startTask(task: TaskDef) {
    if (task.enabled === false) return;
    const applicantVariant =
      track === 'applicant' || path === 'applicant' || path === 'probing'
        ? loadUtApplicantVariant()
        : null;
    resetUtScenario({ path, taskId: task.id, applicantVariant });
    const href = task.resolveHref?.() ?? task.href;
    /* Catalog item 5: both tasks require Singpass; Task 2 lands on dashboard after login. */
    if ((track === 'applicant' || path === 'applicant') && path !== 'probing' && href === '/login') {
      saveUtApplicantTaskIntent(task.id === 2 ? 'interview' : 'apply');
      signOut();
    }
    /* Catalog item 6 (A/B): skip login — open the seeded homepage directly. */
    if (path === 'probing' && href.startsWith('/apply/dashboard')) {
      const profile = getMyinfoProfile('new-applicant');
      saveApplicantProfile({
        ...profile,
        nric: 'T0123456A',
        role: 'new-applicant',
        dataUseConsent: true,
        declarationConsent: true,
        createdAt: new Date().toISOString(),
      });
      setRole('new-applicant');
      signIn('singpass', new Date().toISOString());
    }
    router.push(href);
  }

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

      {!isDesktop && (
        <div className="flex flex-1 flex-col pt-16">
          <MobileBriefing tasks={tasks} onStart={startTask} />
        </div>
      )}

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
                src="/images/start-task-bg.jpg"
                alt=""
                fill
                priority
                className="pointer-events-none object-cover object-center"
                sizes="1680px"
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
                <div
                  className={cn('grid', taskCols)}
                  style={{
                    gap: 16,
                    flex: 1,
                    minHeight: 0,
                    alignContent: 'start',
                  }}
                >
                  {tasks.map((task) => (
                    <TaskCard
                      key={task.id}
                      label={`Task ${task.id}`}
                      title={task.title}
                      cta={`Start Task ${task.id}`}
                      outOfScope={task.enabled === false}
                      onClick={() => startTask(task)}
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

function MobileBriefing({
  tasks,
  onStart,
}: {
  tasks: readonly TaskDef[];
  onStart: (task: TaskDef) => void;
}) {
  return (
    <div className="mx-auto w-full max-w-lg flex-1 px-4 py-6">
      <section
        className="rounded-xl border bg-white p-5"
        style={{ borderColor: CARD_BORDER, boxShadow: CARD_SHADOW }}
      >
        <div className="flex flex-col gap-3">
          {tasks.map((task) => (
            <TaskCard
              key={task.id}
              label={`Task ${task.id}`}
              title={task.title}
              cta={`Start Task ${task.id}`}
              outOfScope={task.enabled === false}
              onClick={() => onStart(task)}
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
  cta,
  onClick,
  outOfScope = false,
  compact = false,
}: {
  label: string;
  title: string;
  cta: string;
  onClick: () => void;
  outOfScope?: boolean;
  compact?: boolean;
}) {
  const button = (
    <button
      type="button"
      onClick={outOfScope ? undefined : onClick}
      className={cn(
        'mt-4 inline-flex cursor-pointer items-center justify-center gap-1 rounded-md text-white transition-opacity hover:opacity-90',
        compact ? 'h-9 w-full px-3 text-[13px]' : 'w-fit px-3 text-[12px]',
      )}
      style={{
        height: compact ? 36 : 30,
        padding: '0 12px',
        background: ACCENT,
        fontWeight: 600,
        lineHeight: '16px',
      }}
    >
      {cta}
      <ArrowRight className="size-3.5 shrink-0" strokeWidth={1.5} />
    </button>
  );

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
      {outOfScope ? <OutOfScopeTooltip>{button}</OutOfScopeTooltip> : button}
    </div>
  );
}
