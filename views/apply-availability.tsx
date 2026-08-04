'use client';

/* Availability — one card, two date fields split by a vertical rule; calendar
   panels expand inline inside the card. Each field toggles independently. */
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { format, isValid, parse } from 'date-fns';
import { CalendarDays } from 'lucide-react';
import ApplicationFlowShell from '@/components/apply/application-flow-shell';
import { Calendar } from '@/components/calendar';
import {
  loadApplyDraft,
  markChapterIntro,
  saveApplyDraft,
  type ApplySessionDraft,
} from '@/lib/apply-application';
import { isSignedIn } from '@/lib/session';
import { cn } from '@/lib/utils';

function parseDate(value?: string) {
  if (!value) return undefined;
  const parsed = parse(value, 'yyyy-MM-dd', new Date());
  return isValid(parsed) ? parsed : undefined;
}

function displayDate(value: string) {
  const parsed = parseDate(value);
  return parsed ? format(parsed, 'dd MMM yyyy') : '';
}

export default function ApplyAvailabilityPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [draft, setDraft] = useState<ApplySessionDraft | null>(null);
  /* Independent — opening one must not close the other */
  const [openStart, setOpenStart] = useState(false);
  const [openEnd, setOpenEnd] = useState(false);

  useEffect(() => {
    if (!isSignedIn()) {
      router.replace('/login');
      return;
    }
    setDraft(loadApplyDraft());
    setReady(true);
  }, [router]);

  const persist = useCallback((next: ApplySessionDraft) => {
    setDraft(next);
    saveApplyDraft(next);
  }, []);

  if (!ready || !draft) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg text-body-sm text-fg-muted">
        Loading…
      </div>
    );
  }

  const canContinue = Boolean(
    draft.startDate && draft.endDate && draft.endDate >= draft.startDate,
  );

  const start = parseDate(draft.startDate);
  const end = parseDate(draft.endDate);

  return (
    <ApplicationFlowShell
      stepId="availability"
      onBack={() => router.push('/apply/education')}
      onContinue={() => {
        if (!canContinue) return;
        markChapterIntro('session-2');
        router.push('/apply/project-fit?intro=session-2');
      }}
      continueDisabled={!canContinue}
    >
      <header className="relative mb-5 pr-14 lg:mb-6 lg:pr-24">
        <h1 className="text-[1.375rem] font-bold leading-snug tracking-tight text-fg md:text-[1.5rem]">
          When would you like to start?
        </h1>
        <p className="mt-1 max-w-xl text-[13px] text-fg-muted">
          Let us know your availability – we’ll match you with relevant projects.
        </p>
        <CalendarDays
          className="absolute right-0 top-0 hidden h-12 w-12 text-accent/70 sm:block md:h-14 md:w-14"
          strokeWidth={1.25}
          aria-hidden
        />
      </header>

      <section className="rounded-xl border border-border bg-surface p-4 shadow-sm md:p-5">
        <div className="grid gap-5 md:grid-cols-2 md:gap-0">
          <InlineDateColumn
            label="Preferred Start Date of Internship"
            required
            value={draft.startDate}
            display={displayDate(draft.startDate)}
            selected={start}
            defaultMonth={start ?? new Date(2026, 6, 1)}
            open={openStart}
            onToggle={() => setOpenStart((v) => !v)}
            onSelect={(d) => persist({ ...draft, startDate: format(d, 'yyyy-MM-dd') })}
            className="md:pr-5"
          />

          <InlineDateColumn
            label="Preferred End Date of Internship"
            required
            value={draft.endDate}
            display={displayDate(draft.endDate)}
            selected={end}
            defaultMonth={end ?? new Date(2026, 9, 1)}
            minDate={start}
            open={openEnd}
            onToggle={() => setOpenEnd((v) => !v)}
            onSelect={(d) => persist({ ...draft, endDate: format(d, 'yyyy-MM-dd') })}
            className="md:border-l md:border-border md:pl-5"
            outlineSelected
          />
        </div>
      </section>
    </ApplicationFlowShell>
  );
}

function InlineDateColumn({
  label,
  required,
  display,
  selected,
  defaultMonth,
  minDate,
  open,
  onToggle,
  onSelect,
  className,
  outlineSelected,
}: {
  label: string;
  required?: boolean;
  value: string;
  display: string;
  selected?: Date;
  defaultMonth?: Date;
  minDate?: Date;
  open: boolean;
  onToggle: () => void;
  onSelect: (d: Date) => void;
  className?: string;
  outlineSelected?: boolean;
}) {
  return (
    <div className={cn('min-w-0', className)}>
      <p className="mb-1.5 text-[13px] font-semibold text-fg">
        {label}
        {required && <span className="text-danger"> *</span>}
      </p>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-label={label}
        className={cn(
          'flex h-10 w-full cursor-pointer items-center justify-between gap-2 rounded-md border border-border bg-surface px-3 text-[14px] shadow-sm',
          'outline-none transition-colors hover:border-border-strong',
          'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
          display ? 'text-fg' : 'text-fg-subtle',
          open && 'border-accent',
        )}
      >
        <span className="min-w-0 truncate text-left">{display || 'Select date'}</span>
        <CalendarDays size={16} className="shrink-0 text-fg-muted" />
      </button>

      {open && (
        <div
          className={cn(
            'mt-3 w-full rounded-lg border border-border bg-surface p-2 shadow-sm sm:p-3',
            outlineSelected &&
              '[&_button[aria-selected=true]]:bg-transparent [&_button[aria-selected=true]]:font-semibold [&_button[aria-selected=true]]:text-accent [&_button[aria-selected=true]]:ring-2 [&_button[aria-selected=true]]:ring-accent',
          )}
        >
          <Calendar
            selected={selected}
            defaultMonth={defaultMonth}
            disabled={minDate ? (date) => date < minDate : undefined}
            onSelect={onSelect}
            captionLayout="dropdown"
            className="w-full max-w-none"
          />
        </div>
      )}
    </div>
  );
}
