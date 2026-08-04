'use client';

/* Post-Myinfo welcome — PC 670×340 (illus 224×340 left) / mobile stack (illus 169×156).
   Line animations + auto-advance retained from prior welcome. */
import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { ArrowRight } from 'lucide-react';
import ApplicantChrome from '@/components/apply/applicant-chrome';
import { firstName, loadMyinfoPending } from '@/lib/myinfo';
import { cn } from '@/lib/utils';

const AUTO_MS = 10000; // temporary — revert to 3000 when reviewing done

const TITLE = 'rgba(10, 22, 40, 1)';
const SUBTITLE = 'rgba(69, 85, 108, 1)';
const CTA_BG = 'rgba(26, 101, 248, 1)';
const CARD_BORDER = 'rgba(231, 228, 221, 1)';
const PAGE_BG = 'rgba(251, 250, 246, 1)';

const BODY =
  "You're about to begin your application journey. First, complete your account setup and check that your details are correct.";

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
      <div
        className="flex min-h-screen items-center justify-center text-body-sm text-fg-muted"
        style={{ background: PAGE_BG }}
      >
        Loading…
      </div>
    );
  }

  return (
    <ApplicantChrome className="!bg-[rgba(251,250,246,1)]">
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

      <main className="relative flex min-h-[calc(100vh-3.5rem)] items-center justify-center overflow-hidden px-4 py-6 md:px-8 md:py-12">
        <div
          className={cn(
            'welcome-card-anim relative z-[1] overflow-hidden rounded-xl bg-white',
            leaving && 'pointer-events-none',
            // Mobile: fluid card; PC: fixed 670×340
            'w-full max-w-[400px] md:h-[340px] md:w-[670px] md:max-w-none',
          )}
          style={{
            border: `1px solid ${CARD_BORDER}`,
            animation: leaving
              ? 'welcomeCardExit 280ms ease forwards'
              : 'welcomeCardEnter 680ms cubic-bezier(0.16, 1, 0.3, 1) 80ms both',
          }}
        >
          {/* ── PC: image left 224×340 + copy right ───────────────── */}
          <div className="hidden h-full md:flex">
            <div className="relative h-[340px] w-[224px] shrink-0">
              <Image
                src="/images/welcome-pc.png"
                alt=""
                fill
                priority
                className="object-cover object-center"
                sizes="224px"
              />
            </div>
            <div className="flex min-w-0 flex-1 flex-col justify-center px-8 py-8">
              <WelcomeTitle name={name} variant="pc" />
              <p
                className="welcome-line mt-4 text-[16px] font-normal leading-6"
                style={{ color: SUBTITLE, animationDelay: '560ms' }}
              >
                {BODY}
              </p>
              <div className="welcome-line mt-6" style={{ animationDelay: '720ms' }}>
                <SetupButton onClick={goNext} />
              </div>
            </div>
          </div>

          {/* ── Mobile: illus top-left (lower z), copy below ──────── */}
          <div className="relative md:hidden">
            <div className="relative z-0 h-[156px] w-[169px]">
              <Image
                src="/images/welcome-m.png"
                alt=""
                width={169}
                height={156}
                priority
                className="h-[156px] w-[169px] object-cover object-left-top"
              />
            </div>
            <div className="relative z-10 px-5 pb-6 pt-1">
              <WelcomeTitle name={name} variant="mobile" />
              <p
                className="welcome-line mt-3 text-[16px] font-normal leading-6"
                style={{ color: SUBTITLE, animationDelay: '560ms' }}
              >
                {BODY}
              </p>
              <div className="welcome-line mt-5" style={{ animationDelay: '720ms' }}>
                <SetupButton onClick={goNext} />
              </div>
            </div>
          </div>
        </div>
      </main>
    </ApplicantChrome>
  );
}

function WelcomeTitle({ name, variant }: { name: string; variant: 'pc' | 'mobile' }) {
  const isPc = variant === 'pc';
  return (
    <h1
      className={cn(
        'font-semibold tracking-[-0.48px]',
        isPc ? 'text-[32px] leading-[44px]' : 'text-[24px] leading-8',
      )}
      style={{ color: TITLE }}
    >
      <span className="welcome-line block" style={{ animationDelay: '300ms' }}>
        Hi {name},
      </span>
      {isPc ? (
        <>
          <span className="welcome-line block" style={{ animationDelay: '420ms' }}>
            let&apos;s get your application
          </span>
          <span className="welcome-line block" style={{ animationDelay: '500ms' }}>
            started.
          </span>
        </>
      ) : (
        <span className="welcome-line block" style={{ animationDelay: '420ms' }}>
          let&apos;s get your application started.
        </span>
      )}
    </h1>
  );
}

function SetupButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-8 w-[124px] cursor-pointer items-center justify-center gap-1 rounded-md text-[12px] font-medium leading-4 text-white transition-opacity hover:opacity-90"
      style={{ background: CTA_BG }}
    >
      Account setup
      <ArrowRight className="size-3.5 shrink-0" strokeWidth={1.5} />
    </button>
  );
}
