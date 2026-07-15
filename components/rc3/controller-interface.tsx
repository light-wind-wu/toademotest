"use client";

import { cn } from "@/lib/utils";

export interface StickState {
  /** Horizontal axis. -1 (full left) to 1 (full right). */
  x: number;
  /** Vertical axis. -1 (full down) to 1 (full up). Positive up is convention. */
  y: number;
}

export interface ControllerButton {
  /** Stable identifier. */
  id: string;
  /** Display label — e.g. "A", "RB", "STOP". */
  label: string;
  /** Currently pressed — surfaces as the inverted pill state. */
  pressed?: boolean;
  /** Optional binding — what this button does. Rendered as a small subtitle inside the pill. */
  binding?: string;
}

export interface ControllerInterfaceProps {
  /** Optional platform identifier — Ember-dotted leading cell. */
  platform?: string;
  /** Left stick state. */
  leftStick?: StickState;
  /** Left stick binding — e.g. "DRIVE". Rendered above the well. */
  leftStickLabel?: string;
  /** Right stick state. */
  rightStick?: StickState;
  /** Right stick binding — e.g. "GIMBAL". */
  rightStickLabel?: string;
  /** Left trigger value, 0 to 1. */
  leftTrigger?: number;
  /** Left trigger binding — e.g. "ZOOM". */
  leftTriggerLabel?: string;
  /** Right trigger value, 0 to 1. */
  rightTrigger?: number;
  /** Right trigger binding — e.g. "FOCUS". */
  rightTriggerLabel?: string;
  /** Button row. */
  buttons?: ControllerButton[];
  className?: string;
}

// RC3 signature hue (Ember). Inlined so the platform marker renders honestly regardless of
// docs theme or `data-pack` attribute.
const EMBER = "oklch(71% 0.195 32)";

const WELL_SIZE = 56;
const WELL_RADIUS = WELL_SIZE / 2;
const DEAD_ZONE_RADIUS = 4;

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function fmtAxis(v: number): string {
  // Fixed-width signed format so the X / Y readout under each well stays the same length as
  // values swing through zero — prevents the column (and everything downstream of it) from
  // shifting between e.g. "0.10" and "-0.10".
  const rounded = Math.round(v * 100) / 100;
  if (Math.abs(rounded) < 0.005) return "+0.00";
  const sign = rounded >= 0 ? "+" : "-";
  return `${sign}${Math.abs(rounded).toFixed(2)}`;
}

function fmtTrigger(v: number): string {
  // Triggers are non-negative; fixed at 4 chars.
  return clamp(v, 0, 1).toFixed(2);
}

/**
 * RC3 — Controller interface
 *
 * Live operator input state — sticks, triggers, buttons. Read-only; the consumer wires input
 * from their gamepad / WebSocket / physical controller pipeline. The strip surfaces what the
 * operator is doing right now — useful for direct teleop confirmation, deadzone debugging, and
 * binding reference. The platform marker carries the Ember signature; operational controls stay
 * neutral.
 *
 * Honours invariant 5 (telemetry never silently stale) by extension: when a stick or trigger
 * goes unresponsive, the consumer should stop passing its value rather than holding the
 * last-known position.
 */
export function ControllerInterface(props: ControllerInterfaceProps) {
  const {
    platform,
    leftStick,
    leftStickLabel,
    rightStick,
    rightStickLabel,
    leftTrigger,
    leftTriggerLabel,
    rightTrigger,
    rightTriggerLabel,
    buttons,
    className,
  } = props;

  const hasAny =
    platform ||
    leftStick ||
    rightStick ||
    leftTrigger !== undefined ||
    rightTrigger !== undefined ||
    (buttons && buttons.length > 0);

  if (!hasAny) return null;

  return (
    <div
      // biome-ignore lint/a11y/useSemanticElements: role="status" is the live-region pattern for this controller readout; a native element would change its layout.
      role="status"
      aria-live="polite"
      aria-label={`Controller input${platform ? ` for ${platform}` : ""}`}
      className={cn(
        "inline-flex flex-wrap items-end gap-4 rounded-md border border-border bg-surface px-4 py-3",
        className,
      )}
    >
      {platform && <PlatformMarker platform={platform} />}

      {leftStick && <StickWell stick={leftStick} label={leftStickLabel ?? "STICK L"} />}
      {rightStick && <StickWell stick={rightStick} label={rightStickLabel ?? "STICK R"} />}

      {leftTrigger !== undefined && (
        <TriggerBar value={leftTrigger} label={leftTriggerLabel ?? "TRIG L"} />
      )}
      {rightTrigger !== undefined && (
        <TriggerBar value={rightTrigger} label={rightTriggerLabel ?? "TRIG R"} />
      )}

      {buttons && buttons.length > 0 && (
        <div className="flex flex-wrap items-end gap-1.5 self-stretch">
          {buttons.map((b) => (
            <ButtonPill key={b.id} button={b} />
          ))}
        </div>
      )}
    </div>
  );
}

function PlatformMarker({ platform }: { platform: string }) {
  return (
    <span className="inline-flex items-center gap-2 self-center">
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

function StickWell({ stick, label }: { stick: StickState; label: string }) {
  const x = clamp(stick.x, -1, 1);
  const y = clamp(stick.y, -1, 1);
  const dotX = WELL_RADIUS + x * (WELL_RADIUS - 6);
  const dotY = WELL_RADIUS - y * (WELL_RADIUS - 6);

  return (
    <div className="flex flex-col items-center gap-1.5" aria-label={label}>
      <span className="font-mono text-[9px] font-semibold uppercase tracking-[0.16em] text-fg-muted">
        {label}
      </span>
      <svg
        width={WELL_SIZE}
        height={WELL_SIZE}
        viewBox={`0 0 ${WELL_SIZE} ${WELL_SIZE}`}
        aria-hidden="true"
      >
        <circle
          cx={WELL_RADIUS}
          cy={WELL_RADIUS}
          r={WELL_RADIUS - 1}
          fill="var(--prizm-color-bg)"
          stroke="var(--prizm-color-border)"
          strokeWidth="1"
        />
        <circle
          cx={WELL_RADIUS}
          cy={WELL_RADIUS}
          r={DEAD_ZONE_RADIUS}
          fill="none"
          stroke="var(--prizm-color-border)"
          strokeWidth="0.75"
          strokeDasharray="2 2"
        />
        <line
          x1={WELL_RADIUS}
          y1={WELL_RADIUS}
          x2={dotX}
          y2={dotY}
          stroke="var(--prizm-color-fg-muted)"
          strokeWidth="0.75"
          opacity="0.6"
        />
        <circle cx={dotX} cy={dotY} r={3} fill="var(--prizm-color-fg)" />
      </svg>
      <span className="font-mono text-[9px] tabular-nums text-fg-subtle">
        {fmtAxis(x)} / {fmtAxis(y)}
      </span>
    </div>
  );
}

function TriggerBar({ value, label }: { value: number; label: string }) {
  const v = clamp(value, 0, 1);
  const fillHeight = Math.round(v * 100);

  return (
    <div className="flex flex-col items-center gap-1.5" aria-label={label}>
      <span className="font-mono text-[9px] font-semibold uppercase tracking-[0.16em] text-fg-muted">
        {label}
      </span>
      <div
        className="relative overflow-hidden rounded-sm border border-border bg-bg"
        style={{ width: 10, height: WELL_SIZE }}
        aria-hidden="true"
      >
        <div
          className="absolute bottom-0 left-0 right-0 bg-fg-muted"
          style={{ height: `${fillHeight}%` }}
        />
      </div>
      <span className="font-mono text-[9px] tabular-nums text-fg-subtle">{fmtTrigger(v)}</span>
    </div>
  );
}

function ButtonPill({ button }: { button: ControllerButton }) {
  const pressed = button.pressed === true;

  return (
    <span
      // biome-ignore lint/a11y/useSemanticElements: role="status" announces this button's live pressed state; a native element would change its inline layout.
      role="status"
      aria-label={`${button.label}${button.binding ? ` — ${button.binding}` : ""}, ${pressed ? "pressed" : "released"}`}
      className={cn(
        "inline-flex min-w-[2.25rem] flex-col items-center justify-center gap-0.5 rounded border px-2 py-1 transition-colors",
        pressed ? "border-fg bg-fg text-bg" : "border-border bg-bg text-fg-muted",
      )}
    >
      <span className="font-mono text-[10px] font-semibold tracking-[0.14em]">{button.label}</span>
      {button.binding && (
        <span
          className={cn(
            "font-mono text-[8px] tracking-[0.14em] uppercase",
            pressed ? "text-bg/70" : "text-fg-subtle",
          )}
        >
          {button.binding}
        </span>
      )}
    </span>
  );
}
