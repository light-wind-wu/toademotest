'use client';

/* Education step — upload transcript + CV; transcript unlocks editable details. */
import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Upload } from 'lucide-react';
import ApplicationFlowShell from '@/components/apply/application-flow-shell';
import ChapterIntro from '@/components/apply/chapter-intro';
import DatePicker from '@/components/ui-legacy/date-picker';
import { Input } from '@/components/ui/input';
import {
  clearChapterIntro,
  defaultEducationDetails,
  emptyEducationDetails,
  loadApplyDraft,
  peekChapterIntro,
  saveApplyDraft,
  syncApplyDraftToVariant,
  type ApplySessionDraft,
  type EducationDetails,
} from '@/lib/apply-application';
import { loadUtApplicantVariant } from '@/lib/ut-track';
import { isSignedIn } from '@/lib/session';

function shouldShowSession1Intro(): boolean {
  if (typeof window === 'undefined') return false;
  const fromQuery = new URLSearchParams(window.location.search).get('intro');
  return fromQuery === 'session-1' || peekChapterIntro() === 'session-1';
}

function isFromReview(): boolean {
  if (typeof window === 'undefined') return false;
  return new URLSearchParams(window.location.search).get('from') === 'review';
}

/** Required education fields must be non-empty before Next / Save. */
function isEducationFilled(
  education: EducationDetails,
  isPolyPath: boolean,
): boolean {
  const required = [
    education.institution,
    education.course,
    education.yearOfStudy,
    education.gpa,
  ];
  if (!required.every((v) => String(v ?? '').trim().length > 0)) return false;
  if (isPolyPath) return true;
  return String(education.expectedGraduation ?? '').trim().length > 0;
}

export default function ApplyEducationPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [showIntro, setShowIntro] = useState(false);
  const [fromReview, setFromReview] = useState(false);
  const [draft, setDraft] = useState<ApplySessionDraft | null>(null);
  const [manualEntry, setManualEntry] = useState(false);
  const [isPolyPath, setIsPolyPath] = useState(false);
  const transcriptRef = useRef<HTMLInputElement>(null);
  const cvRef = useRef<HTMLInputElement>(null);
  const introStarted = useRef(false);

  useEffect(() => {
    if (!isSignedIn()) {
      router.replace('/login');
      return;
    }
    const from = isFromReview();
    setFromReview(from);
    const variant = loadUtApplicantVariant();
    setIsPolyPath(variant === 'polytechnic');
    /* Peek only — do not clear here (Strict Mode remount would skip the card). */
    if (!introStarted.current && !from) {
      introStarted.current = shouldShowSession1Intro();
      setShowIntro(introStarted.current);
    }
    /* Keep form values aligned with catalog applicant path — never wipe education. */
    const synced = syncApplyDraftToVariant(loadApplyDraft(), variant);
    saveApplyDraft(synced);
    setDraft(synced);
    /* Restore manual panel: saved flag, inferred fields, or Edit-from-review without upload. */
    setManualEntry(
      Boolean(synced.educationManual) ||
        (!synced.transcriptName && from),
    );
    setReady(true);
  }, [router]);

  const persist = useCallback((next: ApplySessionDraft) => {
    setDraft(next);
    saveApplyDraft(next);
  }, []);

  const patchEducation = useCallback((patch: Partial<EducationDetails>) => {
    setDraft((prev) => {
      if (!prev) return prev;
      const next: ApplySessionDraft = {
        ...prev,
        educationManual: prev.educationManual || !prev.transcriptName,
        education: { ...prev.education, ...patch },
      };
      saveApplyDraft(next);
      return next;
    });
  }, []);

  const onIntroDone = useCallback(() => {
    clearChapterIntro();
    introStarted.current = false;
    setShowIntro(false);
    router.replace('/apply/education', { scroll: false });
  }, [router]);

  if (!ready || !draft) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg text-body-sm text-fg-muted">
        Loading…
      </div>
    );
  }

  if (showIntro) {
    return (
      <>
        {/* Page chrome stays on bg-bg; intro is a full-stage scrim (same token as Myinfo). */}
        <ApplicationFlowShell stepId="education" hideFooter chapterMode>
          <div className="min-h-[50vh]" aria-hidden />
        </ApplicationFlowShell>
        <ChapterIntro session="session-1" onDone={onIntroDone} />
      </>
    );
  }

  const hasTranscript = Boolean(draft.transcriptName);
  const showEducationDetails = hasTranscript || manualEntry || draft.educationManual;
  const educationReady = isEducationFilled(draft.education, isPolyPath);
  const canContinue = showEducationDetails && educationReady;

  function handleFileUpload(kind: 'transcript' | 'cv', file?: File | null) {
    if (!file) return;
    const variant = loadUtApplicantVariant();
    if (kind === 'transcript') {
      setManualEntry(false);
      persist({
        ...draft!,
        transcriptName: file.name,
        educationManual: false,
        /* Demo: selecting a file fills the preset education details. */
        education: defaultEducationDetails(variant),
      });
    } else {
      persist({ ...draft!, cvName: file.name });
    }
  }

  function enterDetailsManually() {
    setManualEntry(true);
    /* First time into manual mode: start blank. Returning: keep saved values. */
    const keepExisting =
      draft!.educationManual ||
      [
        draft!.education.institution,
        draft!.education.course,
        draft!.education.yearOfStudy,
        draft!.education.gpa,
        draft!.education.expectedGraduation,
      ].some((v) => String(v ?? '').trim().length > 0);
    persist({
      ...draft!,
      transcriptName: '',
      educationManual: true,
      education: keepExisting
        ? draft!.education
        : emptyEducationDetails(loadUtApplicantVariant()),
    });
    if (transcriptRef.current) transcriptRef.current.value = '';
  }

  /** Open the native file picker (same pattern as B-end uploads). */
  function handleZoneClick(kind: 'transcript' | 'cv') {
    (kind === 'transcript' ? transcriptRef : cvRef).current?.click();
  }

  return (
    <ApplicationFlowShell
      stepId="education"
      onBack={() =>
        router.push(fromReview ? '/apply/review' : '/apply/personal-details')
      }
      onContinue={() => {
        if (!canContinue || !draft) return;
        /* Flush latest draft (incl. educationManual) before leaving. */
        saveApplyDraft({
          ...draft,
          educationManual: !draft.transcriptName,
        });
        router.push(fromReview ? '/apply/review' : '/apply/availability');
      }}
      continueDisabled={!canContinue}
      continueLabel={fromReview ? 'Save' : 'Next'}
    >
      <header style={{ marginBottom: 24 }}>
        <h1
          style={{
            fontWeight: 600,
            fontSize: 24,
            lineHeight: '28.8px',
            letterSpacing: -0.48,
            color: 'rgba(10, 22, 40, 1)',
          }}
        >
          Tell us about your education
        </h1>
        <p
          style={{
            marginTop: 4,
            fontWeight: 400,
            fontSize: 14,
            lineHeight: '100%',
            color: 'rgba(74, 85, 104, 1)',
          }}
        >
          Upload your academic transcript and CV
        </p>
      </header>

      <div className="flex flex-col" style={{ gap: 24 }}>
        {/* Academic Transcript */}
        <section
          className="bg-white"
          style={{
            padding: 24,
            borderRadius: 8,
            border: '1px solid rgba(231, 228, 221, 1)',
          }}
        >
          <h2
            className="mb-4"
            style={{
              fontWeight: 600,
              fontSize: 18,
              lineHeight: '18px',
              letterSpacing: -0.45,
              color: 'rgba(15, 23, 43, 1)',
            }}
          >
            Academic Transcript <span className="text-danger">*</span>
          </h2>

          <input
            ref={transcriptRef}
            type="file"
            accept=".pdf,.doc,.docx"
            className="sr-only"
            onChange={(e) => {
              handleFileUpload('transcript', e.target.files?.[0]);
              e.target.value = '';
            }}
          />

          <UploadZone onActivate={() => handleZoneClick('transcript')}>
            {hasTranscript ? (
              <UploadedFile name={draft.transcriptName} showUploadedLabel />
            ) : (
              <EmptyUpload hint="Click to upload your academic transcript" />
            )}
          </UploadZone>

          {!hasTranscript && !manualEntry && !draft.educationManual && (
            <button
              type="button"
              onClick={enterDetailsManually}
              className="mt-3 w-full cursor-pointer text-center text-[14px] font-medium leading-5 hover:underline"
              style={{ color: 'rgba(26, 101, 248, 1)' }}
            >
              Don&apos;t Want To Upload? Enter Details Manually
            </button>
          )}

          {showEducationDetails && (
            <div
              className="mt-4 p-4 max-sm:p-6"
              style={{
                borderRadius: 8,
                background: 'rgba(249, 248, 244, 1)',
              }}
            >
              <h3
                className="mb-3 max-sm:mb-6"
                style={{
                  fontWeight: 600,
                  fontSize: 16,
                  lineHeight: '16px',
                  color: 'rgba(10, 22, 40, 1)',
                }}
              >
                Check your education details
              </h3>
              <div className="grid gap-x-3 gap-y-4 sm:grid-cols-2">
                <Field
                  label="Institution"
                  value={draft.education.institution}
                  onChange={(v) => patchEducation({ institution: v })}
                />
                <Field
                  label="Course of study"
                  value={draft.education.course}
                  onChange={(v) => patchEducation({ course: v })}
                />
                <Field
                  label="Year of study"
                  value={draft.education.yearOfStudy}
                  onChange={(v) => patchEducation({ yearOfStudy: v })}
                />
                <Field
                  label="GPA"
                  value={draft.education.gpa}
                  onChange={(v) => patchEducation({ gpa: v })}
                />
                {!isPolyPath && (
                  <div>
                    <label
                      className="block"
                      style={{
                        marginBottom: 6,
                        fontWeight: 500,
                        fontSize: 14,
                        lineHeight: '14px',
                        color: 'rgba(15, 23, 43, 1)',
                      }}
                    >
                      Expected Graduation
                    </label>
                    <DatePicker
                      value={draft.education.expectedGraduation || ''}
                      onChange={(v) => patchEducation({ expectedGraduation: v })}
                      placeholder="Select date"
                    />
                  </div>
                )}
              </div>
            </div>
          )}
        </section>

        {/* CV */}
        <section
          className="bg-white"
          style={{
            padding: 24,
            borderRadius: 8,
            border: '1px solid rgba(231, 228, 221, 1)',
          }}
        >
          <h2
            className="mb-4"
            style={{
              fontWeight: 600,
              fontSize: 18,
              lineHeight: '18px',
              letterSpacing: -0.45,
              color: 'rgba(15, 23, 43, 1)',
            }}
          >
            Curriculum Vitae
          </h2>
          <input
            ref={cvRef}
            type="file"
            accept=".pdf,.doc,.docx"
            className="sr-only"
            onChange={(e) => {
              handleFileUpload('cv', e.target.files?.[0]);
              e.target.value = '';
            }}
          />
          <UploadZone onActivate={() => handleZoneClick('cv')}>
            {draft.cvName ? (
              <UploadedFile name={draft.cvName} />
            ) : (
              <EmptyUpload hint="Click to upload your curriculum vitae" />
            )}
          </UploadZone>
        </section>
      </div>
    </ApplicationFlowShell>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label
        className="block"
        style={{
          marginBottom: 6,
          fontWeight: 500,
          fontSize: 14,
          lineHeight: '14px',
          color: 'rgba(15, 23, 43, 1)',
        }}
      >
        {label}
      </label>
      <Input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 rounded-md bg-white"
        style={{
          fontWeight: 400,
          fontSize: 14,
          lineHeight: '14px',
          color: 'rgba(15, 23, 42, 1)',
        }}
      />
    </div>
  );
}

function UploadZone({
  children,
  onActivate,
}: {
  children: React.ReactNode;
  onActivate: () => void;
}) {
  return (
    <div
      className="w-full"
      style={{
        borderRadius: 8,
        borderWidth: 1,
        borderStyle: 'dashed',
        borderColor: 'rgba(231, 228, 221, 1)',
      }}
    >
      <button
        type="button"
        onClick={onActivate}
        className="flex min-h-[156px] w-full flex-col items-center justify-center px-4 py-6 text-center transition-colors hover:bg-[rgba(249,248,244,0.8)]"
        style={{ borderRadius: 8 }}
      >
        {children}
      </button>
    </div>
  );
}

function EmptyUpload({ hint }: { hint: string }) {
  return (
    <>
      <span className="inline-flex size-12 items-center justify-center rounded-full bg-bg-muted text-fg-muted">
        <Upload className="h-6 w-6" strokeWidth={1.5} />
      </span>
      <span
        className="text-[14px] font-semibold text-fg"
        style={{ marginTop: 16 }}
      >
        {hint}
      </span>
      <span className="text-[12px] text-fg-muted">PDF, DOC or DOCX · up to 10MB</span>
    </>
  );
}

function UploadedFile({
  name,
  showUploadedLabel,
}: {
  name: string;
  showUploadedLabel?: boolean;
}) {
  return (
    <>
      <span className="inline-flex size-12 items-center justify-center rounded-full bg-bg-muted text-fg-muted">
        <Upload className="h-6 w-6" strokeWidth={1.5} />
      </span>
      <span
        className="flex max-w-full flex-col items-center gap-0.5 sm:inline-flex sm:flex-row sm:items-baseline sm:gap-x-1.5"
        style={{
          marginTop: 16,
          fontWeight: 600,
          fontSize: 14,
          lineHeight: '20px',
          color: 'rgba(26, 101, 248, 1)',
        }}
      >
        <span className="max-w-full break-all text-center underline underline-offset-2 sm:truncate">
          {name}
        </span>
        {showUploadedLabel && <span>uploaded</span>}
      </span>
    </>
  );
}
