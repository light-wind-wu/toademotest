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
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  ComboboxTrigger,
} from "@/components/ui/combobox";
import { Heading } from "@/components/ui/heading";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Text } from "@/components/ui/text";

import { ThemeToggle } from "@/components/theme-toggle";


/* Realistic enterprise data: people you might assign work to, and labels you
   might tag it with. Both are long enough that scanning a plain Select would be
   tedious — exactly when a searchable dropdown earns its place. */
const PEOPLE = [
  "Aisha Rahman",
  "Benjamin Carter",
  "Chloe Tan",
  "Daniel Okafor",
  "Elena Petrova",
  "Farhan Rais",
  "Grace Lim",
  "Hiroshi Tanaka",
  "Isabella Rossi",
  "Jamal Edwards",
  "Keiko Nakamura",
  "Liam O'Connor",
  "Mei Chen",
  "Noah Williams",
  "Olivia Bennett",
  "Priya Sharma",
];

const LABELS = [
  "Backend",
  "Frontend",
  "Infrastructure",
  "Security",
  "Documentation",
  "Performance",
  "Accessibility",
  "Data",
  "Design",
  "Tooling",
];

export default function SearchableDropdownDemo() {
  // Single select: one owner.
  const [owner, setOwner] = useState<string | null>(null);

  // Multi-select: any number of labels.
  const [labels, setLabels] = useState<string[]>([]);

  return (
    <div className="min-h-screen bg-bg text-fg">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-6 py-4">
          <div>
            <Heading as="h1" size="2xl">
              Searchable dropdown
            </Heading>
            <Text size="sm" variant="muted" className="mt-0.5">
              The PRIZM Combobox compound component — click to open, type to
              filter.
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

        {/* Single select — trigger anchor */}
        <section className="space-y-4">
          <div className="space-y-1">
            <Heading as="h2" size="lg">
              Single select
            </Heading>
            <Text size="sm" variant="muted">
              A <code className="text-fg">ComboboxTrigger</code> anchors the
              control. Opening it reveals a search field that filters the list as
              you type, with full keyboard navigation.
            </Text>
          </div>
          <Separator />

          <Card>
            <CardHeader>
              <CardTitle>Assign an owner</CardTitle>
              <CardDescription>
                Sixteen people — start typing a name to narrow them down.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="max-w-xs space-y-1.5">
                <Label htmlFor="owner">Owner</Label>
                <Combobox
                  items={PEOPLE}
                  value={owner}
                  onValueChange={(value: string | null) => setOwner(value)}
                >
                  <ComboboxTrigger id="owner" className="w-full" />
                  <ComboboxContent>
                    <div className="border-b border-border p-1">
                      <ComboboxInput
                        placeholder="Search people…"
                        className="border-0 shadow-none focus-visible:outline-0"
                      />
                    </div>
                    <ComboboxEmpty>No people found.</ComboboxEmpty>
                    <ComboboxList>
                      {(person: string) => (
                        <ComboboxItem key={person} value={person}>
                          {person}
                        </ComboboxItem>
                      )}
                    </ComboboxList>
                  </ComboboxContent>
                </Combobox>
              </div>
              <Text size="sm" variant="muted">
                Selected:{" "}
                <span className="text-fg">{owner ?? "nobody yet"}</span>
              </Text>
            </CardContent>
          </Card>
        </section>

        {/* Multi-select — inline input anchor */}
        <section className="space-y-4">
          <div className="space-y-1">
            <Heading as="h2" size="lg">
              Multi-select
            </Heading>
            <Text size="sm" variant="muted">
              Passing <code className="text-fg">multiple</code> lets the same
              component collect several values. Here a{" "}
              <code className="text-fg">ComboboxInput</code> replaces the trigger
              for an always-visible search field.
            </Text>
          </div>
          <Separator />

          <Card>
            <CardHeader>
              <CardTitle>Tag with labels</CardTitle>
              <CardDescription>
                Pick as many as apply — selected labels keep their tick.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="max-w-xs space-y-1.5">
                <Label htmlFor="labels">Labels</Label>
                <Combobox
                  multiple
                  items={LABELS}
                  value={labels}
                  onValueChange={(value: string[]) => setLabels(value)}
                >
                  <ComboboxInput
                    id="labels"
                    placeholder="Search labels…"
                    className="w-full"
                  />
                  <ComboboxContent>
                    <ComboboxEmpty>No labels found.</ComboboxEmpty>
                    <ComboboxList>
                      {(label: string) => (
                        <ComboboxItem key={label} value={label}>
                          {label}
                        </ComboboxItem>
                      )}
                    </ComboboxList>
                  </ComboboxContent>
                </Combobox>
              </div>
              <Text size="sm" variant="muted">
                Selected:{" "}
                <span className="text-fg">
                  {labels.length > 0 ? labels.join(", ") : "none yet"}
                </span>
              </Text>
            </CardContent>
          </Card>
        </section>
      </main>
    </div>
  );
}
