'use client';

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  CalendarRange,
  Database,
  GanttChartSquare,
  LayoutDashboard,
  Layers,
  ListChecks,
  PanelsTopLeft,
  Search,
  SlidersHorizontal,
} from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Heading } from "@/components/ui/heading";
import { Separator } from "@/components/ui/separator";
import { Text } from "@/components/ui/text";

import { ThemeToggle } from "@/components/theme-toggle";

import MultiStepForm from "@/components/admin/playground-experiments/multi-step-form";
import DataAccess from "@/components/admin/playground-experiments/data-access";
import DateRangePicker from "@/components/admin/playground-experiments/date-range-picker";
import SearchableDropdown from "@/components/admin/playground-experiments/searchable-dropdown";
import MonthMultiSelect from "@/components/admin/playground-experiments/month-multi-select";
import ProjectRequirementFields from "@/components/admin/playground-experiments/project-requirement-fields";
import Gantt from "@/components/admin/playground-experiments/gantt";
import Shell from "@/components/admin/playground-experiments/shell";
import Dashboard from "@/components/admin/playground-experiments/dashboard";
import Programmes from "@/components/admin/playground-experiments/programmes";

const EXPERIMENT_COMPONENTS: Record<string, React.ComponentType> = {
  "multi-step-form": MultiStepForm,
  "data-access": DataAccess,
  "date-range-picker": DateRangePicker,
  "searchable-dropdown": SearchableDropdown,
  "month-multi-select": MonthMultiSelect,
  "project-requirement-fields": ProjectRequirementFields,
  gantt: Gantt,
  shell: Shell,
  dashboard: Dashboard,
  programmes: Programmes,
};

/* Experiments are rendered inside the admin settings panel and selected via the
   ?experiment query param. Add a card here when you scaffold a new one. */
const EXPERIMENTS = [
  {
    slug: "multi-step-form",
    icon: Layers,
    title: "Multi-step form",
    description:
      "A route-free wizard built as a compound component, with several worked examples covering schemas, conditional steps, and the imperative validate escape hatch.",
  },
  {
    slug: "data-access",
    icon: Database,
    title: "Data access layer",
    description:
      "A live demo of the role-aware, backend-agnostic data layer: switch acting identity to see deny-by-default authorisation and row-level ownership over a swappable storage backend.",
  },
  {
    slug: "date-range-picker",
    icon: CalendarRange,
    title: "Date range picker",
    description:
      "A start/end date-range picker composed from PRIZM Calendar, Popover, and Button, shown standalone and then editing ranges inside a table cell.",
  },
  {
    slug: "searchable-dropdown",
    icon: Search,
    title: "Searchable dropdown",
    description:
      "A click-to-open, type-to-filter dropdown built on the PRIZM Combobox compound component, shown as a single-select owner picker and a multi-select label picker.",
  },
  {
    slug: "month-multi-select",
    icon: ListChecks,
    title: "Month & multi-select",
    description:
      "Two Logistics-form fields composed from PRIZM primitives where no shipped component fits: a chip-based multi-select with a closed 'N selected' trigger, and a month/year picker with a min constraint for start/end ranges.",
  },
  {
    slug: "project-requirement-fields",
    icon: SlidersHorizontal,
    title: "Project requirement fields",
    description:
      "The two reusable fields from the Create Project wizard's Project Requirements step: a new whole-month range picker for the internship window, and the multi-select upgraded with checkbox rows and a 'N selected · Clear all' footer.",
  },
  {
    slug: "gantt",
    icon: GanttChartSquare,
    title: "Gantt chart",
    description:
      "An interactive, flexible timeline built as a <Gantt> compound component: drag bars to move, drag edges to resize, switch day/week/month zoom, with milestones, progress fills, selection, and edits lifted out via onItemChange.",
  },
  {
    slug: "shell",
    icon: PanelsTopLeft,
    title: "Application shell",
    description:
      "The app chrome: a sticky, role-aware side-nav, a sticky header with search and a user menu, and a main content slot. Nav items are filtered by the same policy the data layer enforces — sign in as different roles to see them change.",
  },
  {
    slug: "dashboard",
    icon: LayoutDashboard,
    title: "Customisable dashboard",
    description:
      "A draggable, resizable widget dashboard on react-grid-layout: toggle edit mode to rearrange, resize, add, or remove widgets, with per-widget minimum sizes, a pinned banner, and layout saved per device.",
  },
  {
    slug: "programmes",
    icon: BookOpen,
    title: "Guarded page",
    description:
      "A worked example of the authorisation policy enforced at two layers: a page-level guard that 403s roles without access before any data loads, and a data-level repository that returns only the rows the acting identity may read. Switch identity to see both respond.",
  },
];

export default function Playground() {
  const searchParams = useSearchParams();
  const experiment = searchParams.get("experiment");
  const Experiment = experiment ? EXPERIMENT_COMPONENTS[experiment] : null;

  if (Experiment) {
    return <Experiment />;
  }

  return (
    <div className="min-h-screen bg-bg text-fg">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-6 py-4">
          <div>
            <Heading as="h1" size="2xl">
              Playground
            </Heading>
            <Text size="sm" variant="muted" className="mt-0.5">
              A sandbox for building and testing your own components.
            </Text>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-8 px-6 py-10">
        <section className="space-y-3">
          <Heading as="h2" size="lg">
            Experiments
          </Heading>
          <Text size="sm" variant="muted">
            Each experiment opens inside this panel so it can be explored on its own.
          </Text>
          <Separator />

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {EXPERIMENTS.map(({ slug, icon: Icon, title, description }) => (
              <Card key={slug} className="flex h-full flex-col">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Icon className="h-5 w-5 text-accent" />
                    <CardTitle>{title}</CardTitle>
                  </div>
                  <CardDescription>{description}</CardDescription>
                </CardHeader>
                <CardFooter className="mt-auto">
                  <Link
                    href={`/admin?area=playground&experiment=${slug}`}
                    className={buttonVariants({ variant: "solid" })}
                  >
                    Open
                    <ArrowRight />
                  </Link>
                </CardFooter>
              </Card>
            ))}
          </div>
        </section>

        <section className="space-y-3">
          <Heading as="h2" size="lg">
            Scratch area
          </Heading>
          <Text size="sm" variant="muted">
            Drop new components below to try them out.
          </Text>
          <Separator />
          <div className="rounded-md border border-dashed border-border p-6 text-center">
            <Link href="/admin?area=components" className={buttonVariants({ variant: "outline" })}>
              Browse the component gallery
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
