import { StickyNote } from "lucide-react";

import { Separator } from "@/components/ui/separator";
import { Text } from "@/components/ui/text";
import { Textarea } from "@/components/ui/textarea";

import type { WidgetKind } from "../types";
import { Widget } from "../widget";

/** Not a singleton: handy for showing that "Add widget" can place duplicates. */
export const notes: WidgetKind = {
  title: "Notes",
  icon: StickyNote,
  defaultSize: { w: 4, h: 3 },
  minW: 2,
  minH: 2,
  content: (
    <Widget>
      <Widget.Header />
      <Widget.Body>
        <div className="flex h-full flex-col gap-2">
          <Textarea
            placeholder="Jot something down…"
            className="h-full min-h-16 flex-1 resize-none"
          />
          <Separator />
          <Text size="xs" variant="subtle">
            Notes aren't persisted — they're here to show duplicate widgets.
          </Text>
        </div>
      </Widget.Body>
    </Widget>
  ),
};
