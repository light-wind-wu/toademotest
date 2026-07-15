"use client";

import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export type FeedStatus = "live" | "degraded" | "lost";

export type VideoAspectRatio = "16:9" | "4:3" | "9:16" | "1:1" | "auto";

export type SensorMode = "EO" | "IR" | "LL";

export interface VideoTileProps {
  /** Source identifier — e.g. "FPV · UGV-04". Rendered in the top-left corner in mono. */
  source: string;
  /** Feed status. Drives the corner state label and the no-signal overlay. */
  status: FeedStatus;
  /** Recording indicator — small danger dot + "REC" in the upper-right. */
  recording?: boolean;
  /** Aspect ratio constraint. "auto" lets children size the tile. Default "16:9". */
  aspectRatio?: VideoAspectRatio;
  /** Centre crosshair / reticle overlay for aim. */
  reticle?: boolean;
  /** Consumer-formatted look-point coordinates — e.g. `01°20'58"N 103°49'13"E`. */
  coordinates?: string;
  /** Camera bearing in degrees (0-359). Surfaces in the telemetry strip as `BRG ###°`. */
  bearing?: number;
  /** Range to look-point in metres. Surfaces in the strip as `RNG N m` or `N.N km`. */
  range?: number;
  /** Zoom multiplier — e.g. 4 for 4×. Surfaces in the strip as `ZOOM N×`. */
  zoom?: number;
  /** Sensor mode badge — EO (electro-optical), IR (infra-red), LL (low-light). */
  sensor?: SensorMode;
  /** The consumer-rendered video element, canvas, or player. RC3 wraps; the consumer plays. */
  children?: ReactNode;
  className?: string;
}

// RC3 signature hue (Ember). Inlined so the source dot renders honestly regardless of docs theme
// or `data-pack` attribute. Matches the autonomy-mode-selector convention.
const EMBER = "oklch(71% 0.195 32)";

const ASPECT_CLASS: Record<VideoAspectRatio, string> = {
  "16:9": "aspect-video",
  "4:3": "aspect-[4/3]",
  "9:16": "aspect-[9/16]",
  "1:1": "aspect-square",
  auto: "",
};

const STATUS: Record<FeedStatus, { label: string; tone: string }> = {
  live: { label: "LIVE", tone: "text-success" },
  degraded: { label: "DEGRADED", tone: "text-warning" },
  lost: { label: "NO SIGNAL", tone: "text-danger" },
};

function formatRange(metres: number): string {
  if (metres >= 1000) return `${(metres / 1000).toFixed(metres >= 10000 ? 0 : 1)} km`;
  return `${Math.round(metres)} m`;
}

function formatBearing(degrees: number): string {
  const n = ((degrees % 360) + 360) % 360;
  return `${Math.round(n).toString().padStart(3, "0")}°`;
}

function telemetryCells({
  coordinates,
  bearing,
  range,
  zoom,
  sensor,
}: Pick<VideoTileProps, "coordinates" | "bearing" | "range" | "zoom" | "sensor">): string[] {
  const cells: string[] = [];
  if (coordinates) cells.push(coordinates);
  if (sensor) cells.push(sensor);
  if (bearing !== undefined) cells.push(`BRG ${formatBearing(bearing)}`);
  if (range !== undefined) cells.push(`RNG ${formatRange(range)}`);
  if (zoom !== undefined) cells.push(`ZOOM ${zoom}×`);
  return cells;
}

/**
 * RC3 — Video tile
 *
 * Frames a single video / sensor feed. RC3 ships the surface (border, source label, status dot,
 * recording indicator, reticle, no-signal overlay) — the consumer plugs their actual video
 * element, canvas, or stream player into `children`. Honours behavioural invariant 5: telemetry
 * never silently stale. A lost feed surfaces as an unambiguous "NO SIGNAL" overlay rather than
 * a frozen last frame.
 */
export function VideoTile({
  source,
  status,
  recording = false,
  aspectRatio = "16:9",
  reticle = false,
  coordinates,
  bearing,
  range,
  zoom,
  sensor,
  children,
  className,
}: VideoTileProps) {
  const s = STATUS[status];
  const lost = status === "lost";
  const cells = lost ? [] : telemetryCells({ coordinates, bearing, range, zoom, sensor });

  return (
    <div
      // biome-ignore lint/a11y/useSemanticElements: role="figure" labels this video tile; a native <figure> carries default margins that would break the tile layout.
      role="figure"
      aria-label={`${source}, ${s.label}`}
      className={cn(
        "relative overflow-hidden rounded-md border border-border bg-bg",
        ASPECT_CLASS[aspectRatio],
        className,
      )}
    >
      <div className="absolute inset-0">{children}</div>

      {lost && (
        <div className="absolute inset-0 flex items-center justify-center bg-bg/85 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-2">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-danger" aria-hidden="true" />
            <span className="font-mono text-xs font-semibold uppercase tracking-[0.16em] text-danger">
              No signal
            </span>
          </div>
        </div>
      )}

      {reticle && !lost && (
        <svg
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 m-auto h-12 w-12 text-fg-muted opacity-70"
          viewBox="0 0 48 48"
          fill="none"
        >
          <line x1="24" y1="6" x2="24" y2="20" stroke="currentColor" strokeWidth="1.25" />
          <line x1="24" y1="28" x2="24" y2="42" stroke="currentColor" strokeWidth="1.25" />
          <line x1="6" y1="24" x2="20" y2="24" stroke="currentColor" strokeWidth="1.25" />
          <line x1="28" y1="24" x2="42" y2="24" stroke="currentColor" strokeWidth="1.25" />
          <circle cx="24" cy="24" r="18" stroke="currentColor" strokeWidth="1" />
          <circle cx="24" cy="24" r="1.5" fill="currentColor" />
        </svg>
      )}

      <div className="pointer-events-none absolute left-2.5 top-2.5 flex items-center gap-2 rounded bg-bg/80 px-2 py-1 backdrop-blur-sm">
        <span
          className="inline-block h-1.5 w-1.5 rounded-full"
          style={{ backgroundColor: EMBER }}
          aria-hidden="true"
        />
        <span className="font-mono text-[11px] font-semibold tracking-[0.14em] text-fg">
          {source}
        </span>
        <span className="text-fg-subtle" aria-hidden="true">
          ·
        </span>
        <span
          className={cn("font-mono text-[10px] font-semibold uppercase tracking-[0.16em]", s.tone)}
        >
          {s.label}
        </span>
      </div>

      {cells.length > 0 && (
        <div className="pointer-events-none absolute bottom-2.5 left-2.5 flex max-w-[calc(100%-1.25rem)] items-center gap-2 rounded bg-bg/80 px-2 py-1 backdrop-blur-sm">
          {cells.map((cell, i) => (
            <span key={cell} className="flex items-center gap-2 whitespace-nowrap">
              {i > 0 && (
                <span className="text-fg-subtle" aria-hidden="true">
                  ·
                </span>
              )}
              <span className="font-mono text-[10px] tracking-[0.14em] text-fg">{cell}</span>
            </span>
          ))}
        </div>
      )}

      {recording && (
        <div
          // biome-ignore lint/a11y/useSemanticElements: role="status" announces the live recording state; a native element would change this overlay's layout.
          role="status"
          aria-label="Recording"
          className="pointer-events-none absolute right-2.5 top-2.5 flex items-center gap-1.5 rounded bg-bg/80 px-2 py-1 backdrop-blur-sm"
        >
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-danger" aria-hidden="true" />
          <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-danger">
            Rec
          </span>
        </div>
      )}
    </div>
  );
}
