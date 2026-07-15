import type { ComponentType, ReactNode } from "react";

/**
 * A *kind* of widget: its identity, grid constraints, and the authored
 * content. The content is a JSX tree built with the `<Widget>` compound
 * component (see widget.tsx) rather than a render function or prop bag.
 */
export interface WidgetKind {
  title: string;
  icon: ComponentType<{ className?: string }>;
  /** Size used when the widget is freshly added, in grid units. */
  defaultSize: { w: number; h: number };
  minW?: number;
  minH?: number;
  maxW?: number;
  maxH?: number;
  /** Pinned: cannot be moved, resized, or removed — even in edit mode. */
  locked?: boolean;
  /** Only one instance allowed on the dashboard at a time. */
  singleton?: boolean;
  /** The widget's chrome + body, authored with `<Widget>…</Widget>`. */
  content: ReactNode;
}

export type WidgetCatalogue = Record<string, WidgetKind>;

/** One placed widget on the grid: identity, kind, and position/size. */
export interface DashboardWidget {
  id: string;
  type: string;
  x: number;
  y: number;
  w: number;
  h: number;
}
