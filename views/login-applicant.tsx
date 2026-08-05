'use client';

/* Applicant sign-in — Singpass primary + email/password mock for returning users. */
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useRole } from '@/lib/role';
import { signIn, roleHome } from '@/lib/session';
import { getMyinfoProfile, saveMyinfoPending } from '@/lib/myinfo';
import LoginShell, { LoginBrand, GovAuthButton } from '@/components/gov/login-shell';
import MyinfoFlow from '@/components/gov/myinfo-flow';
import { Input } from '@/components/ui-legacy/input';
import { ChevronRight, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

const APPLICANTS: {
  role: 'new-applicant' | 'existing-scholar-applicant';
  name: string;
  label: string;
  email: string;
}[] = [
  {
    role: 'new-applicant',
    name: 'Jenny Aw',
    label: 'Internship Applicant',
    email: 'jenny.aw@example.com',
  },
  {
    role: 'existing-scholar-applicant',
    name: 'Marcus Tan',
    label: 'Scholarship Applicant',
    email: 'marcus.tan@example.com',
  },
];

const BODY = 'rgba(69, 85, 108, 1)';
const TITLE = 'rgba(15, 23, 43, 1)';
const CTA_BG = 'rgba(26, 101, 248, 1)';

export default function LoginApplicant() {
  const router = useRouter();
  const { setRole } = useRole();
  const [identity, setIdentity] = useState<'new-applicant' | 'existing-scholar-applicant'>(
    'new-applicant',
  );
  const [guardianOpen, setGuardianOpen] = useState(false);
  const [myinfoOpen, setMyinfoOpen] = useState(false);
  const [email, setEmail] = useState(APPLICANTS[0].email);
  const [password, setPassword] = useState('');

  const myinfoProfile = useMemo(() => getMyinfoProfile(identity), [identity]);

  function selectIdentity(role: (typeof APPLICANTS)[number]['role']) {
    setIdentity(role);
    const match = APPLICANTS.find((a) => a.role === role);
    if (match) setEmail(match.email);
  }

  function handleSingpassClick() {
    setMyinfoOpen(true);
  }

  function handleMyinfoContinue() {
    saveMyinfoPending({
      role: identity,
      profile: getMyinfoProfile(identity),
      at: new Date().toISOString(),
    });
    setRole(identity);
    router.push('/apply/welcome');
  }

  function handleEmailLogin(e: React.FormEvent) {
    e.preventDefault();
    setRole(identity);
    signIn('email', new Date().toISOString());
    router.push(roleHome(identity));
  }

  function handleGuardianSignIn() {
    setRole('new-applicant');
    signIn('singpass', new Date().toISOString(), { guardian: true });
    router.push(roleHome('new-applicant'));
  }

  function handleCreateAccount(e: React.MouseEvent) {
    e.preventDefault();
    setMyinfoOpen(true);
  }

  return (
    <>
      <LoginShell
        tagline={
          <>
            Run talent outreach,
            <br />
            selection and
            <br />
            internships — in one
            <br />
            console.
          </>
        }
      >
        <LoginBrand heading="Sign in to get started" />

        <p
          className="-mt-2 mb-6 text-[14px] font-normal leading-5"
          style={{ color: BODY }}
        >
          We&apos;ll use your Singpass to pre-fill your details — so you
          <br className="hidden sm:block" />
          {' '}spend time on what matters, not retyping.
        </p>

        <GovAuthButton wordmark="singpass" lowercase onClick={handleSingpassClick} />

        {/* Demo identity — mock only */}
        <div className="mt-5">
          <p className="mb-2 text-[11px] font-bold uppercase tracking-widest text-fg-subtle">
            Demo identity
          </p>
          <div className="grid grid-cols-1 gap-2">
            {APPLICANTS.map((a) => (
              <button
                key={a.role}
                type="button"
                onClick={() => selectIdentity(a.role)}
                className={cn(
                  'flex items-center justify-between rounded-xl border px-3.5 py-2.5 text-left transition-all',
                  identity === a.role
                    ? 'border-accent bg-accent/[0.06] ring-1 ring-accent/30'
                    : 'border-border bg-surface hover:border-accent/40',
                )}
              >
                <span>
                  <span className="block text-body-sm font-semibold text-fg">{a.name}</span>
                  <span className="block text-[12px] text-fg-muted">{a.label}</span>
                </span>
                {identity === a.role && (
                  <ChevronRight size={14} className="shrink-0 text-accent" />
                )}
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={handleEmailLogin} className="mt-6 space-y-4">
          <div>
            <label
              htmlFor="login-email"
              className="mb-1.5 block text-[14px] font-medium leading-5"
              style={{ color: TITLE }}
            >
              Email
            </label>
            <Input
              id="login-email"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email@example.com"
              className="h-11 rounded-lg bg-white"
            />
          </div>
          <div>
            <label
              htmlFor="login-password"
              className="mb-1.5 block text-[14px] font-medium leading-5"
              style={{ color: TITLE }}
            >
              Password
            </label>
            <Input
              id="login-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className="h-11 rounded-lg bg-white"
            />
          </div>
          <button
            type="submit"
            className="flex h-11 w-full cursor-pointer items-center justify-center rounded-lg text-[14px] font-semibold text-white transition-opacity hover:opacity-90"
            style={{ background: CTA_BG }}
          >
            Login
          </button>
        </form>

        <p className="mt-5 text-center text-[14px]" style={{ color: BODY }}>
          Don&apos;t have an account?{' '}
          <a
            href="#create"
            onClick={handleCreateAccount}
            className="font-semibold hover:underline"
            style={{ color: CTA_BG }}
          >
            Create an account
          </a>
        </p>

        <div className="mt-4">
          <button
            type="button"
            onClick={() => setGuardianOpen((v) => !v)}
            aria-expanded={guardianOpen}
            className="inline-flex items-center gap-1 text-[13px] text-fg-muted transition-colors hover:text-accent"
          >
            Under 16 and don&apos;t have Singpass?
            <ChevronDown
              size={14}
              className={cn('shrink-0 transition-transform', guardianOpen && 'rotate-180')}
            />
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
            </div>
          )}
        </div>

        <p className="mt-6 border-t border-border pt-5 text-[13px] text-fg-muted">
          DSTA staff?{' '}
          <a href="/login/staff" className="font-semibold text-accent hover:underline">
            Sign in to the internal console
          </a>
        </p>
      </LoginShell>

      <MyinfoFlow
        open={myinfoOpen}
        profile={myinfoProfile}
        onCancel={() => setMyinfoOpen(false)}
        onContinue={handleMyinfoContinue}
      />
    </>
  );
}
