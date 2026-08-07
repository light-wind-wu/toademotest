'use client';

/* Shared C-end application chrome: topbar + PC vertical stepper + mobile
   horizontal stepper + fixed bottom actions (same pattern as project-fit). */
import { type ReactNode } from 'react';
import Image from 'next/image';
import ApplicantChrome from '@/components/apply/applicant-chrome';
import {
  APPLICATION_STEPS,
  type ApplicationStepId,
} from '@/lib/apply-application';
import { cn } from '@/lib/utils';

const SIDEBAR_BORDER = 'rgba(230, 225, 216, 1)';
const ACTIVE_BG = 'rgba(27, 101, 248, 1)';
const PENDING_BG = 'rgba(231, 228, 221, 1)';
const PENDING_BORDER = 'rgba(231, 228, 221, 1)';
const PENDING_NUM = 'rgba(98, 116, 142, 1)';
const LABEL_DONE = 'rgba(0, 0, 0, 0.87)';
const LABEL_PENDING = 'rgba(74, 85, 104, 1)';
const LINE_DONE = 'rgba(69, 85, 108, 1)';
const LINE_PENDING = 'rgba(163, 163, 163, 1)';

function StepBadge({
  index,
  done,
  active,
}: {
  index: number;
  done: boolean;
  active: boolean;
}) {
  if (done) {
    return (
      <Image
        src="/images/step-complete.svg"
        alt=""
        width={24}
        height={24}
        className="size-6 shrink-0"
      />
    );
  }
  if (active) {
    return (
      <span
        className="inline-flex size-6 shrink-0 items-center justify-center rounded-full text-white"
        style={{
          background: ACTIVE_BG,
          fontWeight: 400,
          fontSize: 14,
          lineHeight: '140%',
        }}
      >
        {index + 1}
      </span>
    );
  }
  return (
    <span
      className="inline-flex size-6 shrink-0 items-center justify-center rounded-full"
      style={{
        background: PENDING_BG,
        border: `1px solid ${PENDING_BORDER}`,
        color: PENDING_NUM,
        fontWeight: 400,
        fontSize: 14,
        lineHeight: '140%',
      }}
    >
      {index + 1}
    </span>
  );
}

export default function ApplicationFlowShell({
  stepId,
  children,
  onBack,
  onContinue,
  continueLabel = 'Next',
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
      className={cn(
        'bg-[rgba(248,247,242,1)]',
        lockViewport && 'h-dvh max-h-dvh min-h-0 overflow-hidden',
      )}
    >
      <div
        className={cn(
          'flex min-h-0 flex-1',
          lockViewport ? 'overflow-hidden' : '',
          chapterMode ? 'flex-col' : 'flex-col lg:flex-row',
        )}
      >
        {/* PC stepper — 220 wide */}
        {!chapterMode && (
          <aside
            className={cn(
              'hidden shrink-0 flex-col lg:flex',
              lockViewport && 'min-h-0 overflow-y-auto',
            )}
            style={{
              width: 220,
              padding: '60px 24px 24px',
              borderRight: `1px solid ${SIDEBAR_BORDER}`,
            }}
          >
            <ol className="flex flex-col" aria-label="Application steps">
              {APPLICATION_STEPS.map((step, i) => {
                const done = i < activeIndex;
                const active = i === activeIndex;
                const isLast = i === APPLICATION_STEPS.length - 1;
                const lineDone = done;
                return (
                  <li key={step.id} className="flex gap-3">
                    <div className="flex w-6 shrink-0 flex-col items-center">
                      <StepBadge index={i} done={done} active={active} />
                      {!isLast && (
                        <>
                          <span className="block w-px shrink-0" style={{ height: 8 }} aria-hidden />
                          <span
                            className="block w-px shrink-0"
                            style={{
                              height: 62,
                              background: lineDone ? LINE_DONE : LINE_PENDING,
                            }}
                            aria-hidden
                          />
                          <span className="block w-px shrink-0" style={{ height: 8 }} aria-hidden />
                        </>
                      )}
                    </div>
                    <p
                      className="min-w-0 pt-0.5"
                      style={{
                        fontWeight: 400,
                        fontSize: 14,
                        lineHeight: '140%',
                        color: done || active ? LABEL_DONE : LABEL_PENDING,
                      }}
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
                  </li>
                );
              })}
            </ol>
          </aside>
        )}

        {/* Main column */}
        <div
          className={cn(
            'flex min-w-0 flex-1 flex-col',
            lockViewport
              ? 'min-h-0 overflow-hidden px-4 pb-4 pt-0 lg:px-8 lg:pb-5 lg:pt-[60px]'
              : 'px-4 pt-0 lg:px-8 lg:pt-[60px]',
            !hideFooter && !lockViewport && 'pb-[68px]',
          )}
        >
          {/* Mobile — full-bleed white stepper strip (h 106) */}
          {!chapterMode && (
            <div
              className={cn(
                '-mx-4 mb-6 flex flex-col justify-end bg-white px-4 lg:hidden',
                lockViewport ? 'shrink-0' : '',
              )}
              style={{ height: 106, paddingBottom: 16 }}
            >
              <ol
                className="flex w-full items-center"
                aria-label="Application steps"
              >
                {APPLICATION_STEPS.map((step, i) => {
                  const done = i < activeIndex;
                  const active = i === activeIndex;
                  const isLast = i === APPLICATION_STEPS.length - 1;
                  const lineDone = done;
                  return (
                    <li
                      key={step.id}
                      className={cn('flex items-center', !isLast && 'min-w-0 flex-1')}
                    >
                      <StepBadge index={i} done={done} active={active} />
                      {!isLast && (
                        <span className="flex min-w-0 flex-1 items-center justify-center" aria-hidden>
                          <span
                            className="block h-px w-[23px] shrink-0"
                            style={{
                              background: lineDone ? LINE_DONE : LINE_PENDING,
                            }}
                          />
                        </span>
                      )}
                    </li>
                  );
                })}
              </ol>
              <p
                className="text-left"
                style={{
                  marginTop: 12,
                  fontWeight: 400,
                  fontSize: 14,
                  lineHeight: '140%',
                  color: 'rgba(0, 0, 0, 0.87)',
                }}
              >
                {mobile.mobileLabel}
              </p>
            </div>
          )}

          <div
            className={cn(
              'min-w-0',
              lockViewport && 'min-h-0 flex-1 overflow-hidden',
              !chapterMode && 'max-lg:pt-0 lg:pt-0',
            )}
          >
            {children}
          </div>

          {!hideFooter && (
            <div
              className={cn(
                'fixed inset-x-0 bottom-0 z-30 flex h-[68px] items-center border-t border-border bg-surface px-4',
                !chapterMode ? 'lg:left-[220px] lg:px-8' : 'lg:px-8',
              )}
            >
              <div
                className={cn(
                  'flex w-full items-center gap-3',
                  onBack ? 'justify-between' : 'justify-end',
                )}
              >
                {onBack && (
                  <button
                    type="button"
                    className="cursor-pointer bg-transparent p-0"
                    style={{
                      fontWeight: 500,
                      fontSize: 14,
                      lineHeight: '20px',
                      color: 'rgba(15, 23, 42, 1)',
                    }}
                    onClick={onBack}
                  >
                    Back
                  </button>
                )}
                <button
                  type="button"
                  className="h-9 cursor-pointer rounded-md px-5 disabled:opacity-50 lg:h-10"
                  style={{
                    background: 'rgba(37, 99, 235, 1)',
                    fontWeight: 400,
                    fontSize: 14,
                    lineHeight: '20px',
                    color: 'rgba(255, 255, 255, 1)',
                  }}
                  onClick={onContinue}
                  disabled={continueDisabled || !onContinue}
                >
                  {continueLabel}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </ApplicantChrome>
  );
}
