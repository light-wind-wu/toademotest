"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import AiSparkleIcon from "./ai-sparkle-icon";
import Button from "./button";
import { cn } from "@/lib/utils";

/* Inline AI suggestion for a text field — mirrors the IO review layout: the field
   on the left, an editable "AI Suggestion" with Apply on the right (revealed on
   demand). Deliberately understated: a small sparkle link, no gradient button and
   no action dropdown. */
interface Props {
  value: string;
  onChange: (v: string) => void;
  /** Produce a fresh suggestion from the current context. */
  generate: () => string;
  /** Called when the user accepts a suggestion. Defaults to `onChange`; pass this to
   *  do more on accept (e.g. record the original value for a Restore action). */
  onApply?: (v: string) => void;
  /** Textarea (scope) vs input (title). */
  multiline?: boolean;
  placeholder?: string;
  /** Base field classes from the consumer, so it matches the surrounding form. */
  inputClass: string;
  /** Extra classes applied to the field when it has a validation error. */
  errorClass?: string;
  hasError?: boolean;
  rows?: number;
}

export default function AiSuggestField({
  value,
  onChange,
  generate,
  onApply,
  multiline,
  placeholder,
  inputClass,
  errorClass,
  hasError,
  rows = 5,
}: Props) {
  // null = no suggestion shown; a string = the current editable draft.
  const [draft, setDraft] = useState<string | null>(null);
  const open = draft !== null;

  const field = multiline ? (
    <textarea
      rows={rows}
      className={cn(inputClass, "resize-none", hasError && errorClass)}
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  ) : (
    <input
      className={cn(inputClass, hasError && errorClass)}
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  );

  const draftControl = multiline ? (
    <textarea
      rows={rows}
      value={draft ?? ""}
      onChange={(e) => setDraft(e.target.value)}
      className="w-full resize-none rounded-lg border border-accent/30 bg-accent/5 px-3 py-2 text-body-sm text-fg outline-none focus:border-accent focus:ring-1 focus:ring-accent/20"
    />
  ) : (
    <input
      value={draft ?? ""}
      onChange={(e) => setDraft(e.target.value)}
      className="w-full rounded-lg border border-accent/30 bg-accent/5 px-3 py-2 text-body-sm text-fg outline-none focus:border-accent focus:ring-1 focus:ring-accent/20"
    />
  );

  const canApply = !!draft?.trim() && draft.trim() !== value.trim();

  return (
    <div className={cn("grid gap-4", open && "md:grid-cols-2 md:divide-x md:divide-border")}>
      <div>
        {open && (
          <div className="mb-1.5 flex items-center gap-1.5">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-fg-subtle">Current</p>
          </div>
        )}
        {field}
        {!open && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-2"
            onClick={() => setDraft(generate())}
          >
            <AiSparkleIcon size={12} />
            Suggest with AI
          </Button>
        )}
      </div>

      {open && (
        <div className="md:pl-4">
          <div className="mb-1.5 flex items-center gap-1.5">
            <AiSparkleIcon size={10} />
            <p className="text-[11px] font-semibold uppercase tracking-wider text-accent">AI Suggestion</p>
            <span className="text-[12px] text-fg-subtle">· edit as needed</span>
          </div>
          {draftControl}
          <div className="mt-1.5 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setDraft(generate())}
              className="inline-flex items-center gap-1 text-[12px] text-accent transition-colors hover:underline"
            >
              <AiSparkleIcon size={10} />
              Re-assess
            </button>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setDraft(null)}
                className="text-[12px] text-fg-muted transition-colors hover:text-fg"
              >
                Dismiss
              </button>
              <Button
                size="sm"
                variant="outline"
                disabled={!canApply}
                onClick={() => { (onApply ?? onChange)(draft!.trim()); setDraft(null); }}
              >
                <Check size={13} />
                Apply
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
