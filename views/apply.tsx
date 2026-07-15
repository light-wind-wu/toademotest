'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Shell from '@/components/layout/shell';
import { useRole } from '@/lib/role';
import Button from '@/components/ui-legacy/button';
import Modal from '@/components/ui-legacy/modal';
import {
  FileText, ChevronDown, ChevronUp, GripVertical,
  AlertCircle, Hourglass, UserCheck, Briefcase, XCircle, Calendar,
  CheckCircle2, CheckCircle, Bell, Clock, ChevronRight,
  Video, Copy, CalendarPlus, CalendarClock, CalendarSearch,
  type LucideIcon,
} from 'lucide-react';
import DatePicker from '@/components/ui-legacy/date-picker';
import DateRangePicker from '@/components/ui-legacy/date-range-picker';
import applicationsSeed from '@/data/applications.json';
import type { Application, ApplicationStatus, MyApplication, Programme } from '@/lib/types';
import { cn } from '@/lib/utils';
import { addNotification } from '@/lib/notifications';
import { loadProgrammes, loadProjects, saveProjects } from '@/lib/storage';

const MY_APPS_KEY     = 'dsta_my_applications';
const IO_APPS_KEY     = 'dsta_applications';
const IO_APPS_VER_KEY = 'dsta_applications_seed_v';
const IO_APPS_VER     = '31';
const DRAFT_PREFIX    = 'dsta_apply_draft_';

/* ── Draft type ──────────────────────────────────────────────────────────── */
interface DraftInfo {
  programmeId: string;
  programmeName: string;
  step: number;
  savedAt: string;
}

function loadMyApps(): MyApplication[] {
  try { const r = localStorage.getItem(MY_APPS_KEY); return r ? JSON.parse(r) : []; } catch { return []; }
}
function loadIoApps(): Application[] {
  try {
    const ver = localStorage.getItem(IO_APPS_VER_KEY);
    if (ver !== IO_APPS_VER) {
      localStorage.setItem(IO_APPS_KEY, JSON.stringify(applicationsSeed));
      localStorage.setItem(IO_APPS_VER_KEY, IO_APPS_VER);
      return applicationsSeed as Application[];
    }
    const r = localStorage.getItem(IO_APPS_KEY);
    return r ? (JSON.parse(r) as Application[]) : (applicationsSeed as Application[]);
  } catch { return applicationsSeed as Application[]; }
}
function loadDrafts(programmes: Programme[]): DraftInfo[] {
  const progMap = new Map(programmes.map(p => [p.id, p.title]));
  const drafts: DraftInfo[] = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key?.startsWith(DRAFT_PREFIX)) continue;
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const d = JSON.parse(raw);
      if (!d.programmeId) continue;
      drafts.push({
        programmeId:   d.programmeId,
        programmeName: progMap.get(d.programmeId) ?? d.programmeId,
        step:          d.step ?? 0,
        savedAt:       d.savedAt ?? '',
      });
    }
  } catch {}
  return drafts;
}

function saveIoApps(apps: Application[]): void {
  try {
    localStorage.setItem(IO_APPS_KEY, JSON.stringify(apps));
    localStorage.setItem(IO_APPS_VER_KEY, IO_APPS_VER);
  } catch { /* ignore */ }
}

function incrementProjectMatched(projectId: string) {
  const updated = loadProjects().map(p =>
    p.id === projectId ? { ...p, matched: Math.min(p.matched + 1, p.slots) } : p
  );
  saveProjects(updated);
}

function formatDate(iso: string) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-SG', { day: 'numeric', month: 'short', year: 'numeric' });
}

/* ── Meeting link helpers ─────────────────────────────────────────────────── */
function generateMeetingLink(appId: string): string {
  const seed = appId.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
  return `https://teams.microsoft.com/l/meetup-join/19:meeting_${seed}Zg@thread.v2/0`;
}

function generateICS(
  slot: { date: string; time: string; duration?: string },
  uid: string,
  summary: string,
  description: string,
  meetingLink: string,
): string {
  const durationMins = slot.duration ? parseInt(slot.duration) : 45;
  const start = new Date(`${slot.date}T${slot.time}:00`);
  const end   = new Date(start.getTime() + durationMins * 60_000);
  const fmt   = (d: Date) => d.toISOString().replace(/[-:.]/g, '').slice(0, 15) + 'Z';
  return [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//DSTA TOA Portal//EN',
    'BEGIN:VEVENT',
    `UID:${uid}@dsta.gov.sg`,
    `DTSTART:${fmt(start)}`, `DTEND:${fmt(end)}`,
    `SUMMARY:${summary}`,
    `DESCRIPTION:${description.replace(/\n/g, '\\n')}\\nJoin: ${meetingLink}`,
    'LOCATION:Microsoft Teams',
    'END:VEVENT', 'END:VCALENDAR',
  ].join('\r\n');
}

function downloadICS(content: string, filename: string) {
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

/* ── Status metadata ──────────────────────────────────────────────────────── */
const STATUS_META: Record<ApplicationStatus, { label: string; color: string; bgColor: string; icon: typeof FileText }> = {
  'Pending Screening':        { label: 'Pending Screening',   color: 'text-warning',  bgColor: 'bg-warning-bg border-warning/30',  icon: Hourglass    },
  'Auto-rejected':            { label: 'Auto-rejected',       color: 'text-danger',   bgColor: 'bg-danger-bg border-danger/30',    icon: XCircle      },
  'Pending Review':           { label: 'Under Review',        color: 'text-accent',   bgColor: 'bg-accent/10 border-accent/20',    icon: FileText     },
  'Shortlisted for Interview':{ label: 'Shortlisted',         color: 'text-accent',   bgColor: 'bg-accent/10 border-accent/20',    icon: UserCheck    },
  'Rejected':                 { label: 'Unsuccessful',        color: 'text-danger',   bgColor: 'bg-danger-bg border-danger/30',    icon: XCircle      },
  'Interview Scheduled':      { label: 'Interview Scheduled', color: 'text-accent',   bgColor: 'bg-accent/10 border-accent/20',    icon: Calendar     },
  'Interview Completed':      { label: 'Interview Completed', color: 'text-accent',   bgColor: 'bg-accent/10 border-accent/20',    icon: UserCheck    },
  'Offer Extended':           { label: 'Offer Extended',        color: 'text-success',  bgColor: 'bg-success-bg border-success/30',  icon: Briefcase    },
  'Offer Accepted':           { label: 'Offer Accepted',        color: 'text-success',  bgColor: 'bg-success-bg border-success/30',  icon: CheckCircle2 },
  'Offer Declined':           { label: 'Offer Declined',        color: 'text-danger',   bgColor: 'bg-danger-bg border-danger/30',    icon: XCircle      },
  'Date Change Requested':     { label: 'Date Change Requested', color: 'text-warning',  bgColor: 'bg-warning-bg border-warning/30',  icon: CalendarSearch },
  'Active Intern':            { label: 'Active Intern',         color: 'text-success',  bgColor: 'bg-success-bg border-success/30',  icon: CheckCircle2 },
  'Internship Completed':     { label: 'Internship Completed',  color: 'text-fg-muted', bgColor: 'bg-bg-muted border-border',         icon: CheckCircle2 },
  'Withdrawn':                { label: 'Withdrawn',             color: 'text-danger',   bgColor: 'bg-danger-bg border-danger/30',    icon: XCircle      },
  'Terminated':               { label: 'Terminated',            color: 'text-danger',   bgColor: 'bg-danger-bg border-danger/30',    icon: XCircle      },
  'Accepted':                 { label: 'Accepted',              color: 'text-success',  bgColor: 'bg-success-bg border-success/30',  icon: CheckCircle2 },
};

const PIPELINE: { label: string; statuses: ApplicationStatus[] }[] = [
  { label: 'Submitted', statuses: ['Pending Screening'] },
  { label: 'Screening', statuses: ['Pending Review'] },
  { label: 'Interview', statuses: ['Shortlisted for Interview', 'Interview Scheduled', 'Interview Completed'] },
  { label: 'Outcome',   statuses: ['Offer Extended', 'Accepted', 'Rejected', 'Auto-rejected'] },
];

function getPipelineStep(status: ApplicationStatus): number {
  for (let i = 0; i < PIPELINE.length; i++) {
    if (PIPELINE[i].statuses.includes(status)) return i;
  }
  return 0;
}

const TERMINAL_FAIL: ApplicationStatus[] = ['Auto-rejected', 'Rejected'];

/* ── Application card ─────────────────────────────────────────────────────── */
function AppCard({ app, projectMap }: { app: MyApplication; projectMap: Map<string, string> }) {
  const [expanded, setExpanded] = useState(false);
  const meta   = STATUS_META[app.status] ?? STATUS_META['Pending Screening'];
  const Icon   = meta.icon;
  const step   = getPipelineStep(app.status);
  const failed = TERMINAL_FAIL.includes(app.status);

  return (
    <div>
      <button
        type="button"
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-start gap-4 p-5 text-left hover:bg-bg-subtle/50 transition-colors"
      >
        <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center shrink-0 border', meta.bgColor)}>
          <Icon size={16} className={meta.color} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-0.5">
            <p className="text-body-md font-semibold text-fg leading-snug">{app.programmeName}</p>
            <span className={cn('inline-flex items-center gap-1 text-[12px] font-bold px-2 py-0.5 rounded-full border', meta.bgColor, meta.color)}>
              {meta.label}
            </span>
          </div>
          <p className="text-body-sm text-fg-muted">
            Submitted {formatDate(app.submittedAt)}
            {app.projectPreferences.length > 0 && ` · ${app.projectPreferences.length} project preference${app.projectPreferences.length !== 1 ? 's' : ''}`}
          </p>

          {!failed ? (
            <div className="flex items-center gap-0 mt-3">
              {PIPELINE.map((stage, i) => (
                <div key={stage.label} className="flex items-center">
                  <div className={cn(
                    'flex items-center gap-1 px-2 py-0.5 rounded-full text-[12px] font-semibold transition-colors',
                    i < step  ? 'bg-accent/10 text-accent' :
                    i === step ? 'bg-accent text-white'     :
                                 'bg-bg-subtle text-fg-subtle',
                  )}>
                    {i < step && <CheckCircle2 size={9} />}
                    {stage.label}
                  </div>
                  {i < PIPELINE.length - 1 && (
                    <div className={cn('w-4 h-px', i < step ? 'bg-accent/40' : 'bg-border')} />
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-2 flex items-center gap-1.5">
              <AlertCircle size={12} className="text-danger" />
              <p className="text-body-sm text-danger">This application was not taken further.</p>
            </div>
          )}
        </div>

        <div className="shrink-0 self-center text-fg-subtle">
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
      </button>

      {expanded && (
        <div className="border-t border-border px-5 py-4 bg-bg-subtle/50">
          {app.projectPreferences.length === 0 ? (
            <p className="text-body-sm text-fg-muted italic">No project preferences submitted.</p>
          ) : (
            <div className="space-y-2">
              <p className="text-label-sm text-fg-muted mb-3">Project Preferences</p>
              {app.projectPreferences.map((projId, i) => (
                <div key={projId} className="flex items-center gap-3 px-3 py-2 bg-surface rounded-lg border border-border">
                  <div className="w-5 h-5 rounded-full bg-accent text-white text-[12px] font-black flex items-center justify-center shrink-0">
                    {i + 1}
                  </div>
                  <GripVertical size={13} className="text-fg-subtle shrink-0" />
                  <p className="text-body-sm text-fg font-medium truncate">
                    {projectMap.get(projId) ?? projId}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Draft application card ───────────────────────────────────────────────── */
function DraftCard({ draft }: { draft: DraftInfo }) {
  const router = useRouter();
  return (
    <div className="flex items-start gap-4 p-5 hover:bg-bg-subtle/50 transition-colors">
      <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 border bg-bg-subtle border-border">
        <FileText size={16} className="text-fg-muted" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-0.5">
          <p className="text-body-md font-semibold text-fg leading-snug">{draft.programmeName}</p>
          <span className="inline-flex items-center text-[12px] font-bold px-2 py-0.5 rounded-full border bg-bg-subtle border-border text-fg-muted">
            Draft
          </span>
        </div>
        <p className="text-body-sm text-fg-muted">Last saved {formatDate(draft.savedAt)}</p>
      </div>
      <button
        type="button"
        onClick={() => router.push(`/apply/${draft.programmeId}`)}
        className="shrink-0 self-center flex items-center gap-1 text-body-sm font-semibold text-accent hover:underline"
      >
        Resume <ChevronRight size={13} />
      </button>
    </div>
  );
}

/* ── Tasks ────────────────────────────────────────────────────────────────── */
type Task = { icon: LucideIcon; color: string; bg: string; label: string; sub: string; tag: string; tagCls: string; href?: string; };

function buildTasks(apps: MyApplication[]): Task[] {
  const tasks: Task[] = [];
  for (const app of apps) {
    if (app.status === 'Offer Extended') {
      tasks.push({ icon: Briefcase, color: 'text-success', bg: 'bg-success-bg', label: 'Respond to your offer', sub: app.programmeName, tag: 'Action Required', tagCls: 'bg-success/10 text-success' });
    }
    if (app.status === 'Interview Scheduled') {
      tasks.push({ icon: Calendar, color: 'text-accent', bg: 'bg-accent/5', label: 'Upcoming interview', sub: app.programmeName, tag: 'Upcoming', tagCls: 'bg-accent/10 text-accent' });
    }
    if (app.status === 'Shortlisted for Interview') {
      tasks.push({ icon: Bell, color: 'text-accent', bg: 'bg-accent/5', label: 'Interview invitation received', sub: app.programmeName, tag: 'Action Required', tagCls: 'bg-warning-bg text-warning' });
    }
    if (app.status === 'Pending Screening' || app.status === 'Pending Review') {
      tasks.push({ icon: Clock, color: 'text-fg-muted', bg: 'bg-bg-subtle', label: 'Application under review', sub: app.programmeName, tag: 'In Progress', tagCls: 'bg-bg-subtle text-fg-muted' });
    }
  }
  return tasks;
}

/* ── Open Programmes view (pre-application) ───────────────────────────────── */
function OpenProgrammes() {
  const router = useRouter();
  const [programmes, setProgrammes] = useState<Programme[]>([]);

  useEffect(() => {
    setProgrammes(loadProgrammes().filter(p => p.status === 'Active'));
  }, []);

  return (
    <Shell activeRoute="/apply">
      <div className="mb-6">
        <h1 className="text-headline-lg text-fg mb-1">Open Programmes</h1>
        <p className="text-body-md text-fg-muted">Apply to DSTA internship programmes currently accepting applications.</p>
      </div>

      {programmes.length === 0 ? (
        <div className="card p-10 text-center">
          <p className="text-body-md text-fg-muted">No programmes are currently open for applications.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {programmes.map(prog => {
            const daysLeft = prog.daysLeft ?? 0;
            const urgent   = daysLeft > 0 && daysLeft <= 7;
            return (
              <div key={prog.id} className="card p-5 flex flex-col gap-3 hover:shadow-md transition-shadow">
                <h2 className="text-headline-md text-fg leading-snug">{prog.title}</h2>
                {prog.description && (
                  <p className="text-body-sm text-fg-muted line-clamp-2">{prog.description}</p>
                )}
                <div className="flex flex-col gap-1 text-body-sm text-fg-muted">
                  <div className="flex items-center gap-2">
                    <Calendar size={13} className="shrink-0 text-fg-subtle" />
                    <span>Deadline: <span className="text-fg font-medium">{formatDate(prog.appDeadline)}</span></span>
                  </div>
                  {daysLeft > 0 && (
                    <div className={`flex items-center gap-2 ${urgent ? 'text-warning' : 'text-fg-muted'}`}>
                      <Clock size={13} className="shrink-0" />
                      <span className="font-medium">{daysLeft} day{daysLeft !== 1 ? 's' : ''} left</span>
                      {urgent && <span className="text-[12px] font-bold uppercase tracking-wide text-warning bg-warning/10 px-1.5 py-0.5 rounded-full">Closing soon</span>}
                    </div>
                  )}
                </div>
                <div className="mt-auto pt-1">
                  <Button className="w-full" onClick={() => router.push(`/apply/${prog.id}`)}>
                    Apply Now <ChevronRight size={14} />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Shell>
  );
}

/* ── Interview slot picker ─────────────────────────────────────────────────── */
function InterviewInvitationCard({
  app, projectTitle, onConfirm, onRescheduleRequest,
}: { app: Application; projectTitle: string; onConfirm: (slotIndex: number) => void; onRescheduleRequest: (note: string) => void }) {
  const [selected,      setSelected]      = useState<number | null>(null);
  const [rescheduleMsg, setRescheduleMsg] = useState('');
  const [confirming,    setConfirming]    = useState<'slot' | 'reschedule' | null>(null);
  const slots = app.interviewSlots ?? [];
  const NONE = slots.length; // sentinel index for "none of these work"

  function fmtSlot(slot: { date: string; time: string; duration?: string }): string {
    const d = new Date(slot.date + 'T00:00:00');
    const dateStr = d.toLocaleDateString('en-SG', { weekday: 'short', day: 'numeric', month: 'short' });
    const [h, m] = slot.time.split(':').map(Number);
    const suffix = h >= 12 ? 'PM' : 'AM';
    const timeStr = `${h % 12 || 12}:${String(m).padStart(2, '0')} ${suffix}`;
    return slot.duration ? `${dateStr} · ${timeStr} (${slot.duration})` : `${dateStr} · ${timeStr}`;
  }

  return (
    <div className="rounded-xl border border-accent/30 bg-accent/5 p-4 space-y-3">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
          <Calendar size={16} className="text-accent" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-body-md font-semibold text-fg leading-snug">Interview Invitation</p>
          <p className="text-body-sm text-fg-muted truncate">{app.programmeName}</p>
          {projectTitle && <p className="text-body-sm text-fg-muted truncate">Project: {projectTitle}</p>}
        </div>
        <span className="text-[12px] font-bold bg-warning/10 text-warning px-2 py-0.5 rounded shrink-0">Action Required</span>
      </div>

      <div className="space-y-2">
        <p className="text-label-sm text-fg-muted">Select your preferred interview slot:</p>
        {slots.map((slot, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setSelected(i)}
            className={cn(
              'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border-2 text-left transition-all',
              selected === i ? 'border-accent bg-accent/10' : 'border-border bg-surface hover:border-accent/40 hover:bg-accent/5',
            )}
          >
            <div className={cn(
              'w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center transition-colors',
              selected === i ? 'border-accent bg-accent' : 'border-border',
            )}>
              {selected === i && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
            </div>
            <span className={cn('text-body-sm font-medium', selected === i ? 'text-accent' : 'text-fg')}>
              {fmtSlot(slot)}
            </span>
          </button>
        ))}
        <button
          type="button"
          onClick={() => setSelected(NONE)}
          className={cn(
            'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border-2 text-left transition-all',
            selected === NONE ? 'border-warning/60 bg-warning-bg' : 'border-border bg-surface hover:border-warning/40 hover:bg-warning-bg/50',
          )}
        >
          <div className={cn(
            'w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center transition-colors',
            selected === NONE ? 'border-warning bg-warning' : 'border-border',
          )}>
            {selected === NONE && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
          </div>
          <span className={cn('text-body-sm font-medium', selected === NONE ? 'text-warning' : 'text-fg-muted')}>
            None of these slots work for me
          </span>
        </button>
      </div>

      {selected === NONE && (
        <textarea
          rows={2}
          value={rescheduleMsg}
          onChange={e => setRescheduleMsg(e.target.value)}
          placeholder="Share your availability so we can propose new slots (e.g. available after 3pm on weekdays)"
          className="w-full text-body-sm border border-border rounded-lg px-3 py-2 bg-surface text-fg resize-none outline-none focus:ring-2 focus:ring-accent/30"
        />
      )}

      {selected !== NONE ? (
        <Button className="w-full" disabled={selected === null} onClick={() => setConfirming('slot')}>
          <Calendar size={14} /> Confirm Slot
        </Button>
      ) : (
        <Button className="w-full" disabled={!rescheduleMsg.trim()} onClick={() => setConfirming('reschedule')}>
          <CalendarClock size={14} /> Request New Slots
        </Button>
      )}

      <Modal open={confirming === 'slot'} onClose={() => setConfirming(null)} labelledBy="confirm-slot-title">
        <h2 id="confirm-slot-title" className="text-headline-sm font-bold text-fg mb-1">Confirm interview slot?</h2>
        {selected !== null && selected !== NONE && (
          <p className="text-body-sm text-fg-muted mb-5">{fmtSlot(slots[selected])}</p>
        )}
        <div className="flex gap-2 justify-end">
          <Button onClick={() => { setConfirming(null); selected !== null && onConfirm(selected); }}>
            <Calendar size={14} /> Confirm
          </Button>
          <Button variant="ghost" onClick={() => setConfirming(null)}>Cancel</Button>
        </div>
      </Modal>

      <Modal open={confirming === 'reschedule'} onClose={() => setConfirming(null)} labelledBy="request-new-slots-title">
        <h2 id="request-new-slots-title" className="text-headline-sm font-bold text-fg mb-1">Request new slots?</h2>
        <p className="text-body-sm text-fg-muted mb-5">DSTA will be notified and will propose new slots based on your availability.</p>
        <div className="flex gap-2 justify-end">
          <Button onClick={() => { setConfirming(null); onRescheduleRequest(rescheduleMsg.trim()); }}>
            <CalendarClock size={14} /> Confirm
          </Button>
          <Button variant="ghost" onClick={() => setConfirming(null)}>Cancel</Button>
        </div>
      </Modal>
    </div>
  );
}

/* ── Scheduled interview card ─────────────────────────────────────────────── */
function ScheduledInterviewCard({ app, projectTitle }: { app: Application; projectTitle: string }) {
  const slot = app.interviewSlots && app.confirmedSlot !== undefined
    ? app.interviewSlots[app.confirmedSlot] : null;
  const [copied, setCopied] = useState(false);

  function fmtSlotLong(s: { date: string; time: string; duration?: string }) {
    const d = new Date(s.date + 'T00:00:00');
    const [h, m] = s.time.split(':').map(Number);
    const suffix = h >= 12 ? 'PM' : 'AM';
    return {
      date: d.toLocaleDateString('en-SG', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }),
      time: `${h % 12 || 12}:${String(m).padStart(2, '0')} ${suffix}${s.duration ? ` · ${s.duration}` : ''}`,
    };
  }

  function handleCopy() {
    if (!app.meetingLink) return;
    navigator.clipboard.writeText(app.meetingLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleAddToCalendar() {
    if (!slot || !app.meetingLink) return;
    const ics = generateICS(
      slot, app.id,
      `DSTA Interview — ${projectTitle || app.programmeName}`,
      `Interview for ${app.programmeName}.`,
      app.meetingLink,
    );
    downloadICS(ics, `dsta-interview-${app.id}.ics`);
  }

  return (
    <div className="rounded-xl border border-accent/30 bg-accent/5 p-4 space-y-3">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
          <Video size={16} className="text-accent" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-body-md font-semibold text-fg">Interview Confirmed</p>
          <p className="text-body-sm text-fg-muted truncate">{app.programmeName}</p>
          {projectTitle && <p className="text-body-sm text-fg-muted truncate">Project: {projectTitle}</p>}
        </div>
        <span className="text-[12px] font-bold bg-accent/10 text-accent px-2 py-0.5 rounded shrink-0">Upcoming</span>
      </div>

      {slot && (
        <div className="px-3 py-2.5 bg-surface rounded-lg border border-border space-y-0.5">
          <p className="text-body-sm font-semibold text-fg">{fmtSlotLong(slot).date}</p>
          <p className="text-body-sm text-fg-muted">{fmtSlotLong(slot).time}</p>
          <p className="text-[13px] text-fg-muted">via Microsoft Teams</p>
        </div>
      )}

      {app.meetingLink && (
        <div className="flex gap-2">
          <a
            href={app.meetingLink}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg bg-accent text-white text-body-sm font-semibold hover:bg-accent/90 transition-colors"
          >
            <Video size={14} /> Join Interview
          </a>
          <button
            onClick={handleCopy}
            title="Copy meeting link"
            className={cn(
              'px-3 py-2 rounded-lg border text-body-sm font-medium transition-colors',
              copied ? 'border-success/40 bg-success-bg text-success' : 'border-border text-fg-muted hover:bg-bg-subtle',
            )}
          >
            <Copy size={14} />
          </button>
          <button
            onClick={handleAddToCalendar}
            title="Add to calendar (.ics)"
            className="px-3 py-2 rounded-lg border border-border text-fg-muted hover:bg-bg-subtle transition-colors"
          >
            <CalendarPlus size={14} />
          </button>
        </div>
      )}
    </div>
  );
}

/* ── Offer response card ───────────────────────────────────────────────────── */
function OfferResponseCard({
  app, projectTitle, onAccepted, onDeclined, onStartDateRequested,
}: {
  app: Application;
  projectTitle: string;
  onAccepted:            (creditBearing: boolean, details: string, startDate: string, endDate: string) => void;
  onDeclined:            () => void;
  onStartDateRequested:  (requestedDate: string, reason: string) => void;
}) {
  const [step,          setStep]          = useState<'choice' | 'credit' | 'start-date' | 'decline-confirm'>('choice');
  const [letterOpen,    setLetterOpen]    = useState(false);
  const [creditBearing, setCreditBearing] = useState<boolean | null>(null);
  const [creditDetails, setCreditDetails] = useState('');
  const [startDate,     setStartDate]     = useState(app.internshipStartDate ?? '');
  const [endDate,       setEndDate]       = useState(app.internshipEndDate   ?? '');
  const [reqDate,       setReqDate]       = useState('');
  const [reqReason,     setReqReason]     = useState('');

  const canSubmitCredit = creditBearing !== null && startDate !== '' && endDate !== '';

  return (
    <div className="rounded-xl border border-success/30 bg-success-bg p-4 space-y-3">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-lg bg-success/10 flex items-center justify-center shrink-0">
          <Briefcase size={16} className="text-success" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-body-md font-semibold text-fg leading-snug">Offer Extended</p>
          <p className="text-body-sm text-fg-muted truncate">{app.programmeName}</p>
          {projectTitle && <p className="text-body-sm text-fg-muted truncate">Project: {projectTitle}</p>}
          {app.offerDeadline && (
            <p className="text-[13px] font-semibold text-warning mt-0.5">
              Respond by {new Date(app.offerDeadline).toLocaleDateString('en-SG', { day: 'numeric', month: 'short', year: 'numeric' })}
            </p>
          )}
        </div>
        <span className="text-[12px] font-bold bg-success/10 text-success px-2 py-0.5 rounded shrink-0">Action Required</span>
      </div>

      {/* Offer letter document */}
      {app.offerLetterBody && (
        <div className="rounded-lg border border-border bg-surface overflow-hidden">
          <button
            onClick={() => setLetterOpen(o => !o)}
            className="w-full flex items-center justify-between px-3 py-2.5 text-left hover:bg-bg-subtle transition-colors"
          >
            <span className="text-body-sm font-semibold text-fg">View Offer Letter</span>
            {letterOpen ? <ChevronUp size={13} className="text-fg-muted" /> : <ChevronDown size={13} className="text-fg-muted" />}
          </button>
          {letterOpen && (
            <div className="border-t border-border px-4 py-3 max-h-64 overflow-y-auto">
              <pre className="text-body-sm text-fg whitespace-pre-wrap font-sans leading-relaxed">{app.offerLetterBody}</pre>
            </div>
          )}
        </div>
      )}

      <p className="text-body-sm text-fg-muted">
        DSTA has extended an internship offer to you. Please respond at your earliest convenience.
      </p>

      <div className="flex flex-col gap-2">
        <Button className="w-full justify-center" onClick={() => setStep('credit')}>
          <CheckCircle2 size={14} /> Accept Offer
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" className="flex-1 text-warning border-warning/30 hover:bg-warning-bg" onClick={() => setStep('start-date')}>
            <CalendarSearch size={14} /> Request Date Change
          </Button>
          <Button variant="outline" className="flex-1 border-danger/40 text-danger hover:bg-danger/5" onClick={() => setStep('decline-confirm')}>
            <XCircle size={14} /> Decline
          </Button>
        </div>
      </div>

      {/* Credit-bearing + dates modal */}
      <Modal open={step === 'credit'} onClose={() => setStep('choice')} maxWidth="lg" labelledBy="accept-offer-details-title">
        <h2 id="accept-offer-details-title" className="text-headline-sm font-bold text-fg mb-1">Accepting Offer — Additional Details</h2>
        <p className="text-body-sm text-fg-muted mb-5">Please provide a few more details to confirm your internship placement.</p>

        <div className="space-y-4">
          <div>
            <label className="block text-[13px] font-bold uppercase tracking-widest text-fg-subtle mb-1.5">
              Internship Period <span className="text-danger">*</span>
            </label>
            <DateRangePicker
              start={startDate}
              end={endDate}
              onChange={(start, end) => { setStartDate(start); setEndDate(end); }}
              placeholder="Pick the start and end date"
            />
          </div>

          <div>
            <label className="block text-[13px] font-bold uppercase tracking-widest text-fg-subtle mb-2">
              Is this internship credit-bearing? <span className="text-danger">*</span>
            </label>
            <div className="flex gap-2">
              {([true, false] as const).map(v => (
                <button
                  key={String(v)}
                  onClick={() => setCreditBearing(v)}
                  className={cn(
                    'flex-1 rounded-xl border px-4 py-2.5 text-body-sm font-semibold transition-all',
                    creditBearing === v
                      ? 'border-accent bg-accent/10 text-accent'
                      : 'border-border bg-surface text-fg-muted hover:border-accent/50'
                  )}
                >
                  {v ? 'Yes — Credit Bearing' : 'No'}
                </button>
              ))}
            </div>
          </div>

          {creditBearing === true && (
            <div>
              <label className="block text-[13px] font-bold uppercase tracking-widest text-fg-subtle mb-1.5">
                Credit Details (module code / school requirement)
              </label>
              <input
                className="w-full rounded-xl border border-border bg-bg-subtle px-3 py-2 text-body-sm text-fg focus:outline-none focus:ring-2 focus:ring-accent/40"
                placeholder="e.g. CS4299 — NUS Industrial Attachment"
                value={creditDetails}
                onChange={e => setCreditDetails(e.target.value)}
              />
            </div>
          )}
        </div>

        <div className="flex gap-2 justify-end mt-6">
          <Button disabled={!canSubmitCredit} onClick={() => onAccepted(creditBearing!, creditDetails, startDate, endDate)}>
            <CheckCircle2 size={14} /> Confirm Acceptance
          </Button>
          <Button variant="ghost" onClick={() => setStep('choice')}>Back</Button>
        </div>
      </Modal>

      {/* Start date change modal */}
      <Modal open={step === 'start-date'} onClose={() => setStep('choice')} labelledBy="request-start-date-title">
        <div className="flex items-center gap-2 mb-1">
          <CalendarSearch size={18} className="text-warning" />
          <h2 id="request-start-date-title" className="text-headline-sm font-bold text-fg">Request Start Date Change</h2>
        </div>
        <p className="text-body-sm text-fg-muted mb-4">Let DSTA know your preferred start date and the reason for the change.</p>
        <div className="space-y-3">
          <div>
            <label className="block text-[13px] font-bold uppercase tracking-widest text-fg-subtle mb-1.5">
              Preferred Start Date <span className="text-danger">*</span>
            </label>
            <DatePicker value={reqDate} onChange={setReqDate} />
          </div>
          <div>
            <label className="block text-[13px] font-bold uppercase tracking-widest text-fg-subtle mb-1.5">
              Reason <span className="text-danger">*</span>
            </label>
            <textarea
              className="w-full rounded-xl border border-border bg-bg-subtle px-3 py-2 text-body-sm text-fg resize-none focus:outline-none focus:ring-2 focus:ring-accent/40"
              rows={3}
              placeholder="Briefly explain why you need a different start date..."
              value={reqReason}
              onChange={e => setReqReason(e.target.value)}
            />
          </div>
        </div>
        <div className="flex gap-2 justify-end mt-4">
          <Button
            disabled={!reqDate || !reqReason.trim()}
            onClick={() => { onStartDateRequested(reqDate, reqReason.trim()); setStep('choice'); }}
          >
            Submit Request
          </Button>
          <Button variant="ghost" onClick={() => setStep('choice')}>Back</Button>
        </div>
      </Modal>

      {/* Decline confirm modal */}
      <Modal open={step === 'decline-confirm'} onClose={() => setStep('choice')} labelledBy="decline-offer-title">
        <h2 id="decline-offer-title" className="text-headline-sm font-bold text-fg mb-1">Decline this offer?</h2>
        <p className="text-body-sm text-fg-muted mb-5">This action cannot be undone. Are you sure you want to decline the internship offer from DSTA?</p>
        <div className="flex gap-2 justify-end">
          <Button variant="outline" className="text-danger border-danger/30 hover:bg-danger-bg" onClick={onDeclined}>
            <XCircle size={14} /> Confirm Decline
          </Button>
          <Button variant="ghost" onClick={() => setStep('choice')}>Back</Button>
        </div>
      </Modal>
    </div>
  );
}

/* ── Date change pending card ─────────────────────────────────────────────── */
function DateChangePendingCard({ app, projectTitle }: { app: Application; projectTitle: string }) {
  const [letterOpen, setLetterOpen] = useState(false);
  return (
    <div className="rounded-xl border border-warning/30 bg-warning-bg p-4 space-y-3">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-lg bg-warning/10 flex items-center justify-center shrink-0">
          <CalendarSearch size={16} className="text-warning" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-body-md font-semibold text-fg leading-snug">Start Date Change Requested</p>
          <p className="text-body-sm text-fg-muted truncate">{app.programmeName}</p>
          {projectTitle && <p className="text-body-sm text-fg-muted truncate">Project: {projectTitle}</p>}
        </div>
        <span className="text-[12px] font-bold bg-warning/10 text-warning px-2 py-0.5 rounded shrink-0">Pending</span>
      </div>
      <p className="text-body-sm text-fg-muted">
        Your request to change the internship start date to{' '}
        <span className="font-semibold text-fg">{app.startDateChangeRequest?.requestedDate ?? '—'}</span>{' '}
        is under review. DSTA will notify you once a decision is made.
      </p>
      {app.offerLetterBody && (
        <div className="rounded-lg border border-border bg-surface overflow-hidden">
          <button
            onClick={() => setLetterOpen(o => !o)}
            className="w-full flex items-center justify-between px-3 py-2.5 text-left hover:bg-bg-subtle transition-colors"
          >
            <span className="text-body-sm font-semibold text-fg">View Offer Letter</span>
            {letterOpen ? <ChevronUp size={13} className="text-fg-muted" /> : <ChevronDown size={13} className="text-fg-muted" />}
          </button>
          {letterOpen && (
            <div className="border-t border-border px-4 py-3 max-h-64 overflow-y-auto">
              <pre className="text-body-sm text-fg whitespace-pre-wrap font-sans leading-relaxed">{app.offerLetterBody}</pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Dashboard view (post-application) ───────────────────────────────────── */
function ApplicantDashboard({
  myApps, ioApps, projectMap, drafts, onConfirmSlot, onOfferAccepted, onOfferDeclined, onStartDateRequested, onRescheduleRequest,
}: {
  myApps:              MyApplication[];
  ioApps:              Application[];
  projectMap:          Map<string, string>;
  drafts:              DraftInfo[];
  onConfirmSlot:         (appId: string, slotIndex: number) => void;
  onOfferAccepted:       (appId: string, creditBearing: boolean, details: string, startDate: string, endDate: string) => void;
  onOfferDeclined:       (appId: string) => void;
  onStartDateRequested:  (appId: string, requestedDate: string, reason: string) => void;
  onRescheduleRequest:   (appId: string, note: string) => void;
}) {
  const { profile } = useRole();
  const router      = useRouter();
  const firstName   = profile.name.split(' ')[0];

  // Apps needing an action from the applicant
  const pendingSlotApps   = ioApps.filter(
    a => a.status === 'Shortlisted for Interview' &&
         (a.interviewSlots ?? []).length > 0 &&
         a.confirmedSlot === undefined,
  );
  const scheduledApps     = ioApps.filter(a => a.status === 'Interview Scheduled');
  const offerApps         = ioApps.filter(a => a.status === 'Offer Extended');
  const dateChangeApps    = ioApps.filter(a => a.status === 'Date Change Requested');
  const actionAppIds      = new Set([
    ...pendingSlotApps.map(a => a.id),
    ...scheduledApps.map(a => a.id),
    ...offerApps.map(a => a.id),
    ...dateChangeApps.map(a => a.id),
  ]);

  const passiveTasks     = buildTasks(myApps.filter(a => !actionAppIds.has(a.id)));
  const totalActionCount = pendingSlotApps.length + scheduledApps.length + offerApps.length + dateChangeApps.length + drafts.length;

  return (
    <Shell activeRoute="/apply">
      <div className="mb-6">
        <h1 className="text-headline-lg text-fg mb-1">Hello, {firstName}.</h1>
        <p className="text-body-md text-fg-muted">Here's an overview of your applications.</p>
      </div>

      <div className="grid grid-cols-12 gap-5">

        {/* Left — My Applications */}
        <div className="col-span-12 lg:col-span-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-headline-md text-fg">My Applications</h2>
            <span className="text-body-sm text-fg-muted">
              {myApps.length + drafts.length} application{myApps.length + drafts.length !== 1 ? 's' : ''}
            </span>
          </div>
          <div className="card overflow-hidden">
            <div className="divide-y divide-border">
              {drafts.map(draft => (
                <DraftCard key={draft.programmeId} draft={draft} />
              ))}
              {myApps.map(app => (
                <AppCard key={app.id} app={app} projectMap={projectMap} />
              ))}
            </div>
          </div>
        </div>

        {/* Right — My Tasks */}
        <div className="col-span-12 lg:col-span-6">
          <div className="flex items-center gap-2 mb-3">
            <h2 className="text-headline-md text-fg">My Tasks</h2>
            {totalActionCount > 0 && (
              <span className="bg-warning-bg text-warning text-caption-bold px-2.5 py-1 rounded-full">
                {totalActionCount} Open
              </span>
            )}
          </div>

          <div className="space-y-3">
            {/* Draft resume cards */}
            {drafts.map(draft => (
              <div key={draft.programmeId} className="rounded-xl border border-warning/30 bg-warning-bg p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-warning/10 flex items-center justify-center shrink-0">
                    <FileText size={16} className="text-warning" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-body-md font-semibold text-fg leading-snug">Incomplete application</p>
                    <p className="text-body-sm text-fg-muted truncate">{draft.programmeName}</p>
                  </div>
                  <span className="text-[12px] font-bold bg-warning/10 text-warning px-2 py-0.5 rounded shrink-0">In Progress</span>
                </div>
                <button
                  type="button"
                  onClick={() => router.push(`/apply/${draft.programmeId}`)}
                  className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-accent text-white text-body-sm font-semibold hover:bg-accent/90 transition-colors"
                >
                  <FileText size={14} /> Resume Application
                </button>
              </div>
            ))}

            {/* Interactive action cards */}
            {pendingSlotApps.map(app => (
              <InterviewInvitationCard
                key={app.id}
                app={app}
                projectTitle={projectMap.get(app.shortlistedFor ?? '') ?? ''}
                onConfirm={slotIndex => onConfirmSlot(app.id, slotIndex)}
                onRescheduleRequest={note => onRescheduleRequest(app.id, note)}
              />
            ))}
            {scheduledApps.map(app => (
              <ScheduledInterviewCard
                key={app.id}
                app={app}
                projectTitle={projectMap.get(app.shortlistedFor ?? '') ?? ''}
              />
            ))}
            {offerApps.map(app => (
              <OfferResponseCard
                key={app.id}
                app={app}
                projectTitle={projectMap.get(app.shortlistedFor ?? '') ?? ''}
                onAccepted={(cb, cd, sd, ed) => onOfferAccepted(app.id, cb, cd, sd, ed)}
                onDeclined={() => onOfferDeclined(app.id)}
                onStartDateRequested={(d, r) => onStartDateRequested(app.id, d, r)}
              />
            ))}
            {dateChangeApps.map(app => (
              <DateChangePendingCard
                key={app.id}
                app={app}
                projectTitle={projectMap.get(app.shortlistedFor ?? '') ?? ''}
              />
            ))}

            {/* Passive task items */}
            {passiveTasks.length > 0 && (
              <div className="card p-4 space-y-2">
                {passiveTasks.map((t, i) => (
                  <div key={i} className={cn('flex items-center gap-3 px-3 py-3 rounded-lg border border-border/50', t.bg)}>
                    <t.icon size={18} className={cn(t.color, 'shrink-0')} />
                    <div className="flex-1 min-w-0">
                      <p className="text-body-md font-semibold text-fg truncate">{t.label}</p>
                      <p className="text-body-sm text-fg-muted mt-0.5 truncate">{t.sub}</p>
                    </div>
                    <span className={cn('text-[12px] font-bold px-2 py-0.5 rounded shrink-0', t.tagCls)}>{t.tag}</span>
                  </div>
                ))}
              </div>
            )}

            {/* All caught up */}
            {totalActionCount === 0 && passiveTasks.length === 0 && (
              <div className="card p-4 flex flex-col items-center justify-center py-8 text-center gap-2">
                <CheckCircle size={28} className="text-success" />
                <p className="text-body-md font-medium text-fg">All caught up</p>
                <p className="text-body-sm text-fg-muted">No actions needed right now.</p>
              </div>
            )}
          </div>
        </div>

      </div>
    </Shell>
  );
}

/* ── Root page — gates on whether applicant has submitted ─────────────────── */
export default function ApplyPage() {
  const { profile }   = useRole();
  const [myApps,     setMyApps]     = useState<MyApplication[] | null>(null);
  const [ioApps,     setIoApps]     = useState<Application[]>([]);
  const [projectMap, setProjectMap] = useState<Map<string, string>>(new Map());
  const [drafts,     setDrafts]     = useState<DraftInfo[]>([]);

  useEffect(() => {
    const projects = loadProjects();
    setProjectMap(new Map(projects.map(p => [p.id, p.title])));

    // Load IO applications and filter to this applicant
    const allIo = loadIoApps();
    const myIoApps = allIo.filter(a => a.email === profile.email);
    setIoApps(myIoApps);

    // Load my applications and sync status from IO side
    const loaded = loadMyApps();
    const myMap  = new Map(loaded.map(a => [a.id, a]));

    for (const ioApp of myIoApps) {
      if (!myMap.has(ioApp.id)) {
        // Seed-only record (e.g. test data added directly to IO side)
        myMap.set(ioApp.id, {
          id:                 ioApp.id,
          programmeId:        ioApp.programmeId,
          programmeName:      ioApp.programmeName,
          submittedAt:        ioApp.appliedDate,
          status:             ioApp.status,
          formValues:         {},
          projectPreferences: ioApp.projectRankings,
        });
      } else {
        const existing = myMap.get(ioApp.id)!;
        if (existing.status !== ioApp.status) {
          myMap.set(ioApp.id, { ...existing, status: ioApp.status });
        }
      }
    }

    const synced = Array.from(myMap.values());
    setMyApps(synced);
    localStorage.setItem(MY_APPS_KEY, JSON.stringify(synced));

    // Load drafts — filter out any programme that already has a submitted app
    const submittedProgrammeIds = new Set(synced.map(a => a.programmeId));
    const programmes = loadProgrammes();
    const loadedDrafts = loadDrafts(programmes).filter(
      d => !submittedProgrammeIds.has(d.programmeId),
    );
    setDrafts(loadedDrafts);
  }, [profile.email]);

  function confirmSlot(appId: string, slotIndex: number) {
    const meetingLink = generateMeetingLink(appId);
    const allIo  = loadIoApps();
    const updated = allIo.map(a =>
      a.id === appId
        ? { ...a, confirmedSlot: slotIndex, status: 'Interview Scheduled' as const, meetingLink }
        : a
    );
    saveIoApps(updated);
    setIoApps(updated.filter(a => a.email === profile.email));
    setMyApps(prev => {
      if (!prev) return prev;
      const next = prev.map(a => a.id === appId ? { ...a, status: 'Interview Scheduled' as const } : a);
      localStorage.setItem(MY_APPS_KEY, JSON.stringify(next));
      return next;
    });
  }

  function requestReschedule(appId: string, note: string) {
    const allIo  = loadIoApps();
    const updated = allIo.map(a =>
      a.id === appId
        ? {
            ...a,
            status:         'Shortlisted for Interview' as const,
            interviewSlots: undefined,
            confirmedSlot:  undefined,
            meetingLink:    undefined,
            rescheduleNote: note || undefined,
          }
        : a
    );
    saveIoApps(updated);
    setIoApps(updated.filter(a => a.email === profile.email));
  }

  function acceptOffer(appId: string, creditBearing: boolean, creditDetails: string, startDate: string, endDate: string) {
    const allIo  = loadIoApps();
    const target = allIo.find(a => a.id === appId);
    const updated = allIo.map(a =>
      a.id === appId ? {
        ...a,
        status:               'Offer Accepted' as const,
        offerResponse:        'Accepted' as const,
        internshipStartDate:  startDate,
        internshipEndDate:    endDate,
        creditBearing,
        creditBearingDetails: creditDetails || undefined,
      } : a
    );
    saveIoApps(updated);
    if (target?.shortlistedFor) incrementProjectMatched(target.shortlistedFor);
    if (target) {
      addNotification({ forRole: 'io', title: `Offer accepted — ${target.name}`, body: `${target.name} has accepted the internship offer for ${target.programmeName}.`, href: '/applications', tier: 'info' });
      addNotification({ forRole: 'mentor', title: `Offer accepted — ${target.name}`, body: `${target.name} has accepted the offer and will be joining your project.`, href: '/mentor/projects', tier: 'info' });
    }
    setIoApps(updated.filter(a => a.email === profile.email));
    setMyApps(prev => {
      if (!prev) return prev;
      const next = prev.map(a => a.id === appId ? { ...a, status: 'Offer Accepted' as const } : a);
      localStorage.setItem(MY_APPS_KEY, JSON.stringify(next));
      return next;
    });
  }

  function declineOffer(appId: string) {
    const allIo  = loadIoApps();
    const target = allIo.find(a => a.id === appId);
    const updated = allIo.map(a =>
      a.id === appId ? { ...a, offerResponse: 'Declined' as const, status: 'Offer Declined' as const } : a
    );
    saveIoApps(updated);
    if (target) {
      addNotification({ forRole: 'io', title: `Offer declined — ${target.name}`, body: `${target.name} has declined the internship offer for ${target.programmeName}.`, href: '/applications', tier: 'action' });
      addNotification({ forRole: 'mentor', title: `Offer declined — ${target.name}`, body: `${target.name} has declined the internship offer for ${target.programmeName}.`, href: '/mentor/projects', tier: 'action' });
    }
    setIoApps(updated.filter(a => a.email === profile.email));
    setMyApps(prev => {
      if (!prev) return prev;
      const next = prev.map(a => a.id === appId ? { ...a, status: 'Offer Declined' as const } : a);
      localStorage.setItem(MY_APPS_KEY, JSON.stringify(next));
      return next;
    });
  }

  function requestStartDateChange(appId: string, requestedDate: string, reason: string) {
    const allIo  = loadIoApps();
    const updated = allIo.map(a =>
      a.id === appId ? {
        ...a,
        status:                  'Date Change Requested' as const,
        startDateChangeRequest:  { requestedDate, reason },
      } : a
    );
    saveIoApps(updated);
    setIoApps(updated.filter(a => a.email === profile.email));
    setMyApps(prev => {
      if (!prev) return prev;
      const next = prev.map(a => a.id === appId ? { ...a, status: 'Date Change Requested' as const } : a);
      localStorage.setItem(MY_APPS_KEY, JSON.stringify(next));
      return next;
    });
  }

  // Wait for localStorage read before deciding which view to render
  if (myApps === null) return null;

  if (myApps.length === 0 && ioApps.length === 0 && drafts.length === 0) return <OpenProgrammes />;
  return (
    <ApplicantDashboard
      myApps={myApps}
      ioApps={ioApps}
      projectMap={projectMap}
      drafts={drafts}
      onConfirmSlot={confirmSlot}
      onOfferAccepted={acceptOffer}
      onOfferDeclined={declineOffer}
      onStartDateRequested={requestStartDateChange}
      onRescheduleRequest={requestReschedule}
    />
  );
}
