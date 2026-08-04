'use client';

/* B-end usability-test briefing — fixed 1440×900 artboard, scales as one unit. */
import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { ArrowRight } from 'lucide-react';
import { useSession } from '@/lib/session';
import Topbar from '@/components/layout/topbar';

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

const TASKS = [
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
    if (!signedIn) router.replace('/catlog');
  }, [mounted, signedIn, router]);

  useEffect(() => {
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
      className="flex min-h-screen flex-col overflow-hidden"
      style={{ background: PAGE_BG }}
      data-zone="enterprise"
      data-mode="light"
    >
      <Topbar navigationHidden />
      <div className="flex flex-1 items-center justify-center pt-16">
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
          {/* Décor — pushed outward so the 1166 panel does not cover them */}
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

          {/* Main panel 1166×650 */}
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
              Prepare the Annual Internship Intake
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
              You are responsible for preparing the upcoming annual internship intake and managing
              the related project submissions.
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
              During this exercise, you will complete the following two tasks.
            </p>

            <div
              className="grid grid-cols-2"
              style={{ marginTop: 11, gap: 16 }}
            >
              {TASKS.map((task) => (
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
    </div>
  );
}

function TaskCard({
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
    <div
      className="flex flex-col"
      style={{
        border: `0.95px solid ${CARD_BORDER}`,
        background: 'rgba(255, 255, 255, 1)',
        borderRadius: 8,
        padding: 22,
      }}
    >
      <p
        style={{
          fontWeight: 600,
          fontSize: 16,
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
          fontSize: 16,
          lineHeight: '20px',
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
          fontSize: 13,
          lineHeight: '20px',
          color: MUTED,
        }}
      >
        {description}
      </p>
      <button
        type="button"
        onClick={onClick}
        className="mt-4 inline-flex w-fit cursor-pointer items-center justify-center gap-1 rounded-md text-white transition-opacity hover:opacity-90"
        style={{
          height: 30,
          padding: '0 12px',
          background: ACCENT,
          fontWeight: 600,
          fontSize: 12,
          lineHeight: '16px',
        }}
      >
        {cta}
        <ArrowRight className="size-3.5 shrink-0" strokeWidth={1.5} />
      </button>
    </div>
  );
}
