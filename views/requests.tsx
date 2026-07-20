'use client';

import { useState, useEffect, useMemo, Fragment } from 'react';
import { useRouter } from 'next/navigation';
import Shell from '@/components/layout/shell';
import Button from '@/components/ui-legacy/button';
import Modal from '@/components/ui-legacy/modal';
import DatePicker from '@/components/ui-legacy/date-picker';
import TableToolbar from '@/components/ui-legacy/table-toolbar';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui-legacy/table';
import {
  DataTable,
  createColumnHelper,
  getSizeValue,
  type ColumnDef,
  type Row,
} from '@/components/ui-legacy/data-table';
import type { Table as TanStackTable } from '@tanstack/react-table';
import {
  Menu,
  MenuContent,
  MenuItem,
  MenuSeparator,
  MenuTrigger,
} from '@/components/ui/menu';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UnderlineTabs } from '@/components/ui-legacy/underline-tabs';
import {
  Send, Check, X, FileText, ChevronRight, Filter, MoreVertical, Eye, Bell, CalendarClock, Pencil, Trash2, Ban,
  ArrowUp, ArrowDown, ArrowUpDown,
} from 'lucide-react';
import { CONTACTS, progEducationLevelMap, batchEducationLevel } from '@/lib/data';
import { projectMatchesRequest } from '@/lib/request-groups';
import { parseDisciplines } from '@/lib/disciplines';
import { downloadRequestTemplateXLSX } from '@/lib/request-template';
import { Paperclip, Download } from 'lucide-react';
import { loadRequestAuditLogs, loadRequests, saveRequestAuditLogs, saveRequests, loadProjects, saveProjects, loadSubmissions, saveSubmissions } from '@/lib/storage';
import { useProgramme } from '@/lib/programme-context';
import { addNotification } from '@/lib/notifications';
import { cn, exportToCSV } from '@/lib/utils';
import { Toast, useToast } from '@/components/ui-legacy/toast';
import type {
  ProjectRequest, RequestStatus,
  ProjectRequestAuditEntry, ProjectSubmissionBatch, ProjectEntry,
} from '@/lib/types';
import { useRole } from '@/lib/role';

/* ── Types ────────────────────────────────────────────────────────────────── */
type FlatProj = {
  key: string; batchId: string; projId: string;
  title: string; mentor: string; discipline: string; slots: number;
  status: 'pending' | 'approved' | 'rejected';
  aiCheck: { grammar: 'pass'|'warn'|'fail'; level: 'pass'|'warn'|'fail'; notes: string[] };
  remarks?: string;
  educationLevel: string; requestedEducationLevels: string[];
  // The project request this submission answers — lets the PC group show
  // placements submitted / placements requested.
  requestId: string; requestedPlacements: number;
  progId: string; progLabel: string; pc: string; headName: string; submittedBy: string;
};

type PendingPCGroup = { pc: string; rows: FlatProj[] };

type TabKey = 'sent' | 'pending' | 'rejected' | 'approved' | 'all';
type PCGroup = { key?: string; pc: string; headName: string; requests: ProjectRequest[] };

/* ── Helpers ──────────────────────────────────────────────────────────────── */
function fmtDate(d: string) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-SG', { day: 'numeric', month: 'short', year: 'numeric' });
}

function requestProgrammeCenter(req: ProjectRequest): string {
  if (req.programmeCenter) return req.programmeCenter;
  return CONTACTS.find(c => c.email === req.pc)?.pc ?? req.pc;
}

/** The AD (P&C) for a request's Programme Centre — derived from the address book
    (the request stores the PC Head, not the AD, so resolve it by centre). */
function requestAdPnc(req: ProjectRequest): string {
  const pc = requestProgrammeCenter(req);
  return CONTACTS.find(c => c.title === 'AD (P&C)' && c.pc === pc)?.name ?? '';
}

function requestInternCategory(req: ProjectRequest, progMap: Record<string, string>): string {
  return req.internCategory ?? progMap[req.educationLevel] ?? req.educationLevel;
}

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function dateOnlyTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

/* ── Email Sent modal ─────────────────────────────────────────────────────────
   A recipient row can span several sends. Each send is one real email (identified
   by its uploadToken — its own link, deadline and date), so we render one email per
   send as a collapsible item rather than merging them into a single message. */
function EmailSentModal({
  group,
  progMap,
  onClose,
}: {
  group: { pc: string; headName: string; requests: ProjectRequest[] };
  progMap: Record<string, string>;
  onClose: () => void;
}) {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const sender = group.requests[0]?.senderName ?? 'Internship Officer';

  const sendMap = new Map<string, ProjectRequest[]>();
  for (const r of group.requests) {
    const key = r.uploadToken || `${r.sentDate}|${r.deadline}`;
    if (!sendMap.has(key)) sendMap.set(key, []);
    sendMap.get(key)!.push(r);
  }
  const sends = Array.from(sendMap.values()).sort(
    (a, b) => (b[0].sentDate > a[0].sentDate ? 1 : b[0].sentDate < a[0].sentDate ? -1 : 0),
  );

  const emails = sends.map(reqs => {
    const token    = reqs[0]?.uploadToken;
    const link     = token ? `${origin}/upload/${token}` : '(upload link)';
    const sentDate = reqs.reduce((max, r) => (r.sentDate > max ? r.sentDate : max), '');
    const deadline = reqs.reduce((min, r) => (!min || r.deadline < min ? r.deadline : min), '');
    const progNames = reqs.map(r => requestInternCategory(r, progMap));
    // If the IO customised the email in the request preview, use their edits.
    const edited = reqs.find(r => r.emailIntro !== undefined || r.emailClosing !== undefined || r.emailSubject !== undefined);
    const subject  = edited?.emailSubject || `[DSTA] Project Request – ${progNames.join(', ')}`;
    const placementLines = reqs
      .map(r => {
        const period = r.calendarPeriod
          || (r.periodStart && r.periodEnd
              ? (r.periodStart === r.periodEnd ? r.periodStart : `${r.periodStart} – ${r.periodEnd}`)
              : '');
        const extra = [period, r.duration].filter(Boolean).join(', ');
        return `  • ${requestInternCategory(r, progMap)}: ${r.placements} slot${r.placements !== 1 ? 's' : ''}${extra ? ` (${extra})` : ''}`;
      })
      .join('\n');
    const body = edited && (edited.emailIntro !== undefined || edited.emailClosing !== undefined)
      ? [edited.emailIntro ?? '', '', placementLines, '', edited.emailClosing ?? ''].join('\n')
      : [
      `Dear ${requestAdPnc(reqs[0]) || 'AD (P&C)'},`,
      '',
      `We are requesting project submissions for the intern categories, calendar periods and durations listed below.`,
      '',
      `What you need to do:`,
      `1. Complete the attached Excel template (DSTA_Project_Request_Template.xlsx) with your proposed projects for each intern category and calendar period.`,
      `2. Ensure every submitted project has obtained the necessary security clearance.`,
      `3. Obtain approval from the PC Head for all submitted projects before they are uploaded.`,
      `4. Upload the completed projects into the system using the link below.`,
      '',
      `Requested placements:`,
      placementLines,
      '',
      `Attachment: DSTA_Project_Request_Template.xlsx. Please fill in your project details in this template.`,
      '',
      `System upload link (for the AD (P&C) to enter the system and upload the completed projects):`,
      link,
      '',
      `Please submit by ${fmtDate(deadline)}.`,
      '',
      `Thank you for your continued support.`,
      '',
      `Warm regards,`,
      sender,
      `Internship Officer, DSTA`,
    ].join('\n');
    return { key: token ?? sentDate, sentDate, subject, body, reqs };
  });
  const multiple = emails.length > 1;
  // Accordion: one email open at a time; default to the most recent.
  const [openKey, setOpenKey] = useState<string | null>(emails[0]?.key ?? null);

  return (
    <Modal open onClose={onClose} maxWidth="xl" labelledBy="email-preview-title">
      <h2 id="email-preview-title" className="text-headline-md font-bold text-fg">
        {multiple ? `Emails Sent (${emails.length})` : 'Email Sent'}
      </h2>
      <p className="mt-0.5 mb-4 text-body-sm text-fg-muted break-words">
        To {group.requests[0]?.emailTo || requestAdPnc(group.requests[0]) || 'AD (P&C)'}
        {(group.requests[0]?.emailCc || group.headName) ? ` · Cc ${group.requests[0]?.emailCc || group.headName}` : ''}
      </p>
      <div className="max-h-[65vh] space-y-3 overflow-y-auto overscroll-contain pr-1">
        {emails.map((email, i) => {
          const isOpen = multiple ? openKey === email.key : true;
          return (
            <div key={email.key} className="overflow-hidden rounded-lg border border-border">
              {multiple && (
                <button
                  type="button"
                  onClick={() => setOpenKey(isOpen ? null : email.key)}
                  aria-expanded={isOpen}
                  className="flex w-full items-center gap-2 bg-bg-subtle px-4 py-2.5 text-left transition-colors hover:bg-bg-muted"
                >
                  <ChevronRight size={14} className={cn('shrink-0 text-fg-muted transition-transform duration-150', isOpen && 'rotate-90')} />
                  <span className="shrink-0 text-body-sm font-semibold text-fg">Email {i + 1}</span>
                  <span className="truncate text-body-sm text-fg-muted">· {fmtDate(email.sentDate)} · {email.subject}</span>
                </button>
              )}
              {isOpen && (
                <div className="space-y-3 p-4">
                  {!multiple && (
                    <div className="rounded-lg border border-border bg-bg-subtle divide-y divide-border">
                      <div className="flex gap-3 px-4 py-2.5 text-body-sm">
                        <span className="text-fg-muted w-14 shrink-0">Date</span>
                        <span className="text-fg">{fmtDate(email.sentDate)}</span>
                      </div>
                      <div className="flex gap-3 px-4 py-2.5 text-body-sm">
                        <span className="text-fg-muted w-14 shrink-0">Subject</span>
                        <span className="text-fg font-medium break-words">{email.subject}</span>
                      </div>
                    </div>
                  )}
                  <div className="rounded-lg border border-border bg-surface px-4 py-4">
                    <pre className="text-body-sm text-fg whitespace-pre-wrap break-words font-sans leading-relaxed">{email.body}</pre>
                  </div>
                  {/* Excel template attachment */}
                  <div className="flex items-center gap-3 rounded-lg border border-border bg-bg-subtle px-4 py-3">
                    <Paperclip size={16} className="shrink-0 text-fg-muted" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-body-sm font-medium text-fg">DSTA_Project_Request_Template.xlsx</p>
                      <p className="text-caption text-fg-muted">Project-submission template — pre-structured with the requested categories &amp; periods.</p>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => downloadRequestTemplateXLSX(email.reqs, 'DSTA_Project_Request_Template.xlsx')}>
                      <Download size={14} />Download
                    </Button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div className="mt-4 flex justify-end">
        <Button variant="ghost" onClick={onClose}>Close</Button>
      </div>
    </Modal>
  );
}


/* ── Col-header filter dropdown ───────────────────────────────────────────── */
function ColFilterDropdown({
  id, options, selected, onApply, onClose, pos,
}: {
  id: string;
  options: { value: string; label: string }[];
  selected: string[];
  onApply: (v: string[]) => void;
  onClose: () => void;
  pos: { top: number; left: number };
}) {
  const [draft, setDraft] = useState<string[]>(selected);
  useEffect(() => {
    function handler(e: MouseEvent) {
      const el = document.getElementById(id);
      if (el && !el.contains(e.target as Node)) onClose();
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [id, onClose]);
  return (
    <div
      id={id}
      style={{ position: 'fixed', top: pos.top, left: pos.left }}
      className="z-[9999] min-w-44 bg-surface border border-border rounded-lg shadow-xl overflow-hidden"
      onClick={e => e.stopPropagation()}
    >
      <div className="p-3 space-y-0.5">
        {options.map(opt => (
          <label key={opt.value} className="flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer hover:bg-bg-subtle">
            <Checkbox
              checked={draft.includes(opt.value)}
              onCheckedChange={() => setDraft(d => d.includes(opt.value) ? d.filter(x => x !== opt.value) : [...d, opt.value])}
              aria-label={`Filter by ${opt.label}`}
            />
            <span className="text-body-sm text-fg">{opt.label}</span>
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

/* ── Status config ────────────────────────────────────────────────────────── */
type DisplayRequestStatus = 'draft' | 'pending' | 'incomplete' | 'fulfilled' | 'closed' | 'withdrawn' | 'expired';

const STATUS_META: Record<DisplayRequestStatus, { label: string; cls: string; tip: string }> = {
  draft:      { label: 'Draft',      cls: 'bg-[rgba(244,242,236,1)] text-[rgba(69,85,108,1)]',   tip: 'Request has not been sent.'                         },
  pending:    { label: 'Pending',    cls: 'bg-[rgba(0,166,244,0.15)] text-[rgba(0,105,168,1)]',  tip: 'Request sent. Awaiting project submission.'          },
  incomplete: { label: 'Incomplete', cls: 'bg-[rgba(254,154,0,0.15)] text-[rgba(187,77,0,1)]',   tip: 'Requested placements are not fully fulfilled.'       },
  fulfilled:  { label: 'Fulfilled',  cls: 'bg-[rgba(0,201,80,0.15)] text-[rgba(0,130,54,1)]',    tip: 'Requested placements have been fulfilled.'           },
  closed:     { label: 'Closed',     cls: 'bg-[rgba(244,242,236,1)] text-[rgba(69,85,108,1)]',   tip: 'Response deadline has passed. The request is closed.' },
  withdrawn:  { label: 'Withdrawn',  cls: 'bg-[rgba(251,44,54,0.15)] text-[rgba(193,0,7,1)]',  tip: 'Request withdrawn by the IO. Raise a new request to re-issue.' },
  expired:    { label: 'Expired',    cls: 'bg-[rgba(251,44,54,0.15)] text-[rgba(193,0,7,1)]',    tip: 'Request has expired.'                                },
};

const LINE_STATUS_META = {
  overTarget: {
    label: 'Over Target',
    cls: 'text-warning',
    tip: 'Submitted projects exceed requested placements.',
  },
};

const PROJ_REVIEW_TIPS: Record<string, string> = {
  approved:  'Approved by IO and added to Projects.',
  rejected:  'Rejected by IO and will not proceed.',
  pending:   'Submitted and awaiting IO review.',
};

function StatusTooltip({ tip, children }: { tip: string; children: React.ReactNode }) {
  return (
    <span className="relative inline-block group/tip">
      {children}
      <span className={cn(
        'pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50',
        'w-max max-w-64 rounded-md border border-border bg-surface-elevated px-2.5 py-1.5',
        'text-xs font-normal leading-relaxed text-fg shadow-md text-left',
        'opacity-0 group-hover/tip:opacity-100 transition-opacity duration-150',
      )}>
        {tip}
      </span>
    </span>
  );
}

const PROJ_STATUS_SORT: Record<string, number>        = { pending: 0, rejected: 2, approved: 3 };
const REQ_STATUS_ORDER: Record<DisplayRequestStatus, number> = { draft: 0, pending: 1, incomplete: 2, fulfilled: 3, closed: 4, withdrawn: 5, expired: 6 };

function sentGroupMetrics(group: PCGroup) {
  const placements = group.requests.reduce((s, r) => s + r.placements, 0);
  const uploaded = group.requests.reduce((s, r) => s + (r.uploaded ?? 0), 0);
  const earliestDeadline = group.requests.reduce(
    (min, r) => (!min || r.deadline < min ? r.deadline : min), ''
  );
  const latestSent = group.requests.reduce(
    (max, r) => (!max || r.sentDate > max ? r.sentDate : max), ''
  );
  const worstStatus = group.requests.reduce<DisplayRequestStatus>(
    (worst, r) => {
      const status = requestDisplayStatus(r);
      return REQ_STATUS_ORDER[status] < REQ_STATUS_ORDER[worst] ? status : worst;
    },
    requestDisplayStatus(group.requests[0])
  );
  return { placements, uploaded, earliestDeadline, latestSent, worstStatus };
}

function StatusBadge({ meta }: { meta: { label: string; cls: string } }) {
  return (
    <span className={cn('badge text-caption font-normal', meta.cls)}>
      {meta.label}
    </span>
  );
}

function LineStatusFlag({ meta }: { meta: { label: string; cls: string; tip: string } }) {
  return (
    <StatusTooltip tip={meta.tip}>
      <span className={cn('inline-flex items-center gap-1 text-caption font-medium', meta.cls)}>
        <span aria-hidden className="flex h-3.5 w-3.5 items-center justify-center rounded-full border border-current text-[10px] leading-none">!</span>
        {/*{meta.label}*/}
      </span>
    </StatusTooltip>
  );
}

function isOverTarget(req: ProjectRequest) {
  return req.status === 'excess' || req.uploaded > req.placements;
}

/* A sent request whose response deadline day is in the past is closed — it stops
   accepting submissions and moves to the Closed tab regardless of fulfilment. */
function deadlinePassed(deadline: string): boolean {
  const t = dateOnlyTime(deadline);
  if (t === null) return false;
  const now = new Date();
  return t < new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
}

function requestDisplayStatus(req: ProjectRequest): DisplayRequestStatus {
  if (!req.sentDate || !req.uploadToken) return 'draft';
  if (req.withdrawn) return 'withdrawn';
  if (deadlinePassed(req.deadline)) return 'closed';
  if (req.status === 'pending') return 'pending';
  if (req.status === 'partial' || req.status === 'overdue') return 'incomplete';
  return 'fulfilled';
}

function requestActionKey(req: ProjectRequest): string {
  return req.uploadToken || req.id || `${req.pc}::${req.educationLevel}::${req.internCategory ?? ''}`;
}

/* Identity of one SENT request in the list: its upload token (each request now gets
   its own), so two requests to the same PC render as two separate rows instead of
   collapsing under one PC. Falls back to id / pc+dates for legacy rows. */
function sentGroupKey(req: ProjectRequest): string {
  return req.uploadToken || req.id || `${req.pc}::${req.sentDate}::${req.deadline}`;
}

function draftRequestGroupKey(req: ProjectRequest): string {
  const match = req.id?.match(/^draft-request-(\d+)/);
  return match?.[1] ?? req.id ?? `${req.pc}::${req.deadline}::${req.educationLevel}::${req.internCategory ?? ''}`;
}

function appendRequestAudit(entry: Omit<ProjectRequestAuditEntry, 'id' | 'at'>) {
  const logs = loadRequestAuditLogs();
  saveRequestAuditLogs([
    {
      ...entry,
      id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      at: new Date().toISOString(),
    },
    ...logs,
  ]);
}

/* ── Column definitions ───────────────────────────────────────────────────── */
const COL_DEFS = [
  { key: 'pc',       label: 'Programme Centre' },
  { key: 'title',    label: 'Project'          },
  { key: 'category',   label: 'Intern Category'     },
  { key: 'discipline', label: 'Discipline of Study'  },
  { key: 'slots',      label: 'Placements'          },
] as const;
type ColKey = typeof COL_DEFS[number]['key'];
const DEFAULT_COLS: Record<ColKey, boolean> = {
  pc: true, title: true, category: true, discipline: true, slots: true,
};
const COLS_KEY = 'dsta_req_visible_cols';

/* Column defs for the grouped "Requests Sent" tab. */
const SENT_COL_DEFS = [
  { key: 'programmeCenter', label: 'Programme Centre' },
  { key: 'programmes', label: 'Intern Category'      },
  { key: 'placements', label: 'Placements Requested' },
  { key: 'requestDate', label: 'Request Date'        },
  { key: 'deadline',   label: 'Response Deadline'    },
  { key: 'status',     label: 'Status'               },
] as const;
type SentColKey = typeof SENT_COL_DEFS[number]['key'];
const SENT_DEFAULT_COLS: Record<SentColKey, boolean> = {
  programmeCenter: true, programmes: true, placements: true, requestDate: true, deadline: true, status: true,
};
const SENT_COLS_KEY = 'dsta_req_sent_visible_cols';
const SENT_PAGE_SIZE_OPTIONS = [10, 20, 30] as const;
type RequestListTab = 'draft' | 'open' | 'closed';

function SortHeader({
  label,
  colId,
  sortCol,
  sortDir,
  onSort,
  filter,
  labelClassName,
}: {
  label: string;
  colId: string;
  sortCol: string | null;
  sortDir: 1 | -1;
  onSort: (col: string) => void;
  filter?: React.ReactNode;
  labelClassName?: string;
}) {
  const isSorted = sortCol === colId;
  const allowWrap =
    typeof labelClassName === 'string' &&
    (labelClassName.includes('whitespace-normal') ||
      labelClassName.includes('whitespace-pre-wrap') ||
      labelClassName.includes('whitespace-pre-line'));
  return (
    <div
      onClick={(e) => {
        e.stopPropagation();
        onSort(colId);
      }}
      className={cn(
        'flex h-full items-center gap-1 cursor-pointer select-none',
        allowWrap && 'min-h-10',
      )}
    >
      <span className={cn(!allowWrap && 'truncate', labelClassName)}>{label}</span>
      {isSorted ? (
        sortDir === 1 ? (
          <ArrowUp size={13} className="text-accent shrink-0" />
        ) : (
          <ArrowDown size={13} className="text-accent shrink-0" />
        )
      ) : (
        <ArrowUpDown size={13} className="text-fg-subtle shrink-0" />
      )}
      {filter}
    </div>
  );
}

function RequestTabEmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-bg-muted text-fg-muted">
        <FileText className="h-6 w-6" aria-hidden="true" />
      </div>
      <p className="text-sm font-semibold text-fg">{title}</p>
      <p className="mt-1 max-w-xs text-sm text-fg-muted">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

/* Ids of the old seeded demo drafts — stripped from localStorage on load so the
   requests list (and the AD (P&C) views) start empty until a real request is made. */
const DEMO_REQUEST_IDS = new Set([
  'draft-request-demo-001',
  'draft-request-demo-002',
  'draft-request-demo-003',
]);

/* ── Page ─────────────────────────────────────────────────────────────────── */
export default function RequestsPage() {
  const router   = useRouter();
  const { role, roleReady, profile } = useRole();
  const { progOpts } = useProgramme();
  const progMap  = Object.fromEntries(progOpts.map(p => [p.value, p.label]));
  const { toast, showToast } = useToast();

  const [reqs,       setReqs]       = useState<ProjectRequest[]>(loadRequests());
  const [batches,    setBatches]    = useState<ProjectSubmissionBatch[]>([]);
  const [search,     setSearch]     = useState('');
  // Top-level workspace: 'requests' (Project Requests — draft/open/closed) vs
  // 'submissions' (Project Submissions — the AD(P&C) projects awaiting IO review).
  const [topTab, setTopTab] = useState<'requests' | 'submissions'>('requests');
  // Submission-review sub-tab, active only under the Project Submissions top tab.
  const [tab, setTab] = useState<TabKey>('pending');
  // Collapsed PC groups in the Pending Review sub-tab (Projects-style grouping).
  // Which Pending-Review PC groups are expanded. Empty ⇒ all collapsed by default.
  const [expandedSubPcs, setExpandedSubPcs] = useState<Set<string>>(new Set());
  const [requestTab, setRequestTab] = useState<RequestListTab>('open');
  const [sortCol,     setSortCol]     = useState<string | null>(null);
  const [sortDir,     setSortDir]     = useState<1|-1>(1);
  const [statusCF,    setStatusCF]    = useState<string[]>([]);
  const [statusCFOpen, setStatusCFOpen] = useState(false);
  const [statusCFPos,  setStatusCFPos]  = useState({ top: 0, left: 0 });
  const [expandedPcs, setExpandedPcs] = useState<Set<string>>(new Set());
  const [visibleCols, setVisibleCols] = useState<Record<ColKey, boolean>>(DEFAULT_COLS);
  const [sentVisibleCols, setSentVisibleCols] = useState<Record<SentColKey, boolean>>(SENT_DEFAULT_COLS);
  const [sentPage, setSentPage] = useState(1);
  const [sentPageSize, setSentPageSize] = useState<number>(10);
  // Project Submissions pagination (pages PC groups on Pending, flat rows otherwise).
  const [subPage, setSubPage] = useState(1);
  const [subPageSize, setSubPageSize] = useState<number>(10);

  /* ── Bulk selection states ────────────────────────────────────────────── */
  const [selectedKeys,      setSelectedKeys]      = useState<Set<string>>(new Set());
  const [bulkApproveOpen,   setBulkApproveOpen]   = useState(false);
  const [bulkRejectOpen,    setBulkRejectOpen]     = useState(false);
  const [bulkRejectRemarks, setBulkRejectRemarks] = useState('');
  const [extendGroup, setExtendGroup] = useState<{ pc: string; headName: string; requests: ProjectRequest[] } | null>(null);
  const [extendDeadline, setExtendDeadline] = useState('');
  const [withdrawGroup, setWithdrawGroup] = useState<PCGroup | null>(null);

  function handleSearch(value: string) {
    setSearch(value);
    setSentPage(1);
    setSubPage(1);
  }

  function handleRequestTabChange(value: string | number | null) {
    setRequestTab(value === 'draft' ? 'draft' : value === 'closed' ? 'closed' : 'open');
    setAppStatusCF([]);
    setSentPage(1);
    setExpandedPcs(new Set());
  }

  function doSort(col: string) {
    setSentPage(1);
    if (sortCol === col) setSortDir(d => d === 1 ? -1 : 1);
    else { setSortCol(col); setSortDir(1); }
  }
  function toggleCol(key: ColKey) {
    setVisibleCols(prev => {
      const next = { ...prev, [key]: !prev[key] };
      try { localStorage.setItem(COLS_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  }
  function toggleSentCol(key: SentColKey) {
    setSentVisibleCols(prev => {
      const next = { ...prev, [key]: !prev[key] };
      try { localStorage.setItem(SENT_COLS_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  }

  function openExtendDeadline(group: PCGroup) {
    const { earliestDeadline } = sentGroupMetrics(group);
    setExtendGroup(group);
    setExtendDeadline(earliestDeadline);
  }

  function doExtendDeadline() {
    if (!extendGroup || !extendDeadline) return;
    const targetIds = new Set(extendGroup.requests.map(r => r.id).filter(Boolean));
    const targetKeys = new Set(extendGroup.requests.map(r => `${r.uploadToken ?? ''}::${r.pc}::${r.educationLevel}::${r.internCategory ?? ''}`));
    const updated = reqs.map(req => {
      const idMatch = req.id && targetIds.has(req.id);
      const keyMatch = targetKeys.has(`${req.uploadToken ?? ''}::${req.pc}::${req.educationLevel}::${req.internCategory ?? ''}`);
      return idMatch || keyMatch ? { ...req, deadline: extendDeadline } : req;
    });
    saveRequests(updated);
    setReqs(updated);
    addNotification({
      forRole: 'ad-pnc',
      title: `Response deadline updated — ${requestProgrammeCenter(extendGroup.requests[0])}`,
      body: `${requestAdPnc(extendGroup.requests[0]) || 'AD (P&C)'}, the response deadline has been updated to ${fmtDate(extendDeadline)}.`,
      href: '/submissions',
      tier: 'action',
    });
    setExtendGroup(null);
    showToast(`Deadline updated to ${fmtDate(extendDeadline)}. AD (P&C) notified by email.`);
  }

  function doWithdraw() {
    if (!withdrawGroup) return;
    const today = todayISO();
    const targetIds = new Set(withdrawGroup.requests.map(r => r.id).filter(Boolean));
    const targetKeys = new Set(withdrawGroup.requests.map(r => `${r.uploadToken ?? ''}::${r.pc}::${r.educationLevel}::${r.internCategory ?? ''}`));
    const updated = reqs.map(req => {
      const idMatch = req.id && targetIds.has(req.id);
      const keyMatch = targetKeys.has(`${req.uploadToken ?? ''}::${req.pc}::${req.educationLevel}::${req.internCategory ?? ''}`);
      return idMatch || keyMatch ? { ...req, withdrawn: true, withdrawnDate: today } : req;
    });
    saveRequests(updated);
    setReqs(updated);
    const pc = requestProgrammeCenter(withdrawGroup.requests[0]);
    appendRequestAudit({
      requestKey: sentGroupKey(withdrawGroup.requests[0]),
      action: 'withdrawn',
      actor: profile.name,
      summary: `Request withdrawn for ${pc}`,
    });
    addNotification({
      forRole: 'ad-pnc',
      title: `Project request withdrawn — ${pc}`,
      body: `${requestAdPnc(withdrawGroup.requests[0]) || 'AD (P&C)'}, the project request for ${pc} has been withdrawn by the IO. No submission is needed against it.`,
      href: '/submissions',
      tier: 'action',
    });
    setWithdrawGroup(null);
    setRequestTab('closed');
    showToast(`Request for ${pc} withdrawn. AD (P&C) notified by email.`);
  }

  function sendReminder(group: PCGroup) {
    const { earliestDeadline } = sentGroupMetrics(group);
    addNotification({
      forRole: 'ad-pnc',
      title: `Project request reminder — ${requestProgrammeCenter(group.requests[0])}`,
      body: `Reminder sent to ${group.headName}. Response deadline: ${fmtDate(earliestDeadline)}.`,
      href: '/submissions',
      tier: 'action',
    });
    showToast(`Reminder sent to ${group.headName}.`);
  }

  function openRequestEditor(group: PCGroup) {
    router.push(`/requests/edit/${encodeURIComponent(requestActionKey(group.requests[0]))}`);
  }

  function deleteDraftRequest(group: PCGroup) {
    const auditKey = requestActionKey(group.requests[0]);
    const draftIds = new Set(group.requests.map(r => r.id).filter(Boolean));
    const updated = reqs.filter(req => {
      const idMatch = req.id && draftIds.has(req.id);
      return !(requestDisplayStatus(req) === 'draft' && idMatch);
    });
    saveRequests(updated);
    setReqs(updated);
    appendRequestAudit({
      requestKey: auditKey,
      action: 'deleted',
      actor: profile.name,
      summary: `Draft deleted for ${group.headName}`,
    });
    showToast(`Draft request for ${group.headName} deleted.`);
  }

  function sentActionMenu(group: PCGroup) {
    const isDraftGroup = group.requests.every(req => requestDisplayStatus(req) === 'draft');
    const groupStatus = sentGroupMetrics(group).worstStatus;
    const canManageOpen = groupStatus === 'pending' || groupStatus === 'incomplete';
    const isClosed = groupStatus === 'closed';
    return (
      <Menu>
        <MenuTrigger
          aria-label={`Actions for ${group.headName}`}
          className="inline-flex h-8 w-8 items-center justify-center rounded-md text-fg-muted transition-colors hover:bg-bg-muted hover:text-fg focus-visible:outline-1 focus-visible:outline-accent"
          onClick={e => e.stopPropagation()}
        >
          <MoreVertical size={16} />
        </MenuTrigger>
        <MenuContent className="w-48" sideOffset={6}>
          {isDraftGroup ? (
            <>
              <MenuItem onClick={() => openRequestEditor(group)}>
                <Pencil size={14} />Edit
              </MenuItem>
              <MenuItem onClick={() => deleteDraftRequest(group)} className="text-danger">
                <Trash2 size={14} />Delete
              </MenuItem>
            </>
          ) : canManageOpen ? (
            <>
              <MenuItem onClick={() => sendReminder(group)}>
                <Bell size={14} />Send Reminder
              </MenuItem>
              <MenuItem onClick={() => openExtendDeadline(group)}>
                <CalendarClock size={14} />Extend Deadline
              </MenuItem>
              <MenuSeparator />
              <MenuItem onClick={() => setWithdrawGroup(group)} className="text-danger">
                <Ban size={14} />Withdraw Request
              </MenuItem>
            </>
          ) : isClosed ? (
            <>
              <MenuItem onClick={() => openExtendDeadline(group)}>
                <CalendarClock size={14} />Extend Deadline
              </MenuItem>
              <MenuItem onClick={() => openRequestEditor(group)}>
                <Eye size={14} />View
              </MenuItem>
            </>
          ) : (
            <>
              <MenuItem onClick={() => openRequestEditor(group)}>
                <Eye size={14} />View
              </MenuItem>
            </>
          )}
        </MenuContent>
      </Menu>
    );
  }

  const draftColumnHelper = createColumnHelper<PCGroup>();
  const draftColumns = useMemo(() => [
    draftColumnHelper.accessor(() => 'draft', {
      id: 'draft',
      header: 'Draft',
      meta: { size: 'medium', truncate: true },
      cell: () => 'Project Request Draft',
    }),
    draftColumnHelper.accessor((group) => {
      const programmeCentreCount = new Set(group.requests.map(requestProgrammeCenter)).size;
      const totalPlacements = group.requests.reduce((sum, req) => sum + req.placements, 0);
      return `${programmeCentreCount} Programme Centre${programmeCentreCount === 1 ? '' : 's'} · ${totalPlacements} placement${totalPlacements === 1 ? '' : 's'} · Draft`;
    }, {
      id: 'summary',
      header: 'Summary',
      meta: { size: 'long', truncate: true },
    }),
    draftColumnHelper.accessor(() => 'No', {
      id: 'notification',
      header: 'Notification sent',
      meta: { size: 'short', truncate: true },
      cell: () => 'No',
    }),
    draftColumnHelper.accessor(() => 'draft', {
      id: 'status',
      header: 'Status',
      meta: { size: 'short' },
      cell: () => (
        <StatusTooltip tip={STATUS_META.draft.tip}>
          <StatusBadge meta={STATUS_META.draft} />
        </StatusTooltip>
      ),
    }),
    draftColumnHelper.display({
      id: 'actions',
      header: '',
      meta: { size: 'icon' },
      cell: ({ row }) => (
        <div className="text-right" onClick={e => e.stopPropagation()}>
          {sentActionMenu(row.original)}
        </div>
      ),
    }),
  ], []);

  const sentColumnHelper = createColumnHelper<PCGroup>();
  const sentColumns: ColumnDef<PCGroup, any>[] = (() => {
    const cols: ColumnDef<PCGroup, any>[] = [];

    if (sentVisibleCols.programmeCenter) {
      cols.push(sentColumnHelper.display({
        id: 'programmeCenter',
        header: () => (
          <SortHeader
            label="Programme Centre"
            colId="programmeCenter"
            sortCol={sortCol}
            sortDir={sortDir}
            onSort={doSort}
            labelClassName="whitespace-normal"
          />
        ),
        meta: { size: 120, truncate: true, labelClassName: 'whitespace-normal' },
        cell: ({ row }) => {
          const group = row.original;
          const gkey = group.key ?? group.pc;
          const isExpanded = expandedPcs.has(gkey);
          return (
            <div className="flex items-center gap-2">
              <ChevronRight
                size={14}
                className={cn('text-fg-muted shrink-0 transition-transform duration-150', isExpanded && 'rotate-90')}
              />
              <span className="text-body-sm font-normal text-fg truncate">
                {requestProgrammeCenter(group.requests[0])}
              </span>
            </div>
          );
        },
      }));
    }

    if (sentVisibleCols.programmes) {
      cols.push(sentColumnHelper.display({
        id: 'programmes',
        header: () => (
          <SortHeader
            label="Intern Category"
            colId="programmes"
            sortCol={sortCol}
            sortDir={sortDir}
            onSort={doSort}
          />
        ),
        meta: { size: 180, truncate: true },
        cell: ({ row }) => {
          const group = row.original;
          return (
            <span className="text-body-sm font-normal text-fg truncate">
              {group.requests.length} intern categor{group.requests.length === 1 ? 'y' : 'ies'}
            </span>
          );
        },
      }));
    }

    cols.push(sentColumnHelper.display({
      id: 'recipient',
      header: () => (
          <SortHeader
          label="AD(P&C)"
          colId="recipient"
          sortCol={sortCol}
          sortDir={sortDir}
          onSort={doSort}
        />
      ),
      meta: { size: 120, truncate: true },
      cell: ({ row }) => {
        const group = row.original;
        const gkey = group.key ?? group.pc;
        const isExpanded = expandedPcs.has(gkey);
        const text = requestAdPnc(group.requests[0]) || '—';
        if (!sentVisibleCols.programmeCenter) {
          return (
            <div className="flex items-center gap-2">
              <ChevronRight
                size={14}
                className={cn('text-fg-muted shrink-0 transition-transform duration-150', isExpanded && 'rotate-90')}
              />
              <p className="text-body-sm font-normal text-fg truncate">{text}</p>
            </div>
          );
        }
        return <p className="text-body-sm font-normal text-fg truncate">{text}</p>;
      },
    }));

    if (sentVisibleCols.placements) {
      cols.push(sentColumnHelper.display({
        id: 'placements',
        header: () => (
          <SortHeader
            label="Placements Requested"
            colId="placements"
            sortCol={sortCol}
            sortDir={sortDir}
            onSort={doSort}
            labelClassName="whitespace-normal"
          />
        ),
        meta: { size: 120, labelClassName: 'whitespace-normal' },
        cell: ({ row }) => {
          const group = row.original;
          const { placements: totalPlacements, uploaded: totalUploaded } = sentGroupMetrics(group);
          const groupOverTarget = group.requests.some(isOverTarget);
          return (
            <div className="flex items-center gap-2">
              <span className="block truncate">{totalUploaded} / {totalPlacements}</span>
              {groupOverTarget && <LineStatusFlag meta={LINE_STATUS_META.overTarget} />}
            </div>
          );
        },
      }));
    }

    if (sentVisibleCols.requestDate) {
      cols.push(sentColumnHelper.display({
        id: 'requestDate',
        header: () => (
          <SortHeader
            label="Request Date"
            colId="requestDate"
            sortCol={sortCol}
            sortDir={sortDir}
            onSort={doSort}
            filter={requestTab === 'closed' ? headerFilterButton('requestDate') : undefined}
            labelClassName="whitespace-normal"
          />
        ),
        meta: { size: 80, truncate: true, labelClassName: 'whitespace-normal' },
        cell: ({ row }) => {
          const { latestSent } = sentGroupMetrics(row.original);
          return <span className="text-body-sm font-normal text-fg truncate">{fmtDate(latestSent)}</span>;
        },
      }));
    }

    if (sentVisibleCols.deadline) {
      cols.push(sentColumnHelper.display({
        id: 'deadline',
        header: () => (
          <SortHeader
            label="Response Deadline"
            colId="deadline"
            sortCol={sortCol}
            sortDir={sortDir}
            onSort={doSort}
            labelClassName="whitespace-normal"
          />
        ),
        meta: { size: 120, truncate: true, labelClassName: 'whitespace-normal' },
        cell: ({ row }) => {
          const { earliestDeadline } = sentGroupMetrics(row.original);
          return <span className="text-body-sm font-normal text-fg truncate">{fmtDate(earliestDeadline)}</span>;
        },
      }));
    }

    if (sentVisibleCols.status) {
      cols.push(sentColumnHelper.display({
        id: 'sentStatus',
        header: () => (
          <SortHeader
            label="Status"
            colId="sentStatus"
            sortCol={sortCol}
            sortDir={sortDir}
            onSort={doSort}
          />
        ),
        meta: { size: 120 },
        cell: ({ row }) => {
          const { worstStatus } = sentGroupMetrics(row.original);
          const worstMeta = STATUS_META[worstStatus];
          return worstMeta ? (
            <StatusTooltip tip={worstMeta.tip}>
              <StatusBadge meta={worstMeta} />
            </StatusTooltip>
          ) : null;
        },
      }));
    }

    cols.push(sentColumnHelper.display({
      id: 'actions',
      header: '',
      meta: { size: 40, noResizable: true, thClassName: 'px-0' },
      cell: ({ row }) => (
        <div className="text-right" onClick={e => e.stopPropagation()}>
          {sentActionMenu(row.original)}
        </div>
      ),
    }));

    return cols;
  })();

  const renderSentSubRows = (row: Row<PCGroup>, table: TanStackTable<PCGroup>) => {
    const group = row.original;
    const gkey = group.key ?? group.pc;
    if (!expandedPcs.has(gkey)) return null;
    return group.requests.map(req => {
      const reqKey = `${req.uploadToken ?? req.id ?? req.pc}-${req.internCategory ?? req.educationLevel}`;
      return (
        <TableRow key={reqKey} className="bg-surface hover:bg-bg transition-colors">
          {sentVisibleCols.programmeCenter && (
            <TableCell
              className="px-4 py-2.5"
              maxWidth={table.getColumn('programmeCenter')?.getSize()}
            />
          )}
          {sentVisibleCols.programmes && (
            <TableCell
              className={cn('py-2.5', sentVisibleCols.programmeCenter ? 'px-4' : 'pl-12 pr-4')}
              maxWidth={table.getColumn('programmes')?.getSize()}
            >
              <p className="text-body-sm font-normal text-fg-muted truncate">
                {requestInternCategory(req, progMap)}
              </p>
            </TableCell>
          )}
          <TableCell
            className="px-4 py-2.5"
            maxWidth={table.getColumn('recipient')?.getSize()}
          />
          {sentVisibleCols.placements && (
            <TableCell
              className="px-4 py-2.5 text-body-sm font-normal text-fg-muted"
              maxWidth={table.getColumn('placements')?.getSize()}
            >
              <div className="flex items-center gap-2">
                <span className="block truncate">{req.uploaded ?? 0} / {req.placements}</span>
                {isOverTarget(req) && <LineStatusFlag meta={LINE_STATUS_META.overTarget} />}
              </div>
            </TableCell>
          )}
          {sentVisibleCols.requestDate && (
            <TableCell
              className="px-4 py-2.5"
              maxWidth={table.getColumn('requestDate')?.getSize()}
            />
          )}
          {sentVisibleCols.deadline && (
            <TableCell
              className="px-4 py-2.5"
              maxWidth={table.getColumn('deadline')?.getSize()}
            />
          )}
          {sentVisibleCols.status && (
            <TableCell
              className="px-4 py-2.5"
              maxWidth={table.getColumn('sentStatus')?.getSize()}
            />
          )}
          <TableCell
            className="px-4 py-2.5"
            maxWidth={table.getColumn('actions')?.getSize()}
          />
        </TableRow>
      );
    });
  };

  const flatColumnHelper = createColumnHelper<FlatProj>();
  const flatColumns: ColumnDef<FlatProj, any>[] = (() => {
    const cols: ColumnDef<FlatProj, any>[] = [];
    if (visibleCols.pc) {
      cols.push(flatColumnHelper.display({
        id: 'pc',
        header: () => <SortHeader label="Programme Centre" colId="pc" sortCol={sortCol} sortDir={sortDir} onSort={doSort} />,
        meta: { size: 180, truncate: true },
        cell: ({ row }) => <span className="text-body-sm text-fg-muted truncate">{row.original.pc}</span>,
      }));
    }
    if (visibleCols.title) {
      cols.push(flatColumnHelper.display({
        id: 'title',
        header: () => <SortHeader label="Project" colId="title" sortCol={sortCol} sortDir={sortDir} onSort={doSort} />,
        meta: { size: 240, truncate: true },
        cell: ({ row }) => {
          const rowData = row.original;
          const isPending = rowData.status === 'pending';
          const isRejected = rowData.status === 'rejected';
          return (
            <div>
              <p className={cn('text-body-sm font-medium truncate', isPending ? 'text-fg group-hover:text-accent transition-colors' : 'text-fg')}>
                {rowData.title}
              </p>
              {isRejected && rowData.remarks && (
                <p className="text-body-sm mt-0.5 leading-snug italic text-danger truncate">
                  {rowData.remarks}
                </p>
              )}
            </div>
          );
        },
      }));
    }
    if (visibleCols.category) {
      cols.push(flatColumnHelper.display({
        id: 'category',
        header: () => <SortHeader label="Intern Category" colId="category" sortCol={sortCol} sortDir={sortDir} onSort={doSort} />,
        meta: { size: 180, truncate: true },
        cell: ({ row }) => {
          const category = row.original.educationLevel || row.original.requestedEducationLevels.join(', ') || '—';
          return <span className="text-body-sm text-fg-muted truncate">{category}</span>;
        },
      }));
    }
    if (visibleCols.discipline) {
      cols.push(flatColumnHelper.display({
        id: 'discipline',
        header: () => <SortHeader label="Discipline of Study" colId="discipline" sortCol={sortCol} sortDir={sortDir} onSort={doSort} />,
        meta: { size: 200, truncate: true },
        cell: ({ row }) => {
          const disciplines = parseDisciplines(row.original.discipline);
          if (disciplines.length === 0) return <span className="text-body-sm text-fg-muted truncate block">—</span>;
          return (
            <div className="flex flex-wrap gap-1 max-w-full">
              {disciplines.map(d => (
                <span key={d} className="badge bg-bg-muted text-fg-muted text-caption font-normal truncate max-w-full">{d}</span>
              ))}
            </div>
          );
        },
      }));
    }
    if (visibleCols.slots) {
      cols.push(flatColumnHelper.display({
        id: 'slots',
        header: () => <SortHeader label="Placements" colId="slots" sortCol={sortCol} sortDir={sortDir} onSort={doSort} />,
        meta: { size: 120, truncate: true },
        cell: ({ row }) => <span className="text-body-sm text-fg-muted truncate">{row.original.slots}</span>,
      }));
    }
    return cols;
  })();

  const pendingColumnHelper = createColumnHelper<PendingPCGroup>();
  const pendingColumns: ColumnDef<PendingPCGroup, any>[] = (() => {
    const cols: ColumnDef<PendingPCGroup, any>[] = [];
    cols.push(pendingColumnHelper.display({
      id: 'select',
      header: () => (
        <Checkbox
          checked={allPendingSel}
          data-state={somePendingSel && !allPendingSel ? 'indeterminate' : undefined}
          aria-label="Select all pending project requests"
          onCheckedChange={() => {
            if (allPendingSel) setSelectedKeys(prev => { const n = new Set(prev); pendingKeys.forEach(k => n.delete(k)); return n; });
            else setSelectedKeys(prev => { const n = new Set(prev); pendingKeys.forEach(k => n.add(k)); return n; });
          }}
        />
      ),
      meta: { size: 48 },
      cell: ({ row }) => {
        const group = row.original;
        const groupKeys = group.rows.map(r => r.key);
        const allSel = groupKeys.length > 0 && groupKeys.every(k => selectedKeys.has(k));
        const someSel = groupKeys.some(k => selectedKeys.has(k));
        return (
          <div onClick={e => e.stopPropagation()}>
            <Checkbox
              checked={allSel}
              data-state={someSel && !allSel ? 'indeterminate' : undefined}
              aria-label={`Select pending projects for ${group.pc}`}
              onCheckedChange={() => setSelectedKeys(prev => {
                const n = new Set(prev);
                if (allSel) groupKeys.forEach(k => n.delete(k));
                else groupKeys.forEach(k => n.add(k));
                return n;
              })}
            />
          </div>
        );
      },
    }));
    if (visibleCols.pc) {
      cols.push(pendingColumnHelper.display({
        id: 'pc',
        header: () => <SortHeader label="Programme Centre" colId="pc" sortCol={sortCol} sortDir={sortDir} onSort={doSort} />,
        meta: { size: 180, truncate: true },
        cell: ({ row }) => {
          const group = row.original;
          const collapsed = !expandedSubPcs.has(group.pc);
          return (
            <button
              type="button"
              onClick={() => togglePcGroup(group.pc)}
              aria-label={`${collapsed ? 'Expand' : 'Collapse'} ${group.pc} projects`}
              className="flex min-w-0 items-center gap-2 text-left w-full"
            >
              <ChevronRight size={16} className={cn('shrink-0 text-fg-muted transition-transform', !collapsed && 'rotate-90')} />
              <span className="text-body-sm font-medium text-fg truncate">{group.pc}</span>
            </button>
          );
        },
      }));
    }
    if (visibleCols.title) {
      cols.push(pendingColumnHelper.display({
        id: 'title',
        header: () => <SortHeader label="Project" colId="title" sortCol={sortCol} sortDir={sortDir} onSort={doSort} />,
        meta: { size: 240, truncate: true },
        cell: ({ row }) => <span className="text-body-sm text-fg truncate">{row.original.rows.length} project{row.original.rows.length !== 1 ? 's' : ''} to review</span>,
      }));
    }
    if (visibleCols.category) {
      cols.push(pendingColumnHelper.display({
        id: 'category',
        header: () => <SortHeader label="Intern Category" colId="category" sortCol={sortCol} sortDir={sortDir} onSort={doSort} />,
        meta: { size: 180, truncate: true },
        cell: ({ row }) => {
          const categoryCount = new Set(row.original.rows.map(r => r.educationLevel || r.requestedEducationLevels.join(', ') || '—')).size;
          return <span className="text-body-sm text-fg-muted truncate">{categoryCount} intern categor{categoryCount === 1 ? 'y' : 'ies'}</span>;
        },
      }));
    }
    if (visibleCols.discipline) {
      cols.push(pendingColumnHelper.display({
        id: 'discipline',
        header: () => <SortHeader label="Discipline of Study" colId="discipline" sortCol={sortCol} sortDir={sortDir} onSort={doSort} />,
        meta: { size: 200, truncate: true },
        cell: () => <span className="text-body-sm text-fg-muted truncate">—</span>,
      }));
    }
    if (visibleCols.slots) {
      cols.push(pendingColumnHelper.display({
        id: 'slots',
        header: () => <SortHeader label="Placements" colId="slots" sortCol={sortCol} sortDir={sortDir} onSort={doSort} />,
        meta: { size: 120, truncate: true },
        cell: ({ row }) => {
          const group = row.original;
          const groupSlots = group.rows.reduce((s, r) => s + r.slots, 0);
          const reqMap = new Map<string, number>();
          group.rows.forEach(r => { if (r.requestId) reqMap.set(r.requestId, r.requestedPlacements); });
          const requestedTotal = Array.from(reqMap.values()).reduce((a, b) => a + b, 0);
          return <span className="text-body-sm text-fg truncate">{groupSlots} / {requestedTotal || '—'}</span>;
        },
      }));
    }
    return cols;
  })();

  const renderPendingSubRows = (row: Row<PendingPCGroup>, table: TanStackTable<PendingPCGroup>) => {
    const group = row.original;
    const collapsed = !expandedSubPcs.has(group.pc);
    if (collapsed) return null;
    return group.rows.map(r => {
      const category = r.educationLevel || r.requestedEducationLevels.join(', ') || '—';
      const disciplines = parseDisciplines(r.discipline);
      const isPending = r.status === 'pending';
      const isRejected = r.status === 'rejected';
      return (
        <TableRow
          key={r.key}
          className={cn(
            'hover:bg-bg transition-colors group',
            isPending && 'cursor-pointer',
            isPending && selectedKeys.has(r.key) && 'bg-accent/5',
          )}
          onClick={isPending ? () => router.push(`/requests/project/${encodeURIComponent(r.batchId)}/${encodeURIComponent(r.projId)}`) : undefined}
        >
          <TableCell className="px-4 py-3 w-10" maxWidth={table.getColumn('select')?.getSize()} onClick={e => e.stopPropagation()}>
            <Checkbox
              checked={selectedKeys.has(r.key)}
              onCheckedChange={() => toggleSelectProj(r.batchId, r.projId)}
              aria-label={`Select ${r.title}`}
            />
          </TableCell>
          {visibleCols.pc && (
            <TableCell className="px-4 py-3 text-body-sm text-fg-muted" maxWidth={table.getColumn('pc')?.getSize()} />
          )}
          {visibleCols.title && (
            <TableCell className="px-4 py-3" maxWidth={table.getColumn('title')?.getSize()}>
              <p className={cn('text-body-sm font-medium truncate', isPending ? 'text-fg group-hover:text-accent transition-colors' : 'text-fg')}>
                {r.title}
              </p>
              {isRejected && r.remarks && (
                <p className="text-body-sm mt-0.5 leading-snug italic text-danger truncate">
                  {r.remarks}
                </p>
              )}
            </TableCell>
          )}
          {visibleCols.category && (
            <TableCell className="px-4 py-3 text-body-sm text-fg-muted" maxWidth={table.getColumn('category')?.getSize()} truncate>{category}</TableCell>
          )}
          {visibleCols.discipline && (
            <TableCell className="px-4 py-3" maxWidth={table.getColumn('discipline')?.getSize()}>
              {disciplines.length === 0 ? (
                <span className="text-body-sm text-fg-muted truncate block">—</span>
              ) : (
                <div className="flex flex-wrap gap-1 max-w-full">
                  {disciplines.map(d => (
                    <span key={d} className="badge bg-bg-muted text-fg-muted text-caption font-normal truncate max-w-full">{d}</span>
                  ))}
                </div>
              )}
            </TableCell>
          )}
          {visibleCols.slots && (
            <TableCell className="px-4 py-3 text-body-sm text-fg-muted" maxWidth={table.getColumn('slots')?.getSize()} truncate>{r.slots}</TableCell>
          )}
        </TableRow>
      );
    });
  };

  function statusHeaderFilterButton() {
    const active = statusCF.length > 0 || statusCFOpen;
    return (
      <button
        type="button"
        onClick={e => {
          e.stopPropagation();
          const r = e.currentTarget.getBoundingClientRect();
          setStatusCFPos({ top: r.bottom + 4, left: r.left });
          setStatusCFOpen(v => !v);
        }}
        aria-label="Filter Status"
        className={cn(
          'p-0.5 rounded transition-colors ml-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
          active ? 'text-accent bg-accent/10' : 'text-fg-subtle hover:text-fg hover:bg-bg-muted',
        )}
      >
        <Filter size={11} />
      </button>
    );
  }

  /* ── Init ─────────────────────────────────────────────────────────────── */
  useEffect(() => {
    try {
      const saved = localStorage.getItem(COLS_KEY);
      if (saved) setVisibleCols({ ...DEFAULT_COLS, ...JSON.parse(saved) });
      const savedSent = localStorage.getItem(SENT_COLS_KEY);
      if (savedSent) setSentVisibleCols({ ...SENT_DEFAULT_COLS, ...JSON.parse(savedSent) });
    } catch {}
    if (!roleReady) return;
    if (role !== 'io-admin') { router.replace('/projects'); return; }

    const msg = sessionStorage.getItem('dsta_pending_toast');
    const toastTitle = sessionStorage.getItem('dsta_pending_toast_title');
    if (msg) {
      sessionStorage.removeItem('dsta_pending_toast');
      sessionStorage.removeItem('dsta_pending_toast_title');
      showToast(msg, 'success', toastTitle ?? undefined);
    }
    const targetTab =
      sessionStorage.getItem('dsta_requests_target_tab') ??
      new URLSearchParams(window.location.search).get('tab');
    if (targetTab) {
      sessionStorage.removeItem('dsta_requests_target_tab');
      if (targetTab === 'submissions' || targetTab === 'pending' || targetTab === 'approved' || targetTab === 'rejected') {
        // Land on the Project Submissions workspace (optionally a specific sub-tab).
        setTopTab('submissions');
        if (targetTab !== 'submissions') setTab(targetTab as TabKey);
      } else {
        setTopTab('requests');
        setRequestTab(targetTab === 'draft' ? 'draft' : targetTab === 'closed' ? 'closed' : 'open');
      }
      setSentPage(1);
      setExpandedPcs(new Set());
    }

    // Start with no requests — only real IO-created ones appear. Also strip any
    // previously-seeded demo drafts that may already be persisted in localStorage.
    const loadedReqs = loadRequests();
    const cleaned = loadedReqs.filter(req => !req.id || !DEMO_REQUEST_IDS.has(req.id));
    if (cleaned.length !== loadedReqs.length) saveRequests(cleaned);
    setReqs(cleaned);
    setBatches(loadSubmissions());
    loadProjects();
  }, [role, roleReady, router]);

  /* ── Action functions ─────────────────────────────────────────────────── */
  function syncProjectsToRequests(updatedBatches: ProjectSubmissionBatch[]) {
    const currentReqs: ProjectRequest[] = loadRequests();
    const updated = currentReqs.map(r => {
      const allProjs  = updatedBatches.flatMap(b => b.projects).filter(project => projectMatchesRequest(project, r));
      const submitted = allProjs.filter(p => p.status !== 'rejected' && p.status !== 'withdrawn').reduce((s, p) => s + p.slots, 0);
      const created   = allProjs.filter(p => p.status !== 'rejected' && p.status !== 'withdrawn').length;
      return { ...r, uploaded: submitted, created };
    });
    saveRequests(updated);
    setReqs(updated);
  }

  /* ── Bulk actions ─────────────────────────────────────────────────────── */
  function toggleSelectProj(batchId: string, projId: string) {
    const key = `${batchId}::${projId}`;
    setSelectedKeys(prev => { const next = new Set(prev); next.has(key) ? next.delete(key) : next.add(key); return next; });
  }

  function doBulkApprove() {
    let updated = [...batches];
    const existingProjs = loadProjects();
    const nums = existingProjs.map(p => parseInt(p.id.replace(/^PROJ-/, ''), 10)).filter(n => !isNaN(n));
    let nextNum = (nums.length > 0 ? Math.max(...nums) : 0) + 1;
    const newProjects: ProjectEntry[] = [];
    Array.from(selectedKeys).forEach(key => {
      const [batchId, projId] = key.split('::');
      updated = updated.map(b => b.id !== batchId ? b : {
        ...b,
        projects: b.projects.map(p => {
          if (p.id !== projId || p.status !== 'pending') return p;
          const newId = `PROJ-${String(nextNum++).padStart(4, '0')}`;
          newProjects.push({
            id: newId, title: p.title, description: p.description,
            mentor: p.mentor, mentorAppointment: p.mentorAppointment, mentorUserId: p.mentorUserId, mentorBio: p.mentorBio,
            skills: p.skills, discipline: p.discipline, slots: p.slots, matched: 0, status: 'open',
            programme: '', techDomain: p.techDomain, emergingArea: p.emergingArea,  // approved → unassigned
            educationLevel: p.educationLevel, internshipDuration: p.internshipDuration,
            internshipPeriodStart: p.internshipPeriodStart, internshipPeriodEnd: p.internshipPeriodEnd,
            workingLocation: p.workingLocation,
          });
          return { ...p, status: 'approved' as const };
        }),
      });
    });
    setBatches(updated);
    saveSubmissions(updated);
    saveProjects([...existingProjs, ...newProjects]);
    syncProjectsToRequests(updated);
    const notifiedApprove = new Set<string>();
    Array.from(selectedKeys).forEach(key => {
      const [batchId] = key.split('::');
      if (!notifiedApprove.has(batchId)) {
        notifiedApprove.add(batchId);
        const batch = batches.find(b => b.id === batchId);
        if (batch) addNotification({ forRole: 'ad-pnc', title: `Project approved — ${progMap[batch.programme] ?? batch.programme}`, body: `Your project submission for ${progMap[batch.programme] ?? batch.programme} has been reviewed and approved by the IO.`, href: '/submissions', tier: 'info' });
      }
    });
    newProjects.forEach(p => {
      addNotification({ forRole: 'mentor', ...(p.mentorUserId ? { forMentorId: p.mentorUserId } : {}), title: `Your project has been approved — ${p.title}`, body: `"${p.title}" has been approved by the IO and is now open for applicants.`, href: '/mentor/projects', tier: 'info' });
    });
    setSelectedKeys(new Set());
    setBulkApproveOpen(false);
    showToast(`${selectedKeys.size} project${selectedKeys.size !== 1 ? 's' : ''} approved.`);
  }

  function doBulkReject() {
    let updated = [...batches];
    Array.from(selectedKeys).forEach(key => {
      const [batchId, projId] = key.split('::');
      updated = updated.map(b => b.id !== batchId ? b : {
        ...b,
        projects: b.projects.map(p => p.id !== projId || p.status !== 'pending' ? p : { ...p, status: 'rejected' as const, remarks: bulkRejectRemarks }),
      });
    });
    setBatches(updated); saveSubmissions(updated);
    syncProjectsToRequests(updated);
    const notifiedReject = new Set<string>();
    Array.from(selectedKeys).forEach(key => {
      const [batchId] = key.split('::');
      if (!notifiedReject.has(batchId)) {
        notifiedReject.add(batchId);
        const batch = batches.find(b => b.id === batchId);
        if (batch) addNotification({ forRole: 'ad-pnc', title: `Project rejected — ${progMap[batch.programme] ?? batch.programme}`, body: `Your project submission for ${progMap[batch.programme] ?? batch.programme} has been rejected by the IO. See the rejection remarks for details.`, href: '/submissions', tier: 'action' });
      }
    });
    setSelectedKeys(new Set()); setBulkRejectOpen(false);
    showToast(`${selectedKeys.size} project${selectedKeys.size !== 1 ? 's' : ''} rejected.`);
  }


  if (roleReady && role !== 'io-admin') return null;

  /* ── Flat rows ────────────────────────────────────────────────────────── */
  const flatRows: FlatProj[] = batches.flatMap(batch =>
    batch.projects.map(proj => {
      // Resolve the Programme Centre the same way the Projects pending-review did:
      // prefer the linked request's centre, else the project's / batch's PC.
      const linkedReq = reqs.find(r =>
        (proj.requestLineId && r.id === proj.requestLineId) ||
        (batch.uploadToken && r.uploadToken === batch.uploadToken && projectMatchesRequest(proj, r)),
      );
      const pc = linkedReq?.programmeCenter || proj.pc || batch.pc;
      return {
        requestId: linkedReq?.id ?? '',
        requestedPlacements: linkedReq?.placements ?? 0,
        key:       `${batch.id}::${proj.id}`,
        batchId:   batch.id,
        projId:    proj.id,
        title:     proj.title,
        mentor:    proj.mentor,
        discipline: proj.discipline ?? '',
        slots:     proj.slots,
        status:    proj.status as FlatProj['status'],
        aiCheck:   proj.aiCheck,
        remarks:   proj.remarks,
        educationLevel: proj.educationLevel ?? '',
        requestedEducationLevels: batch.requestedEducationLevels ?? (batch.educationLevel ? [batch.educationLevel] : []),
        progId:      batch.programme,
        progLabel:   progMap[batch.programme] ?? batch.programme,
        pc,
        headName:    batch.pcHead,
        submittedBy: batch.submittedBy ?? batch.pcHead,
      };
    })
  );

  /* ── "Requests Sent" tab — grouped by PC Head ───────────────────────── */
  const draftReqs = reqs.filter(req => requestDisplayStatus(req) === 'draft');
  const closedReqs = reqs.filter(req => {
    const status = requestDisplayStatus(req);
    return status === 'closed' || status === 'withdrawn';
  });
  const openReqs = reqs.filter(req => {
    const status = requestDisplayStatus(req);
    return status !== 'draft' && status !== 'closed' && status !== 'withdrawn';
  });
  const draftGroupMap = draftReqs.reduce((map, req) => {
    const key = draftRequestGroupKey(req);
    if (!map.has(key)) map.set(key, { pc: key, headName: 'Project Request Draft', requests: [] });
    map.get(key)!.requests.push(req);
    return map;
  }, new Map<string, PCGroup>());
  const draftGroups = Array.from(draftGroupMap.values()).sort((a, b) =>
    draftRequestGroupKey(b.requests[0]).localeCompare(draftRequestGroupKey(a.requests[0])),
  );
  const openGroupCount = new Set(openReqs.map(sentGroupKey)).size;
  const closedGroupCount = new Set(closedReqs.map(sentGroupKey)).size;
  // Sent (grouped) requests shown depend on the active tab: Open vs Closed.
  const sentReqs = requestTab === 'closed' ? closedReqs : openReqs;
  const visibleReqs = requestTab === 'draft' ? draftReqs : sentReqs;
  const pcGroupMap = sentReqs.reduce((map, req) => {
    const key = sentGroupKey(req);
    if (!map.has(key)) map.set(key, { key, pc: req.pc, headName: req.headName, requests: [] });
    map.get(key)!.requests.push(req);
    return map;
  }, new Map<string, PCGroup>());
  const pcGroups = Array.from(pcGroupMap.values());

  const sentQlow = search.toLowerCase();
  const sentGroups = pcGroups
    .filter(g =>
      !sentQlow ||
      g.headName.toLowerCase().includes(sentQlow) ||
      g.pc.toLowerCase().includes(sentQlow) ||
      g.requests.some(r =>
        requestProgrammeCenter(r).toLowerCase().includes(sentQlow) ||
        requestInternCategory(r, progMap).toLowerCase().includes(sentQlow)
      )
    );
  const sortedSentGroups = [...sentGroups].sort((a, b) => {
    if (!sortCol) return 0;
    const aMetrics = sentGroupMetrics(a);
    const bMetrics = sentGroupMetrics(b);
    let va: string | number = '', vb: string | number = '';
    if (sortCol === 'recipient')   { va = requestAdPnc(a.requests[0]); vb = requestAdPnc(b.requests[0]); }
    if (sortCol === 'programmeCenter') { va = requestProgrammeCenter(a.requests[0]); vb = requestProgrammeCenter(b.requests[0]); }
    if (sortCol === 'programmes')  { va = a.requests.length; vb = b.requests.length; }
    if (sortCol === 'placements')  { va = aMetrics.placements; vb = bMetrics.placements; }
    if (sortCol === 'requestDate') { va = aMetrics.latestSent; vb = bMetrics.latestSent; }
    if (sortCol === 'deadline')    { va = aMetrics.earliestDeadline; vb = bMetrics.earliestDeadline; }
    if (sortCol === 'sentStatus')  { va = REQ_STATUS_ORDER[aMetrics.worstStatus] ?? 99; vb = REQ_STATUS_ORDER[bMetrics.worstStatus] ?? 99; }
    if (typeof va === 'string') return va.localeCompare(vb as string) * sortDir;
    return ((va as number) - (vb as number)) * sortDir;
  });
  const sentTotalPages = Math.max(1, Math.ceil(sortedSentGroups.length / sentPageSize));
  const sentCurrentPage = Math.min(sentPage, sentTotalPages);
  const sentPageStart = (sentCurrentPage - 1) * sentPageSize;
  const pagedSentGroups = sortedSentGroups.slice(sentPageStart, sentPageStart + sentPageSize);
  const sentPageNumbers = Array.from(
    new Set([1, sentCurrentPage - 1, sentCurrentPage, sentCurrentPage + 1, sentTotalPages]
      .filter(page => page >= 1 && page <= sentTotalPages)),
  ).sort((a, b) => a - b);

  /* ── Tab + search + filter + sort (submissions tabs) ─────────────────── */
  const tabRows = flatRows.filter(r => {
    if (tab === 'pending')  return r.status === 'pending';
    if (tab === 'rejected') return r.status === 'rejected';
    if (tab === 'approved') return r.status === 'approved';
    return true;
  });

  const qLow = search.toLowerCase();
  // When searching, bypass the tab filter so results span all buckets
  const searchBase = qLow ? flatRows : tabRows;
  const searched = searchBase.filter(r => {
    if (qLow && !(
      r.title.toLowerCase().includes(qLow) ||
      r.mentor.toLowerCase().includes(qLow) ||
      r.progLabel.toLowerCase().includes(qLow) ||
      r.submittedBy.toLowerCase().includes(qLow) ||
      r.pc.toLowerCase().includes(qLow)
    )) return false;
    if (statusCF.length > 0 && !statusCF.includes(r.status)) return false;
    return true;
  });

  const tableRows = [...searched].sort((a, b) => {
    if (!sortCol) return 0;
    let va: string | number = '', vb: string | number = '';
    if (sortCol === 'pc')       { va = a.pc;          vb = b.pc; }
    if (sortCol === 'title')    { va = a.title;       vb = b.title; }
    if (sortCol === 'category') { va = a.educationLevel || a.requestedEducationLevels.join(', '); vb = b.educationLevel || b.requestedEducationLevels.join(', '); }
    if (sortCol === 'discipline') { va = parseDisciplines(a.discipline).join(', '); vb = parseDisciplines(b.discipline).join(', '); }
    if (sortCol === 'slots')    { va = a.slots;       vb = b.slots; }
    if (typeof va === 'string') return va.localeCompare(vb as string) * sortDir;
    return ((va as number) - (vb as number)) * sortDir;
  });

  const pendingKeys    = tableRows.filter(r => r.status === 'pending').map(r => r.key);
  const allPendingSel  = pendingKeys.length > 0 && pendingKeys.every(k => selectedKeys.has(k));
  const somePendingSel = pendingKeys.some(k => selectedKeys.has(k));

  // Pending Review is grouped by Programme Centre (Projects-style collapsible groups).
  const pendingPcGroups = (() => {
    const map = new Map<string, { pc: string; rows: FlatProj[] }>();
    for (const r of tableRows) {
      if (!map.has(r.pc)) map.set(r.pc, { pc: r.pc, rows: [] });
      map.get(r.pc)!.rows.push(r);
    }
    return Array.from(map.values());
  })();
  const togglePcGroup = (pc: string) =>
    setExpandedSubPcs(prev => { const n = new Set(prev); n.has(pc) ? n.delete(pc) : n.add(pc); return n; });

  // Paginate the submissions view: PC groups on the Pending tab, flat rows otherwise.
  const subItemsCount = tab === 'pending' ? pendingPcGroups.length : tableRows.length;
  const subTotalPages = Math.max(1, Math.ceil(subItemsCount / subPageSize));
  const subCurrentPage = Math.min(subPage, subTotalPages);
  const subPageStart = (subCurrentPage - 1) * subPageSize;
  const pagedPendingGroups = pendingPcGroups.slice(subPageStart, subPageStart + subPageSize);
  const pagedFlatRows = tableRows.slice(subPageStart, subPageStart + subPageSize);
  const subPageNumbers = Array.from(
    new Set([1, subCurrentPage - 1, subCurrentPage, subCurrentPage + 1, subTotalPages]
      .filter(page => page >= 1 && page <= subTotalPages)),
  ).sort((a, b) => a - b);

  const tabCounts = {
    sent:     pcGroups.length,
    pending:  flatRows.filter(r => r.status === 'pending').length,
    rejected: flatRows.filter(r => r.status === 'rejected').length,
    approved: flatRows.filter(r => r.status === 'approved').length,
    all:      flatRows.length,
  };

  const draftAndOpenEmpty = draftReqs.length === 0 && openReqs.length === 0;
  const showHeaderCreateRequest = topTab === 'submissions' || !draftAndOpenEmpty;
  const showEmptyCreateRequest = topTab === 'requests' && draftAndOpenEmpty && (requestTab === 'draft' || requestTab === 'open');


  const [appStatusCF,  setAppStatusCF]  = useState<string[]>([]);
  const [openHeaderFilter, setOpenHeaderFilter] = useState<HeaderFilterKey | null>(null);
  const [headerFilterPos, setHeaderFilterPos] = useState({ top: 0, left: 0 });
  
  type HeaderFilterKey = 'requestDate';
  const HEADER_FILTERS: Record<HeaderFilterKey, { label: string; options: string[] }> = {
    requestDate: { label: 'Request Date', options: ['2024', '2025', '2026'] },
  };

  function getHeaderFilterValues(key: HeaderFilterKey) {
    return appStatusCF;
  }

  function setHeaderFilterValues(key: HeaderFilterKey, values: string[]) {
    setAppStatusCF(values);
  }

  function toggleHeaderFilterValue(key: HeaderFilterKey, value: string) {
    const current = getHeaderFilterValues(key);
    setHeaderFilterValues(key, current.includes(value)
      ? current.filter(v => v !== value)
      : [...current, value]
    );
  }

  function openFilter(key: HeaderFilterKey, e: React.MouseEvent<HTMLButtonElement>) {
    e.stopPropagation();
    const r = e.currentTarget.getBoundingClientRect();
    setHeaderFilterPos({ top: r.bottom + 6, left: r.left });
    setOpenHeaderFilter(prev => prev === key ? null : key);
  }

  function headerFilterButton(key: HeaderFilterKey) {
    const selected = getHeaderFilterValues(key);
    const active = selected.length > 0 || openHeaderFilter === key;
    return (
      <button
        type="button"
        onClick={e => openFilter(key, e)}
        aria-label={`Filter ${HEADER_FILTERS[key].label}`}
        className={cn(
          'p-0.5 rounded transition-colors ml-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
          active ? 'text-accent bg-accent/10' : 'text-fg-subtle hover:text-fg hover:bg-bg-muted',
        )}
      >
        <Filter size={11} />
      </button>
    );
  }
  return (
    <Shell activeRoute="/requests">
      {/* Header */}
      <div className="mb-4 flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
        <div>
          <h1 className="text-headline-md text-fg">Project Requests</h1>
        </div>
        {showHeaderCreateRequest && (
          <Button onClick={() => router.push('/requests/new')} className="self-start">
            <Send size={15} />Create Project Request
          </Button>
        )}
      </div>

      {/* ── Top-level workspace tabs: Project Requests vs Project Submissions ── */}
      <div className="mb-4">
        <UnderlineTabs
          value={topTab}
          onValueChange={v => setTopTab(v === 'submissions' ? 'submissions' : 'requests')}
          tabs={[
            { value: 'requests', label: 'Project Requests' },
            { value: 'submissions', label: 'Project Submissions', count: tabCounts.pending },
          ]}
          ariaLabel="Project requests workspace"
        />
      </div>

      {/* ── Main table card ────────────────────────────────────────────────── */}
      <div className="bg-surface rounded-lg border border-border overflow-hidden shadow-sm">

        {/* Search + filters at the top — above the tabs (shared across tabs) */}
        <TableToolbar
          search={search} onSearch={handleSearch}
          placeholder="Search by…"
          columnsLabel="Edit Columns"
          {...(topTab === 'submissions' ? {
            colDefs: COL_DEFS.map(c => ({ key: c.key, label: c.label })),
            visibleCols, onToggleCol: (k: string) => toggleCol(k as ColKey),
            onExport: () => exportToCSV(
              'project-submissions',
              ['Programme Centre', 'Project', 'Intern Category', 'Discipline of Study', 'Placements'],
              tableRows.map(r => [r.pc, r.title, r.educationLevel || r.requestedEducationLevels.join(', '), parseDisciplines(r.discipline).join(' / '), r.slots]),
            ),
          } : {
            colDefs: SENT_COL_DEFS.map(c => ({ key: c.key, label: c.label })),
            visibleCols: sentVisibleCols, onToggleCol: (k: string) => toggleSentCol(k as SentColKey),
            onExport: () => exportToCSV(
              'requests-sent',
              ['Programme Centre', 'Intern Category', 'AD(P&C)', 'Placements Submitted', 'Placements Requested', 'Request Date', 'Response Deadline', 'Status'],
              sortedSentGroups.flatMap(g => g.requests.map(r => [
                requestProgrammeCenter(r), requestInternCategory(r, progMap), requestAdPnc(r),
                r.uploaded ?? 0, r.placements, fmtDate(r.sentDate), fmtDate(r.deadline), STATUS_META[requestDisplayStatus(r)].label,
              ])),
            ),
          })}
        />

        {topTab === 'requests' ? (
          <div className="border-b border-border bg-surface px-4 py-3">
            <Tabs value={requestTab} onValueChange={handleRequestTabChange}>
              <TabsList aria-label="Request status">
                <TabsTrigger value="draft">
                  Draft ({draftGroups.length})
                </TabsTrigger>
                <TabsTrigger value="open">
                  Open ({openGroupCount})
                </TabsTrigger>
                <TabsTrigger value="closed">
                  Closed ({closedGroupCount})
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        ) : (
          <div className="border-b border-border bg-surface px-4 py-3">
            <Tabs value={tab} onValueChange={v => { setTab(v as TabKey); setSelectedKeys(new Set()); setSubPage(1); }}>
              <TabsList aria-label="Submission status">
                <TabsTrigger value="pending">
                  Pending Review ({tabCounts.pending})
                </TabsTrigger>
                <TabsTrigger value="approved">
                  Approved ({tabCounts.approved})
                </TabsTrigger>
                <TabsTrigger value="rejected">
                  Rejected ({tabCounts.rejected})
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        )}

        {/* ── Project Requests tab — grouped by PC Head ───────────────────── */}
        {topTab === 'requests' ? (
          visibleReqs.length === 0 ? (
            <RequestTabEmptyState
              title={requestTab === 'draft' ? 'No draft requests' : requestTab === 'closed' ? 'No closed requests' : 'No open requests'}
              description={requestTab === 'draft' ? 'Draft requests will appear here before they are sent.' : requestTab === 'closed' ? 'Requests move here automatically once their response deadline has passed.' : 'Send a project request to an AD (P&C) to get started.'}
              action={showEmptyCreateRequest ? (
                <Button onClick={() => router.push('/requests/new')}>
                  <Send size={15} />Create Project Request
                </Button>
              ) : undefined}
            />
          ) : requestTab === 'draft' && draftGroups.length > 0 ? (
            <DataTable
              tableKey="requests_draft"
              columns={draftColumns}
              data={draftGroups}
              enableSorting={false}
              getRowId={group => draftRequestGroupKey(group.requests[0])}
            />
          ) : (
            <>
              <DataTable
                tableKey="requests_sent"
                columns={sentColumns}
                data={pagedSentGroups}
                enableSorting={false}
                onRowClick={(group) => {
                  const gkey = group.key ?? group.pc;
                  setExpandedPcs(prev => {
                    const n = new Set(prev);
                    n.has(gkey) ? n.delete(gkey) : n.add(gkey);
                    return n;
                  });
                }}
                renderSubRows={renderSentSubRows}
                getRowId={group => group.key ?? group.pc}
              />
              <div className="flex flex-col gap-3 border-t border-border bg-surface px-4 py-3 text-body-sm text-fg-muted md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-2">
                  <span>Rows per page:</span>
                  <Select
                    value={String(sentPageSize)}
                    onValueChange={value => {
                      setSentPageSize(Number(value));
                      setSentPage(1);
                    }}
                  >
                    <SelectTrigger className="h-8 w-[88px] text-body-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SENT_PAGE_SIZE_OPTIONS.map(value => (
                        <SelectItem key={value} value={String(value)}>
                          {value}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <Pagination className="mx-0 w-auto justify-end">
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious
                          href="#"
                          aria-disabled={sentCurrentPage <= 1}
                          className={sentCurrentPage <= 1 ? 'pointer-events-none opacity-50' : undefined}
                          onClick={e => {
                            e.preventDefault();
                            setSentPage(page => Math.max(1, page - 1));
                          }}
                        />
                      </PaginationItem>
                      {sentPageNumbers.map((page, index) => (
                        <Fragment key={page}>
                          {index > 0 && page - sentPageNumbers[index - 1] > 1 && (
                            <PaginationItem>
                              <PaginationEllipsis />
                            </PaginationItem>
                          )}
                          <PaginationItem>
                            <PaginationLink
                              href="#"
                              isActive={page === sentCurrentPage}
                              onClick={e => {
                                e.preventDefault();
                                setSentPage(page);
                              }}
                            >
                              {page}
                            </PaginationLink>
                          </PaginationItem>
                        </Fragment>
                      ))}
                      <PaginationItem>
                        <PaginationNext
                          href="#"
                          aria-disabled={sentCurrentPage >= sentTotalPages}
                          className={sentCurrentPage >= sentTotalPages ? 'pointer-events-none opacity-50' : undefined}
                          onClick={e => {
                            e.preventDefault();
                            setSentPage(page => Math.min(sentTotalPages, page + 1));
                          }}
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              </div>
              {openHeaderFilter && (
                <>
                  <div className="fixed inset-0 z-[150]" onClick={() => setOpenHeaderFilter(null)} />
                  <div
                    className="fixed bg-surface border border-border rounded-lg shadow-lg z-[200] py-1.5 min-w-[13rem]"
                    style={{ top: headerFilterPos.top, left: headerFilterPos.left }}
                    onClick={e => e.stopPropagation()}
                  >
                    <p className="px-3 py-1 text-caption font-semibold text-fg-subtle uppercase tracking-widest">
                      {HEADER_FILTERS[openHeaderFilter].label}
                    </p>
                    {HEADER_FILTERS[openHeaderFilter].options.map(opt => {
                      const checked = getHeaderFilterValues(openHeaderFilter).includes(opt);
                      return (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => toggleHeaderFilterValue(openHeaderFilter, opt)}
                          className="w-full flex items-center gap-2.5 px-3 py-1.5 text-body-sm text-fg hover:bg-bg-subtle transition-colors text-left"
                        >
                          <Checkbox
                            checked={checked}
                            aria-label={`Toggle ${opt}`}
                            tabIndex={-1}
                            className="pointer-events-none"
                          />
                          {opt}
                        </button>
                      );
                    })}
                    {getHeaderFilterValues(openHeaderFilter).length > 0 && (
                      <button
                        type="button"
                        onClick={() => setHeaderFilterValues(openHeaderFilter, [])}
                        className="mt-1 w-full px-3 py-1.5 text-left text-body-sm text-fg-muted hover:text-danger hover:bg-bg-subtle transition-colors"
                      >
                        Clear filter
                      </button>
                    )}
                  </div>
                </>
              )}
            </>
          )
        ) : (
          /* ── Submissions tabs ──────────────────────────────────────────── */
          <>
            {tab === 'pending' && selectedKeys.size > 0 && (
              <div className="flex items-center gap-3 mx-4 mb-3 px-4 py-2.5 bg-accent/5 border border-accent/20 rounded-lg">
                <span className="text-body-sm font-semibold text-accent flex-1">
                  {selectedKeys.size} project{selectedKeys.size !== 1 ? 's' : ''} selected
                </span>
                <button onClick={() => setSelectedKeys(new Set())} className="text-body-sm text-fg-muted hover:text-fg transition-colors">
                  Clear
                </button>
                <Button size="sm" onClick={() => setBulkApproveOpen(true)}>
                  <Check size={13} />Approve {selectedKeys.size}
                </Button>
                <Button size="sm" variant="danger" onClick={() => { setBulkRejectRemarks(''); setBulkRejectOpen(true); }}>
                  <X size={13} />Reject {selectedKeys.size}
                </Button>
              </div>
            )}

            {tab === 'pending' ? (
              <DataTable
                tableKey="requests_submissions_pending"
                columns={pendingColumns}
                data={pagedPendingGroups}
                enableSorting={false}
                renderSubRows={renderPendingSubRows}
                getRowId={group => group.pc}
                emptyState={<div className="px-6 py-16 text-center text-body-sm text-fg-muted">No projects match your filters.</div>}
              />
            ) : (
              <DataTable
                tableKey="requests_submissions_flat"
                columns={flatColumns}
                data={pagedFlatRows}
                enableSorting={false}
                onRowClick={(row) => {
                  if (row.status === 'pending') {
                    router.push(`/requests/project/${encodeURIComponent(row.batchId)}/${encodeURIComponent(row.projId)}`);
                  }
                }}
                getRowId={row => row.key}
                emptyState={<div className="px-6 py-16 text-center text-body-sm text-fg-muted">No projects match your filters.</div>}
              />
            )}

            <div className="flex flex-col gap-3 border-t border-border bg-surface px-4 py-3 text-body-sm text-fg-muted md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <span>Rows per page:</span>
                  <Select
                    value={String(subPageSize)}
                    onValueChange={value => { setSubPageSize(Number(value)); setSubPage(1); }}
                  >
                    <SelectTrigger className="h-8 w-[88px] text-body-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SENT_PAGE_SIZE_OPTIONS.map(value => (
                        <SelectItem key={value} value={String(value)}>
                          {value}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {tab === 'pending' && selectedKeys.size > 0 && (
                  <span className="font-semibold text-accent">{selectedKeys.size} selected</span>
                )}
              </div>

              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <Pagination className="mx-0 w-auto justify-end">
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        href="#"
                        aria-disabled={subCurrentPage <= 1}
                        className={subCurrentPage <= 1 ? 'pointer-events-none opacity-50' : undefined}
                        onClick={e => { e.preventDefault(); setSubPage(page => Math.max(1, page - 1)); }}
                      />
                    </PaginationItem>
                    {subPageNumbers.map((page, index) => (
                      <Fragment key={page}>
                        {index > 0 && page - subPageNumbers[index - 1] > 1 && (
                          <PaginationItem>
                            <PaginationEllipsis />
                          </PaginationItem>
                        )}
                        <PaginationItem>
                          <PaginationLink
                            href="#"
                            isActive={page === subCurrentPage}
                            onClick={e => { e.preventDefault(); setSubPage(page); }}
                          >
                            {page}
                          </PaginationLink>
                        </PaginationItem>
                      </Fragment>
                    ))}
                    <PaginationItem>
                      <PaginationNext
                        href="#"
                        aria-disabled={subCurrentPage >= subTotalPages}
                        className={subCurrentPage >= subTotalPages ? 'pointer-events-none opacity-50' : undefined}
                        onClick={e => { e.preventDefault(); setSubPage(page => Math.min(subTotalPages, page + 1)); }}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            </div>
          </>
        )}
      </div>

      {/* ── Bulk modals ─────────────────────────────────────────────────── */}
      <Modal open={bulkApproveOpen} onClose={() => setBulkApproveOpen(false)} maxWidth="sm" labelledBy="bulk-approve-title">
        <h2 id="bulk-approve-title" className="text-headline-md text-fg mb-2">Approve {selectedKeys.size} Project{selectedKeys.size !== 1 ? 's' : ''}?</h2>
        <p className="text-body-md text-fg-muted mb-6">All selected projects will be added to the confirmed projects list and made visible to applicants.</p>
        <div className="flex justify-end gap-2">
          <Button onClick={doBulkApprove}><Check size={14} />Confirm Approval</Button>
          <Button variant="ghost" onClick={() => setBulkApproveOpen(false)}>Cancel</Button>
        </div>
      </Modal>

      <Modal open={bulkRejectOpen} onClose={() => setBulkRejectOpen(false)} maxWidth="sm" labelledBy="bulk-reject-title">
        <h2 id="bulk-reject-title" className="text-headline-md text-fg mb-2">Reject {selectedKeys.size} Project{selectedKeys.size !== 1 ? 's' : ''}?</h2>
        <p className="text-body-md text-fg-muted mb-4">The same rejection remarks will be sent to AD (P&amp;C) for all selected projects.</p>
        <label className="block text-label-sm text-fg mb-1">Rejection Remarks <span className="text-danger">*</span></label>
        <textarea
          rows={3}
          className="w-full rounded-lg border border-border bg-bg-subtle px-3 py-2 text-body-md text-fg resize-none focus:outline-none focus:ring-2 focus:ring-accent/30 mb-4"
          placeholder="Explain what needs to be changed across all selected projects…"
          value={bulkRejectRemarks}
          onChange={e => setBulkRejectRemarks(e.target.value)}
        />
        <div className="flex justify-end gap-2">
          <Button variant="danger" disabled={!bulkRejectRemarks.trim()} onClick={doBulkReject}>
            <X size={14} />Reject Projects
          </Button>
          <Button variant="ghost" onClick={() => setBulkRejectOpen(false)}>Cancel</Button>
        </div>
      </Modal>

      {extendGroup && (
        <Modal open onClose={() => setExtendGroup(null)} maxWidth="sm" labelledBy="extend-deadline-title">
          <h2 id="extend-deadline-title" className="text-headline-md text-fg mb-2">
            Extend Deadline
          </h2>
          <p className="text-body-md text-fg-muted mb-4">
            Update the response deadline for {extendGroup.headName}.
          </p>
          <label className="block text-label-sm text-fg mb-1.5">New deadline</label>
          <DatePicker
            value={extendDeadline}
            onChange={setExtendDeadline}
            placeholder="Pick a date"
            minDate={todayISO()}
          />
          <div className="mt-4 mb-5 flex items-start gap-2 rounded-md border border-info/30 bg-info-bg px-3 py-2.5 text-body-sm text-info">
            <Bell size={15} className="mt-0.5 shrink-0" />
            <span>An email will be sent to {requestAdPnc(extendGroup.requests[0]) || 'the AD (P&C)'} to inform them of the updated response deadline.</span>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setExtendGroup(null)}>Cancel</Button>
            <Button disabled={!extendDeadline} onClick={doExtendDeadline}>
              <CalendarClock size={14} />Save Deadline
            </Button>
          </div>
        </Modal>
      )}

      {withdrawGroup && (
        <Modal open onClose={() => setWithdrawGroup(null)} maxWidth="sm" labelledBy="withdraw-request-title">
          <h2 id="withdraw-request-title" className="text-headline-md text-fg mb-2">
            Withdraw Request
          </h2>
          <p className="text-body-md text-fg-muted mb-4">
            Withdraw the project request for {requestProgrammeCenter(withdrawGroup.requests[0])}? It moves to Closed and can no longer receive submissions. To change the ask, raise a new request.
          </p>
          <div className="mb-5 flex items-start gap-2 rounded-md border border-info/30 bg-info-bg px-3 py-2.5 text-body-sm text-info">
            <Bell size={15} className="mt-0.5 shrink-0" />
            <span>An email will be sent to {requestAdPnc(withdrawGroup.requests[0]) || 'the AD (P&C)'} to inform them the request has been withdrawn.</span>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setWithdrawGroup(null)}>Cancel</Button>
            <Button variant="danger" onClick={doWithdraw}>
              <Ban size={14} />Withdraw Request
            </Button>
          </div>
        </Modal>
      )}

      {statusCFOpen && (
        <ColFilterDropdown
          id="cf-req-status"
          options={[
            { value: 'pending',  label: 'Pending Review' },
            { value: 'rejected', label: 'Rejected' },
            { value: 'approved', label: 'Approved' },
          ]}
          selected={statusCF}
          onApply={setStatusCF}
          onClose={() => setStatusCFOpen(false)}
          pos={statusCFPos}
        />
      )}

      <Toast message={toast} />
    </Shell>
  );
}
