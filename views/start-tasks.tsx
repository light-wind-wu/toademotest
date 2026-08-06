'use client';

/* B-end usability-test briefing.
   Desktop: fixed 1680×900 artboard, scales as one unit.
   Mobile: natural scroll layout.
   Task list is driven by /catlog path (each role starts at Task 1). */
import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { ArrowRight } from 'lucide-react';
import { useSession } from '@/lib/session';
import { loadRequests } from '@/lib/storage';
import { loadUtCatalogPath, loadUtTrack, type UtCatalogPath, type UtTrack } from '@/lib/ut-track';
import Topbar from '@/components/layout/topbar';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui-legacy/tooltip';
import { cn } from '@/lib/utils';

const ART_W = 1680;
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

/** Same token the AD (P&C) inbox uses for PC3 2027 (“Request for 2027 Projects”). */
const AD_PNC_PC3_TOKEN_FALLBACK = 'seed-pc3-2027';

/**
 * Resolve respond URL from the same request list as /submissions
 * (group.key === uploadToken). Falls back to seed token if missing.
 */
function resolveAdPncPc3RespondHref(): string {
  try {
    const requests = loadRequests();
    const hit =
      requests.find((r) => r.uploadToken === AD_PNC_PC3_TOKEN_FALLBACK) ||
      requests.find(
        (r) =>
          r.programmeCenter === 'PC3' &&
          (r.internCategory === 'Undergraduate Student' ||
            r.educationLevel === 'Undergraduate Student'),
      );
    const token = hit?.uploadToken || AD_PNC_PC3_TOKEN_FALLBACK;
    return `/submissions/respond?token=${encodeURIComponent(token)}&mode=upload`;
  } catch {
    return `/submissions/respond?token=${encodeURIComponent(AD_PNC_PC3_TOKEN_FALLBACK)}&mode=upload`;
  }
}

type TaskDef = {
  id: number;
  title: string;
  description: string;
  href: string;
  /** Optional live resolve (e.g. token from submissions list data). */
  resolveHref?: () => string;
  enabled?: boolean;
};

type Copy = {
  heading: string;
  body: string;
  note: string;
};

const IO_ADMIN_TASKS: TaskDef[] = [
  {
    id: 1,
    title: 'Create a Project Request',
    description:
      'You have been asked to create a new project request for PC3 using the following details:\n' +
      'Request title: 2027 Internship Project Request\n' +
      'Response deadline: 31 August 2026\n' +
      'Internship year: 2027\n' +
      'Intern category: Undergraduate Student\n' +
      'Internship window: 1 January to 30 June 2027\n' +
      'Project duration: 2 months\n' +
      'Number of placements: 4\n\n' +
      'Complete and issue the project request to PC3.',
    href: '/dashboard',
  },
  {
    id: 2,
    title: 'Review a project and approve it',
    description: [
      'The following project has been submitted by AD (P&C) and approved by DCE through offline email communication. You can now review the project details and, if everything is in order, approve this project.',
      '',
      'Project title: AI-Enabled Defence Logistics Forecasting',
      'Project scope: Develop a prototype that uses historical logistics data to forecast equipment demand and identify potential supply shortages. The intern will clean and analyse data, compare forecasting approaches, and evaluate model performance. Deliverables include a working prototype, an evaluation report, and a dashboard presenting key forecasts.',
      'Skillsets: Python; Data Analysis; Machine Learning',
      'Disciplines of study: Computer Science; Data Science; Operations Research',
      'Primary mentor: Wei Jian Lim',
      'Primary mentor appointment: Senior Engineer',
      'Primary mentor email: weijian.lim@dsta.gov.sg',
      'Secondary mentor: Wei Ming',
      'Secondary mentor appointment: Senior Engineer',
      'Secondary mentor email: wei.ming@dsta.gov.sg',
      'Number of placements: 4',
    ].join('\n'),
    href: '/dashboard',
  },
];

const AD_PNC_TASKS: TaskDef[] = [
  {
    id: 1,
    title: 'Create and Submit a Project',
    description:
      'You have received the 2027 Internship Project Request for PC3. Create and submit a project in response to the request using the following details:\n\n' +
      'Project title: AI-Enabled Defence Logistics Forecasting\n' +
      'Project scope: Develop a prototype that uses historical logistics data to forecast equipment demand and identify potential supply shortages. The intern will clean and analyse data, compare forecasting approaches, and evaluate model performance. Deliverables include a working prototype, an evaluation report, and a dashboard presenting key forecasts.\n' +
      'Skillsets: Python; Data Analysis; Machine Learning\n' +
      'Disciplines of study: Computer Science; Data Science; Operations Research\n' +
      'Primary mentor: Wei Jian Lim\n' +
      'Primary mentor appointment: Senior Engineer\n' +
      'Primary mentor email: weijian.lim@dsta.gov.sg\n' +
      'Secondary mentor: Wei Ming\n' +
      'Secondary mentor appointment: Senior Engineer\n' +
      'Secondary mentor email: wei.ming@dsta.gov.sg\n' +
      'Number of placements: 4\n\n' +
      'Complete the project details and submit the project to IO admin for review.',
    href: '/submissions',
  },
  {
    id: 2,
    title: 'Update and Resubmit a Project',
    description:
      'The AI-Enabled Defence Logistics Forecasting project has been returned for update by the IO Admin. Review the remarks, update the project scope accordingly, and resubmit the project to IO.\n\n' +
      'IO Admin remarks:\n' +
      'Please narrow the scope to one equipment category, use only anonymised data, and include a baseline comparison for model evaluation.\n\n' +
      'Updated project scope:\n' +
      'Develop a prototype using anonymised logistics data for one equipment category to forecast demand and identify potential supply shortages. Compare the forecasting model against a baseline and evaluate its accuracy. Deliverables include a working prototype, an evaluation report, and a forecast dashboard.',
    href: `/submissions/respond?token=${AD_PNC_PC3_TOKEN_FALLBACK}&mode=upload`,
    resolveHref: resolveAdPncPc3RespondHref,
  },
];

const IO_PROGRAMME_TASKS: TaskDef[] = [
  {
    id: 1,
    title: 'Create a Programme',
    description: 'Open the programme list and create a new programme for the intake cycle.',
    href: '/programmes',
  },
];

const IO_SHORTLIST_TASKS: TaskDef[] = [
  {
    id: 1,
    title: 'Shortlist Applicants',
    description: 'Review applicants on the dashboard and complete the shortlisting workflow.',
    href: '/dashboard',
  },
];

const APPLICANT_TASKS: TaskDef[] = [
  {
    id: 1,
    title: 'B1.1 — Submit an Application',
    description:
      'You are interested in applying for an internship programme. Review the programme and project information, complete the required application details, select your areas of interest, and submit your application.',
    href: '/login',
    enabled: true,
  },
  {
    id: 2,
    title: 'B3.2 — Schedule an Interview with a Mentor',
    description:
      'You have been shortlisted for an interview and invited by the Mentor to select an interview time. Review the available timeslots, choose a suitable slot, and confirm your interview schedule.',
    href: '/apply/dashboard',
    enabled: false,
  },
];

const PROBING_TASKS: TaskDef[] = [
  {
    id: 1,
    title: 'Explore Applicant Homepage',
    description:
      'Open the applicant homepage for this probing variant. The task label is the same; the page layout differs by catalog choice (A / B).',
    href: '/apply/dashboard',
    enabled: true,
  },
];

function briefingFor(path: UtCatalogPath, track: UtTrack): { tasks: TaskDef[]; copy: Copy } {
  if (track === 'applicant' || path === 'applicant' || path === 'probing') {
    if (path === 'probing') {
      return {
        tasks: PROBING_TASKS,
        copy: {
          heading: '',
          body: '',
          note: 'During this exercise, you will complete the following task.',
        },
      };
    }
    return {
      tasks: APPLICANT_TASKS,
      copy: {
        heading: '',
        body: '',
        note: 'During this exercise, you will complete the following two tasks.',
      },
    };
  }

  if (path === 'io-admin') {
    return {
      tasks: IO_ADMIN_TASKS,
      copy: {
        heading: 'Prepare the Annual Internship Intake',
        body: 'You are responsible for preparing the upcoming annual internship intake and managing the related project submissions.',
        note: 'During this exercise, you will complete the following two tasks.',
      },
    };
  }

  if (path === 'ad-pnc') {
    return {
      tasks: AD_PNC_TASKS,
      copy: {
        heading: 'Prepare the Annual Internship Intake',
        body: 'You are responsible for reviewing project submissions for your Programme Centre.',
        note: 'During this exercise, you will complete the following two tasks.',
      },
    };
  }

  if (path === 'io-programme') {
    return {
      tasks: IO_PROGRAMME_TASKS,
      copy: {
        heading: 'Create a Programme',
        body: 'You will open the programme list and create a programme for the intake.',
        note: 'During this exercise, you will complete the following task.',
      },
    };
  }

  return {
    tasks: IO_SHORTLIST_TASKS,
    copy: {
      heading: 'Shortlist Applicants',
      body: 'You will use the dashboard to shortlist applicants for the intake.',
      note: 'During this exercise, you will complete the following task.',
    },
  };
}

export default function StartTasks() {
  const router = useRouter();
  const { signedIn } = useSession();
  const [mounted, setMounted] = useState(false);
  const [track, setTrack] = useState<UtTrack>('staff');
  const [path, setPath] = useState<UtCatalogPath>('io-admin');
  const [scale, setScale] = useState(1);
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    setMounted(true);
    setTrack(loadUtTrack());
    setPath(loadUtCatalogPath());
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

  const { tasks, copy } = useMemo(() => briefingFor(path, track), [path, track]);
  const isApplicant = track === 'applicant';
  const taskCols = tasks.length === 1 ? 'grid-cols-1' : 'grid-cols-2';

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
          <MobileBriefing
            copy={copy}
            tasks={tasks}
            onStart={(href) => router.push(href)}
          />
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
                <BriefingHeader copy={copy} />
                <div
                  className={cn('grid', taskCols)}
                  style={{
                    marginTop: 11,
                    gap: 16,
                    flex: 1,
                    minHeight: 0,
                    alignContent: 'start',
                  }}
                >
                  <TooltipProvider delay={200}>
                    {tasks.map((task) => (
                      <TaskCard
                        key={task.id}
                        label={`Task ${task.id}`}
                        title={task.title}
                        description={task.description}
                        cta={`Start Task ${task.id}`}
                        disabled={task.enabled === false}
                        onClick={() => router.push(task.resolveHref?.() ?? task.href)}
                      />
                    ))}
                  </TooltipProvider>
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
      {copy.heading ? (
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
      ) : null}
      {copy.body ? (
        <p
          style={{
            marginTop: copy.heading ? 0 : 13,
            color: TITLE,
            fontWeight: 400,
            fontSize: 20,
            lineHeight: '30px',
            letterSpacing: -0.41,
          }}
        >
          {copy.body}
        </p>
      ) : null}
      <p
        style={{
          marginTop: copy.heading || copy.body ? 20 : 8,
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
  tasks: readonly TaskDef[];
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
        {copy.heading ? (
          <h1
            className="mt-3 text-[18px] font-semibold leading-snug tracking-tight"
            style={{ color: TITLE }}
          >
            {copy.heading}
          </h1>
        ) : null}
        {copy.body ? (
          <p className="mt-2 text-[15px] leading-relaxed" style={{ color: TITLE }}>
            {copy.body}
          </p>
        ) : null}
        <p
          className={cn('text-[13px] leading-5', copy.heading || copy.body ? 'mt-4' : 'mt-2')}
          style={{ color: MUTED }}
        >
          {copy.note}
        </p>

        <div className="mt-5 flex flex-col gap-3">
          <TooltipProvider delay={200}>
            {tasks.map((task) => (
              <TaskCard
                key={task.id}
                label={`Task ${task.id}`}
                title={task.title}
                description={task.description}
                cta={`Start Task ${task.id}`}
                disabled={task.enabled === false}
                onClick={() => onStart(task.resolveHref?.() ?? task.href)}
                compact
              />
            ))}
          </TooltipProvider>
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
  disabled = false,
}: {
  label: string;
  title: string;
  description: string;
  cta: string;
  onClick: () => void;
  compact?: boolean;
  disabled?: boolean;
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
      <Tooltip>
        <TooltipTrigger
          render={
            <p
              className={cn(
                'mt-1.5 min-h-0 cursor-help',
                compact ? 'line-clamp-4' : 'line-clamp-5',
              )}
              style={{
                flex: 1,
                fontWeight: 400,
                fontSize: 13,
                lineHeight: '20px',
                color: MUTED,
              }}
            />
          }
        >
          {description.replace(/\n+/g, ' ')}
        </TooltipTrigger>
        <TooltipContent
          side="top"
          align="start"
          className="max-h-[min(360px,50vh)] max-w-[360px] overflow-y-auto whitespace-pre-line text-left leading-5"
        >
          {description}
        </TooltipContent>
      </Tooltip>
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className={cn(
          'mt-4 inline-flex items-center justify-center gap-1 rounded-md text-white',
          compact ? 'h-9 w-full px-3 text-[13px]' : 'w-fit px-3 text-[12px]',
          disabled
            ? 'cursor-not-allowed opacity-45'
            : 'cursor-pointer transition-opacity hover:opacity-90',
        )}
        style={{
          height: compact ? 36 : 30,
          padding: '0 12px',
          background: disabled ? 'rgba(148, 163, 184, 1)' : ACCENT,
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
