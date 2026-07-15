"use client";

import { cn } from "@/lib/utils";
import { Field as BaseField } from "@base-ui-components/react/field";
import type { ComponentPropsWithoutRef } from "react";

export const Field = BaseField.Root;

export function FieldLabel({
  className,
  ...props
}: ComponentPropsWithoutRef<typeof BaseField.Label>) {
  return (
    <BaseField.Label
      className={cn("text-sm font-medium leading-none text-fg", className)}
      {...props}
    />
  );
}

export function FieldDescription({
  className,
  ...props
}: ComponentPropsWithoutRef<typeof BaseField.Description>) {
  return (
    <BaseField.Description
      className={cn("text-xs leading-relaxed text-fg-muted", className)}
      {...props}
    />
  );
}

export function FieldError({
  className,
  ...props
}: ComponentPropsWithoutRef<typeof BaseField.Error>) {
  return (
    <BaseField.Error className={cn("text-xs leading-relaxed text-danger", className)} {...props} />
  );
}

export const FieldControl = BaseField.Control;
export const FieldValidity = BaseField.Validity;
