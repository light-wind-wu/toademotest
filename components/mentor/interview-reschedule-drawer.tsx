'use client';

import { useState } from 'react';
import Drawer from '@/components/ui-legacy/drawer';
import Button from '@/components/ui-legacy/button';
import DatePicker from '@/components/ui-legacy/date-picker';
import { CalendarClock } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Application } from '@/lib/types';

const TIME_OPTIONS = Array.from({ length: 26 }, (_, i) => {
  const h = Math.floor(i / 2) + 8;
  const m = i % 2 === 0 ? '00' : '30';
  return `${String(h).padStart(2, '0')}:${m}`;
});

const DURATION_OPTIONS = ['1 hour'];

const SELECT_CLS =
  'w-full rounded-lg border border-border bg-surface px-3 py-2 text-body-md text-fg outline-none ' +
  'focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all cursor-pointer';

function fmtSlot(slot: { date: string; time: string }) {
  const d = new Date(`${slot.date}T${slot.time}`);
  return (
    d.toLocaleDateString('en-SG', { weekday: 'short', day: 'numeric', month: 'short' }) +
    ' · ' +
    d.toLocaleTimeString('en-SG', { hour: '2-digit', minute: '2-digit', hour12: true })
  );
}

export type RescheduleSlot = { date: string; time: string; duration?: string };

export default function InterviewRescheduleDrawer({
  app,
  onSave,
  onClose,
}: {
  app:     Application;
  onSave:  (slots: RescheduleSlot[]) => void;
  onClose: () => void;
}) {
  const existing     = app.interviewSlots ?? [];
  const confirmedSlot =
    app.confirmedSlot !== undefined && existing.length
      ? existing[app.confirmedSlot]
      : null;

  const [slots, setSlots] = useState<{ date: string; time: string; duration: string }[]>(
    Array.from({ length: 3 }, (_, i) => ({
      date:     existing[i]?.date     ?? '',
      time:     existing[i]?.time     ?? '09:00',
      duration: '1 hour',
    }))
  );
  function setSlot(i: number, field: 'date' | 'time' | 'duration', val: string) {
    setSlots(prev => prev.map((s, idx) => idx === i ? { ...s, [field]: val } : s));
  }

  function handleSave() {
    const valid = slots.filter(s => s.date && s.time);
    if (!valid.length) return;
    onSave(valid);
  }

  const canSave = slots.some(s => s.date && s.time);

  return (
    <Drawer
      open
      onClose={onClose}
      title="Reschedule Interview"
      subtitle={`Propose new slots for ${app.name}`}
      footer={
        <div className="flex gap-2">
          <Button disabled={!canSave} onClick={handleSave} className="flex-1 justify-center">
            <CalendarClock size={14} />Send New Slots
          </Button>
          <Button variant="ghost" onClick={onClose} className="flex-1 justify-center">Cancel</Button>
        </div>
      }
    >
      <div className="px-6 py-5 space-y-5">
        {confirmedSlot && (
          <div className="rounded-xl border border-warning/30 bg-warning/5 px-4 py-3">
            <p className="text-[13px] font-bold uppercase tracking-wide text-warning mb-1">Currently scheduled</p>
            <p className="text-body-sm text-fg">{fmtSlot(confirmedSlot)}</p>
            <p className="text-[13px] text-fg-muted mt-1">
              Proposing new slots will cancel this and return the applicant to pending confirmation.
            </p>
          </div>
        )}
        <div className="flex items-start gap-2 px-3 py-2.5 bg-accent/5 border border-accent/20 rounded-xl">
          <CalendarClock size={14} className="text-accent mt-0.5 shrink-0" />
          <p className="text-body-sm text-fg-muted">
            Propose up to 3 new slots. {app.name.split(' ')[0]} will confirm one.
            Fill at least one to send; leave extras blank to skip.
          </p>
        </div>
        {slots.map((slot, i) => (
          <div key={i} className="space-y-2">
            <p className="text-label-sm text-fg font-semibold">Option {i + 1}</p>
            <DatePicker value={slot.date} onChange={v => setSlot(i, 'date', v)} placeholder="Select date" />
            <div className="flex gap-2">
              <select
                value={slot.time}
                onChange={e => setSlot(i, 'time', e.target.value)}
                className={cn(SELECT_CLS, 'flex-1')}
              >
                {TIME_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <select
                value={slot.duration}
                onChange={e => setSlot(i, 'duration', e.target.value)}
                className={cn(SELECT_CLS, 'flex-1')}
              >
                {DURATION_OPTIONS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
          </div>
        ))}

      </div>
    </Drawer>
  );
}
