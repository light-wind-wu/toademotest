'use client';

/* ───────────────────────────────────────────────────────────────────────────
   Programme Timeline (Gantt) — Review & Confirm step.

   Self-contained visualisation of a programme's schedule: one lane per intake
   for its application window + internship window, plus a lane per attached
   project. Projects carry only a duration (no start date yet), so their bars are
   anchored to the earliest internship start and run for that duration — clearly
   labelled as estimated.

   This is an isolated section: delete this file and its <TimelineGantt /> usage
   in views/programme-form.tsx to remove the feature entirely.
   ─────────────────────────────────────────────────────────────────────────── */

import { useMemo } from 'react';
import { CalendarRange } from 'lucide-react';
import type { IntakeWindow, ProjectEntry } from '@/lib/types';
import { formatDate, cn } from '@/lib/utils';

/* ── Date helpers ──────────────────────────────────────────────────────────
   Dates are YYYY-MM-DD strings; parse at UTC midnight so positioning is stable
   regardless of the viewer's timezone. */
function ms(d?: string): number | null {
  if (!d) return null;
  const t = new Date(`${d}T00:00:00Z`).getTime();
  return Number.isNaN(t) ? null : t;
}

/* Add a free-text duration ("3 Months", "12 weeks", "1 year") to a date and
   return the resulting timestamp. Falls back to 12 weeks if unparseable. */
function addDuration(startMs: number, duration?: string): number {
  const d = new Date(startMs);
  const m = duration?.match(/(\d+(?:\.\d+)?)\s*(day|week|month|year)/i);
  const qty  = m ? parseFloat(m[1]) : 12;
  const unit = m ? m[2].toLowerCase() : 'week';
  if (unit === 'day')   d.setUTCDate(d.getUTCDate() + qty);
  if (unit === 'week')  d.setUTCDate(d.getUTCDate() + qty * 7);
  if (unit === 'month') d.setUTCMonth(d.getUTCMonth() + Math.round(qty));
  if (unit === 'year')  d.setUTCFullYear(d.getUTCFullYear() + Math.round(qty));
  return d.getTime();
}

/* Inclusive list of first-of-month timestamps spanning [minMs, maxMs]. */
function monthTicks(minMs: number, maxMs: number): number[] {
  const ticks: number[] = [];
  const d = new Date(minMs);
  d.setUTCDate(1);
  const end = new Date(maxMs);
  while (d.getTime() <= end.getTime()) {
    ticks.push(d.getTime());
    d.setUTCMonth(d.getUTCMonth() + 1);
  }
  return ticks;
}

const MONTH_LABEL = (t: number) =>
  new Date(t).toLocaleDateString('en-GB', { month: 'short', year: '2-digit', timeZone: 'UTC' });

type BarKind = 'app' | 'internship' | 'project';
interface Bar {
  kind:      BarKind;
  label:     string;
  sub?:      string;
  startMs:   number;
  endMs:     number;
  estimated?: boolean;
}
interface Lane {
  group?: string;        // group heading rendered above the first lane of a section
  bar?:   Bar;           // the bar to draw, or…
  empty?: string;        // …a "not set" placeholder message
}

const BAR_STYLE: Record<BarKind, string> = {
  app:        'bg-accent-subtle border border-accent/40 text-accent',
  internship: 'bg-accent text-accent-fg',
  project:    'bg-info text-white',
};

export default function TimelineGantt({
  intakes,
  projects,
}: {
  intakes:  IntakeWindow[];
  projects: ProjectEntry[];
}) {
  const model = useMemo(() => {
    const lanes: Lane[] = [];

    // Earliest valid internship start across intakes — the anchor for project bars.
    const anchorStart = intakes
      .map(i => ms(i.start))
      .filter((t): t is number => t != null)
      .sort((a, b) => a - b)[0] ?? null;

    // ── Intake lanes ──────────────────────────────────────────────────────
    intakes.forEach((intake, i) => {
      const group = `Intake ${i + 1}`;

      const appS = ms(intake.appOpen), appE = ms(intake.appClose);
      lanes.push(
        appS != null && appE != null
          ? { group, bar: { kind: 'app', label: 'Applications', sub: `${formatDate(intake.appOpen)} – ${formatDate(intake.appClose)}`, startMs: appS, endMs: appE } }
          : { group, empty: 'Application window not set' },
      );

      const intS = ms(intake.start), intE = ms(intake.end);
      lanes.push(
        intS != null && intE != null
          ? { bar: { kind: 'internship', label: 'Internship', sub: `${formatDate(intake.start)} – ${formatDate(intake.end)}`, startMs: intS, endMs: intE } }
          : { empty: 'Internship window not set' },
      );
    });

    // ── Project lanes (anchored to the earliest internship start) ─────────
    projects.forEach((p, idx) => {
      const group = idx === 0 ? 'Attached Projects' : undefined;
      if (anchorStart == null) {
        lanes.push({ group, empty: `${p.title} — set an internship start to place this project` });
        return;
      }
      const endMs = addDuration(anchorStart, p.internshipDuration);
      lanes.push({
        group,
        bar: {
          kind: 'project',
          label: p.title,
          sub: p.internshipDuration ? `${p.internshipDuration} (estimated)` : 'Duration not set',
          startMs: anchorStart,
          endMs,
          estimated: true,
        },
      });
    });

    // ── Axis bounds (snapped to whole months, with a little breathing room) ─
    const all = lanes.flatMap(l => (l.bar ? [l.bar.startMs, l.bar.endMs] : []));
    if (all.length === 0) return null;

    let minMs = Math.min(...all);
    let maxMs = Math.max(...all);
    const lo = new Date(minMs); lo.setUTCDate(1);
    const hi = new Date(maxMs); hi.setUTCMonth(hi.getUTCMonth() + 1, 1);
    minMs = lo.getTime();
    maxMs = hi.getTime();

    return { lanes, minMs, maxMs, ticks: monthTicks(minMs, maxMs), hasEstimated: projects.length > 0 && anchorStart != null };
  }, [intakes, projects]);

  if (!model) {
    return (
      <div className="rounded-xl border-2 border-dashed border-border px-6 py-10 text-center">
        <CalendarRange size={26} className="text-border mx-auto mb-2" />
        <p className="text-body-sm text-fg-muted">Add intake dates to see the programme timeline.</p>
      </div>
    );
  }

  const { lanes, minMs, maxMs, ticks } = model;
  const span = maxMs - minMs;
  const pct = (t: number) => ((t - minMs) / span) * 100;

  return (
    <div className="rounded-xl border border-border overflow-hidden">
      {/* Legend */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 px-5 py-3 border-b border-border bg-bg-subtle/40">
        {[
          { kind: 'app' as const,        label: 'Application window' },
          { kind: 'internship' as const, label: 'Internship' },
          { kind: 'project' as const,    label: 'Project (est. from duration)' },
        ].map(l => (
          <span key={l.kind} className="flex items-center gap-1.5 text-[12px] text-fg-muted">
            <span className={cn('w-3.5 h-3 rounded-sm', BAR_STYLE[l.kind])} />
            {l.label}
          </span>
        ))}
      </div>

      {/* Chart — horizontally scrollable when the span is wide */}
      <div className="overflow-x-auto">
        <div className="min-w-[640px]">
          {/* Month axis */}
          <div className="flex border-b border-border">
            <div className="w-40 shrink-0 border-r border-border" />
            <div className="relative flex-1 h-8">
              {ticks.map((t, i) => (
                <div key={t} className="absolute top-0 bottom-0" style={{ left: `${pct(t)}%` }}>
                  <div className="h-full w-px bg-border" />
                  {i < ticks.length - 1 && (
                    <span className="absolute top-1.5 left-1.5 text-[10px] font-semibold text-fg-subtle whitespace-nowrap">
                      {MONTH_LABEL(t)}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Lanes */}
          {lanes.map((lane, i) => (
            <div key={i}>
              {lane.group && (
                <p className="px-5 pt-3 pb-1 text-[11px] font-black uppercase tracking-widest text-fg-subtle">
                  {lane.group}
                </p>
              )}
              <div className="flex items-center min-h-[36px] hover:bg-bg-subtle/40 transition-colors">
                <div className="w-40 shrink-0 px-5 border-r border-border">
                  <p className="text-[12px] text-fg-muted truncate" title={lane.bar?.label ?? lane.empty}>
                    {lane.bar?.label ?? <span className="italic text-fg-subtle">—</span>}
                  </p>
                </div>
                <div className="relative flex-1 h-9">
                  {/* Month gridlines */}
                  {ticks.map(t => (
                    <div key={t} className="absolute top-0 bottom-0 w-px bg-border/50" style={{ left: `${pct(t)}%` }} />
                  ))}
                  {lane.bar ? (
                    <div
                      title={`${lane.bar.label} · ${lane.bar.sub ?? ''}`}
                      className={cn(
                        'absolute top-1/2 -translate-y-1/2 h-5 rounded-md flex items-center px-2 shadow-sm',
                        BAR_STYLE[lane.bar.kind],
                        lane.bar.estimated && 'border border-dashed border-white/60',
                      )}
                      style={{
                        left:     `${pct(lane.bar.startMs)}%`,
                        width:    `max(${pct(lane.bar.endMs) - pct(lane.bar.startMs)}%, 8px)`,
                      }}
                    >
                      <span className="text-[10px] font-semibold whitespace-nowrap overflow-hidden text-ellipsis">
                        {lane.bar.sub}
                      </span>
                    </div>
                  ) : (
                    <span className="absolute top-1/2 -translate-y-1/2 left-2 text-[11px] italic text-fg-subtle">
                      {lane.empty}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {model.hasEstimated && (
        <p className="px-5 py-2.5 border-t border-border text-[11px] text-fg-subtle bg-bg-subtle/40">
          Project bars are estimated from each project&apos;s duration, anchored to the earliest internship start.
          Projects don&apos;t carry their own start date yet.
        </p>
      )}
    </div>
  );
}
