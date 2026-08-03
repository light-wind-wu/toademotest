'use client';

/* Post-Myinfo welcome. Line breaks follow C-end comps (PC / mobile).
   Lines animate in upward (concept-demo welcomeLineIn). Auto-advance 3s;
   no countdown UI. CTA also navigates. */
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight } from 'lucide-react';
import ApplicantChrome from '@/components/apply/applicant-chrome';
import { Button } from '@/components/ui/button';
import { firstName, loadMyinfoPending } from '@/lib/myinfo';
import { cn } from '@/lib/utils';

const AUTO_MS = 10000; // temporary — revert to 3000 when reviewing done

export default function ApplyWelcome() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [leaving, setLeaving] = useState(false);
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
    // goNext is stable enough via leftRef; only re-arm when name arrives
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name]);

  function goNext() {
    if (leftRef.current) return;
    leftRef.current = true;
    setLeaving(true);
    window.setTimeout(() => router.replace('/apply/account-setup'), 280);
  }

  if (!name) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg text-body-sm text-fg-muted">
        Loading…
      </div>
    );
  }

  return (
    <ApplicantChrome>
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
        className={cn(
          'relative flex min-h-[calc(100vh-3.5rem)] items-center justify-center overflow-hidden px-4 py-6 md:px-8 md:py-12',
        )}
      >
        {/* Placeholder atmosphere — replace with design asset later */}
        <AtmospherePlaceholder className="pointer-events-none absolute inset-0" />

        <div
          className={cn(
            'welcome-card-anim relative z-[1] w-full overflow-hidden rounded-2xl border border-border bg-surface',
            'shadow-[0_20px_50px_rgba(10,22,40,0.10)]',
            'max-w-[420px] md:max-w-[860px]',
            leaving && 'pointer-events-none',
          )}
          style={{
            animation: leaving
              ? 'welcomeCardExit 280ms ease forwards'
              : 'welcomeCardEnter 680ms cubic-bezier(0.16, 1, 0.3, 1) 80ms both',
          }}
        >
          <div className="grid md:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
            <div className="flex flex-col justify-center p-6 pb-4 sm:p-8 md:p-10 md:pr-4">
              <h1 className="text-[1.375rem] font-bold leading-[1.25] tracking-tight text-fg sm:text-[1.5rem] md:text-[1.625rem]">
                <span className="welcome-line block" style={{ animationDelay: '300ms' }}>
                  Hi {name},
                </span>
                {/* Mobile: break before "started." */}
                <span className="welcome-line block md:hidden" style={{ animationDelay: '420ms' }}>
                  let&apos;s get your application
                </span>
                <span className="welcome-line block md:hidden" style={{ animationDelay: '500ms' }}>
                  started.
                </span>
                {/* Desktop: single second line */}
                <span className="welcome-line hidden md:block" style={{ animationDelay: '420ms' }}>
                  let&apos;s get your application started.
                </span>
              </h1>

              {/* Body — strict comps line breaks (PC vs mobile) */}
              <div className="mt-4 max-w-md text-[14.5px] leading-[1.6] text-fg-muted">
                <div className="md:hidden">
                  <MobileBodyLines />
                </div>
                <div className="hidden md:block">
                  <DesktopBodyLines />
                </div>
              </div>

              <div
                className="welcome-line mt-7"
                style={{ animationDelay: '880ms' }}
              >
                <Button
                  size="lg"
                  className="h-11 rounded-lg px-6 font-semibold"
                  onClick={goNext}
                >
                  Let&apos;s Go
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="relative flex items-end justify-end md:items-stretch md:justify-end">
              <div className="w-[78%] max-w-[260px] md:w-full md:max-w-none md:min-h-[280px]">
                <WelcomeHeroPlaceholder />
              </div>
            </div>
          </div>
        </div>
      </main>
    </ApplicantChrome>
  );
}

/** Mobile body breaks — match comps exactly. */
function MobileBodyLines() {
  const lines = [
    'Introduce yourself to us in a few questions.',
    'Along the way, you\'ll discover your defender',
    'archetype, which shapes the projects we',
    'suggest. This application will take',
    'approximately 15 minutes.',
  ];
  return (
    <>
      {lines.map((line, i) => (
        <span
          key={line}
          className="welcome-line block"
          style={{ animationDelay: `${560 + i * 70}ms` }}
        >
          {line}
        </span>
      ))}
    </>
  );
}

/** Desktop body breaks — match comps exactly. */
function DesktopBodyLines() {
  const lines = [
    'Introduce yourself to us in a few questions. Along',
    'the way, you\'ll discover your defender archetype,',
    'which shapes the projects we suggest.',
    'This application will take approximately 15',
    'minutes.',
  ];
  return (
    <>
      {lines.map((line, i) => (
        <span
          key={line}
          className="welcome-line block"
          style={{ animationDelay: `${560 + i * 70}ms` }}
        >
          {line}
        </span>
      ))}
    </>
  );
}

/** Soft line-art placeholder for page background (replace with design asset). */
function AtmospherePlaceholder({ className }: { className?: string }) {
  return (
    <div className={cn('bg-[#F8F7F2]', className)} aria-hidden>
      <svg
        viewBox="0 0 1200 800"
        preserveAspectRatio="xMidYMid slice"
        className="h-full w-full text-accent/20"
      >
        <g fill="none" stroke="currentColor" strokeWidth="1.2">
          <circle cx="160" cy="580" r="88" strokeDasharray="3 7" />
          <circle cx="160" cy="580" r="42" />
          <path d="M40 600h90l45-20 55 10 80-24" />
          <path d="M980 100l100 30-44 20-78-12z" />
          <path d="M1040 580c24-48 58-82 110-98" />
          <path d="M1125 500v100h-60l-20-44 22-30z" />
          <circle cx="1090" cy="470" r="30" strokeDasharray="2 5" />
          <path d="M220 140c90 24 150-12 220 34" strokeDasharray="4 8" />
        </g>
        <text
          x="600"
          y="780"
          textAnchor="middle"
          className="fill-fg-subtle"
          style={{ fontSize: 11, letterSpacing: '0.12em' }}
        >
        </text>
      </svg>
    </div>
  );
}

/** Hero illustration placeholder (stripes + figure) — replace with design asset. */
function WelcomeHeroPlaceholder() {
  return (
    <div
      className="relative flex h-full min-h-[200px] items-end justify-end overflow-hidden md:min-h-[300px]"
      aria-hidden
    >
      {/* Stripe block placeholder */}
      <div className="absolute inset-y-0 right-0 w-[88%] bg-[rgb(var(--toa-navy))]" />
      <div
        className="absolute inset-y-0 right-[18%] w-[42%] origin-top-right skew-x-[-18deg] bg-[#E86B3A]"
      />
      <div
        className="absolute bottom-0 right-0 top-[20%] w-[22%] origin-bottom-right skew-x-[-18deg]"
        style={{ backgroundColor: 'rgb(var(--toa-teal) / 0.85)' }}
      />

      {/* Simple figure placeholder */}
      <div className="relative z-[1] mb-4 mr-3 flex w-[70%] flex-col items-center md:mb-8 md:mr-6">
        <div className="mb-2 h-10 w-10 rounded-full bg-[#F4D0B0] ring-2 ring-fg/20" />
        <div className="h-24 w-20 rounded-t-2xl bg-surface shadow-md ring-1 ring-border" />
        <div className="mt-2 h-16 w-28 rounded-md bg-accent/15 ring-1 ring-border">
          <div className="flex gap-1.5 p-3">
            <span className="h-2 w-2 rounded-full bg-accent" />
            <span className="h-2 w-2 rounded-full bg-[#E86B3A]" />
            <span className="h-2 w-2 rounded-full bg-fg/30" />
          </div>
          <div className="mx-3 h-1.5 rounded bg-fg/10" />
          <div className="mx-3 mt-1.5 h-1.5 w-2/3 rounded bg-fg/10" />
        </div>
        <p className="mt-2 text-[9px] font-semibold uppercase tracking-widest text-topbar-fg/70">
          Illus. placeholder
        </p>
      </div>
    </div>
  );
}
