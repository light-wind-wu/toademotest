'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import {
  CheckCircle2, AlertTriangle, ChevronDown, ChevronUp, Mail,
  Users, FolderOpen, Clock, Layers,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { progEducationLevelMap } from '@/lib/data';
import { loadRequests, loadSubmissions, loadProjects } from '@/lib/storage';
import type { ProjectRequest, ProjectSubmissionBatch, ProjectEntry } from '@/lib/types';
import KineticBounce from '@/components/layout/kinetic-bounce';

/* ── Demo portal contexts (token → programme context) ─────────────────────── */
const PORTAL_CONTEXTS: Record<string, {
  programme: string;
  progLabel: string;
  adName:    string;
  adEmail:   string;
  ioName:    string;
  deadline:  string;
}> = {
  'adpnc-001': {
    programme: 'PROG-0009',
    progLabel: 'University Internship 2025 — Cohort A',
    adName:    'Ng Shu Qi',
    adEmail:   'shuqi.ng@dsta.gov.sg',
    ioName:    'Davina Tan',
    deadline:  '2026-04-30',
  },
  'adpnc-002': {
    programme: 'PROG-0010',
    progLabel: 'University Internship 2025 — Cohort B',
    adName:    'Ng Shu Qi',
    adEmail:   'shuqi.ng@dsta.gov.sg',
    ioName:    'Rachel Koh',
    deadline:  '2026-05-30',
  },
  'adpnc-003': {
    programme: 'PROG-0011',
    progLabel: 'Junior College Internship 2026',
    adName:    'Ng Shu Qi',
    adEmail:   'shuqi.ng@dsta.gov.sg',
    ioName:    'Davina Tan',
    deadline:  '2026-05-31',
  },
};

/* ── Status config ────────────────────────────────────────────────────────── */
const STATUS_META: Record<string, { label: string; cls: string }> = {
  matched: { label: 'Submitted',  cls: 'bg-success-bg text-success' },
  partial: { label: 'Incomplete', cls: 'bg-warning-bg text-warning' },
  pending: { label: 'Pending',    cls: 'bg-bg-muted text-fg-muted'  },
  overdue: { label: 'Overdue',    cls: 'bg-danger-bg text-danger'   },
  excess:  { label: 'Over-filled', cls: 'bg-info-bg text-info'      },
};

const PROJ_STATUS_META: Record<string, { label: string; cls: string }> = {
  confirmed:     { label: 'Closed',   cls: 'bg-bg-muted text-fg-muted'  },
  'in-progress': { label: 'Partial',  cls: 'bg-warning-bg text-warning' },
  open:          { label: 'Open',     cls: 'bg-success-bg text-success'  },
};

const REVIEW_STATUS_META: Record<string, { label: string; cls: string }> = {
  pending:         { label: 'Pending Review',       cls: 'bg-bg-muted text-fg-muted border-border'         },
  approved:        { label: 'Approved',             cls: 'bg-success-bg text-success border-success/20'    },
  returnedForUpdate: { label: 'Returned for Update',  cls: 'bg-danger-bg text-danger border-danger/20'       },
  rejected:        { label: 'Rejected',             cls: 'bg-danger-bg text-danger border-danger/20'       },
  withdrawn:       { label: 'Withdrawn',            cls: 'bg-bg-muted text-fg-muted border-border'         },
};

/* ── Helpers ──────────────────────────────────────────────────────────────── */
function fmtDate(d: string) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-SG', { day: 'numeric', month: 'short', year: 'numeric' });
}

function daysLeft(deadline: string): number {
  const diff = new Date(deadline).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

/* ── Stat card ────────────────────────────────────────────────────────────── */
function StatCard({ label, value, sub, warn }: { label: string; value: string | number; sub?: string; warn?: boolean }) {
  return (
    <div className="bg-surface rounded-xl border border-border px-5 py-4">
      <p className="text-[12px] text-fg-muted uppercase tracking-wider mb-1">{label}</p>
      <p className={cn('text-headline-md font-bold', warn ? 'text-warning' : 'text-fg')}>{value}</p>
      {sub && <p className="text-[13px] text-fg-muted mt-0.5">{sub}</p>}
    </div>
  );
}

/* ── Page ─────────────────────────────────────────────────────────────────── */
export default function AdPncPortalView() {
  const params = useParams();
  const token  = typeof params?.token === 'string' ? params.token : '';
  const ctx    = PORTAL_CONTEXTS[token];

  const [requests,    setRequests]    = useState<ProjectRequest[]>([]);
  const [submissions, setSubmissions] = useState<ProjectSubmissionBatch[]>([]);
  const [projects,    setProjects]    = useState<ProjectEntry[]>([]);
  const [activeTab,   setActiveTab]   = useState<'submissions' | 'placements'>('submissions');
  const [expanded,    setExpanded]    = useState<string | null>(null);

  useEffect(() => {
    if (!ctx) return;
    // Requests are keyed by Intern Category; this portal context is a programme,
    // so match the request against the programme's Intern Category.
    const ctxLevel = progEducationLevelMap()[ctx.programme] ?? ctx.programme;
    setRequests(loadRequests().filter(r => r.educationLevel === ctxLevel && !r.id?.startsWith('draft-request-demo-')));
    setSubmissions(loadSubmissions().filter(b => b.programme === ctx.programme));
    setProjects(loadProjects().filter(p => p.programme === ctx.programme));
  }, [token]);

  /* ── Invalid token ────────────────────────────────────────────────────── */
  if (!ctx) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-subtle px-4" data-zone="d-experience" data-mode="light">
        <div className="text-center max-w-sm">
          <div className="w-14 h-14 rounded-2xl bg-danger-bg flex items-center justify-center mx-auto mb-4">
            <AlertTriangle size={24} className="text-danger" />
          </div>
          <h1 className="text-headline-md text-fg mb-2">Link not found</h1>
          <p className="text-body-md text-fg-muted">
            This portal link is invalid or has expired. Please contact the IO who sent you this link.
          </p>
        </div>
      </div>
    );
  }

  /* ── Derived stats ────────────────────────────────────────────────────── */
  const totalPlacements  = requests.reduce((s, r) => s + r.placements, 0);
  const totalSubmitted   = requests.reduce((s, r) => s + r.uploaded,   0);
  const respondedCount    = requests.filter(r => r.status === 'matched' || r.status === 'partial' || r.status === 'excess').length;
  const awaitingCount     = requests.filter(r => r.status === 'pending' || r.status === 'overdue').length;
  const dl               = daysLeft(ctx.deadline);

  return (
    <KineticBounce fullBleed>
    <div className="min-h-screen bg-bg-subtle" data-zone="d-experience" data-mode="light">

      {/* ── Top bar ──────────────────────────────────────────────────────── */}
      <div className="bg-surface border-b border-border px-4 md:px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center shrink-0">
            <span className="text-white text-[13px] font-black">DSTA</span>
          </div>
          <div>
            <p className="text-body-sm font-semibold text-fg leading-tight">AD (P&C) Submission Portal</p>
            <p className="text-[13px] text-fg-muted">Talent Outreach &amp; Acquisition</p>
          </div>
        </div>
        <div className="text-right hidden sm:block">
          <p className="text-body-sm font-semibold text-fg">{ctx.adName}</p>
          <p className="text-[13px] text-fg-muted">{ctx.adEmail}</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 md:px-8 py-8">

        {/* ── Context header ───────────────────────────────────────────── */}
        <div className="mb-2">
          <p className="text-[12px] font-black text-fg-subtle uppercase tracking-widest mb-1">
            Request from {ctx.ioName} · Internship Officer
          </p>
          <h1 className="text-headline-lg text-fg mb-2">{ctx.progLabel}</h1>
          <p className="text-body-md text-fg-muted max-w-2xl">
            Please ensure all PC heads under your remit have submitted their project lists.
            Review the submission status below and remind any outstanding PCs before the deadline.
          </p>
        </div>

        {/* ── Deadline banner ──────────────────────────────────────────── */}
        <div className={cn(
          'flex items-center gap-3 px-4 py-3 rounded-xl border mb-6 mt-4',
          dl < 0
            ? 'bg-danger-bg border-danger/30 text-danger'
            : dl <= 3
            ? 'bg-warning-bg border-warning/30 text-warning'
            : 'bg-bg-subtle border-border text-fg-muted',
        )}>
          <Clock size={15} className="shrink-0" />
          <p className="text-body-sm font-semibold">
            {dl < 0
              ? `Deadline passed — ${fmtDate(ctx.deadline)}`
              : dl === 0
              ? 'Deadline is today'
              : `${dl} day${dl !== 1 ? 's' : ''} until deadline — ${fmtDate(ctx.deadline)}`}
          </p>
        </div>

        {/* ── Summary stats ────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <StatCard label="Total Placements"  value={totalPlacements} />
          <StatCard label="Projects Submitted" value={totalSubmitted} sub="across all PCs" />
          <StatCard label="PCs Responded"     value={`${respondedCount}/${requests.length}`} />
          <StatCard label="Awaiting Response" value={awaitingCount} warn={awaitingCount > 0} />
        </div>

        {/* ── Tabs ─────────────────────────────────────────────────────── */}
        <div className="flex gap-1 mb-5 border-b border-border">
          {(['submissions', 'placements'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                'px-4 py-2.5 text-body-sm font-semibold -mb-px border-b-2 transition-colors',
                activeTab === tab
                  ? 'border-accent text-accent'
                  : 'border-transparent text-fg-muted hover:text-fg',
              )}
            >
              {tab === 'submissions' ? 'PC Submissions' : 'Placement Overview'}
            </button>
          ))}
        </div>

        {/* ── Tab: PC Submissions ──────────────────────────────────────── */}
        {activeTab === 'submissions' && (
          <div className="space-y-3">
            {requests.length === 0 && (
              <div className="bg-surface rounded-xl border border-border p-10 text-center">
                <Layers size={28} className="mx-auto text-fg-subtle mb-3" />
                <p className="text-body-md text-fg-muted">No requests found for this programme.</p>
              </div>
            )}

            {requests.map(req => {
              const batch      = submissions.find(b => b.uploadToken === req.uploadToken);
              const isExpanded = expanded === req.id;

              const approvedCount             = batch?.projects.filter(p => p.status === 'approved').length  ?? 0;
              const returnedForUpdateCount    = batch?.projects.filter(p => p.status === 'returnedForUpdate').length  ?? 0;
              const rejectedCount             = batch?.projects.filter(p => p.status === 'rejected').length  ?? 0;
              const pendingCount              = batch?.projects.filter(p => p.status === 'pending').length   ?? 0;
              const withdrawnCount            = batch?.projects.filter(p => p.status === 'withdrawn').length ?? 0;
              const anyReviewed               = batch && (approvedCount + returnedForUpdateCount + rejectedCount + withdrawnCount > 0);

              return (
                <div key={req.id} className="bg-surface rounded-xl border border-border overflow-hidden shadow-sm">

                  {/* Row header */}
                  <div className="flex items-center gap-4 px-5 py-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-body-md font-semibold text-fg">{req.headName}</p>
                        <span className={cn('badge text-[12px]', STATUS_META[req.status]?.cls)}>
                          {STATUS_META[req.status]?.label ?? req.status}
                        </span>
                      </div>
                      <p className="text-body-sm text-fg-muted truncate">{req.pc}</p>
                      {/* Review status summary — only when batch has been reviewed */}
                      {anyReviewed && !isExpanded && (
                        <div className="flex flex-wrap gap-1.5 mt-1.5">
                          {approvedCount > 0 && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[12px] font-semibold bg-success-bg text-success border border-success/20">
                              <CheckCircle2 size={9} />{approvedCount} approved
                            </span>
                          )}
                          {rejectedCount > 0 && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[12px] font-semibold bg-danger-bg text-danger border border-danger/20">
                              {rejectedCount} rejected
                            </span>
                          )}
                          {returnedForUpdateCount > 0 && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[12px] font-semibold bg-danger-bg text-danger border border-danger/20">
                              {returnedForUpdateCount} returned for update
                            </span>
                          )}
                          {pendingCount > 0 && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[12px] font-semibold bg-bg-muted text-fg-muted border border-border">
                              {pendingCount} pending
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Stats — desktop */}
                    <div className="hidden sm:grid grid-cols-3 gap-8 text-center shrink-0">
                      <div>
                        <p className="text-[12px] text-fg-muted mb-0.5">Placements</p>
                        <p className="text-body-sm font-bold text-fg">{req.placements}</p>
                      </div>
                      <div>
                        <p className="text-[12px] text-fg-muted mb-0.5">Submitted</p>
                        <p className={cn('text-body-sm font-bold', req.uploaded > 0 ? 'text-success' : 'text-fg-muted')}>
                          {req.uploaded}
                        </p>
                      </div>
                      <div>
                        <p className="text-[12px] text-fg-muted mb-0.5">Deadline</p>
                        <p className="text-body-sm font-bold text-fg">
                          {new Date(req.deadline).toLocaleDateString('en-SG', { day: 'numeric', month: 'short' })}
                        </p>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 shrink-0">
                      {(req.status === 'pending' || req.status === 'overdue') && (
                        <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent text-white text-[13px] font-semibold hover:bg-accent/90 transition-colors whitespace-nowrap">
                          <Mail size={12} />Remind
                        </button>
                      )}
                      {batch && (
                        <button
                          onClick={() => setExpanded(isExpanded ? null : (req.id ?? null))}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-[13px] font-semibold text-fg hover:bg-bg-subtle transition-colors whitespace-nowrap"
                        >
                          {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                          {batch.projects.length} project{batch.projects.length !== 1 ? 's' : ''}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Expanded project list */}
                  {isExpanded && batch && (
                    <div className="border-t border-border overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead className="bg-bg-subtle">
                          <tr>
                            <th className="px-5 py-2.5 text-[12px] font-bold text-fg-muted tracking-wider">Project Title</th>
                            <th className="px-5 py-2.5 text-[12px] font-bold text-fg-muted tracking-wider hidden sm:table-cell">Mentor</th>
                            <th className="px-5 py-2.5 text-[12px] font-bold text-fg-muted tracking-wider hidden sm:table-cell">Appointment</th>
                            <th className="px-5 py-2.5 text-[12px] font-bold text-fg-muted tracking-wider text-center">Slots</th>
                            <th className="px-5 py-2.5 text-[12px] font-bold text-fg-muted tracking-wider">AI Check</th>
                            <th className="px-5 py-2.5 text-[12px] font-bold text-fg-muted tracking-wider">Approval</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {batch.projects.map(proj => {
                            const aiOk    = proj.aiCheck.grammar === 'pass' && proj.aiCheck.level === 'pass';
                            const aiFail  = proj.aiCheck.grammar === 'fail' || proj.aiCheck.level === 'fail';
                            const review  = REVIEW_STATUS_META[proj.status] ?? REVIEW_STATUS_META.pending;
                            return (
                              <tr key={proj.id} className={cn(
                                'hover:bg-bg-subtle/50 transition-colors',
                              proj.status === 'approved' && 'bg-success-bg/30',
                              (proj.status === 'rejected' || proj.status === 'returnedForUpdate') && 'bg-danger-bg/20',
                              )}>
                                <td className="px-5 py-3">
                                  <p className="text-body-sm font-medium text-fg">{proj.title}</p>
                                  {(proj.status === 'rejected' || proj.status === 'returnedForUpdate') && proj.remarks && (
                                    <p className="text-[13px] text-danger mt-0.5 leading-snug">Reason: {proj.remarks}</p>
                                  )}
                                </td>
                                <td className="px-5 py-3 text-body-sm text-fg-muted hidden sm:table-cell">{proj.mentor}</td>
                                <td className="px-5 py-3 text-body-sm text-fg-muted hidden sm:table-cell">{proj.mentorAppointment ?? '—'}</td>
                                <td className="px-5 py-3 text-body-sm text-fg text-center font-semibold">{proj.slots}</td>
                                <td className="px-5 py-3">
                                  <span className={cn(
                                    'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[12px] font-bold border',
                                    aiOk   ? 'bg-success-bg text-success border-success/20'  :
                                    aiFail ? 'bg-danger-bg text-danger border-danger/20'     :
                                             'bg-warning-bg text-warning border-warning/20',
                                  )}>
                                    {aiOk ? <CheckCircle2 size={9} /> : <AlertTriangle size={9} />}
                                    {aiOk ? 'Pass' : aiFail ? 'Fail' : 'Review'}
                                  </span>
                                </td>
                                <td className="px-5 py-3">
                                  <span className={cn(
                                    'inline-flex items-center px-2 py-0.5 rounded-full text-[12px] font-bold border',
                                    review.cls,
                                  )}>
                                    {review.label}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ── Tab: Placement Overview ───────────────────────────────────── */}
        {activeTab === 'placements' && (
          <div>
            {projects.length === 0 ? (
              <div className="bg-surface rounded-xl border border-border p-10 text-center">
                <FolderOpen size={28} className="mx-auto text-fg-subtle mb-3" />
                <p className="text-body-md text-fg-muted">No confirmed projects yet for this programme.</p>
                <p className="text-body-sm text-fg-subtle mt-1">Projects will appear here once submissions are approved by IO Admin.</p>
              </div>
            ) : (
              <>
                {/* Placement summary stats */}
                <div className="grid grid-cols-3 gap-3 mb-5">
                  <StatCard
                    label="Total Projects"
                    value={projects.length}
                  />
                  <StatCard
                    label="Total Slots"
                    value={projects.reduce((s, p) => s + p.slots, 0)}
                  />
                  <StatCard
                    label="Slots Filled"
                    value={projects.reduce((s, p) => s + p.matched, 0)}
                    sub={`of ${projects.reduce((s, p) => s + p.slots, 0)} slots`}
                  />
                </div>

                <div className="bg-surface rounded-xl border border-border overflow-hidden shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead className="bg-bg-subtle border-b border-border">
                        <tr>
                          <th className="px-5 py-3 text-[12px] font-bold text-fg-muted tracking-wider">Project</th>
                          <th className="px-5 py-3 text-[12px] font-bold text-fg-muted tracking-wider hidden sm:table-cell">Mentor</th>
                          <th className="px-5 py-3 text-[12px] font-bold text-fg-muted tracking-wider hidden sm:table-cell">PC</th>
                          <th className="px-5 py-3 text-[12px] font-bold text-fg-muted tracking-wider text-center">Matched / Slots</th>
                          <th className="px-5 py-3 text-[12px] font-bold text-fg-muted tracking-wider">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {projects.map(p => (
                          <tr key={p.id} className="hover:bg-bg-subtle/50 transition-colors">
                            <td className="px-5 py-3">
                              <p className="text-body-sm font-semibold text-fg">{p.title}</p>
                              <p className="text-[13px] text-fg-muted">{p.id}</p>
                            </td>
                            <td className="px-5 py-3 hidden sm:table-cell">
                              <p className="text-body-sm text-fg-muted">{p.mentor}</p>
                              {p.mentorAppointment && <p className="text-[13px] text-fg-subtle">{p.mentorAppointment}</p>}
                            </td>
                            <td className="px-5 py-3 text-body-sm text-fg-muted hidden sm:table-cell">{p.pc ?? '—'}</td>
                            <td className="px-5 py-3 text-center">
                              <p className="text-body-sm font-bold text-fg">{p.matched}<span className="text-fg-muted font-normal">/{p.slots}</span></p>
                              <div className="w-full bg-bg-subtle rounded-full h-1 mt-1.5 overflow-hidden">
                                <div
                                  className={cn('h-full rounded-full transition-all', p.matched === p.slots ? 'bg-success' : p.matched > 0 ? 'bg-warning' : 'bg-bg-muted')}
                                  style={{ width: `${p.slots > 0 ? Math.round((p.matched / p.slots) * 100) : 0}%` }}
                                />
                              </div>
                            </td>
                            <td className="px-5 py-3">
                              <span className={cn('badge text-[12px]', PROJ_STATUS_META[p.status]?.cls)}>
                                {PROJ_STATUS_META[p.status]?.label ?? p.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="px-5 py-3 bg-surface border-t border-border text-right">
                    <span className="text-body-sm text-fg-muted">
                      <span className="font-bold text-fg">{projects.length}</span> project{projects.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

      </div>
    </div>
    </KineticBounce>
  );
}
