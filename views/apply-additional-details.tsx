'use client';

/* Step 5 — Additional Details.
   Polytechnic: credit-bearing only.
   Tech Up / Undergraduate: bonded scholarship + credit-bearing. */
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import ApplicationFlowShell from '@/components/apply/application-flow-shell';
import ChapterIntro from '@/components/apply/chapter-intro';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  clearChapterIntro,
  loadApplyDraft,
  peekChapterIntro,
  saveApplyDraft,
  syncApplyDraftToVariant,
  type ApplySessionDraft,
} from '@/lib/apply-application';
import { loadUtApplicantVariant } from '@/lib/ut-track';
import { isSignedIn } from '@/lib/session';
import { cn } from '@/lib/utils';

const NEST_BORDER = 'rgba(231, 228, 221, 1)';

function shouldShowSession3Intro(): boolean {
  if (typeof window === 'undefined') return false;
  const fromQuery = new URLSearchParams(window.location.search).get('intro');
  return fromQuery === 'session-3' || peekChapterIntro() === 'session-3';
}

function isFromReview(): boolean {
  if (typeof window === 'undefined') return false;
  return new URLSearchParams(window.location.search).get('from') === 'review';
}

function ynValue(v: boolean | null): string {
  if (v === true) return 'yes';
  if (v === false) return 'no';
  return '';
}

export default function ApplyAdditionalDetailsPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [showIntro, setShowIntro] = useState(false);
  const [fromReview, setFromReview] = useState(false);
  const [isPolyPath, setIsPolyPath] = useState(false);
  const [draft, setDraft] = useState<ApplySessionDraft | null>(null);

  useEffect(() => {
    if (!isSignedIn()) {
      router.replace('/login');
      return;
    }
    setFromReview(isFromReview());
    const poly = loadUtApplicantVariant() === 'polytechnic';
    setIsPolyPath(poly);
    /* Skip chapter intro when returning from Review edit */
    if (!isFromReview()) {
      setShowIntro(shouldShowSession3Intro());
    }
    const variant = loadUtApplicantVariant();
    const loaded = syncApplyDraftToVariant(loadApplyDraft(), variant);
    if (poly && loaded.bondedScholarship === null) {
      loaded.bondedScholarship = false;
      loaded.scholarshipName = '';
    }
    saveApplyDraft(loaded);
    setDraft(loaded);
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

  /* Module code is optional — Yes/No alone unlocks Next */
  const creditOk = draft.creditBearing !== null;
  const bondedOk =
    isPolyPath ||
    (draft.bondedScholarship !== null &&
      (draft.bondedScholarship !== true || draft.scholarshipName.trim().length > 0));
  const canContinue = creditOk && bondedOk;

  return (
    <ApplicationFlowShell
      stepId="additional"
      onBack={() =>
        router.push(fromReview ? '/apply/review' : '/apply/project-fit')
      }
      onContinue={() => {
        if (!canContinue) return;
        router.push('/apply/review');
      }}
      continueDisabled={!canContinue}
      continueLabel={fromReview ? 'Save' : 'Next'}
    >
      <header className="mb-5">
        <h1 className="text-[1.375rem] font-bold leading-snug tracking-tight text-fg md:text-[1.5rem]">
          Just a couple more questions
        </h1>
      </header>

      <section className="rounded-xl border border-border bg-surface p-5 shadow-sm md:p-6">
        {!isPolyPath && (
          <>
            <fieldset>
              <legend className="text-[14px] font-semibold leading-snug text-fg">
                Are you a bonded scholarship recipient?<span className="text-danger">*</span>
              </legend>
              <RadioGroup
                value={ynValue(draft.bondedScholarship)}
                onValueChange={(v) => {
                  if (v === 'yes') persist({ ...draft, bondedScholarship: true });
                  else persist({ ...draft, bondedScholarship: false, scholarshipName: '' });
                }}
                className="mt-3 grid grid-cols-2 gap-3 lg:flex lg:gap-0"
              >
                <YesNoOption id="bonded-yes" value="yes" label="Yes" />
                <YesNoOption id="bonded-no" value="no" label="No" />
              </RadioGroup>
              {draft.bondedScholarship === true && (
                <div
                  className="mt-4 max-w-md rounded-lg bg-transparent p-4 lg:mt-3"
                  style={{ border: `1px solid ${NEST_BORDER}` }}
                >
                  <label className="mb-2 block text-[13px] font-semibold text-fg lg:mb-1.5">
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

            <div className="my-6 border-t lg:my-5" style={{ borderColor: NEST_BORDER }} />
          </>
        )}

        <fieldset>
          <legend className="text-[14px] font-semibold leading-snug text-fg">
            Will this internship be credit-bearing?<span className="text-danger">*</span>
          </legend>
          <RadioGroup
            value={ynValue(draft.creditBearing)}
            onValueChange={(v) => {
              if (v === 'yes') persist({ ...draft, creditBearing: true });
              else persist({ ...draft, creditBearing: false, creditModuleCode: '' });
            }}
            className="mt-3 grid grid-cols-2 gap-3 lg:flex lg:gap-0"
          >
            <YesNoOption id="credit-yes" value="yes" label="Yes" />
            <YesNoOption id="credit-no" value="no" label="No" />
          </RadioGroup>
          {draft.creditBearing === true && (
            <div className="mt-4 max-w-md lg:mt-3">
              <Input
                value={draft.creditModuleCode}
                onChange={(e) => persist({ ...draft, creditModuleCode: e.target.value })}
                placeholder="Share any relevant school requirements (Optional)"
                className="h-10 rounded-md"
              />
            </div>
          )}
        </fieldset>
      </section>
    </ApplicationFlowShell>
  );
}

function YesNoOption({
  id,
  value,
  label,
}: {
  id: string;
  value: string;
  label: string;
}) {
  return (
    <div
      className={cn('flex items-center gap-2', 'max-lg:min-w-0', 'lg:w-[188px] lg:shrink-0')}
    >
      <RadioGroupItem id={id} value={value} />
      <Label htmlFor={id} className="cursor-pointer text-[14px] font-normal text-fg">
        {label}
      </Label>
    </div>
  );
}
