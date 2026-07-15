import { Activity } from "lucide-react";

import { Text } from "@/components/ui/text";

import type { WidgetKind } from "../types";
import { Widget } from "../widget";

const ACTIVITY = [
  { who: "Aisha Rahman", what: "approved the Q3 budget", when: "2m ago" },
  { who: "Marcus Lee", what: "uploaded a new report", when: "18m ago" },
  { who: "Priya Nair", what: "commented on Onboarding", when: "1h ago" },
  { who: "Tom Becker", what: "closed ticket #4821", when: "3h ago" },
];

function ActivityFeed() {
  return (
    <ul className="space-y-3">
      {ACTIVITY.map((item, i) => (
        <li key={i} className="flex items-start gap-2">
          <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-accent" aria-hidden="true" />
          <div className="min-w-0">
            <Text size="sm">
              <span className="font-medium text-fg">{item.who}</span>{" "}
              <span className="text-fg-muted">{item.what}</span>
            </Text>
            <Text size="xs" variant="subtle">
              {item.when}
            </Text>
          </div>
        </li>
      ))}
    </ul>
  );
}

export const activity: WidgetKind = {
  title: "Recent activity",
  icon: Activity,
  defaultSize: { w: 4, h: 3 },
  minW: 3,
  minH: 2,
  singleton: true,
  content: (
    <Widget>
      <Widget.Header />
      <Widget.Body>
        <ActivityFeed />
      </Widget.Body>
    </Widget>
  ),
};
