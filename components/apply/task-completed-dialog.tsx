'use client';

/* Task-completed celebration as a modal (same copy/visuals as /apply/success). */
import { useRouter } from 'next/navigation';
import { ArrowRight, Check, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui-legacy/dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const CARD_SHADOW =
  '0px 4px 6px -4px rgba(0, 0, 0, 0.05), 0px 10px 15px -3px rgba(0, 0, 0, 0.1)';

const TITLE_STYLE = {
  fontWeight: 600,
  fontSize: 20,
  lineHeight: '30px',
  letterSpacing: '-0.41px',
} as const;

const BODY_STYLE = {
  fontWeight: 400,
  fontSize: 20,
  lineHeight: '30px',
  letterSpacing: '-0.41px',
} as const;

export default function TaskCompletedDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();

  function goTasks() {
    onOpenChange(false);
    router.push('/start-tasks');
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className={cn(
          'w-[calc(100%-32px)] max-w-[522px] gap-0 overflow-visible border-none bg-transparent p-0 shadow-none',
          'data-[starting-style]:scale-95 data-[ending-style]:scale-95',
        )}
      >
        <div className="relative w-full">
          <section
            className={cn(
              'relative z-10 mx-auto flex w-full flex-col items-center rounded-2xl border border-border bg-surface text-center',
              'p-6 md:min-h-[257px] md:justify-center md:px-10 md:py-8',
            )}
            style={{ boxShadow: CARD_SHADOW }}
          >
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className={cn(
                'absolute right-4 top-4 z-30 inline-flex size-6 cursor-pointer items-center justify-center rounded-sm text-fg-muted opacity-70 transition-opacity',
                'hover:opacity-100 focus-visible:outline-1 focus-visible:outline-offset-0 focus-visible:outline-accent',
              )}
              aria-label="Close"
            >
              <X className="size-5" strokeWidth={1.5} />
            </button>

            <div
              className="mb-6 flex size-9 shrink-0 items-center justify-center rounded-full"
              style={{ background: 'rgba(13, 148, 136, 1)' }}
              aria-hidden
            >
              <Check className="size-5 text-white" strokeWidth={2.5} />
            </div>

            <DialogTitle className="text-fg" style={TITLE_STYLE}>
              Task Completed
            </DialogTitle>

            <DialogDescription
              className="mt-1 text-fg-muted"
              style={BODY_STYLE}
            >
              <span className="md:hidden">
                You have successfully completed
                <br />
                this test task. Your
                <br />
                responses have been
                <br />
                recorded.
              </span>
              <span className="hidden md:inline">
                You have successfully completed this test task.
                <br />
                Your responses have been recorded.
              </span>
            </DialogDescription>

            <Button
              type="button"
              size="sm"
              className={cn(
                'relative z-30 mt-5 h-8 w-auto shrink-0 rounded-md text-[13px] font-medium text-white',
                'hover:opacity-90',
              )}
              style={{
                background: 'rgba(26, 101, 248, 1)',
                padding: '6.5px 12px',
                height: 32,
              }}
              onClick={goTasks}
            >
              Back to Tasks
              <ArrowRight className="ml-1 size-3.5" strokeWidth={1.5} />
            </Button>
          </section>

          <div
            aria-hidden
            className={cn(
              'pointer-events-none absolute left-1/2 top-0 z-20',
              'w-[min(110vw,560px)] -translate-x-1/2 -translate-y-[28%]',
              'max-md:w-[min(120vw,420px)] max-md:-translate-y-[32%]',
            )}
          >
            <div className="fireworks-fall" key={open ? 'open' : 'closed'}>
              {/* eslint-disable-next-line @next/next/no-img-element -- SVG asset with CSS motion */}
              <img
                src="/images/fireworks.svg"
                alt=""
                className="h-auto w-full select-none"
                draggable={false}
              />
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
