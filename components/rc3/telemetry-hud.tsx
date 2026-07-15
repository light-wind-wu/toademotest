"use client";

import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export type UxvDomain = "aerial" | "ground" | "surface" | "underwater";
export type SpeedUnit = "m/s" | "km/h" | "kn";
export type VerticalUnit = "m" | "ft";
export type HudMode = "strip" | "frame";

/** A telemetry field that can be marked stale. Keyed by the prop that feeds the cell. */
export type TelemetryField =
  | "speed"
  | "vertical"
  | "heading"
  | "battery"
  | "fuel"
  | "roll"
  | "pitch"
  | "verticalRate"
  | "slope"
  | "altitudeAboveBottom";

export interface TelemetryHudProps {
  /** UXV domain. Drives label semantics — `vertical` reads as ALT / ELEV / DEPTH; `verticalRate` reads as V/S / DIVE. */
  domain?: UxvDomain;
  /** Layout — `strip` (default) is an inline horizontal row, suited to edge overlays and side panels. `frame` is a four-edge container around a centred viewport (map, 3D, video). */
  mode?: HudMode;
  /** Optional platform identifier — e.g. "UGV-04". Renders as the leading Ember-dotted cell. */
  platform?: string;
  /** Speed value. */
  speed?: number;
  speedUnit?: SpeedUnit;
  /** Vertical concept — domain-tuned. Aerial: altitude. Ground: elevation. Surface / underwater: depth. */
  vertical?: number;
  verticalUnit?: VerticalUnit;
  /** Optional reference marker — e.g. "AGL" / "MSL" / "BLW" — appended to the vertical cell. */
  verticalRef?: string;
  /** Vertical rate (m/s). Aerial: climb rate (signed). Underwater: dive rate (signed, positive descending). */
  verticalRate?: number;
  /** Heading in degrees (0–359). Three-digit padded. */
  heading?: number;
  /** Battery state of charge (0–100). Colour-coded — success > 50, warning 20–50, danger < 20. */
  battery?: number;
  /** Fuel level (0–100). Mutually exclusive with `battery`. */
  fuel?: number;
  /** Roll angle in degrees. Signed — negative left, positive right. */
  roll?: number;
  /** Pitch angle in degrees. Signed — negative down, positive up. */
  pitch?: number;
  /** Ground-only — slope / grade in degrees. Signed — positive uphill. */
  slope?: number;
  /** Distance to bottom in metres. Sounder reading; meaningful for underwater and deep-terrain ground platforms. */
  altitudeAboveBottom?: number;
  /**
   * Per-field staleness, in seconds since the last fresh update. A field listed here keeps its
   * last-known value but renders it dimmed with a STALE age tag, so a frozen reading can never
   * pass for live. Honours invariant 5 — mark stale rather than holding a silent last-good value.
   */
  stale?: Partial<Record<TelemetryField, number>>;
  /** Children — rendered inside the frame centre when `mode="frame"`. Ignored in strip mode. */
  children?: ReactNode;
  className?: string;
}

// RC3 signature hue (Ember). Inlined so the platform marker renders honestly regardless of
// docs theme or `data-pack` attribute. Matches the convention used in sibling RC3 organisms.
const EMBER = "oklch(71% 0.195 32)";

type Cell = { label: string; value: string; tone?: string; staleSeconds?: number };

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

function verticalRateLabel(domain: UxvDomain): string {
  switch (domain) {
    case "aerial":
      return "V/S";
    case "underwater":
      return "DIVE";
    default:
      return "V/S";
  }
}

function formatHeading(d: number): string {
  const n = ((d % 360) + 360) % 360;
  return `${Math.round(n).toString().padStart(3, "0")}°`;
}

function formatSigned(n: number, decimals = 0): string {
  const v = decimals > 0 ? n.toFixed(decimals) : Math.round(n).toString();
  return n >= 0 ? `+${v}` : v;
}

function chargeTone(pct: number): string {
  if (pct < 20) return "text-danger";
  if (pct <= 50) return "text-warning";
  return "text-success";
}

interface Cells {
  speed?: Cell;
  vertical?: Cell;
  heading?: Cell;
  charge?: Cell;
  roll?: Cell;
  pitch?: Cell;
  verticalRate?: Cell;
  slope?: Cell;
  bottom?: Cell;
}

function buildCells(props: TelemetryHudProps): Cells {
  const domain = props.domain ?? "aerial";
  const cells: Cells = {};

  if (props.speed !== undefined) {
    const u = props.speedUnit ?? "m/s";
    const v = u === "kn" || u === "km/h" ? Math.round(props.speed) : props.speed.toFixed(1);
    cells.speed = { label: "SPD", value: `${v} ${u}` };
  }
  if (props.vertical !== undefined) {
    const u = props.verticalUnit ?? "m";
    const ref = props.verticalRef ? ` ${props.verticalRef}` : "";
    cells.vertical = {
      label: verticalLabel(domain),
      value: `${Math.round(props.vertical)} ${u}${ref}`,
    };
  }
  if (props.heading !== undefined) {
    cells.heading = { label: "HDG", value: formatHeading(props.heading) };
  }
  if (props.battery !== undefined) {
    cells.charge = {
      label: "BATT",
      value: `${Math.round(props.battery)}%`,
      tone: chargeTone(props.battery),
    };
  } else if (props.fuel !== undefined) {
    cells.charge = {
      label: "FUEL",
      value: `${Math.round(props.fuel)}%`,
      tone: chargeTone(props.fuel),
    };
  }
  if (props.roll !== undefined) {
    cells.roll = { label: "ROLL", value: `${formatSigned(props.roll)}°` };
  }
  if (props.pitch !== undefined) {
    cells.pitch = { label: "PITCH", value: `${formatSigned(props.pitch)}°` };
  }
  if (props.verticalRate !== undefined) {
    cells.verticalRate = {
      label: verticalRateLabel(domain),
      value: `${formatSigned(props.verticalRate, 1)} m/s`,
    };
  }
  if (props.slope !== undefined && domain === "ground") {
    cells.slope = { label: "SLOPE", value: `${formatSigned(props.slope)}°` };
  }
  if (props.altitudeAboveBottom !== undefined) {
    cells.bottom = {
      label: "BOT",
      value: `${Math.round(props.altitudeAboveBottom)} m`,
    };
  }

  const s = props.stale;
  if (s) {
    if (cells.speed) cells.speed.staleSeconds = s.speed;
    if (cells.vertical) cells.vertical.staleSeconds = s.vertical;
    if (cells.heading) cells.heading.staleSeconds = s.heading;
    if (cells.charge) cells.charge.staleSeconds = props.battery !== undefined ? s.battery : s.fuel;
    if (cells.roll) cells.roll.staleSeconds = s.roll;
    if (cells.pitch) cells.pitch.staleSeconds = s.pitch;
    if (cells.verticalRate) cells.verticalRate.staleSeconds = s.verticalRate;
    if (cells.slope) cells.slope.staleSeconds = s.slope;
    if (cells.bottom) cells.bottom.staleSeconds = s.altitudeAboveBottom;
  }

  return cells;
}

/**
 * RC3 — Telemetry HUD
 *
 * Operational telemetry for a UXV — Aerial / Ground / Surface / Underwater. The `domain` prop
 * drives label semantics (vertical reads as ALT / ELEV / DEPTH; verticalRate as V/S / DIVE).
 * Two postures: `strip` (default — inline horizontal row, suited to edge overlays) and `frame`
 * (four-edge container around a centred viewport).
 *
 * The leading platform marker (when present) carries the Ember signature; operational values
 * are semantic — battery / fuel use success / warning / danger colours; the rest stay neutral.
 *
 * Honours invariant 5: telemetry never silently stale. When a field stops updating, the consumer
 * marks it stale via the `stale` prop (seconds since last fresh) — the value dims and carries a
 * STALE age tag, so a frozen reading can never pass for live.
 */
export function TelemetryHud(props: TelemetryHudProps) {
  const mode = props.mode ?? "strip";
  const cells = buildCells(props);
  const hasCells =
    cells.speed ||
    cells.vertical ||
    cells.heading ||
    cells.charge ||
    cells.roll ||
    cells.pitch ||
    cells.verticalRate ||
    cells.slope ||
    cells.bottom;

  if (mode === "frame") {
    return <FrameMode {...props} cells={cells} />;
  }

  if (!hasCells && !props.platform) return null;

  const ordered: Cell[] = [
    cells.speed,
    cells.vertical,
    cells.heading,
    cells.charge,
    cells.roll,
    cells.pitch,
    cells.verticalRate,
    cells.slope,
    cells.bottom,
  ].filter((c): c is Cell => Boolean(c));

  return (
    <div
      // biome-ignore lint/a11y/useSemanticElements: role="status" is the live-region pattern for this telemetry readout; a native element would change its layout.
      role="status"
      aria-live="polite"
      aria-label={`Telemetry${props.platform ? ` for ${props.platform}` : ""}`}
      className={cn(
        "inline-flex flex-wrap items-center gap-3 rounded-md border border-border bg-surface px-3 py-2",
        props.className,
      )}
    >
      {props.platform && (
        <>
          <PlatformMarker platform={props.platform} />
          {ordered.length > 0 && <Divider />}
        </>
      )}
      {ordered.map((c, i) => (
        <span key={c.label} className="inline-flex items-center gap-3">
          {i > 0 && <Divider />}
          <CellInline cell={c} />
        </span>
      ))}
    </div>
  );
}

function FrameMode({ cells, ...props }: TelemetryHudProps & { cells: Cells }) {
  const top: Cell[] = [];
  const left: Cell[] = [];
  const right: Cell[] = [];
  const bottom: Cell[] = [];

  if (cells.heading) top.push(cells.heading);
  if (cells.speed) left.push(cells.speed);
  if (cells.roll) left.push(cells.roll);
  if (cells.vertical) right.push(cells.vertical);
  if (cells.pitch) right.push(cells.pitch);
  if (cells.charge) bottom.push(cells.charge);
  if (cells.verticalRate) bottom.push(cells.verticalRate);
  if (cells.slope) bottom.push(cells.slope);
  if (cells.bottom) bottom.push(cells.bottom);

  return (
    <div
      // biome-ignore lint/a11y/useSemanticElements: role="status" is the live-region pattern for this telemetry readout; a native element would change its layout.
      role="status"
      aria-live="polite"
      aria-label={`Telemetry${props.platform ? ` for ${props.platform}` : ""}`}
      className={cn("relative h-full w-full", props.className)}
    >
      <div className="absolute inset-0">{props.children}</div>

      {(top.length > 0 || props.platform) && (
        <div className="pointer-events-none absolute inset-x-0 top-0 flex items-center justify-between px-4 py-3">
          {props.platform ? <PlatformMarker platform={props.platform} backdrop /> : <span />}
          {top.length > 0 && <EdgeRow cells={top} backdrop />}
          {!props.platform && <span />}
        </div>
      )}

      {left.length > 0 && (
        <div className="pointer-events-none absolute top-1/2 left-4 flex -translate-y-1/2 flex-col gap-2">
          {left.map((c) => (
            <EdgeCell key={c.label} cell={c} backdrop />
          ))}
        </div>
      )}

      {right.length > 0 && (
        <div className="pointer-events-none absolute top-1/2 right-4 flex -translate-y-1/2 flex-col items-end gap-2">
          {right.map((c) => (
            <EdgeCell key={c.label} cell={c} backdrop />
          ))}
        </div>
      )}

      {bottom.length > 0 && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center px-4 py-3">
          <EdgeRow cells={bottom} backdrop />
        </div>
      )}
    </div>
  );
}

function PlatformMarker({ platform, backdrop = false }: { platform: string; backdrop?: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded",
        backdrop && "bg-bg/80 px-2 py-1 backdrop-blur-sm",
      )}
    >
      <span
        className="inline-block h-1.5 w-1.5 rounded-full"
        style={{ backgroundColor: EMBER }}
        aria-hidden="true"
      />
      <span className="font-mono text-[11px] font-semibold tracking-[0.14em] text-fg">
        {platform}
      </span>
    </span>
  );
}

function StaleTag({ seconds }: { seconds: number }) {
  const age = seconds < 60 ? `${Math.round(seconds)}s` : `${Math.floor(seconds / 60)}m`;
  return (
    <span
      className="rounded px-1 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider"
      style={{
        backgroundColor: "color-mix(in oklch, var(--prizm-color-danger) 18%, transparent)",
        color: "var(--prizm-color-danger)",
      }}
    >
      STALE {age}
    </span>
  );
}

function CellParts({ cell }: { cell: Cell }) {
  const stale = cell.staleSeconds !== undefined;
  return (
    <>
      <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-fg-muted">
        {cell.label}
      </span>
      <span
        className={cn(
          "font-mono text-xs font-semibold tabular-nums",
          stale ? "text-fg-subtle" : (cell.tone ?? "text-fg"),
        )}
      >
        {cell.value}
      </span>
      {stale && <StaleTag seconds={cell.staleSeconds as number} />}
    </>
  );
}

function CellInline({ cell }: { cell: Cell }) {
  return (
    <span className="inline-flex items-baseline gap-1.5 whitespace-nowrap">
      <CellParts cell={cell} />
    </span>
  );
}

function EdgeCell({ cell, backdrop = false }: { cell: Cell; backdrop?: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-baseline gap-1.5 whitespace-nowrap rounded",
        backdrop && "bg-bg/80 px-2 py-1 backdrop-blur-sm",
      )}
    >
      <CellParts cell={cell} />
    </span>
  );
}

function EdgeRow({ cells, backdrop = false }: { cells: Cell[]; backdrop?: boolean }) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-3 rounded",
        backdrop && "bg-bg/80 px-2 py-1 backdrop-blur-sm",
      )}
    >
      {cells.map((c, i) => (
        <span key={c.label} className="inline-flex items-center gap-3">
          {i > 0 && <Divider />}
          <CellInline cell={c} />
        </span>
      ))}
    </div>
  );
}

function Divider() {
  return <span className="inline-block h-3 w-px bg-border" aria-hidden="true" />;
}
