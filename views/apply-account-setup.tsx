'use client';

/* Account setup · Check profile details — C-end comps (PC sidebar + mobile stack). */
import { useEffect, useState, type ReactNode } from 'react';
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

/** Match comps — slightly tighter than rounded-2xl */
const CARD = 'rounded-lg border border-border bg-surface shadow-sm';

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
  }, [router]);

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

  const pageCopy = (
    <>
      <p className="text-[12px] text-fg-muted lg:text-fg/70">
        Account setup · Check profile details
      </p>
      <h1 className="mt-1.5 max-w-md text-[1.375rem] font-bold leading-snug tracking-tight text-fg md:text-[1.625rem] lg:text-fg">
        Confirm the details
        <br />
        retrieved from Singpass.
      </h1>
      <p className="mt-2 max-w-md text-body-sm leading-relaxed text-fg-muted lg:text-fg/75">
        Welcome back, {greetName}. Follow your application, clear your next tasks and revisit the
        quiz whenever curiosity strikes.
      </p>
    </>
  );

  return (
    <ApplicantChrome className="bg-bg">
      {/* Mobile keeps page padding; PC is edge-flush (sidebar + banner) */}
      <div className="w-full max-lg:px-4 max-lg:pb-[4.5rem] max-lg:pt-3">
        <div className="grid items-stretch lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-0">
          {/* ── PC sidebar: only right rule, no radius, flush top/left/bottom ── */}
          <aside className="hidden flex-col border-r border-border bg-bg px-6 py-6 lg:flex">
            <h2 className="text-body-md font-bold text-fg">Your application</h2>
            <p className="mt-1 text-[13px] leading-relaxed text-fg-muted">
              Complete each step. Your answers are only stored in this browser prototype.
            </p>
            <ol className="relative mt-8">
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

          {/* ── Right column — same page beige as chrome (d-experience bg) ── */}
          <div className="flex min-w-0 flex-col bg-bg">
            {/* Mobile: stepper → full-bleed banner → copy below (design fig 1) */}
            <div className="lg:hidden">
              <div className="pb-1 pt-4">
                <MobileStepper />
                <h2 className="mt-5 text-body-md font-bold text-fg">Check profile details</h2>
                <p className="text-[13px] text-fg-muted">Confirm your Singpass information</p>
              </div>
              {/* Full width: cancel page px-4; keep top/bottom gaps */}
              <div className="-mx-4 mt-4">
                <HeroBanner className="rounded-none" />
              </div>
              <div className="mt-5 mb-4">{pageCopy}</div>
            </div>

            {/* PC: hero with in-image copy */}
            <div className="relative hidden lg:block">
              <HeroBanner className="rounded-none">
                <div className="absolute inset-y-0 left-0 z-[1] flex w-[min(560px,70%)] items-stretch pl-10 pr-6">
                  <div className="relative pt-8 pb-14">{pageCopy}</div>
                </div>
              </HeroBanner>
            </div>

            {/* Cards: mobile normal flow; PC overlaps banner */}
            <div className="relative z-[2] space-y-3 lg:-mt-12 lg:px-5">
              {/* Card 1 */}
              <section className={cn(CARD, 'p-4 md:p-5')}>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h3 className="text-body-md font-bold text-fg">Retrieved via Singpass</h3>
                    <p className="text-[12px] text-fg-muted">Myinfo · Verified government record</p>
                  </div>
                  <span className="inline-flex items-center gap-1 rounded-full bg-success-bg px-2.5 py-1 text-[12px] font-normal text-success">
                    <Check className="h-3.5 w-3.5" strokeWidth={2.5} /> Verified
                  </span>
                </div>

                {/* Tip — muted comps style (not warning orange) */}
                <div className="mt-3 flex items-start gap-2.5 rounded-md bg-bg-muted px-3.5 py-3 text-[13px] leading-relaxed text-fg-muted">
                  <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-border-strong text-fg-muted">
                    <Info className="h-3 w-3" />
                  </span>
                  <p>
                    These particulars came from your Singpass profile. You can edit them for this
                    application without changing your Singpass record.
                  </p>
                </div>

                {/* Mobile: 2-col with divider · PC: 3-col */}
                <ProfileFields
                  personal={personal}
                  editing={editing}
                  onChange={(patch) => setPersonal({ ...personal, ...patch })}
                />

                <div className="mt-4">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="rounded-md"
                    onClick={() => setEditing((v) => !v)}
                  >
                    {editing ? 'Done' : 'Edit'}
                  </Button>
                </div>
              </section>

              {/* Card 2 */}
              <section className={cn(CARD, 'p-4 md:p-5')}>
                <h3 className="text-body-md font-bold text-fg">Contact details</h3>
                <div className="mt-3 grid gap-4 md:grid-cols-3">
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
                        attempted && !nric.trim() && 'border-warning focus-visible:outline-warning',
                      )}
                    />
                  </Field>
                  <Field label="Mobile Number" required>
                    <Input
                      value={mobile}
                      onChange={(e) => setMobile(e.target.value)}
                      className="h-10 rounded-md"
                    />
                  </Field>
                  <Field label="Email" required>
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="h-10 rounded-md"
                    />
                  </Field>
                </div>
              </section>

              {/* Card 3 */}
              <section className={cn(CARD, 'p-4 md:p-5')}>
                <h3 className="text-body-md font-bold text-fg">Consent and declaration</h3>
                <div className="mt-3 space-y-4">
                  <label className="flex items-start gap-3 text-[13px] leading-relaxed text-fg">
                    <Checkbox
                      checked={dataUseConsent}
                      onCheckedChange={(v) => {
                        setDataUseConsent(v === true);
                        if (attempted) setPrompt(validateWith({ dataUseConsent: v === true }));
                      }}
                      className="mt-0.5"
                    />
                    <span>
                      {CONSENT_DATA_USE} <span className="text-danger">*</span>
                    </span>
                  </label>
                  <label className="flex items-start gap-3 text-[13px] leading-relaxed text-fg">
                    <Checkbox
                      checked={declarationConsent}
                      onCheckedChange={(v) => {
                        setDeclarationConsent(v === true);
                        if (attempted) setPrompt(validateWith({ declarationConsent: v === true }));
                      }}
                      className="mt-0.5"
                    />
                    <span>
                      {CONSENT_DECLARE} <span className="text-danger">*</span>
                    </span>
                  </label>
                </div>
              </section>

              {prompt && (
                <p className="text-[14px] font-semibold text-warning">{prompt}</p>
              )}
            </div>

            {/* Footer: mobile fixed full width; PC fills right column */}
            <div
              className={cn(
                'z-30 mt-auto border-t border-border bg-surface',
                'max-lg:fixed max-lg:inset-x-0 max-lg:bottom-0 max-lg:px-4 max-lg:py-3',
                'lg:mt-6 lg:px-5 lg:py-3',
              )}
            >
              <div className="flex items-center justify-between gap-3">
                <Button
                  type="button"
                  variant="ghost"
                  className="px-0 font-medium text-fg hover:bg-transparent"
                  onClick={() => router.push('/apply/welcome')}
                >
                  Back
                </Button>
                <Button
                  type="button"
                  size="lg"
                  className="h-10 rounded-md px-5 font-semibold"
                  onClick={handleContinue}
                >
                  Confirm and continue
                </Button>
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

/** Mobile: step + flex-1 connector line fills width. */
function MobileStepper() {
  return (
    <div className="flex w-full items-center" aria-label="Application progress">
      {/* Completed — teal (comps), same size as active step */}
      <span
        className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white"
        style={{ backgroundColor: 'rgb(var(--toa-teal))' }}
      >
        <Check className="h-4 w-4" strokeWidth={2.5} />
      </span>
      {/* Connector — same visual weight as border, vertically centered */}
      <span className="mx-0 h-[2px] min-w-0 flex-1 bg-border" />
      <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent text-[13px] font-bold text-accent-fg">
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
  return (
    <>
      {/* Mobile — 2 columns + vertical rule (fig 3) */}
      <div className="mt-4 grid grid-cols-2 gap-y-4 lg:hidden">
        <div className="border-r border-border pr-4">
          <VerifiedField label="Name" value={personal.name} editing={editing}
            onChange={(v) => onChange({ name: v })} />
        </div>
        <div className="pl-4">
          <VerifiedField label="Date of birth" value={personal.dateOfBirth} editing={editing}
            onChange={(v) => onChange({ dateOfBirth: v })} />
        </div>
        <div className="border-r border-border pr-4">
          <VerifiedField label="Nationality" value={personal.nationality} editing={editing}
            onChange={(v) => onChange({ nationality: v })} />
        </div>
        <div className="pl-4">
          <VerifiedField label="Residential status" value={personal.residentialStatus} editing={editing}
            onChange={(v) => onChange({ residentialStatus: v })} />
        </div>
        <div className="col-span-2 pt-1">
          <VerifiedField label="Requested address" value={personal.registeredAddress} editing={editing}
            onChange={(v) => onChange({ registeredAddress: v })} />
        </div>
      </div>

      {/* PC — 3 columns with left rules on col 2 / 3 */}
      <div className="mt-4 hidden lg:grid lg:grid-cols-3 lg:gap-y-4">
        <div className="pr-5">
          <VerifiedField label="Name" value={personal.name} editing={editing}
            onChange={(v) => onChange({ name: v })} />
        </div>
        <div className="border-l border-border px-5">
          <VerifiedField label="Date of birth" value={personal.dateOfBirth} editing={editing}
            onChange={(v) => onChange({ dateOfBirth: v })} />
        </div>
        <div className="border-l border-border pl-5">
          <VerifiedField label="Nationality" value={personal.nationality} editing={editing}
            onChange={(v) => onChange({ nationality: v })} />
        </div>
        <div className="pr-5">
          <VerifiedField label="Residential status" value={personal.residentialStatus} editing={editing}
            onChange={(v) => onChange({ residentialStatus: v })} />
        </div>
        <div className="border-l border-border px-5">
          <VerifiedField label="Requested address" value={personal.registeredAddress} editing={editing}
            onChange={(v) => onChange({ registeredAddress: v })} />
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
    <li className="relative flex gap-3 pb-8 last:pb-0">
      {showLine && (
        <span className="absolute left-[13px] top-8 h-[calc(100%-1.25rem)] w-px bg-border" aria-hidden />
      )}
      <span
        className={cn(
          'relative z-[1] mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[12px] font-bold',
          done && 'bg-success text-white',
          active && 'bg-accent text-accent-fg',
          !done && !active && 'bg-bg-muted text-fg-muted',
        )}
      >
        {done ? <Check className="h-3.5 w-3.5" strokeWidth={2.5} /> : number}
      </span>
      <div>
        <p className={cn('text-[14px] font-semibold text-fg', active && 'font-bold')}>{title}</p>
        <p className="text-[12px] leading-snug text-fg-muted">{detail}</p>
      </div>
    </li>
  );
}

function HeroBanner({
  children,
  className,
}: {
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'relative z-0 w-full overflow-hidden bg-[rgb(var(--toa-navy))]',
        /* Fixed height; width 100% — tall enough for overlay copy on PC */
        'h-[160px] md:h-[180px] lg:h-[260px]',
        'rounded-lg lg:rounded-none',
        className,
      )}
    >
      <Image
        src="/images/account-setup-hero.png"
        alt=""
        fill
        className="object-cover object-right"
        sizes="100vw"
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
      <label className="mb-1.5 block text-[13px] font-semibold text-fg">
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
      <p className="text-[12px] text-fg-muted">{label}</p>
      {editing ? (
        <Input value={value} onChange={(e) => onChange(e.target.value)} className="mt-1 h-9 rounded-md" />
      ) : (
        <p className="mt-0.5 text-[14px] font-semibold text-fg">{value}</p>
      )}
    </div>
  );
}
