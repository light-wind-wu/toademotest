import { BarChart3 } from "lucide-react";

import type { WidgetKind } from "../types";
import { Widget } from "../widget";

/* A dependency-free bar chart drawn with semantic tokens. */
const CHART_BARS = [38, 64, 52, 80, 46, 72, 90, 58, 68, 84, 50, 76];

function MiniBarChart() {
  return (
    <div className="flex h-full min-h-24 items-end gap-1.5">
      {CHART_BARS.map((height, i) => (
        <div
          key={i}
          className="flex-1 rounded-t-sm bg-accent/80 transition-colors hover:bg-accent"
          style={{ height: `${height}%` }}
        />
      ))}
    </div>
  );
}

export const revenue: WidgetKind = {
  title: "Revenue",
  icon: BarChart3,
  defaultSize: { w: 6, h: 3 },
  minW: 4,
  minH: 3,
  singleton: true,
  content: (
    <Widget>
      <Widget.Header />
      <Widget.Body>
        <MiniBarChart />
      </Widget.Body>
    </Widget>
  ),
};
