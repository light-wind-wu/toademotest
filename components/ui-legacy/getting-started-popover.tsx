'use client';

import { useState } from 'react';
import { Lightbulb } from 'lucide-react';
import Button from '@/components/ui-legacy/button';
import {
  Popover,
  PopoverContent,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from '@/components/ui-legacy/popover';

const STEPS = [
  {
    n: 1,
    title: 'Add or select a request',
    description: 'Click “Add Project Request” or select an existing request from the left panel.',
  },
  {
    n: 2,
    title: 'Complete the details',
    description: 'Fill in all required fields on the right.',
  },
  {
    n: 3,
    title: 'Review before sending',
    description: 'Please review the request details below before sending. You can save as draft if you need to make changes later.',
  },
] as const;

export type GettingStartedStep = (typeof STEPS)[number]['n'];

interface GettingStartedPopoverProps {
  onStepClick?: (step: GettingStartedStep) => void;
  className?: string;
}

export function GettingStartedPopover({ onStepClick, className }: GettingStartedPopoverProps) {
  const [open, setOpen] = useState(false);

  function handleStepClick(step: GettingStartedStep) {
    onStepClick?.(step);
    setOpen(false);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button variant="outline" size="sm" className={className}>
            <Lightbulb size={16} className="mr-1.5" />
            How to get started
          </Button>
        }
      />
      <PopoverContent className="w-80" align="end" showCloseButton>
        <PopoverHeader>
          <PopoverTitle>How to get started</PopoverTitle>
        </PopoverHeader>
        <div className="space-y-1">
          {STEPS.map(step => (
            <button
              key={step.n}
              type="button"
              onClick={() => handleStepClick(step.n)}
              className="flex w-full items-start gap-3 rounded-lg p-2 text-left transition-colors hover:bg-bg-subtle"
            >
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-semibold text-accent-fg">
                {step.n}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-fg">{step.title}</p>
                <p className="text-sm text-fg-muted">{step.description}</p>
              </div>
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
