import { useEffect, useRef, useState, type RefObject } from "react";
import { GridLayout, useContainerWidth } from "react-grid-layout";
import type { Layout } from "react-grid-layout";
import { Check, Pencil, Plus, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Menu, MenuContent, MenuItem, MenuLabel, MenuShortcut, MenuTrigger } from "@/components/ui/menu";
import { Text } from "@/components/ui/text";
import { cn } from "@/lib/utils";

import type { DashboardWidget, WidgetCatalogue } from "./types";
import { WidgetProvider } from "./widget";

// react-draggable (a CJS dependency of react-grid-layout) reads
// `process.env.DRAGGABLE_DEBUG` inside its drag/resize handlers. In the browser
// `process` is undefined, so the handler throws "process is not defined" on its
// first line and drag/resize silently break. Provide a minimal client-side
// shim (Node already defines `process` during SSR, so the guard skips it there).
const globalScope = globalThis as { process?: { env: Record<string, string | undefined> } };
if (!globalScope.process) {
  globalScope.process = { env: {} };
}

interface DashboardProps {
  catalogue: WidgetCatalogue;
  /** Starting set of widgets, also used by "Reset". */
  defaultWidgets: DashboardWidget[];
  /** When set, the arrangement is persisted to localStorage under this key. */
  storageKey?: string;
}

const COLS = 12;
const ROW_HEIGHT = 80;
const MARGIN: [number, number] = [16, 16];

// In edit mode the whole card is a drag surface; these selectors stay
// interactive so the remove button and the notes textarea still work.
// (RGL appends ".react-resizable-handle" itself, so resizing isn't snagged.)
const DRAG_CANCEL = "button, a, input, textarea, select, [contenteditable='true']";

export function Dashboard({ catalogue, defaultWidgets, storageKey }: DashboardProps) {
  const [editing, setEditing] = useState(false);
  const [widgets, setWidgets] = useState<DashboardWidget[]>(defaultWidgets);

  // RGL v2 needs an explicit pixel width; this hook measures the container.
  // measureBeforeMount defers the grid until the real width is known, so SSR
  // and the first client render agree (no hydration mismatch from the default
  // 1280px guess being re-measured).
  const { width, containerRef, mounted } = useContainerWidth({
    measureBeforeMount: true,
  });

  // Guards localStorage so we never save the defaults before the saved
  // arrangement has been read back in (which would clobber it).
  const hydrated = useRef(false);
  const idSeq = useRef(0);

  // Restore a saved arrangement on mount. Runs after the SSR-matching first
  // render, so there is no hydration mismatch.
  useEffect(() => {
    if (!storageKey) {
      hydrated.current = true;
      return;
    }
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const saved = JSON.parse(raw) as DashboardWidget[];
        // Drop anything whose kind no longer exists in the catalogue.
        const valid = saved.filter((w) => catalogue[w.type]);
        if (valid.length) setWidgets(valid);
      }
    } catch {
      // Corrupt or unavailable storage — fall back to defaults silently.
    }
    hydrated.current = true;
  }, [storageKey, catalogue]);

  // Persist on every change, but only once the restore pass has run.
  useEffect(() => {
    if (!storageKey || !hydrated.current) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify(widgets));
    } catch {
      // Ignore quota / privacy-mode failures.
    }
  }, [widgets, storageKey]);

  // Build the RGL layout fresh each render so per-kind constraints (min/max,
  // locked) always reflect the catalogue, regardless of what was stored.
  const layout: Layout = widgets.map((w) => {
    const kind = catalogue[w.type];
    return {
      i: w.id,
      x: w.x,
      y: w.y,
      w: w.w,
      h: w.h,
      minW: kind.minW,
      minH: kind.minH,
      maxW: kind.maxW,
      maxH: kind.maxH,
      // Locked widgets stay put and can't be resized; others flow around them.
      static: kind.locked,
    };
  });

  function handleLayoutChange(next: Layout) {
    setWidgets((prev) =>
      prev.map((w) => {
        const item = next.find((l) => l.i === w.id);
        return item ? { ...w, x: item.x, y: item.y, w: item.w, h: item.h } : w;
      }),
    );
  }

  function nextId() {
    let id: string;
    do {
      id = `w-${idSeq.current++}`;
    } while (widgets.some((w) => w.id === id));
    return id;
  }

  function addWidget(type: string) {
    const kind = catalogue[type];
    if (!kind) return;
    // Place it on a fresh row below everything else; the compactor tidies up.
    const bottom = widgets.reduce((max, w) => Math.max(max, w.y + w.h), 0);
    setWidgets((prev) => [
      ...prev,
      { id: nextId(), type, x: 0, y: bottom, ...kind.defaultSize },
    ]);
  }

  function removeWidget(id: string) {
    setWidgets((prev) => prev.filter((w) => w.id !== id));
  }

  function reset() {
    setWidgets(defaultWidgets);
  }

  const addable = Object.entries(catalogue).filter(([, kind]) => !kind.locked);

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Text size="sm" variant="muted">
          {widgets.length} {widgets.length === 1 ? "widget" : "widgets"}
          {editing && " — drag to move, drag a corner to resize"}
        </Text>

        <div className="flex items-center gap-2">
          {editing && (
            <>
              <Menu>
                <MenuTrigger
                  render={
                    <Button variant="outline" size="sm">
                      <Plus />
                      Add widget
                    </Button>
                  }
                />
                <MenuContent className="min-w-56">
                  <MenuLabel>Available widgets</MenuLabel>
                  {addable.map(([type, kind]) => {
                    const present =
                      kind.singleton && widgets.some((w) => w.type === type);
                    const Icon = kind.icon;
                    return (
                      <MenuItem
                        key={type}
                        disabled={present}
                        onClick={() => addWidget(type)}
                      >
                        <Icon className="h-4 w-4 text-accent" />
                        <span className="flex-1">{kind.title}</span>
                        {present && <MenuShortcut>Added</MenuShortcut>}
                      </MenuItem>
                    );
                  })}
                </MenuContent>
              </Menu>

              <Button variant="ghost" size="sm" onClick={reset}>
                <RotateCcw />
                Reset
              </Button>
            </>
          )}

          <Button
            variant={editing ? "solid" : "outline"}
            size="sm"
            onClick={() => setEditing((e) => !e)}
          >
            {editing ? (
              <>
                <Check />
                Done
              </>
            ) : (
              <>
                <Pencil />
                Edit dashboard
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Grid */}
      <div
        ref={containerRef as RefObject<HTMLDivElement>}
        className={cn(
          "rounded-lg",
          editing && "bg-bg-subtle p-2 outline-dashed outline-1 outline-border",
        )}
      >
        {mounted && (
          <GridLayout
            width={width}
            layout={layout}
            onLayoutChange={handleLayoutChange}
            gridConfig={{
              cols: COLS,
              rowHeight: ROW_HEIGHT,
              margin: MARGIN,
              containerPadding: [0, 0],
            }}
            // Drag from anywhere on the card (except interactive elements); far
            // more discoverable than a small handle. Resize from the corner.
            dragConfig={{ enabled: editing, cancel: DRAG_CANCEL }}
            resizeConfig={{ enabled: editing, handles: ["se"] }}
          >
            {widgets.map((w) => {
              const kind = catalogue[w.type];
              if (!kind) return null;
              return (
                <div key={w.id} className="overflow-hidden">
                  <WidgetProvider
                    editing={editing}
                    locked={Boolean(kind.locked)}
                    title={kind.title}
                    icon={kind.icon}
                    onRemove={() => removeWidget(w.id)}
                  >
                    {kind.content}
                  </WidgetProvider>
                </div>
              );
            })}
          </GridLayout>
        )}
      </div>
    </div>
  );
}
