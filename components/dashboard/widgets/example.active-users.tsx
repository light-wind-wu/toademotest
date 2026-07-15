import { Users } from "lucide-react";

import type { WidgetKind } from "../types";
import { Widget } from "../widget";
import { Kpi } from "./example.kpi";

export const activeUsers: WidgetKind = {
  title: "Active users",
  icon: Users,
  defaultSize: { w: 3, h: 2 },
  minW: 2,
  minH: 2,
  singleton: true,
  content: (
    <Widget>
      <Widget.Header />
      <Widget.Body>
        <Kpi value="8,241" label="Last 30 days" delta="12.5%" direction="up" />
      </Widget.Body>
    </Widget>
  ),
};
