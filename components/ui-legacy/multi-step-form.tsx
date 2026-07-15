'use client';

/* ── MultiStepForm ───────────────────────────────────────────────────────────
   A generic, composable wizard. Steps — and the fields inside them — are passed
   as CHILDREN, not props, so any markup can live in a step:

     <MultiStepForm onComplete={handleSubmit}>
       <MultiStepForm.Step title="Account">
         <input … />
       </MultiStepForm.Step>
       <MultiStepForm.Step title="Profile" validate={() => name.length > 0}>
         <input … />
       </MultiStepForm.Step>
       <MultiStepForm.Step title="Review">
         <p>Confirm and submit.</p>
       </MultiStepForm.Step>
     </MultiStepForm>

   The form renders a step indicator, the active step, and Back / Next / Submit
   chrome out of the box. Everything is overridable:
   - `hideProgress`        drop the built-in indicator
   - `hideFooter`          drop the built-in nav and compose your own with the
                           `useMultiStepForm()` hook
   - `validate` (per step) gate forward navigation; return false (or a rejected /
                           false promise) to stay put. Async is awaited.
──────────────────────────────────────────────────────────────────────────── */

import {
  Children,
  createContext,
  isValidElement,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactElement,
  type ReactNode,
} from 'react';
import { Check, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import Button from '@/components/ui-legacy/button';
import { cn } from '@/lib/utils';

/* ── Step ────────────────────────────────────────────────────────────────── */
export interface StepProps {
  /** Label shown in the progress indicator. */
  title: string;
  /** Optional sub-label rendered above the step body. */
  description?: string;
  /**
   * Gate forward navigation. Return false (or a promise resolving to false) to
   * block Next/Submit — e.g. when the step's fields are invalid. Async is awaited
   * so you can run validation that hits state or storage.
   */
  validate?: () => boolean | Promise<boolean>;
  children: ReactNode;
}

/* Step is a marker component: the root reads its props and renders the active
   one itself, so on its own it just passes children through. */
function Step({ children }: StepProps) {
  return <>{children}</>;
}
Step.displayName = 'MultiStepForm.Step';

/* ── Context ─────────────────────────────────────────────────────────────── */
interface MultiStepContext {
  current: number;
  total: number;
  titles: string[];
  isFirst: boolean;
  isLast: boolean;
  isBusy: boolean;
  /** Advance one step (runs the current step's validate first). */
  next: () => void;
  /** Go back one step. No validation. */
  back: () => void;
  /** Jump to a specific step. Only backward jumps skip validation. */
  goTo: (index: number) => void;
}

const Ctx = createContext<MultiStepContext | null>(null);

/** Access wizard state from anywhere inside a `<MultiStepForm>` — for custom
    navigation, a custom progress bar, or a "Step X of Y" caption. */
export function useMultiStepForm(): MultiStepContext {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useMultiStepForm must be used within <MultiStepForm>');
  return ctx;
}

/* ── Root ────────────────────────────────────────────────────────────────── */
export interface MultiStepFormProps {
  /** `<MultiStepForm.Step>` elements. Non-Step children are ignored. */
  children: ReactNode;
  /** Called when the final step's Submit passes validation. */
  onComplete?: () => void | Promise<void>;
  /** Fired after every successful step change, with the new index. */
  onStepChange?: (index: number) => void;
  /** Starting step index (uncontrolled). Defaults to 0. */
  initialStep?: number;
  /** Label for the final-step action button. Defaults to "Submit". */
  submitLabel?: string;
  hideProgress?: boolean;
  hideFooter?: boolean;
  className?: string;
}

function isStepElement(child: ReactNode): child is ReactElement<StepProps> {
  return isValidElement(child) && child.type === Step;
}

export default function MultiStepForm({
  children,
  onComplete,
  onStepChange,
  initialStep = 0,
  submitLabel = 'Submit',
  hideProgress = false,
  hideFooter = false,
  className,
}: MultiStepFormProps) {
  const steps = useMemo(
    () => Children.toArray(children).filter(isStepElement),
    [children],
  );
  const total = steps.length;

  const clamp = useCallback(
    (i: number) => Math.max(0, Math.min(i, Math.max(total - 1, 0))),
    [total],
  );

  const [current, setCurrent] = useState(() => clamp(initialStep));
  const [isBusy, setIsBusy] = useState(false);

  const isFirst = current === 0;
  const isLast = current === total - 1;
  const activeStep = steps[current];

  const commit = useCallback(
    (index: number) => {
      setCurrent(index);
      onStepChange?.(index);
    },
    [onStepChange],
  );

  /* Run a step's validate guard, tolerating sync, async, throwing, and absent. */
  const runValidate = useCallback(async (step?: ReactElement<StepProps>) => {
    const fn = step?.props.validate;
    if (!fn) return true;
    try {
      return (await fn()) !== false;
    } catch {
      return false;
    }
  }, []);

  const next = useCallback(async () => {
    if (isBusy) return;
    setIsBusy(true);
    try {
      if (!(await runValidate(activeStep))) return;
      if (isLast) await onComplete?.();
      else commit(current + 1);
    } finally {
      setIsBusy(false);
    }
  }, [isBusy, runValidate, activeStep, isLast, onComplete, commit, current]);

  const back = useCallback(() => {
    if (isBusy || isFirst) return;
    commit(current - 1);
  }, [isBusy, isFirst, commit, current]);

  const goTo = useCallback(
    async (index: number) => {
      if (isBusy) return;
      const target = clamp(index);
      if (target === current) return;
      // Forward jumps must clear the current step's guard; backward jumps are free.
      if (target > current) {
        setIsBusy(true);
        try {
          if (!(await runValidate(activeStep))) return;
        } finally {
          setIsBusy(false);
        }
      }
      commit(target);
    },
    [isBusy, clamp, current, runValidate, activeStep, commit],
  );

  const ctx = useMemo<MultiStepContext>(
    () => ({
      current,
      total,
      titles: steps.map(s => s.props.title),
      isFirst,
      isLast,
      isBusy,
      next,
      back,
      goTo,
    }),
    [current, total, steps, isFirst, isLast, isBusy, next, back, goTo],
  );

  if (total === 0) return null;

  return (
    <Ctx.Provider value={ctx}>
      <div className={cn('flex flex-col gap-6', className)}>
        {!hideProgress && <StepIndicator />}

        <div>
          {activeStep.props.description && (
            <p className="text-body-sm text-fg-muted mb-3">
              {activeStep.props.description}
            </p>
          )}
          {activeStep}
        </div>

        {!hideFooter && <Footer submitLabel={submitLabel} />}
      </div>
    </Ctx.Provider>
  );
}

MultiStepForm.Step = Step;

/* ── Built-in step indicator ─────────────────────────────────────────────── */
function StepIndicator() {
  const { titles, current, goTo, isBusy } = useMultiStepForm();
  return (
    <ol className="flex items-center gap-2">
      {titles.map((title, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <li key={i} className="flex items-center gap-2 min-w-0">
            <button
              type="button"
              onClick={() => goTo(i)}
              disabled={isBusy || i > current}
              className={cn(
                'flex items-center gap-2 min-w-0 transition-colors',
                i > current ? 'cursor-default' : 'cursor-pointer',
              )}
            >
              <span
                className={cn(
                  'shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-label-sm font-bold border transition-colors',
                  active && 'bg-accent text-accent-fg border-accent',
                  done && 'bg-accent/10 text-accent border-accent/30',
                  !active && !done && 'bg-bg-subtle text-fg-muted border-border',
                )}
              >
                {done ? <Check size={14} /> : i + 1}
              </span>
              <span
                className={cn(
                  'text-label-sm font-semibold truncate hidden sm:block',
                  active ? 'text-fg' : 'text-fg-muted',
                )}
              >
                {title}
              </span>
            </button>
            {i < titles.length - 1 && (
              <span
                className={cn(
                  'h-px w-6 sm:w-10 shrink-0 transition-colors',
                  done ? 'bg-accent/40' : 'bg-border',
                )}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}

/* ── Built-in footer ─────────────────────────────────────────────────────── */
function Footer({ submitLabel }: { submitLabel: string }) {
  const { isFirst, isLast, isBusy, next, back } = useMultiStepForm();
  return (
    <div className="flex items-center justify-between gap-3 pt-2">
      <Button variant="outline" onClick={back} disabled={isFirst || isBusy}>
        <ChevronLeft size={16} /> Back
      </Button>
      <Button onClick={next} disabled={isBusy}>
        {isBusy && <Loader2 size={16} className="animate-spin" />}
        {isLast ? submitLabel : <>Next <ChevronRight size={16} /></>}
      </Button>
    </div>
  );
}
