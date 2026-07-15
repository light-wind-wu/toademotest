"use client";

import { useTheme } from "@/lib/theme-context";
import { cn } from "@/lib/utils";
import type { HTMLAttributes } from "react";

/**
 * Theme-reactive C3 swatch for RC3 docs previews. Renders children inside `swatch-c3-light`
 * or `swatch-c3-dark` based on the docs site's current mode, so the docs theme toggle drives
 * what the reader sees in the live preview. Standard PRIZM 4.0 behaviour — no per-page wiring.
 *
 * Forward whatever chrome the preview frame needs (rounded corners, ring, shadow, grid, etc.)
 * via `className` and `style`; the swatch class is prepended. All other `<div>` props pass
 * through, so this can replace a styled canvas wrapper without adding an extra DOM node.
 */
export function RC3Swatch({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  const { mode } = useTheme();
  const swatchClass = mode === "light" ? "swatch-c3-light" : "swatch-c3-dark";
  return <div className={cn(swatchClass, className)} {...rest} />;
}
