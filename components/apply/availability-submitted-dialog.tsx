'use client';

/* A request is pending review, not a confirmed interview. */
import { useEffect, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui-legacy/dialog';

export default function AvailabilitySubmittedDialog({
  open,
  onOpenChange,
  onContinue,
  availability,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  availability: string;
  /** Done or close returns to the pending-confirmation dashboard. */
  onContinue: () => void;
}) {
  const continuedRef = useRef(false);

  useEffect(() => {
    if (open) continuedRef.current = false;
  }, [open]);

  function finish() {
    if (continuedRef.current) return;
    continuedRef.current = true;
    onContinue();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (next) {
          onOpenChange(true);
          return;
        }
        finish();
      }}
    >
      <DialogContent
        className="w-[calc(100%-32px)] max-w-[440px] gap-0 p-6"
        style={{
          borderRadius: 12,
          border: '1px solid rgba(231, 228, 221, 1)',
          boxShadow:
            '0px 4px 6px -4px rgba(0, 0, 0, 0.05), 0px 10px 15px -3px rgba(0, 0, 0, 0.1)',
        }}
      >
        <DialogHeader className="pr-8">
          <DialogTitle
            className="text-left"
            style={{
              fontWeight: 600,
              fontSize: 18,
              lineHeight: '24px',
              color: 'rgba(15, 23, 43, 1)',
            }}
          >
            Comments submitted
          </DialogTitle>
          <DialogDescription
            className="mt-2 text-left"
            style={{
              fontWeight: 400,
              fontSize: 14,
              lineHeight: '20px',
              color: 'rgba(69, 85, 108, 1)',
            }}
          >
            Your comments have been submitted to the interview team for review.
            Please wait for their response. Your interview is not confirmed yet.
          </DialogDescription>
        </DialogHeader>
        <div className="mt-4 rounded-md border border-border bg-bg-subtle p-3">
          <p className="text-xs font-medium text-fg-muted">Your comments</p>
          <p className="mt-1 max-h-40 overflow-y-auto whitespace-pre-wrap break-words text-sm text-fg">{availability}</p>
        </div>

        <DialogFooter className="mt-6">
          <button
            type="button"
            onClick={finish}
            className="inline-flex h-9 cursor-pointer items-center justify-center rounded-md px-4 text-[14px] font-medium text-white transition-opacity hover:opacity-90"
            style={{ background: 'rgba(26, 101, 248, 1)' }}
          >
            Done
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
