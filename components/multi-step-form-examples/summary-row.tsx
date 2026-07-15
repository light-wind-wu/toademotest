/**
 * A single label/value row for a review/summary step. Shared across the
 * multi-step-form examples so each one renders its summary consistently.
 */
export function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 px-3 py-2 text-sm">
      <dt className="text-fg-muted">{label}</dt>
      <dd className="text-right font-medium capitalize">{value || "—"}</dd>
    </div>
  );
}

/** Coerce an unknown store value to a display string. */
export function str(value: unknown): string {
  return typeof value === "string" ? value : "";
}
