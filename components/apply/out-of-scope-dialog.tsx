'use client';

/* Shared “feature out of UT scope” dialog — reuse for unfinished CTAs. */
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui-legacy/dialog';

const TITLE = 'Thanks for exploring';
const BODY =
  'This feature is not included in the scope of this usability test. Please return to the task to continue.';

export default function OutOfScopeDialog({
  open,
  onOpenChange,
  title = TITLE,
  description = BODY,
  backLabel = 'Back',
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  backLabel?: string;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-[440px] gap-0 p-6"
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
            {title}
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
            {description}
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="mt-6">
          <DialogClose
            className="inline-flex h-9 cursor-pointer items-center justify-center rounded-md px-4 text-[14px] font-medium text-white transition-opacity hover:opacity-90"
            style={{ background: 'rgba(26, 101, 248, 1)' }}
          >
            {backLabel}
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
