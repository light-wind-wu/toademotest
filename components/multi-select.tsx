"use client";

import { useState } from "react";
import { Check, ChevronsUpDown, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

/**
 * A click-to-open, type-to-filter multi-select built from PRIZM primitives.
 *
 * PRIZM's Combobox has a `multiple` mode, but it anchors on an always-visible
 * input and shows selection only as in-list ticks. The design wants a closed
 * trigger (reading "N selected") with removable chips beneath it, so this
 * composes that shape from PRIZM primitives (Popover, Input, Badge). Tokens
 * only, so it themes across every zone/mode.
 */
export interface MultiSelectProps {
  /** The full set of choices. */
  options: readonly string[];
  /** Controlled selection. */
  value: string[];
  onChange: (value: string[]) => void;
  /** Trigger text when nothing is selected. */
  placeholder?: string;
  /** Placeholder for the in-popover filter input. */
  searchPlaceholder?: string;
  className?: string;
  id?: string;
}

export function MultiSelect({
  options,
  value,
  onChange,
  placeholder = "Select…",
  searchPlaceholder = "Search…",
  className,
  id,
}: MultiSelectProps) {
  const [query, setQuery] = useState("");
  const needle = query.trim().toLowerCase();
  const filtered = needle
    ? options.filter((option) => option.toLowerCase().includes(needle))
    : options;

  function toggle(option: string) {
    onChange(
      value.includes(option)
        ? value.filter((v) => v !== option)
        : [...value, option],
    );
  }

  return (
    <div className={cn("space-y-2", className)}>
      <Popover>
        <PopoverTrigger
          id={id}
          className={cn(
            "flex h-9 w-full items-center justify-between rounded-md border border-border bg-surface px-3 py-1 text-sm shadow-sm",
            "hover:bg-bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
            value.length === 0 && "text-fg-subtle",
          )}
        >
          <span className="truncate">
            {value.length === 0
              ? placeholder
              : `${value.length} selected`}
          </span>
          <ChevronsUpDown className="size-4 shrink-0 text-fg-muted" />
        </PopoverTrigger>

        <PopoverContent sideOffset={4} className="w-(--anchor-width) p-0">
          <div className="border-b border-border p-2">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={searchPlaceholder}
              className="h-8"
            />
          </div>
          <div className="max-h-60 overflow-y-auto p-1">
            {filtered.length === 0 ? (
              <p className="py-6 text-center text-sm text-fg-muted">No matches.</p>
            ) : (
              filtered.map((option) => {
                const selected = value.includes(option);
                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() => toggle(option)}
                    aria-pressed={selected}
                    className={cn(
                      "flex w-full select-none items-center gap-2.5 rounded-sm px-2 py-1.5 text-left text-sm text-fg outline-none",
                      "hover:bg-bg-muted focus-visible:bg-bg-muted",
                    )}
                  >
                    {/* Visual checkbox mirroring the PRIZM Checkbox; the row
                        button owns interaction, so no nested control. */}
                    <span
                      className={cn(
                        "flex size-4 shrink-0 items-center justify-center rounded-sm border shadow-sm transition-colors",
                        selected
                          ? "border-accent bg-accent text-accent-fg"
                          : "border-border-strong bg-surface",
                      )}
                    >
                      {selected ? <Check className="size-3" /> : null}
                    </span>
                    {option}
                  </button>
                );
              })
            )}
          </div>

          {/* Footer: running count and a one-click clear. */}
          <div className="flex items-center justify-between border-t border-border px-3 py-2">
            <span className="text-sm text-fg-muted">{value.length} selected</span>
            {value.length > 0 ? (
              <button
                type="button"
                onClick={() => onChange([])}
                className="text-sm font-medium text-danger transition-colors hover:text-danger/80"
              >
                Clear all
              </button>
            ) : null}
          </div>
        </PopoverContent>
      </Popover>

      {value.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {value.map((item) => (
            <Badge key={item} variant="info" className="gap-1 pr-1">
              {item}
              <button
                type="button"
                onClick={() => toggle(item)}
                aria-label={`Remove ${item}`}
                className="rounded-full p-0.5 text-fg-muted transition-colors hover:bg-bg-subtle hover:text-fg"
              >
                <X className="size-3" />
              </button>
            </Badge>
          ))}
        </div>
      ) : null}
    </div>
  );
}
