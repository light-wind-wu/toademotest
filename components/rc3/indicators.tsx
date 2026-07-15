"use client";

import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

/**
 * RC3 — Indicator alphabet
 *
 * Small, glanceable visual primitives for organism row values. Designed to read as
 * instruments, not HUD ornament — encode the quantity directly, keep the text as the
 * primary read, and match the chrome restraint of the sibling indicators already inlined
 * in platform-detail (signal bars, battery gauge, heading dial).
 *
 * Consume by passing them into a row's `value` slot — e.g. `PlatformDetail`'s
 * `extras[].value`. They are pack-internal helpers; they have no PRIZM-wide footprint.
 */

// ---------------------------------------------------------------------------
// PipCount — discrete inventory (munition, cartridges, smoke, relay drops)
// ---------------------------------------------------------------------------

export interface PipCountProps {
  /** Number of filled pips. Clamped to [0, total]. */
  filled: number;
  /** Total pip count. Keep small (typically ≤ 8); large totals belong in plain text. */
  total: number;
  /** Optional trailing text — e.g. munition designation `"AGM-114"`. */
  suffix?: ReactNode;
  /** Tone of filled pips. Defaults to success. */
  tone?: "success" | "warning" | "danger" | "muted";
  className?: string;
}

const PIP_TONE: Record<NonNullable<PipCountProps["tone"]>, string> = {
  success: "var(--prizm-color-success)",
  warning: "var(--prizm-color-warning)",
  danger: "var(--prizm-color-danger)",
  muted: "var(--prizm-color-fg-muted)",
};

export function PipCount({ filled, total, suffix, tone = "success", className }: PipCountProps) {
  const f = Math.max(0, Math.min(total, Math.round(filled)));
  const empty = "var(--prizm-color-border-strong)";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 font-mono text-xs tabular-nums text-fg",
        className,
      )}
    >
      <span className="inline-flex items-center gap-[3px]" aria-hidden="true">
        {Array.from({ length: total }, (_, i) => (
          <span
            key={i}
            className="block h-1.5 w-1.5 rounded-full"
            style={{ backgroundColor: i < f ? PIP_TONE[tone] : empty }}
          />
        ))}
      </span>
      <span>
        {f}/{total}
        {suffix ? <span className="ml-1 text-fg-muted">{suffix}</span> : null}
      </span>
    </span>
  );
}

// ---------------------------------------------------------------------------
// CapacityBar — continuous percentage (fuel, comms-relay buffer, mission progress)
// ---------------------------------------------------------------------------

export type CapacityBarTone = "success" | "warning" | "danger" | "muted";

export interface CapacityBarProps {
  /** Percentage 0–100. Clamped. */
  pct: number;
  /** Tone of the fill. Defaults to success. Pick explicitly — "low = bad" is not universal. */
  tone?: CapacityBarTone;
  /** Optional trailing text (e.g. `"62%"`, `"42 min"`). Renders after the bar. */
  suffix?: ReactNode;
  className?: string;
}

const CAPACITY_TONE: Record<CapacityBarTone, string> = {
  success: "var(--prizm-color-success)",
  warning: "var(--prizm-color-warning)",
  danger: "var(--prizm-color-danger)",
  muted: "var(--prizm-color-fg-muted)",
};

export function CapacityBar({ pct, tone = "success", suffix, className }: CapacityBarProps) {
  const clamped = Math.max(0, Math.min(100, pct));
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 font-mono text-xs tabular-nums text-fg",
        className,
      )}
    >
      <span
        className="relative inline-flex h-1.5 w-10 items-center overflow-hidden rounded-[2px] border border-[var(--prizm-color-border-strong)]"
        aria-hidden="true"
      >
        <span
          className="block h-full"
          style={{ width: `${clamped}%`, backgroundColor: CAPACITY_TONE[tone] }}
        />
      </span>
      {suffix !== undefined ? <span>{suffix}</span> : <span>{Math.round(clamped)}%</span>}
    </span>
  );
}

// ---------------------------------------------------------------------------
// StateDot — three-state operational status (active / standby / off)
// ---------------------------------------------------------------------------

export type StateDotState = "active" | "standby" | "off";

export interface StateDotProps {
  state: StateDotState;
  children: ReactNode;
  className?: string;
}

const DOT_FILL: Record<StateDotState, string> = {
  active: "var(--prizm-color-success)",
  standby: "var(--prizm-color-warning)",
  off: "var(--prizm-color-border-strong)",
};

const DOT_TEXT: Record<StateDotState, string> = {
  active: "text-fg",
  standby: "text-fg",
  off: "text-fg-muted",
};

export function StateDot({ state, children, className }: StateDotProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 font-mono text-xs",
        DOT_TEXT[state],
        className,
      )}
    >
      <span
        className="inline-block h-1.5 w-1.5 rounded-full"
        style={{ backgroundColor: DOT_FILL[state] }}
        aria-hidden="true"
      />
      {children}
    </span>
  );
}

// ---------------------------------------------------------------------------
// StateText — semantic-coloured mono text for binary safety-critical states
// ---------------------------------------------------------------------------

export type StateTextTone = "success" | "warning" | "danger" | "muted";

export interface StateTextProps {
  tone?: StateTextTone;
  children: ReactNode;
  className?: string;
}

const TEXT_TONE: Record<StateTextTone, string> = {
  success: "text-success",
  warning: "text-warning",
  danger: "text-danger",
  muted: "text-fg-muted",
};

export function StateText({ tone = "muted", children, className }: StateTextProps) {
  return (
    <span
      className={cn(
        "font-mono text-xs font-semibold tracking-[0.04em]",
        TEXT_TONE[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
