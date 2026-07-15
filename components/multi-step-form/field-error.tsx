import { cn } from "@/lib/utils";

import { useFieldError } from "./context";

/**
 * Renders the active step's validation message for a single field, or nothing
 * when the field is valid. Pair it with a PRIZM `Field` in a step body:
 *
 *   <Field>
 *     <FieldLabel>Email</FieldLabel>
 *     <Input ... />
 *     <FieldError name="email" />
 *   </Field>
 */
export function FieldError({ name, className }: { name: string; className?: string }) {
  const error = useFieldError(name);
  if (!error) return null;
  return <p className={cn("mt-1 text-xs text-danger", className)}>{error}</p>;
}
