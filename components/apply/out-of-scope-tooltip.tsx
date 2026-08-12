'use client';

/* Hover hint for unfinished / out-of-UT-scope controls — no Back click required. */
import type { ReactElement, ReactNode } from 'react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

export const OUT_OF_SCOPE_TITLE = 'Thanks for exploring!';
export const OUT_OF_SCOPE_BODY =
  'This feature is not part of the current test scope and is not required to complete the task. You can safely skip it and continue with the test scenario.';

export default function OutOfScopeTooltip({
  children,
  side = 'top',
  sideOffset = 8,
  align = 'center',
  content,
  className,
  delay = 200,
}: {
  /** Single interactive element (button, link, etc.). */
  children: ReactElement;
  side?: 'top' | 'right' | 'bottom' | 'left';
  sideOffset?: number;
  align?: 'start' | 'center' | 'end';
  /** Override copy (e.g. menu label). Default: out-of-scope message. */
  content?: ReactNode;
  className?: string;
  delay?: number;
}) {
  const tip =
    content ??
    (
      <div className="max-w-[280px] space-y-1 text-left">
        <p className="text-[12px] font-semibold leading-4">{OUT_OF_SCOPE_TITLE}</p>
        <p className="text-[11px] font-normal leading-4 opacity-90">{OUT_OF_SCOPE_BODY}</p>
      </div>
    );

  return (
    <TooltipProvider delay={delay}>
      <Tooltip>
        <TooltipTrigger delay={delay} render={children} />
        <TooltipContent
          side={side}
          sideOffset={sideOffset}
          align={align}
          className={cn('z-[200] max-w-[300px]', className)}
        >
          {tip}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
