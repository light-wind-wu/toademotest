'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import Shell from '@/components/layout/shell';
import { useRouter } from 'next/navigation';
import { useRole } from '@/lib/role';
import {
  Users2, Mail, Award, CalendarClock,
  UserX, LogOut, CalendarPlus, CheckCircle2, AlertCircle, PlayCircle,
  Upload, FileText, AlertTriangle, ShieldCheck, Filter,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { addNotification } from '@/lib/notifications';
import type { Application, ProjectEntry } from '@/lib/types';
import seedApps from '@/data/applications.json';
import { loadProjects } from '@/lib/storage';
import ProgToggle from '@/components/ui-legacy/prog-toggle';
import { useProgramme } from '@/lib/programme-context';
import SortTh from '@/components/ui-legacy/sort-th';
import TableToolbar from '@/components/ui-legacy/table-toolbar';
import TabBar from '@/components/ui-legacy/tab-bar';
import Modal from '@/components/ui-legacy/modal';
import Button from '@/components/ui-legacy/button';
import DatePicker from '@/components/ui-legacy/date-picker';
import DateRangePicker from '@/components/ui-legacy/date-range-picker';
import { RowMenuButton, RowDropdown, DropdownItem, DropdownDivider } from '@/components/ui-legacy/row-actions';
import CertificatePreview, { loadActiveCertStyle, type CertStyle } from '@/components/certificate-preview';

/* ── Data helpers ──────────────────────────────────────────────────────── */
const APP_KEY          = 'dsta_applications';
const APP_VER_KEY      = 'dsta_applications_seed_v';
const APP_SEED_VER     = '31';
const ADMIN_SETTINGS_KEY = 'dsta_admin_settings';

function loadAutomationSettings() {
  try {
    const s = localStorage.getItem(ADMIN_SETTINGS_KEY);
    const p = s ? JSON.parse(s) : {};
    return {
      welcomeLetterDaysBefore: p.welcomeLetterDaysBefore  ?? 10,
      cocDaysAfterCompletion:  p.cocDaysAfterCompletion   ?? 2,
    };
  } catch {
    return { welcomeLetterDaysBefore: 10, cocDaysAfterCompletion: 2 };
  }
}

/* Returns how many working days remain until a given YYYY-MM-DD date */
function workingDaysUntil(dateStr: string): number {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr); target.setHours(0, 0, 0, 0);
  let count = 0, cur = new Date(today);
  while (cur < target) {
    cur.setDate(cur.getDate() + 1);
    const day = cur.getDay();
    if (day !== 0 && day !== 6) count++;
  }
  return count;
}

/* Returns how many working days have elapsed since a given YYYY-MM-DD date */
function workingDaysSince(dateStr: string): number {
  const start = new Date(dateStr); start.setHours(0, 0, 0, 0);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  let count = 0, cur = new Date(start);
  while (cur < today) {
    cur.setDate(cur.getDate() + 1);
    const day = cur.getDay();
    if (day !== 0 && day !== 6) count++;
  }
  return count;
}

function loadApps(): Application[] {
  try {
    const ver = localStorage.getItem(APP_VER_KEY);
    const raw = localStorage.getItem(APP_KEY);
    if (ver === APP_SEED_VER && raw) return JSON.parse(raw) as Application[];
    const stored = raw ? JSON.parse(raw) as Application[] : null;
    if (stored) return stored;
    const seeded = seedApps as Application[];
    localStorage.setItem(APP_KEY, JSON.stringify(seeded));
    localStorage.setItem(APP_VER_KEY, APP_SEED_VER);
    return seeded;
  } catch { return seedApps as Application[]; }
}

function saveApps(apps: Application[]) {
  localStorage.setItem(APP_KEY, JSON.stringify(apps));
  localStorage.setItem(APP_VER_KEY, APP_SEED_VER);
}

/* ── Status config ─────────────────────────────────────────────────────── */
const STATUS_CONFIG: Record<string, { label: string; color: string; dot: string; tab: string }> = {
  'Offer Accepted':       { label: 'Onboarding', color: 'bg-info-bg text-info border-info/20',           dot: 'bg-info',     tab: 'upcoming'  },
  'Active Intern':        { label: 'Active',     color: 'bg-success-bg text-success border-success/20',  dot: 'bg-success',  tab: 'active'    },
  'Internship Completed': { label: 'Completed',  color: 'bg-bg-muted text-fg-muted border-border',       dot: 'bg-fg-muted', tab: 'completed' },
  'Withdrawn':            { label: 'Withdrawn',  color: 'bg-warning-bg text-warning border-warning/20',  dot: 'bg-warning',  tab: 'completed' },
  'Terminated':           { label: 'Terminated', color: 'bg-danger-bg text-danger border-danger/20',     dot: 'bg-danger',   tab: 'completed' },
};

const INTERN_STATUSES = new Set<string>([
  'Offer Accepted', 'Active Intern',
  'Internship Completed', 'Withdrawn', 'Terminated',
]);

type TabKey = 'all' | 'upcoming' | 'active' | 'completed';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'all',       label: 'All'         },
  { key: 'upcoming',  label: 'Onboarding'  },
  { key: 'active',    label: 'Active'      },
  { key: 'completed', label: 'Completed'   },
];

const STATUS_SORT: Record<string, number> = { upcoming: 0, active: 1, completed: 2 };

const STATUS_FILTER_OPTIONS = ['Onboarding', 'Active', 'Completed'];
const STATUS_FILTER_TAB: Record<string, string> = { Onboarding: 'upcoming', Active: 'active', Completed: 'completed' };

/* ── Completion notification ───────────────────────────────────────────── */
function notifyInternCompleted(app: Application) {
  addNotification({
    forRole:   'applicant',
    forEmail:  app.email,
    title:     'Your internship has concluded',
    body:      `Your ${app.programmeName} internship is now complete. Please submit your post-internship feedback.`,
    href:      `/apply/feedback/${app.id}`,
    tier:      'action',
  });
  addNotification({
    forRole:   'mentor',
    title:     `Evaluation pending — ${app.name}`,
    body:      `${app.name}'s internship has concluded. Please submit your end-of-internship evaluation.`,
    href:      `/mentor/evaluate/${app.id}`,
    tier:      'action',
  });
}

/* ── Pending-action badges ─────────────────────────────────────────────── */
function pendingBadges(app: Application): string[] {
  const badges: string[] = [];
  if (app.status === 'Date Change Requested') badges.push('Date change req.');
  if (app.terminationRequest?.status === 'pending')   badges.push('Withdrawal pending');
  if (app.terminationRequest?.status === 'approved' && app.status === 'Active Intern')  badges.push('Withdrawal approved');
  if (app.earlyCompletionRequest?.status === 'pending') badges.push('Early compl. pending');
  if (app.earlyCompletionRequest?.status === 'approved' && app.status === 'Active Intern') badges.push('Early compl. approved');
  if (app.extensionRequest?.status === 'pending')     badges.push('Extension pending');
  if (app.extensionRequest?.status === 'approved')    badges.push('Extension approved');
  return badges;
}

/* ── Action flow types ─────────────────────────────────────────────────── */
type ActionFlow =
  | 'date-change'
  | 'confirm-onboarding'
  | 'exit-clearance'
  | 'mark-completed'
  | 'withdrawal'
  | 'forced-withdrawal'
  | 'early-completion'
  | 'extension';

/* ── IO Flow Modal (sub-flows only — menu is now a dropdown) ───────────── */
function InternActionsModal({
  app,
  flow,
  onClose,
  onSave,
}: {
  app: Application;
  flow: ActionFlow;
  onClose: () => void;
  onSave: (updated: Application) => void;
}) {
  const [reason,     setReason]     = useState('');
  const [newDate,    setNewDate]    = useState('');
  const [startDate,  setStartDate]  = useState(app.internshipStartDate ?? '');
  const [endDate,    setEndDate]    = useState(app.internshipEndDate ?? '');
  const [saving,     setSaving]     = useState(false);
  // Exit clearance upload
  const [clrFileName, setClrFileName] = useState(app.exitClearance?.fileName ?? '');
  const [clrFileData, setClrFileData] = useState(app.exitClearance?.fileData ?? '');
  const [clrConfirm,  setClrConfirm]  = useState(false);
  const [clrError,    setClrError]    = useState('');

  const today = new Date().toISOString().split('T')[0];

  function handleClearanceUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setClrError('');
    setClrFileName(file.name);
    // Store small files as a data URL so they can be viewed/downloaded; otherwise keep the name only
    if (file.size > 3 * 1024 * 1024) { setClrFileData(''); setClrError('File stored by name only (over 3 MB).'); return; }
    const reader = new FileReader();
    reader.onload = () => setClrFileData(typeof reader.result === 'string' ? reader.result : '');
    reader.readAsDataURL(file);
  }

  function commit(updater: (a: Application) => Application) {
    setSaving(true);
    setTimeout(() => { onSave(updater(app)); onClose(); }, 300);
  }

  /* ── Confirm onboarding ── */
  if (flow === 'confirm-onboarding') {
    const datesSet = !!app.internshipStartDate && !!app.internshipEndDate;
    const fmt = (iso?: string) => iso ? new Date(iso).toLocaleDateString('en-SG', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
    return (
      <>
        <h2 className="text-headline-sm font-bold text-fg mb-1">Confirm Onboarding</h2>
        <p className="text-body-sm text-fg-muted mb-4">
          Confirm that <strong>{app.name}</strong> has completed onboarding and is now an active intern.
        </p>
        {app.shortlistedFor && (
          <div className="mb-3 px-3 py-2.5 bg-bg-subtle border border-border rounded-xl text-body-sm">
            <span className="text-fg-muted">Project: </span>
            <span className="font-semibold text-fg">{app.suitabilityScores.find(s => s.projectId === app.shortlistedFor)?.projectTitle ?? app.shortlistedFor}</span>
          </div>
        )}
        {app.onboarding ? (
          <div className="mb-3 px-3 py-2.5 bg-success-bg border border-success/20 rounded-xl flex items-start gap-2 text-body-sm">
            <CheckCircle2 size={14} className="text-success shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-fg">Onboarding information submitted</span>
              <span className="text-fg-muted"> · {new Date(app.onboarding.submittedAt).toLocaleDateString('en-SG', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
              <p className="text-fg-muted mt-0.5">
                Emergency contact: {app.onboarding.emergencyName} ({app.onboarding.emergencyRelation})
                {app.onboarding.dietary ? ` · Dietary: ${app.onboarding.dietary}` : ''}
              </p>
            </div>
          </div>
        ) : (
          <div className="mb-3 px-3 py-2.5 bg-warning-bg border border-warning/20 rounded-xl flex items-start gap-2 text-body-sm">
            <AlertCircle size={14} className="text-warning shrink-0 mt-0.5" />
            <span className="text-fg-muted">
              <span className="font-semibold text-fg">Onboarding not yet submitted.</span> The intern hasn&apos;t completed
              their onboarding form — you can still confirm, but they may not have set up allowance and emergency-contact details.
            </span>
          </div>
        )}
        {datesSet ? (
          /* Dates were set when the offer was extended — show read-only for confirmation */
          <div className="mb-5 px-3 py-2.5 bg-bg-subtle border border-border rounded-xl flex items-center justify-between text-body-sm">
            <span className="text-fg-muted">Internship Period</span>
            <span className="font-semibold text-fg">{fmt(app.internshipStartDate)} → {fmt(app.internshipEndDate)}</span>
          </div>
        ) : (
          /* Fallback — dates missing (legacy record); capture them here */
          <div className="space-y-3 mb-5">
            <div>
              <label className="block text-body-sm font-semibold text-fg mb-1">Internship Period <span className="text-danger">*</span></label>
              <DateRangePicker
                start={startDate}
                end={endDate}
                onChange={(start, end) => { setStartDate(start); setEndDate(end); }}
                placeholder="Pick the start and end date"
              />
            </div>
          </div>
        )}
        <div className="flex justify-end gap-2">
          <Button disabled={saving || (!datesSet && (!startDate || !endDate))} onClick={() => commit(a => ({ ...a, status: 'Active Intern', internshipStartDate: datesSet ? a.internshipStartDate : startDate, internshipEndDate: datesSet ? a.internshipEndDate : endDate }))}>
            <PlayCircle size={14} />Confirm Onboarding
          </Button>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
        </div>
      </>
    );
  }

  /* ── Date change review ── */
  if (flow === 'date-change') {
    const req = app.startDateChangeRequest!;
    return (
      <>
        <h2 className="text-headline-sm font-bold text-fg mb-1">Review Start Date Request</h2>
        <p className="text-body-sm text-fg-muted mb-4">{app.name} has requested a start date change.</p>
        <div className="rounded-xl bg-bg-subtle border border-border p-4 mb-5 space-y-2">
          <div>
            <p className="text-[12px] font-bold uppercase tracking-widest text-fg-subtle mb-0.5">Requested Date</p>
            <p className="text-body-sm font-semibold text-fg">{req.requestedDate}</p>
          </div>
          {req.reason && (
            <div>
              <p className="text-[12px] font-bold uppercase tracking-widest text-fg-subtle mb-0.5">Reason</p>
              <p className="text-body-sm text-fg">{req.reason}</p>
            </div>
          )}
        </div>
        <div className="flex justify-end gap-2">
          <Button disabled={saving} onClick={() => commit(a => ({
            ...a,
            status: 'Offer Accepted',
            internshipStartDate: req.requestedDate,
            startDateChangeRequest: undefined,
          }))}>
            Approve & Update Date
          </Button>
          <Button variant="outline" onClick={() => commit(a => ({
            ...a,
            status: 'Offer Accepted',
            startDateChangeRequest: undefined,
          }))}>
            Reject Request
          </Button>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
        </div>
      </>
    );
  }

  /* ── Mark as active ── */
  /* ── Mark as completed ── */
  if (flow === 'exit-clearance') {
    return (
      <>
        <h2 className="text-headline-sm font-bold text-fg mb-1">Exit Clearance</h2>
        <p className="text-body-sm text-fg-muted mb-4">
          Record the completed exit clearance for <strong>{app.name}</strong> (laptop, access pass, accounts, etc.).
          Upload the signed clearance form submitted via FormSG.
        </p>
        <div className="space-y-4 mb-5">
          <div>
            <label className="block text-body-sm font-semibold text-fg mb-1.5">Clearance Attachment <span className="text-danger">*</span></label>
            {clrFileName ? (
              <div className="flex items-center justify-between gap-3 px-3 py-2.5 bg-bg-subtle border border-border rounded-xl">
                <div className="flex items-center gap-2 min-w-0">
                  <FileText size={14} className="text-fg-muted shrink-0" />
                  <span className="text-body-sm text-fg truncate">{clrFileName}</span>
                </div>
                <button onClick={() => { setClrFileName(''); setClrFileData(''); setClrError(''); }}
                  className="text-[12px] font-semibold text-fg-muted hover:text-danger shrink-0">Remove</button>
              </div>
            ) : (
              <label className="flex items-center gap-2 px-3 py-2.5 border border-dashed border-border rounded-xl cursor-pointer hover:border-accent/40 transition-colors">
                <Upload size={14} className="text-fg-muted" />
                <span className="text-body-sm text-fg-muted">Upload PDF or image (FormSG export)</span>
                <input type="file" accept=".pdf,.png,.jpg,.jpeg" className="hidden" onChange={handleClearanceUpload} />
              </label>
            )}
            {clrError && <p className="text-[12px] text-warning mt-1">{clrError}</p>}
          </div>
          <label className="flex items-start gap-2.5 cursor-pointer">
            <input type="checkbox" checked={clrConfirm} onChange={e => setClrConfirm(e.target.checked)}
              className="w-4 h-4 mt-0.5 rounded border-border accent-accent cursor-pointer shrink-0" />
            <span className="text-body-sm text-fg">All exit clearance items have been returned and verified (equipment, access pass, system accounts).</span>
          </label>
        </div>
        <div className="flex justify-end gap-2">
          <Button disabled={saving || !clrFileName || !clrConfirm} onClick={() => commit(a => ({
            ...a,
            exitClearance: { status: 'completed' as const, fileName: clrFileName, fileData: clrFileData || undefined, uploadedAt: today },
          }))}>
            <CheckCircle2 size={14} /> Mark Clearance Complete
          </Button>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
        </div>
      </>
    );
  }

  if (flow === 'mark-completed') {
    const clearanceDone = app.exitClearance?.status === 'completed';
    return (
      <>
        <h2 className="text-headline-sm font-bold text-fg mb-1">Mark as Completed?</h2>
        <p className="text-body-sm text-fg-muted mb-4">
          This will mark <strong>{app.name}</strong>'s internship as completed. You can then issue the Certificate of Completion.
        </p>
        <div className={cn('flex items-center gap-2.5 px-3 py-2.5 rounded-xl border mb-5',
          clearanceDone ? 'bg-success-bg border-success/20' : 'bg-warning-bg border-warning/20')}>
          {clearanceDone
            ? <CheckCircle2 size={15} className="text-success shrink-0" />
            : <AlertTriangle size={15} className="text-warning shrink-0" />}
          <p className="text-body-sm text-fg">
            {clearanceDone
              ? `Exit clearance completed${app.exitClearance?.uploadedAt ? ` on ${app.exitClearance.uploadedAt}` : ''}.`
              : 'Exit clearance is not yet complete. Please complete it before marking the internship as completed.'}
          </p>
        </div>
        <div className="flex justify-end gap-2">
          <Button disabled={saving || !clearanceDone} onClick={() => commit(a => {
            notifyInternCompleted(a);
            return { ...a, status: 'Internship Completed' };
          })}>
            <CheckCircle2 size={14} /> Confirm Completion
          </Button>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
        </div>
      </>
    );
  }

  /* ── Withdrawal ── */
  if (flow === 'withdrawal' || flow === 'forced-withdrawal') {
    const isForced = flow === 'forced-withdrawal';
    return (
      <>
        <h2 className="text-headline-sm font-bold text-fg mb-1">
          {isForced ? 'Submit Forced Withdrawal' : 'Submit Withdrawal Request'}
        </h2>
        <p className="text-body-sm text-fg-muted mb-4">
          {isForced
            ? 'This DSTA-initiated withdrawal will be sent to the Director for approval.'
            : "Submit the intern's withdrawal request to the Director for approval."}
        </p>
        <label className="block mb-1">
          <span className="text-body-sm font-semibold text-fg">Reason</span>
        </label>
        <textarea
          className="w-full h-28 rounded-xl border border-border bg-bg-subtle text-body-sm text-fg p-3 resize-none focus:outline-none focus:ring-1 focus:ring-accent mb-5"
          placeholder="Provide a reason for the withdrawal…"
          value={reason}
          onChange={e => setReason(e.target.value)}
        />
        <div className="flex justify-end gap-2">
          <Button
            variant={isForced ? 'danger' : 'primary'}
            disabled={!reason.trim() || saving}
            onClick={() => commit(a => ({
              ...a,
              terminationRequest: {
                type: isForced ? 'forced' : 'withdrawal',
                reason: reason.trim(),
                status: 'pending',
                submittedDate: today,
              },
            }))}
          >
            Submit to Director
          </Button>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
        </div>
      </>
    );
  }

  /* ── Early completion ── */
  if (flow === 'early-completion') {
    return (
      <>
        <h2 className="text-headline-sm font-bold text-fg mb-1">Submit Early Completion</h2>
        <p className="text-body-sm text-fg-muted mb-4">
          Request Director approval for early internship completion. Ensure the mentor has been consulted.
        </p>
        <label className="block mb-1">
          <span className="text-body-sm font-semibold text-fg">Reason</span>
        </label>
        <textarea
          className="w-full h-28 rounded-xl border border-border bg-bg-subtle text-body-sm text-fg p-3 resize-none focus:outline-none focus:ring-1 focus:ring-accent mb-5"
          placeholder="Provide the reason for early completion…"
          value={reason}
          onChange={e => setReason(e.target.value)}
        />
        <div className="flex justify-end gap-2">
          <Button
            disabled={!reason.trim() || saving}
            onClick={() => commit(a => ({
              ...a,
              earlyCompletionRequest: {
                reason: reason.trim(),
                mentorConfirmed: false,
                status: 'pending',
                submittedDate: today,
              },
            }))}
          >
            Submit to Director
          </Button>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
        </div>
      </>
    );
  }

  /* ── Extension request ── */
  if (flow === 'extension') {
    return (
      <>
        <h2 className="text-headline-sm font-bold text-fg mb-1">Submit Extension Request</h2>
        <p className="text-body-sm text-fg-muted mb-4">
          Request Director approval to extend {app.name}'s internship beyond the original end date.
        </p>
        <div className="mb-4">
          <p className="text-body-sm font-semibold text-fg mb-1">New End Date</p>
          <DatePicker value={newDate} onChange={setNewDate} placeholder="Select new end date" />
        </div>
        <label className="block mb-1">
          <span className="text-body-sm font-semibold text-fg">Reason</span>
        </label>
        <textarea
          className="w-full h-24 rounded-xl border border-border bg-bg-subtle text-body-sm text-fg p-3 resize-none focus:outline-none focus:ring-1 focus:ring-accent mb-5"
          placeholder="Provide the reason for extending the internship…"
          value={reason}
          onChange={e => setReason(e.target.value)}
        />
        <div className="flex justify-end gap-2">
          <Button
            disabled={!newDate || !reason.trim() || saving}
            onClick={() => commit(a => ({
              ...a,
              extensionRequest: {
                newEndDate: newDate,
                reason: reason.trim(),
                status: 'pending',
                submittedDate: today,
              },
            }))}
          >
            Submit to Director
          </Button>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
        </div>
      </>
    );
  }

  return null;
}

/* ── Action item helper ────────────────────────────────────────────────── */
function ActionItem({
  icon, label, sub, onClick, danger = false,
}: {
  icon: React.ReactNode;
  label: string;
  sub?: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-start gap-3 px-3 py-2.5 rounded-xl text-left transition-colors',
        danger
          ? 'hover:bg-danger-bg/60 text-danger'
          : 'hover:bg-bg-subtle text-fg'
      )}
    >
      <span className="mt-0.5 shrink-0">{icon}</span>
      <div>
        <p className={cn('text-body-sm font-semibold', danger ? 'text-danger' : 'text-fg')}>{label}</p>
        {sub && <p className="text-body-sm text-fg-muted">{sub}</p>}
      </div>
    </button>
  );
}

/* ── Status col-header filter dropdown ────────────────────────────────── */
function StatusFilterDropdown({
  selected, onApply, onClose, pos,
}: {
  selected: string[];
  onApply: (v: string[]) => void;
  onClose: () => void;
  pos: { top: number; left: number };
}) {
  const [draft, setDraft] = useState<string[]>(selected);
  useEffect(() => {
    function handler(e: MouseEvent) {
      const el = document.getElementById('status-filter-drop');
      if (el && !el.contains(e.target as Node)) onClose();
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);
  return (
    <div
      id="status-filter-drop"
      style={{ position: 'fixed', top: pos.top, left: pos.left, zIndex: 9999, minWidth: 180 }}
      className="bg-surface border border-border rounded-xl shadow-xl overflow-hidden"
      onClick={e => e.stopPropagation()}
    >
      <div className="p-3 space-y-0.5">
        {STATUS_FILTER_OPTIONS.map(opt => (
          <label key={opt} className="flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer hover:bg-bg-subtle">
            <input
              type="checkbox"
              checked={draft.includes(opt)}
              onChange={() => setDraft(d => d.includes(opt) ? d.filter(x => x !== opt) : [...d, opt])}
              className="w-4 h-4 accent-accent rounded border-border shrink-0"
            />
            <span className="text-body-sm text-fg">{opt}</span>
          </label>
        ))}
      </div>
      <div className="flex items-center justify-between px-3 py-2 border-t border-border bg-bg-subtle">
        <button onClick={() => { onApply([]); onClose(); }} className="text-body-sm text-fg-muted hover:text-fg transition-colors">Clear</button>
        <button onClick={() => { onApply(draft); onClose(); }} className="text-body-sm font-semibold text-accent hover:opacity-80 transition-opacity">Apply</button>
      </div>
    </div>
  );
}

/* ── Main view ─────────────────────────────────────────────────────────── */
export default function InternsPage() {
  const { role } = useRole();
  const router   = useRouter();
  const { activeProg: globalProg, setActiveProg: setGlobalProg, progOpts } = useProgramme();

  const [apps,        setApps]        = useState<Application[]>([]);
  const [projects,    setProjects]    = useState<ProjectEntry[]>([]);
  const [tab,         setTab]         = useState<TabKey>('all');
  const [search,      setSearch]      = useState('');
  const [sortCol,     setSortCol]     = useState<string | null>(null);
  const [sortDir,     setSortDir]     = useState<1|-1>(1);
  const [activeProg,  setActiveProg]  = useState('all');
  const [statusColFilter, setStatusColFilter] = useState<string[]>([]);
  const [statusFilterOpen, setStatusFilterOpen] = useState(false);
  const [statusFilterPos,  setStatusFilterPos]  = useState({ top: 0, left: 0 });
  // Dropdown state
  const [menuAppId,   setMenuAppId]   = useState<string | null>(null);
  const [menuPos,     setMenuPos]     = useState({ top: 0, right: 0 });
  // Flow modal state
  const [flowApp,     setFlowApp]     = useState<Application | null>(null);
  const [flowType,    setFlowType]    = useState<ActionFlow | null>(null);
  // Welcome letter viewer
  const [letterApp,   setLetterApp]   = useState<Application | null>(null);
  // Certificate viewer
  const [certApp,     setCertApp]     = useState<Application | null>(null);


  useEffect(() => {
    if (role !== 'io-admin' && role !== 'io') { router.replace('/dashboard'); return; }
    const loaded = loadApps();
    const today  = new Date().toISOString().split('T')[0];
    const { welcomeLetterDaysBefore, cocDaysAfterCompletion } = loadAutomationSettings();

    const processed = loaded.map(a => {
      let u = { ...a };

      // Auto-activate when start date has passed
      if (u.status === 'Offer Accepted' && u.internshipStartDate && u.internshipStartDate <= today)
        u = { ...u, status: 'Active Intern' as const };

      // Auto-complete when end date has passed
      if (u.status === 'Active Intern' && u.internshipEndDate && u.internshipEndDate < today) {
        u = { ...u, status: 'Internship Completed' as const };
        notifyInternCompleted(u);
      }

      // Auto-send welcome letter when within configured working days of start date
      if (!u.welcomeLetterSent && (u.status === 'Offer Accepted' || u.status === 'Active Intern') &&
          u.internshipStartDate && workingDaysUntil(u.internshipStartDate) <= welcomeLetterDaysBefore)
        u = { ...u, welcomeLetterSent: true, welcomeLetterSentDate: today };

      // Auto-issue CoC when configured working days have passed since end date —
      // uses the default certificate style set in Templates → Certificates
      if (!u.cocSent && u.status === 'Internship Completed' && u.internshipEndDate &&
          workingDaysSince(u.internshipEndDate) >= cocDaysAfterCompletion)
        u = { ...u, cocSent: true, cocSentDate: today, cocStyle: loadActiveCertStyle() };

      return u;
    });

    const changed = processed.some((a, i) =>
      a.status !== loaded[i].status ||
      a.welcomeLetterSent !== loaded[i].welcomeLetterSent ||
      a.cocSent !== loaded[i].cocSent
    );
    if (changed) saveApps(processed);
    setApps(processed);
    setProjects(loadProjects());
  }, [role, router]);

  function openMenu(e: React.MouseEvent, appId: string) {
    e.stopPropagation();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setMenuPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right });
    setMenuAppId(appId);
  }

  function closeMenu() { setMenuAppId(null); }

  function openFlow(app: Application, flow: ActionFlow) {
    closeMenu();
    setFlowApp(app);
    setFlowType(flow);
  }

  function closeFlow() { setFlowApp(null); setFlowType(null); }

  function handleProgChange(v: string) {
    setActiveProg(v);
    setGlobalProg(v);
  }

  function doSort(col: string) {
    if (sortCol === col) setSortDir(d => d === 1 ? -1 : 1);
    else { setSortCol(col); setSortDir(1); }
  }

  const handleSave = useCallback((updated: Application) => {
    setApps(prev => {
      const next = prev.map(a => a.id === updated.id ? updated : a);
      saveApps(next);
      return next;
    });
  }, []);

  const projMap = useMemo(() => Object.fromEntries(projects.map(p => [p.id, p])), [projects]);

  const interns = useMemo(() =>
    apps.filter(a => INTERN_STATUSES.has(a.status)),
    [apps]
  );

  const filtered = useMemo(() => {
    let list = interns;
    const q = search.trim().toLowerCase();

    // Tab filter is skipped when searching so results span all buckets
    if (!q && tab !== 'all') list = list.filter(a => STATUS_CONFIG[a.status]?.tab === tab);
    if (activeProg !== 'all') list = list.filter(a => a.programmeId === activeProg);

    if (statusColFilter.length > 0)
      list = list.filter(a => statusColFilter.some(opt => STATUS_FILTER_TAB[opt] === STATUS_CONFIG[a.status]?.tab));

    if (q) {
      list = list.filter(a =>
        a.name.toLowerCase().includes(q) ||
        a.programmeName.toLowerCase().includes(q) ||
        (projMap[a.shortlistedFor ?? '']?.title ?? '').toLowerCase().includes(q)
      );
    }

    if (sortCol) {
      list = [...list].sort((a, b) => {
        let va: string | number = '';
        let vb: string | number = '';
        if (sortCol === 'name')    { va = a.name;    vb = b.name; }
        if (sortCol === 'project') { va = projMap[a.shortlistedFor ?? '']?.title ?? ''; vb = projMap[b.shortlistedFor ?? '']?.title ?? ''; }
        if (sortCol === 'mentor')  { va = projMap[a.shortlistedFor ?? '']?.mentor ?? ''; vb = projMap[b.shortlistedFor ?? '']?.mentor ?? ''; }
        if (sortCol === 'status')  { va = STATUS_SORT[STATUS_CONFIG[a.status]?.tab ?? ''] ?? 99; vb = STATUS_SORT[STATUS_CONFIG[b.status]?.tab ?? ''] ?? 99; }
        if (sortCol === 'startDate') { va = a.internshipStartDate ?? ''; vb = b.internshipStartDate ?? ''; }
        if (sortCol === 'welcomeLetter') { va = a.welcomeLetterSentDate ?? ''; vb = b.welcomeLetterSentDate ?? ''; }
        if (sortCol === 'certificate')   { va = a.cocSentDate ?? ''; vb = b.cocSentDate ?? ''; }
        if (sortCol === 'exitClearance') { va = a.exitClearance?.uploadedAt ?? ''; vb = b.exitClearance?.uploadedAt ?? ''; }
        if (typeof va === 'string') return va.localeCompare(vb as string) * sortDir;
        return ((va as number) - (vb as number)) * sortDir;
      });
    }

    return list;
  }, [interns, tab, activeProg, statusColFilter, search, projMap, sortCol, sortDir]);

  const counts = useMemo(() => {
    const base = activeProg === 'all' ? interns : interns.filter(a => a.programmeId === activeProg);
    return {
      all:       base.length,
      upcoming:  base.filter(a => STATUS_CONFIG[a.status]?.tab === 'upcoming').length,
      active:    base.filter(a => STATUS_CONFIG[a.status]?.tab === 'active').length,
      completed: base.filter(a => STATUS_CONFIG[a.status]?.tab === 'completed').length,
    };
  }, [interns, activeProg]);

  if (role !== 'io-admin' && role !== 'io') return null;

  return (
    <Shell activeRoute="/interns">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <Users2 size={22} className="text-accent" />
          <h1 className="text-headline-lg text-fg">Interns</h1>
        </div>
      </div>

      {/* Programme toggle */}
      <div className="mb-5">
        <ProgToggle options={[{ value: 'all', label: 'All Interns' }, ...progOpts]} value={activeProg} onChange={handleProgChange} />
      </div>

      {/* Table card */}
      <div className="card">
        {/* Search + filters at the top */}
        <TableToolbar
          search={search} onSearch={setSearch} placeholder="Search by name or project…"
        />

        {/* Tabs */}
        <div className="border-b border-border px-3 py-3 overflow-x-auto">
          <TabBar
            ariaLabel="Intern phase"
            value={tab}
            onChange={(k) => setTab(k as TabKey)}
            tabs={TABS.map(t => ({ key: t.key, label: t.label, count: counts[t.key] }))}
          />
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-bg-subtle border-b border-border">
              <tr>
                <SortTh col="name"    label="Name"    sortCol={sortCol} sortDir={sortDir} onSort={doSort} />
                <SortTh col="project" label="Project" sortCol={sortCol} sortDir={sortDir} onSort={doSort} />
                <SortTh col="mentor"    label="Mentor"     sortCol={sortCol} sortDir={sortDir} onSort={doSort} />
                <SortTh col="startDate" label="Start Date" sortCol={sortCol} sortDir={sortDir} onSort={doSort} />
                {tab === 'upcoming'  && <SortTh col="welcomeLetter" label="Welcome Letter" sortCol={sortCol} sortDir={sortDir} onSort={doSort} />}
                {tab === 'active'    && <SortTh col="exitClearance" label="Exit Clearance" sortCol={sortCol} sortDir={sortDir} onSort={doSort} />}
                {tab === 'completed' && <SortTh col="certificate"   label="Certificate"    sortCol={sortCol} sortDir={sortDir} onSort={doSort} />}
                <th className={cn('px-4 py-3 text-table-header tracking-wider select-none', sortCol === 'status' ? 'text-accent' : 'text-fg')}>
                  <span className="flex items-center gap-1">
                    <button onClick={() => doSort('status')} className="flex items-center gap-1.5 hover:opacity-80 transition-opacity">
                      Status
                    </button>
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
                        setStatusFilterPos({ top: r.bottom + 4, left: r.left });
                        setStatusFilterOpen(v => !v);
                      }}
                      className={cn('p-0.5 rounded transition-colors ml-0.5', statusColFilter.length > 0 ? 'text-accent bg-accent/10' : 'text-fg-subtle hover:text-fg hover:bg-bg-muted')}
                    >
                      <Filter size={11} />
                    </button>
                  </span>
                </th>
                <th className="px-4 py-3 w-10" />
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={(tab === 'upcoming' || tab === 'completed' || tab === 'active') ? 7 : 6} className="px-4 py-12 text-center text-body-sm text-fg-muted">
                    {search || activeProg !== 'all' ? 'No interns match your filter.' : 'No interns in this category yet.'}
                  </td>
                </tr>
              ) : filtered.map(app => {
                const proj   = projMap[app.shortlistedFor ?? ''];
                const cfg    = STATUS_CONFIG[app.status];
                const badges = pendingBadges(app);
                return (
                  <tr
                    key={app.id}
                    onClick={() => router.push(`/candidate360/${app.id}?from=interns`)}
                    className="border-b border-border hover:bg-bg-subtle/50 cursor-pointer group"
                  >
                    <td className="px-4 py-3">
                      <p className="text-body-md text-fg font-medium">{app.name}</p>
                      {badges.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {badges.map(b => (
                            <span key={b} className="inline-flex items-center px-2 py-0.5 rounded-full text-[12px] font-semibold bg-warning-bg text-warning border border-warning/20">
                              {b}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {proj ? (
                        <div>
                          <p className="text-body-sm text-fg">{proj.title}</p>
                        </div>
                      ) : (
                        <span className="text-body-sm text-fg-muted">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-body-sm text-fg-muted">
                      {proj?.mentor ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-body-sm text-fg">
                      {app.internshipStartDate
                        ? new Date(app.internshipStartDate).toLocaleDateString('en-SG', { day: 'numeric', month: 'short', year: 'numeric' })
                        : <span className="text-fg-muted">—</span>}
                    </td>
                    {tab === 'upcoming' && (
                      <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                        {app.welcomeLetterSent ? (
                          <div className="flex items-center gap-2">
                            <span className="inline-flex items-center gap-1.5 text-body-sm text-success">
                              <CheckCircle2 size={13} className="shrink-0" />
                              {app.welcomeLetterSentDate
                                ? new Date(app.welcomeLetterSentDate).toLocaleDateString('en-SG', { day: 'numeric', month: 'short', year: 'numeric' })
                                : 'Sent'}
                            </span>
                            {app.welcomeLetterBody && (
                              <button onClick={() => setLetterApp(app)}
                                className="text-[12px] font-semibold text-accent hover:underline">View</button>
                            )}
                          </div>
                        ) : (
                          <span className="text-body-sm text-fg-muted">Not sent</span>
                        )}
                      </td>
                    )}
                    {tab === 'active' && (
                      <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                        {app.exitClearance?.status === 'completed' ? (
                          <div className="flex items-center gap-2">
                            <span className="inline-flex items-center gap-1.5 text-body-sm text-success">
                              <CheckCircle2 size={13} className="shrink-0" />
                              {app.exitClearance.uploadedAt
                                ? new Date(app.exitClearance.uploadedAt).toLocaleDateString('en-SG', { day: 'numeric', month: 'short', year: 'numeric' })
                                : 'Cleared'}
                            </span>
                            {app.exitClearance.fileData
                              ? <a href={app.exitClearance.fileData} target="_blank" rel="noopener noreferrer" download={app.exitClearance.fileName}
                                  className="text-[12px] font-semibold text-accent hover:underline">View</a>
                              : app.exitClearance.fileName && <span className="text-[12px] text-fg-subtle truncate max-w-[120px]">{app.exitClearance.fileName}</span>}
                          </div>
                        ) : (
                          <button onClick={() => openFlow(app, 'exit-clearance')}
                            className="inline-flex items-center gap-1.5 text-body-sm font-semibold text-accent hover:underline">
                            <Upload size={12} /> Record
                          </button>
                        )}
                      </td>
                    )}
                    {tab === 'completed' && (
                      <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                        {app.cocSent ? (
                          <div className="flex items-center gap-2">
                            <span className="inline-flex items-center gap-1.5 text-body-sm text-success">
                              <CheckCircle2 size={13} className="shrink-0" />
                              {app.cocSentDate
                                ? new Date(app.cocSentDate).toLocaleDateString('en-SG', { day: 'numeric', month: 'short', year: 'numeric' })
                                : 'Sent'}
                            </span>
                            <button onClick={() => setCertApp(app)}
                              className="text-[12px] font-semibold text-accent hover:underline">View</button>
                          </div>
                        ) : (
                          <span className="text-body-sm text-fg-muted">Not sent</span>
                        )}
                      </td>
                    )}
                    <td className="px-4 py-3">
                      {cfg && (
                        <span className={cn(
                          'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[13px] font-semibold border',
                          cfg.color
                        )}>
                          <span className={cn('w-1.5 h-1.5 rounded-full', cfg.dot)} />
                          {cfg.label}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                      <RowMenuButton onClick={e => openMenu(e, app.id)} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filtered.length > 0 && (
          <div className="px-4 py-3 border-t border-border">
            <p className="text-body-sm text-fg-muted">
              Showing {filtered.length} {filtered.length === 1 ? 'intern' : 'interns'}
            </p>
          </div>
        )}
      </div>

      {/* Dropdown backdrop */}
      {menuAppId && (
        <div className="fixed inset-0 z-[150]" onClick={closeMenu} />
      )}

      {/* Dropdown menu */}
      {menuAppId && (() => {
        const a = apps.find(x => x.id === menuAppId);
        if (!a) return null;
        const s             = a.status;
        const isUpcoming    = s === 'Offer Accepted' || s === 'Date Change Requested';
        const isActive      = s === 'Active Intern';
        const isCompleted   = s === 'Internship Completed';
        const hasDateReq    = s === 'Date Change Requested' && !!a.startDateChangeRequest;
        const termApproved  = a.terminationRequest?.status === 'approved' && isActive;
        const earlyApproved = a.earlyCompletionRequest?.status === 'approved' && isActive;
        const extApproved   = a.extensionRequest?.status === 'approved';
        const anyPending    = a.terminationRequest?.status === 'pending' ||
                              a.earlyCompletionRequest?.status === 'pending' ||
                              a.extensionRequest?.status === 'pending';
        const hasActions    = isUpcoming || isActive || isCompleted || termApproved || earlyApproved || extApproved;
        return (
          <RowDropdown pos={menuPos} onClose={closeMenu} width="w-60">
            {termApproved  && <DropdownItem icon={<UserX size={14} className="text-danger" />}      label="Mark as Withdrawn"       danger onClick={() => { closeMenu(); handleSave({ ...a, status: 'Withdrawn' }); }} />}
            {earlyApproved && <DropdownItem icon={<CheckCircle2 size={14} className="text-success" />} label="Confirm Early Completion" onClick={() => { closeMenu(); notifyInternCompleted(a); handleSave({ ...a, status: 'Internship Completed' }); }} />}
            {extApproved   && <DropdownItem icon={<CalendarPlus size={14} className="text-accent" />}  label={`Apply Extension → ${a.extensionRequest!.newEndDate}`} onClick={() => { closeMenu(); handleSave({ ...a, internshipEndDate: a.extensionRequest!.newEndDate, extensionRequest: undefined }); }} />}
            {(termApproved || earlyApproved || extApproved) && <DropdownDivider />}

            {isUpcoming && !hasDateReq && <DropdownItem icon={<PlayCircle size={14} className="text-success" />}     label="Confirm Onboarding"          onClick={() => openFlow(a, 'confirm-onboarding')} />}
            {hasDateReq                 && <DropdownItem icon={<CalendarClock size={14} className="text-warning" />}  label="Review Start Date Request"   onClick={() => openFlow(a, 'date-change')} />}
            {isUpcoming && <DropdownItem icon={<Mail size={14} className="text-fg-muted" />} label={a.welcomeLetterSent ? 'Re-send Welcome Letter' : 'Send Welcome Letter'} onClick={() => { closeMenu(); router.push(`/welcome-letter?appId=${a.id}`); }} />}

            {isActive && !anyPending && <DropdownItem icon={<ShieldCheck size={14} className="text-fg-muted" />} label={a.exitClearance?.status === 'completed' ? 'Update Exit Clearance' : 'Record Exit Clearance'} onClick={() => openFlow(a, 'exit-clearance')} />}
            {isActive && !anyPending && <DropdownItem icon={<CheckCircle2 size={14} className="text-fg-muted" />} label="Mark as Completed"         onClick={() => openFlow(a, 'mark-completed')} />}
            {isActive && !anyPending && <DropdownDivider />}
            {isActive && !anyPending && <DropdownItem icon={<LogOut size={14} className="text-warning" />}        label="Submit Withdrawal"         onClick={() => openFlow(a, 'withdrawal')} />}
            {isActive && !anyPending && <DropdownItem icon={<UserX size={14} className="text-fg-muted" />}        label="Submit Forced Withdrawal"  onClick={() => openFlow(a, 'forced-withdrawal')} />}

            {isCompleted && <DropdownItem icon={<Award size={14} className="text-accent" />} label={a.cocSent ? 'Re-send Certificate' : 'Send Certificate of Completion'} onClick={() => { closeMenu(); router.push(`/certificate?appId=${a.id}`); }} />}

            {!hasActions && <div className="px-4 py-2.5 text-[13px] text-fg-muted">No actions available</div>}
          </RowDropdown>
        );
      })()}

      {/* Status col-header filter */}
      {statusFilterOpen && (
        <StatusFilterDropdown
          selected={statusColFilter}
          onApply={setStatusColFilter}
          onClose={() => setStatusFilterOpen(false)}
          pos={statusFilterPos}
        />
      )}

      {/* Flow modal */}
      {flowApp && flowType && (
        <Modal open onClose={closeFlow} ariaLabel="Intern action">
          <InternActionsModal
            app={flowApp}
            flow={flowType}
            onClose={closeFlow}
            onSave={updated => { handleSave(updated); closeFlow(); }}
          />
        </Modal>
      )}

      {/* Welcome letter viewer */}
      {letterApp && (
        <Modal open onClose={() => setLetterApp(null)} maxWidth="md" labelledBy="welcome-letter-title">
          <div className="mb-4">
            <h2 id="welcome-letter-title" className="text-headline-sm font-bold text-fg">Welcome Letter</h2>
            <p className="text-body-sm text-fg-muted mt-0.5">
              {letterApp.name} · {letterApp.programmeName}
              {letterApp.welcomeLetterSentDate && ` · Sent ${new Date(letterApp.welcomeLetterSentDate).toLocaleDateString('en-SG', { day: 'numeric', month: 'short', year: 'numeric' })}`}
            </p>
          </div>
          <div className="bg-bg-subtle border border-border rounded-xl px-5 py-4 max-h-[60vh] overflow-y-auto">
            <pre className="text-body-sm text-fg whitespace-pre-wrap font-sans leading-relaxed">{letterApp.welcomeLetterBody}</pre>
          </div>
          <div className="flex justify-end mt-4">
            <Button variant="ghost" onClick={() => setLetterApp(null)}>Close</Button>
          </div>
        </Modal>
      )}

      {/* Certificate viewer */}
      {certApp && (
        <Modal open onClose={() => setCertApp(null)} maxWidth="lg" labelledBy="certificate-title">
          <div className="mb-4">
            <h2 id="certificate-title" className="text-headline-sm font-bold text-fg">Certificate of Completion</h2>
            <p className="text-body-sm text-fg-muted mt-0.5">
              {certApp.name} · {certApp.programmeName}
              {certApp.cocSentDate && ` · Issued ${new Date(certApp.cocSentDate).toLocaleDateString('en-SG', { day: 'numeric', month: 'short', year: 'numeric' })}`}
            </p>
          </div>
          <div className="max-h-[64vh] overflow-y-auto">
            <CertificatePreview
              app={certApp}
              project={projMap[certApp.shortlistedFor ?? ''] ?? null}
              style={(certApp.cocStyle ?? 'classic') as CertStyle}
              issueDateIso={certApp.cocSentDate}
            />
          </div>
          <div className="flex justify-end mt-4">
            <Button variant="ghost" onClick={() => setCertApp(null)}>Close</Button>
          </div>
        </Modal>
      )}
    </Shell>
  );
}
