'use client';

/* Step 5 — Review: collapsible cards (comps).
   1 Personal (+ Contact below rule)
   2 Academic Transcript (+ CV below rule)
   3 Availability
   4 Your project ranking
   5 Additional Details (scholarship / credit split by rule) */
import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronDown } from 'lucide-react';
import ApplicationFlowShell from '@/components/apply/application-flow-shell';
import { loadApplyDraft, type ApplySessionDraft } from '@/lib/apply-application';
import { PROJECT_MATCHES } from '@/lib/apply-project-fit';
import { loadApplicantProfile, type ApplicantProfile } from '@/lib/myinfo';
import { isSignedIn } from '@/lib/session';
import { loadUtApplicantVariant } from '@/lib/ut-track';
import { cn } from '@/lib/utils';

const DIVIDER = 'rgba(231, 228, 221, 1)';

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
  const [isPolyPath, setIsPolyPath] = useState(false);
  const [open, setOpen] = useState({
    personal: true,
    transcript: true,
    availability: true,
    ranking: true,
    additional: true,
  });

  useEffect(() => {
    if (!isSignedIn()) {
      router.replace('/login');
      return;
    }
    setDraft(loadApplyDraft());
    setProfile(loadApplicantProfile());
    setIsPolyPath(loadUtApplicantVariant() === 'polytechnic');
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
      <header className="mb-5">
        <h1 className="text-[1.375rem] font-bold leading-snug tracking-tight text-fg md:text-[1.5rem]">
          Review
        </h1>
        <p className="mt-1 text-[13px] text-fg-muted">
          Almost there! One final check before submitting.
        </p>
      </header>

      <div className="space-y-3">
        {/* 1 — Personal + Contact (below rule) */}
        <ReviewSection
          title="Personal details"
          open={open.personal}
          onToggle={() => toggle('personal')}
          onEdit={() => router.push('/apply/personal-details?from=review')}
        >
          <FieldGrid
            columns={3}
            fields={[
              { label: 'Name', value: profile?.name ?? '—' },
              { label: 'NRIC', value: profile?.nric ?? '—' },
              { label: 'Nationality', value: profile?.nationality ?? '—' },
              { label: 'Sex', value: profile?.sex ?? '—' },
              { label: 'Date of Birth', value: profile?.dateOfBirth ?? '—' },
              { label: 'Race', value: profile?.race ?? '—' },
              { label: 'Photo', value: 'No photo uploaded.', fullWidth: true },
            ]}
          />

          <div className="my-4 border-t border-border" />

          <h3 className="mb-3 text-[14px] font-bold text-fg">Contact details</h3>
          <FieldGrid
            columns={3}
            fields={[
              { label: 'Mobile Number', value: profile?.mobile ?? '—' },
              { label: 'Email', value: profile?.email ?? '—' },
              {
                label: 'Registered Address',
                value: profile?.registeredAddress ?? '—',
                /* Mobile: full row under the pair; PC: third column */
                fullWidthMobile: true,
              },
            ]}
          />
        </ReviewSection>

        {/* 2 — Transcript + CV (below rule) */}
        <ReviewSection
          title="Academic Transcript"
          open={open.transcript}
          onToggle={() => toggle('transcript')}
          onEdit={() => router.push('/apply/education?from=review')}
        >
          {draft.transcriptName ? (
            <p className="text-[14px] font-semibold text-accent underline underline-offset-2">
              {draft.transcriptName}{' '}
              <span className="font-medium no-underline">uploaded</span>
            </p>
          ) : (
            <p className="text-[13px] text-fg-muted">No transcript uploaded.</p>
          )}
          {(draft.education.institution ||
            draft.education.course ||
            draft.education.yearOfStudy ||
            draft.education.gpa) && (
            <div className="mt-3 rounded-lg bg-bg p-3">
              <p className="mb-2 text-[13px] font-bold text-fg">Education details</p>
              <dl className="grid gap-y-3 sm:grid-cols-2">
                <div className="sm:pr-3">
                  <Field label="Institution" value={draft.education.institution || '—'} />
                </div>
                <div
                  className="sm:border-l sm:pl-3"
                  style={{ borderColor: DIVIDER }}
                >
                  <Field label="Course of study" value={draft.education.course || '—'} />
                </div>
                <div className="sm:pr-3">
                  <Field label="Year of study" value={draft.education.yearOfStudy || '—'} />
                </div>
                <div
                  className="sm:border-l sm:pl-3"
                  style={{ borderColor: DIVIDER }}
                >
                  <Field label="GPA" value={draft.education.gpa || '—'} />
                </div>
                {draft.education.expectedGraduation && (
                  <div className="sm:pr-3">
                    <Field
                      label="Expected Graduation"
                      value={formatDisplayDate(draft.education.expectedGraduation)}
                    />
                  </div>
                )}
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
          onEdit={() => router.push('/apply/availability?from=review')}
        >
          <dl className="grid grid-cols-1 sm:grid-cols-2">
            <div className="pb-3 sm:pb-0 sm:pr-3">
              <Field
                label="Preferred Start Date of Internship"
                value={formatDisplayDate(draft.startDate)}
              />
            </div>
            <div
              className="border-t pt-3 sm:border-l sm:border-t-0 sm:pl-3 sm:pt-0"
              style={{ borderColor: DIVIDER }}
            >
              <Field
                label="Preferred End Date of Internship"
                value={formatDisplayDate(draft.endDate)}
              />
            </div>
          </dl>
        </ReviewSection>

        {/* 4 — Project ranking */}
        <ReviewSection
          title="Your project ranking"
          open={open.ranking}
          onToggle={() => toggle('ranking')}
          onEdit={() => router.push('/apply/project-fit?phase=ranking&from=review')}
        >
          {draft.rankedProjectIds.length > 0 ? (
            <ol className="space-y-3">
              {draft.rankedProjectIds.map((id, index) => {
                const project = PROJECT_MATCHES.find((p) => p.id === id);
                return (
                  <li key={id} className="flex items-center gap-3">
                    <span
                      className="inline-flex size-6 shrink-0 items-center justify-center rounded-full"
                      style={{
                        background: 'rgba(243, 239, 229, 1)',
                        border: '1px solid rgba(231, 228, 221, 1)',
                        fontWeight: 500,
                        fontSize: 14,
                        lineHeight: '20px',
                        color: 'rgba(15, 23, 43, 1)',
                      }}
                    >
                      {index + 1}
                    </span>
                    <span className="text-[14px] font-semibold text-fg">
                      {project?.name ?? id}
                    </span>
                  </li>
                );
              })}
            </ol>
          ) : (
            <p className="text-[13px] text-fg-muted">No projects ranked yet.</p>
          )}
        </ReviewSection>

        {/* 5 — Additional (scholarship / credit split by rule) */}
        <ReviewSection
          title="Additional Details"
          open={open.additional}
          onToggle={() => toggle('additional')}
          onEdit={() => router.push('/apply/additional-details?from=review')}
        >
          {!isPolyPath && (
            <>
              <div>
                <Field
                  label="Are you a bonded scholarship recipient?"
                  value={
                    draft.bondedScholarship == null ? '—' : draft.bondedScholarship ? 'Yes' : 'No'
                  }
                />
                {draft.bondedScholarship && (
                  <div
                    className="mt-3 rounded-lg bg-transparent p-3"
                    style={{ border: `1px solid ${DIVIDER}` }}
                  >
                    <Field label="Name of scholarship" value={draft.scholarshipName || '—'} />
                  </div>
                )}
              </div>

              <div className="my-4 border-t border-border" />
            </>
          )}

          <div>
            <Field
              label="Will this internship be credit-bearing?"
              value={draft.creditBearing == null ? '—' : draft.creditBearing ? 'Yes' : 'No'}
            />
            {draft.creditBearing && (
              <div className="mt-3">
                <Field label="Remark" value={draft.creditModuleCode || '—'} />
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
  onEdit,
  children,
}: {
  title: string;
  open: boolean;
  onToggle: () => void;
  onEdit: () => void;
  children: ReactNode;
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
      {open && (
        <div className="border-t border-border px-4 py-4 md:px-5">
          {children}
          <button
            type="button"
            onClick={onEdit}
            className="box-border h-8 cursor-pointer"
            style={EDIT_BTN_STYLE}
          >
            Edit
          </button>
        </div>
      )}
    </section>
  );
}

type GridField = {
  label: string;
  value: string;
  /** Span full width on all breakpoints */
  fullWidth?: boolean;
  /** Span full width on mobile only (e.g. address under a 2-col pair) */
  fullWidthMobile?: boolean;
};

/** Mobile always 2 cols; `columns` on lg+. Vertical rules between cells in a row. */
function FieldGrid({
  fields,
  columns,
}: {
  fields: GridField[];
  /** Desktop column count (2 or 3). Mobile is always 2. */
  columns: 2 | 3;
}) {
  let mobileSlot = 0;
  let desktopSlot = 0;

  return (
    <dl
      className={cn(
        'grid grid-cols-2 gap-y-4',
        columns === 3 ? 'lg:grid-cols-3' : 'lg:grid-cols-2',
      )}
    >
      {fields.map((f, index) => {
        const full = Boolean(f.fullWidth);
        const fullMobile = Boolean(f.fullWidthMobile);

        let showMobileRule = false;
        let showDesktopRule = false;
        let isDesktopRowStart = true;
        let isMobileRowStart = true;

        if (full) {
          mobileSlot = 0;
          desktopSlot = 0;
        } else if (fullMobile) {
          /* Mobile: own row; desktop: normal cell in columns grid */
          showMobileRule = false;
          isMobileRowStart = true;
          mobileSlot = 0;
          isDesktopRowStart = desktopSlot % columns === 0;
          showDesktopRule = !isDesktopRowStart;
          desktopSlot += 1;
        } else {
          isMobileRowStart = mobileSlot % 2 === 0;
          showMobileRule = !isMobileRowStart;
          mobileSlot += 1;

          isDesktopRowStart = desktopSlot % columns === 0;
          showDesktopRule = !isDesktopRowStart;
          desktopSlot += 1;
        }

        return (
          <div
            key={`${f.label}-${index}`}
            className={cn(
              'min-w-0',
              full && 'col-span-2 pl-0 lg:col-span-full',
              fullMobile && 'col-span-2 lg:col-span-1',
              /* Mobile vertical rule + padding */
              !full && showMobileRule && 'border-l pl-3',
              !full && isMobileRowStart && 'max-lg:border-l-0 max-lg:pl-0',
              /* Desktop vertical rule + padding */
              !full && showDesktopRule && 'lg:border-l lg:pl-3',
              !full && isDesktopRowStart && 'lg:border-l-0 lg:pl-0',
            )}
            style={{ borderColor: DIVIDER }}
          >
            <Field label={f.label} value={f.value} />
          </div>
        );
      })}
    </dl>
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
