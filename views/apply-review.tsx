'use client';

/* Step 5 — Review: four collapsible cards (comps).
   1 Personal (+ Contact below rule)
   2 Academic Transcript (+ CV below rule)
   3 Availability
   4 Additional Details (scholarship / credit split by rule) */
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronDown, ClipboardCheck } from 'lucide-react';
import ApplicationFlowShell from '@/components/apply/application-flow-shell';
import { loadApplyDraft, type ApplySessionDraft } from '@/lib/apply-application';
import { loadApplicantProfile, type ApplicantProfile } from '@/lib/myinfo';
import { isSignedIn } from '@/lib/session';
import { cn } from '@/lib/utils';

function formatDisplayDate(iso: string) {
  if (!iso) return '—';
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function ApplyReviewPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [draft, setDraft] = useState<ApplySessionDraft | null>(null);
  const [profile, setProfile] = useState<ApplicantProfile | null>(null);
  const [open, setOpen] = useState({
    personal: true,
    transcript: true,
    availability: true,
    additional: true,
  });

  useEffect(() => {
    if (!isSignedIn()) {
      router.replace('/login');
      return;
    }
    setDraft(loadApplyDraft());
    setProfile(loadApplicantProfile());
    setReady(true);
  }, [router]);

  if (!ready || !draft) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg text-body-sm text-fg-muted">
        Loading…
      </div>
    );
  }

  function toggle(key: keyof typeof open) {
    setOpen((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  return (
    <ApplicationFlowShell
      stepId="review"
      onBack={() => router.push('/apply/additional-details')}
      onContinue={() => router.push('/apply/success')}
      continueLabel="Submit Application"
    >
      <header className="relative mb-5 pr-16">
        <h1 className="text-[1.375rem] font-bold leading-snug tracking-tight text-fg md:text-[1.5rem]">
          Review
        </h1>
        <p className="mt-1 text-[13px] text-fg-muted">
          Almost there! One final check before submitting.
        </p>
        <ClipboardCheck
          className="absolute right-0 top-0 hidden h-12 w-12 text-accent/50 sm:block"
          strokeWidth={1.25}
          aria-hidden
        />
      </header>

      <div className="space-y-3">
        {/* 1 — Personal + Contact (below rule) */}
        <ReviewSection
          title="Personal details"
          open={open.personal}
          onToggle={() => toggle('personal')}
        >
          <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Name" value={profile?.name ?? '—'} />
            <Field label="NRIC" value={profile?.nric ?? '—'} />
            <Field label="Nationality" value={profile?.nationality ?? '—'} />
            <Field label="Sex" value={profile?.sex ?? '—'} />
            <Field label="Date of Birth" value={profile?.dateOfBirth ?? '—'} />
            <Field label="Race" value={profile?.race ?? '—'} />
          </dl>

          <div className="my-4 border-t border-border" />

          <h3 className="mb-3 text-[14px] font-bold text-fg">Contact details</h3>
          <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Mobile Number" value={profile?.mobile ?? '—'} />
            <Field label="Email" value={profile?.email ?? '—'} />
            <Field label="Registered Address" value={profile?.registeredAddress ?? '—'} />
          </dl>
        </ReviewSection>

        {/* 2 — Transcript + CV (below rule) */}
        <ReviewSection
          title="Academic Transcript"
          open={open.transcript}
          onToggle={() => toggle('transcript')}
        >
          {draft.transcriptName ? (
            <p className="text-[14px] font-semibold text-accent underline underline-offset-2">
              {draft.transcriptName}{' '}
              <span className="font-medium no-underline">uploaded</span>
            </p>
          ) : (
            <p className="text-[13px] text-fg-muted">No transcript uploaded.</p>
          )}
          {draft.transcriptName && (
            <div className="mt-3 rounded-lg bg-bg p-3">
              <p className="mb-2 text-[13px] font-bold text-fg">Education details</p>
              <dl className="grid gap-3 sm:grid-cols-2">
                <Field label="Institution" value={draft.education.institution} />
                <Field label="Course of study" value={draft.education.course} />
                <Field label="Year of study" value={draft.education.yearOfStudy} />
                <Field label="GPA" value={draft.education.gpa} />
              </dl>
            </div>
          )}

          <div className="my-4 border-t border-border" />

          <h3 className="mb-2 text-[14px] font-bold text-fg">Curriculum Vitae</h3>
          {draft.cvName ? (
            <p className="text-[14px] font-semibold text-accent underline underline-offset-2">
              {draft.cvName}
            </p>
          ) : (
            <p className="text-[13px] text-fg-muted">No CV uploaded.</p>
          )}
        </ReviewSection>

        {/* 3 — Availability */}
        <ReviewSection
          title="Availability"
          open={open.availability}
          onToggle={() => toggle('availability')}
        >
          <dl className="grid gap-3 sm:grid-cols-2">
            <Field
              label="Preferred Start Date of Internship"
              value={formatDisplayDate(draft.startDate)}
            />
            <Field
              label="Preferred End Date of Internship"
              value={formatDisplayDate(draft.endDate)}
            />
          </dl>
        </ReviewSection>

        {/* 4 — Additional (scholarship / credit split by rule) */}
        <ReviewSection
          title="Additional Details"
          open={open.additional}
          onToggle={() => toggle('additional')}
        >
          <div>
            <Field
              label="Are you a bonded scholarship recipient?"
              value={
                draft.bondedScholarship == null ? '—' : draft.bondedScholarship ? 'Yes' : 'No'
              }
            />
            {draft.bondedScholarship && (
              <div className="mt-3 rounded-lg bg-bg p-3">
                <Field label="Name of scholarship" value={draft.scholarshipName || '—'} />
              </div>
            )}
          </div>

          <div className="my-4 border-t border-border" />

          <div>
            <Field
              label="Will this internship be credit-bearing?"
              value={draft.creditBearing == null ? '—' : draft.creditBearing ? 'Yes' : 'No'}
            />
            {draft.creditBearing && (
              <div className="mt-3">
                <Field label="Module code" value={draft.creditModuleCode || '—'} />
              </div>
            )}
          </div>
        </ReviewSection>
      </div>
    </ApplicationFlowShell>
  );
}

function ReviewSection({
  title,
  open,
  onToggle,
  children,
}: {
  title: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-border bg-surface shadow-sm">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left md:px-5"
        aria-expanded={open}
      >
        <span className="text-[14px] font-bold text-fg">{title}</span>
        <ChevronDown
          className={cn(
            'h-4 w-4 shrink-0 text-fg-muted transition-transform',
            open && 'rotate-180',
          )}
        />
      </button>
      {open && <div className="border-t border-border px-4 py-4 md:px-5">{children}</div>}
    </section>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[12px] text-fg-muted">{label}</dt>
      <dd className="mt-0.5 text-[14px] font-semibold text-fg">{value}</dd>
    </div>
  );
}
