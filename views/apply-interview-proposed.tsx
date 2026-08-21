'use client';

/* Post–custom timeslot request — same welcome artboard / line motion as /apply/welcome.
   Start → V3 (from V1) or V4 (from V2) dashboard follow-up task. */
import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { ArrowRight, Loader2 } from 'lucide-react';
import ApplicantChrome from '@/components/apply/applicant-chrome';
import { INTERVIEW_PROPOSED_FROM_KEY } from '@/components/apply/interview-timeslot-sheet';
import {
  type ApplyDashboardBase,
} from '@/lib/apply-dashboard-version';
import { cn } from '@/lib/utils';

const ART_W = 1440;
const ART_H = 840;
const CARD_W = 672;
const CARD_H = 368;

const PAGE_BG = 'rgba(248, 247, 242, 1)';
const TITLE = 'rgba(10, 22, 40, 1)';
const BODY_FG = 'rgba(69, 85, 108, 1)';
const CTA_BG = 'rgba(26, 101, 248, 1)';
const CARD_BORDER = 'rgba(231, 228, 221, 1)';

function readSourceVersion(): ApplyDashboardBase {
  if (typeof window === 'undefined') return 'v1';
  try {
    const raw = sessionStorage.getItem(INTERVIEW_PROPOSED_FROM_KEY);
    if (raw === 'v1' || raw === 'v2') return raw;
  } catch {
    /* ignore */
  }
  return 'v1';
}

export default function ApplyInterviewProposed() {
  const router = useRouter();
  const [source, setSource] = useState<ApplyDashboardBase>('v1');
  const [ready, setReady] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [navigating, setNavigating] = useState(false);
  const [scale, setScale] = useState(1);
  const leftRef = useRef(false);

  useEffect(() => {
    setSource(readSourceVersion());
    setReady(true);
  }, []);

  useEffect(() => {
    function update() {
      const availH = Math.max(window.innerHeight - 64, 320);
      setScale(Math.min(window.innerWidth / ART_W, availH / ART_H, 1));
    }
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  function goNext() {
    if (leftRef.current) return;
    leftRef.current = true;
    setLeaving(true);
    window.setTimeout(() => {
      setNavigating(true);
      try {
        sessionStorage.removeItem(INTERVIEW_PROPOSED_FROM_KEY);
      } catch {
        /* ignore */
      }
      router.replace('/apply/applicant-interview-reschedule-review');
    }, 280);
  }

  if (!ready || navigating) {
    return (
      <ApplicantChrome hideProfile className="!bg-[rgba(248,247,242,1)]">
        <div className="flex flex-1 flex-col items-center justify-center gap-3 px-4 py-16">
          <Loader2
            className="size-8 animate-spin text-accent"
            strokeWidth={1.5}
            aria-hidden
          />
          <p className="text-body-sm text-fg-muted">
            {navigating ? 'Opening interview task…' : 'Loading…'}
          </p>
        </div>
      </ApplicantChrome>
    );
  }

  return (
    <ApplicantChrome hideProfile className="!bg-[rgba(248,247,242,1)]">
      <style>{`
        @keyframes welcomeLineIn {
          from { opacity: 0; filter: blur(2px); transform: translateY(12px); }
          to   { opacity: 1; filter: blur(0);   transform: translateY(0); }
        }
        @keyframes welcomeCardEnter {
          from { opacity: 0; transform: translateY(16px) scale(0.985); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes welcomeCardExit {
          to { opacity: 0; transform: translateY(-8px); }
        }
        .welcome-line {
          opacity: 0;
          filter: blur(2px);
          transform: translateY(12px);
          animation: welcomeLineIn 520ms cubic-bezier(0.22, 1, 0.36, 1) forwards;
        }
        @media (prefers-reduced-motion: reduce) {
          .welcome-line,
          .welcome-card-anim {
            animation: none !important;
            opacity: 1 !important;
            filter: none !important;
            transform: none !important;
          }
        }
      `}</style>

      <main
        className="relative flex min-h-[calc(100vh-3.5rem)] items-center justify-center overflow-hidden px-4 py-6 md:hidden"
        style={{ background: PAGE_BG }}
      >
        <ProposedCard leaving={leaving} onStart={goNext} variant="mobile" />
      </main>

      <main
        className="relative hidden min-h-[calc(100vh-3.5rem)] items-center justify-center overflow-hidden md:flex"
        style={{ background: PAGE_BG }}
      >
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
              src="/images/welcome-bg.png"
              alt=""
              fill
              priority
              className="object-cover object-center"
              sizes="1440px"
            />
            <div
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
              style={{ width: CARD_W, height: CARD_H }}
            >
              <ProposedCard leaving={leaving} onStart={goNext} variant="pc" />
            </div>
          </div>
        </div>
      </main>
    </ApplicantChrome>
  );
}

function ProposedCard({
  leaving,
  onStart,
  variant,
}: {
  leaving: boolean;
  onStart: () => void;
  variant: 'pc' | 'mobile';
}) {
  const isPc = variant === 'pc';

  return (
    <div
      className={cn(
        'welcome-card-anim relative overflow-hidden rounded-xl bg-white',
        leaving && 'pointer-events-none',
        isPc ? 'h-full w-full' : 'w-full max-w-[400px]',
      )}
      style={{
        border: `1px solid ${CARD_BORDER}`,
        height: isPc ? CARD_H : 409,
        width: isPc ? CARD_W : undefined,
        animation: leaving
          ? 'welcomeCardExit 280ms ease forwards'
          : 'welcomeCardEnter 680ms cubic-bezier(0.16, 1, 0.3, 1) 80ms both',
      }}
    >
      <div
        className="pointer-events-none absolute bottom-0 right-0 z-0"
        style={
          isPc
            ? { width: 314, height: 298 }
            : { width: 217, height: 230 }
        }
      >
        <Image
          src={isPc ? '/images/welcome-pc.png' : '/images/welcome-m.png'}
          alt=""
          width={isPc ? 314 : 217}
          height={isPc ? 298 : 230}
          priority
          className="h-full w-full object-contain object-bottom-right"
        />
      </div>

      <div
        className="relative z-[1] flex h-full flex-col"
        style={
          isPc
            ? { maxWidth: 520, justifyContent: 'center', padding: '32px 16px 32px 32px' }
            : { padding: '26px 24px 24px 24px' }
        }
      >
        <h1
          className="font-semibold tracking-[-0.48px]"
          style={{
            color: TITLE,
            fontWeight: 600,
            fontSize: isPc ? 28 : 24,
            lineHeight: isPc ? '40px' : '32px',
          }}
        >
          <span className="welcome-line block" style={{ animationDelay: '300ms' }}>
            New interview timeslots proposed
          </span>
        </h1>

        <p
          className="welcome-line"
          style={{
            marginTop: isPc ? 12 : 24,
            color: BODY_FG,
            fontWeight: 400,
            fontSize: isPc ? 16 : 14,
            lineHeight: '24px',
            animationDelay: '480ms',
            maxWidth: isPc ? 360 : undefined,
          }}
        >
          The mentor has proposed a new interview time based on your availability.
          Please review and confirm the timeslot.
        </p>

        {!isPc && <div className="min-h-0 flex-1" aria-hidden />}
        <div
          className={cn('welcome-line', isPc && 'mt-5')}
          style={{ animationDelay: '720ms' }}
        >
          <button
            type="button"
            onClick={onStart}
            className="inline-flex h-9 cursor-pointer items-center justify-center gap-1 rounded-md px-4 text-white transition-opacity hover:opacity-90"
            style={{
              background: CTA_BG,
              fontWeight: 500,
              fontSize: 14,
              lineHeight: '20px',
            }}
          >
            Start
            <ArrowRight className="size-3.5 shrink-0" strokeWidth={1.5} />
          </button>
        </div>
      </div>
    </div>
  );
}
