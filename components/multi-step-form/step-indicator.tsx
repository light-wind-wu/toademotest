import { Check } from "lucide-react";

import { cn } from "@/lib/utils";

export interface StepIndicatorStep {
  id: string;
  title: string;
  description?: string;
}

export interface StepIndicatorProps {
  steps: StepIndicatorStep[];
  /** Index of the step currently being shown. */
  current: number;
  /**
   * Called when a reachable (already-visited) step is clicked. Omit to render a
   * purely visual, non-interactive indicator.
   */
  onStepClick?: (index: number) => void;
  className?: string;
}

/**
 * A horizontal step indicator: numbered nodes joined by connectors, each in one
 * of three states — completed (check), current (accent ring), or upcoming
 * (muted). Visited steps are clickable when `onStepClick` is supplied.
 */
export function StepIndicator({ steps, current, onStepClick, className }: StepIndicatorProps) {
  return (
    <ol className={cn("flex w-full items-start", className)}>
      {steps.map((step, index) => {
        const isCompleted = index < current;
        const isCurrent = index === current;
        const isClickable = Boolean(onStepClick) && index <= current;
        const isLast = index === steps.length - 1;

        return (
          <li
            key={step.id}
            className={cn("flex items-start", !isLast && "flex-1")}
          >
            <div className="flex flex-col items-center">
              <button
                type="button"
                disabled={!isClickable}
                onClick={isClickable ? () => onStepClick?.(index) : undefined}
                aria-current={isCurrent ? "step" : undefined}
                className={cn(
                  "flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-sm font-medium transition-colors",
                  isCompleted && "border-accent bg-accent text-accent-fg",
                  isCurrent && "border-accent bg-bg text-accent",
                  !isCompleted && !isCurrent && "border-border bg-bg text-fg-muted",
                  isClickable && "cursor-pointer hover:opacity-90",
                )}
              >
                {isCompleted ? <Check className="h-4 w-4" /> : index + 1}
              </button>
              <div className="mt-2 max-w-28 text-center">
                <div
                  className={cn(
                    "text-sm font-medium leading-tight",
                    isCurrent || isCompleted ? "text-fg" : "text-fg-muted",
                  )}
                >
                  {step.title}
                </div>
                {step.description ? (
                  <div className="mt-0.5 text-xs leading-tight text-fg-muted">
                    {step.description}
                  </div>
                ) : null}
              </div>
            </div>

            {!isLast ? (
              <div
                aria-hidden
                className={cn(
                  "mt-4 h-0.5 flex-1 rounded-full transition-colors",
                  index < current ? "bg-accent" : "bg-border",
                )}
              />
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}
