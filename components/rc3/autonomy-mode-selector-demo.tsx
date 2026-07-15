"use client";

import {
  AutonomyModeSelector,
  type AutonomyModeSelectorProps,
} from "@/components/rc3/autonomy-mode-selector";
import { useState } from "react";

type AutonomyModeSelectorDemoProps = Omit<
  AutonomyModeSelectorProps,
  "activeKey" | "onTransition"
> & {
  /** The rung the demo starts on; the wrapper owns the active state from there. */
  defaultActiveKey: string;
};

/**
 * Docs-only stateful wrapper. The shipped organism is controlled (activeKey + onTransition);
 * the docs surfaces need a self-contained instance so the arm / commit / descent gesture works
 * without each server page owning a state machine. Not part of the RC3 pack — don't copy this
 * into consumer projects.
 */
export function AutonomyModeSelectorDemo({
  defaultActiveKey,
  ...rest
}: AutonomyModeSelectorDemoProps) {
  const [activeKey, setActiveKey] = useState(defaultActiveKey);
  return <AutonomyModeSelector {...rest} activeKey={activeKey} onTransition={setActiveKey} />;
}
