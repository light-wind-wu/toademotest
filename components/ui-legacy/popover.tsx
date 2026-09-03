"use client";

import { Popover as BasePopover } from "@base-ui-components/react/popover";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverClose,
  PopoverTrigger,
  PopoverHeader,
  PopoverTitle,
  PopoverDescription,
} from "@/components/ui/popover";
import { X } from "lucide-react";
import type { ComponentPropsWithoutRef, ReactNode } from "react";

export {
  Popover,
  PopoverClose,
  PopoverTrigger,
  PopoverHeader,
  PopoverTitle,
  PopoverDescription,
};

export function PopoverContent({
  className,
  children,
  sideOffset = 8,
  align = "center",
  variant = "solid",
  showCloseButton = false,
  portalContainer,
  ...props
}: ComponentPropsWithoutRef<typeof BasePopover.Popup> & {
  sideOffset?: number;
  align?: "start" | "center" | "end";
  variant?: "solid" | "glass";
  showCloseButton?: boolean;
  portalContainer?: HTMLElement | null;
  children?: ReactNode;
}) {
  return (
    <BasePopover.Portal container={portalContainer}>
      <BasePopover.Positioner sideOffset={sideOffset} align={align} collisionAvoidance={{ side: 'flip' }}>
        <BasePopover.Popup
          className={cn(
            "z-50 w-72 rounded-lg border border-border p-4 shadow-md",
            variant === "glass" ? "surface-glass-panel" : "bg-surface-elevated",
            "data-[starting-style]:opacity-0 data-[starting-style]:scale-95",
            "data-[ending-style]:opacity-0 data-[ending-style]:scale-95",
            "transition-all duration-150",
            className,
          )}
          {...props}
        >
          {children}
          {showCloseButton && (
            <BasePopover.Close
              className={cn(
                "absolute right-3 top-3 rounded-sm text-fg-muted opacity-70 transition-opacity",
                "hover:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
              )}
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </BasePopover.Close>
          )}
        </BasePopover.Popup>
      </BasePopover.Positioner>
    </BasePopover.Portal>
  );
}
