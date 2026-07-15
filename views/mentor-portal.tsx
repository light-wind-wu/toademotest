'use client';

import { useState, useEffect, useMemo, Fragment, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import Shell from '@/components/layout/shell';
import Button from '@/components/ui-legacy/button';
import Modal from '@/components/ui-legacy/modal';
import DatePicker from '@/components/ui-legacy/date-picker';
import TabBar from '@/components/ui-legacy/tab-bar';
import {
  Award, Briefcase,
  Tag, BookOpen, ChevronDown, MapPin, Clock,
  CalendarClock, Info, CalendarPlus, AlertCircle, CheckCircle2,
} from 'lucide-react';
import InterviewScheduleDrawer from '@/components/mentor/interview-schedule-drawer';
import InterviewRescheduleDrawer from '@/components/mentor/interview-reschedule-drawer';
import MarkCompleteConfirm from '@/components/mentor/mark-complete-confirm';
import { cn, mentorIdMatches } from '@/lib/utils';
import { addNotification } from '@/lib/notifications';
import { useRole } from '@/lib/role';
import type { Application, ProjectEntry } from '@/lib/types';
import { loadProjects } from '@/lib/storage';
import seedData from '@/data/applications.json';
import programmesJson from '@/data/programmes.json';

/* ── Programme name lookup ─────────────────────────────────────────────────── */
const PROG_NAME: Record<string, string> = Object.fromEntries(
  (programmesJson as { id: string; title: string }[]).map(p => [p.id, p.title])
);

/* ── Storage ───────────────────────────────────────────────────────────────── */
const APP_KEY       = 'dsta_applications';
const APP_VER_KEY   = 'dsta_applications_seed_v';
const APP_SEED_VER  = '31';

function migrateApps(apps: Application[]): Application[] {
  return apps.map(a => (a.status as string) === 'Start Date Requested' ? { ...a, status: 'Date Change Requested' as Application['status'] } : a);
}
function loadApps(): Application[] {
  try {
    const ver = localStorage.getItem(APP_VER_KEY);
    const raw = localStorage.getItem(APP_KEY);
    if (ver === APP_SEED_VER && raw) return migrateApps(JSON.parse(raw) as Application[]);
    const existing: Application[] = raw ? JSON.parse(raw) : [];
    const seedArr = seedData as Application[];
    const existingIds = new Set(existing.map((a: Application) => a.id));
    const merged = [...existing, ...seedArr.filter((a: Application) => !existingIds.has(a.id))];
    localStorage.setItem(APP_KEY, JSON.stringify(merged));
    localStorage.setItem(APP_VER_KEY, APP_SEED_VER);
    return migrateApps(merged);
  } catch { return seedData as Application[]; }
}

const INTERVIEW_STATUSES = new Set(['Shortlisted for Interview', 'Interview Scheduled', 'Interview Completed']);
const INTERN_STATUSES    = new Set(['Offer Extended', 'Offer Accepted', 'Active Intern', 'Internship Completed']);

function fmtSlot(slot: { date: string; time: string }) {
  const d = new Date(`${slot.date}T${slot.time}`);
  return d.toLocaleDateString('en-SG', { weekday: 'short', day: 'numeric', month: 'short' }) +
    ' · ' + d.toLocaleTimeString('en-SG', { hour: '2-digit', minute: '2-digit', hour12: true });
}

function avgScore(scores: Record<string, number>) {
  const vals = Object.values(scores);
  return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
}

/* ── Slot bar ──────────────────────────────────────────────────────────────── */
function SlotBar({ filled, reserved, total }: { filled: number; reserved: number; total: number }) {
  const filledPct    = total > 0 ? Math.min(filled / total, 1) : 0;
  const potentialPct = total > 0 ? Math.min((filled + reserved) / total, 1) : 0;
  const barColor     = filledPct >= 1 ? 'bg-success' : filledPct >= 0.5 ? 'bg-accent' : 'bg-warning';

  const triggerRef                  = useRef<HTMLSpanElement>(null);
  const [tipVisible, setTipVisible] = useState(false);
  const [tipPos,     setTipPos]     = useState({ top: 0, right: 0 });

  function showTip() {
    if (triggerRef.current) {
      const r = triggerRef.current.getBoundingClientRect();
      setTipPos({ top: r.top, right: window.innerWidth - r.right });
    }
    setTipVisible(true);
  }

  return (
    <div className="flex items-center gap-2">
      {/* Progress bar — solid = confirmed, ghost = recommended */}
      <div className="flex-1 h-1.5 rounded-full bg-border overflow-hidden relative">
        {reserved > 0 && (
          <div className="absolute inset-0 h-full rounded-full bg-accent/25" style={{ width: `${potentialPct * 100}%` }} />
        )}
        <div className={cn('h-full rounded-full relative', barColor)} style={{ width: `${filledPct * 100}%` }} />
      </div>

      {/* Label */}
      <span className="text-body-sm text-fg-muted tabular-nums whitespace-nowrap">
        {filled}/{total} confirmed
      </span>

      {/* Recommended count + portalled tooltip */}
      {reserved > 0 && (
        <span
          ref={triggerRef}
          className="flex items-center gap-1 cursor-default"
          onMouseEnter={showTip}
          onMouseLeave={() => setTipVisible(false)}
        >
          <span className="text-body-sm text-accent font-medium tabular-nums">· {reserved} offer extended</span>
          <Info size={11} className="text-fg-subtle" />

          {tipVisible && typeof document !== 'undefined' && createPortal(
            <div
              style={{
                position:  'fixed',
                top:       tipPos.top,
                right:     tipPos.right,
                transform: 'translateY(calc(-100% - 8px))',
                zIndex:    9999,
              }}
              className="w-64 rounded-xl border border-border bg-surface shadow-lg px-3 py-2.5 pointer-events-none"
            >
              <p className="text-[13px] font-bold text-fg mb-1.5">Slot progress</p>
              <p className="text-[13px] text-fg-muted leading-relaxed">
                <span className="font-semibold text-fg">Solid bar</span> — slots filled by applicants who have accepted their offer.
              </p>
              <p className="text-[13px] text-fg-muted leading-relaxed mt-1.5">
                <span className="font-semibold text-accent">Light bar extension</span> — offer sent to applicant, awaiting their acceptance. A slot is only confirmed once the applicant says yes.
              </p>
            </div>,
            document.body
          )}
        </span>
      )}
    </div>
  );
}

/* ── Extension request modal ───────────────────────────────────────────────── */
function MentorExtensionModal({
  app,
  onClose,
  onSubmit,
}: {
  app:      Application;
  onClose:  () => void;
  onSubmit: (newEndDate: string, reason: string) => void;
}) {
  const [newDate, setNewDate] = useState('');
  const [reason,  setReason]  = useState('');
  const hasPending = app.extensionRequest?.status === 'pending';

  if (hasPending) {
    return (
      <>
        <div className="flex items-center gap-2 mb-1">
          <AlertCircle size={18} className="text-warning" />
          <h2 id="mentor-extension-title" className="text-headline-sm font-bold text-fg">Extension Already Submitted</h2>
        </div>
        <p className="text-body-sm text-fg-muted mb-3">
          An extension request for <strong>{app.name}</strong> is already pending Director approval.
        </p>
        <div className="rounded-xl bg-bg-subtle border border-border p-4 space-y-2 mb-5">
          <div>
            <p className="text-[12px] font-bold uppercase tracking-widest text-fg-subtle mb-0.5">Requested New End Date</p>
            <p className="text-body-sm font-semibold text-fg">{app.extensionRequest!.newEndDate}</p>
          </div>
          <div>
            <p className="text-[12px] font-bold uppercase tracking-widest text-fg-subtle mb-0.5">Reason</p>
            <p className="text-body-sm text-fg">{app.extensionRequest!.reason}</p>
          </div>
        </div>
        <div className="flex justify-end">
          <Button variant="ghost" onClick={onClose}>Close</Button>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="flex items-center gap-2 mb-1">
        <CalendarPlus size={18} className="text-accent" />
        <h2 id="mentor-extension-title" className="text-headline-sm font-bold text-fg">Request Extension</h2>
      </div>
      <p className="text-body-sm text-fg-muted mb-4">
        Submit an extension request for <strong>{app.name}</strong>. This will be sent to the Director for approval.
      </p>
      {app.internshipEndDate && (
        <div className="mb-4 px-3 py-2.5 rounded-xl bg-bg-subtle border border-border">
          <p className="text-[12px] font-bold uppercase tracking-widest text-fg-subtle mb-0.5">Current End Date</p>
          <p className="text-body-sm font-semibold text-fg">{app.internshipEndDate}</p>
        </div>
      )}
      <div className="mb-4">
        <p className="text-body-sm font-semibold text-fg mb-1">New End Date</p>
        <DatePicker value={newDate} onChange={setNewDate} placeholder="Select new end date" />
      </div>
      <label className="block mb-1">
        <span className="text-body-sm font-semibold text-fg">Reason</span>
      </label>
      <textarea
        className="w-full h-24 rounded-xl border border-border bg-bg-subtle text-body-sm text-fg p-3 resize-none focus:outline-none focus:ring-1 focus:ring-accent mb-5"
        placeholder="Explain why the extension is needed…"
        value={reason}
        onChange={e => setReason(e.target.value)}
      />
      <div className="flex justify-end gap-2">
        <Button
          disabled={!newDate || !reason.trim()}
          onClick={() => onSubmit(newDate, reason.trim())}
        >
          <CalendarPlus size={14} /> Submit to Director
        </Button>
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
      </div>
    </>
  );
}

/* ── Early completion modal ────────────────────────────────────────────────── */
function MentorEarlyCompletionModal({
  app,
  onClose,
  onSubmit,
}: {
  app:      Application;
  onClose:  () => void;
  onSubmit: (milestoneNotes: string, reason: string) => void;
}) {
  const [milestoneConfirmed, setMilestoneConfirmed] = useState(false);
  const [milestoneNotes,     setMilestoneNotes]     = useState('');
  const [reason,             setReason]             = useState('');

  const hasPending = app.earlyCompletionRequest?.status === 'pending';

  if (hasPending) {
    return (
      <>
        <div className="flex items-center gap-2 mb-1">
          <AlertCircle size={18} className="text-warning" />
          <h2 id="mentor-early-completion-title" className="text-headline-sm font-bold text-fg">Already Submitted</h2>
        </div>
        <p className="text-body-sm text-fg-muted mb-3">
          An early completion request for <strong>{app.name}</strong> is already pending Director approval.
        </p>
        <div className="flex justify-end">
          <Button variant="ghost" onClick={onClose}>Close</Button>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="flex items-center gap-2 mb-1">
        <CheckCircle2 size={18} className="text-success" />
        <h2 id="mentor-early-completion-title" className="text-headline-sm font-bold text-fg">Submit Early Completion</h2>
      </div>
      <p className="text-body-sm text-fg-muted mb-4">
        Request Director approval for <strong>{app.name}</strong> to complete ahead of schedule.
      </p>

      {/* Milestone confirmation */}
      <div className="mb-4 rounded-xl border border-border bg-bg-subtle p-4 space-y-3">
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={milestoneConfirmed}
            onChange={e => setMilestoneConfirmed(e.target.checked)}
            className="mt-0.5 w-4 h-4 accent-accent cursor-pointer shrink-0"
          />
          <span className="text-body-sm text-fg">
            I confirm that <strong>{app.name}</strong> has completed the assigned project milestone(s) for this internship.
          </span>
        </label>
        <div>
          <label className="block text-body-sm font-semibold text-fg mb-1">
            Milestone details <span className="text-danger">*</span>
          </label>
          <textarea
            className="w-full h-24 rounded-xl border border-border bg-surface text-body-sm text-fg p-3 resize-none focus:outline-none focus:ring-1 focus:ring-accent"
            placeholder="Describe the milestones completed and outcomes delivered…"
            value={milestoneNotes}
            onChange={e => setMilestoneNotes(e.target.value)}
          />
        </div>
      </div>

      <label className="block mb-1">
        <span className="text-body-sm font-semibold text-fg">Reason for early completion</span>
      </label>
      <textarea
        className="w-full h-20 rounded-xl border border-border bg-bg-subtle text-body-sm text-fg p-3 resize-none focus:outline-none focus:ring-1 focus:ring-accent mb-5"
        placeholder="e.g. Intern completed all deliverables ahead of schedule…"
        value={reason}
        onChange={e => setReason(e.target.value)}
      />
      <div className="flex justify-end gap-2">
        <Button
          disabled={!milestoneConfirmed || !milestoneNotes.trim()}
          onClick={() => onSubmit(milestoneNotes.trim(), reason.trim())}
        >
          <CheckCircle2 size={14} />Submit to Director
        </Button>
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
      </div>
    </>
  );
}

/* ── Project card ──────────────────────────────────────────────────────────── */
function ProjectCard({
  project, applicants, interns, onOpenApplicant, onSchedule, onReschedule, onMarkComplete, onExtensionRequest, onEarlyCompletion, onViewDetails, defaultOpen,
}: {
  project:             ProjectEntry;
  applicants:          Application[];
  interns:             Application[];
  onOpenApplicant:     (app: Application) => void;
  onSchedule:          (app: Application) => void;
  onReschedule:        (app: Application) => void;
  onMarkComplete:      (app: Application) => void;
  onExtensionRequest:  (app: Application) => void;
  onEarlyCompletion:   (app: Application) => void;
  onViewDetails:       () => void;
  defaultOpen:         boolean;
}) {
  const [open,      setOpen]      = useState(defaultOpen);
  const [scopeOpen, setScopeOpen] = useState(false);

  // Bucket arrays
  const bSchedule   = applicants.filter(a => a.status === 'Shortlisted for Interview' && !a.interviewSlots?.length);
  const bAwaiting   = applicants.filter(a => a.status === 'Shortlisted for Interview' && !!a.interviewSlots?.length);
  const bScheduled  = applicants.filter(a => a.status === 'Interview Scheduled');
  const bEvaluate   = applicants.filter(a => a.status === 'Interview Completed' && !a.mentorDecision);

  // Default to the first tab that needs action
  const initialTab = bSchedule.length > 0 ? 'shortlisted'
    : bEvaluate.length > 0               ? 'pending_eval'
    : bAwaiting.length > 0 || bScheduled.length > 0 ? 'pending_interview'
    : 'shortlisted';
  const [activeTab, setActiveTab] = useState<string>(initialTab);

  const pendingCount = bSchedule.length + bEvaluate.length;
  const bRecommend  = applicants.filter(a => a.mentorDecision === 'Accepted');
  const bReject     = applicants.filter(a => a.mentorDecision === 'Rejected');
  const bOfferExt   = interns.filter(a => a.status === 'Offer Extended');
  const bConfirmed  = interns.filter(a => ['Offer Accepted', 'Active Intern', 'Internship Completed'].includes(a.status));

  const confirmedCount   = bConfirmed.length;
  const recommendedCount = bRecommend.length;

  const TABS = [
    { key: 'shortlisted',        label: 'Shortlisted',        apps: bSchedule },
    { key: 'pending_interview',  label: 'Pending Interview',  apps: [...bAwaiting, ...bScheduled] },
    { key: 'pending_eval',       label: 'Pending Evaluation', apps: bEvaluate },
    { key: 'completed',          label: 'Completed',          apps: [...bRecommend, ...bReject, ...bOfferExt, ...bConfirmed] },
  ];
  const totalApplicants = TABS.reduce((s, t) => s + t.apps.length, 0);

  const resolvedTab = activeTab;

  function tabDetail(app: Application, tabKey: string): string {
    if (tabKey === 'shortlisted') return 'No slots set yet';
    if (tabKey === 'pending_interview') {
      if (app.status === 'Interview Scheduled')
        return app.interviewSlots && app.confirmedSlot !== undefined
          ? fmtSlot(app.interviewSlots[app.confirmedSlot]) : 'Interview scheduled';
      return 'Slots sent · awaiting confirmation';
    }
    if (tabKey === 'pending_eval') return 'Interview complete';
    if (app.mentorDecision === 'Accepted') return 'Accepted';
    if (app.mentorDecision === 'Rejected') return 'Rejected';
    return '—';
  }

  return (
    <div className="rounded-2xl border border-border bg-surface overflow-hidden">
      {/* Project header — always visible */}
      <div className="px-5 py-4 bg-bg-subtle">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="min-w-0">
            <button
              onClick={onViewDetails}
              className="text-body-md font-bold text-fg hover:text-accent hover:underline transition-colors truncate text-left mb-0.5 block"
            >
              {project.title}
            </button>
            <div className="flex items-center gap-3 flex-wrap">
              {PROG_NAME[project.programme] && (
                <span className="text-[13px] text-fg-muted">{PROG_NAME[project.programme]}</span>
              )}
              {project.internshipDuration && (
                <span className="flex items-center gap-1 text-[13px] text-fg-muted">
                  <Clock size={10} />{project.internshipDuration}
                </span>
              )}
              {project.workingLocation && (
                <span className="flex items-center gap-1 text-[13px] text-fg-muted">
                  <MapPin size={10} />{project.workingLocation}
                </span>
              )}
            </div>
          </div>
          <button
            onClick={() => { setOpen(o => !o); if (open) setScopeOpen(false); }}
            className="shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-fg-muted hover:bg-border/60 hover:text-fg transition-colors mt-0.5"
          >
            <ChevronDown size={14} className={cn('transition-transform duration-200', open && 'rotate-180')} />
          </button>
        </div>
        <SlotBar filled={confirmedCount} reserved={bOfferExt.length} total={project.slots} />
        {pendingCount > 0 && (
          <div className="mt-2.5 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-warning shrink-0" />
            <span className="text-[13px] font-semibold text-warning">
              {pendingCount} {pendingCount === 1 ? 'applicant needs' : 'applicants need'} your attention
            </span>
          </div>
        )}
      </div>

      {/* Collapsible body */}
      {open && (
        <>
          {/* Scope toggle */}
          <div className="px-5 py-2.5 border-t border-border bg-bg-subtle/60">
            <button
              onClick={() => setScopeOpen(o => !o)}
              className="flex items-center gap-1 text-[13px] text-fg-muted hover:text-accent transition-colors"
            >
              <ChevronDown size={12} className={cn('transition-transform', scopeOpen && 'rotate-180')} />
              {scopeOpen ? 'Hide project scope' : 'View project scope'}
            </button>
            {scopeOpen && (
              <div className="mt-3 space-y-3 border-t border-border pt-3">
                {project.description && (
                  <div>
                    <div className="flex items-center gap-1.5 mb-1">
                      <BookOpen size={11} className="text-fg-muted" />
                      <p className="text-[12px] font-bold uppercase tracking-widest text-fg-subtle">Project Scope</p>
                    </div>
                    <p className="text-body-sm text-fg leading-relaxed">{project.description}</p>
                  </div>
                )}
                {project.skills && project.skills.length > 0 && (
                  <div>
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <Tag size={11} className="text-fg-muted" />
                      <p className="text-[12px] font-bold uppercase tracking-widest text-fg-subtle">Skills</p>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {project.skills.map(s => (
                        <span key={s} className="text-[13px] font-semibold px-2 py-0.5 rounded-full bg-accent/8 text-accent">{s}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Applicant tabs + table */}
          <div className="border-t border-border">
            {totalApplicants === 0 ? (
              <div className="px-5 py-6 text-center">
                <p className="text-body-sm text-fg-muted">No applicants shortlisted yet.</p>
              </div>
            ) : (
              <>
                {/* Tab bar — segmented pill */}
                <div className="border-b border-border px-3 py-3 overflow-x-auto">
                  <TabBar
                    ariaLabel="Applicant stage"
                    value={resolvedTab}
                    onChange={setActiveTab}
                    tabs={TABS.map(tab => ({ key: tab.key, label: tab.label, count: tab.apps.length }))}
                  />
                </div>

                {/* Table for active tab */}
                {(() => {
                  const tab = TABS.find(t => t.key === resolvedTab)!;
                  return tab.apps.length === 0 ? (
                    <div className="px-5 py-6 text-center">
                      <p className="text-body-sm text-fg-muted">No applicants in this stage.</p>
                    </div>
                  ) : (
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-border bg-bg-subtle/40">
                          <th className="px-5 py-2 text-[12px] font-semibold uppercase tracking-wide text-fg-subtle w-[40%]">Applicant</th>
                          <th className="px-4 py-2 text-[12px] font-semibold uppercase tracking-wide text-fg-subtle">
                            {resolvedTab === 'completed' ? 'Decision' : 'Interview Details'}
                          </th>
                          <th className="px-4 py-2 text-[12px] font-semibold uppercase tracking-wide text-fg-subtle text-right">
                            {resolvedTab === 'pending_eval' || resolvedTab === 'completed' ? 'Score' : ''}
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {tab.apps.map(app => {
                          const score  = app.mentorScores ? avgScore(app.mentorScores) : null;
                          const detail = tabDetail(app, resolvedTab);
                          const dimmed = app.mentorDecision === 'Rejected';
                          return (
                            <tr key={app.id}
                              onClick={() => onOpenApplicant(app)}
                              className={cn(
                                'border-b border-border last:border-b-0 cursor-pointer hover:bg-bg-subtle/50 transition-colors group',
                                dimmed && 'opacity-50'
                              )}
                            >
                              <td className="px-5 py-3">
                                <p className="text-body-sm font-semibold text-fg group-hover:text-accent transition-colors">{app.name}</p>
                                <p className="text-[13px] text-fg-muted">{app.school} · Y{app.year}</p>
                              </td>
                              <td className="px-4 py-3">
                                <p className="text-body-sm text-fg-muted">{detail}</p>
                                {resolvedTab === 'shortlisted' && (
                                  <button
                                    onClick={e => { e.stopPropagation(); onSchedule(app); }}
                                    className="mt-0.5 text-[13px] font-semibold text-accent hover:underline transition-colors"
                                  >
                                    Set Availability
                                  </button>
                                )}
                                {resolvedTab === 'pending_interview' && app.status === 'Interview Scheduled' && (
                                  <button
                                    onClick={e => { e.stopPropagation(); onReschedule(app); }}
                                    className="mt-0.5 text-[13px] font-semibold text-accent hover:underline transition-colors"
                                  >
                                    Reschedule
                                  </button>
                                )}
                              </td>
                              <td className="px-4 py-3 text-right">
                                {resolvedTab === 'pending_interview' ? (
                                  app.status === 'Interview Scheduled' && (
                                    <button
                                      onClick={e => { e.stopPropagation(); onMarkComplete(app); }}
                                      className="text-[13px] font-semibold px-2.5 py-1.5 rounded-lg border border-border text-fg-muted hover:bg-bg-subtle hover:text-fg transition-colors whitespace-nowrap"
                                    >
                                      Mark as Completed
                                    </button>
                                  )
                                ) : resolvedTab === 'completed' && app.status === 'Active Intern' ? (
                                  <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
                                    <button
                                      onClick={e => { e.stopPropagation(); onEarlyCompletion(app); }}
                                      className={cn(
                                        'text-[13px] font-semibold px-2.5 py-1.5 rounded-lg border transition-colors whitespace-nowrap',
                                        app.earlyCompletionRequest?.status === 'pending'
                                          ? 'border-warning/30 bg-warning-bg text-warning'
                                          : 'border-border text-fg-muted hover:bg-bg-subtle hover:text-fg'
                                      )}
                                    >
                                      {app.earlyCompletionRequest?.status === 'pending' ? 'Early Compl. Pending' : 'Early Completion'}
                                    </button>
                                    <button
                                      onClick={e => { e.stopPropagation(); onExtensionRequest(app); }}
                                      className={cn(
                                        'text-[13px] font-semibold px-2.5 py-1.5 rounded-lg border transition-colors whitespace-nowrap',
                                        app.extensionRequest?.status === 'pending'
                                          ? 'border-warning/30 bg-warning-bg text-warning'
                                          : 'border-border text-fg-muted hover:bg-bg-subtle hover:text-fg'
                                      )}
                                    >
                                      {app.extensionRequest?.status === 'pending' ? 'Extension Pending' : 'Request Extension'}
                                    </button>
                                  </div>
                                ) : score !== null ? (
                                  <span className={cn('text-body-sm font-bold tabular-nums',
                                    score >= 8 ? 'text-success' : score >= 6 ? 'text-accent' : 'text-warning'
                                  )}>{score.toFixed(1)}</span>
                                ) : (resolvedTab === 'pending_eval' || resolvedTab === 'completed') ? (
                                  <span className="text-body-sm text-fg-subtle">—</span>
                                ) : null}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  );
                })()}
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}

/* ── Main page ─────────────────────────────────────────────────────────────── */
export default function MentorPortal() {
  const { profile } = useRole();
  const router      = useRouter();

  const [apps,             setApps]             = useState<Application[]>([]);
  const [projects,         setProjects]         = useState<ProjectEntry[]>([]);
  const [scheduleApp,      setScheduleApp]      = useState<Application | null>(null);
  const [rescheduleApp,    setRescheduleApp]    = useState<Application | null>(null);
  const [markCompleteApp,  setMarkCompleteApp]  = useState<Application | null>(null);
  const [extensionApp,        setExtensionApp]        = useState<Application | null>(null);
  const [earlyCompletionApp,  setEarlyCompletionApp]  = useState<Application | null>(null);

  useEffect(() => {
    setApps(loadApps());
    setProjects(loadProjects());

    function onVisibilityChange() {
      if (document.visibilityState === 'visible') {
        setApps(loadApps());
        setProjects(loadProjects());
      }
    }
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => document.removeEventListener('visibilitychange', onVisibilityChange);
  }, []);

  const mentorPrefix = profile.email.split('@')[0];
  const myProjects = useMemo(
    () => projects.filter(p => mentorIdMatches(p.mentorUserId, profile.email)),
    [projects, mentorPrefix, profile.email]
  );

  function saveApp(updated: Application) {
    const next = apps.map(a => a.id === updated.id ? updated : a);
    setApps(next);
    localStorage.setItem(APP_KEY, JSON.stringify(next));
    localStorage.setItem(APP_VER_KEY, APP_SEED_VER);
  }

  function handleScheduleSave(slots: { date: string; time: string; duration?: string }[]) {
    if (!scheduleApp) return;
    saveApp({ ...scheduleApp, interviewSlots: slots });
    addNotification({ forRole: 'applicant', forEmail: scheduleApp.email, title: 'Interview availability — action required', body: `Interview time slots have been sent for your ${scheduleApp.programmeName} application. Please confirm your preferred time.`, href: '/apply/dashboard', tier: 'action' });
    setScheduleApp(null);
  }

  function handleRescheduleSave(slots: { date: string; time: string; duration?: string }[]) {
    if (!rescheduleApp) return;
    saveApp({
      ...rescheduleApp,
      status:         'Shortlisted for Interview',
      interviewSlots: slots,
      confirmedSlot:  undefined,
      meetingLink:    undefined,
    });
    addNotification({ forRole: 'applicant', forEmail: rescheduleApp.email, title: 'New interview slots available', body: `New interview time slots have been sent for your ${rescheduleApp.programmeName} application. Please confirm your preferred time.`, href: '/apply/dashboard', tier: 'action' });
    setRescheduleApp(null);
  }

  function handleMarkComplete(goEvaluate: boolean) {
    if (!markCompleteApp) return;
    saveApp({ ...markCompleteApp, status: 'Interview Completed' });
    setMarkCompleteApp(null);
    if (goEvaluate) router.push(`/mentor/interviews/${markCompleteApp.id}`);
  }

  function handleExtensionSubmit(newEndDate: string, reason: string) {
    if (!extensionApp) return;
    const today   = new Date().toISOString().split('T')[0];
    const updated = {
      ...extensionApp,
      extensionRequest: { newEndDate, reason, status: 'pending' as const, submittedDate: today },
    };
    saveApp(updated);
    setExtensionApp(null);
  }

  function handleEarlyCompletionSubmit(milestoneNotes: string, reason: string) {
    if (!earlyCompletionApp) return;
    const today   = new Date().toISOString().split('T')[0];
    const updated = {
      ...earlyCompletionApp,
      earlyCompletionRequest: {
        reason:          [milestoneNotes, reason].filter(Boolean).join(' — '),
        mentorConfirmed: true,
        status:          'pending' as const,
        submittedDate:   today,
      },
    };
    saveApp(updated);
    addNotification({ forRole: 'io', title: `Early completion request — ${earlyCompletionApp.name}`, body: `Mentor has submitted an early completion request for ${earlyCompletionApp.name}. Milestone confirmation included. Pending Director approval.`, href: '/interns', tier: 'action' });
    setEarlyCompletionApp(null);
  }

  function handleOpenApplicant(app: Application) {
    if (app.status === 'Interview Completed' && !app.mentorDecision) {
      router.push(`/mentor/interviews/${app.id}`);
    } else {
      router.push(`/candidate360/${app.id}?from=mentor`);
    }
  }

  return (
    <Shell activeRoute="/mentor/projects">
      <div className="mb-5">
        <h1 className="text-headline-lg text-fg mb-1">My Projects</h1>
      </div>

      {myProjects.length === 0 ? (
        <div className="rounded-2xl border border-border bg-surface p-12 text-center">
          <Briefcase size={36} className="text-fg-subtle mx-auto mb-3" />
          <p className="text-body-lg font-semibold text-fg mb-1">No projects assigned</p>
          <p className="text-body-md text-fg-muted">Contact your IO if you believe this is an error.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
          {myProjects.map((project, idx) => {
            const applicants = apps.filter(a => a.shortlistedFor === project.id && INTERVIEW_STATUSES.has(a.status));
            const interns    = apps.filter(a => a.shortlistedFor === project.id && INTERN_STATUSES.has(a.status));
            return (
              <ProjectCard
                key={project.id}
                project={project}
                applicants={applicants}
                interns={interns}
                onOpenApplicant={handleOpenApplicant}
                onSchedule={app => setScheduleApp(app)}
                onReschedule={app => setRescheduleApp(app)}
                onMarkComplete={app => setMarkCompleteApp(app)}
                onExtensionRequest={app => setExtensionApp(app)}
                onEarlyCompletion={app => setEarlyCompletionApp(app)}
                onViewDetails={() => router.push(`/projects/${project.id}`)}
                defaultOpen={myProjects.length === 1 || idx === 0}
              />
            );
          })}
        </div>
      )}

      {scheduleApp && (
        <InterviewScheduleDrawer
          app={scheduleApp}
          onSave={handleScheduleSave}
          onClose={() => setScheduleApp(null)}
        />
      )}

      {rescheduleApp && (
        <InterviewRescheduleDrawer
          app={rescheduleApp}
          onSave={handleRescheduleSave}
          onClose={() => setRescheduleApp(null)}
        />
      )}

      {markCompleteApp && (
        <MarkCompleteConfirm
          app={markCompleteApp}
          onConfirm={handleMarkComplete}
          onClose={() => setMarkCompleteApp(null)}
        />
      )}

      {extensionApp && (
        <Modal open={!!extensionApp} onClose={() => setExtensionApp(null)} labelledBy="mentor-extension-title">
          <MentorExtensionModal
            app={extensionApp}
            onClose={() => setExtensionApp(null)}
            onSubmit={handleExtensionSubmit}
          />
        </Modal>
      )}

      {earlyCompletionApp && (
        <Modal open={!!earlyCompletionApp} onClose={() => setEarlyCompletionApp(null)} labelledBy="mentor-early-completion-title">
          <MentorEarlyCompletionModal
            app={earlyCompletionApp}
            onClose={() => setEarlyCompletionApp(null)}
            onSubmit={handleEarlyCompletionSubmit}
          />
        </Modal>
      )}

    </Shell>
  );
}
