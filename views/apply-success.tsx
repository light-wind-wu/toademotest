'use client';

/* Submission success — with optional defender archetype when quiz was taken.
   “Back to HOME” → /apply/dashboard; Track shows an inline prompt (no jump). */
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import ApplicantChrome from '@/components/apply/applicant-chrome';
import { Button } from '@/components/ui/button';
import { Toast, useToast } from '@/components/ui-legacy/toast';
import { loadApplyDraft } from '@/lib/apply-application';
import { resolveArchetype } from '@/lib/apply-project-fit';
import { isSignedIn } from '@/lib/session';

const TRACK_PROMPT =
  'Application status: Submitted. A confirmation email will arrive shortly.';

export default function ApplySuccessPage() {
  const router = useRouter();
  const { toast, showToast } = useToast();
  const [ready, setReady] = useState(false);
  const [quizTaken, setQuizTaken] = useState(false);
  const [programmeTitle, setProgrammeTitle] = useState('Polytechnic Internship 2027');
  const [answers, setAnswers] = useState<(number | null)[]>([]);
  const [statusHint, setStatusHint] = useState(false);

  useEffect(() => {
    if (!isSignedIn()) {
      router.replace('/login');
      return;
    }
    const d = loadApplyDraft();
    setQuizTaken(d.quizTaken);
    setProgrammeTitle(d.programmeTitle || 'Polytechnic Internship 2027');
    setAnswers(d.quizAnswers);
    setReady(true);
  }, [router]);

  const archetype = useMemo(
    () => (quizTaken ? resolveArchetype(answers) : null),
    [quizTaken, answers],
  );

  function showTrackPrompt() {
    setStatusHint(true);
    showToast(TRACK_PROMPT, 'info', 'Track application');
  }

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg text-body-sm text-fg-muted">
        Loading…
      </div>
    );
  }

  return (
    <ApplicantChrome className="bg-bg">
      <div className="mx-auto flex min-h-[calc(100dvh-3.5rem)] w-full max-w-[640px] flex-col justify-center px-4 py-10 lg:px-8">
        <section className="relative rounded-2xl border border-border bg-surface p-6 pt-8 shadow-sm md:p-8">
          <h1 className="text-[1.5rem] font-bold tracking-tight text-fg md:text-[1.75rem]">
            Submission successful
          </h1>
          <p className="mt-3 text-[14px] leading-relaxed text-fg-muted">
            Thank you for your submission. Your application to{' '}
            <button
              type="button"
              onClick={showTrackPrompt}
              className="font-semibold text-accent hover:underline"
            >
              {programmeTitle}
            </button>{' '}
            has been received. You will receive a confirmation email within the next few minutes.
          </p>

          {archetype && (
            <div className="mt-6">
              <p className="text-[13px] font-semibold text-fg">Your defender archetype</p>
              <div className="mt-2 rounded-xl bg-accent/10 px-4 py-3">
                <p className="text-[15px] font-bold text-accent">{archetype.name}</p>
                <p className="mt-0.5 text-[13px] text-accent/90">{archetype.tagline}</p>
              </div>
            </div>
          )}
        </section>

        <div className="mt-[18px] flex flex-col items-end gap-2 lg:mt-3">
          <div className="flex flex-wrap justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              className="rounded-md bg-surface"
              onClick={() => router.push('/apply/dashboard')}
              >
              Back to HOME
            </Button>
            <Button
              type="button"
              className="rounded-md font-semibold"
              onClick={showTrackPrompt}
            >
              Track My Application
            </Button>
          </div>
          {statusHint && (
            <p className="w-full max-w-full text-left text-[12px] leading-snug text-warning break-words">
              {TRACK_PROMPT}
            </p>
          )}
        </div>
      </div>
      <Toast message={toast} />
    </ApplicantChrome>
  );
}
