'use client';

/* B-end usability-test briefing — fixed 1440×900 artboard, scales as one unit. */
import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { ArrowRight } from 'lucide-react';
import { useSession } from '@/lib/session';

const ART_W = 1440;
const ART_H = 900;

const PAGE_BG = 'rgba(248, 247, 242, 1)';
const TITLE = 'rgba(10, 22, 40, 1)';
const MUTED = 'rgba(69, 85, 108, 1)';
const ACCENT = 'rgba(26, 101, 248, 1)';
const TASK_TITLE = 'rgba(32, 32, 32, 1)';
const EYEBROW = '#7C8693';
const CARD_BORDER = 'rgba(231, 228, 221, 1)';
const DIVIDER = 'rgba(231, 228, 221, 1)';
const CARD_SHADOW =
  '0px 4px 6px -4px rgba(0, 0, 0, 0.05), 0px 10px 15px -3px rgba(0, 0, 0, 0.1)';

export default function StartTasks() {
  const router = useRouter();
  const { signedIn } = useSession();
  const [mounted, setMounted] = useState(false);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    if (!signedIn) router.replace('/login/staff');
  }, [mounted, signedIn, router]);

  useEffect(() => {
    function update() {
      const next = Math.min(window.innerWidth / ART_W, window.innerHeight / ART_H, 1);
      setScale(next);
    }
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  if (!mounted || !signedIn) {
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
      className="flex min-h-screen items-center justify-center overflow-hidden"
      style={{ background: PAGE_BG }}
      data-zone="enterprise"
      data-mode="light"
    >
      {/* Outer box matches scaled size so layout centers correctly */}
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
          {/* Layer 0 — line-art décor */}
          <Image
            src="/images/left-top.png"
            alt=""
            width={467}
            height={314}
            priority
            className="pointer-events-none absolute object-contain"
            style={{ left: 41, top: 155, width: 467, height: 314, zIndex: 0 }}
          />
          <Image
            src="/images/right-bottom.png"
            alt=""
            width={651}
            height={326}
            priority
            className="pointer-events-none absolute object-contain"
            style={{ right: 19, bottom: 8, width: 651, height: 326, zIndex: 0 }}
          />

          {/* Color shapes — above the briefing card */}
          <Image
            src="/images/left-red.png"
            alt=""
            width={280}
            height={260}
            className="pointer-events-none absolute object-contain object-left-bottom"
            style={{ left: 172, bottom: 110, width: 280, height: 'auto', zIndex: 3 }}
          />
          <Image
            src="/images/right-green.png"
            alt=""
            width={240}
            height={140}
            className="pointer-events-none absolute object-contain object-left-bottom"
            style={{ left: 256, bottom: 142, width: 240, height: 'auto', zIndex: 3 }}
          />

          {/* Briefing card — right 114, bottom 189 */}
          <div
            className="absolute flex flex-col bg-white"
            style={{
              right: 114,
              bottom: 189,
              width: 1065,
              height: 522,
              zIndex: 2,
              borderRadius: 12,
              border: `1px solid ${CARD_BORDER}`,
              boxShadow: CARD_SHADOW,
              padding: '30px 35px 28px 35px',
            }}
          >
            <p
              className="uppercase"
              style={{
                color: EYEBROW,
                fontWeight: 500,
                fontSize: 18,
                lineHeight: '36px',
                letterSpacing: 3.6,
              }}
            >
              Usability Test Scenario
            </p>
            <h1
              style={{
                marginTop: 4,
                color: TITLE,
                fontWeight: 600,
                fontSize: 21,
                lineHeight: '32px',
                letterSpacing: -0.43,
              }}
            >
              Prepare the Annual Internship Intake
            </h1>
            <p
              style={{
                marginTop: 8,
                color: TITLE,
                fontWeight: 400,
                fontSize: 22,
                lineHeight: '32px',
                letterSpacing: -0.43,
              }}
            >
              You are responsible for preparing the upcoming annual internship intake and managing
              the related project submissions.
            </p>
            <p
              style={{
                marginTop: 16,
                color: MUTED,
                fontWeight: 400,
                fontSize: 14,
                lineHeight: '21px',
              }}
            >
              During this exercise, you will complete the following two tasks.
            </p>

            <div className="mt-6 flex min-h-0 flex-1 flex-col justify-center">
              <TaskBlock
                label="Task 1"
                title="Create Project Requests"
                description="Create and issue Project Requests to the relevant Programme Centres for the annual internship intake."
                cta="Start Task 1"
                onClick={() => router.push('/requests/new')}
              />
              <div style={{ margin: '20px 0', borderTop: `1px solid ${DIVIDER}` }} />
              <TaskBlock
                label="Task 2"
                title="Review and Manage Submitted Projects"
                description="Assume that internship projects have subsequently been submitted by AD (P&C). Review the submitted projects and take the appropriate actions."
                cta="Start Task 2"
                onClick={() => router.push('/projects')}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function TaskBlock({
  label,
  title,
  description,
  cta,
  onClick,
}: {
  label: string;
  title: string;
  description: string;
  cta: string;
  onClick: () => void;
}) {
  return (
    <div className="grid grid-cols-[auto_1fr] items-baseline gap-x-3">
      <span style={{ color: ACCENT, fontWeight: 600, fontSize: 18, lineHeight: '21px' }}>
        {label}
      </span>
      <div>
        <h2 style={{ color: TASK_TITLE, fontWeight: 600, fontSize: 18, lineHeight: '21px' }}>
          {title}
        </h2>
        <p
          style={{
            marginTop: 6,
            color: MUTED,
            fontWeight: 400,
            fontSize: 14,
            lineHeight: '21px',
          }}
        >
          {description}
        </p>
        <button
          type="button"
          onClick={onClick}
          className="mt-3 inline-flex cursor-pointer items-center justify-center gap-1 rounded-md text-white transition-opacity hover:opacity-90"
          style={{
            width: 120,
            height: 32,
            background: ACCENT,
            fontWeight: 600,
            fontSize: 12,
            lineHeight: '18px',
          }}
        >
          {cta}
          <ArrowRight className="size-3.5 shrink-0" strokeWidth={1.5} />
        </button>
      </div>
    </div>
  );
}
