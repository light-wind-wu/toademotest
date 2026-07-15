import type { DashboardWidget, WidgetCatalogue } from "../types";
import { activeUsers } from "./example.active-users";
import { activity } from "./example.activity";
import { churn } from "./example.churn";
import { notes } from "./example.notes";
import { revenue } from "./example.revenue";
import { tasks } from "./example.tasks";
import { welcome } from "./example.welcome";

/**
 * The catalogue of widget kinds. The object key is the widget `type` referenced
 * by placed widgets and the saved arrangement. To add a widget: create a file
 * in this folder exporting a `WidgetKind`, then add one line here.
 */
export const WIDGET_CATALOGUE: WidgetCatalogue = {
  welcome,
  activeUsers,
  churn,
  revenue,
  activity,
  tasks,
  notes,
};

/** The arrangement the dashboard starts with (and returns to on Reset). */
export const DEFAULT_DASHBOARD: DashboardWidget[] = [
  { id: "welcome", type: "welcome", x: 0, y: 0, w: 12, h: 2 },
  { id: "active-users", type: "activeUsers", x: 0, y: 2, w: 3, h: 2 },
  { id: "churn", type: "churn", x: 3, y: 2, w: 3, h: 2 },
  { id: "revenue", type: "revenue", x: 6, y: 2, w: 6, h: 3 },
  { id: "activity", type: "activity", x: 0, y: 4, w: 4, h: 3 },
  { id: "tasks", type: "tasks", x: 4, y: 4, w: 4, h: 3 },
];
