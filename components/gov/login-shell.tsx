'use client';

/* Sign-in scaffold — a stylised split layout: a DSTA brand hero panel beside a
   clean sign-in card. Deliberately NOT carrying the DSS masthead / IM8
   classification chrome — there's no sensitive data on a public sign-in page, and
   the product is already information-dense. (Those gov controls live inside the
   authenticated app, on the record pages where classified data actually appears.) */
import { type ReactNode } from 'react';
import Image from 'next/image';

export default function LoginShell({ children, tagline }: { children: ReactNode; tagline: string }) {
  return (
    <div data-zone="enterprise" data-mode="light" className="min-h-screen grid lg:grid-cols-[minmax(0,460px)_1fr]">
      {/* ── Brand hero ───────────────────────────────────────────────────── */}
      <aside
        className="relative hidden lg:flex flex-col justify-between overflow-hidden p-12 text-white"
        style={{ background: 'var(--toa-hero-gradient)' }}
      >
        {/* motif */}
        <svg aria-hidden="true" viewBox="0 0 600 800" preserveAspectRatio="xMidYMid slice"
          className="pointer-events-none absolute inset-0 h-full w-full opacity-60">
          <path d="M-60 540 Q260 360 420 -40" stroke="#fff" strokeWidth="1" opacity="0.18" fill="none" />
          <path d="M40 760 Q420 520 640 220" stroke="#fff" strokeWidth="1" opacity="0.12" fill="none" />
          <circle cx="420" cy="-40" r="4" fill="#fff" opacity="0.4" />
          <circle cx="120" cy="120" r="180" stroke="#fff" strokeWidth="1" opacity="0.08" fill="none" />
        </svg>

        <div className="relative">
          {/* Reversed (white) DSTA lockup reads directly on the dark hero. */}
          <Image src="/images/dsta-logo-white.png" alt="DSTA — Defence Science & Technology Agency"
            width={220} height={111} className="h-[3.25rem] w-auto" priority />
          <p className="mt-3 text-[12px] font-semibold uppercase tracking-widest text-white/80">Talent Outreach &amp; Acquisition</p>
        </div>

        <div className="relative max-w-sm">
          <h2 className="text-[2rem] leading-[1.15] font-black tracking-tight">{tagline}</h2>
        </div>

        <p className="relative text-[12px] text-white/75">© {new Date().getFullYear()} Government of Singapore</p>
      </aside>

      {/* ── Sign-in card ─────────────────────────────────────────────────── */}
      <main className="relative flex items-center justify-center bg-bg px-5 py-12">
        <div className="w-full max-w-[24rem]">{children}</div>
      </main>
    </div>
  );
}

/* Brand header inside the card. */
export function LoginBrand({ kicker, heading }: { kicker: string; heading: string }) {
  return (
    <div className="mb-7">
      {/* logo for mobile (hero is hidden < lg) — blue wordmark on the light card */}
      <Image src="/images/dsta-logo.svg" alt="DSTA" width={84} height={43} className="lg:hidden h-8 w-auto mb-4" priority />
      <p className="text-[12px] font-bold uppercase tracking-widest text-accent">{kicker}</p>
      <h1 className="text-headline-lg text-fg mt-1">{heading}</h1>
    </div>
  );
}

/* Official Singpass / Corppass sign-in button. Per the Singpass design guidelines
   the button uses Singpass Red (#F4333D) and the lowercase "singpass" wordmark in
   a "Log in with …" lockup; the colour/proportions must not be altered. Corppass
   (the business-entity counterpart) reuses the same Singpass-family treatment.
   (In production this would be the official Singpass button asset / NDI SDK; here
   it's a faithful, air-gapped approximation — no external assets.) */
const SINGPASS_RED = '#F4333D';
export function GovAuthButton({ wordmark, onClick, lowercase }: { wordmark: string; onClick: () => void; lowercase?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{ backgroundColor: SINGPASS_RED }}
      className="w-full flex items-center justify-center gap-1.5 rounded-lg py-3.5 text-body-md text-white shadow-sm transition-[filter] hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#F4333D]/50"
    >
      <span className="font-normal">Log in with</span>
      <span className={`font-extrabold tracking-tight ${lowercase ? 'lowercase' : ''}`}>{wordmark}</span>
    </button>
  );
}

/* Minimal legal line — kept (Terms/Privacy is standard on any sign-in); the IM8
   audit notice is intentionally not surfaced here. */
export function LoginLegal() {
  return (
    <p className="mt-6 text-[12px] text-fg-subtle leading-relaxed">
      By continuing you agree to the{' '}
      <a href="#" onClick={e => e.preventDefault()} className="text-accent hover:underline">Terms of Use</a> and{' '}
      <a href="#" onClick={e => e.preventDefault()} className="text-accent hover:underline">Privacy Statement</a>.
    </p>
  );
}
