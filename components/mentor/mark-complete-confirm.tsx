'use client';

import Button from '@/components/ui-legacy/button';
import { Check } from 'lucide-react';
import type { Application } from '@/lib/types';

export default function MarkCompleteConfirm({
  app,
  onConfirm,
  onClose,
}: {
  app:       Application;
  onConfirm: (goEvaluate: boolean) => void;
  onClose:   () => void;
}) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 px-4">
      <div className="bg-surface rounded-2xl border border-border shadow-xl p-6 w-full max-w-sm">
        <h2 className="text-headline-md text-fg mb-2">Mark Interview as Completed?</h2>
        <p className="text-body-md text-fg-muted mb-5">
          This moves <span className="font-semibold text-fg">{app.name.split(' ')[0]}</span> to
          the Pending Evaluation stage. Would you like to submit your evaluation now?
        </p>
        <div className="flex flex-col gap-2">
          <Button onClick={() => onConfirm(true)} className="w-full justify-center">
            <Check size={14} />Mark Complete &amp; Evaluate
          </Button>
          <Button variant="ghost" onClick={() => onConfirm(false)} className="w-full justify-center text-fg-muted">
            Mark Complete Only
          </Button>
        </div>
        <button
          onClick={onClose}
          className="mt-3 w-full text-center text-body-sm text-fg-subtle hover:text-fg transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
