'use client';

/* Account setup · Check profile details — C-end comps (PC sidebar + mobile stack). */
import { useEffect, useRef, useState, type ReactNode } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Check, Info } from 'lucide-react';
import ApplicantChrome from '@/components/apply/applicant-chrome';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useRole } from '@/lib/role';
import { signIn } from '@/lib/session';
import {
  clearMyinfoPending,
  firstName,
  isValidNric,
  loadMyinfoPending,
  saveApplicantProfile,
  type MyinfoPending,
  type MyinfoProfile,
} from '@/lib/myinfo';
import { clearApplyDraft, markChapterIntro } from '@/lib/apply-application';
import { cn } from '@/lib/utils';

/** Match comps — white cards with warm border · mobile pad 22×16 · PC 26×24 */
const CARD_BOX_CLASS =
  'rounded-lg border border-[rgba(231,228,221,1)] bg-white p-[22px_16px] lg:p-[26px_24px]';

/** Card titles: mobile 16/18 · PC 18/18 */
const CARD_TITLE_CLASS =
  'font-semibold text-[16px] leading-[18px] text-[rgba(15,23,43,1)] lg:text-[18px]';

const CARD_SUBTITLE = {
  fontWeight: 400,
  fontSize: 14,
  lineHeight: '20px',
  color: 'rgba(69, 85, 108, 1)',
} as const;

const CONTACT_INPUT =
  'text-[14px] font-normal leading-none text-[rgba(15,23,42,1)] placeholder:text-[rgba(15,23,42,0.45)]';

const CONSENT_TEXT_CLASS =
  'font-normal text-[12px] leading-[18px] text-[rgba(22,33,51,1)] lg:text-[14px] lg:leading-[20.3px]';

const CONSENT_DATA_USE =
  'By submitting the application required, the candidate understands, agrees and consents to DSTA using such personal data or otherwise disclosing such data to other third-party organisations for the purposes of enabling the candidate to be considered and/or contacted for other available opportunities, including but not limited to employment, internships, scholarships and outreach programmes.';

const CONSENT_DECLARE =
  'I hereby certify that I have read and understood all of the clauses above and that I agree to all of them.';

export default function ApplyAccountSetup() {
  const router = useRouter();
  const { setRole } = useRole();

  const [pending, setPending] = useState<MyinfoPending | null>(null);
  const [personal, setPersonal] = useState<MyinfoProfile | null>(null);
  const [editing, setEditing] = useState(false);
  const [nric, setNric] = useState('');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [dataUseConsent, setDataUseConsent] = useState(false);
  const [declarationConsent, setDeclarationConsent] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [attempted, setAttempted] = useState(false);
  const promptRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const p = loadMyinfoPending();
    if (!p) {
      router.replace('/login');
      return;
    }
    setPending(p);
    setPersonal(p.profile);
    setMobile(p.profile.mobile);
    setEmail(p.profile.email);
    setRole(p.role);
  }, [router, setRole]);

  useEffect(() => {
    if (!prompt) return;
    promptRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [prompt]);

  function validateWith(overrides: {
    nric?: string;
    dataUseConsent?: boolean;
    declarationConsent?: boolean;
  } = {}): string {
    const nextNric = overrides.nric ?? nric;
    const nextData = overrides.dataUseConsent ?? dataUseConsent;
    const nextDecl = overrides.declarationConsent ?? declarationConsent;
    if (!nextNric.trim()) return 'Enter your NRIC / FIN to continue.';
    if (!isValidNric(nextNric)) return 'Enter a valid NRIC / FIN, for example S1234567A.';
    if (!mobile.trim() || !email.trim()) return 'Confirm your mobile number and email to continue.';
    if (!nextData || !nextDecl) return 'Confirm both consent and declaration clauses to continue.';
    return '';
  }

  function handleContinue() {
    setAttempted(true);
    const msg = validateWith();
    setPrompt(msg);
    if (msg) return;
    setConfirmOpen(true);
  }

  function createAccount() {
    if (!pending || !personal) return;
    saveApplicantProfile({
      ...personal,
      mobile: mobile.trim(),
      email: email.trim(),
      nric: nric.replace(/\s/g, '').toUpperCase(),
      role: pending.role,
      dataUseConsent,
      declarationConsent,
      createdAt: new Date().toISOString(),
    });
    setRole(pending.role);
    signIn('singpass', new Date().toISOString(), { guardian: pending.guardian });
    clearMyinfoPending();
    clearApplyDraft();
    setConfirmOpen(false);
    /* Session 1 chapter intro → Education (concept demo flow) */
    markChapterIntro('session-1');
    router.push('/apply/education?intro=session-1');
  }

  if (!pending || !personal) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg text-body-sm text-fg-muted">
        Loading…
      </div>
    );
  }

  const greetName = firstName(personal.name);

  const mobilePageCopy = (
    <>
      <p
        style={{
          fontWeight: 400,
          fontSize: 14,
          lineHeight: '100%',
          color: 'rgba(74, 85, 104, 1)',
        }}
      >
        Account setup · Check profile details
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
        Confirm the details
        <br />
        retrieved from Singpass.
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
        Welcome back, {greetName}. Follow your application, clear your next tasks and revisit the
        quiz whenever curiosity strikes.
      </p>
    </>
  );

  const pcBannerCopy = (
    <div
      className="absolute z-[1] flex flex-col"
      style={{ top: 40, left: 50, width: 760, height: 163 }}
    >
      <p
        style={{
          fontWeight: 400,
          fontSize: 16,
          lineHeight: '24px',
          color: 'rgba(69, 85, 108, 1)',
        }}
      >
        Account setup · Check profile details
      </p>
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
        Confirm the details
        <br />
        retrieved from Singpass.
      </h1>
      <p
        style={{
          marginTop: 8,
          fontWeight: 400,
          fontSize: 14,
          lineHeight: '20px',
          color: 'rgba(69, 85, 108, 1)',
        }}
      >
        Welcome back, {greetName}. Follow your application, clear your next
        <br />
        tasks and revisit the quiz whenever curiosity strikes.
      </p>
    </div>
  );

  return (
    <ApplicantChrome className="max-lg:bg-[rgba(251,251,253,1)] lg:bg-bg">
      {/* Mobile keeps page padding; PC is edge-flush (sidebar + banner) */}
      <div className="w-full max-lg:bg-[rgba(251,251,253,1)] max-lg:px-4 max-lg:pb-[68px] max-lg:pt-0">
        <div className="grid items-stretch lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-0">
          {/* ── PC sidebar: 220px, padding 45×24 ── */}
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
            <p
              style={{
                marginTop: 4,
                fontWeight: 400,
                fontSize: 14,
                lineHeight: '20px',
                color: 'rgba(69, 85, 108, 1)',
              }}
            >
              Complete each step.
            </p>
            <ol className="flex flex-col" style={{ marginTop: 24 }}>
              <SidebarStep done title="Singpass" detail="Secure sign-in" showLine />
              <SidebarStep
                active
                number={2}
                title="Check profile details"
                detail="Confirm your Singpass information"
              />
            </ol>
            <div className="mt-auto pt-10">
              <SidebarDecoration />
            </div>
          </aside>

          {/* ── Right column: mobile cool gray · PC warm gradient ── */}
          <div
            className="flex min-w-0 flex-col max-lg:bg-[rgba(251,251,253,1)] lg:[background:linear-gradient(0deg,#F3EFE5,#F3EFE5),linear-gradient(0deg,#F9F8F4,#F9F8F4)]"
          >
            {/* Mobile: stepper → title → banner → copy */}
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
                  Check profile details
                </h2>
                <p
                  style={{
                    fontWeight: 400,
                    fontSize: 14,
                    lineHeight: '100%',
                    color: 'rgba(74, 85, 104, 1)',
                  }}
                >
                  Confirm your Singpass information
                </p>
              </div>
              <div style={{ marginTop: 24 }}>
                <HeroBanner variant="mobile" className="rounded-lg" />
              </div>
              <div style={{ marginTop: 24, marginBottom: 24 }}>{mobilePageCopy}</div>
            </div>

            {/* PC: height 280, width full; copy absolute inside banner */}
            <div className="relative hidden w-full lg:block">
              <HeroBanner variant="pc" className="rounded-none">
                {pcBannerCopy}
              </HeroBanner>
            </div>

            {/* Cards · mobile: 24px above fixed footer via outer pb 68+24 */}
            <div className="relative z-[2] space-y-3 lg:-mt-[37px] lg:px-6">
              {/* Card 1 */}
              <section className={CARD_BOX_CLASS}>
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <h3 className={CARD_TITLE_CLASS}>Retrieved via Singpass</h3>
                    <span
                      className="inline-flex shrink-0 items-center gap-1"
                      style={{
                        height: 22,
                        padding: '2px 8px',
                        background: 'rgba(0, 201, 80, 0.15)',
                        borderRadius: 999,
                        fontWeight: 400,
                        fontSize: 12,
                        lineHeight: '16px',
                        color: 'rgba(0, 130, 54, 1)',
                      }}
                    >
                      <Check className="h-3 w-3" strokeWidth={2.5} /> Verified
                    </span>
                  </div>
                  <p className="mt-1" style={CARD_SUBTITLE}>
                    Myinfo · Verified government record
                  </p>
                </div>

                <TipBanner tall>
                  These particulars came from your Singpass profile. You can edit them for this
                  application without changing your Singpass record.
                </TipBanner>

                <ProfileFields
                  personal={personal}
                  editing={editing}
                  onChange={(patch) => setPersonal({ ...personal, ...patch })}
                />

                <button
                  type="button"
                  onClick={() => setEditing((v) => !v)}
                  className="box-border h-8 cursor-pointer"
                  style={{
                    marginTop: 24,
                    borderRadius: 6,
                    border: '1px solid rgba(231, 228, 221, 1)',
                    background: 'rgba(251, 250, 246, 1)',
                    paddingTop: 6.5,
                    paddingRight: 12,
                    paddingBottom: 7.5,
                    paddingLeft: 12,
                    fontWeight: 500,
                    fontSize: 12,
                    lineHeight: '16px',
                    color: 'rgba(15, 23, 43, 1)',
                  }}
                >
                  {editing ? 'Done' : 'Edit'}
                </button>
              </section>

              {/* Card 2 */}
              <section className={CARD_BOX_CLASS}>
                <h3 className={CARD_TITLE_CLASS}>Contact details</h3>
                <TipBanner>Please provide the following information</TipBanner>
                <div className="grid gap-4 md:grid-cols-3">
                  <Field label="NRIC / FIN" required>
                    <Input
                      value={nric}
                      onChange={(e) => {
                        const v = e.target.value.toUpperCase();
                        setNric(v);
                        if (attempted) setPrompt(validateWith({ nric: v }));
                      }}
                      placeholder="e.g. S1234567A"
                      maxLength={9}
                      autoComplete="off"
                      className={cn(
                        'h-10 rounded-md',
                        CONTACT_INPUT,
                        attempted && !nric.trim() && 'border-warning focus-visible:outline-warning',
                      )}
                    />
                  </Field>
                  <Field label="Mobile Number" required>
                    <Input
                      value={mobile}
                      onChange={(e) => setMobile(e.target.value)}
                      className={cn('h-10 rounded-md', CONTACT_INPUT)}
                    />
                  </Field>
                  <Field label="Email" required>
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className={cn('h-10 rounded-md', CONTACT_INPUT)}
                    />
                  </Field>
                </div>
              </section>

              {/* Card 3 */}
              <section className={CARD_BOX_CLASS}>
                <h3 className={CARD_TITLE_CLASS}>Consent and declaration</h3>
                <div className="mt-3 space-y-4">
                  <label className="flex cursor-pointer items-start gap-3">
                    <Checkbox
                      checked={dataUseConsent}
                      onCheckedChange={(v) => {
                        setDataUseConsent(v === true);
                        if (attempted) setPrompt(validateWith({ dataUseConsent: v === true }));
                      }}
                      className="mt-0.5 size-3 shrink-0 cursor-pointer rounded-[2px] lg:size-5 lg:rounded-[4px]"
                    />
                    <span className={CONSENT_TEXT_CLASS}>
                      {CONSENT_DATA_USE} <span className="text-danger">*</span>
                    </span>
                  </label>
                  <label className="flex cursor-pointer items-start gap-3">
                    <Checkbox
                      checked={declarationConsent}
                      onCheckedChange={(v) => {
                        setDeclarationConsent(v === true);
                        if (attempted) setPrompt(validateWith({ declarationConsent: v === true }));
                      }}
                      className="mt-0.5 size-3 shrink-0 cursor-pointer rounded-[2px] lg:size-5 lg:rounded-[4px]"
                    />
                    <span className={CONSENT_TEXT_CLASS}>
                      {CONSENT_DECLARE} <span className="text-danger">*</span>
                    </span>
                  </label>
                </div>
              </section>

              {prompt && (
                <p
                  ref={promptRef}
                  className="text-[14px] font-semibold text-warning"
                  style={{ scrollMarginBottom: 92 }}
                >
                  {prompt}
                </p>
              )}
            </div>

            {/* Mobile: 24px between last card and fixed footer */}
            <div className="h-6 shrink-0 lg:hidden" aria-hidden />

            {/* Footer: mobile fixed · h 68 · PC 40 above */}
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
                  className="cursor-pointer bg-transparent p-0"
                  style={{
                    fontWeight: 500,
                    fontSize: 14,
                    lineHeight: '20px',
                    color: 'rgba(15, 23, 42, 1)',
                  }}
                  onClick={() => router.push('/apply/welcome')}
                >
                  Back
                </button>
                <button
                  type="button"
                  className="h-9 cursor-pointer rounded-md px-5 lg:h-10"
                  style={{
                    background: 'rgba(37, 99, 235, 1)',
                    fontWeight: 400,
                    fontSize: 14,
                    lineHeight: '20px',
                    color: 'rgba(255, 255, 255, 1)',
                  }}
                  onClick={handleContinue}
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent
          className="w-[min(calc(100%-2rem),36rem)] max-w-[36rem] gap-6 rounded-xl px-6 py-6 sm:max-w-[32rem]"
          showCloseButton={false}
        >
          <DialogHeader className="gap-2 text-left sm:text-left">
            <DialogTitle className="text-left text-[1.125rem] font-bold leading-snug tracking-normal">
              Create your account and continue?
            </DialogTitle>
            <DialogDescription className="text-left text-[14px] leading-relaxed text-fg-muted sm:whitespace-nowrap">
              An applicant account will be created using the details you provided.
              <br />
              You can then continue and complete the rest of your application.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:justify-end">
            <Button variant="outline" className="rounded-md" onClick={() => setConfirmOpen(false)}>
              Review details
            </Button>
            <Button className="rounded-md font-semibold" onClick={createAccount}>
              Create account and continue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ApplicantChrome>
  );
}

/** Mobile: 24×24 nodes · 8px gap to connector · line rgba(69,85,108) */
function MobileStepper() {
  return (
    <div className="flex w-full items-center" aria-label="Application progress">
      <span
        className="inline-flex size-6 shrink-0 items-center justify-center rounded-full text-white"
        style={{ backgroundColor: 'rgb(var(--toa-teal))' }}
      >
        <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
      </span>
      <span
        className="min-w-0 flex-1"
        style={{
          height: 1,
          marginLeft: 8,
          marginRight: 8,
          background: 'rgba(69, 85, 108, 1)',
        }}
      />
      <span
        className="inline-flex size-6 shrink-0 items-center justify-center rounded-full text-[12px] font-semibold text-white"
        style={{ background: 'rgba(27, 101, 248, 1)' }}
      >
        2
      </span>
    </div>
  );
}

function ProfileFields({
  personal,
  editing,
  onChange,
}: {
  personal: MyinfoProfile;
  editing: boolean;
  onChange: (patch: Partial<MyinfoProfile>) => void;
}) {
  const divider = (
    <div className="flex shrink-0 items-center" aria-hidden>
      <span
        className="block w-px"
        style={{ height: 40, background: 'rgba(231, 228, 221, 1)' }}
      />
      <span className="block w-4" />
    </div>
  );

  return (
    <>
      {/* Mobile — 2 columns + vertical rule */}
      <div className="grid grid-cols-2 gap-y-6 lg:hidden" style={{ rowGap: 24 }}>
        <div className="border-r pr-4" style={{ borderColor: 'rgba(231, 228, 221, 1)' }}>
          <VerifiedField label="Name" value={personal.name} editing={editing}
            onChange={(v) => onChange({ name: v })} />
        </div>
        <div className="pl-4">
          <VerifiedField label="Date of birth" value={personal.dateOfBirth} editing={editing}
            onChange={(v) => onChange({ dateOfBirth: v })} />
        </div>
        <div className="border-r pr-4" style={{ borderColor: 'rgba(231, 228, 221, 1)' }}>
          <VerifiedField label="Nationality" value={personal.nationality} editing={editing}
            onChange={(v) => onChange({ nationality: v })} />
        </div>
        <div className="pl-4">
          <VerifiedField label="Residential status" value={personal.residentialStatus} editing={editing}
            onChange={(v) => onChange({ residentialStatus: v })} />
        </div>
        <div className="col-span-2">
          <VerifiedField label="Requested address" value={personal.registeredAddress} editing={editing}
            onChange={(v) => onChange({ registeredAddress: v })} />
        </div>
      </div>

      {/* PC — 3 columns; 1×40 divider + 16px gap to the right; 24px row gap */}
      <div className="hidden lg:flex lg:flex-col" style={{ gap: 24 }}>
        <div className="flex items-start">
          <div className="min-w-0 flex-1">
            <VerifiedField label="Name" value={personal.name} editing={editing}
              onChange={(v) => onChange({ name: v })} />
          </div>
          {divider}
          <div className="min-w-0 flex-1">
            <VerifiedField label="Date of birth" value={personal.dateOfBirth} editing={editing}
              onChange={(v) => onChange({ dateOfBirth: v })} />
          </div>
          {divider}
          <div className="min-w-0 flex-1">
            <VerifiedField label="Nationality" value={personal.nationality} editing={editing}
              onChange={(v) => onChange({ nationality: v })} />
          </div>
        </div>
        <div className="flex items-start">
          <div className="min-w-0 flex-1">
            <VerifiedField label="Residential status" value={personal.residentialStatus} editing={editing}
              onChange={(v) => onChange({ residentialStatus: v })} />
          </div>
          {divider}
          <div className="min-w-0 flex-1">
            <VerifiedField label="Requested address" value={personal.registeredAddress} editing={editing}
              onChange={(v) => onChange({ registeredAddress: v })} />
          </div>
          <div className="flex shrink-0 items-center" aria-hidden>
            <span className="block w-px opacity-0" style={{ height: 40 }} />
            <span className="block w-4" />
          </div>
          <div className="min-w-0 flex-1" />
        </div>
      </div>
    </>
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
          <Image
            src="/images/step-complete.svg"
            alt=""
            width={24}
            height={24}
            className="size-6 shrink-0"
          />
        ) : (
          <span
            className="inline-flex size-6 shrink-0 items-center justify-center rounded-full text-[12px] font-semibold text-white"
            style={{ background: 'rgba(27, 101, 248, 1)' }}
          >
            {number}
          </span>
        )}
        {showLine && (
          <>
            <span className="block w-px shrink-0" style={{ height: 16 }} aria-hidden />
            <span
              className="block w-px shrink-0"
              style={{ height: 37, background: 'rgba(69, 85, 108, 1)' }}
              aria-hidden
            />
            <span className="block w-px shrink-0" style={{ height: 16 }} aria-hidden />
          </>
        )}
      </div>
      <div className="min-w-0 pt-0">
        <p
          className="break-words"
          style={{
            fontWeight: 400,
            fontSize: 14,
            lineHeight: '24px',
            color: 'rgba(15, 23, 43, 1)',
            overflowWrap: 'break-word',
            wordBreak: 'normal',
          }}
        >
          {title}
        </p>
        <p
          className="break-words"
          style={{
            fontWeight: 400,
            fontSize: 12,
            lineHeight: '20px',
            color: 'rgba(69, 85, 108, 1)',
            overflowWrap: 'break-word',
            wordBreak: 'normal',
          }}
        >
          {detail}
        </p>
      </div>
    </li>
  );
}

function HeroBanner({
  children,
  className,
  variant,
}: {
  children?: ReactNode;
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
        src={isMobile ? '/images/setup-banner-m.png' : '/images/setup-banner-pc.png'}
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

function SidebarDecoration() {
  return (
    <svg viewBox="0 0 200 80" className="w-full text-accent/30" aria-hidden>
      <g fill="none" stroke="currentColor" strokeWidth="1.2">
        <circle cx="40" cy="40" r="14" />
        <circle cx="90" cy="28" r="10" />
        <circle cx="130" cy="48" r="12" />
        <circle cx="170" cy="32" r="8" />
        <path d="M54 40h26M100 32l20 12M142 48h20" strokeDasharray="3 4" />
      </g>
    </svg>
  );
}

function TipBanner({ children, tall }: { children: ReactNode; tall?: boolean }) {
  return (
    <div
      className={cn(
        'flex gap-2.5 rounded-md border border-[rgba(230,225,216,1)] px-3',
        tall
          ? 'items-center py-3 max-lg:h-[109px] lg:h-12 lg:py-0'
          : 'h-12 items-center',
      )}
      style={{
        marginTop: 24,
        marginBottom: 16,
        background:
          'linear-gradient(0deg, #F3EFE5, #F3EFE5), linear-gradient(0deg, #F9F8F4, #F9F8F4)',
      }}
    >
      <Info
        className="size-4 shrink-0"
        strokeWidth={1.5}
        style={{ color: 'rgba(22, 33, 51, 1)' }}
        aria-hidden
      />
      <p
        style={{
          fontWeight: 400,
          fontSize: 14,
          lineHeight: '20.3px',
          color: 'rgba(22, 33, 51, 1)',
        }}
      >
        {children}
      </p>
    </div>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <div>
      <label
        className="mb-1.5 block"
        style={{
          fontWeight: 500,
          fontSize: 14,
          lineHeight: '14px',
          color: 'rgba(15, 23, 43, 1)',
        }}
      >
        {label}
        {required && <span className="text-danger"> *</span>}
      </label>
      {children}
    </div>
  );
}

function VerifiedField({
  label,
  value,
  editing,
  onChange,
}: {
  label: string;
  value: string;
  editing: boolean;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <p
        style={{
          fontWeight: 400,
          fontSize: 14,
          lineHeight: '20px',
          color: 'rgba(69, 85, 108, 1)',
        }}
      >
        {label}
      </p>
      {editing ? (
        <Input value={value} onChange={(e) => onChange(e.target.value)} className="mt-1 h-9 rounded-md" />
      ) : (
        <p
          className="mt-0.5 text-[14px] leading-5 text-[rgba(15,23,43,1)] font-semibold lg:font-medium"
        >
          {value}
        </p>
      )}
    </div>
  );
}
