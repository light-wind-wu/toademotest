import { CheckCircle2, Circle, ListTodo } from "lucide-react";

import { Text } from "@/components/ui/text";

import type { WidgetKind } from "../types";
import { Widget } from "../widget";

const TASKS = [
  { label: "Review pull request", done: true },
  { label: "Prepare release notes", done: true },
  { label: "Sync with design team", done: false },
  { label: "Update onboarding guide", done: false },
];

function TaskList() {
  return (
    <ul className="space-y-2.5">
      {TASKS.map((task, i) => (
        <li key={i} className="flex items-center gap-2">
          {task.done ? (
            <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />
          ) : (
            <Circle className="h-4 w-4 shrink-0 text-fg-subtle" />
          )}
          <Text
            size="sm"
            className={task.done ? "text-fg-subtle line-through" : "text-fg"}
          >
            {task.label}
          </Text>
        </li>
      ))}
    </ul>
  );
}

export const tasks: WidgetKind = {
  title: "Tasks",
  icon: ListTodo,
  defaultSize: { w: 4, h: 3 },
  minW: 3,
  minH: 2,
  singleton: true,
  content: (
    <Widget>
      <Widget.Header />
      <Widget.Body>
        <TaskList />
      </Widget.Body>
    </Widget>
  ),
};
