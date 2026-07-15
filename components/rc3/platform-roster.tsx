"use client";

import { cn } from "@/lib/utils";

export type LinkStatus = "good" | "degraded" | "lost";

export interface RosterEntry {
  /** Stable identifier — e.g. "UGV-04". Operator-visible. */
  id: string;
  /** Link state. Drives the signal-bar colour and link label. */
  link: LinkStatus;
  /** Signal strength bars (0–4). Falls back to a status-derived default if omitted. */
  signal?: 0 | 1 | 2 | 3 | 4;
  /** Battery state of charge, 0–100. Colour-coded — success > 50, warning 20–50, danger < 20. */
  battery?: number;
  /** Current autonomy rung label — e.g. "MANUAL", "SUPERVISED". */
  autonomy?: string;
  /** Optional short class / type tag — e.g. "UGV", "UAV". */
  klass?: string;
}

export interface PlatformRosterProps {
  /** Platforms to render, in display order. */
  platforms: RosterEntry[];
  /** Currently active platform. Marked with Ember. */
  activeId?: string;
  /** Fires when the operator selects a row. When omitted, rows are non-interactive (status only). */
  onSelect?: (id: string) => void;
  /** Optional roster label — e.g. "ECHELON BRAVO". */
  label?: string;
  /**
   * Opt into fit-and-scroll. The root takes the parent's full height, the label header stays
   * anchored, and the list scrolls within the frame. Use when the fleet might be longer than
   * the column can show. Default `false` keeps today's intrinsic-height behaviour.
   */
  fillHeight?: boolean;
  className?: string;
}

// RC3 signature hue (Ember). Inlined so the active marker renders honestly regardless of docs
// theme or `data-pack` attribute.
const EMBER = "oklch(71% 0.195 32)";

function chargeTone(pct: number): string {
  if (pct < 20) return "text-danger";
  if (pct <= 50) return "text-warning";
  return "text-success";
}

function defaultSignal(link: LinkStatus): 0 | 1 | 2 | 3 | 4 {
  if (link === "good") return 4;
  if (link === "degraded") return 2;
  return 0;
}

const LINK_LABEL: Record<LinkStatus, string> = {
  good: "LINK",
  degraded: "DEGRADED",
  lost: "LOST",
};

const LINK_TONE: Record<LinkStatus, string> = {
  good: "text-success",
  degraded: "text-warning",
  lost: "text-danger",
};

/**
 * RC3 — Platform roster
 *
 * Vertical list of platforms with quick-glance link / autonomy / battery state per row. The
 * active platform is marked with Ember (left-edge border + leading dot). Each row is selectable
 * when `onSelect` is provided; otherwise the roster reads as status-only.
 *
 * Honours invariant 3 (active context unambiguous) — the active platform is unmistakable. The
 * comms / health and battery cells use the same semantic tokens as the sibling comms strip and
 * telemetry HUD, so the roster reads consistently against those organisms.
 */
export function PlatformRoster({
  platforms,
  activeId,
  onSelect,
  label,
  fillHeight,
  className,
}: PlatformRosterProps) {
  if (platforms.length === 0) return null;

  return (
    // biome-ignore lint/a11y/useFocusableInteractive: the listbox's options are individually focusable buttons, so the container itself is intentionally not a tab stop.
    <div
      // biome-ignore lint/a11y/useSemanticElements: role="listbox" has no native element equivalent for this styled, scrollable roster.
      role="listbox"
      aria-label={label ?? "Platform roster"}
      className={cn(
        "flex w-full max-w-sm flex-col overflow-hidden rounded-md border border-border bg-surface",
        fillHeight && "h-full min-h-0",
        className,
      )}
    >
      {label && (
        <div className="shrink-0 border-b border-border bg-bg-subtle px-4 py-2">
          <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-fg-muted">
            {label}
          </span>
        </div>
      )}
      <ul
        className={cn(
          "flex flex-col divide-y divide-border",
          fillHeight && "flex-1 min-h-0 overflow-y-auto",
        )}
      >
        {platforms.map((p) => {
          const active = p.id === activeId;
          return <RosterRow key={p.id} entry={p} active={active} onSelect={onSelect} />;
        })}
      </ul>
    </div>
  );
}

function RosterRow({
  entry,
  active,
  onSelect,
}: {
  entry: RosterEntry;
  active: boolean;
  onSelect?: (id: string) => void;
}) {
  const signal = entry.signal ?? defaultSignal(entry.link);
  const interactive = Boolean(onSelect);

  const content = (
    <>
      <div className="flex w-1 self-stretch" aria-hidden="true">
        <span
          className="block w-full"
          style={{ backgroundColor: active ? EMBER : "transparent" }}
        />
      </div>
      <div className="flex flex-1 items-center gap-3 px-3 py-2.5">
        <span
          className="inline-block h-1.5 w-1.5 shrink-0 rounded-full"
          style={{ backgroundColor: active ? EMBER : "var(--prizm-color-fg-subtle)" }}
          aria-hidden="true"
        />
        <SignalBars filled={signal} status={entry.link} />
        <span className="font-mono text-xs font-semibold tracking-[0.08em] text-fg">
          {entry.id}
        </span>
        {entry.klass && (
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-fg-subtle">
            {entry.klass}
          </span>
        )}
        <span className="ml-auto flex items-center gap-3">
          {entry.autonomy && (
            <span className="hidden font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-fg-muted sm:inline">
              {entry.autonomy}
            </span>
          )}
          {entry.battery !== undefined && (
            <span
              className={cn(
                "font-mono text-[11px] font-semibold tabular-nums",
                chargeTone(entry.battery),
              )}
            >
              {Math.round(entry.battery)}%
            </span>
          )}
          <span
            className={cn(
              "font-mono text-[10px] font-semibold uppercase tracking-[0.14em]",
              LINK_TONE[entry.link],
            )}
          >
            {LINK_LABEL[entry.link]}
          </span>
        </span>
      </div>
    </>
  );

  if (interactive) {
    return (
      <li className="flex">
        <button
          type="button"
          // biome-ignore lint/a11y/useSemanticElements: role="option" on a button is the standard pattern for a selectable listbox row; no native element fits.
          role="option"
          aria-selected={active}
          onClick={() => onSelect?.(entry.id)}
          className={cn(
            "flex w-full items-stretch text-left transition-colors",
            "focus-visible:outline-none focus-visible:bg-bg-muted",
            active ? "bg-bg-muted" : "hover:bg-bg-muted",
          )}
        >
          {content}
        </button>
      </li>
    );
  }

  return (
    // biome-ignore lint/a11y/useFocusableInteractive: read-only roster rows mirror the listbox option structure for assistive tech but are not interactive, so they take no tab stop.
    <li
      // biome-ignore lint/a11y/useSemanticElements: role="option" keeps read-only rows consistent with the selectable variant; no native element fits a listbox option.
      // biome-ignore lint/a11y/noNoninteractiveElementToInteractiveRole: the <li> intentionally carries the listbox option role to match the interactive variant's structure.
      role="option"
      aria-selected={active}
      className={cn("flex items-stretch", active && "bg-bg-muted")}
    >
      {content}
    </li>
  );
}

function SignalBars({ filled, status }: { filled: number; status: LinkStatus }) {
  const heights = [4, 7, 10, 13];
  const color =
    status === "good"
      ? "var(--prizm-color-success)"
      : status === "degraded"
        ? "var(--prizm-color-warning)"
        : "var(--prizm-color-danger)";
  return (
    <div className="flex items-end gap-0.5" aria-hidden="true">
      {heights.map((h, i) => (
        <span
          key={h}
          className="w-0.5 rounded-sm"
          style={{
            height: `${h}px`,
            backgroundColor: i < filled ? color : "var(--prizm-color-border)",
          }}
        />
      ))}
    </div>
  );
}
