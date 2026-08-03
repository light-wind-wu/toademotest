'use client';

/* Step 4 — Additional Details (bonded scholarship + credit-bearing). */
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { HelpCircle } from 'lucide-react';
import ApplicationFlowShell from '@/components/apply/application-flow-shell';
import ChapterIntro from '@/components/apply/chapter-intro';
import { Input } from '@/components/ui/input';
import {
  clearChapterIntro,
  loadApplyDraft,
  peekChapterIntro,
  saveApplyDraft,
  type ApplySessionDraft,
} from '@/lib/apply-application';
import { isSignedIn } from '@/lib/session';
import { cn } from '@/lib/utils';

function shouldShowSession3Intro(): boolean {
  if (typeof window === 'undefined') return false;
  const fromQuery = new URLSearchParams(window.location.search).get('intro');
  return fromQuery === 'session-3' || peekChapterIntro() === 'session-3';
}

export default function ApplyAdditionalDetailsPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [showIntro, setShowIntro] = useState(false);
  const [draft, setDraft] = useState<ApplySessionDraft | null>(null);

  useEffect(() => {
    if (!isSignedIn()) {
      router.replace('/login');
      return;
    }
    setShowIntro(shouldShowSession3Intro());
    setDraft(loadApplyDraft());
    setReady(true);
  }, [router]);

  const persist = useCallback((next: ApplySessionDraft) => {
    setDraft(next);
    saveApplyDraft(next);
  }, []);

  const onIntroDone = useCallback(() => {
    clearChapterIntro();
    setShowIntro(false);
    router.replace('/apply/additional-details', { scroll: false });
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
        <ApplicationFlowShell stepId="additional" hideFooter chapterMode>
          <div className="min-h-[50vh]" aria-hidden />
        </ApplicationFlowShell>
        <ChapterIntro session="session-3" onDone={onIntroDone} />
      </>
    );
  }

  const canContinue =
    draft.bondedScholarship !== null &&
    draft.creditBearing !== null &&
    (draft.bondedScholarship !== true || draft.scholarshipName.trim().length > 0) &&
    (draft.creditBearing !== true || draft.creditModuleCode.trim().length > 0);

  return (
    <ApplicationFlowShell
      stepId="additional"
      onBack={() => router.push('/apply/project-fit')}
      onContinue={() => {
        if (!canContinue) return;
        router.push('/apply/review');
      }}
      continueDisabled={!canContinue}
    >
      <header className="relative mb-5 pr-16">
        <h1 className="text-[1.375rem] font-bold leading-snug tracking-tight text-fg md:text-[1.5rem]">
          Just a couple more questions
        </h1>
        <HelpCircle
          className="absolute right-0 top-0 hidden h-12 w-12 text-accent/50 sm:block"
          strokeWidth={1.25}
          aria-hidden
        />
      </header>

      <section className="rounded-xl border border-border bg-surface p-4 shadow-sm md:p-6">
        <fieldset>
          <legend className="text-[14px] font-semibold text-fg">
            Are you a bonded scholarship recipient?<span className="text-danger">*</span>
          </legend>
          <div className="mt-3 flex gap-6">
            <RadioOption
              name="bonded"
              label="Yes"
              checked={draft.bondedScholarship === true}
              onChange={() => persist({ ...draft, bondedScholarship: true })}
            />
            <RadioOption
              name="bonded"
              label="No"
              checked={draft.bondedScholarship === false}
              onChange={() =>
                persist({ ...draft, bondedScholarship: false, scholarshipName: '' })
              }
            />
          </div>
          {draft.bondedScholarship === true && (
            <div className="mt-3 max-w-md">
              <label className="mb-1.5 block text-[13px] font-semibold text-fg">
                If yes, please provide the name of the scholarship.
              </label>
              <Input
                value={draft.scholarshipName}
                onChange={(e) => persist({ ...draft, scholarshipName: e.target.value })}
                placeholder="Name of the scholarship"
                className="h-10 rounded-md"
              />
            </div>
          )}
        </fieldset>

        <div className="my-5 border-t border-border" />

        <fieldset>
          <legend className="text-[14px] font-semibold text-fg">
            Will this internship be credit-bearing?<span className="text-danger">*</span>
          </legend>
          <div className="mt-3 flex gap-6">
            <RadioOption
              name="credit"
              label="Yes"
              checked={draft.creditBearing === true}
              onChange={() => persist({ ...draft, creditBearing: true })}
            />
            <RadioOption
              name="credit"
              label="No"
              checked={draft.creditBearing === false}
              onChange={() =>
                persist({ ...draft, creditBearing: false, creditModuleCode: '' })
              }
            />
          </div>
          {draft.creditBearing === true && (
            <div className="mt-3 max-w-md">
              <Input
                value={draft.creditModuleCode}
                onChange={(e) => persist({ ...draft, creditModuleCode: e.target.value })}
                placeholder="e.g. INTR3001"
                className="h-10 rounded-md"
              />
            </div>
          )}
        </fieldset>
      </section>
    </ApplicationFlowShell>
  );
}

function RadioOption({
  name,
  label,
  checked,
  onChange,
}: {
  name: string;
  label: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <label className="inline-flex cursor-pointer items-center gap-2 text-[14px] text-fg">
      <input
        type="radio"
        name={name}
        checked={checked}
        onChange={onChange}
        className="h-4 w-4 accent-[var(--prizm-color-accent)]"
      />
      <span className={cn(checked && 'font-semibold')}>{label}</span>
    </label>
  );
}
