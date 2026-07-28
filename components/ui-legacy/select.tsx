"use client";

import { Select as BaseSelect } from "@base-ui-components/react/select";
import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";
import {
  Select,
  SelectItem,
} from "@/components/ui/select";
import type { ComponentPropsWithoutRef, ReactNode } from "react";

export { Select, SelectItem };

export function SelectValue({
  placeholder,
  className,
  children,
  ...props
}: ComponentPropsWithoutRef<typeof BaseSelect.Value> & {
  placeholder?: ReactNode;
}) {
  return (
    <BaseSelect.Value className={className} {...props}>
      {children ?? ((value: any) => (value == null || value === "" ? placeholder : (value as ReactNode)))}
    </BaseSelect.Value>
  );
}

export function SelectTrigger({
  className,
  children,
  ...props
}: ComponentPropsWithoutRef<typeof BaseSelect.Trigger>) {
  return (
    <BaseSelect.Trigger
      className={cn(
        "flex h-9 w-full items-center justify-between gap-2 overflow-hidden rounded-md border border-border bg-surface px-3 py-1 text-sm shadow-sm",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "data-[placeholder]:text-fg-subtle",
        className,
      )}
      {...props}
    >
      {children}
      <BaseSelect.Icon className="shrink-0 text-fg-muted">
        <ChevronDown className="h-4 w-4" />
      </BaseSelect.Icon>
    </BaseSelect.Trigger>
  );
}

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
