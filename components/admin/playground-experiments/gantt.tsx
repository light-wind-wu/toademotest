import { useState } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  ClipboardList,
  FileText,
  GraduationCap,
  Users,
} from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Heading } from "@/components/ui/heading";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Text } from "@/components/ui/text";

import {
  Gantt,
  formatRange,
  type GanttBarColor,
  type GanttRange,
  type GanttScale,
} from "@/components/gantt";
import { ThemeToggle } from "@/components/theme-toggle";


/* A worked internship-programme schedule. Each task carries its own state so a
   drag commit can be lifted straight back into the array. Dates are plain
   `YYYY-MM-DD` strings (read as local days by the Gantt). */
interface Task {
  id: string;
  label: string;
  owner: string;
  icon: React.ComponentType<{ className?: string }>;
  start: string;
  end: string;
  color: GanttBarColor;
  progress: number;
}

const INITIAL_TASKS: Task[] = [
  { id: "applications", label: "Applications open", owner: "Talent Office", icon: ClipboardList, start: "2026-07-01", end: "2026-07-21", color: "accent", progress: 1 },
  { id: "screening", label: "CV screening", owner: "Hiring panel", icon: FileText, start: "2026-07-15", end: "2026-08-02", color: "info", progress: 0.7 },
  { id: "interviews", label: "Interviews", owner: "Hiring panel", icon: Users, start: "2026-07-28", end: "2026-08-18", color: "info", progress: 0.3 },
  { id: "onboarding", label: "Onboarding", owner: "People Ops", icon: GraduationCap, start: "2026-08-24", end: "2026-09-04", color: "warning", progress: 0 },
  { id: "placement", label: "Placement", owner: "Host teams", icon: GraduationCap, start: "2026-09-07", end: "2026-12-11", color: "success", progress: 0 },
  { id: "report", label: "Final report", owner: "Interns", icon: FileText, start: "2026-12-07", end: "2026-12-18", color: "neutral", progress: 0 },
];

const SCALES: { value: GanttScale; label: string }[] = [
  { value: "day", label: "Day" },
  { value: "week", label: "Week" },
  { value: "month", label: "Month" },
];

export default function GanttDemo() {
  const [tasks, setTasks] = useState<Task[]>(INITIAL_TASKS);
  const [scale, setScale] = useState<GanttScale>("week");
  const [editable, setEditable] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [lastChange, setLastChange] = useState<string | null>(null);

  // The lift: a drag/resize commit updates the owning task. Single source of
  // truth stays in this array; the Gantt is fully controlled off it.
  function handleItemChange(id: string, range: GanttRange) {
    const iso = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, start: iso(range.start), end: iso(range.end) } : t)),
    );
    setLastChange(`${id}: ${formatRange(range.start, range.end)}`);
  }

  const selected = tasks.find((t) => t.id === selectedId);

  return (
    <div className="min-h-screen bg-bg text-fg">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4">
          <div>
            <Heading as="h1" size="2xl">
              Gantt chart
            </Heading>
            <Text size="sm" variant="muted" className="mt-0.5">
              An interactive, compound-component timeline built from PRIZM primitives.
            </Text>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-8 px-6 py-10">
        <Link
          href="/admin?area=playground"
          className={buttonVariants({ variant: "ghost", size: "sm" })}
        >
          <ArrowLeft />
          Back to playground
        </Link>

        <Text size="sm" variant="muted">
          PRIZM ships no Gantt, so this composes one from primitives as a{" "}
          <code className="text-fg">&lt;Gantt&gt;</code> compound component:{" "}
          <code className="text-fg">Gantt.Timeline</code>,{" "}
          <code className="text-fg">Gantt.Row</code>,{" "}
          <code className="text-fg">Gantt.Bar</code>, and{" "}
          <code className="text-fg">Gantt.Milestone</code> share scale and
          geometry through context — no prop drilling. Drag a bar to move it,
          drag its edges to resize, and click to select. Every commit lifts back
          out through <code className="text-fg">onItemChange</code>, so the task
          array below stays the single source of truth.
        </Text>

        {/* Controls */}
        <div className="flex flex-wrap items-center gap-6">
          <div className="flex items-center gap-2">
            <Text size="sm" variant="muted">
              Zoom
            </Text>
            <div className="flex rounded-md border border-border p-0.5">
              {SCALES.map((s) => (
                <Button
                  key={s.value}
                  size="sm"
                  variant={scale === s.value ? "solid" : "ghost"}
                  onClick={() => setScale(s.value)}
                >
                  {s.label}
                </Button>
              ))}
            </div>
          </div>

          <label className="flex items-center gap-2">
            <Switch checked={editable} onCheckedChange={setEditable} />
            <Text size="sm" variant="muted">
              Editable
            </Text>
          </label>

          {lastChange ? (
            <Badge variant="info" className="ml-auto">
              Last change — {lastChange}
            </Badge>
          ) : null}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Internship programme — 2026 cohort</CardTitle>
            <CardDescription>
              Selected:{" "}
              <span className="text-fg">
                {selected ? `${selected.label} (${formatRange(selected.start, selected.end)})` : "nothing"}
              </span>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Gantt
              start="2026-06-29"
              end="2026-12-31"
              scale={scale}
              editable={editable}
              today="2026-08-05"
              selectedId={selectedId}
              onSelect={setSelectedId}
              onItemChange={handleItemChange}
            >
              <Gantt.Timeline />
              {tasks.map((task) => (
                <Gantt.Row key={task.id} label={task.label} secondary={task.owner} icon={<task.icon className="size-4" />}>
                  <Gantt.Bar
                    id={task.id}
                    start={task.start}
                    end={task.end}
                    color={task.color}
                    progress={task.progress}
                  />
                </Gantt.Row>
              ))}
              {/* A standalone milestone row. */}
              <Gantt.Row label="Cohort kick-off" secondary="All hands" icon={<CheckCircle2 className="size-4" />}>
                <Gantt.Milestone id="kickoff" date="2026-09-07" label="Kick-off" color="success" />
                <Gantt.Milestone id="midpoint" date="2026-10-26" label="Mid-point review" color="accent" />
                <Gantt.Milestone id="demo-day" date="2026-12-15" label="Demo day" color="warning" />
              </Gantt.Row>
            </Gantt>
          </CardContent>
        </Card>

        <section className="space-y-3">
          <Heading as="h2" size="lg">
            How it composes
          </Heading>
          <Separator />
          <Text size="sm" variant="muted">
            The root <code className="text-fg">&lt;Gantt&gt;</code> owns the date
            window, zoom, and selection, exposing them through context. Children
            stay declarative — a <code className="text-fg">Row</code> is one lane,
            and its <code className="text-fg">Bar</code> / {" "}
            <code className="text-fg">Milestone</code> children position
            themselves off the shared scale. Drag maths snaps to whole days at
            every zoom because a single <code className="text-fg">pxPerDay</code>{" "}
            constant drives all geometry.
          </Text>
        </section>
      </main>
    </div>
  );
}
