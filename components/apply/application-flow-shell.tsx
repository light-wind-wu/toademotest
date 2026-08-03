'use client';

/* Shared C-end application chrome: topbar + PC vertical stepper + mobile
   step chip + sticky footer actions. */
import { type ReactNode } from 'react';
import { Check } from 'lucide-react';
import ApplicantChrome from '@/components/apply/applicant-chrome';
import { Button } from '@/components/ui/button';
import {
  APPLICATION_STEPS,
  type ApplicationStepId,
} from '@/lib/apply-application';
import { cn } from '@/lib/utils';

export default function ApplicationFlowShell({
  stepId,
  children,
  onBack,
  onContinue,
  continueLabel = 'Continue',
  continueDisabled,
  hideFooter,
  chapterMode,
  /** Fit content to one viewport — no page-level scroll (e.g. ranking). */
  lockViewport,
}: {
  stepId: ApplicationStepId;
  children: ReactNode;
  onBack?: () => void;
  onContinue?: () => void;
  continueLabel?: string;
  continueDisabled?: boolean;
  hideFooter?: boolean;
  /** Hide steppers — session chapter intro card fills the stage. */
  chapterMode?: boolean;
  lockViewport?: boolean;
}) {
  const activeIndex = APPLICATION_STEPS.findIndex((s) => s.id === stepId);
  const mobile = APPLICATION_STEPS[activeIndex] ?? APPLICATION_STEPS[0];

  return (
    <ApplicantChrome
      className={cn('bg-bg', lockViewport && 'h-dvh max-h-dvh min-h-0 overflow-hidden')}
    >
      <div
        className={cn(
          'mx-auto flex w-full max-w-[1200px] flex-1 flex-col px-4 lg:px-8',
          lockViewport ? 'min-h-0 overflow-hidden pt-4 pb-4 lg:pt-5 lg:pb-5' : 'pt-6 lg:pt-10',
          !lockViewport && 'pb-10',
        )}
      >
        <div
          className={cn(
            'grid min-h-0 flex-1 gap-6',
            lockViewport ? 'items-stretch overflow-hidden' : 'items-start',
            !chapterMode && 'lg:grid-cols-[168px_minmax(0,1fr)] lg:gap-12',
          )}
        >
          {!chapterMode && (
            <aside className={cn('hidden lg:block', lockViewport && 'min-h-0 overflow-hidden')}>
              <ol
                className={cn(
                  'flex flex-col',
                  lockViewport ? 'h-full max-h-full' : 'min-h-[28rem]',
                )}
                aria-label="Application steps"
              >
                {APPLICATION_STEPS.map((step, i) => {
                  const done = i < activeIndex;
                  const active = i === activeIndex;
                  const isLast = i === APPLICATION_STEPS.length - 1;
                  return (
                    <li key={step.id} className={cn('flex flex-col', !isLast && 'min-h-0 flex-1')}>
                      <div className="flex items-center gap-2.5">
                        <span
                          className={cn(
                            'relative z-[1] inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold',
                            (done || active) && 'bg-accent text-accent-fg',
                            !done && !active && 'border border-border-strong bg-surface text-fg-muted',
                          )}
                        >
                          {done ? <Check className="h-3 w-3" strokeWidth={2.5} /> : i + 1}
                        </span>
                        <p
                          className={cn(
                            'max-w-[7.25rem] text-[13px] font-normal leading-snug',
                            active || done ? 'text-fg' : 'text-fg-muted',
                          )}
                        >
                          {step.labelLines ? (
                            <>
                              {step.labelLines[0]}
                              <br />
                              {step.labelLines[1]}
                            </>
                          ) : (
                            step.label
                          )}
                        </p>
                      </div>
                      {!isLast && (
                        <span
                          className={cn(
                            'ml-[11px] mt-1.5 mb-1.5 w-[2px] min-h-[1.5rem] flex-1 rounded-full',
                            done ? 'bg-accent' : 'bg-border-strong',
                          )}
                          aria-hidden
                        />
                      )}
                    </li>
                  );
                })}
              </ol>
            </aside>
          )}

          <div className={cn('min-w-0', lockViewport && 'flex min-h-0 flex-col overflow-hidden')}>
            {!chapterMode && (
              <div
                className={cn(
                  'flex items-center gap-2.5 lg:hidden',
                  lockViewport ? 'mb-3 shrink-0' : 'mb-5',
                )}
              >
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-accent text-[13px] font-bold text-accent-fg">
                  {activeIndex + 1}
                </span>
                <span className="text-[14px] font-normal text-fg">{mobile.mobileLabel}</span>
              </div>
            )}

            <div className={cn(lockViewport && 'min-h-0 flex-1 overflow-hidden')}>{children}</div>

            {!hideFooter && (
              <div className="mt-[18px] flex justify-end gap-2 lg:mt-3">
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-md bg-surface"
                  onClick={onBack}
                  disabled={!onBack}
                >
                  Back
                </Button>
                <Button
                  type="button"
                  className="rounded-md font-semibold"
                  onClick={onContinue}
                  disabled={continueDisabled || !onContinue}
                >
                  {continueLabel}
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </ApplicantChrome>
  );
}
