'use client';

/* Email registration step 4 — collect profile details + consent.
   Layout mirrors apply-account-setup (hero banner + white cards + fixed footer). */
import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import ApplicantChrome from '@/components/apply/applicant-chrome';
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
  'rounded-lg p-[22px_16px] lg:p-[26px_24px]';
const CARD_TITLE_CLASS =
  'font-semibold text-[16px] leading-[18px] text-[rgba(15,23,43,1)] lg:text-[18px]';
const BODY_STYLE = { fontWeight: 400, fontSize: 14, lineHeight: '20px', color: 'rgba(69, 85, 108, 1)' } as const;

const CONSENT_DATA_USE =
  'By submitting the application required, the candidate understands, agrees and consents to DSTA collecting and using the personal data provided above and/or disclosing such data to other third-party organisations for the purposes of enabling the candidate to be considered and/or contacted for other available opportunities, including but not limited to employment, internships, scholarships and outreach programmes.';

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

    void Promise.all([preload('/images/account-setup-hero.png'), preload('/images/setup-banner-m.png')]).then(
      () => {
        if (cancelled) return;
        const wait = Math.max(0, minMs - (Date.now() - started));
        window.setTimeout(() => {
          if (!cancelled) setReady(true);
        }, wait);
      },
    );

    return () => {
      cancelled = true;
    };
  }, [router]);

  function validate(): string {
    if (!personal.name.trim()) return 'Enter your full name.';
    if (!nric.trim() || !isValidNric(nric)) return 'Enter a valid NRIC / FIN, for example S1234567A.';
    if (!personal.dateOfBirth.trim()) return 'Enter your date of birth.';
    if (!personal.nationality.trim()) return 'Enter your nationality.';
    if (!personal.residentialStatus.trim()) return 'Enter your residential status.';
    if (!personal.registeredAddress.trim()) return 'Enter your registered address.';
    if (!personal.mobile.trim()) return 'Enter your mobile number.';
    if (!dataUseConsent || !declarationConsent) return 'Confirm both consent and declaration clauses to continue.';
    return '';
  }

  function handleCreateAccount() {
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
      <ApplicantChrome hideProfile className="max-lg:bg-[rgba(251,251,253,1)] lg:bg-bg">
        <div className="flex flex-1 flex-col items-center justify-center gap-3 px-4 py-16">
          <Loader2 className="size-8 animate-spin text-accent" strokeWidth={1.5} aria-hidden />
          <p className="text-body-sm text-fg-muted">Loading…</p>
        </div>
      </ApplicantChrome>
    );
  }

  const mobileCopy = (
    <>
      <p style={{ ...BODY_STYLE, lineHeight: '100%', color: 'rgba(74, 85, 104, 1)' }}>
        Account setup · Your details
      </p>
      <h1
        style={{
          marginTop: 8,
          fontWeight: 600,
          fontSize: 28,
          lineHeight: '32px',
          color: 'rgba(15, 23, 43, 1)',
        }}
      >
        Create your account
        <br />
        with your details.
      </h1>
      <p
        style={{
          marginTop: 16,
          fontWeight: 400,
          fontSize: 14,
          lineHeight: '120%',
          color: 'rgba(74, 85, 104, 1)',
        }}
      >
        Welcome. Fill in your particulars so we can set up your applicant profile.
      </p>
    </>
  );

  const pcCopy = (
    <div
      className="absolute z-[1] flex flex-col"
      style={{ top: 40, left: 50, width: 760, height: 163 }}
    >
      <p style={{ ...BODY_STYLE, fontSize: 16, lineHeight: '24px' }}>Account setup · Your details</p>
      <h1
        style={{
          marginTop: 4,
          fontWeight: 600,
          fontSize: 36,
          lineHeight: '40px',
          letterSpacing: -0.9,
          color: 'rgba(15, 23, 43, 1)',
        }}
      >
        Create your account
        <br />
        with your details.
      </h1>
      <p style={{ ...BODY_STYLE, marginTop: 8 }}>
        Welcome. Fill in your particulars so we can set up your applicant profile.
      </p>
    </div>
  );

  const fieldClass =
    'mt-1 h-10 w-full rounded-md border border-border bg-surface px-3 text-[14px] text-[rgba(15,23,42,1)] placeholder:text-fg-subtle focus-visible:outline-1 focus-visible:outline-offset-0 focus-visible:outline-accent';

  return (
    <ApplicantChrome hideProfile className="max-lg:bg-[rgba(251,251,253,1)] lg:bg-bg">
      <div className="w-full max-lg:bg-[rgba(251,251,253,1)] max-lg:px-4 max-lg:pb-[68px] max-lg:pt-0">
        <div className="grid items-stretch lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-0">
          {/* PC sidebar */}
          <aside
            className="hidden flex-col border-r border-border bg-bg lg:flex"
            style={{ width: 220, padding: '45px 24px' }}
          >
            <h2
              style={{
                fontWeight: 500,
                fontSize: 16,
                lineHeight: '24px',
                color: 'rgba(15, 23, 43, 1)',
              }}
            >
              Your application
            </h2>
            <p style={{ ...BODY_STYLE, marginTop: 4 }}>Complete each step.</p>
            <ol className="mt-6 flex flex-col gap-6">
              <SidebarStep done title="Email" detail="Verify your email" showLine />
              <SidebarStep done title="Password" detail="Secure your account" showLine />
              <SidebarStep active number={3} title="Your details" detail="Set up your profile" />
            </ol>
          </aside>

          {/* Right column */}
          <div className="flex min-w-0 flex-col max-lg:bg-[rgba(251,251,253,1)] lg:[background:linear-gradient(0deg,#F3EFE5,#F3EFE5),linear-gradient(0deg,#F9F8F4,#F9F8F4)]">
            {/* Mobile title + banner */}
            <div className="lg:hidden">
              <div style={{ paddingTop: 32 }}>
                <MobileStepper />
                <h2
                  style={{
                    marginTop: 12,
                    fontWeight: 500,
                    fontSize: 18,
                    lineHeight: '28.8px',
                    color: 'rgba(10, 22, 40, 1)',
                  }}
                >
                  Your details
                </h2>
                <p style={{ ...BODY_STYLE, color: 'rgba(74, 85, 104, 1)' }}>Set up your profile</p>
              </div>
              <div style={{ marginTop: 24 }}>
                <HeroBanner variant="mobile" className="rounded-lg" />
              </div>
              <div style={{ marginTop: 24, marginBottom: 24 }}>{mobileCopy}</div>
            </div>

            {/* PC banner */}
            <div className="relative hidden w-full lg:block">
              <HeroBanner variant="pc" className="rounded-none">
                {pcCopy}
              </HeroBanner>
            </div>

            {/* Cards */}
            <div className="relative z-[2] space-y-3 lg:-mt-[37px] lg:px-6">
              <section className={CARD_BOX_CLASS}>
                <h3 className={CARD_TITLE_CLASS}>Your details</h3>
                <p style={{ ...BODY_STYLE, marginTop: 4 }}>
                  These details will be used for your application.
                </p>

                <div className="mt-6 grid gap-6 lg:grid-cols-2">
                  <div>
                    <label style={BODY_STYLE}>Full name</label>
                    <Input
                      value={personal.name}
                      onChange={(e) => setPersonal({ ...personal, name: e.target.value })}
                      placeholder="As in NRIC"
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
                    <label style={BODY_STYLE}>Date of birth</label>
                    <Input
                      value={personal.dateOfBirth}
                      onChange={(e) => setPersonal({ ...personal, dateOfBirth: e.target.value })}
                      placeholder="DD MMM YYYY"
                      className={fieldClass}
                    />
                  </div>
                  <div>
                    <label style={BODY_STYLE}>Nationality</label>
                    <Input
                      value={personal.nationality}
                      onChange={(e) => setPersonal({ ...personal, nationality: e.target.value })}
                      placeholder="e.g. Singapore Citizen"
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
                    <label style={BODY_STYLE}>Mobile number</label>
                    <Input
                      value={personal.mobile}
                      onChange={(e) => setPersonal({ ...personal, mobile: e.target.value })}
                      placeholder="+65 xxxx xxxx"
                      className={fieldClass}
                    />
                  </div>
                  <div className="lg:col-span-2">
                    <label style={BODY_STYLE}>Registered address</label>
                    <Input
                      value={personal.registeredAddress}
                      onChange={(e) => setPersonal({ ...personal, registeredAddress: e.target.value })}
                      placeholder="Full address"
                      className={fieldClass}
                    />
                  </div>
                </div>
              </section>

              <section className={CARD_BOX_CLASS}>
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
                <p ref={(el) => el?.scrollIntoView({ behavior: 'smooth', block: 'end' })} className="text-[14px] font-semibold text-warning">
                  {prompt}
                </p>
              ) : null}
            </div>

            <div className="h-6 shrink-0 lg:hidden" aria-hidden />

            {/* Footer */}
            <div
              className={cn(
                'z-30 flex h-[68px] items-center border-t border-border bg-surface',
                'max-lg:fixed max-lg:inset-x-0 max-lg:bottom-0 max-lg:px-4',
                'lg:mt-10 lg:px-6',
              )}
            >
              <div className="flex w-full items-center justify-between gap-3">
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
                  onClick={handleCreateAccount}
                >
                  Create account
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ApplicantChrome>
  );
}

function HeroBanner({
  children,
  className,
  variant,
}: {
  children?: React.ReactNode;
  className?: string;
  variant: 'mobile' | 'pc';
}) {
  const isMobile = variant === 'mobile';
  return (
    <div
      className={cn(
        'relative z-0 w-full overflow-hidden bg-[rgb(var(--toa-navy))]',
        isMobile ? 'h-[144px]' : 'h-[280px]',
        'rounded-lg lg:rounded-none',
        className,
      )}
    >
      <Image
        src={isMobile ? '/images/setup-banner-m.png' : '/images/account-setup-hero.png'}
        alt=""
        fill
        className="object-cover object-right"
        sizes={isMobile ? '100vw' : '(min-width: 1024px) calc(100vw - 220px), 100vw'}
        priority
      />
      {children}
    </div>
  );
}

function MobileStepper() {
  return (
    <div className="flex w-full items-center" aria-label="Registration progress">
      <span
        className="inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-success text-white"
      >
        <svg className="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3}>
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </span>
      <span className="mx-2 h-px flex-1 bg-fg" />
      <span className="inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-success text-white">
        <svg className="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3}>
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </span>
      <span className="mx-2 h-px flex-1" style={{ background: 'rgba(69, 85, 108, 1)' }} />
      <span
        className="inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-accent text-[12px] font-semibold text-white"
      >
        3
      </span>
    </div>
  );
}

function SidebarStep({
  title,
  detail,
  done,
  active,
  number,
  showLine,
}: {
  title: string;
  detail: string;
  done?: boolean;
  active?: boolean;
  number?: number;
  showLine?: boolean;
}) {
  return (
    <li className="flex gap-3">
      <div className="flex w-6 shrink-0 flex-col items-center">
        {done ? (
          <svg className="size-6 shrink-0 text-success" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <circle cx="12" cy="12" r="10" />
            <polyline points="8 12 11 15 16 9" />
          </svg>
        ) : (
          <span
            className="inline-flex size-6 shrink-0 items-center justify-center rounded-full text-[12px] font-semibold text-white"
            style={{ background: 'rgba(27, 101, 248, 1)' }}
          >
            {number}
          </span>
        )}
        {showLine && (
          <span className="mt-2 h-8 w-px shrink-0" style={{ background: 'rgba(69, 85, 108, 1)' }} aria-hidden />
        )}
      </div>
      <div className="min-w-0">
        <p className="text-[14px] leading-6 text-[rgba(15,23,43,1)]">{title}</p>
        <p className="text-[12px] leading-5 text-[rgba(69,85,108,1)]">{detail}</p>
      </div>
    </li>
  );
}
