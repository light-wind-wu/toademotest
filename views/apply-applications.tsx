'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Shell from '@/components/layout/shell';
import { useRole } from '@/lib/role';
import Button from '@/components/ui-legacy/button';
import Modal from '@/components/ui-legacy/modal';
import DatePicker from '@/components/ui-legacy/date-picker';
import {
  FileText, ChevronDown, ChevronUp,
  Briefcase, XCircle,
  Calendar, CheckCircle2, ChevronRight,
  Video, Copy,
  CalendarPlus, Download, MapPin, Clock, User2, CalendarSearch, Star, Send,
  ClipboardCheck,
} from 'lucide-react';
import applicationsSeed from '@/data/applications.json';
import type { Application, ApplicationStatus, MyApplication, Programme, ProjectEntry } from '@/lib/types';
import { APPLICANT_STATUS_META, TERMINAL_STATUSES, SUCCESSFUL_STATUSES } from '@/lib/applicant-status';
import { cn } from '@/lib/utils';
import { addNotification } from '@/lib/notifications';
import { addEngagement } from '@/lib/participants';
import { loadProgrammes, loadProjects, saveProjects } from '@/lib/storage';

const MY_APPS_KEY     = 'dsta_my_applications';
const IO_APPS_KEY     = 'dsta_applications';
const IO_APPS_VER_KEY = 'dsta_applications_seed_v';
const IO_APPS_VER     = '31';
const DRAFT_PREFIX    = 'dsta_apply_draft_';

interface DraftInfo { programmeId: string; programmeName: string; step: number; savedAt: string; }

function loadMyApps(): MyApplication[] {
  try { const r = localStorage.getItem(MY_APPS_KEY); return r ? JSON.parse(r) : []; } catch { return []; }
}
function migrateApps(apps: Application[]): Application[] {
  return apps.map(a => (a.status as string) === 'Start Date Requested' ? { ...a, status: 'Date Change Requested' as Application['status'] } : a);
}
function loadIoApps(): Application[] {
  try {
    const ver = localStorage.getItem(IO_APPS_VER_KEY);
    if (ver !== IO_APPS_VER) {
      localStorage.setItem(IO_APPS_KEY, JSON.stringify(applicationsSeed));
      localStorage.setItem(IO_APPS_VER_KEY, IO_APPS_VER);
      localStorage.removeItem(MY_APPS_KEY);
      const draftKeys: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k?.startsWith(DRAFT_PREFIX)) draftKeys.push(k);
      }
      draftKeys.forEach(k => localStorage.removeItem(k));
      return applicationsSeed as Application[];
    }
    const r = localStorage.getItem(IO_APPS_KEY);
    return r ? migrateApps(JSON.parse(r) as Application[]) : (applicationsSeed as Application[]);
  } catch { return applicationsSeed as Application[]; }
}
function saveIoApps(apps: Application[]) {
  localStorage.setItem(IO_APPS_KEY, JSON.stringify(apps));
  localStorage.setItem(IO_APPS_VER_KEY, IO_APPS_VER);
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
      drafts.push({ programmeId: d.programmeId, programmeName: progMap.get(d.programmeId) ?? d.programmeId, step: d.step ?? 0, savedAt: d.savedAt ?? '' });
    }
  } catch {}
  return drafts;
}
function incrementProjectMatched(projectId: string) {
  saveProjects(
    loadProjects().map(p => p.id === projectId ? { ...p, matched: Math.min(p.matched + 1, p.slots) } : p)
  );
}
function generateMeetingLink(appId: string) {
  return `https://teams.microsoft.com/l/meetup-join/19:meeting_${appId.replace(/[^a-zA-Z0-9]/g, '').toLowerCase()}Zg@thread.v2/0`;
}

function formatDate(iso: string) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-SG', { day: 'numeric', month: 'short', year: 'numeric' });
}
function downloadOfferLetter(body: string, programmeName: string) {
  const blob = new Blob([body], { type: 'text/plain' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `DSTA_Offer_Letter_${programmeName.replace(/\s+/g, '_')}.txt`;
  a.click();
  URL.revokeObjectURL(url);
}

function fmtSlot(slot: { date: string; time: string; duration?: string }) {
  const d = new Date(slot.date + 'T00:00:00');
  const dateStr = d.toLocaleDateString('en-SG', { weekday: 'short', day: 'numeric', month: 'short' });
  const [h, m] = slot.time.split(':').map(Number);
  const suffix = h >= 12 ? 'PM' : 'AM';
  return `${dateStr} · ${h % 12 || 12}:${String(m).padStart(2, '0')} ${suffix}${slot.duration ? ` (${slot.duration})` : ''}`;
}


/* ── Action card wrapper ─────────────────────────────────────────────────── */
function ActionCard({ label, sub, tag, tagCls, children }: {
  label: string; sub?: string; tag: string; tagCls: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <div className="flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-body-md font-semibold text-fg leading-snug">{label}</p>
          {sub && <p className="text-body-sm text-fg-muted truncate">{sub}</p>}
        </div>
        <span className={cn('text-[12px] font-bold px-2 py-0.5 rounded shrink-0', tagCls)}>{tag}</span>
      </div>
      {children && <div className="mt-3 space-y-2">{children}</div>}
    </div>
  );
}

/* ── Slot picker ─────────────────────────────────────────────────────────── */
function SlotPickerCard({ app, onConfirm, onRescheduleRequest }: {
  app: Application; onConfirm: (i: number) => void; onRescheduleRequest: (note: string) => void;
}) {
  const [selected,   setSelected]   = useState<number | null>(null);
  const [reschedMsg, setReschedMsg] = useState('');
  const [modal,      setModal]      = useState<'slot' | 'resched' | null>(null);
  const slots = app.interviewSlots ?? [];
  const NONE  = slots.length;

  return (
    <ActionCard label="Interview invitation" sub={app.programmeName}
      tag="Action Required" tagCls="bg-warning-bg text-warning"
    >
      <div className="space-y-1.5">
        {slots.map((s, i) => (
          <button key={i} onClick={() => setSelected(i)}
            className={cn('w-full text-left px-3 py-2 rounded-lg border text-body-sm transition-all',
              selected === i ? 'border-accent bg-accent/10 text-accent font-semibold' : 'border-border bg-surface text-fg hover:border-accent/50'
            )}>{fmtSlot(s)}</button>
        ))}
        <button onClick={() => setSelected(NONE)}
          className={cn('w-full text-left px-3 py-2 rounded-lg border text-body-sm transition-all',
            selected === NONE ? 'border-warning bg-warning-bg text-warning font-semibold' : 'border-border bg-surface text-fg-muted hover:border-warning/50'
          )}>None of these work for me</button>
      </div>
      <Button disabled={selected === null}
        onClick={() => selected === NONE ? setModal('resched') : setModal('slot')}>
        Confirm Selection
      </Button>
      <Modal open={modal === 'slot'} onClose={() => setModal(null)} labelledBy="confirm-slot-title">
        <h2 id="confirm-slot-title" className="text-headline-sm font-bold text-fg mb-1">Confirm interview slot?</h2>
        <p className="text-body-sm text-fg-muted mb-4">You are confirming: <strong>{selected !== null && selected < slots.length ? fmtSlot(slots[selected]) : ''}</strong></p>
        <div className="flex justify-end gap-2">
          <Button onClick={() => { onConfirm(selected!); setModal(null); }}><CheckCircle2 size={14} /> Confirm</Button>
          <Button variant="ghost" onClick={() => setModal(null)}>Back</Button>
        </div>
      </Modal>
      <Modal open={modal === 'resched'} onClose={() => setModal(null)} labelledBy="request-reschedule-title">
        <h2 id="request-reschedule-title" className="text-headline-sm font-bold text-fg mb-1">Request reschedule</h2>
        <p className="text-body-sm text-fg-muted mb-3">Let DSTA know your availability or constraints.</p>
        <textarea className="w-full rounded-xl border border-border bg-bg-subtle px-3 py-2 text-body-sm text-fg resize-none focus:outline-none focus:ring-2 focus:ring-accent/40 mb-4"
          rows={3} placeholder="e.g. I am only available after 2 PM on weekdays..."
          value={reschedMsg} onChange={e => setReschedMsg(e.target.value)} />
        <div className="flex justify-end gap-2">
          <Button disabled={!reschedMsg.trim()} onClick={() => { onRescheduleRequest(reschedMsg.trim()); setModal(null); }}>Send Request</Button>
          <Button variant="ghost" onClick={() => setModal(null)}>Back</Button>
        </div>
      </Modal>
    </ActionCard>
  );
}

/* ── Scheduled interview card ────────────────────────────────────────────── */
function ScheduledCard({ app }: { app: Application }) {
  const [copied, setCopied] = useState(false);
  const slot = app.interviewSlots && app.confirmedSlot !== undefined ? app.interviewSlots[app.confirmedSlot] : null;

  function fmtSlotLong(s: { date: string; time: string; duration?: string }) {
    const d = new Date(`${s.date}T${s.time}:00`);
    return {
      date: d.toLocaleDateString('en-SG', { weekday: 'long', day: 'numeric', month: 'long' }),
      time: d.toLocaleTimeString('en-SG', { hour: '2-digit', minute: '2-digit', hour12: true }) + (s.duration ? ` (${s.duration})` : ''),
    };
  }

  return (
    <ActionCard label="Interview scheduled" sub={app.programmeName}
      tag="Upcoming" tagCls="bg-accent/10 text-accent"
    >
      {slot && (
        <div className="px-3 py-2.5 bg-surface rounded-lg border border-border space-y-0.5">
          <p className="text-body-sm font-semibold text-fg">{fmtSlotLong(slot).date}</p>
          <p className="text-body-sm text-fg-muted">{fmtSlotLong(slot).time} · Microsoft Teams</p>
        </div>
      )}
      {app.meetingLink && (
        <div className="flex items-center gap-2">
          <a href={app.meetingLink} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-accent text-white text-body-sm font-semibold hover:bg-accent/90 transition-colors">
            <Video size={14} /> Join Interview
          </a>
          <button
            onClick={() => { navigator.clipboard.writeText(app.meetingLink!); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
            className={cn('px-3 py-2 rounded-lg border text-body-sm transition-colors', copied ? 'border-success/40 bg-success-bg text-success' : 'border-border text-fg-muted hover:bg-bg-subtle')}
            title="Copy link"
          ><Copy size={14} /></button>
          <button title="Download .ics" className="px-3 py-2 rounded-lg border border-border text-fg-muted hover:bg-bg-subtle transition-colors">
            <CalendarPlus size={14} />
          </button>
        </div>
      )}
    </ActionCard>
  );
}

/* ── Offer card ──────────────────────────────────────────────────────────── */
function OfferCard({ app, onAccepted, onDeclined, onDateRequested }: {
  app: Application;
  onAccepted: (creditBearing: boolean, creditDetails: string) => void;
  onDeclined: () => void;
  onDateRequested: (date: string, reason: string) => void;
}) {
  const [modal,          setModal]          = useState<'credit' | 'decline' | 'date' | null>(null);
  const [letterOpen,     setLetterOpen]     = useState(false);
  const [creditBearing,  setCreditBearing]  = useState<boolean | null>(null);
  const [creditDetails,  setCreditDetails]  = useState(app.creditBearingDetails ?? '');
  const [declineReason,  setDeclineReason]  = useState('');
  const [reqDate,        setReqDate]        = useState('');
  const [reqReason,      setReqReason]      = useState('');
  const canSubmit = creditBearing !== null;

  return (
    <ActionCard label="Internship offer extended" sub={app.programmeName}
      tag="Action Required" tagCls="bg-success/10 text-success"
    >
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          {app.offerDeadline && (
            <p className="text-[13px] font-semibold text-warning">
              Respond by {new Date(app.offerDeadline).toLocaleDateString('en-SG', { day: 'numeric', month: 'short', year: 'numeric' })}
            </p>
          )}
        </div>
        <div className="flex flex-col items-end gap-2 shrink-0">
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={() => setModal('credit')}>
              <CheckCircle2 size={13} /> Accept Offer
            </Button>
            <Button variant="danger" size="sm" onClick={() => setModal('decline')}>
              <XCircle size={13} /> Decline Offer
            </Button>
          </div>
          <button
            onClick={() => { setReqDate(''); setReqReason(''); setModal('date'); }}
            className="flex items-center gap-1 text-[13px] text-fg-muted hover:text-accent transition-colors underline underline-offset-2"
          >
            <CalendarSearch size={11} /> Request a different start date
          </button>
        </div>
      </div>
      {app.offerLetterBody && (
        <div className="rounded-lg border border-border bg-surface overflow-hidden">
          <div className="flex items-center justify-between px-3 py-2">
            <button onClick={() => setLetterOpen(o => !o)}
              className="flex items-center gap-1.5 text-left hover:opacity-70 transition-opacity">
              <FileText size={13} className="text-fg-muted" />
              <span className="text-body-sm font-semibold text-fg">View Offer Letter</span>
              <ChevronRight size={12} className={cn('text-fg-muted transition-transform', letterOpen && 'rotate-90')} />
            </button>
            <button
              onClick={() => downloadOfferLetter(app.offerLetterBody!, app.programmeName)}
              className="flex items-center gap-1.5 px-2 py-1 rounded border border-border text-[13px] font-semibold text-fg-muted hover:bg-bg-subtle hover:text-fg transition-colors"
            >
              <Download size={11} /> Download
            </button>
          </div>
          {letterOpen && (
            <div className="border-t border-border px-4 py-3 max-h-56 overflow-y-auto">
              <pre className="text-body-sm text-fg whitespace-pre-wrap font-sans leading-relaxed">{app.offerLetterBody}</pre>
            </div>
          )}
        </div>
      )}

      <Modal open={modal === 'credit'} onClose={() => setModal(null)} labelledBy="accept-offer-title">
        <h2 id="accept-offer-title" className="text-headline-sm font-bold text-fg mb-1">Accept this offer?</h2>
        <p className="text-body-sm text-fg-muted mb-5">Please answer one quick question before confirming.</p>
        <div className="space-y-4">
          <div>
            <label className="block text-[13px] font-bold uppercase tracking-widest text-fg-subtle mb-2">Is this internship credit-bearing? <span className="text-danger">*</span></label>
            <div className="flex gap-2">
              {([true, false] as const).map(v => (
                <button key={String(v)} onClick={() => setCreditBearing(v)}
                  className={cn('flex-1 rounded-xl border px-4 py-2.5 text-body-sm font-semibold transition-all',
                    creditBearing === v ? 'border-accent bg-accent/10 text-accent' : 'border-border bg-surface text-fg-muted hover:border-accent/50'
                  )}>{v ? 'Yes — Credit Bearing' : 'No'}</button>
              ))}
            </div>
          </div>
          {creditBearing === true && (
            <div>
              <label className="block text-[13px] font-bold uppercase tracking-widest text-fg-subtle mb-1.5">Credit Details (module code / school requirement)</label>
              <input
                className="w-full rounded-xl border border-border bg-bg-subtle px-3 py-2 text-body-sm text-fg focus:outline-none focus:ring-2 focus:ring-accent/40"
                placeholder="e.g. CS4299 — NUS Industrial Attachment"
                value={creditDetails} onChange={e => setCreditDetails(e.target.value)}
              />
            </div>
          )}
        </div>
        <div className="flex gap-2 justify-end mt-6">
          <Button disabled={!canSubmit} onClick={() => { onAccepted(creditBearing!, creditDetails); setModal(null); }}>
            <CheckCircle2 size={14} /> Confirm Acceptance
          </Button>
          <Button variant="ghost" onClick={() => setModal(null)}>Back</Button>
        </div>
      </Modal>


      <Modal open={modal === 'decline'} onClose={() => setModal(null)} labelledBy="decline-offer-title">
        <h2 id="decline-offer-title" className="text-headline-sm font-bold text-fg mb-1">Decline this offer?</h2>
        <p className="text-body-sm text-fg-muted mb-4">This action cannot be undone. You may optionally share your reason with DSTA.</p>
        <div className="mb-5">
          <label className="block text-[13px] font-bold uppercase tracking-widest text-fg-subtle mb-1.5">Reason <span className="text-fg-subtle font-normal normal-case tracking-normal">(optional)</span></label>
          <textarea
            className="w-full rounded-xl border border-border bg-bg-subtle px-3 py-2 text-body-sm text-fg resize-none focus:outline-none focus:ring-2 focus:ring-accent/40"
            rows={3}
            placeholder="e.g. I have accepted another offer, thank you for the opportunity."
            value={declineReason}
            onChange={e => setDeclineReason(e.target.value)}
          />
        </div>
        <div className="flex gap-2 justify-end">
          <Button variant="danger" onClick={() => { onDeclined(); setModal(null); }}>
            <XCircle size={14} /> Confirm Decline
          </Button>
          <Button variant="ghost" onClick={() => setModal(null)}>Back</Button>
        </div>
      </Modal>

      <Modal open={modal === 'date'} onClose={() => setModal(null)} labelledBy="request-date-title">
        <h2 id="request-date-title" className="text-headline-sm font-bold text-fg mb-1">Request a different start date</h2>
        <p className="text-body-sm text-fg-muted mb-5">Your request will be reviewed by DSTA. You will be notified once a decision is made.</p>
        <div className="space-y-4">
          <div>
            <label className="block text-[13px] font-bold uppercase tracking-widest text-fg-subtle mb-1.5">Preferred start date <span className="text-danger">*</span></label>
            <DatePicker value={reqDate} onChange={setReqDate} />
          </div>
          <div>
            <label className="block text-[13px] font-bold uppercase tracking-widest text-fg-subtle mb-1.5">Reason <span className="text-fg-subtle font-normal normal-case tracking-normal">(optional)</span></label>
            <textarea
              className="w-full rounded-xl border border-border bg-bg-subtle px-3 py-2 text-body-sm text-fg resize-none focus:outline-none focus:ring-2 focus:ring-accent/40"
              rows={3}
              placeholder="e.g. I have a school commitment until mid-August."
              value={reqReason}
              onChange={e => setReqReason(e.target.value)}
            />
          </div>
        </div>
        <div className="flex gap-2 justify-end mt-6">
          <Button disabled={!reqDate} onClick={() => { onDateRequested(reqDate, reqReason); setModal(null); }}>
            <CalendarSearch size={14} /> Submit Request
          </Button>
          <Button variant="ghost" onClick={() => setModal(null)}>Cancel</Button>
        </div>
      </Modal>
    </ActionCard>
  );
}

/* ── Date change pending card ────────────────────────────────────────────── */
function DateChangePendingCard({ app }: { app: Application }) {
  return (
    <ActionCard label="Start date change requested" sub={app.programmeName}
      tag="Pending" tagCls="bg-warning/10 text-warning"
    >
      <p className="text-body-sm text-fg-muted">
        Your request to change the start date to{' '}
        <span className="font-semibold text-fg">{app.startDateChangeRequest?.requestedDate ?? '—'}</span>{' '}
        is under review by DSTA.
      </p>
    </ActionCard>
  );
}

/* ── Applications list ───────────────────────────────────────────────────── */
function StarRating({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map(n => (
        <button key={n} type="button" onClick={() => onChange(n)}>
          <Star size={18} className={cn('transition-colors', n <= value ? 'text-warning fill-warning' : 'text-border')} />
        </button>
      ))}
    </div>
  );
}

function AppCard({ app, ioApp, projectMap, progMap, onUpdateIo, onWithdraw }: {
  app: MyApplication;
  ioApp?: Application;
  onUpdateIo?: (updated: Application) => void;
  onWithdraw?: (appId: string, reason: string) => void;
  projectMap: Map<string, ProjectEntry>;
  progMap: Map<string, Programme>;
}) {
  const [expanded, setExpanded] = useState(false);
  const [confirmWithdraw, setConfirmWithdraw] = useState(false);
  const [withdrawReason, setWithdrawReason]   = useState('');
  const meta = APPLICANT_STATUS_META[app.status] ?? APPLICANT_STATUS_META['Pending Screening'];
  const Icon = meta.icon;
  const prog = progMap.get(app.programmeId);
  const isPast = TERMINAL_STATUSES.includes(app.status as typeof TERMINAL_STATUSES[number]);
  const isSuccessful = SUCCESSFUL_STATUSES.includes(app.status as typeof SUCCESSFUL_STATUSES[number]);
  const isPlaced = app.status === 'Active Intern' || app.status === 'Offer Accepted';
  const assignedProject = ioApp?.shortlistedFor ? projectMap.get(ioApp.shortlistedFor) : undefined;
  const hasInterviewInvite = app.status === 'Shortlisted for Interview' &&
    (ioApp?.interviewSlots ?? []).length > 0 && ioApp?.confirmedSlot === undefined;

  return (
    <div>
      <button type="button" onClick={() => setExpanded(e => !e)}
        className="w-full flex items-start gap-4 p-5 text-left hover:bg-bg-subtle/50 transition-colors">
        <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center shrink-0 border',
          hasInterviewInvite ? 'bg-warning-bg border-warning/30' : meta.bgColor)}>
          <Icon size={16} className={hasInterviewInvite ? 'text-warning' : meta.color} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-0.5">
            <p className="text-body-md font-semibold text-fg leading-snug">{app.programmeName}</p>
            {isPast ? (
              <span className={cn('inline-flex items-center text-[12px] font-bold px-2 py-0.5 rounded-full border',
                isSuccessful
                  ? 'bg-success-bg border-success/30 text-success'
                  : 'bg-bg-subtle border-border text-fg-muted'
              )}>
                {isSuccessful ? 'Successful' : 'Unsuccessful'}
              </span>
            ) : hasInterviewInvite ? (
              <span className="inline-flex items-center text-[12px] font-bold px-2 py-0.5 rounded-full border bg-warning-bg border-warning/30 text-warning">
                Interview Invitation
              </span>
            ) : (
              <span className={cn('inline-flex items-center text-[12px] font-bold px-2 py-0.5 rounded-full border', meta.bgColor, meta.color)}>
                {meta.label}
              </span>
            )}
          </div>
          <p className="text-body-sm text-fg-muted">Submitted {formatDate(app.submittedAt)}</p>
        </div>
        <div className="shrink-0 self-center text-fg-subtle">
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
      </button>
      {expanded && (
        <div className="border-t border-border px-5 py-5 bg-bg-subtle/30 space-y-5">

          {isPast ? (
            /* ── Past application: outcome view ────────────────────────── */
            <>
              {/* Contextual note for specific terminal statuses */}
              {(app.status === 'Offer Declined' || app.status === 'Withdrawn') && (
                <p className="text-body-sm text-fg-muted">
                  {app.status === 'Offer Declined'
                    ? 'An offer was extended but declined.'
                    : `This application was withdrawn${ioApp?.withdrawnDate ? ` on ${formatDate(ioApp.withdrawnDate)}` : ''}.${ioApp?.withdrawnReason ? ` Reason: “${ioApp.withdrawnReason}”` : ''}`}
                </p>
              )}

              {/* Assigned project (successful only) */}
              {isSuccessful && assignedProject && (
                <div>
                  <p className="text-[12px] font-bold uppercase tracking-widest text-fg-subtle mb-2">Project Assigned</p>
                  <div className="bg-surface rounded-lg border border-border p-3">
                    <p className="text-body-sm font-semibold text-fg">{assignedProject.title}</p>
                    {assignedProject.mentor && (
                      <p className="text-body-sm text-fg-muted flex items-center gap-1 mt-0.5">
                        <User2 size={11} className="shrink-0" /> {assignedProject.mentor}
                        {assignedProject.mentorAppointment && <span className="text-fg-subtle"> · {assignedProject.mentorAppointment}</span>}
                      </p>
                    )}
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1">
                      {assignedProject.techDomain && (
                        <span className="text-[13px] text-fg-subtle">{assignedProject.techDomain}</span>
                      )}
                      {assignedProject.internshipDuration && (
                        <span className="text-[13px] text-fg-subtle flex items-center gap-1">
                          <Clock size={10} className="shrink-0" /> {assignedProject.internshipDuration}
                        </span>
                      )}
                      {assignedProject.workingLocation && (
                        <span className="text-[13px] text-fg-subtle flex items-center gap-1">
                          <MapPin size={10} className="shrink-0" /> {assignedProject.workingLocation}
                        </span>
                      )}
                    </div>
                    {ioApp?.internshipStartDate && ioApp?.internshipEndDate && (
                      <p className="text-[13px] text-fg-subtle mt-1.5 flex items-center gap-1">
                        <Clock size={10} className="shrink-0" />
                        {ioApp.internshipStartDate} – {ioApp.internshipEndDate}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* CoC download */}
              {app.status === 'Internship Completed' && ioApp?.cocSent && (
                <div className="flex items-center justify-between px-3 py-2.5 bg-accent/5 border border-accent/20 rounded-xl">
                  <div className="flex items-center gap-2">
                    <Download size={13} className="text-accent shrink-0" />
                    <p className="text-body-sm font-medium text-fg">Certificate of Completion issued</p>
                  </div>
                  <span className="text-[13px] text-fg-muted">{ioApp.cocSentDate}</span>
                </div>
              )}

              {/* Projects applied for (unsuccessful) */}
              {!isSuccessful && app.projectPreferences.length > 0 && (
                <div>
                  <p className="text-[12px] font-bold uppercase tracking-widest text-fg-subtle mb-2">Projects Applied For</p>
                  <div className="space-y-1">
                    {app.projectPreferences.map((projId, i) => {
                      const proj = projectMap.get(projId);
                      return (
                        <div key={projId} className="flex items-center gap-2.5 px-3 py-2 bg-surface rounded-lg border border-border">
                          <span className="w-4 h-4 rounded-full bg-bg-subtle border border-border text-[12px] font-bold text-fg-muted flex items-center justify-center shrink-0">{i + 1}</span>
                          <span className="text-body-sm text-fg-muted">{proj?.title ?? projId}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          ) : isPlaced ? (
            /* ── Active intern / offer accepted: show placement ─────────── */
            <>
              {assignedProject ? (
                <div>
                  <p className="text-[12px] font-bold uppercase tracking-widest text-fg-subtle mb-2">
                    {app.status === 'Active Intern' ? 'Current Project' : 'Assigned Project'}
                  </p>
                  <div className="bg-surface rounded-lg border border-border p-3">
                    <p className="text-body-sm font-semibold text-fg">{assignedProject.title}</p>
                    {assignedProject.mentor && (
                      <p className="text-body-sm text-fg-muted flex items-center gap-1 mt-0.5">
                        <User2 size={11} className="shrink-0" /> {assignedProject.mentor}
                        {assignedProject.mentorAppointment && <span className="text-fg-subtle"> · {assignedProject.mentorAppointment}</span>}
                      </p>
                    )}
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1">
                      {assignedProject.techDomain && (
                        <span className="text-[13px] text-fg-subtle">{assignedProject.techDomain}</span>
                      )}
                      {assignedProject.internshipDuration && (
                        <span className="text-[13px] text-fg-subtle flex items-center gap-1">
                          <Clock size={10} className="shrink-0" /> {assignedProject.internshipDuration}
                        </span>
                      )}
                      {assignedProject.workingLocation && (
                        <span className="text-[13px] text-fg-subtle flex items-center gap-1">
                          <MapPin size={10} className="shrink-0" /> {assignedProject.workingLocation}
                        </span>
                      )}
                    </div>
                    {(ioApp?.internshipStartDate || ioApp?.internshipEndDate) && (
                      <p className="text-[13px] text-fg-subtle mt-1.5">
                        {ioApp.internshipStartDate} – {ioApp.internshipEndDate}
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-body-sm text-fg-muted italic">Project details not yet available.</p>
              )}
              <p className="text-body-sm text-fg-muted">
                View your full internship details in the <span className="font-semibold text-accent">My Internship</span> tab.
              </p>
            </>
          ) : (
            /* ── Current application: full details view ─────────────────── */
            <>
              {/* Programme details */}
              <div>
                <p className="text-[12px] font-bold uppercase tracking-widest text-fg-subtle mb-2">Programme Details</p>
                <div className="bg-surface rounded-lg border border-border p-3 space-y-2">
                  {prog?.educationLevel && (
                    <div className="flex items-start gap-3">
                      <span className="text-[13px] font-semibold text-fg-subtle w-20 shrink-0 mt-0.5">Category</span>
                      <div className="flex flex-wrap gap-1">
                        <span className="text-[12px] font-semibold px-2 py-0.5 rounded-full bg-accent/10 text-accent border border-accent/20">{prog.educationLevel}</span>
                      </div>
                    </div>
                  )}
                  {(prog?.start || prog?.end) && (
                    <div className="flex items-center gap-3">
                      <span className="text-[13px] font-semibold text-fg-subtle w-20 shrink-0">Period</span>
                      <span className="text-body-sm text-fg">{prog?.start} – {prog?.end}</span>
                    </div>
                  )}
                  {prog?.appDeadline && (
                    <div className="flex items-center gap-3">
                      <span className="text-[13px] font-semibold text-fg-subtle w-20 shrink-0">Deadline</span>
                      <span className="text-body-sm text-fg">{prog.appDeadline}</span>
                    </div>
                  )}
                  {prog?.description && (
                    <div className="flex items-start gap-3">
                      <span className="text-[13px] font-semibold text-fg-subtle w-20 shrink-0 mt-0.5">About</span>
                      <p className="text-body-sm text-fg-muted leading-relaxed line-clamp-3">{prog.description}</p>
                    </div>
                  )}
                  {!prog && <p className="text-body-sm text-fg-muted italic">Programme details not available.</p>}
                </div>
              </div>

              {/* Project preferences */}
              <div>
                <p className="text-[12px] font-bold uppercase tracking-widest text-fg-subtle mb-2">Project Preferences</p>
                {app.projectPreferences.length === 0 ? (
                  <p className="text-body-sm text-fg-muted italic">No project preferences submitted.</p>
                ) : (
                  <div className="space-y-2">
                    {app.projectPreferences.map((projId, i) => {
                      const proj = projectMap.get(projId);
                      return (
                        <div key={projId} className="bg-surface rounded-lg border border-border p-3">
                          <div className="flex items-start gap-3">
                            <div className="w-5 h-5 rounded-full bg-accent text-white text-[12px] font-black flex items-center justify-center shrink-0 mt-0.5">{i + 1}</div>
                            <div className="flex-1 min-w-0">
                              <p className="text-body-sm font-semibold text-fg">{proj?.title ?? projId}</p>
                              {proj?.mentor && (
                                <p className="text-body-sm text-fg-muted flex items-center gap-1 mt-0.5">
                                  <User2 size={11} className="shrink-0" /> {proj.mentor}
                                  {proj.mentorAppointment && <span className="text-fg-subtle"> · {proj.mentorAppointment}</span>}
                                </p>
                              )}
                              <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1">
                                {proj?.techDomain && (
                                  <span className="text-[13px] text-fg-subtle">{proj.techDomain}</span>
                                )}
                                {proj?.internshipDuration && (
                                  <span className="text-[13px] text-fg-subtle flex items-center gap-1">
                                    <Clock size={10} className="shrink-0" /> {proj.internshipDuration}
                                  </span>
                                )}
                                {proj?.workingLocation && (
                                  <span className="text-[13px] text-fg-subtle flex items-center gap-1">
                                    <MapPin size={10} className="shrink-0" /> {proj.workingLocation}
                                  </span>
                                )}
                              </div>
                              {proj?.description && (
                                <p className="text-body-sm text-fg-muted mt-1.5 line-clamp-2">{proj.description}</p>
                              )}
                              {proj?.skills && proj.skills.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-2">
                                  {proj.skills.slice(0, 5).map(s => (
                                    <span key={s} className="text-[12px] px-2 py-0.5 rounded-full border border-border bg-bg-subtle text-fg-muted">{s}</span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Withdraw application */}
              {onWithdraw && (
                <div className="pt-1">
                  <button
                    onClick={() => { setWithdrawReason(''); setConfirmWithdraw(true); }}
                    className="inline-flex items-center gap-1.5 text-body-sm font-semibold text-danger hover:underline">
                    <XCircle size={14} /> Withdraw application
                  </button>
                </div>
              )}
            </>
          )}

        </div>
      )}

      {confirmWithdraw && (
        <Modal open onClose={() => setConfirmWithdraw(false)} labelledBy="withdraw-app-title" destructive>
          <h2 id="withdraw-app-title" className="text-headline-sm font-bold text-fg mb-1">Withdraw application?</h2>
          <p className="text-body-sm text-fg-muted mb-4">
            This withdraws your application for <span className="font-semibold text-fg">{app.programmeName}</span>.
            This can&apos;t be undone — you&apos;d need to re-apply if the programme is still open.
          </p>
          <label className="block text-[13px] font-bold uppercase tracking-widest text-fg-subtle mb-1.5">
            Reason <span className="font-normal text-fg-subtle normal-case tracking-normal">(optional)</span>
          </label>
          <textarea
            value={withdrawReason} onChange={e => setWithdrawReason(e.target.value)}
            rows={3} placeholder="Let the team know why (optional)…"
            className="w-full rounded-xl border border-border bg-bg-subtle px-3 py-2 text-body-sm text-fg focus:outline-none focus:ring-2 focus:ring-accent/40 transition-all resize-none mb-5" />
          <div className="flex justify-end gap-2">
            <Button variant="danger" onClick={() => { onWithdraw?.(app.id, withdrawReason.trim()); setConfirmWithdraw(false); }}>
              <XCircle size={14} /> Withdraw
            </Button>
            <Button variant="ghost" onClick={() => setConfirmWithdraw(false)}>Keep application</Button>
          </div>
        </Modal>
      )}
    </div>
  );
}

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
          <span className="inline-flex items-center text-[12px] font-bold px-2 py-0.5 rounded-full border bg-bg-subtle border-border text-fg-muted">Draft</span>
        </div>
        <p className="text-body-sm text-fg-muted">Last saved {formatDate(draft.savedAt)}</p>
      </div>
      <button type="button" onClick={() => router.push(`/apply/${draft.programmeId}`)}
        className="shrink-0 self-center flex items-center gap-1 text-body-sm font-semibold text-accent hover:underline">
        Resume <ChevronRight size={13} />
      </button>
    </div>
  );
}

/* ── Main ────────────────────────────────────────────────────────────────── */
export default function ApplyApplications() {
  const { profile } = useRole();
  const router      = useRouter();

  const [ioApps,     setIoApps]     = useState<Application[]>([]);
  const [myApps,     setMyApps]     = useState<MyApplication[] | null>(null);
  const [drafts,     setDrafts]     = useState<DraftInfo[]>([]);
  const [projectMap, setProjectMap] = useState<Map<string, ProjectEntry>>(new Map());
  const [progMap,    setProgMap]    = useState<Map<string, Programme>>(new Map());

  useEffect(() => {
    const projs = loadProjects();
    setProjectMap(new Map(projs.map(p => [p.id, p])));

    const allIo = loadIoApps();
    const myIo  = allIo.filter(a => a.email === profile.email);
    setIoApps(myIo);

    const loaded = loadMyApps();
    const myMap  = new Map(loaded.map(a => [a.id, a]));
    for (const io of myIo) {
      if (!myMap.has(io.id)) {
        myMap.set(io.id, { id: io.id, programmeId: io.programmeId, programmeName: io.programmeName,
          submittedAt: io.appliedDate, status: io.status, formValues: {}, projectPreferences: io.projectRankings });
      } else {
        const ex = myMap.get(io.id)!;
        if (ex.status !== io.status) myMap.set(io.id, { ...ex, status: io.status });
      }
    }
    // Scope to the current applicant: MY_APPS_KEY is a single global list, so prune any
    // rows synced under a different persona (only surfaces via the dev role-switcher).
    const myIds  = new Set(myIo.map(a => a.id));
    const synced = Array.from(myMap.values()).filter(a => myIds.has(a.id));
    setMyApps(synced);
    localStorage.setItem(MY_APPS_KEY, JSON.stringify(synced));

    const progs = loadProgrammes();
    setProgMap(new Map(progs.map(p => [p.id, p])));
    const submittedProgIds = new Set(synced.map(a => a.programmeId));
    setDrafts(loadDrafts(progs).filter(d => !submittedProgIds.has(d.programmeId)));
  }, [profile.email]);

  function updateIo(updated: Application) {
    const allIo = loadIoApps();
    const next  = allIo.map(a => a.id === updated.id ? updated : a);
    saveIoApps(next);
    setIoApps(next.filter(a => a.email === profile.email));
  }
  function syncMyStatus(appId: string, status: MyApplication['status']) {
    setMyApps(prev => {
      if (!prev) return prev;
      const next = prev.map(a => a.id === appId ? { ...a, status } : a);
      localStorage.setItem(MY_APPS_KEY, JSON.stringify(next));
      return next;
    });
  }

  function withdrawApplication(appId: string, reason: string) {
    const today  = new Date().toISOString().slice(0, 10);
    syncMyStatus(appId, 'Withdrawn');
    const target = ioApps.find(a => a.id === appId);
    if (!target) return;  // myApp-only record — status mirrored above is enough
    updateIo({ ...target, status: 'Withdrawn', withdrawnDate: today, withdrawnReason: reason || undefined });
    addNotification({ forRole: 'io', title: `Application withdrawn — ${target.name}`,
      body: `${target.name} has withdrawn their application for ${target.programmeName}.${reason ? ` Reason: "${reason}"` : ''}`, href: '/applications', tier: 'action' });
    if (target.shortlistedFor) {
      addNotification({ forRole: 'mentor', title: `Applicant withdrew — ${target.name}`,
        body: `${target.name} has withdrawn from ${target.programmeName}.`, href: '/mentor/projects', tier: 'action' });
    }
  }

  function confirmSlot(appId: string, slotIndex: number) {
    const target = ioApps.find(a => a.id === appId);
    if (!target) return;
    updateIo({ ...target, confirmedSlot: slotIndex, status: 'Interview Scheduled', meetingLink: generateMeetingLink(appId) });
    syncMyStatus(appId, 'Interview Scheduled');
    addNotification({ forRole: 'mentor', title: `Interview confirmed — ${target.name}`, body: `${target.name} has confirmed their interview slot for ${target.programmeName}.`, href: '/mentor/projects', tier: 'info' });
  }
  function requestReschedule(appId: string, note: string) {
    const target = ioApps.find(a => a.id === appId);
    if (!target) return;
    updateIo({ ...target, status: 'Shortlisted for Interview', interviewSlots: undefined, confirmedSlot: undefined, meetingLink: undefined, rescheduleNote: note || undefined });
    addNotification({ forRole: 'mentor', title: `Reschedule requested — ${target.name}`, body: `${target.name} has requested a reschedule for their interview.${note ? ` Reason: "${note}"` : ''}`, href: '/mentor/projects', tier: 'action' });
  }
  function acceptOffer(appId: string, creditBearing: boolean, creditDetails: string) {
    const target = ioApps.find(a => a.id === appId);
    if (!target) return;
    updateIo({ ...target, status: 'Offer Accepted', offerResponse: 'Accepted', creditBearing, creditBearingDetails: creditDetails || undefined });
    if (target.shortlistedFor) incrementProjectMatched(target.shortlistedFor);
    syncMyStatus(appId, 'Offer Accepted');
    addNotification({ forRole: 'io', title: `Offer accepted — ${target.name}`, body: `${target.name} has accepted the internship offer for ${target.programmeName}.`, href: '/applications', tier: 'info' });
    addNotification({ forRole: 'mentor', title: `Offer accepted — ${target.name}`, body: `${target.name} has accepted the offer and will be joining your project.`, href: '/mentor/projects', tier: 'info' });
    const projectTitle = target.suitabilityScores.find(s => s.projectId === target.shortlistedFor)?.projectTitle;
    addEngagement(target.email, {
      year: new Date().getFullYear(),
      title: target.programmeName,
      details: [
        `Selected for ${target.programmeName}.`,
        projectTitle ? `Project: "${projectTitle}".` : null,
      ].filter((s): s is string => !!s).join(' '),
    });
  }
  function declineOffer(appId: string) {
    const target = ioApps.find(a => a.id === appId);
    if (!target) return;
    updateIo({ ...target, status: 'Offer Declined', offerResponse: 'Declined' });
    syncMyStatus(appId, 'Offer Declined');
    addNotification({ forRole: 'io', title: `Offer declined — ${target.name}`, body: `${target.name} has declined the internship offer for ${target.programmeName}.`, href: '/applications', tier: 'action' });
    addNotification({ forRole: 'mentor', title: `Offer declined — ${target.name}`, body: `${target.name} has declined the internship offer for ${target.programmeName}.`, href: '/mentor/projects', tier: 'action' });
  }
  function requestDateChange(appId: string, date: string, reason: string) {
    const target = ioApps.find(a => a.id === appId);
    if (!target) return;
    updateIo({ ...target, status: 'Date Change Requested', startDateChangeRequest: { requestedDate: date, reason } });
    addNotification({ forRole: 'io', title: `Start date change requested — ${target.name}`, body: `${target.name} has requested a start date change to ${date} for ${target.programmeName}.`, href: '/applications', tier: 'action' });
  }

  if (myApps === null) return null;

  const pendingSlots   = ioApps.filter(a => a.status === 'Shortlisted for Interview' && (a.interviewSlots ?? []).length > 0 && a.confirmedSlot === undefined);
  const scheduled      = ioApps.filter(a => a.status === 'Interview Scheduled');
  const offers         = ioApps.filter(a => a.status === 'Offer Extended');
  const onboardingPend = ioApps.filter(a => a.status === 'Offer Accepted' && !a.onboarding);
  const dateChangePend = ioApps.filter(a => a.status === 'Date Change Requested');
  const hasActions     = pendingSlots.length + scheduled.length + offers.length + onboardingPend.length + dateChangePend.length > 0;

  const ioAppMap    = new Map(ioApps.map(a => [a.id, a]));
  const currentApps = myApps.filter(a => !TERMINAL_STATUSES.includes(a.status as typeof TERMINAL_STATUSES[number]));
  const pastApps    = myApps.filter(a => TERMINAL_STATUSES.includes(a.status as typeof TERMINAL_STATUSES[number]));
  const hasAny      = drafts.length + myApps.length > 0;

  return (
    <Shell activeRoute="/apply/applications">
      <div className="mb-6">
        <h1 className="text-headline-lg text-fg">My Applications</h1>
        <p className="text-body-md text-fg-muted mt-0.5">
          {hasAny ? `${myApps.length + drafts.length} application${myApps.length + drafts.length !== 1 ? 's' : ''}` : 'No applications yet.'}
        </p>
      </div>

      {/* Action items */}
      {hasActions && (
        <div className="mb-6">
          <p className="text-[13px] font-bold uppercase tracking-widest text-fg-subtle mb-3">Requires Your Attention</p>
          <div className="space-y-2 max-w-2xl">
            {pendingSlots.map(app => (
              <SlotPickerCard key={app.id} app={app}
                onConfirm={i => confirmSlot(app.id, i)}
                onRescheduleRequest={n => requestReschedule(app.id, n)}
              />
            ))}
            {scheduled.map(app => <ScheduledCard key={app.id} app={app} />)}
            {offers.map(app => (
              <OfferCard key={app.id} app={app}
                onAccepted={(cb, cd) => acceptOffer(app.id, cb, cd)}
                onDeclined={() => declineOffer(app.id)}
                onDateRequested={(date, reason) => requestDateChange(app.id, date, reason)}
              />
            ))}
            {onboardingPend.map(app => (
              <div key={app.id} className="rounded-2xl border border-warning/30 bg-warning-bg/40 p-4 flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-warning/10 border border-warning/30 flex items-center justify-center shrink-0">
                  <ClipboardCheck size={16} className="text-warning" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-body-md font-semibold text-fg">Submit onboarding information</p>
                  <p className="text-body-sm text-fg-muted mt-0.5">
                    {app.programmeName} · A few details (allowance, emergency contact, policy acknowledgements) before you start.
                  </p>
                </div>
                <Button className="shrink-0 self-center" onClick={() => router.push('/apply/onboarding')}>
                  Start <ChevronRight size={14} />
                </Button>
              </div>
            ))}
            {dateChangePend.map(app => <DateChangePendingCard key={app.id} app={app} />)}
          </div>
        </div>
      )}

      {/* No applications */}
      {!hasAny && (
        <div className="card p-12 text-center">
          <FileText size={36} className="text-fg-subtle mx-auto mb-3" />
          <p className="text-body-lg font-semibold text-fg mb-1">No applications yet</p>
          <p className="text-body-md text-fg-muted">Your submitted applications will appear here.</p>
        </div>
      )}

      {/* Current applications */}
      {(drafts.length > 0 || currentApps.length > 0) && (
        <div className="mb-6">
          <p className="text-[13px] font-bold uppercase tracking-widest text-fg-subtle mb-3">Current Applications</p>
          <div className="card overflow-hidden">
            <div className="divide-y divide-border">
              {drafts.map(draft => <DraftCard key={draft.programmeId} draft={draft} />)}
              {currentApps.map(app => <AppCard key={app.id} app={app} ioApp={ioAppMap.get(app.id)} projectMap={projectMap} progMap={progMap} onUpdateIo={updateIo} onWithdraw={withdrawApplication} />)}
            </div>
          </div>
        </div>
      )}

      {/* Past applications */}
      {pastApps.length > 0 && (
        <div>
          <p className="text-[13px] font-bold uppercase tracking-widest text-fg-subtle mb-3">Past Applications</p>
          <div className="card overflow-hidden">
            <div className="divide-y divide-border">
              {pastApps.map(app => <AppCard key={app.id} app={app} ioApp={ioAppMap.get(app.id)} projectMap={projectMap} progMap={progMap} onUpdateIo={updateIo} />)}
            </div>
          </div>
        </div>
      )}
    </Shell>
  );
}
