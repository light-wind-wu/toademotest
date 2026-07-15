"use client";

import { cn } from "@/lib/utils";

export type Scope = "platform" | "group" | "swarm" | "mission";

export type LinkStatus = "good" | "degraded" | "lost";

export interface PlatformLink {
  id: string;
  signal: 0 | 1 | 2 | 3 | 4;
  battery?: number;
  gpsLock?: boolean;
  status: LinkStatus;
}

export interface CommsHealthStripProps {
  /** Scope determines whether the strip shows a single rich row or an aggregated summary. */
  scope: Scope;
  /** Single platform at platform scope. */
  platform?: PlatformLink;
  /** Multiple platforms at group / swarm / mission scope. */
  platforms?: PlatformLink[];
  className?: string;
}

/**
 * RC3 — Comms / health strip
 *
 * Honours behavioural invariant 2: comms / health are visible whenever a live platform is
 * connected. Persistent, compact strip. Status colours follow semantic tokens (success / warning
 * / danger). Ember is not used here — comms is status, not identity.
 */
export function CommsHealthStrip({ scope, platform, platforms, className }: CommsHealthStripProps) {
  if (scope === "platform") {
    return <PlatformView platform={platform} className={className} />;
  }
  return <AggregatedView scope={scope} platforms={platforms ?? []} className={className} />;
}

function PlatformView({
  platform,
  className,
}: {
  platform?: PlatformLink;
  className?: string;
}) {
  if (!platform) {
    return (
      <div
        // biome-ignore lint/a11y/useSemanticElements: role="status" is the live-region pattern for this comms readout; a native element would change its inline layout.
        role="status"
        aria-live="polite"
        className={cn(
          "inline-flex items-center gap-3 rounded-md border border-border bg-bg-muted px-4 py-2.5 text-xs text-fg-subtle",
          className,
        )}
      >
        No platform connected
      </div>
    );
  }

  const linkLabel =
    platform.status === "good" ? "LINK" : platform.status === "degraded" ? "DEGRADED" : "LOST";

  const linkTone =
    platform.status === "good"
      ? "text-success"
      : platform.status === "degraded"
        ? "text-warning"
        : "text-danger";

  return (
    <div
      // biome-ignore lint/a11y/useSemanticElements: role="status" is the live-region pattern for this comms readout; a native element would change its inline layout.
      role="status"
      aria-live="polite"
      aria-label={`Comms for ${platform.id}: ${linkLabel}`}
      className={cn(
        "inline-flex items-center gap-4 rounded-md border border-border bg-surface px-4 py-2.5",
        className,
      )}
    >
      <SignalBars filled={platform.signal} status={platform.status} />
      <span className="font-mono text-xs font-semibold text-fg">{platform.id}</span>
      <Divider />
      <span className={cn("font-mono text-xs font-semibold uppercase tracking-wider", linkTone)}>
        {linkLabel}
      </span>
      {platform.battery !== undefined && (
        <>
          <Divider />
          <span className="font-mono text-xs text-fg-muted">
            BATT <span className="font-semibold text-fg">{platform.battery}%</span>
          </span>
        </>
      )}
      {platform.gpsLock && (
        <>
          <Divider />
          <span className="font-mono text-xs font-semibold text-fg">GPS LOCK</span>
        </>
      )}
    </div>
  );
}

function AggregatedView({
  scope,
  platforms,
  className,
}: {
  scope: Scope;
  platforms: PlatformLink[];
  className?: string;
}) {
  const total = platforms.length;
  const good = platforms.filter((p) => p.status === "good").length;
  const degraded = platforms.filter((p) => p.status === "degraded").length;
  const lost = platforms.filter((p) => p.status === "lost").length;
  const linked = good + degraded;
  const percentGood = total > 0 ? Math.round((good / total) * 100) : 0;

  const showPips = (scope === "group" || scope === "swarm") && total <= 12;

  return (
    <div
      // biome-ignore lint/a11y/useSemanticElements: role="status" is the live-region pattern for this comms readout; a native element would change its inline layout.
      role="status"
      aria-live="polite"
      aria-label={`Comms summary: ${linked} of ${total} linked, ${percentGood} percent healthy`}
      className={cn(
        "inline-flex flex-wrap items-center gap-4 rounded-md border border-border bg-surface px-4 py-2.5",
        className,
      )}
    >
      <span className="font-mono text-xs font-semibold text-fg">
        {linked}
        <span className="text-fg-muted">/{total}</span> LINK
      </span>
      <Divider />
      <span className="font-mono text-xs text-fg-muted">
        <span className={cn("font-semibold", percentGood === 100 ? "text-success" : "text-fg")}>
          {percentGood}%
        </span>{" "}
        OK
      </span>
      {degraded > 0 && (
        <>
          <Divider />
          <span className="font-mono text-xs font-semibold text-warning">{degraded} DEGRADED</span>
        </>
      )}
      {lost > 0 && (
        <>
          <Divider />
          <span className="font-mono text-xs font-semibold text-danger">{lost} LOST</span>
        </>
      )}
      {showPips && (
        <>
          <Divider />
          <div className="flex items-center gap-1" aria-hidden="true">
            {platforms.map((p) => (
              <span
                key={p.id}
                title={`${p.id} · ${p.status}`}
                className="inline-block h-1.5 w-1.5 rounded-full"
                style={{
                  backgroundColor:
                    p.status === "good"
                      ? "var(--prizm-color-success)"
                      : p.status === "degraded"
                        ? "var(--prizm-color-warning)"
                        : "var(--prizm-color-danger)",
                }}
              />
            ))}
          </div>
        </>
      )}
    </div>
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
          className="w-1 rounded-sm"
          style={{
            height: `${h}px`,
            backgroundColor: i < filled ? color : "var(--prizm-color-border)",
          }}
        />
      ))}
    </div>
  );
}

function Divider() {
  return <span className="inline-block h-3 w-px bg-border" aria-hidden="true" />;
}
