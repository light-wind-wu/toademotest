'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Shell from '@/components/layout/shell';
import Button from '@/components/ui-legacy/button';
import { Badge } from '@/components/ui-legacy/badge';
import EmptyState from '@/components/ui-legacy/empty-state';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { UnderlineTabs } from '@/components/ui-legacy/underline-tabs';
import { Inbox, CheckCircle2, Calendar } from 'lucide-react';
import { loadLiveProgrammeOptions, CONTACTS } from '@/lib/data';
import { loadRequests, loadSubmissions } from '@/lib/storage';
import { useRole } from '@/lib/role';
import { useToast, Toast } from '@/components/ui-legacy/toast';
import {
  groupRequests, isGroupClosed, groupTotals, submittedForGroup,
  type RequestGroup,
} from '@/lib/request-groups';
import type { ProjectRequest, ProjectSubmissionBatch } from '@/lib/types';

const REQUEST_CATEGORY_LABELS: Record<string, string> = {
  University: 'University',
  'Junior College': 'Junior College',
  Polytechnic: 'Polytechnic',
  'Post Junior College': 'Post Junior College / Post Polytechnic',
  'Post Polytechnic': 'Post Junior College / Post Polytechnic',
  'Post Junior College/Post Polytechnic Student': 'Post Junior College / Post Polytechnic',
  'Integrated Programme (IP)': 'Integrated Programme (IP)',
  'Undergraduate Scholar/Merit Scholar': 'University',
  'Undergraduate Student': 'University',
  'Junior College Scholar/Junior College Student': 'Junior College',
  'Polytechnic Scholar/Polytechnic Student': 'Polytechnic',
  'Young Defence Scientist Programme': 'Integrated Programme (IP)',
  'Tech UP': 'Tech UP',
};

/* ── Helpers ──────────────────────────────────────────────────────────────── */
function fmtDate(d: string) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-SG', { day: 'numeric', month: 'short', year: 'numeric' });
}

function requestCategoryLabel(req: ProjectRequest, progMap: Record<string, string>) {
  const raw = req.internCategory || req.educationLevel;
  return REQUEST_CATEGORY_LABELS[raw] ?? progMap[req.educationLevel] ?? req.educationLevel;
}

function requestCategoryTotals(requests: ProjectRequest[], progMap: Record<string, string>) {
  const totals = new Map<string, { label: string; uploaded: number; placements: number }>();

  requests.forEach(req => {
    const label = requestCategoryLabel(req, progMap);
    const existing = totals.get(label) ?? { label, uploaded: 0, placements: 0 };
    totals.set(label, {
      label,
      uploaded: existing.uploaded + (req.uploaded ?? 0),
      placements: existing.placements + req.placements,
    });
  });

  return Array.from(totals.values());
}

/* ── Card status helpers ─────────────────────────────────────────────────── */

type RequestBadge = {
  label: string;
  variant: 'warning' | 'info' | 'success';
};

function getGroupBadge(
  group: RequestGroup,
  batches: ProjectSubmissionBatch[],
): RequestBadge {
  const submitted = submittedForGroup(group, batches);
  const hasRejected = submitted.some(p => p.status === 'rejected');
  const { uploaded, placements } = groupTotals(group);

  if (hasRejected) return { label: 'Returned for Update', variant: 'warning' };
  if (placements > 0 && uploaded >= placements) return { label: 'Fulfilled', variant: 'success' };
  if (uploaded > 0) return { label: 'Incomplete', variant: 'warning' };
  return { label: 'Pending', variant: 'info' };
}

type ProjectStatusCounts = {
  notSubmitted: number;
  pending: number;
  returnedForUpdate: number;
  approved: number;
};

function getProjectStatusCounts(
  group: RequestGroup,
  batches: ProjectSubmissionBatch[],
): ProjectStatusCounts {
  const submitted = submittedForGroup(group, batches);
  const { uploaded, placements } = groupTotals(group);

  return {
    notSubmitted: Math.max(0, placements - uploaded),
    pending: submitted.filter(p => p.status === 'pending').length,
    returnedForUpdate: submitted.filter(p => p.status === 'rejected').length,
    approved: submitted.filter(p => p.status === 'approved').length,
  };
}

function getRejectedProjects(
  group: RequestGroup,
  batches: ProjectSubmissionBatch[],
) {
  return submittedForGroup(group, batches).filter(p => p.status === 'rejected');
}

function getCardAction(
  group: RequestGroup,
  batches: ProjectSubmissionBatch[],
): { label: string; mode: 'upload' | 'view' } {
  const submitted = submittedForGroup(group, batches);
  const hasRejected = submitted.some(p => p.status === 'rejected');
  const { uploaded, placements } = groupTotals(group);

  if (hasRejected) return { label: 'Update Returned Project', mode: 'view' };
  if (uploaded === 0) return { label: 'Start Submission', mode: 'upload' };
  if (uploaded < placements) return { label: 'Continue Submission', mode: 'upload' };
  return { label: 'View Submission', mode: 'view' };
}

function getContextMessage(uploaded: number, placements: number): string {
  if (uploaded === 0) return 'No project placements have been submitted yet.';
  if (uploaded < placements) return 'Some placements are submitted, but the requested total has not been met.';
  return 'Placement target met. Waiting for remaining IO review outcomes.';
}

/* ── Page ─────────────────────────────────────────────────────────────────── */
export default function AdPncSubmissionsPage() {
  const { toast: toastMsg, showToast } = useToast();
  const router = useRouter();
  const { profile } = useRole();

  const [requests, setRequests] = useState<ProjectRequest[]>([]);
  const [batches,  setBatches]  = useState<ProjectSubmissionBatch[]>([]);
  const [progMap,  setProgMap]  = useState<Record<string, string>>({});
  const [tab, setTab] = useState<'open' | 'done'>('open');

  useEffect(() => {
    // Surface a one-shot flash toast set by the upload/create flows before redirect.
    try {
      const raw = sessionStorage.getItem('dsta_flash');
      if (raw) {
        sessionStorage.removeItem('dsta_flash');
        const { message, tone } = JSON.parse(raw);
        if (message) showToast(message, tone ?? 'success');
      }
    } catch {}

    const opts = loadLiveProgrammeOptions();
    setProgMap(Object.fromEntries(opts.map(p => [p.value, p.label])));

    // Scope the inbox to the signed-in AD (P&C): only requests whose Programme
    // Centre maps to this AD (P&C) in the address book. (Each PC has one AD (P&C).)
    const myPcs = new Set(
      CONTACTS.filter(c => c.title === 'AD (P&C)' && c.email === profile.email).map(c => c.pc),
    );
    setRequests(loadRequests().filter(r => {
      if (r.id?.startsWith('draft-request-demo-')) return false;
      const pc = r.programmeCenter || CONTACTS.find(c => c.email === r.pc)?.pc || r.pc;
      return myPcs.has(pc);
    }));
    setBatches(loadSubmissions());
  }, [profile.email]);

  /* ── Derived ──────────────────────────────────────────────────────────── */
  const groups = groupRequests(requests);
  const openGroups = groups.filter(g => !isGroupClosed(g));
  const doneGroups = groups.filter(isGroupClosed);
  const visibleGroups = tab === 'open' ? openGroups : doneGroups;

  function upload(group: RequestGroup) {
    router.push(`/submissions/respond?token=${encodeURIComponent(group.key)}&mode=upload`);
  }

  function viewProject(group: RequestGroup) {
    router.push(`/submissions/respond?token=${encodeURIComponent(group.key)}&mode=view`);
  }

  /* ── Render ───────────────────────────────────────────────────────────── */
  return (
    <Shell activeRoute="/submissions" hideNavigation>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-headline-lg text-fg mb-1">Respond to Requests from Internship HQ</h1>
        <p className="text-body-sm text-fg-muted">
          Review placement requirements and manage project submissions for each request.
        </p>
      </div>

      <div className="mb-6 rounded-lg border border-border px-4 py-3 border-[#E6E1D8] bg-[#F3EFE5]">
        <p className="text-label-md font-semibold text-fg">How it works</p>
        <p className="text-body-sm text-fg-muted">1. Review the request 2. Manage and submit projects</p>
      </div>

      {requests.length === 0 ? (
        <div className="rounded-lg border border-border bg-surface">
          <EmptyState
            icon={Inbox}
            title="No requests yet"
            description="You're all caught up."
            size="sm"
          />
        </div>
      ) : (
        <>
          {/* Tabs */}
          <UnderlineTabs
            value={tab}
            onValueChange={value => value && setTab(value as 'open' | 'done')}
            ariaLabel="Project request status"
            tabs={[
              { value: 'open', label: 'Open Requests', count: openGroups.length },
              { value: 'done', label: 'Closed Requests', count: doneGroups.length },
            ]}
            className="mb-5"
          />

          {/* Request cards */}
          {visibleGroups.length === 0 ? (
            <div className="rounded-lg border border-border bg-surface">
              <EmptyState
                icon={CheckCircle2}
                title={tab === 'open' ? 'No open requests' : 'No closed requests yet'}
                description={tab === 'open' ? "You're all caught up." : 'Requests move here once their response deadline has passed.'}
                size="sm"
              />
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {visibleGroups.map(group => (
                <RequestCard
                  key={group.key}
                  group={group}
                  batches={batches}
                  progMap={progMap}
                  onUpload={() => upload(group)}
                  onViewProject={() => viewProject(group)}
                />
              ))}
            </div>
          )}
        </>
      )}

      <Toast message={toastMsg} />
    </Shell>
  );
}

/* ── Request card ─────────────────────────────────────────────────────────── */
function RequestCard({
  group, batches, progMap, onUpload, onViewProject,
}: {
  group: RequestGroup;
  batches: ProjectSubmissionBatch[];
  progMap: Record<string, string>;
  onUpload: () => void;
  onViewProject: () => void;
}) {
  const { placements, uploaded } = groupTotals(group);
  const categoryTotals = requestCategoryTotals(group.requests, progMap);
  const badge = getGroupBadge(group, batches);
  const counts = getProjectStatusCounts(group, batches);
  const rejected = getRejectedProjects(group, batches);
  const action = getCardAction(group, batches);
  const pc = group.requests[0]?.programmeCenter ?? '—';

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-surface shadow-sm">
      {/* Header */}
      <div className="flex flex-col gap-3 border-b border-border px-5 py-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h3 className="text-headline-sm text-fg">
            Request from {group.senderName ?? 'IO Admin'}
          </h3>
          <p className="mt-0.5 text-body-sm text-fg-muted">
            Sent {fmtDate(group.sentDate)} · {pc}
          </p>
        </div>
        <Badge variant={badge.variant} className="shrink-0">{badge.label}</Badge>
      </div>

      {/* Body */}
      <div className="space-y-6 px-5 py-5">
        {/* Placement Fulfilment */}
        <div>
          <h4 className="text-label-md mb-3 font-semibold text-fg">Placement Fulfilment</h4>
          <ul className="space-y-2">
            {categoryTotals.map(item => {
              const req = group.requests.find(r => requestCategoryLabel(r, progMap) === item.label);
              const period = req?.periodStart && req?.periodEnd
                ? `${req.periodStart} – ${req.periodEnd}`
                : '';
              const duration = req?.duration ? ` · ${req.duration}` : '';
              return (
                <li key={item.label} className="flex items-center justify-between text-body-sm">
                  <span className="text-fg-muted">
                    {item.label}
                    {period && (
                      <span className="text-fg-subtle"> · {period}{duration}</span>
                    )}
                  </span>
                  <span className="tabular-nums text-fg">
                    {item.uploaded} of {item.placements} submitted
                  </span>
                </li>
              );
            })}
          </ul>
          <div className="mt-3 flex items-center justify-between border-t border-border pt-3 text-body-sm">
            <span className="font-semibold text-fg">Total placements</span>
            <span className="font-semibold text-fg tabular-nums">
              {uploaded} of {placements} submitted
            </span>
          </div>
          <p className="mt-2 text-body-sm text-fg-muted">{getContextMessage(uploaded, placements)}</p>
        </div>

        {/* Project Statuses */}
        <div>
          <h4 className="text-label-md mb-3 font-semibold text-fg">Project Statuses</h4>
          {counts.notSubmitted + counts.pending + counts.returnedForUpdate + counts.approved === 0 ? (
            <p className="text-body-sm text-fg-muted">No project yet.</p>
          ) : (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-body-sm">
              {counts.notSubmitted > 0 && (
                <span className="text-fg-muted">
                  <span className="font-semibold text-fg">{counts.notSubmitted}</span> Not submitted
                </span>
              )}
              {counts.pending > 0 && (
                <span className="text-info">
                  <span className="font-semibold">{counts.pending}</span> Pending
                </span>
              )}
              {counts.returnedForUpdate > 0 && (
                <span className="text-warning">
                  <span className="font-semibold">{counts.returnedForUpdate}</span> Returned for update
                </span>
              )}
              {counts.approved > 0 && (
                <span className="text-success">
                  <span className="font-semibold">{counts.approved}</span> Approved
                </span>
              )}
            </div>
          )}
          <p className="mt-2 text-caption text-fg-muted">
            These do not replace the request status shown above.
          </p>
        </div>

        {/* Returned for update alert */}
        {rejected.length > 0 && (
          <Alert variant="warning" className="border-[rgba(187,77,0,0.3)] bg-[rgba(254,154,0,0.15)] text-[rgba(187,77,0,1)]">
            <AlertTitle>
              {rejected.length} project{rejected.length === 1 ? '' : 's'} require{rejected.length === 1 ? 's' : ''} an update
            </AlertTitle>
            <AlertDescription>
              {rejected.map(p => p.remarks || `Please review "${p.title || 'Untitled project'}".`).join(' ')}
            </AlertDescription>
          </Alert>
        )}

        {/* Footer action */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Button
            size="sm"
            onClick={action.mode === 'upload' ? onUpload : onViewProject}
          >
            {action.label}
          </Button>
          <div className="flex items-center gap-2 text-body-sm text-fg-muted">
            <Calendar size={16} />
            <span>Deadline · {fmtDate(group.deadline)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
