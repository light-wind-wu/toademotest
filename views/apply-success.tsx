'use client';

/* Task-completed success — catlog-bg + animated fireworks around the card.
   Layer order: bg → card → fireworks (top). Fireworks are pointer-events-none
   and shifted up so they don’t cover the CTA.
   “Back to Tasks” → /start-tasks (UT briefing). */
import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { ArrowRight, Check } from 'lucide-react';
import ApplicantChrome from '@/components/apply/applicant-chrome';
import { Button } from '@/components/ui/button';
import { isSignedIn } from '@/lib/session';
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

export default function ApplySuccessPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!isSignedIn()) {
      router.replace('/login');
      return;
    }
    setReady(true);
  }, [router]);

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg text-body-sm text-fg-muted">
        Loading…
      </div>
    );
  }

  return (
    <ApplicantChrome className="bg-[rgba(254,253,251,1)]">
      <div className="relative flex min-h-[calc(100dvh-4rem)] flex-1 flex-col overflow-hidden">
        {/* Layer 0 — background (desktop only) */}
        <Image
          src="/images/catlog-bg.png"
          alt=""
          fill
          priority
          className="pointer-events-none hidden object-cover object-center md:block"
          sizes="100vw"
        />

        <div className="relative z-10 flex flex-1 items-center justify-center px-4 py-10 sm:px-6">
          <div className="relative w-full max-w-[522px]">
            {/* Layer 1 — card */}
            <section
              className={cn(
                'relative z-10 mx-auto flex w-full flex-col items-center rounded-2xl border border-border bg-surface text-center',
                'p-6 md:h-[257px] md:w-[522px] md:justify-center',
              )}
              style={{ boxShadow: CARD_SHADOW }}
            >
              <div
                className="mb-6 flex size-9 shrink-0 items-center justify-center rounded-full"
                style={{ background: 'rgba(13, 148, 136, 1)' }}
                aria-hidden
              >
                <Check className="size-5 text-white" strokeWidth={2.5} />
              </div>

              <h1 className="text-fg" style={TITLE_STYLE}>
                Task Completed
              </h1>

              <p className="mt-1 text-fg-muted" style={BODY_STYLE}>
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
              </p>

              {/* Keep CTA above fireworks if they overlap */}
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
                onClick={() => router.push('/start-tasks')}
              >
                Back to Tasks
                <ArrowRight className="ml-1 size-3.5" strokeWidth={1.5} />
              </Button>
            </section>

            {/* Layer 2 — fireworks on top; shifted up so bottom clusters clear the button */}
            <div
              aria-hidden
              className={cn(
                'pointer-events-none absolute left-1/2 top-0 z-20',
                'w-[min(110vw,560px)] -translate-x-1/2 -translate-y-[28%]',
                'max-md:w-[min(120vw,420px)] max-md:-translate-y-[32%]',
              )}
            >
              <div className="fireworks-fall">
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
        </div>
      </div>
    </ApplicantChrome>
  );
}
