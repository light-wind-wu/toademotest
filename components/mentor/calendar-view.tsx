'use client';

/**
 * Mentor interview calendar (read-only + click-to-schedule).
 *
 * TODO: Implement drag-and-drop scheduling so a shortlisted candidate can be
 * dragged from the left panel directly onto an available time slot. Current
 * fallback is "select candidate, then click slot".
 */

import { useMemo, useState } from 'react';
import { addDays, format, startOfWeek } from 'date-fns';
import { cn } from '@/lib/utils';
import type { Application, SharedInterviewSession } from '@/lib/types';
import {
  getMentorApplicantStage,
  getSchoolShort,
} from '@/lib/mentor-workspace';

const SLOTS = [
  '09:30',
  '11:00',
  '14:30',
  '16:00',
];

const DEFAULT_DURATION = '1 hour';
const DEFAULT_LOCATION = 'Meeting room 4B';

interface CalendarViewProps {
  weekStart: string; // YYYY-MM-DD
  projectId: string;
  apps: Application[];
  sessions: SharedInterviewSession[];
  onCreateSession: (session: SharedInterviewSession, applicantId: string) => void;
}

function initials(name: string): string {
  return name
    .split(' ')
    .map(part => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

function generateId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export default function CalendarView({
  weekStart,
  projectId,
  apps,
  sessions,
  onCreateSession,
}: CalendarViewProps) {
  const start = useMemo(
    () => startOfWeek(new Date(`${weekStart}T00:00:00`), { weekStartsOn: 1 }),
    [weekStart],
  );

  const days = useMemo(
    () => Array.from({ length: 5 }, (_, i) => addDays(start, i)),
    [start],
  );

  const dayStr = (d: Date) => format(d, 'yyyy-MM-dd');

  const projectSessions = useMemo(
    () => sessions.filter(s => s.projectId === projectId),
    [sessions, projectId],
  );

  const sessionsBySlot = useMemo(() => {
    const map = new Map<string, SharedInterviewSession[]>();
    for (const session of projectSessions) {
      const key = `${session.date}|${session.time}`;
      const list = map.get(key) ?? [];
      list.push(session);
      map.set(key, list);
    }
    return map;
  }, [projectSessions]);

  const shortlistedCandidates = useMemo(() => {
    return apps.filter(a => {
      const stage = getMentorApplicantStage(a, sessions);
      return stage === 'needs-scheduled' || stage === 'rescheduling-required';
    });
  }, [apps, sessions]);

  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(
    shortlistedCandidates[0]?.id ?? null,
  );

  const selectedCandidate = useMemo(
    () => shortlistedCandidates.find(a => a.id === selectedCandidateId) ?? null,
    [shortlistedCandidates, selectedCandidateId],
  );

  function eventNames(session: SharedInterviewSession): string {
    const ids =
      session.confirmedApplicantIds.length > 0
        ? session.confirmedApplicantIds
        : session.invitedApplicantIds;
    return ids
      .map(id => apps.find(a => a.id === id)?.name)
      .filter(Boolean)
      .join(', ');
  }

  function handleSlotClick(date: string, time: string) {
    if (!selectedCandidate) return;
    const session: SharedInterviewSession = {
      id: generateId('ut-shared-session'),
      projectId,
      date,
      time,
      duration: DEFAULT_DURATION,
      location: DEFAULT_LOCATION,
      capacity: 1,
      invitedApplicantIds: [selectedCandidate.id],
      confirmedApplicantIds: [],
      status: 'invited',
    };
    onCreateSession(session, selectedCandidate.id);
  }

  return (
    <div className="rounded-xl border border-border bg-surface overflow-hidden">
      {/* Inner calendar header */}
      <div className="px-5 py-3 border-b border-border bg-bg-subtle/50 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <p className="text-body-sm font-semibold text-fg">
            {format(days[0], 'dd MMM yyyy')} – {format(days[4], 'dd MMM yyyy')}
          </p>
          <p className="text-[12px] text-fg-muted">
            Drag a shortlisted candidate to an available time, or select a candidate and then choose a time.
          </p>
        </div>
        <div className="flex items-center gap-3 text-[12px]">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-accent" /> Confirmed
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-warning" /> Awaiting confirmation
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full border border-dashed border-fg-muted" /> Available
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr]">
        {/* Shortlisted candidates sidebar */}
        <div className="border-b lg:border-b-0 lg:border-r border-border p-4">
          <div className="flex items-center gap-2 mb-1">
            <p className="text-label-md font-semibold text-fg">Shortlisted candidates</p>
            <span className="w-6 h-6 rounded-full bg-bg-subtle text-[12px] font-semibold text-fg-muted flex items-center justify-center">
              {shortlistedCandidates.length}
            </span>
          </div>
          <p className="text-[12px] text-fg-muted mb-3">Ready to arrange an interview</p>
          <div className="space-y-2">
            {shortlistedCandidates.map(candidate => {
              const stage = getMentorApplicantStage(candidate, sessions);
              const selected = selectedCandidateId === candidate.id;
              const note = candidate.rescheduleNote ?? candidate.notes ?? '';
              const statusLabel = stage === 'rescheduling-required' ? 'Reschedule requested' : 'Shortlisted';
              return (
                <button
                  key={candidate.id}
                  type="button"
                  onClick={() => setSelectedCandidateId(candidate.id)}
                  className={cn(
                    'w-full text-left rounded-xl border p-3 transition-colors',
                    selected
                      ? 'border-accent bg-accent/5'
                      : 'border-border bg-surface hover:bg-bg-subtle',
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-bg-subtle flex items-center justify-center text-[12px] font-bold text-fg">
                      {initials(candidate.name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-body-sm font-semibold text-fg truncate">{candidate.name}</p>
                      <p className="text-[12px] text-fg-muted">
                        {statusLabel} · {getSchoolShort(candidate.school)} | Year {candidate.year}
                      </p>
                    </div>
                  </div>
                  {note && (
                    <p className="mt-2 text-[12px] text-fg-muted leading-relaxed border-t border-border pt-2">
                      {note}
                    </p>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Calendar grid */}
        <div className="p-4">
          {!selectedCandidate && shortlistedCandidates.length > 0 && (
            <p className="text-body-sm text-fg-muted mb-3">Select a candidate from the left to schedule.</p>
          )}

          <div className="grid grid-cols-[80px_repeat(5,1fr)]">
            {/* Header row */}
            <div className="border-b border-r border-border bg-bg-subtle/30 p-2" />
            {days.map((d, i) => (
              <div
                key={i}
                className="border-b border-r border-border bg-bg-subtle/30 p-3 text-center"
              >
                <p className="text-[12px] font-bold text-fg-subtle">
                  {format(d, 'EEE')}
                </p>
                <p className="text-body-md font-semibold text-fg">{format(d, 'dd MMM')}</p>
              </div>
            ))}

            {/* Time slots */}
            {SLOTS.map(time => (
              <div key={time} className="contents">
                <div className="border-b border-r border-border p-2 text-center text-body-sm text-fg-muted">
                  {time}
                </div>
                {days.map(d => {
                  const key = `${dayStr(d)}|${time}`;
                  const slotSessions = sessionsBySlot.get(key) ?? [];
                  return (
                    <div
                      key={key}
                      className="border-b border-r border-border p-2 min-h-[90px]"
                    >
                      {slotSessions.length === 0 ? (
                        <button
                          type="button"
                          disabled={!selectedCandidate}
                          onClick={() => handleSlotClick(dayStr(d), time)}
                          className={cn(
                            'h-full w-full rounded-lg border border-dashed border-border flex items-center justify-center text-[12px] text-fg-muted transition-colors',
                            selectedCandidate
                              ? 'hover:border-accent hover:text-accent hover:bg-accent/5'
                              : 'cursor-not-allowed opacity-60',
                          )}
                        >
                          Available
                        </button>
                      ) : (
                        <div className="space-y-1.5">
                          {slotSessions.map(session => {
                            const confirmed = session.status === 'confirmed';
                            const names = eventNames(session);
                            return (
                              <div
                                key={session.id}
                                className={cn(
                                  'w-full rounded-lg border px-2 py-1.5 text-[12px] leading-4',
                                  confirmed
                                    ? 'bg-accent/10 border-accent/20 text-accent'
                                    : 'bg-warning-bg border-warning/20 text-warning',
                                )}
                              >
                                <p className="font-semibold">Sent to: {names}</p>
                                <p className="text-[11px] opacity-90">
                                  {confirmed
                                    ? `Confirmed · ${session.location ?? DEFAULT_LOCATION}`
                                    : 'Shared slot · Awaiting confirmation'}
                                </p>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
