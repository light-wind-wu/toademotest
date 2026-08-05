'use client';

/* Sign-in scaffold — split layout: DSTA brand hero + sign-in card.
   Deliberately NOT carrying DSS masthead / IM8 chrome on the public sign-in page. */
import { type ReactNode } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';

export default function LoginShell({
  children,
  tagline,
  className,
}: {
  children: ReactNode;
  tagline: ReactNode;
  className?: string;
}) {
  return (
    <div
      data-zone="enterprise"
      data-mode="light"
      className={cn(
        'min-h-screen grid lg:grid-cols-[460px_1fr]',
        className,
      )}
    >
      {/* ── Brand hero ───────────────────────────────────────────────────── */}
      <aside
        className="relative hidden lg:flex flex-col justify-between overflow-hidden px-10 py-12 text-white xl:px-12"
        style={{ background: 'rgba(10, 22, 40, 1)' }}
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 600 800"
          preserveAspectRatio="xMidYMid slice"
          className="pointer-events-none absolute inset-0 h-full w-full"
        >
          <path d="M-60 540 Q260 360 420 -40" stroke="#fff" strokeWidth="1" opacity="0.18" fill="none" />
          <path d="M40 760 Q420 520 640 220" stroke="#fff" strokeWidth="1" opacity="0.12" fill="none" />
          <path d="M-20 200 Q200 80 380 -20" stroke="#fff" strokeWidth="1" opacity="0.1" fill="none" />
          <circle cx="420" cy="-40" r="4" fill="#fff" opacity="0.35" />
          <circle cx="120" cy="120" r="180" stroke="#fff" strokeWidth="1" opacity="0.08" fill="none" />
        </svg>

        <div className="relative">
          <Image
            src="/images/dsta-logo-white.png"
            alt="DSTA — Defence Science & Technology Agency"
            width={220}
            height={111}
            className="h-[3.25rem] w-auto"
            priority
          />
          <p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/85">
            Talent Outreach &amp; Acquisition
          </p>
        </div>

        <div className="relative max-w-[22rem]">
          <h2 className="text-[2rem] font-black leading-[1.15] tracking-tight text-white xl:text-[2.25rem]">
            {tagline}
          </h2>
        </div>

        <p className="relative text-[12px] text-white/75">
          © {new Date().getFullYear()} Government of Singapore
        </p>
      </aside>

      {/* ── Sign-in card ─────────────────────────────────────────────────── */}
      <main
        className="relative flex items-center justify-center px-5 py-12"
        style={{ background: 'rgba(251, 250, 246, 1)' }}
      >
        <div className="w-full max-w-[24rem]">{children}</div>
      </main>
    </div>
  );
}

export function LoginBrand({ kicker, heading }: { kicker?: string; heading: string }) {
  return (
    <div className="mb-6">
      <Image
        src="/images/dsta-logo.svg"
        alt="DSTA"
        width={84}
        height={43}
        className="mb-5 h-8 w-auto lg:hidden"
        priority
      />
      {kicker ? (
        <p className="text-[12px] font-bold uppercase tracking-widest text-accent">{kicker}</p>
      ) : null}
      <h1
        className={cn('text-[1.75rem] font-bold tracking-tight text-fg', kicker && 'mt-1')}
        style={{ color: 'rgba(15, 23, 43, 1)' }}
      >
        {heading}
      </h1>
    </div>
  );
}

const SINGPASS_RED = '#F4333D';
export function GovAuthButton({
  wordmark,
  onClick,
  lowercase,
}: {
  wordmark: string;
  onClick: () => void;
  lowercase?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{ backgroundColor: SINGPASS_RED }}
      className="flex w-full items-center justify-center gap-1.5 rounded-lg py-3.5 text-body-md text-white shadow-sm transition-[filter] hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F4333D]/50 focus-visible:ring-offset-2"
    >
      <span className="font-normal">Log in with</span>
      <span className={`font-extrabold tracking-tight ${lowercase ? 'lowercase' : ''}`}>
        {wordmark}
      </span>
    </button>
  );
}

export function LoginLegal() {
  return (
    <p className="mt-6 text-[12px] leading-relaxed text-fg-subtle">
      By continuing you agree to the{' '}
      <a href="#" onClick={(e) => e.preventDefault()} className="text-accent hover:underline">
        Terms of Use
      </a>{' '}
      and{' '}
      <a href="#" onClick={(e) => e.preventDefault()} className="text-accent hover:underline">
        Privacy Statement
      </a>
      .
    </p>
  );
}
