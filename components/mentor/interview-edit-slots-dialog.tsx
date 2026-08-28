'use client';

import { useMemo, useState } from 'react';
import { CalendarClock } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Application } from '@/lib/types';
import Button from '@/components/ui-legacy/button';
import DatePicker from '@/components/ui-legacy/date-picker';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { formatSlot } from '@/lib/mentor-workspace';

const TIME_OPTIONS = Array.from({ length: 26 }, (_, i) => {
  const h = Math.floor(i / 2) + 8;
  const m = i % 2 === 0 ? '00' : '30';
  return `${String(h).padStart(2, '0')}:${m}`;
});

const SELECT_CLS =
  'h-9 w-full rounded-md border border-border bg-surface px-3 text-body-sm text-fg outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent';

export type EditSlot = { date: string; time: string; duration?: string };

interface InterviewEditSlotsDialogProps {
  applicant: Application;
  onClose: () => void;
  onSave: (slots: EditSlot[]) => void;
}

export default function InterviewEditSlotsDialog({
  applicant,
  onClose,
  onSave,
}: InterviewEditSlotsDialogProps) {
  const initialSlots = useMemo<EditSlot[]>(() => {
    const existing = applicant.interviewSlots ?? [];
    if (existing.length > 0) {
      return existing.map(s => ({ ...s, duration: s.duration ?? '1 hour' }));
    }
    return [{ date: '', time: '09:00', duration: '1 hour' }];
  }, [applicant]);

  const [slots, setSlots] = useState<EditSlot[]>(initialSlots);
  const [confirming, setConfirming] = useState(false);

  function setSlot(i: number, field: keyof EditSlot, val: string) {
    setSlots(prev => prev.map((s, idx) => (idx === i ? { ...s, [field]: val } : s)));
  }

  function addSlot() {
    if (slots.length >= 5) return;
    setSlots(prev => [...prev, { date: '', time: '09:00', duration: '1 hour' }]);
  }

  function removeSlot(i: number) {
    setSlots(prev => {
      const next = prev.filter((_, idx) => idx !== i);
      if (next.length === 0) return [{ date: '', time: '09:00', duration: '1 hour' }];
      return next;
    });
  }

  const canUpdate = slots.some(s => s.date && s.time);

  function handleConfirm() {
    const valid = slots.filter(s => s.date && s.time);
    if (!valid.length) return;
    onSave(valid);
  }

  return (
    <Dialog open onOpenChange={open => !open && onClose()}>
      <DialogContent className="max-w-2xl">
        {confirming ? (
          <>
            <DialogHeader>
              <DialogTitle>Update interview availability?</DialogTitle>
              <DialogDescription>
                Review the selected availability before sending it to {applicant.name}.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3">
              {slots
                .filter(s => s.date && s.time)
                .map((slot, i) => (
                  <div
                    key={i}
                    className="rounded-lg border border-border bg-bg-subtle p-3 text-body-sm text-fg"
                  >
                    {formatSlot(slot, { includeTime: true, includeDuration: true })}
                  </div>
                ))}
            </div>

            <DialogFooter>
              <Button variant="ghost" onClick={() => setConfirming(false)}>
                Cancel
              </Button>
              <Button onClick={handleConfirm}>Update availability</Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Edit interview slots for {applicant.name}</DialogTitle>
              <DialogDescription>
                The invitation has already been sent. Revise the shared availability below.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="rounded-xl border border-accent/20 bg-accent/5 p-3 space-y-1">
                <p className="text-body-sm text-accent font-semibold">Invitation already sent</p>
                <p className="text-[12px] text-fg-muted">
                  Update the existing slots or add more availability. The applicant will see the
                  revised list.
                </p>
              </div>

              <div className="space-y-3">
                <p className="text-body-sm font-semibold text-fg">Shared interview slots</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {slots.map((slot, i) => (
                    <div key={i} className="space-y-2">
                      <DatePicker
                        value={slot.date}
                        onChange={v => setSlot(i, 'date', v)}
                        placeholder="Select date"
                      />
                      <div className="flex gap-2">
                        <select
                          value={slot.time}
                          onChange={e => setSlot(i, 'time', e.target.value)}
                          className={SELECT_CLS}
                        >
                          {TIME_OPTIONS.map(t => (
                            <option key={t} value={t}>
                              {t}
                            </option>
                          ))}
                        </select>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeSlot(i)}
                          className="shrink-0"
                        >
                          Remove
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                {slots.length < 5 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addSlot}
                    className="w-full sm:w-auto"
                  >
                    Add another slot
                  </Button>
                )}

                <p className="text-[12px] text-fg-muted">
                  Applicants can see occupied slots but cannot select them. Maximum five slots.
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button variant="ghost" onClick={onClose}>
                Cancel
              </Button>
              <Button disabled={!canUpdate} onClick={() => setConfirming(true)}>
                Update Interview Slots
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
