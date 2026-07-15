"use client";

import {
  useCallback,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

import {
  GanttProvider,
  makeXOf,
  useGantt,
  type GanttRange,
} from "./context";
import {
  addDays,
  diffDays,
  formatFull,
  formatRange,
  spanDays,
  startOfDay,
  type DateInput,
} from "./date-utils";
import { buildScale, type GanttScale } from "./scale";

/* Header tiers and bar inset, in px. Kept here so geometry stays consistent
   between the timeline header and every row. */
const TIER_HEIGHT = 28;
const HEADER_HEIGHT = TIER_HEIGHT * 2;
const BAR_INSET_Y = 7;

/* ------------------------------------------------------------------ Root -- */

export interface GanttProps {
  /** Overall window the timeline covers; bars may sit anywhere within. */
  start: DateInput;
  end: DateInput;
  /** Zoom density. Defaults to `"week"`. */
  scale?: GanttScale;
  /** Allow bars and milestones to be dragged / resized. Defaults to `true`. */
  editable?: boolean;
  /** Width of the fixed left label column, in px. Defaults to `200`. */
  labelWidth?: number;
  /** Height of each row, in px. Defaults to `44`. */
  rowHeight?: number;
  /** Draw the "today" marker line. Defaults to `true`. */
  showToday?: boolean;
  /** Override "now" — handy for fixtures and tests. Defaults to `new Date()`. */
  today?: DateInput;
  /** Controlled selection. Omit for uncontrolled (the Gantt tracks its own). */
  selectedId?: string | null;
  onSelect?: (id: string | null) => void;
  /** Fired when a bar is dragged/resized or a milestone moved, post-commit. */
  onItemChange?: (id: string, range: GanttRange) => void;
  className?: string;
  children?: ReactNode;
}

export function Gantt({
  start,
  end,
  scale = "week",
  editable = true,
  labelWidth = 200,
  rowHeight = 44,
  showToday = true,
  today,
  selectedId: selectedIdProp,
  onSelect,
  onItemChange,
  className,
  children,
}: GanttProps) {
  const model = useMemo(() => buildScale(scale, start, end), [scale, start, end]);
  const xOf = useMemo(() => makeXOf(model), [model]);
  const todayDate = useMemo(() => startOfDay(today ?? new Date()), [today]);

  // Selection is controlled if `selectedId` is passed, else tracked internally.
  const [selfSelected, setSelfSelected] = useState<string | null>(null);
  const selectedId = selectedIdProp !== undefined ? selectedIdProp : selfSelected;
  const setSelected = useCallback(
    (id: string | null) => {
      if (selectedIdProp === undefined) setSelfSelected(id);
      onSelect?.(id);
    },
    [selectedIdProp, onSelect],
  );

  const ctx = useMemo(
    () => ({
      scale,
      model,
      xOf,
      labelWidth,
      rowHeight,
      editable,
      today: todayDate,
      showToday,
      selectedId,
      setSelected,
      onItemChange,
    }),
    [scale, model, xOf, labelWidth, rowHeight, editable, todayDate, showToday, selectedId, setSelected, onItemChange],
  );

  const gridStyle: CSSProperties = {
    gridTemplateColumns: `${labelWidth}px ${model.totalWidth}px`,
  };

  return (
    <GanttProvider value={ctx}>
      <TooltipProvider>
        <div
          className={cn(
            "relative max-h-[70vh] overflow-auto rounded-lg border border-border bg-surface",
            className,
          )}
          // Clear selection when clicking empty timeline space.
          onClick={() => setSelected(null)}
        >
          <div className="grid w-max" style={gridStyle}>
            {children}
          </div>
        </div>
      </TooltipProvider>
    </GanttProvider>
  );
}

/* -------------------------------------------------------------- Timeline -- */

export interface TimelineProps {
  className?: string;
}

/**
 * The sticky two-tier header: a coarse top tier (months, or years) over a fine
 * bottom tier (days / weeks / months). Width and tick positions come straight
 * from the shared scale, so they line up with every bar below.
 */
export function Timeline({ className }: TimelineProps) {
  const { model, labelWidth } = useGantt();

  return (
    <div className="contents">
      {/* Top-left corner — pinned on both axes. */}
      <div
        className="sticky left-0 top-0 z-30 border-b border-r border-border bg-surface"
        style={{ width: labelWidth, height: HEADER_HEIGHT }}
      />
      {/* The axis itself — pinned to the top while rows scroll under it. */}
      <div
        className={cn("sticky top-0 z-20 bg-surface", className)}
        style={{ height: HEADER_HEIGHT }}
      >
        <div className="relative border-b border-border" style={{ height: HEADER_HEIGHT }}>
          {/* Top tier */}
          <div className="absolute inset-x-0 top-0" style={{ height: TIER_HEIGHT }}>
            {model.groups.map((g) => (
              <div
                key={g.key}
                className="absolute top-0 flex items-center border-r border-border px-2 text-xs font-medium text-fg"
                style={{ left: g.left, width: g.width, height: TIER_HEIGHT }}
              >
                <span className="truncate">{g.label}</span>
              </div>
            ))}
          </div>
          {/* Bottom tier */}
          <div className="absolute inset-x-0" style={{ top: TIER_HEIGHT, height: TIER_HEIGHT }}>
            {model.units.map((u) => (
              <div
                key={u.key}
                className="absolute top-0 flex items-center justify-center border-r border-border text-xs tabular-nums text-fg-muted"
                style={{ left: u.left, width: u.width, height: TIER_HEIGHT }}
              >
                <span className="truncate px-1">{u.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------- Row -- */

export interface RowProps {
  /** Primary label shown in the fixed left column. */
  label: ReactNode;
  /** Optional secondary line under the label (owner, status, …). */
  secondary?: ReactNode;
  /** A leading icon or avatar, rendered before the label. */
  icon?: ReactNode;
  /** Bars and milestones for this row. */
  children?: ReactNode;
  className?: string;
}

/**
 * One timeline lane: a sticky label cell on the left and a track on the right
 * that hosts the row's bars. Uses `display: contents` so its two cells drop
 * straight into the parent grid and stay column-aligned with the header.
 */
export function Row({ label, secondary, icon, children, className }: RowProps) {
  const { rowHeight, model, scale, xOf, showToday, today } = useGantt();

  // Subtle vertical gridlines aligned (closely) to the header units.
  const gridStep =
    scale === "day" ? model.pxPerDay : scale === "week" ? model.pxPerDay * 7 : model.pxPerDay * 30;
  const trackBg: CSSProperties = {
    height: rowHeight,
    backgroundImage: `linear-gradient(to right, var(--color-border) 1px, transparent 1px)`,
    backgroundSize: `${gridStep}px 100%`,
  };

  const todayInRange = today >= model.domainStart && today < model.domainEnd;

  return (
    <div className="contents">
      <div
        className={cn(
          "sticky left-0 z-10 flex items-center gap-2 border-b border-r border-border bg-surface px-3",
          className,
        )}
        style={{ height: rowHeight }}
      >
        {icon ? <span className="shrink-0 text-fg-muted">{icon}</span> : null}
        <span className="min-w-0">
          <span className="block truncate text-sm font-medium text-fg">{label}</span>
          {secondary ? (
            <span className="block truncate text-xs text-fg-muted">{secondary}</span>
          ) : null}
        </span>
      </div>

      <div className="relative border-b border-border" style={trackBg}>
        {showToday && todayInRange ? (
          <div
            className="pointer-events-none absolute inset-y-0 z-0 w-px bg-danger/70"
            style={{ left: xOf(today) }}
          />
        ) : null}
        {children}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------- Bar -- */

export type GanttBarColor = "accent" | "success" | "warning" | "danger" | "info" | "neutral";

/* Token-only fills: a translucent track with a solid progress portion. Every
   pair themes correctly across zones/modes — no raw colours. */
const BAR_COLORS: Record<GanttBarColor, { track: string; fill: string }> = {
  accent: { track: "bg-accent/25", fill: "bg-accent" },
  success: { track: "bg-success/25", fill: "bg-success" },
  warning: { track: "bg-warning/25", fill: "bg-warning" },
  danger: { track: "bg-danger/25", fill: "bg-danger" },
  info: { track: "bg-info/25", fill: "bg-info" },
  neutral: { track: "bg-fg-muted/25", fill: "bg-fg-muted" },
};

type DragMode = "move" | "resize-start" | "resize-end";

interface DragState {
  mode: DragMode;
  startX: number;
  baseStart: Date;
  baseEnd: Date;
}

export interface BarProps {
  /** Stable identity — echoed back by `onItemChange` / `onSelect`. */
  id: string;
  start: DateInput;
  end: DateInput;
  color?: GanttBarColor;
  /** 0–1 completion; drives the solid fill width. Defaults to fully filled. */
  progress?: number;
  /** Trailing caption rendered just past the bar's right edge. */
  label?: ReactNode;
  /** Rendered inside the bar — you own its contrast against the fill. */
  children?: ReactNode;
  /** Override the Gantt-level `editable` for this bar only. */
  editable?: boolean;
  className?: string;
}

export function Bar({
  id,
  start,
  end,
  color = "accent",
  progress,
  label,
  children,
  editable: editableProp,
  className,
}: BarProps) {
  const { xOf, model, rowHeight, editable: ganttEditable, selectedId, setSelected, onItemChange } =
    useGantt();
  const editable = editableProp ?? ganttEditable;

  const baseStart = startOfDay(start);
  const baseEnd = startOfDay(end);

  // While dragging we render a live draft; the committed value flows back via
  // props once `onItemChange` updates the parent's state.
  const [draft, setDraft] = useState<GanttRange | null>(null);
  const current = draft ?? { start: baseStart, end: baseEnd };

  const dragRef = useRef<DragState | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const movedRef = useRef(false);

  const left = xOf(current.start);
  const width = Math.max(spanDays(current.start, current.end) * model.pxPerDay, model.pxPerDay);
  const fill = progress === undefined ? 1 : Math.min(1, Math.max(0, progress));
  const selected = selectedId === id;
  const colors = BAR_COLORS[color];

  const beginDrag = (e: ReactPointerEvent<HTMLElement>, mode: DragMode) => {
    if (!editable) return;
    e.stopPropagation();
    movedRef.current = false;
    dragRef.current = { mode, startX: e.clientX, baseStart, baseEnd };
    rootRef.current?.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag) return;
    const days = Math.round((e.clientX - drag.startX) / model.pxPerDay);
    if (days !== 0) movedRef.current = true;

    if (drag.mode === "move") {
      setDraft({ start: addDays(drag.baseStart, days), end: addDays(drag.baseEnd, days) });
    } else if (drag.mode === "resize-start") {
      const next = addDays(drag.baseStart, days);
      if (diffDays(drag.baseEnd, next) >= 0) setDraft({ start: next, end: drag.baseEnd });
    } else {
      const next = addDays(drag.baseEnd, days);
      if (diffDays(next, drag.baseStart) >= 0) setDraft({ start: drag.baseStart, end: next });
    }
  };

  const endDrag = (e: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag) return;
    dragRef.current = null;
    rootRef.current?.releasePointerCapture(e.pointerId);
    if (draft) {
      onItemChange?.(id, draft);
      setDraft(null);
    }
  };

  const handleClick = (e: ReactPointerEvent<HTMLDivElement> | React.MouseEvent) => {
    e.stopPropagation();
    // A drag that actually moved shouldn't also count as a select-toggle click.
    if (movedRef.current) {
      movedRef.current = false;
      return;
    }
    setSelected(id);
  };

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <div
            ref={rootRef}
            role="button"
            tabIndex={0}
            aria-pressed={selected}
            aria-label={typeof label === "string" ? label : id}
            onPointerDown={(e) => beginDrag(e, "move")}
            onPointerMove={onPointerMove}
            onPointerUp={endDrag}
            onClick={handleClick}
            className={cn(
              "absolute z-10 flex items-center rounded-md shadow-sm outline-none transition-shadow",
              colors.track,
              editable ? "cursor-grab active:cursor-grabbing" : "cursor-pointer",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
              selected && "ring-2 ring-accent ring-offset-1 ring-offset-surface",
              className,
            )}
            style={{ left, width, top: BAR_INSET_Y, height: rowHeight - BAR_INSET_Y * 2 }}
          >
            {/* Solid progress portion — square right edge while partial. */}
            <div
              className={cn(
                "absolute inset-y-0 left-0",
                fill >= 1 ? "rounded-md" : "rounded-l-md",
                colors.fill,
              )}
              style={{ width: `${fill * 100}%` }}
            />
            {children ? (
              <div className="relative z-10 truncate px-2 text-xs font-medium">{children}</div>
            ) : null}

            {editable ? (
              <>
                <span
                  onPointerDown={(e) => beginDrag(e, "resize-start")}
                  className="absolute inset-y-0 left-0 z-20 w-2 cursor-ew-resize"
                  aria-hidden
                />
                <span
                  onPointerDown={(e) => beginDrag(e, "resize-end")}
                  className="absolute inset-y-0 right-0 z-20 w-2 cursor-ew-resize"
                  aria-hidden
                />
              </>
            ) : null}

            {label ? (
              <span
                className="pointer-events-none absolute top-1/2 -translate-y-1/2 whitespace-nowrap text-xs text-fg"
                style={{ left: width + 6 }}
              >
                {label}
              </span>
            ) : null}
          </div>
        }
      />
      <TooltipContent>
        <div className="space-y-0.5">
          {label ? <p className="font-medium text-fg">{label}</p> : null}
          <p className="text-fg-muted">{formatRange(current.start, current.end)}</p>
          {progress !== undefined ? (
            <p className="text-fg-muted">{Math.round(fill * 100)}% complete</p>
          ) : null}
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

/* ------------------------------------------------------------- Milestone -- */

export interface MilestoneProps {
  id: string;
  date: DateInput;
  label?: ReactNode;
  color?: GanttBarColor;
  editable?: boolean;
  className?: string;
}

/**
 * A zero-duration marker — a diamond pinned to a single date. Dragging it (when
 * editable) reports an `onItemChange` with `start === end`.
 */
export function Milestone({
  id,
  date,
  label,
  color = "accent",
  editable: editableProp,
  className,
}: MilestoneProps) {
  const { xOf, model, rowHeight, editable: ganttEditable, selectedId, setSelected, onItemChange } =
    useGantt();
  const editable = editableProp ?? ganttEditable;

  const base = startOfDay(date);
  const [draft, setDraft] = useState<Date | null>(null);
  const current = draft ?? base;

  const dragRef = useRef<{ startX: number; base: Date } | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const movedRef = useRef(false);

  const size = Math.min(rowHeight - BAR_INSET_Y * 2, 18);
  const left = xOf(current) + model.pxPerDay / 2; // centre the diamond on the day
  const selected = selectedId === id;
  const fill = BAR_COLORS[color].fill;

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!editable) return;
    e.stopPropagation();
    movedRef.current = false;
    dragRef.current = { startX: e.clientX, base };
    rootRef.current?.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag) return;
    const days = Math.round((e.clientX - drag.startX) / model.pxPerDay);
    if (days !== 0) movedRef.current = true;
    setDraft(addDays(drag.base, days));
  };

  const onPointerUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragRef.current) return;
    dragRef.current = null;
    rootRef.current?.releasePointerCapture(e.pointerId);
    if (draft) {
      onItemChange?.(id, { start: draft, end: draft });
      setDraft(null);
    }
  };

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <div
            ref={rootRef}
            role="button"
            tabIndex={0}
            aria-pressed={selected}
            aria-label={typeof label === "string" ? label : id}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onClick={(e) => {
              e.stopPropagation();
              if (movedRef.current) {
                movedRef.current = false;
                return;
              }
              setSelected(id);
            }}
            className={cn(
              "absolute top-1/2 z-10 -translate-x-1/2 -translate-y-1/2 rotate-45 rounded-[3px] shadow-sm outline-none",
              fill,
              editable ? "cursor-grab active:cursor-grabbing" : "cursor-pointer",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
              selected && "ring-2 ring-accent ring-offset-1 ring-offset-surface",
              className,
            )}
            style={{ left, width: size, height: size }}
          />
        }
      />
      <TooltipContent>
        <div className="space-y-0.5">
          {label ? <p className="font-medium text-fg">{label}</p> : null}
          <p className="text-fg-muted">{formatFull(current)}</p>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

/* Attach sub-components so consumers can write <Gantt.Timeline /> etc. */
Gantt.Timeline = Timeline;
Gantt.Row = Row;
Gantt.Bar = Bar;
Gantt.Milestone = Milestone;
