import { useState } from "react";
import { ArrowLeft, Plus, X } from "lucide-react";
import Link from "next/link";

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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Text } from "@/components/ui/text";

import { DateRangeList } from "@/components/date-range-display";
import {
  DateRangePicker,
  formatRange,
  isPast,
  withinRanges,
  type DateRange,
} from "@/components/date-range-picker";
import { ThemeToggle } from "@/components/theme-toggle";


/* Step 2 seed data: a few bookings, each owning its own date range. */
interface Booking {
  id: string;
  reference: string;
  resource: string;
  range: DateRange;
}

const INITIAL_BOOKINGS: Booking[] = [
  {
    id: "bk-1",
    reference: "BK-1042",
    resource: "Conference room A",
    range: {
      from: new Date(2026, 5, 22),
      to: new Date(2026, 5, 24),
    },
  },
  {
    id: "bk-2",
    reference: "BK-1043",
    resource: "Survey drone",
    range: {
      from: new Date(2026, 5, 29),
      to: new Date(2026, 6, 3),
    },
  },
  {
    id: "bk-3",
    reference: "BK-1044",
    resource: "Field kit",
    range: {},
  },
];

/* Step 4 read-only data: events, each with any number of application periods. */
interface EventRow {
  id: string;
  name: string;
  periods: DateRange[];
}

const EVENTS: EventRow[] = [
  {
    id: "ev-1",
    name: "Graduate intake",
    periods: [
      { from: new Date(2026, 0, 5), to: new Date(2026, 0, 23) },
      { from: new Date(2026, 2, 2), to: new Date(2026, 2, 20) },
      { from: new Date(2026, 4, 4), to: new Date(2026, 4, 22) },
      { from: new Date(2026, 6, 6), to: new Date(2026, 6, 24) },
      { from: new Date(2026, 8, 7), to: new Date(2026, 8, 25) },
    ],
  },
  {
    id: "ev-2",
    name: "Mid-career fellowship",
    periods: [{ from: new Date(2026, 5, 1), to: new Date(2026, 5, 30) }],
  },
  {
    id: "ev-3",
    name: "Open call",
    periods: [],
  },
];

export default function DateRangePickerDemo() {
  // Step 1: a standalone, controlled range.
  const [range, setRange] = useState<DateRange>({});

  // Step 2: a table where each row owns an editable range.
  const [bookings, setBookings] = useState<Booking[]>(INITIAL_BOOKINGS);

  const updateBookingRange = (id: string, next: DateRange) => {
    setBookings((prev) =>
      prev.map((booking) =>
        booking.id === id ? { ...booking, range: next } : booking,
      ),
    );
  };

  // Step 3: several application periods for one event, none allowed to overlap.
  const [periods, setPeriods] = useState<DateRange[]>([
    { from: new Date(2026, 6, 1), to: new Date(2026, 6, 7) },
    { from: new Date(2026, 6, 15), to: new Date(2026, 6, 21) },
  ]);

  const updatePeriod = (index: number, next: DateRange) =>
    setPeriods((prev) => prev.map((p, i) => (i === index ? next : p)));

  const addPeriod = () => setPeriods((prev) => [...prev, {}]);

  const removePeriod = (index: number) =>
    setPeriods((prev) => prev.filter((_, i) => i !== index));

  return (
    <div className="min-h-screen bg-bg text-fg">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-6 py-4">
          <div>
            <Heading as="h1" size="2xl">
              Date range picker
            </Heading>
            <Text size="sm" variant="muted" className="mt-0.5">
              Composed from PRIZM Calendar, Popover, and Button.
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

        {/* Step 1 — the picker on its own */}
        <section className="space-y-4">
          <div className="space-y-1">
            <Heading as="h2" size="lg">
              Step 1 — Pick a range
            </Heading>
            <Text size="sm" variant="muted">
              Choose a start and end date. The end calendar disables anything
              before the start, and <code className="text-fg">isDateDisabled=
              {"{isPast}"}</code> blocks every date before today.
            </Text>
          </div>
          <Separator />

          <Card>
            <CardHeader>
              <CardTitle>Reporting period</CardTitle>
              <CardDescription>
                The selection updates live below.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <DateRangePicker
                value={range}
                onChange={setRange}
                isDateDisabled={isPast}
              />
              <Text size="sm" variant="muted">
                Selected: <span className="text-fg">{formatRange(range)}</span>
              </Text>
            </CardContent>
          </Card>
        </section>

        {/* Step 2 — the picker inside a table cell */}
        <section className="space-y-4">
          <div className="space-y-1">
            <Heading as="h2" size="lg">
              Step 2 — Edit ranges in a table
            </Heading>
            <Text size="sm" variant="muted">
              Each row owns its own range. Editing one cell leaves the others
              untouched.
            </Text>
          </div>
          <Separator />

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Reference</TableHead>
                    <TableHead>Resource</TableHead>
                    <TableHead>Booking dates</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bookings.map((booking) => (
                    <TableRow key={booking.id}>
                      <TableCell className="font-medium">
                        {booking.reference}
                      </TableCell>
                      <TableCell>{booking.resource}</TableCell>
                      <TableCell>
                        <DateRangePicker
                          value={booking.range}
                          onChange={(next) =>
                            updateBookingRange(booking.id, next)
                          }
                          placeholder="Set dates"
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </section>

        {/* Step 3 — multiple, non-overlapping ranges */}
        <section className="space-y-4">
          <div className="space-y-1">
            <Heading as="h2" size="lg">
              Step 3 — Non-overlapping periods
            </Heading>
            <Text size="sm" variant="muted">
              An event can have several application periods. Each picker disables
              past dates and any day already covered by another period, so the
              ranges can never overlap.
            </Text>
          </div>
          <Separator />

          <Card>
            <CardHeader>
              <CardTitle>Application periods</CardTitle>
              <CardDescription>
                Add as many as you need — they stay mutually exclusive.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {periods.map((period, index) => {
                // Disable past dates and every day inside the *other* periods.
                const others = periods.filter((_, i) => i !== index);
                const blockOthers = withinRanges(others);
                return (
                  <div key={index} className="flex items-center gap-3">
                    <Text size="sm" variant="muted" className="w-20 shrink-0">
                      Period {index + 1}
                    </Text>
                    <DateRangePicker
                      value={period}
                      onChange={(next) => updatePeriod(index, next)}
                      isDateDisabled={(date) =>
                        isPast(date) || blockOthers(date)
                      }
                      placeholder="Set period"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Remove period ${index + 1}`}
                      disabled={periods.length === 1}
                      onClick={() => removePeriod(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                );
              })}

              <Button variant="outline" size="sm" onClick={addPeriod}>
                <Plus />
                Add period
              </Button>
            </CardContent>
          </Card>
        </section>

        {/* Step 4 — read-only display of multiple ranges in a cell */}
        <section className="space-y-4">
          <div className="space-y-1">
            <Heading as="h2" size="lg">
              Step 4 — Display ranges (read-only)
            </Heading>
            <Text size="sm" variant="muted">
              For showing dates rather than editing them, a lightweight{" "}
              <code className="text-fg">DateRangeList</code> takes the ranges as a
              prop and renders them as badges. The first event packs five
              periods into one cell.
            </Text>
          </div>
          <Separator />

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Event</TableHead>
                    <TableHead>Application periods</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {EVENTS.map((event) => (
                    <TableRow key={event.id}>
                      <TableCell className="font-medium align-top">
                        {event.name}
                      </TableCell>
                      <TableCell>
                        <DateRangeList
                          ranges={event.periods}
                          emptyText="No periods set"
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </section>
      </main>
    </div>
  );
}
