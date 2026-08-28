'use client';

import { useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import type { Application, SharedInterviewSession } from '@/lib/types';
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

const TIME_OPTIONS = Array.from({ length: 26 }, (_, i) => {
  const h = Math.floor(i / 2) + 8;
  const m = i % 2 === 0 ? '00' : '30';
  return `${String(h).padStart(2, '0')}:${m}`;
});

const DURATION_OPTIONS = ['30 minutes', '1 hour', '1.5 hours', '2 hours'];

type SetupMode = 'dedicated' | 'shared' | 'skip';

const MODES: { key: SetupMode; title: string; description: string }[] = [
  {
    key: 'dedicated',
    title: 'Fix One Slot',
    description: 'Send one date and time to one applicant for confirmation.',
  },
  {
    key: 'shared',
    title: 'Shared slots',
    description: 'Share up to five slots. Confirmed slots become occupied.',
  },
  {
    key: 'skip',
    title: 'Reach Out Directly',
    description: 'Contact the applicant directly. Interview method shall be determined by you.',
  },
];

interface InterviewSetupModalProps {
  applicant: Application;
  projectApplicants: Application[];
  onClose: () => void;
  onSave: (updatedApps: Application[], newSessions: SharedInterviewSession[]) => void;
}

export default function InterviewSetupModal({
  applicant,
  projectApplicants,
  onClose,
  onSave,
}: InterviewSetupModalProps) {
  const [mode, setMode] = useState<SetupMode>('dedicated');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('09:00');
  const [duration, setDuration] = useState('1 hour');
  const [location, setLocation] = useState('');
  const [selectedApplicantIds, setSelectedApplicantIds] = useState<string[]>([applicant.id]);
  const [note, setNote] = useState('');

  const eligibleApplicants = useMemo(
    () => projectApplicants.filter(a => a.status === 'Shortlisted for Interview'),
    [projectApplicants],
  );

  const canSubmit = useMemo(() => {
    if (mode === 'skip') return note.trim().length > 0;
    if (!date || !time) return false;
    if (mode === 'shared') return selectedApplicantIds.length > 0;
    return true;
  }, [mode, date, time, selectedApplicantIds, note]);

  function generateId(prefix: string) {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }

  function handleSubmit() {
    if (mode === 'skip') {
      const updated: Application = {
        ...applicant,
        status: 'Interview Completed',
        interviewSetupMethod: 'direct',
        directSchedulingNote: note.trim(),
      };
      onSave([updated], []);
      return;
    }

    const slot = { date, time, duration };

    if (mode === 'dedicated') {
      const updated: Application = {
        ...applicant,
        interviewSetupMethod: 'scheduled',
        interviewSlots: [slot],
        confirmedSlot: undefined,
        sharedSessionId: undefined,
      };
      onSave([updated], []);
      return;
    }

    // shared mode
    const session: SharedInterviewSession = {
      id: generateId('ut-shared-session'),
      projectId: applicant.shortlistedFor ?? '',
      date,
      time,
      duration,
      location: location.trim() || undefined,
      capacity: selectedApplicantIds.length,
      invitedApplicantIds: selectedApplicantIds,
      confirmedApplicantIds: [],
      status: 'invited',
    };

    const updatedApps = projectApplicants
      .filter(a => selectedApplicantIds.includes(a.id))
      .map(a => ({
        ...a,
        interviewSetupMethod: 'shared' as const,
        sharedSessionId: session.id,
        interviewSlots: undefined,
        confirmedSlot: undefined,
      }));

    onSave(updatedApps, [session]);
  }

  return (
    <Dialog open onOpenChange={open => !open && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Set up interview for {applicant.name}</DialogTitle>
          <DialogDescription>
            Select how the applicant should receive interview availability.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {MODES.map(({ key, title, description }) => {
              const selected = mode === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setMode(key)}
                  className={cn(
                    'text-left rounded-xl border p-3 transition-colors',
                    selected
                      ? 'border-accent bg-accent/5'
                      : 'border-border bg-surface hover:bg-bg-subtle',
                  )}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-body-sm font-semibold text-fg">{title}</span>
                    <span
                      className={cn(
                        'w-4 h-4 rounded-full border flex items-center justify-center',
                        selected ? 'border-accent' : 'border-fg-muted',
                      )}
                    >
                      {selected && <span className="w-2 h-2 rounded-full bg-accent" />}
                    </span>
                  </div>
                  <p className="text-[12px] leading-4 text-fg-muted">{description}</p>
                </button>
              );
            })}
          </div>

          {mode === 'skip' ? (
            <div className="rounded-xl bg-warning/10 border border-warning/20 p-4 space-y-3">
              <p className="text-body-sm text-warning font-semibold">
                You will still need to conduct the interview.
              </p>
              <label className="block">
                <span className="text-body-sm font-semibold text-fg">Contact note</span>
                <textarea
                  className="mt-1 w-full rounded-xl border border-border bg-surface text-body-sm text-fg p-3 resize-none focus:outline-none focus:ring-1 focus:ring-accent"
                  rows={3}
                  placeholder="e.g. Called applicant at +65 xxxx xxxx on 20 Jul…"
                  value={note}
                  onChange={e => setNote(e.target.value)}
                />
              </label>
            </div>
          ) : (
            <div className="space-y-4">
              {mode === 'shared' && (
                <div>
                  <p className="text-body-sm font-semibold text-fg mb-2">Select candidates</p>
                  <div className="max-h-40 overflow-y-auto rounded-xl border border-border bg-surface p-1 space-y-1">
                    {eligibleApplicants.length === 0 ? (
                      <p className="text-body-sm text-fg-muted px-3 py-2">
                        No eligible shortlisted candidates.
                      </p>
                    ) : (
                      eligibleApplicants.map(a => {
                        const checked = selectedApplicantIds.includes(a.id);
                        return (
                          <label
                            key={a.id}
                            className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-bg-subtle cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={e => {
                                setSelectedApplicantIds(prev =>
                                  e.target.checked
                                    ? [...prev, a.id]
                                    : prev.filter(id => id !== a.id),
                                );
                              }}
                              className="w-4 h-4 accent-accent shrink-0"
                            />
                            <span className="text-body-sm text-fg">
                              {a.name} · {a.school} · Y{a.year}
                            </span>
                          </label>
                        );
                      })
                    )}
                  </div>
                </div>
              )}

              <div>
                <p className="text-body-sm font-semibold text-fg mb-2">Interview date and time</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <DatePicker value={date} onChange={setDate} placeholder="Select date" />
                  <select
                    value={time}
                    onChange={e => setTime(e.target.value)}
                    className="h-9 w-full rounded-md border border-border bg-surface px-3 text-body-sm text-fg outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
                  >
                    {TIME_OPTIONS.map(t => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-body-sm font-semibold text-fg">Duration</label>
                  <select
                    value={duration}
                    onChange={e => setDuration(e.target.value)}
                    className="mt-1 h-9 w-full rounded-md border border-border bg-surface px-3 text-body-sm text-fg outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
                  >
                    {DURATION_OPTIONS.map(d => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-body-sm font-semibold text-fg">Location</label>
                  <input
                    type="text"
                    value={location}
                    onChange={e => setLocation(e.target.value)}
                    placeholder="e.g. Meeting room 4B"
                    className="mt-1 h-9 w-full rounded-md border border-border bg-surface px-3 text-body-sm text-fg outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
                  />
                </div>
              </div>

              <p className="text-[12px] text-fg-muted">
                {mode === 'dedicated'
                  ? 'The applicant must confirm this slot or request another time.'
                  : 'Applicants can see occupied slots but cannot select them. Maximum five slots.'}
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button disabled={!canSubmit} onClick={handleSubmit}>
            Send Interview Setup
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
