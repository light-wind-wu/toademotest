"use client";

import { useState } from "react";
import { ChevronDown, Check, ArrowRight, Sparkles } from "lucide-react";
import AiSparkleIcon from "./ai-sparkle-icon";
import Modal from "./modal";
import Button from "./button";
import { cn } from "@/lib/utils";

export type AiActionId = "enhance" | "grammar" | "sample";

interface AiAction {
  id: AiActionId;
  label: string;
  desc: string;
}

const ACTIONS: AiAction[] = [
  {
    id: "enhance",
    label: "Enhance",
    desc: "Rewrite for clarity, structure, and tone.",
  },
  {
    id: "grammar",
    label: "Fix spelling & grammar",
    desc: "Polish punctuation, capitalisation, and spacing.",
  },
  {
    id: "sample",
    label: "Generate sample",
    desc: "Draft a fresh version from the project's context.",
  },
];

interface Props {
  /** Field name, e.g. "Project Title" — shown in the menu trigger and modal. */
  label: string;
  /** Current field value (the "before"). */
  current: string;
  /** Multiline → render a textarea in the modal (scope); else an input (title). */
  multiline?: boolean;
  /** Produce the "after" text for the chosen action. */
  generate: (action: AiActionId) => string;
  /** Apply the accepted text back to the field. */
  onApply: (text: string) => void;
}

export default function AiFieldAssistant({
  label,
  current,
  multiline,
  generate,
  onApply,
}: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [action, setAction] = useState<AiAction | null>(null);
  const [draft, setDraft] = useState("");

  function runAction(a: AiAction) {
    setMenuOpen(false);
    setDraft(generate(a.id));
    setAction(a);
  }

  function close() {
    setAction(null);
  }

  const cleanCurrent = current.trim();
  const cleanDraft = draft.trim();
  const canApply = !!cleanDraft && cleanDraft !== cleanCurrent;

  return (
    <>
      {/* Dropdown trigger */}
      <div className="relative inline-block">
        <button
          type="button"
          onClick={() => setMenuOpen((o) => !o)}
          className={cn(
            "group/gen inline-flex items-center gap-1.5 rounded-full py-1.5 pl-3 pr-2.5 text-[12px] font-semibold text-white",
            "bg-gradient-to-r from-[#1856d6] to-[#00a6c9] shadow-sm shadow-[#1856d6]/25",
            "transition-all hover:shadow-md hover:brightness-110 active:scale-95",
            menuOpen && "brightness-110 shadow-md",
          )}
        >
          <Sparkles
            size={13}
            className="shrink-0 transition-transform group-hover/gen:rotate-12"
          />
          Generate
          <ChevronDown
            size={13}
            className={cn("transition-transform", menuOpen && "rotate-180")}
          />
        </button>

        {menuOpen && (
          <>
            {/* Click-away layer */}
            <div
              className="fixed inset-0 z-40"
              onClick={() => setMenuOpen(false)}
              aria-hidden="true"
            />
            <div className="absolute right-0 z-50 mt-1.5 w-72 rounded-xl border border-border bg-surface p-1.5 shadow-xl">
              {ACTIONS.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => runAction(a)}
                  className="flex w-full flex-col items-start gap-0.5 rounded-lg px-3 py-2 text-left hover:bg-bg-subtle transition-colors"
                >
                  <span className="text-body-sm font-semibold text-fg">
                    {a.label}
                  </span>
                  <span className="text-[12px] text-fg-muted leading-snug">
                    {a.desc}
                  </span>
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Before / after modal */}
      <Modal
        open={!!action}
        onClose={close}
        maxWidth="2xl"
        ariaLabel={action ? `${action.label} — ${label}` : "AI assistant"}
      >
        {action && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <AiSparkleIcon size={16} />
              <h2 className="text-headline-sm text-fg">
                {action.label}
                <span className="text-fg-muted font-normal"> · {label}</span>
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-3 items-stretch">
              {/* Before */}
              <div className="flex flex-col">
                <p className="text-[11px] font-bold uppercase tracking-wider text-fg-subtle mb-1.5">
                  Before
                </p>
                <div className="flex-1 rounded-lg border border-border bg-bg-subtle px-3 py-2 text-body-sm text-fg-muted whitespace-pre-wrap min-h-[11rem] max-h-[60vh] overflow-auto">
                  {cleanCurrent || (
                    <span className="italic text-fg-subtle">(empty)</span>
                  )}
                </div>
              </div>

              {/* Arrow (desktop only) */}
              <div className="hidden md:flex items-center justify-center text-fg-subtle pt-6">
                <ArrowRight size={18} />
              </div>

              {/* After — editable */}
              <div className="flex flex-col">
                <p className="text-[11px] font-bold uppercase tracking-wider text-accent mb-1.5">
                  After · edit as needed
                </p>
                {multiline ? (
                  <textarea
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    rows={12}
                    className="flex-1 w-full rounded-lg border border-accent/30 bg-accent/5 px-3 py-2 text-body-sm text-fg outline-none focus:border-accent focus:ring-1 focus:ring-accent/20 resize-y min-h-[11rem]"
                  />
                ) : (
                  <input
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    className="w-full rounded-lg border border-accent/30 bg-accent/5 px-3 py-2 text-body-sm text-fg outline-none focus:border-accent focus:ring-1 focus:ring-accent/20"
                  />
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <Button variant="ghost" size="sm" onClick={close}>
                Cancel
              </Button>
              <Button
                size="sm"
                disabled={!canApply}
                onClick={() => {
                  onApply(cleanDraft);
                  close();
                }}
              >
                <Check size={14} />
                Apply
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
