import { createContext, useContext } from "react";

import { diffDays, type DateInput } from "./date-utils";
import type { GanttScale, ScaleModel } from "./scale";

/** A start/end pair lifted out of the Gantt when a bar is edited. */
export interface GanttRange {
  start: Date;
  end: Date;
}

/**
 * Everything the sub-components need, shared implicitly so a `<Gantt.Bar>` can
 * sit anywhere under `<Gantt>` and still know the scale, the geometry, and how
 * to report an edit — no prop drilling through `Row`.
 */
export interface GanttContextValue {
  scale: GanttScale;
  model: ScaleModel;
  /** Pixel offset of a date from the left edge of the timeline. */
  xOf: (date: DateInput) => number;
  labelWidth: number;
  rowHeight: number;
  editable: boolean;
  today: Date;
  showToday: boolean;
  selectedId: string | null;
  setSelected: (id: string | null) => void;
  /** Fired on drag-commit and milestone moves; identity is the bar's `id`. */
  onItemChange?: (id: string, range: GanttRange) => void;
}

const GanttContext = createContext<GanttContextValue | null>(null);

export function GanttProvider({
  value,
  children,
}: {
  value: GanttContextValue;
  children: React.ReactNode;
}) {
  return <GanttContext.Provider value={value}>{children}</GanttContext.Provider>;
}

/** Read the shared Gantt state. Throws if used outside a `<Gantt>`. */
export function useGantt(): GanttContextValue {
  const ctx = useContext(GanttContext);
  if (ctx === null) {
    throw new Error("Gantt sub-components must be rendered inside <Gantt>.");
  }
  return ctx;
}

/** Convenience helper bound to the active scale: a date offset in pixels. */
export function makeXOf(model: ScaleModel) {
  return (date: DateInput) => diffDays(date, model.domainStart) * model.pxPerDay;
}
