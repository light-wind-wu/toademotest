import { LayoutDashboard } from "lucide-react";

import { Text } from "@/components/ui/text";

import type { WidgetKind } from "../types";
import { Widget } from "../widget";

/** Pinned banner — can't be moved, resized, or removed. */
export const welcome: WidgetKind = {
  title: "Welcome back",
  icon: LayoutDashboard,
  defaultSize: { w: 12, h: 2 },
  locked: true,
  singleton: true,
  content: (
    <Widget>
      <Widget.Header />
      <Widget.Body>
        <div className="flex h-full flex-col justify-center">
          <Text className="text-fg">
            Here's what's happening across your organisation today.
          </Text>
          <Text size="sm" variant="muted">
            Use <span className="font-medium text-fg">Edit dashboard</span> to
            rearrange, resize, add, or remove widgets.
          </Text>
        </div>
      </Widget.Body>
    </Widget>
  ),
};
