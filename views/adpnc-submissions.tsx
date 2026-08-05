'use client';

import { useState, useEffect, useMemo, useRef, Fragment } from 'react';
import { useRouter } from 'next/navigation';
import Shell from '@/components/layout/shell';
import Button from '@/components/ui-legacy/button';
import EmptyState from '@/components/ui-legacy/empty-state';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { UnderlineTabs } from '@/components/ui-legacy/underline-tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Inbox, CheckCircle2, Calendar, ListFilter, Filter } from 'lucide-react';
import { loadLiveProgrammeOptions, CONTACTS, STATUS_COLOURS } from '@/lib/data';
import { loadRequests, loadSubmissions } from '@/lib/storage';
import { useRole } from '@/lib/role';
import { cn } from '@/lib/utils';
import { useToast, Toast } from '@/components/ui-legacy/toast';
import {
  groupRequests, isGroupClosed, groupTotals, submittedForGroup, projectMatchesRequest,
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

function requestCategoryTotals(
  group: RequestGroup,
  batches: ProjectSubmissionBatch[],
  progMap: Record<string, string>,
) {
  const totals = new Map<string, { label: string; uploaded: number; placements: number }>();

  group.requests.forEach(req => {
    const label = requestCategoryLabel(req, progMap);
    const existing = totals.get(label) ?? { label, uploaded: 0, placements: 0 };
    existing.placements += req.placements;
    totals.set(label, existing);
  });

  submittedForGroup(group, batches)
    .filter(p => p.status !== 'withdrawn')
    .forEach(p => {
      const matched = group.requests.find(req => projectMatchesRequest(p, req));
      if (!matched) return;
      const label = requestCategoryLabel(matched, progMap);
      const existing = totals.get(label);
      if (existing) existing.uploaded += p.slots;
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

  if (hasRejected) return { label: 'Incomplete', variant: 'warning' };
  if (placements > 0 && uploaded >= placements) return { label: 'Fulfilled', variant: 'success' };
  if (uploaded > 0) return { label: 'Incomplete', variant: 'warning' };
  return { label: 'Pending', variant: 'info' };
}

type ProjectStatusCounts = {
  notSubmitted: number;
  pending: number;
  returnedForUpdate: number;
  approved: number;
  frozen: number;
};

function groupSubmittedSlots(
  group: RequestGroup,
  batches: ProjectSubmissionBatch[],
): number {
  return submittedForGroup(group, batches)
    .filter(p => p.status !== 'withdrawn')
    .reduce((sum, p) => sum + p.slots, 0);
}

function getProjectStatusCounts(
  group: RequestGroup,
  batches: ProjectSubmissionBatch[],
): ProjectStatusCounts {
  const submitted = submittedForGroup(group, batches);
  const { placements } = groupTotals(group);
  const submittedSlots = groupSubmittedSlots(group, batches);

  return {
    notSubmitted: Math.max(0, placements - submittedSlots),
    pending: submitted.filter(p => p.status === 'pending').length,
    returnedForUpdate: submitted.filter(p => p.status === 'rejected').length,
    approved: submitted.filter(p => p.status === 'approved').length,
    frozen: submitted.filter(p => p.status === 'frozen').length,
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

  if (hasRejected) return { label: 'View Submission', mode: 'view' };
  if (uploaded === 0) return { label: 'Start Submission', mode: 'upload' };
  if (uploaded < placements) return { label: 'View Submission', mode: 'upload' };
  return { label: 'View Submission', mode: 'view' };
}

function getContextMessage(uploaded: number, placements: number): string {
  if (uploaded === 0) return 'No project placements have been submitted yet.';
  if (uploaded < placements) return 'Some placements are submitted, but the requested total has not been met.';
  return 'Placement target met. Waiting for remaining IO review outcomes.';
}

const GROUP_STATUS_COLOURS: Record<string, string> = {
  Pending: STATUS_COLOURS.pending,
  Incomplete: STATUS_COLOURS.incomplete,
  Fulfilled: STATUS_COLOURS.fulfilled,
};

/* Rejected alert uses the shared rejected status colours plus a red border override. */
const REJECTED_ALERT_STYLE = cn('border-[rgba(251,44,54,0.3)]', STATUS_COLOURS.rejected);

function textOnly(cls: string) {
  return cls.split(' ').filter(c => c.startsWith('text-')).join(' ') || cls;
}

/* ── Status filter ─────────────────────────────────────────────────────────── */
const STATUS_OPTIONS = ['Pending', 'Incomplete', 'Fulfilled'] as const;

function StatusFilter({
  selected,
  onChange,
}: {
  selected: string[];
  onChange: (selected: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [open]);

  return (
    <div ref={ref} className="relative border-b border-border">
      <Button
        type="button"
        variant="ghost"
        onClick={() => setOpen(prev => !prev)}
        className={cn(
          'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-body-sm font-medium transition-colors whitespace-nowrap',
          open || selected.length > 0
            ? 'bg-accent/8 text-accent'
            : 'text-fg-muted hover:text-fg'
        )}
      >
        <Filter size={14} />
        Filter
      </Button>

      {open && (
        <div className="absolute right-0 top-full mt-1.5 min-w-[11rem] rounded-xl border border-border bg-surface shadow-lg z-50 py-1">
          <p className="px-3 py-1 text-[12px] font-bold text-fg-subtle uppercase tracking-widest">
            Filter by Status
          </p>
          {STATUS_OPTIONS.map(status => {
            const checked = selected.includes(status);
            return (
              <button
                key={status}
                type="button"
                onClick={() => {
                  onChange(checked
                    ? selected.filter(s => s !== status)
                    : [...selected, status]
                  );
                }}
                className="w-full flex items-center gap-2.5 px-3 py-1.5 text-body-sm text-fg hover:bg-bg-subtle transition-colors text-left"
              >
                <Checkbox
                  checked={checked}
                  aria-label={`Toggle ${status}`}
                  tabIndex={-1}
                  className="pointer-events-none"
                />
                {status}
              </button>
            );
          })}
          <div className="border-t border-border mt-1 pt-1">
            <button
              type="button"
              onClick={() => onChange([])}
              disabled={selected.length === 0}
              className="w-full px-3 py-1.5 text-body-sm text-left text-fg-muted hover:text-fg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Clear filter
            </button>
          </div>
        </div>
      )}
    </div>
  );
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
  const [statusFilters, setStatusFilters] = useState<string[]>([]);

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

  const filteredGroups = useMemo(() => {
    if (statusFilters.length === 0) return visibleGroups;
    return visibleGroups.filter(g => statusFilters.includes(getGroupBadge(g, batches).label));
  }, [visibleGroups, statusFilters, batches]);

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
        <h1 className="text-headline-lg text-fg mb-1">Internship Requests</h1>
        <p className="text-body-sm text-fg-muted">
          Review placement requirements and manage project submissions for each request.
        </p>
      </div>

      {/*{
        requests.length && (
          <div className="mb-6 rounded-lg border border-border px-4 py-3 border-[#E6E1D8] bg-[#F3EFE5]">
            <p className="text-label-md font-semibold text-fg">How it works</p>
            <p className="text-body-sm text-fg-muted">1. Review the request 2. Manage and submit projects</p>
          </div>
        )
      }*/}

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
          {/* Tabs + Filter */}
          <div className="mb-5 flex items-end justify-between gap-0">
            <UnderlineTabs
              value={tab}
              onValueChange={value => value && setTab(value as 'open' | 'done')}
              ariaLabel="Project request status"
              tabs={[
                { value: 'open', label: 'Open Requests', count: openGroups.length },
                { value: 'done', label: 'Closed Requests', count: doneGroups.length },
              ]}
              className="flex-1"
            />
            <StatusFilter selected={statusFilters} onChange={setStatusFilters} />
          </div>

          {/* Request cards */}
          {filteredGroups.length === 0 ? (
            <div className="rounded-lg border border-border bg-surface">
              <EmptyState
                icon={CheckCircle2}
                title={statusFilters.length > 0 ? 'No matching requests' : (tab === 'open' ? 'No open requests' : 'No closed requests yet')}
                description={statusFilters.length > 0 ? 'Try adjusting the status filter.' : (tab === 'open' ? "You're all caught up." : 'Requests move here once their response deadline has passed.')}
                size="sm"
              />
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {filteredGroups.map(group => (
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
  const { placements } = groupTotals(group);
  const uploaded = groupSubmittedSlots(group, batches);
  const categoryTotals = requestCategoryTotals(group, batches, progMap);
  const badge = getGroupBadge(group, batches);
  const counts = getProjectStatusCounts(group, batches);
  const rejected = getRejectedProjects(group, batches);
  const action = getCardAction(group, batches);
  const pc = group.requests[0]?.programmeCenter ?? '—';

  const projectStatusItems = [
    counts.notSubmitted > 0 && { key: 'notSubmitted', label: 'Not submitted', count: counts.notSubmitted, cls: textOnly(STATUS_COLOURS.draft) },
    counts.pending > 0 && { key: 'pending', label: 'Pending', count: counts.pending, cls: textOnly(STATUS_COLOURS.pending) },
    counts.returnedForUpdate > 0 && { key: 'returnedForUpdate', label: 'Returned for update', count: counts.returnedForUpdate, cls: textOnly(STATUS_COLOURS.rejected) },
    counts.approved > 0 && { key: 'approved', label: 'Approved', count: counts.approved, cls: textOnly(STATUS_COLOURS.approved) },
    counts.frozen > 0 && { key: 'frozen', label: 'Pending DCE Approval', count: counts.frozen, cls: textOnly(STATUS_COLOURS.frozen) },
  ].filter(Boolean) as { key: string; label: string; count: number; cls: string }[];

  return (
    <div className="flex flex-col overflow-hidden rounded-lg border border-border bg-surface shadow-sm">
      {/* Header */}
      <div className="flex flex-col gap-3 border-border px-5 py-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h3 className="text-headline-sm text-fg">
            Request from {group.senderName ?? 'IO Admin'}
          </h3>
          <p className="mt-0.5 text-body-sm text-fg-muted">
            Sent {fmtDate(group.sentDate)} · {pc}
          </p>
        </div>
        <span className={cn('badge text-caption font-normal shrink-0', GROUP_STATUS_COLOURS[badge.label])}>{badge.label}</span>
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col space-y-6 px-5 py-5">
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
          {projectStatusItems.length === 0 ? (
            <p className="text-body-sm text-fg-muted">No project yet.</p>
          ) : (
            <div className="flex flex-wrap items-center gap-y-2 text-body-sm">
              {projectStatusItems.map((item, index) => (
                <Fragment key={item.key}>
                  {index > 0 && <span className="mx-3 h-4 w-px bg-border" aria-hidden="true" />}
                  <span className={item.cls}>
                    <span className="font-semibold">{item.count}</span> {item.label}
                  </span>
                </Fragment>
              ))}
            </div>
          )}
          {/*<p className="mt-2 text-caption text-fg-muted">
            These do not replace the request status shown above.
          </p>*/}
        </div>

        {/* Rejected project alert */}
        {rejected.length > 0 && (
          <Alert variant="danger" className={REJECTED_ALERT_STYLE}>
            <AlertTitle>
              {rejected.length === 1
                ? '1 project requires clarification'
                : `${rejected.length} projects require clarification`}
            </AlertTitle>
            <AlertDescription>
              {rejected.length === 1
                ? `Please clarify the placement duration for “${rejected[0].remarks || rejected[0].title || 'Untitled project'}”.`
                : rejected.map(p => p.remarks || `Please review "${p.title || 'Untitled project'}".`).join(' ')}
            </AlertDescription>
          </Alert>
        )}

        {/* Footer action */}
        <div className="mt-auto flex flex-col gap-3 sm:flex-row sm:items-center">
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
