'use client';

/* Education step — upload transcript + CV; transcript unlocks editable details. */
import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CloudUpload, Upload } from 'lucide-react';
import ApplicationFlowShell from '@/components/apply/application-flow-shell';
import ChapterIntro from '@/components/apply/chapter-intro';
import { Input } from '@/components/ui/input';
import {
  clearChapterIntro,
  defaultEducationDetails,
  loadApplyDraft,
  peekChapterIntro,
  saveApplyDraft,
  type ApplySessionDraft,
  type EducationDetails,
} from '@/lib/apply-application';
import { isSignedIn } from '@/lib/session';
import { cn } from '@/lib/utils';

const MOCK_TRANSCRIPT = 'Chen_academic transcript.pdf';
const MOCK_CV = 'Chen1230_CV2026.pdf';

function shouldShowSession1Intro(): boolean {
  if (typeof window === 'undefined') return false;
  const fromQuery = new URLSearchParams(window.location.search).get('intro');
  return fromQuery === 'session-1' || peekChapterIntro() === 'session-1';
}

export default function ApplyEducationPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [showIntro, setShowIntro] = useState(false);
  const [draft, setDraft] = useState<ApplySessionDraft | null>(null);
  const transcriptRef = useRef<HTMLInputElement>(null);
  const cvRef = useRef<HTMLInputElement>(null);
  const introStarted = useRef(false);

  useEffect(() => {
    if (!isSignedIn()) {
      router.replace('/login');
      return;
    }
    /* Peek only — do not clear here (Strict Mode remount would skip the card). */
    if (!introStarted.current) {
      introStarted.current = shouldShowSession1Intro();
      setShowIntro(introStarted.current);
    }
    setDraft(loadApplyDraft());
    setReady(true);
  }, [router]);

  const persist = useCallback((next: ApplySessionDraft) => {
    setDraft(next);
    saveApplyDraft(next);
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

  function mockUpload(kind: 'transcript' | 'cv', file?: File | null) {
    const name =
      file?.name || (kind === 'transcript' ? MOCK_TRANSCRIPT : MOCK_CV);
    if (kind === 'transcript') {
      persist({
        ...draft!,
        transcriptName: name,
        education: defaultEducationDetails(),
      });
    } else {
      persist({ ...draft!, cvName: name });
    }
  }

  /** Demo: empty zone click seeds mock file (comps). File picker still available to override. */
  function handleZoneClick(kind: 'transcript' | 'cv') {
    if (kind === 'transcript' && !draft!.transcriptName) {
      mockUpload('transcript');
      return;
    }
    if (kind === 'cv' && !draft!.cvName) {
      mockUpload('cv');
      return;
    }
    (kind === 'transcript' ? transcriptRef : cvRef).current?.click();
  }

  function updateEducation(patch: Partial<EducationDetails>) {
    persist({ ...draft!, education: { ...draft!.education, ...patch } });
  }

  return (
    <ApplicationFlowShell
      stepId="education"
      onBack={() => router.push('/apply/dashboard')}
      onContinue={() => {
        if (!draft.transcriptName) return;
        router.push('/apply/availability');
      }}
      continueDisabled={!draft.transcriptName}
    >
      <header className="relative mb-5 pr-14 lg:mb-6 lg:pr-24">
        <h1 className="text-[1.375rem] font-bold leading-snug tracking-tight text-fg md:text-[1.5rem]">
          Tell us about your education
        </h1>
        <p className="mt-1 text-[13px] text-fg-muted">
          Upload your academic transcript and CV
        </p>
        <UploadHeroIcon className="absolute right-0 top-0 hidden sm:block" />
      </header>

      <div className="space-y-5">
        {/* Academic Transcript */}
        <section className="rounded-xl border border-border bg-surface p-4 shadow-sm md:p-5">
          <h2 className="mb-3 text-[13px] font-bold text-fg">
            Academic Transcript <span className="text-danger">*</span>
          </h2>

          <input
            ref={transcriptRef}
            type="file"
            accept=".pdf,.doc,.docx"
            className="sr-only"
            onChange={(e) => mockUpload('transcript', e.target.files?.[0])}
          />

          <UploadZone onActivate={() => handleZoneClick('transcript')}>
            {hasTranscript ? (
              <UploadedFile name={draft.transcriptName} showUploadedLabel />
            ) : (
              <EmptyUpload hint="Click to upload your academic transcript" />
            )}
          </UploadZone>

          {hasTranscript && (
            <div className="mt-4 rounded-xl border border-border bg-bg p-4 md:p-5">
              <h3 className="mb-3 text-[13px] font-bold text-fg">
                Check your education details
              </h3>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field
                  label="Institution"
                  value={draft.education.institution}
                  onChange={(v) => updateEducation({ institution: v })}
                />
                <Field
                  label="Course of study"
                  value={draft.education.course}
                  onChange={(v) => updateEducation({ course: v })}
                />
                <Field
                  label="Year of study"
                  value={draft.education.yearOfStudy}
                  onChange={(v) => updateEducation({ yearOfStudy: v })}
                />
                <Field
                  label="GPA"
                  value={draft.education.gpa}
                  onChange={(v) => updateEducation({ gpa: v })}
                />
              </div>
            </div>
          )}
        </section>

        {/* CV */}
        <section className="rounded-xl border border-border bg-surface p-4 shadow-sm md:p-5">
          <h2 className="mb-3 text-[13px] font-bold text-fg">Curriculum Vitae</h2>
          <input
            ref={cvRef}
            type="file"
            accept=".pdf,.doc,.docx"
            className="sr-only"
            onChange={(e) => mockUpload('cv', e.target.files?.[0])}
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
      <label className="mb-1.5 block text-[13px] font-semibold text-fg">
        {label}
      </label>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 rounded-lg bg-surface"
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
    <button
      type="button"
      onClick={onActivate}
      className={cn(
        'flex w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border-strong',
        'bg-bg/40 px-4 py-8 text-center transition-colors hover:bg-bg-subtle',
      )}
    >
      {children}
    </button>
  );
}

function EmptyUpload({ hint }: { hint: string }) {
  return (
    <>
      <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-bg-muted text-fg-muted">
        <Upload className="h-5 w-5" strokeWidth={1.5} />
      </span>
      <span className="text-[14px] font-semibold text-fg">{hint}</span>
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
      <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-bg-muted text-fg-muted">
        <Upload className="h-5 w-5" strokeWidth={1.5} />
      </span>
      <span className="flex flex-col items-center gap-0.5">
        <span className="text-[14px] font-semibold text-accent underline underline-offset-2">
          {name}
        </span>
        {showUploadedLabel && (
          <span className="text-[12px] font-medium text-accent">uploaded</span>
        )}
      </span>
    </>
  );
}

function UploadHeroIcon({ className }: { className?: string }) {
  return (
    <div className={cn('text-accent/80', className)} aria-hidden>
      <CloudUpload className="h-12 w-12 md:h-14 md:w-14" strokeWidth={1.25} />
    </div>
  );
}
