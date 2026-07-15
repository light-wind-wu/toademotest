import { Activity } from "lucide-react";

import type { WidgetKind } from "../types";
import { Widget } from "../widget";
import { Kpi } from "./example.kpi";

export const churn: WidgetKind = {
  title: "Churn rate",
  icon: Activity,
  defaultSize: { w: 3, h: 2 },
  minW: 2,
  minH: 2,
  singleton: true,
  content: (
    <Widget>
      <Widget.Header />
      <Widget.Body>
        <Kpi value="2.4%" label="Last 30 days" delta="0.8%" direction="down" />
      </Widget.Body>
    </Widget>
  ),
};
