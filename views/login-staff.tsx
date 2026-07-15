'use client';

/* Internal staff sign-in (separate console touchpoint). DSS chrome + Corppass /
   Staff SSO. No real auth: in the demo, a role selector stands in for the
   identity Corppass would resolve, then drops the user into that role's console. */
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useRole, ROLE_PROFILES } from '@/lib/role';
import { signIn, roleHome, type SignInMethod } from '@/lib/session';
import LoginShell, { LoginBrand, LoginLegal, GovAuthButton } from '@/components/gov/login-shell';
import { KeyRound, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { UserRole } from '@/lib/types';

const STAFF_ROLES: UserRole[] = ['io-admin', 'io', 'mentor', 'ad-pnc', 'director'];

export default function LoginStaff() {
  const router = useRouter();
  const { setRole } = useRole();
  const [identity, setIdentity] = useState<UserRole>('io-admin');

  function handleSignIn(method: SignInMethod) {
    setRole(identity);
    signIn(method, new Date().toISOString());
    router.push(roleHome(identity));
  }

  return (
    <LoginShell tagline="Run talent outreach, selection and internships — in one console.">
      <LoginBrand kicker="Internal Console" heading="Staff sign-in" />
      <p className="text-body-sm text-fg-muted -mt-4 mb-6">
        Sign in with your government credentials to pick up where you left off.
      </p>

      {/* Demo: which Corppass / SSO identity is returned */}
      <p className="text-[11px] font-bold uppercase tracking-widest text-fg-subtle mb-2">Demo identity</p>
      <div className="grid grid-cols-1 gap-2 mb-5">
        {STAFF_ROLES.map(r => {
          const p = ROLE_PROFILES[r];
          return (
            <button key={r} onClick={() => setIdentity(r)}
              className={cn('flex items-center justify-between rounded-xl border px-3.5 py-2.5 text-left transition-all',
                identity === r ? 'border-accent bg-accent/[0.06] ring-1 ring-accent/30' : 'border-border bg-surface hover:border-accent/40')}>
              <span>
                <span className="block text-body-sm font-semibold text-fg">{p.name}</span>
                <span className="block text-[12px] text-fg-muted">{p.title}</span>
              </span>
              {identity === r && <ChevronRight size={14} className="text-accent shrink-0" />}
            </button>
          );
        })}
      </div>

      <GovAuthButton wordmark="Corppass" onClick={() => handleSignIn('corppass')} />
      <button
        onClick={() => handleSignIn('sso')}
        className="mt-2 w-full flex items-center justify-center gap-2 rounded-lg border border-border bg-surface text-fg py-3 text-body-md font-semibold hover:border-accent/50 transition-colors"
      >
        <KeyRound size={16} /> Staff SSO (WOG AD)
      </button>

      <LoginLegal />

      <p className="mt-6 pt-5 border-t border-border text-[13px] text-fg-muted">
        Applying for an internship? <a href="/login" className="text-accent hover:underline font-semibold">Candidate sign-in</a>
      </p>
    </LoginShell>
  );
}
