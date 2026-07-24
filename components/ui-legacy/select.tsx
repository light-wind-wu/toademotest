"use client";

import { Select as BaseSelect } from "@base-ui-components/react/select";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ComponentPropsWithoutRef, ReactNode } from "react";

export { Select, SelectItem, SelectTrigger, SelectValue };

export function SelectContent({
  className,
  children,
  ...props
}: ComponentPropsWithoutRef<typeof BaseSelect.Popup> & {
  children?: ReactNode;
}) {
  return (
    <BaseSelect.Portal>
      <BaseSelect.Positioner
        side="bottom"
        sideOffset={4}
        collisionPadding={8}
        collisionAvoidance={{ side: 'flip' }}
        alignItemWithTrigger={false}
        className="z-[100]"
      >
        <BaseSelect.Popup
          className={cn(
            "z-50 max-h-60 min-w-[var(--anchor-width)] overflow-y-auto",
            "rounded-md border border-border bg-surface-elevated p-1 shadow-md",
            "data-[starting-style]:opacity-0 data-[ending-style]:opacity-0 transition-opacity duration-150",
            className,
          )}
          {...props}
        >
          {children}
        </BaseSelect.Popup>
      </BaseSelect.Positioner>
    </BaseSelect.Portal>
  );
}
