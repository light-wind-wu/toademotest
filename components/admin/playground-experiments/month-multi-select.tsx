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
  MonthPicker,
  formatMonth,
  monthOrdinal,
  type MonthValue,
} from "@/components/month-picker";
import { MultiSelect } from "@/components/multi-select";
import { ThemeToggle } from "@/components/theme-toggle";


/* Realistic Logistics-form data: the skills an internship placement might call
   for. Long enough that a chip-based multi-select reads better than a wall of
   checkboxes. */
const SKILLS = [
  "TypeScript",
  "React",
  "Python",
  "Go",
  "Rust",
  "SQL",
  "Data analysis",
  "Machine learning",
  "Cloud / DevOps",
  "Cybersecurity",
  "UI / UX design",
  "Technical writing",
];

export default function MonthMultiSelectDemo() {
  // Multi-select: any number of skills, shown as removable chips.
  const [skills, setSkills] = useState<string[]>([]);

  // A start/end month pair — the end picker is constrained to be ≥ the start.
  const [start, setStart] = useState<MonthValue>();
  const [end, setEnd] = useState<MonthValue>();

  // If a chosen end falls before a newly-chosen start, clear it so the field
  // never holds an invalid range.
  function handleStart(next: MonthValue) {
    setStart(next);
    if (end && monthOrdinal(end) < monthOrdinal(next)) setEnd(undefined);
  }

  return (
    <div className="min-h-screen bg-bg text-fg">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-6 py-4">
          <div>
            <Heading as="h1" size="2xl">
              Month &amp; multi-select
            </Heading>
            <Text size="sm" variant="muted" className="mt-0.5">
              Two Logistics-form fields composed from PRIZM primitives.
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
          PRIZM ships a <code className="text-fg">Combobox</code> (with a{" "}
          <code className="text-fg">multiple</code> mode) and a{" "}
          <code className="text-fg">Calendar</code>, but neither matches the
          shape these Logistics fields want: a closed trigger reading{" "}
          <em>N selected</em> with removable chips, and a month-granularity
          picker. Toggle Group and Date Picker are both on PRIZM&rsquo;s roadmap
          but unshipped, so these compose the missing shapes from{" "}
          <code className="text-fg">Popover</code>,{" "}
          <code className="text-fg">Input</code>, and{" "}
          <code className="text-fg">Badge</code> — tokens only, so they theme
          across every zone and mode.
        </Text>

        {/* Multi-select — chip trigger */}
        <section className="space-y-4">
          <div className="space-y-1">
            <Heading as="h2" size="lg">
              Multi-select
            </Heading>
            <Text size="sm" variant="muted">
              A closed trigger reads <em>N selected</em>; opening it reveals a
              type-to-filter list. Each pick drops a removable chip beneath the
              field.
            </Text>
          </div>
          <Separator />

          <Card>
            <CardHeader>
              <CardTitle>Required skills</CardTitle>
              <CardDescription>
                Pick as many as apply — remove one with the chip&rsquo;s ×.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="max-w-xs space-y-1.5">
                <Label htmlFor="skills">Skills</Label>
                <MultiSelect
                  id="skills"
                  options={SKILLS}
                  value={skills}
                  onChange={setSkills}
                  placeholder="Select skills…"
                  searchPlaceholder="Search skills…"
                />
              </div>
              <Text size="sm" variant="muted">
                Selected:{" "}
                <span className="text-fg">
                  {skills.length > 0 ? skills.join(", ") : "none yet"}
                </span>
              </Text>
            </CardContent>
          </Card>
        </section>

        {/* Month picker — single + constrained pair */}
        <section className="space-y-4">
          <div className="space-y-1">
            <Heading as="h2" size="lg">
              Month picker
            </Heading>
            <Text size="sm" variant="muted">
              A year stepper over a twelve-month grid. The end field passes the
              chosen start as its <code className="text-fg">min</code>, so months
              before it are disabled.
            </Text>
          </div>
          <Separator />

          <Card>
            <CardHeader>
              <CardTitle>Internship duration</CardTitle>
              <CardDescription>
                Pick a start month, then an end month no earlier than it.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="start">Start month</Label>
                  <MonthPicker
                    id="start"
                    value={start}
                    onChange={handleStart}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="end">End month</Label>
                  <MonthPicker
                    id="end"
                    value={end}
                    onChange={setEnd}
                    min={start}
                  />
                </div>
              </div>
              <Text size="sm" variant="muted">
                Range:{" "}
                <span className="text-fg">
                  {start && end
                    ? `${formatMonth(start)} – ${formatMonth(end)}`
                    : "incomplete"}
                </span>
              </Text>
            </CardContent>
          </Card>
        </section>
      </main>
    </div>
  );
}
