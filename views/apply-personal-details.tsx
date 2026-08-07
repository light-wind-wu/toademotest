'use client';

/* Personal Detail — step 1 of the 6-step tree.
   Singpass onboarding still uses /apply/account-setup.
   This page is used when revisiting step 1 (e.g. Education Back) or editing from Review (?from=review). */
import { useEffect, useState, type CSSProperties } from 'react';
import { useRouter } from 'next/navigation';
import { Check } from 'lucide-react';
import ApplicationFlowShell from '@/components/apply/application-flow-shell';
import {
  ProfileFields,
  TipBanner,
  isSingpassPersonalIncomplete,
} from '@/components/apply/singpass-profile-fields';
import {
  isValidNric,
  loadApplicantProfile,
  saveApplicantProfile,
  type ApplicantProfile,
  type MyinfoProfile,
} from '@/lib/myinfo';
import { isSignedIn } from '@/lib/session';

const CARD_BOX_CLASS =
  'rounded-lg border border-[rgba(231,228,221,1)] bg-white p-[22px_16px] lg:p-[26px_24px]';

const CARD_TITLE_CLASS =
  'font-semibold text-[16px] leading-[18px] text-[rgba(15,23,43,1)] lg:text-[18px]';

const CARD_SUBTITLE = {
  fontWeight: 400,
  fontSize: 14,
  lineHeight: '20px',
  color: 'rgba(69, 85, 108, 1)',
} as const;

const EDIT_BTN_STYLE: CSSProperties = {
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
};

function isFromReview(): boolean {
  if (typeof window === 'undefined') return false;
  return new URLSearchParams(window.location.search).get('from') === 'review';
}

export default function ApplyPersonalDetailsPage() {
  const router = useRouter();
  const [fromReview, setFromReview] = useState(false);

  const [ready, setReady] = useState(false);
  const [base, setBase] = useState<ApplicantProfile | null>(null);
  const [personal, setPersonal] = useState<MyinfoProfile | null>(null);
  const [nric, setNric] = useState('');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [editing, setEditing] = useState(false);
  const [attempted, setAttempted] = useState(false);
  const [prompt, setPrompt] = useState('');

  useEffect(() => {
    if (!isSignedIn()) {
      router.replace('/login');
      return;
    }
    setFromReview(isFromReview());
    const profile = loadApplicantProfile();
    if (!profile) {
      router.replace('/login');
      return;
    }
    setBase(profile);
    setPersonal({
      name: profile.name,
      sex: profile.sex,
      dateOfBirth: profile.dateOfBirth,
      race: profile.race,
      nationality: profile.nationality,
      residentialStatus: profile.residentialStatus,
      registeredAddress: profile.registeredAddress,
      mobile: profile.mobile,
      email: profile.email,
    });
    setNric(profile.nric);
    setMobile(profile.mobile);
    setEmail(profile.email);
    setReady(true);
  }, [router]);

  function validate(): string {
    if (!personal || isSingpassPersonalIncomplete(personal)) {
      return 'Complete all personal details to continue.';
    }
    if (!nric.trim() || !isValidNric(nric)) {
      return 'Enter a valid NRIC / FIN to continue.';
    }
    if (!mobile.trim()) return 'Enter a mobile number to continue.';
    if (!email.trim()) return 'Enter an email address to continue.';
    return '';
  }

  function handleEditDone() {
    if (!editing) {
      setEditing(true);
      return;
    }
    const msg = validate();
    if (msg) {
      setAttempted(true);
      setPrompt(msg);
      return;
    }
    setPrompt('');
    setEditing(false);
  }

  function persistProfile() {
    if (!base || !personal) return false;
    if (editing) {
      const msg = validate();
      if (msg) {
        setAttempted(true);
        setPrompt(msg);
        return false;
      }
    }
    const msg = validate();
    if (msg) {
      setAttempted(true);
      setPrompt(msg);
      return false;
    }
    saveApplicantProfile({
      ...base,
      ...personal,
      nric: nric.replace(/\s/g, '').toUpperCase(),
      mobile: mobile.trim(),
      email: email.trim(),
    });
    return true;
  }

  function handleContinue() {
    if (!persistProfile()) return;
    router.push(fromReview ? '/apply/review' : '/apply/education');
  }

  if (!ready || !personal) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg text-body-sm text-fg-muted">
        Loading…
      </div>
    );
  }

  return (
    <ApplicationFlowShell
      stepId="personal"
      onContinue={handleContinue}
      continueLabel={fromReview ? 'Save' : 'Next'}
    >
      <header className="mb-5">
        <h1 className="text-[1.375rem] font-bold leading-snug tracking-tight text-fg md:text-[1.5rem]">
          Personal Detail
        </h1>
        <p className="mt-1 text-[13px] text-fg-muted">
          Review and update the details retrieved from Singpass.
        </p>
      </header>

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
          We retrieved your particulars from your Singpass account. Feel free to edit as required;
          changes will only be saved here
        </TipBanner>

        <ProfileFields
          personal={personal}
          nric={nric}
          mobile={mobile}
          email={email}
          editing={editing}
          showErrors={attempted}
          onChange={(patch) => setPersonal({ ...personal, ...patch })}
          onNricChange={setNric}
          onMobileChange={setMobile}
          onEmailChange={setEmail}
        />

        <button
          type="button"
          onClick={handleEditDone}
          className="box-border h-8 cursor-pointer"
          style={EDIT_BTN_STYLE}
        >
          {editing ? 'Done' : 'Edit'}
        </button>

        {prompt && (
          <p className="mt-3 text-[14px] font-semibold text-warning">{prompt}</p>
        )}
      </section>
    </ApplicationFlowShell>
  );
}
