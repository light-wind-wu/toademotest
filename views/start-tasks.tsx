'use client';

/* B-end usability-test briefing.
   Desktop: fixed 1680×900 artboard, scales as one unit.
   Mobile: natural scroll layout.
   Task list is driven by /catlog path (each role starts at Task 1). */
import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { ArrowRight } from 'lucide-react';
import { useSession, signIn, isSignedIn } from '@/lib/session';
import { useRole } from '@/lib/role';
import { loadRequests, loadSubmissions, saveRequests, saveSubmissions } from '@/lib/storage';
import { loadUtCatalogPath, loadUtTrack, type UtCatalogPath, type UtTrack } from '@/lib/ut-track';
import type { ProjectSubmissionBatch, SubmittedProject } from '@/lib/types';
import Topbar from '@/components/layout/topbar';
import OutOfScopeDialog from '@/components/apply/out-of-scope-dialog';
import { cn } from '@/lib/utils';
import {
  getMyinfoProfile,
  saveApplicantProfile,
} from '@/lib/myinfo';

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

/** Same token the AD (P&C) inbox uses for the PC3 UG request (“2027 Internship Project Request”). */
const AD_PNC_PC3_TOKEN_FALLBACK = 'seed-pc3-ug-2027';

/** Placements shown by the returned-for-update scenario for the PC3 UG request. */
const AD_PNC_PC3_PLACEMENTS = 7;

/** Seed placements for the PC3 UG request (reset value for Task 1). */
const AD_PNC_PC3_BASE_PLACEMENTS = 4;

/* ── PC3 UG returned-for-update scenario ───────────────────────────────────
   Task 2 seeds a fixed “returned” state right before navigating, so both the
   respond screen and the /submissions inbox card show:
   1 not submitted · 2 pending · 1 returned for update · 3 approved
   (placements 7, six projects × 1 slot). Idempotent. */
function pc3UgReturnedBatch(): ProjectSubmissionBatch {
  const base = {
    requestLineId: 'seed-req-pc3-10',
    mentorDept: 'DSTA',
    skills: ['Python', 'Data Analysis'],
    discipline: 'Computer Science / Data Science / Operations Research',
    slots: 1,
    preferredEducation: 'Undergraduate Student',
    minGpa: '',
    projectType: 'Technical',
    additionalRequirements: '',
    aiCheck: { grammar: 'pass' as const, level: 'pass' as const, notes: [] },
    pc: 'PC3',
    educationLevel: 'Undergraduate Student' as const,
    internshipDuration: '2',
    internshipPeriodStart: 'Jan 2027',
    internshipPeriodEnd: 'Jun 2027',
    workingLocation: 'DSTA',
  };

  const projects: SubmittedProject[] = [
    {
      ...base,
      id: 'sub-pc3-ug-return-001',
      title: 'AI-Enabled Defence Logistics Forecasting',
      description:
        'Develop a prototype that uses historical logistics data to forecast equipment demand and identify potential supply shortages. The intern will clean and analyse data, compare forecasting approaches, and evaluate model performance. Deliverables include a working prototype, an evaluation report, and a dashboard presenting key forecasts.',
      mentor: 'Wei Jian Lim',
      mentorAppointment: 'Senior Engineer',
      mentorEmail: 'weijian.lim@dsta.gov.sg',
      mentorUserId: 'mentor-weijian',
      mentorBio: 'Senior engineer focused on applied analytics and logistics modelling.',
      skills: ['Python', 'Data Analysis', 'Machine Learning'],
      status: 'returnedForUpdate',
      remarks:
        'Please narrow the scope to one equipment category, use only anonymised data, and include a baseline comparison for model evaluation.',
      techDomain: 'Digital',
      emergingArea: 'Data Analytics',
    },
    {
      ...base,
      id: 'sub-pc3-ug-pending-002',
      title: 'Cyber Threat Intelligence Automation',
      description:
        'Build a pipeline that ingests open-source threat feeds, deduplicates indicators, and surfaces actionable alerts for the SOC team.',
      mentor: 'Dr. Nadia Rahman',
      mentorAppointment: 'Senior Specialist',
      mentorEmail: 'nadia_rahman@dsta.gov.sg',
      mentorUserId: 'mentor-nadia',
      mentorBio: 'Specialises in threat intelligence and secure automation.',
      skills: ['Python', 'Cyber Security', 'Automation'],
      status: 'pending',
      techDomain: 'Cyber',
      emergingArea: 'Cybersecurity',
    },
    {
      ...base,
      id: 'sub-pc3-ug-pending-003',
      title: 'Autonomous Inspection Drone for Hangar Maintenance',
      description:
        'Develop flight-planning and image-capture logic for a small drone that inspects aircraft hangar structures, with anomaly detection on captured imagery.',
      mentor: 'Dr. Samuel Yeo',
      mentorAppointment: 'Principal Engineer',
      mentorEmail: 'samuel_yeo@dsta.gov.sg',
      mentorUserId: 'mentor-samuel',
      mentorBio: 'Specialises in perception, sensor fusion and mobile robot autonomy.',
      skills: ['Python', 'ROS', 'Computer Vision'],
      status: 'pending',
      techDomain: 'Autonomy',
      emergingArea: 'Robotics & Autonomous Systems',
    },
    {
      ...base,
      id: 'sub-pc3-ug-approved-004',
      title: 'Secure Supply Chain Analytics Dashboard',
      description:
        'Prototype a dashboard that visualises supply chain risk signals from structured datasets, with role-based access and export controls.',
      mentor: 'Michael Lim',
      mentorAppointment: 'Lead Engineer',
      mentorEmail: 'michael_lim@dsta.gov.sg',
      mentorUserId: 'mentor-michael',
      mentorBio: 'Engineering lead focused on secure data platforms and dashboards.',
      skills: ['Data Analysis', 'Dashboarding', 'TypeScript'],
      status: 'approved',
      reviewedAt: '2026-07-10',
      reviewedBy: 'Davina Tan',
      techDomain: 'Digital',
      emergingArea: 'Data Analytics',
    },
    {
      ...base,
      id: 'sub-pc3-ug-approved-005',
      title: 'Signal Classification for Spectrum Monitoring',
      description:
        'Train and evaluate machine-learning classifiers that identify radio emitters in congested spectrum, with explainability for analyst review.',
      mentor: 'Ravi Menon',
      mentorAppointment: 'Lead Engineer',
      mentorEmail: 'ravi_menon@dsta.gov.sg',
      mentorUserId: 'mentor-ravi',
      mentorBio: 'Specialises in signal processing and applied machine learning.',
      skills: ['Machine Learning', 'Signal Processing', 'PyTorch'],
      status: 'approved',
      reviewedAt: '2026-07-10',
      reviewedBy: 'Davina Tan',
      techDomain: 'Sensors',
      emergingArea: 'AI/ML',
    },
    {
      ...base,
      id: 'sub-pc3-ug-approved-006',
      title: 'Predictive Maintenance for Mission-Critical Systems',
      description:
        'Develop models that forecast component wear from sensor telemetry to schedule maintenance proactively across mission-critical platforms.',
      mentor: 'Gerald Tan',
      mentorAppointment: 'Senior Engineer',
      mentorEmail: 'gerald_tan@dsta.gov.sg',
      mentorUserId: 'mentor-gerald',
      mentorBio: 'Builds data-driven tools for platform sustainment and readiness.',
      skills: ['Data Analysis', 'Predictive Maintenance', 'Python'],
      status: 'approved',
      reviewedAt: '2026-07-10',
      reviewedBy: 'Davina Tan',
      techDomain: 'Digital',
      emergingArea: 'Data Analytics',
    },
  ];

  return {
    id: 'batch-pc3-ug-2027-returned',
    uploadToken: 'seed-pc3-ug-2027',
    pc: 'james.tan@dsta.gov.sg',
    pcHead: 'James Tan',
    submittedBy: 'James Tan',
    programme: '',
    educationLevel: 'Undergraduate Student',
    requestedEducationLevels: ['Undergraduate Student'],
    placements: 6,
    uploadedAt: '2026-07-08',
    projects,
  };
}

/** Write the PC3 UG returned-for-update state to localStorage (idempotent). */
function seedTask2Scenario(): void {
  try {
    const returned = pc3UgReturnedBatch();
    const nextUploaded = returned.projects
      .filter(p => p.status !== 'withdrawn')
      .reduce((sum, p) => sum + p.slots, 0);
    const nextStatus: import('@/lib/types').RequestStatus =
      nextUploaded > AD_PNC_PC3_PLACEMENTS
        ? 'excess'
        : nextUploaded === AD_PNC_PC3_PLACEMENTS
          ? 'matched'
          : nextUploaded > 0
            ? 'partial'
            : 'pending';
    saveRequests(
      loadRequests().map(r =>
        r.id === 'seed-req-pc3-10'
          ? { ...r, placements: AD_PNC_PC3_PLACEMENTS, uploaded: nextUploaded, status: nextStatus }
          : r,
      ),
    );
    saveSubmissions([
      ...loadSubmissions().filter(b => b.uploadToken !== 'seed-pc3-ug-2027'),
      returned,
    ]);
  } catch {
    /* best-effort seed — non-fatal for a mockup */
  }
}

/** Undo the Task 2 scenario so Task 1 starts from the clean seed state. */
function seedTask1Scenario(): void {
  try {
    saveRequests(
      loadRequests().map(r =>
        r.id === 'seed-req-pc3-10' ? { ...r, placements: AD_PNC_PC3_BASE_PLACEMENTS, uploaded: 0 } : r,
      ),
    );
    saveSubmissions(loadSubmissions().filter(b => b.uploadToken !== 'seed-pc3-ug-2027'));
  } catch {
    /* best-effort reset — non-fatal for a mockup */
  }
}

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
    return `/submissions?token=${encodeURIComponent(token)}&mode=upload`;
  } catch {
    return `/submissions?token=${encodeURIComponent(AD_PNC_PC3_TOKEN_FALLBACK)}&mode=upload`;
  }
}

type TaskDef = {
  id: number;
  title: string;
  href: string;
  /** Optional live resolve (e.g. token from submissions list data). */
  resolveHref?: () => string;
  /** Runs synchronously right before navigating (used to seed scenario state). */
  onBeforeNavigate?: () => void;
  /**
   * When false, Start Task stays clickable but opens the out-of-scope dialog
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
    onBeforeNavigate: seedTask1Scenario,
  },
  {
    id: 2,
    title: 'Update and Resubmit a Project',
    href: `/submissions/respond?token=${AD_PNC_PC3_TOKEN_FALLBACK}&mode=upload`,
    resolveHref: resolveAdPncPc3RespondHref,
    onBeforeNavigate: seedTask2Scenario,
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
    href: '/apply/dashboard',
    enabled: true,
  },
];

const PROBING_TASKS: TaskDef[] = [
  {
    id: 1,
    title: 'Explore Applicant Homepage',
    href: '/login',
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
  const [outOfScopeOpen, setOutOfScopeOpen] = useState(false);

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

  const tasks = useMemo(() => briefingFor(path, track), [path, track]);
  const isApplicant = track === 'applicant';
  const taskCols = tasks.length === 1 ? 'grid-cols-1' : 'grid-cols-2';

  function startTask(task: TaskDef) {
    if (task.enabled === false) {
      setOutOfScopeOpen(true);
      return;
    }
    task.onBeforeNavigate?.();
    const href = task.resolveHref?.() ?? task.href;
    /* Applicant Task 2 → dashboard: ensure session so Shell does not bounce to login/welcome. */
    if (
      (track === 'applicant' || path === 'applicant') &&
      href.startsWith('/apply/dashboard') &&
      !isSignedIn()
    ) {
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
                      onClick={() => startTask(task)}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <OutOfScopeDialog open={outOfScopeOpen} onOpenChange={setOutOfScopeOpen} />
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
  compact = false,
}: {
  label: string;
  title: string;
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
      <button
        type="button"
        onClick={onClick}
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
    </div>
  );
}
