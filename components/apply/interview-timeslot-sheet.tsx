'use client';

import { useMemo, useState } from 'react';
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

const META = [
  ['Format', 'Microsoft Teams'],
  ['Duration', '30 minutes'],
  ['Responded by', '30 Jul 2026'],
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
            Invitation from Aisha Rahman
          </p>
          <SheetTitle
            className="mt-1.5 text-left text-[16px] font-semibold leading-[22px]"
            style={{ color: 'rgba(15, 23, 43, 1)' }}
          >
            Please confirm your availability for the interview by selecting a day/time slot.
            First come first served!
          </SheetTitle>
        </SheetHeader>

        <SheetBody className="flex flex-col gap-0 px-4 pb-5 pt-4 sm:px-6">
          {/* Mobile: Format | Duration, then Responded by. Desktop: 3 equal cols */}
          <div
            style={{
              borderTop: '1px solid rgba(231, 228, 221, 1)',
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

          {/* Language — 16px below meta, 16px above Available time */}
          <div className="mt-4 mb-4">
            <p
              className="mb-3 text-[14px] font-normal leading-5"
              style={{ color: 'rgba(69, 85, 108, 1)' }}
            >
              Interview language
            </p>
            <RadioGroup
              value={language}
              onValueChange={(v) => setLanguage(String(v))}
              className="grid grid-cols-2 gap-4"
            >
              {(
                [
                  ['english', 'English'],
                  ['mandarin', 'Mandarin'],
                ] as const
              ).map(([value, label]) => (
                <label
                  key={value}
                  className="inline-flex min-w-0 cursor-pointer items-center gap-2 text-[14px] font-normal leading-5"
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
              className="mb-3 text-[14px] font-normal leading-5"
              style={{ color: 'rgba(69, 85, 108, 1)' }}
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
                        'flex w-full cursor-pointer items-start gap-3 rounded-lg border p-6 text-left transition-colors max-sm:h-[132px]',
                        'sm:h-auto sm:items-center sm:px-4 sm:py-3',
                        disabled && 'cursor-not-allowed',
                        checked
                          ? 'border-[rgba(26,101,248,1)] bg-[rgba(26,101,248,0.04)]'
                          : 'border-[rgba(231,228,221,1)] bg-white',
                        checked && 'max-sm:border-[rgba(231,228,221,1)] max-sm:bg-white',
                      )}
                    >
                      <div className="min-w-0 flex-1">
                        <p
                          className="text-[16px] font-semibold leading-[18px] max-sm:text-[16px] sm:text-[14px] sm:leading-5"
                          style={{
                            color: disabled
                              ? 'rgba(163, 174, 191, 1)'
                              : 'rgba(15, 23, 43, 1)',
                          }}
                        >
                          {slot.dateLabel}
                        </p>
                        <p
                          className="mt-1.5 text-[14px] font-normal leading-5"
                          style={{
                            color: disabled
                              ? 'rgba(163, 174, 191, 1)'
                              : 'rgba(69, 85, 108, 1)',
                          }}
                        >
                          {slot.timeLabel}
                        </p>
                        {slot.status === 'full' && (
                          <span
                            className="mt-4 inline-flex h-[22px] items-center rounded-full px-2 text-[12px] font-normal leading-4"
                            style={{
                              background: 'rgba(251, 44, 54, 0.15)',
                              color: 'rgba(193, 0, 7, 1)',
                            }}
                          >
                            Full
                          </span>
                        )}
                        {slot.status === 'spots' && slot.spotsLeft != null && (
                          <span
                            className="mt-4 inline-flex h-[22px] items-center rounded-full px-2 text-[12px] font-normal leading-4"
                            style={{
                              background: 'rgba(0, 166, 244, 0.15)',
                              color: 'rgba(0, 105, 168, 1)',
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
                        className="pointer-events-none size-5 shrink-0 [&_svg]:size-3.5"
                      />
                    </button>
                  </li>
                );
              })}
            </ul>
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
            disabled={!selected}
            onClick={() => onOpenChange(false)}
            className="h-9 min-w-0 flex-1 cursor-pointer rounded-md px-4 text-[14px] text-white disabled:cursor-not-allowed disabled:opacity-50 sm:flex-none"
            style={{ background: 'rgba(26, 101, 248, 1)' }}
          >
            <span className="block truncate">{confirmLabel}</span>
          </button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
