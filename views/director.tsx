'use client';

import { useState, useEffect, useMemo } from 'react';
import Shell from '@/components/layout/shell';
import Modal from '@/components/ui-legacy/modal';
import Button from '@/components/ui-legacy/button';
import {
  ShieldCheck, UserX, UserMinus, CalendarCheck, CalendarPlus,
  CheckCircle2, XCircle, Clock, ChevronRight, AlertCircle, Eye,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Application } from '@/lib/types';
import allAppsSeed from '@/data/applications.json';
import { addNotification } from '@/lib/notifications';

/* ── Storage ───────────────────────────────────────────────────────────────── */
const APP_KEY      = 'dsta_applications';
const APP_VER_KEY  = 'dsta_applications_seed_v';
const APP_SEED_VER = '31';

function loadApps(): Application[] {
  try {
    const ver = localStorage.getItem(APP_VER_KEY);
    const raw = localStorage.getItem(APP_KEY);
    if (ver === APP_SEED_VER && raw) return JSON.parse(raw) as Application[];
    const existing: Application[] = raw ? JSON.parse(raw) : [];
    const seedArr = allAppsSeed as Application[];
    const eIds = new Set(existing.map((a: Application) => a.id));
    const merged = [...existing, ...seedArr.filter((a: Application) => !eIds.has(a.id))];
    localStorage.setItem(APP_KEY, JSON.stringify(merged));
    localStorage.setItem(APP_VER_KEY, APP_SEED_VER);
    return merged;
  } catch { return allAppsSeed as Application[]; }
}

function saveApps(apps: Application[]) {
  localStorage.setItem(APP_KEY, JSON.stringify(apps));
  localStorage.setItem(APP_VER_KEY, APP_SEED_VER);
}

/* ── Request type config ───────────────────────────────────────────────────── */
type RequestKind = 'termination' | 'forced' | 'early-completion' | 'extension';

interface PendingRequest {
  app:     Application;
  kind:    RequestKind;
  reason:  string;
  detail?: string; // new end date for extensions
}

function getKindConfig(kind: RequestKind) {
  return {
    'termination':     { label: 'Withdrawal',         Icon: UserMinus,    cls: 'bg-warning-bg text-warning'  },
    'forced':          { label: 'Forced Withdrawal',   Icon: UserX,        cls: 'bg-danger-bg text-danger'    },
    'early-completion':{ label: 'Early Completion',    Icon: CalendarCheck,cls: 'bg-info-bg text-info'        },
    'extension':       { label: 'Extension Request',   Icon: CalendarPlus, cls: 'bg-accent/10 text-accent'    },
  }[kind];
}

/* ── Request card ──────────────────────────────────────────────────────────── */
function RequestCard({
  req,
  onApprove,
  onReject,
}: {
  req: PendingRequest;
  onApprove: (remark: string) => void;
  onReject:  (remark: string) => void;
}) {
  const [approveOpen, setApproveOpen] = useState(false);
  const [rejectOpen,  setRejectOpen]  = useState(false);
  const [remark,      setRemark]      = useState('');
  const cfg = getKindConfig(req.kind);

  function handleApprove() { onApprove(remark); setApproveOpen(false); setRemark(''); }
  function handleReject()  { onReject(remark);  setRejectOpen(false);  setRemark(''); }

  return (
    <div className="rounded-2xl border border-border bg-surface overflow-hidden">
      <div className="px-5 py-4 border-b border-border bg-bg-subtle flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={cn('inline-flex items-center gap-1.5 text-[13px] font-semibold px-2.5 py-1 rounded-full', cfg.cls)}>
              <cfg.Icon size={11} />
              {cfg.label}
            </span>
          </div>
          <p className="text-headline-sm font-bold text-fg truncate">{req.app.name}</p>
          <p className="text-body-sm text-fg-muted">{req.app.email} · {req.app.school}</p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0 mt-1">
          <Clock size={12} className="text-warning" />
          <span className="text-[13px] font-semibold text-warning">Pending</span>
        </div>
      </div>

      <div className="px-5 py-4 space-y-3">
        <div>
          <p className="text-[12px] font-bold uppercase tracking-widest text-fg-subtle mb-1">Reason</p>
          <p className="text-body-sm text-fg">{req.reason}</p>
        </div>
        {req.detail && (
          <div>
            <p className="text-[12px] font-bold uppercase tracking-widest text-fg-subtle mb-1">
              {req.kind === 'extension' ? 'Requested New End Date' : 'Details'}
            </p>
            <p className="text-body-sm text-fg">{req.detail}</p>
          </div>
        )}
        {req.app.internshipStartDate && (
          <div className="flex gap-6">
            <div>
              <p className="text-[12px] font-bold uppercase tracking-widest text-fg-subtle mb-1">Start Date</p>
              <p className="text-body-sm text-fg">{req.app.internshipStartDate}</p>
            </div>
            {req.app.internshipEndDate && (
              <div>
                <p className="text-[12px] font-bold uppercase tracking-widest text-fg-subtle mb-1">End Date</p>
                <p className="text-body-sm text-fg">{req.app.internshipEndDate}</p>
              </div>
            )}
          </div>
        )}

        <div className="flex gap-2 pt-1">
          <Button
            variant="outline"
            className="flex-1 text-danger border-danger/30 hover:bg-danger-bg"
            onClick={() => { setRemark(''); setRejectOpen(true); }}
          >
            <XCircle size={14} /> Reject
          </Button>
          <Button className="flex-1" onClick={() => { setRemark(''); setApproveOpen(true); }}>
            <CheckCircle2 size={14} /> Approve
          </Button>
        </div>
      </div>

      {/* Approve modal */}
      <Modal open={approveOpen} onClose={() => setApproveOpen(false)} labelledBy="director-approve-title">
        <div className="flex items-center gap-2 mb-1">
          <CheckCircle2 size={18} className="text-success" />
          <h2 id="director-approve-title" className="text-headline-sm font-bold text-fg">Approve {cfg.label}?</h2>
        </div>
        <p className="text-body-sm text-fg-muted mb-4">
          This will approve the {cfg.label.toLowerCase()} request for <span className="font-semibold text-fg">{req.app.name}</span>. The IO will be notified to proceed.
        </p>
        <label className="block text-[13px] font-bold uppercase tracking-widest text-fg-subtle mb-1.5">Director Remark (optional)</label>
        <textarea
          className="w-full rounded-xl border border-border bg-bg-subtle px-3 py-2 text-body-sm text-fg resize-none focus:outline-none focus:ring-2 focus:ring-accent/40 mb-4"
          rows={3}
          placeholder="Add a remark for the IO..."
          value={remark}
          onChange={e => setRemark(e.target.value)}
        />
        <div className="flex justify-end gap-2">
          <Button onClick={handleApprove}><CheckCircle2 size={14} /> Confirm Approval</Button>
          <Button variant="ghost" onClick={() => setApproveOpen(false)}>Cancel</Button>
        </div>
      </Modal>

      {/* Reject modal */}
      <Modal open={rejectOpen} onClose={() => setRejectOpen(false)} labelledBy="director-reject-title">
        <div className="flex items-center gap-2 mb-1">
          <XCircle size={18} className="text-danger" />
          <h2 id="director-reject-title" className="text-headline-sm font-bold text-fg">Reject {cfg.label}?</h2>
        </div>
        <p className="text-body-sm text-fg-muted mb-4">
          This will reject the request for <span className="font-semibold text-fg">{req.app.name}</span>. The IO will be notified.
        </p>
        <label className="block text-[13px] font-bold uppercase tracking-widest text-fg-subtle mb-1.5">Reason for Rejection <span className="text-danger">*</span></label>
        <textarea
          className="w-full rounded-xl border border-border bg-bg-subtle px-3 py-2 text-body-sm text-fg resize-none focus:outline-none focus:ring-2 focus:ring-accent/40 mb-4"
          rows={3}
          placeholder="Provide a reason..."
          value={remark}
          onChange={e => setRemark(e.target.value)}
        />
        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            className="text-danger border-danger/30 hover:bg-danger-bg"
            disabled={!remark.trim()}
            onClick={handleReject}
          >
            <XCircle size={14} /> Confirm Rejection
          </Button>
          <Button variant="ghost" onClick={() => setRejectOpen(false)}>Cancel</Button>
        </div>
      </Modal>
    </div>
  );
}

/* ── Main page ─────────────────────────────────────────────────────────────── */
export default function DirectorApprovals() {
  const [apps, setApps] = useState<Application[]>([]);

  useEffect(() => { setApps(loadApps()); }, []);

  const pending = useMemo<PendingRequest[]>(() => {
    const result: PendingRequest[] = [];
    for (const app of apps) {
      if (app.terminationRequest?.status === 'pending') {
        result.push({
          app,
          kind:   app.terminationRequest.type === 'forced' ? 'forced' : 'termination',
          reason: app.terminationRequest.reason,
        });
      }
      if (app.earlyCompletionRequest?.status === 'pending') {
        result.push({
          app,
          kind:   'early-completion',
          reason: app.earlyCompletionRequest.reason,
        });
      }
      if (app.extensionRequest?.status === 'pending') {
        result.push({
          app,
          kind:   'extension',
          reason: app.extensionRequest.reason,
          detail: app.extensionRequest.newEndDate,
        });
      }
    }
    return result;
  }, [apps]);

  // AUG-023 — governance oversight: surface where an IO exercised discretion
  // (eligibility / AI-match overrides). Read-only; transparency, not approval.
  const overrides = useMemo(() => {
    const rows: { app: Application; type: string; by: string; date: string; reason: string }[] = [];
    for (const app of apps) {
      if (app.eligibilityOverride)
        rows.push({ app, type: 'Eligibility override', by: app.eligibilityOverride.by, date: app.eligibilityOverride.date, reason: app.eligibilityOverride.reason });
      if (app.matchOverride)
        rows.push({ app, type: 'AI-match override', by: app.matchOverride.by, date: app.matchOverride.date, reason: app.matchOverride.reason });
    }
    return rows.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  }, [apps]);

  function saveDecision(appId: string, updater: (a: Application) => Application, remark: string) {
    const today = new Date().toISOString().split('T')[0];
    const updated = apps.map(a => {
      if (a.id !== appId) return a;
      const next = updater({ ...a });
      // stamp directorRemark and decidedDate on whichever request was active
      if (next.terminationRequest && next.terminationRequest.status !== 'pending')
        next.terminationRequest = { ...next.terminationRequest, directorRemark: remark || undefined, decidedDate: today };
      if (next.earlyCompletionRequest && next.earlyCompletionRequest.status !== 'pending')
        next.earlyCompletionRequest = { ...next.earlyCompletionRequest, directorRemark: remark || undefined, decidedDate: today };
      if (next.extensionRequest && next.extensionRequest.status !== 'pending')
        next.extensionRequest = { ...next.extensionRequest, directorRemark: remark || undefined, decidedDate: today };
      return next;
    });
    saveApps(updated);
    setApps(updated);
  }

  function approve(req: PendingRequest, remark: string) {
    saveDecision(req.app.id, a => {
      if (req.kind === 'termination') return { ...a, terminationRequest: { ...a.terminationRequest!, status: 'approved' } };
      if (req.kind === 'forced')       return { ...a, terminationRequest: { ...a.terminationRequest!, status: 'approved' } };
      if (req.kind === 'early-completion') return { ...a, earlyCompletionRequest: { ...a.earlyCompletionRequest!, status: 'approved' } };
      if (req.kind === 'extension')    return { ...a, extensionRequest: { ...a.extensionRequest!, status: 'approved' } };
      return a;
    }, remark);
    const cfg = getKindConfig(req.kind);
    addNotification({ forRole: 'io', title: `Director approved: ${cfg.label} — ${req.app.name}`, body: `The Director has approved the ${cfg.label.toLowerCase()} request for ${req.app.name}.${remark ? ` Remark: "${remark}"` : ''}`, href: '/interns', tier: 'action' });
  }

  function reject(req: PendingRequest, remark: string) {
    saveDecision(req.app.id, a => {
      if (req.kind === 'termination') return { ...a, terminationRequest: { ...a.terminationRequest!, status: 'rejected' } };
      if (req.kind === 'forced')       return { ...a, terminationRequest: { ...a.terminationRequest!, status: 'rejected' } };
      if (req.kind === 'early-completion') return { ...a, earlyCompletionRequest: { ...a.earlyCompletionRequest!, status: 'rejected' } };
      if (req.kind === 'extension')    return { ...a, extensionRequest: { ...a.extensionRequest!, status: 'rejected' } };
      return a;
    }, remark);
    const cfg = getKindConfig(req.kind);
    addNotification({ forRole: 'io', title: `Director rejected: ${cfg.label} — ${req.app.name}`, body: `The Director has rejected the ${cfg.label.toLowerCase()} request for ${req.app.name}.${remark ? ` Reason: "${remark}"` : ''}`, href: '/interns', tier: 'action' });
  }

  return (
    <Shell activeRoute="/director">
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <ShieldCheck size={20} className="text-accent" />
          <h1 className="text-headline-lg text-fg">Approval Queue</h1>
        </div>
      </div>

      {pending.length === 0 ? (
        <div className="rounded-2xl border border-border bg-surface p-12 text-center">
          <CheckCircle2 size={36} className="text-success mx-auto mb-3" />
          <p className="text-body-lg font-semibold text-fg mb-1">All clear</p>
          <p className="text-body-md text-fg-muted">No requests pending your approval.</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle size={14} className="text-warning" />
            <p className="text-body-sm font-semibold text-warning">{pending.length} request{pending.length !== 1 ? 's' : ''} awaiting approval</p>
          </div>
          {pending.map((req, i) => (
            <RequestCard
              key={`${req.app.id}-${req.kind}-${i}`}
              req={req}
              onApprove={remark => approve(req, remark)}
              onReject={remark  => reject(req, remark)}
            />
          ))}
        </div>
      )}

      {/* IO discretion oversight — read-only transparency (AUG-023) */}
      <div className="mt-10">
        <div className="flex items-center gap-2 mb-1">
          <Eye size={18} className="text-accent" />
          <h2 className="text-headline-md text-fg">IO discretion oversight</h2>
        </div>
        <p className="text-body-md text-fg-muted mb-4">Eligibility and AI-match overrides exercised by internship officers. For your visibility — no action required.</p>
        {overrides.length === 0 ? (
          <div className="rounded-2xl border border-border bg-surface p-8 text-center">
            <p className="text-body-md text-fg-muted">No overrides on record.</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-border bg-surface">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-border bg-bg-subtle/50">
                  <th className="px-4 py-2.5 text-table-header tracking-wider text-fg">Candidate</th>
                  <th className="px-4 py-2.5 text-table-header tracking-wider text-fg">Override</th>
                  <th className="px-4 py-2.5 text-table-header tracking-wider text-fg">By</th>
                  <th className="px-4 py-2.5 text-table-header tracking-wider text-fg">Date</th>
                  <th className="px-4 py-2.5 text-table-header tracking-wider text-fg">Justification</th>
                </tr>
              </thead>
              <tbody>
                {overrides.map((o, i) => (
                  <tr key={`${o.app.id}-${o.type}-${i}`} className="border-b border-border last:border-0">
                    <td className="px-4 py-3">
                      <p className="text-body-sm font-semibold text-fg">{o.app.name}</p>
                      <p className="text-[12px] text-fg-muted">{o.app.programmeName}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1 text-[12px] font-bold text-warning bg-warning-bg border border-warning/20 px-2 py-0.5 rounded-full whitespace-nowrap">
                        <AlertCircle size={11} />{o.type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-body-sm text-fg whitespace-nowrap">{o.by}</td>
                    <td className="px-4 py-3 text-body-sm text-fg-muted whitespace-nowrap">{o.date}</td>
                    <td className="px-4 py-3 text-body-sm text-fg-muted max-w-md">{o.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Shell>
  );
}
