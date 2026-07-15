'use client';

/* Applicant sign-in (public candidate touchpoint). Candidates click through from
   DSTA's website and land here — DSS chrome + Singpass sign-in. No real auth:
   "Log in with Singpass" records a session and drops them into the apply flow.
   A small demo selector picks which Singpass identity is returned. */
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useRole } from '@/lib/role';
import { signIn, roleHome } from '@/lib/session';
import LoginShell, { LoginBrand, LoginLegal, GovAuthButton } from '@/components/gov/login-shell';
import { ChevronRight, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { UserRole } from '@/lib/types';

const APPLICANTS: { role: UserRole; name: string; label: string }[] = [
  { role: 'new-applicant',              name: 'Jenny Aw',   label: 'Internship Applicant' },
  { role: 'existing-scholar-applicant', name: 'Marcus Tan', label: 'Scholarship Applicant' },
];

export default function LoginApplicant() {
  const router = useRouter();
  const { setRole } = useRole();
  const [identity, setIdentity] = useState<UserRole>('new-applicant');
  const [guardianOpen, setGuardianOpen] = useState(false);

  function handleSignIn() {
    setRole(identity);
    signIn('singpass', new Date().toISOString());
    router.push(roleHome(identity));
  }

  // Under-16 applicants have no Singpass — a parent/guardian signs in with their
  // own Singpass to set up the application on the applicant's behalf.
  function handleGuardianSignIn() {
    setRole('new-applicant');
    signIn('singpass', new Date().toISOString(), { guardian: true });
    router.push(roleHome('new-applicant'));
  }

  return (
    <LoginShell tagline="Find your place in Singapore's defence technology community.">
      <LoginBrand kicker="Internship Track" heading="Sign in to apply" />
      <p className="text-body-sm text-fg-muted -mt-4 mb-6">
        Apply, track where you are, and manage your internship — all in one place.
      </p>

      <GovAuthButton wordmark="singpass" lowercase onClick={handleSignIn} />

      {/* Demo: which Singpass identity is returned */}
      <div className="mt-5">
        <p className="text-[11px] font-bold uppercase tracking-widest text-fg-subtle mb-2">Demo identity</p>
        <div className="grid grid-cols-1 gap-2">
          {APPLICANTS.map(a => (
            <button key={a.role} onClick={() => setIdentity(a.role)}
              className={cn('flex items-center justify-between rounded-xl border px-3.5 py-2.5 text-left transition-all',
                identity === a.role ? 'border-accent bg-accent/[0.06] ring-1 ring-accent/30' : 'border-border bg-surface hover:border-accent/40')}>
              <span>
                <span className="block text-body-sm font-semibold text-fg">{a.name}</span>
                <span className="block text-[12px] text-fg-muted">{a.label}</span>
              </span>
              {identity === a.role && <ChevronRight size={14} className="text-accent shrink-0" />}
            </button>
          ))}
        </div>
      </div>

      {/* Under-16 / no Singpass — a small minority, kept deliberately low-emphasis
          (collapsed by default so it never competes with the primary CTA). */}
      <div className="mt-4">
        <button type="button" onClick={() => setGuardianOpen(v => !v)}
          aria-expanded={guardianOpen}
          className="inline-flex items-center gap-1 text-[13px] text-fg-muted hover:text-accent transition-colors">
          Under 16 and don&apos;t have Singpass?
          <ChevronDown size={14} className={cn('shrink-0 transition-transform', guardianOpen && 'rotate-180')} />
        </button>
        {guardianOpen && (
          <div className="mt-3 rounded-xl border border-border bg-bg-subtle p-4">
            <p className="text-[12px] leading-relaxed text-fg-muted">
              Applicants under 16 don&apos;t have a Singpass account yet. A parent or guardian
              can sign in with their <span className="font-semibold text-fg">own Singpass</span> to
              set up and submit the application on the applicant&apos;s behalf.
            </p>
            <p className="mt-3 text-[12px] font-semibold text-fg">
              Log in with your parent or guardian&apos;s Singpass
            </p>
            <div className="mt-2">
              <GovAuthButton wordmark="singpass" lowercase onClick={handleGuardianSignIn} />
            </div>
            <p className="mt-2 text-[11px] text-fg-subtle">
              You&apos;ll be signing in as the parent or guardian — not the applicant.
            </p>
          </div>
        )}
      </div>

      <LoginLegal />

      <p className="mt-6 pt-5 border-t border-border text-[13px] text-fg-muted">
        DSTA staff? <a href="/login/staff" className="text-accent hover:underline font-semibold">Sign in to the internal console</a>
      </p>
    </LoginShell>
  );
}
