"use client";

import { cn } from "@/lib/utils";
import {
  Field as PrizmField,
  FieldLabel as PrizmFieldLabel,
  FieldDescription as PrizmFieldDescription,
  FieldError as PrizmFieldError,
  FieldControl as PrizmFieldControl,
  FieldValidity as PrizmFieldValidity,
} from "@/components/ui/field";
import type { ComponentPropsWithoutRef } from "react";

export function Field({ className, ...props }: ComponentPropsWithoutRef<typeof PrizmField>) {
  return <PrizmField className={cn("grid gap-1.5", className)} {...props} />;
}

/** PRIZM FieldLabel typography — safe outside Field.Root (e.g. grid column headers). */
export const fieldLabelClassName = "text-sm font-medium leading-tight text-fg";

export function FieldLabelText({
  className,
  ...props
}: ComponentPropsWithoutRef<"span">) {
  return <span className={cn(fieldLabelClassName, className)} {...props} />;
}

export function FieldLabel({
  className,
  ...props
}: ComponentPropsWithoutRef<typeof PrizmFieldLabel>) {
  return <PrizmFieldLabel className={cn(fieldLabelClassName, className)} {...props} />;
}

export function FieldDescription({
  className,
  ...props
}: ComponentPropsWithoutRef<typeof PrizmFieldDescription>) {
  return <PrizmFieldDescription className={cn("text-xs leading-relaxed text-fg-muted", className)} {...props} />;
}

export function FieldError({
  className,
  ...props
}: ComponentPropsWithoutRef<typeof PrizmFieldError>) {
  return <PrizmFieldError className={cn("text-xs leading-relaxed text-danger", className)} {...props} />;
}

export const FieldControl = PrizmFieldControl;
export const FieldValidity = PrizmFieldValidity;
