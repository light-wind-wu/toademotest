import type { ApplicantCardStage } from '@/lib/types';
import { cn } from '@/lib/utils';
import { FigmaApplicationStageIllustration } from './figma-application-stage-illustration';

/** Decorative, page-specific artwork; status is always stated separately in text. */
export function ApplicationStageIllustration({ stage, className }: { stage: ApplicantCardStage; className?: string }) {
  return stage === 'incomplete'
    ? <IncompleteApplicationIllustration className={className} />
    : <FigmaApplicationStageIllustration stage={stage} className={className} />;
}

/** Matches the compact document artwork used by the other application stages. */
function IncompleteApplicationIllustration({ className }: { className?: string }) {
  return (
    <span aria-hidden="true" className={cn('flex shrink-0 items-center justify-center', className)}>
      <svg viewBox="0 0 90 90" fill="none" focusable="false" className="size-[90px] shrink-0 text-fg-muted">
        <g stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 16h34l11 11v48a3 3 0 0 1-3 3H20a3 3 0 0 1-3-3V19a3 3 0 0 1 3-3Z" className="fill-surface" />
          <path d="M54 16v11h11M27 35h27" />
          <rect x="27" y="44" width="6" height="6" rx="1" />
          <path d="M39 47h15" />
          <rect x="27" y="58" width="6" height="6" rx="1" strokeDasharray="2 2" />
          <path d="M39 61h8" />
          <path d="m64 51 16 27H48Z" className="fill-surface" />
          <path d="m64 56 11 19H53Z" className="fill-warning/20 stroke-none" />
          <path d="M64 61v6m0 5v.2" className="stroke-warning" strokeWidth="2.6" />
          <path d="m74 47 3-4m2 8 5-1" className="stroke-warning" />
        </g>
      </svg>
    </span>
  );
}
