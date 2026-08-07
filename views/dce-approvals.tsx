'use client';

/* DCE project-batch approval queue (TOA / SCI flow) — PLACEHOLDER.
   The DCE reviews project batches the IO has routed for approval and approves/rejects
   them, gating the Approved List. This is a functional placeholder wired to the DCE
   substrate (lib/dce) — it is intended to be replaced by the uploaded design while the
   business logic underneath stays the same. The whole stage only does anything when
   the admin "DCE approval" toggle is ON; otherwise nothing is routed here. */

import { useEffect, useState } from 'react';
import Shell from '@/components/layout/shell';
import Button from '@/components/ui-legacy/button';
import Modal from '@/components/ui-legacy/modal';
import { Landmark, CheckCircle2, XCircle, AlertCircle, Layers } from 'lucide-react';
import { useRole } from '@/lib/role';
import { addNotification } from '@/lib/notifications';
import { logAccess } from '@/lib/audit';
import {
  loadDceApprovalEnabled, dcePendingBatches, dceDecideBatch,
} from '@/lib/dce';
import type { ProjectSubmissionBatch } from '@/lib/types';

const PROG_LABEL: Record<string, string> = {
  'PROG-0007': 'University Internship 2025',
  'PROG-0009': 'University Internship 2026',
  'PROG-0010': 'Junior College Internship 2026',
  'PROG-0011': 'Post-JC / Post-Poly Internship 2026',
};

export default function DceApprovals() {
  const { profile } = useRole();
  const [enabled, setEnabled] = useState(false);
  const [batches, setBatches] = useState<ProjectSubmissionBatch[]>([]);
  const [rejectTarget, setRejectTarget] = useState<ProjectSubmissionBatch | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [toast, setToast] = useState('');

  function refresh() {
    setEnabled(loadDceApprovalEnabled());
    setBatches(dcePendingBatches());
  }
  useEffect(() => { refresh(); }, []);

  function showToast(m: string) { setToast(m); setTimeout(() => setToast(''), 6000); }

  function decide(batch: ProjectSubmissionBatch, decision: 'approved' | 'rejected', reason?: string) {
    dceDecideBatch(batch.id, decision, profile.name, reason);
    logAccess({ actor: profile.name, action: 'decision',
      detail: `DCE ${decision} project batch for ${PROG_LABEL[batch.programme] ?? batch.programme}${reason ? ` — ${reason}` : ''}`,
      subjectId: `batch:${batch.id}` });
    addNotification({ forRole: 'io',
      title: `DCE ${decision === 'approved' ? 'approved' : 'rejected'} — ${PROG_LABEL[batch.programme] ?? batch.programme}`,
      body: decision === 'approved'
        ? `The DCE has approved the project batch for ${PROG_LABEL[batch.programme] ?? batch.programme}. It can proceed to the Approved List.`
        : `The DCE has rejected the project batch for ${PROG_LABEL[batch.programme] ?? batch.programme}.${reason ? ` Reason: "${reason}"` : ''} Please review and re-route.`,
      href: '/requests', tier: 'action' });
    showToast(`Batch ${decision}.`);
    refresh();
  }

  return (
    <Shell activeRoute="/dce">
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <Landmark size={20} className="text-accent" />
          <h1 className="text-headline-lg text-fg">DCE Approvals</h1>
        </div>
      </div>

      {!enabled && (
        <div className="flex items-start gap-2 mb-5 px-4 py-3 bg-warning-bg border border-warning/20 rounded-xl">
          <AlertCircle size={15} className="text-warning shrink-0 mt-0.5" />
          <p className="text-body-sm text-fg">
            DCE approval is currently <strong>off</strong>. Project batches go straight to the Approved List after IO review.
            An admin can enable the DCE stage in <span className="font-semibold">Admin → System → DCE approval</span>.
          </p>
        </div>
      )}

      {batches.length === 0 ? (
        <div className="rounded-2xl border border-border bg-surface p-12 text-center">
          <CheckCircle2 size={36} className="text-success mx-auto mb-3" />
          <p className="text-body-lg font-semibold text-fg mb-1">Nothing to approve</p>
          <p className="text-body-md text-fg-muted">No project batches are awaiting your approval.</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle size={14} className="text-warning" />
            <p className="text-body-sm font-semibold text-warning">{batches.length} batch{batches.length !== 1 ? 'es' : ''} awaiting approval</p>
          </div>
          {batches.map(batch => (
            <div key={batch.id} className="rounded-2xl border border-border bg-surface p-5">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Layers size={15} className="text-accent shrink-0" />
                    <p className="text-body-md font-semibold text-fg">{PROG_LABEL[batch.programme] ?? batch.programme}</p>
                  </div>
                  <p className="text-body-sm text-fg-muted mt-1">
                    {batch.projects.length} project{batch.projects.length !== 1 ? 's' : ''} · {batch.placements} placement{batch.placements !== 1 ? 's' : ''}
                    {batch.pcHead ? ` · ${batch.pcHead}` : ''}{batch.uploadedAt ? ` · uploaded ${batch.uploadedAt}` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button onClick={() => decide(batch, 'approved')}><CheckCircle2 size={14} />Approve batch</Button>
                  <Button variant="danger" onClick={() => { setRejectReason(''); setRejectTarget(batch); }}><XCircle size={14} />Reject</Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Reject reason modal */}
      <Modal open={!!rejectTarget} onClose={() => setRejectTarget(null)} maxWidth="sm" labelledBy="dce-reject-title">
        <h2 id="dce-reject-title" className="text-headline-sm text-fg mb-1">Reject this batch?</h2>
        <p className="text-body-md text-fg-muted mb-4">
          The IO will be notified to review and re-route the projects for{' '}
          <span className="font-semibold text-fg">{rejectTarget ? (PROG_LABEL[rejectTarget.programme] ?? rejectTarget.programme) : ''}</span>.
        </p>
        <label className="block text-label-sm text-fg mb-1.5">Reason <span className="text-danger">*</span></label>
        <textarea rows={3} value={rejectReason} onChange={e => setRejectReason(e.target.value)}
          placeholder="e.g. Project scope insufficient for the requested placements…"
          className="w-full rounded-xl border border-border bg-bg-subtle px-3 py-2.5 text-body-sm text-fg resize-none focus:outline-none focus:ring-2 focus:ring-danger/20 focus:border-danger/40 mb-5" />
        <div className="flex gap-3 justify-end">
          <Button variant="danger" disabled={!rejectReason.trim()} onClick={() => { if (rejectTarget) decide(rejectTarget, 'rejected', rejectReason.trim()); setRejectTarget(null); }}>
            <XCircle size={14} />Reject batch
          </Button>
          <Button variant="ghost" onClick={() => setRejectTarget(null)}>Cancel</Button>
        </div>
      </Modal>

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-xl bg-fg text-surface text-body-sm font-medium shadow-lg">{toast}</div>
      )}
    </Shell>
  );
}
