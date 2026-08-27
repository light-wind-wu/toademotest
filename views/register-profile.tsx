'use client';

/* Email registration step 4 — collect profile details + consent.
   Uses AuthShell with hero banner; matches prototype layout. */
import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import AuthShell from '@/components/auth/auth-shell';
import { Input } from '@/components/ui-legacy/input';
import { Checkbox } from '@/components/ui/checkbox';
import { useRole } from '@/lib/role';
import { signIn } from '@/lib/session';
import {
  isValidNric,
  saveApplicantProfile,
  type ApplicantProfile,
  type MyinfoProfile,
} from '@/lib/myinfo';
import { clearRegisterState, loadRegisterState } from '@/lib/register-store';
import { saveApplyDashboardVersion } from '@/lib/apply-dashboard-version';
import { cn } from '@/lib/utils';

const CARD_BOX_CLASS =
  'rounded-lg border border-[rgba(231,228,221,1)] bg-white p-[22px_16px] lg:p-[26px_24px]';
const CARD_TITLE_CLASS =
  'font-semibold text-[16px] leading-[18px] text-[rgba(15,23,43,1)] lg:text-[18px]';
const BODY_STYLE = {
  fontWeight: 400,
  fontSize: 14,
  lineHeight: '20px',
  color: 'rgba(69, 85, 108, 1)',
} as const;

const CONSENT_DATA_USE =
  'By submitting the application required, the candidate understands, agrees and consents to DSTA using such personal data or otherwise disclosing such data to other third-party organisations for the purposes of enabling the candidate to be considered and/or contacted for other available opportunities, including but not limited to employment, internships, scholarships and outreach programmes.';

const CONSENT_DECLARE =
  'I hereby certify that I have read and understood all of the clauses above and that I agree to all of them.';

const DEFAULT_PROFILE: MyinfoProfile = {
  name: '',
  sex: '',
  dateOfBirth: '',
  race: '',
  nationality: '',
  residentialStatus: '',
  registeredAddress: '',
  mobile: '',
  email: '',
};

export default function RegisterProfile() {
  const router = useRouter();
  const { setRole } = useRole();
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [attempted, setAttempted] = useState(false);

  const [personal, setPersonal] = useState<MyinfoProfile>(DEFAULT_PROFILE);
  const [nric, setNric] = useState('');
  const [dataUseConsent, setDataUseConsent] = useState(false);
  const [declarationConsent, setDeclarationConsent] = useState(false);

  useEffect(() => {
    const state = loadRegisterState();
    if (!state.email || !state.password) {
      router.replace('/register');
      return;
    }
    setPersonal((p) => ({ ...p, email: state.email }));

    let cancelled = false;
    const started = Date.now();
    const minMs = 480;

    function preload(src: string) {
      return new Promise<void>((resolve) => {
        const img = new window.Image();
        img.onload = () => resolve();
        img.onerror = () => resolve();
        img.src = src;
      });
    }

    void Promise.all([
      preload('/images/account-setup-hero.png'),
      preload('/images/setup-banner-m.png'),
    ]).then(() => {
      if (cancelled) return;
      const wait = Math.max(0, minMs - (Date.now() - started));
      window.setTimeout(() => {
        if (!cancelled) setReady(true);
      }, wait);
    });

    return () => {
      cancelled = true;
    };
  }, [router]);

  function validate(): string {
    if (!personal.name.trim()) return 'Enter your name.';
    if (!personal.dateOfBirth.trim()) return 'Enter your date of birth.';
    if (!personal.nationality.trim()) return 'Enter your nationality.';
    if (!personal.residentialStatus.trim()) return 'Enter your residential status.';
    if (!personal.registeredAddress.trim()) return 'Enter your requested address.';
    if (!nric.trim() || !isValidNric(nric)) return 'Enter a valid NRIC / FIN, for example S1234567A.';
    if (!personal.mobile.trim()) return 'Enter your mobile number.';
    if (!dataUseConsent || !declarationConsent) return 'Confirm both consent and declaration clauses to continue.';
    return '';
  }

  function handleNext() {
    setAttempted(true);
    const msg = validate();
    setPrompt(msg);
    if (msg) return;

    setLoading(true);
    const profile: ApplicantProfile = {
      ...personal,
      mobile: personal.mobile.trim(),
      email: personal.email.trim(),
      nric: nric.replace(/\s/g, '').toUpperCase(),
      role: 'new-applicant',
      dataUseConsent,
      declarationConsent,
      createdAt: new Date().toISOString(),
    };

    saveApplicantProfile(profile);
    setRole('new-applicant');
    signIn('email', new Date().toISOString());
    saveApplyDashboardVersion('v5');
    clearRegisterState();
    router.push('/register/success');
  }

  if (!ready) {
    return (
      <div
        className="flex min-h-screen flex-col"
        style={{ background: 'rgba(251, 250, 246, 1)' }}
      >
        <header className="h-16 w-full" style={{ background: 'rgba(10, 22, 40, 1)' }} />
        <div className="flex flex-1 flex-col items-center justify-center gap-3 px-4 py-16">
          <Loader2 className="size-8 animate-spin text-accent" strokeWidth={1.5} aria-hidden />
          <p className="text-body-sm text-fg-muted">Loading…</p>
        </div>
      </div>
    );
  }

  const hero = (
    <>
      <div className="relative hidden w-full lg:block">
        <HeroBanner variant="pc" />
      </div>
      <div className="relative w-full px-4 pt-4 lg:hidden">
        <HeroBanner variant="mobile" className="rounded-lg" />
      </div>
    </>
  );

  const fieldClass =
    'mt-1.5 h-10 w-full rounded-md border border-border bg-surface px-3 text-[14px] text-[rgba(15,23,42,1)] placeholder:text-fg-subtle focus-visible:outline-1 focus-visible:outline-offset-0 focus-visible:outline-accent';

  const footer = (
    <>
      <button
        type="button"
        className="cursor-pointer bg-transparent p-0 text-[14px] font-medium leading-5"
        style={{ color: 'rgba(15, 23, 42, 1)' }}
        onClick={() => router.push('/register/password')}
      >
        Back
      </button>
      <button
        type="button"
        disabled={loading}
        className="h-9 cursor-pointer rounded-md px-5 text-[14px] text-white disabled:opacity-60 lg:h-10"
        style={{ background: 'rgba(37, 99, 235, 1)' }}
        onClick={handleNext}
      >
        Next
      </button>
    </>
  );

  return (
    <AuthShell layout="stack" showBackLink={false} hero={hero} footer={footer}>
      <div className="flex flex-1 flex-col">
        <section className={cn(CARD_BOX_CLASS, '-mt-6')}>
          <h3 className={CARD_TITLE_CLASS}>Basic Information</h3>

        <div className="mt-6 grid grid-cols-1 gap-x-6 gap-y-5 lg:grid-cols-3">
          <div>
            <label style={BODY_STYLE}>Name</label>
            <Input
              value={personal.name}
              onChange={(e) => setPersonal({ ...personal, name: e.target.value })}
              placeholder="e.g. Chen Jia Wei"
              className={fieldClass}
            />
          </div>
          <div>
            <label style={BODY_STYLE}>Date of birth</label>
            <Input
              value={personal.dateOfBirth}
              onChange={(e) => setPersonal({ ...personal, dateOfBirth: e.target.value })}
              placeholder="e.g. 15 Mar 2002"
              className={fieldClass}
            />
          </div>
          <div>
            <label style={BODY_STYLE}>Nationality</label>
            <Input
              value={personal.nationality}
              onChange={(e) => setPersonal({ ...personal, nationality: e.target.value })}
              placeholder="e.g. Singaporean"
              className={fieldClass}
            />
          </div>
          <div>
            <label style={BODY_STYLE}>Residential status</label>
            <Input
              value={personal.residentialStatus}
              onChange={(e) => setPersonal({ ...personal, residentialStatus: e.target.value })}
              placeholder="e.g. Citizen"
              className={fieldClass}
            />
          </div>
          <div>
            <label style={BODY_STYLE}>Requested address</label>
            <Input
              value={personal.registeredAddress}
              onChange={(e) => setPersonal({ ...personal, registeredAddress: e.target.value })}
              placeholder="e.g. 123 Clementi Ave 3, #12-34, S120123"
              className={fieldClass}
            />
          </div>
          <div>
            <label style={BODY_STYLE}>NRIC / FIN</label>
            <Input
              value={nric}
              onChange={(e) => setNric(e.target.value.toUpperCase())}
              placeholder="e.g. S1234567A"
              maxLength={9}
              className={fieldClass}
            />
          </div>
          <div>
            <label style={BODY_STYLE}>Mobile Number</label>
            <Input
              value={personal.mobile}
              onChange={(e) => setPersonal({ ...personal, mobile: e.target.value })}
              placeholder="e.g. +65 9123 4567"
              className={fieldClass}
            />
          </div>
          <div>
            <label style={BODY_STYLE}>Email</label>
            <Input
              value={personal.email}
              onChange={(e) => setPersonal({ ...personal, email: e.target.value })}
              placeholder="e.g. jiaw.chen@u.nus.edu"
              className={fieldClass}
            />
          </div>
        </div>
      </section>

      <section className={cn(CARD_BOX_CLASS, 'mt-4')}>
        <h3 className={CARD_TITLE_CLASS}>Consent and declaration</h3>
        <div className="mt-3 space-y-4">
          <label className="flex cursor-pointer items-start gap-3">
            <Checkbox
              checked={dataUseConsent}
              onCheckedChange={(v) => setDataUseConsent(v === true)}
              className="mt-0.5 size-4 shrink-0 cursor-pointer rounded-[4px]"
            />
            <span className="font-normal text-[12px] leading-[18px] text-[rgba(22,33,51,1)] lg:text-[14px] lg:leading-[20.3px]">
              {CONSENT_DATA_USE} <span className="text-danger">*</span>
            </span>
          </label>
          <label className="flex cursor-pointer items-start gap-3">
            <Checkbox
              checked={declarationConsent}
              onCheckedChange={(v) => setDeclarationConsent(v === true)}
              className="mt-0.5 size-4 shrink-0 cursor-pointer rounded-[4px]"
            />
            <span className="font-normal text-[12px] leading-[18px] text-[rgba(22,33,51,1)] lg:text-[14px] lg:leading-[20.3px]">
              {CONSENT_DECLARE} <span className="text-danger">*</span>
            </span>
          </label>
        </div>
      </section>

      {prompt && attempted ? (
        <p className="text-[14px] font-semibold text-warning">{prompt}</p>
      ) : null}
      </div>
    </AuthShell>
  );
}

function HeroBanner({
  className,
  variant,
}: {
  className?: string;
  variant: 'mobile' | 'pc';
}) {
  const isMobile = variant === 'mobile';
  const copy = (
    <div className={cn('z-[1] flex flex-col', isMobile ? 'p-5' : 'absolute left-6 top-12 max-w-lg')}>
      <h1
        className="text-[28px] font-semibold leading-8 tracking-[-0.48px] lg:text-[40px] lg:leading-[44px]"
        style={{ color: 'rgba(15, 23, 43, 1)' }}
      >
        Almost there
        <br />
        just a few more details
      </h1>
      <p
        className="mt-3 text-[14px] font-normal leading-[20px] lg:mt-4 lg:text-[16px]"
        style={{ color: 'rgba(69, 85, 108, 1)' }}
      >
        Fill in a few quick details to complete your registration.
      </p>
    </div>
  );

  return (
    <div
      className={cn(
        'relative z-0 w-full overflow-hidden',
        isMobile ? 'h-[200px]' : 'h-[280px]',
        className,
      )}
    >
      <Image
        src={isMobile ? '/images/setup-banner-m.png' : '/images/setup-banner-pc.png'}
        alt=""
        fill
        className="object-cover object-right"
        sizes="100vw"
        priority
      />
      {copy}
    </div>
  );
}
