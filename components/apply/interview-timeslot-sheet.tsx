'use client';

import { useMemo, useState } from 'react';
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui-legacy/sheet';
import { RadioGroup, RadioGroupItem } from '@/components/ui-legacy/radio-group';
import { Checkbox } from '@/components/ui-legacy/checkbox';
import { cn } from '@/lib/utils';

type SlotStatus = 'full' | 'spots' | 'open';

type TimeSlot = {
  id: string;
  dateLabel: string;
  timeLabel: string;
  status: SlotStatus;
  spotsLeft?: number;
};

const SLOTS: TimeSlot[] = [
  { id: '1', dateLabel: 'Wed, 5 Aug', timeLabel: '10:00 – 10:30', status: 'full' },
  { id: '2', dateLabel: 'Wed, 5 Aug', timeLabel: '14:00 – 14:30', status: 'spots', spotsLeft: 2 },
  { id: '3', dateLabel: 'Thu, 6 Aug', timeLabel: '09:30 – 10:00', status: 'spots', spotsLeft: 1 },
  { id: '4', dateLabel: 'Fri, 7 Aug', timeLabel: '11:00 – 11:30', status: 'open' },
];

export default function InterviewTimeslotSheet({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [language, setLanguage] = useState('mandarin');
  const [selectedId, setSelectedId] = useState<string | null>('3');

  const selected = useMemo(
    () => SLOTS.find((s) => s.id === selectedId) ?? null,
    [selectedId],
  );

  const confirmLabel = selected
    ? `Confirm ${selected.dateLabel} · ${selected.timeLabel.replace(/\s/g, '')}`
    : 'Confirm';

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-[586px]"
        style={{ maxWidth: 586 }}
      >
        <SheetHeader className="shrink-0 space-y-0 border-b-0 px-6 pb-0 pt-5">
          <p
            className="pr-8 text-[14px] font-normal leading-5"
            style={{ color: 'rgba(69, 85, 108, 1)' }}
          >
            Invitation from Aisha Rahman
          </p>
          <SheetTitle
            className="mt-2 text-left text-[18px] font-semibold tracking-[-0.45px] leading-6"
            style={{ color: 'rgba(15, 23, 43, 1)' }}
          >
            Please confirm your availability for the interview by selecting a day/time slot.
            First come first served!
          </SheetTitle>
        </SheetHeader>

        <SheetBody className="flex flex-col gap-6 px-6 py-5">
          {/* Meta row — equal cols; short vertical ticks before col 2 & 3 */}
          <div
            className="grid grid-cols-3"
            style={{
              borderTop: '1px solid rgba(231, 228, 221, 1)',
              borderBottom: '1px solid rgba(231, 228, 221, 1)',
            }}
          >
            {(
              [
                ['Format', 'Microsoft Teams'],
                ['Duration', '30 minutes'],
                ['Responded by', '30 Jul 2026'],
              ] as const
            ).map(([label, value], i) => (
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
                <p
                  className="text-[12px] font-normal leading-4"
                  style={{ color: 'rgba(69, 85, 108, 1)' }}
                >
                  {label}
                </p>
                <p
                  className="mt-0.5 whitespace-nowrap text-[14px] font-medium leading-5"
                  style={{ color: 'rgba(15, 23, 43, 1)' }}
                >
                  {value}
                </p>
              </div>
            ))}
          </div>

          {/* Language */}
          <div>
            <p
              className="mb-2 text-[14px] font-medium leading-5"
              style={{ color: 'rgba(15, 23, 43, 1)' }}
            >
              Interview language
            </p>
            <RadioGroup
              value={language}
              onValueChange={(v) => setLanguage(String(v))}
              className="flex flex-row flex-wrap gap-6"
            >
              {(
                [
                  ['english', 'English'],
                  ['mandarin', 'Mandarin'],
                ] as const
              ).map(([value, label]) => (
                <label
                  key={value}
                  className="inline-flex cursor-pointer items-center gap-2 text-[14px]"
                  style={{ color: 'rgba(15, 23, 43, 1)' }}
                >
                  <RadioGroupItem value={value} />
                  {label}
                </label>
              ))}
            </RadioGroup>
          </div>

          {/* Slots */}
          <div>
            <p
              className="mb-2 text-[14px] font-medium leading-5"
              style={{ color: 'rgba(15, 23, 43, 1)' }}
            >
              Available time
            </p>
            <ul className="space-y-2">
              {SLOTS.map((slot) => {
                const disabled = slot.status === 'full';
                const checked = selectedId === slot.id;
                return (
                  <li key={slot.id}>
                    <button
                      type="button"
                      disabled={disabled}
                      onClick={() => {
                        if (!disabled) setSelectedId(slot.id);
                      }}
                      className={cn(
                        'flex w-full cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 text-left transition-colors',
                        disabled && 'cursor-not-allowed opacity-70',
                        checked
                          ? 'border-[rgba(26,101,248,1)] bg-[rgba(26,101,248,0.04)]'
                          : 'border-border bg-white hover:bg-bg-subtle',
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
                          className="text-[13px] font-normal leading-5"
                          style={{ color: 'rgba(69, 85, 108, 1)' }}
                        >
                          {slot.timeLabel}
                        </p>
                        {slot.status === 'full' && (
                          <span
                            className="mt-4 inline-flex rounded-full px-2 py-0.5 text-[12px] font-medium leading-4"
                            style={{
                              background: 'rgba(246, 104, 14, 0.12)',
                              color: 'rgba(196, 52, 39, 1)',
                            }}
                          >
                            Full
                          </span>
                        )}
                        {slot.status === 'spots' && slot.spotsLeft != null && (
                          <span
                            className="mt-4 inline-flex rounded-full px-2 py-0.5 text-[12px] font-medium leading-4"
                            style={{
                              background: 'rgba(26, 101, 248, 0.1)',
                              color: 'rgba(26, 101, 248, 1)',
                            }}
                          >
                            {slot.spotsLeft} spots left
                          </span>
                        )}
                      </div>

                      <Checkbox
                        checked={checked}
                        disabled={disabled}
                        onCheckedChange={(v) => {
                          if (disabled) return;
                          setSelectedId(v ? slot.id : null);
                        }}
                        className="pointer-events-none shrink-0"
                      />
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </SheetBody>

        <SheetFooter className="shrink-0 sm:justify-end">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="h-9 cursor-pointer rounded-md border border-border bg-white px-4 text-[14px] text-fg"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!selected}
            onClick={() => onOpenChange(false)}
            className="h-9 cursor-pointer rounded-md px-4 text-[14px] text-white disabled:cursor-not-allowed disabled:opacity-50"
            style={{ background: 'rgba(26, 101, 248, 1)' }}
          >
            {confirmLabel}
          </button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
