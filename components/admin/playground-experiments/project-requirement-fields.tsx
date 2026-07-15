import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Heading } from "@/components/ui/heading";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Text } from "@/components/ui/text";

import {
  MonthRangePicker,
  type MonthRange,
} from "@/components/month-range-picker";
import { formatMonth } from "@/components/month-picker";
import { MultiSelect } from "@/components/multi-select";
import { ThemeToggle } from "@/components/theme-toggle";


/* The disciplines list the wizard's Discipline of Study field offers — enough
   options that a searchable, checkbox multi-select reads better than a stack of
   plain checkboxes. */
const DISCIPLINES = [
  "Computer Science",
  "Computer Engineering",
  "Software Engineering",
  "Information Technology",
  "Information Systems",
  "Cybersecurity",
  "Human-Computer Interaction",
  "Artificial Intelligence",
  "Data Science",
  "Electrical Engineering",
  "Electronic Engineering",
  "Mechanical Engineering",
  "Aerospace Engineering",
  "Mathematics & Statistics",
  "Physics",
];

/** "Aug 2026 – Dec 2026", or a readable stand-in while it's incomplete. */
function describeRange(range: MonthRange): string {
  if (!range.start) return "incomplete";
  return `${formatMonth(range.start)} – ${
    range.end ? formatMonth(range.end) : "…"
  }`;
}

export default function ProjectRequirementFieldsDemo() {
  // Multi-select — any number of disciplines, shown as removable chips.
  const [disciplines, setDisciplines] = useState<string[]>([]);

  // Month range — the default dual layout (two grids side by side)…
  const [period, setPeriod] = useState<MonthRange>({});
  // …and the compact single-grid variant.
  const [periodCompact, setPeriodCompact] = useState<MonthRange>({});

  return (
    <div className="min-h-screen bg-bg text-fg">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-6 py-4">
          <div>
            <Heading as="h1" size="2xl">
              Project requirement fields
            </Heading>
            <Text size="sm" variant="muted" className="mt-0.5">
              The two reusable fields built for the Create Project wizard.
            </Text>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-10 px-6 py-10">
        <Link
          href="/admin?area=playground"
          className={buttonVariants({ variant: "ghost", size: "sm" })}
        >
          <ArrowLeft />
          Back to playground
        </Link>

        <Text size="sm" variant="muted">
          Both fields live on the wizard&rsquo;s{" "}
          <em>Project Requirements</em> step. The{" "}
          <code className="text-fg">MonthRangePicker</code> is a new component —
          the shipped <code className="text-fg">MonthPicker</code> only selects a
          single month, so it couldn&rsquo;t express an internship window. The{" "}
          <code className="text-fg">MultiSelect</code> gained checkbox rows and a{" "}
          <em>N selected · Clear all</em> footer here; the same enhancement flows
          through to every other place it&rsquo;s used.
        </Text>

        {/* Month range picker */}
        <section className="space-y-4">
          <div className="space-y-1">
            <Heading as="h2" size="lg">
              Month range picker
            </Heading>
            <Text size="sm" variant="muted">
              Selects a whole-month window. The default{" "}
              <code className="text-fg">variant=&quot;dual&quot;</code> shows two
              grids side by side (Start / End), like the date range picker;{" "}
              <code className="text-fg">variant=&quot;single&quot;</code> keeps the
              compact one-grid version.
            </Text>
          </div>
          <Separator />

          <Card>
            <CardHeader>
              <CardTitle>Internship period</CardTitle>
              <CardDescription>
                Pick a first month, then a last month no earlier than it.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="max-w-sm space-y-1.5">
                <Label htmlFor="period">Dual (default)</Label>
                <MonthRangePicker
                  id="period"
                  value={period}
                  onChange={setPeriod}
                />
                <Text size="sm" variant="muted">
                  Range:{" "}
                  <span className="text-fg">{describeRange(period)}</span>
                </Text>
              </div>

              <div className="max-w-sm space-y-1.5">
                <Label htmlFor="period-compact">Single (compact variant)</Label>
                <MonthRangePicker
                  id="period-compact"
                  variant="single"
                  value={periodCompact}
                  onChange={setPeriodCompact}
                />
                <Text size="sm" variant="muted">
                  Range:{" "}
                  <span className="text-fg">
                    {describeRange(periodCompact)}
                  </span>
                </Text>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Checkbox multi-select */}
        <section className="space-y-4">
          <div className="space-y-1">
            <Heading as="h2" size="lg">
              Checkbox multi-select
            </Heading>
            <Text size="sm" variant="muted">
              A closed trigger reads <em>N selected</em>; opening it reveals a
              type-to-filter list of checkbox rows and a footer to clear the lot.
              Each pick drops a removable chip beneath the field.
            </Text>
          </div>
          <Separator />

          <Card>
            <CardHeader>
              <CardTitle>Discipline of study</CardTitle>
              <CardDescription>
                Pick as many as apply — remove one with its chip&rsquo;s ×, or
                clear all from inside the list.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="max-w-md space-y-1.5">
                <Label htmlFor="disciplines">Disciplines</Label>
                <MultiSelect
                  id="disciplines"
                  options={DISCIPLINES}
                  value={disciplines}
                  onChange={setDisciplines}
                  placeholder="Select disciplines…"
                  searchPlaceholder="Search…"
                />
              </div>
              <Text size="sm" variant="muted">
                Selected:{" "}
                <span className="text-fg">
                  {disciplines.length > 0 ? disciplines.join(", ") : "none yet"}
                </span>
              </Text>
            </CardContent>
          </Card>
        </section>
      </main>
    </div>
  );
}
