import { useEffect, useState } from "react";
import { Building2, Moon, Radar, Sun } from "lucide-react";

import { Button } from "@/components/ui/button";

type Zone = "enterprise" | "c3";
type Mode = "light" | "dark";

const ZONE_KEY = "prizm-zone";
const MODE_KEY = "prizm-mode";

/**
 * Toggles the active PRIZM theme by flipping the `data-zone` / `data-mode`
 * attributes on `<html>`. The token CSS keys off `[data-zone][data-mode]`, so
 * every component re-themes automatically — no component code changes.
 *
 * The choice is persisted to localStorage and restored before paint by the
 * inline script in `app/root.tsx`, so there is no flash on reload.
 */
export function ThemeToggle() {
  // Initialise to the server-rendered defaults so the first client render
  // matches the SSR markup (no hydration mismatch). The real values are read
  // from the DOM in the effect below, after the restore script has run.
  const [zone, setZone] = useState<Zone>("enterprise");
  const [mode, setMode] = useState<Mode>("light");

  useEffect(() => {
    const root = document.documentElement;
    setZone((root.dataset.zone as Zone) ?? "enterprise");
    setMode((root.dataset.mode as Mode) ?? "light");
  }, []);

  function toggleZone() {
    const next: Zone = zone === "enterprise" ? "c3" : "enterprise";
    document.documentElement.dataset.zone = next;
    localStorage.setItem(ZONE_KEY, next);
    setZone(next);
  }

  function toggleMode() {
    const next: Mode = mode === "light" ? "dark" : "light";
    document.documentElement.dataset.mode = next;
    localStorage.setItem(MODE_KEY, next);
    setMode(next);
  }

  return (
    <div className="flex items-center gap-3">
      <Button
        variant="outline"
        onClick={toggleZone}
        aria-label={`Switch to ${zone === "enterprise" ? "C3" : "Enterprise"} zone`}
      >
        {zone === "enterprise" ? <Building2 /> : <Radar />}
        {zone === "enterprise" ? "Enterprise" : "C3"}
      </Button>

      <Button
        variant="outline"
        size="icon"
        onClick={toggleMode}
        aria-label={`Switch to ${mode === "light" ? "dark" : "light"} mode`}
      >
        {mode === "light" ? <Sun /> : <Moon />}
      </Button>
    </div>
  );
}
