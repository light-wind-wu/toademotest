"use client";

import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";

export type AutonomyScope = "platform" | "group" | "swarm" | "mission";

export interface AutonomyRung {
  /** Stable identifier, e.g. "manual". */
  key: string;
  /** Index label shown on the rail, e.g. "L0". */
  index: string;
  /** Display label, e.g. "MANUAL". Rendered in tracking-wider caps. */
  label: string;
  /** Loop-position authority, e.g. "OPERATOR" or "SYSTEM AI". Rendered faint, smaller. */
  authority: string;
  /** Optional one-line meaning. Not rendered on the rail; available for callers. */
  blurb?: string;
}

export interface AutonomyModeSelectorProps {
  /** The command-context scope the ladder applies to. */
  scope: AutonomyScope;
  /** Optional platform / context label rendered in the header. */
  platform?: string;
  /** Caller-supplied LOA taxonomy, ordered lowest to highest authority-to-machine. */
  rungs: AutonomyRung[];
  /** The key of the currently active rung. */
  activeKey: string;
  /** Called when a transition is committed. */
  onTransition?: (toKey: string) => void;
  /**
   * Require an armed second gesture to commit a climb toward more machine authority.
   * Descending toward the operator always bypasses this. Default true.
   */
  consent?: boolean;
  /** Disable all controls (e.g. when no platform is live). */
  disabled?: boolean;
  /**
   * Compact posture: collapses to a single tactical row with the active rung inline. A chevron
   * discloses the full rail. Default true — the production glance state. Set false for docs,
   * training surfaces, or any context where the whole ladder must remain visible.
   */
  compact?: boolean;
  /**
   * Standalone-instrument chrome: hairline bezel + surface fill, matching the sibling RC3
   * organisms. Default false — the control is embed-friendly and inherits the host surface's
   * chrome. Set true for docs heroes, modal / popover deployments, or any context where the
   * control is the dominant visual.
   */
  framed?: boolean;
  className?: string;
}

const CONFIRM_WINDOW_MS = 3000;

// RC3 signature hue (Ember). Inlined so selection reads honestly regardless of docs theme;
// when the RC3 pack is active the same hue backs the accent token.
const EMBER = "oklch(71% 0.195 32)";

/** Task-agnostic default ladder. Loop-position language; replace with your taxonomy. */
export const DEFAULT_RUNGS: AutonomyRung[] = [
  {
    key: "manual",
    index: "L0",
    label: "MANUAL",
    authority: "OPERATOR",
    blurb: "Operator commands and acts.",
  },
  {
    key: "supervised",
    index: "L1",
    label: "SUPERVISED",
    authority: "OP-IN-LOOP",
    blurb: "System acts; operator monitors every step and can take over instantly.",
  },
  {
    key: "delegated",
    index: "L2",
    label: "DELEGATED",
    authority: "OP-ON-LOOP",
    blurb: "System acts and decides routine steps; operator approves key decisions.",
  },
  {
    key: "autonomous",
    index: "L3",
    label: "AUTONOMOUS",
    authority: "SYSTEM AI",
    blurb: "System AI acts within mission intent; operator out of the loop.",
  },
];

/**
 * RC3 — Autonomy mode selector
 *
 * A vertical notched rail with a chevron position pointer on the active rung. Compact by default:
 * the production glance state is a single tactical row; the full ladder discloses on demand for
 * a mode change. Climbing the rail toward more machine authority arms on first tap and commits
 * on the second within three seconds; descending toward the operator is immediate.
 *
 * Honours behavioural invariant 4 (no mode-switch via accident) without gating the safety escape.
 */
export function AutonomyModeSelector({
  scope,
  platform,
  rungs,
  activeKey,
  onTransition,
  consent = true,
  disabled = false,
  compact = true,
  framed = false,
  className,
}: AutonomyModeSelectorProps) {
  const [armedKey, setArmedKey] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const railId = useId();

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  // biome-ignore lint/correctness/useExhaustiveDependencies: activeKey is intentionally a trigger dependency — arming resets whenever the externally-controlled active mode changes.
  useEffect(() => {
    setArmedKey(null);
  }, [activeKey]);

  const activeIndex = rungs.findIndex((r) => r.key === activeKey);
  const armedIndex = armedKey ? rungs.findIndex((r) => r.key === armedKey) : -1;
  const activeRung = rungs[activeIndex];
  const isArmed = armedKey !== null;

  const disarm = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setArmedKey(null);
  };

  const commit = (toKey: string) => {
    disarm();
    onTransition?.(toKey);
  };

  const handleSelect = (toKey: string, toIndex: number) => {
    if (disabled || toKey === activeKey) return;

    const increasing = toIndex > activeIndex;
    const needsConsent = consent && increasing;

    if (!needsConsent) {
      commit(toKey);
      return;
    }

    if (armedKey === toKey) {
      commit(toKey);
    } else {
      setArmedKey(toKey);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => setArmedKey(null), CONFIRM_WINDOW_MS);
    }
  };

  const handleKey = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === "Escape" && armedKey) {
      e.preventDefault();
      disarm();
    }
  };

  const ordered = rungs.map((rung, i) => ({ rung, i })).reverse();
  const showRail = !compact || expanded;
  const showActiveRow = !showRail;

  return (
    <div
      className={cn(
        "relative w-full max-w-sm transition-colors",
        framed && "rounded-md border bg-surface",
        framed && (isArmed ? "border-[var(--prizm-color-border-strong)]" : "border-border"),
        framed && isArmed && "shadow-[0_0_0_1px_oklch(71%_0.195_32)]",
        disabled && "opacity-50",
        className,
      )}
    >
      <Header
        scope={scope}
        platform={platform}
        compact={compact}
        expanded={expanded}
        onToggle={() => setExpanded((v) => !v)}
        controls={railId}
      />

      {showActiveRow && <ActiveRow rung={activeRung} />}

      {showRail && (
        <div
          id={railId}
          className={cn("relative px-3 py-3", !showActiveRow && "border-t border-border")}
          role="radiogroup"
          aria-label={`Autonomy mode for ${scope}`}
        >
          <Spine rungCount={rungs.length} />
          <ul className="relative flex flex-col">
            {ordered.map(({ rung, i }) => {
              const isActive = rung.key === activeKey;
              const rungArmed = rung.key === armedKey;
              return (
                <RungRow
                  key={rung.key}
                  rung={rung}
                  isActive={isActive}
                  isArmed={rungArmed}
                  disabled={disabled}
                  onSelect={() => handleSelect(rung.key, i)}
                  onKeyDown={handleKey}
                />
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

function Header({
  scope,
  platform,
  compact,
  expanded,
  onToggle,
  controls,
}: {
  scope: AutonomyScope;
  platform?: string;
  compact: boolean;
  expanded: boolean;
  onToggle: () => void;
  controls: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-2">
      <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-fg-muted">
        Autonomy
      </span>
      <div className="flex items-center gap-3">
        <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-fg-muted">
          {scope}
          {platform ? (
            <>
              <span className="mx-1.5 text-fg-subtle">·</span>
              <span className="text-fg">{platform}</span>
            </>
          ) : null}
        </span>
        {compact && (
          <button
            type="button"
            onClick={onToggle}
            aria-expanded={expanded}
            aria-controls={controls}
            aria-label={expanded ? "Collapse autonomy rail" : "Expand autonomy rail"}
            className="-mr-1 inline-flex h-5 w-5 shrink-0 items-center justify-center text-fg-muted transition-colors hover:text-fg focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
          >
            <ChevronDown
              className={cn("h-3.5 w-3.5 transition-transform", expanded && "rotate-180")}
            />
          </button>
        )}
      </div>
    </div>
  );
}

function ActiveRow({ rung }: { rung?: AutonomyRung }) {
  if (!rung) return null;

  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <ChevronPointer />
      <span className="ml-0.5 w-7 shrink-0 font-mono text-xs font-semibold tabular-nums text-fg">
        {rung.index}
      </span>
      <span className="flex-1 whitespace-nowrap font-mono text-[13px] font-semibold uppercase tracking-[0.14em] text-fg">
        {rung.label}
      </span>
      <span className="shrink-0 whitespace-nowrap font-mono text-[10px] uppercase tracking-[0.16em] text-fg-muted">
        {rung.authority}
      </span>
    </div>
  );
}

function Spine({ rungCount }: { rungCount: number }) {
  // Continuous hairline behind the rung rows. Each rung row places its own tick or chevron
  // on top of it, so the spine reads as a single vertical line through the gauge. The left
  // offset matches the rail container's px-3 plus the rung button's px-1, so the spine lands
  // on the left edge of the marker column inside each row.
  const ROW = 44;
  const PAD = 6;
  const height = (rungCount - 1) * ROW + PAD * 2;
  return (
    <span
      aria-hidden="true"
      className="absolute"
      style={{
        top: `calc(0.75rem + ${ROW / 2 - PAD}px)`,
        left: "calc(0.75rem + 0.25rem)",
        width: 1,
        height,
        backgroundColor: "var(--prizm-color-border-strong)",
        pointerEvents: "none",
      }}
    />
  );
}

function ChevronPointer({ ghost = false }: { ghost?: boolean }) {
  return (
    <svg
      aria-hidden="true"
      width="13"
      height="11"
      viewBox="0 0 13 11"
      className={ghost ? "rc3-ghost-pointer" : undefined}
      style={{ display: "block" }}
    >
      <polygon
        points="0,0 13,5.5 0,11"
        fill={ghost ? "transparent" : EMBER}
        stroke={ghost ? EMBER : "none"}
        strokeWidth="1.25"
        strokeLinejoin="miter"
      />
    </svg>
  );
}

function ScaleTick() {
  return (
    <span
      className="block"
      style={{
        width: 9,
        height: 1,
        backgroundColor: "var(--prizm-color-border-strong)",
      }}
    />
  );
}

function RungRow({
  rung,
  isActive,
  isArmed,
  disabled,
  onSelect,
  onKeyDown,
}: {
  rung: AutonomyRung;
  isActive: boolean;
  isArmed: boolean;
  disabled: boolean;
  onSelect: () => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLButtonElement>) => void;
}) {
  const marker = isActive ? <ChevronPointer /> : isArmed ? <ChevronPointer ghost /> : <ScaleTick />;

  return (
    <li className="flex" style={{ height: 44 }}>
      <button
        type="button"
        // biome-ignore lint/a11y/useSemanticElements: role="radio" on a button is the standard pattern for this custom autonomy-rung radiogroup; native radio inputs cannot carry the styled rung UI.
        role="radio"
        aria-checked={isActive}
        aria-label={
          isArmed
            ? `Confirm transition to ${rung.label}`
            : `${rung.index} ${rung.label}, ${rung.authority}`
        }
        disabled={disabled || isActive}
        onClick={onSelect}
        onKeyDown={onKeyDown}
        className={cn(
          "group flex w-full items-center gap-3 px-1 text-left transition-colors",
          "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-accent",
          "disabled:cursor-default",
          !isActive && "hover:bg-bg-muted",
        )}
      >
        <span className="relative flex w-4 shrink-0 items-center">{marker}</span>
        <span
          className={cn(
            "w-7 shrink-0 font-mono text-xs font-semibold tabular-nums",
            isActive ? "text-fg" : "text-fg-muted",
          )}
        >
          {rung.index}
        </span>
        <span
          className={cn(
            "flex-1 font-mono text-[13px] font-semibold uppercase tracking-[0.14em]",
            isActive ? "text-fg" : "text-fg-muted group-hover:text-fg",
          )}
          style={isArmed ? { color: EMBER } : undefined}
        >
          {isArmed ? "CONFIRM" : rung.label}
        </span>
        <span
          className={cn(
            "shrink-0 font-mono text-[10px] uppercase tracking-[0.16em]",
            isActive ? "text-fg-muted" : "text-fg-subtle",
          )}
        >
          {rung.authority}
        </span>
      </button>
    </li>
  );
}
