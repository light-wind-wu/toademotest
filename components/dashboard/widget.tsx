import { createContext, useContext, useMemo } from "react";
import type { ComponentType, ReactNode } from "react";
import { GripVertical, Lock, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ *
 * Widget — a compound component for a single dashboard tile.
 *
 * The per-widget state the chrome needs (edit mode, whether it's pinned,
 * its title/icon, how to remove it) flows through context, set once by
 * <WidgetProvider>. Nothing is drilled through props: `Widget`,
 * `Widget.Header`, and `Widget.Body` all read what they need from context.
 *
 *   <WidgetProvider {...state}>
 *     <Widget>
 *       <Widget.Header />
 *       <Widget.Body>…content…</Widget.Body>
 *     </Widget>
 *   </WidgetProvider>
 * ------------------------------------------------------------------ */

export interface WidgetState {
  /** Whether the dashboard is in edit mode (drag/resize/remove enabled). */
  editing: boolean;
  /** Pinned widgets show a badge and hide the drag/remove affordances. */
  locked: boolean;
  title: string;
  icon: ComponentType<{ className?: string }>;
  /** Called when the remove button is pressed (omitted for locked widgets). */
  onRemove?: () => void;
}

const WidgetContext = createContext<WidgetState | null>(null);

function useWidget(): WidgetState {
  const ctx = useContext(WidgetContext);
  if (!ctx) {
    throw new Error("Widget.* must be rendered inside <WidgetProvider>.");
  }
  return ctx;
}

export function WidgetProvider({
  children,
  editing,
  locked,
  title,
  icon,
  onRemove,
}: WidgetState & { children: ReactNode }) {
  const value = useMemo(
    () => ({ editing, locked, title, icon, onRemove }),
    [editing, locked, title, icon, onRemove],
  );
  return <WidgetContext.Provider value={value}>{children}</WidgetContext.Provider>;
}

function WidgetRoot({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const { editing, locked } = useWidget();
  return (
    <Card
      className={cn(
        "flex h-full flex-col overflow-hidden",
        // The whole card is the drag surface in edit mode.
        editing && !locked && "cursor-move select-none",
        className,
      )}
    >
      {children}
    </Card>
  );
}

/**
 * Standard widget header: drag grip, icon, title, and the pinned badge /
 * remove button. Pass `children` to add extra controls (rendered just before
 * the remove button).
 */
function WidgetHeader({
  children,
  className,
}: {
  children?: ReactNode;
  className?: string;
}) {
  const { editing, locked, title, icon: Icon, onRemove } = useWidget();
  const draggable = editing && !locked;

  return (
    <CardHeader
      className={cn(
        "flex flex-row items-center justify-between gap-2 space-y-0 p-4",
        className,
      )}
    >
      <div className="flex min-w-0 items-center gap-2">
        {draggable && (
          <span className="-ml-1 text-fg-subtle" aria-hidden="true">
            <GripVertical className="h-4 w-4" />
          </span>
        )}
        <Icon className="h-4 w-4 shrink-0 text-accent" />
        <CardTitle className="truncate text-sm font-semibold">{title}</CardTitle>
      </div>

      <div className="flex shrink-0 items-center gap-1">
        {children}
        {editing && locked && (
          <Badge variant="subtle">
            <Lock className="h-3 w-3" />
            Pinned
          </Badge>
        )}
        {editing && !locked && (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={onRemove}
            aria-label={`Remove ${title}`}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    </CardHeader>
  );
}

function WidgetBody({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <CardContent
      className={cn("min-h-0 flex-1 overflow-auto p-4 pt-0", className)}
    >
      {children}
    </CardContent>
  );
}

export const Widget = Object.assign(WidgetRoot, {
  Header: WidgetHeader,
  Body: WidgetBody,
});
