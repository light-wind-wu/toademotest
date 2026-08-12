'use client';

/* Shown after V1/V2 “Request another timeslot” Confirm — then continue to proposed flow. */
import { useEffect, useRef } from 'react';
import {
  Dialog,
  DialogClose,
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
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Done or close — advance to the interview-proposed welcome page. */
  onContinue: () => void;
}) {
  const continuedRef = useRef(false);

  useEffect(() => {
    if (open) continuedRef.current = false;
  }, [open]);

  function finish() {
    if (continuedRef.current) return;
    continuedRef.current = true;
    onOpenChange(false);
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
            Availability submitted
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
            Your preferred time has been sent to the mentor. You&apos;ll be notified
            when a new interview timeslot is available.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="mt-6">
          <DialogClose
            className="inline-flex h-9 cursor-pointer items-center justify-center rounded-md px-4 text-[14px] font-medium text-white transition-opacity hover:opacity-90"
            style={{ background: 'rgba(26, 101, 248, 1)' }}
          >
            Done
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
