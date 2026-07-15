import { CalendarDays } from "lucide-react";

import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Text } from "@/components/ui/text";
import { cn } from "@/lib/utils";

import { formatRange, type DateRange } from "@/components/date-range-picker";

export interface DateRangeListProps {
  /** Ranges to display. Incomplete ranges render as "21 Jun 2026 – …". */
  ranges: DateRange[];
  /** Badge styling. Defaults to `outline`. */
  variant?: BadgeProps["variant"];
  /** Shown when `ranges` is empty. Defaults to an em dash. */
  emptyText?: string;
  /** Hide the small calendar icon on each badge. */
  hideIcon?: boolean;
  className?: string;
}

/**
 * Read-only display for one or more date ranges — a lightweight counterpart to
 * {@link import("@/components/date-range-picker").DateRangePicker}. Takes its
 * values as a prop; renders nothing interactive.
 */
export function DateRangeList({
  ranges,
  variant = "outline",
  emptyText = "—",
  hideIcon = false,
  className,
}: DateRangeListProps) {
  if (ranges.length === 0) {
    return (
      <Text as="span" size="sm" variant="muted">
        {emptyText}
      </Text>
    );
  }

  return (
    <div className={cn("flex flex-wrap gap-1.5", className)}>
      {ranges.map((range, index) => (
        <Badge key={index} variant={variant} className="whitespace-nowrap">
          {!hideIcon && <CalendarDays className="h-3 w-3 text-fg-muted" />}
          {formatRange(range)}
        </Badge>
      ))}
    </div>
  );
}
