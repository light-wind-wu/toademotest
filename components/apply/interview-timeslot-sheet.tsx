'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { addDays, format } from 'date-fns';
import { Loader2, X } from 'lucide-react';
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
import DatePicker from '@/components/ui-legacy/date-picker';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui-legacy/select';
import TaskCompletedDialog from '@/components/apply/task-completed-dialog';
import { cn } from '@/lib/utils';
import type { ApplyDashboardBase } from '@/lib/apply-dashboard-version';

export const INTERVIEW_PROPOSED_FROM_KEY = 'dsta_interview_proposed_from';
export const CUSTOM_SLOT_ID = 'custom';

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

const TIME_WINDOWS = ['09:00 — 11:00', '11:00 — 12:00'] as const;

const META = [
  ['Format', 'Microsoft Teams'],
  ['Duration', '30 minutes'],
  ['Respond by', '30 Aug 2026'],
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
  /** V1/V2: show “Request another timeslot”. V3/V4: fixed slots only. */
  allowCustomRequest = true,
  /** Which dashboard opened this sheet — used to route to V3/V4 after custom request. */
  sourceVersion = 'v1',
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectName: string;
  allowCustomRequest?: boolean;
  sourceVersion?: ApplyDashboardBase;
}) {
  const router = useRouter();
  const minPreferredDate = useMemo(
    () => format(addDays(new Date(), 1), 'yyyy-MM-dd'),
    [],
  );
  const [selectedId, setSelectedId] = useState<string>('2');
  const [preferredDate, setPreferredDate] = useState('');
  const [availableTime, setAvailableTime] = useState('');
  const [taskCompletedOpen, setTaskCompletedOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const isCustom = allowCustomRequest && selectedId === CUSTOM_SLOT_ID;
  const canConfirm = isCustom
    ? Boolean(preferredDate && availableTime)
    : Boolean(selectedId);

  function handleConfirm() {
    if (confirming) return;

    if (isCustom) {
      try {
        sessionStorage.setItem(INTERVIEW_PROPOSED_FROM_KEY, sourceVersion);
      } catch {
        /* ignore */
      }
      setConfirming(true);
      window.setTimeout(() => {
        onOpenChange(false);
        setConfirming(false);
        router.push('/apply/interview-proposed');
      }, 900);
      return;
    }

    setConfirming(true);
    window.setTimeout(() => {
      onOpenChange(false);
      setConfirming(false);
      window.setTimeout(() => setTaskCompletedOpen(true), 180);
    }, 700);
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
          <div className="relative flex h-full min-h-0 flex-1 flex-col overflow-hidden">
          {confirming && (
            <div
              className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-white/85 backdrop-blur-[1px]"
              aria-live="polite"
              aria-busy="true"
            >
              <Loader2
                className="size-8 animate-spin text-accent"
                strokeWidth={1.5}
                aria-hidden
              />
              <span className="text-[14px] font-medium text-fg-muted">Submitting…</span>
            </div>
          )}
          <SheetClose
            className={cn(
              'absolute right-4 top-4 z-10 inline-flex size-6 items-center justify-center rounded-sm text-fg-muted opacity-70 transition-opacity',
              'hover:opacity-100 focus-visible:outline-1 focus-visible:outline-offset-0 focus-visible:outline-accent',
              confirming && 'pointer-events-none opacity-40',
            )}
            aria-label="Close"
            disabled={confirming}
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

          <SheetBody className="flex flex-col gap-0 overflow-y-auto px-0 pb-5 pt-4">
            <div style={{ borderTop: '1px solid rgba(231, 228, 221, 1)' }}>
              <div
                className="mx-4 sm:mx-6"
                style={{ borderBottom: '1px solid rgba(231, 228, 221, 1)' }}
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
                      <RadioGroupItem value={slot.id} className="size-5 shrink-0" />
                    </label>
                  );
                })}

                {allowCustomRequest && (
                  <div
                    className={cn(
                      'flex w-full flex-col gap-3 rounded-lg border px-4 py-3 text-left transition-colors',
                      isCustom
                        ? 'border-[rgba(26,101,248,1)] bg-[rgba(26,101,248,0.04)]'
                        : 'border-[rgba(231,228,221,1)] bg-white',
                    )}
                  >
                    <div className="flex w-full items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setSelectedId(CUSTOM_SLOT_ID)}
                        className="min-w-0 flex-1 cursor-pointer text-left text-[14px] font-semibold leading-5"
                        style={{ color: 'rgba(15, 23, 43, 1)' }}
                      >
                        Request another timeslot
                      </button>
                      <RadioGroupItem
                        value={CUSTOM_SLOT_ID}
                        className="size-5 shrink-0"
                      />
                    </div>

                    {isCustom && (
                      <div className="flex w-full flex-col gap-3">
                        <div className="w-full max-w-[384px]">
                          <p
                            className="mb-1.5 text-[14px] font-medium leading-[18px]"
                            style={{ color: 'rgba(15, 23, 43, 1)' }}
                          >
                            Preferred date <span className="text-danger">*</span>
                          </p>
                          <DatePicker
                            value={preferredDate}
                            onChange={setPreferredDate}
                            minDate={minPreferredDate}
                            placeholder="Select date"
                          />
                        </div>
                        <div className="w-full max-w-[384px]">
                          <p
                            className="mb-1.5 text-[14px] font-medium leading-[18px]"
                            style={{ color: 'rgba(15, 23, 43, 1)' }}
                          >
                            Available time <span className="text-danger">*</span>
                          </p>
                          <Select
                            value={availableTime || null}
                            onValueChange={(v) => {
                              if (typeof v === 'string') setAvailableTime(v);
                            }}
                          >
                            <SelectTrigger className="w-full bg-white">
                              <SelectValue placeholder="Select time" />
                            </SelectTrigger>
                            <SelectContent>
                              {TIME_WINDOWS.map((t) => (
                                <SelectItem key={t} value={t}>
                                  {t}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </RadioGroup>
            </div>
          </SheetBody>

          <SheetFooter className="shrink-0 gap-3 px-4 sm:justify-end sm:px-6">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              disabled={confirming}
              className="w-auto shrink-0 cursor-pointer rounded-md border border-border bg-white text-[14px] text-fg disabled:cursor-not-allowed disabled:opacity-50"
              style={{ padding: '6.5px 13px' }}
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={!canConfirm || confirming}
              onClick={handleConfirm}
              className="h-9 min-w-0 cursor-pointer rounded-md px-4 text-[14px] text-white disabled:cursor-not-allowed disabled:opacity-50"
              style={{ background: 'rgba(26, 101, 248, 1)' }}
            >
              Confirm
            </button>
          </SheetFooter>
          </div>
        </SheetContent>
      </Sheet>

      <TaskCompletedDialog
        open={taskCompletedOpen}
        onOpenChange={setTaskCompletedOpen}
      />
    </>
  );
}
