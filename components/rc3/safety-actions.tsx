"use client";

import { cn } from "@/lib/utils";
import { X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export type SafetyScope = "platform" | "group" | "swarm" | "mission";

export type SafetyActionKey =
  | "e-stop"
  | "override"
  | "recall-group"
  | "recall-swarm"
  | "abort"
  | "pause"
  | "suspend";

type ActionDef = { key: SafetyActionKey; label: string };

const PRIMARY: Record<SafetyScope, ActionDef> = {
  platform: { key: "e-stop", label: "E-Stop" },
  group: { key: "recall-group", label: "Recall Group" },
  swarm: { key: "recall-swarm", label: "Recall Swarm" },
  mission: { key: "abort", label: "Abort Mission" },
};

const SECONDARY: Record<SafetyScope, ActionDef[]> = {
  platform: [{ key: "override", label: "Override" }],
  group: [{ key: "pause", label: "Pause" }],
  swarm: [{ key: "suspend", label: "Suspend" }],
  mission: [{ key: "pause", label: "Pause" }],
};

const CONFIRM_WINDOW_MS = 3000;

export interface SafetyActionsProps {
  /** The command-context scope. Determines the primary and secondary actions surfaced. */
  scope: SafetyScope;
  /** Called when an action fires. The primary action only fires after deliberate confirmation. */
  onAction?: (key: SafetyActionKey) => void;
  /** When true (default), the primary action requires a second deliberate tap within 3 seconds. */
  confirm?: boolean;
  /** Disable all controls (e.g. when no platform is live). */
  disabled?: boolean;
  className?: string;
}

/**
 * RC3 — Safety actions
 *
 * Honours behavioural invariant 1 (safety reachable in one tap from any live state) and
 * invariant 4 (deliberate confirmation for destructive transitions). The primary action is
 * always visible; the first tap arms it, the second tap within the confirm window fires.
 *
 * Uses semantic tokens (`bg-danger`, `text-danger-fg`) so danger remains visually distinct from
 * the RC3 signature colour. Identity hue is never used here.
 */
export function SafetyActions({
  scope,
  onAction,
  confirm = true,
  disabled = false,
  className,
}: SafetyActionsProps) {
  const primary = PRIMARY[scope];
  const secondary = SECONDARY[scope];
  const [armed, setArmed] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const disarm = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setArmed(false);
  };

  const handlePrimary = () => {
    if (disabled) return;
    if (!confirm) {
      onAction?.(primary.key);
      return;
    }
    if (armed) {
      disarm();
      onAction?.(primary.key);
    } else {
      setArmed(true);
      timeoutRef.current = setTimeout(() => setArmed(false), CONFIRM_WINDOW_MS);
    }
  };

  const handleKey = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === "Escape" && armed) {
      e.preventDefault();
      disarm();
    }
  };

  return (
    <div
      className={cn("inline-flex items-center gap-2", className)}
      // biome-ignore lint/a11y/useSemanticElements: role="group" clusters these safety controls; a native <fieldset> carries default border/padding that would break the inline layout.
      role="group"
      aria-label={`Safety actions for ${scope}`}
    >
      {secondary.map((a) => (
        <button
          key={a.key}
          type="button"
          className="rounded-md border border-border bg-transparent px-3 py-1.5 text-xs font-medium text-fg transition-colors hover:bg-bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg disabled:cursor-not-allowed disabled:opacity-50"
          onClick={() => !disabled && onAction?.(a.key)}
          disabled={disabled}
        >
          {a.label}
        </button>
      ))}

      <div className="relative">
        <button
          type="button"
          aria-label={armed ? `Confirm ${primary.label}` : primary.label}
          aria-pressed={armed}
          disabled={disabled}
          className={cn(
            "rounded-md px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition-all",
            "bg-danger text-danger-fg",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger focus-visible:ring-offset-2 focus-visible:ring-offset-bg",
            "disabled:cursor-not-allowed disabled:opacity-50",
            armed && "animate-pulse ring-2 ring-danger ring-offset-2 ring-offset-bg",
          )}
          onClick={handlePrimary}
          onKeyDown={handleKey}
        >
          {armed ? `Confirm · ${primary.label}` : primary.label}
        </button>
        {armed && (
          <button
            type="button"
            aria-label="Cancel"
            className="absolute -right-2 -top-2 inline-flex h-5 w-5 items-center justify-center rounded-full border border-border bg-surface text-fg shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            onClick={disarm}
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </div>
    </div>
  );
}
