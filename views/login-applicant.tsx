'use client';

/* Applicant sign-in — match C-end comps: Singpass + decorative email/password
   (email login is visual only). Singpass → Myinfo → welcome (apply Task 1),
   or /apply/dashboard (Task 2 interview / probing A·B). */
import { useMemo, useState, type MouseEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useRole } from '@/lib/role';
import {
  clearMyinfoPending,
  getMyinfoProfile,
  saveApplicantProfile,
  saveMyinfoPending,
} from '@/lib/myinfo';
import { signIn } from '@/lib/session';
import {
  clearUtApplicantTaskIntent,
  loadUtApplicantTaskIntent,
  loadUtCatalogPath,
} from '@/lib/ut-track';
import LoginShell, { LoginBrand, GovAuthButton } from '@/components/gov/login-shell';
import MyinfoFlow from '@/components/gov/myinfo-flow';
import OutOfScopeTooltip from '@/components/apply/out-of-scope-tooltip';
import { Input } from '@/components/ui-legacy/input';

const BODY = 'rgba(69, 85, 108, 1)';
const TITLE = 'rgba(15, 23, 43, 1)';
const CTA_BG = 'rgba(26, 101, 248, 1)';

/** Demo default identity for Singpass / Myinfo (selector removed from comps). */
const DEMO_ROLE = 'new-applicant' as const;

export default function LoginApplicant() {
  const router = useRouter();
  const { setRole } = useRole();
  const [myinfoOpen, setMyinfoOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const myinfoProfile = useMemo(() => getMyinfoProfile(DEMO_ROLE), []);

  function handleSingpassClick() {
    setMyinfoOpen(true);
  }

  function handleMyinfoContinue() {
    const profile = getMyinfoProfile(DEMO_ROLE);
    setRole(DEMO_ROLE);

    const landOnDashboard =
      loadUtCatalogPath() === 'probing' ||
      loadUtApplicantTaskIntent() === 'interview';

    /* Probing A/B, or catalog Task 2 (interview): homepage after Singpass. */
    if (landOnDashboard) {
      saveApplicantProfile({
        ...profile,
        nric: 'T0123456A',
        role: DEMO_ROLE,
        dataUseConsent: true,
        declarationConsent: true,
        createdAt: new Date().toISOString(),
      });
      clearMyinfoPending();
      clearUtApplicantTaskIntent();
      signIn('singpass', new Date().toISOString());
      router.push('/apply/dashboard');
      return;
    }

    clearUtApplicantTaskIntent();
    saveMyinfoPending({
      role: DEMO_ROLE,
      profile,
      at: new Date().toISOString(),
    });
    router.push('/apply/welcome');
  }

  function handleCreateAccount(e: MouseEvent) {
    e.preventDefault();
    router.push('/register');
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
          We&apos;ll use your Singpass to pre-fill your details — so you spend time on what
          matters, not retyping.
        </p>

        <GovAuthButton wordmark="singpass" lowercase onClick={handleSingpassClick} />

        {/* Email / password — visual only (no auth) */}
        <div className="mt-8 space-y-4">
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
              className="h-11 rounded-lg border-border bg-white"
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
              className="h-11 rounded-lg border-border bg-white"
            />
            <div className="mt-2 text-right">
              <a
                href="/forgot-password"
                className="text-[14px] font-semibold hover:underline"
                style={{ color: CTA_BG }}
              >
                Forgot password?
              </a>
            </div>
          </div>
          <OutOfScopeTooltip>
            <button
              type="button"
              className="flex h-11 w-full cursor-pointer items-center justify-center rounded-lg text-[14px] font-semibold text-white"
              style={{ background: CTA_BG }}
            >
              Login
            </button>
          </OutOfScopeTooltip>
        </div>

        <p className="mt-5 text-left text-[14px]" style={{ color: BODY }}>
          Don&apos;t have an account?{' '}
          <a
            href="#create"
            onClick={handleCreateAccount}
            className="cursor-pointer font-semibold hover:underline"
            style={{ color: CTA_BG }}
          >
            Create an account
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
