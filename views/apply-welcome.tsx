'use client';

/* Post-Myinfo welcome — 1440×840 artboard (welcome-bg) + 672×368 card.
   PC illus 314×298 / mobile 217×230 bottom-right. Line anim + auto-advance kept. */
import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { ArrowRight } from 'lucide-react';
import ApplicantChrome from '@/components/apply/applicant-chrome';
import { firstName, loadMyinfoPending } from '@/lib/myinfo';
import { cn } from '@/lib/utils';

const AUTO_MS = 10000; // temporary — revert to 3000 when reviewing done

const ART_W = 1440;
const ART_H = 840;
const CARD_W = 672;
const CARD_H = 368;

const PAGE_BG = 'rgba(248, 247, 242, 1)';
const EYEBROW = 'rgba(74, 85, 104, 1)';
const TITLE = 'rgba(10, 22, 40, 1)';
const BODY_FG = 'rgba(69, 85, 108, 1)';
const CTA_BG = 'rgba(26, 101, 248, 1)';
const CARD_BORDER = 'rgba(231, 228, 221, 1)';

const PROGRAMME_LABEL = 'Polytechnic Internship 2027';

export default function ApplyWelcome() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [leaving, setLeaving] = useState(false);
  const [scale, setScale] = useState(1);
  const leftRef = useRef(false);

  useEffect(() => {
    const pending = loadMyinfoPending();
    if (!pending) {
      router.replace('/login');
      return;
    }
    setName(firstName(pending.profile.name));
  }, [router]);

  useEffect(() => {
    if (!name) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const delay = reduced ? 800 : AUTO_MS;
    const t = window.setTimeout(() => goNext(), delay);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name]);

  useEffect(() => {
    function update() {
      // Leave room for applicant chrome (~56px); scale artboard as one unit
      const availH = Math.max(window.innerHeight - 56, 320);
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
    window.setTimeout(() => router.replace('/apply/account-setup'), 280);
  }

  if (!name) {
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
    <ApplicantChrome className="!bg-[rgba(248,247,242,1)]">
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

      {/* ── Mobile (< md): fluid card, illus bottom-right ─────────── */}
      <main
        className="relative flex min-h-[calc(100vh-3.5rem)] items-center justify-center overflow-hidden px-4 py-6 md:hidden"
        style={{ background: PAGE_BG }}
      >
        <WelcomeCard
          name={name}
          leaving={leaving}
          onStart={goNext}
          variant="mobile"
        />
      </main>

      {/* ── PC: 1440×840 artboard with welcome-bg, scales as one unit */}
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
              <WelcomeCard
                name={name}
                leaving={leaving}
                onStart={goNext}
                variant="pc"
              />
            </div>
          </div>
        </div>
      </main>
    </ApplicantChrome>
  );
}

function WelcomeCard({
  name,
  leaving,
  onStart,
  variant,
}: {
  name: string;
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
      {/* Illustration — lowest layer */}
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

      {/* Copy above illustration */}
      <div
        className="relative z-[1] flex h-full flex-col"
        style={
          isPc
            ? { maxWidth: 400, justifyContent: 'center', padding: '32px 16px 32px 32px' }
            : { padding: '26px 24px 24px 24px' }
        }
      >
        <p
          className="welcome-line"
          style={{
            color: EYEBROW,
            fontWeight: 400,
            fontSize: 14,
            lineHeight: 1,
            animationDelay: '240ms',
          }}
        >
          {PROGRAMME_LABEL}
        </p>

        <h1
          className="mt-3 font-semibold tracking-[-0.48px]"
          style={{
            color: TITLE,
            fontWeight: 600,
            fontSize: isPc ? 28 : 24,
            lineHeight: isPc ? '40px' : '32px',
          }}
        >
          <span className="welcome-line block whitespace-nowrap" style={{ animationDelay: '300ms' }}>
            Hi {name},
          </span>
          <span className="welcome-line block whitespace-nowrap" style={{ animationDelay: '400ms' }}>
            Let&apos;s get started on your
          </span>
          <span className="welcome-line block whitespace-nowrap" style={{ animationDelay: '480ms' }}>
            application!
          </span>
        </h1>

        <div
          style={{
            marginTop: isPc ? 12 : 24,
            color: BODY_FG,
            fontWeight: 400,
            fontSize: isPc ? 16 : 14,
            lineHeight: '24px',
          }}
        >
          {isPc ? (
            <>
              <span className="welcome-line block whitespace-nowrap" style={{ animationDelay: '560ms' }}>
                Introduce yourself to us in a few questions. Along the
              </span>
              <span className="welcome-line block whitespace-nowrap" style={{ animationDelay: '620ms' }}>
                way, you will discover your Defender archetype which
              </span>
              <span className="welcome-line block whitespace-nowrap" style={{ animationDelay: '680ms' }}>
                will influence the projects we recommend for you.
              </span>
            </>
          ) : (
            <>
              <span className="welcome-line block" style={{ animationDelay: '560ms' }}>
                Introduce yourself to us in a few questions.
              </span>
              <span className="welcome-line block" style={{ animationDelay: '620ms' }}>
                Along the way, you will discover your
              </span>
              <span className="welcome-line block" style={{ animationDelay: '680ms' }}>
                Defender archetype which will influence the
              </span>
              <span className="welcome-line block" style={{ animationDelay: '740ms' }}>
                projects we recommend for you.
              </span>
            </>
          )}
        </div>

        {/* Mobile: push button to card bottom-left (padding already 24) */}
        {!isPc && <div className="min-h-0 flex-1" aria-hidden />}
        <div
          className={cn('welcome-line', isPc && 'mt-5')}
          style={{ animationDelay: '800ms' }}
        >
          <StartButton onClick={onStart} />
        </div>
      </div>
    </div>
  );
}

function StartButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex cursor-pointer items-center justify-center gap-1 rounded-md text-white transition-opacity hover:opacity-90"
      style={{
        width: 90,
        height: 36,
        background: CTA_BG,
        fontWeight: 500,
        fontSize: 14,
        lineHeight: '20px',
      }}
    >
      Start
      <ArrowRight className="size-3.5 shrink-0" strokeWidth={1.5} />
    </button>
  );
}
