'use client';

/* Availability — one card, two date fields split by a vertical rule; calendar
   panels expand inline inside the card. Each field toggles independently. */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { addDays, format, isValid, parse, startOfDay } from 'date-fns';
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

/** Earliest selectable start date — tomorrow (day after today). */
function earliestStartDate() {
  return startOfDay(addDays(new Date(), 1));
}

function isBeforeDay(date: Date, min: Date) {
  return startOfDay(date) < startOfDay(min);
}

export default function ApplyAvailabilityPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [draft, setDraft] = useState<ApplySessionDraft | null>(null);
  /* Independent — opening one must not close the other */
  const [openStart, setOpenStart] = useState(false);
  const [openEnd, setOpenEnd] = useState(false);

  const minStart = useMemo(() => earliestStartDate(), []);

  useEffect(() => {
    if (!isSignedIn()) {
      router.replace('/login');
      return;
    }
    const loaded = loadApplyDraft();
    const start = parseDate(loaded.startDate);
    /* Clamp seeded / stale start dates that fall before tomorrow */
    if (!start || isBeforeDay(start, minStart)) {
      const startIso = format(minStart, 'yyyy-MM-dd');
      const next: ApplySessionDraft = {
        ...loaded,
        startDate: startIso,
        endDate:
          loaded.endDate && loaded.endDate >= startIso ? loaded.endDate : loaded.endDate,
      };
      if (next.endDate && next.endDate < next.startDate) {
        next.endDate = '';
      }
      saveApplyDraft(next);
      setDraft(next);
    } else {
      setDraft(loaded);
    }
    setReady(true);
  }, [router, minStart]);

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
      <header className="mb-8 md:mb-5">
        <h1 className="text-[1.375rem] font-bold leading-snug tracking-tight text-fg md:text-[1.5rem]">
          When would you like to start?
        </h1>
        <p className="mt-1 max-w-xl text-[13px] text-fg-muted">
          Let us know your availability – we’ll match you with relevant projects.
        </p>
      </header>

      <section className="rounded-xl border border-border bg-surface p-4 shadow-sm md:p-5">
        <div className="flex flex-col md:grid md:grid-cols-2">
          <InlineDateColumn
            label="Preferred Start Date of Internship"
            required
            value={draft.startDate}
            display={displayDate(draft.startDate)}
            selected={start}
            defaultMonth={start ?? minStart}
            minDate={minStart}
            open={openStart}
            onToggle={() => setOpenStart((v) => !v)}
            onSelect={(d) => {
              if (isBeforeDay(d, minStart)) return;
              const startIso = format(d, 'yyyy-MM-dd');
              const next = { ...draft, startDate: startIso };
              if (draft.endDate && draft.endDate < startIso) next.endDate = '';
              persist(next);
            }}
            className="md:pr-5"
          />

          {/* Mobile-only divider between the two date fields */}
          <div
            className="h-px shrink-0 md:hidden"
            style={{
              background: 'rgba(231, 228, 221, 1)',
              marginTop: 24,
              marginBottom: 24,
            }}
            aria-hidden
          />

          <InlineDateColumn
            label="Preferred End Date of Internship"
            required
            value={draft.endDate}
            display={displayDate(draft.endDate)}
            selected={end}
            defaultMonth={end ?? start ?? minStart}
            minDate={start ?? minStart}
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
      <p
        className="mb-1.5"
        style={{
          fontWeight: 500,
          fontSize: 14,
          lineHeight: '18px',
          color: 'rgba(15, 23, 43, 1)',
        }}
      >
        {label}
        {required && <span className="text-danger"> *</span>}
      </p>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-label={label}
        className={cn(
          'flex h-10 w-full cursor-pointer items-center justify-between gap-2 rounded-md border border-border bg-surface px-3 shadow-sm',
          'outline-none transition-colors hover:border-border-strong',
          'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
          open && 'border-accent',
        )}
        style={{
          fontWeight: 400,
          fontSize: 14,
          lineHeight: '20px',
          color: display ? 'rgba(15, 23, 43, 1)' : undefined,
        }}
      >
        <span
          className={cn('min-w-0 truncate text-left', !display && 'text-fg-subtle')}
        >
          {display || 'Select date'}
        </span>
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
            disabled={minDate ? (date) => isBeforeDay(date, minDate) : undefined}
            onSelect={onSelect}
            captionLayout="dropdown"
            className="w-full max-w-none"
          />
        </div>
      )}
    </div>
  );
}
