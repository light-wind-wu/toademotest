"use client";

import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export type LinkStatus = "good" | "degraded" | "lost";
export type UxvDomain = "aerial" | "ground" | "surface" | "underwater";

export interface MissionStep {
  /** Current step number, 1-indexed. */
  current: number;
  /** Total number of steps. */
  total: number;
  /** Optional label — e.g. "WPT-06" or "RECON LEG B". */
  label?: string;
}

export interface PlatformDetailExtra {
  /**
   * Optional section label. Consecutive extras with the same `section` value group under one
   * section header. When omitted, the row merges into the immediately-preceding section (or
   * starts a generic "Extra" section if none precedes).
   */
  section?: string;
  label: string;
  value: ReactNode;
}

export interface PlatformDetailProps {
  /** Platform identifier — e.g. "UAV-01". */
  platform: string;
  /** Class tag — e.g. "UGV", "UAV", "USV", "UUV". */
  klass?: string;
  /** Domain — drives the vertical concept label (ALT / ELEV / DEPTH). */
  domain?: UxvDomain;
  /** Link status. */
  link?: LinkStatus;
  /** Signal bars (0–4). */
  signal?: 0 | 1 | 2 | 3 | 4;
  /** Battery 0–100, semantic colour. */
  battery?: number;
  /** Current autonomy rung label — e.g. "DELEGATED". */
  autonomy?: string;
  /** Consumer-formatted coordinates — e.g. `01°20'58"N 103°49'13"E`. */
  position?: string;
  /** Heading in degrees (0–359). */
  heading?: number;
  /** Speed value. */
  speed?: number;
  speedUnit?: "m/s" | "km/h" | "kn";
  /** Vertical position. Aerial: altitude. Ground: elevation. Surface / underwater: depth. */
  vertical?: number;
  verticalUnit?: "m" | "ft";
  verticalRef?: string;
  /** Mission step progress. */
  mission?: MissionStep;
  /** Active operator — who is driving / supervising right now. */
  operator?: string;
  /** Last heartbeat / contact age — e.g. "0.3 s ago" or "12 s ago". */
  lastContact?: string;
  /**
   * Domain-specific rows surfaced between Mission and Last contact — payload, sensor health,
   * fuel, munitions, etc. Each entry is `{ section?, label, value }`. Consecutive entries with
   * the same `section` value group together. When `section` is omitted on an entry, it merges
   * into the immediately-preceding section (or starts a generic "Extra" section if none
   * precedes). An empty array renders nothing.
   */
  extras?: PlatformDetailExtra[];
  /**
   * Opt into fit-and-scroll. The root takes the parent's full height, the header and last-
   * contact footer stay anchored, and the body section (Comms / Telemetry / Mission / extras)
   * scrolls within the frame. Use when composing inside a height-constrained container and
   * content might exceed the frame. Default `false` keeps today's intrinsic-height behaviour.
   */
  fillHeight?: boolean;
  className?: string;
}

// RC3 signature hue (Ember). Inlined so the platform marker renders honestly regardless of
// docs theme or `data-pack` attribute.
const EMBER = "oklch(71% 0.195 32)";

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

function chargeTone(pct: number): string {
  if (pct < 20) return "text-danger";
  if (pct <= 50) return "text-warning";
  return "text-success";
}

function verticalLabel(domain: UxvDomain): string {
  switch (domain) {
    case "aerial":
      return "ALT";
    case "ground":
      return "ELEV";
    case "surface":
    case "underwater":
      return "DEPTH";
  }
}

function formatHeading(d: number): string {
  const n = ((d % 360) + 360) % 360;
  return `${Math.round(n).toString().padStart(3, "0")}°`;
}

/**
 * RC3 — Platform detail
 *
 * Vertical card showing the deep state of a single platform — the master-detail companion to
 * platform roster. Operators reach for this when they need more than the roster row provides:
 * position, heading, speed, mission progress, current operator, sensor health. Each section
 * renders only when its prop is passed.
 *
 * Honours invariant 3 (active context unambiguous) — the Ember-dotted header makes the
 * platform being detailed unmistakable. Status fields use semantic tokens; identity stays on
 * the platform marker.
 */
export function PlatformDetail(props: PlatformDetailProps) {
  const {
    platform,
    klass,
    domain,
    link,
    signal,
    battery,
    autonomy,
    position,
    heading,
    speed,
    speedUnit,
    vertical,
    verticalUnit,
    verticalRef,
    mission,
    operator,
    lastContact,
    extras,
    fillHeight,
    className,
  } = props;

  const hasComms = link !== undefined || signal !== undefined || battery !== undefined;
  const hasTelemetry =
    position !== undefined ||
    heading !== undefined ||
    speed !== undefined ||
    vertical !== undefined;
  const hasMission = mission !== undefined || operator !== undefined;
  const extraGroups = groupExtras(extras);

  return (
    <div
      // biome-ignore lint/a11y/useSemanticElements: role="region" marks this detail landmark; a native <section> is not required and would add no semantics here.
      role="region"
      aria-label={`Platform detail for ${platform}`}
      className={cn(
        "flex w-full max-w-sm flex-col overflow-hidden rounded-md border border-border bg-surface",
        fillHeight && "h-full min-h-0",
        className,
      )}
    >
      <header className="flex shrink-0 items-baseline justify-between gap-3 border-b border-border bg-bg-subtle px-4 py-3">
        <span className="inline-flex items-center gap-2">
          <span
            className="inline-block h-1.5 w-1.5 rounded-full"
            style={{ backgroundColor: EMBER }}
            aria-hidden="true"
          />
          <span className="font-mono text-xs font-semibold tracking-[0.14em] text-fg">
            {platform}
          </span>
          {klass && (
            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-fg-subtle">
              {klass}
            </span>
          )}
        </span>
        {autonomy && (
          <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-fg-muted">
            {autonomy}
          </span>
        )}
      </header>

      <div className={cn("divide-y divide-border", fillHeight && "flex-1 min-h-0 overflow-y-auto")}>
        {hasComms && (
          <Section label="Comms">
            {link && (
              <Row
                label="Link"
                value={
                  <span className={cn("font-mono text-xs font-semibold", LINK_TONE[link])}>
                    {LINK_LABEL[link]}
                  </span>
                }
              />
            )}
            {signal !== undefined && (
              <Row
                label="Signal"
                value={
                  <span className="inline-flex items-center gap-1.5 font-mono text-xs tabular-nums text-fg">
                    <SignalBars filled={signal} status={link ?? "good"} />
                    {signal}/4
                  </span>
                }
              />
            )}
            {battery !== undefined && (
              <Row
                label="Battery"
                value={
                  <span
                    className={cn(
                      "inline-flex items-center gap-1.5 font-mono text-xs font-semibold tabular-nums",
                      chargeTone(battery),
                    )}
                  >
                    <BatteryGauge pct={battery} />
                    {Math.round(battery)}%
                  </span>
                }
              />
            )}
          </Section>
        )}

        {hasTelemetry && (
          <Section label="Telemetry">
            {position && (
              <Row
                label="Position"
                value={<span className="font-mono text-xs text-fg">{position}</span>}
              />
            )}
            {heading !== undefined && (
              <Row
                label="Heading"
                value={
                  <span className="inline-flex items-center gap-1.5 font-mono text-xs tabular-nums text-fg">
                    <HeadingDial heading={heading} />
                    {formatHeading(heading)}
                  </span>
                }
              />
            )}
            {speed !== undefined && (
              <Row
                label="Speed"
                value={
                  <span className="font-mono text-xs tabular-nums text-fg">
                    {speed.toFixed(speedUnit === "m/s" ? 1 : 0)} {speedUnit ?? "m/s"}
                  </span>
                }
              />
            )}
            {vertical !== undefined && (
              <Row
                label={verticalLabel(domain ?? "aerial")}
                value={
                  <span className="font-mono text-xs tabular-nums text-fg">
                    {Math.round(vertical)} {verticalUnit ?? "m"}
                    {verticalRef ? ` ${verticalRef}` : ""}
                  </span>
                }
              />
            )}
          </Section>
        )}

        {hasMission && (
          <Section label="Mission">
            {mission && (
              <Row
                label="Step"
                value={
                  <span className="font-mono text-xs tabular-nums text-fg">
                    {mission.label ? `${mission.label} · ` : ""}
                    {mission.current}/{mission.total}
                  </span>
                }
              />
            )}
            {operator && (
              <Row
                label="Operator"
                value={<span className="font-mono text-xs text-fg">{operator}</span>}
              />
            )}
          </Section>
        )}

        {extraGroups.map((group) => (
          <Section key={group.key} label={group.section}>
            {group.rows.map((r, i) => (
              <Row key={`${group.key}-${i}`} label={r.label} value={r.value} />
            ))}
          </Section>
        ))}
      </div>

      {lastContact && (
        <div className="flex shrink-0 items-baseline justify-between gap-3 border-t border-border px-4 py-2">
          <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-fg-muted">
            Last contact
          </span>
          <span className="font-mono text-xs text-fg-muted">{lastContact}</span>
        </div>
      )}
    </div>
  );
}

function Section({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="px-4 py-3">
      <div className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-fg-subtle">
        {label}
      </div>
      <div className="mt-1.5 space-y-1">{children}</div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-fg-muted">
        {label}
      </span>
      {value}
    </div>
  );
}

interface GroupedExtras {
  section: string;
  key: string;
  rows: Array<{ label: string; value: ReactNode }>;
}

function groupExtras(extras: PlatformDetailExtra[] | undefined): GroupedExtras[] {
  if (!extras || extras.length === 0) return [];
  const groups: GroupedExtras[] = [];
  for (const item of extras) {
    const current = groups[groups.length - 1];
    const matchesCurrent =
      current !== undefined && (item.section === undefined || item.section === current.section);
    if (matchesCurrent) {
      current.rows.push({ label: item.label, value: item.value });
    } else {
      const section = item.section ?? "Extra";
      groups.push({
        section,
        key: `${section}-${groups.length}`,
        rows: [{ label: item.label, value: item.value }],
      });
    }
  }
  return groups;
}

function SignalBars({ filled, status }: { filled: number; status: LinkStatus }) {
  const heights = [4, 7, 10, 13];
  const tone =
    status === "good"
      ? "var(--prizm-color-success)"
      : status === "degraded"
        ? "var(--prizm-color-warning)"
        : "var(--prizm-color-danger)";
  return (
    <span className="inline-flex items-end gap-0.5" aria-hidden="true">
      {heights.map((h, i) => (
        <span
          key={h}
          className="w-1 rounded-sm"
          style={{
            height: `${h}px`,
            backgroundColor: i < filled ? tone : "var(--prizm-color-border)",
          }}
        />
      ))}
    </span>
  );
}

function BatteryGauge({ pct }: { pct: number }) {
  const clamped = Math.max(0, Math.min(100, pct));
  const tone =
    clamped < 20
      ? "var(--prizm-color-danger)"
      : clamped <= 50
        ? "var(--prizm-color-warning)"
        : "var(--prizm-color-success)";
  return (
    <span
      className="relative inline-flex h-2.5 w-5 items-center rounded-[2px] border border-[var(--prizm-color-border-strong)] p-px"
      aria-hidden="true"
    >
      <span
        className="block h-full rounded-[1px]"
        style={{ width: `${clamped}%`, backgroundColor: tone }}
      />
      <span
        className="absolute -right-[3px] top-1/2 h-1.5 w-[2px] -translate-y-1/2 rounded-r-sm bg-[var(--prizm-color-border-strong)]"
        aria-hidden="true"
      />
    </span>
  );
}

function HeadingDial({ heading }: { heading: number }) {
  const angle = ((heading % 360) + 360) % 360;
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true" style={{ display: "block" }}>
      <polygon
        points="6,1.5 9,9 6,7.25 3,9"
        fill="var(--prizm-color-fg-muted)"
        stroke="var(--prizm-color-fg-muted)"
        strokeWidth="0.75"
        strokeLinejoin="miter"
        style={{ transform: `rotate(${angle}deg)`, transformOrigin: "center" }}
      />
    </svg>
  );
}
