'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Shell from '@/components/layout/shell';
import Button from '@/components/ui-legacy/button';
import EmptyState from '@/components/ui-legacy/empty-state';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Inbox, ArrowRight, CheckCircle2, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { loadLiveProgrammeOptions, CONTACTS } from '@/lib/data';
import { loadRequests, loadSubmissions } from '@/lib/storage';
import { useRole } from '@/lib/role';
import { useToast, Toast } from '@/components/ui-legacy/toast';
import {
  groupRequests, isGroupClosed, groupTotals, daysLeft, submittedForGroup,
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

  // Projects the IO rejected — AD (P&C) needs to revise and resubmit these.
  const rejectedItems = batches.flatMap(b =>
    b.projects.filter(p => p.status === 'rejected').map(p => ({ batch: b, proj: p })),
  );

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
        <h1 className="text-headline-lg text-fg mb-1">Respond to request from internship HQ</h1>
        <p className="text-body-sm text-fg-muted">
          Submit projects to respond to this project request before deadline indicated.
          <br />
          IO will review your submission.
        </p>
      </div>

      {/* Rejected projects — surfaced so AD (P&C) can revise and resubmit them */}
      {rejectedItems.length > 0 && (
        <div className="mb-6 overflow-hidden rounded-lg border border-warning/40 bg-warning-bg">
          <div className="flex items-center gap-2 border-b border-warning/30 px-4 py-3">
            <AlertTriangle size={16} className="text-warning" />
            <p className="text-label-md font-semibold text-fg">
              Needs revision ({rejectedItems.length})
            </p>
          </div>
          <div className="divide-y divide-warning/20">
            {rejectedItems.map(({ batch, proj }) => (
              <div key={proj.id} className="flex items-start justify-between gap-4 bg-surface px-4 py-3">
                <div className="min-w-0">
                  <p className="text-body-sm font-medium text-fg truncate">{proj.title || 'Untitled project'}</p>
                  {proj.remarks && (
                    <p className="mt-0.5 text-caption text-fg-muted line-clamp-2">
                      <span className="font-semibold text-warning">IO feedback: </span>{proj.remarks}
                    </p>
                  )}
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="shrink-0"
                  onClick={() => router.push(`/submissions/edit/${encodeURIComponent(batch.id)}/${encodeURIComponent(proj.id)}`)}
                >
                  Edit &amp; resubmit
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

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
          <Tabs value={tab} onValueChange={value => setTab(value as 'open' | 'done')} className="mb-5">
            <TabsList aria-label="Project request status">
              <TabsTrigger value="open">Open {openGroups.length}</TabsTrigger>
              <TabsTrigger value="done">Closed {doneGroups.length}</TabsTrigger>
            </TabsList>
          </Tabs>

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
            <div className="space-y-4">
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
  const days = daysLeft(group.deadline);
  const open = !isGroupClosed(group);

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-surface shadow-sm">
      {/* Top row: sender and deadline */}
      <div className="flex flex-col gap-2 border-b border-border bg-bg-subtle/40 px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between">
        <p className="min-w-0 truncate text-body-sm text-fg-muted">
          Request from <span className="font-semibold text-fg">{group.senderName ?? 'IO Admin'}</span>
          <span className="text-fg-subtle"> · sent {fmtDate(group.sentDate)}</span>
        </p>
        <div className="flex shrink-0 items-center gap-2 text-body-sm">
          <span className="text-caption text-fg-muted">Deadline</span>
          <span className="font-semibold text-fg">{fmtDate(group.deadline)}</span>
          {open && days >= 0 && (
            <span className={cn(
              'rounded-full px-2 py-0.5 text-caption font-semibold',
              days <= 3 ? 'bg-danger-bg text-danger' : days <= 7 ? 'bg-warning-bg text-warning' : 'bg-bg-subtle text-fg-muted',
            )}>
              {days} days left
            </span>
          )}
          {open && days < 0 && (
            <span className="rounded-full bg-danger-bg px-2 py-0.5 text-caption font-semibold text-danger">
              {Math.abs(days)} days overdue
            </span>
          )}
        </div>
      </div>

      {/* Body: requested tasks · actions */}
      <div className="grid gap-5 px-5 py-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
        <div className="min-w-0">
          <p className="mb-2 text-caption text-fg-muted">Requested placements</p>
          <div className="max-w-xl">
            <ul className="space-y-1">
              {categoryTotals.map(item => (
                <li key={item.label} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-6 text-body-sm">
                  <span className="font-medium text-fg">{item.label}</span>
                  <span className="text-fg-muted tabular-nums">
                    {item.uploaded} submitted of {item.placements}
                  </span>
                </li>
              ))}
            </ul>
            <div className="mt-3 flex items-center justify-between border-t border-border pt-3 text-body-sm">
              <span className="font-semibold text-fg">Total submitted</span>
              <span className="font-semibold text-fg tabular-nums">
                {uploaded} of {placements}
              </span>
            </div>
          </div>
        </div>

        {/* Primary action */}
        <div className="flex flex-col gap-3 lg:w-28 lg:justify-self-end">
          {open ? (
            <Button size="sm" onClick={onUpload} className="w-full justify-center">
              Upload
              <ArrowRight size={16} />
            </Button>
          ) : (
            <span className="inline-flex items-center justify-center gap-1.5 text-body-sm font-semibold text-fg-muted">
              <CheckCircle2 size={15} />
              Closed
            </span>
          )}
          <Button size="sm" variant="outline" onClick={onViewProject} className="w-full justify-center">
            View Submission
          </Button>
        </div>
      </div>
    </div>
  );
}
