'use client';

/* Apply Dashboard V5 — new applicant home shown after email registration.
   Hero "Start your journey with DSTA" + explore cards + latest activity + guide aside. */
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Calendar, Compass, Sparkles } from 'lucide-react';
import Shell from '@/components/layout/shell';
import { useRole } from '@/lib/role';
import { cn } from '@/lib/utils';

const TITLE = 'rgba(15, 23, 43, 1)';
const BODY = 'rgba(69, 85, 108, 1)';
const MUTED = 'rgba(74, 85, 104, 1)';
const ACCENT = 'rgba(26, 101, 248, 1)';

export default function ApplyDashboardV5() {
  const { profile } = useRole();
  const router = useRouter();
  const firstName = profile.name.split(' ')[0] || 'there';

  return (
    <Shell activeRoute="/apply/dashboard" flushTop>
      <div className="relative mx-[calc(-1*clamp(24px,2.6vw,40px))]">
        {/* Hero */}
        <header
          className="relative z-0 w-full overflow-hidden lg:h-[300px]"
          style={{ background: 'rgba(254, 253, 251, 1)' }}
        >
          <div className="relative mx-auto h-full w-full max-w-[1440px]">
            <div className="pointer-events-none absolute inset-0 z-0 hidden lg:block">
              <HeroArt />
            </div>
            <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden lg:hidden">
              <Image
                src="/images/create-account-bg-m.png"
                alt=""
                fill
                className="object-cover object-center opacity-40"
                sizes="100vw"
                priority
              />
            </div>

            <div className="absolute inset-x-0 top-0 z-10 px-4 pt-10 lg:inset-x-auto lg:left-16 lg:top-[60px] lg:h-[200px] lg:w-[760px] lg:px-0 lg:pt-0">
              <h1
                className="text-[28px] font-semibold leading-8 tracking-[-0.48px] lg:text-[48px] lg:leading-[47px]"
                style={{ color: TITLE }}
              >
                Start your journey with DSTA
              </h1>
              <p
                className="mt-3 text-[14px] font-normal leading-[100%] lg:mt-4 lg:text-[16px]"
                style={{ color: MUTED }}
              >
                Welcome, {firstName}. Explore internship programmes, discover your defender
                archetype and find your place in the team.
              </p>
              <span
                className="mt-6 inline-flex h-[22px] items-center gap-1.5 rounded-full px-2.5 text-[12px] font-normal leading-4"
                style={{
                  background: 'rgba(0, 166, 244, 0.15)',
                  color: 'rgba(0, 105, 168, 1)',
                }}
              >
                <span className="size-1.5 rounded-full bg-current" aria-hidden />
                New applicant
              </span>
            </div>
          </div>
        </header>

        {/* Main content */}
        <div className="relative mx-auto w-full max-w-[1440px] px-4 pb-8 pt-6 lg:px-6">
          <div className="flex flex-col gap-5 lg:grid lg:grid-cols-[minmax(0,1fr)_314px] lg:items-start lg:gap-5">
            <div className="flex min-w-0 w-full flex-col gap-5">
              {/* Explore internships */}
              <section
                className="relative min-w-0 overflow-hidden rounded-lg p-6"
                style={{
                  borderRadius: 8,
                  border: '1px solid rgba(231, 228, 221, 1)',
                  background: 'rgba(251, 252, 253, 1)',
                }}
              >
                <p
                  className="text-[14px] font-normal leading-5"
                  style={{ color: BODY }}
                >
                  Explore internships
                </p>
                <h3
                  className="mt-1.5 text-[20px] font-semibold leading-[28.8px] lg:text-[18px] lg:leading-6 lg:tracking-[-0.45px]"
                  style={{ color: 'rgba(10, 22, 40, 1)' }}
                >
                  Find your starting point
                </h3>

                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  <ExploreCard
                    icon={<Compass className="size-5" />}
                    title="Explore programmes"
                    body="Browse internships across engineering, AI, cyber and more."
                    cta="Browse programmes"
                    onClick={() => router.push('/catlog')}
                  />
                  <ExploreCard
                    icon={<Sparkles className="size-5" />}
                    title="Discover your archetype"
                    body="Take a short quiz to find out what kind of defender you are."
                    cta="Take the quiz"
                    onClick={() => router.push('/apply/project-fit')}
                  />
                </div>
              </section>

              {/* Latest activity */}
              <section className="relative overflow-hidden rounded-2xl border border-border bg-white p-6">
                <div className="relative z-[1] flex flex-col lg:flex-row lg:items-start lg:justify-between lg:gap-3">
                  <div>
                    <p
                      className="text-[14px] font-normal leading-5"
                      style={{ color: BODY }}
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
                </div>

                <div className="relative z-[1] mt-6 flex min-h-[180px] flex-col items-center justify-center rounded-xl border border-dashed border-border bg-bg-subtle px-6 text-center">
                  <span
                    className="mb-3 flex size-10 items-center justify-center rounded-full bg-bg text-fg-muted"
                    aria-hidden
                  >
                    <Calendar className="size-5" strokeWidth={1.5} />
                  </span>
                  <p className="text-[16px] font-semibold leading-6 text-fg">No activity yet</p>
                  <p className="mt-1 max-w-md text-[14px] leading-5 text-fg-muted">
                    Updates will appear here after you start an application.
                  </p>
                </div>
              </section>
            </div>

            <NoApplicationAside />
          </div>
        </div>
      </div>
    </Shell>
  );
}

function ExploreCard({
  icon,
  title,
  body,
  cta,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  cta: string;
  onClick: () => void;
}) {
  return (
    <div
      className="relative overflow-hidden rounded-xl border border-border bg-white p-5 transition-shadow hover:shadow-sm"
      style={{ minHeight: 160 }}
    >
      <div
        className="inline-flex size-10 items-center justify-center rounded-lg"
        style={{ background: 'rgba(0, 166, 244, 0.12)', color: ACCENT }}
      >
        {icon}
      </div>
      <p className="mt-4 text-[16px] font-semibold leading-5" style={{ color: TITLE }}>
        {title}
      </p>
      <p className="mt-1 text-[14px] leading-5" style={{ color: BODY }}>
        {body}
      </p>
      <button
        type="button"
        onClick={onClick}
        className="mt-5 h-8 cursor-pointer rounded-md px-3 text-[13px] font-medium text-white"
        style={{ background: ACCENT }}
      >
        {cta}
      </button>
    </div>
  );
}

function NoApplicationAside() {
  const preparationItems = [
    'Check programme eligibility',
    'Prepare your education details',
    'Review available project areas',
  ];

  return (
    <aside className="relative mx-auto min-h-[360px] w-full shrink-0 overflow-hidden rounded-2xl border border-border bg-white p-6 shadow-sm max-lg:max-w-none lg:mx-0 lg:min-h-[423px] lg:w-[314px] lg:max-w-[314px]">
      <p className="text-[12px] leading-5 text-fg-muted">Application guide</p>
      <h3 className="mt-1 text-[24px] font-semibold leading-8 text-fg">Before you apply</h3>
      <p className="mt-3 text-[14px] leading-5 text-fg-muted">
        Have these details ready when you decide to start an application.
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

      <div className="mt-7 rounded-xl bg-bg-subtle p-4">
        <p className="text-[12px] leading-4 text-fg-muted">Application window</p>
        <p className="mt-1 text-[14px] font-semibold leading-5 text-fg">Open until 30 Sep 2026</p>
      </div>
    </aside>
  );
}

function HeroArt() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 1440 300"
      preserveAspectRatio="xMidYMid slice"
      className="absolute inset-0 h-full w-full"
    >
      <defs>
        <linearGradient id="hero-v5-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="rgba(244, 242, 236, 0.4)" />
          <stop offset="100%" stopColor="rgba(244, 242, 236, 0.05)" />
        </linearGradient>
      </defs>
      <g fill="none" stroke="rgba(26, 101, 248, 0.12)" strokeWidth="1">
        <path d="M-40 220 Q360 80 720 180 T1500 100" />
        <path d="M-40 260 Q400 120 800 220 T1500 140" />
        <path d="M-40 160 Q320 40 640 140 T1500 60" />
      </g>
      <g fill="rgba(26, 101, 248, 0.08)">
        <circle cx="1200" cy="80" r="6" />
        <circle cx="1100" cy="140" r="4" />
        <circle cx="1280" cy="200" r="8" />
        <circle cx="1040" cy="220" r="3" />
      </g>
      <g fill="none" stroke="rgba(0, 166, 244, 0.16)" strokeWidth="1.5">
        <circle cx="1120" cy="120" r="80" />
        <circle cx="1120" cy="120" r="120" opacity="0.6" />
      </g>
      <rect width="1440" height="300" fill="url(#hero-v5-grad)" />
    </svg>
  );
}
