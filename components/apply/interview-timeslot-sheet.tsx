'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import {
  Sheet,
  SheetBody,
  SheetClose,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui-legacy/sheet';
import { RadioGroup, RadioGroupItem } from '@/components/ui-legacy/radio-group';
import TaskCompletedDialog from '@/components/apply/task-completed-dialog';
import { cn } from '@/lib/utils';

type TimeSlot = {
  id: string;
  dateLabel: string;
  timeLabel: string;
};

const SLOTS: TimeSlot[] = [
  { id: '1', dateLabel: 'Wed, 19 Aug 2026', timeLabel: '14:00–14:30' },
  { id: '2', dateLabel: 'Thu, 20 Aug 2026', timeLabel: '09:30–10:00' },
  { id: '3', dateLabel: 'Fri, 21 Aug 2026', timeLabel: '11:00–11:30' },
];

const META = [
  ['Format', 'Microsoft Teams'],
  ['Duration', '30 minutes'],
  ['Responed by', '30 Aug 2026'],
] as const;

function MetaField({ label, value }: { label: string; value: string }) {
  return (
    <>
      <p
        className="text-[14px] font-normal leading-5"
        style={{ color: 'rgba(69, 85, 108, 1)' }}
      >
        {label}
      </p>
      <p
        className="mt-1 whitespace-nowrap text-[14px] font-medium leading-5"
        style={{ color: 'rgba(15, 23, 43, 1)' }}
      >
        {value}
      </p>
    </>
  );
}

export default function InterviewTimeslotSheet({
  open,
  onOpenChange,
  projectName,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectName: string;
}) {
  const [selectedId, setSelectedId] = useState<string>('2');
  const [taskCompletedOpen, setTaskCompletedOpen] = useState(false);

  function handleConfirm() {
    onOpenChange(false);
    /* Let the sheet close first so the success dialog stacks cleanly */
    window.setTimeout(() => setTaskCompletedOpen(true), 180);
  }

  return (
    <>
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        showCloseButton={false}
        className="flex h-full max-h-[100dvh] w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-[586px]"
        style={{ maxWidth: 586 }}
      >
        <SheetClose
          className={cn(
            'absolute right-4 top-4 inline-flex size-6 items-center justify-center rounded-sm text-fg-muted opacity-70 transition-opacity',
            'hover:opacity-100 focus-visible:outline-1 focus-visible:outline-offset-0 focus-visible:outline-accent',
          )}
          aria-label="Close"
        >
          <X className="size-6" strokeWidth={1.5} />
        </SheetClose>

        <SheetHeader className="shrink-0 space-y-0 border-b-0 px-4 pb-0 pt-5 sm:px-6">
          <p
            className="pr-8 text-[12px] font-normal leading-5"
            style={{ color: 'rgba(69, 85, 108, 1)' }}
          >
            Interview invitation
          </p>
          <SheetTitle
            className="mt-1.5 text-left"
            style={{
              fontWeight: 600,
              fontSize: 18,
              lineHeight: '24px',
              letterSpacing: '-0.45px',
              color: 'rgba(15, 23, 43, 1)',
            }}
          >
            You have been selected to interview for project {projectName}.
          </SheetTitle>
          <p
            className="text-left"
            style={{
              marginTop: 6,
              fontWeight: 600,
              fontSize: 14,
              lineHeight: '20px',
              color: 'rgba(69, 85, 108, 1)',
            }}
          >
            Choose an available timeslot to confirm your interview.
          </p>
        </SheetHeader>

        {/* Top divider full-bleed; bottom divider keeps side inset */}
        <SheetBody className="flex flex-col gap-0 px-0 pb-5 pt-4">
          <div
            style={{
              borderTop: '1px solid rgba(231, 228, 221, 1)',
            }}
          >
            <div
              className="mx-4 sm:mx-6"
              style={{
                borderBottom: '1px solid rgba(231, 228, 221, 1)',
              }}
            >
              <div className="hidden grid-cols-3 sm:grid">
                {META.map(([label, value], i) => (
                  <div
                    key={label}
                    className={cn(
                      'relative flex min-w-0 flex-col justify-center py-6',
                      i === 0 ? 'pr-4' : 'pl-5 pr-4',
                    )}
                  >
                    {i > 0 && (
                      <span
                        className="pointer-events-none absolute left-0 top-1/2 w-px -translate-y-1/2"
                        style={{
                          height: 48,
                          background: 'rgba(231, 228, 221, 1)',
                        }}
                        aria-hidden
                      />
                    )}
                    <MetaField label={label} value={value} />
                  </div>
                ))}
              </div>

              <div className="sm:hidden">
                <div className="grid grid-cols-2 py-5">
                  <div className="relative min-w-0 pr-4">
                    <MetaField label={META[0][0]} value={META[0][1]} />
                  </div>
                  <div className="relative min-w-0 pl-4">
                    <span
                      className="pointer-events-none absolute left-0 top-1/2 w-px -translate-y-1/2"
                      style={{
                        height: 40,
                        background: 'rgba(231, 228, 221, 1)',
                      }}
                      aria-hidden
                    />
                    <MetaField label={META[1][0]} value={META[1][1]} />
                  </div>
                </div>
                <div className="pb-5">
                  <MetaField label={META[2][0]} value={META[2][1]} />
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 px-4 sm:px-6">
            <p
              className="mb-3 text-[14px] font-normal leading-5"
              style={{ color: 'rgba(69, 85, 108, 1)' }}
            >
              Available time
            </p>
            <RadioGroup
              value={selectedId}
              onValueChange={(v) => {
                if (typeof v === 'string') setSelectedId(v);
              }}
              className="gap-2"
            >
              {SLOTS.map((slot) => {
                const checked = selectedId === slot.id;
                return (
                  <label
                    key={slot.id}
                    className={cn(
                      'flex w-full cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 text-left transition-colors',
                      checked
                        ? 'border-[rgba(26,101,248,1)] bg-[rgba(26,101,248,0.04)]'
                        : 'border-[rgba(231,228,221,1)] bg-white',
                    )}
                  >
                    <div className="min-w-0 flex-1">
                      <p
                        className="text-[14px] font-semibold leading-5"
                        style={{ color: 'rgba(15, 23, 43, 1)' }}
                      >
                        {slot.dateLabel}
                      </p>
                      <p
                        className="mt-1 text-[14px] font-normal leading-5"
                        style={{ color: 'rgba(69, 85, 108, 1)' }}
                      >
                        {slot.timeLabel}
                      </p>
                    </div>
                    <RadioGroupItem
                      value={slot.id}
                      className="size-5 shrink-0"
                    />
                  </label>
                );
              })}
            </RadioGroup>
          </div>
        </SheetBody>

        <SheetFooter className="shrink-0 gap-3 px-4 sm:justify-end sm:px-6">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="w-auto shrink-0 cursor-pointer rounded-md border border-border bg-white text-[14px] text-fg"
            style={{ padding: '6.5px 13px' }}
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!selectedId}
            onClick={handleConfirm}
            className="h-9 min-w-0 cursor-pointer rounded-md px-4 text-[14px] text-white disabled:cursor-not-allowed disabled:opacity-50"
            style={{ background: 'rgba(26, 101, 248, 1)' }}
          >
            Confirm
          </button>
        </SheetFooter>
      </SheetContent>
    </Sheet>

    <TaskCompletedDialog
      open={taskCompletedOpen}
      onOpenChange={setTaskCompletedOpen}
    />
    </>
  );
}
